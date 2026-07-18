import type { AccountNotification, BudolUser, CashoutQuote, Market, MarketActivity, MarketAlert, MarketComment, MarketStats, PrivateClaim, PrivateClaimNote, PublicPoll, ShieldedPayoutNote, ShieldedPayoutPool, ShieldedWithdrawal, SmartWalletConfig, Trade, TradeConfig, TradeQuote, TradeSide, UserPortfolio, WalletBalance, WalletTransfer, WatchlistItem } from "../types";
import { createPrivateClaimNote, loadPrivateClaimNote, savePrivateClaimNote } from "./privateClaims";
import { apiBaseURL } from "./runtimeConfig";
import { createShieldedPayoutNotesForAmount, fieldPublicSignalToBytes32, removeShieldedPayoutNote, saveShieldedPayoutNotes, type ShieldedPayoutConfig } from "./shieldedPayouts";

type AuthResponse = {
  user: BudolUser;
};

type WalletNonceResponse = {
  address: string;
  expiresAt: string;
  message: string;
  nonce: string;
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

export type ManagedEscrowResult = {
  escrowAmount?: number;
  escrowTxHash: string;
  gasFree?: boolean;
  managed?: boolean;
  permitTransactionHash?: string;
  tradingFee?: number;
  tradingFeeBps?: number;
  transactionIds?: string[];
  transferTransactionHash?: string;
};

export type GaslessPermitSignature = {
  deadline: string;
  owner: string;
  r: string;
  s: string;
  v: number;
};

type PrivateClaimResponse = {
  claim: PrivateClaim;
  trade: Trade;
  portfolio: UserPortfolio;
  payoutStatus: string;
  payoutError: string;
  payoutMode?: "direct" | "direct_fallback" | "shielded";
  shieldedPayout?: boolean;
  shieldedPayoutNote?: ShieldedPayoutNote;
  shieldedPayoutNotes?: ShieldedPayoutNote[];
  shieldedPayoutCommitments?: string[];
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

export type PrivacyFeeKind = "hide_position" | "private_claim" | "shielded_payout";

export type PrivacyAccessConfig = {
  chainId: number;
  collectorAddress: string;
  currency: string;
  decimals: number;
  mode: "erc20" | "native";
  tokenAddress: string;
  fees: Record<PrivacyFeeKind, string>;
  limitations: string[];
};

type ManagedPrivacyFeeResponse = {
  amountRaw: string;
  collectorAddress: string;
  currency: string;
  kind: PrivacyFeeKind;
  managed?: boolean;
  skipped?: boolean;
  transactionHash: string;
  transactionIds?: string[];
};

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

type TradeConfigResponse = {
  config: TradeConfig;
};

type SmartWalletConfigResponse = {
  config: SmartWalletConfig;
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
  balances?: WalletBalance[];
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

type MarketAlertResponse = {
  alert: MarketAlert;
};

export async function createWalletLoginChallenge(address: string): Promise<WalletNonceResponse> {
  const response = await fetch(`${apiBaseURL()}/api/auth/wallet/nonce`, {
    body: JSON.stringify({ address }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to create wallet login challenge.");
  }

  return (await response.json()) as WalletNonceResponse;
}

export async function verifyWalletLogin(input: {
  address: string;
  message: string;
  nonce: string;
  signature: string;
}): Promise<BudolUser> {
  const response = await fetch(`${apiBaseURL()}/api/auth/wallet/verify`, {
    body: JSON.stringify(input),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Wallet login failed. Please try again.");
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
    throw new Error("Unable to restore BudolPH session.");
  }

  const payload = (await response.json()) as AuthResponse;
  return payload.user;
}

export async function updateAccountDisplayName(displayName: string): Promise<BudolUser> {
  const response = await fetch(`${apiBaseURL()}/api/account/profile`, {
    body: JSON.stringify({ displayName }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
  const payload = (await response.json().catch(() => null)) as (AuthResponse & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Unable to update display name.");
  }
  return (payload as AuthResponse).user;
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

export async function loadMarketAlert(slug: string): Promise<MarketAlert | null> {
  const response = await fetch(`${apiBaseURL()}/api/market-alerts/${encodeURIComponent(slug)}`, {
    credentials: "include",
  });
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error("Unable to load market alerts.");
  }
  return ((await response.json()) as MarketAlertResponse).alert;
}

export async function saveMarketAlert(slug: string, alert: Pick<MarketAlert, "closingEnabled" | "priceDirection" | "priceEnabled" | "priceThreshold" | "resolutionEnabled">): Promise<MarketAlert> {
  const response = await fetch(`${apiBaseURL()}/api/market-alerts/${encodeURIComponent(slug)}`, {
    body: JSON.stringify(alert),
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
  const payload = (await response.json().catch(() => null)) as (MarketAlertResponse & { error?: string }) | null;
  if (response.status === 401) {
    throw new Error("Log in before configuring alerts.");
  }
  if (!response.ok) {
    throw new Error(payload?.error || "Unable to save market alerts.");
  }
  return (payload as MarketAlertResponse).alert;
}

export async function deleteMarketAlert(slug: string): Promise<void> {
  const response = await fetch(`${apiBaseURL()}/api/market-alerts/${encodeURIComponent(slug)}`, {
    credentials: "include",
    method: "DELETE",
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to disable market alerts.");
  }
}

export async function loadPublicMarkets(): Promise<Market[]> {
  const baseURL = apiBaseURL();
  const response = await fetch(`${baseURL}/api/polls`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to load BudolPH markets.");
  }

  const payload = (await response.json()) as PollsResponse;
  return payload.polls.map(pollToMarket);
}

export async function loadPublicMarket(slug: string): Promise<Market> {
  const response = await fetch(`${apiBaseURL()}/api/polls/${encodeURIComponent(slug)}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to load BudolPH market.");
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

export async function placeTrade(pollId: string, side: TradeSide, amount: number, escrowTxHash: string, escrowFromAddress?: string): Promise<TradeResult> {
  const privateClaimNote = await createPrivateClaimNote({ amount, pollId, side });
  const response = await fetch(`${apiBaseURL()}/api/trades`, {
    body: JSON.stringify({ amount, escrowFromAddress, escrowTxHash, pollId, privateClaimLeaf: privateClaimNote.leaf, side }),
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

export async function createManagedTradeEscrow(pollId: string, side: TradeSide, amount: string): Promise<ManagedEscrowResult> {
  const response = await fetch(`${apiBaseURL()}/api/trades/managed-escrow`, {
    body: JSON.stringify({ amount, pollId, side }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = (await response.json().catch(() => null)) as (ManagedEscrowResult & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Unable to create managed escrow transfer.");
  }
  if (!payload?.escrowTxHash) {
    throw new Error("Managed escrow did not return a transaction hash.");
  }
  return payload;
}

export async function createGaslessTradeEscrow(pollId: string, side: TradeSide, amount: string, permit: GaslessPermitSignature): Promise<ManagedEscrowResult> {
  const response = await fetch(`${apiBaseURL()}/api/trades/gasless-escrow`, {
    body: JSON.stringify({ amount, deadline: permit.deadline, owner: permit.owner, pollId, r: permit.r, s: permit.s, side, v: permit.v }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = (await response.json().catch(() => null)) as (ManagedEscrowResult & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Unable to create gas-free escrow transfer.");
  }
  if (!payload?.escrowTxHash) {
    throw new Error("Gas-free escrow did not return a transaction hash.");
  }
  return payload;
}

export async function claimPrivatePayout(tradeId: string, zkProofSubmissionId: string, payoutAmount?: string | number, privacyReceiptTxHash = ""): Promise<PrivateClaimResponse> {
  const note = loadPrivateClaimNote(tradeId);
  if (!note) {
    throw new Error("Private claim note is missing on this browser. Claims require the note created when the trade was placed.");
  }
  if (!zkProofSubmissionId.trim()) {
    throw new Error("ZKVerify proof submission ID is required before claiming.");
  }
  const shieldedConfig = await loadShieldedPayoutConfig();
  const shieldedPayoutNotes = shieldedConfig.enabled && payoutAmount !== undefined ? await createShieldedPayoutNotesForAmount(tradeId, shieldedConfig, payoutAmount) : [];
  const response = await fetch(`${apiBaseURL()}/api/private-claims`, {
    body: JSON.stringify({
      nullifierHash: note.nullifierHash,
      shieldedNoteCommitments: shieldedPayoutNotes.map(note => ({
        commitment: note.commitment,
        denomination: note.denomination,
        poolAddress: note.poolAddress,
      })),
      privacyReceiptTxHash,
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
  if (!payload?.shieldedPayout) {
    removeShieldedPayoutNote(tradeId);
  }
  const creditedCommitments = new Set((payload?.shieldedPayoutCommitments || []).map(commitment => commitment.toLowerCase()));
  const creditedNotes = payload?.shieldedPayout
    ? shieldedPayoutNotes.filter(note => creditedCommitments.size === 0 || creditedCommitments.has(note.commitment.toLowerCase()))
    : [];
  if (creditedNotes.length > 0) {
    saveShieldedPayoutNotes(creditedNotes);
  }
  return {
    ...(payload as PrivateClaimResponse),
    shieldedPayoutNote: creditedNotes[0],
    shieldedPayoutNotes: creditedNotes,
  };
}

export async function loadPrivacyAccessConfig(): Promise<PrivacyAccessConfig> {
  const response = await fetch(`${apiBaseURL()}/api/privacy-access/config`, {
    credentials: "include",
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to load privacy fee configuration.");
  }
  const payload = (await response.json()) as PrivacyAccessConfig & {
    feeCollectorAddress?: string;
    features?: {
      hidePositionUntilResolution?: { fee?: string };
      privateClaimProof?: { fee?: string };
      shieldedPayout?: { fee?: string };
    };
    tokenAddress?: string;
    tokenSymbol?: string;
  };
  const fees = (payload.fees || {}) as Record<PrivacyFeeKind, string>;
  const legacyFeatures = payload.features || {};
  return {
    chainId: Number(payload.chainId || 2651420),
    collectorAddress: String(payload.collectorAddress || payload.feeCollectorAddress || ""),
    currency: String(payload.currency || payload.tokenSymbol || "tZEN"),
    decimals: Number(payload.decimals || 18),
    tokenAddress: String(payload.tokenAddress || ""),
    fees: {
      hide_position: String(fees.hide_position || legacyFeatures.hidePositionUntilResolution?.fee || "0"),
      private_claim: String(fees.private_claim || legacyFeatures.privateClaimProof?.fee || "0"),
      shielded_payout: String(fees.shielded_payout || legacyFeatures.shieldedPayout?.fee || "0"),
    },
    limitations: Array.isArray(payload.limitations) ? payload.limitations.map(String) : [],
    mode: payload.tokenAddress ? "erc20" : "native",
  };
}

export async function payManagedPrivacyFee(kind: PrivacyFeeKind): Promise<ManagedPrivacyFeeResponse> {
  const response = await fetch(`${apiBaseURL()}/api/privacy-access/managed-fee`, {
    body: JSON.stringify({ kind }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as (ManagedPrivacyFeeResponse & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Unable to pay managed privacy fee.");
  }
  return payload as ManagedPrivacyFeeResponse;
}

export async function loadShieldedPayoutConfig(): Promise<ShieldedPayoutConfigResponse> {
  const response = await fetch(`${apiBaseURL()}/api/private-claims/shielded-config`, {
    credentials: "include",
  });
  if (!response.ok) {
    return {
      chainId: 2651420,
      denomination: "",
      enabled: false,
      poolAddress: "",
      pools: [],
      tokenAddress: "",
      version: "budol-shielded-payout-v1",
    };
  }
  const payload = (await response.json()) as ShieldedPayoutConfigResponse;
  return {
    chainId: Number(payload.chainId || 2651420),
    denomination: String(payload.denomination || ""),
    enabled: Boolean(payload.enabled),
    poolAddress: String(payload.poolAddress || ""),
    pools: Array.isArray(payload.pools)
      ? payload.pools.map((pool: ShieldedPayoutPool) => ({
        denomination: String(pool.denomination || ""),
        poolAddress: String(pool.poolAddress || ""),
      })).filter(pool => pool.denomination && pool.poolAddress)
      : [],
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
  privacyReceiptTxHash?: string;
  proof: unknown;
  publicSignals: unknown[];
  tradeId: string;
  vk: unknown;
}): Promise<PrivateClaimProofSubmissionResponse> {
  const response = await fetch(`${apiBaseURL()}/api/private-claims/proof-submissions`, {
    body: JSON.stringify({
      domainId: 1,
      nullifierHash: input.nullifierHash,
      privacyReceiptTxHash: input.privacyReceiptTxHash || "",
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

export async function loadTradeConfig(): Promise<TradeConfig> {
  const response = await fetch(`${apiBaseURL()}/api/trade-config`, {
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to load trade configuration.");
  }

  const payload = (await response.json()) as TradeConfigResponse;
  return payload.config;
}

export async function loadSmartWalletConfig(): Promise<SmartWalletConfig> {
  const response = await fetch(`${apiBaseURL()}/api/smart-wallet/config`, {
    credentials: "include",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to load smart wallet configuration.");
  }

  const payload = (await response.json()) as SmartWalletConfigResponse;
  return payload.config;
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
    cache: "no-store",
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

export async function loadWalletBalance(options: { forceRefresh?: boolean } = {}): Promise<WalletBalance | null> {
  const balances = await loadWalletBalances(options);
  return balances.find(balance => balance.symbol === "BUDOL") ?? balances[0] ?? null;
}

export async function loadWalletBalances(options: { forceRefresh?: boolean } = {}): Promise<WalletBalance[]> {
  const url = new URL(`${apiBaseURL()}/api/wallet/balance`);
  if (options.forceRefresh) {
    url.searchParams.set("refresh", "1");
  }
  const response = await fetch(url.toString(), {
    cache: "no-store",
    credentials: "include",
  });

  if (response.status === 401) {
    return [];
  }

  if (!response.ok) {
    throw new Error("Unable to load wallet balance.");
  }

  const payload = (await response.json()) as WalletBalanceResponse;
  return payload.balances?.length ? payload.balances : payload.balance ? [payload.balance] : [];
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
    marketGroupId: poll.marketGroupId ?? "",
    marketGroupTitle: poll.marketGroupTitle ?? "",
    marketChoiceLabel: poll.marketChoiceLabel ?? "",
    marketChoiceIndex: poll.marketChoiceIndex ?? 0,
    yes: poll.yesPercent,
    no: poll.noPercent,
    volume: poll.volume,
    change: poll.change,
    hot: poll.hot,
    featured: poll.featured,
    color: poll.color,
    spark: sparkFromMarket(poll),
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

function sparkFromMarket(poll: PublicPoll): number[] {
  const percent = poll.yesPercent;
  const clamped = Math.max(8, Math.min(92, percent));
  const activity = Math.max(0, Number(poll.marketMakerCollected || 0));
  if (!activity) {
    return sparkFromPercent(clamped);
  }
  const drift = Math.min(8, Math.log10(activity + 1) * 3);
  const direction = (poll.yesShares || 0) >= (poll.noShares || 0) ? 1 : -1;
  return [
    clamped - 10,
    clamped - 6,
    clamped - 8,
    clamped - 3 + direction * drift * 0.25,
    clamped + direction * drift * 0.55,
    clamped + direction * drift * 0.8,
    clamped + direction * drift,
  ].map(value =>
    Math.max(8, Math.min(92, value)),
  );
}

function sparkFromPercent(percent: number): number[] {
  const clamped = Math.max(8, Math.min(92, percent));
  return [clamped - 12, clamped - 5, clamped - 9, clamped + 4, clamped - 2, clamped + 3, clamped].map(value =>
    Math.max(8, Math.min(92, value)),
  );
}
