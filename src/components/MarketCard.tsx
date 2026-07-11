import { Flame } from "lucide-react";
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
        <span className={`tag ${market.color}`}>{market.tag}</span>
        <span className="region">{market.region}</span>
        {market.hot ? (
          <span className="hot">
            <Flame size={14} />
            Hot
          </span>
        ) : null}
        {closingSoon ? <span className="market-state-chip closing">Closing soon</span> : null}
        {!tradeable ? <span className={`market-state-chip ${state.toLowerCase()}`}>{state}</span> : null}
      </div>
      <h3>{market.title}</h3>
      <div className="probability-row">
        <span>{market.outcomeA}</span>
        <strong>{market.yes}%</strong>
      </div>
      <div className="probability-bar">
        <span style={{ width: `${market.yes}%` }}></span>
      </div>
      <div className="sparkline" aria-hidden="true">
        <svg viewBox="0 0 100 40" preserveAspectRatio="none">
          <polygon points={areaPoints} />
          <polyline points={chartPoints.join(" ")} />
        </svg>
      </div>
      <div className="market-footer">
        <span>{market.volume} vol</span>
        <strong className={market.change.startsWith("+") ? "positive" : "negative"}>{market.change}</strong>
      </div>
    </article>
  );
}
