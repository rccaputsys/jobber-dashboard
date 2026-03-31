"use client";

type Stage = {
  label: string;
  count: number;
  value: string;
};

const stageColors: Record<string, { color: string; bg: string; border: string }> = {
  Requests:    { color: "#5aa6ff", bg: "rgba(90,166,255,0.03)",  border: "rgba(90,166,255,0.15)" },
  Draft:       { color: "#6b7280", bg: "rgba(107,114,128,0.03)", border: "rgba(107,114,128,0.15)" },
  Sent:        { color: "#f59e0b", bg: "rgba(245,158,11,0.03)",  border: "rgba(245,158,11,0.15)" },
  "Awaiting Response": { color: "#94a3b8", bg: "rgba(148,163,184,0.03)", border: "rgba(148,163,184,0.15)" },
  "Changes Requested": { color: "#ef4444", bg: "rgba(239,68,68,0.03)", border: "rgba(239,68,68,0.15)" },
  Approved:    { color: "#10b981", bg: "rgba(16,185,129,0.03)",  border: "rgba(16,185,129,0.15)" },
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

  return (
    <div style={{ width: "100%" }}>
      <div className="quote-pipeline-bar" style={{ display: "flex", alignItems: "stretch", width: "100%", overflowX: "auto", gap: 3 }}>
        {stages.map((stage, i) => {
          const sc = stageColors[stage.label] || { color: "#5aa6ff", bg: "rgba(90,166,255,0.03)", border: "rgba(90,166,255,0.15)" };
          const isActive = selected === stage.label;
          const hasSelection = selected != null;

          return (
            <div key={stage.label} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
              <button
                onClick={() => onSelect?.(isActive ? null : stage.label)}
                style={{
                  flex: 1,
                  padding: "10px 10px",
                  minWidth: 0,
                  background: isActive ? `${sc.color}12` : sc.bg,
                  borderRadius: 8,
                  border: isActive ? `2px solid ${sc.color}` : "2px solid transparent",
                  borderLeft: `3px solid ${sc.color}`,
                  textAlign: "center",
                  cursor: clickable ? "pointer" : "default",
                  transition: "all 0.15s ease",
                  opacity: hasSelection && !isActive ? 0.45 : 1,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.3, marginBottom: 4, color: sc.color }}>
                  {stage.label === "Changes Requested" ? "\u26A0\uFE0F " : ""}{stage.label}
                </div>
                {stage.value ? (
                  <>
                    <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, color: sc.color }}>
                      {stage.value}
                    </div>
                    <div className="text-primary" style={{ fontSize: 13, fontWeight: 500 }}>
                      {stage.count.toLocaleString()} quotes
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -1, color: sc.color }}>
                    {stage.count.toLocaleString()}
                  </div>
                )}
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
