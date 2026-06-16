import type { AccountNotification, BudolUser, CashoutQuote, Market, MarketActivity, MarketComment, MarketStats, PrivateClaim, PrivateClaimNote, PublicPoll, ShieldedPayoutNote, ShieldedWithdrawal, Trade, TradeQuote, TradeSide, UserPortfolio, WalletBalance, WalletTransfer, WatchlistItem } from "../types";
import { createPrivateClaimNote, loadPrivateClaimNote, savePrivateClaimNote } from "./privateClaims";
import { createShieldedPayoutNote, fieldPublicSignalToBytes32, type ShieldedPayoutConfig } from "./shieldedPayouts";

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
  privateClaimNote?: PrivateClaimNote;
  portfolio: UserPortfolio;
  market: Market;
};

type PrivateClaimResponse = {
  claim: PrivateClaim;
  trade: Trade;
  portfolio: UserPortfolio;
  payoutStatus: string;
  payoutError: string;
  shieldedPayout?: boolean;
  shieldedPayoutNote?: ShieldedPayoutNote;
  transactionIds: string[];
};

type PrivateClaimTreeResponse = {
  tree: {
    pollId: string;
    pollSlug: string;
    pollTitle: string;
    root: string;
    leaves: string[];
    leafIndexes: number[];
    leafCount: number;
    rootHistory: Array<{
      id: string;
      pollId: string;
      root: string;
      leafCount: number;
      reason: string;
      createdAt: string;
      lastSeenAt: string;
    }>;
  };
};

type PrivateClaimProofSubmissionResponse = {
  root: string;
  submission: {
    id: string;
    publicSignals: string;
    status: string;
    zkVerifyNetwork: string;
    transactionResult: string;
    error: string;
  };
};

type ShieldedPayoutConfigResponse = ShieldedPayoutConfig;

type ShieldedWithdrawalProofSubmissionResponse = {
  submission: {
    id: string;
    publicSignals: string;
    status: string;
    zkVerifyNetwork: string;
    transactionResult: string;
    error: string;
  };
};

type ShieldedWithdrawalResponse = {
  noteCommitment: string;
  nullifierHash: string;
  recipient: string;
  status: string;
  transaction: {
    id: string;
    status: string;
    transactionHash: string;
  } | null;
  withdrawal?: ShieldedWithdrawal;
  zkProofSubmissionId: string;
};

type ShieldedWithdrawalsResponse = {
  withdrawals: ShieldedWithdrawal[];
};

type ShieldedWithdrawalRetryResponse = {
  withdrawal: ShieldedWithdrawal;
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

type WalletBalanceResponse = {
  balance: WalletBalance;
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

export async function loginWithPrivyToken(accessToken: string): Promise<BudolUser> {
  const baseURL = apiBaseURL();
  const response = await fetch(`${baseURL}/api/auth/privy`, {
    body: JSON.stringify({ accessToken }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Budol Privy login failed. Please try again.");
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
  const privateClaimNote = await createPrivateClaimNote({ amount, pollId, side });
  const response = await fetch(`${apiBaseURL()}/api/trades`, {
    body: JSON.stringify({ amount, escrowTxHash, pollId, privateClaimLeaf: privateClaimNote.leaf, side }),
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
  savePrivateClaimNote(payload.trade.id, privateClaimNote);
  return {
    trade: payload.trade,
    privateClaimNote,
    portfolio: payload.portfolio,
    market: pollToMarket(payload.poll),
  };
}

export async function claimPrivatePayout(tradeId: string, zkProofSubmissionId: string): Promise<PrivateClaimResponse> {
  const note = loadPrivateClaimNote(tradeId);
  if (!note) {
    throw new Error("Private claim note is missing on this browser. Claims require the note created when the trade was placed.");
  }
  if (!zkProofSubmissionId.trim()) {
    throw new Error("ZKVerify proof submission ID is required before claiming.");
  }
  const shieldedConfig = await loadShieldedPayoutConfig();
  const shieldedPayoutNote = shieldedConfig.enabled ? await createShieldedPayoutNote(tradeId, shieldedConfig) : null;
  const response = await fetch(`${apiBaseURL()}/api/private-claims`, {
    body: JSON.stringify({
      nullifierHash: note.nullifierHash,
      shieldedNoteCommitment: shieldedPayoutNote?.commitment,
      tradeId,
      zkProofSubmissionId: zkProofSubmissionId.trim(),
    }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as (PrivateClaimResponse & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Unable to claim private payout.");
  }
  return { ...(payload as PrivateClaimResponse), shieldedPayoutNote: shieldedPayoutNote || undefined };
}

export async function loadShieldedPayoutConfig(): Promise<ShieldedPayoutConfigResponse> {
  const response = await fetch(`${apiBaseURL()}/api/private-claims/shielded-config`, {
    credentials: "include",
  });
  if (!response.ok) {
    return {
      chainId: 421614,
      denomination: "",
      enabled: false,
      poolAddress: "",
      tokenAddress: "",
      version: "budol-shielded-payout-v1",
    };
  }
  const payload = (await response.json()) as ShieldedPayoutConfigResponse;
  return {
    chainId: Number(payload.chainId || 421614),
    denomination: String(payload.denomination || ""),
    enabled: Boolean(payload.enabled),
    poolAddress: String(payload.poolAddress || ""),
    tokenAddress: String(payload.tokenAddress || ""),
    version: "budol-shielded-payout-v1",
  };
}

export async function submitShieldedWithdrawalProof(input: {
  noteCommitment: string;
  nullifierHash: string;
  proof: unknown;
  publicSignals: unknown[];
  recipient: string;
  vk: unknown;
}): Promise<ShieldedWithdrawalProofSubmissionResponse> {
  const response = await fetch(`${apiBaseURL()}/api/private-claims/shielded-withdrawal-proofs`, {
    body: JSON.stringify({
      noteCommitment: input.noteCommitment,
      nullifierHash: input.nullifierHash,
      proof: input.proof,
      proofSystem: "groth16",
      publicSignals: input.publicSignals,
      recipient: input.recipient,
      vk: input.vk,
    }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as (ShieldedWithdrawalProofSubmissionResponse & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Unable to submit shielded withdrawal proof.");
  }
  return payload as ShieldedWithdrawalProofSubmissionResponse;
}

export async function withdrawShieldedPayout(input: {
  noteCommitment: string;
  nullifierHash: string;
  publicSignals: unknown[];
  recipient: string;
  solidityProof: string;
  zkProofSubmissionId: string;
}): Promise<ShieldedWithdrawalResponse> {
  const response = await fetch(`${apiBaseURL()}/api/private-claims/shielded-withdrawals`, {
    body: JSON.stringify(input),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as (ShieldedWithdrawalResponse & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Unable to withdraw shielded payout.");
  }
  return payload as ShieldedWithdrawalResponse;
}

export async function loadShieldedWithdrawals(): Promise<ShieldedWithdrawal[]> {
  const response = await fetch(`${apiBaseURL()}/api/private-claims/shielded-withdrawals`, {
    credentials: "include",
  });

  if (response.status === 401) {
    return [];
  }

  if (!response.ok) {
    throw new Error("Unable to load shielded withdrawals.");
  }

  const payload = (await response.json()) as ShieldedWithdrawalsResponse;
  return payload.withdrawals;
}

export async function retryShieldedWithdrawal(id: string): Promise<ShieldedWithdrawal> {
  const response = await fetch(`${apiBaseURL()}/api/private-claims/shielded-withdrawals/${encodeURIComponent(id)}/retry`, {
    credentials: "include",
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as (ShieldedWithdrawalRetryResponse & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Unable to retry shielded withdrawal.");
  }
  return (payload as ShieldedWithdrawalRetryResponse).withdrawal;
}

export function shieldedWithdrawalPublicValues(publicSignals: unknown[]) {
  return {
    noteCommitment: fieldPublicSignalToBytes32(String(publicSignals[0] ?? "")),
    nullifierHash: fieldPublicSignalToBytes32(String(publicSignals[1] ?? "")),
  };
}

export async function loadPrivateClaimTree(slug: string): Promise<PrivateClaimTreeResponse["tree"]> {
  const response = await fetch(`${apiBaseURL()}/api/polls/${encodeURIComponent(slug)}/private-claim-tree`, {
    credentials: "include",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to load private claim tree.");
  }

  const payload = (await response.json()) as PrivateClaimTreeResponse;
  return payload.tree;
}

export async function submitPrivateClaimProof(input: {
  nullifierHash: string;
  proof: unknown;
  publicSignals: unknown[];
  tradeId: string;
  vk: unknown;
}): Promise<PrivateClaimProofSubmissionResponse> {
  const response = await fetch(`${apiBaseURL()}/api/private-claims/proof-submissions`, {
    body: JSON.stringify({
      domainId: 1,
      nullifierHash: input.nullifierHash,
      proof: input.proof,
      proofSystem: "groth16",
      publicSignals: input.publicSignals,
      tradeId: input.tradeId,
      vk: input.vk,
    }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = (await response.json().catch(() => null)) as (PrivateClaimProofSubmissionResponse & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Unable to submit private claim proof.");
  }
  return payload as PrivateClaimProofSubmissionResponse;
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

export async function loadWalletBalance(): Promise<WalletBalance | null> {
  const response = await fetch(`${apiBaseURL()}/api/wallet/balance`, {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to load wallet balance.");
  }

  const payload = (await response.json()) as WalletBalanceResponse;
  return payload.balance;
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
