// src/app/jobber/dashboard/SparkLine.tsx
"use client";

import { useState, useRef } from "react";

type ChartType = "line" | "bar";

export function SparkLine(props: {
  title: string;
  subtitle: string;
  points: { xLabel: string; value: number; tooltip: string }[];
  formatType: "money" | "number";
  chartType: ChartType;
  color?: string;
}) {
  const formatY = (cents: number): string => {
    if (props.formatType === "number") {
      return `${Math.round(cents)}`;
    }
    const dollars = Math.round(cents / 100);
    if (dollars >= 1000000) {
      const rounded = Math.round(dollars / 10000) * 10000;
      return `$${(rounded / 1000000).toFixed(2)}M`;
    }
    if (dollars >= 1000) {
      const rounded = Math.round(dollars / 100) * 100;
      return `$${(rounded / 1000).toFixed(1)}k`;
    }
    if (dollars >= 100) {
      const rounded = Math.round(dollars / 100) * 100;
      return `$${rounded}`;
    }
    return `$${dollars}`;
  };

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const vbW = 360;
  const vbH = 140;
  const padL = 48;
  const padR = 40;
  const padT = 20;
  const padB = 32;

  const chartColor = props.color || "#5aa6ff";
  const glowColor = props.color ? `${props.color}30` : "rgba(90,166,255,0.2)";

  const vals = props.points.map((p) => p.value);
  const dataMax = vals.length ? Math.max(...vals, 1) : 1;

  function getNiceInterval(maxValue: number): number {
    if (maxValue <= 0) return 100;
    const rawInterval = maxValue / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)));
    const normalized = rawInterval / magnitude;
    let niceNormalized;
    if (normalized <= 1) niceNormalized = 1;
    else if (normalized <= 2) niceNormalized = 2;
    else if (normalized <= 5) niceNormalized = 5;
    else niceNormalized = 10;
    return niceNormalized * magnitude;
  }

  const interval = getNiceInterval(dataMax);
  const niceMax = Math.ceil(dataMax / interval) * interval;
  const min = 0;
  const max = niceMax || 1;
  const span = Math.max(1e-9, max - min);

  const xStep = (vbW - padL - padR) / Math.max(1, props.points.length - 1);
  const yOf = (v: number) => {
    const t = (v - min) / span;
    return padT + (1 - t) * (vbH - padT - padB);
  };
  const xOf = (i: number) => padL + i * xStep;

  const d = props.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(p.value).toFixed(1)}`)
    .join(" ");

  const areaD = props.points.length > 0
    ? d + ` L ${xOf(props.points.length - 1).toFixed(1)} ${vbH - padB} L ${xOf(0).toFixed(1)} ${vbH - padB} Z`
    : "";

  const clipId = `clip-${Math.random().toString(16).slice(2)}`;
  const gradientId = `gradient-${Math.random().toString(16).slice(2)}`;

  const barW = Math.max(4, (vbW - padL - padR) / Math.max(1, props.points.length) - 4);
  const labelSkip = props.points.length > 16 ? 4 : props.points.length > 10 ? 3 : 2;

  const currentValue = props.points.length > 0 ? props.points[props.points.length - 1].value : 0;

  function formatYAxisLabel(value: number): string {
    if (props.formatType === "number") {
      return `${Math.round(value)}`;
    }
    if (value === 0) return "$0";
    const dollars = value / 100;
    if (dollars >= 1000000) {
      return `$${(dollars / 1000000).toFixed(1)}M`;
    }
    if (dollars >= 1000) {
      const k = dollars / 1000;
      const rounded = Math.round(k * 2) / 2;
      return rounded % 1 === 0 ? `$${rounded}k` : `$${rounded.toFixed(1)}k`;
    }
    if (dollars >= 100) {
      const rounded = Math.round(dollars / 100) * 100;
      return `$${rounded}`;
    }
    return `$${Math.round(dollars)}`;
  }

  function getChange(index: number): { value: number; percent: number } | null {
    if (index <= 0 || index >= props.points.length) return null;
    const current = props.points[index].value;
    const previous = props.points[index - 1].value;
    const diff = current - previous;
    const pct = previous !== 0 ? (diff / previous) * 100 : 0;
    return { value: diff, percent: pct };
  }

  const hoveredPoint = hoveredIndex !== null ? props.points[hoveredIndex] : null;
  const hoveredChange = hoveredIndex !== null ? getChange(hoveredIndex) : null;

  const handleMouseEnter = (i: number, e: React.MouseEvent) => {
    setHoveredIndex(i);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="panel hover-lift"
      style={{ padding: 16, height: "100%", position: "relative", overflow: "visible" }}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
        <div>
          <div className="chart-title" style={{ fontWeight: 700, fontSize: 14 }}>{props.title}</div>
          <div className="chart-subtitle" style={{ fontSize: 11, marginTop: 2 }}>{props.subtitle}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: chartColor, letterSpacing: -0.5 }}>
            {formatY(currentValue)}
          </div>
          <div className="chart-label" style={{ fontSize: 10, marginTop: 2 }}>Current</div>
        </div>
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={padL} y={padT} width={vbW - padL - padR} height={vbH - padT - padB} />
          </clipPath>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1={padL} y1={yOf(max)} x2={vbW - padR} y2={yOf(max)} stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1={padL} y1={yOf(max / 2)} x2={vbW - padR} y2={yOf(max / 2)} stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={padL} y1={yOf(0)} x2={vbW - padR} y2={yOf(0)} stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />

        {/* Y axis labels */}
        <text x={padL - 6} y={yOf(max) + 4} fontSize="11" fontWeight="600" textAnchor="end">{formatYAxisLabel(max)}</text>
        <text x={padL - 6} y={yOf(max / 2) + 4} fontSize="10" fontWeight="500" textAnchor="end">{formatYAxisLabel(max / 2)}</text>
        <text x={padL - 6} y={yOf(0) + 4} fontSize="11" fontWeight="600" textAnchor="end">{formatYAxisLabel(0)}</text>

        <g clipPath={`url(#${clipId})`}>
          {props.chartType === "line" ? (
            <>
              <path d={areaD} fill={`url(#${gradientId})`} />
              <path d={d} fill="none" stroke={glowColor} strokeWidth="8" strokeLinecap="round" />
              <path d={d} fill="none" stroke={chartColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {props.points.map((p, i) => (
                <g key={i}>
                  <circle
                    cx={xOf(i)}
                    cy={yOf(p.value)}
                    r={20}
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => handleMouseEnter(i, e)}
                    onMouseMove={handleMouseMove}
                  />
                  <circle
                    cx={xOf(i)}
                    cy={yOf(p.value)}
                    r={hoveredIndex === i ? 6 : (i === props.points.length - 1 ? 5 : 3)}
                    fill={chartColor}
                    style={{ pointerEvents: "none" }}
                  />
                  {(i === props.points.length - 1 || hoveredIndex === i) && (
                    <circle cx={xOf(i)} cy={yOf(p.value)} r={hoveredIndex === i ? 10 : 8} fill={chartColor} opacity={0.2} style={{ pointerEvents: "none" }} />
                  )}
                </g>
              ))}
            </>
          ) : (
            props.points.map((p, i) => {
              const x = padL + i * ((vbW - padL - padR) / Math.max(1, props.points.length)) + 2;
              const y = yOf(p.value);
              const h = vbH - padB - y;
              return (
                <g key={i}>
                  <rect
                    x={x - 4}
                    y={padT}
                    width={barW + 8}
                    height={vbH - padT - padB}
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => handleMouseEnter(i, e)}
                    onMouseMove={handleMouseMove}
                  />
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(2, h)}
                    rx={4}
                    fill={chartColor}
                    opacity={hoveredIndex === i ? 1 : 0.85}
                    style={{ pointerEvents: "none" }}
                  />
                </g>
              );
            })
          )}
        </g>

        {/* X axis labels */}
        {props.points.map((p, i) => {
          if (i % labelSkip !== 0 && i !== props.points.length - 1) return null;
          return (
            <text key={`x-${i}`} x={xOf(i)} y={vbH - 8} fontSize="9" textAnchor="middle">
              {p.xLabel}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredPoint !== null && (
        <div
          style={{
            position: "absolute",
            left: tooltipPos.x,
            top: tooltipPos.y - 90,
            background: "#1a1f2e",
            border: "1px solid #3a4055",
            borderRadius: 8,
            padding: "8px 12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            zIndex: 1000,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
            {hoveredPoint.xLabel}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
            {formatY(hoveredPoint.value)}
          </div>
          {hoveredChange && (
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              marginTop: 4,
              color: hoveredChange.value > 0 ? "#ef4444" : "#10b981",
            }}>
              {hoveredChange.value > 0 ? "↑" : "↓"} {formatY(Math.abs(hoveredChange.value))} ({hoveredChange.percent > 0 ? "+" : ""}{hoveredChange.percent.toFixed(0)}%)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
