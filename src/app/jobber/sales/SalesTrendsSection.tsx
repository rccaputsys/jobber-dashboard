// src/app/jobber/sales/SalesTrendsSection.tsx
"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { SparkLine } from "../dashboard/SparkLine";
import { trackEvent } from "../dashboard/analytics";

type ChartType = "line" | "bar";
type Granularity = "day" | "week" | "month";

export type WonQuoteEvent = { closedAt: number; amount: number };
export type ClosureEvent = { closedAt: number; won: boolean };

type Props = {
  wonQuoteEvents: WonQuoteEvent[];
  allClosureEvents: ClosureEvent[];
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
  // "all" is handled separately with data-aware start — fallback to 2 years
  if (preset === "all") return { start: addDaysUTC(today, -730), end: today };
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

/* ---- localStorage-backed target hook ---- */
function usePersistedTarget(key: string, fallback: number): [number, (v: number) => void] {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = Number(stored);
        if (!isNaN(parsed) && parsed >= 0) setValue(parsed);
      }
    } catch {}
  }, [key]);
  const set = useCallback((v: number) => {
    setValue(v);
    try { localStorage.setItem(key, String(v)); } catch {}
  }, [key]);
  return [value, set];
}

/* ---- theme hook ---- */
function useIsLight() {
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return isLight;
}

/* ---- Editable target input ---- */
function TargetInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  color: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isLight = useIsLight();

  const displayValue = value > 0
    ? `${prefix || ""}${suffix === "%" ? value : value.toLocaleString()}${suffix || ""}`
    : "Set target";

  function startEdit() {
    setDraft(value > 0 ? String(value) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit() {
    const parsed = Number(draft.replace(/[^0-9.]/g, ""));
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    }
    setEditing(false);
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 12px",
      borderRadius: 10,
      background: isLight ? `${color}10` : `${color}15`,
      border: `1px solid ${isLight ? `${color}30` : `${color}25`}`,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color, whiteSpace: "nowrap" }}>
        {label}
      </span>
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          style={{
            width: 80,
            padding: "4px 8px",
            borderRadius: 6,
            border: `1px solid ${color}`,
            background: isLight ? "#fff" : "rgba(0,0,0,0.3)",
            color: isLight ? "#1e293b" : "#fff",
            fontSize: 13,
            fontWeight: 700,
            outline: "none",
          }}
          placeholder={suffix === "%" ? "e.g. 40" : "e.g. 5000"}
        />
      ) : (
        <button
          onClick={startEdit}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: `1px dashed ${color}50`,
            background: value > 0 ? `${color}18` : "transparent",
            color: value > 0 ? color : (isLight ? "#94a3b8" : "rgba(255,255,255,0.5)"),
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          {displayValue}
        </button>
      )}
    </div>
  );
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
    { key: -1, label: "Last Week" },
    { key: 0, label: "This Week" },
  ];
  const rangeOptions = [
    { key: "thisMonth", label: "This Month" },
    { key: "lastMonth", label: "Last Month" },
    { key: "30d", label: "30D" },
    { key: "8w", label: "8W" },
    { key: "90d", label: "90D" },
    { key: "ytd", label: "YTD" },
    { key: "t12m", label: "12M" },
    { key: "all", label: "All" },
  ];
  const bucketOptions: { key: Granularity; mobileLabel: string; desktopLabel: string }[] = [
    { key: "day", mobileLabel: "D", desktopLabel: "Day" },
    { key: "week", mobileLabel: "W", desktopLabel: "Week" },
    { key: "month", mobileLabel: "M", desktopLabel: "Month" },
  ];
  const chartOptions: { key: ChartType; mobileLabel: string; desktopLabel: string }[] = [
    { key: "line", mobileLabel: "Line", desktopLabel: "Line" },
    { key: "bar", mobileLabel: "Bar", desktopLabel: "Bar" },
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
export function SalesTrendsSection({ wonQuoteEvents, allClosureEvents, currencyCode }: Props) {
  const [weekOffset, setWeekOffsetRaw] = useState<number | null>(null);
  const [range, setRangeRaw] = useState("8w");
  const [g, setGRaw] = useState<Granularity>("week");
  const [chart, setChartRaw] = useState<ChartType>("bar");

  // Persisted targets — weekly and monthly
  const [weeklyRevTarget, setWeeklyRevTarget] = usePersistedTarget("accuinsight_weekly_rev_target", 0);
  const [monthlyRevTarget, setMonthlyRevTarget] = usePersistedTarget("accuinsight_monthly_rev_target", 0);
  const [winRateTarget, setWinRateTarget] = usePersistedTarget("accuinsight_winrate_target", 40);

  const setWeekOffset = useCallback((v: number | null) => { setWeekOffsetRaw(v); trackEvent("sales_control", { control: "week", value: v }); }, []);
  const setRange = useCallback((v: string) => { setRangeRaw(v); trackEvent("sales_control", { control: "range", value: v }); }, []);
  const setG = useCallback((v: Granularity) => { setGRaw(v); trackEvent("sales_control", { control: "granularity", value: v }); }, []);
  const setChart = useCallback((v: ChartType) => { setChartRaw(v); trackEvent("sales_control", { control: "chart_type", value: v }); }, []);

  const money = useMemo(() => (cents: number) => moneyFmt(cents, currencyCode), [currencyCode]);

  // Determine which granularity is actually in effect
  const effectiveGranularity: Granularity = weekOffset !== null ? "day" : g;
  // Determine if we're in a month-scoped view
  const isMonthView = range === "thisMonth" || range === "lastMonth" || range === "t12m" || range === "all" || effectiveGranularity === "month";
  const isWeekView = weekOffset !== null || effectiveGranularity === "week";

  // Pick the right revenue target based on view
  const activeRevTarget = isMonthView && monthlyRevTarget > 0
    ? monthlyRevTarget
    : isWeekView && weeklyRevTarget > 0
    ? weeklyRevTarget
    : weeklyRevTarget; // fallback to weekly

  const activeRevTargetLabel = isMonthView && monthlyRevTarget > 0
    ? "Monthly"
    : "Weekly";

  const { revenuePoints, winRatePoints, weightedWinRate } = useMemo(() => {
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

      // For "all", find earliest data point so we don't create empty buckets
      if (range === "all") {
        const allTimestamps = [...wonQuoteEvents.map(e => e.closedAt), ...allClosureEvents.map(e => e.closedAt)];
        if (allTimestamps.length > 0) {
          const earliest = new Date(Math.min(...allTimestamps));
          start = bucketStartUTC(earliest, granularity);
        }
      }
    }

    const endExclusive = addDaysUTC(end, 1);

    const today = startOfDayUTC(new Date());
    const todayTs = today.getTime();
    const starts: Date[] = [];
    let cur = bucketStartUTC(start, granularity);
    while (cur.getTime() < endExclusive.getTime()) {
      const bucketEnd = nextBucketUTC(cur, granularity);
      if (granularity !== "day" && bucketEnd.getTime() > todayTs + 86400000) {
        cur = bucketEnd; continue;
      }
      starts.push(cur);
      if (bucketEnd.getTime() === cur.getTime()) break;
      cur = bucketEnd;
      if (starts.length > 200) break;
    }

    const revPts = starts.map((bs) => {
      const bsTs = bs.getTime();
      const beTs = nextBucketUTC(bs, granularity).getTime();
      let sum = 0;
      let cnt = 0;
      for (const ev of wonQuoteEvents) {
        if (ev.closedAt >= bsTs && ev.closedAt < beTs) {
          sum += ev.amount;
          cnt += 1;
        }
      }
      const xLabel = labelForBucket(bs, granularity);
      return { xLabel, value: sum, tooltip: `${xLabel}: ${money(sum)}`, hoverLabel: `${cnt} won ${cnt !== 1 ? "quotes" : "quote"}`, sum, cnt };
    });

    // No more rolling-average coloring — target coloring handles it in SparkLine
    const revPointsFinal = revPts.map((p) => ({
      xLabel: p.xLabel, value: p.value, tooltip: p.tooltip, hoverLabel: p.hoverLabel,
    }));

    const wrPts = starts.map((bs) => {
      const bsTs = bs.getTime();
      const beTs = nextBucketUTC(bs, granularity).getTime();
      let won = 0;
      let lost = 0;
      for (const ev of allClosureEvents) {
        if (ev.closedAt >= bsTs && ev.closedAt < beTs) {
          if (ev.won) won++; else lost++;
        }
      }
      const denom = won + lost;
      const rate = denom > 0 ? (won / denom) * 100 : 0;
      const xLabel = labelForBucket(bs, granularity);
      return {
        xLabel,
        value: rate,
        tooltip: `${xLabel}: ${rate.toFixed(0)}%`,
        hoverLabel: `${won}W / ${lost}L`,
      };
    });

    // Weighted win rate average: total won / total closures across visible range
    const rangeStartMs = start.getTime();
    const rangeEndMs = addDaysUTC(end, 1).getTime();
    let totalWon = 0, totalClosures = 0;
    for (const ev of allClosureEvents) {
      if (ev.closedAt >= rangeStartMs && ev.closedAt < rangeEndMs) {
        totalClosures++;
        if (ev.won) totalWon++;
      }
    }
    const weightedWinRate = totalClosures > 0 ? (totalWon / totalClosures) * 100 : 0;

    return { revenuePoints: revPointsFinal, winRatePoints: wrPts, weightedWinRate };
  }, [weekOffset, range, g, wonQuoteEvents, allClosureEvents, money]);

  const hasData = wonQuoteEvents.length > 0 || allClosureEvents.length > 0;

  // Convert revenue target from dollars to cents for the chart
  const revTargetCents = activeRevTarget > 0 ? activeRevTarget * 100 : 0;

  return (
    <div className="panel animate-in delay-2" style={{ padding: 0, marginTop: 16, overflow: "visible", position: "relative", zIndex: 10 }}>
      <div style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              Sales Trends
            </h2>
            <span className="info-tooltip">?<span className="tooltip-text">Sales won and win rate over time. Set weekly and monthly targets — the chart automatically uses the right one based on your selected view.</span></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <TargetInput
              label="Weekly Sales Target"
              value={weeklyRevTarget}
              onChange={setWeeklyRevTarget}
              prefix="$"
              color="#10b981"
            />
            <TargetInput
              label="Monthly Sales Target"
              value={monthlyRevTarget}
              onChange={setMonthlyRevTarget}
              prefix="$"
              color="#10b981"
            />
            <TargetInput
              label="Win Rate Target"
              value={winRateTarget}
              onChange={setWinRateTarget}
              suffix="%"
              color="#5aa6ff"
            />
          </div>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, padding: "0 16px 16px" }} className="sales-chart-grid">
          <style>{`@media (min-width: 768px) { .sales-chart-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 16px !important; } }`}</style>
          <SparkLine
            title="Sales Won"
            subtitle={`Sales from won quotes \u00B7 ${activeRevTargetLabel} target`}
            points={revenuePoints}
            formatType="money"
            chartType={chart}
            color="#10b981"
            invertChangeColor={false}
            targetValue={revTargetCents > 0 ? revTargetCents : undefined}
          />
          <SparkLine
            title="Win Rate"
            subtitle="Won / (Won + Lost) per period"
            points={winRatePoints}
            formatType="percent"
            chartType={chart}
            color="#5aa6ff"
            invertChangeColor={false}
            targetValue={winRateTarget > 0 ? winRateTarget : undefined}
            overrideAvg={weightedWinRate}
          />
        </div>
      )}
    </div>
  );
}
