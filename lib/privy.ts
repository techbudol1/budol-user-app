import { CLIENT_RUNTIME_ENV } from "./runtimeConfig";

export const PRIVY_APP_ID = CLIENT_RUNTIME_ENV.VITE_PRIVY_APP_ID || "";
export const PRIVY_CLIENT_ID = CLIENT_RUNTIME_ENV.VITE_PRIVY_CLIENT_ID || "";
export const ALCHEMY_API_KEY = CLIENT_RUNTIME_ENV.VITE_ALCHEMY_API_KEY || "";
export const ALCHEMY_GAS_POLICY_ID = CLIENT_RUNTIME_ENV.VITE_ALCHEMY_GAS_POLICY_ID || "";
export const ARBITRUM_SEPOLIA_RPC_URL = CLIENT_RUNTIME_ENV.VITE_ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";

export function isPrivyConfigured() {
  return Boolean(PRIVY_APP_ID && PRIVY_APP_ID !== "replace-with-privy-app-id");
}
// 
