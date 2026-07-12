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
  marketGroupId?: string;
  marketGroupTitle?: string;
  marketChoiceLabel?: string;
  marketChoiceIndex?: number;
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
  publicAlias: string;
  thirdwebUserId?: string;
  authProvider?: string;
  authType?: string;
  email?: string;
  phone?: string;
  walletCustody?: "managed" | "external" | string;
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
  marketGroupId?: string;
  marketGroupTitle?: string;
  marketChoiceLabel?: string;
  marketChoiceIndex?: number;
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
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenLabel?: string;
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
  timestamp: string;
};

export type WalletBalance = {
  raw: string;
  formatted: string;
  decimals: number;
  kind?: "native" | "erc20";
  label?: string;
  symbol?: string;
  walletAddress: string;
  tokenAddress?: string;
  fetchedAt: string;
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
  privateClaimLeaf: string;
  privateClaimLeafIndex: number;
  privateClaimRoot: string;
  privateClaimNullifierHash: string;
  privateClaimId: string;
  settledAt: string;
  createdAt: string;
};

export type PrivateClaimNote = {
  amount: string;
  leaf: string;
  marketId: string;
  nullifierHash: string;
  outcome: string;
  secret: string;
  userSalt: string;
  version: string;
};

export type ShieldedPayoutNote = {
  blinding: string;
  chainId: number;
  commitment: string;
  createdAt: string;
  denomination: string;
  hashScheme?: "poseidon-v1" | "sha256-v0";
  noteId?: string;
  poolAddress: string;
  secret: string;
  tokenAddress: string;
  tradeId: string;
  version: "budol-shielded-payout-v1";
};

export type ShieldedPayoutPool = {
  denomination: string;
  poolAddress: string;
};

export type ShieldedWithdrawalCircuitInput = {
  noteCommitment: string;
  nullifierHash: string;
  recipient: string;
  chainId: string;
  tokenAddress: string;
  poolAddress: string;
  denomination: string;
  secret: string;
  blinding: string;
};

export type ShieldedWithdrawal = {
  id: string;
  userId: string;
  mode: string;
  noteCommitment: string;
  nullifierHash: string;
  recipient: string;
  relayer: string;
  relayerFee: string;
  zkProofSubmissionId?: string;
  zkProofSubmissionRef?: string;
  status: string;
  error?: string;
  transactionId?: string;
  transactionHash?: string;
  executeAfter: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
};

export type PrivateClaim = {
  id: string;
  userId: string;
  tradeId: string;
  pollId: string;
  pollSlug: string;
  pollTitle: string;
  walletAddress: string;
  leaf: string;
  root: string;
  nullifierHash: string;
  zkProofSubmissionId: string;
  amount: number;
  status: string;
  payoutStatus: string;
  payoutError: string;
  transactionIds: string[];
  createdAt: string;
  updatedAt: string;
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
  collateralized: boolean;
  collateralRequired: number;
  collateralAvailable: number;
  collateralCoverage: number;
};

export type CollateralStatus = {
  availableCollateral: number;
  bufferBps: number;
  collateralized: boolean;
  coveragePercent: number;
  enabled: boolean;
  freeCollateral: number;
  markets?: Array<{
    pollId: string;
    pollSlug: string;
    pollTitle: string;
    yesLiability: number;
    noLiability: number;
    refundLiability: number;
    fixedPayouts: number;
    requiredCollateral: number;
  }>;
  requiredCollateral: number;
  requiredWithBuffer: number;
  tokenAddress: string;
  walletAddress: string;
  walletBalance: number;
  fetchedAt: string;
};

export type TradeConfig = {
  chainId: number;
  collateral: CollateralStatus;
  collateralGuaranteeEnabled: boolean;
  engineGasFreeEnabled: boolean;
  gasPayerBalance: string;
  gasPayerBalanceRaw: string;
  gaslessSpenderAddress: string;
  networkName: string;
  tokenAddress: string;
  tokenDecimals: number;
  tokenSymbol: string;
  escrowWalletAddress: string;
  tradingFeeBps: number;
  tradingFeeRate: number;
};

export type SmartWalletConfig = {
  enabled: boolean;
  chainId: number;
  networkName: string;
  rpcUrl: string;
  entryPointAddress: string;
  entryPointVersion: "0.8" | string;
  factoryAddress: string;
  bundlerUrl: string;
  accountType: "SimpleAccount" | string;
  mode: "erc4337" | string;
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
  pollStatus: string;
  category: string;
  region: string;
  endsAt: string;
  tradingFrozen: boolean;
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

export type MarketAlert = {
  pollId?: string;
  slug: string;
  title?: string;
  enabled: boolean;
  priceEnabled: boolean;
  priceDirection: "above" | "below";
  priceThreshold: number;
  closingEnabled: boolean;
  resolutionEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
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
