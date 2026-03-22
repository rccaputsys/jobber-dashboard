"use client";

import { useState, useEffect, useMemo } from "react";

type MonthData = {
  label: string;
  revenueCents: number;
  overdueCents: number;
  collectedCents: number;
  isCurrent: boolean;
};

type Props = {
  months: MonthData[];
  currencyCode: string;
  totalRevenue: number;
  totalOverdue: number;
};

function moneyFmt(cents: number, code: string): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100); }
  catch { return `$${Math.round(cents / 100).toLocaleString()}`; }
}

export function BusinessPulse({ months, currencyCode, totalRevenue, totalOverdue }: Props) {
  const [isLight, setIsLight] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const money = useMemo(() => (c: number) => moneyFmt(c, currencyCode), [currencyCode]);

  const maxVal = Math.max(...months.map(m => Math.max(m.revenueCents, m.overdueCents, m.collectedCents)), 1);
  const chartHeight = 180;

  const labelColor = isLight ? "#475569" : "rgba(255,255,255,0.5)";
  const primaryColor = isLight ? "#1e293b" : "#EAF1FF";
  const mutedColor = isLight ? "#64748b" : "rgba(255,255,255,0.5)";
  const gridLine = isLight ? "#f1f5f9" : "rgba(255,255,255,0.04)";

  const hovered = hoveredIdx !== null ? months[hoveredIdx] : null;

  // Revenue trend direction
  const recentRevenue = months.slice(-3).reduce((s, m) => s + m.revenueCents, 0);
  const priorRevenue = months.slice(0, 3).reduce((s, m) => s + m.revenueCents, 0);
  const trendUp = recentRevenue >= priorRevenue;

  // Y-axis
  const ySteps = 4;
  const yLabels = Array.from({ length: ySteps }, (_, i) => {
    const val = (maxVal / ySteps) * (ySteps - i);
    const dollars = val / 100;
    if (dollars >= 1000) return `$${Math.round(dollars / 1000)}k`;
    return `$${Math.round(dollars)}`;
  });

  return (
    <div>
      {/* Stats header */}
      <div style={{ display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, color: primaryColor, letterSpacing: -1.5, lineHeight: 1 }}>
            {money(totalRevenue)}
          </div>
          <div style={{ fontSize: 12, color: mutedColor, marginTop: 4, fontWeight: 500 }}>
            Revenue (6 months)
          </div>
        </div>
        <div style={{ borderLeft: `1px solid ${gridLine}`, paddingLeft: 24 }}>
          <div style={{
            fontSize: 22, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1,
            color: trendUp ? "#10b981" : "#ef4444",
          }}>
            {trendUp ? "Trending Up" : "Trending Down"}
          </div>
          <div style={{ fontSize: 12, color: mutedColor, marginTop: 4, fontWeight: 500 }}>
            Last 3 mo vs prior 3 mo
          </div>
        </div>
        {totalOverdue > 0 && (
          <div style={{ borderLeft: `1px solid ${gridLine}`, paddingLeft: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b", letterSpacing: -0.5, lineHeight: 1 }}>
              {money(totalOverdue)}
            </div>
            <div style={{ fontSize: 12, color: mutedColor, marginTop: 4, fontWeight: 500 }}>
              Currently Overdue
            </div>
          </div>
        )}
      </div>

      {/* Hover summary */}
      <div style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {hovered && (
          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            padding: "5px 14px", borderRadius: 8,
            background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)",
            fontSize: 12,
          }}>
            <span style={{ fontWeight: 700, color: primaryColor }}>{hovered.label}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#10b981" }} />
              <span style={{ color: mutedColor }}>Earned: {money(hovered.revenueCents)}</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#5aa6ff" }} />
              <span style={{ color: mutedColor }}>Collected: {money(hovered.collectedCents)}</span>
            </span>
            {hovered.overdueCents > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 0, borderTop: "2px solid #f59e0b" }} />
                <span style={{ color: mutedColor }}>Overdue: {money(hovered.overdueCents)}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ display: "flex", gap: 0, position: "relative", overflow: "visible", minWidth: 0, paddingTop: 8 }}>
        {/* Y-axis */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          height: chartHeight, paddingRight: 8, flexShrink: 0, width: 44,
        }}>
          {yLabels.map((label, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 600, color: labelColor, textAlign: "right", lineHeight: 1 }}>
              {label}
            </div>
          ))}
        </div>

        {/* Bars + line */}
        <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
          {/* Grid lines */}
          {yLabels.map((_, i) => (
            <div key={i} style={{
              position: "absolute", left: 0, right: 0,
              top: `${(i / yLabels.length) * 100}%`,
              borderTop: `1px solid ${gridLine}`,
            }} />
          ))}

          {/* Overdue line overlay */}
          <svg
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: chartHeight, zIndex: 2, pointerEvents: "none" }}
            viewBox={`0 0 ${months.length * 100} ${chartHeight}`}
            preserveAspectRatio="none"
          >
            <polyline
              points={months.map((m, i) => {
                const x = (i + 0.5) * (100);
                const y = chartHeight - (maxVal > 0 ? (m.overdueCents / maxVal) * (chartHeight - 16) : 0);
                return `${x},${y}`;
              }).join(" ")}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {months.map((m, i) => {
              const x = (i + 0.5) * 100;
              const y = chartHeight - (maxVal > 0 ? (m.overdueCents / maxVal) * (chartHeight - 16) : 0);
              return (
                <circle key={i} cx={x} cy={y} r="4" fill="#f59e0b" stroke={isLight ? "#fff" : "#0a1020"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
              );
            })}
          </svg>

          {/* Revenue bars + collected fill */}
          <div style={{
            display: "flex", alignItems: "flex-end",
            height: chartHeight, gap: 8,
            position: "relative", zIndex: 1,
          }}>
            {months.map((m, i) => {
              const revenueH = maxVal > 0 ? (m.revenueCents / maxVal) * (chartHeight - 16) : 0;
              const collectedH = maxVal > 0 ? (m.collectedCents / maxVal) * (chartHeight - 16) : 0;
              const isHov = hoveredIdx === i;

              return (
                <div
                  key={i}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", cursor: "pointer",
                  }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <div style={{
                    width: "70%", maxWidth: 52, position: "relative",
                    height: Math.max(revenueH, 4),
                    borderRadius: "6px 6px 2px 2px",
                    background: isLight ? "#d1fae5" : "rgba(16,185,129,0.15)",
                    overflow: "hidden",
                    transition: "all 0.15s ease",
                    opacity: hoveredIdx !== null && !isHov ? 0.4 : 1,
                    transform: isHov ? "scaleX(1.08)" : "scaleX(1)",
                    border: m.isCurrent ? `2px solid ${primaryColor}` : "none",
                    boxSizing: "border-box" as const,
                  }}>
                    {/* Collected fill */}
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      height: Math.min(collectedH, revenueH),
                      background: "linear-gradient(180deg, #10b981cc, #10b981)",
                      transition: "height 0.3s ease",
                    }} />
                  </div>

                  <div style={{
                    fontSize: 11, fontWeight: m.isCurrent ? 800 : 600,
                    color: m.isCurrent ? primaryColor : labelColor,
                    marginTop: 6,
                  }}>
                    {m.label}
                  </div>
                  {m.isCurrent && (
                    <div style={{ fontSize: 8, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: 0.3 }}>Now</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: isLight ? "#d1fae5" : "rgba(16,185,129,0.15)", border: `1px solid #10b981` }} />
          <span style={{ fontSize: 11, color: mutedColor }}>Revenue Earned</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#10b981" }} />
          <span style={{ fontSize: 11, color: mutedColor }}>Collected</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 0, borderTop: "2px solid #f59e0b" }} />
          <span style={{ fontSize: 11, color: mutedColor }}>Overdue Balance</span>
        </div>
      </div>
    </div>
  );
}
