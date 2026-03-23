"use client";

import { useIsLight } from "@/lib/hooks";

type FunnelStage = {
  label: string;
  count: number;
  value: string | null;
  icon: string;
  href: string;
  color: string;
  unitLabel?: string;
};

type Props = { stages: FunnelStage[] };

const stageStyles: Record<string, { color: string; bg: string; border: string }> = {
  Leads:           { color: "#8b5cf6", bg: "rgba(139,92,246,0.08)",  border: "rgba(139,92,246,0.2)" },
  Quoting:         { color: "#5aa6ff", bg: "rgba(90,166,255,0.08)",  border: "rgba(90,166,255,0.2)" },
  Won:             { color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)" },
  Scheduled:       { color: "#06b6d4", bg: "rgba(6,182,212,0.08)",   border: "rgba(6,182,212,0.2)" },
  "Needs Invoice": { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  Outstanding:     { color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)" },
};

export function MoneyFlowFunnel({ stages }: Props) {
  const isLight = useIsLight();

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "stretch", width: "100%", overflowX: "auto", paddingBottom: 8 }}>
        {stages.map((stage, i) => {
          const sc = stageStyles[stage.label] || { color: stage.color, bg: `${stage.color}14`, border: `${stage.color}33` };
          const empty = stage.count === 0;
          const unit = stage.unitLabel || "items";
          const unitSingular = unit.replace(/s$/, "");

          return (
            <div key={stage.label} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
              <a
                href={stage.href}
                className="funnel-stage"
                style={{
                  flex: 1,
                  padding: "14px 12px",
                  minWidth: 0,
                  background: empty
                    ? (isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)")
                    : sc.bg,
                  borderRadius: 10,
                  borderLeft: `3px solid ${empty ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)") : sc.color}`,
                  textDecoration: "none",
                  display: "block",
                  opacity: empty ? 0.5 : 1,
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{
                  fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                  letterSpacing: 0.5, marginBottom: 8,
                  color: empty ? (isLight ? "#94a3b8" : "rgba(255,255,255,0.3)") : sc.color,
                }}>
                  {stage.label}
                </div>
                <div className="text-primary" style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1 }}>
                  {empty ? "\u2014" : stage.count}
                </div>
                {!empty && stage.value && (
                  <div style={{ fontSize: 13, marginTop: 4, color: sc.color, fontWeight: 600 }}>
                    {stage.value}
                  </div>
                )}
                {!empty && !stage.value && (
                  <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {stage.count} {stage.count === 1 ? unitSingular : unit}
                  </div>
                )}
              </a>
              {i < stages.length - 1 && (
                <div className="funnel-arrow" style={{
                  fontSize: 20, padding: "0 4px", flexShrink: 0,
                  color: isLight ? "#cbd5e1" : "rgba(255,255,255,0.15)",
                }}>&rarr;</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
