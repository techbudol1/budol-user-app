import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeroPanel } from "./components/HeroPanel";
import { FeedbackPage } from "./components/FeedbackPage";
import { HowToPage, PrivacyPage, TermsPage } from "./components/LegalPages";
import { LoginModal } from "./components/LoginModal";
import { MarketBoard } from "./components/MarketBoard";
import { MarketDetailPage } from "./components/MarketDetailPage";
import { MetricsPage } from "./components/MetricsPage";
import { MyAccountPage } from "./components/MyAccountPage";
import { MyWalletPage } from "./components/MyWalletPage";
import { NotificationsPage } from "./components/NotificationsPage";
import { PortfolioPage } from "./components/PortfolioPage";
import { SiteFooter } from "./components/SiteFooter";
import { Topbar } from "./components/Topbar";
import { filters } from "./data/budol";
import { addWatchlist, createGaslessTradeEscrow, createManagedTradeEscrow, loadCurrentUser, loadNotifications, loadPortfolio, loadPrivacyAccessConfig, loadPublicMarkets, loadTradeConfig, loadTradeQuote, loadWalletBalances, loadWatchlist, logoutCurrentUser, markAllNotificationsRead, markNotificationRead, removeWatchlist } from "./lib/api";
import { sendBudolEscrowTransfer, sendERC20PrivacyFee, sendNativePrivacyFee, signBudolPermit } from "./lib/erc20Transfer";
import { browserWalletForAddress } from "./lib/externalWallet";
import { placeShieldedTrade } from "./lib/shieldedTrades";
import { recordPilotEvent } from "./lib/pilot";
import type { AccountNotification, BudolUser, Market, Theme, TradeSide, UserPortfolio, WalletBalance } from "./types";

type AppRoute = "markets" | "account" | "wallet" | "portfolio" | "notifications" | "marketDetail" | "howTo" | "metrics" | "feedback" | "privacy" | "terms" | "logout";

const routePaths: Record<AppRoute, string> = {
  markets: "/markets",
  account: "/account",
  wallet: "/wallet",
  portfolio: "/portfolio",
  notifications: "/notifications",
  marketDetail: "/markets",
  howTo: "/how-to",
  metrics: "/metrics",
  feedback: "/feedback",
  privacy: "/privacy",
  terms: "/terms",
  logout: "/logout",
};

const LEGACY_NOTIFICATION_STORAGE_KEY = "budol-account-notifications";
const NOTIFICATION_STORAGE_KEY = "budol-account-notifications-v2";
const NOTIFICATION_LIMIT = 100;

function routeFromPath(pathname: string): { route: AppRoute; marketSlug: string } {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  if (normalizedPath === "/account" || normalizedPath === "/my-account") {
    return { route: "account", marketSlug: "" };
  }
  if (normalizedPath === "/wallet" || normalizedPath === "/my-wallet") {
    return { route: "wallet", marketSlug: "" };
  }
  if (normalizedPath === "/portfolio") {
    return { route: "portfolio", marketSlug: "" };
  }
  if (normalizedPath === "/notifications") {
    return { route: "notifications", marketSlug: "" };
  }
  if (normalizedPath === "/how-to" || normalizedPath === "/how") {
    return { route: "howTo", marketSlug: "" };
  }
  if (normalizedPath === "/metrics" || normalizedPath === "/stats") {
    return { route: "metrics", marketSlug: "" };
  }
  if (normalizedPath === "/feedback") {
    return { route: "feedback", marketSlug: "" };
  }
  if (normalizedPath === "/privacy") {
    return { route: "privacy", marketSlug: "" };
  }
  if (normalizedPath === "/terms") {
    return { route: "terms", marketSlug: "" };
  }
  if (normalizedPath.startsWith("/markets/")) {
    return { route: "marketDetail", marketSlug: decodeURIComponent(normalizedPath.replace("/markets/", "")) };
  }
  if (normalizedPath === "/logout") {
    return { route: "logout", marketSlug: "" };
  }
  return { route: "markets", marketSlug: "" };
}

function notificationTimestamp(notification: AccountNotification) {
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(notification.createdAt) ? `${notification.createdAt}Z` : notification.createdAt;
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortNotifications(notifications: AccountNotification[]) {
  return [...notifications].sort((left, right) => notificationTimestamp(right) - notificationTimestamp(left));
}

function saveAccountNotifications(notifications: AccountNotification[]) {
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
}

function normalizeServerNotifications(incoming: AccountNotification[], current: AccountNotification[] = []) {
  const localReadById = new Map(current.map(notification => [notification.id, notification.readAt || ""]));
  const deduped = new Map<string, AccountNotification>();
  for (const notification of incoming) {
    deduped.set(notification.id, {
      ...notification,
      readAt: localReadById.get(notification.id) || notification.readAt,
    });
  }
  return sortNotifications(Array.from(deduped.values())).slice(0, NOTIFICATION_LIMIT);
}

function mergeServerNotificationUpdate(current: AccountNotification[], incoming: AccountNotification) {
  const next = current.map(notification => (
    notification.id === incoming.id
      ? { ...notification, ...incoming, readAt: notification.readAt || incoming.readAt }
      : notification
  ));
  return sortNotifications(next).slice(0, NOTIFICATION_LIMIT);
}

export default function App() {
  const logoutRouteHandled = useRef(false);
  const [activeFilter, setActiveFilter] = useState("Trending");
  const [marketList, setMarketList] = useState<Market[]>([]);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [budolUser, setBudolUser] = useState<BudolUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const initialRoute = routeFromPath(window.location.pathname);
  const [route, setRoute] = useState<AppRoute>(initialRoute.route);
  const [marketSlug, setMarketSlug] = useState(initialRoute.marketSlug);
  const [userPortfolio, setUserPortfolio] = useState<UserPortfolio | null>(null);
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [isWalletBalanceLoading, setIsWalletBalanceLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showClosingSoon, setShowClosingSoon] = useState(false);
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [toast, setToast] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>(() => JSON.parse(localStorage.getItem("budol-watchlist") || "[]") as string[]);
  const [accountNotifications, setAccountNotifications] = useState<AccountNotification[]>(() => {
    try {
      return sortNotifications(JSON.parse(localStorage.getItem(NOTIFICATION_STORAGE_KEY) || "[]") as AccountNotification[]);
    } catch {
      return [];
    }
  });
  const isDark = theme === "dark";
  const accountAddress = budolUser?.walletAddress;

  useEffect(() => { void recordPilotEvent("pilot_started"); }, []);
  useEffect(() => { if (accountAddress) void recordPilotEvent("wallet_connected"); }, [accountAddress]);

  const filtersWithTrending = useMemo(() => ["Trending", ...Array.from(new Set(marketList.map(market => market.tag)))], [marketList]);
  const visibleMarkets = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return marketList.filter(market => {
      const categoryMatches = activeFilter === "Trending" || market.tag === activeFilter;
      const queryMatches = !normalizedQuery || `${market.title} ${market.marketGroupTitle ?? ""} ${market.marketChoiceLabel ?? ""} ${market.region} ${market.tag} ${market.type}`.toLowerCase().includes(normalizedQuery);
      const closingMatches = !showClosingSoon || isClosingSoon(market.endsAt);
      const watchlistMatches = !showWatchlistOnly || watchlist.includes(market.slug);
      return categoryMatches && queryMatches && closingMatches && watchlistMatches;
    });
  }, [activeFilter, marketList, searchQuery, showClosingSoon, showWatchlistOnly, watchlist]);
  const applyTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("budol-theme", nextTheme);
  };

  const refreshAccountNotifications = async () => {
    try {
      const notifications = await loadNotifications();
      setAccountNotifications(current => {
        const next = normalizeServerNotifications(notifications, current);
        saveAccountNotifications(next);
        return next;
      });
    } catch {
      // Keep the local notification list if the API is temporarily unavailable.
    }
  };

  const refreshWalletBalances = useCallback(async (options: { forceRefresh?: boolean } = {}) => {
    if (!budolUser) {
      setWalletBalances([]);
      return;
    }
    setIsWalletBalanceLoading(true);
    try {
      const balances = await loadWalletBalances(options);
      setWalletBalances(balances);
    } catch {
      // Keep the last known balances if the RPC/API is temporarily slow.
    } finally {
      setIsWalletBalanceLoading(false);
    }
  }, [budolUser?.id]);

  const refreshPortfolio = async () => {
    try {
      const nextPortfolio = await loadPortfolio();
      setUserPortfolio(nextPortfolio);
      recordPortfolioSettlements(nextPortfolio);
    } catch {
      setUserPortfolio(null);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  const notify = (message: string, detail = message, syncFromServer = true) => {
    showToast(message);
    if (syncFromServer && budolUser) {
      window.setTimeout(() => {
        void refreshAccountNotifications();
      }, 450);
    }
  };

  const markNotificationsRead = async () => {
    setAccountNotifications(current => {
      const now = new Date().toISOString();
      const next = current.map(notification => ({ ...notification, readAt: notification.readAt || now }));
      saveAccountNotifications(next);
      return next;
    });
    try {
      await markAllNotificationsRead();
      await refreshAccountNotifications();
    } catch {
      // The optimistic read state is enough until the next refresh succeeds.
    }
  };

  const toggleWatchlist = (slug: string) => {
    const isWatching = watchlist.includes(slug);
    const optimistic = isWatching ? watchlist.filter(item => item !== slug) : [...watchlist, slug];
    setWatchlist(optimistic);
    localStorage.setItem("budol-watchlist", JSON.stringify(optimistic));
    notify(isWatching ? "Removed from watchlist." : "Added to watchlist.", isWatching ? "This market was removed from your alerts." : "You will get alerts when this market moves.", false);
    if (!budolUser) {
      return;
    }
    const update = isWatching ? removeWatchlist(slug) : addWatchlist(slug);
    update
      .then(items => {
        const slugs = items.map(item => item.slug);
        setWatchlist(slugs);
        localStorage.setItem("budol-watchlist", JSON.stringify(slugs));
        void refreshAccountNotifications();
      })
      .catch(() => {
        setWatchlist(watchlist);
        localStorage.setItem("budol-watchlist", JSON.stringify(watchlist));
        notify("Watchlist sync failed.", "Your browser watchlist was restored. Log in and try again.", false);
      });
  };

  const openNotificationLink = (link?: string) => {
    if (!link) {
      return;
    }
    if (/^https?:\/\//i.test(link)) {
      window.open(link, "_blank", "noopener,noreferrer");
      return;
    }
    const next = routeFromPath(link);
    navigate(next.route, "push", next.marketSlug);
  };

  const openNotification = (notification: AccountNotification) => {
    if (!notification.readAt) {
      const readAt = new Date().toISOString();
      setAccountNotifications(current => {
        const next = current.map(item => (item.id === notification.id ? { ...item, readAt } : item));
        saveAccountNotifications(next);
        return next;
      });
      if (budolUser && notification.userId) {
        void markNotificationRead(notification.id)
          .then(updatedNotification => {
            setAccountNotifications(current => {
              const next = mergeServerNotificationUpdate(current, updatedNotification);
              saveAccountNotifications(next);
              return next;
            });
          })
          .catch(() => undefined);
      }
    }
    openNotificationLink(notification.link);
  };

  const updateMarket = (nextMarket: Market) => {
    setMarketList(current => current.map(market => (market.id === nextMarket.id ? nextMarket : market)));
  };

  const sendEscrowTransfer = useCallback(async (amount: string, pollId: string, side: TradeSide) => {
    if (!accountAddress) {
      throw new Error("Wallet is not ready. Reconnect and try again.");
    }
    await loadTradeQuote(pollId, side, Number(amount));
    if (budolUser?.walletCustody === "managed") {
      const managedEscrow = await createManagedTradeEscrow(pollId, side, amount);
      return {
        txHash: managedEscrow.escrowTxHash,
      };
    }
    const tradeConfig = await loadTradeConfig();
    const browserWallet = browserWalletForAddress(accountAddress);
    if (!browserWallet) {
      throw new Error("Self-custody trading requires an external wallet. Log out, then connect Trust Wallet, OKX Wallet, SubWallet, Phantom, or Talisman.");
    }
    const escrowAmount = escrowAmountWithTradingFee(amount, tradeConfig.tradingFeeBps);
    if (tradeConfig.engineGasFreeEnabled && tradeConfig.gaslessSpenderAddress) {
      const permit = await signBudolPermit({
        amount: escrowAmount,
        config: tradeConfig,
        owner: accountAddress,
        spender: tradeConfig.gaslessSpenderAddress,
        wallet: browserWallet,
      });
      const gaslessEscrow = await createGaslessTradeEscrow(pollId, side, amount, permit);
      return {
        fromAddress: accountAddress,
        txHash: gaslessEscrow.escrowTxHash,
      };
    }
    return sendBudolEscrowTransfer({
      amount: escrowAmount,
      config: tradeConfig,
      from: accountAddress,
      pollId,
      side,
      wallet: browserWallet,
    });
  }, [accountAddress, budolUser?.walletCustody]);

	const sendShieldedTrade = useCallback(async (amount: number, pollId: string, side: TradeSide) => {
		if (!accountAddress) throw new Error("Reconnect your wallet before placing a private trade.");
		if (budolUser?.walletCustody === "managed") throw new Error("Managed-wallet private deposits are not enabled in this testnet build. Connect a self-custody wallet.");
		const wallet = browserWalletForAddress(accountAddress);
		if (!wallet) throw new Error("Private trading requires a connected self-custody wallet.");
		await placeShieldedTrade({
			accountAddress, amount, pollId, side, wallet,
			getPrivacyReceiptTxHash: async () => {
				const config = await loadPrivacyAccessConfig();
				const amountRaw = config.fees.hide_position || "0";
				if (BigInt(amountRaw) === 0n) return "";
				if (config.mode === "erc20") {
					return sendERC20PrivacyFee({ amountRaw, chainId: config.chainId, collectorAddress: config.collectorAddress, from: accountAddress, tokenAddress: config.tokenAddress, wallet });
				}
				return sendNativePrivacyFee({ amountRaw, chainId: config.chainId, collectorAddress: config.collectorAddress, from: accountAddress, wallet });
			},
		});
	}, [accountAddress, budolUser?.walletCustody]);

  const recordPortfolioSettlements = (nextPortfolio: UserPortfolio | null) => {
    if (!nextPortfolio) {
      return;
    }
    const seenKey = "budol-seen-settlements";
    const seen = new Set(JSON.parse(localStorage.getItem(seenKey) || "[]") as string[]);
    const nextSeen = new Set(seen);
    nextPortfolio.trades
      .filter(trade => trade.status !== "open" && trade.settledAt)
      .forEach(trade => {
        if (seen.has(trade.id)) {
          return;
        }
        nextSeen.add(trade.id);
        if (trade.status === "won") {
          notify("Payout received.", `${trade.pollTitle}: ${formatToken(trade.settlementPayout)} BUDOL paid for ${trade.outcomeLabel}.`);
        } else if (trade.status === "cancelled") {
          notify("Market cancelled and refunded.", `${trade.pollTitle}: ${formatToken(trade.settlementPayout)} BUDOL returned.`);
        } else if (trade.status === "lost") {
          notify("Market resolved.", `${trade.pollTitle}: your ${trade.outcomeLabel} position did not win.`);
        }
      });
    localStorage.setItem(seenKey, JSON.stringify(Array.from(nextSeen).slice(-200)));
  };

  const navigate = (nextRoute: AppRoute, mode: "push" | "replace" = "push", nextMarketSlug = "") => {
    logoutRouteHandled.current = false;
    setRoute(nextRoute);
    setMarketSlug(nextMarketSlug);
    const nextPath = nextRoute === "marketDetail" ? `/markets/${encodeURIComponent(nextMarketSlug)}` : routePaths[nextRoute];
    if (window.location.pathname !== nextPath) {
      window.history[mode === "replace" ? "replaceState" : "pushState"]({ route: nextRoute }, "", nextPath);
    }
  };

  const logout = async () => {
    try {
      await logoutCurrentUser();
    } catch {
      // Local state is cleared even if the server session is unavailable.
    }
    setBudolUser(null);
    setWalletBalances([]);
    notify("Logged out.", "Your BudolPH session ended on this browser.", false);
    navigate("markets", "replace");
  };

  useEffect(() => {
    document.title = "BudolPH | PH Politics Markets";
    const savedTheme = localStorage.getItem("budol-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(savedTheme === "dark" || savedTheme === "light" ? savedTheme : prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    let isMounted = true;

    loadCurrentUser()
      .then(user => {
        if (isMounted) {
          if (user) {
            setBudolUser(user);
          } else {
            setBudolUser(null);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setBudolUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      });

    loadPublicMarkets()
      .then(nextMarkets => {
        if (!isMounted) {
          return;
        }
        setMarketList(nextMarkets);
      })
      .catch(() => {
        if (isMounted) {
          setMarketList([]);
        }
      });

    loadPortfolio()
      .then(nextPortfolio => {
        if (isMounted) {
          setUserPortfolio(nextPortfolio);
          recordPortfolioSettlements(nextPortfolio);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUserPortfolio(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const initialRoute = routeFromPath(window.location.pathname);
    setRoute(initialRoute.route);
    setMarketSlug(initialRoute.marketSlug);
    const canonicalPath = initialRoute.route === "marketDetail" ? `/markets/${encodeURIComponent(initialRoute.marketSlug)}` : routePaths[initialRoute.route];
    if (window.location.pathname !== canonicalPath) {
      window.history.replaceState({ route: initialRoute.route }, "", canonicalPath);
    }

    const onPopState = () => {
      const nextRoute = routeFromPath(window.location.pathname);
      logoutRouteHandled.current = false;
      setRoute(nextRoute.route);
      setMarketSlug(nextRoute.marketSlug);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (accountAddress && isLoginOpen) {
      setIsLoginOpen(false);
    }
  }, [accountAddress, isLoginOpen]);

  useEffect(() => {
    if (route !== "logout" || isAuthLoading || logoutRouteHandled.current) {
      return;
    }
    logoutRouteHandled.current = true;
    void logout();
  }, [isAuthLoading, route]);

  useEffect(() => {
    if (budolUser) {
      void refreshAccountNotifications();
      void refreshPortfolio();
      void refreshWalletBalances();
      loadWatchlist()
        .then(items => {
          const slugs = items.map(item => item.slug);
          setWatchlist(slugs);
          localStorage.setItem("budol-watchlist", JSON.stringify(slugs));
        })
        .catch(() => undefined);
    } else if (!isAuthLoading) {
      setWalletBalances([]);
      setAccountNotifications([]);
      saveAccountNotifications([]);
      localStorage.removeItem(LEGACY_NOTIFICATION_STORAGE_KEY);
    }
  }, [budolUser?.id, isAuthLoading, refreshWalletBalances]);

  useEffect(() => {
    if (!budolUser) return;
    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void refreshAccountNotifications();
        void refreshWalletBalances();
      }
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [budolUser?.id, refreshWalletBalances]);

  return (
    <main className="app-shell">
      <Topbar
        activePage={route === "markets" || route === "marketDetail" ? "markets" : route === "portfolio" ? "portfolio" : route === "howTo" ? "howTo" : route === "metrics" ? "metrics" : undefined}
        accountAddress={accountAddress}
        isAuthLoading={isAuthLoading && !accountAddress}
        isDark={isDark}
        isWalletBalanceLoading={isWalletBalanceLoading}
        onAccountClick={() => navigate("account")}
        onHowToClick={() => navigate("howTo")}
        onLoginClick={() => setIsLoginOpen(true)}
        onLogout={async () => {
          navigate("logout");
        }}
        notifications={accountNotifications}
        onMarketsClick={() => navigate("markets")}
        onMetricsClick={() => navigate("metrics")}
        onNotificationOpen={openNotification}
        onNotificationsReadAll={markNotificationsRead}
        onNotificationsPageClick={() => navigate("notifications")}
        onPortfolioClick={() => navigate("portfolio")}
        onSearchChange={setSearchQuery}
        onThemeToggle={() => applyTheme(isDark ? "light" : "dark")}
        onWalletClick={() => navigate("wallet")}
        walletBalances={walletBalances}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoggedIn={user => {
          setBudolUser(user);
          setIsAuthLoading(false);
          void refreshPortfolio();
          void refreshWalletBalances({ forceRefresh: true });
          void refreshAccountNotifications();
          showToast("Login successful.");
        }}
      />
      {toast ? <div className="toast-notice">{toast}</div> : null}

      {route === "logout" ? (
        <section className="simple-page">
          <h1>Logging out</h1>
          <p>Ending your BudolPH session on this browser.</p>
        </section>
      ) : route === "account" ? (
        <MyAccountPage
          accountAddress={accountAddress}
          notifications={accountNotifications}
          onBack={() => navigate("markets")}
          onLogout={logout}
          onUserChange={setBudolUser}
          onWalletClick={() => navigate("wallet")}
          user={budolUser}
        />
      ) : route === "wallet" ? (
        <MyWalletPage
          accountAddress={accountAddress}
          isDark={isDark}
          onBack={() => navigate("markets")}
          onLoginClick={() => setIsLoginOpen(true)}
          user={budolUser}
        />
      ) : route === "portfolio" ? (
        <PortfolioPage
          accountAddress={accountAddress}
          onBack={() => navigate("markets")}
          onLoginClick={() => setIsLoginOpen(true)}
          onMarketChange={updateMarket}
          onMarketOpen={slug => navigate("marketDetail", "push", slug)}
          onToast={notify}
          portfolio={userPortfolio}
          setPortfolio={setUserPortfolio}
          walletCustody={budolUser?.walletCustody}
        />
      ) : route === "notifications" ? (
        <NotificationsPage
          notifications={accountNotifications}
          onBack={() => navigate("markets")}
          onMarkRead={markNotificationsRead}
          onOpen={openNotification}
        />
      ) : route === "howTo" ? (
        <HowToPage onBack={() => navigate("markets")} />
      ) : route === "metrics" ? (
        <MetricsPage onBack={() => navigate("markets")} />
      ) : route === "feedback" ? (
        <FeedbackPage onBack={() => navigate("markets")} />
      ) : route === "terms" ? (
        <TermsPage onBack={() => navigate("markets")} />
      ) : route === "privacy" ? (
        <PrivacyPage onBack={() => navigate("markets")} />
      ) : route === "marketDetail" ? (
        <MarketDetailPage
          accountAddress={accountAddress}
          isLoggedIn={Boolean(accountAddress)}
          market={marketList.find(market => market.slug === marketSlug) ?? null}
          markets={marketList}
          onBack={() => navigate("markets")}
          onEscrowTransfer={sendEscrowTransfer}
		  onShieldedTrade={sendShieldedTrade}
          onLoginClick={() => setIsLoginOpen(true)}
          onMarketChange={updateMarket}
          onMarketOpen={slug => navigate("marketDetail", "push", slug)}
          onTradePlaced={privacyMode => {
            void recordPilotEvent(privacyMode === "private" ? "private_trade_completed" : "public_trade_completed");
            void refreshWalletBalances({ forceRefresh: true });
          }}
          onPortfolioChange={setUserPortfolio}
          onToast={notify}
          onWatchlistToggle={toggleWatchlist}
          slug={marketSlug}
          watchlisted={watchlist.includes(marketSlug)}
        />
      ) : (
        <>
          <HeroPanel marketCount={marketList.length} />

          <section className="market-layout" id="markets">
            <MarketBoard
              activeFilter={activeFilter}
              filters={filtersWithTrending.length > 1 ? filtersWithTrending : filters}
              markets={visibleMarkets}
              onFilterChange={setActiveFilter}
              onMarketOpen={slug => navigate("marketDetail", "push", slug)}
              onClosingSoonToggle={() => setShowClosingSoon(value => !value)}
              showClosingSoon={showClosingSoon}
              onWatchlistFilterToggle={() => setShowWatchlistOnly(value => !value)}
              showWatchlistOnly={showWatchlistOnly}
            />

          </section>
        </>
      )}
      <SiteFooter
        onAccountClick={() => navigate("account")}
        onHowToClick={() => navigate("howTo")}
        onFeedbackClick={() => navigate("feedback")}
        onMarketsClick={() => navigate("markets")}
        onMetricsClick={() => navigate("metrics")}
        onPortfolioClick={() => navigate("portfolio")}
        onPrivacyClick={() => navigate("privacy")}
        onTermsClick={() => navigate("terms")}
        onWalletClick={() => navigate("wallet")}
      />
      {route !== "feedback" ? <button className="feedback-launcher" onClick={() => navigate("feedback")} type="button"><span>✦</span> Share feedback</button> : null}
    </main>
  );
}

function isClosingSoon(value: string) {
  if (!value) {
    return false;
  }
  const end = new Date(value).getTime();
  if (Number.isNaN(end)) {
    return false;
  }
  const now = Date.now();
  return end >= now && end <= now + 7 * 24 * 60 * 60 * 1000;
}

function formatToken(value: number) {
  return value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

function escrowAmountWithTradingFee(amount: string, feeBps?: number) {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return amount;
  }
  const normalizedFeeBps = Number.isFinite(feeBps) ? Math.max(0, Math.min(1000, Number(feeBps))) : 50;
  const total = Math.round((parsed + (parsed * normalizedFeeBps) / 10000) * 100) / 100;
  return total.toFixed(total % 1 === 0 ? 0 : 2);
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return "Something went wrong. Please try again.";
}
