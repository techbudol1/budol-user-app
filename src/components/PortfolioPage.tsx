import { ArrowLeft, BriefcaseBusiness, Clock3, Copy, Download, ExternalLink, History, LoaderCircle, ReceiptText, RefreshCcw, ShieldCheck, Trophy, TrendingUp, Upload, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { cashoutPosition, claimPrivatePayout, loadCashoutQuote, loadPortfolio, loadPrivacyAccessConfig, loadPrivateClaimTreeForTrade, loadShieldedPayoutConfig, loadShieldedWithdrawals, payManagedPrivacyFee, retryShieldedWithdrawal, submitPrivateClaimProof, submitShieldedWithdrawalProof, withdrawShieldedPayout, type PrivacyFeeKind } from "../lib/api";
import { sendERC20PrivacyFee, sendNativePrivacyFee } from "../lib/erc20Transfer";
import { browserWalletForAddress } from "../lib/externalWallet";
import { formatDate } from "../lib/format";
import { buildPrivateClaimCircuitInput, exportEncryptedPrivateClaimNotes, generatePrivateClaimProof, importEncryptedPrivateClaimNotes, listPrivateClaimNotes, loadPrivateClaimNote, PrivateClaimArtifactError, sideToPrivateClaimOutcome, type PrivateClaimCircuitInput } from "../lib/privateClaims";
import { buildShieldedWithdrawalCircuitInput, fieldPublicSignalToBytes32, generateShieldedWithdrawalProof, listShieldedPayoutNotes, removeShieldedPayoutNote, removeShieldedPayoutNoteByCommitment, ShieldedWithdrawalArtifactError } from "../lib/shieldedPayouts";
import type { Market, Position, ShieldedPayoutNote, ShieldedWithdrawal, Trade, TradeSide, UserPortfolio } from "../types";

type ShieldedPayoutGroup = {
  createdAt: string;
  id: string;
  notes: ShieldedPayoutNote[];
  title: string;
  totalRaw: string;
  tradeId: string;
};

type PortfolioPageProps = {
  accountAddress?: string;
  onBack: () => void;
  onLoginClick: () => void;
  onMarketChange: (market: Market) => void;
  onMarketOpen: (slug: string) => void;
  onToast: (message: string, detail?: string) => void;
  portfolio: UserPortfolio | null;
  setPortfolio: (portfolio: UserPortfolio | null) => void;
  walletCustody?: string;
};

export function PortfolioPage({ accountAddress, onBack, onLoginClick, onMarketChange, onMarketOpen, onToast, portfolio, setPortfolio, walletCustody }: PortfolioPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingCashout, setPendingCashout] = useState("");
  const [pendingClaim, setPendingClaim] = useState("");
  const [claimProgress, setClaimProgress] = useState<Record<string, string>>({});
  const [pendingShieldedWithdrawal, setPendingShieldedWithdrawal] = useState("");
  const [pendingWithdrawalRetry, setPendingWithdrawalRetry] = useState("");
  const [shieldedWithdrawals, setShieldedWithdrawals] = useState<ShieldedWithdrawal[]>([]);
  const [sellAmounts, setSellAmounts] = useState<Record<string, string>>({});
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [shieldedWithdrawalGroup, setShieldedWithdrawalGroup] = useState<ShieldedPayoutGroup | null>(null);
  const [shieldedWithdrawalProgress, setShieldedWithdrawalProgress] = useState("");
  const [proofWork, setProofWork] = useState<{ circuitInput: PrivateClaimCircuitInput; trade: Trade } | null>(null);
  const [backupStatus, setBackupStatus] = useState("");
  const [error, setError] = useState("");
  const [, setShieldedNotesRevision] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError("");
    loadPortfolio()
      .then(nextPortfolio => {
        if (isMounted) {
          setPortfolio(nextPortfolio);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load portfolio.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [setPortfolio]);

  useEffect(() => {
    let isMounted = true;
    loadShieldedWithdrawals()
      .then(withdrawals => {
        if (isMounted) {
          setShieldedWithdrawals(withdrawals);
        }
      })
      .catch(() => {
        if (isMounted) {
          setShieldedWithdrawals([]);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!portfolio) return;
    const directPayoutTradeIds = new Set(
      portfolio.trades
        .filter(trade => ["sent", "confirmed"].includes(trade.payoutStatus) && trade.payoutTransactionIds.length === 1)
        .map(trade => trade.id),
    );
    const staleNotes = listShieldedPayoutNotes().filter(note => directPayoutTradeIds.has(note.tradeId));
    if (staleNotes.length === 0) return;
    staleNotes.forEach(note => removeShieldedPayoutNote(note.tradeId));
    setShieldedNotesRevision(revision => revision + 1);
  }, [portfolio]);

  if (!portfolio && !isLoading) {
    return (
      <section className="simple-page">
        <h1>Portfolio</h1>
        <p>Log in to see your BudolPH positions, exposure, and trade history.</p>
        <button className="primary-button" onClick={onLoginClick}>
          Login
        </button>
      </section>
    );
  }

  const summary = portfolio?.summary ?? {
    currentValue: 0,
    openPositions: 0,
    potentialPayout: 0,
    settledPnl: 0,
    totalExposure: 0,
    unrealizedPnl: 0,
    realizedPnl: 0,
    netPnl: 0,
  };
  const shieldedNotes = listShieldedPayoutNotes();
  const queuedWithdrawalCommitments = new Set(
    shieldedWithdrawals
      .filter(withdrawal => !["failed", "cancelled"].includes(withdrawal.status))
      .map(withdrawal => withdrawal.noteCommitment.toLowerCase()),
  );
  const withdrawableShieldedNotes = shieldedNotes.filter(note => !queuedWithdrawalCommitments.has(note.commitment.toLowerCase()));
  const shieldedPayoutGroups = groupShieldedPayoutNotes(withdrawableShieldedNotes, portfolio?.trades ?? []);
  const claimableTrades = portfolio?.trades.filter(trade => ["claimable", "claim_failed"].includes(trade.payoutStatus)) ?? [];

  const cashout = async (pollId: string, side: TradeSide, amount = 0) => {
    const key = `${pollId}-${side}`;
    setPendingCashout(key);
    setError("");
    try {
      const quote = await loadCashoutQuote(pollId, side, amount);
      const confirmed = window.confirm(`${amount > 0 ? "Reduce" : "Cash out"} ${quote.outcomeLabel} for about ${formatToken(quote.proceeds)} BUDOL?`);
      if (!confirmed) {
        return;
      }
      const result = await cashoutPosition(pollId, side, amount);
      setPortfolio(result.portfolio);
      onMarketChange(result.market);
      const message = `Cashed out ${result.cashout.outcomeLabel} for ${formatToken(result.cashout.proceeds)} BUDOL.`;
      setError(`${message} Payout status: ${result.payoutStatus}.`);
      onToast("Cashout submitted.", `${message} Payout status: ${result.payoutStatus}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cash out position.");
    } finally {
      setPendingCashout("");
    }
  };

  const claimPayout = async (trade: Trade) => {
    setPendingClaim(trade.id);
    setClaimProgress(progress => ({ ...progress, [trade.id]: "Preparing private claim..." }));
    setError("");
    try {
      const note = loadPrivateClaimNote(trade.id);
      if (!note) {
        throw new Error("Private claim note is missing on this browser. Claims require the browser that placed the trade until note backup is implemented.");
      }
      setClaimProgress(progress => ({ ...progress, [trade.id]: "Loading claim tree..." }));
      const tree = await loadPrivateClaimTreeForTrade(trade.id);
      setClaimProgress(progress => ({ ...progress, [trade.id]: "Building private claim input..." }));
      const circuitInput = await buildPrivateClaimCircuitInput(note, tree.leaves, sideToPrivateClaimOutcome(trade.side));
      try {
        setClaimProgress(progress => ({ ...progress, [trade.id]: "Generating ZK proof in this browser..." }));
        const proofBundle = await withTimeout(
          generatePrivateClaimProof(circuitInput),
          120000,
          "ZK proof generation is taking too long in this browser. Try desktop Chrome, keep this tab focused, or use the manual proof modal."
        );
        setClaimProgress(progress => ({ ...progress, [trade.id]: "Requesting TZEN privacy fee..." }));
        const privateClaimFeeTxHash = await payPrivacyFee("private_claim", "submit this private claim proof");
        setClaimProgress(progress => ({ ...progress, [trade.id]: "Submitting ZK proof..." }));
        const proofSubmission = await submitPrivateClaimProof({
          nullifierHash: note.nullifierHash,
          privacyReceiptTxHash: privateClaimFeeTxHash,
          proof: proofBundle.proof,
          publicSignals: proofBundle.publicSignals,
          tradeId: trade.id,
          vk: proofBundle.vk,
        });
        setClaimProgress(progress => ({ ...progress, [trade.id]: "Checking shielded payout fee..." }));
        const shieldedFeeTxHash = await payShieldedPayoutFeeIfNeeded(trade);
        setClaimProgress(progress => ({ ...progress, [trade.id]: "Claiming private payout..." }));
        const result = await claimPrivatePayout(trade.id, proofSubmission.submission.id, trade.settlementPayout, shieldedFeeTxHash);
        setPortfolio(result.portfolio);
        setSelectedTrade(result.trade);
        onToast(
          "Private claim submitted.",
          result.shieldedPayout
            ? `${trade.pollTitle}: shielded payout note credited. Keep this browser available for withdrawal.`
            : result.payoutMode === "direct_fallback"
              ? `${trade.pollTitle}: ${formatToken(trade.settlementPayout)} BUDOL was paid directly because no private pool supports that exact amount.`
            : `${trade.pollTitle}: payout status is ${result.payoutStatus}.`,
        );
        return;
      } catch (err) {
        if (err instanceof PrivateClaimArtifactError) {
          setProofWork({ circuitInput, trade });
          setError("Private claim input is ready. Add proving artifacts or generate the proof manually, then submit it from the claim modal.");
          return;
        }
        throw err;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to claim private payout.");
    } finally {
      setPendingClaim("");
      setClaimProgress(progress => {
        const nextProgress = { ...progress };
        delete nextProgress[trade.id];
        return nextProgress;
      });
    }
  };

  const submitManualProof = async (trade: Trade, proof: unknown, publicSignals: unknown[], vk: unknown) => {
    const note = loadPrivateClaimNote(trade.id);
    if (!note) {
      setError("Private claim note is missing on this browser.");
      return;
    }
    setPendingClaim(trade.id);
    setError("");
    try {
      const proofSubmission = await submitPrivateClaimProof({
        nullifierHash: note.nullifierHash,
        privacyReceiptTxHash: await payPrivacyFee("private_claim", "submit this private claim proof"),
        proof,
        publicSignals,
        tradeId: trade.id,
        vk,
      });
      const shieldedFeeTxHash = await payShieldedPayoutFeeIfNeeded(trade);
      const result = await claimPrivatePayout(trade.id, proofSubmission.submission.id, trade.settlementPayout, shieldedFeeTxHash);
      setPortfolio(result.portfolio);
      setSelectedTrade(result.trade);
      setProofWork(null);
      onToast(
        "Private claim submitted.",
        result.shieldedPayout
          ? `${trade.pollTitle}: shielded payout note credited. Keep this browser available for withdrawal.`
          : result.payoutMode === "direct_fallback"
            ? `${trade.pollTitle}: ${formatToken(trade.settlementPayout)} BUDOL was paid directly because no private pool supports that exact amount.`
          : `${trade.pollTitle}: payout status is ${result.payoutStatus}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to claim private payout.");
    } finally {
      setPendingClaim("");
    }
  };

  const payPrivacyFee = async (kind: PrivacyFeeKind, actionLabel: string) => {
    const config = await loadPrivacyAccessConfig();
    const amountRaw = config.fees[kind] || "0";
    if (!isPositiveRawAmount(amountRaw)) {
      return "";
    }
    if (!accountAddress) {
      throw new Error("Reconnect your wallet before paying the privacy fee.");
    }
    if (!config.collectorAddress) {
      throw new Error("Privacy fee collector is not configured.");
    }
    if (walletCustody === "managed") {
      const result = await payManagedPrivacyFee(kind);
      return result.transactionHash || "";
    }
    const wallet = browserWalletForAddress(accountAddress);
    if (!wallet) {
      throw new Error("Privacy fee payment requires a connected external wallet.");
    }
    if (config.mode === "erc20") {
      if (!config.tokenAddress) {
        throw new Error("Privacy token contract is not configured.");
      }
      return sendERC20PrivacyFee({
        amountRaw,
        chainId: config.chainId,
        collectorAddress: config.collectorAddress,
        from: accountAddress,
        tokenAddress: config.tokenAddress,
        wallet,
      });
    }
    return sendNativePrivacyFee({
      amountRaw,
      chainId: config.chainId,
      collectorAddress: config.collectorAddress,
      from: accountAddress,
      wallet,
    });
  };

  const payShieldedPayoutFeeIfNeeded = async (trade: Trade) => {
    if (!(await supportsShieldedPayoutAmount(trade.settlementPayout))) {
      return "";
    }
    return payPrivacyFee("shielded_payout", "credit this shielded payout note");
  };

  const withdrawShieldedGroup = async (group: ShieldedPayoutGroup, cleanRecipient: string) => {
    setPendingShieldedWithdrawal(group.id);
    setShieldedWithdrawalProgress("");
    setError("");
    let queuedCount = 0;
    try {
      for (const [index, note] of group.notes.entries()) {
        const step = `${index + 1}/${group.notes.length}`;
        setShieldedWithdrawalProgress(`Generating privacy proof ${step}...`);
        const circuitInput = await buildShieldedWithdrawalCircuitInput(note, cleanRecipient);
        const proofBundle = await generateShieldedWithdrawalProof(circuitInput);
        const noteCommitment = fieldPublicSignalToBytes32(String(proofBundle.publicSignals[0] ?? ""));
        const nullifierHash = fieldPublicSignalToBytes32(String(proofBundle.publicSignals[1] ?? ""));
        setShieldedWithdrawalProgress(`Submitting proof ${step}...`);
        const proofSubmission = await submitShieldedWithdrawalProof({
          noteCommitment,
          nullifierHash,
          proof: proofBundle.proof,
          publicSignals: proofBundle.publicSignals,
          recipient: cleanRecipient,
          vk: proofBundle.vk,
        });
        setShieldedWithdrawalProgress(`Queueing withdrawal ${step}...`);
        const withdrawal = await withdrawShieldedPayout({
          noteCommitment,
          nullifierHash,
          publicSignals: proofBundle.publicSignals,
          recipient: cleanRecipient,
          solidityProof: proofBundle.solidityProof,
          zkProofSubmissionId: proofSubmission.submission.id,
        });
        if (withdrawal.withdrawal) {
          setShieldedWithdrawals(current => upsertWithdrawal(current, withdrawal.withdrawal as ShieldedWithdrawal));
        } else {
          setShieldedWithdrawals(await loadShieldedWithdrawals());
        }
        queuedCount += 1;
        removeShieldedPayoutNoteByCommitment(note.commitment);
        setShieldedNotesRevision(revision => revision + 1);
      }
      setShieldedWithdrawals(await loadShieldedWithdrawals());
      onToast(
        "Shielded withdrawal batch queued.",
        `${formatRawToken(group.totalRaw)} BUDOL queued as ${group.notes.length} fixed-denomination private note${group.notes.length === 1 ? "" : "s"}.`,
      );
      setShieldedWithdrawalGroup(null);
    } catch (err) {
      if (err instanceof ShieldedWithdrawalArtifactError) {
        setError("Shielded withdrawal artifacts are missing. Regenerate the shielded withdrawal proving files before withdrawing.");
      } else {
        const partial = queuedCount > 0 ? `${queuedCount}/${group.notes.length} withdrawals were queued before the error. ` : "";
        setError(`${partial}${err instanceof Error ? err.message : "Unable to withdraw shielded payout."}`);
      }
    } finally {
      setPendingShieldedWithdrawal("");
      setShieldedWithdrawalProgress("");
    }
  };

  const refreshShieldedWithdrawals = async () => {
    setShieldedWithdrawals(await loadShieldedWithdrawals());
  };

  const retryWithdrawal = async (withdrawal: ShieldedWithdrawal) => {
    setPendingWithdrawalRetry(withdrawal.id);
    setError("");
    try {
      const nextWithdrawal = await retryShieldedWithdrawal(withdrawal.id);
      setShieldedWithdrawals(current => upsertWithdrawal(current, nextWithdrawal));
      onToast("Shielded withdrawal retry queued.", `Retry scheduled after ${formatDate(nextWithdrawal.executeAfter)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to retry shielded withdrawal.");
    } finally {
      setPendingWithdrawalRetry("");
    }
  };

  const exportClaimNotes = async () => {
    setBackupStatus("");
    try {
      const passphrase = window.prompt("Set a passphrase for this encrypted claim note backup.");
      if (!passphrase) return;
      const backup = await exportEncryptedPrivateClaimNotes(passphrase);
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `budol-claim-notes-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      const shieldedCount = backup.shieldedNoteCount ?? 0;
      const message = `Exported ${backup.noteCount} claim note${backup.noteCount === 1 ? "" : "s"} and ${shieldedCount} shielded payout note${shieldedCount === 1 ? "" : "s"}.`;
      setBackupStatus(message);
      onToast("Claim notes exported.", message);
    } catch (err) {
      setBackupStatus(err instanceof Error ? err.message : "Unable to export claim notes.");
    }
  };

  const importClaimNotes = () => {
    setBackupStatus("");
    const input = document.createElement("input");
    input.accept = "application/json,.json";
    input.type = "file";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const passphrase = window.prompt("Enter the passphrase for this claim note backup.");
        if (!passphrase) return;
        const imported = await importEncryptedPrivateClaimNotes(await file.text(), passphrase);
        const message = `Imported ${imported} private note${imported === 1 ? "" : "s"}.`;
        setBackupStatus(message);
        onToast("Claim notes imported.", message);
      } catch (err) {
        setBackupStatus(err instanceof Error ? err.message : "Unable to import claim notes.");
      }
    };
    input.click();
  };

  return (
    <section className="portfolio-page">
      <div className="account-hero">
        <button className="ghost-button account-back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          Back to markets
        </button>
        <div>
          <span className="eyebrow">Portfolio</span>
          <h1>Your BudolPH book</h1>
          <p>Track open positions, total exposure, possible payout, settled results, and recent trades.</p>
        </div>
      </div>

      <div className="portfolio-summary-grid">
        <SummaryCard icon={<BriefcaseBusiness size={20} />} label="Open positions" value={summary.openPositions.toString()} />
        <SummaryCard icon={<TrendingUp size={20} />} label="Total exposure" value={`${formatToken(summary.totalExposure)} BUDOL`} />
        <SummaryCard icon={<ExternalLink size={20} />} label="Current value" value={`${formatToken(summary.currentValue)} BUDOL`} />
        <SummaryCard icon={<Clock3 size={20} />} label="Potential payout" value={`${formatToken(summary.potentialPayout)} BUDOL`} />
        <SummaryCard icon={<Trophy size={20} />} label="Realized P/L" value={`${summary.realizedPnl >= 0 ? "+" : ""}${formatToken(summary.realizedPnl)} BUDOL`} />
        <SummaryCard icon={<TrendingUp size={20} />} label="Unrealized P/L" value={`${summary.unrealizedPnl >= 0 ? "+" : ""}${formatToken(summary.unrealizedPnl)} BUDOL`} />
        <SummaryCard icon={<Trophy size={20} />} label="Net P/L" value={`${summary.netPnl >= 0 ? "+" : ""}${formatToken(summary.netPnl)} BUDOL`} />
      </div>

      {error ? <div className="login-error">{error}</div> : null}

      {claimableTrades.length > 0 ? (
        <section className="panel portfolio-action-card">
          <div>
            <div className="panel-title">
              <Trophy size={19} />
              <h2>Payouts ready to claim</h2>
            </div>
            <p>{claimableTrades.length} resolved position{claimableTrades.length === 1 ? "" : "s"} need a private ZK claim or payout retry.</p>
          </div>
          <div className="portfolio-action-list">
            {claimableTrades.slice(0, 3).map(trade => (
              <button
                className="ghost-button"
                disabled={pendingClaim === trade.id}
                key={trade.id}
                onClick={() => void claimPayout(trade)}
                type="button"
              >
                {pendingClaim === trade.id ? <LoaderCircle className="spin-icon" size={16} /> : <ShieldCheck size={16} />}
                {trade.payoutStatus === "claim_failed" ? "Retry" : "Claim"} {formatToken(trade.settlementPayout)} BUDOL
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel claim-note-backup-card">
        <div>
          <div className="panel-title">
            <ShieldCheck size={19} />
            <h2>Private claim notes</h2>
          </div>
          <p>{listPrivateClaimNotes().length} local claim note{listPrivateClaimNotes().length === 1 ? "" : "s"} and {shieldedPayoutGroups.length} shielded payout batch{shieldedPayoutGroups.length === 1 ? "" : "es"} ready in this browser.</p>
          {backupStatus ? <small>{backupStatus}</small> : null}
        </div>
        <div className="claim-note-backup-actions">
          <button className="ghost-button" onClick={() => void exportClaimNotes()} type="button">
            <Download size={16} />
            Export encrypted backup
          </button>
          <button className="ghost-button" onClick={importClaimNotes} type="button">
            <Upload size={16} />
            Import backup
          </button>
        </div>
      </section>

      {shieldedPayoutGroups.length > 0 ? (
        <section className="panel shielded-note-card">
          <div className="panel-title">
            <ShieldCheck size={19} />
            <h2>Shielded payouts</h2>
          </div>
          <div className="shielded-note-list">
            {shieldedPayoutGroups.map(group => (
              <div className="shielded-note-row" key={group.id}>
                <span>
                  <strong>{formatRawToken(group.totalRaw)} BUDOL private payout</strong>
                  <small>{group.title} / {group.notes.length} fixed-denomination note{group.notes.length === 1 ? "" : "s"}</small>
                </span>
                <button className="ghost-button" disabled={pendingShieldedWithdrawal === group.id} onClick={() => setShieldedWithdrawalGroup(group)} type="button">
                  {pendingShieldedWithdrawal === group.id ? <LoaderCircle className="spin-icon" size={16} /> : <ShieldCheck size={16} />}
                  Withdraw privately
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel shielded-note-card">
        <div className="panel-title panel-title-between">
          <span>
            <History size={19} />
            <h2>Shielded withdrawal queue</h2>
          </span>
          <button className="ghost-button" onClick={() => void refreshShieldedWithdrawals()} type="button">
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
        {shieldedWithdrawals.length === 0 ? (
          <div className="empty-state">No shielded withdrawals queued yet.</div>
        ) : (
          <div className="shielded-note-list">
            {shieldedWithdrawals.map(withdrawal => (
              <div className="shielded-note-row" key={withdrawal.id}>
                <span>
                  <strong>
                    {shortHash(withdrawal.noteCommitment)}
                    <i className={`trade-status-pill payout-${withdrawal.status}`}>{withdrawal.status}</i>
                  </strong>
                  <small>
                    To {shortHash(withdrawal.recipient)} / scheduled {formatDate(withdrawal.executeAfter)} / attempts {withdrawal.attempts}
                  </small>
                  {withdrawal.error ? <small className="comment-error">{withdrawal.error}</small> : null}
                  {withdrawal.transactionHash ? (
                    <a href={horizenTestnetTxURL(withdrawal.transactionHash)} target="_blank" rel="noreferrer">
                      {shortHash(withdrawal.transactionHash)}
                    </a>
                  ) : null}
                </span>
                {withdrawal.status === "failed" ? (
                  <button className="ghost-button" disabled={pendingWithdrawalRetry === withdrawal.id} onClick={() => void retryWithdrawal(withdrawal)} type="button">
                    {pendingWithdrawalRetry === withdrawal.id ? <LoaderCircle className="spin-icon" size={16} /> : <RefreshCcw size={16} />}
                    Retry
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="portfolio-content-grid">
        <section className="panel portfolio-table-card">
          <div className="panel-title">
            <BriefcaseBusiness size={19} />
            <h2>Open positions</h2>
          </div>
          {isLoading ? <div className="empty-state">Loading portfolio...</div> : null}
          {!isLoading && (portfolio?.positions.length ?? 0) === 0 ? <div className="empty-state">No positions yet. Buy a side from any market to start.</div> : null}
          <div className="position-list">
            {portfolio?.positions.map(position => (
              <article className="position-row" key={`${position.pollId}-${position.side}`}>
                <div className="position-identity">
                  <div className="position-outcome">
                    <i className={`position-side-pill ${position.side}`}>{position.side === "yes" ? "YES" : "NO"}</i>
                    <span>{position.outcomeLabel}</span>
                  </div>
                  <strong>{position.pollTitle}</strong>
                  <small>{position.category} / {position.region}</small>
                </div>
                <div className="position-metric">
                  <small>Invested</small>
                  <strong>{formatToken(position.amount)} BUDOL</strong>
                  <span>Avg {Math.round(position.averagePrice)}¢ · now {position.currentPrice}¢</span>
                </div>
                <div className="position-metric">
                  <small>Current value</small>
                  <strong>{formatToken(position.currentValue)} BUDOL</strong>
                  <span className={position.unrealizedPnl >= 0 ? "positive" : "negative"}>
                    {position.unrealizedPnl >= 0 ? "+" : ""}{formatToken(position.unrealizedPnl)} P/L · {formatToken(position.potentialPayout)} max
                  </span>
                </div>
                <div className="position-actions">
                  <button className="position-open-button" onClick={() => onMarketOpen(position.pollSlug)}>View market</button>
                  {isPositionTradeable(position) ? (
                    <>
                      <label>
                        <span>Amount to sell</span>
                        <input
                          min="0"
                          max={position.amount}
                          placeholder="0.00"
                          type="number"
                          value={sellAmounts[`${position.pollId}-${position.side}`] ?? ""}
                          onChange={event => setSellAmounts(current => ({ ...current, [`${position.pollId}-${position.side}`]: event.currentTarget.value }))}
                        />
                      </label>
                      <button
                        className="position-reduce-button"
                        disabled={pendingCashout === `${position.pollId}-${position.side}`}
                        onClick={() => void cashout(position.pollId, position.side, Number(sellAmounts[`${position.pollId}-${position.side}`] || 0))}
                      >
                        {pendingCashout === `${position.pollId}-${position.side}` ? <LoaderCircle className="spin-icon" size={16} /> : "Reduce"}
                      </button>
                      <button className="position-sell-all-button" disabled={pendingCashout === `${position.pollId}-${position.side}`} onClick={() => void cashout(position.pollId, position.side)}>
                        Sell all
                      </button>
                    </>
                  ) : (
                    <span className="position-closed-note">
                      <Clock3 size={15} />
                      Trading closed · Awaiting resolution
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel portfolio-table-card">
          <div className="panel-title">
            <History size={19} />
            <h2>Recent trades</h2>
          </div>
          {!isLoading && (portfolio?.trades.length ?? 0) === 0 ? <div className="empty-state">No trades recorded yet.</div> : null}
          <div className="trade-history-list">
            {portfolio?.trades.map(trade => (
              <div className="trade-history-row" key={trade.id} role="button" tabIndex={0} onClick={() => setSelectedTrade(trade)} onKeyDown={event => event.key === "Enter" ? setSelectedTrade(trade) : undefined}>
                <div className="trade-history-primary">
                  <div className="trade-history-badges">
                    <i className={`position-side-pill ${trade.side}`}>{trade.side === "yes" ? "YES" : "NO"}</i>
                    <i className={`trade-status-pill ${trade.status}`}>{trade.status}</i>
                    {trade.payoutStatus ? <i className={`trade-status-pill payout-${trade.payoutStatus}`}>{trade.payoutStatus}</i> : null}
                  </div>
                  <strong>Bought {trade.side === "yes" ? "YES" : "NO"}</strong>
                  <small className="trade-outcome-label">{trade.outcomeLabel}</small>
                  <small>{trade.pollTitle}</small>
                  <TradeNextAction trade={trade} />
                </div>
                <div className="trade-history-value">
                  <small>{trade.status === "open" ? "Invested" : "Payout"}</small>
                  <strong>{formatToken(trade.settlementPayout || trade.amount)} BUDOL</strong>
                  <span>
                    {trade.status === "open"
                      ? `${trade.priceCents}¢ · ${formatDate(trade.createdAt)}`
                      : `settled ${formatDate(trade.settledAt)}`}
                  </span>
                </div>
                {["claimable", "claim_failed"].includes(trade.payoutStatus) ? (
                  <button
                    className="ghost-button"
                    disabled={pendingClaim === trade.id}
                    onClick={event => {
                      event.stopPropagation();
                      void claimPayout(trade);
                    }}
                    type="button"
                  >
                    {pendingClaim === trade.id ? <><LoaderCircle className="spin-icon" size={16} /> {claimProgress[trade.id] || "Working..."}</> : trade.payoutStatus === "claim_failed" ? "Retry ZK claim" : "Submit ZK claim"}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
      {selectedTrade ? (
        <TradeDetailDrawer
          claimProgress={claimProgress[selectedTrade.id] || ""}
          isClaiming={pendingClaim === selectedTrade.id}
          onClaim={() => void claimPayout(selectedTrade)}
          onClose={() => setSelectedTrade(null)}
          onOpenMarket={() => onMarketOpen(selectedTrade.pollSlug)}
          trade={selectedTrade}
        />
      ) : null}
      {proofWork ? (
        <PrivateClaimProofModal
          circuitInput={proofWork.circuitInput}
          isSubmitting={pendingClaim === proofWork.trade.id}
          onClose={() => setProofWork(null)}
          onSubmit={(proof, publicSignals, vk) => void submitManualProof(proofWork.trade, proof, publicSignals, vk)}
          trade={proofWork.trade}
        />
      ) : null}
      {shieldedWithdrawalGroup ? (
        <ShieldedWithdrawalRecipientModal
          connectedWallet={accountAddress || ""}
          group={shieldedWithdrawalGroup}
          isSubmitting={pendingShieldedWithdrawal === shieldedWithdrawalGroup.id}
          progress={shieldedWithdrawalProgress}
          onClose={() => setShieldedWithdrawalGroup(null)}
          onSubmit={recipient => void withdrawShieldedGroup(shieldedWithdrawalGroup, recipient)}
        />
      ) : null}
    </section>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="panel portfolio-summary-card">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function isPositionTradeable(position: Position) {
  if (position.pollStatus !== "published" || position.tradingFrozen) {
    return false;
  }
  return !position.endsAt || new Date(position.endsAt).getTime() > Date.now();
}

function formatToken(value: number) {
  return value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

function formatRawToken(value: string, decimals = 18) {
  try {
    const raw = BigInt(value);
    const base = 10n ** BigInt(decimals);
    const whole = raw / base;
    const fraction = raw % base;
    if (fraction === 0n) return whole.toLocaleString("en-PH");
    const fractionText = fraction.toString().padStart(decimals, "0").replace(/0+$/, "").slice(0, 4);
    return `${whole.toLocaleString("en-PH")}.${fractionText}`;
  } catch {
    return value;
  }
}

function groupShieldedPayoutNotes(notes: ShieldedPayoutNote[], trades: Trade[]): ShieldedPayoutGroup[] {
  const tradesById = new Map(trades.map(trade => [trade.id, trade]));
  const groups = new Map<string, ShieldedPayoutNote[]>();
  for (const note of notes) {
    const current = groups.get(note.tradeId) ?? [];
    current.push(note);
    groups.set(note.tradeId, current);
  }
  return Array.from(groups.entries())
    .map(([tradeId, groupNotes]) => {
      const sortedNotes = [...groupNotes].sort(compareShieldedNotes);
      const totalRaw = sortedNotes.reduce((total, note) => total + rawTokenValue(note.denomination), 0n).toString();
      const trade = tradesById.get(tradeId);
      return {
        createdAt: sortedNotes.map(note => note.createdAt).sort().at(-1) ?? "",
        id: tradeId,
        notes: sortedNotes,
        title: trade?.pollTitle || `Trade ${shortHash(tradeId)}`,
        totalRaw,
        tradeId,
      };
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function compareShieldedNotes(left: ShieldedPayoutNote, right: ShieldedPayoutNote) {
  const denominationCompare = compareRawTokenValues(right.denomination, left.denomination);
  if (denominationCompare !== 0) {
    return denominationCompare;
  }
  return left.createdAt.localeCompare(right.createdAt);
}

function compareRawTokenValues(left: string, right: string) {
  const leftRaw = rawTokenValue(left);
  const rightRaw = rawTokenValue(right);
  if (leftRaw > rightRaw) return 1;
  if (leftRaw < rightRaw) return -1;
  return 0;
}

function rawTokenValue(value: string) {
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

async function supportsShieldedPayoutAmount(payoutAmount: string | number) {
  const config = await loadShieldedPayoutConfig();
  if (!config.enabled) {
    return false;
  }
  const rawAmount = decimalToRawToken(payoutAmount, 18);
  if (rawAmount <= 0n) {
    return false;
  }
  const denominations = (config.pools || [])
    .map(pool => {
      try {
        return BigInt(pool.denomination);
      } catch {
        return 0n;
      }
    })
    .filter(value => value > 0n)
    .sort((left, right) => left > right ? -1 : left < right ? 1 : 0);
  let remaining = rawAmount;
  for (const denomination of denominations) {
    while (remaining >= denomination) {
      remaining -= denomination;
    }
  }
  return denominations.length > 0 && remaining === 0n;
}

function isPositiveRawAmount(value: string) {
  try {
    return BigInt(value) > 0n;
  } catch {
    return false;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

function decimalToRawToken(value: string | number, decimals: number) {
  const normalized = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return 0n;
  }
  const [wholePart, fractionPart = ""] = normalized.split(".");
  const fraction = (fractionPart + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(wholePart || "0") * 10n ** BigInt(decimals) + BigInt(fraction || "0");
}

function TradeDetailDrawer({ claimProgress, isClaiming, onClaim, onClose, onOpenMarket, trade }: { claimProgress: string; isClaiming: boolean; onClaim: () => void; onClose: () => void; onOpenMarket: () => void; trade: Trade }) {
  const payoutStatus = trade.payoutStatus || (trade.status === "open" ? "pending" : "none");
  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <aside className="trade-detail-drawer" role="dialog" aria-modal="true" aria-label="Trade detail" onClick={event => event.stopPropagation()}>
        <header>
          <span>
            <ReceiptText size={18} />
            Trade detail
          </span>
          <button onClick={onClose} aria-label="Close trade detail">
            <X size={18} />
          </button>
        </header>
        <div className="trade-detail-title">
          <strong>{trade.pollTitle}</strong>
          <small>{trade.outcomeLabel} / {trade.priceCents}c / {formatDate(trade.createdAt)}</small>
          <TradeNextAction trade={trade} />
        </div>
        <div className="trade-detail-grid">
          <DetailMetric label="Stake" value={`${formatToken(trade.amount)} BUDOL`} />
          <DetailMetric label="Shares" value={formatToken(trade.shares)} />
          <DetailMetric label="Possible payout" value={`${formatToken(trade.potentialPayout)} BUDOL`} />
          <DetailMetric label="Settlement payout" value={`${formatToken(trade.settlementPayout)} BUDOL`} />
        </div>
        <div className="trade-detail-section">
          <span>On-chain references</span>
          <CopyableHash label="Escrow tx" value={trade.escrowTxHash} />
          <CopyableHash label="Private leaf" value={trade.privateClaimLeaf} />
          <CopyableHash label="Claim root" value={trade.privateClaimRoot} />
          <CopyableHash label="Nullifier" value={trade.privateClaimNullifierHash} />
          <small>Escrow status: {trade.escrowStatus || (trade.escrowTxHash ? "verified" : "missing")}</small>
          {trade.escrowError ? <small className="comment-error">{trade.escrowError}</small> : null}
          {trade.escrowVerifiedAt ? <small>Verified at {formatDate(trade.escrowVerifiedAt)}</small> : null}
          {trade.payoutTransactionIds.length > 0 ? (
            trade.payoutTransactionIds.map((id, index) => <CopyableHash key={id} label={`Payout tx ${index + 1}`} value={id} />)
          ) : (
            <small>No payout transaction yet.</small>
          )}
          {trade.payoutError ? <small className="comment-error">{trade.payoutError}</small> : null}
        </div>
        <div className="trade-timeline">
          <TimelineItem label="Trade placed" value={formatDate(trade.createdAt)} done />
          <TimelineItem label="Escrow verified" value={trade.escrowStatus || (trade.escrowTxHash ? "verified" : "missing")} done={trade.escrowStatus === "verified" || Boolean(trade.escrowTxHash)} />
          <TimelineItem label="Settlement" value={trade.settlementStatus || trade.status} done={trade.status !== "open"} />
          <TimelineItem label="Payout" value={payoutStatus} done={["confirmed", "sent", "submitted", "none"].includes(payoutStatus)} />
        </div>
        {["claimable", "claim_failed"].includes(trade.payoutStatus) ? (
          <button className="primary-button" disabled={isClaiming} onClick={onClaim}>
            {isClaiming ? <><LoaderCircle className="spin-icon" size={16} /> {claimProgress || "Working..."}</> : trade.payoutStatus === "claim_failed" ? "Retry ZK claim" : "Submit ZK claim"}
          </button>
        ) : null}
        <button className="primary-button" onClick={onOpenMarket}>Open market</button>
      </aside>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TradeNextAction({ trade }: { trade: Trade }) {
  const copy = tradeNextAction(trade);
  return <small className={`trade-next-action ${copy.tone}`}>{copy.label}</small>;
}

function tradeNextAction(trade: Trade) {
  if (trade.payoutStatus === "claimable") {
    return { label: `Action needed: submit ZK claim for ${formatToken(trade.settlementPayout)} BUDOL.`, tone: "warning" };
  }
  if (["queued", "processing", "submitted", "retry", "claim_pending"].includes(trade.payoutStatus)) {
    return { label: `Payout in progress: ${trade.payoutStatus}.`, tone: "pending" };
  }
  if (["confirmed", "sent"].includes(trade.payoutStatus)) {
    return { label: "Payout completed.", tone: "success" };
  }
  if (["failed", "claim_failed"].includes(trade.payoutStatus)) {
    return { label: "Payout needs attention. Open details or retry from admin tools.", tone: "danger" };
  }
  if (trade.status === "open") {
    return { label: `Open position: possible payout ${formatToken(trade.potentialPayout)} BUDOL.`, tone: "pending" };
  }
  if (trade.status === "lost") {
    return { label: "Resolved: this side did not win.", tone: "muted" };
  }
  if (trade.status === "cancelled") {
    return { label: `Cancelled: refund ${formatToken(trade.settlementPayout)} BUDOL.`, tone: "success" };
  }
  return { label: `Resolved: ${trade.status}.`, tone: "muted" };
}

function CopyableHash({ label, value }: { label: string; value: string }) {
  if (!value) {
    return (
      <div className="copyable-hash">
        <span>{label}</span>
        <small>None</small>
      </div>
    );
  }
  return (
    <button className="copyable-hash" onClick={() => void navigator.clipboard.writeText(value)} type="button">
      <span>{label}</span>
      <small>{shortHash(value)}</small>
    </button>
  );
}

function ShieldedWithdrawalRecipientModal({
  connectedWallet,
  group,
  isSubmitting,
  onClose,
  onSubmit,
  progress,
}: {
  connectedWallet: string;
  group: ShieldedPayoutGroup;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (recipient: string) => void;
  progress: string;
}) {
  const [recipient, setRecipient] = useState("");
  const [localError, setLocalError] = useState("");
  const cleanRecipient = recipient.trim();
  const usesConnectedWallet = connectedWallet.trim() !== "" && cleanRecipient.toLowerCase() === connectedWallet.trim().toLowerCase();

  const submit = () => {
    setLocalError("");
    if (!/^0x[0-9a-fA-F]{40}$/.test(cleanRecipient)) {
      setLocalError("Enter a valid EVM wallet address.");
      return;
    }
    onSubmit(cleanRecipient);
  };

  return (
    <div className="drawer-backdrop centered-modal-backdrop" role="presentation" onClick={isSubmitting ? undefined : onClose}>
      <aside className="private-proof-modal shielded-withdrawal-modal" role="dialog" aria-modal="true" aria-label="Queue shielded withdrawal" onClick={event => event.stopPropagation()}>
        <header>
          <span>
            <ShieldCheck size={18} />
            Queue shielded withdrawal
          </span>
          <button disabled={isSubmitting} onClick={onClose} aria-label="Close shielded withdrawal">
            <X size={18} />
          </button>
        </header>
        <div className="proof-market-title">
          <strong>{formatRawToken(group.totalRaw)} BUDOL shielded payout</strong>
          <small>{group.title} / {group.notes.length} fixed-denomination note{group.notes.length === 1 ? "" : "s"}</small>
        </div>
        <p className="shielded-withdrawal-help">
          Choose the wallet that will receive this payout once. BudolPH will queue the internal fixed-denomination notes as a private withdrawal batch.
          For better privacy, use a fresh wallet that has not interacted with BudolPH.
        </p>
        <label>
          Recipient wallet
          <input
            autoFocus
            disabled={isSubmitting}
            onChange={event => setRecipient(event.currentTarget.value)}
            placeholder="0x..."
            value={recipient}
          />
        </label>
        {usesConnectedWallet ? (
          <div className="privacy-warning">
            This is your connected BudolPH wallet. The withdrawal will work, but it is easier to link to your account. A fresh wallet is better for privacy.
          </div>
        ) : null}
        {localError ? <div className="login-error">{localError}</div> : null}
        {progress ? <div className="notice compact-notice">{progress}</div> : null}
        <div className="modal-action-row">
          <button className="ghost-button" disabled={isSubmitting} onClick={onClose} type="button">Cancel</button>
          <button className="primary-button" disabled={isSubmitting} onClick={submit} type="button">
            {isSubmitting ? <LoaderCircle className="spin-icon" size={16} /> : <ShieldCheck size={16} />}
            Withdraw privately
          </button>
        </div>
      </aside>
    </div>
  );
}

function PrivateClaimProofModal({
  circuitInput,
  isSubmitting,
  onClose,
  onSubmit,
  trade,
}: {
  circuitInput: PrivateClaimCircuitInput;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (proof: unknown, publicSignals: unknown[], vk: unknown) => void;
  trade: Trade;
}) {
  const [proofText, setProofText] = useState("");
  const [publicSignalsText, setPublicSignalsText] = useState(JSON.stringify([circuitInput.root, circuitInput.resolvedOutcome, circuitInput.nullifierHash], null, 2));
  const [vkText, setVKText] = useState("");
  const [localError, setLocalError] = useState("");
  const circuitInputText = JSON.stringify(circuitInput, null, 2);

  const copyInput = async () => {
    await navigator.clipboard.writeText(circuitInputText);
  };

  const downloadInput = () => {
    const url = URL.createObjectURL(new Blob([circuitInputText], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `budol-private-claim-${trade.id}.input.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const submit = () => {
    setLocalError("");
    try {
      const proof = JSON.parse(proofText);
      const publicSignals = JSON.parse(publicSignalsText);
      const vk = JSON.parse(vkText);
      if (!Array.isArray(publicSignals)) {
        throw new Error("publicSignals must be a JSON array.");
      }
      onSubmit(proof, publicSignals, vk);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Proof JSON is invalid.");
    }
  };

  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <aside className="private-proof-modal" role="dialog" aria-modal="true" aria-label="Private claim proof" onClick={event => event.stopPropagation()}>
        <header>
          <span>
            <ShieldCheck size={18} />
            Private claim proof
          </span>
          <button onClick={onClose} aria-label="Close private claim proof">
            <X size={18} />
          </button>
        </header>
        <div className="proof-market-title">
          <strong>{trade.pollTitle}</strong>
          <small>{trade.outcomeLabel} / claimable payout {formatToken(trade.settlementPayout)} BUDOL</small>
        </div>
        <div className="proof-helper-row">
          <button className="ghost-button" onClick={() => void copyInput()} type="button">
            <Copy size={16} />
            Copy input
          </button>
          <button className="ghost-button" onClick={downloadInput} type="button">
            <Download size={16} />
            Download input
          </button>
        </div>
        <label>
          Circuit input
          <textarea readOnly value={circuitInputText} />
        </label>
        <label>
          proof.json
          <textarea placeholder='{"pi_a": ...}' value={proofText} onChange={event => setProofText(event.currentTarget.value)} />
        </label>
        <label>
          public.json
          <textarea value={publicSignalsText} onChange={event => setPublicSignalsText(event.currentTarget.value)} />
        </label>
        <label>
          verification_key.json
          <textarea placeholder='{"protocol": "groth16", ...}' value={vkText} onChange={event => setVKText(event.currentTarget.value)} />
        </label>
        {localError ? <div className="login-error">{localError}</div> : null}
        <button className="primary-button" disabled={isSubmitting} onClick={submit} type="button">
          {isSubmitting ? <LoaderCircle className="spin-icon" size={16} /> : "Submit proof and claim payout"}
        </button>
      </aside>
    </div>
  );
}

function TimelineItem({ done, label, value }: { done: boolean; label: string; value: string }) {
  return (
    <div className={done ? "done" : ""}>
      <i />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function shortHash(value: string) {
  return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

function upsertWithdrawal(withdrawals: ShieldedWithdrawal[], withdrawal: ShieldedWithdrawal) {
  const next = [withdrawal, ...withdrawals.filter(item => item.id !== withdrawal.id)];
  return next.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function horizenTestnetTxURL(hash: string) {
  return `https://horizen-testnet.explorer.caldera.xyz/tx/${hash}`;
}
