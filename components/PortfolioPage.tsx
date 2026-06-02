import { ArrowLeft, BriefcaseBusiness, Clock3, ExternalLink, History, LoaderCircle, ReceiptText, Trophy, TrendingUp, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { cashoutPosition, loadCashoutQuote, loadPortfolio } from "../lib/api";
import { formatDate } from "../lib/format";
import type { Market, Trade, TradeSide, UserPortfolio } from "../types";

type PortfolioPageProps = {
  onBack: () => void;
  onLoginClick: () => void;
  onMarketChange: (market: Market) => void;
  onMarketOpen: (slug: string) => void;
  onToast: (message: string, detail?: string) => void;
  portfolio: UserPortfolio | null;
  setPortfolio: (portfolio: UserPortfolio | null) => void;
};

export function PortfolioPage({ onBack, onLoginClick, onMarketChange, onMarketOpen, onToast, portfolio, setPortfolio }: PortfolioPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingCashout, setPendingCashout] = useState("");
  const [sellAmounts, setSellAmounts] = useState<Record<string, string>>({});
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [error, setError] = useState("");

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

  if (!portfolio && !isLoading) {
    return (
      <section className="simple-page">
        <h1>Portfolio</h1>
        <p>Log in to see your Budol positions, exposure, and trade history.</p>
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

  return (
    <section className="portfolio-page">
      <div className="account-hero">
        <button className="ghost-button account-back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          Back to markets
        </button>
        <div>
          <span className="eyebrow">Portfolio</span>
          <h1>Your Budol book</h1>
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
                <span>
                  <strong>{position.pollTitle}</strong>
                  <small>{position.category} / {position.region} / {position.outcomeLabel}</small>
                </span>
                <span>
                  <strong>{formatToken(position.amount)} BUDOL</strong>
                  <small>Avg {Math.round(position.averagePrice)}c / now {position.currentPrice}c / {position.unrealizedPnl >= 0 ? "+" : ""}{formatToken(position.unrealizedPnl)} P/L</small>
                </span>
                <span>
                  <strong>{formatToken(position.currentValue)} BUDOL</strong>
                  <small>Current value / {formatToken(position.potentialPayout)} max payout</small>
                </span>
                <span className="position-actions">
                  <button onClick={() => onMarketOpen(position.pollSlug)}>Open</button>
                  <input
                    min="0"
                    max={position.amount}
                    placeholder="Reduce BUDOL"
                    type="number"
                    value={sellAmounts[`${position.pollId}-${position.side}`] ?? ""}
                    onChange={event => setSellAmounts(current => ({ ...current, [`${position.pollId}-${position.side}`]: event.currentTarget.value }))}
                  />
                  <button
                    disabled={pendingCashout === `${position.pollId}-${position.side}`}
                    onClick={() => void cashout(position.pollId, position.side, Number(sellAmounts[`${position.pollId}-${position.side}`] || 0))}
                  >
                    {pendingCashout === `${position.pollId}-${position.side}` ? <LoaderCircle className="spin-icon" size={16} /> : "Reduce"}
                  </button>
                  <button disabled={pendingCashout === `${position.pollId}-${position.side}`} onClick={() => void cashout(position.pollId, position.side)}>
                    Sell all
                  </button>
                </span>
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
              <button className="trade-history-row" key={trade.id} onClick={() => setSelectedTrade(trade)}>
                <span>
                  <strong>
                    Buy {trade.outcomeLabel}
                    <i className={`trade-status-pill ${trade.status}`}>{trade.status}</i>
                    {trade.payoutStatus ? <i className={`trade-status-pill payout-${trade.payoutStatus}`}>{trade.payoutStatus}</i> : null}
                  </strong>
                  <small>{trade.pollTitle}</small>
                </span>
                <span>
                  <strong>{formatToken(trade.settlementPayout || trade.amount)} BUDOL</strong>
                  <small>
                    {trade.status === "open"
                      ? `${trade.priceCents}c / ${formatDate(trade.createdAt)}`
                      : `settled ${formatDate(trade.settledAt)}`}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
      {selectedTrade ? (
        <TradeDetailDrawer
          onClose={() => setSelectedTrade(null)}
          onOpenMarket={() => onMarketOpen(selectedTrade.pollSlug)}
          trade={selectedTrade}
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

function formatToken(value: number) {
  return value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

function TradeDetailDrawer({ onClose, onOpenMarket, trade }: { onClose: () => void; onOpenMarket: () => void; trade: Trade }) {
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
