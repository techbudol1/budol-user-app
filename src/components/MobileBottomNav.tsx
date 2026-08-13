import { BriefcaseBusiness, LayoutGrid, UserRound, Wallet } from "lucide-react";

type MobileBottomNavProps = {
  activePage: "markets" | "portfolio" | "wallet" | "account";
  isLoggedIn: boolean;
  onAccountClick: () => void;
  onLoginClick: () => void;
  onMarketsClick: () => void;
  onPortfolioClick: () => void;
  onWalletClick: () => void;
};

export function MobileBottomNav({ activePage, isLoggedIn, onAccountClick, onLoginClick, onMarketsClick, onPortfolioClick, onWalletClick }: MobileBottomNavProps) {
  const requireLogin = (action: () => void) => () => {
    if (isLoggedIn) action();
    else onLoginClick();
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Primary navigation">
      <button className={activePage === "markets" ? "active" : ""} onClick={onMarketsClick} type="button">
        <LayoutGrid size={20} />
        <span>Markets</span>
      </button>
      <button className={activePage === "portfolio" ? "active" : ""} onClick={requireLogin(onPortfolioClick)} type="button">
        <BriefcaseBusiness size={20} />
        <span>Portfolio</span>
      </button>
      <button className={activePage === "wallet" ? "active" : ""} onClick={requireLogin(onWalletClick)} type="button">
        <Wallet size={20} />
        <span>Wallet</span>
      </button>
      <button className={activePage === "account" ? "active" : ""} onClick={requireLogin(onAccountClick)} type="button">
        <UserRound size={20} />
        <span>Account</span>
      </button>
    </nav>
  );
}
