import { createPublicClient, http, parseAbi, type Address, type Hex } from "viem";
import { arbitrumSepolia } from "viem/chains";
import type { TradeConfig, TradeSide } from "../types";
import { submitGaslessEscrowTransfer } from "./api";
import { chainAddEthereumParams, chainMetadata, isArbitrumSepolia, numberToHex } from "./chains";
import { ARBITRUM_SEPOLIA_RPC_URL } from "./walletConfig";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export type ConnectedWallet = {
  address?: string;
  provider?: EthereumProvider;
  getEthereumProvider: () => Promise<EthereumProvider>;
  switchChain: (chainId: number) => Promise<void>;
};

type TransactionReceipt = {
  status?: string;
};

const erc20TransferSelector = "a9059cbb";
const erc20PermitAbi = parseAbi([
  "function name() view returns (string)",
  "function nonces(address owner) view returns (uint256)",
]);

export async function sendBudolEscrowTransfer(input: {
  amount: string;
  config: TradeConfig;
  from: string;
  pollId: string;
  side: TradeSide;
  wallet: ConnectedWallet;
}): Promise<string> {
  const normalized = normalizeTransferInput(input);
  if (isArbitrumSepolia(normalized.chainId) && input.config.engineGasFreeEnabled) {
    return sendEngineGasFreePermitTransfer({
      ...normalized,
      amount: input.amount,
      pollId: input.pollId,
      side: input.side,
      wallet: input.wallet,
    });
  }
  return sendDirectBudolTransfer({
    ...normalized,
    wallet: input.wallet,
  });
}

async function sendEngineGasFreePermitTransfer(input: NormalizedTransferInput & {
  amount: string;
  pollId: string;
  side: TradeSide;
  wallet: ConnectedWallet;
}) {
  if (input.chainId !== arbitrumSepolia.id) {
    throw new Error("Engine gas-free trading is currently configured for Arbitrum Sepolia only.");
  }

  await ensureWalletChain(input.wallet, input.chainId);
  const provider = await input.wallet.getEthereumProvider();
  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(ARBITRUM_SEPOLIA_RPC_URL),
  });

  let tokenName = "";
  let nonce = 0n;
  try {
    tokenName = await publicClient.readContract({
      abi: erc20PermitAbi,
      address: input.tokenAddress,
      functionName: "name",
    });
    nonce = await publicClient.readContract({
      abi: erc20PermitAbi,
      address: input.tokenAddress,
      args: [input.from],
      functionName: "nonces",
    });
  } catch {
    throw new Error("Gas-free trading requires an ERC-20 token with permit support.");
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 15 * 60);
  const typedData = {
    domain: {
      chainId: input.chainId,
      name: tokenName,
      verifyingContract: input.tokenAddress,
      version: "1",
    },
    message: {
      deadline: deadline.toString(),
      nonce: nonce.toString(),
      owner: input.from,
      spender: input.permitSpenderAddress,
      value: input.amountRaw.toString(),
    },
    primaryType: "Permit",
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
  };

  let signature = "";
  try {
    signature = await provider.request({
      method: "eth_signTypedData_v4",
      params: [input.from, JSON.stringify(typedData)],
    }) as string;
  } catch (error) {
    throw normalizePermitSignatureError(error);
  }

  const { r, s, v } = splitSignature(signature);
  try {
    const result = await submitGaslessEscrowTransfer({
      amount: input.amount,
      deadline: deadline.toString(),
      owner: input.from,
      pollId: input.pollId,
      r,
      s,
      side: input.side,
      v,
    });
    return result.escrowTxHash;
  } catch (error) {
    throw normalizeEngineGasFreeError(error);
  }
}


async function sendDirectBudolTransfer(input: NormalizedTransferInput & {
  wallet: ConnectedWallet;
}) {
  await ensureWalletChain(input.wallet, input.chainId);
  const provider = await input.wallet.getEthereumProvider();
  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        chainId: numberToHex(input.chainId),
        data: encodeERC20Transfer(input.escrowWalletAddress, input.amountRaw),
        from: input.from,
        to: input.tokenAddress,
        value: "0x0",
      },
    ],
  });

  if (typeof txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    throw new Error("Wallet did not return a valid transaction hash.");
  }

  await waitForTransactionReceipt(provider, txHash);
  return txHash;
}

type NormalizedTransferInput = {
  amountRaw: bigint;
  chainId: number;
  escrowWalletAddress: Address;
  from: Address;
  permitSpenderAddress: Address;
  tokenAddress: Address;
};

function normalizeTransferInput(input: {
  amount: string;
  config: TradeConfig;
  from: string;
}): NormalizedTransferInput {
  return {
    amountRaw: parseTokenAmount(input.amount, input.config.tokenDecimals),
    chainId: input.config.chainId,
    escrowWalletAddress: normalizeAddress(input.config.escrowWalletAddress, "escrow wallet address"),
    from: normalizeAddress(input.from, "wallet address"),
    permitSpenderAddress: normalizeAddress(input.config.gaslessSpenderAddress || input.config.escrowWalletAddress, "gas-free spender address"),
    tokenAddress: normalizeAddress(input.config.tokenAddress, "token address"),
  };
}

async function ensureWalletChain(wallet: ConnectedWallet, chainId: number) {
  try {
    await wallet.switchChain(chainId);
    return;
  } catch (switchError) {
    const provider = await wallet.getEthereumProvider();
    const chain = chainMetadata(chainId);
    if (chain) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [chainAddEthereumParams(chain)],
        });
        await wallet.switchChain(chainId);
        return;
      } catch {
        // Fall through to the original switch error below.
      }
    }
    throw normalizeWalletError(switchError, "Switch your wallet to the configured chain, then try again.");
  }
}

async function waitForTransactionReceipt(provider: EthereumProvider, txHash: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (attempt > 0) {
      await delay(1500);
    }
    try {
      const receipt = await provider.request({
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }) as TransactionReceipt | null;
      if (!receipt) {
        continue;
      }
      if (String(receipt.status).toLowerCase() === "0x0") {
        throw new Error("Escrow transfer reverted on-chain.");
      }
      return;
    } catch (error) {
      if (error instanceof Error && error.message.includes("reverted")) {
        throw error;
      }
      return;
    }
  }
}

function encodeERC20Transfer(recipient: Address, amountRaw: bigint): Hex {
  const addressWord = recipient.slice(2).toLowerCase().padStart(64, "0");
  const amountWord = amountRaw.toString(16).padStart(64, "0");
  return `0x${erc20TransferSelector}${addressWord}${amountWord}`;
}

function parseTokenAmount(value: string, decimals: number) {
  const amount = value.trim();
  if (!amount || !/^\d+(\.\d+)?$/.test(amount)) {
    throw new Error("Enter a valid BUDOL amount.");
  }
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error("Token decimals are invalid.");
  }

  const [wholePart, fractionPart = ""] = amount.split(".");
  if (fractionPart.length > decimals) {
    throw new Error(`Amount cannot have more than ${decimals} decimal places.`);
  }
  const whole = BigInt(wholePart || "0");
  const fraction = BigInt((fractionPart + "0".repeat(decimals)).slice(0, decimals) || "0");
  const raw = whole * 10n ** BigInt(decimals) + fraction;
  if (raw <= 0n) {
    throw new Error("Amount must be greater than zero.");
  }
  return raw;
}

function normalizeAddress(value: string, label: string): Address {
  const address = value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(`Invalid ${label}.`);
  }
  return address as Address;
}

function normalizeWalletError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error;
  }
  return new Error(fallback);
}

function normalizeSponsoredTransferError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalized = message.toLowerCase();
  if (normalized.includes("user rejected") || normalized.includes("cancelled") || normalized.includes("denied")) {
    return new Error("Wallet confirmation was cancelled.");
  }
  if (normalized.includes("failed to fetch")) {
    return new Error("Gas sponsorship request failed. Check the gas policy settings for Arbitrum Sepolia.");
  }
  if (normalized.includes("sponsor") || normalized.includes("paymaster") || normalized.includes("policy")) {
    return new Error(message || "Gas sponsorship is not configured for this transaction.");
  }
  if (normalized.includes("insufficient")) {
    return new Error("Not enough BUDOL for this order, or gas sponsorship rejected the transaction.");
  }
  return error instanceof Error ? error : new Error(message || "Gas-free escrow transfer failed.");
}

function normalizePermitSignatureError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalized = message.toLowerCase();
  if (normalized.includes("user rejected") || normalized.includes("cancelled") || normalized.includes("denied")) {
    return new Error("Permit signature was cancelled.");
  }
  return error instanceof Error ? error : new Error(message || "Unable to sign the gas-free permit.");
}

function normalizeEngineGasFreeError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalized = message.toLowerCase();
  if (normalized.includes("failed to fetch")) {
    return new Error("Unable to reach BudolPH API. Check that the server is running.");
  }
  if (normalized.includes("permit") || normalized.includes("gas-free")) {
    return error instanceof Error ? error : new Error(message);
  }
  if (normalized.includes("insufficient")) {
    return new Error("Not enough BUDOL for this order.");
  }
  return error instanceof Error ? error : new Error(message || "Gas-free escrow transfer failed.");
}

function splitSignature(signature: string) {
  const trimmed = signature.trim();
  if (!/^0x[0-9a-fA-F]{130}$/.test(trimmed)) {
    throw new Error("Wallet returned an invalid permit signature.");
  }
  const r = `0x${trimmed.slice(2, 66)}`;
  const s = `0x${trimmed.slice(66, 130)}`;
  let v = Number.parseInt(trimmed.slice(130, 132), 16);
  if (v === 0 || v === 1) {
    v += 27;
  }
  if (v !== 27 && v !== 28) {
    throw new Error("Wallet returned an invalid permit recovery id.");
  }
  return { r, s, v };
}

function delay(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}
