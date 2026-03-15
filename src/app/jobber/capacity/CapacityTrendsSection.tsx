// src/app/jobber/capacity/CapacityTrendsSection.tsx
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { SparkLine } from "../dashboard/SparkLine";
import { trackEvent } from "../dashboard/analytics";

type ChartType = "line" | "bar";
type Granularity = "day" | "week" | "month";

export type JobEvent = { scheduledAt: number; amount: number };

type Props = {
  jobEvents: JobEvent[];
  targetCents: number | null;
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
  if (preset === "30d") return { start: addDaysUTC(today, -30), end: today };
  if (preset === "90d") return { start: addDaysUTC(today, -90), end: today };
  if (preset === "ytd") return { start: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)), end: today };
  return { start: addDaysUTC(today, -56), end: today }; // 8w default
}

/* ---- responsive hook ---- */
function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const check = () => setM(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return m;
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
  const [isLight, setIsLight] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const weekOptions = [
    { key: -1, label: "Last Wk" },
    { key: 0, label: "This Wk" },
    { key: 1, label: "Next Wk" },
  ];
  const rangeOptions = [
    { key: "30d", label: "30D" },
    { key: "8w", label: "8W" },
    { key: "90d", label: "90D" },
    { key: "ytd", label: "YTD" },
  ];
  const bucketOptions: { key: Granularity; mobileLabel: string; desktopLabel: string }[] = [
    { key: "day", mobileLabel: "D", desktopLabel: "Day" },
    { key: "week", mobileLabel: "W", desktopLabel: "Week" },
    { key: "month", mobileLabel: "M", desktopLabel: "Month" },
  ];
  const chartOptions: { key: ChartType; mobileLabel: string; desktopLabel: string }[] = [
    { key: "line", mobileLabel: "\u{1F4C8}", desktopLabel: "Line" },
    { key: "bar", mobileLabel: "\u{1F4CA}", desktopLabel: "Bar" },
  ];

  const btnStyle = (active: boolean, h: boolean): React.CSSProperties => ({
    padding: "8px 12px", borderRadius: 8, border: "none",
    background: active ? "linear-gradient(135deg, #7c5cff, #5aa6ff)" : h ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)") : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
    boxShadow: active ? "0 4px 12px rgba(124,92,255,0.3)" : "none", whiteSpace: "nowrap",
  });
  const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)", marginRight: 8, whiteSpace: "nowrap" };
  const pillGroup: React.CSSProperties = { display: "flex", gap: 2, background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3 };

  return (
    <div>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 8 : 12, flexWrap: "wrap" }}>
        {/* Week nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, justifyContent: isMobile ? "space-between" : "flex-start" }}>
          <div style={pillGroup}>
            {weekOptions.map((o) => (
              <button key={o.key} onClick={() => {
                if (weekOffset === o.key) { setWeekOffset(null); }
                else { setWeekOffset(o.key); }
              }} onMouseEnter={() => setHovered(`w-${o.key}`)} onMouseLeave={() => setHovered(null)} style={btnStyle(weekOffset === o.key, hovered === `w-${o.key}`)}>{o.label}</button>
            ))}
          </div>
        </div>
        {!isMobile && <div style={{ width: 1, height: 28, background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)", flexShrink: 0 }} />}
        {/* Range */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, justifyContent: isMobile ? "space-between" : "flex-start" }}>
          <span style={labelStyle}>Range</span>
          <div style={pillGroup}>
            {rangeOptions.map((o) => (
              <button key={o.key} onClick={() => { setRange(o.key); setWeekOffset(null); }} onMouseEnter={() => setHovered(`r-${o.key}`)} onMouseLeave={() => setHovered(null)} style={btnStyle(weekOffset === null && range === o.key, hovered === `r-${o.key}`)}>{o.label}</button>
            ))}
          </div>
        </div>
        {!isMobile && <div style={{ width: 1, height: 28, background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)", flexShrink: 0 }} />}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 12, justifyContent: isMobile ? "space-between" : "flex-start" }}>
          {/* Group */}
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <span style={labelStyle}>Group</span>
            <div style={pillGroup}>
              {bucketOptions.map((o) => (
                <button key={o.key} onClick={() => { setG(o.key); if (weekOffset !== null) setWeekOffset(null); }} onMouseEnter={() => setHovered(`g-${o.key}`)} onMouseLeave={() => setHovered(null)} style={btnStyle(weekOffset === null && g === o.key, hovered === `g-${o.key}`)}>{isMobile ? o.mobileLabel : o.desktopLabel}</button>
              ))}
            </div>
          </div>
          {!isMobile && <div style={{ width: 1, height: 28, background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)", flexShrink: 0 }} />}
          {/* Chart */}
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
export function CapacityTrendsSection({ jobEvents, targetCents, currencyCode }: Props) {
  const [weekOffset, setWeekOffsetRaw] = useState<number | null>(null);
  const [range, setRangeRaw] = useState("8w");
  const [g, setGRaw] = useState<Granularity>("week");
  const [chart, setChartRaw] = useState<ChartType>("bar");

  const setWeekOffset = useCallback((v: number | null) => { setWeekOffsetRaw(v); trackEvent("capacity_control", { control: "week", value: v }); }, []);
  const setRange = useCallback((v: string) => { setRangeRaw(v); trackEvent("capacity_control", { control: "range", value: v }); }, []);
  const setG = useCallback((v: Granularity) => { setGRaw(v); trackEvent("capacity_control", { control: "granularity", value: v }); }, []);
  const setChart = useCallback((v: ChartType) => { setChartRaw(v); trackEvent("capacity_control", { control: "chart_type", value: v }); }, []);

  const money = useMemo(() => (cents: number) => moneyFmt(cents, currencyCode), [currencyCode]);

  // Compute the effective target per-bucket based on granularity and weekly target
  const effectiveTarget = useMemo(() => {
    if (!targetCents) return null;
    if (g === "day" || weekOffset !== null) return Math.round(targetCents / 7); // daily target
    if (g === "week") return targetCents;
    // monthly: ~4.33 weeks per month
    return Math.round(targetCents * 4.33);
  }, [targetCents, g, weekOffset]);

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

    // Scheduled Revenue: sum amount by scheduled_at bucket
    const revPts = starts.map((bs, i) => {
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

      // Color logic: vs target if available, else rolling avg
      let pointColor: string | undefined;
      if (effectiveTarget && effectiveTarget > 0) {
        const ratio = sum / effectiveTarget;
        if (ratio >= 0.9) pointColor = "#10b981";
        else if (ratio >= 0.5) pointColor = "#f59e0b";
        else pointColor = "#ef4444";
      } else if (i > 0) {
        // Rolling 4-period avg fallback
        const lookbackRevs = starts.slice(Math.max(0, i - 4), i).map((lbs) => {
          const lbsTs = lbs.getTime();
          const lbeTs = nextBucketUTC(lbs, granularity).getTime();
          let lSum = 0;
          for (const ev of jobEvents) {
            if (ev.scheduledAt >= lbsTs && ev.scheduledAt < lbeTs) lSum += ev.amount;
          }
          return lSum;
        });
        const avgVal = lookbackRevs.length > 0 ? lookbackRevs.reduce((s, v) => s + v, 0) / lookbackRevs.length : 0;
        if (avgVal > 0) {
          const ratio = sum / avgVal;
          if (ratio >= 1.1) pointColor = "#10b981";
          else if (ratio >= 0.8) pointColor = "#f59e0b";
          else pointColor = "#ef4444";
        }
      }

      return {
        xLabel, value: sum,
        tooltip: `${xLabel}: ${money(sum)}`,
        hoverLabel: `${cnt} ${cnt !== 1 ? "jobs" : "job"}`,
        pointColor,
      };
    });

    // Job Count: count jobs per bucket (neutral blue, no color coding)
    const cntPts = starts.map((bs) => {
      const bsTs = bs.getTime();
      const beTs = nextBucketUTC(bs, granularity).getTime();
      let cnt = 0;
      for (const ev of jobEvents) {
        if (ev.scheduledAt >= bsTs && ev.scheduledAt < beTs) cnt += 1;
      }
      const xLabel = labelForBucket(bs, granularity);
      return {
        xLabel, value: cnt,
        tooltip: `${xLabel}: ${cnt} jobs`,
        hoverLabel: undefined as string | undefined,
      };
    });

    return { revenuePoints: revPts, countPoints: cntPts };
  }, [weekOffset, range, g, jobEvents, money, effectiveTarget]);

  const hasData = jobEvents.length > 0;

  const targetLabel = effectiveTarget ? `Target: ${money(effectiveTarget)}` : undefined;

  return (
    <div className="panel animate-in delay-2" style={{ padding: 0, marginTop: 20 }}>
      <div style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
            Capacity Trend
          </h2>
          <span className="info-tooltip">?<span className="tooltip-text">Scheduled revenue and job count over time. Bars are color-coded vs your weekly target (green = 90%+, amber = 50-89%, red = under 50%). The dashed line shows your target.</span></span>
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
            targetLabel={targetLabel}
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
