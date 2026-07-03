import {
  ArrowDownLeft,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { renderSVG } from "uqr";
import { loadWalletBalance, loadWalletHistory } from "../lib/api";
import { shortAddress } from "../lib/format";
import type { BudolUser, WalletBalance, WalletTransfer } from "../types";

type MyWalletPageProps = {
  accountAddress?: string;
  isDark: boolean;
  onBack: () => void;
  onLoginClick: () => void;
  user: BudolUser | null;
};

const arbitrumSepoliaChainId = 421614;
const fallbackBudolTokenAddress = "0x12fF5d28F93c1CABDA4Bd0ddf8906FF7E4Df1c4e";

export function MyWalletPage({ accountAddress, onBack, onLoginClick, user }: MyWalletPageProps) {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [history, setHistory] = useState<WalletTransfer[]>([]);
  const [copied, setCopied] = useState(false);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const displayAddress = accountAddress ?? user?.walletAddress ?? "";
  const walletDescription = user?.walletCustody === "external" ? "External EVM wallet connected for BudolPH." : "BudolPH-managed wallet connected.";
  const tokenAddress = balance?.tokenAddress || fallbackBudolTokenAddress;
  const explorerURL = displayAddress ? `https://sepolia.arbiscan.io/token/${tokenAddress}?a=${displayAddress}#transactions` : "";
  const receiveQRCode = useMemo(() => {
    if (!displayAddress) {
      return "";
    }
    const svg = renderSVG(`ethereum:${displayAddress}@${arbitrumSepoliaChainId}`, {
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
      loadWalletBalance(),
      loadWalletHistory(),
    ]);
    if (balanceResult.status === "fulfilled") {
      const nextBalance = balanceResult.value;
      setBalance(nextBalance);
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
        <p>Log in with Google to create and connect your BudolPH wallet.</p>
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
      </div>

      <div className="wallet-layout">
        <section className="panel wallet-balance-card">
          <div className="panel-title">
            <Wallet size={19} />
            <h2>BUDOL balance</h2>
          </div>
          <strong>{balance ? `${formatTokenAmount(balance.formatted)} BUDOL` : isLoadingWallet ? "Loading..." : "0 BUDOL"}</strong>
          <div className="wallet-address-box">
            <span>Arbitrum Sepolia</span>
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
            <h2>Transaction history</h2>
          </div>
          {walletError ? <p className="wallet-note">{walletError}</p> : null}
          <div className="wallet-history-list">
            {history.length > 0 ? history.map(transfer => (
              <a className="wallet-history-item" href={`https://sepolia.arbiscan.io/tx/${transfer.transactionHash}`} target="_blank" rel="noreferrer" key={`${transfer.transactionHash}-${transfer.logIndex}`}>
                <span className={`wallet-history-icon ${transfer.direction === "received" ? "received" : "sent"}`}>
                  {transfer.direction === "received" ? <ArrowDownLeft size={17} /> : <ExternalLink size={17} />}
                </span>
                <span>
                  <strong>{transfer.direction === "received" ? "Received" : "Sent"} {formatTokenAmount(transfer.amount)} BUDOL</strong>
                  <small>{transfer.direction === "received" ? "From" : "To"} {shortAddress(transfer.counterparty)}</small>
                </span>
                <small>{formatWalletDate(transfer.timestamp)}</small>
              </a>
            )) : (
              <div className="wallet-history-item welcome-entry">
                <span className="wallet-history-icon received">
                  <ShieldCheck size={17} />
                </span>
                <span>
                  <strong>No BUDOL transfers yet</strong>
                  <small>New accounts receive 100 BUDOL after the backend account sync finishes.</small>
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
                <span>Arbitrum Sepolia wallet</span>
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
