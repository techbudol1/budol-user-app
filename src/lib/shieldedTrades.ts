import { buildPoseidon } from "circomlibjs";
import { createPublicClient, encodeFunctionData, http, keccak256, parseUnits, stringToHex, type Address, type Hex } from "viem";
import { groth16 } from "snarkjs";
import type { ConnectedWallet } from "./erc20Transfer";
import { createPrivateClaimNote, savePrivateClaimNote } from "./privateClaims";
import { apiBaseURL } from "./runtimeConfig";
import type { PrivateClaimNote, TradeSide } from "../types";

type Groth16Proof = { pi_a: string[]; pi_b: string[][]; pi_c: string[]; protocol?: string; curve?: string };
const shieldedGroth16 = groth16 as typeof groth16 & { verify: (vk: unknown, publicSignals: unknown[], proof: unknown) => Promise<boolean> };

const FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const DEPOSIT_NOTE_KEY = "budol.shieldedTradeNotes.v1";
const rpcURL = "https://horizen-testnet.rpc.caldera.xyz/http";

const erc20ABI = [
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

const vaultABI = [
  { type: "function", name: "deposit", stateMutability: "nonpayable", inputs: [{ name: "commitment", type: "bytes32" }], outputs: [{ type: "uint32" }, { type: "bytes32" }] },
  { type: "function", name: "nextLeafIndex", stateMutability: "view", inputs: [], outputs: [{ type: "uint32" }] },
  { type: "function", name: "latestRoot", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "zeros", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "getCommitments", stateMutability: "view", inputs: [{ type: "uint32" }, { type: "uint32" }], outputs: [{ type: "bytes32[]" }] },
] as const;

export type ShieldedTradeBatch = { batchId: Hex; executeAfter: string; expiresAt: string; status: string };
export type ShieldedTradeVault = { amount: string; feeBps: number; vaultAddress: Address; available: boolean; batch?: ShieldedTradeBatch };
export type ShieldedTradeConfig = { enabled: boolean; chainId: number; tokenAddress: Address; tokenDecimals: number; treeDepth: number; vaults: ShieldedTradeVault[] };

type PendingShieldedTradeNote = {
  blinding?: string;
  commitment: string;
  createdAt: string;
  nullifierHash?: string;
  privateClaimNote: PrivateClaimNote;
  secret?: string;
  vaultAddress?: string;
};

export async function loadShieldedTradeConfig(): Promise<ShieldedTradeConfig> {
  const response = await fetch(`${apiBaseURL()}/api/shielded-trades/config`, { credentials: "include" });
  const payload = await response.json().catch(() => null) as (ShieldedTradeConfig & { error?: string }) | null;
  if (!response.ok || !payload) throw new Error(payload?.error || "Shielded trading configuration is unavailable.");
  return payload;
}

export async function placeShieldedTrade(input: {
  accountAddress: string;
  amount: number;
  pollId: string;
  getPrivacyReceiptTxHash: () => Promise<string>;
  side: TradeSide;
  wallet: ConnectedWallet;
}) {
  const config = await loadShieldedTradeConfig();
  const vault = config.vaults.find(item => item.available && Number(item.amount) === input.amount);
  if (!config.enabled || !vault) throw new Error("No shielded vault supports this trade amount.");
  const batch = vault.batch ?? await ensureShieldedTradeBatch(input.amount);
  await input.wallet.switchChain?.(config.chainId);
  const provider = await input.wallet.getEthereumProvider();
  const publicClient = createPublicClient({ transport: http(rpcURL) });
  const poseidon = await buildPoseidon();
  const hash = (values: bigint[]) => BigInt(poseidon.F.toString(poseidon(values)));
  const secret = randomField();
  const blinding = randomField();
  const denomination = rawDenomination(vault.amount, vault.feeBps, config.tokenDecimals);
  const commitment = hash([secret, blinding, BigInt(config.chainId), BigInt(config.tokenAddress), BigInt(vault.vaultAddress), denomination]);
  const commitmentHex = fieldHex(commitment);

  const allowance = await publicClient.readContract({ address: config.tokenAddress, abi: erc20ABI, functionName: "allowance", args: [input.accountAddress as Address, vault.vaultAddress] });
  if (allowance < denomination) {
    await sendAndWait(provider, publicClient, input.accountAddress as Address, config.tokenAddress, encodeFunctionData({ abi: erc20ABI, functionName: "approve", args: [vault.vaultAddress, denomination] }));
  }
  await sendAndWait(provider, publicClient, input.accountAddress as Address, vault.vaultAddress, encodeFunctionData({ abi: vaultABI, functionName: "deposit", args: [commitmentHex] }));

  const leafCount = Number(await publicClient.readContract({ address: vault.vaultAddress, abi: vaultABI, functionName: "nextLeafIndex" }));
  const [leaves, zeros] = await Promise.all([
    loadCommitments(publicClient, vault.vaultAddress, leafCount),
    Promise.all(Array.from({ length: config.treeDepth }, (_, level) => publicClient.readContract({ address: vault.vaultAddress, abi: vaultABI, functionName: "zeros", args: [BigInt(level)] }))),
  ]);
  const leafIndex = leaves.findIndex(value => value.toLowerCase() === commitmentHex.toLowerCase());
  if (leafIndex < 0) throw new Error("Shielded deposit commitment was not indexed.");
  const merkle = merklePath(leaves.map(BigInt), zeros.map(BigInt), leafIndex, config.treeDepth, hash);
  const latestRoot = BigInt(await publicClient.readContract({ address: vault.vaultAddress, abi: vaultABI, functionName: "latestRoot" }));
  if (merkle.root !== latestRoot) throw new Error("Shielded deposit tree did not match the vault root.");

  const orderSalt = randomField();
  const amountRaw = parseUnits(input.amount.toString(), config.tokenDecimals);
  const marketId = BigInt(keccak256(stringToHex(input.pollId))) % FIELD;
  const outcome = input.side === "yes" ? 1n : 2n;
  const batchId = BigInt(batch.batchId);
  const orderCommitment = hash([marketId, outcome, amountRaw, orderSalt, batchId]);
  const nullifierHash = hash([secret, blinding, BigInt(vault.vaultAddress)]);
  const circuitInput = {
    root: merkle.root.toString(), nullifierHash: nullifierHash.toString(), orderCommitment: orderCommitment.toString(),
    chainId: config.chainId.toString(), tokenAddress: BigInt(config.tokenAddress).toString(), vaultAddress: BigInt(vault.vaultAddress).toString(),
    denomination: denomination.toString(), feeBps: vault.feeBps.toString(), batchId: batchId.toString(),
    secret: secret.toString(), blinding: blinding.toString(), marketId: marketId.toString(), outcome: outcome.toString(),
    tradeAmount: amountRaw.toString(), tradeAmountInverse: inverse(amountRaw).toString(), orderSalt: orderSalt.toString(),
    pathElements: merkle.pathElements.map(String), pathIndices: merkle.pathIndices.map(String),
  };
  const provingResult = await groth16.fullProve(circuitInput, `${apiBaseURL()}/api/zk/shielded-trade/shielded_trade.wasm`, `${apiBaseURL()}/api/zk/shielded-trade/shielded_trade_final.zkey`);
	const proof = provingResult.proof as Groth16Proof;
	const publicSignals = provingResult.publicSignals;
  const vk = await fetch(`${apiBaseURL()}/api/zk/shielded-trade/verification_key.json`).then(response => response.json());
  if (!await shieldedGroth16.verify(vk, publicSignals, proof)) throw new Error("Local shielded order proof verification failed.");
  const privateClaimNote = await createPrivateClaimNote({ amount: input.amount, pollId: input.pollId, side: input.side });
	savePrivateClaimNote(`shielded-${commitment.toString()}`, privateClaimNote);
  savePendingNote({ blinding: blinding.toString(), commitment: commitment.toString(), createdAt: new Date().toISOString(), nullifierHash: nullifierHash.toString(), privateClaimNote, secret: secret.toString(), vaultAddress: vault.vaultAddress });

  const solidityProof = {
    pA: [proof.pi_a[0], proof.pi_a[1]],
    pB: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
    pC: [proof.pi_c[0], proof.pi_c[1]],
  };
	const privacyReceiptTxHash = await input.getPrivacyReceiptTxHash();
  const response = await fetch(`${apiBaseURL()}/api/shielded-trades`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batchId: batch.batchId, pollId: input.pollId, side: input.side, amount: input.amount, orderSalt: orderSalt.toString(), nullifierHash: nullifierHash.toString(), orderCommitment: orderCommitment.toString(), privateClaimLeaf: privateClaimNote.leaf, privacyReceiptTxHash, proof, solidityProof, publicSignals }),
  });
  const payload = await response.json().catch(() => null) as { error?: string; order?: { id: string; status: string }; batch?: ShieldedTradeBatch } | null;
  if (!response.ok || !payload?.order) throw new Error(payload?.error || "Shielded order relay failed.");
	// The deposit secret and blinding are no longer needed after the nullifier is
	// accepted on-chain. Retain only the private payout note awaiting the batch.
	savePendingNote({ commitment: commitment.toString(), createdAt: new Date().toISOString(), privateClaimNote });
  return payload;
}

async function ensureShieldedTradeBatch(amount: number): Promise<ShieldedTradeBatch> {
  const response = await fetch(`${apiBaseURL()}/api/shielded-trades/batches`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  const payload = await response.json().catch(() => null) as { batch?: ShieldedTradeBatch; error?: string } | null;
  if (!response.ok || !payload?.batch) throw new Error(payload?.error || "Could not open a shielded trade batch.");
  return payload.batch;
}

export function claimPendingShieldedTradeNote(leaf: string): PrivateClaimNote | null {
  const notes = pendingNotes();
  const index = notes.findIndex(item => item.privateClaimNote.leaf === leaf);
  if (index < 0) return null;
  const [note] = notes.splice(index, 1);
  localStorage.setItem(DEPOSIT_NOTE_KEY, JSON.stringify(notes));
  return note.privateClaimNote;
}

async function loadCommitments(client: ReturnType<typeof createPublicClient>, vault: Address, count: number) {
  const result: Hex[] = [];
  for (let offset = 0; offset < count; offset += 256) {
    const values = await client.readContract({ address: vault, abi: vaultABI, functionName: "getCommitments", args: [offset, Math.min(256, count - offset)] });
    result.push(...values);
  }
  return result;
}

function merklePath(leaves: bigint[], zeros: bigint[], target: number, depth: number, hash: (values: bigint[]) => bigint) {
  let layer = [...leaves]; let index = target; const pathElements: bigint[] = []; const pathIndices: number[] = [];
  for (let level = 0; level < depth; level += 1) {
    const isRight = index % 2; const sibling = isRight ? layer[index - 1] : (layer[index + 1] ?? zeros[level]);
    pathElements.push(sibling); pathIndices.push(isRight);
    const next: bigint[] = [];
    for (let cursor = 0; cursor < layer.length; cursor += 2) next.push(hash([layer[cursor], layer[cursor + 1] ?? zeros[level]]));
    layer = next; index = Math.floor(index / 2);
  }
  return { pathElements, pathIndices, root: layer[0] };
}

async function sendAndWait(provider: Awaited<ReturnType<ConnectedWallet["getEthereumProvider"]>>, client: ReturnType<typeof createPublicClient>, from: Address, to: Address, data: Hex) {
  const hash = await provider.request({ method: "eth_sendTransaction", params: [{ from, to, data, value: "0x0" }] });
  if (typeof hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error("Wallet did not return a valid transaction hash.");
  await client.waitForTransactionReceipt({ hash: hash as Hex }); return hash;
}
function randomField() { const bytes = new Uint8Array(31); crypto.getRandomValues(bytes); return BigInt(`0x${Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("")}`) % FIELD; }
function fieldHex(value: bigint) { return `0x${(value % FIELD).toString(16).padStart(64, "0")}` as Hex; }
function rawDenomination(amount: string, feeBps: number, decimals: number) { return parseUnits(amount, decimals) * BigInt(10000 + feeBps) / 10000n; }
function inverse(value: bigint) { let base = value % FIELD; let exponent = FIELD - 2n; let result = 1n; while (exponent > 0n) { if (exponent & 1n) result = result * base % FIELD; base = base * base % FIELD; exponent >>= 1n; } return result; }
function pendingNotes(): PendingShieldedTradeNote[] { try { const parsed = JSON.parse(localStorage.getItem(DEPOSIT_NOTE_KEY) || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function savePendingNote(note: PendingShieldedTradeNote) { const notes = pendingNotes().filter(item => item.commitment !== note.commitment); notes.push(note); localStorage.setItem(DEPOSIT_NOTE_KEY, JSON.stringify(notes)); }
