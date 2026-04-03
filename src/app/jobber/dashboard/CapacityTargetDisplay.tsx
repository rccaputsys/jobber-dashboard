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

type Props = {
  weeklyTargetCents: number;
  weeks: WeekSet[];
  defaultWeek?: number;
  currencyCode: string;
  settingsHref: string;
  adminConnectionId?: string;
  workDays?: string[];
  dailyTargets?: Record<string, number>;
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

  // Tick marks at 25, 50, 75, 100%
  const ticks = [25, 50, 75, 100];
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={size} height={svgH} viewBox={`0 0 ${size} ${svgH}`}>
        {/* Zone gradient — draw 3 colored track segments */}
        {/* Red zone: 0-50% */}
        <path d={arcD} fill="none" stroke={isLight ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.15)"} strokeWidth={strokeW} strokeLinecap="round"
          strokeDasharray={`${halfCirc * 0.5} ${halfCirc * 0.5}`} />
        {/* Yellow zone: 50-80% */}
        <path d={arcD} fill="none" stroke={isLight ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.15)"} strokeWidth={strokeW} strokeLinecap="butt"
          strokeDasharray={`${halfCirc * 0.3} ${halfCirc * 0.7}`} strokeDashoffset={`${-halfCirc * 0.5}`} />
        {/* Green zone: 80-100%+ */}
        <path d={arcD} fill="none" stroke={isLight ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.15)"} strokeWidth={strokeW} strokeLinecap="round"
          strokeDasharray={`${halfCirc * 0.2} ${halfCirc * 0.8}`} strokeDashoffset={`${-halfCirc * 0.8}`} />

        {/* Active fill arc */}
        {clampedPct > 0 && (
          <path d={arcD} fill="none" stroke={arcColor} strokeWidth={strokeW - 2} strokeLinecap="round"
            strokeDasharray={`${fillLen} ${halfCirc - fillLen}`}
            style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.3s ease", filter: `drop-shadow(0 0 ${mini ? 3 : 6}px ${arcColor}60)` }} />
        )}

        {/* Tick marks */}
        {!mini && tickMarks.map(t => (
          <line key={t.pct} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)"} strokeWidth={1.5} />
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
            <text x={cx} y={cy - 40} textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize: 34, fontWeight: 800, fill: arcColor, letterSpacing: -1.5 }}>
              {pct}%
            </text>
            <text x={cx} y={cy - 14} textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize: 15, fontWeight: 700, fill: isLight ? "#0f1729" : "#e8ecf4" }}>
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
          <div style={{ fontSize: mini ? 10 : 12, fontWeight: 600, color: isLight ? "#9ca3af" : "#5a6375" }}>{label}</div>
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
          <div key={d.day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: 1 }}>
            {/* % above the bar */}
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: filled ? color : (isLight ? "#d1d5db" : "rgba(255,255,255,0.15)"),
            }}>
              {filled ? `${pct}%` : "—"}
            </span>
            {/* Bar */}
            <div style={{
              width: "100%", height: 10, borderRadius: 5,
              background: isLight ? "#eef0f3" : "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: 5,
                width: `${Math.min(pct, 100)}%`,
                background: color,
                transition: "width 0.5s ease",
              }} />
            </div>
            {/* Day label */}
            <span style={{
              fontSize: 11, fontWeight: d.isToday ? 800 : 600,
              color: d.isToday ? (isLight ? "#0f1729" : "#e8ecf4") : (isLight ? "#6b7280" : "#5a6375"),
            }}>
              {d.day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function CapacityTargetDisplay({ weeklyTargetCents, weeks, defaultWeek = 0, currencyCode, workDays: initialWorkDays }: Props) {
  const isLight = useIsLight();
  const moneyFn = (c: number) => moneyFmt(c, currencyCode);
  const [weekIdx, setWeekIdx] = useState(defaultWeek);
  const hiddenDays = new Set(
    ALL_DAYS.filter(d => !(initialWorkDays || ["Mon", "Tue", "Wed", "Thu", "Fri"]).includes(d))
  );

  const week = weeks[weekIdx] || weeks[0];
  const visibleDays = week.days.filter(d => !hiddenDays.has(d.day));
  const booked = visibleDays.reduce((s, d) => s + d.scheduledCents, 0);
  const targetForPeriod = weeklyTargetCents > 0 ? weeklyTargetCents : 0;
  const fillPct = targetForPeriod > 0 ? Math.round((booked / targetForPeriod) * 100) : 0;

  const periodLabel = week.label === "Next Week" ? "next week" : "this week";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, alignItems: "center" }}>
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
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
            <RPMGauge
              pct={fillPct}
              money={moneyFn(booked)}
              label={weeklyTargetCents > 0 ? `of ${moneyFn(targetForPeriod)} goal` : periodLabel}
              size={220}
              isLight={isLight}
            />
          </div>
          {/* Day bars */}
          <div style={{ width: "100%", marginTop: 2 }}>
            <DayBars days={visibleDays} isLight={isLight} money={moneyFn} />
          </div>
        </>

      {/* Period toggles at bottom */}
      {weeks.length > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          paddingTop: 6, marginTop: "auto", width: "100%",
          borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)"}`,
        }}>
          {weeks.map((w, i) => (
            <button
              key={i}
              className="toggle-btn"
              onClick={() => setWeekIdx(i)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "4px 6px", fontSize: 11, fontWeight: weekIdx === i ? 700 : 500,
                color: weekIdx === i ? (isLight ? "#0f1729" : "#e8ecf4") : (isLight ? "#9ca3af" : "rgba(255,255,255,0.3)"),
                borderBottom: weekIdx === i ? `2px solid ${isLight ? "#0f1729" : "#e8ecf4"}` : "2px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
