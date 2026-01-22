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
    router.push(`/jobber/dashboard?${params.toString()}`, { scroll: false });
  }

  function applyCustomRange(e: React.FormEvent) {
    e.preventDefault();
    setParams({ range: "custom", start: startLocal, end: endLocal });
  }

  return (
    <div className="controls-container">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div className="controls-title">Controls</div>

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
              className={`controls-pill ${rangePreset === key ? "active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={applyCustomRange} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label className="controls-label">Start</label>
          <input
            type="date"
            value={startLocal}
            onChange={(e) => setStartLocal(e.target.value)}
            className="controls-input"
          />
          <label className="controls-label">End</label>
          <input
            type="date"
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
            className="controls-input"
          />
          <button type="submit" className="controls-btn" title="Apply custom range">
            Apply
          </button>
        </form>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span className="controls-label">Bucket</span>
          {(["day", "week", "month", "quarter"] as Granularity[]).map((k) => (
            <button key={k} onClick={() => setParams({ g: k })} className={`controls-chip ${g === k ? "active" : ""}`}>
              {k === "day" ? "Daily" : k === "week" ? "Weekly" : k === "month" ? "Monthly" : "Quarterly"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span className="controls-label">Chart</span>
          {(["line", "bar"] as ChartType[]).map((k) => (
            <button key={k} onClick={() => setParams({ chart: k })} className={`controls-chip ${chart === k ? "active" : ""}`}>
              {k === "line" ? "Line" : "Bars"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
