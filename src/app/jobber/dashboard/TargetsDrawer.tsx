"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useIsLight } from "@/lib/hooks";

const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = typeof DAY_KEYS[number];

type Suggestions = {
  weekly_capacity_cents?: number | null;
  monthly_capacity_cents?: number | null;
  annual_sales_target_cents?: number | null;
  close_rate?: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  adminConnectionId?: string;
};

function dollarPlaceholder(cents: number | null | undefined): string {
  if (!cents) return "";
  return Math.round(cents / 100).toLocaleString("en-US");
}

export function TargetsDrawer({ open, onClose, adminConnectionId }: Props) {
  const isLight = useIsLight();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions>({});

  const [weeklyDollars, setWeeklyDollars] = useState("");
  const [monthlyDollars, setMonthlyDollars] = useState("");
  const [monthlyManual, setMonthlyManual] = useState(false);
  const [workDays, setWorkDays] = useState<Set<Day>>(new Set(["Mon", "Tue", "Wed", "Thu", "Fri"] as Day[]));
  const [dailyDollars, setDailyDollars] = useState<Record<string, string>>({});
  const [annualSales, setAnnualSales] = useState("");
  const [closeRate, setCloseRate] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSaved(false);
    const qs = adminConnectionId ? `?connection_id=${adminConnectionId}` : "";
    Promise.all([
      fetch(`/api/settings/capacity${qs}`).then(r => r.json()),
      fetch(`/api/settings/suggestions${qs}`).then(r => r.json()),
    ]).then(([current, sugg]) => {
      setSuggestions(sugg.suggestions || {});
      const wc = current.weekly_capacity_cents;
      const mc = current.monthly_capacity_cents;
      setWeeklyDollars(wc ? String(wc / 100) : "");
      const autoMonthly = wc ? Math.round((wc / 100) * (52 / 12)) : 0;
      const isManual = mc && wc && Math.abs(mc / 100 - autoMonthly) > 1;
      setMonthlyDollars(isManual ? String(mc / 100) : "");
      setMonthlyManual(!!isManual);
      setWorkDays(new Set((current.capacity_work_days || ["Mon", "Tue", "Wed", "Thu", "Fri"]) as Day[]));
      const dt = current.capacity_daily_targets || {};
      const dd: Record<string, string> = {};
      for (const d of DAY_KEYS) dd[d] = dt[d] ? String(dt[d] / 100) : "";
      setDailyDollars(dd);
      setAnnualSales(current.annual_sales_target_cents ? String(current.annual_sales_target_cents / 100) : "");
      setCloseRate(current.close_rate_target != null ? String(current.close_rate_target) : "");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [open, adminConnectionId]);

  const splitWeekly = useCallback((dollars: string, days: Set<Day>) => {
    const val = parseFloat(dollars.replace(/,/g, ""));
    if (isNaN(val) || val <= 0 || days.size === 0) return;
    const perDay = Math.round(val / days.size);
    const updated: Record<string, string> = {};
    for (const d of DAY_KEYS) updated[d] = days.has(d) ? String(perDay) : "";
    setDailyDollars(updated);
  }, []);

  const handleWeeklyChange = (val: string) => {
    setWeeklyDollars(val);
    splitWeekly(val, workDays);
  };

  const toggleDay = (day: Day) => {
    const next = new Set(workDays);
    if (next.has(day)) { if (next.size <= 1) return; next.delete(day); }
    else next.add(day);
    setWorkDays(next);
    splitWeekly(weeklyDollars, next);
  };

  async function save() {
    setSaving(true);
    try {
      const weeklyVal = parseFloat(weeklyDollars.replace(/,/g, "")) || 0;
      const effectiveMonthly = monthlyManual && monthlyDollars
        ? parseFloat(monthlyDollars.replace(/,/g, "")) || 0
        : Math.round(weeklyVal * (52 / 12));
      const dailyCents: Record<string, number> = {};
      for (const d of DAY_KEYS) {
        const v = parseFloat(dailyDollars[d] || "0");
        if (v > 0) dailyCents[d] = Math.round(v * 100);
      }
      await fetch("/api/settings/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekly_capacity_cents: Math.round(weeklyVal * 100),
          monthly_capacity_cents: Math.round(effectiveMonthly * 100),
          capacity_daily_targets: dailyCents,
          capacity_work_days: Array.from(workDays),
          capacity_targets_set: true,
          annual_sales_target_cents: Math.round((parseFloat(annualSales.replace(/,/g, "")) || 0) * 100),
          close_rate_target: parseFloat(closeRate) || null,
          ...(adminConnectionId ? { connection_id: adminConnectionId } : {}),
        }),
      });
      try { window.dispatchEvent(new CustomEvent("accuinsight:target-saved")); } catch {}
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); router.refresh(); }, 800);
    } finally { setSaving(false); }
  }

  const weeklyVal = parseFloat(weeklyDollars.replace(/,/g, "")) || 0;
  const autoMonthlyDisplay = weeklyVal > 0 ? Math.round(weeklyVal * (52 / 12)).toLocaleString("en-US") : "—";

  // Styles
  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
    opacity: open ? 1 : 0,
    pointerEvents: open ? "auto" : "none",
    transition: "opacity 0.25s ease",
  };
  const drawer: React.CSSProperties = {
    position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 1001,
    width: "min(380px, 90vw)",
    display: "flex", flexDirection: "column",
    background: isLight
      ? "linear-gradient(180deg, #ffffff, #f8fafc)"
      : "linear-gradient(180deg, #0d1526, #0a1020)",
    borderRight: `1px solid ${isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)"}`,
    boxShadow: "8px 0 40px rgba(0,0,0,0.3)",
    transform: open ? "translateX(0)" : "translateX(-100%)",
    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  };
  const inp: React.CSSProperties = {
    padding: "6px 10px", borderRadius: 7,
    border: `1px solid ${isLight ? "#cbd5e1" : "rgba(255,255,255,0.15)"}`,
    background: isLight ? "#fff" : "rgba(255,255,255,0.04)",
    color: isLight ? "#1e293b" : "#fff",
    fontSize: 14, fontWeight: 700, outline: "none", width: "100%",
  };
  const lbl: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: 0.5, marginBottom: 4,
    color: isLight ? "#64748b" : "rgba(255,255,255,0.4)",
  };
  const section: React.CSSProperties = {
    padding: "10px 14px", borderRadius: 10,
    background: isLight ? "rgba(0,0,0,0.015)" : "rgba(255,255,255,0.02)",
    border: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"}`,
    marginBottom: 8,
  };
  const divider: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
    color: isLight ? "#334155" : "rgba(255,255,255,0.5)",
    borderBottom: `1px solid ${isLight ? "#e2e8f0" : "rgba(255,255,255,0.06)"}`,
    paddingBottom: 4, marginBottom: 6, marginTop: 4,
  };

  return (
    <>
      <div style={overlay} onClick={onClose} />
      <div style={drawer}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isLight ? "#1e293b" : "#EAF1FF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
            </svg>
            <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Targets</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: isLight ? "#64748b" : "rgba(255,255,255,0.5)", padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body — fills remaining space, no scroll */}
        <div style={{ flex: 1, padding: "0 16px", display: "flex", flexDirection: "column" }}>
          {loading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 24, height: 24, border: "3px solid rgba(90,166,255,0.2)", borderTopColor: "#5aa6ff", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
                <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>Loading...</div>
              </div>
            </div>
          ) : (<>
            {/* Suggestion hint */}
            {suggestions.weekly_capacity_cents && !weeklyDollars && (
              <div style={{
                padding: "8px 12px", borderRadius: 8, marginBottom: 8,
                background: isLight ? "rgba(90,166,255,0.06)" : "rgba(90,166,255,0.08)",
                fontSize: 11, color: isLight ? "#334155" : "rgba(255,255,255,0.6)",
              }}>
                Placeholders are based on your last 4 weeks.
              </div>
            )}

            {/* SALES — first */}
            <div style={divider}>Sales</div>

            <div style={{ ...section, padding: "10px 12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={lbl}>Annual Sales Goal</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.3)" }}>$</span>
                    <input type="text" inputMode="decimal" value={annualSales}
                      onChange={e => setAnnualSales(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder={dollarPlaceholder(suggestions.annual_sales_target_cents)}
                      style={inp} />
                  </div>
                </div>
                <div>
                  <div style={lbl}>Close Rate</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <input type="text" inputMode="decimal" value={closeRate}
                      onChange={e => setCloseRate(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder={suggestions.close_rate != null ? String(suggestions.close_rate) : "40"}
                      style={inp} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.3)" }}>%</span>
                  </div>
                </div>
              </div>
              {suggestions.close_rate != null && (
                <div className="text-muted" style={{ fontSize: 9, marginTop: 4 }}>
                  Actual close rate (last 4 weeks): ~{suggestions.close_rate}%
                </div>
              )}
            </div>

            {/* CAPACITY */}
            <div style={divider}>Scheduled Capacity</div>

            {/* Work days — compact row */}
            <div style={{ ...section, padding: "8px 12px" }}>
              <div style={{ display: "flex", gap: 3 }}>
                {DAY_KEYS.map(day => {
                  const on = workDays.has(day);
                  return (
                    <button key={day} onClick={() => toggleDay(day)} style={{
                      flex: 1, padding: "6px 0", borderRadius: 6, border: "none",
                      background: on ? (isLight ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.1)") : "transparent",
                      color: on ? (isLight ? "#059669" : "#10b981") : (isLight ? "#cbd5e1" : "rgba(255,255,255,0.2)"),
                      fontSize: 10, fontWeight: 700, cursor: "pointer",
                      textDecoration: on ? "none" : "line-through",
                    }}>{day}</button>
                  );
                })}
              </div>
            </div>

            {/* Weekly + Monthly side by side */}
            <div style={{ ...section, padding: "10px 12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={lbl}>Weekly</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.3)" }}>$</span>
                    <input type="text" inputMode="decimal" value={weeklyDollars}
                      onChange={e => handleWeeklyChange(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder={dollarPlaceholder(suggestions.weekly_capacity_cents)}
                      style={inp} />
                  </div>
                </div>
                <div>
                  <div style={lbl}>
                    Monthly
                    {!monthlyManual && weeklyVal > 0 && <span style={{ fontWeight: 500, opacity: 0.6 }}> (auto)</span>}
                  </div>
                  {monthlyManual ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.3)" }}>$</span>
                      <input type="text" inputMode="decimal" value={monthlyDollars}
                        onChange={e => setMonthlyDollars(e.target.value.replace(/[^0-9.]/g, ""))}
                        style={inp} />
                      <button onClick={() => { setMonthlyManual(false); setMonthlyDollars(""); }} style={{
                        background: "none", border: "none", cursor: "pointer", fontSize: 9, fontWeight: 600,
                        color: "#5aa6ff", whiteSpace: "nowrap", padding: "2px 4px",
                      }}>Auto</button>
                    </div>
                  ) : (
                    <button onClick={() => {
                      setMonthlyManual(true);
                      setMonthlyDollars(weeklyVal > 0 ? String(Math.round(weeklyVal * (52 / 12))) : "");
                    }} style={{
                      display: "flex", alignItems: "center", gap: 3, width: "100%",
                      padding: "6px 10px", borderRadius: 7, border: "none", cursor: "pointer",
                      background: isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)",
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.2)" }}>$</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.2)" }}>
                        {autoMonthlyDisplay}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Daily targets — compact grid, only when weekly is set */}
            {weeklyVal > 0 && (
              <div style={{ ...section, padding: "8px 12px" }}>
                <div style={lbl}>Daily Capacity</div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${workDays.size}, 1fr)`, gap: 4 }}>
                  {DAY_KEYS.filter(d => workDays.has(d)).map(day => (
                    <div key={day} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.35)", marginBottom: 2 }}>{day}</div>
                      <div style={{
                        display: "flex", alignItems: "center",
                        border: `1px solid ${isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 5, background: isLight ? "#fff" : "rgba(255,255,255,0.03)",
                      }}>
                        <span style={{ paddingLeft: 4, fontSize: 9, color: isLight ? "#cbd5e1" : "rgba(255,255,255,0.2)" }}>$</span>
                        <input type="text" inputMode="decimal" value={dailyDollars[day] || ""}
                          onChange={e => setDailyDollars(prev => ({ ...prev, [day]: e.target.value.replace(/[^0-9.]/g, "") }))}
                          style={{ width: "100%", padding: "4px 4px 4px 2px", border: "none", background: "transparent",
                            color: isLight ? "#1e293b" : "#fff", fontSize: 12, fontWeight: 700, outline: "none", textAlign: "center" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spacer to push save to bottom */}
            <div style={{ flex: 1 }} />
          </>)}
        </div>

        {/* Save / Cancel — pinned to bottom */}
        {!loading && (
          <div style={{ padding: "12px 16px 16px", flexShrink: 0, display: "flex", gap: 8 }}>
            <button onClick={save} disabled={saving} style={{
              flex: 1, padding: "12px 0", fontSize: 13, fontWeight: 700,
              background: saved ? "#10b981" : "linear-gradient(135deg, #7c5cff, #5aa6ff)",
              color: "#fff", border: "none", borderRadius: 10,
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(124,92,255,0.3)",
              opacity: saving ? 0.6 : 1, transition: "all 0.2s ease",
            }}>
              {saving ? "Saving..." : saved ? "Saved" : "Save Targets"}
            </button>
            <button onClick={onClose} style={{
              padding: "12px 16px", fontSize: 12, fontWeight: 600,
              background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)",
              color: isLight ? "#64748b" : "rgba(255,255,255,0.5)",
              border: "none", borderRadius: 10, cursor: "pointer",
            }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  );
}
