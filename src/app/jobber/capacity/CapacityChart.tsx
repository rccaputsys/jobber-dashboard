"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useIsLight } from "@/lib/hooks";

type WeekBar = {
  label: string;
  revenueCents: number;
  count: number;
  isCurrent: boolean;
  isFuture: boolean;
};

type MonthBar = {
  label: string;
  revenueCents: number;
  count: number;
  isCurrent: boolean;
  isFuture: boolean;
};

type Props = {
  weeks: WeekBar[];
  months?: MonthBar[];
  weeklyTargetCents: number | null;
  monthlyTargetCents?: number | null;
  currencyCode: string;
  connectionId?: string;
  adminConnectionId?: string;
};

function moneyFmt(cents: number, code: string): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100); }
  catch { return `$${Math.round(cents / 100).toLocaleString()}`; }
}

function usePersistedNumber(key: string, defaultVal: number): [number, (v: number) => void] {
  const [value, setValue] = useState(defaultVal);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) setValue(Number(stored));
    } catch {}
  }, [key]);
  const set = useCallback((v: number) => {
    setValue(v);
    try { localStorage.setItem(key, String(v)); } catch {}
  }, [key]);
  return [value, set];
}

export function CapacityChart({ weeks, months, weeklyTargetCents, monthlyTargetCents, currencyCode }: Props) {
  const isLight = useIsLight();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [view, setView] = useState<"weekly" | "monthly">("weekly");
  const [metric, setMetric] = useState<"dollars" | "jobs">("dollars");
  const [btnHovered, setBtnHovered] = useState<string | null>(null);
  const [weeklyJobTarget, setWeeklyJobTarget] = usePersistedNumber("accuinsight_weekly_job_target", 0);
  const [monthlyJobTarget, setMonthlyJobTarget] = usePersistedNumber("accuinsight_monthly_job_target", 0);
  const [editingJobTarget, setEditingJobTarget] = useState(false);
  const [jobTargetInput, setJobTargetInput] = useState("");
  const [monthlyJobTargetInput, setMonthlyJobTargetInput] = useState("");

  const money = useMemo(() => (c: number) => moneyFmt(c, currencyCode), [currencyCode]);

  const bars = view === "monthly" && months ? months : weeks;
  const dollarTarget = view === "monthly" ? (monthlyTargetCents || 0) : (weeklyTargetCents || 0);
  const jobTarget = view === "monthly" ? monthlyJobTarget : weeklyJobTarget;
  const target = metric === "jobs" ? jobTarget : dollarTarget;

  const barValues = bars.map(w => metric === "jobs" ? w.count : w.revenueCents);
  const maxVal = Math.max(...barValues, target, 1);
  const chartHeight = 200;

  // Summary stats
  const currentBar = bars.find(w => w.isCurrent);
  const currentValue = currentBar ? (metric === "jobs" ? currentBar.count : currentBar.revenueCents) : 0;
  const fillRate = target > 0 ? currentValue / target : 0;
  const gap = target > 0 ? target - currentValue : 0;

  const pillGroup: React.CSSProperties = { display: "flex", gap: 2, background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)", borderRadius: 8, padding: 2 };
  const pBtnStyle = (active: boolean, h: boolean): React.CSSProperties => ({
    padding: "4px 10px", borderRadius: 6, border: "none",
    background: active ? "linear-gradient(135deg, #7c5cff, #5aa6ff)" : h ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)") : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
    boxShadow: active ? "0 2px 8px rgba(124,92,255,0.3)" : "none",
  });

  const labelColor = isLight ? "#475569" : "rgba(255,255,255,0.5)";
  const primaryColor = isLight ? "#1e293b" : "#EAF1FF";
  const mutedColor = isLight ? "#64748b" : "rgba(255,255,255,0.5)";
  const gridLine = isLight ? "#f1f5f9" : "rgba(255,255,255,0.04)";
  const targetLineColor = isLight ? "#10b981" : "rgba(16,185,129,0.5)";

  function barColor(val: number, isFuture: boolean) {
    if (!target) return isFuture ? "#5aa6ff" : "#5aa6ff80";
    const ratio = val / target;
    const base = ratio >= 0.7 ? "#10b981" : ratio >= 0.3 ? "#f59e0b" : "#5aa6ff";
    return isFuture ? base : `${base}90`;
  }

  const hovered = hoveredIdx !== null ? bars[hoveredIdx] : null;
  const hoveredValue = hovered ? (metric === "jobs" ? hovered.count : hovered.revenueCents) : 0;
  const hoveredFill = hovered && target > 0 ? Math.round((hoveredValue / target) * 100) : 0;

  // Y-axis labels
  const ySteps = 4;
  const yLabels = Array.from({ length: ySteps }, (_, i) => {
    const val = (maxVal / ySteps) * (ySteps - i);
    if (metric === "jobs") return String(Math.round(val));
    const dollars = val / 100;
    if (dollars >= 1000) return `$${Math.round(dollars / 1000)}k`;
    return `$${Math.round(dollars)}`;
  });

  function formatValue(val: number) {
    if (metric === "jobs") return `${val} ${val === 1 ? "job" : "jobs"}`;
    return money(val);
  }

  function saveJobTargets() {
    const weekly = parseInt(jobTargetInput) || 0;
    const monthly = parseInt(monthlyJobTargetInput) || 0;
    setWeeklyJobTarget(weekly);
    setMonthlyJobTarget(monthly);
    setEditingJobTarget(false);
  }

  return (
    <div>
      {/* Stats header */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        {/* Period toggle */}
        <div style={pillGroup}>
          <button onClick={() => { setView("weekly"); setHoveredIdx(null); }} onMouseEnter={() => setBtnHovered("w")} onMouseLeave={() => setBtnHovered(null)} style={pBtnStyle(view === "weekly", btnHovered === "w")}>Weekly</button>
          <button onClick={() => { setView("monthly"); setHoveredIdx(null); }} onMouseEnter={() => setBtnHovered("m")} onMouseLeave={() => setBtnHovered(null)} style={pBtnStyle(view === "monthly", btnHovered === "m")}>Monthly</button>
        </div>
        {/* Metric toggle */}
        <div style={pillGroup}>
          <button onClick={() => { setMetric("dollars"); setHoveredIdx(null); }} onMouseEnter={() => setBtnHovered("$")} onMouseLeave={() => setBtnHovered(null)} style={pBtnStyle(metric === "dollars", btnHovered === "$")}>Dollars</button>
          <button onClick={() => { setMetric("jobs"); setHoveredIdx(null); }} onMouseEnter={() => setBtnHovered("j")} onMouseLeave={() => setBtnHovered(null)} style={pBtnStyle(metric === "jobs", btnHovered === "j")}>Jobs</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        {currentBar && (
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: primaryColor, letterSpacing: -1.5, lineHeight: 1 }}>
              {formatValue(currentValue)}
            </div>
            <div style={{ fontSize: 12, color: mutedColor, marginTop: 4, fontWeight: 500 }}>
              {view === "monthly" ? "This Month" : "This Week"} &bull; {currentBar.count} booked
            </div>
          </div>
        )}
        {target > 0 && currentBar && (
          <div style={{ borderLeft: `1px solid ${gridLine}`, paddingLeft: 16 }}>
            <div style={{
              fontSize: 18, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1,
              color: fillRate >= 0.7 ? "#10b981" : fillRate >= 0.3 ? "#f59e0b" : "#5aa6ff",
            }}>
              {Math.round(fillRate * 100)}%
            </div>
            <div style={{ fontSize: 12, color: mutedColor, marginTop: 4, fontWeight: 500 }}>
              Fill Rate
            </div>
          </div>
        )}
        {target > 0 && gap > 0 && (
          <div style={{ borderLeft: `1px solid ${gridLine}`, paddingLeft: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b", letterSpacing: -0.5, lineHeight: 1 }}>
              {formatValue(gap)}
            </div>
            <div style={{ fontSize: 12, color: mutedColor, marginTop: 4, fontWeight: 500 }}>
              Left to Book {view === "monthly" ? "This Month" : "This Week"}
            </div>
          </div>
        )}
        {target > 0 && (
          <div style={{ borderLeft: `1px solid ${gridLine}`, paddingLeft: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: mutedColor, letterSpacing: -0.5, lineHeight: 1 }}>
              {formatValue(target)}
            </div>
            <div style={{ fontSize: 12, color: mutedColor, marginTop: 4, fontWeight: 500 }}>
              {view === "monthly" ? "Monthly" : "Weekly"} Target
            </div>
          </div>
        )}
        {!target && metric === "dollars" && (
          <div style={{ borderLeft: `1px solid ${gridLine}`, paddingLeft: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#5aa6ff" }}>
              Set a {view === "monthly" ? "monthly" : "weekly"} target above to see fill rate
            </span>
          </div>
        )}
        {metric === "jobs" && (
          <div style={{ borderLeft: `1px solid ${gridLine}`, paddingLeft: 16 }}>
            {editingJobTarget ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div>
                  <div className="text-muted" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Weekly</div>
                  <input type="number" value={jobTargetInput} onChange={e => setJobTargetInput(e.target.value)} placeholder="e.g. 20" onKeyDown={e => { if (e.key === "Enter") saveJobTargets(); }} autoFocus style={{
                    width: 60, padding: "4px 8px", borderRadius: 6,
                    border: `1px solid ${isLight ? "#cbd5e1" : "rgba(255,255,255,0.2)"}`,
                    background: isLight ? "#fff" : "rgba(255,255,255,0.06)",
                    color: isLight ? "#1e293b" : "#fff", fontSize: 13, fontWeight: 700, outline: "none",
                  }} />
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Monthly</div>
                  <input type="number" value={monthlyJobTargetInput} onChange={e => setMonthlyJobTargetInput(e.target.value)} placeholder="e.g. 80" onKeyDown={e => { if (e.key === "Enter") saveJobTargets(); }} style={{
                    width: 60, padding: "4px 8px", borderRadius: 6,
                    border: `1px solid ${isLight ? "#cbd5e1" : "rgba(255,255,255,0.2)"}`,
                    background: isLight ? "#fff" : "rgba(255,255,255,0.06)",
                    color: isLight ? "#1e293b" : "#fff", fontSize: 13, fontWeight: 700, outline: "none",
                  }} />
                </div>
                <button onClick={saveJobTargets} className="btn" style={{ padding: "4px 12px", fontSize: 11, background: "rgba(16,185,129,0.15)", borderColor: "rgba(16,185,129,0.4)" }}>Save</button>
                <button onClick={() => setEditingJobTarget(false)} className="btn" style={{ padding: "4px 10px", fontSize: 11 }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => { setEditingJobTarget(true); setJobTargetInput(String(weeklyJobTarget || "")); setMonthlyJobTargetInput(String(monthlyJobTarget || "")); }} className="btn" style={{ padding: "6px 14px", fontSize: 12 }}>
                {target > 0 ? "Edit Job Targets" : "Set Job Targets"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hover summary */}
      <div style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {hovered && (
          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            padding: "6px 16px", borderRadius: 8,
            background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)",
            fontSize: 12,
          }}>
            <span className="text-primary" style={{ fontWeight: 700 }}>
              {hovered.label} {hovered.isCurrent ? "(Current)" : hovered.isFuture ? "(Upcoming)" : "(Past)"}
            </span>
            <span style={{ color: mutedColor }}>{formatValue(hoveredValue)}</span>
            <span style={{ color: mutedColor }}>{hovered.count} booked</span>
            {target > 0 && (
              <span style={{
                fontWeight: 800,
                color: hoveredFill >= 70 ? "#10b981" : hoveredFill >= 30 ? "#f59e0b" : "#5aa6ff",
              }}>
                {hoveredFill}% filled
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ display: "flex", gap: 0, position: "relative", overflow: "visible", minWidth: 0, paddingTop: 8 }}>
        {/* Y-axis */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          height: chartHeight, paddingRight: 8, flexShrink: 0, width: 44,
        }}>
          {yLabels.map((label, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 600, color: labelColor, textAlign: "right", lineHeight: 1 }}>
              {label}
            </div>
          ))}
        </div>

        {/* Bars */}
        <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
          {/* Grid lines */}
          {yLabels.map((_, i) => (
            <div key={i} style={{
              position: "absolute", left: 0, right: 0,
              top: `${(i / yLabels.length) * 100}%`,
              borderTop: `1px solid ${gridLine}`,
            }} />
          ))}

          {/* Target line */}
          {target > 0 && (
            <div style={{
              position: "absolute", left: 0, right: 0,
              bottom: `${(target / maxVal) * (chartHeight - 16)}px`,
              borderTop: `2px dashed ${targetLineColor}`,
              zIndex: 2,
            }}>
              <span style={{
                position: "absolute", right: 0, top: -14,
                fontSize: 9, fontWeight: 700, color: targetLineColor,
              }}>
                Target
              </span>
            </div>
          )}

          {/* Bar area */}
          <div style={{
            display: "flex", alignItems: "flex-end",
            height: chartHeight, gap: 6,
            position: "relative", zIndex: 1,
          }}>
            {bars.map((w, i) => {
              const val = metric === "jobs" ? w.count : w.revenueCents;
              const barH = maxVal > 0 ? (val / maxVal) * (chartHeight - 16) : 0;
              const isHov = hoveredIdx === i;
              const color = barColor(val, w.isFuture || w.isCurrent);

              return (
                <div
                  key={i}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", cursor: "pointer",
                  }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Bar */}
                  <div style={{
                    width: "75%", maxWidth: 52,
                    height: Math.max(barH, 4),
                    borderRadius: "6px 6px 2px 2px",
                    background: color,
                    transition: "all 0.15s ease",
                    opacity: hoveredIdx !== null && !isHov ? 0.4 : 1,
                    transform: isHov ? "scaleX(1.08)" : "scaleX(1)",
                    border: w.isCurrent ? `2px solid ${isLight ? "#1e293b" : "#EAF1FF"}` : "none",
                    boxSizing: "border-box" as const,
                  }} />

                  {/* Week label */}
                  <div style={{
                    fontSize: 10, fontWeight: w.isCurrent ? 800 : 600,
                    color: w.isCurrent ? primaryColor : (isHov ? primaryColor : labelColor),
                    marginTop: 6, whiteSpace: "nowrap",
                  }}>
                    {w.label}
                  </div>
                  {w.isCurrent && (
                    <div style={{ fontSize: 8, fontWeight: 700, color: "#5aa6ff", textTransform: "uppercase", letterSpacing: 0.3 }}>
                      Now
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#5aa6ff80" }} />
          <span style={{ fontSize: 11, color: mutedColor }}>Past</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#5aa6ff", border: `2px solid ${primaryColor}` }} />
          <span style={{ fontSize: 11, color: mutedColor }}>Current</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#5aa6ff" }} />
          <span style={{ fontSize: 11, color: mutedColor }}>Upcoming</span>
        </div>
        {target > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 0, borderTop: `2px dashed ${targetLineColor}` }} />
            <span style={{ fontSize: 11, color: mutedColor }}>Target</span>
          </div>
        )}
      </div>
    </div>
  );
}
