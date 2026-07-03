import { HandCoins } from "lucide-react";
import type { PortfolioItem } from "../types";

type PortfolioCardProps = {
  items: PortfolioItem[];
  onOpen?: () => void;
};

export function PortfolioCard({ items, onOpen }: PortfolioCardProps) {
  return (
    <div className="panel" id="portfolio">
      <div className="panel-title">
        <HandCoins size={18} />
        <h2>Portfolio</h2>
      </div>
      {items.map(item => (
        <div className={`stat-row ${item.accent}`} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
      {onOpen ? (
        <button className="portfolio-open-button" onClick={onOpen}>
          Open portfolio
        </button>
      ) : null}
    </div>
  );
}
