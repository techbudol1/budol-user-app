import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

function loadEnvFile(path: string) {
  const values: Record<string, string> = {};
  if (!existsSync(path)) {
    return values;
  }

  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (!key) {
      continue;
    }
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value.replaceAll("\\n", "\n");
  }

  return values;
}

const frontendEnv = loadEnvFile(".env.frontend");
const env = (key: string, fallback = "") => frontendEnv[key] ?? Bun.env[key] ?? fallback;

const clientEnv = {
  VITE_API_BASE_URL: env("VITE_API_BASE_URL"),
  VITE_ARBITRUM_SEPOLIA_RPC_URL: env("VITE_ARBITRUM_SEPOLIA_RPC_URL", env("ARBITRUM_SEPOLIA_RPC_URL")),
  VITE_GMR_ENGINE_BASE_URL: env("VITE_GMR_ENGINE_BASE_URL"),
};

mkdirSync("public", { recursive: true });
writeFileSync(
  "public/client-env.js",
  `window.__BUDOL_CLIENT_ENV__ = ${JSON.stringify(clientEnv, null, 2)};\n`,
);
