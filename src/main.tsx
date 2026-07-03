import "./lib/nodePolyfills";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import App from "./App";
import "./app.css";
import { PRIVY_APP_ID, PRIVY_CLIENT_ID } from "./lib/privy";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <PrivyProvider
      appId={PRIVY_APP_ID || "replace-with-privy-app-id"}
      clientId={PRIVY_CLIENT_ID && PRIVY_CLIENT_ID !== PRIVY_APP_ID ? PRIVY_CLIENT_ID : undefined}
      config={{
        loginMethods: ["google"],
        appearance: {
          theme: "light",
          accentColor: "#ffd34d",
          logo: "/assets/budol-politics-market.png",
          walletChainType: "ethereum-only",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
);
