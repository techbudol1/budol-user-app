import {
  ArrowDownLeft,
  ArrowLeft,
  Check,
  CircleDollarSign,
  Copy,
  ExternalLink,
  Fuel,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { renderSVG } from "uqr";
import { loadWalletBalances, loadWalletHistory } from "../lib/api";
import { shortAddress } from "../lib/format";
import type { BudolUser, WalletBalance, WalletTransfer } from "../types";

type MyWalletPageProps = {
  accountAddress?: string;
  isDark: boolean;
  onBack: () => void;
  onLoginClick: () => void;
  user: BudolUser | null;
};

const horizenTestnetChainId = 2651420;
const horizenExplorerBaseURL = "https://horizen-testnet.explorer.caldera.xyz";

export function MyWalletPage({ accountAddress, onBack, onLoginClick, user }: MyWalletPageProps) {
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [history, setHistory] = useState<WalletTransfer[]>([]);
  const [copied, setCopied] = useState(false);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const displayAddress = accountAddress ?? user?.walletAddress ?? "";
  const walletDescription = "Self-custodial EVM wallet connected for BudolPH.";
  const explorerURL = displayAddress ? `${horizenExplorerBaseURL}/address/${displayAddress}` : "";
  const displayBalances = normalizeWalletBalances(balances, displayAddress);
  const receiveQRCode = useMemo(() => {
    if (!displayAddress) {
      return "";
    }
    const svg = renderSVG(`ethereum:${displayAddress}@${horizenTestnetChainId}`, {
      border: 2,
      ecc: "M",
      pixelSize: 7,
      whiteColor: "#ffffff",
      blackColor: "#10171b",
    });
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [displayAddress]);

  const copyAddress = async () => {
    if (!displayAddress) {
      return;
    }
    await navigator.clipboard.writeText(displayAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const refreshWallet = async () => {
    if (!displayAddress) {
      return;
    }
    setIsLoadingWallet(true);
    setWalletError("");
    const [balanceResult, historyResult] = await Promise.allSettled([
      loadWalletBalances(),
      loadWalletHistory(),
    ]);
    if (balanceResult.status === "fulfilled") {
      const nextBalances = balanceResult.value;
      setBalances(nextBalances);
    }
    if (historyResult.status === "fulfilled") {
      setHistory(historyResult.value);
    }
    if (balanceResult.status === "rejected") {
      setWalletError(balanceResult.reason instanceof Error ? balanceResult.reason.message : "Unable to load wallet balance.");
    }
    setIsLoadingWallet(false);
  };

  useEffect(() => {
    void refreshWallet();
  }, [displayAddress]);

  if (!displayAddress) {
    return (
      <section className="simple-page">
        <h1>My Wallet</h1>
        <p>Connect a self-custodial wallet to use BudolPH.</p>
        <button className="primary-button" onClick={onLoginClick}>
          <Wallet size={18} />
          Login
        </button>
      </section>
    );
  }

  return (
    <section className="wallet-page">
      <div className="account-hero wallet-hero">
        <button className="ghost-button account-back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          Back to markets
        </button>
        <div>
          <span className="eyebrow">My Wallet</span>
          <h1>{shortAddress(displayAddress)}</h1>
          <p>{walletDescription}</p>
        </div>
        <div className="wallet-network-strip" aria-label="Wallet token structure">
          <span><Fuel size={15} /> ETH gas</span>
          <span><Sparkles size={15} /> tZEN privacy fees</span>
          <span><CircleDollarSign size={15} /> BUDOL trading</span>
        </div>
      </div>

      <div className="wallet-layout">
        <section className="panel wallet-balance-card">
          <div className="panel-title">
            <Wallet size={19} />
            <h2>Wallet balances</h2>
          </div>
          <div className="wallet-balance-list">
            {displayBalances.map(item => (
              <div className={`wallet-balance-row token-${tokenClass(item.symbol || item.label)}`} key={`${item.symbol || item.label}-${item.tokenAddress || "native"}`}>
                <span className="wallet-token-mark">{tokenMark(item.symbol || item.label)}</span>
                <span>{item.label || item.symbol || "Token"}</span>
                <strong>{isLoadingWallet && item.isPlaceholder ? "Loading..." : `${formatTokenAmount(item.formatted)} ${item.symbol || ""}`}</strong>
                <small>{tokenPurpose(item.symbol || item.label)}</small>
              </div>
            ))}
          </div>
          <div className="wallet-address-box">
            <span>Horizen Testnet</span>
            <strong>{displayAddress}</strong>
          </div>
          <div className="account-action-row">
            <button className="ghost-button" onClick={() => void refreshWallet()} disabled={isLoadingWallet}>
              {isLoadingWallet ? "Refreshing" : "Refresh balance"}
            </button>
            <button className="primary-button" onClick={() => setIsReceiveOpen(true)}>
              <ArrowDownLeft size={18} />
              Receive
            </button>
            <button className="primary-button" onClick={() => void copyAddress()}>
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? "Copied" : "Copy address"}
            </button>
            <a className="ghost-button account-link-button" href={explorerURL} target="_blank" rel="noreferrer">
              <ExternalLink size={18} />
              Explorer
            </a>
          </div>
        </section>
      </div>

      <div className="wallet-content-grid">
        <section className="panel wallet-history-card">
          <div className="panel-title">
            <ShieldCheck size={19} />
            <h2>Unified activity</h2>
          </div>
          <div className="wallet-history-token-row" aria-label="Tracked wallet activity">
            <span>ETH gas in Explorer</span>
            <span>tZEN transfers</span>
            <span>BUDOL transfers</span>
          </div>
          {walletError ? <p className="wallet-note">{walletError}</p> : null}
          <div className="wallet-history-list">
            {history.length > 0 ? history.map(transfer => (
              <a className="wallet-history-item" href={`${horizenExplorerBaseURL}/tx/${transfer.transactionHash}`} target="_blank" rel="noreferrer" key={`${transfer.transactionHash}-${transfer.logIndex}`}>
                <span className={`wallet-history-icon ${transfer.direction === "received" ? "received" : "sent"}`}>
                  {transfer.direction === "received" ? <ArrowDownLeft size={17} /> : <ExternalLink size={17} />}
                </span>
                <span>
                  <strong>{transfer.direction === "received" ? "Received" : "Sent"} {formatTokenAmount(transfer.amount)} {transfer.tokenSymbol || "Token"}</strong>
                  <small>{transfer.direction === "received" ? "From" : "To"} {shortAddress(transfer.counterparty)}</small>
                </span>
                <small>
                  <span className={`wallet-token-pill token-${tokenClass(transfer.tokenSymbol || transfer.tokenLabel)}`}>
                    {transfer.tokenSymbol || transfer.tokenLabel || "Token"}
                  </span>
                  {formatWalletDate(transfer.timestamp)}
                </small>
              </a>
            )) : (
              <div className="wallet-history-item welcome-entry">
                <span className="wallet-history-icon received">
                  <ShieldCheck size={17} />
                </span>
                <span>
                  <strong>No token transfers yet</strong>
                  <small>ETH gas activity is visible in Explorer. BUDOL and tZEN ERC-20 transfers will appear here.</small>
                </span>
                <small>{isLoadingWallet ? "Checking" : "Ready"}</small>
              </div>
            )}
          </div>
        </section>
      </div>

      {isReceiveOpen ? (
        <div className="wallet-manage-backdrop" role="presentation" onMouseDown={() => setIsReceiveOpen(false)}>
          <section className="wallet-receive-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-receive-title" onMouseDown={event => event.stopPropagation()}>
            <div className="wallet-manage-head">
              <button aria-label="Back" onClick={() => setIsReceiveOpen(false)}>
                <ArrowLeft size={22} />
              </button>
              <h2 id="wallet-receive-title">Receive Funds</h2>
              <button aria-label="Close" onClick={() => setIsReceiveOpen(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="wallet-receive-body">
              <div className="wallet-qr-frame">
                <img src={receiveQRCode} alt="Wallet address QR code" />
              </div>
              <div className="wallet-address-box">
                <span>Horizen Testnet wallet</span>
                <strong>{displayAddress}</strong>
              </div>
              <button className="primary-button" onClick={() => void copyAddress()}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? "Copied" : "Copy address"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

type DisplayWalletBalance = WalletBalance & {
  isPlaceholder?: boolean;
};

function normalizeWalletBalances(balances: WalletBalance[], walletAddress: string): DisplayWalletBalance[] {
  const preferred = [
    { label: "ETH balance", symbol: "ETH", decimals: 18 },
    { label: "tZEN balance", symbol: "tZEN", decimals: 18 },
    { label: "BUDOL balance", symbol: "BUDOL", decimals: 18 },
  ];

  return preferred.map(expected => {
    const match = balances.find(item => {
      const symbol = (item.symbol || item.label || "").toLowerCase();
      return symbol === expected.symbol.toLowerCase() || symbol.includes(expected.symbol.toLowerCase());
    });
    if (match) {
      return match;
    }
    return {
      raw: "0",
      formatted: "0",
      decimals: expected.decimals,
      label: expected.label,
      symbol: expected.symbol,
      walletAddress,
      fetchedAt: new Date().toISOString(),
      isPlaceholder: true,
    };
  });
}

function tokenClass(value?: string) {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("budol")) return "budol";
  if (normalized.includes("zen")) return "zen";
  if (normalized.includes("eth")) return "eth";
  return "token";
}

function tokenMark(value?: string) {
  const normalized = tokenClass(value);
  if (normalized === "budol") return "B";
  if (normalized === "zen") return "Z";
  if (normalized === "eth") return "Ξ";
  return "•";
}

function tokenPurpose(value?: string) {
  const normalized = tokenClass(value);
  if (normalized === "budol") return "Used for market trades and payouts.";
  if (normalized === "zen") return "Used for privacy access features.";
  if (normalized === "eth") return "Used for Horizen testnet gas.";
  return "Tracked token balance.";
}

function formatTokenAmount(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }
  return new Intl.NumberFormat("en", { maximumFractionDigits: 4 }).format(parsed);
}

function formatWalletDate(value: string) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
