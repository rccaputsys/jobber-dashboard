"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useIsLight } from "@/lib/hooks";

type DayData = {
  label: string;
  revenue: number;
  jobCount: number;
  date: string;
};

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type DayConfig = Record<string, { enabled: boolean; target: number }>;

const DEFAULT_CONFIG: DayConfig = {
  mon: { enabled: true, target: 0 },
  tue: { enabled: true, target: 0 },
  wed: { enabled: true, target: 0 },
  thu: { enabled: true, target: 0 },
  fri: { enabled: true, target: 0 },
  sat: { enabled: false, target: 0 },
  sun: { enabled: false, target: 0 },
};

function moneyFmt(cents: number, code: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `$${Math.round(cents / 100).toLocaleString()}`;
  }
}

function fmtDollars(n: number): string {
  return n.toLocaleString("en-US");
}

export function CapacityWeekBreakdown({
  lastWeekDaily,
  thisWeekDaily,
  nextWeekDaily,
  weeklyCapacityCents,
  currencyCode,
}: {
  lastWeekDaily: DayData[];
  thisWeekDaily: DayData[];
  nextWeekDaily: DayData[];
  weeklyCapacityCents: number | null;
  currencyCode: string;
}) {
  const isLight = useIsLight();
  const [week, setWeek] = useState<"last" | "this" | "next">("this");
  const [hovered, setHovered] = useState<string | null>(null);
  const [dayConfig, setDayConfig] = useState<DayConfig>(DEFAULT_CONFIG);
  const [showDaySettings, setShowDaySettings] = useState(false);

  const money = useMemo(() => (cents: number) => moneyFmt(cents, currencyCode), [currencyCode]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("accuinsight_capacity_days");
      if (stored) setDayConfig(prev => ({ ...prev, ...JSON.parse(stored) }));
    } catch {}
  }, []);

  const saveDayConfig = useCallback((config: DayConfig) => {
    setDayConfig(config);
    try { localStorage.setItem("accuinsight_capacity_days", JSON.stringify(config)); } catch {}
  }, []);

  const days = week === "last" ? lastWeekDaily : week === "this" ? thisWeekDaily : nextWeekDaily;

  const enabledDays = DAY_KEYS.filter(k => {
    const cfg = dayConfig[k];
    return cfg ? cfg.enabled : !["sat", "sun"].includes(k);
  });
  const dailyDefaultCents = weeklyCapacityCents && enabledDays.length > 0
    ? Math.round(weeklyCapacityCents / enabledDays.length)
    : 0;

  function getDayTarget(dayKey: string): number {
    const cfg = dayConfig[dayKey];
    if (!cfg || !cfg.enabled) return 0;
    return cfg.target > 0 ? cfg.target * 100 : dailyDefaultCents;
  }

  function isDayEnabled(dayKey: string): boolean {
    const cfg = dayConfig[dayKey];
    return cfg ? cfg.enabled : !["sat", "sun"].includes(dayKey);
  }

  function toggleDay(day: typeof DAY_KEYS[number]) {
    const updated = { ...dayConfig, [day]: { ...dayConfig[day], enabled: !dayConfig[day].enabled } };
    saveDayConfig(updated);
  }

  function setDayTarget(day: typeof DAY_KEYS[number], value: string) {
    const parsed = parseInt(value.replace(/[^0-9]/g, ""), 10);
    const updated = { ...dayConfig, [day]: { ...dayConfig[day], target: isNaN(parsed) ? 0 : parsed } };
    saveDayConfig(updated);
  }

  // Include all day targets in max so target lines never go off the chart
  const allDayTargets = DAY_KEYS.map(k => getDayTarget(k));
  const maxRevenue = Math.max(...days.map(d => d.revenue), ...allDayTargets, 1);
  const BAR_HEIGHT = 180;

  const pillGroup: React.CSSProperties = { display: "flex", gap: 2, background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3 };
  const btnStyle = (active: boolean, h: boolean): React.CSSProperties => ({
    padding: "6px 12px", borderRadius: 8, border: "none",
    background: active ? "linear-gradient(135deg, #7c5cff, #5aa6ff)" : h ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)") : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
    boxShadow: active ? "0 4px 12px rgba(124,92,255,0.3)" : "none", whiteSpace: "nowrap",
  });

  function barColor(revenue: number, target: number): string {
    if (!target) return "#5aa6ff";
    const ratio = revenue / target;
    if (ratio > 1.5) return "#f59e0b";     // way over — amber, not red
    if (ratio >= 0.7) return "#10b981";     // 70-150% = green (wide range)
    if (ratio >= 0.3) return "#f59e0b";     // 30-70% = amber
    return "#5aa6ff";                        // under 30% = blue (neutral, not alarming)
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="panel" style={{ padding: 20, overflow: "visible", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
            Daily Breakdown
          </h2>
          <span className="info-tooltip" style={{ width: 16, height: 16, fontSize: 10 }}>?<span className="tooltip-text">Revenue scheduled for each day. Bars colored vs daily target. Click a day below to toggle working days.</span></span>
        </div>
        <div style={pillGroup}>
          <button onClick={() => setWeek("last")} onMouseEnter={() => setHovered("lw")} onMouseLeave={() => setHovered(null)} style={btnStyle(week === "last", hovered === "lw")}>Last Week</button>
          <button onClick={() => setWeek("this")} onMouseEnter={() => setHovered("tw")} onMouseLeave={() => setHovered(null)} style={btnStyle(week === "this", hovered === "tw")}>This Week</button>
          <button onClick={() => setWeek("next")} onMouseEnter={() => setHovered("nw")} onMouseLeave={() => setHovered(null)} style={btnStyle(week === "next", hovered === "nw")}>Next Week</button>
        </div>
      </div>

      {/* Bar chart with Y-axis */}
      <div style={{ flex: 1, display: "flex", gap: 0, minHeight: BAR_HEIGHT + 60 }}>
        {/* Y-axis labels */}
        <div style={{ width: 48, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", paddingTop: 26, paddingBottom: 42, paddingRight: 6 }}>
          <div className="text-muted" style={{ fontSize: 10, fontWeight: 600, textAlign: "right" }}>{money(maxRevenue)}</div>
          <div className="text-muted" style={{ fontSize: 10, fontWeight: 600, textAlign: "right" }}>{money(Math.round(maxRevenue / 2))}</div>
          <div className="text-muted" style={{ fontSize: 10, fontWeight: 600, textAlign: "right" }}>$0</div>
        </div>

        {/* Bars */}
        <div style={{ flex: 1, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, minWidth: 420 }}>
          {days.map((day, i) => {
            const dayKey = DAY_KEYS[i];
            const enabled = isDayEnabled(dayKey);
            const target = getDayTarget(dayKey);
            const barHeight = maxRevenue > 0 ? Math.max(4, (day.revenue / maxRevenue) * BAR_HEIGHT) : 4;
            const targetHeight = target > 0 && maxRevenue > 0 ? Math.min((target / maxRevenue) * BAR_HEIGHT, BAR_HEIGHT) : 0;
            const color = enabled ? barColor(day.revenue, target) : (isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)");
            const isToday = day.date.slice(0, 10) === today;

            return (
              <div key={dayKey} style={{
                textAlign: "center",
                padding: "8px 4px",
                borderRadius: 10,
                background: isToday ? (isLight ? "rgba(90,166,255,0.06)" : "rgba(90,166,255,0.08)") : "transparent",
                border: isToday ? `1px solid ${isLight ? "rgba(90,166,255,0.2)" : "rgba(90,166,255,0.15)"}` : "1px solid transparent",
                opacity: enabled ? 1 : 0.35,
                display: "flex", flexDirection: "column",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? "#5aa6ff" : (isLight ? "#64748b" : "rgba(255,255,255,0.5)"), marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {day.label}
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", position: "relative", minHeight: 140 }}>
                  {target > 0 && targetHeight > 0 && (
                    <div style={{
                      position: "absolute", bottom: targetHeight, left: "5%", right: "5%",
                      height: 2, background: isLight ? "rgba(16,185,129,0.5)" : "rgba(16,185,129,0.4)", borderRadius: 1,
                    }} />
                  )}
                  <div style={{
                    width: "70%", height: barHeight, borderRadius: 5,
                    background: color, transition: "height 0.3s ease",
                    minHeight: day.revenue > 0 ? 4 : 2,
                  }} />
                </div>

                <div style={{ fontSize: 12, fontWeight: 800, color: enabled ? color : (isLight ? "#cbd5e1" : "rgba(255,255,255,0.15)"), letterSpacing: -0.3, marginTop: 8 }}>
                  {enabled ? money(day.revenue) : "\u2014"}
                </div>
                <div className="text-muted" style={{ fontSize: 10, marginTop: 2 }}>
                  {enabled ? `${day.jobCount} ${day.jobCount === 1 ? "booked" : "booked"}` : "Off"}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* Day config section */}
      <div style={{
        marginTop: 16,
        paddingTop: 14,
        borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="text-muted" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Working Days
            </span>
            <span className="text-muted" style={{ fontSize: 11 }}>
              {enabledDays.length} days
              {weeklyCapacityCents && enabledDays.length > 0 && ` \u2022 ${money(dailyDefaultCents)}/day avg`}
            </span>
          </div>
          <button
            onClick={() => setShowDaySettings(!showDaySettings)}
            className="btn"
            style={{ padding: "3px 10px", fontSize: 11 }}
          >
            {showDaySettings ? "Done" : "Configure"}
          </button>
        </div>

        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, minWidth: 420 }}>
          {DAY_KEYS.map((day, i) => {
            const enabled = dayConfig[day]?.enabled ?? !["sat", "sun"].includes(day);
            const targetVal = dayConfig[day]?.target ?? 0;
            return (
              <div key={day} style={{ textAlign: "center" }}>
                <button
                  onClick={() => toggleDay(day)}
                  style={{
                    width: "100%", padding: "6px 2px", borderRadius: 6,
                    border: `1px solid ${enabled ? (isLight ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.2)") : (isLight ? "#e2e8f0" : "rgba(255,255,255,0.06)")}`,
                    background: enabled ? (isLight ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.08)") : "transparent",
                    color: enabled ? (isLight ? "#059669" : "#10b981") : (isLight ? "#94a3b8" : "rgba(255,255,255,0.25)"),
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                    transition: "all 0.15s ease",
                    textDecoration: enabled ? "none" : "line-through",
                  }}
                >
                  {DAY_LABELS[i]}
                </button>
                {showDaySettings && enabled && (
                  <div style={{
                    display: "flex", alignItems: "center", marginTop: 3,
                    border: `1px solid ${isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 5, overflow: "hidden",
                    background: isLight ? "#fff" : "rgba(255,255,255,0.04)",
                  }}>
                    <span style={{
                      padding: "2px 0 2px 4px",
                      fontSize: 9, fontWeight: 600,
                      color: isLight ? "#94a3b8" : "rgba(255,255,255,0.3)",
                    }}>$</span>
                    <input
                      type="text"
                      value={targetVal > 0 ? fmtDollars(targetVal) : ""}
                      onChange={(e) => setDayTarget(day, e.target.value)}
                      placeholder={fmtDollars(Math.round(dailyDefaultCents / 100))}
                      style={{
                        width: "100%", padding: "3px 3px 3px 2px", border: "none",
                        background: "transparent",
                        color: isLight ? "#1e293b" : "#fff",
                        fontSize: 10, fontWeight: 600, textAlign: "center", outline: "none",
                      }}
                    />
                  </div>
                )}
                {showDaySettings && !enabled && (
                  <div className="text-muted" style={{ fontSize: 9, marginTop: 5 }}>Off</div>
                )}
              </div>
            );
          })}
        </div>
        </div>
        {showDaySettings && (
          <div className="text-muted" style={{ fontSize: 10, marginTop: 8 }}>
            Enter $ per day, or leave blank to split weekly target evenly.
          </div>
        )}
      </div>
    </div>
  );
}
