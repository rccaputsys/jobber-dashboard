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

export function CapacityTargetDisplay({ weeklyTargetCents, weeks, defaultWeek = 0, currencyCode, workDays: initialWorkDays }: Props) {
  const isLight = useIsLight();
  const money = (c: number) => moneyFmt(c, currencyCode);
  const [weekIdx, setWeekIdx] = useState(defaultWeek);
  const [hovered, setHovered] = useState<string | null>(null);
  const hiddenDays = new Set(
    ALL_DAYS.filter(d => !(initialWorkDays || ["Mon", "Tue", "Wed", "Thu", "Fri"]).includes(d))
  );

  const week = weeks[weekIdx] || weeks[0];
  const visibleDays = week.days.filter(d => !hiddenDays.has(d.day));
  const booked = visibleDays.reduce((s, d) => s + d.scheduledCents, 0);
  const targetForPeriod = weeklyTargetCents > 0 ? (week.label === "This Month" ? weeklyTargetCents * Math.ceil(week.days.length) : weeklyTargetCents) : 0;
  const fillPct = targetForPeriod > 0 ? Math.round((booked / targetForPeriod) * 100) : 0;

  // Mellow blue palette for fill gauge
  const fillGrad = "linear-gradient(90deg, rgba(90,166,255,0.6), rgba(56,189,248,0.5))";
  const trackBg = isLight ? "linear-gradient(180deg, #e2e8f0, #eef2f7)" : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))";
  const trackShadow = isLight ? "inset 0 1px 3px rgba(0,0,0,0.06)" : "inset 0 1px 3px rgba(0,0,0,0.2)";

  const pillBg = isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)";
  const btnStyle = (active: boolean, h: boolean): React.CSSProperties => ({
    padding: "5px 12px", borderRadius: 7, border: "none",
    background: active ? "#5aa6ff" : h ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)") : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap",
  });

  const periodLabel = week.label === "This Month" ? "this month" : week.label === "Next Week" ? "next week" : "this week";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Big number + toggle on right */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1 }} className="text-primary">{money(booked)}</div>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 3 }}>
            booked {periodLabel}
            {weeklyTargetCents > 0 && <> &middot; {fillPct}% of capacity</>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, background: pillBg, borderRadius: 8, padding: 2, flexShrink: 0 }}>
          {weeks.map((w, i) => (
            <button key={i} onClick={() => setWeekIdx(i)} onMouseEnter={() => setHovered(`w${i}`)} onMouseLeave={() => setHovered(null)} style={btnStyle(weekIdx === i, hovered === `w${i}`)}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Day/week bars — flex to fill remaining card space */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minHeight: 0 }}>
        {week.days.map(d => {
          const hidden = hiddenDays.has(d.day);
          if (hidden) return null;

          const dayFill = d.targetCents > 0 ? Math.round((d.scheduledCents / d.targetCents) * 100) : 0;
          const scaleMax = d.targetCents > 0 ? d.targetCents : Math.max(...visibleDays.map(x => x.scheduledCents), 1);
          const barWidthPct = scaleMax > 0 ? Math.min((d.scheduledCents / scaleMax) * 100, 100) : 0;
          const zero = d.scheduledCents === 0;
          const effectiveWidth = zero ? 0 : Math.max(barWidthPct, 3);

          return (
            <div key={d.day} style={{
              display: "flex", alignItems: "center", gap: 6, flex: 1,
              padding: d.isToday ? "2px 6px" : "2px 6px",
              borderRadius: 6,
              background: d.isToday ? (isLight ? "rgba(90,166,255,0.05)" : "rgba(90,166,255,0.04)") : "transparent",
              border: d.isToday ? `1.5px solid ${isLight ? "rgba(90,166,255,0.15)" : "rgba(90,166,255,0.1)"}` : "1.5px solid transparent",
              minHeight: 28,
            }}>
              {/* Day label */}
              <div style={{
                width: 34, flexShrink: 0, textAlign: "center",
                fontSize: 12, fontWeight: d.isToday ? 800 : 600,
                color: d.isToday ? "#5aa6ff" : (isLight ? "#475569" : "rgba(255,255,255,0.65)"),
              }}>
                {d.day}
              </div>

              {/* Bar track */}
              <div style={{
                flex: 1, position: "relative", minHeight: 24, borderRadius: 5,
                background: trackBg, boxShadow: trackShadow, overflow: "hidden",
                alignSelf: "stretch",
              }}>
                <div style={{
                  position: "absolute", top: 2, left: 2, bottom: 2,
                  width: effectiveWidth > 0 ? `calc(${effectiveWidth}% - 4px)` : "0%",
                  borderRadius: 3, background: fillGrad,
                  boxShadow: effectiveWidth > 0 ? "0 0 4px rgba(90,166,255,0.12)" : "none",
                  transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "45%", borderRadius: "3px 3px 0 0", background: "linear-gradient(180deg, rgba(255,255,255,0.2), transparent)" }} />
                </div>
                {d.targetCents > 0 && (
                  <div style={{ position: "absolute", top: 2, bottom: 2, left: "calc(100% - 2px)", width: 2, borderRadius: 1, background: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.12)" }} />
                )}
                {d.targetCents > 0 && !zero && (
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: 10, display: "flex", alignItems: "center", fontSize: 13, fontWeight: 800, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.5)", pointerEvents: "none" }}>
                    {dayFill}%
                  </div>
                )}
                {zero && (
                  <div className="text-muted" style={{ position: "absolute", top: 0, bottom: 0, left: 10, display: "flex", alignItems: "center", fontSize: 12, fontWeight: 600, pointerEvents: "none" }}>
                    {d.isToday ? "Open — fill today" : "Open"}
                  </div>
                )}
              </div>

              {/* Amount + jobs */}
              <div style={{ width: 62, textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: -0.3, color: zero ? (isLight ? "#cbd5e1" : "rgba(255,255,255,0.2)") : (isLight ? "#1e293b" : "#EAF1FF") }}>
                  {zero ? "$0" : money(d.scheduledCents)}
                </div>
                {d.jobCount > 0 && (
                  <div className="text-muted" style={{ fontSize: 11 }}>{d.jobCount} job{d.jobCount !== 1 ? "s" : ""}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis scale */}
      {weeklyTargetCents > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, paddingLeft: 40, paddingRight: 68 }}>
          <span className="text-muted" style={{ fontSize: 9 }}>$0</span>
          <span className="text-muted" style={{ fontSize: 9 }}>50%</span>
          <span className="text-muted" style={{ fontSize: 9 }}>Target</span>
        </div>
      )}
    </div>
  );
}
