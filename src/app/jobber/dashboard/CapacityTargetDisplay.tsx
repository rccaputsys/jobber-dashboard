"use client";

import { useState } from "react";
import { useIsLight } from "@/lib/hooks";

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
};

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function moneyFmt(cents: number, code: string): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100); }
  catch { return `$${Math.round(cents / 100).toLocaleString()}`; }
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
  const fillLen = halfCirc * clampedPct / 100;

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

  // Needle position
  const needleAngle = Math.PI - (clampedPct / 100) * Math.PI;
  const needleLen = r - strokeW / 2 - (mini ? 4 : 8);
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy - needleLen * Math.sin(needleAngle);

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

        {/* Active fill arc */}
        {clampedPct > 0 && (
          <path d={arcD} fill="none" stroke={arcColor} strokeWidth={strokeW - 2} strokeLinecap="round"
            strokeDasharray={`${fillLen} ${halfCirc - fillLen}`}
            style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.3s ease", filter: `drop-shadow(0 0 ${mini ? 3 : 6}px ${arcColor}60)` }} />
        )}

        {/* Tick marks */}
        {!mini && tickMarks.map(t => (
          <line key={t.pct} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={isLight ? "rgba(0,0,0,0.15)" : "#8590a2"} strokeWidth={1.5} />
        ))}

        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny}
          stroke={isLight ? "#1e293b" : "#e8ecf4"} strokeWidth={mini ? 1.5 : 2.5} strokeLinecap="round"
          style={{ transition: "x2 0.8s cubic-bezier(0.4,0,0.2,1), y2 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={mini ? 3 : 5} fill={arcColor} />

        {/* Center text */}
        {!mini && (
          <>
            <text x={cx} y={cy - 48} textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize: 40, fontWeight: 800, fill: arcColor, letterSpacing: -2 }}>
              {pct}%
            </text>
            <text x={cx} y={cy - 18} textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize: 17, fontWeight: 700, fill: isLight ? "#0f1729" : "#ffffff" }}>
              {money}
            </text>
          </>
        )}
        {mini && (
          <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize: 13, fontWeight: 800, fill: arcColor }}>
            {pct}%
          </text>
        )}
      </svg>
      {label && (
        <div style={{ marginTop: mini ? -2 : 4, textAlign: "center" }}>
          {mini && <div style={{ fontSize: 11, fontWeight: 700, color: isLight ? "#0f1729" : "#e8ecf4" }}>{money}</div>}
          <div style={{ fontSize: mini ? 10 : 12, fontWeight: 600, color: isLight ? "#9ca3af" : "#8590a2" }}>{label}</div>
        </div>
      )}
    </div>
  );
}

/* ---- Day bars with % and label ---- */
function DayBars({ days, isLight, money }: { days: DayData[]; isLight: boolean; money: (c: number) => string }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
      {days.map(d => {
        const filled = d.scheduledCents > 0;
        const pct = d.targetCents > 0 ? Math.round((d.scheduledCents / d.targetCents) * 100) : 0;
        const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : filled ? "#ef4444" : (isLight ? "#e2e5ea" : "rgba(255,255,255,0.08)");
        return (
          <div key={d.day} className="day-bar-wrap" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: 1 }}>
            {/* Hover tooltip */}
            {filled && (
              <div className="day-tip">
                {money(d.scheduledCents)} &middot; {d.jobCount} job{d.jobCount !== 1 ? "s" : ""}
              </div>
            )}
            {/* % above the bar */}
            <span style={{
              fontSize: 13, fontWeight: 800,
              color: filled ? color : (isLight ? "#d1d5db" : "#8590a2"),
            }}>
              {filled ? `${pct}%` : "—"}
            </span>
            {/* Bar */}
            <div style={{
              width: "100%", height: 10, borderRadius: 5,
              background: isLight ? "#eef0f3" : "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}>
              <div className="day-bar-fill" style={{
                height: "100%", borderRadius: 5,
                width: `${Math.min(pct, 100)}%`,
                background: color,
                transition: "width 0.5s ease, filter 0.15s ease",
              }} />
            </div>
            {/* Day label */}
            <span style={{
              fontSize: 12, fontWeight: d.isToday ? 800 : 600,
              color: d.isToday ? (isLight ? "#0f1729" : "#e8ecf4") : (isLight ? "#6b7280" : "#8590a2"),
            }}>
              {d.day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function CapacityTargetDisplay({ weeklyTargetCents, weeks, defaultWeek = 0, currencyCode, workDays: initialWorkDays, heatmapWeeks, heatmapTotalBooked }: Props) {
  const isLight = useIsLight();
  const moneyFn = (c: number) => moneyFmt(c, currencyCode);
  type ViewMode = "week" | "heatmap";
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [weekIdx, setWeekIdx] = useState(defaultWeek);
  const workDayList = initialWorkDays || ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const hiddenDays = new Set(ALL_DAYS.filter(d => !workDayList.includes(d)));

  const week = weeks[weekIdx] || weeks[0];
  const visibleDays = week.days.filter(d => !hiddenDays.has(d.day));
  const booked = visibleDays.reduce((s, d) => s + d.scheduledCents, 0);
  const targetForPeriod = weeklyTargetCents > 0 ? weeklyTargetCents : 0;
  const fillPct = targetForPeriod > 0 ? Math.round((booked / targetForPeriod) * 100) : 0;

  const periodLabel = week.label === "Next Week" ? "next week" : "this week";

  // Heatmap totals
  const heatmap6wTarget = weeklyTargetCents > 0 ? weeklyTargetCents * 6 : 0;
  const heatmap6wPct = heatmap6wTarget > 0 ? Math.round(((heatmapTotalBooked || 0) / heatmap6wTarget) * 100) : 0;

  // Cell color helper
  function cellColor(pct: number, filled: boolean) {
    if (!filled) return isLight ? "#f0f1f3" : "rgba(255,255,255,0.03)";
    if (pct >= 80) return isLight ? "rgba(16,185,129,0.5)" : "rgba(16,185,129,0.45)";
    if (pct >= 50) return isLight ? "rgba(245,158,11,0.45)" : "rgba(245,158,11,0.4)";
    return isLight ? "rgba(239,68,68,0.35)" : "rgba(239,68,68,0.3)";
  }

  const toggleLabels = [...weeks.map(w => w.label), ...(heatmapWeeks ? ["6 Weeks"] : [])];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, alignItems: "center" }}>
      <div style={{
        flex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center",
        padding: "6px 0",
        borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)"}`,
        borderBottom: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)"}`,
        marginBottom: 6,
      }}>
      {viewMode === "week" ? (
        <>
          {/* Guidance line */}
          <div style={{ alignSelf: "flex-start", marginBottom: 2, width: "100%" }}>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: fillPct >= 100 ? "#10b981" : fillPct >= 80 ? (isLight ? "#0f1729" : "#e8ecf4") : fillPct >= 50 ? "#f59e0b" : "#ef4444",
            }}>
              {fillPct >= 100 ? "You're fully booked" : fillPct >= 80 ? "Almost full — nice work" : fillPct >= 50 ? "Getting there — a few more jobs fills you up" : weeklyTargetCents > 0 ? "You have room for more work" : `${moneyFn(booked)} booked`}
            </span>
          </div>
          {/* Big gauge */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", marginTop: "-20%" }}>
            <RPMGauge
              pct={fillPct}
              money={moneyFn(booked)}
              label={weeklyTargetCents > 0 ? `of ${moneyFn(targetForPeriod)} goal` : periodLabel}
              size={300}
              isLight={isLight}
            />
          </div>
          {/* Day bars */}
          <div style={{ width: "100%", marginTop: 2 }}>
            <DayBars days={visibleDays} isLight={isLight} money={moneyFn} />
          </div>
        </>
      ) : (
        /* 6-week mini heatmap */
        <>
          <div style={{ alignSelf: "flex-start", marginBottom: 6, width: "100%" }}>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: heatmap6wPct >= 80 ? "#10b981" : heatmap6wPct >= 50 ? "#f59e0b" : heatmap6wTarget > 0 ? "#ef4444" : (isLight ? "#0f1729" : "#e8ecf4"),
            }}>
              {heatmap6wPct >= 80 ? "Looking good — mostly booked up" : heatmap6wPct >= 50 ? `${moneyFn((heatmap6wTarget) - (heatmapTotalBooked || 0))} in open slots` : heatmap6wTarget > 0 ? `${moneyFn(heatmap6wTarget - (heatmapTotalBooked || 0))} available to fill` : `${moneyFn(heatmapTotalBooked || 0)} booked`}
            </span>
            <div className="text-muted" style={{ fontSize: 11, marginTop: 1 }}>
              {moneyFn(heatmapTotalBooked || 0)} booked{heatmap6wTarget > 0 && ` of ${moneyFn(heatmap6wTarget)} goal`}
            </div>
          </div>
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
              const weekPct = weeklyTargetCents > 0 ? Math.round((weekRev / weeklyTargetCents) * 100) : 0;
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
                    color: hw.isCurrent ? (isLight ? "#0f1729" : "#e8ecf4") : (isLight ? "#6b7280" : "#8590a2"),
                  }}>
                    {hw.label}
                  </div>
                  {/* Day cells */}
                  {weekDays.map(d => {
                    const pct = d.targetCents > 0 ? Math.round((d.scheduledCents / d.targetCents) * 100) : 0;
                    const filled = d.scheduledCents > 0;
                    return (
                      <div key={d.day} style={{
                        flex: 1, borderRadius: 5, minHeight: 36,
                        background: cellColor(pct, filled),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.2s ease",
                      }}>
                        {filled && (
                          <span style={{ fontSize: 13, fontWeight: 800, color: pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }}>
                            {pct}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {/* Weekly total */}
                  <div style={{
                    width: 52, textAlign: "right", flexShrink: 0,
                    fontSize: 14, fontWeight: 800,
                    color: weekPct >= 80 ? "#10b981" : weekPct >= 50 ? "#f59e0b" : weekRev > 0 ? "#ef4444" : (isLight ? "#d1d5db" : "#8590a2"),
                  }}>
                    {weekRev > 0 ? `${weekPct}%` : "—"}
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
                color: isActive ? (isLight ? "#0f1729" : "#e8ecf4") : (isLight ? "#9ca3af" : "#8590a2"),
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
