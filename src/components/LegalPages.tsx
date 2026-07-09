import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

type LegalPageProps = {
  onBack: () => void;
};

export function TermsPage({ onBack }: LegalPageProps) {
  return (
    <LegalPage
      eyebrow="Legal"
      icon={<FileText size={22} />}
      onBack={onBack}
      title="Terms of Service"
      updated="Effective July 1, 2026"
    >
      <LegalSection title="1. Testnet service">
        <p>BudolPH is currently a testnet prediction-market service for Philippine political and civic events. Testnet tZEN has no guaranteed monetary value and is not redeemable for cash. Features, balances, markets, and testnet data may be changed or reset as the service is developed.</p>
      </LegalSection>
      <LegalSection title="2. Eligibility and accounts">
        <p>You must be legally capable of accepting these terms and must follow the laws that apply where you live. You are responsible for your account, connected wallet, recovery information, and activity performed through them. Do not create accounts to evade restrictions, manipulate grants, or impersonate another person or organization.</p>
      </LegalSection>
      <LegalSection title="3. Markets and trading">
        <p>Market prices are estimates created by trading activity, not facts, investment advice, or guarantees. Before trading, review the market question, deadline, outcomes, and resolution rules. Trades may lose all testnet tZEN committed to the losing outcome.</p>
      </LegalSection>
      <LegalSection title="4. Market resolution">
        <p>BudolPH administrators resolve or cancel markets using the published rules and cited evidence. Ambiguous, unavailable, or conflicting evidence may result in cancellation or the fallback treatment stated in the market rules. Testnet resolution decisions are final unless BudolPH explicitly reopens a market to correct a technical or factual error.</p>
      </LegalSection>
      <LegalSection title="5. Prohibited conduct">
        <p>You may not exploit vulnerabilities, automate abusive traffic, manipulate markets, submit unlawful content, harass users, interfere with the service, launder assets, or use BudolPH for fraud. We may restrict accounts, remove content, freeze testnet actions, or cancel affected markets to protect users and system integrity.</p>
      </LegalSection>
      <LegalSection title="6. Blockchain and privacy risks">
        <p>Blockchain transactions are public and generally irreversible. ZK features can reduce linkability in supported flows but do not make every action anonymous. Unsupported shielded denominations may use a direct public payout, as disclosed in the claim flow.</p>
      </LegalSection>
      <LegalSection title="7. Availability and disclaimers">
        <p>BudolPH is provided “as is” during testnet. We do not guarantee uninterrupted availability, error-free software, permanent storage, a particular market outcome, or continued support for any wallet, provider, network, or feature.</p>
      </LegalSection>
      <LegalSection title="8. Changes and contact">
        <p>We may update these terms as BudolPH changes. Material updates will be dated on this page. Questions or account requests should be sent through the official BudolPH support channel identified by the operator running your deployment.</p>
      </LegalSection>
    </LegalPage>
  );
}

export function PrivacyPage({ onBack }: LegalPageProps) {
  return (
    <LegalPage
      eyebrow="Privacy"
      icon={<ShieldCheck size={22} />}
      onBack={onBack}
      title="Privacy Policy"
      updated="Effective July 1, 2026"
    >
      <LegalSection title="1. Information we collect">
        <p>BudolPH stores your connected wallet address, chosen public display name, login timestamps, and account status. We also store trades, positions, comments, watchlists, notifications, claims, payout status, and administrative audit records.</p>
      </LegalSection>
      <LegalSection title="2. Technical information">
        <p>The service may process IP address, user agent, request timing, error information, and security events to operate and protect the platform. Your browser stores theme, preferences, watchlist state, and private claim notes locally. Claim-note backups are encrypted in your browser using the passphrase you provide.</p>
      </LegalSection>
      <LegalSection title="3. How information is used">
        <p>We use information to authenticate wallet signatures, execute and display trades, resolve markets, process claims, prevent abuse, investigate failures, support users, and improve reliability. We do not use private claim secrets to create public activity labels.</p>
      </LegalSection>
      <LegalSection title="4. Public and blockchain data">
        <p>Your display name, comments, and market activity may be visible to other users. Wallet transfers and smart-contract interactions are recorded on public blockchains. Replacing a wallet address with a display name in the interface does not remove the underlying public blockchain record.</p>
      </LegalSection>
      <LegalSection title="5. Service providers">
        <p>BudolPH relies on authentication providers, blockchain infrastructure, wallet and transaction services, GMR Engine and Vault, zkVerify-compatible proof services, and hosting/database providers. They process information needed to provide their part of the service under their own terms and privacy practices.</p>
      </LegalSection>
      <LegalSection title="6. Retention and security">
        <p>We retain information while needed to operate the testnet, maintain audit and settlement records, prevent fraud, and meet applicable obligations. We use access controls, encrypted secrets, HttpOnly sessions, and isolated signing services, but no system can guarantee absolute security.</p>
      </LegalSection>
      <LegalSection title="7. Your choices">
        <p>You can change your display name, export or remove browser-local claim notes, and log out at any time. Requests to access, correct, or delete account information should be made through the official BudolPH support channel. Some blockchain and audit records cannot be altered or erased.</p>
      </LegalSection>
      <LegalSection title="8. Updates">
        <p>We may update this policy when data practices or providers change. The effective date above identifies the current version.</p>
      </LegalSection>
    </LegalPage>
  );
}

function LegalPage({ children, eyebrow, icon, onBack, title, updated }: LegalPageProps & { children: ReactNode; eyebrow: string; icon: ReactNode; title: string; updated: string }) {
  return (
    <section className="legal-page">
      <button className="ghost-button legal-back-button" onClick={onBack}>
        <ArrowLeft size={18} />
        Back to markets
      </button>
      <article className="panel legal-document">
        <header>
          <div className="legal-icon">{icon}</div>
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{updated}</p>
          </div>
        </header>
        <div className="legal-sections">{children}</div>
      </article>
    </section>
  );
}

function LegalSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
