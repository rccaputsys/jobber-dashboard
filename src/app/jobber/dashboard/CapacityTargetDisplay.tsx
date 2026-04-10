"use client";

import { useState } from "react";
import { useIsLight } from "@/lib/hooks";
import { useCapacityMeasure } from "./useCapacityMeasure";

type DayData = {
  day: string;
  scheduledCents: number;
  targetCents: number;
  isToday: boolean;
  isWorkDay: boolean;
  jobCount: number;
};

type WeekSet = {
  label: string;
  days: DayData[];
  bookedCents: number;
};

type HeatmapWeek = {
  label: string;
  isCurrent: boolean;
  days: DayData[];
};

type Props = {
  weeklyTargetCents: number;
  weeks: WeekSet[];
  defaultWeek?: number;
  currencyCode: string;
  settingsHref: string;
  adminConnectionId?: string;
  workDays?: string[];
  dailyTargets?: Record<string, number>;
  heatmapWeeks?: HeatmapWeek[];
  heatmapTotalBooked?: number;
  /** Per-view header rendered above the separator line. Index 0..weeks.length-1
   *  for week views; if heatmap is shown, index `weeks.length` is its header. */
  headers?: React.ReactNode[];
};

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function moneyFmt(cents: number, code: string): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100); }
  catch { return `$${Math.round(cents / 100).toLocaleString()}`; }
}

/** Compact money for tight spaces: $999 → $1.1k → $15k → $1.2m */
function moneyCompact(cents: number): string {
  const dollars = Math.round(cents / 100);
  if (dollars < 1000) return `$${dollars}`;
  if (dollars < 10000) return `$${(dollars / 1000).toFixed(1)}k`;
  if (dollars < 1000000) return `$${Math.round(dollars / 1000)}k`;
  return `$${(dollars / 1000000).toFixed(1)}m`;
}

/* ---- RPM Gauge (tachometer style) ---- */
function RPMGauge({ pct, money, label, size = 180, isLight, mini }: {
  pct: number;
  money: string;
  label?: string;
  size?: number;
  isLight: boolean;
  mini?: boolean;
}) {
  const strokeW = mini ? 8 : 14;
  const r = (size - strokeW) / 2;
  const cx = size / 2;
  const cy = size / 2 + (mini ? 2 : 4);
  const halfCirc = Math.PI * r;

  // Clamp to 0-120%
  const clampedPct = Math.max(0, Math.min(pct, 120));
  // For animation: full path is one dash (halfCirc); we animate dashoffset from
  // halfCirc (hidden) → 0 (fully revealed). strokeDashoffset is reliably
  // CSS-animatable across browsers; strokeDasharray is not.
  // Cap the *visual* fill at 100% — going negative would shift the dash
  // backward and uncover the left side of the gauge. Over-capacity is still
  // communicated via the green color and the per-view header above.
  const fillPctForArc = Math.min(clampedPct, 100);
  const fillOffset = halfCirc * (1 - fillPctForArc / 100);

  // Color zones on the arc: red (0-50%) → yellow (50-80%) → green (80-100%+)
  const arcColor = clampedPct >= 80 ? "#10b981" : clampedPct >= 50 ? "#f59e0b" : "#ef4444";
  const arcD = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  // Tick marks at zone boundaries: 50%, 80%, 100%
  const ticks = [50, 80, 100];
  const tickMarks = ticks.map(t => {
    const angle = Math.PI - (t / 100) * Math.PI;
    const inner = r - strokeW / 2 - 3;
    const outer = r + strokeW / 2 + 2;
    return {
      pct: t,
      x1: cx + inner * Math.cos(angle),
      y1: cy - inner * Math.sin(angle),
      x2: cx + outer * Math.cos(angle),
      y2: cy - outer * Math.sin(angle),
    };
  });

  // Needle: use CSS rotate transform so it animates smoothly with the fill.
  // Capped at 100% so it doesn't dip below the baseline when over capacity.
  // At 0% needle points left (rotation -180), at 100% it points right (0).
  const needleVisualPct = Math.min(clampedPct, 100);
  const needleRotation = (needleVisualPct - 100) / 100 * 180;
  const needleLen = r - strokeW / 2 - (mini ? 4 : 8);

  const svgH = cy + (mini ? 6 : 8);

  return (
    <div className="rpm-gauge" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={size} height={svgH} viewBox={`0 0 ${size} ${svgH}`}>
        {/* Zone track segments with gaps between zones */}
        {(() => {
          const gap = 3;
          const redLen = halfCirc * 0.5 - gap;
          const yellowLen = halfCirc * 0.3 - gap;
          const greenLen = halfCirc * 0.2;
          return (
            <>
              {/* Red zone: 0-50% */}
              <path d={arcD} fill="none" stroke={isLight ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.18)"} strokeWidth={strokeW} strokeLinecap="butt"
                strokeDasharray={`${redLen} ${halfCirc - redLen}`} />
              {/* Yellow zone: 50-80% */}
              <path d={arcD} fill="none" stroke={isLight ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.18)"} strokeWidth={strokeW} strokeLinecap="butt"
                strokeDasharray={`${yellowLen} ${halfCirc - yellowLen}`} strokeDashoffset={`${-(halfCirc * 0.5 + gap / 2)}`} />
              {/* Green zone: 80-100% */}
              <path d={arcD} fill="none" stroke={isLight ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.18)"} strokeWidth={strokeW} strokeLinecap="butt"
                strokeDasharray={`${greenLen} ${halfCirc - greenLen}`} strokeDashoffset={`${-(halfCirc * 0.8 + gap / 2)}`} />
            </>
          );
        })()}

        {/* Active fill arc — strokeDashoffset is reliably animatable */}
        {clampedPct > 0 && (
          <path d={arcD} fill="none" stroke={arcColor} strokeWidth={strokeW - 2} strokeLinecap="round"
            strokeDasharray={halfCirc}
            strokeDashoffset={fillOffset}
            style={{
              transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.3s ease",
              filter: `drop-shadow(0 0 ${mini ? 3 : 6}px ${arcColor}60)`,
            }} />
        )}

        {/* Tick marks */}
        {!mini && tickMarks.map(t => (
          <line key={t.pct} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={isLight ? "rgba(0,0,0,0.15)" : "#a8b3c4"} strokeWidth={1.5} />
        ))}

        {/* Needle — wrapped in <g> with CSS rotate so it animates smoothly */}
        <g style={{
          transform: `rotate(${needleRotation}deg)`,
          transformOrigin: `${cx}px ${cy}px`,
          transition: "transform 0.8s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <line x1={cx} y1={cy} x2={cx + needleLen} y2={cy}
            stroke={isLight ? "#1e293b" : "#e8ecf4"} strokeWidth={mini ? 1.5 : 2.5} strokeLinecap="round" />
        </g>
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={mini ? 3 : 5} fill={arcColor} />

        {/* Center text — booked over target (was percentage) */}
        {!mini && (
          <>
            <text x={cx} y={cy - 42} textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize: 30, fontWeight: 800, fill: isLight ? "#0f1729" : "#ffffff", letterSpacing: -1 }}>
              {money}
            </text>
            {label && (
              <text x={cx} y={cy - 14} textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 14, fontWeight: 600, fill: isLight ? "#9ca3af" : "#a8b3c4" }}>
                {label}
              </text>
            )}
          </>
        )}
        {mini && (
          <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize: 13, fontWeight: 800, fill: arcColor }}>
            {pct}%
          </text>
        )}
      </svg>
      {mini && label && (
        <div style={{ marginTop: -2, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: isLight ? "#0f1729" : "#e8ecf4" }}>{money}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: isLight ? "#9ca3af" : "#a8b3c4" }}>{label}</div>
        </div>
      )}
    </div>
  );
}

/* ---- Day bars with $ + job count inside the bar ---- */
function DayBars({
  days,
  isLight,
  money,
  measure,
  perDayJobsTarget,
}: {
  days: DayData[];
  isLight: boolean;
  money: (c: number) => string;
  measure: "dollars" | "jobs";
  perDayJobsTarget: number;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
      {days.map(d => {
        const isJobs = measure === "jobs";
        const filled = isJobs ? d.jobCount > 0 : d.scheduledCents > 0;
        const dayValue = isJobs ? d.jobCount : d.scheduledCents;
        const dayTarget = isJobs ? perDayJobsTarget : d.targetCents;
        const pct = dayTarget > 0 ? Math.round((dayValue / dayTarget) * 100) : 0;
        const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : filled ? "#ef4444" : (isLight ? "#e2e5ea" : "rgba(255,255,255,0.08)");
        return (
          <div key={d.day} className="day-bar-wrap" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
            {/* Bar with $ + jobs inside */}
            <div style={{
              width: "100%", height: 32, borderRadius: 6,
              background: isLight ? "#eef0f3" : "rgba(255,255,255,0.06)",
              overflow: "hidden",
              position: "relative",
            }}>
              {/* Fill */}
              <div className="day-bar-fill" style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: `${Math.min(pct, 100)}%`,
                background: color,
                transition: "width 0.5s ease, filter 0.15s ease",
              }} />
              {/* Overlay text */}
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                pointerEvents: "none",
                lineHeight: 1.05,
              }}>
                {filled ? (
                  <>
                    <div style={{
                      fontSize: 11, fontWeight: 600,
                      color: isLight ? "#0f1729" : "#ffffff",
                      textShadow: pct >= 25 ? "0 1px 2px rgba(0,0,0,0.35)" : "none",
                      whiteSpace: "nowrap",
                    }}>
                      {isJobs ? `${d.jobCount} job${d.jobCount !== 1 ? "s" : ""}` : money(d.scheduledCents)}
                    </div>
                    <div style={{
                      fontSize: 9, fontWeight: 500,
                      color: isLight ? "rgba(15,23,41,0.7)" : "rgba(255,255,255,0.85)",
                      textShadow: pct >= 25 ? "0 1px 2px rgba(0,0,0,0.35)" : "none",
                      whiteSpace: "nowrap",
                    }}>
                      {isJobs ? money(d.scheduledCents) : `${d.jobCount} job${d.jobCount !== 1 ? "s" : ""}`}
                    </div>
                  </>
                ) : (
                  <div style={{
                    fontSize: 10, fontWeight: 700,
                    color: isLight ? "#94a3b8" : "rgba(255,255,255,0.3)",
                  }}>
                    Open
                  </div>
                )}
              </div>
            </div>
            {/* Day label */}
            <span style={{
              fontSize: 11, fontWeight: d.isToday ? 800 : 600,
              color: d.isToday ? (isLight ? "#0f1729" : "#e8ecf4") : (isLight ? "#6b7280" : "#a8b3c4"),
            }}>
              {d.day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function CapacityTargetDisplay({ weeklyTargetCents, weeks, defaultWeek = 0, currencyCode, workDays: initialWorkDays, heatmapWeeks, heatmapTotalBooked, headers }: Props) {
  const isLight = useIsLight();
  const moneyFn = (c: number) => moneyFmt(c, currencyCode);
  const { measure, setMeasure, weeklyJobsTarget } = useCapacityMeasure();
  const isJobs = measure === "jobs";

  type ViewMode = "week" | "heatmap";
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [weekIdx, setWeekIdx] = useState(defaultWeek);
  const workDayList = initialWorkDays || ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const hiddenDays = new Set(ALL_DAYS.filter(d => !workDayList.includes(d)));

  const week = weeks[weekIdx] || weeks[0];
  const visibleDays = week.days.filter(d => !hiddenDays.has(d.day));
  // Booked = sum of scheduledCents OR jobCount depending on measure
  const bookedCents = visibleDays.reduce((s, d) => s + d.scheduledCents, 0);
  const bookedJobs = visibleDays.reduce((s, d) => s + d.jobCount, 0);
  const booked = isJobs ? bookedJobs : bookedCents;
  // Target: dollars uses weeklyTargetCents; jobs uses weeklyJobsTarget
  const targetForPeriod = isJobs
    ? (weeklyJobsTarget > 0 ? weeklyJobsTarget : 0)
    : (weeklyTargetCents > 0 ? weeklyTargetCents : 0);
  const fillPct = targetForPeriod > 0 ? Math.round((booked / targetForPeriod) * 100) : 0;
  // Per-day jobs target = weekly jobs target / # of work days (auto-distributed)
  const perDayJobsTarget = workDayList.length > 0 && weeklyJobsTarget > 0
    ? Math.round(weeklyJobsTarget / workDayList.length)
    : 0;

  // Format helpers — switch between $ and # output
  const fmtValue = (n: number) => isJobs ? `${n} job${n !== 1 ? "s" : ""}` : moneyFn(n);
  const fmtTarget = fmtValue;

  const periodLabel = week.label === "Next Week" ? "next week" : "this week";

  // Cell color helper
  function cellColor(pct: number, filled: boolean) {
    if (!filled) return isLight ? "#f0f1f3" : "rgba(255,255,255,0.03)";
    if (pct >= 80) return isLight ? "rgba(16,185,129,0.5)" : "rgba(16,185,129,0.45)";
    if (pct >= 50) return isLight ? "rgba(245,158,11,0.45)" : "rgba(245,158,11,0.4)";
    return isLight ? "rgba(239,68,68,0.35)" : "rgba(239,68,68,0.3)";
  }

  const toggleLabels = [...weeks.map(w => w.label), ...(heatmapWeeks ? ["6 Weeks"] : [])];
  const currentTabIdx = viewMode === "heatmap" ? weeks.length : weekIdx;

  // Compute internal headers per tab — measure-aware so they update when the
  // user toggles $ ↔ #. Replaces the per-page-built headers since the page is
  // a server component and can't read the localStorage hook.
  const colorFor = (pct: number) =>
    pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : pct > 0 ? "#ef4444" : "#a8b3c4";

  const buildHeaderForWeek = (visibleDays: DayData[], label: string) => {
    const wBookedCents = visibleDays.reduce((s, d) => s + d.scheduledCents, 0);
    const wBookedJobs = visibleDays.reduce((s, d) => s + d.jobCount, 0);
    const wBooked = isJobs ? wBookedJobs : wBookedCents;
    const wTarget = isJobs ? weeklyJobsTarget : weeklyTargetCents;
    const wPct = wTarget > 0 ? Math.round((wBooked / wTarget) * 100) : 0;
    return (
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: colorFor(wPct), lineHeight: 1, letterSpacing: -0.5 }}>
          {wPct}%
        </span>
        <span className="text-muted" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </span>
      </div>
    );
  };

  const internalHeaders: React.ReactNode[] = weeks.map((w, idx) => {
    const visible = w.days.filter(d => !hiddenDays.has(d.day));
    const labelText = idx === 0 ? "Booked this week" : idx === 1 ? "Booked next week" : `Booked ${w.label.toLowerCase()}`;
    return buildHeaderForWeek(visible, labelText);
  });
  if (heatmapWeeks) {
    let totalCents = 0;
    let totalJobs = 0;
    for (const hw of heatmapWeeks) {
      for (const d of hw.days) {
        if (workDayList.includes(d.day)) {
          totalCents += d.scheduledCents;
          totalJobs += d.jobCount;
        }
      }
    }
    const hmBooked = isJobs ? totalJobs : totalCents;
    const hmTarget = (isJobs ? weeklyJobsTarget : weeklyTargetCents) * 6;
    const hmPct = hmTarget > 0 ? Math.round((hmBooked / hmTarget) * 100) : 0;
    internalHeaders.push(
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: colorFor(hmPct), lineHeight: 1, letterSpacing: -0.5 }}>
          {hmPct}%
        </span>
        <span className="text-muted" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Booked 6 weeks
        </span>
      </div>
    );
  }
  // Caller-supplied headers prop is now ignored — kept in the type for
  // backwards compatibility with any in-flight references.
  void headers;
  const headersToRender = internalHeaders;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, alignItems: "center" }}>
      {/* Per-view headers + measure quick-toggle */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4, width: "100%" }}>
        <div style={{ display: "grid", flex: 1, minWidth: 0 }}>
          {headersToRender.map((h, i) => (
            <div
              key={i}
              style={{
                gridArea: "1 / 1",
                visibility: i === currentTabIdx ? "visible" : "hidden",
                pointerEvents: i === currentTabIdx ? "auto" : "none",
              }}
            >
              {h}
            </div>
          ))}
        </div>
        {/* Quick measure toggle ($ / #) — sized for reliable touch/click */}
        <div style={{
          display: "flex", flexShrink: 0, borderRadius: 8, position: "relative", zIndex: 2,
          border: `1.5px solid ${isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.12)"}`,
          overflow: "hidden",
        }}>
          {(["dollars", "jobs"] as const).map((m) => {
            const active = measure === m;
            return (
              <button
                key={m}
                type="button"
                onClick={(e) => { e.stopPropagation(); setMeasure(m); }}
                aria-label={m === "dollars" ? "Show as dollars" : "Show as job count"}
                title={m === "dollars" ? "Show as dollars" : "Show as job count"}
                style={{
                  padding: "6px 14px",
                  minWidth: 36, minHeight: 28,
                  background: active
                    ? (isLight ? "rgba(90,166,255,0.15)" : "rgba(90,166,255,0.22)")
                    : "transparent",
                  color: active ? "#5aa6ff" : (isLight ? "#64748b" : "rgba(255,255,255,0.6)"),
                  border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: 800, lineHeight: 1,
                  transition: "all 0.15s ease",
                }}
              >
                {m === "dollars" ? "$" : "#"}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{
        flex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center",
        padding: "6px 0",
        borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)"}`,
        borderBottom: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)"}`,
        marginBottom: 6,
      }}>
      {viewMode === "week" ? (
        <>
          {/* Big gauge — pulled up on desktop, normal on mobile */}
          <div className="gauge-container" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", marginTop: "-12%" }}>
            <RPMGauge
              pct={fillPct}
              money={fmtValue(booked)}
              label={targetForPeriod > 0 ? `of ${fmtTarget(targetForPeriod)}` : periodLabel}
              size={244}
              isLight={isLight}
            />
          </div>
          {/* Day bars */}
          <div style={{ width: "100%", marginTop: 2 }}>
            <DayBars
              days={visibleDays}
              isLight={isLight}
              money={moneyFn}
              measure={measure}
              perDayJobsTarget={perDayJobsTarget}
            />
          </div>
        </>
      ) : (
        /* 6-week mini heatmap */
        <>
          {/* Day headers */}
          <div style={{ display: "flex", gap: 4, width: "100%", marginBottom: 4, paddingLeft: 58 }}>
            {workDayList.map(d => (
              <div key={d} className="text-muted" style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 700 }}>{d.slice(0, 3)}</div>
            ))}
            <div style={{ width: 56 }} />
          </div>
          {/* Week rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", flex: 1 }}>
            {(heatmapWeeks || []).map((hw, wi) => {
              const weekDays = hw.days.filter(d => workDayList.includes(d.day));
              const weekRev = weekDays.reduce((s, d) => s + d.scheduledCents, 0);
              const weekJobs = weekDays.reduce((s, d) => s + d.jobCount, 0);
              const weekValue = isJobs ? weekJobs : weekRev;
              const weekTarget = isJobs ? weeklyJobsTarget : weeklyTargetCents;
              const weekPct = weekTarget > 0 ? Math.round((weekValue / weekTarget) * 100) : 0;
              return (
                <div key={wi} style={{
                  display: "flex", alignItems: "center", gap: 4, flex: 1,
                  padding: "3px 6px", borderRadius: 6,
                  background: hw.isCurrent ? (isLight ? "rgba(59,109,170,0.05)" : "rgba(59,109,170,0.06)") : "transparent",
                  border: hw.isCurrent ? `1.5px solid ${isLight ? "rgba(59,109,170,0.12)" : "rgba(59,109,170,0.12)"}` : "1.5px solid transparent",
                }}>
                  {/* Week label */}
                  <div style={{
                    width: 52, flexShrink: 0, fontSize: 13, fontWeight: hw.isCurrent ? 800 : 600,
                    color: hw.isCurrent ? (isLight ? "#0f1729" : "#e8ecf4") : (isLight ? "#6b7280" : "#a8b3c4"),
                  }}>
                    {hw.label}
                  </div>
                  {/* Day cells */}
                  {weekDays.map(d => {
                    const dayValue = isJobs ? d.jobCount : d.scheduledCents;
                    const dayTarget = isJobs ? perDayJobsTarget : d.targetCents;
                    const pct = dayTarget > 0 ? Math.round((dayValue / dayTarget) * 100) : 0;
                    const filled = isJobs ? d.jobCount > 0 : d.scheduledCents > 0;
                    return (
                      <div key={d.day} style={{
                        flex: 1, borderRadius: 5, minHeight: 27,
                        background: cellColor(pct, filled),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.2s ease",
                      }}>
                        {filled && (
                          <span style={{ fontSize: 12, fontWeight: 800, color: pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }}>
                            {isJobs ? d.jobCount : moneyCompact(d.scheduledCents)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {/* Weekly total */}
                  <div style={{
                    width: 52, textAlign: "right", flexShrink: 0,
                    fontSize: 14, fontWeight: 800,
                    color: weekPct >= 80 ? "#10b981" : weekPct >= 50 ? "#f59e0b" : weekValue > 0 ? "#ef4444" : (isLight ? "#d1d5db" : "#a8b3c4"),
                  }}>
                    {weekValue > 0 ? `${weekPct}%` : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      </div>

      {/* Toggles at bottom */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        paddingTop: 6, marginTop: "auto", width: "100%",
        borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)"}`,
      }}>
        {toggleLabels.map((label, i) => {
          const isWeekToggle = i < weeks.length;
          const isActive = isWeekToggle ? (viewMode === "week" && weekIdx === i) : viewMode === "heatmap";
          return (
            <button
              key={label}
              className="toggle-btn"
              onClick={() => {
                if (isWeekToggle) { setViewMode("week"); setWeekIdx(i); }
                else { setViewMode("heatmap"); }
              }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "5px 8px", fontSize: 12, fontWeight: isActive ? 700 : 500,
                color: isActive ? (isLight ? "#0f1729" : "#e8ecf4") : (isLight ? "#9ca3af" : "#a8b3c4"),
                borderBottom: isActive ? `2px solid ${isLight ? "#0f1729" : "#e8ecf4"}` : "2px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
