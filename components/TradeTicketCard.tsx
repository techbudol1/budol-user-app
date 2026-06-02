import { CircleDollarSign, LoaderCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getContract, prepareContractCall } from "thirdweb";
import { useActiveAccount, useSendTransaction, useWalletBalance } from "thirdweb/react";
import { toUnits } from "thirdweb/utils";
import { loadTradeQuote, placeTrade } from "../lib/api";
import { isMarketTradeable, marketStateLabel } from "../lib/marketState";
import { BUDOL_ESCROW_ADDRESS, BUDOL_TOKEN_ADDRESS, BUDOL_TOKEN_DECIMALS, BUDOL_TOKEN_SYMBOL, thirdwebClient, web3Chain } from "../lib/thirdweb";
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

export function TradeTicketCard({ accountAddress, isLoggedIn, market, onLoginClick, onMarketChange, onPortfolioChange, onTradePlaced }: TradeTicketCardProps) {
  const activeAccount = useActiveAccount();
  const sendTransaction = useSendTransaction({ payModal: false });
  const [amount, setAmount] = useState("100");
  const [message, setMessage] = useState("");
  const [pendingSide, setPendingSide] = useState<TradeSide | null>(null);
  const [confirmSide, setConfirmSide] = useState<TradeSide | null>(null);
  const [quotes, setQuotes] = useState<Partial<Record<TradeSide, TradeQuote>>>({});
  const [quoteError, setQuoteError] = useState("");
  const numericAmount = Number(amount);
  const balance = useWalletBalance(
    {
      address: accountAddress,
      chain: web3Chain,
      client: thirdwebClient,
      tokenAddress: BUDOL_TOKEN_ADDRESS,
    },
    {
      enabled: Boolean(accountAddress),
    },
  );
  const contract = useMemo(
    () =>
      getContract({
        address: BUDOL_TOKEN_ADDRESS,
        chain: web3Chain,
        client: thirdwebClient,
      }),
    [],
  );
  const availableBalance = Number(balance.data?.displayValue ?? 0);
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

  const requestTradeConfirmation = (side: TradeSide) => {
    setMessage("");
    if (!isLoggedIn) {
      onLoginClick();
      return;
    }
    if (!tradeable) {
      setMessage(`Trading is not available while this market is ${marketState.toLowerCase()}.`);
      return;
    }
    if (!activeAccount) {
      setMessage("Reconnect your wallet before placing a trade.");
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setMessage("Enter a BUDOL amount greater than zero.");
      return;
    }
    if (balance.data && numericAmount > availableBalance) {
      setMessage("That order is higher than your available BUDOL balance.");
      return;
    }
    setConfirmSide(side);
  };

  const submitTrade = async (side: TradeSide) => {
    setPendingSide(side);
    try {
      const escrowAmount = roundedAmountString(numericAmount);
      setMessage("Escrowing BUDOL to the Budol vault...");
      const escrowTx = await sendTransaction.mutateAsync(
        prepareContractCall({
          contract,
          method: "function transfer(address to, uint256 value)",
          params: [BUDOL_ESCROW_ADDRESS, toUnits(escrowAmount, BUDOL_TOKEN_DECIMALS)],
        }),
      );
      setMessage("Escrow submitted. Verifying on-chain transfer...");
      const result = await placeTrade(market.id, side, Number(escrowAmount), escrowTx.transactionHash);
      onPortfolioChange?.(result.portfolio);
      onMarketChange?.(result.market);
      onTradePlaced?.();
      void balance.refetch();
      setConfirmSide(null);
      setMessage(`Trade placed: ${result.trade.outcomeLabel} for ${formatToken(result.trade.amount)} BUDOL. Escrow ${shortHash(result.trade.escrowTxHash)} confirmed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to place trade.");
    } finally {
      setPendingSide(null);
    }
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
        <span>Available</span>
        <strong>{balance.isLoading ? "Checking" : `${formatToken(availableBalance)} ${balance.data?.symbol ?? BUDOL_TOKEN_SYMBOL}`}</strong>
      </div>
      <div className="buy-buttons">
        <button disabled={!tradeable || Boolean(pendingSide) || sendTransaction.isPending} onClick={() => requestTradeConfirmation("yes")}>
          Buy {market.outcomeA}
          <strong>{pendingSide === "yes" ? <LoaderCircle className="spin-icon" size={18} /> : `${quotes.yes?.averagePriceCents ?? market.yes}c`}</strong>
        </button>
        <button disabled={!tradeable || Boolean(pendingSide) || sendTransaction.isPending} onClick={() => requestTradeConfirmation("no")}>
          Buy {market.outcomeB}
          <strong>{pendingSide === "no" ? <LoaderCircle className="spin-icon" size={18} /> : `${quotes.no?.averagePriceCents ?? market.no}c`}</strong>
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
      {confirmSide ? (
        <OrderConfirmationModal
          availableBalance={availableBalance}
          isPending={pendingSide === confirmSide || sendTransaction.isPending}
          market={market}
          onClose={() => setConfirmSide(null)}
          onConfirm={() => void submitTrade(confirmSide)}
          quote={quotes[confirmSide]}
          side={confirmSide}
          stake={numericAmount}
        />
      ) : null}
    </div>
  );
}

function OrderConfirmationModal({
  availableBalance,
  isPending,
  market,
  onClose,
  onConfirm,
  quote,
  side,
  stake,
}: {
  availableBalance: number;
  isPending: boolean;
  market: Market;
  onClose: () => void;
  onConfirm: () => void;
  quote?: TradeQuote;
  side: TradeSide;
  stake: number;
}) {
  const outcome = side === "yes" ? market.outcomeA : market.outcomeB;
  const fallbackPrice = side === "yes" ? market.yes : market.no;
  const averagePrice = quote?.averagePriceCents ?? fallbackPrice;
  const payout = quote?.potentialPayout ?? potentialReturn(stake, fallbackPrice);
  return (
    <div className="order-confirm-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="order-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="order-confirm-title" onMouseDown={event => event.stopPropagation()}>
        <button className="order-confirm-close" aria-label="Close order confirmation" onClick={onClose}>
          <X size={20} />
        </button>
        <span className={`tag ${market.color}`}>{market.tag}</span>
        <h2 id="order-confirm-title">Confirm Buy {outcome}</h2>
        <p>{market.title}</p>
        <div className="order-confirm-grid">
          <ConfirmFact label="Stake" value={`${formatToken(stake)} BUDOL`} />
          <ConfirmFact label="Average price" value={`${averagePrice}c`} />
          <ConfirmFact label="Max payout" value={`${formatToken(payout)} BUDOL`} />
          <ConfirmFact label="Price impact" value={formatImpact(quote?.priceImpactCents)} />
          <ConfirmFact label="Balance" value={`${formatToken(availableBalance)} BUDOL`} />
          <ConfirmFact label="Escrow vault" value={shortHash(BUDOL_ESCROW_ADDRESS)} />
        </div>
        <div className="order-confirm-actions">
          <button className="ghost-button" disabled={isPending} onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={isPending} onClick={onConfirm}>
            {isPending ? <LoaderCircle className="spin-icon" size={18} /> : null}
            {isPending ? "Submitting" : "Confirm and escrow"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ConfirmFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function shortHash(hash: string) {
  if (!hash) {
    return "";
  }
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function roundedAmountString(value: number) {
  return value.toFixed(2);
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
