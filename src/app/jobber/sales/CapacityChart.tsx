"use client";

type WeekBar = {
  label: string;
  cents: number;
  fillRate: number; // 0-1+
};

function fmtMoney(cents: number): string {
  const dollars = Math.round((Number(cents || 0) as number) / 100);
  if (dollars >= 1000000) {
    const rounded = Math.round(dollars / 10000) * 10000;
    return `$${(rounded / 1000000).toFixed(2)}M`;
  }
  if (dollars >= 1000) {
    const rounded = Math.round(dollars / 100) * 100;
    return `$${(rounded / 1000).toFixed(1)}k`;
  }
  if (dollars >= 100) {
    const rounded = Math.round(dollars / 100) * 100;
    return `$${rounded}`;
  }
  return `$${dollars}`;
}

export function CapacityChart({
  weeks,
  targetCents,
}: {
  weeks: WeekBar[];
  targetCents: number | null;
}) {
  if (weeks.length === 0) {
    return (
      <div className="text-muted" style={{ padding: 24, textAlign: "center", fontSize: 13 }}>
        No scheduled job data available yet.
      </div>
    );
  }

  const maxCents = Math.max(...weeks.map((w) => w.cents), targetCents ?? 0, 1);
  const chartH = 220;
  const barGap = 8;
  // Use a wide viewBox — SVG scales to fill container
  const barW = 48;
  const totalW = weeks.length * (barW + barGap) + barGap;

  function barColor(fillRate: number) {
    if (fillRate >= 0.9) return "#10b981";
    if (fillRate >= 0.5) return "#f59e0b";
    return "#ef4444";
  }

  const targetY = targetCents ? chartH - (targetCents / maxCents) * chartH : null;

  return (
    <div style={{ width: "100%", overflowX: "auto", paddingBottom: 4 }}>
      <svg
        viewBox={`0 0 ${totalW} ${chartH + 32}`}
        width="100%"
        style={{ minWidth: 400 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = chartH - pct * chartH;
          return (
            <line
              key={pct}
              x1={0}
              y1={y}
              x2={totalW}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          );
        })}

        {/* Bars */}
        {weeks.map((w, i) => {
          const h = Math.max(2, (w.cents / maxCents) * chartH);
          const x = barGap + i * (barW + barGap);
          const y = chartH - h;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={5}
                fill={barColor(w.fillRate)}
                opacity={0.85}
              />
              <text
                x={x + barW / 2}
                y={chartH + 16}
                textAnchor="middle"
                fontSize={10}
                fill="rgba(234,241,255,0.5)"
              >
                {w.label}
              </text>
              {/* Value on top of bar */}
              {w.cents > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill="rgba(234,241,255,0.7)"
                >
                  {fmtMoney(w.cents)}
                </text>
              )}
            </g>
          );
        })}

        {/* Target line */}
        {targetY !== null && (
          <g>
            <line
              x1={0}
              y1={targetY}
              x2={totalW}
              y2={targetY}
              stroke="#5aa6ff"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
            <text
              x={totalW - 4}
              y={targetY - 6}
              textAnchor="end"
              fontSize={10}
              fontWeight={700}
              fill="#5aa6ff"
            >
              Target: {fmtMoney(targetCents!)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
