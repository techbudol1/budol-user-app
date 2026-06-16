import { CircleDollarSign } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { loadTradeQuote } from "../lib/api";
import { isMarketTradeable, marketStateLabel } from "../lib/marketState";
import type { Market, TradeQuote, TradeSide, UserPortfolio } from "../types";

type TradeTicketCardProps = {
  accountAddress?: string;
  market: Market;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onMarketChange?: (market: Market) => void;
  onPortfolioChange?: (portfolio: UserPortfolio) => void;
  onTradePlaced?: () => void;
};

export function TradeTicketCard({ accountAddress, isLoggedIn, market, onLoginClick }: TradeTicketCardProps) {
  const [amount, setAmount] = useState("100");
  const [message, setMessage] = useState("");
  const [quotes, setQuotes] = useState<Partial<Record<TradeSide, TradeQuote>>>({});
  const [quoteError, setQuoteError] = useState("");
  const numericAmount = Number(amount);
  const marketState = marketStateLabel(market);
  const tradeable = isMarketTradeable(market);
  const yesReturn = useMemo(() => quotes.yes?.potentialPayout ?? potentialReturn(numericAmount || 0, market.yes), [amount, market.yes, quotes.yes]);
  const noReturn = useMemo(() => quotes.no?.potentialPayout ?? potentialReturn(numericAmount || 0, market.no), [amount, market.no, quotes.no]);
  const bestReturn = Math.max(yesReturn, noReturn);

  useEffect(() => {
    if (!tradeable || !numericAmount || numericAmount <= 0) {
      setQuotes({});
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
            setQuotes({ yes, no });
            setQuoteError("");
          }
        })
        .catch(error => {
          if (!isCancelled) {
            setQuotes({});
            setQuoteError(error instanceof Error ? error.message : "Unable to quote this order.");
          }
        });
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeout);
    };
  }, [market.id, numericAmount, tradeable]);

  const requestTrade = () => {
    setMessage("");
    if (!isLoggedIn) {
      onLoginClick();
      return;
    }
    if (!tradeable) {
      setMessage(`Trading is not available while this market is ${marketState.toLowerCase()}.`);
      return;
    }
    setMessage("Privy login is connected. Token escrow is intentionally disabled until the auth migration is verified.");
  };

  return (
    <div className="panel trade-ticket">
      <div className="panel-title">
        <CircleDollarSign size={18} />
        <h2>Trade ticket</h2>
      </div>
      <span className={`tag ${market.color}`}>{market.tag}</span>
      <h3>{market.title}</h3>
      <div className="ticket-price">
        <span>Market price</span>
        <strong>{market.yes}c</strong>
      </div>
      <label className="order-input">
        BUDOL amount
        <input
          inputMode="decimal"
          min="1"
          type="number"
          value={amount}
          onChange={event => setAmount(event.target.value)}
        />
      </label>
      <div className="ticket-balance-row">
        <span>Wallet</span>
        <strong>{accountAddress ? "Connected" : "Login required"}</strong>
      </div>
      <div className="buy-buttons">
        <button disabled={!tradeable} onClick={requestTrade}>
          Buy {market.outcomeA}
          <strong>{quotes.yes?.averagePriceCents ?? market.yes}c</strong>
        </button>
        <button disabled={!tradeable} onClick={requestTrade}>
          Buy {market.outcomeB}
          <strong>{quotes.no?.averagePriceCents ?? market.no}c</strong>
        </button>
      </div>
      <div className="order-row">
        <span>Quoted return</span>
        <strong>{formatToken(numericAmount || 0)} -&gt; {formatToken(bestReturn)} BUDOL</strong>
      </div>
      <div className="order-row">
        <span>Price impact</span>
        <strong>{formatImpact(quotes.yes?.priceImpactCents)} Yes / {formatImpact(quotes.no?.priceImpactCents)} No</strong>
      </div>
      <div className="order-row">
        <span>AMM liquidity</span>
        <strong>{formatToken(market.liquidity)} BUDOL</strong>
      </div>
      {quoteError ? <p className="trade-message">{quoteError}</p> : null}
      {!tradeable ? <p className="trade-message">Trading is {marketState.toLowerCase()}. Existing positions can still be reviewed in Portfolio.</p> : null}
      {message ? <p className="trade-message">{message}</p> : null}
    </div>
  );
}

function formatImpact(value?: number) {
  if (value === undefined) {
    return "0c";
  }
  return `${value >= 0 ? "+" : ""}${value}c`;
}

function potentialReturn(amount: number, priceCents: number) {
  if (!amount || !priceCents) {
    return 0;
  }
  return amount / (priceCents / 100);
}

function formatToken(value: number) {
  return value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}
