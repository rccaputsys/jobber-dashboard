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
  
  const prevDataRef = useRef<string>("");
  
  useEffect(() => {
    const dataSignature = JSON.stringify({
      leakPoints: leakPoints.length,
      ar15Points: ar15Points.length,
      unschedPoints: unschedPoints.length,
      rangeLabel,
      granularityLabel,
      chartType,
    });
    
    if (prevDataRef.current !== "" && prevDataRef.current !== dataSignature) {
      setLoading(false);
    }
    
    prevDataRef.current = dataSignature;
  }, [leakPoints, ar15Points, unschedPoints, rangeLabel, granularityLabel, chartType]);

  const handleLoadingChange = (isLoading: boolean) => {
    setLoading(isLoading);
    if (isLoading) {
      setTimeout(() => setLoading(false), 3000);
    }
  };

  return (
    <div className="panel" style={{ padding: 0 }}>
      <div style={{ padding: "12px 16px" }}>
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
