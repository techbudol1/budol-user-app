import type { AccountNotification, BudolUser, CashoutQuote, Market, MarketActivity, MarketComment, MarketStats, PublicPoll, Trade, TradeQuote, TradeSide, UserPortfolio, WalletTransfer, WatchlistItem } from "../types";

type AuthResponse = {
  user: BudolUser;
};

type PollsResponse = {
  polls: PublicPoll[];
};

type PollResponse = {
  poll: PublicPoll;
};

type PortfolioResponse = {
  portfolio: UserPortfolio;
};

type TradeResponse = {
  trade: Trade;
  portfolio: UserPortfolio;
  poll: PublicPoll;
};

type TradeResult = {
  trade: Trade;
  portfolio: UserPortfolio;
  market: Market;
};

type TradeQuoteResponse = {
  quote: TradeQuote;
};

type CashoutQuoteResponse = {
  quote: CashoutQuote;
};

type CashoutResponse = {
  cashout: CashoutQuote;
  portfolio: UserPortfolio;
  poll: PublicPoll;
  payoutStatus: string;
  payoutError: string;
  transactionIds: string[];
};

type CashoutResult = {
  cashout: CashoutQuote;
  portfolio: UserPortfolio;
  market: Market;
  payoutStatus: string;
  payoutError: string;
  transactionIds: string[];
};

type MarketActivityResponse = {
  activity: MarketActivity[];
};

type MarketStatsResponse = {
  stats: MarketStats;
};

type MarketCommentsResponse = {
  comments: MarketComment[];
};

type MarketCommentResponse = {
  comment: MarketComment;
};

type WalletHistoryResponse = {
  transfers: WalletTransfer[];
};

type NotificationsResponse = {
  notifications: AccountNotification[];
};

type NotificationResponse = {
  notification: AccountNotification;
};

type WatchlistResponse = {
  watchlist: WatchlistItem[];
};

const localAPIBaseURL = "http://localhost:8082";

function apiBaseURL() {
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? localAPIBaseURL : "";
}

export async function loginWithThirdwebToken(authToken: string): Promise<BudolUser> {
  const baseURL = apiBaseURL();
  const response = await fetch(`${baseURL}/api/auth/thirdweb`, {
    body: JSON.stringify({ authToken }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Budol login failed. Please try again.");
  }

  const payload = (await response.json()) as AuthResponse;
  return payload.user;
}

export async function loadCurrentUser(): Promise<BudolUser | null> {
  const baseURL = apiBaseURL();
  const response = await fetch(`${baseURL}/api/auth/me`, {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to restore Budol session.");
  }

  const payload = (await response.json()) as AuthResponse;
  return payload.user;
}

export async function logoutCurrentUser(): Promise<void> {
  const baseURL = apiBaseURL();
  const response = await fetch(`${baseURL}/api/auth/logout`, {
    credentials: "include",
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to log out.");
  }
}

export async function loadNotifications(): Promise<AccountNotification[]> {
  const response = await fetch(`${apiBaseURL()}/api/notifications`, {
    credentials: "include",
  });

  if (response.status === 401) {
    return [];
  }

  if (!response.ok) {
    throw new Error("Unable to load notifications.");
  }

  const payload = (await response.json()) as NotificationsResponse;
  return payload.notifications;
}

export async function markNotificationRead(id: string): Promise<AccountNotification> {
  const response = await fetch(`${apiBaseURL()}/api/notifications/${encodeURIComponent(id)}/read`, {
    credentials: "include",
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to update notification.");
  }

  const payload = (await response.json()) as NotificationResponse;
  return payload.notification;
}

export async function markAllNotificationsRead(): Promise<void> {
  const response = await fetch(`${apiBaseURL()}/api/notifications/read-all`, {
    credentials: "include",
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to update notifications.");
  }
}

export async function loadWatchlist(): Promise<WatchlistItem[]> {
  const response = await fetch(`${apiBaseURL()}/api/watchlist`, {
    credentials: "include",
  });

  if (response.status === 401) {
    return [];
  }

  if (!response.ok) {
    throw new Error("Unable to load watchlist.");
  }

  const payload = (await response.json()) as WatchlistResponse;
  return payload.watchlist;
}

export async function addWatchlist(slug: string): Promise<WatchlistItem[]> {
  const response = await fetch(`${apiBaseURL()}/api/watchlist`, {
    body: JSON.stringify({ slug }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (response.status === 401) {
    throw new Error("Log in before saving watchlist alerts.");
  }

  if (!response.ok) {
    throw new Error("Unable to update watchlist.");
  }

  const payload = (await response.json()) as WatchlistResponse;
  return payload.watchlist;
}

export async function removeWatchlist(slug: string): Promise<WatchlistItem[]> {
  const response = await fetch(`${apiBaseURL()}/api/watchlist/${encodeURIComponent(slug)}`, {
    credentials: "include",
    method: "DELETE",
  });

  if (response.status === 401) {
    throw new Error("Log in before updating watchlist alerts.");
  }

  if (!response.ok) {
    throw new Error("Unable to update watchlist.");
  }

  const payload = (await response.json()) as WatchlistResponse;
  return payload.watchlist;
}

export async function loadPublicMarkets(): Promise<Market[]> {
  const baseURL = apiBaseURL();
  const response = await fetch(`${baseURL}/api/polls`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to load Budol markets.");
  }

  const payload = (await response.json()) as PollsResponse;
  return payload.polls.map(pollToMarket);
}

export async function loadPublicMarket(slug: string): Promise<Market> {
  const response = await fetch(`${apiBaseURL()}/api/polls/${encodeURIComponent(slug)}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to load Budol market.");
  }

  const payload = (await response.json()) as PollResponse;
  return pollToMarket(payload.poll);
}

export async function loadMarketActivity(slug: string): Promise<MarketActivity[]> {
  const response = await fetch(`${apiBaseURL()}/api/polls/${encodeURIComponent(slug)}/activity`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to load market activity.");
  }

  const payload = (await response.json()) as MarketActivityResponse;
  return payload.activity;
}

export async function loadMarketStats(slug: string): Promise<MarketStats> {
  const response = await fetch(`${apiBaseURL()}/api/polls/${encodeURIComponent(slug)}/stats`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to load market stats.");
  }

  const payload = (await response.json()) as MarketStatsResponse;
  return payload.stats;
}

export async function loadMarketComments(slug: string): Promise<MarketComment[]> {
  const response = await fetch(`${apiBaseURL()}/api/polls/${encodeURIComponent(slug)}/comments`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to load market comments.");
  }

  const payload = (await response.json()) as MarketCommentsResponse;
  return payload.comments;
}

export async function postMarketComment(slug: string, body: string): Promise<MarketComment> {
  const response = await fetch(`${apiBaseURL()}/api/polls/${encodeURIComponent(slug)}/comments`, {
    body: JSON.stringify({ body }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (response.status === 401) {
    throw new Error("Log in before posting a Marites note.");
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to post comment.");
  }

  const payload = (await response.json()) as MarketCommentResponse;
  return payload.comment;
}

export async function reportMarketComment(id: string, reason = "Needs admin review"): Promise<MarketComment> {
  const response = await fetch(`${apiBaseURL()}/api/comments/${encodeURIComponent(id)}/report`, {
    body: JSON.stringify({ reason }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (response.status === 401) {
    throw new Error("Log in before reporting a comment.");
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to report comment.");
  }

  const payload = (await response.json()) as MarketCommentResponse;
  return payload.comment;
}

export async function loadPortfolio(): Promise<UserPortfolio | null> {
  const response = await fetch(`${apiBaseURL()}/api/portfolio`, {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to load portfolio.");
  }

  const payload = (await response.json()) as PortfolioResponse;
  return payload.portfolio;
}

export async function placeTrade(pollId: string, side: TradeSide, amount: number, escrowTxHash: string): Promise<TradeResult> {
  const response = await fetch(`${apiBaseURL()}/api/trades`, {
    body: JSON.stringify({ amount, escrowTxHash, pollId, side }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (response.status === 401) {
    throw new Error("Log in before placing a trade.");
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to place trade.");
  }

  const payload = (await response.json()) as TradeResponse;
  return {
    trade: payload.trade,
    portfolio: payload.portfolio,
    market: pollToMarket(payload.poll),
  };
}

export async function loadTradeQuote(pollId: string, side: TradeSide, amount: number): Promise<TradeQuote> {
  const params = new URLSearchParams({ amount: amount.toString(), pollId, side });
  const response = await fetch(`${apiBaseURL()}/api/trade-quote?${params.toString()}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to quote trade.");
  }

  const payload = (await response.json()) as TradeQuoteResponse;
  return payload.quote;
}

export async function loadCashoutQuote(pollId: string, side: TradeSide, amount = 0): Promise<CashoutQuote> {
  const params = new URLSearchParams({ pollId, side });
  if (amount > 0) {
    params.set("amount", amount.toString());
  }
  const response = await fetch(`${apiBaseURL()}/api/cashout-quote?${params.toString()}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to quote cashout.");
  }

  const payload = (await response.json()) as CashoutQuoteResponse;
  return payload.quote;
}

export async function cashoutPosition(pollId: string, side: TradeSide, amount = 0): Promise<CashoutResult> {
  const response = await fetch(`${apiBaseURL()}/api/cashouts`, {
    body: JSON.stringify({ amount, pollId, side }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to cash out position.");
  }

  const payload = (await response.json()) as CashoutResponse;
  return {
    cashout: payload.cashout,
    portfolio: payload.portfolio,
    market: pollToMarket(payload.poll),
    payoutStatus: payload.payoutStatus,
    payoutError: payload.payoutError,
    transactionIds: payload.transactionIds,
  };
}

export async function loadWalletHistory(): Promise<WalletTransfer[]> {
  const response = await fetch(`${apiBaseURL()}/api/wallet/history`, {
    credentials: "include",
  });

  if (response.status === 401) {
    return [];
  }

  if (!response.ok) {
    throw new Error("Unable to load wallet history.");
  }

  const payload = (await response.json()) as WalletHistoryResponse;
  return payload.transfers;
}

function pollToMarket(poll: PublicPoll): Market {
  return {
    id: poll.id,
    slug: poll.slug,
    tag: poll.category,
    region: poll.region,
    title: poll.title,
    type: poll.pollType,
    status: poll.status,
    visibility: poll.visibility,
    outcomeA: poll.outcomeA,
    outcomeB: poll.outcomeB,
    yes: poll.yesPercent,
    no: poll.noPercent,
    volume: poll.volume,
    change: poll.change,
    hot: poll.hot,
    featured: poll.featured,
    color: poll.color,
    spark: sparkFromPercent(poll.yesPercent),
    callName: poll.callName,
    liquidity: poll.liquidity,
    yesShares: poll.yesShares,
    noShares: poll.noShares,
    marketMakerCollected: poll.marketMakerCollected,
    tradingFrozen: poll.tradingFrozen ?? false,
    commentsDisabled: poll.commentsDisabled ?? false,
    auditReason: poll.auditReason ?? "",
    resolutionSource: poll.resolutionSource,
    resolutionOutcome: poll.resolutionOutcome,
    resolutionEvidenceUrl: poll.resolutionEvidenceUrl ?? "",
    resolutionNotes: poll.resolutionNotes ?? "",
    resolvedBy: poll.resolvedBy ?? "",
    settlementStatus: poll.settlementStatus ?? "",
    settlementPayoutStatus: poll.settlementPayoutStatus ?? "",
    settlementPayoutError: poll.settlementPayoutError ?? "",
    settlementPayoutTransactionIds: poll.settlementPayoutTransactionIds ?? [],
    resolvedAt: poll.resolvedAt,
    startsAt: poll.startsAt,
    endsAt: poll.endsAt,
    createdAt: poll.createdAt,
    updatedAt: poll.updatedAt,
  };
}

function sparkFromPercent(percent: number): number[] {
  const clamped = Math.max(8, Math.min(92, percent));
  return [clamped - 12, clamped - 5, clamped - 9, clamped + 4, clamped - 2, clamped + 3, clamped].map(value =>
    Math.max(8, Math.min(92, value)),
  );
}
