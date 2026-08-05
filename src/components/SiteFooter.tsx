import { ShieldCheck } from "lucide-react";
import budolLogoImage from "../../public/assets/budol-market.png";

type SiteFooterProps = {
  onAccountClick: () => void;
  onHowToClick: () => void;
  onMarketsClick: () => void;
  onMetricsClick: () => void;
  onPortfolioClick: () => void;
  onPrivacyClick: () => void;
  onTermsClick: () => void;
  onWalletClick: () => void;
};

export function SiteFooter({ onAccountClick, onHowToClick, onMarketsClick, onMetricsClick, onPortfolioClick, onPrivacyClick, onTermsClick, onWalletClick }: SiteFooterProps) {
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
          <button onClick={onHowToClick}>How to use</button>
          <button onClick={onMetricsClick}>Testnet metrics</button>
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
        <div className="site-footer-social">
          <strong>Social</strong>
          <a aria-label="Follow BudolPH on X" className="footer-social-link x" href="https://x.com/budolph_" rel="noreferrer" target="_blank">
            <svg aria-hidden="true" className="footer-social-icon" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
            </svg>
            <span>@budolph_</span>
          </a>
          <a aria-label="Follow BudolPH on Facebook" className="footer-social-link facebook" href="https://www.facebook.com/profile.php?id=61590670526100" rel="noreferrer" target="_blank">
            <svg aria-hidden="true" className="footer-social-icon" viewBox="0 0 24 24">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.972h-1.513c-1.49 0-1.956.931-1.956 1.887v2.262h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
            </svg>
            <span>Facebook</span>
          </a>
        </div>
      </nav>
      <div className="site-footer-meta">
        <span><ShieldCheck size={15} /> Live on Horizen Testnet</span>
        <small>Test markets use test tokens. Prices are crowd estimates, not financial advice.</small>
        <small>© {new Date().getFullYear()} BudolPH</small>
      </div>
    </footer>
  );
}
