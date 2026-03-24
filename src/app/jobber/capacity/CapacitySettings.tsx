"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useIsLight } from "@/lib/hooks";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type DayConfig = Record<typeof DAY_KEYS[number], { enabled: boolean; target: number }>;

const DEFAULT_CONFIG: DayConfig = {
  mon: { enabled: true, target: 0 },
  tue: { enabled: true, target: 0 },
  wed: { enabled: true, target: 0 },
  thu: { enabled: true, target: 0 },
  fri: { enabled: true, target: 0 },
  sat: { enabled: false, target: 0 },
  sun: { enabled: false, target: 0 },
};

export function CapacitySettings({
  currentWeeklyCents,
  currencyCode,
}: {
  currentWeeklyCents: number | null;
  currencyCode: string;
}) {
  const router = useRouter();
  const isLight = useIsLight();
  const [weeklyDollars, setWeeklyDollars] = useState(currentWeeklyCents ? String(currentWeeklyCents / 100) : "");
  const [editingWeekly, setEditingWeekly] = useState(!currentWeeklyCents);
  const [saving, setSaving] = useState(false);
  const [showDaily, setShowDaily] = useState(false);
  const [dayConfig, setDayConfig] = useState<DayConfig>(DEFAULT_CONFIG);
  const weeklyInputRef = useRef<HTMLInputElement>(null);

  // Load day config from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("accuinsight_capacity_days");
      if (stored) {
        const parsed = JSON.parse(stored);
        setDayConfig(prev => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  // Save day config to localStorage
  const saveDayConfig = useCallback((config: DayConfig) => {
    setDayConfig(config);
    try { localStorage.setItem("accuinsight_capacity_days", JSON.stringify(config)); } catch {}
  }, []);

  const enabledDays = DAY_KEYS.filter(k => dayConfig[k].enabled);
  const weeklyTotal = currentWeeklyCents ? currentWeeklyCents / 100 : 0;
  const dailyDefault = enabledDays.length > 0 ? Math.round(weeklyTotal / enabledDays.length) : 0;

  // Get effective daily target for a day
  const dailyTarget = (day: typeof DAY_KEYS[number]) => {
    if (!dayConfig[day].enabled) return 0;
    return dayConfig[day].target > 0 ? dayConfig[day].target : dailyDefault;
  };

  async function saveWeekly() {
    const dollars = parseFloat(weeklyDollars);
    if (isNaN(dollars) || dollars < 0) return;
    setSaving(true);
    try {
      await fetch("/api/settings/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekly_capacity_cents: Math.round(dollars * 100) }),
      });
      setEditingWeekly(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
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

  const money = (dollars: number) => {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(dollars);
    } catch {
      return `$${dollars.toLocaleString()}`;
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
        <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
          Capacity Settings
        </h2>
        <span className="info-tooltip" style={{ width: 16, height: 16, fontSize: 10 }}>?<span className="tooltip-text">Set your weekly revenue target — how much scheduled work you aim to complete each week. Optionally configure per-day targets and disable days you don&apos;t work.</span></span>
      </div>

      {/* Weekly Target */}
      <div style={{
        padding: "14px 16px",
        borderRadius: 12,
        background: isLight ? "rgba(16,185,129,0.04)" : "rgba(16,185,129,0.06)",
        border: `1px solid ${isLight ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.12)"}`,
        marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              Weekly Capacity Target
            </div>
            {!editingWeekly && currentWeeklyCents ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="text-primary" style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
                  {money(currentWeeklyCents / 100)}
                </span>
                <button
                  onClick={() => { setWeeklyDollars(String(currentWeeklyCents / 100)); setEditingWeekly(true); setTimeout(() => weeklyInputRef.current?.focus(), 0); }}
                  className="btn"
                  style={{ padding: "4px 12px", fontSize: 12 }}
                >
                  Edit
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: isLight ? "#334155" : "rgba(255,255,255,0.7)" }}>$</span>
                <input
                  ref={weeklyInputRef}
                  type="number"
                  value={weeklyDollars}
                  onChange={(e) => setWeeklyDollars(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveWeekly(); if (e.key === "Escape" && currentWeeklyCents) setEditingWeekly(false); }}
                  autoFocus={!currentWeeklyCents}
                  placeholder="e.g. 15000"
                  style={{
                    width: 130, padding: "6px 10px", borderRadius: 8,
                    border: `1px solid ${isLight ? "#cbd5e1" : "rgba(255,255,255,0.2)"}`,
                    background: isLight ? "#fff" : "rgba(255,255,255,0.06)",
                    color: isLight ? "#1e293b" : "#fff",
                    fontSize: 15, fontWeight: 700, outline: "none",
                  }}
                />
                <button onClick={saveWeekly} disabled={saving || !weeklyDollars} className="btn" style={{ padding: "6px 14px", fontSize: 12, background: "rgba(16,185,129,0.15)", borderColor: "rgba(16,185,129,0.4)", opacity: saving || !weeklyDollars ? 0.5 : 1 }}>
                  {saving ? "..." : "Save"}
                </button>
                {currentWeeklyCents && (
                  <button onClick={() => setEditingWeekly(false)} className="btn" style={{ padding: "6px 14px", fontSize: 12 }}>Cancel</button>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="text-muted" style={{ fontSize: 11 }}>{enabledDays.length} working days</span>
            {currentWeeklyCents && enabledDays.length > 0 && (
              <span className="text-muted" style={{ fontSize: 11 }}>&bull; {money(dailyDefault)}/day avg</span>
            )}
          </div>
        </div>
      </div>

      {/* Working Days + Daily Targets */}
      <div style={{
        padding: "14px 16px",
        borderRadius: 12,
        background: isLight ? "rgba(90,166,255,0.03)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isLight ? "rgba(90,166,255,0.12)" : "rgba(255,255,255,0.06)"}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div className="text-muted" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Working Days
          </div>
          <button
            onClick={() => setShowDaily(!showDaily)}
            className="btn"
            style={{ padding: "3px 10px", fontSize: 11 }}
          >
            {showDaily ? "Hide Daily Targets" : "Set Daily Targets"}
          </button>
        </div>

        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, minWidth: 350 }}>
          {DAY_KEYS.map((day, i) => {
            const enabled = dayConfig[day].enabled;
            const target = dailyTarget(day);
            return (
              <div key={day} style={{ textAlign: "center" }}>
                <button
                  onClick={() => toggleDay(day)}
                  style={{
                    width: "100%",
                    padding: "8px 4px",
                    borderRadius: 8,
                    border: `1px solid ${enabled ? (isLight ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.25)") : (isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)")}`,
                    background: enabled ? (isLight ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.1)") : "transparent",
                    color: enabled ? (isLight ? "#059669" : "#10b981") : (isLight ? "#94a3b8" : "rgba(255,255,255,0.3)"),
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    textDecoration: enabled ? "none" : "line-through",
                  }}
                >
                  {DAY_LABELS[i]}
                </button>
                {showDaily && enabled && (
                  <input
                    type="text"
                    value={dayConfig[day].target > 0 ? dayConfig[day].target : ""}
                    onChange={(e) => setDayTarget(day, e.target.value)}
                    placeholder={String(dailyDefault)}
                    style={{
                      width: "100%",
                      marginTop: 4,
                      padding: "4px 2px",
                      borderRadius: 6,
                      border: `1px solid ${isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)"}`,
                      background: isLight ? "#fff" : "rgba(255,255,255,0.04)",
                      color: isLight ? "#1e293b" : "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      textAlign: "center",
                      outline: "none",
                    }}
                  />
                )}
                {showDaily && !enabled && (
                  <div className="text-muted" style={{ fontSize: 10, marginTop: 6 }}>Off</div>
                )}
              </div>
            );
          })}
        </div>
        </div>

        {showDaily && (
          <div className="text-muted" style={{ fontSize: 11, marginTop: 10 }}>
            Enter a dollar amount per day, or leave blank to split the weekly target evenly across working days.
          </div>
        )}
      </div>
    </div>
  );
}

// Export the day config reader for use by other components
export function getCapacityDayConfig(): DayConfig {
  try {
    const stored = localStorage.getItem("accuinsight_capacity_days");
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_CONFIG;
}
