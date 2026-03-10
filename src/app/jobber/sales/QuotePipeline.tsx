"use client";

type Stage = {
  label: string;
  count: number;
  value: string;
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
        {stages.map((stage, i) => (
          <div key={stage.label} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
            <div className="funnel-stage" style={{ flex: 1, padding: "16px 12px", minWidth: 0 }}>
              <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                {stage.label}
              </div>
              <div className="text-primary" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>
                {stage.count}
              </div>
              <div className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>
                {stage.value}
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="funnel-arrow" style={{ fontSize: 22, padding: "0 4px", flexShrink: 0 }}>&rarr;</div>
            )}
          </div>
        ))}
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
