import { ArrowLeft, CalendarClock, Flag, MessageCircle, Newspaper, ShieldCheck, Star, TrendingUp } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { loadMarketActivity, loadMarketComments, loadMarketStats, loadPublicMarket, postMarketComment, reportMarketComment } from "../lib/api";
import { formatDate } from "../lib/format";
import { closesSoon, marketStateLabel } from "../lib/marketState";
import type { Market, MarketActivity, MarketComment, MarketStats, UserPortfolio } from "../types";
import { TradeTicketCard } from "./TradeTicketCard";

type MarketDetailPageProps = {
  accountAddress?: string;
  isLoggedIn: boolean;
  market: Market | null;
  onBack: () => void;
  onLoginClick: () => void;
  onMarketChange: (market: Market) => void;
  onPortfolioChange: (portfolio: UserPortfolio) => void;
  onToast: (message: string, detail?: string) => void;
  onWatchlistToggle: (slug: string) => void;
  slug: string;
  watchlisted: boolean;
};

type MarketDetailTab = "overview" | "activity" | "comments" | "rules" | "holders";

export function MarketDetailPage({ accountAddress, isLoggedIn, market, onBack, onLoginClick, onMarketChange, onPortfolioChange, onToast, onWatchlistToggle, slug, watchlisted }: MarketDetailPageProps) {
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
  const [activeTab, setActiveTab] = useState<MarketDetailTab>("overview");
  const [error, setError] = useState("");
  const [commentError, setCommentError] = useState("");
  const activeMarket = loadedMarket ?? market;
  const activeMarketState = activeMarket ? marketStateLabel(activeMarket) : "Open";
  const activeMarketClosingSoon = activeMarket ? closesSoon(activeMarket) : false;
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
    if (activeMarket?.commentsDisabled) {
      setCommentError("Comments are disabled for this market.");
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
    const reason = window.prompt("Why should Budol admins review this comment?", "Spam, abusive, or off-topic");
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

  return (
    <section className="market-detail-page">
      <div className="account-hero market-detail-hero">
        <button className="ghost-button account-back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          Back to markets
        </button>
        <div>
          <span className={`tag ${activeMarket.color}`}>{activeMarket.tag}</span>
          <span className={`market-state-chip detail-state ${activeMarketState.toLowerCase()}`}>{activeMarketState}</span>
          {activeMarketClosingSoon ? <span className="market-state-chip closing detail-state">Closing soon</span> : null}
          <h1>{activeMarket.title}</h1>
          <p>{activeMarket.region} / {activeMarket.callName} / {activeMarket.type.replaceAll("_", " ")}</p>
          <button className="watchlist-button" onClick={() => onWatchlistToggle(activeMarket.slug)}>
            <Star size={17} />
            {watchlisted ? "Watching" : "Watchlist"}
          </button>
        </div>
      </div>

      <div className="market-detail-layout">
        <div className="market-detail-main">
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
          <section className="panel detail-chart-card">
            <div className="panel-title">
              <TrendingUp size={19} />
              <h2>Price movement</h2>
            </div>
            <div className="detail-price-row">
              <span>{activeMarket.outcomeA}</span>
              <strong>{activeMarket.yes}c</strong>
              <span>{activeMarket.outcomeB}</span>
              <strong>{activeMarket.no}c</strong>
            </div>
            <div className="detail-chart" aria-hidden="true">
              {activeMarket.spark.map((point, index) => (
                <i key={`${activeMarket.id}-detail-${index}`} style={{ height: `${point}%` }} />
              ))}
            </div>
          </section>
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
                placeholder={isLoggedIn ? "Add a Marites note..." : "Log in to add a Marites note..."}
                disabled={activeMarket.commentsDisabled}
                value={commentDraft}
              />
              <button disabled={isPostingComment || activeMarket.commentsDisabled}>{activeMarket.commentsDisabled ? "Disabled" : isPostingComment ? "Posting..." : "Post"}</button>
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
            {!isActivityLoading && activity.length === 0 ? <div className="empty-state">No trades yet. First budol move is still open.</div> : null}
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
        </div>

        <aside className="market-detail-side">
          <TradeTicketCard
            accountAddress={accountAddress}
            isLoggedIn={isLoggedIn}
            market={activeMarket}
            onLoginClick={onLoginClick}
            onMarketChange={onMarketChange}
            onPortfolioChange={onPortfolioChange}
            onTradePlaced={() => {
              onToast("Trade placed. Portfolio updated.");
              reloadActivity();
              reloadStats();
            }}
          />
          <section className="panel detail-calendar-card">
            <div className="panel-title">
              <CalendarClock size={19} />
              <h2>Timing</h2>
            </div>
            <p>{activeMarket.endsAt ? `Trading view closes on ${displayDate(activeMarket.endsAt, "the configured end date")}.` : "This market stays open until an admin sets a close date."}</p>
          </section>
        </aside>
      </div>
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
      copy: market.resolutionSource || "Budol admins will use public, timestamped sources before resolving this market.",
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
