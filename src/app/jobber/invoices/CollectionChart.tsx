"use client";

import { useState, useRef, useEffect } from "react";
import { useIsLight } from "@/lib/hooks";
import { observeChart } from "@/lib/analytics";

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
  const chartRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const money = (c: number) => moneyFmt(c, currencyCode);
  const maxVal = Math.max(...periods.map(p => p.collected), 1);

  const totalCollected = periods.reduce((s, p) => s + p.collected, 0);

  const collectedColor = "#10b981";
  const labelColor = isLight ? "#475569" : "rgba(255,255,255,0.5)";
  const primaryColor = isLight ? "#1e293b" : "#EAF1FF";
  const mutedColor = isLight ? "#64748b" : "rgba(255,255,255,0.5)";
  const gridLine = isLight ? "#f1f5f9" : "rgba(255,255,255,0.04)";
  const tooltipBg = isLight ? "#1e293b" : "rgba(10,15,30,0.95)";

  useEffect(() => { if (chartRef.current) return observeChart(chartRef.current, "collection_chart"); }, []);

  const hovered = hoveredIdx !== null ? periods[hoveredIdx] : null;

  // Y-axis labels (skip $0 at bottom)
  const chartHeight = 200;
  const ySteps = 4;
  const yLabels = Array.from({ length: ySteps }, (_, i) => {
    const val = (maxVal / ySteps) * (ySteps - i);
    const dollars = val / 100;
    if (dollars >= 1000) return `$${Math.round(dollars / 1000)}k`;
    return `$${Math.round(dollars)}`;
  });

  return (
    <div ref={chartRef} style={{ minWidth: 0, overflow: "hidden", position: "relative", zIndex: 2 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: collectedColor, letterSpacing: -0.5, lineHeight: 1 }}>{money(totalCollected)}</span>
        <span className="text-muted" style={{ fontSize: 12 }}>collected</span>
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div style={{ marginBottom: 6, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span className="text-primary" style={{ fontWeight: 700 }}>{hovered.label}</span>
          <span style={{ color: collectedColor, fontWeight: 700 }}>{money(hovered.collected)}</span>
        </div>
      )}

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
              const barH = maxVal > 0 ? (p.collected / maxVal) * (chartHeight - 16) : 0;
              const isHov = hoveredIdx === i;

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
                  <div style={{
                    width: "80%", maxWidth: periods.length > 20 ? 20 : periods.length > 12 ? 32 : 48,
                    height: Math.max(barH, 4),
                    borderRadius: "6px 6px 2px 2px",
                    background: `linear-gradient(180deg, ${collectedColor}dd, ${collectedColor})`,
                    transition: "all 0.15s ease",
                    opacity: hoveredIdx !== null && !isHov ? 0.4 : 1,
                  }} />
                    {/* Subtle line where invoiced amount sits when collected exceeds it */}
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

    </div>
  );
}
