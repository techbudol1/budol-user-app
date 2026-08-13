import { Clock3, Flame } from "lucide-react";
import { closesSoon, isMarketTradeable, marketStateLabel } from "../lib/marketState";
import type { Market } from "../types";

type MarketCardProps = {
  market: Market;
  onOpen: (slug: string) => void;
};

export function MarketCard({ market, onOpen }: MarketCardProps) {
  const state = marketStateLabel(market);
  const tradeable = isMarketTradeable(market);
  const closingSoon = closesSoon(market);
  const category = marketCategory(market);
  const isNew = isRecentlyPublished(market.createdAt);
  const chartPoints = market.spark.map((point, index) => {
    const x = market.spark.length <= 1 ? 0 : (index / (market.spark.length - 1)) * 100;
    const y = 38 - (Math.max(0, Math.min(point, 100)) / 100) * 32;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const areaPoints = `0,40 ${chartPoints.join(" ")} 100,40`;
  const openMarket = () => {
    onOpen(market.slug);
  };

  return (
    <article
      aria-label={`Open market: ${market.title}`}
      className="market-card"
      onClick={openMarket}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openMarket();
        }
      }}
      role="link"
      tabIndex={0}
    >
      <div className="market-card-top">
        <span className={`category-mark ${market.color}`} aria-hidden="true">{category.icon}</span>
        <span className={`tag ${market.color}`}>{market.tag}</span>
        <span className="region">{market.region}</span>
        {market.hot ? (
          <span className="hot">
            <Flame size={14} />
            Hot
          </span>
        ) : null}
        {!market.hot && isNew ? <span className="market-state-chip new">New</span> : null}
        {closingSoon ? <span className="market-state-chip closing">Closing soon</span> : null}
        {!tradeable ? <span className={`market-state-chip ${state.toLowerCase()}`}>{state}</span> : null}
      </div>
      <h3>{market.title}</h3>
      <div className="market-outcomes" aria-label="Current outcome prices">
        <button className="yes" onClick={event => { event.stopPropagation(); openMarket(); }} type="button">
          <span>{market.outcomeA}</span>
          <strong>{market.yes}¢</strong>
        </button>
        <button className="no" onClick={event => { event.stopPropagation(); openMarket(); }} type="button">
          <span>{market.outcomeB}</span>
          <strong>{market.no}¢</strong>
        </button>
      </div>
      {market.spark.length > 1 ? (
        <div className="sparkline" aria-hidden="true">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none">
            <polygon points={areaPoints} />
            <polyline points={chartPoints.join(" ")} />
          </svg>
        </div>
      ) : <div className="market-card-spacer" />}
      <div className="market-footer">
        <span className="market-close-time"><Clock3 size={14} /> {formatCloseTime(market.endsAt)}</span>
        <span>{market.volume} volume</span>
        <strong className={market.change.startsWith("+") ? "positive" : "negative"}>{market.change}</strong>
      </div>
    </article>
  );
}

export function marketCategory(market: Pick<Market, "tag" | "type" | "title" | "region">) {
  const haystack = `${market.tag} ${market.type} ${market.title} ${market.region}`.toLowerCase();
  if (/(weather|storm|typhoon|rain|flood|heat|climate)/.test(haystack)) {
    return { icon: "☔", label: "Weather" };
  }
  if (/(sport|pba|nba|uaap|ncaa|boxing|basketball|volleyball|football|game)/.test(haystack)) {
    return { icon: "🏀", label: "Sports" };
  }
  if (/(showbiz|entertainment|movie|music|artist|celebrity|tv|pageant)/.test(haystack)) {
    return { icon: "🎬", label: "Entertainment" };
  }
  if (/(business|economy|peso|inflation|stock|company|retail|price|jobs)/.test(haystack)) {
    return { icon: "₱", label: "Business" };
  }
  if (/(crypto|tech|ai|startup|chain|token|internet|app)/.test(haystack)) {
    return { icon: "⌁", label: "Tech" };
  }
  if (/(traffic|transport|lrt|mrt|jeep|flight|airport|road|commute)/.test(haystack)) {
    return { icon: "🚌", label: "Transport" };
  }
  if (/(policy|congress|senate|deped|doh|city|civic|barangay|court|law|mayor)/.test(haystack)) {
    return { icon: "✦", label: "Civic" };
  }
  return { icon: "◇", label: "PH" };
}

function isRecentlyPublished(value: string) {
  if (!value) {
    return false;
  }
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) {
    return false;
  }
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - createdAt <= sevenDays;
}

function formatCloseTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No close date";
  return new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short" }).format(date);
}
