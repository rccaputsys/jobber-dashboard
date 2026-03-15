"use client";

type Stage = {
  label: string;
  count: number;
  value: string;
};

const stageColors: Record<string, { color: string; bg: string; border: string }> = {
  Draft:       { color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)" },
  Sent:        { color: "#5aa6ff", bg: "rgba(90,166,255,0.08)",  border: "rgba(90,166,255,0.2)" },
  "Changes Req": { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  Approved:    { color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)" },
  Won:         { color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)" },
};

export function QuotePipeline({
  stages,
  lostCount,
  lostValue,
}: {
  stages: Stage[];
  lostCount: number;
  lostValue: string;
}) {
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "stretch", width: "100%", overflowX: "auto", paddingBottom: 8 }}>
        {stages.map((stage, i) => {
          const sc = stageColors[stage.label] || { color: "#5aa6ff", bg: "rgba(90,166,255,0.08)", border: "rgba(90,166,255,0.2)" };
          return (
            <div key={stage.label} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
              <div
                className="funnel-stage"
                style={{
                  flex: 1,
                  padding: "16px 12px",
                  minWidth: 0,
                  background: sc.bg,
                  borderRadius: 10,
                  borderLeft: `3px solid ${sc.color}`,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, color: sc.color }}>
                  {stage.label}
                </div>
                <div className="text-primary" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>
                  {stage.count}
                </div>
                <div style={{ fontSize: 13, marginTop: 4, color: sc.color, fontWeight: 600 }}>
                  {stage.value}
                </div>
              </div>
              {i < stages.length - 1 && (
                <div className="funnel-arrow" style={{ fontSize: 22, padding: "0 4px", flexShrink: 0 }}>&rarr;</div>
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
