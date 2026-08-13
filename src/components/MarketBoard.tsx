import { Clock3, FlaskConical, LayoutGrid, ListFilter, RotateCcw, Sparkles, Star } from "lucide-react";
import type { Market } from "../types";
import { MarketCard, marketCategory } from "./MarketCard";

type MarketBoardProps = {
  activeFilter: string;
  filters: string[];
  hasActiveFilters: boolean;
  hasPublishedMarkets: boolean;
  marketSort: "trending" | "closing" | "volume" | "newest";
  markets: Market[];
  onFilterChange: (filter: string) => void;
  onClearFilters: () => void;
  onClosingSoonToggle: () => void;
  onMarketOpen: (slug: string) => void;
  onSortChange: (sort: "trending" | "closing" | "volume" | "newest") => void;
  onWatchlistFilterToggle: () => void;
  showClosingSoon: boolean;
  showWatchlistOnly: boolean;
};

export function MarketBoard({
  activeFilter,
  filters,
  hasActiveFilters,
  hasPublishedMarkets,
  marketSort,
  markets,
  onFilterChange,
  onClearFilters,
  onClosingSoonToggle,
  onMarketOpen,
  onSortChange,
  onWatchlistFilterToggle,
  showClosingSoon,
  showWatchlistOnly,
}: MarketBoardProps) {
  const boardItems = groupedMarketItems(markets);

  return (
    <section className="markets-column">
      <div className="section-head">
        <div>
          <span className="eyebrow">Market board</span>
          <h2>Markets for the Philippines</h2>
        </div>
        <div className="market-board-badges" aria-label="Market board status">
          <span className="testnet-status">
            <FlaskConical size={15} />
            Testing only
          </span>
          <span className="board-status">
            <LayoutGrid size={16} />
            {boardItems.length} {boardItems.length === 1 ? "market" : "markets"}
          </span>
        </div>
      </div>

      <div className="market-testnet-notice" role="note">
        Live markets are running on testnet for product testing only. Testnet BUDOL, tZEN, and ETH have no real-money value.
      </div>

      <div className="market-filter-bar">
        <div className="filter-tabs" role="tablist" aria-label="Market categories">
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
        <div className="market-filter-actions">
          <button className={showWatchlistOnly ? "filter-button active" : "filter-button"} onClick={onWatchlistFilterToggle} type="button">
            <Star size={15} />
            Watchlist
          </button>
          <button className={showClosingSoon ? "filter-button active" : "filter-button"} onClick={onClosingSoonToggle} type="button">
            <Clock3 size={15} />
            Closing soon
          </button>
          <label className="market-sort-control">
            <ListFilter size={15} />
            <span>Sort</span>
            <select aria-label="Sort markets" onChange={event => onSortChange(event.currentTarget.value as typeof marketSort)} value={marketSort}>
              <option value="trending">Trending</option>
              <option value="closing">Closing first</option>
              <option value="volume">Most volume</option>
              <option value="newest">Newest</option>
            </select>
          </label>
          {hasActiveFilters ? (
            <button className="market-clear-button" onClick={onClearFilters} type="button">
              <RotateCcw size={15} />
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="market-grid">
        {boardItems.length > 0 ? (
          boardItems.map(item => (
            item.kind === "group" ? (
              <MultiChoiceMarketCard
                choices={item.markets}
                key={item.id}
                onOpen={onMarketOpen}
              />
            ) : (
              <MarketCard
                key={item.market.id}
                market={item.market}
                onOpen={onMarketOpen}
              />
            )
          ))
        ) : (
          <div className="empty-state market-empty-state">
            <span className="empty-state-icon">
              <Sparkles size={24} />
            </span>
            <div>
              <h3>{hasPublishedMarkets ? "No markets match these filters" : "No live markets yet"}</h3>
              <p>{hasPublishedMarkets ? "Clear or adjust your filters to see more markets." : "Published markets will appear here automatically. Check back shortly."}</p>
              {hasPublishedMarkets ? <button className="ghost-button" onClick={onClearFilters}>Clear filters</button> : null}
            </div>
            <span className="empty-pulse-stack" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

type MarketBoardItem =
  | { id: string; kind: "single"; market: Market }
  | { id: string; kind: "group"; markets: Market[] };

function groupedMarketItems(markets: Market[]): MarketBoardItem[] {
  const items: MarketBoardItem[] = [];
  const groups = new Map<string, Market[]>();
  const groupPositions = new Map<string, number>();

  for (const market of markets) {
    const groupId = market.marketGroupId?.trim();
    if (!groupId) {
      items.push({ id: market.id, kind: "single", market });
      continue;
    }
    if (!groups.has(groupId)) {
      groups.set(groupId, []);
      groupPositions.set(groupId, items.length);
      items.push({ id: groupId, kind: "group", markets: [] });
    }
    groups.get(groupId)?.push(market);
  }

  for (const [groupId, groupMarkets] of groups) {
    const sorted = [...groupMarkets].sort((a, b) => (a.marketChoiceIndex ?? 0) - (b.marketChoiceIndex ?? 0));
    const position = groupPositions.get(groupId);
    if (position !== undefined) {
      items[position] = { id: groupId, kind: "group", markets: sorted };
    }
  }

  return items;
}

function MultiChoiceMarketCard({
  choices,
  onOpen,
}: {
  choices: Market[];
  onOpen: (slug: string) => void;
}) {
  const primary = choices[0];
  const title = primary.marketGroupTitle || primary.title;
  const category = marketCategory(primary);
  const openPrimaryMarket = () => {
    onOpen(primary.slug);
  };
  return (
    <article
      aria-label={`Open market: ${title}`}
      className="market-card multi-choice-card"
      onClick={openPrimaryMarket}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPrimaryMarket();
        }
      }}
      role="link"
      tabIndex={0}
    >
      <div className="market-card-top">
        <span className={`category-mark ${primary.color}`} aria-hidden="true">{category.icon}</span>
        <span className={`tag ${primary.color}`}>{primary.tag}</span>
        <span className="region">{primary.region}</span>
        <span className="market-state-chip">Multi-choice</span>
      </div>
      <h3>{title}</h3>
      <div className="choice-market-list">
        {choices.map(choice => (
          <button
            key={choice.id}
            type="button"
            onClick={event => {
              event.stopPropagation();
              onOpen(choice.slug);
            }}
          >
            <span>{choice.marketChoiceLabel || choice.outcomeA}</span>
            <strong>Yes {choice.yes}c</strong>
            <small>No {choice.no}c</small>
          </button>
        ))}
      </div>
      <div className="market-footer">
        <span>{choices.length} choices</span>
        <strong>{primary.volume} vol</strong>
      </div>
    </article>
  );
}
