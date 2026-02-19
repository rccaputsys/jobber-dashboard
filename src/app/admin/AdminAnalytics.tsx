"use client";

import { SparkLine } from "@/app/jobber/dashboard/SparkLine";
import type { AggregateAnalytics } from "./AdminTabs";

type Props = {
  analytics: AggregateAnalytics;
};

export function AdminAnalytics({ analytics }: Props) {
  const maxFeature = analytics.featureUsage.length > 0
    ? Math.max(...analytics.featureUsage.map((f) => f.count))
    : 1;

  const dauPoints = analytics.dailyActiveUsers.map((d) => {
    const date = new Date(d.date);
    return {
      xLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: d.count,
      tooltip: `${d.count} active users`,
    };
  });

  const pageViewPoints = analytics.dailyPageViews.map((d) => {
    const date = new Date(d.date);
    return {
      xLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: d.count,
      tooltip: `${d.count} page views`,
    };
  });

  const sessionPoints = analytics.dailySessions.map((d) => {
    const date = new Date(d.date);
    return {
      xLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: d.count,
      tooltip: `${d.count} sessions`,
    };
  });

  return (
    <div>
      {/* Feature Usage - full width */}
      {analytics.featureUsage.length > 0 && (
        <div className="panel animate-in" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#EAF1FF",
            marginBottom: 16,
          }}>
            Feature Usage (All Users, 30d)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {analytics.featureUsage.slice(0, 12).map((f) => (
              <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 140,
                  fontSize: 12,
                  color: "rgba(234,241,255,0.6)",
                  textAlign: "right",
                  flexShrink: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {f.name.replace(/_/g, " ")}
                </div>
                <div style={{
                  flex: 1,
                  height: 22,
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.04)",
                  overflow: "hidden",
                }}>
                  <div style={{
                    width: `${(f.count / maxFeature) * 100}%`,
                    height: "100%",
                    borderRadius: 6,
                    background: "linear-gradient(90deg, #7c5cff, #5aa6ff)",
                    minWidth: 6,
                    transition: "width 0.5s ease",
                  }} />
                </div>
                <div style={{
                  width: 48,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#EAF1FF",
                  textAlign: "right",
                  flexShrink: 0,
                }}>
                  {f.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="chart-grid animate-in delay-1">
        <SparkLine
          title="Daily Active Users"
          subtitle="Unique users per day"
          points={dauPoints}
          formatType="number"
          chartType="line"
          color="#5aa6ff"
        />
        <SparkLine
          title="Page Views"
          subtitle="Views per day"
          points={pageViewPoints}
          formatType="number"
          chartType="bar"
          color="#7c5cff"
        />
        <SparkLine
          title="Sessions"
          subtitle="Sessions per day"
          points={sessionPoints}
          formatType="number"
          chartType="line"
          color="#10b981"
        />
      </div>
    </div>
  );
}
