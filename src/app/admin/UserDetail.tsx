"use client";

import { useState, useEffect } from "react";
import { SparkLine } from "@/app/jobber/dashboard/SparkLine";

type AnalyticsData = {
  last_active: string | null;
  total_events_30d: number;
  session_count: number;
  avg_session_seconds: number;
  feature_usage: { name: string; count: number }[];
  daily_activity: { date: string; count: number }[];
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

function formatRelative(d: string | null): string {
  if (!d) return "Never";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function UserDetail({ connectionId }: { connectionId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/analytics?connection_id=${connectionId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [connectionId]);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <div style={{
          width: 28,
          height: 28,
          border: "3px solid rgba(255,255,255,0.1)",
          borderTopColor: "#7c5cff",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto",
        }} />
        <div style={{ fontSize: 12, color: "rgba(234,241,255,0.5)", marginTop: 8 }}>
          Loading analytics...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "rgba(234,241,255,0.5)", fontSize: 13 }}>
        {error || "No data available"}
      </div>
    );
  }

  const maxFeatureCount = data.feature_usage.length > 0
    ? Math.max(...data.feature_usage.map((f) => f.count))
    : 1;

  const sparkPoints = data.daily_activity.map((d) => {
    const date = new Date(d.date);
    const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return {
      xLabel: label,
      value: d.count,
      tooltip: `${d.count} events`,
    };
  });

  return (
    <div style={{ padding: 20 }}>
      {/* Top metrics */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
        marginBottom: 20,
      }}>
        <div style={{
          padding: 14,
          borderRadius: 12,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(234,241,255,0.5)", marginBottom: 4 }}>
            Last Active
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#EAF1FF" }}>
            {formatRelative(data.last_active)}
          </div>
        </div>
        <div style={{
          padding: 14,
          borderRadius: 12,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(234,241,255,0.5)", marginBottom: 4 }}>
            Sessions (30d)
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#5aa6ff" }}>
            {data.session_count}
          </div>
        </div>
        <div style={{
          padding: 14,
          borderRadius: 12,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(234,241,255,0.5)", marginBottom: 4 }}>
            Avg Session
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>
            {formatDuration(data.avg_session_seconds)}
          </div>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: data.feature_usage.length > 0 ? "1fr 1fr" : "1fr",
        gap: 16,
      }}>
        {/* Feature usage bar chart */}
        {data.feature_usage.length > 0 && (
          <div>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: "rgba(234,241,255,0.6)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 10,
            }}>
              Feature Usage
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.feature_usage.slice(0, 8).map((f) => (
                <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 100,
                    fontSize: 11,
                    color: "rgba(234,241,255,0.6)",
                    textAlign: "right",
                    flexShrink: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {f.name.replace(/_/g, " ")}
                  </div>
                  <div style={{ flex: 1, height: 16, borderRadius: 4, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                    <div style={{
                      width: `${(f.count / maxFeatureCount) * 100}%`,
                      height: "100%",
                      borderRadius: 4,
                      background: "linear-gradient(90deg, #7c5cff, #5aa6ff)",
                      minWidth: 4,
                    }} />
                  </div>
                  <div style={{ width: 36, fontSize: 11, fontWeight: 700, color: "#EAF1FF", textAlign: "right", flexShrink: 0 }}>
                    {f.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Daily activity sparkline */}
        <div>
          <SparkLine
            title="Daily Activity"
            subtitle="Events per day (30d)"
            points={sparkPoints}
            formatType="number"
            chartType="bar"
            color="#7c5cff"
          />
        </div>
      </div>
    </div>
  );
}
