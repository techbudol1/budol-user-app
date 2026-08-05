import { AlertTriangle, ArrowLeft, ArrowRightLeft, BookOpen, Calculator, CheckCircle2, Coins, FileText, Gavel, LockKeyhole, Search, ShieldCheck, TrendingDown, TrendingUp, Trophy, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { TokenIcon } from "./TokenIcon";

type LegalPageProps = {
  onBack: () => void;
};

export function HowToPage({ onBack }: LegalPageProps) {
  const steps = [
    {
      icon: <Wallet size={22} />,
      title: "Connect your wallet",
      copy: "Open Login, choose your wallet, and approve the connection. BudolPH runs on Horizen Testnet, so approve the network switch if your wallet asks.",
    },
    {
      icon: <Coins size={22} />,
      title: "Check your balances",
      copy: "ETH pays gas when gas-free trading is off. tZEN unlocks privacy features on testnet. BUDOL is the token used for trades and payouts.",
    },
    {
      icon: <Search size={22} />,
      title: "Open a market",
      copy: "Pick a market, then review the exact question, choices, closing time, rules, and resolution details before committing BUDOL.",
    },
    {
      icon: <ArrowRightLeft size={22} />,
      title: "Place a trade",
      copy: "Choose Yes or No, select a fixed amount, and review the cost, trading fee, total escrow, and estimated payout before confirming.",
    },
    {
      icon: <Trophy size={22} />,
      title: "Claim winnings",
      copy: "After resolution, winning trades become claimable in Portfolio. Normal claims send BUDOL directly to your connected wallet.",
    },
    {
      icon: <LockKeyhole size={22} />,
      title: "Use privacy flows",
      copy: "Private claims and shielded payouts reduce direct links between winning positions and withdrawal wallets. For best privacy, withdraw to a fresh wallet.",
    },
  ];

  return (
    <section className="howto-page">
      <button className="ghost-button legal-back-button" onClick={onBack}>
        <ArrowLeft size={18} />
        Back to markets
      </button>

      <section className="howto-hero panel">
        <div className="howto-hero-copy">
          <span className="eyebrow">User guide</span>
          <h1>Trade, track, and claim on BudolPH.</h1>
          <p>Use this flow when testing Philippine prediction markets on Horizen Testnet. Start public, then add privacy features when you want private claim notes or shielded payout withdrawals.</p>
          <div className="howto-hero-actions">
            <button className="primary-button" onClick={onBack}>
              Open markets
            </button>
            <a className="ghost-button howto-wallet-link" href="/wallet">
              View wallet
            </a>
          </div>
        </div>
        <div className="howto-visual-card" aria-hidden="true">
          <div className="howto-market-mini">
            <span>Market ticket</span>
            <strong>Yes 50¢</strong>
            <div />
            <small>10 BUDOL + fee</small>
          </div>
          <div className="howto-flow-line" />
          <div className="howto-payout-mini">
            <ShieldCheck size={24} />
            <strong>Claim ready</strong>
            <span>Normal or shielded payout</span>
          </div>
        </div>
      </section>

      <section className="howto-token-grid" aria-label="BudolPH token roles">
        <TokenRole symbol="ETH" title="Gas token" copy="Pays Horizen testnet gas when a transaction is not sponsored." />
        <TokenRole symbol="tZEN" title="Privacy token" copy="Pays testnet privacy-access fees for private claim and shielded payout flows." />
        <TokenRole symbol="BUDOL" title="Trading token" copy="Used to buy positions, pay trading fees, and receive market payouts." />
      </section>

      <section className="howto-trading-panel panel" aria-label="How BudolPH trading works">
        <div className="howto-trading-copy">
          <span className="eyebrow">Trading basics</span>
          <h2>You are buying positions, not voting.</h2>
          <p>Each market has two sides: Yes and No. Their prices move in opposite directions. When more BUDOL flows into Yes, Yes gets more expensive and No gets cheaper. You can sell before resolution, or hold until the market is settled.</p>
        </div>
        <div className="howto-price-example" aria-label="Example price movement">
          <div>
            <span>Start</span>
            <strong>Yes 50c</strong>
            <small>No 50c</small>
          </div>
          <ArrowRightLeft size={22} />
          <div>
            <span>After Yes demand</span>
            <strong>Yes 70c</strong>
            <small>No 30c</small>
          </div>
        </div>
        <div className="howto-scenario-grid">
          <TradingScenario
            icon={<TrendingUp size={18} />}
            title="Early Yes buyer"
            copy="Buying 10 BUDOL of Yes at 50c gives about 20 Yes shares. If Yes rises to 70c, those shares are worth about 14 BUDOL before fees."
          />
          <TradingScenario
            icon={<TrendingDown size={18} />}
            title="Existing No holder"
            copy="If No falls from 50c to 30c, a 20-share No position drops from about 10 BUDOL to about 6 BUDOL if sold at that price."
          />
          <TradingScenario
            icon={<Trophy size={18} />}
            title="Holding to resolution"
            copy="When the final result is Yes, Yes shares redeem at 1 BUDOL each and No shares redeem at 0. If the result is No, the opposite happens."
          />
        </div>
        <div className="howto-scenario-note">
          <span>Simple rule:</span>
          Price movement changes your position value before resolution. Final resolution decides which side pays out.
        </div>
      </section>

      <PositionCalculator />

      <header className="howto-section-heading">
        <span className="eyebrow">Start to finish</span>
        <h2>Your testnet journey</h2>
        <p>Follow these six steps from connecting a wallet to collecting a winning payout.</p>
      </header>

      <section className="howto-step-grid" aria-label="How to use BudolPH">
        {steps.map((step, index) => (
          <article className="howto-step-card panel" key={step.title}>
            <div className="howto-step-number">{String(index + 1).padStart(2, "0")}</div>
            <div className="howto-step-icon">{step.icon}</div>
            <h2>{step.title}</h2>
            <p>{step.copy}</p>
          </article>
        ))}
      </section>

      <section className="howto-claim-panel panel">
        <div>
          <span className="eyebrow">Choose your claim</span>
          <h2>Normal claim vs private claim</h2>
          <p>Both routes pay a winning position. The difference is how directly the payout can be connected to your trading wallet.</p>
        </div>
        <div className="howto-claim-options">
          <article>
            <Wallet size={22} />
            <strong>Normal claim</strong>
            <span>Fastest and simplest</span>
            <p>BUDOL is sent directly to your connected wallet. The recipient and amount remain visible on-chain.</p>
          </article>
          <article className="private">
            <ShieldCheck size={22} />
            <strong>Private claim</strong>
            <span>Uses tZEN + a ZK proof</span>
            <p>The payout becomes shielded notes and is relayed in fixed-denomination pieces to the recipient address you choose.</p>
          </article>
        </div>
      </section>

      <section className="howto-resolution-panel panel">
        <div className="howto-resolution-icon"><Gavel size={28} /></div>
        <div>
          <span className="eyebrow">Market resolution</span>
          <h2>Clear rules decide the winning side.</h2>
          <p>Every market includes a closing time, resolution criteria, and an evidence source. After the deadline, BudolPH reviews the published source and resolves Yes or No. If the question cannot be resolved fairly because evidence is unavailable, conflicting, or ambiguous, the market may be cancelled and eligible stakes returned under its rules.</p>
        </div>
        <div className="howto-resolution-flow" aria-label="Market resolution flow">
          <span>Market closes</span>
          <ArrowRightLeft size={17} />
          <span>Evidence reviewed</span>
          <ArrowRightLeft size={17} />
          <span>Winner pays 1 BUDOL per share</span>
        </div>
      </section>

      <section className="howto-testnet-panel panel">
        <div>
          <span className="eyebrow">Before your first trade</span>
          <h2>Testnet starter checklist</h2>
          <p>Open Wallet to confirm all three balances. Test tokens have no cash value and may be reset while the product is being tested.</p>
        </div>
        <div className="howto-testnet-list">
          <span><CheckCircle2 size={18} /><span><b>Network</b> Horizen Testnet (chain ID 2651420)</span></span>
          <span><TokenIcon symbol="ETH" /><span><b>ETH</b> Needed for wallet gas when a transaction is not sponsored</span></span>
          <span><TokenIcon symbol="BUDOL" /><span><b>BUDOL</b> Needed to open positions and pay the trading fee</span></span>
          <span><TokenIcon symbol="tZEN" /><span><b>tZEN</b> Needed only when testing paid privacy features</span></span>
        </div>
      </section>

      <section className="howto-privacy-expectations panel">
        <div className="howto-privacy-title">
          <LockKeyhole size={25} />
          <div>
            <span className="eyebrow">Privacy expectations</span>
            <h2>Private means harder to link—not invisible.</h2>
          </div>
        </div>
        <div className="howto-privacy-grid">
          <span><CheckCircle2 size={18} /><span><b>Protected:</b> the secret note and proof path are not published.</span></span>
          <span><CheckCircle2 size={18} /><span><b>Reduced linkage:</b> fixed pieces, batching, and a fresh recipient make direct tracing harder.</span></span>
          <span><AlertTriangle size={18} /><span><b>Still public:</b> blockchain transfers, timing, and the final recipient remain observable.</span></span>
          <span><AlertTriangle size={18} /><span><b>Your responsibility:</b> export an encrypted note backup and never lose its passphrase.</span></span>
        </div>
      </section>

      <section className="howto-warning panel">
        <AlertTriangle size={22} />
        <div>
          <strong>Testnet only</strong>
          <p>A losing position can become worth zero. Prices are crowd estimates—not facts, guarantees, or financial advice. Testnet ETH, tZEN, and BUDOL have no real-money value. Only sign wallet actions you understand.</p>
        </div>
      </section>
    </section>
  );
}

function PositionCalculator() {
  const [amount, setAmount] = useState(10);
  const [entryPrice, setEntryPrice] = useState(50);
  const [laterPrice, setLaterPrice] = useState(70);
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const safeEntry = Number.isFinite(entryPrice) ? Math.min(99, Math.max(1, entryPrice)) : 50;
  const safeLater = Number.isFinite(laterPrice) ? Math.min(100, Math.max(0, laterPrice)) : 50;
  const shares = safeAmount / (safeEntry / 100);
  const currentValue = shares * (safeLater / 100);
  const movement = currentValue - safeAmount;

  return (
    <section className="howto-calculator panel" aria-label="Position value calculator">
      <div className="howto-calculator-copy">
        <span className="howto-calculator-icon"><Calculator size={24} /></span>
        <span className="eyebrow">Try an example</span>
        <h2>See how a position changes value.</h2>
        <p>This simplified estimate excludes trading fees and price impact. Actual execution is shown in the trade widget before confirmation.</p>
      </div>
      <div className="howto-calculator-inputs">
        <label>
          <span>Amount</span>
          <div><input type="number" min="0" step="1" value={amount} onChange={event => setAmount(Number(event.target.value))} /><b>BUDOL</b></div>
        </label>
        <label>
          <span>Buy price</span>
          <div><input type="number" min="1" max="99" step="1" value={entryPrice} onChange={event => setEntryPrice(Number(event.target.value))} /><b>¢</b></div>
        </label>
        <label>
          <span>Later price</span>
          <div><input type="number" min="0" max="100" step="1" value={laterPrice} onChange={event => setLaterPrice(Number(event.target.value))} /><b>¢</b></div>
        </label>
      </div>
      <div className="howto-calculator-results">
        <ResultMetric label="Estimated shares" value={formatGuideNumber(shares)} />
        <ResultMetric label="Value at later price" value={`${formatGuideNumber(currentValue)} BUDOL`} />
        <ResultMetric label="Change before fees" tone={movement >= 0 ? "positive" : "negative"} value={`${movement >= 0 ? "+" : ""}${formatGuideNumber(movement)} BUDOL`} />
        <ResultMetric label="Payout if correct at resolution" value={`${formatGuideNumber(shares)} BUDOL`} />
      </div>
    </section>
  );
}

function ResultMetric({ label, tone, value }: { label: string; tone?: "positive" | "negative"; value: string }) {
  return <div className={tone ? `is-${tone}` : undefined}><span>{label}</span><strong>{value}</strong></div>;
}

function formatGuideNumber(value: number) {
  return new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 }).format(value);
}

function TokenRole({ copy, symbol, title }: { copy: string; symbol: "ETH" | "tZEN" | "BUDOL"; title: string }) {
  return (
    <article className={`howto-token-card ${symbol.toLowerCase()}`}>
      <span className="howto-token-mark" aria-hidden="true">
        <TokenIcon symbol={symbol} />
      </span>
      <strong>{title}</strong>
      <p>{copy}</p>
    </article>
  );
}

function TradingScenario({ copy, icon, title }: { copy: string; icon: ReactNode; title: string }) {
  return (
    <article className="howto-scenario-card">
      <span aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      <p>{copy}</p>
    </article>
  );
}

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
        <p>BudolPH is currently a testnet prediction-market service for Philippine events, trends, and civic topics. Testnet BUDOL has no guaranteed monetary value and is not redeemable for cash. Features, balances, markets, and testnet data may be changed or reset as the service is developed.</p>
      </LegalSection>
      <LegalSection title="2. Eligibility and accounts">
        <p>You must be legally capable of accepting these terms and must follow the laws that apply where you live. You are responsible for your account, connected wallet, recovery information, and activity performed through them. Do not create accounts to evade restrictions, manipulate grants, or impersonate another person or organization.</p>
      </LegalSection>
      <LegalSection title="3. Markets and trading">
        <p>Market prices are estimates created by trading activity, not facts, investment advice, or guarantees. Before trading, review the market question, deadline, outcomes, and resolution rules. Trades may lose all testnet BUDOL committed to the losing outcome.</p>
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
