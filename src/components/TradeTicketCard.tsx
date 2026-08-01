import { CircleDollarSign, EyeOff, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { loadTradeConfig, loadTradeQuote, placeTrade } from "../lib/api";
import { isHorizen } from "../lib/chains";
import { isMarketTradeable, marketStateLabel } from "../lib/marketState";
import { loadShieldedTradeConfig, type ShieldedTradeConfig } from "../lib/shieldedTrades";
import type { Market, TradeConfig, TradeQuote, TradeSide, UserPortfolio } from "../types";

export type EscrowTransferResult = {
  fromAddress?: string;
  txHash: string;
};

type TradeTicketCardProps = {
  accountAddress?: string;
  market: Market;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onEscrowTransfer?: (amount: string, pollId: string, side: TradeSide) => Promise<EscrowTransferResult>;
  onMarketChange?: (market: Market) => void;
  onPortfolioChange?: (portfolio: UserPortfolio) => void;
  onTradePlaced?: () => void;
	onShieldedTrade?: (amount: number, pollId: string, side: TradeSide) => Promise<void>;
};

type ConfirmOrder = {
  amount: number;
  expectedPayout: number;
  marketPrice: number;
  side: TradeSide;
  shares: number;
  transferAmount: string;
};

type QuoteSnapshot = {
  key: string;
  quotes: Partial<Record<TradeSide, TradeQuote>>;
};

const FIXED_TRADE_AMOUNTS = [10, 25, 50, 100, 250, 500] as const;

export function TradeTicketCard({ accountAddress, isLoggedIn, market, onEscrowTransfer, onLoginClick, onMarketChange, onPortfolioChange, onTradePlaced, onShieldedTrade }: TradeTicketCardProps) {
  const [amount, setAmount] = useState("10");
  const [confirmOrder, setConfirmOrder] = useState<ConfirmOrder | null>(null);
  const [message, setMessage] = useState("");
  const [pendingSide, setPendingSide] = useState<TradeSide | "">("");
  const [quoteSnapshot, setQuoteSnapshot] = useState<QuoteSnapshot | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [tradeConfig, setTradeConfig] = useState<TradeConfig | null>(null);
  const [selectedSide, setSelectedSide] = useState<TradeSide>("yes");
	const [privateTrade, setPrivateTrade] = useState(false);
	const [shieldedConfig, setShieldedConfig] = useState<ShieldedTradeConfig | null>(null);
  const numericAmount = Number(amount);
  const quoteKey = `${market.id}:${numericAmount}`;
  const quotes = quoteSnapshot?.key === quoteKey ? quoteSnapshot.quotes : {};
  const marketState = marketStateLabel(market);
  const tradeable = isMarketTradeable(market);
  const yesReturn = useMemo(() => quotes.yes?.potentialPayout ?? potentialReturn(numericAmount || 0, market.yes), [amount, market.yes, quotes.yes]);
  const noReturn = useMemo(() => quotes.no?.potentialPayout ?? potentialReturn(numericAmount || 0, market.no), [amount, market.no, quotes.no]);
  const yesShares = useMemo(() => quotes.yes?.shares ?? potentialReturn(numericAmount || 0, market.yes), [amount, market.yes, quotes.yes]);
  const noShares = useMemo(() => quotes.no?.shares ?? potentialReturn(numericAmount || 0, market.no), [amount, market.no, quotes.no]);
  const yesPrice = quotes.yes?.averagePriceCents ?? market.yes;
  const noPrice = quotes.no?.averagePriceCents ?? market.no;
  const ticketMessage = message || quoteError || (!tradeable ? `Trading is ${marketState.toLowerCase()}. Review positions in Portfolio.` : "");
  const selectedPrice = selectedSide === "yes" ? yesPrice : noPrice;
  const selectedReturn = selectedSide === "yes" ? yesReturn : noReturn;
  const selectedShares = selectedSide === "yes" ? yesShares : noShares;
  const selectedQuote = quotes[selectedSide];
  const selectedProbabilityBefore = selectedQuote?.spotPriceCents ?? (selectedSide === "yes" ? market.yes : market.no);
  const selectedProbabilityAfter = selectedQuote
    ? selectedSide === "yes" ? selectedQuote.newYesPercent : selectedQuote.newNoPercent
    : selectedProbabilityBefore;
  const selectedLabel = selectedSide === "yes" ? "Yes" : "No";
  const isTradeConfigReady = !isLoggedIn || Boolean(tradeConfig);
  const tradingFeeBps = tradeConfig ? normalizeTradingFeeBps(tradeConfig.tradingFeeBps) : 0;
  const selectedTradingFee = tradingFeeAmount(numericAmount || 0, tradingFeeBps);
  const selectedEscrowTotal = roundMoney((numericAmount || 0) + selectedTradingFee);
	const shieldedAvailable = Boolean(shieldedConfig?.enabled && shieldedConfig.vaults.some(vault => vault.available && Number(vault.amount) === numericAmount));

  useEffect(() => {
    if (!tradeable || !numericAmount || numericAmount <= 0) {
      setQuoteSnapshot(null);
      setQuoteError("");
      return;
    }

    let isCancelled = false;
    const timeout = window.setTimeout(() => {
      Promise.all([
        loadTradeQuote(market.id, "yes", numericAmount),
        loadTradeQuote(market.id, "no", numericAmount),
      ])
        .then(([yes, no]) => {
          if (!isCancelled) {
            setQuoteSnapshot({
              key: `${market.id}:${numericAmount}`,
              quotes: { yes, no },
            });
            setQuoteError("");
          }
        })
        .catch(error => {
          if (!isCancelled) {
            setQuoteSnapshot(null);
            const message = error instanceof Error ? error.message : "";
            setQuoteError(message.toLowerCase().includes("failed to fetch") ? "Quote unavailable" : message || "Unable to quote this order.");
          }
        });
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeout);
    };
  }, [market.id, numericAmount, tradeable]);

  useEffect(() => {
    if (!isLoggedIn) {
      setTradeConfig(null);
      return;
    }
    let isCancelled = false;
    loadTradeConfig()
      .then(config => {
        if (!isCancelled) {
          setTradeConfig(config);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setTradeConfig(null);
        }
      });
    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn]);

	useEffect(() => {
		if (!isLoggedIn) { setShieldedConfig(null); return; }
		let active = true;
		const refresh = () => loadShieldedTradeConfig().then(config => { if (active) setShieldedConfig(config); }).catch(() => { if (active) setShieldedConfig(null); });
		void refresh();
		const interval = window.setInterval(refresh, 15_000);
		return () => { active = false; window.clearInterval(interval); };
	}, [isLoggedIn]);

	useEffect(() => { if (!shieldedAvailable) setPrivateTrade(false); }, [shieldedAvailable]);

  const requestTrade = async (side: TradeSide) => {
    setMessage("");
    setQuoteError("");
    if (!isLoggedIn) {
      onLoginClick();
      return;
    }
    if (!tradeable) {
      setMessage(`Trading is not available while this market is ${marketState.toLowerCase()}.`);
      return;
    }
    if (!tradeConfig) {
      setMessage("Trading configuration is still loading. Try again in a moment.");
      return;
    }
    if (!onEscrowTransfer || !accountAddress) {
      setMessage("Wallet transfer is not ready. Reconnect your wallet and try again.");
      return;
    }

    const normalizedAmount = normalizeTradeAmount(amount);
    if (!normalizedAmount.ok) {
      setMessage(normalizedAmount.error);
      return;
    }

    setConfirmOrder({
      amount: normalizedAmount.tradeAmount,
      expectedPayout: side === "yes" ? yesReturn : noReturn,
      marketPrice: side === "yes" ? yesPrice : noPrice,
      shares: side === "yes" ? yesShares : noShares,
      side,
      transferAmount: normalizedAmount.transferAmount,
    });
  };

  const confirmTrade = async () => {
    if (!confirmOrder) {
      return;
    }

    setPendingSide(confirmOrder.side);
    try {
      setConfirmOrder(null);
		if (privateTrade) {
			if (!onShieldedTrade) throw new Error("Shielded trading is not available.");
			setMessage("Creating a private deposit note and zero-knowledge order proof…");
			await onShieldedTrade(confirmOrder.amount, market.id, confirmOrder.side);
			onTradePlaced?.();
			setMessage("Private order accepted. Odds update only after the aggregate batch settles.");
			return;
		}
      setMessage(tradeConfig && isHorizen(tradeConfig.chainId) ? "Confirm the Horizen escrow wallet operation." : "Confirm the escrow transfer in your wallet.");
      const escrow = await onEscrowTransfer?.(confirmOrder.transferAmount, market.id, confirmOrder.side);
      if (!escrow?.txHash) {
        throw new Error("Wallet transfer is not ready. Reconnect your wallet and try again.");
      }
      setMessage("Escrow submitted. Verifying the transfer and placing your trade.");
      const result = await placeTrade(market.id, confirmOrder.side, confirmOrder.amount, escrow.txHash, escrow.fromAddress);
      onMarketChange?.(result.market);
      onPortfolioChange?.(result.portfolio);
      onTradePlaced?.();
      setMessage(`Bought ${result.trade.outcomeLabel} for ${formatToken(result.trade.amount)} BUDOL.`);
    } catch (error) {
      setMessage(normalizeTradeError(error));
    } finally {
      setPendingSide("");
    }
  };

  const confirmOutcomeLabel = confirmOrder?.side === "yes" ? "Yes" : "No";

  return (
    <>
      <div className="panel trade-ticket">
        <div className="simple-ticket-head">
          <span>
            <CircleDollarSign size={17} />
            Trade
          </span>
          <small>{tradeable ? "Market order" : marketState}</small>
        </div>
        <div className="simple-ticket-market">
          <span className={`tag ${market.color}`}>{market.tag}</span>
          <h3 title={market.title}>{market.title}</h3>
        </div>

        <div className="simple-outcome-picker" aria-label="Choose an outcome">
          <button
            aria-pressed={selectedSide === "yes"}
            className={selectedSide === "yes" ? "selected yes" : "yes"}
            disabled={!tradeable || Boolean(pendingSide)}
            onClick={() => setSelectedSide("yes")}
            type="button"
          >
            <span>Yes</span>
            <strong>{yesPrice}¢</strong>
          </button>
          <button
            aria-pressed={selectedSide === "no"}
            className={selectedSide === "no" ? "selected no" : "no"}
            disabled={!tradeable || Boolean(pendingSide)}
            onClick={() => setSelectedSide("no")}
            type="button"
          >
            <span>No</span>
            <strong>{noPrice}¢</strong>
          </button>
        </div>

        <section className="simple-amount-label" aria-label="Trade amount">
          <span>Amount</span>
          <div className="simple-amount-input">
            <span className="simple-amount-value">{amount}</span>
            <strong>BUDOL selected</strong>
          </div>
        </section>
        <div className="simple-amount-presets" aria-label="Fixed trade amount selection">
          {FIXED_TRADE_AMOUNTS.map(value => (
            <button
              aria-pressed={amount === value.toString()}
              className={amount === value.toString() ? "selected" : ""}
              key={value}
              onClick={() => setAmount(value.toString())}
              type="button"
            >
              {value}
            </button>
          ))}
        </div>

        <div className="simple-ticket-summary">
          <div>
            <span>Cost</span>
            <strong>{formatToken(numericAmount || 0)} BUDOL</strong>
          </div>
          <div>
            <span>Trading fee</span>
            <strong>{tradeConfig ? `${formatToken(selectedTradingFee)} BUDOL` : "Loading"}</strong>
          </div>
          <div>
            <span>Total escrow</span>
            <strong>{tradeConfig ? `${formatToken(selectedEscrowTotal)} BUDOL` : "Loading"}</strong>
          </div>
          <div>
            <span>Potential payout</span>
            <strong className="positive">{formatToken(selectedReturn)} BUDOL</strong>
          </div>
        </div>

		{shieldedAvailable ? <label className={`private-trade-toggle ${privateTrade ? "selected" : ""}`}>
			<input checked={privateTrade} onChange={event => setPrivateTrade(event.target.checked)} type="checkbox" />
			<EyeOff size={18} />
			<span><strong>Private trade</strong><small>Hide wallet, side, and size behind a batched ZK order.</small></span>
		</label> : null}

        <div className="trade-impact-preview" aria-live="polite">
          <div className="trade-impact-head">
            <strong>Price impact</strong>
            <span>{selectedQuote ? "Live quote" : numericAmount > 0 ? "Calculating…" : "Enter amount"}</span>
          </div>
          <div>
            <span>Average execution</span>
            <strong>{selectedQuote ? `${selectedQuote.averagePriceCents}¢` : "—"}</strong>
          </div>
          <div>
            <span>{selectedLabel} probability</span>
            <strong>{selectedQuote ? `${selectedProbabilityBefore}% → ${selectedProbabilityAfter}%` : "—"}</strong>
          </div>
          <div>
            <span>Market movement</span>
            <strong className={selectedQuote && selectedQuote.priceImpactCents > 0 ? "impact-warning" : ""}>
              {selectedQuote ? formatSignedCents(selectedQuote.priceImpactCents) : "—"}
            </strong>
          </div>
        </div>

        <button
          className={`simple-trade-submit ${selectedSide}`}
          disabled={!tradeable || !isTradeConfigReady || Boolean(pendingSide) || !numericAmount || numericAmount <= 0}
          onClick={() => void requestTrade(selectedSide)}
          type="button"
        >
          {pendingSide ? "Placing trade…" : isLoggedIn && !isTradeConfigReady ? "Loading trade config…" : isLoggedIn ? `Trade ${selectedLabel}` : "Log in to trade"}
        </button>

        <div className="simple-ticket-foot">
          <span>{formatToken(selectedShares)} estimated shares</span>
          {quotes[selectedSide]?.collateralized ? (
            <span className="positive">
              <ShieldCheck size={13} />
              Fully backed
            </span>
          ) : null}
        </div>
        {ticketMessage ? <p className="simple-trade-message" aria-live="polite">{ticketMessage}</p> : null}
      </div>
      {confirmOrder ? (
        <div className="order-confirm-backdrop" role="presentation" onMouseDown={() => setConfirmOrder(null)}>
          <section className="order-confirm-modal" role="dialog" aria-modal="true" aria-label="Confirm trade" onMouseDown={event => event.stopPropagation()}>
            <button className="order-confirm-close" aria-label="Close confirmation" onClick={() => setConfirmOrder(null)}>
              <X size={18} />
            </button>
            <div className="order-confirm-icon">
              <ShieldCheck size={24} />
            </div>
            <span className={`tag ${market.color}`}>{market.tag}</span>
            <h2>Confirm {confirmOutcomeLabel} trade</h2>
            <p>{market.title}</p>
            <div className="order-confirm-grid">
              <div>
                <span>Trade amount</span>
                <strong>{formatToken(confirmOrder.amount)} BUDOL</strong>
              </div>
              <div>
                <span>Trading fee</span>
                <strong>{tradeConfig ? `${formatToken(tradingFeeAmount(confirmOrder.amount, tradingFeeBps))} BUDOL` : "Loading"}</strong>
              </div>
              <div>
                <span>Total escrow</span>
                <strong>{tradeConfig ? `${formatToken(roundMoney(confirmOrder.amount + tradingFeeAmount(confirmOrder.amount, tradingFeeBps)))} BUDOL` : "Loading"}</strong>
              </div>
              <div>
                <span>Outcome price</span>
                <strong>{confirmOrder.marketPrice}c</strong>
              </div>
              <div>
                <span>Shares</span>
                <strong>{formatToken(confirmOrder.shares)}</strong>
              </div>
              <div>
                <span>If correct</span>
                <strong>{formatToken(confirmOrder.expectedPayout)} BUDOL</strong>
              </div>
            </div>
            <p className="order-confirm-note">{privateTrade ? "Your wallet deposits a fixed-denomination note, generates a ZK proof locally, and sends the order through a relayer. The testnet operator can still see order details." : "BudolPH escrows the trade amount plus the trading fee when you confirm."}</p>
            <div className="order-confirm-actions">
              <button className="ghost-button" onClick={() => setConfirmOrder(null)}>Cancel</button>
              <button className="primary-button" onClick={() => void confirmTrade()}>Confirm trade</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function potentialReturn(amount: number, priceCents: number) {
  if (!amount || !priceCents) {
    return 0;
  }
  return amount / (priceCents / 100);
}

function formatSignedCents(value: number) {
  if (value === 0) return "0¢";
  return `${value > 0 ? "+" : ""}${value}¢`;
}

function formatToken(value: number) {
  return value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

function normalizeTradingFeeBps(value?: number) {
  if (!Number.isFinite(value)) {
    return 50;
  }
  return Math.max(0, Math.min(1000, Number(value)));
}

function tradingFeeAmount(amount: number, feeBps: number) {
  return roundMoney((amount * feeBps) / 10000);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeTradeAmount(value: string): { ok: true; tradeAmount: number; transferAmount: string } | { ok: false; error: string } {
  const trimmed = value.trim();
  if (!FIXED_TRADE_AMOUNTS.some(amount => amount.toString() === trimmed)) {
    return { ok: false, error: `Choose one of the fixed BUDOL amounts: ${FIXED_TRADE_AMOUNTS.join(", ")}.` };
  }
  const tradeAmount = Number(trimmed);
  if (!Number.isFinite(tradeAmount) || tradeAmount <= 0) {
    return { ok: false, error: "Amount must be greater than zero." };
  }
  if (tradeAmount > 1000000) {
    return { ok: false, error: "Amount is too large for one trade." };
  }
  return { ok: true, tradeAmount, transferAmount: tradeAmount.toFixed(2) };
}

function normalizeTradeError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!message) {
    return "Unable to place trade. Please try again.";
  }
  if (message.toLowerCase().includes("gas sponsorship")) {
    return message;
  }
  if (message.toLowerCase().includes("failed to fetch")) {
    return "Unable to reach BudolPH API. Check that the server is running.";
  }
  if (message.toLowerCase().includes("user rejected")) {
    return "Wallet confirmation was cancelled.";
  }
  if (message.toLowerCase().includes("insufficient")) {
    return "Not enough BUDOL or gas for this order.";
  }
  return message;
}
