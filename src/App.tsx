import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeroPanel } from "./components/HeroPanel";
import { PrivacyPage, TermsPage } from "./components/LegalPages";
import { LoginModal } from "./components/LoginModal";
import { MarketBoard } from "./components/MarketBoard";
import { MarketDetailPage } from "./components/MarketDetailPage";
import { MyAccountPage } from "./components/MyAccountPage";
import { MyWalletPage } from "./components/MyWalletPage";
import { NotificationsPage } from "./components/NotificationsPage";
import { PortfolioPage } from "./components/PortfolioPage";
import { SiteFooter } from "./components/SiteFooter";
import { Topbar } from "./components/Topbar";
import { filters } from "./data/budol";
import { addWatchlist, loadCurrentUser, loadNotifications, loadPortfolio, loadPublicMarkets, loadTradeConfig, loadTradeQuote, loadWatchlist, logoutCurrentUser, markAllNotificationsRead, markNotificationRead, removeWatchlist } from "./lib/api";
import { sendBudolEscrowTransfer } from "./lib/erc20Transfer";
import { browserWalletForAddress } from "./lib/externalWallet";
import type { AccountNotification, BudolUser, Market, Theme, TradeSide, UserPortfolio } from "./types";

type AppRoute = "markets" | "account" | "wallet" | "portfolio" | "notifications" | "marketDetail" | "privacy" | "terms" | "logout";

const routePaths: Record<AppRoute, string> = {
  markets: "/markets",
  account: "/account",
  wallet: "/wallet",
  portfolio: "/portfolio",
  notifications: "/notifications",
  marketDetail: "/markets",
  privacy: "/privacy",
  terms: "/terms",
  logout: "/logout",
};

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
  const [searchQuery, setSearchQuery] = useState("");
  const [showClosingSoon, setShowClosingSoon] = useState(false);
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [toast, setToast] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>(() => JSON.parse(localStorage.getItem("budol-watchlist") || "[]") as string[]);
  const [accountNotifications, setAccountNotifications] = useState<AccountNotification[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("budol-account-notifications") || "[]") as AccountNotification[];
    } catch {
      return [];
    }
  });
  const isDark = theme === "dark";
  const accountAddress = budolUser?.walletAddress;

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
      setAccountNotifications(notifications);
      localStorage.setItem("budol-account-notifications", JSON.stringify(notifications));
    } catch {
      // Keep the local notification list if the API is temporarily unavailable.
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  const notify = (message: string, detail = message, syncFromServer = true) => {
    showToast(message);
    setAccountNotifications(current => {
      const next = [
        {
          id: crypto.randomUUID(),
          title: message,
          detail,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 12);
      localStorage.setItem("budol-account-notifications", JSON.stringify(next));
      return next;
    });
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
      localStorage.setItem("budol-account-notifications", JSON.stringify(next));
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
        localStorage.setItem("budol-account-notifications", JSON.stringify(next));
        return next;
      });
      if (budolUser && notification.userId) {
        void markNotificationRead(notification.id)
          .then(updatedNotification => {
            setAccountNotifications(current => {
              const next = current.map(item => (item.id === updatedNotification.id ? updatedNotification : item));
              localStorage.setItem("budol-account-notifications", JSON.stringify(next));
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
    const tradeConfig = await loadTradeConfig();
    const browserWallet = browserWalletForAddress(accountAddress);
    if (!browserWallet) {
      throw new Error("Self-custody trading requires an external wallet. Log out, then connect Trust Wallet, OKX Wallet, SubWallet, Phantom, or Talisman.");
    }
    return sendBudolEscrowTransfer({
      amount,
      config: tradeConfig,
      from: accountAddress,
      pollId,
      side,
      wallet: browserWallet,
    });
  }, [accountAddress]);

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
          if (user && isSelfCustodyUser(user)) {
            setBudolUser(user);
          } else {
            void logoutCurrentUser().catch(() => undefined);
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
      loadWatchlist()
        .then(items => {
          const slugs = items.map(item => item.slug);
          setWatchlist(slugs);
          localStorage.setItem("budol-watchlist", JSON.stringify(slugs));
        })
        .catch(() => undefined);
    } else if (!isAuthLoading) {
      setAccountNotifications([]);
      localStorage.setItem("budol-account-notifications", "[]");
    }
  }, [budolUser?.id, isAuthLoading]);

  useEffect(() => {
    if (!budolUser) return;
    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void refreshAccountNotifications();
      }
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [budolUser?.id]);

  return (
    <main className="app-shell">
      <Topbar
        activePage={route === "markets" || route === "marketDetail" ? "markets" : route === "portfolio" ? "portfolio" : undefined}
        accountAddress={accountAddress}
        isAuthLoading={isAuthLoading && !accountAddress}
        isDark={isDark}
        onAccountClick={() => navigate("account")}
        onLoginClick={() => setIsLoginOpen(true)}
        onLogout={async () => {
          navigate("logout");
        }}
        notifications={accountNotifications}
        onMarketsClick={() => navigate("markets")}
        onNotificationOpen={openNotification}
        onNotificationsReadAll={markNotificationsRead}
        onNotificationsPageClick={() => navigate("notifications")}
        onPortfolioClick={() => navigate("portfolio")}
        onSearchChange={setSearchQuery}
        onThemeToggle={() => applyTheme(isDark ? "light" : "dark")}
        onWalletClick={() => navigate("wallet")}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoggedIn={user => {
          if (!isSelfCustodyUser(user)) {
            void logoutCurrentUser().catch(() => undefined);
            setBudolUser(null);
            setIsAuthLoading(false);
            notify("External wallet required.", "This Horizen testnet build only supports self-custodial wallet login.", false);
            return;
          }
          setBudolUser(user);
          setIsAuthLoading(false);
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
          onBack={() => navigate("markets")}
          onLoginClick={() => setIsLoginOpen(true)}
          onMarketChange={updateMarket}
          onMarketOpen={slug => navigate("marketDetail", "push", slug)}
          onToast={notify}
          portfolio={userPortfolio}
          setPortfolio={setUserPortfolio}
        />
      ) : route === "notifications" ? (
        <NotificationsPage
          notifications={accountNotifications}
          onBack={() => navigate("markets")}
          onMarkRead={markNotificationsRead}
          onOpen={openNotification}
        />
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
          onLoginClick={() => setIsLoginOpen(true)}
          onMarketChange={updateMarket}
          onMarketOpen={slug => navigate("marketDetail", "push", slug)}
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
        onMarketsClick={() => navigate("markets")}
        onPortfolioClick={() => navigate("portfolio")}
        onPrivacyClick={() => navigate("privacy")}
        onTermsClick={() => navigate("terms")}
        onWalletClick={() => navigate("wallet")}
      />
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

function isSelfCustodyUser(user: BudolUser) {
  return user.walletCustody === "external" || user.authProvider === "wallet" || user.authType === "wallet";
}

function formatToken(value: number) {
  return value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
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
