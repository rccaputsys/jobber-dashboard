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
    { key: "7d", label: "7 Days" },
    { key: "30d", label: "30 Days" },
    { key: "8w", label: "8 Weeks" },
    { key: "90d", label: "90 Days" },
    { key: "ytd", label: "Year" },
  ];

  const bucketOptions = [
    { key: "day", label: "Daily" },
    { key: "week", label: "Weekly" },
    { key: "month", label: "Monthly" },
    { key: "quarter", label: "Quarterly" },
  ];

  const chartOptions = [
    { key: "line", label: "Line" },
    { key: "bar", label: "Bar" },
  ];

  // Premium button styles - ALL use gradient when active
  const pillStyle = (active: boolean, hovered: boolean): React.CSSProperties => ({
    padding: "8px 14px",
    borderRadius: 10,
    border: "none",
    background: active
      ? "linear-gradient(135deg, #7c5cff, #5aa6ff)"
      : hovered
      ? isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)"
      : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    boxShadow: active ? "0 4px 12px rgba(124,92,255,0.3)" : "none",
  });

  // Same gradient style for segment buttons (Group By, Chart)
  const segmentStyle = (active: boolean, hovered: boolean): React.CSSProperties => ({
    padding: "8px 14px",
    borderRadius: 10,
    border: "none",
    background: active
      ? "linear-gradient(135deg, #7c5cff, #5aa6ff)"
      : hovered
      ? isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)"
      : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    boxShadow: active ? "0 4px 12px rgba(124,92,255,0.3)" : "none",
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)",
    marginRight: 10,
    whiteSpace: "nowrap",
  };

  const groupStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
  };

  const pillGroupStyle: React.CSSProperties = {
    display: "flex",
    gap: 4,
    background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 4,
  };

  return (
    <div>
      {/* Main Controls Row */}
      <div style={{ 
        display: "flex", 
        flexWrap: "wrap", 
        gap: 16, 
        alignItems: "center",
      }}>
        {/* Time Range */}
        <div style={groupStyle}>
          <span style={labelStyle}>Range</span>
          <div style={pillGroupStyle}>
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
                padding: "8px 12px",
              }}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ 
          width: 1, 
          height: 32, 
          background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)",
        }} />

        {/* Group By */}
        <div style={groupStyle}>
          <span style={labelStyle}>Group By</span>
          <div style={pillGroupStyle}>
            {bucketOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setParams({ g: opt.key })}
                onMouseEnter={() => setHoveredButton(`bucket-${opt.key}`)}
                onMouseLeave={() => setHoveredButton(null)}
                style={segmentStyle(g === opt.key, hoveredButton === `bucket-${opt.key}`)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ 
          width: 1, 
          height: 32, 
          background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)",
        }} />

        {/* Chart Type */}
        <div style={groupStyle}>
          <span style={labelStyle}>Chart</span>
          <div style={pillGroupStyle}>
            {chartOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setParams({ chart: opt.key })}
                onMouseEnter={() => setHoveredButton(`chart-${opt.key}`)}
                onMouseLeave={() => setHoveredButton(null)}
                style={segmentStyle(chart === opt.key, hoveredButton === `chart-${opt.key}`)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Date Range (Expandable) */}
      {showCustom && (
        <form 
          onSubmit={applyCustomRange} 
          style={{ 
            marginTop: 16, 
            paddingTop: 16, 
            borderTop: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...labelStyle, marginRight: 0 }}>From</span>
            <input
              type="date"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.12)",
                background: isLight ? "#fff" : "rgba(255,255,255,0.06)",
                color: isLight ? "#1e293b" : "#fff",
                fontSize: 13,
                fontWeight: 500,
                colorScheme: isLight ? "light" : "dark",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...labelStyle, marginRight: 0 }}>To</span>
            <input
              type="date"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.12)",
                background: isLight ? "#fff" : "rgba(255,255,255,0.06)",
                color: isLight ? "#1e293b" : "#fff",
                fontSize: 13,
                fontWeight: 500,
                colorScheme: isLight ? "light" : "dark",
              }}
            />
          </div>
          <button
            type="submit"
            onMouseEnter={() => setHoveredButton("apply")}
            onMouseLeave={() => setHoveredButton(null)}
            style={{
              padding: "8px 20px",
              borderRadius: 10,
              border: "none",
              background: hoveredButton === "apply"
                ? "linear-gradient(135deg, #8c6cff, #6ab6ff)"
                : "linear-gradient(135deg, #7c5cff, #5aa6ff)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: "0 4px 12px rgba(124,92,255,0.3)",
            }}
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
