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

  if (!editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <span className="text-muted" style={{ fontSize: 13 }}>
          Weekly target: {currentCents ? `$${(currentCents / 100).toLocaleString()}` : "Not set"}
        </span>
        <button
          onClick={() => {
            setValue(currentCents ? String(currentCents / 100) : "");
            setEditing(true);
          }}
          className="btn"
          style={{ padding: "4px 10px", fontSize: 12 }}
        >
          {currentCents ? "Edit" : "Set Target"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
      <span className="text-muted" style={{ fontSize: 13 }}>$</span>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
        style={{
          width: 120,
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid rgba(90,166,255,0.4)",
          background: "rgba(255,255,255,0.06)",
          color: "#EAF1FF",
          fontSize: 14,
          fontWeight: 600,
          outline: "none",
        }}
        placeholder="e.g. 15000"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn"
        style={{ padding: "4px 10px", fontSize: 12, background: "rgba(16,185,129,0.2)", borderColor: "rgba(16,185,129,0.4)" }}
      >
        {saving ? "..." : "Save"}
      </button>
      <button
        onClick={() => setEditing(false)}
        className="btn"
        style={{ padding: "4px 10px", fontSize: 12 }}
      >
        Cancel
      </button>
    </div>
  );
}
