"use client";

import { useIsLight } from "@/lib/hooks";

type Stage = {
  label: string;
  count: number;
  value: string;
};

const stageColors: Record<string, string> = {
  Requests:    "#5aa6ff",   // bright blue — fresh leads
  Draft:       "#6b7280",   // grey — your work in progress
  Sent:        "#f59e0b",
  "Waiting on Customers": "#f59e0b",   // amber — waiting / in flight
  "Customer Wants Changes": "#ef4444", // red — needs your reply
  Won:    "#10b981",        // green — closed deals
};

export function QuotePipeline({
  stages,
  lostCount,
  lostValue,
  selected,
  onSelect,
}: {
  stages: Stage[];
  lostCount: number;
  lostValue: string;
  selected?: string | null;
  onSelect?: (label: string | null) => void;
}) {
  const clickable = !!onSelect;
  const isLight = useIsLight();

  return (
    <div style={{ width: "100%" }}>
      <div className="quote-pipeline-bar" style={{ display: "flex", alignItems: "stretch", width: "100%", overflowX: "auto", gap: 3 }}>
        {stages.map((stage, i) => {
          const accent = stageColors[stage.label] || "#5aa6ff";
          const isActive = selected === stage.label;
          const hasSelection = selected != null;

          return (
            <div key={stage.label} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
              <button
                onClick={() => onSelect?.(isActive ? null : stage.label)}
                className="hover-lift"
                style={{
                  flex: 1,
                  padding: "12px 10px",
                  minWidth: 0,
                  background: isActive
                    ? `${accent}20`
                    : `${accent}0d`,
                  borderRadius: 8,
                  border: `2px solid ${isActive ? accent : `${accent}40`}`,
                  borderLeft: `4px solid ${accent}`,
                  textAlign: "center",
                  cursor: clickable ? "pointer" : "default",
                  transition: "all 0.15s ease",
                  opacity: hasSelection && !isActive ? 0.55 : 1,
                  boxShadow: isActive ? `0 2px 12px ${accent}30` : "none",
                }}
              >
                <div style={{
                  fontSize: 12, fontWeight: 800, letterSpacing: 0.4, marginBottom: 5,
                  textTransform: "uppercase",
                  color: accent,
                }}>
                  {stage.label}
                </div>
                <div className="text-primary" style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1 }}>
                  {stage.value || stage.count.toLocaleString()}
                </div>
                <div className="text-muted" style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>
                  {stage.value ? `${stage.count.toLocaleString()} ${stage.count === 1 ? "quote" : "quotes"}` : "new leads"}
                </div>
              </button>
              {i < stages.length - 1 && (
                <div className="funnel-arrow" style={{ fontSize: 16, padding: "0 2px", flexShrink: 0 }}>&rarr;</div>
              )}
            </div>
          );
        })}
      </div>
      {lostCount > 0 && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span className="age-badge critical" style={{ fontSize: 12, padding: "5px 10px" }}>
            {lostCount} Lost/Rejected
          </span>
          <span className="text-muted" style={{ fontSize: 13 }}>{lostValue}</span>
        </div>
      )}
    </div>
  );
}
