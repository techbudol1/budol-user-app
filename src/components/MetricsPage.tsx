import { Activity, ArrowLeft, BarChart3, CheckCircle2, Coins, Database, LoaderCircle, RefreshCw, ShieldCheck, TrendingUp, Users, WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadPublicMetrics } from "../lib/api";
import type { PublicMetricDay, PublicMetrics } from "../types";

type MetricsPageProps = {
  onBack: () => void;
};

export function MetricsPage({ onBack }: MetricsPageProps) {
  const [metrics, setMetrics] = useState<PublicMetrics | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setMetrics(await loadPublicMetrics());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load testnet metrics.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section className="metrics-page">
      <button className="ghost-button legal-back-button" onClick={onBack} type="button">
        <ArrowLeft size={18} />
        Back to markets
      </button>

      <section className="metrics-hero panel">
        <div>
          <span className="eyebrow">Public testnet dashboard</span>
          <h1>BudolPH in numbers.</h1>
          <p>Real aggregate activity recorded by the BudolPH API on Horizen Testnet. Individual wallets, recipients, private notes, and proofs never appear on this page.</p>
          <div className="metrics-network-badges">
            <span><Activity size={15} /> Live testnet data</span>
            <span><ShieldCheck size={15} /> Privacy-safe aggregates</span>
            {metrics ? <span>Chain ID {metrics.network.chainId}</span> : null}
          </div>
        </div>
        <div className="metrics-update-card">
          <BarChart3 size={30} />
          <span>Last calculated</span>
          <strong>{metrics ? formatMetricTimestamp(metrics.generatedAt) : "Loading…"}</strong>
          <button className="ghost-button" disabled={isLoading} onClick={() => void refresh()} type="button">
            {isLoading ? <LoaderCircle className="spin-icon" size={16} /> : <RefreshCw size={16} />}
            Refresh
          </button>
        </div>
      </section>

      {error ? (
        <section className="metrics-error panel">
          <strong>Metrics are temporarily unavailable.</strong>
          <span>{error}</span>
          <button className="primary-button" onClick={() => void refresh()} type="button">Try again</button>
        </section>
      ) : !metrics ? (
        <section className="metrics-loading panel"><LoaderCircle className="spin-icon" size={26} /> Loading anonymous testnet activity…</section>
      ) : (
        <MetricsContent metrics={metrics} />
      )}
    </section>
  );
}

function MetricsContent({ metrics }: { metrics: PublicMetrics }) {
  const withdrawalDecisions = metrics.privacy.completedWithdrawals + metrics.privacy.failedWithdrawals;
  return (
    <>
      <section className="metrics-stat-grid" aria-label="All-time product metrics">
        <MetricCard icon={<Users size={21} />} label="Registered testers" value={formatCount(metrics.totals.users)} detail={`${formatCount(metrics.totals.activeTraders)} unique traders`} />
        <MetricCard icon={<TrendingUp size={21} />} label="Trades placed" value={formatCount(metrics.totals.trades)} detail="Recorded testnet positions" />
        <MetricCard icon={<Coins size={21} />} label="BUDOL volume" value={formatToken(metrics.totals.volume)} detail="Cumulative traded amount" />
        <MetricCard icon={<Database size={21} />} label="On-chain records" value={formatCount(metrics.totals.recordedTransactions)} detail="Known escrow and withdrawal transactions" />
      </section>

      <section className="metrics-activity-layout">
        <article className="metrics-chart-card panel">
          <header>
            <div>
              <span className="eyebrow">Last 30 days</span>
              <h2>Trading activity</h2>
            </div>
            <span className="metrics-chart-total">{formatToken(metrics.activity.thirtyDays.volume)} BUDOL</span>
          </header>
          <ActivityChart days={metrics.activity.daily} />
        </article>

        <aside className="metrics-period-stack">
          <PeriodCard label="Past 7 days" period={metrics.activity.sevenDays} />
          <PeriodCard label="Past 30 days" period={metrics.activity.thirtyDays} />
        </aside>
      </section>

      <section className="metrics-detail-grid">
        <article className="metrics-breakdown-card panel">
          <header><WalletCards size={21} /><div><span className="eyebrow">Market coverage</span><h2>Markets on testnet</h2></div></header>
          <MetricRow label="All public markets" value={metrics.totals.markets} />
          <MetricRow label="Open for testing" value={metrics.totals.openMarkets} tone="positive" />
          <MetricRow label="Resolved or cancelled" value={metrics.totals.resolvedMarkets} />
        </article>

        <article className="metrics-breakdown-card privacy panel">
          <header><ShieldCheck size={21} /><div><span className="eyebrow">Privacy usage</span><h2>ZK and shielded flows</h2></div></header>
          <MetricRow label="Private claims" value={metrics.privacy.privateClaims} />
          <MetricRow label="Shielded trade orders" value={metrics.privacy.shieldedTrades} />
          <MetricRow label="Completed shielded withdrawals" value={metrics.privacy.completedWithdrawals} tone="positive" />
          <MetricRow label="Withdrawal success rate" suffix="%" value={withdrawalDecisions ? metrics.privacy.withdrawalSuccessRate : null} />
        </article>
      </section>

      <section className="pilot-funnel panel">
        <header><MessageSquarePilot /><div><span className="eyebrow">Anonymous pilot funnel</span><h2>From visit to meaningful action</h2></div></header>
        <div className="pilot-funnel-grid">
          <FunnelStep label="Started" value={metrics.pilot.started} />
          <FunnelStep label="Connected" value={metrics.pilot.connected} total={metrics.pilot.started} />
          <FunnelStep label="Traded" value={metrics.pilot.traded} total={metrics.pilot.connected} />
          <FunnelStep label="Used privacy" value={metrics.pilot.privacyUsed} total={metrics.pilot.connected} />
          <FunnelStep label="Shared feedback" value={metrics.pilot.feedbackCount} total={metrics.pilot.started} />
        </div>
        <p>Each browser is counted with a random, server-hashed pilot identifier. No wallet, market choice, amount, recipient, transaction hash, note, or proof is included.</p>
      </section>

      <section className="metrics-methodology panel">
        <CheckCircle2 size={22} />
        <div>
          <span className="eyebrow">How these numbers work</span>
          <h2>Measurable without publishing user activity.</h2>
          <p>{metrics.privacyNote} Counts come from BudolPH application records and update automatically. “On-chain records” includes transaction hashes known to the API; it is not a full block-explorer index. tZEN fee totals will be added after token-event indexing is available.</p>
        </div>
      </section>
    </>
  );
}

function MessageSquarePilot() { return <span className="metrics-pilot-icon">✦</span>; }

function FunnelStep({ label, total, value }: { label: string; total?: number; value: number }) {
  const conversion = total ? Math.round((value / total) * 100) : null;
  return <div><span>{label}</span><strong>{formatCount(value)}</strong><small>{conversion === null ? "Entry" : `${conversion}% conversion`}</small></div>;
}

function MetricCard({ detail, icon, label, value }: { detail: string; icon: ReactNode; label: string; value: string }) {
  return (
    <article className="metrics-stat-card panel">
      <span className="metrics-stat-icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function PeriodCard({ label, period }: { label: string; period: PublicMetrics["activity"]["sevenDays"] }) {
  return (
    <article className="metrics-period-card panel">
      <span>{label}</span>
      <strong>{formatCount(period.trades)} trades</strong>
      <div><span>{formatToken(period.volume)} BUDOL</span><span>{formatCount(period.activeTraders)} traders</span></div>
    </article>
  );
}

function MetricRow({ label, suffix = "", tone, value }: { label: string; suffix?: string; tone?: "positive"; value: number | null }) {
  return <div className="metrics-row"><span>{label}</span><strong className={tone ? `is-${tone}` : ""}>{value === null ? "—" : `${formatCount(value)}${suffix}`}</strong></div>;
}

function ActivityChart({ days }: { days: PublicMetricDay[] }) {
  const maxTrades = useMemo(() => Math.max(1, ...days.map(day => day.trades)), [days]);
  const activeDays = days.filter(day => day.trades > 0).length;
  return (
    <div className="metrics-chart-wrap">
      <div className="metrics-bar-chart" aria-label={`${activeDays} days with trading activity in the last 30 days`} role="img">
        {days.map(day => (
          <span className={day.trades ? "active" : ""} key={day.date} style={{ height: `${Math.max(4, (day.trades / maxTrades) * 100)}%` }} title={`${formatShortDate(day.date)}: ${day.trades} trades, ${formatToken(day.volume)} BUDOL`} />
        ))}
      </div>
      <div className="metrics-chart-axis">
        <span>{days[0] ? formatShortDate(days[0].date) : "30 days ago"}</span>
        <span>{activeDays} active day{activeDays === 1 ? "" : "s"}</span>
        <span>{days.length ? formatShortDate(days[days.length - 1].date) : "Today"}</span>
      </div>
    </div>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 }).format(value);
}

function formatToken(value: number) {
  return new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 }).format(value);
}

function formatMetricTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}
