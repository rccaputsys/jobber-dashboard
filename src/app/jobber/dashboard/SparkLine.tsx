// src/app/jobber/dashboard/SparkLine.tsx
"use client";

import { useState } from "react";

type ChartType = "line" | "bar";

export function SparkLine(props: {
  title: string;
  subtitle: string;
  points: { xLabel: string; value: number; tooltip: string }[];
  formatType: "money" | "number";
  chartType: ChartType;
  color?: string;
}) {
  // Format function based on type
  const formatY = (cents: number): string => {
    if (props.formatType === "number") {
      return `${Math.round(cents)}`;
    }
    // Money format (value is in cents)
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
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

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
  
  // Calculate nice Y-axis intervals
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

  // Format Y-axis label with nice rounding
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

  // Calculate change from previous point
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

  return (
    <div 
      className="panel hover-lift" 
      style={{ padding: 16, height: "100%", position: "relative" }}
      onMouseLeave={() => {
        setHoveredIndex(null);
        setMousePos(null);
      }}
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
        style={{ display: "block" }}
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
        <text x={padL - 6} y={yOf(max) + 3} fontSize="9" textAnchor="end">{formatYAxisLabel(max)}</text>
        <text x={padL - 6} y={yOf(0) + 3} fontSize="9" textAnchor="end">{formatYAxisLabel(0)}</text>

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
                    r={hoveredIndex === i ? 6 : (i === props.points.length - 1 ? 5 : 3)} 
                    fill={chartColor}
                    style={{ cursor: "pointer", transition: "r 0.15s ease" }}
                    onMouseEnter={(e) => {
                      setHoveredIndex(i);
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => {
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }}
                  />
                  {(i === props.points.length - 1 || hoveredIndex === i) && (
                    <circle cx={xOf(i)} cy={yOf(p.value)} r={hoveredIndex === i ? 10 : 8} fill={chartColor} opacity={0.2} />
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
                <rect 
                  key={i} 
                  x={x} 
                  y={y} 
                  width={barW} 
                  height={Math.max(2, h)} 
                  rx={4} 
                  fill={chartColor} 
                  opacity={hoveredIndex === i ? 1 : 0.85}
                  style={{ cursor: "pointer", transition: "opacity 0.15s ease" }}
                  onMouseEnter={(e) => {
                    setHoveredIndex(i);
                    setMousePos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e) => {
                    setMousePos({ x: e.clientX, y: e.clientY });
                  }}
                />
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

      {/* Custom Tooltip */}
      {hoveredPoint && mousePos && (
        <div
          className="chart-tooltip"
          style={{
            position: "fixed",
            left: mousePos.x + 20,
            top: mousePos.y - 40,
            background: "linear-gradient(180deg, rgba(20,25,40,0.98) 0%, rgba(15,20,35,0.98) 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: "12px 16px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            zIndex: 9999,
            minWidth: 150,
            pointerEvents: "none",
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 6, fontWeight: 600 }}>
            {hoveredPoint.xLabel}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", letterSpacing: -0.5 }}>
            {formatY(hoveredPoint.value)}
          </div>
          {hoveredChange && (
            <div style={{ 
              fontSize: 13, 
              fontWeight: 700,
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px solid rgba(255,255,255,0.1)",
              color: hoveredChange.value > 0 ? "#ef4444" : "#10b981",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              <span style={{ fontSize: 14 }}>{hoveredChange.value > 0 ? "↑" : "↓"}</span>
              <span>{formatY(Math.abs(hoveredChange.value))}</span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>
                ({hoveredChange.percent > 0 ? "+" : ""}{hoveredChange.percent.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
