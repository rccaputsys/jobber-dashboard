"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Granularity = "day" | "week" | "month" | "quarter";
type ChartType = "line" | "bar";

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function addDays(d: Date, days: number) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + days);
  return x;
}
function defaultRange(preset: string) {
  const today = new Date();
  const end = toISODate(today);
  const start =
    preset === "7d"
      ? toISODate(addDays(today, -7))
      : preset === "30d"
      ? toISODate(addDays(today, -30))
      : preset === "90d"
      ? toISODate(addDays(today, -90))
      : preset === "ytd"
      ? `${today.getFullYear()}-01-01`
      : toISODate(addDays(today, -56)); // 8w default
  return { start, end };
}

export function Controls() {
  const router = useRouter();
  const sp = useSearchParams();

  const rangePreset = sp.get("range") ?? "8w";
  const g = (sp.get("g") ?? "week") as Granularity;
  const chart = (sp.get("chart") ?? "line") as ChartType;

  const { start: presetStart, end: presetEnd } = defaultRange(rangePreset);

  const start = sp.get("start") ?? presetStart;
  const end = sp.get("end") ?? presetEnd;

  const [startLocal, setStartLocal] = React.useState(start);
  const [endLocal, setEndLocal] = React.useState(end);

  React.useEffect(() => {
    setStartLocal(start);
    setEndLocal(end);
  }, [start, end]);

  function setParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    router.push(`/dashboard?${params.toString()}`);
  }

  function applyCustomRange(e: React.FormEvent) {
    e.preventDefault();
    setParams({ range: "custom", start: startLocal, end: endLocal });
  }

  const pill = (active: boolean) => ({
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: active
      ? "linear-gradient(135deg, rgba(124,92,255,0.95), rgba(90,166,255,0.95))"
      : "rgba(255,255,255,0.06)",
    color: "white",
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 950,
    cursor: "pointer" as const,
  });

  const chip = (active: boolean) => ({
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(90,166,255,0.18)" : "rgba(255,255,255,0.06)",
    color: "white",
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 950,
    cursor: "pointer" as const,
  });

  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
        boxShadow: "0 18px 54px rgba(0,0,0,0.40)",
        padding: 14,
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 990, letterSpacing: -0.2, fontSize: 14 }}>Controls</div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            ["7d", "7D"],
            ["30d", "30D"],
            ["90d", "90D"],
            ["8w", "8W"],
            ["ytd", "YTD"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setParams({ range: key, start: null, end: null })}
              style={pill(rangePreset === key)}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={applyCustomRange} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "rgba(234,241,255,0.62)", fontWeight: 900 }}>Start</label>
          <input
            type="date"
            value={startLocal}
            onChange={(e) => setStartLocal(e.target.value)}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "white",
              padding: "7px 10px",
              fontWeight: 800,
            }}
          />
          <label style={{ fontSize: 12, color: "rgba(234,241,255,0.62)", fontWeight: 900 }}>End</label>
          <input
            type="date"
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "white",
              padding: "7px 10px",
              fontWeight: 800,
            }}
          />
          <button
            type="submit"
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              padding: "8px 12px",
              fontWeight: 950,
              cursor: "pointer",
            }}
            title="Apply custom range"
          >
            Apply
          </button>
        </form>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "rgba(234,241,255,0.62)", fontWeight: 900 }}>Bucket</span>
          {(["day", "week", "month", "quarter"] as Granularity[]).map((k) => (
            <button key={k} onClick={() => setParams({ g: k })} style={chip(g === k)}>
              {k === "day" ? "Daily" : k === "week" ? "Weekly" : k === "month" ? "Monthly" : "Quarterly"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "rgba(234,241,255,0.62)", fontWeight: 900 }}>Chart</span>
          {(["line", "bar"] as ChartType[]).map((k) => (
            <button key={k} onClick={() => setParams({ chart: k })} style={chip(chart === k)}>
              {k === "line" ? "Line" : "Bars"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
