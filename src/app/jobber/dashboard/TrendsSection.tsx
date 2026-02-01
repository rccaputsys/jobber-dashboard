"use client";

import { useState, useEffect, useRef } from "react";
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
  
  // Track previous props to detect when data changes
  const prevDataRef = useRef<string>("");
  
  useEffect(() => {
    // Create a signature of the current data
    const dataSignature = JSON.stringify({
      leakPoints: leakPoints.length,
      ar15Points: ar15Points.length,
      unschedPoints: unschedPoints.length,
      rangeLabel,
      granularityLabel,
      chartType,
    });
    
    // If data changed, turn off loading
    if (prevDataRef.current !== "" && prevDataRef.current !== dataSignature) {
      setLoading(false);
    }
    
    prevDataRef.current = dataSignature;
  }, [leakPoints, ar15Points, unschedPoints, rangeLabel, granularityLabel, chartType]);

  const handleLoadingChange = (isLoading: boolean) => {
    setLoading(isLoading);
    
    // Fallback timeout in case navigation doesn't trigger re-render
    if (isLoading) {
      setTimeout(() => setLoading(false), 3000);
    }
  };

  return (
    <div className="panel" style={{ padding: 0 }}>
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 className="text-primary" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Trends</h2>
            <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
              {rangeLabel} • {granularityLabel}
            </p>
          </div>
        </div>
      </div>
      
      <div style={{ padding: 16 }}>
        <Controls onLoadingChange={handleLoadingChange} />
      </div>

      <div className="chart-grid" style={{ padding: "0 16px 16px" }}>
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
