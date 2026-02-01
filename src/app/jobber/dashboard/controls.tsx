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
    { key: "7d", label: "7D", desc: "Last 7 days" },
    { key: "30d", label: "30D", desc: "Last 30 days" },
    { key: "8w", label: "8W", desc: "Last 8 weeks" },
    { key: "90d", label: "90D", desc: "Last 90 days" },
    { key: "ytd", label: "YTD", desc: "Year to date" },
  ];

  const bucketOptions = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "quarter", label: "Qtr" },
  ];

  const chartOptions = [
    { key: "line", label: "Line", icon: "📈" },
    { key: "bar", label: "Bar", icon: "📊" },
  ];

  const pillStyle = (active: boolean, hovered: boolean): React.CSSProperties => ({
    padding: "8px 14px",
    borderRadius: 10,
    border: "none",
    background: active
      ? "linear-gradient(135deg, #7c5cff, #5aa6ff)"
      : hovered
      ? isLight ? "rgba(90,166,255,0.12)" : "rgba(255,255,255,0.12)"
      : isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    transform: hovered && !active ? "translateY(-1px)" : "none",
    boxShadow: active ? "0 4px 12px rgba(90,166,255,0.3)" : "none",
  });

  const segmentStyle = (active: boolean, hovered: boolean): React.CSSProperties => ({
    padding: "6px 12px",
    border: "none",
    background: active
      ? isLight ? "#fff" : "rgba(255,255,255,0.15)"
      : "transparent",
    color: active 
      ? isLight ? "#2563eb" : "#5aa6ff"
      : hovered
      ? isLight ? "#334155" : "#fff"
      : isLight ? "#64748b" : "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    borderRadius: 8,
    boxShadow: active ? (isLight ? "0 2px 8px rgba(0,0,0,0.08)" : "0 2px 8px rgba(0,0,0,0.3)") : "none",
  });

  return (
    <div
      style={{
        borderRadius: 16,
        border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
        background: isLight
          ? "#ffffff"
          : "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        boxShadow: isLight ? "0 4px 20px rgba(0,0,0,0.06)" : "0 8px 32px rgba(0,0,0,0.3)",
        padding: "16px 20px",
      }}
    >
      {/* Main Controls Row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", justifyContent: "space-between" }}>
        
        {/* Time Range Section */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ 
            fontSize: 11, 
            fontWeight: 700, 
            textTransform: "uppercase", 
            letterSpacing: 0.5,
            color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)",
          }}>
            Range
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {rangeOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setParams({ range: opt.key, start: null, end: null })}
                onMouseEnter={() => setHoveredButton(`range-${opt.key}`)}
                onMouseLeave={() => setHoveredButton(null)}
                style={pillStyle(rangePreset === opt.key, hoveredButton === `range-${opt.key}`)}
                title={opt.desc}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={() => setShowCustom(!showCustom)}
              onMouseEnter={() => setHoveredButton("custom")}
              onMouseLeave={() => setHoveredButton(null)}
              style={{
                ...pillStyle(rangePreset === "custom", hoveredButton === "custom"),
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 14 }}>📅</span>
              Custom
            </button>
          </div>
        </div>

        {/* Grouping & Chart Type */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Bucket Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ 
              fontSize: 11, 
              fontWeight: 700, 
              textTransform: "uppercase", 
              letterSpacing: 0.5,
              color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)",
            }}>
              Group by
            </span>
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
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Type Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ 
              fontSize: 11, 
              fontWeight: 700, 
              textTransform: "uppercase", 
              letterSpacing: 0.5,
              color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)",
            }}>
              View
            </span>
            <div style={{ 
              display: "flex", 
              gap: 2,
              background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: 3,
            }}>
              {chartOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setParams({ chart: opt.key })}
                  onMouseEnter={() => setHoveredButton(`chart-${opt.key}`)}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={{
                    ...segmentStyle(chart === opt.key, hoveredButton === `chart-${opt.key}`),
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 12 }}>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
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
            <label style={{ 
              fontSize: 12, 
              fontWeight: 600,
              color: isLight ? "#64748b" : "rgba(255,255,255,0.6)",
            }}>
              From
            </label>
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
            <label style={{ 
              fontSize: 12, 
              fontWeight: 600,
              color: isLight ? "#64748b" : "rgba(255,255,255,0.6)",
            }}>
              To
            </label>
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
              boxShadow: "0 4px 12px rgba(90,166,255,0.3)",
            }}
          >
            Apply Range
          </button>
          <button
            type="button"
            onClick={() => setShowCustom(false)}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: isLight ? "#64748b" : "rgba(255,255,255,0.6)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
