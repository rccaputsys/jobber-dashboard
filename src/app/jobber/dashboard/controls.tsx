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
      : toISODate(addDays(today, -56));
  return { start, end };
}

export function Controls({ onLoadingChange }: { onLoadingChange?: (loading: boolean) => void }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isLight, setIsLight] = React.useState(false);
  const [hoveredButton, setHoveredButton] = React.useState<string | null>(null);
  const [showCustom, setShowCustom] = React.useState(false);

  React.useEffect(() => {
    const checkTheme = () => {
      setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

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
    onLoadingChange?.(true);
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
    setShowCustom(false);
  }

  const rangeOptions = [
    { key: "7d", label: "7D" },
    { key: "30d", label: "30D" },
    { key: "8w", label: "8W" },
    { key: "90d", label: "90D" },
    { key: "ytd", label: "YTD" },
  ];

  const bucketOptions = [
    { key: "day", label: "D" },
    { key: "week", label: "W" },
    { key: "month", label: "M" },
    { key: "quarter", label: "Q" },
  ];

  const pillStyle = (active: boolean, hovered: boolean): React.CSSProperties => ({
    padding: "6px 10px",
    borderRadius: 8,
    border: "none",
    background: active
      ? "linear-gradient(135deg, #7c5cff, #5aa6ff)"
      : hovered
      ? isLight ? "rgba(90,166,255,0.12)" : "rgba(255,255,255,0.12)"
      : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
  });

  const segmentStyle = (active: boolean, hovered: boolean): React.CSSProperties => ({
    padding: "5px 10px",
    border: "none",
    background: active
      ? isLight ? "#fff" : "rgba(255,255,255,0.15)"
      : "transparent",
    color: active 
      ? isLight ? "#2563eb" : "#5aa6ff"
      : hovered
      ? isLight ? "#334155" : "#fff"
      : isLight ? "#64748b" : "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    borderRadius: 6,
    boxShadow: active ? (isLight ? "0 1px 4px rgba(0,0,0,0.08)" : "0 1px 4px rgba(0,0,0,0.3)") : "none",
  });

  const iconBtnStyle = (active: boolean, hovered: boolean): React.CSSProperties => ({
    padding: "5px 8px",
    border: "none",
    background: active
      ? isLight ? "#fff" : "rgba(255,255,255,0.15)"
      : "transparent",
    color: active 
      ? isLight ? "#2563eb" : "#5aa6ff"
      : hovered
      ? isLight ? "#334155" : "#fff"
      : isLight ? "#64748b" : "rgba(255,255,255,0.5)",
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.15s ease",
    borderRadius: 6,
    boxShadow: active ? (isLight ? "0 1px 4px rgba(0,0,0,0.08)" : "0 1px 4px rgba(0,0,0,0.3)") : "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  return (
    <div>
      {/* Single row of controls */}
      <div style={{ 
        display: "flex", 
        flexWrap: "wrap", 
        gap: 8, 
        alignItems: "center",
      }}>
        {/* Range pills */}
        <div style={{ 
          display: "flex", 
          gap: 2,
          background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)",
          borderRadius: 10,
          padding: 3,
        }}>
          {rangeOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setParams({ range: opt.key, start: null, end: null })}
              onMouseEnter={() => setHoveredButton(`range-${opt.key}`)}
              onMouseLeave={() => setHoveredButton(null)}
              style={pillStyle(rangePreset === opt.key, hoveredButton === `range-${opt.key}`)}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setShowCustom(!showCustom)}
            onMouseEnter={() => setHoveredButton("custom")}
            onMouseLeave={() => setHoveredButton(null)}
            style={{
              ...pillStyle(rangePreset === "custom" || showCustom, hoveredButton === "custom"),
              fontSize: 14,
              padding: "5px 8px",
            }}
            title="Custom date range"
          >
            📅
          </button>
        </div>

        {/* Divider */}
        <div style={{ 
          width: 1, 
          height: 24, 
          background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)",
        }} />

        {/* Bucket selector */}
        <div style={{ 
          display: "flex", 
          gap: 2,
          background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)",
          borderRadius: 10,
          padding: 3,
        }}>
          {bucketOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setParams({ g: opt.key })}
              onMouseEnter={() => setHoveredButton(`bucket-${opt.key}`)}
              onMouseLeave={() => setHoveredButton(null)}
              style={segmentStyle(g === opt.key, hoveredButton === `bucket-${opt.key}`)}
              title={opt.key === "day" ? "Daily" : opt.key === "week" ? "Weekly" : opt.key === "month" ? "Monthly" : "Quarterly"}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ 
          width: 1, 
          height: 24, 
          background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)",
        }} />

        {/* Chart type */}
        <div style={{ 
          display: "flex", 
          gap: 2,
          background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)",
          borderRadius: 10,
          padding: 3,
        }}>
          <button
            onClick={() => setParams({ chart: "line" })}
            onMouseEnter={() => setHoveredButton("chart-line")}
            onMouseLeave={() => setHoveredButton(null)}
            style={iconBtnStyle(chart === "line", hoveredButton === "chart-line")}
            title="Line chart"
          >
            📈
          </button>
          <button
            onClick={() => setParams({ chart: "bar" })}
            onMouseEnter={() => setHoveredButton("chart-bar")}
            onMouseLeave={() => setHoveredButton(null)}
            style={iconBtnStyle(chart === "bar", hoveredButton === "chart-bar")}
            title="Bar chart"
          >
            📊
          </button>
        </div>
      </div>

      {/* Custom Date Range (Expandable) */}
      {showCustom && (
        <form 
          onSubmit={applyCustomRange} 
          style={{ 
            marginTop: 12, 
            paddingTop: 12, 
            borderTop: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="date"
            value={startLocal}
            onChange={(e) => setStartLocal(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.12)",
              background: isLight ? "#fff" : "rgba(255,255,255,0.06)",
              color: isLight ? "#1e293b" : "#fff",
              fontSize: 12,
              fontWeight: 500,
              colorScheme: isLight ? "light" : "dark",
            }}
          />
          <span style={{ color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)", fontSize: 12 }}>to</span>
          <input
            type="date"
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.12)",
              background: isLight ? "#fff" : "rgba(255,255,255,0.06)",
              color: isLight ? "#1e293b" : "#fff",
              fontSize: 12,
              fontWeight: 500,
              colorScheme: isLight ? "light" : "dark",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
