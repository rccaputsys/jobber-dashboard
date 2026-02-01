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
  const [isLight, setIsLight] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hoveredButton, setHoveredButton] = React.useState<string | null>(null);

  // Detect theme changes
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
    setIsLoading(true);
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    router.push(`/jobber/dashboard?${params.toString()}`, { scroll: false });
    // Loading will clear when page re-renders with new data
    setTimeout(() => setIsLoading(false), 2000);
  }

  function applyCustomRange(e: React.FormEvent) {
    e.preventDefault();
    setParams({ range: "custom", start: startLocal, end: endLocal });
  }

  const pill = (key: string, active: boolean): React.CSSProperties => {
    const hovered = hoveredButton === `pill-${key}`;
    return {
      borderRadius: 999,
      border: active
        ? "1px solid rgba(90,166,255,0.3)"
        : isLight
        ? "1px solid #e2e8f0"
        : "1px solid rgba(255,255,255,0.12)",
      background: active
        ? "linear-gradient(135deg, rgba(124,92,255,0.95), rgba(90,166,255,0.95))"
        : hovered
        ? isLight ? "#e2e8f0" : "rgba(255,255,255,0.12)"
        : isLight
        ? "#f1f5f9"
        : "rgba(255,255,255,0.06)",
      color: active ? "white" : isLight ? "#334155" : "white",
      padding: "7px 10px",
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
      transition: "all 0.15s ease",
      transform: hovered && !active ? "translateY(-1px)" : "translateY(0)",
    };
  };

  const chip = (key: string, active: boolean): React.CSSProperties => {
    const hovered = hoveredButton === `chip-${key}`;
    return {
      borderRadius: 12,
      border: active
        ? isLight
          ? "1px solid rgba(37,99,235,0.3)"
          : "1px solid rgba(90,166,255,0.3)"
        : isLight
        ? "1px solid #e2e8f0"
        : "1px solid rgba(255,255,255,0.12)",
      background: active
        ? isLight
          ? "rgba(90,166,255,0.15)"
          : "rgba(90,166,255,0.18)"
        : hovered
        ? isLight ? "#e2e8f0" : "rgba(255,255,255,0.12)"
        : isLight
        ? "#f1f5f9"
        : "rgba(255,255,255,0.06)",
      color: active
        ? isLight
          ? "#2563eb"
          : "#5aa6ff"
        : isLight
        ? "#334155"
        : "white",
      padding: "7px 10px",
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
      transition: "all 0.15s ease",
      transform: hovered && !active ? "translateY(-1px)" : "translateY(0)",
    };
  };

  const applyButtonHovered = hoveredButton === "apply";
  const applyButtonStyle: React.CSSProperties = {
    borderRadius: 12,
    border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.16)",
    background: applyButtonHovered
      ? isLight ? "#e2e8f0" : "rgba(255,255,255,0.12)"
      : isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)",
    color: isLight ? "#334155" : "white",
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s ease",
    transform: applyButtonHovered ? "translateY(-1px)" : "translateY(0)",
  };

  return (
    <div
      style={{
        borderRadius: 18,
        border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.10)",
        background: isLight
          ? "#ffffff"
          : "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
        boxShadow: isLight ? "0 4px 16px rgba(0,0,0,0.06)" : "0 18px 54px rgba(0,0,0,0.40)",
        padding: 14,
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
      }}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isLight ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)",
          borderRadius: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: isLight ? "#334155" : "white",
            fontWeight: 600,
            fontSize: 14,
          }}>
            <span style={{ 
              display: "inline-block",
              animation: "spin 1s linear infinite",
            }}>⏳</span>
            Loading...
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div
          style={{
            fontWeight: 800,
            letterSpacing: -0.2,
            fontSize: 14,
            color: isLight ? "#1e293b" : "white",
          }}
        >
          Controls
        </div>

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
              onMouseEnter={() => setHoveredButton(`pill-${key}`)}
              onMouseLeave={() => setHoveredButton(null)}
              style={pill(key, rangePreset === key)}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={applyCustomRange} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label
            style={{
              fontSize: 12,
              color: isLight ? "#64748b" : "rgba(234,241,255,0.62)",
              fontWeight: 700,
            }}
          >
            Start
          </label>
          <input
            type="date"
            value={startLocal}
            onChange={(e) => setStartLocal(e.target.value)}
            style={{
              borderRadius: 12,
              border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.12)",
              background: isLight ? "#ffffff" : "rgba(255,255,255,0.04)",
              color: isLight ? "#1e293b" : "white",
              padding: "7px 10px",
              fontWeight: 600,
              colorScheme: isLight ? "light" : "dark",
            }}
          />
          <label
            style={{
              fontSize: 12,
              color: isLight ? "#64748b" : "rgba(234,241,255,0.62)",
              fontWeight: 700,
            }}
          >
            End
          </label>
          <input
            type="date"
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
            style={{
              borderRadius: 12,
              border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.12)",
              background: isLight ? "#ffffff" : "rgba(255,255,255,0.04)",
              color: isLight ? "#1e293b" : "white",
              padding: "7px 10px",
              fontWeight: 600,
              colorScheme: isLight ? "light" : "dark",
            }}
          />
          <button
            type="submit"
            onMouseEnter={() => setHoveredButton("apply")}
            onMouseLeave={() => setHoveredButton(null)}
            style={applyButtonStyle}
            title="Apply custom range"
          >
            Apply
          </button>
        </form>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 12,
              color: isLight ? "#64748b" : "rgba(234,241,255,0.62)",
              fontWeight: 700,
            }}
          >
            Bucket
          </span>
          {(["day", "week", "month", "quarter"] as Granularity[]).map((k) => (
            <button 
              key={k} 
              onClick={() => setParams({ g: k })} 
              onMouseEnter={() => setHoveredButton(`chip-${k}`)}
              onMouseLeave={() => setHoveredButton(null)}
              style={chip(k, g === k)}
            >
              {k === "day" ? "Daily" : k === "week" ? "Weekly" : k === "month" ? "Monthly" : "Quarterly"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 12,
              color: isLight ? "#64748b" : "rgba(234,241,255,0.62)",
              fontWeight: 700,
            }}
          >
            Chart
          </span>
          {(["line", "bar"] as ChartType[]).map((k) => (
            <button 
              key={k} 
              onClick={() => setParams({ chart: k })} 
              onMouseEnter={() => setHoveredButton(`chip-chart-${k}`)}
              onMouseLeave={() => setHoveredButton(null)}
              style={chip(`chart-${k}`, chart === k)}
            >
              {k === "line" ? "Line" : "Bars"}
            </button>
          ))}
        </div>
      </div>

      {/* Data note */}
      <div
        style={{
          width: "100%",
          marginTop: 8,
          paddingTop: 10,
          borderTop: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
          fontSize: 11,
          color: isLight ? "#94a3b8" : "rgba(234,241,255,0.4)",
          textAlign: "center",
        }}
      >
        📊 Showing data from the last 12 months
      </div>
    </div>
  );
}
