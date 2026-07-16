import { Bell, ChevronDown, LoaderCircle, LogIn, LogOut, Menu, Moon, Search, Sun, UserRound, Wallet, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AccountNotification, WalletBalance } from "../types";
import { formatDate } from "../lib/format";
import { shortAddress } from "../lib/format";
import budolLogoImage from "../../public/assets/budol-market.png";

type TopbarProps = {
  activePage?: "markets" | "portfolio";
  accountAddress?: string;
  isAuthLoading: boolean;
  isDark: boolean;
  isWalletBalanceLoading?: boolean;
  onAccountClick: () => void;
  onLoginClick: () => void;
  onLogout: () => Promise<void>;
  notifications: AccountNotification[];
  onNotificationOpen: (notification: AccountNotification) => void;
  onMarketsClick: () => void;
  onNotificationsReadAll: () => Promise<void>;
  onNotificationsPageClick: () => void;
  onPortfolioClick: () => void;
  onSearchChange: (query: string) => void;
  onThemeToggle: () => void;
  onWalletClick: () => void;
  walletBalances?: WalletBalance[];
};

export function Topbar({
  activePage,
  accountAddress,
  isAuthLoading,
  isDark,
  isWalletBalanceLoading = false,
  onAccountClick,
  onLoginClick,
  onLogout,
  notifications,
  onMarketsClick,
  onNotificationOpen,
  onNotificationsReadAll,
  onNotificationsPageClick,
  onPortfolioClick,
  onSearchChange,
  onThemeToggle,
  onWalletClick,
  walletBalances = [],
}: TopbarProps) {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const walletLabel = accountAddress ? shortAddress(accountAddress) : isAuthLoading ? "Checking" : "Login";
  const unreadCount = notifications.filter(notification => !notification.readAt).length;
  const quickBalances = quickBalanceItems(walletBalances);

  useEffect(() => {
    if (!isAccountMenuOpen && !isMobileMenuOpen && !isNotificationsOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (!mobileMenuRef.current?.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
        setIsMobileMenuOpen(false);
        setIsNotificationsOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isAccountMenuOpen, isMobileMenuOpen, isNotificationsOpen]);

  const handleWalletClick = () => {
    setIsMobileMenuOpen(false);
    if (accountAddress) {
      setIsNotificationsOpen(false);
      setIsAccountMenuOpen(open => !open);
      return;
    }
    if (!isAuthLoading) {
      onLoginClick();
    }
  };

  const handleNotificationsClick = () => {
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
    setIsNotificationsOpen(open => !open);
  };

  const openMobileDestination = (destination: "markets" | "portfolio" | "account" | "wallet") => {
    setIsMobileMenuOpen(false);
    if (destination === "markets") onMarketsClick();
    if (destination === "portfolio") onPortfolioClick();
    if (destination === "account") onAccountClick();
    if (destination === "wallet") onWalletClick();
  };

  const updateSearch = (value: string) => {
    setSearchValue(value);
    onSearchChange(value);
  };

  const markAllRead = async () => {
    await onNotificationsReadAll();
  };

  const openNotification = (notification: AccountNotification) => {
    onNotificationOpen(notification);
    setIsNotificationsOpen(false);
  };

  const closeAccountMenu = () => {
    setIsAccountMenuOpen(false);
  };

  const openAccount = () => {
    onAccountClick();
    closeAccountMenu();
  };

  const openWallet = () => {
    onWalletClick();
    closeAccountMenu();
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
      closeAccountMenu();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="topbar">
      <a className="brand" href="/markets" aria-label="BudolPH markets">
        <span className="brand-mark">
          <img src={budolLogoImage} alt="" className="brand-logo-image" />
        </span>
        <span>
          <strong>BudolPH</strong>
          <small>Philippine markets</small>
        </span>
      </a>

      <div className="search-box" role="search">
        <Search className="search-icon" size={18} />
        <input
          aria-label="Search markets"
          placeholder="Search markets, topics, or regions"
          value={searchValue}
          onChange={event => updateSearch(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Escape") {
              updateSearch("");
              event.currentTarget.blur();
            }
          }}
        />
        {searchValue ? (
          <button
            aria-label="Clear search"
            className="search-clear"
            onClick={() => updateSearch("")}
            type="button"
          >
            <X size={15} />
          </button>
        ) : (
          <span className="search-hint">Markets</span>
        )}
      </div>

      <nav className="desktop-nav" aria-label="Main navigation">
        <button className={activePage === "markets" ? "active" : ""} onClick={onMarketsClick}>Markets</button>
        <button className={activePage === "portfolio" ? "active" : ""} onClick={onPortfolioClick}>Portfolio</button>
      </nav>

      <div className="topbar-actions">
        {accountAddress ? (
          <button className="quick-balance-strip" onClick={onWalletClick} type="button" aria-label="Open wallet balances">
            {quickBalances.map(item => (
              <span className={`quick-balance-token ${item.symbol.toLowerCase()}`} key={item.symbol}>
                <em>{item.symbol}</em>
                <strong>{isWalletBalanceLoading && item.isPlaceholder ? "..." : item.value}</strong>
              </span>
            ))}
          </button>
        ) : null}
        <button
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={isDark}
          className="icon-button theme-toggle"
          onClick={onThemeToggle}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="notification-menu-wrap" ref={notificationsRef}>
          <button
            aria-expanded={isNotificationsOpen}
            aria-haspopup="dialog"
            className="icon-button notification-button"
            aria-label="Open notifications"
            onClick={handleNotificationsClick}
          >
            <Bell size={18} />
            {unreadCount > 0 ? <span className="notification-dot" /> : null}
          </button>

          {isNotificationsOpen ? (
            <div className="notification-panel" role="dialog" aria-label="Notifications">
              <div className="notification-panel-head">
                <span>
                  <strong>Notifications</strong>
                  <small>{unreadCount ? `${unreadCount} unread` : notifications.length ? `${notifications.length} recent` : "No new alerts"}</small>
                </span>
                {unreadCount > 0 ? <button onClick={() => void markAllRead()}>Mark read</button> : null}
              </div>
              <button className="notification-view-all" onClick={onNotificationsPageClick}>Open inbox</button>
              {notifications.length > 0 ? (
                <div className="notification-list">
                  {notifications.slice(0, 6).map(notification => (
                    <button className={`notification-item ${notification.readAt ? "" : "unread"}`} key={notification.id} onClick={() => openNotification(notification)}>
                      <strong>{notification.title}</strong>
                      <span>{notification.detail}</span>
                      <small>{formatDate(notification.createdAt)}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="notification-empty">
                  <Bell size={22} />
                  <strong>No notifications yet</strong>
                  <span>Login, trades, wallet sends, watchlist updates, and market actions will show up here.</span>
                </div>
              )}
            </div>
          ) : null}
        </div>
        <div
          className="account-menu-wrap"
          ref={accountMenuRef}
        >
          <button
            aria-expanded={accountAddress ? isAccountMenuOpen : undefined}
            aria-haspopup={accountAddress ? "menu" : undefined}
            aria-label={accountAddress ? `Connected wallet ${shortAddress(accountAddress)}` : isAuthLoading ? "Checking login session" : "Log in"}
            className={`wallet-button ${accountAddress ? "connected" : ""}`}
            disabled={isAuthLoading}
            onClick={handleWalletClick}
          >
            {accountAddress ? <Wallet size={18} /> : isAuthLoading ? <LoaderCircle className="spin-icon" size={18} /> : <LogIn size={18} />}
            <span>{walletLabel}</span>
            {accountAddress ? <ChevronDown size={16} /> : null}
          </button>

          {accountAddress && isAccountMenuOpen ? (
            <div className="account-dropdown" role="menu">
              <button role="menuitem" onClick={openAccount}>
                <UserRound size={17} />
                My Account
              </button>
              <button role="menuitem" onClick={openWallet}>
                <Wallet size={17} />
                My Wallet
              </button>
              <button role="menuitem" disabled={isLoggingOut} onClick={() => void handleLogout()}>
                {isLoggingOut ? <LoaderCircle className="spin-icon" size={17} /> : <LogOut size={17} />}
                Logout
              </button>
            </div>
          ) : null}
        </div>
        <div className="mobile-menu-wrap mobile-only" ref={mobileMenuRef}>
          <button
            className="icon-button"
            aria-expanded={isMobileMenuOpen}
            aria-haspopup="menu"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => {
              setIsAccountMenuOpen(false);
              setIsNotificationsOpen(false);
              setIsMobileMenuOpen(open => !open);
            }}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          {isMobileMenuOpen ? (
            <nav className="mobile-nav-menu" aria-label="Mobile navigation">
              <button className={activePage === "markets" ? "active" : ""} onClick={() => openMobileDestination("markets")}>Markets</button>
              <button className={activePage === "portfolio" ? "active" : ""} onClick={() => openMobileDestination("portfolio")}>Portfolio</button>
              {accountAddress ? (
                <>
                  <button onClick={() => openMobileDestination("account")}>My Account</button>
                  <button onClick={() => openMobileDestination("wallet")}>My Wallet</button>
                </>
              ) : (
                <button
                  disabled={isAuthLoading}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLoginClick();
                  }}
                >
                  Login
                </button>
              )}
            </nav>
          ) : null}
        </div>
      </div>
    </header>
  );
}

type QuickBalanceItem = {
  isPlaceholder: boolean;
  symbol: "BUDOL" | "ETH" | "tZEN";
  value: string;
};

function quickBalanceItems(balances: WalletBalance[]): QuickBalanceItem[] {
  return (["BUDOL", "ETH", "tZEN"] as const).map(symbol => {
    const balance = balances.find(item => (item.symbol || "").toUpperCase() === symbol.toUpperCase());
    return {
      isPlaceholder: !balance,
      symbol,
      value: balance ? formatQuickBalance(balance.formatted) : "0",
    };
  });
}

function formatQuickBalance(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value || "0";
  }
  if (numeric === 0) {
    return "0";
  }
  if (numeric < 0.001) {
    return "<0.001";
  }
  return numeric.toLocaleString("en-PH", {
    maximumFractionDigits: numeric >= 100 ? 0 : numeric >= 1 ? 2 : 4,
    minimumFractionDigits: 0,
  });
}
