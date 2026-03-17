import { riskColor, riskLabel } from "../utils/constants";

export function RiskMeter({ score }) {
  const color = riskColor(score);
  const r = 42, cx = 56, cy = 56, circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width="112" height="112" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border-tertiary)" strokeWidth="8" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div style={{ marginTop: -80, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: 26, fontWeight: 500, color, fontFamily: "var(--font-mono)" }}>{score}</span>
        <span style={{ fontSize: 11, color: "var(--color-text-secondary)", letterSpacing: 2 }}>{riskLabel(score)}</span>
      </div>
      <div style={{ height: 32 }} />
    </div>
  );
}
