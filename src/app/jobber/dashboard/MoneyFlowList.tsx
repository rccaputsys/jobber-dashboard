"use client";

import { useIsLight } from "@/lib/hooks";

type FunnelStage = {
  label: string;
  count: number;
  value: string | null;
  href: string;
  color: string;
  unitLabel?: string;
};

type Props = { stages: FunnelStage[] };

export function MoneyFlowList({ stages }: Props) {
  const isLight = useIsLight();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {stages.map((stage, i) => {
        const empty = stage.count === 0;
        const unit = stage.unitLabel || "items";
        const unitSingular = unit.replace(/s$/, "");

        return (
          <a
            key={i}
            href={stage.href}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              textDecoration: "none",
              padding: "10px 12px",
              borderRadius: 8,
              borderLeft: `3px solid ${empty ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.06)") : stage.color}`,
              background: empty
                ? "transparent"
                : isLight ? `${stage.color}06` : `${stage.color}08`,
              opacity: empty ? 0.4 : 1,
              transition: "all 0.12s ease",
            }}
            className={empty ? "" : "hover-lift"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: empty ? undefined : (isLight ? stage.color : stage.color),
              }} className={empty ? "text-muted" : undefined}>
                {stage.label}
              </span>
              {!empty && (
                <span className="text-muted" style={{ fontSize: 11, flexShrink: 0 }}>
                  {stage.count} {stage.count === 1 ? unitSingular : unit}
                </span>
              )}
            </div>
            <span style={{
              fontSize: 15, fontWeight: 800, letterSpacing: -0.3, flexShrink: 0, marginLeft: 12,
              color: empty ? undefined : stage.color,
            }} className={empty ? "text-muted" : undefined}>
              {empty ? "\u2014" : (stage.value || stage.count)}
            </span>
          </a>
        );
      })}
    </div>
  );
}
