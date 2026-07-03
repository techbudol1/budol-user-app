import { buildPoseidon } from "circomlibjs";
import type { ShieldedPayoutNote, ShieldedWithdrawalCircuitInput } from "../types";
import { apiBaseURL } from "./runtimeConfig";

const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const NOTE_STORAGE_PREFIX = "budol.shieldedPayoutNote.";
const NOTE_VERSION = "budol-shielded-payout-v1";
const HASH_SCHEME = "poseidon-v1";
type PoseidonInstance = Awaited<ReturnType<typeof buildPoseidon>>;

export type ShieldedPayoutConfig = {
  chainId: number;
  denomination: string;
  enabled: boolean;
  poolAddress: string;
  tokenAddress: string;
  version: typeof NOTE_VERSION;
};

export type ShieldedWithdrawalProofBundle = {
  circuitInput: ShieldedWithdrawalCircuitInput;
  proof: unknown;
  publicSignals: unknown[];
  solidityProof: string;
  vk: unknown;
};

export class ShieldedWithdrawalArtifactError extends Error {
  constructor(message = "Shielded withdrawal proving artifacts are not available yet.") {
    super(message);
    this.name = "ShieldedWithdrawalArtifactError";
  }
}

let poseidonPromise: Promise<PoseidonInstance> | null = null;

function artifactBaseURL() {
  return apiBaseURL();
}

function artifactURL(file: string) {
  return `${artifactBaseURL()}/api/zk/shielded-withdrawal/${file}`;
}

function poseidonInstance() {
  if (!poseidonPromise) {
    poseidonPromise = buildPoseidon();
  }
  return poseidonPromise;
}

function normalizeField(value: bigint): bigint {
  const result = value % FIELD_MODULUS;
  return result >= 0n ? result : result + FIELD_MODULUS;
}

function fieldString(value: bigint): string {
  return normalizeField(value).toString();
}

function fieldToBytes32(value: bigint): string {
  return `0x${normalizeField(value).toString(16).padStart(64, "0")}`;
}

function randomField(): bigint {
  const bytes = new Uint8Array(31);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return normalizeField(BigInt(`0x${hex}`));
}

function addressField(address: string): bigint {
  const trimmed = address.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
    throw new Error("recipient must be a valid EVM address");
  }
  return normalizeField(BigInt(trimmed));
}

function decimalField(value: string | number, label: string): bigint {
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) {
    throw new Error(`${label} must be a whole-number field value`);
  }
  return normalizeField(BigInt(text));
}

async function poseidonHash(inputs: bigint[]): Promise<bigint> {
  const poseidon = await poseidonInstance();
  const field = poseidon.F;
  return normalizeField(BigInt(field.toString(poseidon(inputs.map(normalizeField)))));
}

function storageKey(tradeId: string) {
  return `${NOTE_STORAGE_PREFIX}${tradeId}`;
}

export function loadShieldedPayoutNote(tradeId: string): ShieldedPayoutNote | null {
  try {
    const raw = window.localStorage.getItem(storageKey(tradeId));
    if (!raw) return null;
    const note = JSON.parse(raw) as ShieldedPayoutNote;
    return isPoseidonShieldedPayoutNote(note) && note.tradeId === tradeId ? note : null;
  } catch {
    return null;
  }
}

export function listShieldedPayoutNotes(): ShieldedPayoutNote[] {
  const notes: ShieldedPayoutNote[] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(NOTE_STORAGE_PREFIX)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const note = JSON.parse(raw) as ShieldedPayoutNote;
      if (isPoseidonShieldedPayoutNote(note)) {
        notes.push(note);
      }
    }
  } catch {
    return notes;
  }
  return notes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveShieldedPayoutNote(note: ShieldedPayoutNote) {
  try {
    window.localStorage.setItem(storageKey(note.tradeId), JSON.stringify(note));
  } catch {
    // A shielded payout note is required to withdraw from the pool later.
	}
}

export function removeShieldedPayoutNote(tradeId: string) {
	try {
		window.localStorage.removeItem(storageKey(tradeId));
	} catch {
		// A missing local note does not affect a direct payout.
	}
}

export async function createShieldedPayoutNote(tradeId: string, config: ShieldedPayoutConfig): Promise<ShieldedPayoutNote> {
  const existing = loadShieldedPayoutNote(tradeId);
  if (
    existing &&
    existing.chainId === config.chainId &&
    existing.denomination === config.denomination &&
    existing.poolAddress.toLowerCase() === config.poolAddress.toLowerCase() &&
    existing.tokenAddress.toLowerCase() === config.tokenAddress.toLowerCase()
  ) {
    return existing;
  }
  const secret = randomField();
  const blinding = randomField();
  const commitmentField = await poseidonHash([
    secret,
    blinding,
    BigInt(config.chainId),
    addressField(config.tokenAddress),
    addressField(config.poolAddress),
    decimalField(config.denomination, "denomination"),
  ]);
  const note: ShieldedPayoutNote = {
    blinding: fieldString(blinding),
    chainId: config.chainId,
    commitment: fieldToBytes32(commitmentField),
    createdAt: new Date().toISOString(),
    denomination: config.denomination,
    hashScheme: HASH_SCHEME,
    poolAddress: config.poolAddress,
    secret: fieldString(secret),
    tokenAddress: config.tokenAddress,
    tradeId,
    version: NOTE_VERSION,
  };
  saveShieldedPayoutNote(note);
  return note;
}

function isPoseidonShieldedPayoutNote(note: ShieldedPayoutNote | null | undefined): note is ShieldedPayoutNote {
  if (!note || note.version !== NOTE_VERSION) return false;
  const hasDecimalWitness = /^\d+$/.test(String(note.secret || "")) && /^\d+$/.test(String(note.blinding || ""));
  return note.hashScheme === HASH_SCHEME || hasDecimalWitness;
}

export async function buildShieldedWithdrawalCircuitInput(note: ShieldedPayoutNote, recipientAddress: string): Promise<ShieldedWithdrawalCircuitInput> {
  const recipient = addressField(recipientAddress);
  const nullifier = await poseidonHash([decimalField(note.secret, "secret"), decimalField(note.blinding, "blinding"), recipient]);
  return {
    blinding: note.blinding,
    chainId: String(note.chainId),
    denomination: note.denomination,
    noteCommitment: BigInt(note.commitment).toString(),
    nullifierHash: fieldString(nullifier),
    poolAddress: fieldString(addressField(note.poolAddress)),
    recipient: fieldString(recipient),
    secret: note.secret,
    tokenAddress: fieldString(addressField(note.tokenAddress)),
  };
}

export function fieldPublicSignalToBytes32(value: string): string {
  return fieldToBytes32(decimalField(value, "public signal"));
}

export async function generateShieldedWithdrawalProof(circuitInput: ShieldedWithdrawalCircuitInput): Promise<ShieldedWithdrawalProofBundle> {
  const wasmURL = artifactURL("shielded_withdrawal.wasm");
  const zkeyURL = artifactURL("shielded_withdrawal_final.zkey");
  const verificationKeyURL = artifactURL("verification_key.json");
  const [wasmResponse, zkeyResponse, verificationKeyResponse] = await Promise.all([
    fetch(wasmURL),
    fetch(zkeyURL),
    fetch(verificationKeyURL),
  ]);
  if (!wasmResponse.ok || !zkeyResponse.ok || !verificationKeyResponse.ok) {
    throw new ShieldedWithdrawalArtifactError();
  }
  const vk = await verificationKeyResponse.json();
  const snarkjs = await import("snarkjs") as {
    groth16: {
      exportSolidityCallData: (proof: unknown, publicSignals: unknown[]) => Promise<string>;
      fullProve: (input: ShieldedWithdrawalCircuitInput, wasmFile: string, zkeyFile: string) => Promise<{ proof: unknown; publicSignals: unknown[] }>;
    };
  };
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(circuitInput, wasmURL, zkeyURL);
  const solidityProof = encodeGroth16ProofBytes(await snarkjs.groth16.exportSolidityCallData(proof, publicSignals));
  return {
    circuitInput,
    proof,
    publicSignals,
    solidityProof,
    vk,
  };
}

function encodeGroth16ProofBytes(solidityCallData: string): string {
  const [a, b, c] = JSON.parse(`[${solidityCallData}]`) as [unknown[], unknown[][], unknown[]];
  const words = [
    a[0], a[1],
    b[0]?.[0], b[0]?.[1], b[1]?.[0], b[1]?.[1],
    c[0], c[1],
  ];
  if (words.some(value => value === undefined || value === null)) {
    throw new Error("Unable to encode shielded withdrawal proof for Solidity.");
  }
  return `0x${words.map(toABIWord).join("")}`;
}

function toABIWord(value: unknown): string {
  const text = String(value).trim();
  const bigint = text.startsWith("0x") ? BigInt(text) : BigInt(text);
  return bigint.toString(16).padStart(64, "0");
}
