import { createPublicClient, defineChain, getAddress, http, parseAbi, parseSignature, type Address, type Hex } from "viem";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import type { SmartWalletConfig, TradeConfig, TradeSide } from "../types";
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

export type EscrowTransferResult = {
  fromAddress?: string;
  txHash: string;
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
  smartWalletConfig?: SmartWalletConfig | null;
  wallet: ConnectedWallet;
}): Promise<EscrowTransferResult> {
  const normalized = normalizeTransferInput(input);
  if (input.smartWalletConfig?.enabled && input.smartWalletConfig.chainId === input.config.chainId) {
    return sendSmartWalletBudolTransfer({
      ...normalized,
      smartWalletConfig: input.smartWalletConfig,
      wallet: input.wallet,
    });
  }
  return sendDirectBudolTransfer({
    ...normalized,
    wallet: input.wallet,
  });
}

export async function signBudolPermit(input: {
  amount: string;
  config: TradeConfig;
  owner: string;
  spender: string;
  wallet: ConnectedWallet;
}): Promise<{ deadline: string; owner: string; r: string; s: string; v: number }> {
  const normalized = normalizePermitInput(input);
  await ensureWalletChain(input.wallet, normalized.chainId);
  const provider = await input.wallet.getEthereumProvider();
  const chain = chainForConfig(input.config);
  const publicClient = createPublicClient({
    chain,
    transport: http(chain.rpcUrls.default.http[0]),
  });
  const [tokenName, nonce] = await Promise.all([
    publicClient.readContract({ address: normalized.tokenAddress, abi: erc20PermitAbi, functionName: "name" }),
    publicClient.readContract({ address: normalized.tokenAddress, abi: erc20PermitAbi, functionName: "nonces", args: [normalized.owner] }),
  ]);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 15 * 60);
  const typedData = {
    domain: {
      chainId: normalized.chainId,
      name: tokenName,
      verifyingContract: normalized.tokenAddress,
      version: "1",
    },
    message: {
      deadline: deadline.toString(),
      nonce: nonce.toString(),
      owner: normalized.owner,
      spender: normalized.spender,
      value: normalized.amountRaw.toString(),
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
  const signature = await provider.request({
    method: "eth_signTypedData_v4",
    params: [normalized.owner, JSON.stringify(typedData)],
  });
  if (typeof signature !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(signature)) {
    throw new Error("Wallet did not return a valid permit signature.");
  }
  const parsed = parseSignature(signature as Hex);
  const v = Number(parsed.v ?? BigInt((parsed.yParity ?? 0) + 27));
  return {
    deadline: deadline.toString(),
    owner: normalized.owner,
    r: parsed.r,
    s: parsed.s,
    v,
  };
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
  return {
    fromAddress: input.from,
    txHash,
  };
}

async function sendSmartWalletBudolTransfer(input: NormalizedTransferInput & {
  smartWalletConfig: SmartWalletConfig;
  wallet: ConnectedWallet;
}): Promise<EscrowTransferResult> {
  const provider = await input.wallet.getEthereumProvider();
  const chain = defineChain({
    id: input.chainId,
    name: input.smartWalletConfig.networkName || "Horizen Testnet",
    nativeCurrency: {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
    },
    rpcUrls: {
      default: {
        http: [input.smartWalletConfig.rpcUrl],
      },
    },
  });
  await ensureWalletChain(input.wallet, input.chainId);

  const publicClient = createPublicClient({
    chain,
    transport: http(input.smartWalletConfig.rpcUrl),
  });
  const account = await toSimpleSmartAccount({
    client: publicClient,
    entryPoint: {
      address: normalizeAddress(input.smartWalletConfig.entryPointAddress, "EntryPoint address"),
      version: "0.8",
    },
    factoryAddress: normalizeAddress(input.smartWalletConfig.factoryAddress, "smart account factory address"),
    index: 0n,
    owner: provider,
  });
  const smartAccountAddress = getAddress(await account.getAddress()) as Address;
  const smartAccountClient = createSmartAccountClient({
    account,
    bundlerTransport: http(input.smartWalletConfig.bundlerUrl),
    chain,
    client: publicClient,
  });
  const userOpHash = await smartAccountClient.sendTransaction({
    data: encodeERC20Transfer(input.escrowWalletAddress, input.amountRaw),
    to: input.tokenAddress,
    value: 0n,
  });
  const receipt = await smartAccountClient.waitForUserOperationReceipt({
    hash: userOpHash,
    pollingInterval: 1500,
    timeout: 90_000,
  });
  if (!receipt.success) {
    throw new Error(receipt.reason || "Smart wallet escrow transfer reverted.");
  }
  const txHash = receipt.receipt.transactionHash;
  if (typeof txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    throw new Error("Bundler did not return a valid transaction hash.");
  }
  return {
    fromAddress: smartAccountAddress,
    txHash,
  };
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

function normalizePermitInput(input: {
  amount: string;
  config: TradeConfig;
  owner: string;
  spender: string;
}) {
  return {
    amountRaw: parseTokenAmount(input.amount, input.config.tokenDecimals),
    chainId: input.config.chainId,
    owner: normalizeAddress(input.owner, "permit owner"),
    spender: normalizeAddress(input.spender, "permit spender"),
    tokenAddress: normalizeAddress(input.config.tokenAddress, "token address"),
  };
}

function chainForConfig(config: TradeConfig) {
  const metadata = chainMetadata(config.chainId);
  const rpcUrl = metadata?.rpcUrls[0];
  return defineChain({
    id: config.chainId,
    name: config.networkName || metadata?.chainName || `Chain ${config.chainId}`,
    nativeCurrency: metadata?.nativeCurrency ?? {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
    },
    rpcUrls: {
      default: {
        http: [rpcUrl || "https://horizen-testnet.rpc.caldera.xyz/http"],
      },
    },
  });
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
