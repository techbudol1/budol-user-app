import { useEffect, useMemo, useRef, useState } from "react";
import { useCreateWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { CrowdMoodCard } from "./components/CrowdMoodCard";
import { HeroPanel } from "./components/HeroPanel";
import { HotRegionsCard } from "./components/HotRegionsCard";
import { LoginModal } from "./components/LoginModal";
import { MarketBoard } from "./components/MarketBoard";
import { MarketDetailPage } from "./components/MarketDetailPage";
import { MyAccountPage } from "./components/MyAccountPage";
import { MyWalletPage } from "./components/MyWalletPage";
import { NotificationsPage } from "./components/NotificationsPage";
import { PortfolioCard } from "./components/PortfolioCard";
import { PortfolioPage } from "./components/PortfolioPage";
import { ProfileCard } from "./components/ProfileCard";
import { SignalsCard } from "./components/SignalsCard";
import { Topbar } from "./components/Topbar";
import { TradeTicketCard } from "./components/TradeTicketCard";
import { filters, headlines, markets, portfolio } from "./data/budol";
import { addWatchlist, loadCurrentUser, loadNotifications, loadPortfolio, loadPublicMarkets, loadWatchlist, loginWithPrivyToken, logoutCurrentUser, markAllNotificationsRead, removeWatchlist } from "./lib/api";
import type { AccountNotification, BudolUser, Market, Theme, UserPortfolio } from "./types";

type AppRoute = "markets" | "account" | "wallet" | "portfolio" | "notifications" | "marketDetail" | "logout";

const routePaths: Record<AppRoute, string> = {
  markets: "/",
  account: "/account",
  wallet: "/wallet",
  portfolio: "/portfolio",
  notifications: "/notifications",
  marketDetail: "/markets",
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
  if (normalizedPath.startsWith("/markets/")) {
    return { route: "marketDetail", marketSlug: decodeURIComponent(normalizedPath.replace("/markets/", "")) };
  }
  if (normalizedPath === "/logout") {
    return { route: "logout", marketSlug: "" };
  }
  return { route: "markets", marketSlug: "" };
}

export default function App() {
  const { authenticated, getAccessToken, logout: logoutPrivy, ready: privyReady, user: privyUser } = usePrivy();
  const { createWallet } = useCreateWallet();
  const { ready: walletsReady, wallets } = useWallets();
  const logoutRouteHandled = useRef(false);
  const privyWalletCreateStarted = useRef(false);
  const privySessionSyncKey = useRef("");
  const lastPrivyLoginNotice = useRef("");
  const [activeFilter, setActiveFilter] = useState("Trending");
  const [marketList, setMarketList] = useState<Market[]>(markets);
  const [selectedId, setSelectedId] = useState(markets[0].id);
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
  const privyWallet = useMemo(() => wallets.find(wallet => wallet.walletClientType === "privy") ?? wallets[0], [wallets]);
  const accountAddress = authenticated ? privyWallet?.address ?? walletAddressFromPrivyUser(privyUser) : undefined;

  const filtersWithTrending = useMemo(() => ["Trending", ...Array.from(new Set(marketList.map(market => market.tag)))], [marketList]);
  const selectedMarket = useMemo(
    () => marketList.find(market => market.id === selectedId) ?? marketList[0] ?? markets[0],
    [marketList, selectedId],
  );
  const visibleMarkets = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return marketList.filter(market => {
      const categoryMatches = activeFilter === "Trending" || market.tag === activeFilter;
      const queryMatches = !normalizedQuery || `${market.title} ${market.region} ${market.tag} ${market.type}`.toLowerCase().includes(normalizedQuery);
      const closingMatches = !showClosingSoon || isClosingSoon(market.endsAt);
      const watchlistMatches = !showWatchlistOnly || watchlist.includes(market.slug);
      return categoryMatches && queryMatches && closingMatches && watchlistMatches;
    });
  }, [activeFilter, marketList, searchQuery, showClosingSoon, showWatchlistOnly, watchlist]);
  const portfolioItems = useMemo(
    () =>
      userPortfolio
        ? [
            { label: "Open positions", value: userPortfolio.summary.openPositions.toString(), accent: "green" as const },
            { label: "Exposure", value: `${formatToken(userPortfolio.summary.totalExposure)} BUDOL`, accent: "blue" as const },
            { label: "Potential", value: `${formatToken(userPortfolio.summary.potentialPayout)} BUDOL`, accent: "coral" as const },
          ]
        : portfolio,
    [userPortfolio],
  );

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

  const notify = (message: string, detail = message, syncFromServer = true) => {
    setToast(message);
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
    window.setTimeout(() => setToast(""), 3200);
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

  const updateMarket = (nextMarket: Market) => {
    setMarketList(current => current.map(market => (market.id === nextMarket.id ? nextMarket : market)));
    setSelectedId(nextMarket.id);
  };

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
      // Local Privy logout should still continue if the legacy server session is unavailable.
    }
    if (authenticated) {
      await logoutPrivy();
    }
    setBudolUser(null);
    notify("Logged out.", "Your Budol session ended on this browser.", false);
    navigate("markets", "replace");
  };

  useEffect(() => {
    document.title = "Budol | PH Politics Markets";
    const savedTheme = localStorage.getItem("budol-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(savedTheme === "dark" || savedTheme === "light" ? savedTheme : prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    let isMounted = true;

    loadCurrentUser()
      .then(user => {
        if (isMounted) {
          setBudolUser(user);
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
        if (!isMounted || nextMarkets.length === 0) {
          return;
        }
        setMarketList(nextMarkets);
        setSelectedId(nextMarkets[0].id);
      })
      .catch(() => {
        setMarketList(markets);
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
    if (!privyReady || !walletsReady || !authenticated || accountAddress || privyWalletCreateStarted.current) {
      return;
    }
    privyWalletCreateStarted.current = true;
    createWallet()
      .catch(error => {
        privyWalletCreateStarted.current = false;
        notify("Wallet creation failed.", errorMessage(error), false);
      });
  }, [accountAddress, authenticated, createWallet, privyReady, walletsReady]);

  useEffect(() => {
    if (!privyReady || !authenticated || !accountAddress) {
      return;
    }
    const syncKey = `${privyUser?.id || "privy"}:${accountAddress}`;
    if (privySessionSyncKey.current === syncKey) {
      return;
    }
    privySessionSyncKey.current = syncKey;

    let cancelled = false;
    setIsAuthLoading(true);
    getAccessToken()
      .then(accessToken => {
        if (!accessToken) {
          throw new Error("Privy did not return an access token.");
        }
        return loginWithPrivyToken(accessToken);
      })
      .then(user => {
        if (cancelled) {
          return;
        }
        setBudolUser(user);
        void refreshAccountNotifications();
        notify("Login successful.", "Your Privy wallet is now connected to Budol.", false);
      })
      .catch(error => {
        if (cancelled) {
          return;
        }
        privySessionSyncKey.current = "";
        setBudolUser(null);
        notify("Budol account sync failed.", errorMessage(error), false);
      })
      .finally(() => {
        if (!cancelled) {
          setIsAuthLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accountAddress, authenticated, getAccessToken, privyReady, privyUser?.id]);

  useEffect(() => {
    if (!privyReady || authenticated || !budolUser) {
      return;
    }
    void logoutCurrentUser().catch(() => undefined);
    setBudolUser(null);
    setUserPortfolio(null);
    setAccountNotifications([]);
    localStorage.setItem("budol-account-notifications", "[]");
  }, [authenticated, budolUser, privyReady]);

  useEffect(() => {
    if (accountAddress && isLoginOpen) {
      setIsLoginOpen(false);
    }
  }, [accountAddress, isLoginOpen]);

  useEffect(() => {
    if (!privyReady || !authenticated || !accountAddress || lastPrivyLoginNotice.current === accountAddress) {
      return;
    }
    lastPrivyLoginNotice.current = accountAddress;
    notify("Login successful.", "Privy wallet connected. Backend account sync and token features are next.", false);
  }, [accountAddress, authenticated, privyReady]);

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

  return (
    <main className="app-shell">
      <Topbar
        accountAddress={accountAddress}
        isAuthLoading={isAuthLoading && !accountAddress}
        isDark={isDark}
        onAccountClick={() => navigate("account")}
        onLoginClick={() => setIsLoginOpen(true)}
        onLogout={async () => {
          navigate("logout");
        }}
        notifications={accountNotifications}
        onNotificationOpen={openNotificationLink}
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
      />
      {toast ? <div className="toast-notice">{toast}</div> : null}

      {route === "logout" ? (
        <section className="simple-page">
          <h1>Logging out</h1>
          <p>Ending your Budol session on this browser.</p>
        </section>
      ) : route === "account" ? (
        <MyAccountPage
          accountAddress={accountAddress}
          notifications={accountNotifications}
          onBack={() => navigate("markets")}
          onLogout={logout}
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
          onOpen={openNotificationLink}
        />
      ) : route === "marketDetail" ? (
        <MarketDetailPage
          accountAddress={accountAddress}
          isLoggedIn={Boolean(accountAddress)}
          market={marketList.find(market => market.slug === marketSlug) ?? null}
          onBack={() => navigate("markets")}
          onLoginClick={() => setIsLoginOpen(true)}
          onMarketChange={updateMarket}
          onPortfolioChange={setUserPortfolio}
          onToast={notify}
          onWatchlistToggle={toggleWatchlist}
          slug={marketSlug}
          watchlisted={watchlist.includes(marketSlug)}
        />
      ) : (
        <>
          <HeroPanel />

          <section className="market-layout" id="markets">
            <aside className="sidebar">
              <ProfileCard />
              <PortfolioCard items={portfolioItems} onOpen={() => navigate("portfolio")} />
              <HotRegionsCard />
            </aside>

            <MarketBoard
              activeFilter={activeFilter}
              filters={filtersWithTrending.length > 1 ? filtersWithTrending : filters}
              markets={visibleMarkets}
              onFilterChange={setActiveFilter}
              onMarketOpen={slug => navigate("marketDetail", "push", slug)}
              onMarketSelect={setSelectedId}
              onClosingSoonToggle={() => setShowClosingSoon(value => !value)}
              showClosingSoon={showClosingSoon}
              onWatchlistFilterToggle={() => setShowWatchlistOnly(value => !value)}
              showWatchlistOnly={showWatchlistOnly}
              selectedId={selectedId}
            />

            <aside className="trade-panel">
              <TradeTicketCard
                accountAddress={accountAddress}
                isLoggedIn={Boolean(accountAddress)}
                market={selectedMarket}
                onLoginClick={() => setIsLoginOpen(true)}
                onMarketChange={updateMarket}
                onPortfolioChange={setUserPortfolio}
                onTradePlaced={() => notify("Trade placed. Portfolio updated.")}
              />
              <SignalsCard headlines={headlines} />
              <CrowdMoodCard />
            </aside>
          </section>
        </>
      )}
    </main>
  );
}

function walletAddressFromPrivyUser(user: unknown) {
  const linkedAccounts = (user as { linkedAccounts?: Array<Record<string, unknown>> } | null)?.linkedAccounts ?? [];
  for (const account of linkedAccounts) {
    const address = account.address;
    if (typeof address === "string" && /^0x[0-9a-fA-F]{40}$/.test(address)) {
      return address;
    }
  }
  const wallet = (user as { wallet?: { address?: string } } | null)?.wallet;
  return wallet?.address;
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

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return "Something went wrong. Please try again.";
}
