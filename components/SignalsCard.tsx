import { ArrowUpRight, ChartNoAxesCombined, TrendingUp } from "lucide-react";

type SignalsCardProps = {
  headlines: string[];
};

export function SignalsCard({ headlines }: SignalsCardProps) {
  return (
    <div className="panel" id="signals">
      <div className="panel-title">
        <TrendingUp size={18} />
        <h2>Signals</h2>
      </div>
      {headlines.map(headline => (
        <div className="signal-item" key={headline}>
          <ChartNoAxesCombined size={16} />
          <span>{headline}</span>
          <ArrowUpRight size={15} />
        </div>
      ))}
    </div>
  );
}
