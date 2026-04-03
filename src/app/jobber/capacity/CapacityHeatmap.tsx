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
    if (pct >= 100) return "On track";
    if (pct >= 70) return "Almost there";
    return "Needs work";
  }
  if (pct >= 120) return "Overbooked";
  if (pct >= 100) return "Full";
  if (pct >= 70) return "Almost there";
  if (pct > 0) return "Open";
  return "Empty";
}

function weekColor(pct: number): string {
  if (pct >= 100) return "#10b981";
  if (pct >= 70) return "#f59e0b";
  if (pct > 0) return "#ef4444";
  return "rgba(255,255,255,0.2)";
}

function DialGauge({ pct, color, size = 36, isLight }: { pct: number; color: string; size?: number; isLight: boolean }) {
  const strokeW = Math.round(size / 6);
  const r = (size - strokeW) / 2;
  const cx = size / 2;
  const cy = size / 2 + strokeW / 2;
  const halfCircumference = Math.PI * r;
  const fillLen = halfCircumference * Math.min(pct, 120) / 100;
  const gapLen = halfCircumference - fillLen;

  // Semicircle arc path: left to right across the top
  const arcD = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <svg width={size} height={cy + 2} viewBox={`0 0 ${size} ${cy + 2}`}>
      {/* Track */}
      <path d={arcD} fill="none" stroke={isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"} strokeWidth={strokeW} strokeLinecap="round" />
      {/* Fill */}
      {pct > 0 && (
        <path d={arcD} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round"
          strokeDasharray={`${fillLen} ${gapLen}`}
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      )}
      {/* Center label */}
      <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: size > 40 ? 13 : 10, fontWeight: 800, fill: color }}
      >
        {pct}%
      </text>
    </svg>
  );
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
            <th style={{ width: 76, fontSize: 12, fontWeight: 800, textAlign: "left", padding: "8px 6px", color: isLight ? "#475569" : "rgba(255,255,255,0.5)", letterSpacing: -0.2 }}>
              Week of
            </th>
            {hasTarget && (
              <th style={{ width: 76, fontSize: 12, fontWeight: 800, textAlign: "center", padding: "8px 2px", color: isLight ? "#475569" : "rgba(255,255,255,0.5)", letterSpacing: -0.2 }}>
                Progress
              </th>
            )}
            {dayLabels.map(day => (
              <th key={day} style={{
                fontSize: 12, fontWeight: 800, textAlign: "center", padding: "8px 2px",
                color: isLight ? "#475569" : "rgba(255,255,255,0.5)", letterSpacing: -0.2,
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
                  padding: "4px 6px", whiteSpace: "nowrap", verticalAlign: "middle",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{
                      fontSize: 13, fontWeight: week.isCurrent ? 800 : 600,
                      color: week.isCurrent ? (isLight ? "#1e293b" : "#EAF1FF") : (isLight ? "#64748b" : "rgba(255,255,255,0.45)"),
                    }}>
                      {week.label}
                    </span>
                    {week.isCurrent && <span style={{ fontSize: 9, color: "#5aa6ff", fontWeight: 700 }}>NOW</span>}
                  </div>
                </td>
                {/* Dial gauge */}
                {hasTarget && (
                  <td style={{ padding: "2px 4px", textAlign: "center", verticalAlign: "middle" }}>
                    <DialGauge pct={weekPct} color={wColor} size={72} isLight={isLight} />
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
                      padding: "4px 2px",
                      borderRadius: 5,
                      background: bg,
                      textAlign: "center",
                      verticalAlign: "middle",
                      border: "2px solid transparent",
                      minWidth: 44,
                      transition: "background 0.2s ease",
                    }}>
                      {cell.targetCents > 0 && !empty ? (
                        <>
                          <div style={{
                            fontSize: 13, fontWeight: 800, letterSpacing: -0.5,
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
                          fontSize: empty ? 10 : 11,
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
