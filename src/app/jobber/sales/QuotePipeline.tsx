"use client";

import { useIsLight } from "@/lib/hooks";

type Stage = {
  label: string;
  count: number;
  value: string;
};

const stageColors: Record<string, string> = {
  Requests:    "#5aa6ff",
  Draft:       "#6b7280",
  Sent:        "#f59e0b",
  "Awaiting Response": "#94a3b8",
  "Changes Requested": "#ef4444",
  Approved:    "#10b981",
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
                  padding: "10px 10px",
                  minWidth: 0,
                  background: isActive
                    ? (isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.03)")
                    : "transparent",
                  borderRadius: 8,
                  border: isActive
                    ? `1.5px solid ${accent}50`
                    : `1.5px solid ${accent}20`,
                  borderLeft: `3px solid ${isActive ? accent : `${accent}40`}`,
                  textAlign: "center",
                  cursor: clickable ? "pointer" : "default",
                  transition: "all 0.15s ease",
                  opacity: hasSelection && !isActive ? 0.6 : 1,
                }}
              >
                <div className="text-muted" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.3, marginBottom: 4 }}>
                  {stage.label}
                </div>
                <div className="text-primary" style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>
                  {stage.value || stage.count.toLocaleString()}
                </div>
                <div className="text-muted" style={{ fontSize: 13, fontWeight: 500 }}>
                  {stage.value ? `${stage.count.toLocaleString()} quotes` : "new leads"}
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
