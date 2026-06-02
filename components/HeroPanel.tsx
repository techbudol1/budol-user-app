import { ShieldCheck, Sparkles, Radio } from "lucide-react";
import bannerImage from "../../public/assets/budol-jeepney-hero.png";

export function HeroPanel() {
  return (
    <section className="hero-panel">
      <img src={bannerImage} alt="Playful Philippine politics prediction market illustration" />
      <div className="hero-copy">
        <div className="status-pill">
          <Radio size={14} />
          Live PH-only markets
        </div>
        <h1>Trade the chismis. Price the politics.</h1>
        <p>A lighter prediction market for Philippine elections, policy moves, city hall drama, and national headlines.</p>
        <div className="hero-actions">
          <button className="primary-button">
            <Sparkles size={18} />
            Explore markets
          </button>
          <button className="ghost-button">
            <ShieldCheck size={18} />
            View rules
          </button>
        </div>
      </div>
      <div className="ticker-card">
        <span>Budol index</span>
        <strong>74</strong>
        <small>High drama, medium confidence</small>
      </div>
    </section>
  );
}
