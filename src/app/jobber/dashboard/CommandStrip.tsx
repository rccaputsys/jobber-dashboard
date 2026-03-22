"use client";

type KpiCell = {
  label: string;
  value: string;
  sub: string;
  color?: string;
  sparkline?: number[];
};

type Props = {
  healthScore: number;
  healthColor: string;
  healthLabel: string;
  cells: KpiCell[];
};

function MiniSparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 80;
  const pad = 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} style={{ display: "block", opacity: 0.7 }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CommandStrip({ healthScore, healthColor, healthLabel, cells }: Props) {
  return (
    <div className="command-strip">
      {/* Health Score cell */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 100 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${healthColor}15`,
          border: `2px solid ${healthColor}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, fontWeight: 800, color: healthColor,
          flexShrink: 0,
        }}>
          {healthScore}
        </div>
        <div>
          <div className="text-primary" style={{ fontSize: 13, fontWeight: 700 }}>Health</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: healthColor }}>{healthLabel}</div>
        </div>
      </div>

      {/* KPI cells */}
      {cells.map((cell, i) => (
        <div key={i}>
          <div className="text-muted" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>
            {cell.label}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1, color: cell.color }} className={cell.color ? undefined : "text-primary"}>
                {cell.value}
              </div>
              <div className="text-muted" style={{ fontSize: 11, marginTop: 3 }}>
                {cell.sub}
              </div>
            </div>
            {cell.sparkline && cell.sparkline.length > 1 && (
              <MiniSparkline data={cell.sparkline} color={cell.color || "#5aa6ff"} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
