import { ChevronDown, ListFilter } from "lucide-react";
import type { Market } from "../types";
import { MarketCard } from "./MarketCard";

type MarketBoardProps = {
  activeFilter: string;
  filters: string[];
  markets: Market[];
  selectedId: string;
  onFilterChange: (filter: string) => void;
  onClosingSoonToggle: () => void;
  onMarketOpen: (slug: string) => void;
  onMarketSelect: (id: string) => void;
  onWatchlistFilterToggle: () => void;
  showClosingSoon: boolean;
  showWatchlistOnly: boolean;
};

export function MarketBoard({
  activeFilter,
  filters,
  markets,
  selectedId,
  onFilterChange,
  onClosingSoonToggle,
  onMarketOpen,
  onMarketSelect,
  onWatchlistFilterToggle,
  showClosingSoon,
  showWatchlistOnly,
}: MarketBoardProps) {
  return (
    <section className="markets-column">
      <div className="section-head">
        <div>
          <span className="eyebrow">Market board</span>
          <h2>Philippine politics only</h2>
        </div>
        <button className="filter-button">
          <ListFilter size={18} />
          Filters
          <ChevronDown size={16} />
        </button>
      </div>

      <div className="filter-tabs" role="tablist" aria-label="Market categories">
        <button className={showWatchlistOnly ? "active" : ""} onClick={onWatchlistFilterToggle} role="tab">
          Watchlist
        </button>
        <button className={showClosingSoon ? "active" : ""} onClick={onClosingSoonToggle} role="tab">
          Closing soon
        </button>
        {filters.map(filter => (
          <button
            aria-selected={activeFilter === filter}
            className={activeFilter === filter ? "active" : ""}
            key={filter}
            onClick={() => onFilterChange(filter)}
            role="tab"
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="market-grid">
        {markets.length > 0 ? (
          markets.map(market => (
            <MarketCard
              isSelected={selectedId === market.id}
              key={market.id}
              market={market}
              onOpen={onMarketOpen}
              onSelect={onMarketSelect}
            />
          ))
        ) : (
          <div className="empty-state">No markets match these filters.</div>
        )}
      </div>
    </section>
  );
}
