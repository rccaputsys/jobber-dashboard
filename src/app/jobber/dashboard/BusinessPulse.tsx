"use client";

import { useState, useEffect, useMemo } from "react";

type MonthData = {
  label: string;
  revenueCents: number;
  completedCount: number;
  isCurrent: boolean;
};

type Props = {
  months: MonthData[];
  currencyCode: string;
};

function moneyFmt(cents: number, code: string): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100); }
  catch { return `$${Math.round(cents / 100).toLocaleString()}`; }
}

export function BusinessPulse({ months, currencyCode }: Props) {
  const [isLight, setIsLight] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [btnHovered, setBtnHovered] = useState<string | null>(null);

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const money = useMemo(() => (c: number) => moneyFmt(c, currencyCode), [currencyCode]);

  const maxVal = Math.max(...months.map(m => m.revenueCents), 1);
  const chartHeight = 220;

  const primaryColor = isLight ? "#1e293b" : "#EAF1FF";
  const mutedColor = isLight ? "#475569" : "rgba(255,255,255,0.55)";
  const gridLine = isLight ? "#e2e8f0" : "rgba(255,255,255,0.06)";
  const barColor = "#10b981";
  const barBg = isLight ? "#d1fae5" : "rgba(16,185,129,0.12)";

  // Stats
  const totalRevenue = months.reduce((s, m) => s + m.revenueCents, 0);
  const totalCompleted = months.reduce((s, m) => s + m.completedCount, 0);
  const currentMonth = months.find(m => m.isCurrent);
  const lastMonth = months.length >= 2 ? months[months.length - 2] : null;
  const revDelta = lastMonth && lastMonth.revenueCents > 0
    ? Math.round(((currentMonth?.revenueCents || 0) - lastMonth.revenueCents) / lastMonth.revenueCents * 100)
    : null;

  const avgRevenue = Math.round(totalRevenue / months.length);

  const pillGroup: React.CSSProperties = { display: "flex", gap: 2, background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)", borderRadius: 8, padding: 2 };
  const pBtnStyle = (active: boolean, h: boolean): React.CSSProperties => ({
    padding: "4px 10px", borderRadius: 6, border: "none",
    background: active ? "linear-gradient(135deg, #7c5cff, #5aa6ff)" : h ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)") : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
    boxShadow: active ? "0 2px 8px rgba(124,92,255,0.3)" : "none",
  });

  const hovered = hoveredIdx !== null ? months[hoveredIdx] : null;

  // Y-axis
  const ySteps = 4;
  const yLabels = Array.from({ length: ySteps }, (_, i) => {
    const val = (maxVal / ySteps) * (ySteps - i);
    const dollars = val / 100;
    if (dollars >= 1000000) return `$${(dollars / 1000000).toFixed(1)}M`;
    if (dollars >= 1000) return `$${Math.round(dollars / 1000)}k`;
    return `$${Math.round(dollars)}`;
  });

  return (
    <div>
      {/* Chart type toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: mutedColor }}>
          Revenue from completed work (visits &amp; jobs)
        </div>
        <div style={pillGroup}>
          <button onClick={() => setChartType("bar")} onMouseEnter={() => setBtnHovered("bar")} onMouseLeave={() => setBtnHovered(null)} style={pBtnStyle(chartType === "bar", btnHovered === "bar")}>Bar</button>
          <button onClick={() => setChartType("line")} onMouseEnter={() => setBtnHovered("line")} onMouseLeave={() => setBtnHovered(null)} style={pBtnStyle(chartType === "line", btnHovered === "line")}>Line</button>
        </div>
      </div>

      {/* Header: hero stat + supporting stats */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
        {/* Left: current month hero */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: mutedColor, marginBottom: 6 }}>
            Revenue {currentMonth ? new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toLocaleString(undefined, { month: "long", timeZone: "UTC" }) : ""}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: primaryColor, letterSpacing: -2, lineHeight: 1 }}>
              {money(currentMonth?.revenueCents || 0)}
            </div>
            {revDelta !== null && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                padding: "4px 10px", borderRadius: 8,
                background: revDelta >= 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                fontSize: 13, fontWeight: 700,
                color: revDelta >= 0 ? "#10b981" : "#ef4444",
              }}>
                {revDelta >= 0 ? "\u2191" : "\u2193"} {Math.abs(revDelta)}%
                <span style={{ fontWeight: 500, opacity: 0.7 }}>vs {lastMonth?.label}</span>
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: mutedColor, marginTop: 4 }}>
            {currentMonth?.completedCount || 0} completed this month
          </div>
        </div>

        {/* Right: supporting stats */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: primaryColor, letterSpacing: -0.5, lineHeight: 1 }}>
              {money(totalRevenue)}
            </div>
            <div style={{ fontSize: 11, color: mutedColor, marginTop: 3 }}>{months.length}-Month Total</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: primaryColor, letterSpacing: -0.5, lineHeight: 1 }}>
              {money(avgRevenue)}
            </div>
            <div style={{ fontSize: 11, color: mutedColor, marginTop: 3 }}>Monthly Avg</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: primaryColor, letterSpacing: -0.5, lineHeight: 1 }}>
              {totalCompleted}
            </div>
            <div style={{ fontSize: 11, color: mutedColor, marginTop: 3 }}>Completed</div>
          </div>
        </div>
      </div>

      {/* Hover detail bar */}
      <div style={{ height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {hovered && (
          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            padding: "5px 16px", borderRadius: 8,
            background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)",
            fontSize: 12,
          }}>
            <span style={{ fontWeight: 700, color: primaryColor }}>{hovered.label}{hovered.isCurrent ? " (current)" : ""}</span>
            <span style={{ fontWeight: 800, color: barColor }}>{money(hovered.revenueCents)}</span>
            <span style={{ color: mutedColor }}>{hovered.completedCount} completed</span>
            {hovered.revenueCents > 0 && hovered.completedCount > 0 && (
              <span style={{ color: mutedColor }}>avg {money(Math.round(hovered.revenueCents / hovered.completedCount))} each</span>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ display: "flex", gap: 0, position: "relative", overflow: "visible", minWidth: 0, paddingTop: 8 }}>
        {/* Y-axis */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          height: chartHeight, paddingRight: 10, flexShrink: 0, width: 48,
        }}>
          {yLabels.map((label, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 600, color: mutedColor, textAlign: "right", lineHeight: 1 }}>
              {label}
            </div>
          ))}
        </div>

        {/* Bars */}
        <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
          {/* Grid lines */}
          {yLabels.map((_, i) => (
            <div key={i} style={{
              position: "absolute", left: 0, right: 0,
              top: `${(i / yLabels.length) * 100}%`,
              borderTop: `1px solid ${gridLine}`,
            }} />
          ))}

          {/* Average line */}
          {avgRevenue > 0 && (
            <div style={{
              position: "absolute", left: 0, right: 0,
              bottom: `${(avgRevenue / maxVal) * (chartHeight - 16)}px`,
              borderTop: `2px dashed ${isLight ? "#94a3b8" : "rgba(255,255,255,0.2)"}`,
              zIndex: 2,
            }}>
              <span style={{
                position: "absolute", right: 0, top: -14,
                fontSize: 9, fontWeight: 700, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.3)",
              }}>
                Avg
              </span>
            </div>
          )}

          {/* Chart area */}
          <div style={{
            display: "flex", alignItems: "flex-end",
            height: chartHeight, gap: chartType === "bar" ? (months.length > 8 ? 4 : 10) : 0,
            position: "relative", zIndex: 1,
          }}>
            {/* Line chart overlay */}
            {chartType === "line" && (
              <svg
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: chartHeight, zIndex: 2, pointerEvents: "none" }}
                viewBox={`0 0 ${months.length * 100} ${chartHeight}`}
                preserveAspectRatio="none"
              >
                {/* Gradient fill under line */}
                <defs>
                  <linearGradient id="pulseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={barColor} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={barColor} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path
                  d={(() => {
                    const pts = months.map((m, i) => {
                      const x = (i + 0.5) * 100;
                      const y = chartHeight - (maxVal > 0 ? (m.revenueCents / maxVal) * (chartHeight - 16) : 0);
                      return { x, y };
                    });
                    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
                    const fill = `${line} L${pts[pts.length - 1].x},${chartHeight} L${pts[0].x},${chartHeight} Z`;
                    return fill;
                  })()}
                  fill="url(#pulseGrad)"
                />
                <polyline
                  points={months.map((m, i) => {
                    const x = (i + 0.5) * 100;
                    const y = chartHeight - (maxVal > 0 ? (m.revenueCents / maxVal) * (chartHeight - 16) : 0);
                    return `${x},${y}`;
                  }).join(" ")}
                  fill="none"
                  stroke={barColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                {months.map((m, i) => {
                  const x = (i + 0.5) * 100;
                  const y = chartHeight - (maxVal > 0 ? (m.revenueCents / maxVal) * (chartHeight - 16) : 0);
                  const isHov = hoveredIdx === i;
                  return (
                    <circle key={i} cx={x} cy={y}
                      r={isHov ? 6 : m.isCurrent ? 5 : 4}
                      fill={barColor}
                      stroke={isLight ? "#fff" : "#0a1020"}
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>
            )}

            {months.map((m, i) => {
              const barH = maxVal > 0 ? (m.revenueCents / maxVal) * (chartHeight - 16) : 0;
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
                  {chartType === "bar" && (
                    <>
                      {/* Value label on top of bar */}
                      <div style={{
                        fontSize: months.length > 8 ? 9 : 11, fontWeight: 700,
                        color: isHov ? primaryColor : "transparent",
                        marginBottom: 4, transition: "color 0.15s ease",
                        whiteSpace: "nowrap",
                      }}>
                        {money(m.revenueCents)}
                      </div>

                      {/* Bar */}
                      <div style={{
                        width: "80%", maxWidth: months.length > 8 ? 40 : 64, position: "relative",
                        height: Math.max(barH, 4),
                        borderRadius: "8px 8px 3px 3px",
                        background: `linear-gradient(180deg, ${barColor}, ${barColor}cc)`,
                        transition: "all 0.15s ease",
                        opacity: hoveredIdx !== null && !isHov ? 0.35 : m.isCurrent ? 1 : 0.7,
                        transform: isHov ? "scaleX(1.06)" : "scaleX(1)",
                        boxShadow: isHov ? `0 4px 16px ${barColor}40` : "none",
                      }}>
                        {m.completedCount > 0 && barH > 30 && months.length <= 8 && (
                          <div style={{
                            position: "absolute", bottom: 6, left: 0, right: 0,
                            textAlign: "center", fontSize: 10, fontWeight: 700,
                            color: "rgba(255,255,255,0.8)",
                          }}>
                            {m.completedCount}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {chartType === "line" && (
                    <div style={{ height: chartHeight }} />
                  )}

                  {/* Month label */}
                  <div style={{
                    fontSize: months.length > 8 ? 10 : 12,
                    fontWeight: m.isCurrent ? 800 : 600,
                    color: m.isCurrent ? primaryColor : (isHov ? primaryColor : mutedColor),
                    marginTop: chartType === "line" ? 6 : 8,
                    transition: "color 0.15s ease",
                  }}>
                    {m.label}
                  </div>
                  {m.isCurrent && (
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: barColor, marginTop: 3 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
