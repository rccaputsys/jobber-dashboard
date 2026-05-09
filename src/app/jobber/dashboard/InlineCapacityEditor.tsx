"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useIsLight } from "@/lib/hooks";
import { useCapacityMeasure } from "./useCapacityMeasure";

const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = typeof DAY_KEYS[number];

type Props = {
  currentWorkDays: string[];
  adminConnectionId?: string;
};

export function InlineCapacityEditor({
  currentWorkDays,
  adminConnectionId,
}: Props) {
  const router = useRouter();
  const isLight = useIsLight();
  const { weeklyJobsTarget, setWeeklyJobsTarget } = useCapacityMeasure();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [jobsTarget, setJobsTargetInput] = useState("");
  const [days, setDays] = useState<Set<Day>>(new Set());

  const initialDays = (currentWorkDays && currentWorkDays.length > 0
    ? currentWorkDays
    : ["Mon", "Tue", "Wed", "Thu", "Fri"]) as Day[];

  useEffect(() => {
    if (open) {
      setJobsTargetInput(weeklyJobsTarget > 0 ? String(weeklyJobsTarget) : "");
      setDays(new Set(initialDays));
      setSaved(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, weeklyJobsTarget]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggleDay = (d: Day) => {
    const next = new Set(days);
    if (next.has(d)) { if (next.size > 1) next.delete(d); } else { next.add(d); }
    setDays(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      const jobs = Math.round(parseFloat(jobsTarget.replace(/,/g, "")) || 0);
      await fetch("/api/settings/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capacity_work_days: Array.from(days),
          capacity_targets_set: true,
          ...(adminConnectionId ? { connection_id: adminConnectionId } : {}),
        }),
      });
      setWeeklyJobsTarget(jobs);
      try { window.dispatchEvent(new CustomEvent("accuinsight:target-saved")); } catch {}
      setSaved(true);
      setTimeout(() => { setOpen(false); router.refresh(); }, 600);
    } finally {
      setSaving(false);
    }
  };

  const gearButton = (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
      aria-label="Edit weekly capacity target"
      title="Edit weekly capacity target"
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 26, height: 26, padding: 0, borderRadius: 6,
        background: "transparent",
        border: `1px solid ${isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
        color: isLight ? "#64748b" : "#a8b3c4",
        cursor: "pointer", flexShrink: 0, transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)";
        e.currentTarget.style.color = isLight ? "#1e293b" : "#e8ecf4";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = isLight ? "#64748b" : "#a8b3c4";
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  );

  if (!open) return gearButton;

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  };
  const modal: React.CSSProperties = {
    width: "100%", maxWidth: 380,
    background: isLight ? "#ffffff" : "#0d1526",
    border: `1px solid ${isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", padding: 18,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
    color: isLight ? "#64748b" : "rgba(255,255,255,0.4)", marginBottom: 6, display: "block",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: `1px solid ${isLight ? "#cbd5e1" : "rgba(255,255,255,0.15)"}`,
    background: isLight ? "#ffffff" : "rgba(255,255,255,0.04)",
    color: isLight ? "#1e293b" : "#ffffff",
    fontSize: 16, fontWeight: 700, outline: "none", boxSizing: "border-box",
  };

  return (
    <>
      {gearButton}
      <div style={overlay} onClick={() => !saving && setOpen(false)}>
        <div style={modal} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: isLight ? "#0f1729" : "#ffffff" }}>
              Weekly capacity
            </h3>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close"
              style={{ width: 28, height: 28, padding: 0, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", color: isLight ? "#64748b" : "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Jobs per week</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)" }}>#</span>
              <input type="text" inputMode="numeric" value={jobsTarget}
                onChange={(e) => setJobsTargetInput(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="25" autoFocus style={inputStyle} />
              <span style={{ fontSize: 13, fontWeight: 600, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>per week</span>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Work days</label>
            <div style={{ display: "flex", gap: 4 }}>
              {DAY_KEYS.map((d) => {
                const on = days.has(d);
                return (
                  <button key={d} type="button" onClick={() => toggleDay(d)}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 7,
                      border: `1px solid ${on ? (isLight ? "rgba(16,185,129,0.4)" : "rgba(16,185,129,0.4)") : (isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)")}`,
                      background: on ? (isLight ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.12)") : "transparent",
                      color: on ? (isLight ? "#059669" : "#10b981") : (isLight ? "#cbd5e1" : "rgba(255,255,255,0.25)"),
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                      textDecoration: on ? "none" : "line-through",
                      transition: "all 0.15s ease",
                    }}>{d}</button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={save} disabled={saving}
              style={{
                flex: 1, padding: "12px 0", borderRadius: 8,
                background: saved ? "#10b981" : "linear-gradient(135deg, #5aa6ff, #7c5cff)",
                color: "#fff", border: "none", fontSize: 14, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(124,92,255,0.25)",
                opacity: saving ? 0.6 : 1, transition: "all 0.2s ease",
              }}>
              {saving ? "Saving..." : saved ? "Saved" : "Save"}
            </button>
            <button type="button" onClick={() => setOpen(false)} disabled={saving}
              style={{
                padding: "12px 18px", borderRadius: 8,
                background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)",
                color: isLight ? "#64748b" : "rgba(255,255,255,0.6)",
                border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>Cancel</button>
          </div>
        </div>
      </div>
    </>
  );
}
