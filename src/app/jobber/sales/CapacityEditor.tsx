"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CapacityEditor({ currentCents }: { currentCents: number | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentCents ? String(currentCents / 100) : "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const dollars = parseFloat(value);
    if (isNaN(dollars) || dollars < 0) return;
    setSaving(true);
    try {
      await fetch("/api/settings/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekly_capacity_cents: Math.round(dollars * 100) }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const tooltip = (
    <span className="info-tooltip" style={{ marginLeft: 6 }}>
      ?
      <span className="tooltip-text">
        Your weekly capacity target is the total revenue from scheduled jobs you aim to complete each week. This drives the fill rate KPIs and color-coding on the chart above.
      </span>
    </span>
  );

  // No target set — show prominent onboarding card
  if (!currentCents && !editing) {
    return (
      <div className="capacity-onboard">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, flexShrink: 0,
          }}>
            &#127919;
          </div>
          <div>
            <div className="text-primary" style={{ fontSize: 15, fontWeight: 700 }}>
              Set Your Weekly Revenue Target
              {tooltip}
            </div>
            <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
              How much scheduled revenue do you want to hit each week?
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
          <span className="text-secondary" style={{ fontSize: 18, fontWeight: 700 }}>$</span>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            placeholder="e.g. 15000"
          />
          <button
            onClick={handleSave}
            disabled={saving || !value}
            className="btn-primary"
            style={{
              padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 14,
              border: "none", cursor: "pointer", opacity: saving || !value ? 0.5 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {saving ? "Saving..." : "Set Target"}
          </button>
        </div>
        <div className="text-muted" style={{ fontSize: 11, marginTop: 10 }}>
          You can change this anytime. We&apos;ll color-code your chart and KPIs based on how close you are to this target.
        </div>
      </div>
    );
  }

  // Target set, not editing — show current value with edit option
  if (!editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
        }}>
          &#127919;
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span className="text-secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Weekly Target
            </span>
            {tooltip}
          </div>
          <div className="text-primary" style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, marginTop: 2 }}>
            ${(currentCents! / 100).toLocaleString()}
          </div>
        </div>
        <button
          onClick={() => {
            setValue(currentCents ? String(currentCents / 100) : "");
            setEditing(true);
          }}
          className="btn"
          style={{ padding: "6px 14px", fontSize: 13 }}
        >
          Edit
        </button>
      </div>
    );
  }

  // Editing mode
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, padding: "12px 16px", borderRadius: 12, background: "rgba(90,166,255,0.05)", border: "1px solid rgba(90,166,255,0.2)" }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: "linear-gradient(135deg, rgba(90,166,255,0.2), rgba(90,166,255,0.1))",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, flexShrink: 0,
      }}>
        &#127919;
      </div>
      <span className="text-secondary" style={{ fontSize: 18, fontWeight: 700 }}>$</span>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
        className="capacity-onboard"
        style={{
          width: 140, padding: "8px 12px", borderRadius: 10,
          border: "1px solid rgba(90,166,255,0.4)",
          background: "rgba(255,255,255,0.06)",
          color: "#EAF1FF", fontSize: 16, fontWeight: 700, outline: "none",
          margin: 0,
        }}
        placeholder="15000"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn"
        style={{ padding: "6px 14px", fontSize: 13, background: "rgba(16,185,129,0.15)", borderColor: "rgba(16,185,129,0.4)" }}
      >
        {saving ? "..." : "Save"}
      </button>
      <button
        onClick={() => setEditing(false)}
        className="btn"
        style={{ padding: "6px 14px", fontSize: 13 }}
      >
        Cancel
      </button>
    </div>
  );
}
