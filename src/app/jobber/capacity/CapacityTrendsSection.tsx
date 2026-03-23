// src/app/jobber/capacity/CapacityTrendsSection.tsx
"use client";

import { useState, useMemo, useCallback } from "react";
import { useIsLight, useIsMobile } from "@/lib/hooks";
import { SparkLine } from "../dashboard/SparkLine";
import { trackEvent } from "../dashboard/analytics";

type ChartType = "line" | "bar";
type Granularity = "day" | "week" | "month";

export type JobEvent = { scheduledAt: number; amount: number };

type Props = {
  jobEvents: JobEvent[];
  targetCents: number | null;
  monthlyTargetCents?: number | null;
  currencyCode: string;
};

/* ---- date helpers ---- */
function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function addDaysUTC(d: Date, n: number) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function startOfWeekUTC(d: Date) {
  const x = startOfDayUTC(d);
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x;
}
function startOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function bucketStartUTC(d: Date, g: Granularity) {
  if (g === "day") return startOfDayUTC(d);
  if (g === "week") return startOfWeekUTC(d);
  return startOfMonthUTC(d);
}
function nextBucketUTC(d: Date, g: Granularity) {
  if (g === "day") return addDaysUTC(d, 1);
  if (g === "week") return addDaysUTC(d, 7);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}
function labelForBucket(d: Date, g: Granularity) {
  const y = d.getUTCFullYear();
  const m = d.toLocaleString(undefined, { month: "short", timeZone: "UTC" });
  const day = d.getUTCDate();
  if (g === "day") return `${m} ${day}`;
  if (g === "week") return `${m} ${day}`;
  return `${m} ${y.toString().slice(2)}`;
}

function moneyFmt(cents: number, code: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: code, maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", maximumFractionDigits: 0,
    }).format(cents / 100);
  }
}

function defaultRange(preset: string) {
  const today = startOfDayUTC(new Date());
  if (preset === "thisMonth") return { start: startOfMonthUTC(today), end: today };
  if (preset === "lastMonth") {
    const lastMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const thisMonthStart = startOfMonthUTC(today);
    return { start: lastMonthStart, end: addDaysUTC(thisMonthStart, -1) };
  }
  if (preset === "30d") return { start: addDaysUTC(today, -30), end: today };
  if (preset === "90d") return { start: addDaysUTC(today, -90), end: today };
  if (preset === "ytd") return { start: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)), end: today };
  if (preset === "t12m") return { start: addDaysUTC(today, -365), end: today };
  if (preset === "all") return { start: addDaysUTC(today, -730), end: today };
  return { start: addDaysUTC(today, -56), end: today };
}

/* ---- Inline Controls ---- */
function InlineControls({
  weekOffset, setWeekOffset,
  range, setRange, g, setG, chart, setChart,
}: {
  weekOffset: number | null; setWeekOffset: (v: number | null) => void;
  range: string; setRange: (v: string) => void;
  g: Granularity; setG: (v: Granularity) => void;
  chart: ChartType; setChart: (v: ChartType) => void;
}) {
  const isLight = useIsLight();
  const [hovered, setHovered] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const weekOptions = [
    { key: -1, label: "Last Wk" },
    { key: 0, label: "This Wk" },
    { key: 1, label: "Next Wk" },
  ];
  const rangeOptions = [
    { key: "thisMonth", label: isMobile ? "Mo" : "This Mo" },
    { key: "lastMonth", label: isMobile ? "Last" : "Last Mo" },
    { key: "30d", label: "30D" },
    { key: "8w", label: "8W" },
    { key: "90d", label: "90D" },
    { key: "ytd", label: "YTD" },
    { key: "t12m", label: "12M" },
    { key: "all", label: "All" },
  ];
  const bucketOptions: { key: Granularity; mobileLabel: string; desktopLabel: string }[] = [
    { key: "day", mobileLabel: "D", desktopLabel: "Day" },
    { key: "week", mobileLabel: "W", desktopLabel: "Wk" },
    { key: "month", mobileLabel: "M", desktopLabel: "Mo" },
  ];
  const chartOptions: { key: ChartType; mobileLabel: string; desktopLabel: string }[] = [
    { key: "line", mobileLabel: "L", desktopLabel: "Line" },
    { key: "bar", mobileLabel: "B", desktopLabel: "Bar" },
  ];

  const btnStyle = (active: boolean, h: boolean): React.CSSProperties => ({
    padding: "5px 8px", borderRadius: 6, border: "none",
    background: active ? "linear-gradient(135deg, #7c5cff, #5aa6ff)" : h ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)") : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
    boxShadow: active ? "0 2px 8px rgba(124,92,255,0.3)" : "none", whiteSpace: "nowrap",
  });
  const labelStyle: React.CSSProperties = { fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)", marginRight: 6, whiteSpace: "nowrap" };
  const pillGroup: React.CSSProperties = { display: "flex", gap: 1, background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)", borderRadius: 8, padding: 2 };

  return (
    <div>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 6 : 8, flexWrap: "nowrap", overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, justifyContent: isMobile ? "space-between" : "flex-start" }}>
          <div style={pillGroup}>
            {weekOptions.map((o) => (
              <button key={o.key} onClick={() => { if (weekOffset === o.key) setWeekOffset(null); else setWeekOffset(o.key); }} onMouseEnter={() => setHovered(`w-${o.key}`)} onMouseLeave={() => setHovered(null)} style={btnStyle(weekOffset === o.key, hovered === `w-${o.key}`)}>{o.label}</button>
            ))}
          </div>
        </div>
        {!isMobile && <div style={{ width: 1, height: 22, background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)", flexShrink: 0 }} />}
        <div style={{ display: "flex", alignItems: "center", gap: 0, justifyContent: isMobile ? "space-between" : "flex-start" }}>
          <span style={labelStyle}>Range</span>
          <div style={pillGroup}>
            {rangeOptions.map((o) => (
              <button key={o.key} onClick={() => { setRange(o.key); setWeekOffset(null); }} onMouseEnter={() => setHovered(`r-${o.key}`)} onMouseLeave={() => setHovered(null)} style={btnStyle(weekOffset === null && range === o.key, hovered === `r-${o.key}`)}>{o.label}</button>
            ))}
          </div>
        </div>
        {!isMobile && <div style={{ width: 1, height: 22, background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)", flexShrink: 0 }} />}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 12, justifyContent: isMobile ? "space-between" : "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <span style={labelStyle}>Group</span>
            <div style={pillGroup}>
              {bucketOptions.map((o) => (
                <button key={o.key} onClick={() => { setG(o.key); if (weekOffset !== null) setWeekOffset(null); }} onMouseEnter={() => setHovered(`g-${o.key}`)} onMouseLeave={() => setHovered(null)} style={btnStyle(weekOffset === null && g === o.key, hovered === `g-${o.key}`)}>{isMobile ? o.mobileLabel : o.desktopLabel}</button>
              ))}
            </div>
          </div>
          {!isMobile && <div style={{ width: 1, height: 22, background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)", flexShrink: 0 }} />}
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <span style={labelStyle}>Chart</span>
            <div style={pillGroup}>
              {chartOptions.map((o) => (
                <button key={o.key} onClick={() => setChart(o.key)} onMouseEnter={() => setHovered(`c-${o.key}`)} onMouseLeave={() => setHovered(null)} style={btnStyle(chart === o.key, hovered === `c-${o.key}`)}>{isMobile ? o.mobileLabel : o.desktopLabel}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Main Component ---- */
export function CapacityTrendsSection({ jobEvents, targetCents, monthlyTargetCents, currencyCode }: Props) {
  const [weekOffset, setWeekOffsetRaw] = useState<number | null>(null);
  const [range, setRangeRaw] = useState("8w");
  const [g, setGRaw] = useState<Granularity>("week");
  const [chart, setChartRaw] = useState<ChartType>("bar");

  const setWeekOffset = useCallback((v: number | null) => { setWeekOffsetRaw(v); trackEvent("capacity_control", { control: "week", value: v }); }, []);
  const setRange = useCallback((v: string) => { setRangeRaw(v); trackEvent("capacity_control", { control: "range", value: v }); }, []);
  const setG = useCallback((v: Granularity) => { setGRaw(v); trackEvent("capacity_control", { control: "granularity", value: v }); }, []);
  const setChart = useCallback((v: ChartType) => { setChartRaw(v); trackEvent("capacity_control", { control: "chart_type", value: v }); }, []);

  const money = useMemo(() => (cents: number) => moneyFmt(cents, currencyCode), [currencyCode]);

  const effectiveGranularity: Granularity = weekOffset !== null ? "day" : g;

  // Compute the effective target per-bucket
  const effectiveTarget = useMemo(() => {
    if (!targetCents && !monthlyTargetCents) return null;
    if (effectiveGranularity === "day") return targetCents ? Math.round(targetCents / 5) : null; // 5 working days
    if (effectiveGranularity === "week") return targetCents;
    // Monthly: use explicit monthly target if set, otherwise scale weekly
    return monthlyTargetCents ?? (targetCents ? Math.round(targetCents * 4.33) : null);
  }, [targetCents, monthlyTargetCents, effectiveGranularity]);

  const { revenuePoints, countPoints } = useMemo(() => {
    let start: Date, end: Date, granularity: Granularity;

    if (weekOffset !== null) {
      const today = startOfDayUTC(new Date());
      const thisWeekStart = startOfWeekUTC(today);
      start = addDaysUTC(thisWeekStart, weekOffset * 7);
      end = addDaysUTC(start, 6);
      granularity = "day";
    } else {
      const r = defaultRange(range);
      start = r.start;
      end = r.end;
      granularity = g;

      if (range === "all") {
        const allTimestamps = jobEvents.map(e => e.scheduledAt);
        if (allTimestamps.length > 0) {
          start = bucketStartUTC(new Date(Math.min(...allTimestamps)), granularity);
        }
      }
    }

    const endExclusive = addDaysUTC(end, 1);
    const starts: Date[] = [];
    let cur = bucketStartUTC(start, granularity);
    while (cur.getTime() < endExclusive.getTime()) {
      starts.push(cur);
      const nxt = nextBucketUTC(cur, granularity);
      if (nxt.getTime() === cur.getTime()) break;
      cur = nxt;
      if (starts.length > 200) break;
    }

    const revPts = starts.map((bs) => {
      const bsTs = bs.getTime();
      const beTs = nextBucketUTC(bs, granularity).getTime();
      let sum = 0;
      let cnt = 0;
      for (const ev of jobEvents) {
        if (ev.scheduledAt >= bsTs && ev.scheduledAt < beTs) {
          sum += ev.amount;
          cnt += 1;
        }
      }
      const xLabel = labelForBucket(bs, granularity);
      return { xLabel, value: sum, tooltip: `${xLabel}: ${money(sum)}`, hoverLabel: `${cnt} ${cnt !== 1 ? "jobs" : "job"}` };
    });

    const cntPts = starts.map((bs) => {
      const bsTs = bs.getTime();
      const beTs = nextBucketUTC(bs, granularity).getTime();
      let cnt = 0;
      for (const ev of jobEvents) {
        if (ev.scheduledAt >= bsTs && ev.scheduledAt < beTs) cnt += 1;
      }
      const xLabel = labelForBucket(bs, granularity);
      return { xLabel, value: cnt, tooltip: `${xLabel}: ${cnt} jobs`, hoverLabel: undefined as string | undefined };
    });

    return { revenuePoints: revPts, countPoints: cntPts };
  }, [weekOffset, range, g, jobEvents, money]);

  const hasData = jobEvents.length > 0;

  return (
    <div className="panel animate-in delay-2" style={{ padding: 0, marginTop: 16, overflow: "visible", position: "relative", zIndex: 10 }}>
      <div style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
            Capacity Trends
          </h2>
          <span className="info-tooltip">?<span className="tooltip-text">Scheduled revenue and job count over time. Bars are color-coded vs your weekly capacity target when set.</span></span>
        </div>
        <InlineControls
          weekOffset={weekOffset} setWeekOffset={setWeekOffset}
          range={range} setRange={setRange}
          g={g} setG={setG}
          chart={chart} setChart={setChart}
        />
      </div>

      {!hasData ? (
        <div className="text-muted" style={{ padding: "24px 16px", textAlign: "center", fontSize: 14 }}>
          No data yet — sync to populate
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, padding: "0 16px 16px" }} className="capacity-chart-grid">
          <style>{`@media (min-width: 768px) { .capacity-chart-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 16px !important; } }`}</style>
          <SparkLine
            title="Scheduled Revenue"
            subtitle="Revenue from scheduled jobs"
            points={revenuePoints}
            formatType="money"
            chartType={chart}
            color="#10b981"
            invertChangeColor={false}
            targetValue={effectiveTarget ?? undefined}
            penalizeOverTarget
          />
          <SparkLine
            title="Jobs Scheduled"
            subtitle="Number of jobs per period"
            points={countPoints}
            formatType="number"
            chartType={chart}
            color="#5aa6ff"
            invertChangeColor={false}
          />
        </div>
      )}
    </div>
  );
}
