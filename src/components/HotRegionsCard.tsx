import { Landmark } from "lucide-react";

export function HotRegionsCard() {
  return (
    <div className="panel province-card">
      <div className="panel-title">
        <Landmark size={18} />
        <h2>Hot regions</h2>
      </div>
      <div className="mini-map" aria-label="Decorative Philippine region activity map">
        <span className="island luzon"></span>
        <span className="island visayas"></span>
        <span className="island mindanao"></span>
      </div>
      <div className="region-list">
        <span>Metro Manila</span>
        <span>Cebu</span>
        <span>Davao</span>
      </div>
    </div>
  );
}
