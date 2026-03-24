"use client";

import { SparkLine } from "@/app/jobber/dashboard/SparkLine";
import type { AggregateAnalytics, UserAnalyticsSummary, ConnectionRow } from "./AdminTabs";

type Props = {
  analytics: AggregateAnalytics;
  userSummaries: UserAnalyticsSummary[];
  connections: ConnectionRow[];
};

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function getCompanyName(connectionId: string, connections: ConnectionRow[]): string {
  const conn = connections.find((c) => c.id === connectionId);
  if (!conn) return connectionId.slice(0, 8) + "...";
  return conn.jobber_account_name || conn.company_name || conn.owner_name || connectionId.slice(0, 8) + "...";
}

export function AdminAnalytics({ analytics, userSummaries, connections }: Props) {
  const { onboardingFunnel, chartEngagement, rageClicks, errors, topPages } = analytics;

  // Onboarding completion rate
  const onboardingRate = onboardingFunnel.tourStarted > 0
    ? Math.round((onboardingFunnel.tourCompleted / onboardingFunnel.tourStarted) * 100)
    : 0;

  // Max feature count for bar scaling
  const maxFeature = analytics.featureUsage.length > 0
    ? Math.max(...analytics.featureUsage.map((f) => f.count))
    : 1;

  // Max page count for bar scaling
  const maxPage = topPages.length > 0
    ? Math.max(...topPages.map((p) => p.count))
    : 1;

  // SparkLine data points
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

  // Sort users by last_active descending
  const sortedUsers = [...userSummaries].sort((a, b) => {
    if (!a.last_active && !b.last_active) return 0;
    if (!a.last_active) return 1;
    if (!b.last_active) return -1;
    return new Date(b.last_active).getTime() - new Date(a.last_active).getTime();
  });

  // Funnel step max for bar scaling
  const funnelMax = Math.max(onboardingFunnel.tourStarted, onboardingFunnel.tourCompleted, onboardingFunnel.tourSkipped, 1);

  // Chart engagement: compute avg seconds
  const chartEngagementWithAvg = chartEngagement.map((c) => ({
    ...c,
    avgSeconds: c.viewCount > 0 ? Math.round(c.totalViewMs / c.viewCount / 1000 * 10) / 10 : 0,
  })).sort((a, b) => b.viewCount - a.viewCount);

  const tourStatusBadge = (status: UserAnalyticsSummary["tour_status"]) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      completed: { bg: "rgba(16,185,129,0.15)", color: "#10b981", label: "Completed" },
      started: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", label: "Started" },
      skipped: { bg: "rgba(239,68,68,0.15)", color: "#ef4444", label: "Skipped" },
      not_started: { bg: "rgba(255,255,255,0.06)", color: "rgba(234,241,255,0.4)", label: "Not Started" },
    };
    const s = styles[status] || styles.not_started;
    return (
      <span style={{
        display: "inline-block",
        padding: "3px 8px",
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}>
        {s.label}
      </span>
    );
  };

  const boolIcon = (val: boolean) => (
    <span style={{ fontSize: 14, color: val ? "#10b981" : "rgba(234,241,255,0.2)" }}>
      {val ? "\u2713" : "\u2014"}
    </span>
  );

  return (
    <div>
      {/* Row 1: KPI Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 12,
        marginBottom: 20,
      }}>
        <div className="kpi-secondary hover-lift">
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(234,241,255,0.5)", marginBottom: 4 }}>
            DAU / WAU / MAU
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="kpi-value-medium" style={{ color: "#5aa6ff" }}>{analytics.dau}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(234,241,255,0.4)" }}>/</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#7c5cff" }}>{analytics.wau}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(234,241,255,0.4)" }}>/</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "rgba(234,241,255,0.6)" }}>{analytics.mau}</span>
          </div>
        </div>
        <div className="kpi-secondary hover-lift">
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(234,241,255,0.5)", marginBottom: 4 }}>
            Onboarding Rate
          </div>
          <div className="kpi-value-medium" style={{ color: onboardingRate >= 50 ? "#10b981" : onboardingRate >= 25 ? "#f59e0b" : "#ef4444" }}>
            {onboardingRate}%
          </div>
          <div style={{ fontSize: 10, color: "rgba(234,241,255,0.4)", marginTop: 2 }}>
            {onboardingFunnel.tourCompleted} of {onboardingFunnel.tourStarted} completed
          </div>
        </div>
        <div className="kpi-secondary hover-lift">
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(234,241,255,0.5)", marginBottom: 4 }}>
            Rage Clicks
          </div>
          <div className="kpi-value-medium" style={{ color: rageClicks > 0 ? "#ef4444" : "#10b981" }}>
            {rageClicks}
          </div>
          <div style={{ fontSize: 10, color: "rgba(234,241,255,0.4)", marginTop: 2 }}>
            Last 30 days
          </div>
        </div>
        <div className="kpi-secondary hover-lift">
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(234,241,255,0.5)", marginBottom: 4 }}>
            Errors
          </div>
          <div className="kpi-value-medium" style={{ color: errors > 0 ? "#ef4444" : "#10b981" }}>
            {errors}
          </div>
          <div style={{ fontSize: 10, color: "rgba(234,241,255,0.4)", marginTop: 2 }}>
            Last 30 days
          </div>
        </div>
      </div>

      {/* Row 2: Onboarding Funnel */}
      {(onboardingFunnel.tourStarted > 0 || onboardingFunnel.tourCompleted > 0 || onboardingFunnel.tourSkipped > 0) && (
        <div className="panel animate-in" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#EAF1FF", marginBottom: 16 }}>
            Onboarding Funnel
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Tour Started */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 120, fontSize: 12, color: "rgba(234,241,255,0.6)", textAlign: "right", flexShrink: 0 }}>
                Tour Started
              </div>
              <div style={{ flex: 1, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.04)", overflow: "hidden", position: "relative" }}>
                <div style={{
                  width: `${(onboardingFunnel.tourStarted / funnelMax) * 100}%`,
                  height: "100%",
                  borderRadius: 8,
                  background: "linear-gradient(90deg, #10b981, #34d399)",
                  minWidth: onboardingFunnel.tourStarted > 0 ? 6 : 0,
                  transition: "width 0.5s ease",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 8,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                    {onboardingFunnel.tourStarted}
                  </span>
                </div>
              </div>
            </div>
            {/* Tour Completed */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 120, fontSize: 12, color: "rgba(234,241,255,0.6)", textAlign: "right", flexShrink: 0 }}>
                Tour Completed
              </div>
              <div style={{ flex: 1, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.04)", overflow: "hidden", position: "relative" }}>
                <div style={{
                  width: `${(onboardingFunnel.tourCompleted / funnelMax) * 100}%`,
                  height: "100%",
                  borderRadius: 8,
                  background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
                  minWidth: onboardingFunnel.tourCompleted > 0 ? 6 : 0,
                  transition: "width 0.5s ease",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 8,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                    {onboardingFunnel.tourCompleted}
                  </span>
                </div>
              </div>
              <div style={{ width: 60, fontSize: 11, fontWeight: 600, color: "#10b981", textAlign: "right", flexShrink: 0 }}>
                {onboardingFunnel.tourStarted > 0
                  ? `${Math.round((onboardingFunnel.tourCompleted / onboardingFunnel.tourStarted) * 100)}%`
                  : "0%"}
              </div>
            </div>
            {/* Tour Skipped */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 120, fontSize: 12, color: "rgba(234,241,255,0.6)", textAlign: "right", flexShrink: 0 }}>
                Tour Skipped
              </div>
              <div style={{ flex: 1, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.04)", overflow: "hidden", position: "relative" }}>
                <div style={{
                  width: `${(onboardingFunnel.tourSkipped / funnelMax) * 100}%`,
                  height: "100%",
                  borderRadius: 8,
                  background: "linear-gradient(90deg, #ef4444, #f87171)",
                  minWidth: onboardingFunnel.tourSkipped > 0 ? 6 : 0,
                  transition: "width 0.5s ease",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 8,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                    {onboardingFunnel.tourSkipped}
                  </span>
                </div>
              </div>
              <div style={{ width: 60, fontSize: 11, fontWeight: 600, color: "#ef4444", textAlign: "right", flexShrink: 0 }}>
                {onboardingFunnel.tourStarted > 0
                  ? `${Math.round((onboardingFunnel.tourSkipped / onboardingFunnel.tourStarted) * 100)}%`
                  : "0%"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row 3: Charts */}
      <div className="chart-grid animate-in delay-1" style={{ marginBottom: 20 }}>
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

      {/* Row 4: Top Pages + Chart Engagement side by side */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 16,
        marginBottom: 20,
      }}>
        <style>{`
          @media (min-width: 768px) {
            .admin-analytics-split { grid-template-columns: 1fr 1fr !important; }
          }
        `}</style>
        <div className="admin-analytics-split" style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
        }}>
          {/* Top Pages */}
          {topPages.length > 0 && (
            <div className="panel" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#EAF1FF", marginBottom: 16 }}>
                Top Pages
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {topPages.slice(0, 10).map((p) => (
                  <div key={p.page} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 120,
                      fontSize: 12,
                      color: "rgba(234,241,255,0.6)",
                      textAlign: "right",
                      flexShrink: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {p.page.replace(/_/g, " ")}
                    </div>
                    <div style={{
                      flex: 1,
                      height: 22,
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.04)",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${(p.count / maxPage) * 100}%`,
                        height: "100%",
                        borderRadius: 6,
                        background: "linear-gradient(90deg, #7c5cff, #a78bfa)",
                        minWidth: 6,
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                    <div style={{
                      width: 40,
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#EAF1FF",
                      textAlign: "right",
                      flexShrink: 0,
                    }}>
                      {p.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart Engagement */}
          {chartEngagementWithAvg.length > 0 && (
            <div className="panel" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#EAF1FF", marginBottom: 16 }}>
                Chart Engagement
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Chart</th>
                      <th style={{ textAlign: "right" }}>Views</th>
                      <th style={{ textAlign: "right" }}>Avg Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartEngagementWithAvg.slice(0, 10).map((c) => (
                      <tr key={c.chartName}>
                        <td style={{ color: "rgba(234,241,255,0.8)", fontSize: 12 }}>
                          {c.chartName.replace(/_/g, " ")}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#EAF1FF" }}>
                          {c.viewCount}
                        </td>
                        <td style={{ textAlign: "right", color: "rgba(234,241,255,0.6)" }}>
                          {c.avgSeconds}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 5: Feature Usage */}
      {analytics.featureUsage.length > 0 && (
        <div className="panel animate-in" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#EAF1FF", marginBottom: 4 }}>
            Feature Usage
          </div>
          <div style={{ fontSize: 11, color: "rgba(234,241,255,0.4)", marginBottom: 16 }}>
            All users, last 30 days
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {analytics.featureUsage.slice(0, 15).map((f) => (
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

      {/* Row 6: Individual User Activity Table */}
      <div className="panel animate-in delay-2" style={{ marginBottom: 20 }}>
        <div style={{ padding: "16px 20px 0 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#EAF1FF", marginBottom: 4 }}>
            Individual User Activity
          </div>
          <div style={{ fontSize: 11, color: "rgba(234,241,255,0.4)", marginBottom: 12 }}>
            {sortedUsers.length} users tracked in last 30 days
          </div>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th style={{ textAlign: "right" }}>Last Active</th>
                <th style={{ textAlign: "right" }}>Events (7d)</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th>Pages Visited</th>
                <th>Tour</th>
                <th style={{ textAlign: "center" }}>Synced</th>
                <th style={{ textAlign: "center" }}>Exported</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u) => (
                <tr key={u.connection_id}>
                  <td style={{ fontWeight: 600, color: "#EAF1FF", fontSize: 12, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {getCompanyName(u.connection_id, connections)}
                  </td>
                  <td style={{ textAlign: "right", color: "rgba(234,241,255,0.6)", fontSize: 12, whiteSpace: "nowrap" }}>
                    {relativeTime(u.last_active)}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#EAF1FF" }}>
                    {u.event_count_7d}
                  </td>
                  <td style={{ textAlign: "right", color: "rgba(234,241,255,0.6)" }}>
                    {u.total_events}
                  </td>
                  <td style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.pages_visited.length > 0 ? u.pages_visited.join(", ") : "\u2014"}
                  </td>
                  <td>
                    {tourStatusBadge(u.tour_status)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {boolIcon(u.has_synced)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {boolIcon(u.has_exported)}
                  </td>
                  <td>
                    <a
                      href={`/jobber/dashboard?admin_connection_id=${u.connection_id}`}
                      className="btn"
                    >
                      View as
                    </a>
                  </td>
                </tr>
              ))}
              {sortedUsers.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 24, color: "rgba(234,241,255,0.4)" }}>
                    No analytics events recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
