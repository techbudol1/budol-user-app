import { Bell, ChevronDown, LoaderCircle, LogIn, LogOut, Menu, Moon, Search, Sun, UserRound, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AccountNotification } from "../types";
import { formatDate } from "../lib/format";
import { shortAddress } from "../lib/format";
import budolLogoImage from "../../public/assets/budol-politics-market.png";

type TopbarProps = {
  accountAddress?: string;
  isAuthLoading: boolean;
  isDark: boolean;
  onAccountClick: () => void;
  onLoginClick: () => void;
  onLogout: () => Promise<void>;
  notifications: AccountNotification[];
  onNotificationOpen: (link?: string) => void;
  onNotificationsReadAll: () => Promise<void>;
  onNotificationsPageClick: () => void;
  onPortfolioClick: () => void;
  onSearchChange: (query: string) => void;
  onThemeToggle: () => void;
  onWalletClick: () => void;
};

export function Topbar({
  accountAddress,
  isAuthLoading,
  isDark,
  onAccountClick,
  onLoginClick,
  onLogout,
  notifications,
  onNotificationOpen,
  onNotificationsReadAll,
  onNotificationsPageClick,
  onPortfolioClick,
  onSearchChange,
  onThemeToggle,
  onWalletClick,
}: TopbarProps) {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const walletLabel = accountAddress ? shortAddress(accountAddress) : isAuthLoading ? "Checking" : "Login";
  const unreadCount = notifications.filter(notification => !notification.readAt).length;

  useEffect(() => {
    if (!isAccountMenuOpen && !isNotificationsOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
        setIsNotificationsOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isAccountMenuOpen, isNotificationsOpen]);

  const handleWalletClick = () => {
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
    setIsNotificationsOpen(open => !open);
  };

  const markAllRead = async () => {
    await onNotificationsReadAll();
  };

  const openNotification = (notification: AccountNotification) => {
    if (notification.link) {
      onNotificationOpen(notification.link);
      setIsNotificationsOpen(false);
    }
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
      <a className="brand" href="/" aria-label="Budol home">
        <span className="brand-mark">
          <img src={budolLogoImage} alt="" className="brand-logo-image" />
        </span>
        <span>
          <strong>Budol</strong>
          <small>PH politics markets</small>
        </span>
      </a>

      <div className="search-box">
        <Search size={18} />
        <input placeholder="Search Senate, LGU, budget, Comelec..." onChange={event => onSearchChange(event.target.value)} />
      </div>

      <nav className="desktop-nav" aria-label="Main navigation">
        <a href="#markets">Markets</a>
        <a href="#signals">Signals</a>
        <button onClick={onPortfolioClick}>Portfolio</button>
      </nav>

      <div className="topbar-actions">
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
        <button className="icon-button mobile-only" aria-label="Open menu">
          <Menu size={20} />
        </button>
      </div>
    </header>
  );
}
