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

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export function Controls({ onLoadingChange }: { onLoadingChange?: (loading: boolean) => void }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isLight, setIsLight] = React.useState(false);
  const [hoveredButton, setHoveredButton] = React.useState<string | null>(null);
  const [showCustom, setShowCustom] = React.useState(false);
  const isMobile = useIsMobile();

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
    { key: "7d", label: "7D", fullLabel: "7 Days" },
    { key: "30d", label: "30D", fullLabel: "30 Days" },
    { key: "8w", label: "8W", fullLabel: "8 Weeks" },
    { key: "90d", label: "90D", fullLabel: "90 Days" },
    { key: "ytd", label: "YTD", fullLabel: "Year to Date" },
  ];

  const bucketOptions = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "quarter", label: "Qtr" },
  ];

  const chartOptions = [
    { key: "line", label: "Line" },
    { key: "bar", label: "Bar" },
  ];

  // Consistent gradient button style for ALL buttons
  const buttonStyle = (active: boolean, hovered: boolean): React.CSSProperties => ({
    padding: "8px 12px",
    borderRadius: 8,
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
    whiteSpace: "nowrap",
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)",
    marginRight: 8,
    whiteSpace: "nowrap",
  };

  const pillGroupStyle: React.CSSProperties = {
    display: "flex",
    gap: 2,
    background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)",
    borderRadius: 10,
    padding: 3,
  };

  const sectionStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 0,
  };

  return (
    <div>
      {/* Stacked on mobile, single row on desktop */}
      <div style={{ 
        display: "flex", 
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        gap: isMobile ? 8 : 12,
      }}>
        {/* Time Range */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 0,
          justifyContent: isMobile ? "space-between" : "flex-start",
        }}>
          <span style={labelStyle}>Range</span>
          <div style={pillGroupStyle}>
            {rangeOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setParams({ range: opt.key, start: null, end: null })}
                onMouseEnter={() => setHoveredButton(`range-${opt.key}`)}
                onMouseLeave={() => setHoveredButton(null)}
                style={buttonStyle(rangePreset === opt.key, hoveredButton === `range-${opt.key}`)}
                title={opt.fullLabel}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={() => setShowCustom(!showCustom)}
              onMouseEnter={() => setHoveredButton("custom")}
              onMouseLeave={() => setHoveredButton(null)}
              style={buttonStyle(rangePreset === "custom" || showCustom, hoveredButton === "custom")}
            >
              📅
            </button>
          </div>
        </div>

        {/* Divider - only on desktop */}
        {!isMobile && (
          <div style={{ 
            width: 1, 
            height: 28, 
            background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)",
            flexShrink: 0,
          }} />
        )}

        {/* Group By + Chart Type row on mobile */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: isMobile ? 12 : 12,
          justifyContent: isMobile ? "space-between" : "flex-start",
        }}>
          {/* Group By */}
          <div style={sectionStyle}>
            <span style={labelStyle}>Group</span>
            <div style={pillGroupStyle}>
              {bucketOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setParams({ g: opt.key })}
                  onMouseEnter={() => setHoveredButton(`bucket-${opt.key}`)}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={buttonStyle(g === opt.key, hoveredButton === `bucket-${opt.key}`)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider - only on desktop */}
          {!isMobile && (
            <div style={{ 
              width: 1, 
              height: 28, 
              background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)",
              flexShrink: 0,
            }} />
          )}

          {/* Chart Type */}
          <div style={sectionStyle}>
            <span style={labelStyle}>Chart</span>
            <div style={pillGroupStyle}>
              {chartOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setParams({ chart: opt.key })}
                  onMouseEnter={() => setHoveredButton(`chart-${opt.key}`)}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={buttonStyle(chart === opt.key, hoveredButton === `chart-${opt.key}`)}
                >
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
              padding: "8px 10px",
              borderRadius: 8,
              border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.12)",
              background: isLight ? "#fff" : "rgba(255,255,255,0.06)",
              color: isLight ? "#1e293b" : "#fff",
              fontSize: 13,
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
              padding: "8px 10px",
              borderRadius: 8,
              border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.12)",
              background: isLight ? "#fff" : "rgba(255,255,255,0.06)",
              color: isLight ? "#1e293b" : "#fff",
              fontSize: 13,
              fontWeight: 500,
              colorScheme: isLight ? "light" : "dark",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
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
