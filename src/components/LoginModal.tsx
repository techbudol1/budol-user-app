import { LoaderCircle, Wallet, X } from "lucide-react";
import { useEffect } from "react";
import { useState } from "react";
import { createWalletLoginChallenge, verifyWalletLogin } from "../lib/api";
import { rememberExternalWallet, type EthereumProvider } from "../lib/externalWallet";
import { apiBaseURL } from "../lib/runtimeConfig";
import type { BudolUser } from "../types";
import budolLogoImage from "../../public/assets/budol-market.png";
import baseWalletLogo from "../../public/assets/wallets/base-wallet.webp";
import metamaskLogo from "../../public/assets/wallets/metamask.webp";
import okxWalletLogo from "../../public/assets/wallets/okx-wallet.webp";
import phantomLogo from "../../public/assets/wallets/phantom.webp";
import rabbyLogo from "../../public/assets/wallets/rabby.webp";
import subwalletLogo from "../../public/assets/wallets/subwallet.webp";
import talismanLogo from "../../public/assets/wallets/talisman.webp";
import trustWalletLogo from "../../public/assets/wallets/trust-wallet.webp";

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLoggedIn: (user: BudolUser) => void;
};

type EIP6963Provider = {
  info: {
    icon?: string;
    name: string;
    rdns?: string;
    uuid: string;
  };
  provider: EthereumProvider;
};

type WalletOption = {
  icon?: string;
  id: string;
  installed: boolean;
  name: string;
  provider?: EthereumProvider;
};

const supportedWallets: WalletOption[] = [
  { id: "trust-wallet", installed: false, name: "Trust Wallet" },
  { id: "okx-wallet", installed: false, name: "OKX Wallet" },
  { id: "subwallet", installed: false, name: "SubWallet" },
  { id: "phantom", installed: false, name: "Phantom" },
  { id: "talisman", installed: false, name: "Talisman" },
];

export function LoginModal({ isOpen, onClose, onLoggedIn }: LoginModalProps) {
  const [serverError, setServerError] = useState("");
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>(supportedWallets);
  const [pendingProvider, setPendingProvider] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const isLoading = Boolean(pendingProvider);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.classList.add("modal-open");
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const found = new Map<string, WalletOption>(
      supportedWallets.map(wallet => [walletKey(wallet.name), wallet]),
    );
    setWalletOptions(Array.from(found.values()));
    const addWallet = (wallet: WalletOption) => {
      const key = walletKey(wallet.name);
      if (!found.has(key)) {
        return;
      }
      const existing = found.get(key);
      if (existing?.installed && wallet.installed) {
        return;
      }
      found.set(key, { ...wallet, id: key });
      setWalletOptions(Array.from(found.values()));
    };
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<EIP6963Provider>).detail;
      if (!detail?.provider || !detail.info?.uuid) {
        return;
      }
      addWallet({
        icon: detail.info.icon,
        id: detail.info.uuid,
        installed: true,
        name: detail.info.name,
        provider: detail.provider,
      });
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    const ethereum = (window as Window & { ethereum?: EthereumProvider }).ethereum;
    const providers: EthereumProvider[] = ethereum?.providers?.length ? ethereum.providers : ethereum ? [ethereum] : [];
    providers.forEach((provider, index) => {
      const name = providerName(provider);
      addWallet({
        id: `injected-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
        installed: true,
        name,
        provider,
      });
    });

    return () => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const loginWithExternalWallet = async (provider?: EthereumProvider, walletId = "wallet") => {
    setServerError("");
    setPendingProvider(walletId);
    try {
      const ethereum = provider ?? (window as Window & { ethereum?: EthereumProvider }).ethereum;
      if (!ethereum) {
        throw new Error("Install or open an EVM wallet extension, then try again.");
      }
      const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const address = accounts?.[0];
      if (!address) {
        throw new Error("No wallet address was returned.");
      }
      const challenge = await createWalletLoginChallenge(address);
      const signature = (await ethereum.request({
        method: "personal_sign",
        params: [challenge.message, challenge.address],
      })) as string;
      const user = await verifyWalletLogin({
        address: challenge.address,
        message: challenge.message,
        nonce: challenge.nonce,
        signature,
      });
      rememberExternalWallet(challenge.address, ethereum);
      onLoggedIn(user);
      onClose();
    } catch (loginError) {
      setServerError(isWalletCancellation(loginError) ? "Wallet connection was cancelled. Choose a login option to try again." : errorMessage(loginError));
    } finally {
      setPendingProvider("");
    }
  };

  const loginWithGoogle = () => {
    setServerError("");
    setPendingProvider("google");
    window.location.href = `${apiBaseURL()}/api/auth/google/start`;
  };

  const selectedWallet = walletOptions.find(wallet => wallet.id === selectedWalletId && wallet.installed);

  return (
    <div className="login-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="login-modal-title"
        aria-modal="true"
        className="login-modal login-modal-wide"
        onMouseDown={event => event.stopPropagation()}
        role="dialog"
      >
        <button className="login-modal-close" aria-label="Close login modal" onClick={onClose}>
          <X size={22} />
        </button>

        <div className="login-picker-layout">
          <aside className="login-picker-sidebar" aria-label="Login options">
            <div className="login-wallet-list">
              <button
                className={`login-picker-option wallet-option google-login-option ${selectedWalletId === "google" ? "active" : ""}`}
                disabled={isLoading}
                onClick={() => {
                  setServerError("");
                  setSelectedWalletId("google");
                }}
                type="button"
              >
                <span className="google-login-mark" aria-hidden="true">G</span>
                <span>
                  <strong>Google</strong>
                  <small>Managed wallet</small>
                </span>
                {pendingProvider === "google" ? <LoaderCircle className="spin-icon" size={16} /> : null}
              </button>
              {walletOptions.map(wallet => (
                <button
                  className={`login-picker-option wallet-option ${selectedWalletId === wallet.id ? "active" : ""}`}
                  disabled={isLoading || !wallet.installed}
                  key={wallet.id}
                  onClick={() => {
                    setServerError("");
                    setSelectedWalletId(wallet.id);
                  }}
                >
                  <WalletLogo icon={wallet.icon} name={wallet.name} />
                  <span>
                    <strong>{wallet.name}</strong>
                    <small>{wallet.installed ? "Installed" : "Not detected"}</small>
                  </span>
                  {pendingProvider === wallet.id ? <LoaderCircle className="spin-icon" size={16} /> : null}
                </button>
              ))}
            </div>
          </aside>

          <div className="login-picker-main">
            <div className="login-header compact">
              <div className="login-brand-mark">
                <img src={budolLogoImage} alt="BudolPH" className="login-logo-image" />
              </div>
              <div>
                <h2 id="login-modal-title">BudolPH</h2>
                <span>Philippine markets</span>
              </div>
            </div>

            <div className="login-copy">
              <h3>Connect wallet:</h3>
            </div>

            {selectedWalletId === "google" ? (
              <div className="login-method-card">
                <span className="login-selected-wallet-logo">
                  <span className="google-login-mark large" aria-hidden="true">G</span>
                </span>
                <small>Managed wallet</small>
                <h3>Google</h3>
                <p>Sign in with Google. BudolPH creates a managed wallet through GMR Engine Vault.</p>
                <button className="login-action-button google-action" disabled={isLoading} onClick={loginWithGoogle}>
                  {pendingProvider === "google" ? <LoaderCircle className="spin-icon" size={18} /> : <span className="google-button-mark" aria-hidden="true">G</span>}
                  <span>{pendingProvider === "google" ? "Opening Google..." : "Continue with Google"}</span>
                </button>
              </div>
            ) : selectedWallet ? (
              <div className="login-method-card">
                <span className="login-selected-wallet-logo">
                  <WalletLogo icon={selectedWallet.icon} name={selectedWallet.name} />
                </span>
                <small>External wallet</small>
                <h3>{selectedWallet.name}</h3>
                <p>Connect with your own EVM wallet and keep custody with you.</p>
                <button className="login-action-button" disabled={isLoading} onClick={() => void loginWithExternalWallet(selectedWallet.provider, selectedWallet.id)}>
                  {pendingProvider === selectedWallet.id ? <LoaderCircle className="spin-icon" size={18} /> : <Wallet size={18} />}
                  <span>{pendingProvider === selectedWallet.id ? "Connecting..." : `Connect ${selectedWallet.name}`}</span>
                </button>
              </div>
            ) : (
              <div className="login-empty-choice">
                <p>Choose Google for a managed wallet, or choose an installed wallet to self-custody.</p>
              </div>
            )}

            {serverError ? <p className="login-error">{serverError}</p> : null}

            <small className="login-legal">
              By continuing, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>
            </small>
          </div>
        </div>
      </section>
    </div>
  );
}

function WalletLogo({ icon, name }: { icon?: string; name: string }) {
  const [failedSource, setFailedSource] = useState("");
  const localLogo = walletLogoSource(name);
  const source = localLogo || icon;

  if (source && source !== failedSource) {
    return <img alt="" className="wallet-logo-image" src={source} onError={() => setFailedSource(source)} />;
  }

  return (
    <span className="wallet-logo-generic" aria-hidden="true">
      <Wallet size={26} />
    </span>
  );
}

function providerName(provider: EthereumProvider) {
  if (provider.isOkxWallet) return "OKX Wallet";
  if (provider.isPhantom) return "Phantom";
  if (provider.isTrust) return "Trust Wallet";
  if (provider.isSubWallet) return "SubWallet";
  if (provider.isRabby) return "Rabby";
  if (provider.isCoinbaseWallet) return "Base Wallet";
  if (provider.isMetaMask) return "MetaMask";
  return "Browser Wallet";
}

function walletKey(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("trust")) return "trust-wallet";
  if (normalized.includes("okx")) return "okx-wallet";
  if (normalized.includes("metamask")) return "metamask";
  if (normalized.includes("rabby")) return "rabby";
  if (normalized.includes("phantom")) return "phantom";
  if (normalized.includes("subwallet")) return "subwallet";
  if (normalized.includes("talisman")) return "talisman";
  if (normalized.includes("coinbase") || normalized.includes("base wallet")) return "base-wallet";
  return walletSlug(name);
}

function walletSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function walletLogoSource(name: string) {
  const logos: Record<string, string> = {
    "base-wallet": baseWalletLogo,
    metamask: metamaskLogo,
    "okx-wallet": okxWalletLogo,
    phantom: phantomLogo,
    rabby: rabbyLogo,
    subwallet: subwalletLogo,
    talisman: talismanLogo,
    "trust-wallet": trustWalletLogo,
  };
  return logos[walletKey(name)] ?? "";
}

function isWalletCancellation(error: unknown) {
  const candidate = error as { code?: number; message?: string } | null;
  const message = candidate?.message?.toLowerCase() ?? "";
  return candidate?.code === 4001 || message.includes("reject") || message.includes("denied") || message.includes("cancel") || message.includes("closed");
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return "Login failed. Please try again.";
}
