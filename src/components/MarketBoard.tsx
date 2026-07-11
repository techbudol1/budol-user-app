import { LayoutGrid, Sparkles } from "lucide-react";
import type { Market } from "../types";
import { MarketCard } from "./MarketCard";

type MarketBoardProps = {
  activeFilter: string;
  filters: string[];
  markets: Market[];
  onFilterChange: (filter: string) => void;
  onClosingSoonToggle: () => void;
  onMarketOpen: (slug: string) => void;
  onWatchlistFilterToggle: () => void;
  showClosingSoon: boolean;
  showWatchlistOnly: boolean;
};

export function MarketBoard({
  activeFilter,
  filters,
  markets,
  onFilterChange,
  onClosingSoonToggle,
  onMarketOpen,
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
          <h2>Philippine politics only</h2>
        </div>
        <span className="board-status">
          <LayoutGrid size={16} />
          {boardItems.length} {boardItems.length === 1 ? "market" : "markets"}
        </span>
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
              <h3>No live markets yet</h3>
              <p>Administrator-published markets will appear here automatically.</p>
            </div>
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
