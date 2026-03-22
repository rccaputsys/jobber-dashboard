"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { SparkLine } from "./SparkLine";
import { trackEvent } from "./analytics";

type ChartType = "line" | "bar";
type Granularity = "day" | "week" | "month" | "quarter";

/** Compact event: { enterAt: ms, exitAt: ms | null, amount: cents } */
export type TrendEvent = { enterAt: number; exitAt: number | null; amount: number };

type Props = {
  leakEvents: TrendEvent[];
  arEvents: TrendEvent[];
  unschedEvents: TrendEvent[];
  currencyCode: string;
  currentPipelineCents?: number;
  currentOverdueCents?: number;
  currentUnschedCents?: number;
};

/* ---- date helpers (duplicated from page to keep client bundle small) ---- */
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
function startOfQuarterUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1));
}
function bucketStartUTC(d: Date, g: Granularity) {
  if (g === "day") return startOfDayUTC(d);
  if (g === "week") return startOfWeekUTC(d);
  if (g === "month") return startOfMonthUTC(d);
  return startOfQuarterUTC(d);
}
function nextBucketUTC(d: Date, g: Granularity) {
  if (g === "day") return addDaysUTC(d, 1);
  if (g === "week") return addDaysUTC(d, 7);
  if (g === "month") return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, 1));
}
function labelForBucket(d: Date, g: Granularity) {
  const y = d.getUTCFullYear();
  const m = d.toLocaleString(undefined, { month: "short", timeZone: "UTC" });
  const day = d.getUTCDate();
  if (g === "day") return `${m} ${day}`;
  if (g === "week") return `${m} ${day}`;
  if (g === "month") return `${m} ${y.toString().slice(2)}`;
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `Q${q} ${y.toString().slice(2)}`;
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
  if (preset === "7d") return { start: addDaysUTC(today, -7), end: today };
  if (preset === "30d") return { start: addDaysUTC(today, -30), end: today };
  if (preset === "90d") return { start: addDaysUTC(today, -90), end: today };
  if (preset === "ytd") return { start: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)), end: today };
  return { start: addDaysUTC(today, -56), end: today }; // 8w default
}

/* ---- Controls (inline, no URL navigation) ---- */
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

function InlineControls({
  range, setRange, g, setG, chart, setChart,
}: {
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

  const rangeOptions = [
    { key: "7d", label: "7D", fullLabel: "7 Days" },
    { key: "30d", label: "30D", fullLabel: "30 Days" },
    { key: "8w", label: "8W", fullLabel: "8 Weeks" },
    { key: "90d", label: "90D", fullLabel: "90 Days" },
    { key: "ytd", label: "YTD", fullLabel: "Year to Date" },
  ];
  const bucketOptions: { key: Granularity; mobileLabel: string; desktopLabel: string }[] = [
    { key: "day", mobileLabel: "D", desktopLabel: "Day" },
    { key: "week", mobileLabel: "W", desktopLabel: "Week" },
    { key: "month", mobileLabel: "M", desktopLabel: "Month" },
    { key: "quarter", mobileLabel: "Q", desktopLabel: "Qtr" },
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
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 8 : 12 }}>
        {/* Range */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, justifyContent: isMobile ? "space-between" : "flex-start" }}>
          <span style={labelStyle}>Range</span>
          <div style={pillGroup}>
            {rangeOptions.map((o) => (
              <button key={o.key} onClick={() => setRange(o.key)} onMouseEnter={() => setHovered(`r-${o.key}`)} onMouseLeave={() => setHovered(null)} style={btnStyle(range === o.key, hovered === `r-${o.key}`)} title={o.fullLabel}>{o.label}</button>
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
                <button key={o.key} onClick={() => setG(o.key)} onMouseEnter={() => setHovered(`g-${o.key}`)} onMouseLeave={() => setHovered(null)} style={btnStyle(g === o.key, hovered === `g-${o.key}`)} title={o.desktopLabel}>{isMobile ? o.mobileLabel : o.desktopLabel}</button>
              ))}
            </div>
          </div>
          {!isMobile && <div style={{ width: 1, height: 28, background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)", flexShrink: 0 }} />}
          {/* Chart */}
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <span style={labelStyle}>Chart</span>
            <div style={pillGroup}>
              {chartOptions.map((o) => (
                <button key={o.key} onClick={() => setChart(o.key)} onMouseEnter={() => setHovered(`c-${o.key}`)} onMouseLeave={() => setHovered(null)} style={btnStyle(chart === o.key, hovered === `c-${o.key}`)} title={o.desktopLabel}>{isMobile ? o.mobileLabel : o.desktopLabel}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- compute point-in-time buckets from events ---- */
function computePoints(
  events: TrendEvent[],
  bucketStarts: Date[],
  g: Granularity,
  money: (c: number) => string,
  label: string,
  unitSingular: string,
  unitPlural: string,
) {
  return bucketStarts.map((bs) => {
    const bucketEndTs = nextBucketUTC(bs, g).getTime();
    let sum = 0;
    let cnt = 0;
    for (const ev of events) {
      if (ev.enterAt < bucketEndTs && (ev.exitAt === null || ev.exitAt >= bucketEndTs)) {
        sum += ev.amount;
        cnt += 1;
      }
    }
    const xLabel = labelForBucket(bs, g);
    return {
      xLabel,
      value: sum,
      tooltip: `${xLabel}: ${money(sum)} ${label}`,
      hoverLabel: `${cnt} ${cnt !== 1 ? unitPlural : unitSingular}`,
    };
  });
}

/* ---- Main Component ---- */
export function TrendsSection({ leakEvents, arEvents, unschedEvents, currencyCode, currentPipelineCents, currentOverdueCents, currentUnschedCents }: Props) {
  const sp = useSearchParams();

  // Initialize from URL params, then manage locally
  const [range, setRangeRaw] = useState(sp.get("range") ?? "8w");
  const [g, setGRaw] = useState<Granularity>((sp.get("g") as Granularity) ?? "week");
  const [chart, setChartRaw] = useState<ChartType>((sp.get("chart") as ChartType) ?? "line");

  const setRange = useCallback((v: string) => { setRangeRaw(v); trackEvent("sparkline_control", { control: "range", value: v }); }, []);
  const setG = useCallback((v: Granularity) => { setGRaw(v); trackEvent("sparkline_control", { control: "granularity", value: v }); }, []);
  const setChart = useCallback((v: ChartType) => { setChartRaw(v); trackEvent("sparkline_control", { control: "chart_type", value: v }); }, []);

  const money = useMemo(() => (cents: number) => moneyFmt(cents, currencyCode), [currencyCode]);

  const { bucketStarts, leakPoints, ar15Points, unschedPoints } = useMemo(() => {
    const { start, end } = defaultRange(range);
    const endExclusive = addDaysUTC(end, 1);

    const today = startOfDayUTC(new Date());
    const todayTs = today.getTime();
    const starts: Date[] = [];
    let cur = bucketStartUTC(start, g);
    while (cur.getTime() < endExclusive.getTime()) {
      // Exclude the current incomplete period (its end hasn't arrived yet)
      const bucketEnd = nextBucketUTC(cur, g);
      if (bucketEnd.getTime() > todayTs + 86400000) {
        // This bucket's end is after today — it's incomplete, skip it
        // Exception: for "day" granularity, include today
        if (g !== "day") { cur = bucketEnd; continue; }
      }
      starts.push(cur);
      if (bucketEnd.getTime() === cur.getTime()) break;
      cur = bucketEnd;
      if (starts.length > 200) break;
    }

    return {
      bucketStarts: starts,
      leakPoints: computePoints(leakEvents, starts, g, money, "quote leak balance", "quote", "quotes"),
      ar15Points: computePoints(arEvents, starts, g, money, "invoices 15+ days", "invoice", "invoices"),
      unschedPoints: computePoints(unschedEvents, starts, g, money, "unscheduled", "job", "jobs"),
    };
  }, [range, g, leakEvents, arEvents, unschedEvents, money]);

  return (
    <div className="panel" style={{ padding: 0 }}>
      <div style={{ padding: "12px 16px" }}>
        <InlineControls range={range} setRange={setRange} g={g} setG={setG} chart={chart} setChart={setChart} />
      </div>

      <div className="chart-grid" style={{ padding: "0 16px 16px" }}>
        <SparkLine title="Pipeline" subtitle="Open quote value over time" points={leakPoints} formatType="money" chartType={chart} color="#5aa6ff"
          overrideAvg={currentPipelineCents} overrideAvgLabel="Current Total" />
        <SparkLine title="Unscheduled Work" subtitle="Backlog value over time" points={unschedPoints} formatType="money" chartType={chart} color="#06b6d4"
          overrideAvg={currentUnschedCents} overrideAvgLabel="Current" />
        <SparkLine title="Overdue Invoices" subtitle="Past-due balance over time" points={ar15Points} formatType="money" chartType={chart} color="#f59e0b"
          overrideAvg={currentOverdueCents} overrideAvgLabel="Current" />
      </div>
    </div>
  );
}
