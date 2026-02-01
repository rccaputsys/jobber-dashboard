"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SparkLine } from "./SparkLine";
import { Controls } from "./controls";

type ChartType = "line" | "bar";

type Point = {
  xLabel: string;
  value: number;
  tooltip: string;
};

type Props = {
  leakPoints: Point[];
  ar15Points: Point[];
  unschedPoints: Point[];
  chartType: ChartType;
  rangeLabel: string;
  granularityLabel: string;
};

export function TrendsSection({ 
  leakPoints, 
  ar15Points, 
  unschedPoints, 
  chartType,
  rangeLabel,
  granularityLabel,
}: Props) {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  // Reset loading when search params change (data has loaded)
  useEffect(() => {
    setLoading(false);
  }, [searchParams]);

  return (
    <div className="panel" style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 className="section-title" style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Trends</h2>
        <p className="section-subtitle" style={{ fontSize: 13 }}>{rangeLabel} • {granularityLabel}</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Controls onLoadingChange={setLoading} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <SparkLine
          title="Quote Leak"
          subtitle="Point-in-time balance"
          points={leakPoints}
          formatType="money"
          chartType={chartType}
          color="#ef4444"
          loading={loading}
        />
        <SparkLine
          title="AR 15+ Days"
          subtitle="Point-in-time balance"
          points={ar15Points}
          formatType="money"
          chartType={chartType}
          color="#f59e0b"
          loading={loading}
        />
        <SparkLine
          title="Unscheduled"
          subtitle="Point-in-time backlog"
          points={unschedPoints}
          formatType="number"
          chartType={chartType}
          color="#5aa6ff"
          loading={loading}
        />
      </div>
    </div>
  );
}
