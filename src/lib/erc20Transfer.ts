import { type Address, type Hex } from "viem";
import type { TradeConfig, TradeSide } from "../types";
import { chainAddEthereumParams, chainMetadata, numberToHex } from "./chains";

export type EthereumProvider = {
  isCoinbaseWallet?: boolean;
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  isPhantom?: boolean;
  isRabby?: boolean;
  isSubWallet?: boolean;
  isTrust?: boolean;
  providers?: EthereumProvider[];
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

export async function sendBudolEscrowTransfer(input: {
  amount: string;
  config: TradeConfig;
  from: string;
  pollId: string;
  side: TradeSide;
  wallet: ConnectedWallet;
}): Promise<string> {
  return sendDirectBudolTransfer({
    ...normalizeTransferInput(input),
    wallet: input.wallet,
  });
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
    throw new Error("Enter a valid amount.");
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

function delay(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}
