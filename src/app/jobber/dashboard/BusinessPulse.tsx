"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useIsLight } from "@/lib/hooks";
import { observeChart } from "@/lib/analytics";

type MonthData = {
  label: string;
  revenueCents: number;
  completedCount: number;
  isCurrent: boolean;
};

type Props = {
  months: MonthData[];
  weeks?: MonthData[];
  currencyCode: string;
};

function moneyFmt(cents: number, code: string): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100); }
  catch { return `$${Math.round(cents / 100).toLocaleString()}`; }
}

export function BusinessPulse({ months, weeks, currencyCode }: Props) {
  const isLight = useIsLight();
  const chartRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [period, setPeriod] = useState<"monthly" | "weekly">("monthly");
  const [btnHovered, setBtnHovered] = useState<string | null>(null);

  useEffect(() => { if (chartRef.current) return observeChart(chartRef.current, "business_pulse"); }, []);

  const data = period === "weekly" && weeks ? weeks : months;

  const money = useMemo(() => (c: number) => moneyFmt(c, currencyCode), [currencyCode]);

  const maxVal = Math.max(...data.map(m => m.revenueCents), 1);
  const chartHeight = 260;
  const chartPadTop = 20;
  const chartPadBot = 20;
  const usableHeight = chartHeight - chartPadTop - chartPadBot;

  const primaryColor = isLight ? "#1e293b" : "#EAF1FF";
  const mutedColor = isLight ? "#475569" : "rgba(255,255,255,0.55)";
  const gridLine = isLight ? "#e2e8f0" : "rgba(255,255,255,0.06)";
  const barColor = "#10b981";

  // Stats
  const totalRevenue = data.reduce((s, m) => s + m.revenueCents, 0);
  const totalCompleted = data.reduce((s, m) => s + m.completedCount, 0);
  const currentMonth = data.find(m => m.isCurrent);
  const lastMonth = data.length >= 2 ? data[data.length - 2] : null;
  const revDelta = lastMonth && lastMonth.revenueCents > 0
    ? Math.round(((currentMonth?.revenueCents || 0) - lastMonth.revenueCents) / lastMonth.revenueCents * 100)
    : null;
  const avgRevenue = Math.round(totalRevenue / data.length);

  const hovered = hoveredIdx !== null ? data[hoveredIdx] : null;

  const pillGroup: React.CSSProperties = { display: "flex", gap: 2, background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)", borderRadius: 8, padding: 2 };
  const pBtnStyle = (active: boolean, h: boolean): React.CSSProperties => ({
    padding: "4px 10px", borderRadius: 6, border: "none",
    background: active ? "linear-gradient(135deg, #7c5cff, #5aa6ff)" : h ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)") : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
    boxShadow: active ? "0 2px 8px rgba(124,92,255,0.3)" : "none",
  });

  // Y-axis
  const ySteps = 5;
  const yLabels = Array.from({ length: ySteps }, (_, i) => {
    const val = (maxVal / ySteps) * (ySteps - i);
    const dollars = val / 100;
    if (dollars >= 1000000) return `$${(dollars / 1000000).toFixed(1)}M`;
    if (dollars >= 1000) return `$${Math.round(dollars / 1000)}k`;
    return `$${Math.round(dollars)}`;
  });

  function yPos(cents: number) {
    return chartPadTop + usableHeight - (maxVal > 0 ? (cents / maxVal) * usableHeight : 0);
  }

  return (
    <div ref={chartRef}>
      {/* Top row: title + toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: mutedColor, fontWeight: 500 }}>
          Revenue from completed work
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={pillGroup}>
            <button onClick={() => { setPeriod("weekly"); setHoveredIdx(null); }} onMouseEnter={() => setBtnHovered("wk")} onMouseLeave={() => setBtnHovered(null)} style={pBtnStyle(period === "weekly", btnHovered === "wk")}>Weekly</button>
            <button onClick={() => { setPeriod("monthly"); setHoveredIdx(null); }} onMouseEnter={() => setBtnHovered("mo")} onMouseLeave={() => setBtnHovered(null)} style={pBtnStyle(period === "monthly", btnHovered === "mo")}>Monthly</button>
          </div>
          <div style={pillGroup}>
            <button onClick={() => setChartType("bar")} onMouseEnter={() => setBtnHovered("bar")} onMouseLeave={() => setBtnHovered(null)} style={pBtnStyle(chartType === "bar", btnHovered === "bar")}>Bar</button>
            <button onClick={() => setChartType("line")} onMouseEnter={() => setBtnHovered("line")} onMouseLeave={() => setBtnHovered(null)} style={pBtnStyle(chartType === "line", btnHovered === "line")}>Line</button>
          </div>
        </div>
      </div>

      {/* Hero stat row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: mutedColor, marginBottom: 6 }}>
            Revenue {currentMonth ? new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toLocaleString(undefined, { month: "long", timeZone: "UTC" }) : ""}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: primaryColor, letterSpacing: -2, lineHeight: 1 }}>
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
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: mutedColor, marginTop: 6 }}>
            {currentMonth?.completedCount || 0} completed &bull; avg {money(currentMonth && currentMonth.completedCount > 0 ? Math.round(currentMonth.revenueCents / currentMonth.completedCount) : 0)} each
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: primaryColor, letterSpacing: -0.5, lineHeight: 1 }}>
              {money(totalRevenue)}
            </div>
            <div style={{ fontSize: 11, color: mutedColor, marginTop: 3 }}>{data.length}-{period === 'weekly' ? 'Wk' : 'Mo'} Total</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: primaryColor, letterSpacing: -0.5, lineHeight: 1 }}>
              {money(avgRevenue)}
            </div>
            <div style={{ fontSize: 11, color: mutedColor, marginTop: 3 }}>{period === 'weekly' ? 'Weekly' : 'Monthly'} Avg</div>
          </div>
        </div>
      </div>

      {/* Hover detail */}
      <div style={{ height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {hovered && (
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "4px 14px", borderRadius: 8,
            background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)",
            fontSize: 12,
          }}>
            <span style={{ fontWeight: 700, color: primaryColor }}>{hovered.label}{hovered.isCurrent ? " (now)" : ""}</span>
            <span style={{ fontWeight: 800, color: barColor }}>{money(hovered.revenueCents)}</span>
            <span style={{ color: mutedColor }}>{hovered.completedCount} done</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ display: "flex", gap: 0, position: "relative", overflow: "hidden", minWidth: 0 }}>
        {/* Y-axis */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          height: chartHeight, paddingRight: 10, flexShrink: 0, width: 50,
          paddingTop: chartPadTop, paddingBottom: chartPadBot,
        }}>
          {yLabels.map((label, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 600, color: mutedColor, textAlign: "right", lineHeight: 1 }}>
              {label}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div style={{ flex: 1, position: "relative", minWidth: 0, height: chartHeight }}>
          {/* Grid lines */}
          {yLabels.map((_, i) => (
            <div key={i} style={{
              position: "absolute", left: 0, right: 0,
              top: chartPadTop + (i / yLabels.length) * usableHeight,
              borderTop: `1px solid ${gridLine}`,
            }} />
          ))}

          {/* Average line */}
          {avgRevenue > 0 && (
            <div style={{
              position: "absolute", left: 0, right: 0,
              top: yPos(avgRevenue),
              borderTop: `2px dashed ${isLight ? "#94a3b8" : "rgba(255,255,255,0.15)"}`,
              zIndex: 2,
            }}>
              <span style={{
                position: "absolute", right: 0, top: -14,
                fontSize: 9, fontWeight: 700, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.25)",
              }}>
                Avg
              </span>
            </div>
          )}

          {/* Line chart overlay */}
          {chartType === "line" && (
            <svg
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: chartHeight, zIndex: 3, pointerEvents: "none" }}
              viewBox={`0 0 ${data.length * 100} ${chartHeight}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="pulseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={barColor} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={barColor} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path
                d={(() => {
                  const pts = data.map((m, i) => ({ x: (i + 0.5) * 100, y: yPos(m.revenueCents) }));
                  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
                  return `${line} L${pts[pts.length - 1].x},${chartHeight - chartPadBot} L${pts[0].x},${chartHeight - chartPadBot} Z`;
                })()}
                fill="url(#pulseGrad)"
              />
              <polyline
                points={data.map((m, i) => `${(i + 0.5) * 100},${yPos(m.revenueCents)}`).join(" ")}
                fill="none" stroke={barColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
              />
              {data.map((m, i) => (
                <circle key={i} cx={(i + 0.5) * 100} cy={yPos(m.revenueCents)}
                  r={hoveredIdx === i ? 7 : m.isCurrent ? 6 : 4}
                  fill={barColor} stroke={isLight ? "#fff" : "#0a1020"} strokeWidth="2.5" vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          )}

          {/* Bars + hover targets */}
          <div style={{
            display: "flex", alignItems: "flex-end",
            height: chartHeight, gap: data.length > 8 ? 4 : 8,
            position: "relative", zIndex: 1,
            paddingTop: chartPadTop, paddingBottom: chartPadBot,
          }}>
            {data.map((m, i) => {
              const barH = maxVal > 0 ? (m.revenueCents / maxVal) * usableHeight : 0;
              const isHov = hoveredIdx === i;

              return (
                <div
                  key={i}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", cursor: "pointer",
                    justifyContent: "flex-end", height: "100%",
                  }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {chartType === "bar" && (
                    <div style={{
                      width: "75%", maxWidth: data.length > 8 ? 44 : 60, position: "relative",
                      height: Math.max(barH, 3),
                      borderRadius: "8px 8px 3px 3px",
                      background: `linear-gradient(180deg, ${barColor}, ${barColor}bb)`,
                      transition: "all 0.2s ease",
                      opacity: hoveredIdx !== null && !isHov ? 0.3 : m.isCurrent ? 1 : 0.65,
                      transform: isHov ? "scaleX(1.08)" : "scaleX(1)",
                      boxShadow: isHov ? `0 6px 20px ${barColor}40` : "none",
                    }}>
                      {m.completedCount > 0 && barH > 30 && data.length <= 8 && (
                        <div style={{
                          position: "absolute", bottom: 8, left: 0, right: 0,
                          textAlign: "center", fontSize: 10, fontWeight: 700,
                          color: "rgba(255,255,255,0.85)",
                        }}>
                          {m.completedCount}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* X-axis labels — outside the clipped chart area */}
      <div style={{
        display: "flex", marginLeft: 50, marginTop: 8,
        gap: data.length > 8 ? 4 : 8,
      }}>
        {data.map((m, i) => (
          <div key={i} style={{
            flex: 1, textAlign: "center",
            fontSize: data.length > 8 ? 10 : 12,
            fontWeight: m.isCurrent ? 800 : 600,
            color: m.isCurrent ? primaryColor : (hoveredIdx === i ? primaryColor : mutedColor),
            transition: "color 0.15s ease",
          }}>
            {m.label}
            {m.isCurrent && (
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: barColor, margin: "3px auto 0" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
