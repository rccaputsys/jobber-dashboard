"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useIsLight } from "@/lib/hooks";

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = typeof ALL_DAYS[number];

type Props = {
  connectionId: string;
  adminConnectionId?: string;
  currencyCode: string;
  currentWeeklyCents: number | null;
  currentDailyTargets: Record<string, number>;
  currentWorkDays: string[];
};

function moneyFmt(cents: number, code: string): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100); }
  catch { return `$${Math.round(cents / 100).toLocaleString()}`; }
}

export function CapacityTargetSetup({ connectionId, adminConnectionId, currencyCode, currentWeeklyCents, currentDailyTargets, currentWorkDays }: Props) {
  const isLight = useIsLight();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [weeklyDollars, setWeeklyDollars] = useState(currentWeeklyCents ? String(currentWeeklyCents / 100) : "");
  const [workDays, setWorkDays] = useState<Set<Day>>(new Set((currentWorkDays.length > 0 ? currentWorkDays : ["Mon", "Tue", "Wed", "Thu", "Fri"]) as Day[]));
  const [dailyDollars, setDailyDollars] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    for (const day of ALL_DAYS) {
      const cents = currentDailyTargets[day];
      d[day] = cents ? String(cents / 100) : "";
    }
    return d;
  });

  const money = useCallback((cents: number) => moneyFmt(cents, currencyCode), [currencyCode]);

  // When weekly changes, auto-split across active work days
  const splitWeekly = useCallback((dollars: string, days: Set<Day>) => {
    const val = parseFloat(dollars.replace(/,/g, ""));
    if (isNaN(val) || val <= 0 || days.size === 0) return;
    const perDay = Math.round(val / days.size);
    const updated: Record<string, string> = {};
    for (const day of ALL_DAYS) {
      updated[day] = days.has(day) ? String(perDay) : "";
    }
    setDailyDollars(updated);
  }, []);

  const handleWeeklyChange = (val: string) => {
    setWeeklyDollars(val);
    splitWeekly(val, workDays);
  };

  const toggleDay = (day: Day) => {
    const next = new Set(workDays);
    if (next.has(day)) {
      if (next.size <= 1) return; // minimum 1 day
      next.delete(day);
    } else {
      next.add(day);
    }
    setWorkDays(next);
    splitWeekly(weeklyDollars, next);
  };

  const handleDailyChange = (day: string, val: string) => {
    setDailyDollars(prev => ({ ...prev, [day]: val }));
  };

  // Compute totals for the bar visualization
  const weeklyVal = parseFloat(weeklyDollars.replace(/,/g, "")) || 0;
  const dailyTotal = ALL_DAYS.reduce((s, d) => s + (parseFloat(dailyDollars[d] || "0") || 0), 0);
  const maxDaily = Math.max(...ALL_DAYS.map(d => parseFloat(dailyDollars[d] || "0") || 0), 1);

  async function save() {
    setSaving(true);
    try {
      const weeklyCents = Math.round(weeklyVal * 100);
      const dailyCents: Record<string, number> = {};
      for (const day of ALL_DAYS) {
        const v = parseFloat(dailyDollars[day] || "0");
        if (v > 0) dailyCents[day] = Math.round(v * 100);
      }

      await fetch("/api/settings/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekly_capacity_cents: weeklyCents,
          capacity_daily_targets: dailyCents,
          capacity_work_days: Array.from(workDays),
          capacity_targets_set: true,
          ...(adminConnectionId ? { connection_id: adminConnectionId } : {}),
        }),
      });

      try { window.dispatchEvent(new CustomEvent("accuinsight:target-saved")); } catch {}
      router.refresh();
    } finally { setSaving(false); }
  }

  async function skip() {
    setSaving(true);
    try {
      await fetch("/api/settings/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekly_capacity_cents: 0,
          capacity_targets_set: true,
          ...(adminConnectionId ? { connection_id: adminConnectionId } : {}),
        }),
      });
      router.refresh();
    } finally { setSaving(false); }
  }

  const inputStyle = (active: boolean): React.CSSProperties => ({
    width: "100%", padding: "6px 4px 6px 2px", border: "none",
    background: "transparent",
    color: active ? (isLight ? "#1e293b" : "#fff") : (isLight ? "#94a3b8" : "rgba(255,255,255,0.3)"),
    fontSize: 13, fontWeight: 700, textAlign: "center", outline: "none",
  });

  const canSave = weeklyVal > 0;

  return (
    <div className="panel" style={{ padding: "24px", overflow: "visible" }}>
      <div style={{ marginBottom: 16 }}>
        <div className="text-primary" style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
          How much work do you want each week?
        </div>
        <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
          Set a weekly revenue target so you can see at a glance whether your schedule is full enough. You can change this anytime.
        </div>
      </div>

      {/* Weekly target input */}
      <div style={{ marginBottom: 20 }}>
        <div className="text-muted" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
          Weekly Revenue Target
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "8px 12px", borderRadius: 10,
          border: `2px solid ${weeklyVal > 0 ? "#10b981" : (isLight ? "#cbd5e1" : "rgba(255,255,255,0.15)")}`,
          background: isLight ? "#fff" : "rgba(255,255,255,0.04)",
          maxWidth: 240,
          transition: "border-color 0.2s ease",
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)" }}>$</span>
          <input
            type="text"
            inputMode="decimal"
            value={weeklyDollars}
            onChange={e => handleWeeklyChange(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="e.g. 15,000"
            style={{
              flex: 1, border: "none", background: "transparent", outline: "none",
              fontSize: 22, fontWeight: 800, color: isLight ? "#1e293b" : "#EAF1FF",
              letterSpacing: -0.5,
            }}
          />
          <span className="text-muted" style={{ fontSize: 11, fontWeight: 600 }}>/week</span>
        </div>
      </div>

      {/* Work days */}
      <div style={{ marginBottom: 20 }}>
        <div className="text-muted" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
          Work Days
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {ALL_DAYS.map(day => {
            const active = workDays.has(day);
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                style={{
                  flex: 1, padding: "8px 2px", borderRadius: 8,
                  border: `1px solid ${active ? (isLight ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.25)") : (isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)")}`,
                  background: active ? (isLight ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.1)") : "transparent",
                  color: active ? (isLight ? "#059669" : "#10b981") : (isLight ? "#94a3b8" : "rgba(255,255,255,0.3)"),
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  transition: "all 0.15s ease",
                  textDecoration: active ? "none" : "line-through",
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily breakdown with bars */}
      {weeklyVal > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="text-muted" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            Daily Breakdown
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 120 }}>
            {ALL_DAYS.map(day => {
              const active = workDays.has(day);
              const val = parseFloat(dailyDollars[day] || "0") || 0;
              const barPct = maxDaily > 0 ? (val / maxDaily) * 100 : 0;

              return (
                <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                  {/* Bar */}
                  <div style={{
                    width: "70%", height: `${Math.max(barPct, 4)}%`, minHeight: 4,
                    borderRadius: "5px 5px 2px 2px",
                    background: active ? (isLight ? "#10b981" : "rgba(16,185,129,0.6)") : (isLight ? "#e2e8f0" : "rgba(255,255,255,0.06)"),
                    transition: "height 0.3s ease, background 0.2s ease",
                    opacity: active ? 1 : 0.3,
                  }} />
                  {/* Input */}
                  <div style={{
                    marginTop: 6, width: "100%",
                    border: `1px solid ${active ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)") : "transparent"}`,
                    borderRadius: 6, overflow: "hidden",
                    background: active ? (isLight ? "#fff" : "rgba(255,255,255,0.04)") : "transparent",
                  }}>
                    {active ? (
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span style={{ fontSize: 9, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.3)", paddingLeft: 3 }}>$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={dailyDollars[day]}
                          onChange={e => handleDailyChange(day, e.target.value.replace(/[^0-9.]/g, ""))}
                          style={inputStyle(true)}
                        />
                      </div>
                    ) : (
                      <div style={{ padding: "6px 0", textAlign: "center", fontSize: 10, color: isLight ? "#cbd5e1" : "rgba(255,255,255,0.15)" }}>Off</div>
                    )}
                  </div>
                  {/* Day label */}
                  <div style={{
                    fontSize: 10, fontWeight: 700, marginTop: 4,
                    color: active ? (isLight ? "#64748b" : "rgba(255,255,255,0.5)") : (isLight ? "#cbd5e1" : "rgba(255,255,255,0.15)"),
                    textTransform: "uppercase", letterSpacing: 0.3,
                  }}>
                    {day}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Sum check */}
          <div className="text-muted" style={{ fontSize: 11, marginTop: 8, textAlign: "right" }}>
            Daily total: {money(Math.round(dailyTotal * 100))} {dailyTotal !== weeklyVal && weeklyVal > 0 && (
              <span style={{ color: "#f59e0b" }}>(target is {money(Math.round(weeklyVal * 100))})</span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={save}
          disabled={!canSave || saving}
          style={{
            padding: "12px 28px", fontSize: 14, fontWeight: 700,
            background: canSave ? "linear-gradient(135deg, #10b981, #059669)" : (isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)"),
            color: canSave ? "#fff" : (isLight ? "#94a3b8" : "rgba(255,255,255,0.3)"),
            border: "none", borderRadius: 10, cursor: canSave ? "pointer" : "not-allowed",
            boxShadow: canSave ? "0 4px 12px rgba(16,185,129,0.3)" : "none",
            opacity: saving ? 0.6 : 1,
            transition: "all 0.2s ease",
          }}
        >
          {saving ? "Saving..." : "Save Target"}
        </button>
        <button
          onClick={skip}
          disabled={saving}
          className="text-muted"
          style={{
            background: "none", border: "none", fontSize: 13, fontWeight: 600,
            cursor: "pointer", padding: "8px 12px",
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
