import { createPublicClient, defineChain, getAddress, http, type Address } from "viem";
import type { SmartWalletConfig } from "../types";

const simpleAccountFactoryAbi = [
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "uint256", name: "salt", type: "uint256" },
    ],
    name: "getAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export type SmartWalletResolution = {
  address: Address;
  owner: Address;
  status: "deployed" | "counterfactual";
};

export async function resolveSimpleSmartWallet(config: SmartWalletConfig, ownerAddress: string, index = 0n): Promise<SmartWalletResolution> {
  if (!config.enabled) {
    throw new Error("Smart wallet is not enabled.");
  }
  const owner = getAddress(ownerAddress) as Address;
  const chain = defineChain({
    id: config.chainId,
    name: config.networkName || "Horizen Testnet",
    nativeCurrency: {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
    },
    rpcUrls: {
      default: {
        http: [config.rpcUrl],
      },
    },
  });
  const publicClient = createPublicClient({
    chain,
    transport: http(config.rpcUrl),
  });
  const address = await publicClient.readContract({
    abi: simpleAccountFactoryAbi,
    address: getAddress(config.factoryAddress) as Address,
    args: [owner, index],
    functionName: "getAddress",
  });
  const code = await publicClient.getBytecode({ address });
  return {
    address: getAddress(address) as Address,
    owner,
    status: code && code !== "0x" ? "deployed" : "counterfactual",
  };
}
