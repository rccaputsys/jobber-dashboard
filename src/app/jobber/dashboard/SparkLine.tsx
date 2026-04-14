// src/app/jobber/dashboard/SparkLine.tsx
"use client";

import { useState, useRef } from "react";

type ChartType = "line" | "bar";

export function SparkLine(props: {
  title: string;
  subtitle: string;
  points: { xLabel: string; value: number; tooltip: string; hoverLabel?: string; pointColor?: string }[];
  formatType: "money" | "number" | "percent";
  chartType: ChartType;
  color?: string;
  loading?: boolean;
  targetValue?: number;
  targetLabel?: string;
  invertChangeColor?: boolean;
  penalizeOverTarget?: boolean;
  secondaryPoints?: { xLabel: string; value: number; tooltip: string; hoverLabel?: string }[];
  secondaryColor?: string;
  secondaryLabel?: string;
  overrideAvg?: number;
  overrideAvgLabel?: string;
  height?: number;
}) {
  const formatY = (v: number): string => {
    if (props.formatType === "percent") {
      return `${Math.round(v)}%`;
    }
    if (props.formatType === "number") {
      return `${Math.round(v)}`;
    }
    const dollars = Math.round(v / 100);
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

  const hasTarget = props.targetValue != null && props.targetValue > 0;
  const vbW = 360;
  const vbH = props.height || 190;
  const padL = hasTarget ? 72 : 54;
  const padR = 14;
  const padT = 20;
  const padB = 38;

  // When a target is set, use a refined neutral for lines so only dots/bars show target performance
  const chartColor = hasTarget ? "rgba(165,180,210,0.7)" : (props.color || "#5aa6ff");
  const glowColor = hasTarget ? "rgba(165,180,210,0.12)" : (props.color ? `${props.color}30` : "rgba(90,166,255,0.2)");
  const accentColor = props.color || "#5aa6ff";

  const vals = props.points.map((p) => p.value);
  const secondaryVals = props.secondaryPoints?.map((p) => p.value) ?? [];
  const dataMax = Math.max(...vals, ...secondaryVals, 1);

  // If there's a target, make sure the chart can show it
  const effectiveMax = props.targetValue != null ? Math.max(dataMax, props.targetValue * 1.1) : dataMax;

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

  const interval = getNiceInterval(effectiveMax);
  const niceMax = Math.ceil(effectiveMax / interval) * interval;
  const min = 0;
  const max = niceMax || 1;
  const span = Math.max(1e-9, max - min);

  const xStep = (vbW - padL - padR) / Math.max(1, props.points.length - 1);
  const yOf = (v: number) => {
    const t = (v - min) / span;
    return padT + (1 - t) * (vbH - padT - padB);
  };
  const xOf = (i: number) => padL + i * xStep;

  // Smooth catmull-rom spline for line charts, clamped to chart bounds
  const yMin = padT;
  const yMax = vbH - padB;
  function clampY(v: number) { return Math.max(yMin, Math.min(yMax, v)); }
  function smoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const tension = 0.3;
    let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = clampY(p1.y + (p2.y - p0.y) * tension);
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = clampY(p2.y - (p3.y - p1.y) * tension);
      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  }

  const linePoints = props.points.map((p, i) => ({ x: xOf(i), y: yOf(p.value) }));
  const d = props.chartType === "line" ? smoothPath(linePoints) : props.points.map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(p.value).toFixed(1)}`).join(" ");

  const areaD = props.points.length > 0
    ? d + ` L ${xOf(props.points.length - 1).toFixed(1)} ${vbH - padB} L ${xOf(0).toFixed(1)} ${vbH - padB} Z`
    : "";

  // Use stable IDs based on title to avoid hydration mismatch
  const safeTitle = props.title.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const clipId = `clip-${safeTitle}`;
  const gradientId = `gradient-${safeTitle}`;

  const hasSecondary = props.secondaryPoints && props.secondaryPoints.length > 0;
  const slotW = (vbW - padL - padR) / Math.max(1, props.points.length);
  const barW = hasSecondary
    ? Math.max(3, slotW / 2 - 3)
    : Math.max(4, slotW - 4);

  // When a target is set, color points relative to it
  function targetColor(value: number): string | undefined {
    if (props.targetValue == null || props.targetValue <= 0 || value === 0) return undefined;
    const ratio = value / props.targetValue;
    if (props.penalizeOverTarget) {
      // Capacity mode: over target is bad
      if (ratio > 1.3) return "#ef4444";
      if (ratio > 1.15) return "#f59e0b";
      if (ratio >= 0.85) return "#10b981";
      if (ratio >= 0.5) return "#f59e0b";
      return "#ef4444";
    }
    // Sales mode: above target is always good
    if (ratio >= 1.0) return "#10b981";
    if (ratio >= 0.75) return "#f59e0b";
    return "#ef4444";
  }

  // Smart label skipping - aim for ~6-8 labels max
  const pointCount = props.points.length;
  const labelSkip =
    pointCount > 60 ? Math.ceil(pointCount / 6) :
    pointCount > 30 ? Math.ceil(pointCount / 7) :
    pointCount > 16 ? 4 :
    pointCount > 10 ? 3 :
    pointCount > 8 ? 2 : 1;

  // Data point labels: show when few enough points to fit
  const showDataLabels = pointCount > 0 && pointCount <= 12;

  // Period average
  // - If overrideAvg is provided, use it (caller computed a weighted average)
  // - For percentages: exclude zero-value periods (no data that period, not "0%")
  // - For money/number: straight average of all periods (zeros are real)
  const periodAvg = props.overrideAvg != null
    ? props.overrideAvg
    : (() => {
        if (props.formatType === "percent") {
          const nonZero = vals.filter(v => v > 0);
          return nonZero.length > 0 ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
        }
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      })();

  function formatYAxisLabel(value: number): string {
    if (props.formatType === "percent") {
      return `${Math.round(value)}%`;
    }
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
      return k % 1 === 0 ? `$${k}k` : `$${k.toFixed(1)}k`;
    }
    if (dollars >= 100) {
      const rounded = Math.round(dollars / 100) * 100;
      return `$${rounded}`;
    }
    return `$${Math.round(dollars)}`;
  }

  function formatDataLabel(value: number): string {
    if (props.formatType === "percent") {
      return `${Math.round(value)}%`;
    }
    if (props.formatType === "number") {
      return `${Math.round(value)}`;
    }
    const dollars = Math.round(value / 100);
    if (dollars >= 1000) {
      return `$${(dollars / 1000).toFixed(1)}k`;
    }
    return `$${dollars}`;
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
      style={{ padding: "10px 14px", height: "100%", position: "relative", overflow: "visible" }}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      {/* Loading Overlay */}
      {props.loading && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(6,8,17,0.7)",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          backdropFilter: "blur(2px)",
        }}>
          <div style={{
            width: 32,
            height: 32,
            border: "3px solid rgba(255,255,255,0.1)",
            borderTopColor: chartColor,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
        <div>
          <div className="chart-title" style={{ fontWeight: 700, fontSize: 14 }}>{props.title}</div>
          <div className="chart-subtitle" style={{ fontSize: 11, marginTop: 2 }}>
            {props.subtitle}
            {hasSecondary && props.secondaryLabel && (
              <span style={{ marginLeft: 8 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: accentColor, marginRight: 3, verticalAlign: "middle" }} />
                <span style={{ marginRight: 8 }}>{props.title.split(" ")[0]}</span>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: props.secondaryColor || "#10b981", marginRight: 3, verticalAlign: "middle" }} />
                {props.secondaryLabel}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: hasTarget ? (targetColor(periodAvg) || accentColor) : accentColor, letterSpacing: -0.5 }}>
            {formatY(periodAvg)}
          </div>
          <div className="chart-label" style={{ fontSize: 10, marginTop: 2 }}>{props.overrideAvgLabel || "Avg / Period"}</div>
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
        <text x={padL - 6} y={yOf(max) + 4} fontSize="11" fontWeight="600" textAnchor="end" className="chart-axis-label">{formatYAxisLabel(max)}</text>
        <text x={padL - 6} y={yOf(max / 2) + 4} fontSize="10" fontWeight="500" textAnchor="end" className="chart-axis-label">{formatYAxisLabel(max / 2)}</text>
        <text x={padL - 6} y={yOf(0) + 4} fontSize="11" fontWeight="600" textAnchor="end" className="chart-axis-label">{formatYAxisLabel(0)}</text>

        <g clipPath={`url(#${clipId})`}>
          {props.chartType === "line" ? (
            <>
              <path d={areaD} fill={`url(#${gradientId})`} />
              <path d={d} fill="none" stroke={glowColor} strokeWidth="8" strokeLinecap="round" />
              <path d={d} fill="none" stroke={chartColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Secondary line */}
              {hasSecondary && (() => {
                const secColor = props.secondaryColor || "#10b981";
                const secPts = props.secondaryPoints!.map((p, i) => ({ x: xOf(i), y: yOf(p.value) }));
                const sd = smoothPath(secPts);
                return (
                  <>
                    <path d={sd} fill="none" stroke={`${secColor}30`} strokeWidth="8" strokeLinecap="round" />
                    <path d={sd} fill="none" stroke={secColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                );
              })()}
            </>
          ) : (
            <>
              {props.points.map((p, i) => {
                const slotX = padL + i * slotW + 2;
                const x = hasSecondary ? slotX : slotX;
                const y = yOf(p.value);
                const h = vbH - padB - y;
                return (
                  <g key={i}>
                    <rect
                      x={slotX - 4}
                      y={padT}
                      width={slotW}
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
                      rx={3}
                      fill={targetColor(p.value) || p.pointColor || chartColor}
                      opacity={hoveredIndex === i ? 1 : 0.85}
                      style={{ pointerEvents: "none" }}
                    />
                  </g>
                );
              })}
              {/* Secondary bars */}
              {hasSecondary && props.secondaryPoints!.map((p, i) => {
                const slotX = padL + i * slotW + 2;
                const x = slotX + barW + 2;
                const y = yOf(p.value);
                const h = vbH - padB - y;
                const secColor = props.secondaryColor || "#10b981";
                return (
                  <rect
                    key={`sec-${i}`}
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(2, h)}
                    rx={3}
                    fill={secColor}
                    opacity={hoveredIndex === i ? 1 : 0.75}
                    style={{ pointerEvents: "none" }}
                  />
                );
              })}
            </>
          )}
        </g>

        {/* Data point labels (when few enough points to fit) */}
        {showDataLabels && (() => {
          const dotRadius = 6; // largest dot size
          const labelOffset = 16; // distance from data point center
          const minLabelGap = 10;
          const chartBottom = vbH - padB;

          const barLabelGap = 12; // fixed distance above bar top

          // First pass: compute positions
          const positions = props.points.map((p, i) => {
            if (p.value === 0) return null;
            const isBar = props.chartType === "bar";
            const x = isBar
              ? padL + i * ((vbW - padL - padR) / Math.max(1, props.points.length)) + barW / 2 + 2
              : xOf(i);
            const pointY = yOf(p.value);

            if (isBar) {
              // Bars: always a fixed gap above the bar top
              const y = pointY - barLabelGap;
              return { i, x, y: Math.max(8, y), value: p.value, color: targetColor(p.value) || p.pointColor || chartColor };
            }

            // Line charts: smart above/below based on local slope
            let placeBelow = false;
            const prevY = i > 0 ? yOf(props.points[i - 1].value) : pointY;
            const nextY = i < props.points.length - 1 ? yOf(props.points[i + 1].value) : pointY;
            const isLocalMax = pointY <= prevY && pointY <= nextY;
            const isLocalMin = pointY >= prevY && pointY >= nextY;
            if (isLocalMin && pointY + labelOffset + 10 < chartBottom) {
              placeBelow = true;
            } else if (!isLocalMax && i % 2 === 1 && pointY + labelOffset + 10 < chartBottom) {
              placeBelow = true;
            }

            const y = placeBelow ? pointY + labelOffset : pointY - labelOffset;
            return { i, x, y: Math.max(8, Math.min(chartBottom - 4, y)), value: p.value, color: targetColor(p.value) || p.pointColor || chartColor };
          }).filter(Boolean) as { i: number; x: number; y: number; value: number; color: string }[];

          // Second pass: collision avoidance (line charts only — bars are horizontally spaced)
          let yMap = new Map<number, number>();
          if (props.chartType === "line") {
            const sorted = [...positions].sort((a, b) => a.y - b.y);
            for (let j = 1; j < sorted.length; j++) {
              const prev = sorted[j - 1];
              const curr = sorted[j];
              if (Math.abs(curr.x - prev.x) < 45 && curr.y - prev.y < minLabelGap) {
                curr.y = prev.y + minLabelGap;
              }
            }
            yMap = new Map(sorted.map(s => [s.i, s.y]));
          }

          return positions.map((pos) => {
            const finalY = yMap.get(pos.i) ?? pos.y;
            const label = formatDataLabel(pos.value);
            const bgW = label.length * 4.8 + 6;
            return (
              <g key={`dl-${pos.i}`} style={{ pointerEvents: "none" }}>
                <text
                  x={pos.x}
                  y={finalY + 0.5}
                  fontSize="8"
                  fontWeight="700"
                  textAnchor="middle"
                  fill={pos.color}
                >
                  {label}
                </text>
              </g>
            );
          });
        })()}

        {/* Dots rendered OUTSIDE clip path so they don't get cut off */}
        {props.chartType === "line" && props.points.map((p, i) => (
          <g key={`dot-${i}`}>
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
              fill={targetColor(p.value) || p.pointColor || chartColor}
              style={{ pointerEvents: "none" }}
            />
            {(i === props.points.length - 1 || hoveredIndex === i) && (
              <circle cx={xOf(i)} cy={yOf(p.value)} r={hoveredIndex === i ? 10 : 8} fill={chartColor} opacity={0.2} style={{ pointerEvents: "none" }} />
            )}
          </g>
        ))}

        {/* Target line — clean, on top of data */}
        {props.targetValue != null && props.targetValue > 0 && (() => {
          const targetY = yOf(props.targetValue);
          return (
            <g>
              <line x1={padL} y1={targetY} x2={vbW - padR} y2={targetY} stroke="rgba(16,185,129,0.45)" strokeWidth={1.5} strokeDasharray="4 3" />
              {/* "TARGET" + value stacked in the far-left gutter, clear of axis labels */}
              <text x={2} y={targetY - 4} fontSize="6.5" fontWeight="800" textAnchor="start" fill="#10b981" opacity={0.7} letterSpacing="0.6">
                TARGET
              </text>
              <text x={2} y={targetY + 5} fontSize="8" fontWeight="700" textAnchor="start" fill="#10b981" opacity={0.9}>
                {formatYAxisLabel(props.targetValue)}
              </text>
            </g>
          );
        })()}

        {/* X axis labels */}
        {props.points.map((p, i) => {
          const isLast = i === props.points.length - 1;
          const showBySkip = i % labelSkip === 0;

          // Skip last label if it would overlap with the previous shown label
          if (isLast) {
            const prevShownIndex = Math.floor((props.points.length - 2) / labelSkip) * labelSkip;
            const gap = props.points.length - 1 - prevShownIndex;
            if (gap < labelSkip * 0.7) return null; // Too close, skip last
          }

          if (!showBySkip && !isLast) return null;

          // For bar charts, center label under the bar; for line charts, use point position
          const labelX = props.chartType === "bar"
            ? padL + i * ((vbW - padL - padR) / Math.max(1, props.points.length)) + barW / 2 + 2
            : xOf(i);

          return (
            <text key={`x-${i}`} x={labelX} y={vbH - 10} fontSize="9" textAnchor="middle" className="chart-axis-label">
              {p.xLabel}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredPoint !== null && !props.loading && (
        <div
          style={{
            position: "absolute",
            left: tooltipPos.x > 200 ? tooltipPos.x - 150 : tooltipPos.x,
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
          {hoveredPoint.hoverLabel && (
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
              {hoveredPoint.hoverLabel}
            </div>
          )}
          {hoveredChange && (() => {
            const invert = props.invertChangeColor !== false; // default true (up=red for overview problems)
            const upColor = invert ? "#ef4444" : "#10b981";
            const downColor = invert ? "#10b981" : "#ef4444";
            return (
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                marginTop: 4,
                color: hoveredChange.value === 0 ? "#888" : hoveredChange.value > 0 ? upColor : downColor,
              }}>
                {hoveredChange.value === 0 ? "\—" : hoveredChange.value > 0 ? "\u2191" : "\u2193"} {formatY(Math.abs(hoveredChange.value))} ({hoveredChange.percent > 0 ? "+" : ""}{hoveredChange.percent.toFixed(0)}%)
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
