export type Theme = "light" | "dark";

export type MarketColor = "coral" | "green" | "blue" | "yellow";

export type Market = {
  id: string;
  slug: string;
  tag: string;
  region: string;
  title: string;
  type: string;
  status: string;
  visibility: string;
  outcomeA: string;
  outcomeB: string;
  yes: number;
  no: number;
  volume: string;
  change: string;
  hot: boolean;
  featured: boolean;
  color: MarketColor;
  spark: number[];
  callName: string;
  liquidity: number;
  yesShares: number;
  noShares: number;
  marketMakerCollected: number;
  tradingFrozen: boolean;
  commentsDisabled: boolean;
  auditReason: string;
  resolutionSource: string;
  resolutionOutcome: string;
  resolutionEvidenceUrl: string;
  resolutionNotes: string;
  resolvedBy: string;
  settlementStatus: string;
  settlementPayoutStatus: string;
  settlementPayoutError: string;
  settlementPayoutTransactionIds: string[];
  resolvedAt: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PortfolioItem = {
  label: string;
  value: string;
  accent: "green" | "blue" | "coral";
};

export type BudolUser = {
  id: string;
  walletAddress: string;
  thirdwebUserId?: string;
  authProvider?: string;
  email?: string;
  phone?: string;
  createdAt: string;
  lastLoginAt: string;
  loginCount: number;
};

export type PublicPoll = {
  id: string;
  slug: string;
  title: string;
  pollType: string;
  classificationId: string;
  category: string;
  callName: string;
  region: string;
  status: string;
  visibility: string;
  outcomeA: string;
  outcomeB: string;
  yesPercent: number;
  noPercent: number;
  volume: string;
  change: string;
  color: MarketColor;
  hot: boolean;
  featured: boolean;
  sortOrder: number;
  resolutionSource: string;
  liquidity: number;
  yesShares: number;
  noShares: number;
  marketMakerCollected: number;
  tradingFrozen: boolean;
  commentsDisabled: boolean;
  auditReason: string;
  resolutionOutcome: string;
  resolutionEvidenceUrl: string;
  resolutionNotes: string;
  resolvedBy: string;
  settlementStatus: string;
  settlementPayoutStatus: string;
  settlementPayoutError: string;
  settlementPayoutTransactionIds: string[];
  resolvedAt: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
};

export type WalletTransfer = {
  direction: "sent" | "received";
  counterparty: string;
  amountRaw: string;
  amount: string;
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
  timestamp: string;
};

export type TradeSide = "yes" | "no";

export type Trade = {
  id: string;
  userId: string;
  userWalletAddress: string;
  pollId: string;
  pollSlug: string;
  pollTitle: string;
  side: TradeSide;
  outcomeLabel: string;
  priceCents: number;
  amount: number;
  shares: number;
  potentialPayout: number;
  status: string;
  escrowTxHash: string;
  escrowStatus: string;
  escrowVerifiedAt: string;
  escrowFrom: string;
  escrowTo: string;
  escrowAmount: number;
  escrowError: string;
  settlementStatus: string;
  settlementOutcome: string;
  settlementPayout: number;
  payoutStatus: string;
  payoutError: string;
  payoutTransactionIds: string[];
  settledAt: string;
  createdAt: string;
};

export type TradeQuote = {
  pollId: string;
  side: TradeSide;
  outcomeLabel: string;
  amount: number;
  spotPriceCents: number;
  averagePriceCents: number;
  shares: number;
  potentialPayout: number;
  newYesPercent: number;
  newNoPercent: number;
  priceImpactCents: number;
  liquidity: number;
};

export type CashoutQuote = {
  pollId: string;
  pollSlug: string;
  pollTitle: string;
  side: TradeSide;
  outcomeLabel: string;
  amount: number;
  shares: number;
  proceeds: number;
  currentPriceCents: number;
  newYesPercent: number;
  newNoPercent: number;
  priceImpactCents: number;
};

export type MarketStats = {
  pollId: string;
  pollSlug: string;
  yesShares: number;
  noShares: number;
  liquidity: number;
  tradeCount: number;
  holderCount: number;
  yesHolderCount: number;
  noHolderCount: number;
  openInterest: number;
  marketMakerCollected: number;
};

export type MarketActivity = {
  id: string;
  kind: "buy" | "cashout" | "settlement";
  status: string;
  actor: string;
  side: TradeSide;
  outcomeLabel: string;
  amount: number;
  payout: number;
  priceCents: number;
  priceImpactCents: number;
  createdAt: string;
};

export type MarketComment = {
  id: string;
  userId: string;
  pollId: string;
  pollSlug: string;
  actor: string;
  body: string;
  status: "visible" | "hidden" | "deleted";
  reportCount: number;
  latestReportReason: string;
  latestReportedAt: string;
  createdAt: string;
};

export type Position = {
  pollId: string;
  pollSlug: string;
  pollTitle: string;
  category: string;
  region: string;
  side: TradeSide;
  outcomeLabel: string;
  amount: number;
  shares: number;
  averagePrice: number;
  currentPrice: number;
  currentValue: number;
  potentialPayout: number;
  unrealizedPnl: number;
  realizedPnl: number;
  tradeCount: number;
  lastTradeAt: string;
};

export type PortfolioSummary = {
  openPositions: number;
  totalExposure: number;
  currentValue: number;
  potentialPayout: number;
  settledPnl: number;
  unrealizedPnl: number;
  realizedPnl: number;
  netPnl: number;
};

export type UserPortfolio = {
  summary: PortfolioSummary;
  positions: Position[];
  trades: Trade[];
};

export type AccountNotification = {
  id: string;
  userId?: string;
  kind?: string;
  title: string;
  detail: string;
  link?: string;
  readAt?: string;
  createdAt: string;
};

export type WatchlistItem = {
  pollId: string;
  slug: string;
  title: string;
  category: string;
  region: string;
  addedAt: string;
  updatedAt: string;
};
