// src/app/jobber/capacity/CapacityGauge.tsx
"use client";

type Props = {
  fillRate: number; // 0-1+
  label: string;    // e.g. "This Week" or "Next Week"
  subtitle: string; // e.g. "12 jobs scheduled"
  colorClass: string; // text-success, text-warning, text-critical
};

function fillColor(fill: number) {
  if (fill >= 0.9) return "#10b981";
  if (fill >= 0.5) return "#f59e0b";
  return "#ef4444";
}

export function CapacityGauge({ fillRate, label, subtitle, colorClass }: Props) {
  const pctClamped = Math.min(fillRate, 1.5); // allow overshoot up to 150%
  const pctDisplay = Math.round(fillRate * 100);

  // Donut parameters
  const size = 120;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75; // 270 degrees
  const totalArc = circumference * arcFraction;
  const filledArc = totalArc * Math.min(pctClamped / 1.0, 1.5); // clamp visual to 150%
  const dashOffset = totalArc - Math.min(filledArc, totalArc);

  // Rotate so gap is at the bottom
  const rotationDeg = 135; // start from bottom-left

  const color = fillColor(fillRate);
  const trackColor = "rgba(255,255,255,0.06)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={stroke}
            strokeDasharray={`${totalArc} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(${rotationDeg} ${size / 2} ${size / 2})`}
          />
          {/* Filled arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${totalArc} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(${rotationDeg} ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        {/* Center text */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}>
          <div className={colorClass} style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
            {pctDisplay}%
          </div>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div className="text-secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </div>
        <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}
