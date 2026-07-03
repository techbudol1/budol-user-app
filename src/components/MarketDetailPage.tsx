import { ArrowLeft, BellRing, CalendarClock, Flag, LoaderCircle, MessageCircle, Newspaper, ShieldCheck, Star, TrendingUp, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { deleteMarketAlert, loadMarketActivity, loadMarketAlert, loadMarketComments, loadMarketStats, loadPublicMarket, postMarketComment, reportMarketComment, saveMarketAlert } from "../lib/api";
import { formatDate } from "../lib/format";
import { closesSoon, marketStateLabel } from "../lib/marketState";
import type { Market, MarketActivity, MarketAlert, MarketComment, MarketStats, TradeSide, UserPortfolio } from "../types";
import { TradeTicketCard } from "./TradeTicketCard";

type MarketDetailPageProps = {
  accountAddress?: string;
  isLoggedIn: boolean;
  market: Market | null;
  markets: Market[];
  onBack: () => void;
  onEscrowTransfer?: (amount: string, pollId: string, side: TradeSide) => Promise<string>;
  onLoginClick: () => void;
  onMarketChange: (market: Market) => void;
  onMarketOpen: (slug: string) => void;
  onPortfolioChange: (portfolio: UserPortfolio) => void;
  onToast: (message: string, detail?: string) => void;
  onWatchlistToggle: (slug: string) => void;
  slug: string;
  watchlisted: boolean;
};

type MarketDetailTab = "overview" | "activity" | "comments" | "rules" | "holders";

export function MarketDetailPage({ accountAddress, isLoggedIn, market, markets, onBack, onEscrowTransfer, onLoginClick, onMarketChange, onMarketOpen, onPortfolioChange, onToast, onWatchlistToggle, slug, watchlisted }: MarketDetailPageProps) {
  const [loadedMarket, setLoadedMarket] = useState<Market | null>(market);
  const [activity, setActivity] = useState<MarketActivity[]>([]);
  const [comments, setComments] = useState<MarketComment[]>([]);
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [isLoading, setIsLoading] = useState(!market);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState("");
  const [marketAlert, setMarketAlert] = useState<MarketAlert | null>(null);
  const [alertDraft, setAlertDraft] = useState<MarketAlert | null>(null);
  const [alertError, setAlertError] = useState("");
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isSavingAlert, setIsSavingAlert] = useState(false);
  const [activeTab, setActiveTab] = useState<MarketDetailTab>("overview");
  const [error, setError] = useState("");
  const [commentError, setCommentError] = useState("");
  const activeMarket = loadedMarket ?? market;
  const activeMarketState = activeMarket ? marketStateLabel(activeMarket) : "Open";
  const activeMarketClosingSoon = activeMarket ? closesSoon(activeMarket) : false;
  const commentsReadOnly = activeMarketState !== "Open" || Boolean(activeMarket?.commentsDisabled);
  const groupChoices = useMemo(() => {
    const groupId = activeMarket?.marketGroupId?.trim();
    if (!groupId) {
      return [];
    }
    return markets
      .filter(item => item.marketGroupId === groupId)
      .sort((a, b) => (a.marketChoiceIndex ?? 0) - (b.marketChoiceIndex ?? 0));
  }, [activeMarket?.marketGroupId, markets]);
  const buzzItems = useMemo(() => marketBuzz(activeMarket), [activeMarket]);

  useEffect(() => {
    if (market?.slug === slug) {
      setLoadedMarket(market);
      return;
    }
    let isMounted = true;
    setIsLoading(true);
    setError("");
    loadPublicMarket(slug)
      .then(nextMarket => {
        if (isMounted) {
          setLoadedMarket(nextMarket);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load market.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [market, slug]);

  const reloadMarket = () => {
    loadPublicMarket(slug)
      .then(setLoadedMarket)
      .catch(() => {
        // Keep the current market visible if a background refresh misses.
      });
  };

  const reloadActivity = () => {
    setIsActivityLoading(true);
    loadMarketActivity(slug)
      .then(setActivity)
      .catch(() => setActivity([]))
      .finally(() => setIsActivityLoading(false));
  };

  const reloadComments = () => {
    setIsCommentsLoading(true);
    loadMarketComments(slug)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setIsCommentsLoading(false));
  };

  const reloadStats = () => {
    setIsStatsLoading(true);
    loadMarketStats(slug)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setIsStatsLoading(false));
  };

  useEffect(() => {
    reloadActivity();
    reloadComments();
    reloadStats();
  }, [slug]);

  useEffect(() => {
    if (!isLoggedIn) {
      setMarketAlert(null);
      return;
    }
    loadMarketAlert(slug)
      .then(setMarketAlert)
      .catch(() => setMarketAlert(null));
  }, [isLoggedIn, slug]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.hidden) {
        return;
      }
      reloadMarket();
      reloadActivity();
      reloadComments();
      reloadStats();
    }, 8000);
    return () => window.clearInterval(interval);
  }, [slug]);

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = commentDraft.trim();
    if (!body) {
      setCommentError("Write something first.");
      return;
    }
    if (commentsReadOnly) {
      setCommentError("Comments are read-only after a market closes.");
      return;
    }
    if (!isLoggedIn) {
      onLoginClick();
      return;
    }

    setIsPostingComment(true);
    setCommentError("");
    try {
      const comment = await postMarketComment(slug, body);
      setComments(current => [comment, ...current.filter(item => item.id !== comment.id)]);
      setCommentDraft("");
      onToast("Marites note posted.", "Your comment is now visible on this market.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to post comment.";
      setCommentError(message);
      if (message.toLowerCase().includes("log in")) {
        onLoginClick();
      }
    } finally {
      setIsPostingComment(false);
    }
  };

  const reportComment = async (comment: MarketComment) => {
    if (!isLoggedIn) {
      onLoginClick();
      return;
    }
    const reason = window.prompt("Why should BudolPH admins review this comment?", "Spam, abusive, or off-topic");
    if (reason === null) {
      return;
    }
    setReportingCommentId(comment.id);
    setCommentError("");
    try {
      const updated = await reportMarketComment(comment.id, reason);
      setComments(current => current.map(item => (item.id === updated.id ? updated : item)));
      onToast("Comment reported.", "Admins can review it in the dashboard.");
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Unable to report comment.");
    } finally {
      setReportingCommentId("");
    }
  };

  const openAlertSettings = () => {
    if (!isLoggedIn) {
      onLoginClick();
      return;
    }
    setAlertError("");
    setAlertDraft(marketAlert?.enabled ? marketAlert : {
      slug,
      enabled: false,
      priceEnabled: activeMarketState === "Open",
      priceDirection: "above",
      priceThreshold: activeMarket?.yes ?? 50,
      closingEnabled: activeMarketState === "Open",
      resolutionEnabled: true,
    });
    setIsAlertOpen(true);
  };

  const persistAlert = async () => {
    if (!alertDraft) return;
    setIsSavingAlert(true);
    setAlertError("");
    try {
      const saved = await saveMarketAlert(slug, alertDraft);
      setMarketAlert(saved);
      setIsAlertOpen(false);
      onToast("Market alerts saved.", "BudolPH will notify you when your selected conditions are met.");
    } catch (err) {
      setAlertError(err instanceof Error ? err.message : "Unable to save market alerts.");
    } finally {
      setIsSavingAlert(false);
    }
  };

  const disableAlert = async () => {
    setIsSavingAlert(true);
    setAlertError("");
    try {
      await deleteMarketAlert(slug);
      setMarketAlert(null);
      setIsAlertOpen(false);
      onToast("Market alerts disabled.");
    } catch (err) {
      setAlertError(err instanceof Error ? err.message : "Unable to disable market alerts.");
    } finally {
      setIsSavingAlert(false);
    }
  };

  if (isLoading && !activeMarket) {
    return <div className="empty-state detail-loading">Loading market...</div>;
  }

  if (!activeMarket) {
    return (
      <section className="simple-page">
        <h1>Market not found</h1>
        <p>{error || "This poll is not public or has already closed."}</p>
        <button className="primary-button" onClick={onBack}>
          Back to markets
        </button>
      </section>
    );
  }

  const chart = sparklineGeometry(activeMarket.spark);

  return (
    <section className="market-detail-page">
      <button className="market-detail-back" onClick={onBack}>
        <ArrowLeft size={17} />
        Markets
      </button>

      <div className="market-detail-shell">
        <main className="market-detail-main">
          <header className="market-detail-header">
            <div className="market-detail-heading">
              <span className={`market-detail-category-icon ${activeMarket.color}`}>
                <TrendingUp size={24} />
              </span>
              <div>
                <div className="market-detail-labels">
                  <span className={`tag ${activeMarket.color}`}>{activeMarket.tag}</span>
                  <span className="region">{activeMarket.region}</span>
                  <span className={`market-state-chip ${activeMarketState.toLowerCase()}`}>{activeMarketState}</span>
                  {activeMarketClosingSoon ? <span className="market-state-chip closing">Closing soon</span> : null}
                </div>
                <h1>{activeMarket.title}</h1>
              </div>
            </div>

            <div className="market-detail-actions">
              <span>
                <CalendarClock size={15} />
                {activeMarket.endsAt
                  ? `${activeMarketState === "Closed" || activeMarketState === "Resolved" || activeMarketState === "Cancelled" ? "Closed" : "Closes"} ${displayDate(activeMarket.endsAt, "on schedule")}`
                  : "No close date"}
              </span>
              <button className={watchlisted ? "watchlist-button active" : "watchlist-button"} onClick={() => onWatchlistToggle(activeMarket.slug)}>
                <Star size={16} fill={watchlisted ? "currentColor" : "none"} />
                {watchlisted ? "Watching" : "Watchlist"}
              </button>
              <button className={marketAlert?.enabled ? "watchlist-button active" : "watchlist-button"} onClick={openAlertSettings}>
                <BellRing size={16} />
                {marketAlert?.enabled ? "Alerts on" : "Alerts"}
              </button>
            </div>

            <div className="market-detail-quote-strip">
              <div>
                <span>{activeMarket.outcomeA}</span>
                <strong>{activeMarket.yes}¢</strong>
              </div>
              <div>
                <span>{activeMarket.outcomeB}</span>
                <strong>{activeMarket.no}¢</strong>
              </div>
              <span>
                {activeMarket.volume} volume
                <small>{activeMarket.callName} · {activeMarket.type.replaceAll("_", " ")}</small>
              </span>
            </div>
          </header>

          <div className="market-detail-tabs" role="tablist" aria-label="Market detail sections">
            {(["overview", "activity", "comments", "rules", "holders"] satisfies MarketDetailTab[]).map(tab => (
              <button className={activeTab === tab ? "active" : ""} key={tab} onClick={() => setActiveTab(tab)} role="tab" aria-selected={activeTab === tab}>
                {tab === "holders" ? "Holders" : titleCase(tab)}
                {tab === "comments" && comments.length > 0 ? <span>{comments.length}</span> : null}
                {tab === "activity" && activity.length > 0 ? <span>{activity.length}</span> : null}
              </button>
            ))}
          </div>

          {activeTab === "overview" ? (
          <>
            {groupChoices.length > 1 ? (
              <section className="panel multi-choice-detail-card">
                <div className="panel-title">
                  <TrendingUp size={19} />
                  <h2>{activeMarket.marketGroupTitle || "Choices"}</h2>
                </div>
                <div className="choice-market-list detail-choice-list">
                  {groupChoices.map(choice => (
                    <button
                      className={choice.id === activeMarket.id ? "active" : ""}
                      key={choice.id}
                      type="button"
                      onClick={() => onMarketOpen(choice.slug)}
                    >
                      <span>{choice.marketChoiceLabel || choice.title}</span>
                      <strong>Yes {choice.yes}c</strong>
                      <small>No {choice.no}c</small>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
            <section className="panel detail-chart-card">
              <div className="panel-title">
                <TrendingUp size={19} />
                <h2>Price movement</h2>
              </div>
              <div className="detail-price-row">
                <span>{activeMarket.outcomeA} probability</span>
                <strong>{activeMarket.yes}%</strong>
                <span>{activeMarket.outcomeB}</span>
                <strong>{activeMarket.no}%</strong>
              </div>
              <div className="detail-chart" aria-hidden="true">
                <svg viewBox="0 0 100 44" preserveAspectRatio="none">
                  <polygon points={chart.area} />
                  <polyline points={chart.line} />
                </svg>
              </div>
            </section>
          </>
          ) : null}

          {activeTab === "rules" ? (
          <section className="panel detail-rules-card">
            <div className="panel-title">
              <ShieldCheck size={19} />
              <h2>Rules and resolution</h2>
            </div>
            <div className="detail-rule-grid">
              <DetailFact label="Resolution source" value={activeMarket.resolutionSource || "Admin-reviewed public sources"} />
              <DetailFact label="Evidence URL" value={activeMarket.resolutionEvidenceUrl || "Not posted yet"} />
              <DetailFact label="Resolved by" value={activeMarket.resolvedBy || "Pending"} />
              <DetailFact label="Start date" value={displayDate(activeMarket.startsAt, "Live now")} />
              <DetailFact label="End date" value={displayDate(activeMarket.endsAt, "No end date set")} />
              <DetailFact label="Volume" value={activeMarket.volume} />
            </div>
          </section>
          ) : null}

          {activeTab === "holders" ? (
          <section className="panel detail-rules-card">
            <div className="panel-title">
              <TrendingUp size={19} />
              <h2>Market depth</h2>
            </div>
            {isStatsLoading ? <div className="empty-state">Loading depth...</div> : null}
            <div className="detail-rule-grid">
              <DetailFact label="Open interest" value={`${formatToken(stats?.openInterest ?? 0)} BUDOL`} />
              <DetailFact label="Holders" value={`${stats?.holderCount ?? 0} total / ${stats?.yesHolderCount ?? 0} ${activeMarket.outcomeA} / ${stats?.noHolderCount ?? 0} ${activeMarket.outcomeB}`} />
              <DetailFact label={`${activeMarket.outcomeA} shares`} value={formatToken(stats?.yesShares ?? activeMarket.yesShares)} />
              <DetailFact label={`${activeMarket.outcomeB} shares`} value={formatToken(stats?.noShares ?? activeMarket.noShares)} />
              <DetailFact label="AMM liquidity" value={`${formatToken(stats?.liquidity ?? activeMarket.liquidity)} BUDOL`} />
              <DetailFact label="Trades" value={`${stats?.tradeCount ?? 0} open trades`} />
            </div>
          </section>
          ) : null}

          {activeTab === "comments" ? (
          <section className="panel detail-feed-card">
            <div className="panel-title">
              <MessageCircle size={19} />
              <h2>Market chatter</h2>
            </div>
            {buzzItems.map(item => (
              <div className="detail-feed-item" key={item.title}>
                <Newspaper size={17} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.copy}</small>
                </span>
              </div>
            ))}
            <div className="market-comment-list" aria-label="Market comments">
              {isCommentsLoading ? <div className="empty-state">Loading notes...</div> : null}
              {!isCommentsLoading && comments.length === 0 ? <div className="empty-state">No Marites notes yet.</div> : null}
              {comments.map(comment => (
                <div className="detail-feed-item market-comment-item" key={comment.id}>
                  <MessageCircle size={17} />
                  <span>
                    <strong>{comment.actor}</strong>
                    <small>{comment.body}</small>
                  </span>
                  <em>{formatDate(comment.createdAt)}</em>
                  <button
                    className="comment-report-button"
                    disabled={reportingCommentId === comment.id}
                    onClick={() => void reportComment(comment)}
                    type="button"
                  >
                    <Flag size={14} />
                    {reportingCommentId === comment.id ? "Reporting" : "Report"}
                  </button>
                </div>
              ))}
            </div>
            <form className="comment-box" onSubmit={submitComment}>
              <input
                maxLength={240}
                onChange={event => {
                  setCommentDraft(event.currentTarget.value);
                  setCommentError("");
                }}
                placeholder={commentsReadOnly ? "Comments are read-only for this market." : isLoggedIn ? "Add a Marites note..." : "Log in to add a Marites note..."}
                disabled={commentsReadOnly}
                value={commentDraft}
              />
              <button disabled={isPostingComment || commentsReadOnly}>{commentsReadOnly ? "Read only" : isPostingComment ? "Posting..." : "Post"}</button>
              {commentError ? <small className="comment-error">{commentError}</small> : null}
            </form>
          </section>
          ) : null}

          {activeTab === "activity" ? (
          <section className="panel detail-feed-card">
            <div className="panel-title">
              <TrendingUp size={19} />
              <h2>Market activity</h2>
            </div>
            {isActivityLoading ? <div className="empty-state">Loading activity...</div> : null}
            {!isActivityLoading && activity.length === 0 ? <div className="empty-state">No trades yet. The first market move is still open.</div> : null}
            {activity.map(item => (
              <div className="detail-feed-item market-activity-item" key={item.id}>
                <Newspaper size={17} />
                <span>
                  <strong>{activityTitle(item)}</strong>
                  <small>{activityCopy(item)}</small>
                </span>
                <em>{formatDate(item.createdAt)}</em>
              </div>
            ))}
          </section>
          ) : null}
        </main>

        <aside className="market-detail-ticket">
          <TradeTicketCard
            accountAddress={accountAddress}
            isLoggedIn={isLoggedIn}
            market={activeMarket}
            onEscrowTransfer={onEscrowTransfer}
            onLoginClick={onLoginClick}
            onMarketChange={onMarketChange}
            onPortfolioChange={onPortfolioChange}
            onTradePlaced={() => {
              onToast("Trade placed. Portfolio updated.");
              reloadActivity();
              reloadStats();
            }}
          />
        </aside>
      </div>
      {isAlertOpen && alertDraft ? (
        <div className="market-alert-backdrop" role="presentation" onMouseDown={() => setIsAlertOpen(false)}>
          <section className="market-alert-modal" role="dialog" aria-modal="true" aria-label="Market alerts" onMouseDown={event => event.stopPropagation()}>
            <header>
              <div>
                <span className="eyebrow">Notifications</span>
                <h2>Market alerts</h2>
                <p>{activeMarket.title}</p>
              </div>
              <button aria-label="Close alerts" onClick={() => setIsAlertOpen(false)}><X size={18} /></button>
            </header>
            <label className="market-alert-toggle">
              <span><strong>Price threshold</strong><small>Notify when the Yes price crosses your target.</small></span>
              <input
                checked={alertDraft.priceEnabled}
                disabled={activeMarketState !== "Open"}
                onChange={event => setAlertDraft(current => current ? { ...current, priceEnabled: event.target.checked } : current)}
                type="checkbox"
              />
            </label>
            {alertDraft.priceEnabled ? (
              <div className="market-alert-price-row">
                <select
                  value={alertDraft.priceDirection}
                  onChange={event => setAlertDraft(current => current ? { ...current, priceDirection: event.target.value as "above" | "below" } : current)}
                >
                  <option value="above">Yes rises to</option>
                  <option value="below">Yes falls to</option>
                </select>
                <label>
                  <input
                    inputMode="numeric"
                    max={99}
                    min={1}
                    onChange={event => setAlertDraft(current => current ? { ...current, priceThreshold: Number(event.target.value) } : current)}
                    type="number"
                    value={alertDraft.priceThreshold}
                  />
                  <span>¢</span>
                </label>
              </div>
            ) : null}
            <label className="market-alert-toggle">
              <span><strong>Closing reminder</strong><small>Notify once when fewer than 24 hours remain.</small></span>
              <input
                checked={alertDraft.closingEnabled}
                disabled={activeMarketState !== "Open"}
                onChange={event => setAlertDraft(current => current ? { ...current, closingEnabled: event.target.checked } : current)}
                type="checkbox"
              />
            </label>
            <label className="market-alert-toggle">
              <span><strong>Resolution</strong><small>Notify when the market is resolved or cancelled.</small></span>
              <input
                checked={alertDraft.resolutionEnabled}
                onChange={event => setAlertDraft(current => current ? { ...current, resolutionEnabled: event.target.checked } : current)}
                type="checkbox"
              />
            </label>
            {alertError ? <p className="comment-error">{alertError}</p> : null}
            <footer>
              {marketAlert?.enabled ? <button className="ghost-button market-alert-disable" disabled={isSavingAlert} onClick={() => void disableAlert()}>Disable alerts</button> : <span />}
              <button
                className="primary-button"
                disabled={isSavingAlert || (!alertDraft.priceEnabled && !alertDraft.closingEnabled && !alertDraft.resolutionEnabled)}
                onClick={() => void persistAlert()}
              >
                {isSavingAlert ? <LoaderCircle className="spin-icon" size={17} /> : <BellRing size={17} />}
                {isSavingAlert ? "Saving" : "Save alerts"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="account-detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function marketBuzz(market: Market | null) {
  if (!market) {
    return [];
  }
  return [
    {
      title: "Barangay buzz",
      copy: `${market.region || "National"} watchers are leaning ${market.yes >= 50 ? market.outcomeA : market.outcomeB.toLowerCase()} today.`,
    },
    {
      title: "Price signal",
      copy: `${market.outcomeA} moved to ${market.yes}c with ${market.volume} in displayed volume.`,
    },
    {
      title: "Resolution watch",
      copy: market.resolutionSource || "BudolPH admins will use public, timestamped sources before resolving this market.",
    },
  ];
}

function displayDate(value: string, fallback: string) {
  return value ? formatDate(value) : fallback;
}

function activityTitle(item: MarketActivity) {
  if (item.kind === "cashout") {
    return `${item.actor} cashed out ${item.outcomeLabel}`;
  }
  if (item.kind === "settlement") {
    return `${item.actor} ${item.status === "won" ? "won" : item.status === "lost" ? "lost" : "settled"} ${item.outcomeLabel}`;
  }
  return `${item.actor} bought ${item.outcomeLabel}`;
}

function activityCopy(item: MarketActivity) {
  if (item.kind === "cashout") {
    return `${formatToken(item.payout)} BUDOL paid back / impact ${formatImpact(item.priceImpactCents)}`;
  }
  if (item.kind === "settlement") {
    return `${item.status} / payout ${formatToken(item.payout)} BUDOL`;
  }
  return `${formatToken(item.amount)} BUDOL at ${item.priceCents}c / impact ${formatImpact(item.priceImpactCents)}`;
}

function formatImpact(value: number) {
  return `${value >= 0 ? "+" : ""}${value}c`;
}

function formatToken(value: number) {
  return value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sparklineGeometry(points: number[]) {
  const normalized = points.length > 1 ? points : [50, 50];
  const line = normalized.map((point, index) => {
    const x = (index / (normalized.length - 1)) * 100;
    const y = 40 - (Math.max(0, Math.min(point, 100)) / 100) * 34;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return {
    area: `0,44 ${line.join(" ")} 100,44`,
    line: line.join(" "),
  };
}
