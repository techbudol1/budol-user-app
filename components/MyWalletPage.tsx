import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Cable,
  Check,
  Copy,
  ExternalLink,
  History,
  KeyRound,
  LoaderCircle,
  RefreshCcw,
  Send,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getContract, prepareContractCall } from "thirdweb";
import { useActiveAccount, useSendTransaction, useWalletBalance, useWalletDetailsModal } from "thirdweb/react";
import { toUnits } from "thirdweb/utils";
import { renderSVG } from "uqr";
import { loadWalletHistory } from "../lib/api";
import { shortAddress } from "../lib/format";
import { BUDOL_TOKEN_ADDRESS, BUDOL_TOKEN_DECIMALS, BUDOL_TOKEN_SYMBOL, thirdwebClient, web3Chain } from "../lib/thirdweb";
import type { BudolUser, WalletTransfer } from "../types";

type MyWalletPageProps = {
  accountAddress?: string;
  isDark: boolean;
  onBack: () => void;
  onLoginClick: () => void;
  user: BudolUser | null;
};

type WalletModalScreen = "linked-profiles" | "wallet-connect-receiver" | "export";

const addressPattern = /^0x[0-9a-fA-F]{40}$/;
const supportedTokens = {
  [web3Chain.id]: [
    {
      address: BUDOL_TOKEN_ADDRESS,
      name: "Budol",
      symbol: BUDOL_TOKEN_SYMBOL,
      icon: "/assets/budol-politics-market.png",
    },
  ],
};

export function MyWalletPage({ accountAddress, isDark, onBack, onLoginClick, user }: MyWalletPageProps) {
  const activeAccount = useActiveAccount();
  const detailsModal = useWalletDetailsModal();
  const sendTransaction = useSendTransaction({ payModal: false });
  const [history, setHistory] = useState<WalletTransfer[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [sendDraft, setSendDraft] = useState({ to: "", amount: "" });
  const [sendMessage, setSendMessage] = useState("");
  const [pendingTxHash, setPendingTxHash] = useState("");
  const [isRefreshingWallet, setIsRefreshingWallet] = useState(false);

  const displayAddress = activeAccount?.address ?? accountAddress ?? user?.walletAddress ?? "";
  const explorerURL = displayAddress ? `https://sepolia.arbiscan.io/address/${displayAddress}` : "";
  const receiveQRCode = useMemo(() => {
    if (!displayAddress) {
      return "";
    }
    const svg = renderSVG(`ethereum:${displayAddress}@${web3Chain.id}`, {
      border: 2,
      ecc: "M",
      pixelSize: 7,
      whiteColor: "#ffffff",
      blackColor: "#10171b",
    });
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [displayAddress]);
  const contract = useMemo(
    () =>
      getContract({
        address: BUDOL_TOKEN_ADDRESS,
        chain: web3Chain,
        client: thirdwebClient,
      }),
    [],
  );
  const balance = useWalletBalance(
    {
      address: displayAddress,
      chain: web3Chain,
      client: thirdwebClient,
      tokenAddress: BUDOL_TOKEN_ADDRESS,
    },
    {
      enabled: Boolean(displayAddress),
    },
  );

  const reloadHistory = async () => {
    setIsHistoryLoading(true);
    setHistoryError("");
    try {
      setHistory(await loadWalletHistory());
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Unable to load wallet history.");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const refreshWallet = async () => {
    setIsRefreshingWallet(true);
    try {
      await Promise.all([reloadHistory(), balance.refetch()]);
    } finally {
      setIsRefreshingWallet(false);
    }
  };

  useEffect(() => {
    if (displayAddress) {
      void reloadHistory();
    }
  }, [displayAddress]);

  const copyAddress = async () => {
    if (!displayAddress) {
      return;
    }
    await navigator.clipboard.writeText(displayAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const openWalletModal = (screen: WalletModalScreen) => {
    setIsManageOpen(false);
    if (!activeAccount) {
      setSendMessage("Reconnect your wallet to open thirdweb wallet controls.");
      onLoginClick();
      return;
    }
    detailsModal.open({
      chains: [web3Chain],
      client: thirdwebClient,
      displayBalanceToken: {
        [web3Chain.id]: BUDOL_TOKEN_ADDRESS,
      },
      manageWallet: {
        allowLinkingProfiles: true,
      },
      screen,
      showTestnetFaucet: true,
      supportedTokens,
      theme: isDark ? "dark" : "light",
    });
  };

  const sendBudol = async () => {
    setSendMessage("");
    if (!activeAccount) {
      setSendMessage("Reconnect your wallet before sending.");
      return;
    }
    if (!addressPattern.test(sendDraft.to)) {
      setSendMessage("Enter a valid recipient wallet address.");
      return;
    }
    if (!sendDraft.amount || Number(sendDraft.amount) <= 0) {
      setSendMessage("Enter an amount greater than zero.");
      return;
    }

    try {
      const transaction = prepareContractCall({
        contract,
        method: "function transfer(address to, uint256 value)",
        params: [sendDraft.to, toUnits(sendDraft.amount, BUDOL_TOKEN_DECIMALS)],
      });
      const result = await sendTransaction.mutateAsync(transaction);
      setPendingTxHash(result.transactionHash);
      setSendDraft({ to: "", amount: "" });
      setSendMessage(`Transfer submitted: ${shortAddress(result.transactionHash)}. Balance and history will refresh after confirmation.`);
      window.setTimeout(() => {
        void refreshWallet();
        setPendingTxHash("");
      }, 3000);
    } catch (error) {
      setSendMessage(error instanceof Error ? error.message : "Unable to send tokens.");
    }
  };

  if (!displayAddress) {
    return (
      <section className="simple-page">
        <h1>My Wallet</h1>
        <p>Log in with Google or Facebook to create and manage your Budol wallet.</p>
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
          <p>Send, receive, manage your thirdweb wallet, and review Budol token activity.</p>
        </div>
      </div>

      <div className="wallet-layout">
        <section className="panel wallet-balance-card">
          <div className="panel-title">
            <Wallet size={19} />
            <h2>Budol balance</h2>
          </div>
          <strong>{balance.isLoading ? "Loading" : `${balance.data?.displayValue ?? "0"} ${balance.data?.symbol ?? BUDOL_TOKEN_SYMBOL}`}</strong>
          <div className="wallet-address-box">
            <span>Arbitrum Sepolia</span>
            <strong>{displayAddress}</strong>
          </div>
          <div className="account-action-row">
            <button className="ghost-button account-link-button" disabled={isRefreshingWallet || balance.isLoading} onClick={() => void refreshWallet()}>
              <RefreshCcw className={isRefreshingWallet ? "spin-icon" : ""} size={18} />
              {isRefreshingWallet ? "Refreshing" : "Refresh"}
            </button>
            <button className="primary-button" onClick={() => setIsReceiveOpen(true)}>
              <ArrowDownLeft size={18} />
              Receive
            </button>
            <button className="ghost-button account-link-button" onClick={() => setIsManageOpen(true)}>
              <Wallet size={18} />
              Manage wallet
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
        <section className="panel wallet-send-card">
          <div className="panel-title">
            <Send size={19} />
            <h2>Send Budol tokens</h2>
          </div>
          <label>
            Recipient wallet
            <input value={sendDraft.to} onChange={event => setSendDraft(current => ({ ...current, to: event.target.value }))} />
          </label>
          <label>
            Amount
            <input inputMode="decimal" value={sendDraft.amount} onChange={event => setSendDraft(current => ({ ...current, amount: event.target.value }))} />
          </label>
          <button className="primary-button" disabled={sendTransaction.isPending} onClick={() => void sendBudol()}>
            {sendTransaction.isPending ? <LoaderCircle className="spin-icon" size={18} /> : <Send size={18} />}
            {sendTransaction.isPending ? "Sending" : "Send tokens"}
          </button>
          {sendMessage ? <p className="wallet-note">{sendMessage}</p> : null}
          {pendingTxHash ? <p className="wallet-note pending">Pending transfer: {shortAddress(pendingTxHash)}</p> : null}
        </section>

        <section className="panel wallet-history-card">
          <div className="panel-title wallet-history-head">
            <History size={19} />
            <h2>Transaction history</h2>
            <button className="ghost-button" onClick={() => void reloadHistory()}>
              Refresh
            </button>
          </div>
          {isHistoryLoading ? <div className="empty-state">Loading wallet history...</div> : null}
          {historyError ? <div className="login-error">{historyError}</div> : null}
          {!isHistoryLoading && history.length === 0 ? <div className="empty-state">No Budol token transfers yet. New accounts receive a welcome grant after the server confirms the thirdweb transaction.</div> : null}
          <div className="wallet-history-list">
            {pendingTxHash ? (
              <a className="wallet-history-item pending-entry" href={`https://sepolia.arbiscan.io/tx/${pendingTxHash}`} rel="noreferrer" target="_blank">
                <span className="wallet-history-icon sent">
                  <ArrowUpRight size={17} />
                </span>
                <span>
                  <strong>Pending sent transfer</strong>
                  <small>{shortAddress(pendingTxHash)} / waiting for indexer</small>
                </span>
                <small>Pending</small>
              </a>
            ) : null}
            <div className="wallet-history-item welcome-entry">
              <span className="wallet-history-icon received">
                <ArrowDownLeft size={17} />
              </span>
              <span>
                <strong>Welcome token grant</strong>
                <small>100 BUDOL is sent to new social-wallet accounts from the Budol vault.</small>
              </span>
              <small>On registration</small>
            </div>
            {history.map(item => (
              <a
                className="wallet-history-item"
                href={`https://sepolia.arbiscan.io/tx/${item.transactionHash}`}
                key={`${item.transactionHash}-${item.logIndex}`}
                rel="noreferrer"
                target="_blank"
              >
                <span className={`wallet-history-icon ${item.direction}`}>
                  {item.direction === "received" ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                </span>
                <span>
                  <strong>{item.direction === "received" ? "Received" : "Sent"} {item.amount} {BUDOL_TOKEN_SYMBOL}</strong>
                  <small>{item.direction === "received" ? "From" : "To"} {shortAddress(item.counterparty)}</small>
                </span>
                <small>{formatTransferDate(item.timestamp)}</small>
              </a>
            ))}
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

      {isManageOpen ? (
        <div className="wallet-manage-backdrop" role="presentation" onMouseDown={() => setIsManageOpen(false)}>
          <section className="wallet-manage-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-manage-title" onMouseDown={event => event.stopPropagation()}>
            <div className="wallet-manage-head">
              <button aria-label="Back" onClick={() => setIsManageOpen(false)}>
                <ArrowLeft size={22} />
              </button>
              <h2 id="wallet-manage-title">Manage Wallet</h2>
              <button aria-label="Close" onClick={() => setIsManageOpen(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="wallet-manage-list">
              <button onClick={() => openWalletModal("linked-profiles")}>
                <UsersRound size={22} />
                Linked Profiles
              </button>
              <button onClick={() => openWalletModal("wallet-connect-receiver")}>
                <Cable size={22} />
                Connect an App
              </button>
              <button onClick={() => openWalletModal("export")}>
                <KeyRound size={22} />
                Export Private Key
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function formatTransferDate(value: string) {
  if (!value) {
    return "Pending";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Pending";
  }
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
