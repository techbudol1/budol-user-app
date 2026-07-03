import type { Market } from "../types";

export type MarketStateLabel = "Open" | "Upcoming" | "Frozen" | "Closed" | "Resolved" | "Cancelled" | "Paused" | "Hidden";

export function marketStateLabel(market: Market, now = new Date()): MarketStateLabel {
  if (market.status === "cancelled") {
    return "Cancelled";
  }
  if (market.status === "resolved") {
    return "Resolved";
  }
  if (market.visibility !== "public") {
    return "Hidden";
  }
  if (market.startsAt && new Date(market.startsAt) > now) {
    return "Upcoming";
  }
  if (market.endsAt && new Date(market.endsAt) <= now) {
    return "Closed";
  }
  if (market.status === "paused") {
    return "Paused";
  }
  if (market.tradingFrozen) {
    return "Frozen";
  }
  return "Open";
}

export function isMarketTradeable(market: Market) {
  return marketStateLabel(market) === "Open" && market.status === "published";
}

export function closesSoon(market: Market, now = new Date()) {
  if (!market.endsAt || !isMarketTradeable(market)) {
    return false;
  }
  const msUntilClose = new Date(market.endsAt).getTime() - now.getTime();
  return msUntilClose > 0 && msUntilClose <= 1000 * 60 * 60 * 24;
}
