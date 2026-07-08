import { chainAddEthereumParams, chainMetadata, numberToHex } from "./chains";
import type { ConnectedWallet, EthereumProvider } from "./erc20Transfer";

export type { EthereumProvider };

type StoredExternalWallet = {
  address: string;
  provider: EthereumProvider;
  wallet: ConnectedWallet;
};

let activeExternalWallet: StoredExternalWallet | null = null;

export function rememberExternalWallet(address: string, provider: EthereumProvider) {
  const normalizedAddress = address.trim();
  activeExternalWallet = {
    address: normalizedAddress,
    provider,
    wallet: {
      address: normalizedAddress,
      getEthereumProvider: async () => provider,
      provider,
      switchChain: async (chainId: number) => {
        await switchInjectedWalletChain(provider, chainId);
      },
    },
  };
  return activeExternalWallet;
}

export function browserWalletForAddress(address: string): ConnectedWallet | null {
  if (activeExternalWallet && activeExternalWallet.address.toLowerCase() === address.trim().toLowerCase()) {
    return activeExternalWallet.wallet;
  }
  const ethereum = (window as Window & { ethereum?: EthereumProvider }).ethereum;
  if (!ethereum) {
    return null;
  }
  return rememberExternalWallet(address, ethereum).wallet;
}

async function switchInjectedWalletChain(provider: EthereumProvider, chainId: number) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: numberToHex(chainId) }],
    });
    return;
  } catch (error) {
    const chain = chainMetadata(chainId);
    if (!chain || !isUnrecognizedChainError(error)) {
      throw error;
    }
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [chainAddEthereumParams(chain)],
    });
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: numberToHex(chainId) }],
    });
  }
}

function isUnrecognizedChainError(error: unknown) {
  const code = (error as { code?: number | string } | null)?.code;
  if (code === 4902 || code === "4902") {
    return true;
  }
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("unrecognized chain") || message.includes("not been added") || message.includes("wallet_addethereumchain");
}
