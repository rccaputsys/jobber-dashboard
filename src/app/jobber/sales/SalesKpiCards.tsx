"use client";

import { useState } from "react";
import { useIsLight } from "@/lib/hooks";

type PeriodMetrics = {
  winRate: number;
  winRateLabel: string;
  avgDaysToClose: number;
  wonCount: number;
  wonRevenue: string;
  quotesSent: number;
  quotesSentValue: string;
  monthLabel: string;
};

export function SalesKpiCards({
  thisWeek,
  lastWeek,
  thisMonth,
  lastMonth,
  allTime,
}: {
  thisWeek: PeriodMetrics;
  lastWeek: PeriodMetrics;
  thisMonth: PeriodMetrics;
  lastMonth: PeriodMetrics;
  allTime: PeriodMetrics;
}) {
  const [period, setPeriod] = useState<"thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "allTime">("thisWeek");
  const isLight = useIsLight();
  const [hovered, setHovered] = useState<string | null>(null);

  const metricsMap = { thisWeek, lastWeek, thisMonth, lastMonth, allTime };
  const metrics = metricsMap[period];

  const options = [
    { key: "thisWeek" as const, label: "This Week" },
    { key: "lastWeek" as const, label: "Last Week" },
    { key: "thisMonth" as const, label: "This Month" },
    { key: "lastMonth" as const, label: "Last Month" },
    { key: "allTime" as const, label: "All Time" },
  ];

  const pillGroup: React.CSSProperties = { display: "flex", gap: 2, background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3 };
  const btnStyle = (active: boolean, h: boolean): React.CSSProperties => ({
    padding: "6px 12px", borderRadius: 8, border: "none",
    background: active ? "linear-gradient(135deg, #7c5cff, #5aa6ff)" : h ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)") : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
    boxShadow: active ? "0 4px 12px rgba(124,92,255,0.3)" : "none", whiteSpace: "nowrap",
  });

  const pctFmt = (v: number) => `${Math.round(v * 100)}%`;
  const winColor = metrics.winRate >= 0.4 ? "#10b981" : metrics.winRate >= 0.2 ? "#f59e0b" : "#ef4444";
  const winAccent = metrics.winRate >= 0.4 ? "green" : metrics.winRate >= 0.2 ? "amber" : "red";
  const daysColor = metrics.avgDaysToClose > 0 && metrics.avgDaysToClose <= 7 ? "#10b981" : metrics.avgDaysToClose <= 14 ? "#5aa6ff" : "#f59e0b";
  const daysAccent = metrics.avgDaysToClose > 0 && metrics.avgDaysToClose <= 7 ? "green" : metrics.avgDaysToClose <= 14 ? "blue" : "amber";

  const periodSuffix = metrics.monthLabel;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ ...pillGroup, overflowX: "auto", WebkitOverflowScrolling: "touch", flexWrap: "nowrap" }}>
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => setPeriod(o.key)}
              onMouseEnter={() => setHovered(o.key)}
              onMouseLeave={() => setHovered(null)}
              style={btnStyle(period === o.key, hovered === o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="kpi-grid-secondary">
        {/* Won Sales */}
        <div className="kpi-secondary" data-accent="green" style={{ borderLeft: "3px solid #10b981" }}>
          <div>
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Won Sales
            </div>
            <div className="kpi-value-medium" style={{ color: "#10b981" }}>
              {metrics.wonRevenue}
            </div>
          </div>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
            {metrics.wonCount} won &bull; {periodSuffix}
          </div>
        </div>

        {/* Win Rate */}
        <div className="kpi-secondary" data-accent={winAccent} style={{ borderLeft: `3px solid ${winColor}` }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
              <span className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Win Rate
              </span>
              <span className="info-tooltip" style={{ width: 16, height: 16, fontSize: 10 }}>?<span className="tooltip-text">Percentage of quotes won out of all decided quotes (won + lost + pending). Higher is better — 40%+ is strong for service businesses.</span></span>
            </div>
            <div className="kpi-value-medium" style={{ color: winColor }}>
              {pctFmt(metrics.winRate)}
            </div>
          </div>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
            {periodSuffix}
          </div>
        </div>

        {/* Avg Days to Close */}
        <div className="kpi-secondary" data-accent={daysAccent} style={{ borderLeft: `3px solid ${daysColor}` }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
              <span className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Avg Days to Close
              </span>
              <span className="info-tooltip" style={{ width: 16, height: 16, fontSize: 10 }}>?<span className="tooltip-text">Average days from quote sent to won. Under 7 days (green) is excellent — your proposals close fast. 7-14 days (blue) is healthy. Over 14 days (amber) means follow-ups may be needed sooner.</span></span>
            </div>
            <div className="kpi-value-medium" style={{ color: daysColor }}>
              {metrics.avgDaysToClose || "\u2014"}
            </div>
          </div>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
            {periodSuffix}
          </div>
        </div>

        {/* Quotes Sent */}
        <div className="kpi-secondary" data-accent="blue" style={{ borderLeft: "3px solid #5aa6ff" }}>
          <div>
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Quotes Sent
            </div>
            <div className="kpi-value-medium" style={{ color: "#5aa6ff" }}>
              {metrics.quotesSentValue}
            </div>
          </div>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
            {metrics.quotesSent} {metrics.quotesSent === 1 ? "quote" : "quotes"} &bull; {periodSuffix}
          </div>
        </div>
      </div>
    </div>
  );
}
