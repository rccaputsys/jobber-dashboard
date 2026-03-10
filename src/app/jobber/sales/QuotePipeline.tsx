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
    <div>
      <div style={{ display: "flex", alignItems: "stretch", gap: 0, overflowX: "auto", paddingBottom: 8 }}>
        {stages.map((stage, i) => (
          <div key={stage.label} style={{ display: "flex", alignItems: "center" }}>
            <div className="funnel-stage">
              <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                {stage.label}
              </div>
              <div className="text-primary" style={{ fontSize: 24, fontWeight: 800, letterSpacing: -1 }}>
                {stage.count}
              </div>
              <div className="text-secondary" style={{ fontSize: 12, marginTop: 2 }}>
                {stage.value}
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="funnel-arrow">&rarr;</div>
            )}
          </div>
        ))}
      </div>
      {lostCount > 0 && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <span className="age-badge critical" style={{ fontSize: 12 }}>
            {lostCount} Lost/Rejected
          </span>
          <span className="text-muted" style={{ fontSize: 12 }}>{lostValue}</span>
        </div>
      )}
    </div>
  );
}
