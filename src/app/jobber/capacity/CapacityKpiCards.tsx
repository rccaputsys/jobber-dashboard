"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useIsLight } from "@/lib/hooks";

type PeriodMetrics = {
  scheduledRevenue: string;
  scheduledRevenueCents: number;
  targetCents: number;
  fillRate: number;
  gapCents: number;
  gapLabel: string;
  avgRevenuePerDay: string;
  avgRevenuePerDayCents: number;
  dailyTargetCents: number;
  jobCount: number;
  periodLabel: string;
  priorRevenueCents: number;
  revenuePerJobCents: number;
  priorJobCount: number;
  priorRevenuePerJobCents: number;
};

export type { PeriodMetrics };

function fillColor(fill: number) {
  if (fill > 1.5) return "#f59e0b";    // way overbooked — amber
  if (fill >= 0.7) return "#10b981";   // 70-150% = green (healthy range)
  if (fill >= 0.3) return "#f59e0b";   // 30-70% = amber (building)
  return "#5aa6ff";                     // under 30% = blue (just starting)
}

function fillLabel(fill: number) {
  if (fill > 1.5) return "Overbooked";
  if (fill > 1.15) return "Ahead of Target";
  if (fill >= 0.85) return "On Target";
  if (fill >= 0.7) return "Almost There";
  if (fill >= 0.3) return "Building";
  return "Getting Started";
}

/* ---- SVG donut gauge (tachometer style) ---- */
function Gauge({ fillRate, size = 170, isLight = false }: { fillRate: number; size?: number; isLight?: boolean }) {
  const stroke = 18;
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75;
  const totalArc = circumference * arcFraction;

  const color = fillColor(fillRate);
  const pctDisplay = Math.round(fillRate * 100);
  const trackColor = isLight ? "#e2e8f0" : "rgba(255,255,255,0.12)";

  // Allow visual fill up to 100% of arc, but show >100% in the number
  const fillPct = Math.min(Math.max(fillRate, 0), 1);
  const filledArc = totalArc * fillPct;
  const dashOffset = totalArc - filledArc;
  const rotation = 135;
  const isOver = fillRate > 1.15;
  const label = fillLabel(fillRate);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none" stroke={trackColor} strokeWidth={stroke}
          strokeDasharray={`${totalArc} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />
        {/* Glow */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none" stroke={color} strokeWidth={stroke + 10}
          strokeDasharray={`${totalArc} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          opacity={isOver ? 0.2 : 0.12}
          transform={`rotate(${rotation} ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease, opacity 0.3s ease" }}
        />
        {/* Fill arc */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${totalArc} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease" }}
        />
        {/* Over-target pulse ring when >100% */}
        {isOver && (
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none" stroke={color} strokeWidth={2}
            strokeDasharray={`${totalArc} ${circumference}`}
            strokeLinecap="round"
            opacity={0.4}
            transform={`rotate(${rotation} ${cx} ${cy})`}
            style={{ animation: "pulse 2s ease-in-out infinite" }}
          />
        )}
      </svg>
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -55%)", textAlign: "center",
      }}>
        <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1, color, letterSpacing: -1.5, transition: "color 0.3s ease" }}>
          {pctDisplay}%
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: isOver ? color : (isLight ? "#94a3b8" : "rgba(255,255,255,0.4)"), marginTop: 3, transition: "color 0.3s ease" }}>
          {label}
        </div>
      </div>
    </div>
  );
}

/* ---- Reusable target input ---- */
function TargetInput({ label, field, currentCents, currencyCode, isLight, adminConnectionId }: {
  label: string;
  field: string; // "weekly_capacity_cents" or "monthly_capacity_cents"
  currentCents: number | null;
  currencyCode: string;
  isLight: boolean;
  adminConnectionId?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [dollars, setDollars] = useState(currentCents ? String(currentCents / 100) : "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const money = (v: number) => {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(v);
    } catch { return `$${v.toLocaleString()}`; }
  };

  async function save() {
    const val = parseFloat(dollars.replace(/,/g, ""));
    if (isNaN(val) || val < 0) return;
    setSaving(true);
    try {
      await fetch("/api/settings/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: Math.round(val * 100), ...(adminConnectionId ? { connection_id: adminConnectionId } : {}) }),
      });
      setEditing(false);
      router.refresh();
    } finally { setSaving(false); }
  }

  function handleChange(raw: string) {
    setDollars(raw.replace(/[^0-9.]/g, ""));
  }

  const displayValue = dollars && !isNaN(Number(dollars))
    ? Number(dollars).toLocaleString("en-US")
    : dollars;

  if (!editing && currentCents) {
    return (
      <button
        onClick={() => { setDollars(String(currentCents / 100)); setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 8, border: "none",
          background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)",
          cursor: "pointer", transition: "all 0.15s ease",
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)" }}>
          {label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: isLight ? "#1e293b" : "#EAF1FF" }}>
          {money(currentCents / 100)}
        </span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.4 }}>
          <path d="M8.5 1.5l2 2-7 7H1.5V8.5l7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );
  }

  if (!editing && !currentCents) {
    return (
      <button
        onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 8,
          border: `1px dashed ${isLight ? "#cbd5e1" : "rgba(255,255,255,0.15)"}`,
          background: "transparent", cursor: "pointer", transition: "all 0.15s ease",
          color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)",
          fontSize: 11, fontWeight: 600,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>
          {label}
        </span>
        <span>+ Set</span>
      </button>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)", marginRight: 2 }}>
        {label}
      </span>
      <div style={{
        display: "flex", alignItems: "center",
        border: `1px solid ${isLight ? "#7c5cff40" : "rgba(124,92,255,0.3)"}`,
        borderRadius: 8, overflow: "hidden",
        background: isLight ? "rgba(124,92,255,0.05)" : "rgba(124,92,255,0.1)",
      }}>
        <span style={{ padding: "5px 0 5px 8px", fontSize: 12, fontWeight: 700, color: isLight ? "#64748b" : "rgba(255,255,255,0.5)" }}>$</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          autoFocus
          placeholder="0"
          style={{
            width: 80, padding: "5px 6px 5px 3px", border: "none",
            background: "transparent", color: isLight ? "#1e293b" : "#fff",
            fontSize: 12, fontWeight: 700, outline: "none",
          }}
        />
      </div>
      <button onClick={save} disabled={saving || !dollars} className="btn" style={{ padding: "5px 10px", fontSize: 11, background: "rgba(16,185,129,0.15)", borderColor: "rgba(16,185,129,0.4)", opacity: saving || !dollars ? 0.5 : 1 }}>
        {saving ? "..." : "Save"}
      </button>
      <button onClick={() => setEditing(false)} className="btn" style={{ padding: "5px 8px", fontSize: 11 }}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}

/* ---- Main component ---- */
export function CapacityKpiCards({
  thisWeek,
  lastWeek,
  thisMonth,
  lastMonth,
  allTime,
  nextWeek,
  nextMonth,
  hasTarget,
  currentWeeklyCents,
  currentMonthlyCents,
  currencyCode,
  adminConnectionId,
  projectionSummary,
  targetsOnly,
}: {
  thisWeek: PeriodMetrics;
  lastWeek?: PeriodMetrics;
  thisMonth: PeriodMetrics;
  lastMonth?: PeriodMetrics;
  allTime?: PeriodMetrics;
  nextWeek: PeriodMetrics;
  nextMonth: PeriodMetrics;
  hasTarget: boolean;
  currentWeeklyCents: number | null;
  currentMonthlyCents: number | null;
  currencyCode: string;
  adminConnectionId?: string;
  projectionSummary?: { fillPct: number; gapCents: number; weeks: number } | null;
  targetsOnly?: boolean;
}) {
  type PeriodKey = "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "allTime";
  const [period, setPeriod] = useState<PeriodKey>("thisWeek");
  const isLight = useIsLight();
  const [hovered, setHovered] = useState<string | null>(null);

  const metricsMap: Record<PeriodKey, PeriodMetrics> = {
    thisWeek,
    lastWeek: lastWeek || thisWeek,
    thisMonth,
    lastMonth: lastMonth || thisMonth,
    allTime: allTime || thisWeek,
  };
  const metrics = metricsMap[period];

  const options: { key: PeriodKey; label: string }[] = [
    { key: "thisWeek", label: "This Week" },
    { key: "lastWeek", label: "Last Week" },
    { key: "thisMonth", label: "This Month" },
    { key: "lastMonth", label: "Last Month" },
    { key: "allTime", label: "All Time" },
  ];

  const pillGroup: React.CSSProperties = { display: "flex", gap: 2, background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3 };
  const btnStyle = (active: boolean, h: boolean): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 8, border: "none",
    background: active ? "linear-gradient(135deg, #7c5cff, #5aa6ff)" : h ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)") : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
    boxShadow: active ? "0 4px 12px rgba(124,92,255,0.3)" : "none", whiteSpace: "nowrap",
  });

  const revenueColor = hasTarget ? fillColor(metrics.fillRate) : "#5aa6ff";
  const gapOver = metrics.gapCents <= 0;
  // Gap color: matches fillColor thresholds
  const gapColor = gapOver ? fillColor(metrics.fillRate) : "#f59e0b";

  const moneyFmt = (cents: number) => {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(cents / 100);
    } catch { return `$${Math.round(cents / 100).toLocaleString()}`; }
  };

  const pctFmt = (v: number) => `${Math.round(v * 100)}%`;

  // Targets-only mode: just render the target inputs inline
  if (targetsOnly) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <TargetInput label="Weekly Target" field="weekly_capacity_cents" currentCents={currentWeeklyCents} currencyCode={currencyCode} isLight={isLight} adminConnectionId={adminConnectionId} />
        <div style={{ width: 1, height: 20, background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)" }} />
        <TargetInput label="Monthly Target" field="monthly_capacity_cents" currentCents={currentMonthlyCents} currencyCode={currencyCode} isLight={isLight} adminConnectionId={adminConnectionId} />
      </div>
    );
  }

  return (
    <div className="panel" style={{ padding: 0, overflow: "visible" }}>
      {/* Row 1: Target input + period toggle */}
      <div style={{
        padding: "14px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 10,
        borderBottom: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <TargetInput label="Weekly Target" field="weekly_capacity_cents" currentCents={currentWeeklyCents} currencyCode={currencyCode} isLight={isLight} adminConnectionId={adminConnectionId} />
          <div style={{ width: 1, height: 20, background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)" }} />
          <TargetInput label="Monthly Target" field="monthly_capacity_cents" currentCents={currentMonthlyCents} currencyCode={currencyCode} isLight={isLight} adminConnectionId={adminConnectionId} />
        </div>
        <div style={pillGroup}>
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => setPeriod(o.key)}
              onMouseEnter={() => setHovered(o.key)}
              onMouseLeave={() => setHovered(null)}
              style={btnStyle(period === o.key, hovered === o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Hero stats + capacity fill bar */}
      <div style={{ padding: "24px 24px 20px" }}>
        {/* Stats header row — like the collection chart */}
        <div style={{ display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, color: revenueColor, letterSpacing: -1.5, lineHeight: 1 }}>
              {metrics.scheduledRevenue}
            </div>
            <div style={{ fontSize: 12, color: isLight ? "#64748b" : "rgba(255,255,255,0.5)", marginTop: 4, fontWeight: 500 }}>
              Scheduled &bull; {metrics.periodLabel}
            </div>
          </div>
          {hasTarget && (
            <div style={{ borderLeft: `1px solid ${isLight ? "#e2e8f0" : "rgba(255,255,255,0.06)"}`, paddingLeft: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: revenueColor, letterSpacing: -0.5, lineHeight: 1 }}>
                {pctFmt(metrics.fillRate)}
              </div>
              <div style={{ fontSize: 12, color: isLight ? "#64748b" : "rgba(255,255,255,0.5)", marginTop: 4, fontWeight: 500 }}>
                {fillLabel(metrics.fillRate)}
              </div>
            </div>
          )}
          <div style={{ borderLeft: `1px solid ${isLight ? "#e2e8f0" : "rgba(255,255,255,0.06)"}`, paddingLeft: 24 }}>
            <div className="text-primary" style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1 }}>
              {metrics.jobCount}
            </div>
            <div style={{ fontSize: 12, color: isLight ? "#64748b" : "rgba(255,255,255,0.5)", marginTop: 4, fontWeight: 500 }}>
              Booked
            </div>
          </div>
          {metrics.priorRevenueCents > 0 && (() => {
            const changePct = ((metrics.scheduledRevenueCents - metrics.priorRevenueCents) / metrics.priorRevenueCents) * 100;
            const up = changePct >= 0;
            return (
              <div style={{ borderLeft: `1px solid ${isLight ? "#e2e8f0" : "rgba(255,255,255,0.06)"}`, paddingLeft: 24 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: up ? "#10b981" : "#ef4444", letterSpacing: -0.5, lineHeight: 1 }}>
                  {up ? "+" : ""}{Math.round(changePct)}%
                </div>
                <div style={{ fontSize: 12, color: isLight ? "#64748b" : "rgba(255,255,255,0.5)", marginTop: 4, fontWeight: 500 }}>
                  vs Prior Period
                </div>
              </div>
            );
          })()}
        </div>

        {/* Capacity fill bar — big horizontal progress bar */}
        {hasTarget && (
          <div style={{ marginBottom: 20 }}>
            <div style={{
              height: 24, borderRadius: 12,
              background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)",
              overflow: "hidden", position: "relative",
            }}>
              <div style={{
                height: "100%", borderRadius: 12,
                width: `${Math.min(metrics.fillRate * 100, 100)}%`,
                background: `linear-gradient(90deg, ${revenueColor}cc, ${revenueColor})`,
                transition: "width 0.5s ease",
                minWidth: metrics.fillRate > 0 ? 8 : 0,
              }} />
              {/* Target marker at 100% */}
              <div style={{
                position: "absolute", top: 0, bottom: 0, left: "100%",
                width: 2, background: isLight ? "#334155" : "rgba(255,255,255,0.4)",
                transform: "translateX(-2px)",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.3)" }}>$0</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: isLight ? "#475569" : "rgba(255,255,255,0.5)" }}>Target: {moneyFmt(metrics.targetCents)}</span>
            </div>
          </div>
        )}

        {/* KPI stat cards */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 20, flexWrap: "wrap" }}>

          {/* KPI stat cards — neutral values, color only on change indicators */}
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: hasTarget ? "1fr 1fr" : "1fr", gap: 12, minWidth: 200, alignItems: "center" }}>
            {/* Gap to Target */}
            {hasTarget && (
              <div className="kpi-secondary" data-accent={gapOver ? (metrics.fillRate > 1.15 ? "amber" : "green") : "amber"} style={{
                borderLeft: `3px solid ${gapColor}`,
                padding: "16px 18px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                  <span className="text-muted" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Gap to Target
                  </span>
                  <span className="info-tooltip" style={{ width: 14, height: 14, fontSize: 9 }}>?<span className="tooltip-text">How much more you need to book to hit target. Green = on target (85-115%). Amber/red = under or overbooked.</span></span>
                </div>
                <div className="text-primary" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1 }}>
                  {metrics.gapLabel}
                </div>
                <div className="text-muted" style={{ fontSize: 11, marginTop: 6 }}>
                  {moneyFmt(metrics.targetCents)} target
                </div>
              </div>
            )}

            {/* Avg Job Value */}
            <div className="kpi-secondary" style={{
              borderLeft: `3px solid ${isLight ? "#94a3b8" : "rgba(255,255,255,0.15)"}`,
              padding: "16px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                <span className="text-muted" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Avg Job Value
                </span>
                <span className="info-tooltip" style={{ width: 14, height: 14, fontSize: 9 }}>?<span className="tooltip-text">Average revenue per job. If this drops, you may be filling capacity with lower-value work.</span></span>
              </div>
              <div className="text-primary" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1 }}>
                {metrics.revenuePerJobCents > 0 ? moneyFmt(metrics.revenuePerJobCents) : "\u2014"}
              </div>
              <div style={{ fontSize: 11, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                {metrics.priorRevenuePerJobCents > 0 && metrics.revenuePerJobCents > 0 ? (() => {
                  const pct = ((metrics.revenuePerJobCents - metrics.priorRevenuePerJobCents) / metrics.priorRevenuePerJobCents) * 100;
                  const up = pct >= 0;
                  return (
                    <span style={{ fontWeight: 700, color: up ? "#10b981" : "#ef4444" }}>
                      {up ? "\u2191" : "\u2193"} {Math.abs(Math.round(pct))}%
                      <span className="text-muted" style={{ fontWeight: 500, marginLeft: 3 }}>vs prior</span>
                    </span>
                  );
                })() : (
                  <span className="text-muted">{metrics.jobCount} {metrics.jobCount === 1 ? "booked" : "booked"}</span>
                )}
              </div>
            </div>

            {/* Booked */}
            {hasTarget && (
              <div className="kpi-secondary" style={{
                borderLeft: `3px solid ${isLight ? "#94a3b8" : "rgba(255,255,255,0.15)"}`,
                padding: "16px 18px",
              }}>
                <div className="text-muted" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                  Booked
                </div>
                <div className="text-primary" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1 }}>
                  {metrics.jobCount}
                </div>
                <div style={{ fontSize: 11, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  {metrics.priorJobCount > 0 ? (() => {
                    const pct = ((metrics.jobCount - metrics.priorJobCount) / metrics.priorJobCount) * 100;
                    const up = pct >= 0;
                    return (
                      <span style={{ fontWeight: 700, color: up ? "#10b981" : "#ef4444" }}>
                        {up ? "\u2191" : "\u2193"} {Math.abs(Math.round(pct))}%
                        <span className="text-muted" style={{ fontWeight: 500, marginLeft: 3 }}>vs prior</span>
                      </span>
                    );
                  })() : (
                    <span className="text-muted">{metrics.periodLabel}</span>
                  )}
                </div>
              </div>
            )}

            {/* Revenue per Day */}
            {hasTarget && (
              <div className="kpi-secondary" style={{
                borderLeft: `3px solid ${isLight ? "#94a3b8" : "rgba(255,255,255,0.15)"}`,
                padding: "16px 18px",
              }}>
                <div className="text-muted" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                  Revenue / Day
                </div>
                <div className="text-primary" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1 }}>
                  {metrics.avgRevenuePerDay}
                </div>
                <div className="text-muted" style={{ fontSize: 11, marginTop: 6 }}>
                  {metrics.dailyTargetCents > 0 ? `${moneyFmt(metrics.dailyTargetCents)} daily target` : metrics.periodLabel}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Projection callout — bottom strip */}
      {hasTarget && projectionSummary && projectionSummary.weeks > 0 && (
        <div style={{
          padding: "10px 28px",
          borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
          background: isLight ? "rgba(0,0,0,0.01)" : "rgba(255,255,255,0.02)",
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: isLight ? "#334155" : "rgba(255,255,255,0.85)" }}>
            Next {projectionSummary.weeks} weeks: <span style={{ color: fillColor(projectionSummary.fillPct), fontWeight: 800 }}>{pctFmt(projectionSummary.fillPct)}</span> filled.
          </span>
          {projectionSummary.gapCents > 0 ? (
            <span style={{ fontSize: 13, color: isLight ? "#64748b" : "rgba(255,255,255,0.5)", marginLeft: 6 }}>
              Book {moneyFmt(projectionSummary.gapCents)} more to hit all targets.
            </span>
          ) : projectionSummary.fillPct > 1.3 ? (
            <span style={{ fontSize: 13, color: "#ef4444", marginLeft: 6 }}>
              Overbooked by {moneyFmt(Math.abs(projectionSummary.gapCents))} — consider rescheduling.
            </span>
          ) : projectionSummary.fillPct > 1.15 ? (
            <span style={{ fontSize: 13, color: "#f59e0b", marginLeft: 6 }}>
              Over target by {moneyFmt(Math.abs(projectionSummary.gapCents))} — monitor closely.
            </span>
          ) : (
            <span style={{ fontSize: 13, color: "#10b981", marginLeft: 6 }}>
              Right on target.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
