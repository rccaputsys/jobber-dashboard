"use client";

import { useEffect, useState } from "react";

type ScoreBreakdown = {
  label: string;
  score: number;
  detail: string;
  action: string;
  href: string;
};

type Props = {
  score: number;
  breakdown: ScoreBreakdown[];
};

function barColor(s: number) {
  if (s >= 80) return "#10b981";
  if (s >= 60) return "#f59e0b";
  return "#ef4444";
}

export function AccuScore({ score, breakdown }: Props) {
  const [animated, setAnimated] = useState(0);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const duration = 1000;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimated(Math.round(eased * score));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [score]);

  const size = 130;
  const sw = 10;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const filled = (animated / 100) * arc;

  const color = barColor(animated);
  const label = animated >= 80 ? "Strong" : animated >= 60 ? "Good" : "Needs Work";
  const track = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  const bgBar = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  const cardBg = isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)";
  const cardBorder = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)";

  return (
    <div>
      {/* Top row: gauge + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 18 }}>
        <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track}
              strokeWidth={sw} strokeDasharray={`${arc} ${circ}`}
              strokeLinecap="round" transform={`rotate(135 ${size / 2} ${size / 2})`} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
              strokeWidth={sw} strokeDasharray={`${filled} ${circ}`}
              strokeLinecap="round" transform={`rotate(135 ${size / 2} ${size / 2})`}
              style={{ filter: `drop-shadow(0 0 6px ${color}40)` }} />
          </svg>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", paddingBottom: 2,
          }}>
            <div style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: -2, lineHeight: 1 }}>
              {animated}
            </div>
            <div className="text-muted" style={{ fontSize: 9, fontWeight: 700, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {label}
            </div>
          </div>
        </div>

        <div>
          <div className="text-primary" style={{ fontSize: 16, fontWeight: 800, marginBottom: 3 }}>
            Business Health
          </div>
          <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
            Based on the last 90 days across your sales pipeline, job scheduling, and invoice collections.
          </div>
        </div>
      </div>

      {/* Score cards — one per tab */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${breakdown.length}, 1fr)`, gap: 10 }}>
        {breakdown.map((item, i) => {
          const c = barColor(item.score);
          return (
            <a
              key={i}
              href={item.href}
              className="hover-lift"
              style={{
                textDecoration: "none",
                display: "block",
                padding: "12px 14px",
                borderRadius: 10,
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderTop: `3px solid ${c}`,
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span className="text-primary" style={{ fontSize: 12, fontWeight: 700 }}>
                  {item.label}
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: c }}>{item.score}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: bgBar, overflow: "hidden", marginBottom: 8 }}>
                <div style={{
                  height: "100%", borderRadius: 2, width: `${item.score}%`,
                  background: c, transition: "width 1s ease-out",
                }} />
              </div>
              <div className="text-muted" style={{ fontSize: 10, lineHeight: 1.4, marginBottom: 4 }}>
                {item.detail}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: c }}>
                {item.action} &rarr;
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
