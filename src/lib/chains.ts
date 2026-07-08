export type ChainMetadata = {
  blockExplorerUrls: string[];
  chainId: number;
  chainName: string;
  nativeCurrency: {
    decimals: number;
    name: string;
    symbol: string;
  };
  rpcUrls: string[];
};

export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
export const HORIZEN_TESTNET_CHAIN_ID = 2651420;
export const HORIZEN_MAINNET_CHAIN_ID = 26514;

export const ARBITRUM_SEPOLIA_CHAIN: ChainMetadata = {
  blockExplorerUrls: ["https://sepolia.arbiscan.io"],
  chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
  chainName: "Arbitrum Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
};

export const HORIZEN_TESTNET_CHAIN: ChainMetadata = {
  blockExplorerUrls: ["https://horizen-testnet.explorer.caldera.xyz/"],
  chainId: HORIZEN_TESTNET_CHAIN_ID,
  chainName: "Horizen Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: ["https://horizen-testnet.rpc.caldera.xyz/http"],
};

export const HORIZEN_MAINNET_CHAIN: ChainMetadata = {
  blockExplorerUrls: ["https://horizen.calderaexplorer.xyz/"],
  chainId: HORIZEN_MAINNET_CHAIN_ID,
  chainName: "Horizen",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: ["https://horizen.calderachain.xyz/http"],
};

const chainsById = new Map<number, ChainMetadata>([
  [ARBITRUM_SEPOLIA_CHAIN.chainId, ARBITRUM_SEPOLIA_CHAIN],
  [HORIZEN_TESTNET_CHAIN.chainId, HORIZEN_TESTNET_CHAIN],
  [HORIZEN_MAINNET_CHAIN.chainId, HORIZEN_MAINNET_CHAIN],
]);

export function chainMetadata(chainId: number) {
  return chainsById.get(chainId);
}

export function isArbitrumSepolia(chainId: number) {
  return chainId === ARBITRUM_SEPOLIA_CHAIN_ID;
}

export function isHorizen(chainId: number) {
  return chainId === HORIZEN_TESTNET_CHAIN_ID || chainId === HORIZEN_MAINNET_CHAIN_ID;
}

export function chainAddEthereumParams(chain: ChainMetadata) {
  return {
    blockExplorerUrls: chain.blockExplorerUrls,
    chainId: numberToHex(chain.chainId),
    chainName: chain.chainName,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: chain.rpcUrls,
  };
}

export function numberToHex(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Invalid chain ID.");
  }
  return `0x${value.toString(16)}` as `0x${string}`;
}
