import { Activity, ArrowRight, Radio, ShieldCheck, Sparkles } from "lucide-react";
import bannerImage from "../../public/assets/budol-jeepney-hero.png";

type HeroPanelProps = {
  marketCount: number;
};

export function HeroPanel({ marketCount }: HeroPanelProps) {
  const hasLiveMarkets = marketCount > 0;

  return (
    <section className="hero-panel">
      <img src={bannerImage} alt="Playful Philippine prediction market illustration" />
      <div className="hero-copy">
        <div className="status-pill">
          <span className="live-indicator" aria-hidden="true" />
          <Radio size={14} />
          {hasLiveMarkets ? "Markets are live" : "Ready for the first market"}
        </div>
        <h1>
          Read the room.
          <span> Price what matters.</span>
        </h1>
        <p>Prediction markets for Philippine events, trends, decisions, and the stories shaping the country.</p>
        <div className="hero-actions">
          <a className="primary-button hero-primary-action" href="#markets">
            <Sparkles size={18} />
            Explore markets
            <ArrowRight size={17} />
          </a>
          <span className="hero-trust-note">
            <ShieldCheck size={18} />
            Human-reviewed markets
          </span>
        </div>
        <div className="hero-facts" aria-label="BudolPH platform features">
          <span>
            <strong>PH only</strong>
            Local events and trends
          </span>
          <span>
            <strong>Transparent</strong>
            Clear resolution rules
          </span>
          <span>
            <strong>Community</strong>
            Crowd-priced outcomes
          </span>
        </div>
      </div>
      <div className="ticker-card">
        <div className="ticker-card-head">
          <span>
            <Activity size={16} />
            Market pulse
          </span>
          <small className={hasLiveMarkets ? "is-live" : ""}>{hasLiveMarkets ? "Live" : "Standby"}</small>
        </div>
        <strong>{marketCount.toString().padStart(2, "0")}</strong>
        <span className="ticker-label">{marketCount === 1 ? "market available" : "markets available"}</span>
        <div className="ticker-track" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <small>{hasLiveMarkets ? "Open the board to see what the crowd is pricing." : "Published markets will appear here automatically."}</small>
      </div>
    </section>
  );
}
