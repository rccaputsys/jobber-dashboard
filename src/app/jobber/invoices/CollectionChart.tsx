"use client";

import { useState } from "react";
import { useIsLight } from "@/lib/hooks";

type PeriodData = {
  label: string;
  invoiced: number;
  collected: number;
};

type Props = {
  periods: PeriodData[];
  currencyCode: string;
  outstandingCents: number;
  draftCount?: number;
  draftCents?: number;
};

function moneyFmt(cents: number, code: string): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100); }
  catch { return `$${Math.round(cents / 100).toLocaleString()}`; }
}

export function CollectionChart({ periods, currencyCode, outstandingCents, draftCount, draftCents }: Props) {
  const isLight = useIsLight();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const money = (c: number) => moneyFmt(c, currencyCode);
  const maxVal = Math.max(...periods.map(p => Math.max(p.invoiced, p.collected)), 1);

  const totalInvoiced = periods.reduce((s, p) => s + p.invoiced, 0);
  const totalCollected = periods.reduce((s, p) => s + p.collected, 0);
  const overallRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;
  const rateColor = overallRate >= 80 ? "#10b981" : overallRate >= 50 ? "#f59e0b" : "#ef4444";

  const invoicedBg = isLight ? "#cbd5e1" : "rgba(255,255,255,0.12)";
  const collectedColor = "#10b981";
  const labelColor = isLight ? "#475569" : "rgba(255,255,255,0.5)";
  const primaryColor = isLight ? "#1e293b" : "#EAF1FF";
  const mutedColor = isLight ? "#64748b" : "rgba(255,255,255,0.5)";
  const gridLine = isLight ? "#f1f5f9" : "rgba(255,255,255,0.04)";
  const tooltipBg = isLight ? "#1e293b" : "rgba(10,15,30,0.95)";

  const hovered = hoveredIdx !== null ? periods[hoveredIdx] : null;
  const hoveredRate = hovered && hovered.invoiced > 0 ? Math.round((hovered.collected / hovered.invoiced) * 100) : 0;

  // Y-axis labels (skip $0 at bottom)
  const chartHeight = 220;
  const ySteps = 4;
  const yLabels = Array.from({ length: ySteps }, (_, i) => {
    const val = (maxVal / ySteps) * (ySteps - i);
    const dollars = val / 100;
    if (dollars >= 1000) return `$${Math.round(dollars / 1000)}k`;
    return `$${Math.round(dollars)}`;
  });

  return (
    <div style={{ minWidth: 0, overflow: "hidden", position: "relative", zIndex: 2 }}>
      {/* Header row: 3 stats */}
      <div style={{ display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, color: rateColor, letterSpacing: -1.5, lineHeight: 1 }}>
            {overallRate}%
          </div>
          <div style={{ fontSize: 12, color: mutedColor, marginTop: 4, fontWeight: 500 }}>
            Collection Rate
          </div>
        </div>
        <div style={{ borderLeft: `1px solid ${gridLine}`, paddingLeft: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: primaryColor, letterSpacing: -0.5, lineHeight: 1 }}>
            {money(totalInvoiced)}
          </div>
          <div style={{ fontSize: 12, color: mutedColor, marginTop: 4, fontWeight: 500 }}>
            Invoiced
          </div>
        </div>
        <div style={{ borderLeft: `1px solid ${gridLine}`, paddingLeft: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: collectedColor, letterSpacing: -0.5, lineHeight: 1 }}>
            {money(totalCollected)}
          </div>
          <div style={{ fontSize: 12, color: mutedColor, marginTop: 4, fontWeight: 500 }}>
            Collected
          </div>
        </div>
        {outstandingCents > 0 && (
          <div style={{ borderLeft: `1px solid ${gridLine}`, paddingLeft: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b", letterSpacing: -0.5, lineHeight: 1 }}>
              {money(outstandingCents)}
            </div>
            <div style={{ fontSize: 12, color: mutedColor, marginTop: 4, fontWeight: 500 }}>
              Outstanding
            </div>
          </div>
        )}
      </div>

      {/* Hover summary bar (above chart, not clipped) */}
      <div style={{ height: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {hovered && (
          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            padding: "6px 16px", borderRadius: 8,
            background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)",
            fontSize: 12,
          }}>
            <span className="text-primary" style={{ fontWeight: 700 }}>{hovered.label}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: invoicedBg, border: `1px solid ${isLight ? "#94a3b8" : "rgba(255,255,255,0.2)"}` }} />
              <span style={{ color: mutedColor }}>{money(hovered.invoiced)}</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: collectedColor }} />
              <span style={{ color: mutedColor }}>{money(hovered.collected)}</span>
            </span>
            <span style={{
              fontWeight: 800,
              color: hoveredRate > 100 ? "#5aa6ff" : hoveredRate >= 80 ? collectedColor : hoveredRate >= 50 ? "#f59e0b" : "#ef4444",
            }}>
              {hoveredRate}%
            </span>
          </div>
        )}
      </div>

      {/* Chart area with Y-axis */}
      <div style={{ display: "flex", gap: 0, position: "relative", overflow: "hidden", minWidth: 0, paddingTop: 8 }}>
        {/* Y-axis labels */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          height: chartHeight, paddingRight: 8, flexShrink: 0, width: 40, paddingTop: 0,
        }}>
          {yLabels.map((label, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 600, color: labelColor, textAlign: "right", lineHeight: 1 }}>
              {label}
            </div>
          ))}
        </div>

        {/* Bars area */}
        <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
          {/* Grid lines */}
          {yLabels.map((_, i) => (
            <div key={i} style={{
              position: "absolute", left: 0, right: 0,
              top: `${(i / (yLabels.length)) * 100}%`,
              borderTop: `1px solid ${gridLine}`,
            }} />
          ))}

          {/* Bars */}
          <div style={{
            display: "flex", alignItems: "flex-end",
            height: chartHeight, gap: periods.length > 20 ? 1 : periods.length > 12 ? 2 : 4,
            position: "relative", zIndex: 1,
          }}>
            {periods.map((p, i) => {
              const barMax = Math.max(p.invoiced, p.collected);
              const invoicedH = maxVal > 0 ? (p.invoiced / maxVal) * (chartHeight - 16) : 0;
              const collectedH = maxVal > 0 ? (p.collected / maxVal) * (chartHeight - 16) : 0;
              const overCollected = p.collected > p.invoiced && p.invoiced > 0;
              const isHov = hoveredIdx === i;
              const periodRate = p.invoiced > 0 ? Math.round((p.collected / p.invoiced) * 100) : 0;

              return (
                <div
                  key={i}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", cursor: "pointer",
                    position: "relative",
                  }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Bar */}
                  <div style={{
                    width: "80%", maxWidth: periods.length > 20 ? 20 : periods.length > 12 ? 32 : 48, position: "relative",
                    height: Math.max(Math.max(invoicedH, collectedH), 4),
                    borderRadius: "6px 6px 2px 2px",
                    background: invoicedBg,
                    overflow: "visible",
                    transition: "all 0.15s ease",
                    opacity: hoveredIdx !== null && !isHov ? 0.4 : 1,
                    transform: isHov ? "scaleX(1.08)" : "scaleX(1)",
                  }}>
                    {/* Collected fill from bottom */}
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      height: Math.max(collectedH, 0),
                      borderRadius: collectedH >= invoicedH ? "6px 6px 2px 2px" : "0 0 2px 2px",
                      background: `linear-gradient(180deg, ${collectedColor}dd, ${collectedColor})`,
                      transition: "height 0.3s ease",
                    }} />
                    {/* Over-collected accent — gold top portion when collected > invoiced */}
                    {overCollected && collectedH > invoicedH && (
                      <div style={{
                        position: "absolute", bottom: invoicedH, left: 0, right: 0,
                        height: collectedH - invoicedH,
                        borderRadius: "6px 6px 0 0",
                        background: "linear-gradient(180deg, rgba(250,204,21,0.5), rgba(250,204,21,0.2))",
                        transition: "height 0.3s ease",
                      }} />
                    )}
                  </div>

                  {/* Period label */}
                  <div style={{
                    fontSize: periods.length > 20 ? 8 : periods.length > 12 ? 9 : 11,
                    fontWeight: 600, color: isHov ? primaryColor : labelColor,
                    marginTop: 6, whiteSpace: "nowrap",
                    transition: "color 0.15s ease",
                    visibility: (() => {
                      // Show every Nth label to prevent squishing
                      const step = periods.length > 40 ? 8 : periods.length > 20 ? 4 : periods.length > 12 ? 2 : 1;
                      return (i % step === 0 || isHov) ? "visible" as const : "hidden" as const;
                    })(),
                  }}>
                    {p.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: invoicedBg, border: `1px solid ${isLight ? "#94a3b8" : "rgba(255,255,255,0.2)"}` }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: mutedColor }}>Invoiced</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: collectedColor }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: mutedColor }}>Collected</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "linear-gradient(180deg, rgba(250,204,21,0.5), rgba(250,204,21,0.2))" }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: mutedColor }}>Over-collected</span>
        </div>
      </div>

      {/* Draft callout */}
      {draftCount && draftCount > 0 && draftCents && draftCents > 0 && (
        <div style={{
          marginTop: 16, padding: "12px 16px", borderRadius: 10,
          background: isLight ? "#fffbeb" : "rgba(245,158,11,0.06)",
          border: `1px solid ${isLight ? "#fde68a" : "rgba(245,158,11,0.15)"}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 13, color: isLight ? "#92400e" : "#fcd34d", fontWeight: 700 }}>
              {draftCount} draft invoice{draftCount !== 1 ? "s" : ""} not sent
            </div>
            <div style={{ fontSize: 11, color: isLight ? "#a16207" : "rgba(252,211,77,0.6)", marginTop: 2 }}>
              Send these to start collecting
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: isLight ? "#92400e" : "#fcd34d", letterSpacing: -0.5 }}>
            {money(draftCents)}
          </div>
        </div>
      )}
    </div>
  );
}
