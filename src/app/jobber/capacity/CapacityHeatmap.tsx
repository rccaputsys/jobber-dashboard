"use client";

import { useIsLight } from "@/lib/hooks";

type DayCell = {
  revenueCents: number;
  targetCents: number;
  jobCount: number;
  isToday: boolean;
  isPast: boolean;
};

type WeekRow = {
  label: string;
  isCurrent: boolean;
  days: Record<string, DayCell>;
};

type Props = {
  weeks: WeekRow[];
  dayLabels: string[];
  weeklyTargetCents: number;
  currencyCode: string;
};

function moneyShort(cents: number, code: string): string {
  try {
    if (Math.abs(cents) >= 100000) {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 1, notation: "compact" }).format(cents / 100);
    }
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100);
  } catch { return `$${Math.round(cents / 100).toLocaleString()}`; }
}

function fillBg(pct: number, isLight: boolean): string {
  if (pct >= 120) return isLight ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.35)";
  if (pct >= 100) return isLight ? "rgba(16,185,129,0.22)" : "rgba(16,185,129,0.25)";
  if (pct >= 70)  return isLight ? "rgba(16,185,129,0.14)" : "rgba(16,185,129,0.17)";
  if (pct >= 40)  return isLight ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.10)";
  if (pct > 0)    return isLight ? "rgba(16,185,129,0.04)" : "rgba(16,185,129,0.05)";
  return isLight ? "rgba(0,0,0,0.015)" : "rgba(255,255,255,0.015)";
}

function weekLabel(pct: number, isCurrent: boolean): string {
  if (isCurrent) {
    if (pct >= 100) return "On target";
    if (pct >= 70) return "Almost";
    return "Needs work";
  }
  if (pct >= 120) return "Overbooked";
  if (pct >= 100) return "Full";
  if (pct >= 70) return "Almost";
  if (pct > 0) return "Open";
  return "Empty";
}

function weekColor(pct: number): string {
  if (pct >= 100) return "#10b981";
  if (pct >= 70) return "#f59e0b";
  if (pct > 0) return "#ef4444";
  return "rgba(255,255,255,0.2)";
}

export function CapacityHeatmap({ weeks, dayLabels, weeklyTargetCents, currencyCode }: Props) {
  const isLight = useIsLight();
  const money = (c: number) => moneyShort(c, currencyCode);
  const hasTarget = weeklyTargetCents > 0;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 2 }}>
        <thead>
          <tr>
            <th style={{ width: 72, fontSize: 10, fontWeight: 700, textAlign: "left", padding: "6px 6px", color: isLight ? "#64748b" : "rgba(255,255,255,0.4)" }}>
              Week of
            </th>
            {hasTarget && (
              <th style={{ width: 100, fontSize: 10, fontWeight: 700, textAlign: "center", padding: "6px 4px", color: isLight ? "#64748b" : "rgba(255,255,255,0.4)" }}>
                Fill
              </th>
            )}
            {dayLabels.map(day => (
              <th key={day} style={{
                fontSize: 11, fontWeight: 700, textAlign: "center", padding: "6px 2px",
                color: isLight ? "#475569" : "rgba(255,255,255,0.5)",
              }}>
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => {
            const weekTotal = dayLabels.reduce((s, d) => s + (week.days[d]?.revenueCents || 0), 0);
            const weekJobs = dayLabels.reduce((s, d) => s + (week.days[d]?.jobCount || 0), 0);
            const weekPct = hasTarget ? Math.round((weekTotal / weeklyTargetCents) * 100) : 0;
            const wColor = weekColor(weekPct);
            const wLabel = weekLabel(weekPct, week.isCurrent);
            const barWidth = hasTarget ? Math.min(weekPct, 100) : 0;

            return (
              <tr key={week.label} style={{
                background: week.isCurrent ? (isLight ? "rgba(90,166,255,0.04)" : "rgba(90,166,255,0.05)") : "transparent",
                outline: week.isCurrent ? `2px solid ${isLight ? "rgba(90,166,255,0.3)" : "rgba(90,166,255,0.25)"}` : "none",
                outlineOffset: 1,
                borderRadius: 8,
              }}>
                {/* Week label */}
                <td style={{
                  fontSize: 11, fontWeight: week.isCurrent ? 800 : 600,
                  padding: "6px 6px", whiteSpace: "nowrap",
                  color: week.isCurrent ? (isLight ? "#1e293b" : "#EAF1FF") : (isLight ? "#64748b" : "rgba(255,255,255,0.45)"),
                }}>
                  {week.label}
                  {week.isCurrent && <span style={{ fontSize: 8, marginLeft: 3, color: "#5aa6ff", fontWeight: 700 }}>NOW</span>}
                </td>

                {/* Weekly summary — left side */}
                {hasTarget && (
                  <td style={{
                    padding: "6px 8px", verticalAlign: "middle",
                    borderRight: `1px solid ${isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)"}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: wColor, letterSpacing: -0.5, lineHeight: 1, minWidth: 32, textAlign: "right" }}>
                        {weekPct}%
                      </div>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)", overflow: "hidden", minWidth: 30 }}>
                        <div style={{
                          height: "100%", borderRadius: 3,
                          width: `${barWidth}%`,
                          background: wColor,
                          opacity: 0.6,
                          transition: "width 0.5s ease",
                        }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                      <span style={{ fontSize: 8, fontWeight: 600, color: wColor, textTransform: "uppercase", letterSpacing: 0.3 }}>
                        {wLabel}
                      </span>
                      <span style={{ fontSize: 9, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.3)" }}>
                        {weekJobs.toLocaleString()} jobs
                      </span>
                    </div>
                  </td>
                )}

                {/* Day cells */}
                {dayLabels.map(day => {
                  const cell = week.days[day];
                  if (!cell) return <td key={day} />;
                  const pct = cell.targetCents > 0 ? Math.round((cell.revenueCents / cell.targetCents) * 100) : 0;
                  const bg = fillBg(pct, isLight);
                  const empty = cell.revenueCents === 0;

                  return (
                    <td key={day} style={{
                      padding: "6px 3px",
                      borderRadius: 6,
                      background: bg,
                      textAlign: "center",
                      verticalAlign: "middle",
                      border: "2px solid transparent",
                      minWidth: 56,
                      transition: "background 0.2s ease",
                    }}>
                      {cell.targetCents > 0 && !empty ? (
                        <>
                          <div style={{
                            fontSize: 14, fontWeight: 800, letterSpacing: -0.5,
                            color: pct >= 100 ? "#10b981" : pct >= 70 ? (isLight ? "#1e293b" : "#EAF1FF") : "#f59e0b",
                            lineHeight: 1,
                          }}>
                            {pct}%
                          </div>
                          <div style={{
                            fontSize: 10, fontWeight: 600, marginTop: 1,
                            color: isLight ? "#475569" : "rgba(255,255,255,0.5)",
                          }}>
                            {money(cell.revenueCents)}
                          </div>
                          <div style={{
                            fontSize: 9, fontWeight: 500, marginTop: 0,
                            color: isLight ? "#94a3b8" : "rgba(255,255,255,0.3)",
                          }}>
                            {cell.jobCount} {cell.jobCount === 1 ? "job" : "jobs"}
                          </div>
                        </>
                      ) : (
                        <div style={{
                          fontSize: empty ? 11 : 12,
                          fontWeight: empty ? 500 : 700,
                          color: empty
                            ? (cell.isPast ? (isLight ? "#cbd5e1" : "rgba(255,255,255,0.12)") : (isLight ? "#94a3b8" : "rgba(255,255,255,0.25)"))
                            : (isLight ? "#475569" : "rgba(255,255,255,0.5)"),
                        }}>
                          {empty ? (cell.isPast ? "\u2014" : "Open") : money(cell.revenueCents)}
                        </div>
                      )}
                    </td>
                  );
                })}

              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
