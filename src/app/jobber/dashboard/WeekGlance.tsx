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
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `$${Math.round(cents / 100).toLocaleString()}`;
  }
}

function MiniSparkline({ data, color, height = 28, width = 70 }: { data: number[]; color: string; height?: number; width?: number }) {
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
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", opacity: 0.6 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Delta({ current, last }: { current: number; last: number }) {
  if (last === 0 || (last === 0 && current === 0)) return null;
  const pct = Math.round(((current - last) / last) * 100);
  if (pct === 0) return null;
  const color = pct > 0 ? "#10b981" : "#ef4444";
  return (
    <span style={{ fontSize: 9, fontWeight: 700, color, marginLeft: 4 }}>
      {pct > 0 ? "\u25B2" : "\u25BC"}{Math.abs(pct)}%
    </span>
  );
}

type CardData = {
  primary: string;
  secondary?: string;
  color?: string;
};

type CardProps = {
  title: string;
  last: CardData;
  current: CardData & { rawCurrent: number; rawLast: number };
  next: CardData;
  isLight: boolean;
  sparkline?: number[];
  sparklineColor?: string;
};

function WeekCard({ title, last, current, next, isLight, sparkline, sparklineColor }: CardProps) {
  const border = isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)";
  const heroBg = isLight ? "#f0fdf4" : "rgba(16,185,129,0.06)";
  const sideBg = isLight ? "#f8fafc" : "rgba(255,255,255,0.02)";
  const labelColor = isLight ? "#475569" : "rgba(255,255,255,0.5)";
  const primaryColor = isLight ? "#1e293b" : "#EAF1FF";
  const mutedColor = isLight ? "#334155" : "rgba(255,255,255,0.7)";

  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${border}`,
      overflow: "hidden",
    }}>
      {/* Title + sparkline */}
      <div style={{
        padding: "7px 12px",
        background: isLight ? "#f8fafc" : "rgba(255,255,255,0.03)",
        borderBottom: `1px solid ${border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: primaryColor }}>
          {title}
        </span>
        {sparkline && sparkline.length > 1 && (
          <MiniSparkline data={sparkline} color={sparklineColor || "#5aa6ff"} height={20} width={60} />
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr" }}>
        {/* Last */}
        <div style={{ padding: "10px 10px", background: sideBg, borderRight: `1px solid ${border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: labelColor, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>Last</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: mutedColor }}>{last.primary}</div>
          {last.secondary && <div style={{ fontSize: 11, marginTop: 2, color: mutedColor }}>{last.secondary}</div>}
        </div>

        {/* This week */}
        <div style={{ padding: "10px 10px", background: heroBg, borderRight: `1px solid ${border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#10b981", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>This Week</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: current.color || primaryColor, letterSpacing: -0.3 }}>
            {current.primary}
            <Delta current={current.rawCurrent} last={current.rawLast} />
          </div>
          {current.secondary && <div style={{ fontSize: 11, marginTop: 2, color: mutedColor }}>{current.secondary}</div>}
        </div>

        {/* Next */}
        <div style={{ padding: "10px 10px", background: sideBg }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: labelColor, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>Next</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: mutedColor }}>{next.primary}</div>
          {next.secondary && <div style={{ fontSize: 11, marginTop: 2, color: mutedColor }}>{next.secondary}</div>}
        </div>
      </div>
    </div>
  );
}

export function WeekGlance({ lastWeek, thisWeek, nextWeek, currencyCode, sparklines }: Props) {
  const money = (cents: number) => moneyFmt(cents, currencyCode);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const fillColor = (pct: number | null) => {
    if (pct === null) return undefined;
    if (pct >= 85) return "#10b981";
    if (pct >= 50) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
      <WeekCard
        title="Schedule"
        last={{ primary: `${lastWeek.jobCount} jobs`, secondary: money(lastWeek.scheduledRevenue) }}
        current={{
          primary: `${thisWeek.jobCount} jobs`,
          secondary: `${money(thisWeek.scheduledRevenue)}${thisWeek.fillPct !== null ? ` \u2022 ${thisWeek.fillPct}% filled` : ""}`,
          color: fillColor(thisWeek.fillPct),
          rawCurrent: thisWeek.jobCount, rawLast: lastWeek.jobCount,
        }}
        next={{ primary: `${nextWeek.jobCount} jobs`, secondary: money(nextWeek.scheduledRevenue) }}
        isLight={isLight}
        sparkline={sparklines?.unscheduled}
        sparklineColor="#06b6d4"
      />

      <WeekCard
        title="Completed"
        last={{ primary: money(lastWeek.completedRevenue), secondary: `${lastWeek.completedCount} done` }}
        current={{
          primary: money(thisWeek.completedRevenue),
          secondary: `${thisWeek.completedCount} done${thisWeek.completedCount > 0 ? ` \u2022 avg ${money(Math.round(thisWeek.completedRevenue / thisWeek.completedCount))} each` : ""}`,
          rawCurrent: thisWeek.completedRevenue, rawLast: lastWeek.completedRevenue,
        }}
        next={{ primary: "\u2014" }}
        isLight={isLight}
        sparkline={sparklines?.revenue}
        sparklineColor="#10b981"
      />

      <WeekCard
        title="Collections"
        last={{ primary: money(lastWeek.collectedCents), secondary: `${lastWeek.collectedCount} collected` }}
        current={{
          primary: money(thisWeek.collectedCents),
          secondary: `${thisWeek.collectedCount} collected`,
          rawCurrent: thisWeek.collectedCents, rawLast: lastWeek.collectedCents,
        }}
        next={{ primary: `${nextWeek.invoicesDueCount} due`, secondary: money(nextWeek.invoicesDueCents) }}
        isLight={isLight}
        sparkline={sparklines?.collections}
        sparklineColor="#10b981"
      />

      <WeekCard
        title="Sales"
        last={{ primary: `${lastWeek.quotesWon} won`, secondary: `${lastWeek.quotesSent} sent` }}
        current={{
          primary: `${thisWeek.quotesWon} won`,
          secondary: `${thisWeek.quotesSent} sent${thisWeek.quotesSent > 0 ? ` \u2022 ${Math.round((thisWeek.quotesWon / thisWeek.quotesSent) * 100)}% close rate` : ""}`,
          color: thisWeek.quotesSent > 0 && thisWeek.quotesWon / thisWeek.quotesSent >= 0.4 ? "#10b981" : thisWeek.quotesWon > 0 ? "#f59e0b" : undefined,
          rawCurrent: thisWeek.quotesWon, rawLast: lastWeek.quotesWon,
        }}
        next={{ primary: "\u2014" }}
        isLight={isLight}
        sparkline={sparklines?.pipeline}
        sparklineColor="#5aa6ff"
      />
    </div>
  );
}
