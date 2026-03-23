"use client";

import { useEffect, useState } from "react";

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
  currencyCode: string;
  sparklines?: Sparklines;
};

function moneyFmt(cents: number, code: string): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100); }
  catch { return `$${Math.round(cents / 100).toLocaleString()}`; }
}

function MiniSparkline({ data, color, height = 32, width = 80 }: { data: number[]; color: string; height?: number; width?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pad = 2;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", opacity: 0.5 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WeekGlance({ lastWeek, thisWeek, nextWeek, currencyCode, sparklines }: Props) {
  const money = (cents: number) => moneyFmt(cents, currencyCode);
  const [isLight, setIsLight] = useState(false);
  const [period, setPeriod] = useState<"this" | "last">("this");
  const [btnHovered, setBtnHovered] = useState<string | null>(null);

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const primaryColor = isLight ? "#1e293b" : "#EAF1FF";
  const mutedColor = isLight ? "#475569" : "rgba(255,255,255,0.55)";
  const cardBg = isLight ? "#ffffff" : "rgba(255,255,255,0.03)";
  const cardBorder = isLight ? "#e2e8f0" : "rgba(255,255,255,0.06)";

  function delta(current: number, last: number) {
    if (!showDelta) return null;
    if (last === 0 && current === 0) return null;
    if (last === 0) return null;
    const pct = Math.round(((current - last) / last) * 100);
    if (pct === 0) return null;
    const up = pct > 0;
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        fontSize: 11, fontWeight: 700, marginLeft: 8,
        color: up ? "#10b981" : "#ef4444",
      }}>
        {up ? "\u25B2" : "\u25BC"}{Math.abs(pct)}%
        <span style={{ fontWeight: 500, opacity: 0.7, fontSize: 10 }}>vs last wk</span>
      </span>
    );
  }

  type CardDef = {
    label: string;
    value: string;
    sub: string;
    color: string;
    currentRaw: number;
    lastRaw: number;
    sparkline?: number[];
    nextLabel?: string;
  };

  const active = period === "this" ? thisWeek : lastWeek;
  const showDelta = period === "this"; // only show delta when viewing this week (comparing to last)
  const periodLabel = period === "this" ? "This Week" : "Last Week";

  const cards: CardDef[] = [
    {
      label: `Scheduled ${periodLabel}`,
      value: money(active.scheduledRevenue),
      sub: `${active.jobCount} booked${period === "this" && nextWeek.jobCount > 0 ? ` \u2022 ${nextWeek.jobCount} next week` : ""}`,
      color: "#06b6d4",
      currentRaw: active.scheduledRevenue,
      lastRaw: lastWeek.scheduledRevenue,
      sparkline: sparklines?.unscheduled,
    },
    {
      label: `Earned ${periodLabel}`,
      value: money(active.completedRevenue),
      sub: `${active.completedCount} completed${active.completedCount > 0 ? ` \u2022 includes prior week carryover` : ""}`,
      color: "#10b981",
      currentRaw: active.completedRevenue,
      lastRaw: lastWeek.completedRevenue,
      sparkline: sparklines?.revenue,
    },
    {
      label: `Collected ${periodLabel}`,
      value: money(active.collectedCents),
      sub: `${active.collectedCount} invoices paid${active.invoicesDueCount > 0 ? ` \u2022 ${active.invoicesDueCount} were due` : ""}`,
      color: "#5aa6ff",
      currentRaw: active.collectedCents,
      lastRaw: lastWeek.collectedCents,
      sparkline: sparklines?.collections,
    },
    {
      label: `Quotes Won ${periodLabel}`,
      value: active.quotesWonCents > 0 ? money(active.quotesWonCents) : "\u2014",
      sub: `${active.quotesWon} won of ${active.quotesSent} sent${active.quotesSent > 0 ? ` \u2022 ${Math.round((active.quotesWon / active.quotesSent) * 100)}% close rate` : ""}`,
      color: "#8b5cf6",
      currentRaw: active.quotesWonCents,
      lastRaw: lastWeek.quotesWonCents,
      sparkline: sparklines?.pipeline,
    },
  ];

  const pillGroup: React.CSSProperties = { display: "flex", gap: 2, background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)", borderRadius: 8, padding: 2 };
  const pBtnStyle = (active: boolean, h: boolean): React.CSSProperties => ({
    padding: "4px 12px", borderRadius: 6, border: "none",
    background: active ? "linear-gradient(135deg, #7c5cff, #5aa6ff)" : h ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)") : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
    boxShadow: active ? "0 2px 8px rgba(124,92,255,0.3)" : "none",
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 className="text-primary" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Week at a Glance</h2>
        <div style={pillGroup}>
          <button onClick={() => setPeriod("last")} onMouseEnter={() => setBtnHovered("lw")} onMouseLeave={() => setBtnHovered(null)} style={pBtnStyle(period === "last", btnHovered === "lw")}>Last Week</button>
          <button onClick={() => setPeriod("this")} onMouseEnter={() => setBtnHovered("tw")} onMouseLeave={() => setBtnHovered(null)} style={pBtnStyle(period === "this", btnHovered === "tw")}>This Week</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {cards.map((card, i) => (
        <div key={i} className="hover-lift" style={{
          padding: "16px 18px",
          borderRadius: 12,
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderTop: `3px solid ${card.color}`,
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          minHeight: 120,
          cursor: "default",
        }}>
          {/* Header */}
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: card.color }}>
              {card.label}
            </span>
          </div>

          {/* Value */}
          <div>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: primaryColor, letterSpacing: -0.5, lineHeight: 1 }}>
                {card.value}
              </span>
              {delta(card.currentRaw, card.lastRaw)}
            </div>
            <div style={{ fontSize: 12, color: mutedColor, marginTop: 6, lineHeight: 1.3 }}>
              {card.sub}
            </div>
            {card.nextLabel && (
              <div style={{ fontSize: 11, color: mutedColor, marginTop: 4, opacity: 0.7 }}>
                {card.nextLabel}
              </div>
            )}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
