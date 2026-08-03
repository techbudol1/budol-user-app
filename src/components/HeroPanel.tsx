import { Activity, ArrowRight, FileCheck2, LockKeyhole, Radio, ShieldCheck, Sparkles } from "lucide-react";
import islandsHeroImage from "../../public/assets/budol-islands-hero.webp";
import jeepneysHeroImage from "../../public/assets/budol-jeepneys-hero.webp";
import marketHeroImage from "../../public/assets/budol-market-hero.webp";

type HeroPanelProps = {
  marketCount: number;
};

const heroImages = [
  { src: jeepneysHeroImage, className: "hero-slide hero-slide-jeepneys" },
  { src: marketHeroImage, className: "hero-slide hero-slide-market" },
  { src: islandsHeroImage, className: "hero-slide hero-slide-islands" },
];

export function HeroPanel({ marketCount }: HeroPanelProps) {
  const hasLiveMarkets = marketCount > 0;

  return (
    <section className="hero-panel">
      {heroImages.map((image, index) => (
        <img
          key={image.src}
          className={image.className}
          src={image.src}
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority={index === 0 ? "high" : "auto"}
          loading={index === 0 ? "eager" : "lazy"}
        />
      ))}
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
        <div className="hero-trust-grid" aria-label="BudolPH trust features">
          <span>
            <ShieldCheck size={16} />
            Human-reviewed
          </span>
          <span>
            <FileCheck2 size={16} />
            Evidence rules
          </span>
          <span>
            <LockKeyhole size={16} />
            Privacy options
          </span>
          <span>
            <Sparkles size={16} />
            PH-focused
          </span>
        </div>
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
