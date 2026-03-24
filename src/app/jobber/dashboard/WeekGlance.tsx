"use client";

import { useState } from "react";
import { useIsLight } from "@/lib/hooks";
import { track } from "@/lib/analytics";

type WeekData = {
  jobCount: number;
  scheduledRevenue: number;
  revenuePerJob: number;
  fillPct: number | null;
  completedCount: number;
  completedRevenue: number;
  invoicesDueCount: number;
  invoicesDueCents: number;
  collectedCount: number;
  collectedCents: number;
  quotesSent: number;
  quotesWon: number;
  quotesWonCents: number;
  winRate: number;
  overdueCount: number;
};

type Sparklines = {
  revenue?: number[];
  pipeline?: number[];
  collections?: number[];
  unscheduled?: number[];
};

type Props = {
  lastWeek: WeekData;
  thisWeek: WeekData;
  nextWeek: WeekData;
  thisMonth: WeekData;
  lastMonth: WeekData;
  allTime: WeekData;
  currencyCode: string;
  sparklines?: Sparklines;
};

function moneyFmt(cents: number, code: string): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100); }
  catch { return `$${Math.round(cents / 100).toLocaleString()}`; }
}

type PeriodKey = "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "allTime";

const periodOptions: { key: PeriodKey; label: string }[] = [
  { key: "thisWeek", label: "This Week" },
  { key: "lastWeek", label: "Last Week" },
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "allTime", label: "All Time" },
];

export function WeekGlance({ lastWeek, thisWeek, nextWeek, thisMonth, lastMonth, allTime, currencyCode, sparklines }: Props) {
  const money = (cents: number) => moneyFmt(cents, currencyCode);
  const isLight = useIsLight();
  const [period, setPeriod] = useState<PeriodKey>("thisWeek");
  const [btnHovered, setBtnHovered] = useState<string | null>(null);

  const metricsMap: Record<PeriodKey, WeekData> = { thisWeek, lastWeek, thisMonth, lastMonth, allTime };
  const active = metricsMap[period];
  const periodLabel = periodOptions.find(o => o.key === period)?.label || "This Week";

  // Show delta only for "this" periods (compare to prior)
  const priorMap: Partial<Record<PeriodKey, WeekData>> = {
    thisWeek: lastWeek,
    thisMonth: lastMonth,
  };
  const prior = priorMap[period];

  function delta(current: number, last: number | undefined) {
    if (last === undefined || last === 0) return null;
    if (current === 0 && last === 0) return null;
    const pct = Math.round(((current - last) / last) * 100);
    if (pct === 0) return null;
    const up = pct > 0;
    const vsLabel = period === "thisWeek" ? "vs last wk" : period === "thisMonth" ? "vs last mo" : "";
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        fontSize: 11, fontWeight: 700, marginLeft: 8,
        color: up ? "#10b981" : "#ef4444",
      }}>
        {up ? "\u25B2" : "\u25BC"}{Math.abs(pct)}%
        {vsLabel && <span style={{ fontWeight: 500, opacity: 0.7, fontSize: 10 }}>{vsLabel}</span>}
      </span>
    );
  }

  const cards = [
    {
      label: `Scheduled`,
      value: money(active.scheduledRevenue),
      sub: `${active.jobCount} booked${period === "thisWeek" && nextWeek.jobCount > 0 ? ` \u2022 ${nextWeek.jobCount} next week` : ""}`,
      color: "#06b6d4",
      currentRaw: active.scheduledRevenue,
      priorRaw: prior?.scheduledRevenue,
    },
    {
      label: `Earned`,
      value: money(active.completedRevenue),
      sub: `${active.completedCount} completed`,
      color: "#10b981",
      currentRaw: active.completedRevenue,
      priorRaw: prior?.completedRevenue,
    },
    {
      label: `Collected`,
      value: money(active.collectedCents),
      sub: `${active.collectedCount} invoices paid${active.invoicesDueCount > 0 ? ` \u2022 ${active.invoicesDueCount} were due` : ""}`,
      color: "#5aa6ff",
      currentRaw: active.collectedCents,
      priorRaw: prior?.collectedCents,
    },
    {
      label: `Quotes Won`,
      value: active.quotesWonCents > 0 ? money(active.quotesWonCents) : "\u2014",
      sub: `${active.quotesWon} won of ${active.quotesSent} sent${active.winRate > 0 ? ` \u2022 ${active.winRate}% close rate` : ""}`,
      color: "#8b5cf6",
      currentRaw: active.quotesWonCents,
      priorRaw: prior?.quotesWonCents,
    },
  ];

  const pillGroup: React.CSSProperties = { display: "flex", gap: 2, background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3 };
  const pBtnStyle = (isActive: boolean, h: boolean): React.CSSProperties => ({
    padding: "6px 12px", borderRadius: 8, border: "none",
    background: isActive ? "linear-gradient(135deg, #7c5cff, #5aa6ff)" : h ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)") : "transparent",
    color: isActive ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
    boxShadow: isActive ? "0 4px 12px rgba(124,92,255,0.3)" : "none", whiteSpace: "nowrap",
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ ...pillGroup, flexWrap: "wrap", overflowX: "auto" }}>
          {periodOptions.map((o) => (
            <button
              key={o.key}
              onClick={() => { track("date_range_changed", { range: o.key, page: "overview" }); setPeriod(o.key); }}
              onMouseEnter={() => setBtnHovered(o.key)}
              onMouseLeave={() => setBtnHovered(null)}
              style={pBtnStyle(period === o.key, btnHovered === o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="kpi-grid-secondary">
      {cards.map((card, i) => {
        const accent = card.color === "#10b981" ? "green" : card.color === "#5aa6ff" ? "blue" : card.color === "#8b5cf6" ? "purple" : "blue";
        return (
        <div key={i} className="kpi-secondary" data-accent={accent} style={{ borderLeft: `3px solid ${card.color}` }}>
          <div>
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              {card.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <div className="kpi-value-medium" style={{ color: card.color }}>
                {card.value}
              </div>
              {delta(card.currentRaw, card.priorRaw)}
            </div>
          </div>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
            {card.sub}
          </div>
        </div>
        );
      })}
      </div>
    </div>
  );
}
