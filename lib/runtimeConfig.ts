export type ClientRuntimeEnv = Record<string, string | undefined>;

export const CLIENT_RUNTIME_ENV = (
  (globalThis as unknown as { __BUDOL_CLIENT_ENV__?: ClientRuntimeEnv }).__BUDOL_CLIENT_ENV__ ?? {}
) as ClientRuntimeEnv;

function configuredBaseURL(key: string): string {
  return (CLIENT_RUNTIME_ENV[key] || "").trim().replace(/\/+$/, "");
}

function isLocalBrowser(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

export function apiBaseURL(): string {
  return configuredBaseURL("VITE_API_BASE_URL") || (isLocalBrowser() ? "http://localhost:8082" : "");
}

export function gmrEngineBaseURL(): string {
  return configuredBaseURL("VITE_GMR_ENGINE_BASE_URL") || (isLocalBrowser() ? "http://localhost:8090" : "");
}
