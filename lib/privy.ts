type RuntimeEnv = Record<string, string | undefined>;

const runtimeEnv = ((globalThis as unknown as { __BUDOL_CLIENT_ENV__?: RuntimeEnv }).__BUDOL_CLIENT_ENV__ ?? {}) as RuntimeEnv;

export const PRIVY_APP_ID = runtimeEnv.VITE_PRIVY_APP_ID || "";
export const PRIVY_CLIENT_ID = runtimeEnv.VITE_PRIVY_CLIENT_ID || "";

export function isPrivyConfigured() {
  return Boolean(PRIVY_APP_ID && PRIVY_APP_ID !== "replace-with-privy-app-id");
}
// 
