"use client";

import { useEffect, useState } from "react";

type ScoreBreakdown = {
  label: string;
  score: number;
  detail: string;
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

  const size = 140;
  const sw = 12;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const filled = (animated / 100) * arc;

  const color = barColor(animated);
  const label = animated >= 80 ? "Strong" : animated >= 60 ? "Good" : "Needs Work";
  const track = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  const bgBar = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";

  // Find the lowest-scoring area to suggest focus
  const sorted = [...breakdown].sort((a, b) => a.score - b.score);
  const focus = sorted.length > 0 ? sorted[0] : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      {/* Gauge */}
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0, margin: "0 auto" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track}
            strokeWidth={sw} strokeDasharray={`${arc} ${circ}`}
            strokeLinecap="round" transform={`rotate(135 ${size / 2} ${size / 2})`} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
            strokeWidth={sw} strokeDasharray={`${filled} ${circ}`}
            strokeLinecap="round" transform={`rotate(135 ${size / 2} ${size / 2})`}
            style={{ filter: `drop-shadow(0 0 8px ${color}50)` }} />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", paddingBottom: 2,
        }}>
          <div style={{ fontSize: 36, fontWeight: 800, color, letterSpacing: -2, lineHeight: 1 }}>
            {animated}
          </div>
          <div className="text-muted" style={{ fontSize: 10, fontWeight: 700, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {label}
          </div>
        </div>
      </div>

      {/* Summary + breakdown */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ marginBottom: 14 }}>
          <div className="text-primary" style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
            AccuScore
          </div>
          <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
            {focus && focus.score < 70
              ? <>Focus on <a href={focus.href} style={{ color: barColor(focus.score), fontWeight: 600, textDecoration: "none" }}>{focus.label}</a> to improve your score.</>
              : "Your operations are running well across the board."
            }
          </div>
        </div>

        {/* Breakdown with targets */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px 16px" }}>
          {breakdown.map((item, i) => {
            const c = barColor(item.score);
            return (
              <a key={i} href={item.href} style={{ textDecoration: "none", display: "block" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                  <span className="text-muted" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: c }}>{item.score}</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: bgBar, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 2, width: `${item.score}%`,
                    background: c, transition: "width 1s ease-out",
                  }} />
                </div>
                <div className="text-muted" style={{ fontSize: 10, marginTop: 3, lineHeight: 1.3 }}>
                  {item.detail}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
