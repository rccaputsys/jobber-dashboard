"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
};

function moneyFmt(cents: number, code: string): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100); }
  catch { return `$${Math.round(cents / 100).toLocaleString()}`; }
}

export function CapacityTargetDisplay({ weeklyTargetCents, weeks, defaultWeek = 1, currencyCode, settingsHref, adminConnectionId, workDays: initialWorkDays }: Props) {
  const isLight = useIsLight();
  const router = useRouter();
  const money = (c: number) => moneyFmt(c, currencyCode);
  const [weekIdx, setWeekIdx] = useState(defaultWeek);
  const [hovered, setHovered] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(weeklyTargetCents > 0 ? String(weeklyTargetCents / 100) : "");
  const [saving, setSaving] = useState(false);
  const [hiddenDays, setHiddenDays] = useState<Set<string>>(() => {
    const hidden = new Set<string>();
    const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const active = initialWorkDays || ["Mon", "Tue", "Wed", "Thu", "Fri"];
    for (const d of allDays) {
      if (!active.includes(d)) hidden.add(d);
    }
    return hidden;
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const week = weeks[weekIdx] || weeks[1] || weeks[0];
  const visibleDays = week.days.filter(d => !hiddenDays.has(d.day));
  const booked = visibleDays.reduce((s, d) => s + d.scheduledCents, 0);
  const fillPct = weeklyTargetCents > 0 ? Math.round((booked / weeklyTargetCents) * 100) : 0;

  const toggleDay = (day: string) => {
    const next = new Set(hiddenDays);
    if (next.has(day)) {
      next.delete(day);
    } else {
      if (week.days.length - next.size <= 1) return; // keep at least 1
      next.add(day);
    }
    setHiddenDays(next);
  };

  async function saveTarget() {
    const val = parseFloat(targetInput.replace(/,/g, ""));
    if (isNaN(val) || val < 0) return;
    setSaving(true);
    try {
      await fetch("/api/settings/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekly_capacity_cents: Math.round(val * 100),
          capacity_targets_set: true,
          ...(adminConnectionId ? { connection_id: adminConnectionId } : {}),
        }),
      });
      try { window.dispatchEvent(new CustomEvent("accuinsight:target-saved")); } catch {}
      setEditingTarget(false);
      router.refresh();
    } finally { setSaving(false); }
  }

  const pillBg = isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)";
  const btnStyle = (active: boolean, h: boolean): React.CSSProperties => ({
    padding: "5px 12px", borderRadius: 7, border: "none",
    background: active ? "#5aa6ff" : h ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)") : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  });

  return (
    <div>
      {/* Row 1: Week toggle (left) + target (right) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", gap: 2, background: pillBg, borderRadius: 8, padding: 2 }}>
          {weeks.map((w, i) => (
            <button key={i} onClick={() => setWeekIdx(i)} onMouseEnter={() => setHovered(`w${i}`)} onMouseLeave={() => setHovered(null)} style={btnStyle(weekIdx === i, hovered === `w${i}`)}>
              {w.label}
            </button>
          ))}
        </div>

        {/* Target input — prominent */}
        {editingTarget ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{
              display: "flex", alignItems: "center",
              border: `2px solid #5aa6ff`,
              borderRadius: 8, overflow: "hidden",
              background: isLight ? "#fff" : "rgba(255,255,255,0.06)",
            }}>
              <span style={{ paddingLeft: 8, fontSize: 13, fontWeight: 700, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)" }}>$</span>
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={targetInput}
                onChange={e => setTargetInput(e.target.value.replace(/[^0-9.]/g, ""))}
                onKeyDown={e => { if (e.key === "Enter") saveTarget(); if (e.key === "Escape") setEditingTarget(false); }}
                autoFocus
                placeholder="e.g. 15,000"
                style={{
                  width: 80, padding: "6px 8px", border: "none", background: "transparent",
                  color: isLight ? "#1e293b" : "#fff", fontSize: 14, fontWeight: 700, outline: "none",
                }}
              />
              <span className="text-muted" style={{ fontSize: 10, paddingRight: 8 }}>/wk</span>
            </div>
            <button onClick={saveTarget} disabled={saving} style={{
              padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700,
              background: "#10b981", color: "#fff", cursor: "pointer",
            }}>
              {saving ? "..." : "Save"}
            </button>
            <button onClick={() => setEditingTarget(false)} className="btn" style={{ padding: "6px 10px", fontSize: 11 }}>Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => { setEditingTarget(true); setTargetInput(weeklyTargetCents > 0 ? String(weeklyTargetCents / 100) : ""); setTimeout(() => inputRef.current?.focus(), 0); }}
            style={{
              padding: "6px 14px", borderRadius: 8,
              border: weeklyTargetCents > 0
                ? `1px solid ${isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)"}`
                : `2px dashed #5aa6ff`,
              background: weeklyTargetCents > 0
                ? (isLight ? "#f8fafc" : "rgba(255,255,255,0.04)")
                : (isLight ? "rgba(90,166,255,0.06)" : "rgba(90,166,255,0.08)"),
              cursor: "pointer", transition: "all 0.15s ease",
              fontSize: 12, fontWeight: 700,
              color: weeklyTargetCents > 0 ? (isLight ? "#1e293b" : "#EAF1FF") : "#5aa6ff",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {weeklyTargetCents > 0 ? (
              <>{money(weeklyTargetCents)}/wk</>
            ) : (
              <>+ Set weekly target</>
            )}
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.5 }}>
              <path d="M8.5 1.5l2 2-7 7H1.5V8.5l7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Row 2: Summary */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        {weeklyTargetCents > 0 ? (
          <>
            <span className="text-primary" style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>{fillPct}%</span>
            <span className="text-muted" style={{ fontSize: 12 }}>{money(booked)} of {money(weeklyTargetCents)} booked</span>
          </>
        ) : (
          <>
            <span className="text-primary" style={{ fontSize: 20, fontWeight: 800 }}>{money(booked)}</span>
            <span className="text-muted" style={{ fontSize: 12 }}>booked</span>
          </>
        )}
      </div>

      {/* Row 3: Day toggles */}
      <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
        {week.days.map(d => {
          const hidden = hiddenDays.has(d.day);
          return (
            <button
              key={d.day}
              onClick={() => toggleDay(d.day)}
              style={{
                padding: "3px 0", flex: 1, borderRadius: 5, border: "none",
                background: hidden ? "transparent" : (isLight ? "rgba(90,166,255,0.08)" : "rgba(90,166,255,0.06)"),
                color: hidden ? (isLight ? "#cbd5e1" : "rgba(255,255,255,0.15)") : (isLight ? "#334155" : "rgba(255,255,255,0.7)"),
                fontSize: 10, fontWeight: 700, cursor: "pointer",
                textDecoration: hidden ? "line-through" : "none",
                transition: "all 0.15s ease",
              }}
            >
              {d.day}
            </button>
          );
        })}
      </div>

      {/* Row 4: Horizontal bars */}
      {(() => {
        const dailyTarget = visibleDays.length > 0 ? Math.max(...visibleDays.map(d => d.targetCents), 1) : 1;
        const scaleMax = weeklyTargetCents > 0 ? Math.round(weeklyTargetCents / visibleDays.length) : Math.max(...visibleDays.map(d => d.scheduledCents), 1);

        return (<>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {visibleDays.map(d => {
              const dayFill = d.targetCents > 0 ? Math.round((d.scheduledCents / d.targetCents) * 100) : 0;
              const barWidthPct = d.targetCents > 0 ? Math.min((d.scheduledCents / d.targetCents) * 100, 100) : (scaleMax > 0 ? Math.min((d.scheduledCents / scaleMax) * 100, 100) : 0);
              const overTarget = d.targetCents > 0 && d.scheduledCents > d.targetCents;
              const zero = d.scheduledCents === 0;

              // Bolder colors: green when good, amber when building, red when zero
              const barColor = overTarget ? "#10b981"
                : dayFill >= 70 ? "#10b981"
                : dayFill >= 40 ? "#f59e0b"
                : zero ? "transparent"
                : "#f59e0b";

              return (
                <div key={d.day} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "5px 8px",
                  borderRadius: 8,
                  background: d.isToday ? (isLight ? "rgba(90,166,255,0.06)" : "rgba(90,166,255,0.06)") : "transparent",
                  border: d.isToday ? `1px solid ${isLight ? "rgba(90,166,255,0.15)" : "rgba(90,166,255,0.1)"}` : "1px solid transparent",
                }}>
                  {/* Day label — bigger */}
                  <div style={{
                    width: 34, flexShrink: 0,
                    fontSize: 13, fontWeight: d.isToday ? 800 : 700,
                    color: d.isToday ? "#5aa6ff" : (isLight ? "#334155" : "rgba(255,255,255,0.7)"),
                  }}>
                    {d.day}
                  </div>

                  {/* Bar — taller, bolder track */}
                  <div style={{
                    flex: 1, position: "relative", height: 32, borderRadius: 7,
                    background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}>
                    {/* Fill */}
                    <div style={{
                      position: "absolute", top: 0, left: 0, bottom: 0,
                      width: zero ? "0%" : `${Math.max(barWidthPct, 2)}%`,
                      borderRadius: 7, background: barColor, transition: "width 0.4s ease",
                    }} />
                    {/* Over-target glow */}
                    {overTarget && (
                      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 4, background: "#10b981", borderRadius: "0 7px 7px 0" }} />
                    )}
                    {/* % label inside bar — bigger font */}
                    {d.targetCents > 0 && !zero && (
                      <div style={{
                        position: "absolute", top: 0, bottom: 0, left: 10,
                        display: "flex", alignItems: "center",
                        fontSize: 12, fontWeight: 800,
                        color: barWidthPct > 25 ? "rgba(255,255,255,0.95)" : (isLight ? "#64748b" : "rgba(255,255,255,0.4)"),
                      }}>
                        {dayFill}%
                      </div>
                    )}
                  </div>

                  {/* Amount — bigger, bolder */}
                  <div style={{ width: 75, textAlign: "right", flexShrink: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 800,
                      color: zero ? (isLight ? "#94a3b8" : "rgba(255,255,255,0.25)") : (isLight ? "#1e293b" : "#EAF1FF"),
                    }}>
                      {money(d.scheduledCents)}
                    </div>
                    {d.jobCount > 0 && (
                      <div className="text-muted" style={{ fontSize: 9 }}>{d.jobCount} job{d.jobCount !== 1 ? "s" : ""}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scale at the bottom */}
          {weeklyTargetCents > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingLeft: 42, paddingRight: 83 }}>
              <span className="text-muted" style={{ fontSize: 9 }}>$0</span>
              <span className="text-muted" style={{ fontSize: 9 }}>{money(Math.round(scaleMax / 2))}</span>
              <span className="text-muted" style={{ fontSize: 9 }}>{money(scaleMax)}</span>
            </div>
          )}
        </>);
      })()}
    </div>
  );
}
