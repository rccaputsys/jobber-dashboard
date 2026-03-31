"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useIsLight } from "@/lib/hooks";

const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = typeof DAY_KEYS[number];

type Props = {
  currentWeeklyCents: number | null;
  currentMonthlyCents: number | null;
  currentDailyTargets: Record<string, number>;
  currentWorkDays: string[];
  weeklyJobTarget: number;
  monthlyJobTarget: number;
  currencyCode: string;
  adminConnectionId?: string;
};

function moneyFmt(cents: number, code: string): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100); }
  catch { return `$${Math.round(cents / 100).toLocaleString()}`; }
}

export function CapacitySettings({
  currentWeeklyCents,
  currentMonthlyCents,
  currentDailyTargets,
  currentWorkDays,
  weeklyJobTarget: initialWeeklyJobTarget,
  monthlyJobTarget: initialMonthlyJobTarget,
  currencyCode,
  adminConnectionId,
}: Props) {
  const router = useRouter();
  const isLight = useIsLight();
  const money = useCallback((c: number) => moneyFmt(c, currencyCode), [currencyCode]);

  // Form state
  const [weeklyDollars, setWeeklyDollars] = useState(currentWeeklyCents ? String(currentWeeklyCents / 100) : "");
  const [monthlyDollars, setMonthlyDollars] = useState(currentMonthlyCents ? String(currentMonthlyCents / 100) : "");
  const [workDays, setWorkDays] = useState<Set<Day>>(new Set((currentWorkDays.length > 0 ? currentWorkDays : ["Mon", "Tue", "Wed", "Thu", "Fri"]) as Day[]));
  const [dailyDollars, setDailyDollars] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    for (const day of DAY_KEYS) {
      const cents = currentDailyTargets[day];
      d[day] = cents ? String(cents / 100) : "";
    }
    return d;
  });
  const [weeklyJobs, setWeeklyJobs] = useState(initialWeeklyJobTarget > 0 ? String(initialWeeklyJobTarget) : "");
  const [monthlyJobs, setMonthlyJobs] = useState(initialMonthlyJobTarget > 0 ? String(initialMonthlyJobTarget) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Auto-split weekly across work days
  const splitWeekly = useCallback((dollars: string, days: Set<Day>) => {
    const val = parseFloat(dollars.replace(/,/g, ""));
    if (isNaN(val) || val <= 0 || days.size === 0) return;
    const perDay = Math.round(val / days.size);
    const updated: Record<string, string> = {};
    for (const day of DAY_KEYS) {
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
      if (next.size <= 1) return;
      next.delete(day);
    } else {
      next.add(day);
    }
    setWorkDays(next);
    splitWeekly(weeklyDollars, next);
  };

  const weeklyVal = parseFloat(weeklyDollars.replace(/,/g, "")) || 0;
  const monthlyVal = parseFloat(monthlyDollars.replace(/,/g, "")) || 0;
  const dailyTotal = DAY_KEYS.reduce((s, d) => s + (parseFloat(dailyDollars[d] || "0") || 0), 0);

  async function save() {
    setSaving(true);
    try {
      const weeklyCents = Math.round(weeklyVal * 100);
      const monthlyCents = Math.round(monthlyVal * 100);
      const dailyCents: Record<string, number> = {};
      for (const day of DAY_KEYS) {
        const v = parseFloat(dailyDollars[day] || "0");
        if (v > 0) dailyCents[day] = Math.round(v * 100);
      }

      // Save revenue targets to API
      await fetch("/api/settings/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekly_capacity_cents: weeklyCents,
          monthly_capacity_cents: monthlyCents,
          capacity_daily_targets: dailyCents,
          capacity_work_days: Array.from(workDays),
          capacity_targets_set: true,
          ...(adminConnectionId ? { connection_id: adminConnectionId } : {}),
        }),
      });

      // Save job targets to localStorage
      const wj = parseInt(weeklyJobs) || 0;
      const mj = parseInt(monthlyJobs) || 0;
      try {
        localStorage.setItem("accuinsight_weekly_job_target", String(wj));
        localStorage.setItem("accuinsight_monthly_job_target", String(mj));
      } catch {}

      try { window.dispatchEvent(new CustomEvent("accuinsight:target-saved")); } catch {}
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } finally { setSaving(false); }
  }

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 8,
    border: `1px solid ${isLight ? "#cbd5e1" : "rgba(255,255,255,0.15)"}`,
    background: isLight ? "#fff" : "rgba(255,255,255,0.04)",
    color: isLight ? "#1e293b" : "#fff",
    fontSize: 15, fontWeight: 700, outline: "none",
    width: "100%",
  };

  const sectionStyle: React.CSSProperties = {
    padding: "16px 18px", borderRadius: 12,
    background: isLight ? "rgba(0,0,0,0.015)" : "rgba(255,255,255,0.02)",
    border: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
    marginBottom: 14,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: 0.5, marginBottom: 8,
    color: isLight ? "#64748b" : "rgba(255,255,255,0.4)",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
            Capacity Settings
          </h2>
          <span className="info-tooltip" style={{ width: 16, height: 16, fontSize: 10 }}>?<span className="tooltip-text">Configure your revenue targets, work days, and job goals. Changes apply across all dashboard views.</span></span>
        </div>
      </div>

      {/* Revenue Targets */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Revenue Targets</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div className="text-muted" style={{ fontSize: 10, fontWeight: 600, marginBottom: 4 }}>Weekly</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)" }}>$</span>
              <input
                type="text" inputMode="decimal"
                value={weeklyDollars}
                onChange={e => handleWeeklyChange(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="e.g. 15,000"
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 10, fontWeight: 600, marginBottom: 4 }}>Monthly</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)" }}>$</span>
              <input
                type="text" inputMode="decimal"
                value={monthlyDollars}
                onChange={e => setMonthlyDollars(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="e.g. 60,000"
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Work Days */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Work Days</div>
        <div style={{ display: "flex", gap: 6 }}>
          {DAY_KEYS.map(day => {
            const active = workDays.has(day);
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                style={{
                  flex: 1, padding: "10px 2px", borderRadius: 8,
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
        <div className="text-muted" style={{ fontSize: 10, marginTop: 6 }}>
          {workDays.size} working days{weeklyVal > 0 && workDays.size > 0 ? ` · ${money(Math.round(weeklyVal / workDays.size) * 100)}/day avg` : ""}
        </div>
      </div>

      {/* Daily Targets */}
      {weeklyVal > 0 && (
        <div style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={labelStyle}>Daily Breakdown</div>
            <span className="text-muted" style={{ fontSize: 10 }}>
              Total: {money(Math.round(dailyTotal * 100))}{dailyTotal !== weeklyVal && weeklyVal > 0 && (
                <span style={{ color: "#f59e0b" }}> (weekly is {money(Math.round(weeklyVal * 100))})</span>
              )}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {DAY_KEYS.filter(d => workDays.has(d)).map(day => (
              <div key={day} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 34, fontSize: 12, fontWeight: 700, color: isLight ? "#334155" : "rgba(255,255,255,0.7)" }}>{day}</span>
                <div style={{
                  display: "flex", alignItems: "center", flex: 1,
                  border: `1px solid ${isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 6, background: isLight ? "#fff" : "rgba(255,255,255,0.04)",
                }}>
                  <span style={{ paddingLeft: 8, fontSize: 11, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.3)" }}>$</span>
                  <input type="text" inputMode="decimal" value={dailyDollars[day] || ""}
                    onChange={e => setDailyDollars(prev => ({ ...prev, [day]: e.target.value.replace(/[^0-9.]/g, "") }))}
                    style={{ flex: 1, padding: "6px 8px 6px 4px", border: "none", background: "transparent",
                      color: isLight ? "#1e293b" : "#fff", fontSize: 13, fontWeight: 700, outline: "none" }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="text-muted" style={{ fontSize: 10, marginTop: 6 }}>
            Edit individual days or change the weekly target to auto-split evenly.
          </div>
        </div>
      )}

      {/* Job Targets */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Job Targets</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div className="text-muted" style={{ fontSize: 10, fontWeight: 600, marginBottom: 4 }}>Weekly Jobs</div>
            <input
              type="text" inputMode="numeric"
              value={weeklyJobs}
              onChange={e => setWeeklyJobs(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="e.g. 20"
              style={{ ...inputStyle, fontSize: 14 }}
            />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 10, fontWeight: 600, marginBottom: 4 }}>Monthly Jobs</div>
            <input
              type="text" inputMode="numeric"
              value={monthlyJobs}
              onChange={e => setMonthlyJobs(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="e.g. 80"
              style={{ ...inputStyle, fontSize: 14 }}
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving}
        style={{
          width: "100%", padding: "14px 28px", fontSize: 14, fontWeight: 700,
          background: saved ? "#10b981" : "linear-gradient(135deg, #7c5cff, #5aa6ff)",
          color: "#fff", border: "none", borderRadius: 10, cursor: saving ? "not-allowed" : "pointer",
          boxShadow: "0 4px 12px rgba(124,92,255,0.3)",
          opacity: saving ? 0.6 : 1,
          transition: "all 0.2s ease",
        }}
      >
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save All Settings"}
      </button>
    </div>
  );
}
