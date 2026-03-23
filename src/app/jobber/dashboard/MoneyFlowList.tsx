"use client";

import { useEffect, useState } from "react";

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
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
              padding: "11px 14px",
              borderRadius: 8,
              borderLeft: `3px solid ${empty ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.06)") : stage.color}`,
              background: empty
                ? "transparent"
                : isLight ? `${stage.color}08` : `${stage.color}0A`,
              opacity: empty ? 0.4 : 1,
              transition: "all 0.12s ease",
            }}
            className={empty ? "" : "hover-lift"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: empty ? undefined : stage.color }} className={empty ? "text-muted" : undefined}>
                {stage.label}
              </span>
              {!empty && (
                <span className="text-muted" style={{ fontSize: 11 }}>
                  {stage.count} {stage.count === 1 ? unitSingular : unit}
                </span>
              )}
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: empty ? undefined : stage.color, letterSpacing: -0.3 }} className={empty ? "text-muted" : undefined}>
              {empty ? "\u2014" : (stage.value || stage.count)}
            </span>
          </a>
        );
      })}
    </div>
  );
}
