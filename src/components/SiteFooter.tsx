import { ShieldCheck } from "lucide-react";
import budolLogoImage from "../../public/assets/budol-market.png";

type SiteFooterProps = {
  onAccountClick: () => void;
  onMarketsClick: () => void;
  onPortfolioClick: () => void;
  onPrivacyClick: () => void;
  onTermsClick: () => void;
  onWalletClick: () => void;
};

export function SiteFooter({ onAccountClick, onMarketsClick, onPortfolioClick, onPrivacyClick, onTermsClick, onWalletClick }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="site-footer-brand">
        <img alt="" src={budolLogoImage} />
        <div>
          <strong>BudolPH</strong>
          <span>Human-reviewed prediction markets for the Philippines.</span>
        </div>
      </div>
      <nav aria-label="Footer navigation">
        <div>
          <strong>Explore</strong>
          <button onClick={onMarketsClick}>Markets</button>
          <button onClick={onPortfolioClick}>Portfolio</button>
        </div>
        <div>
          <strong>Legal</strong>
          <button onClick={onTermsClick}>Terms</button>
          <button onClick={onPrivacyClick}>Privacy</button>
        </div>
        <div>
          <strong>Account</strong>
          <button onClick={onAccountClick}>Profile</button>
          <button onClick={onWalletClick}>Wallet</button>
        </div>
      </nav>
      <div className="site-footer-meta">
        <span><ShieldCheck size={15} /> Horizen Testnet</span>
        <small>Market prices are crowd estimates, not financial advice.</small>
        <small>© {new Date().getFullYear()} BudolPH</small>
      </div>
    </footer>
  );
}
