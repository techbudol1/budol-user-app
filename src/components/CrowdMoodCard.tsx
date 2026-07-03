import { Users } from "lucide-react";

export function CrowdMoodCard() {
  return (
    <div className="panel crowd-panel">
      <div className="panel-title">
        <Users size={18} />
        <h2>Crowd mood</h2>
      </div>
      <div className="mood-meter">
        <span></span>
      </div>
      <p>62% playful, 28% cautious, 10% typing in all caps</p>
    </div>
  );
}
