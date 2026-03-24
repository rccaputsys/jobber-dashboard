"use client";

import { useState } from "react";
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
  return `${days}d ago`;
}

function getCompanyName(connectionId: string, connections: ConnectionRow[]): string {
  const conn = connections.find((c) => c.id === connectionId);
  if (!conn) return connectionId.slice(0, 8) + "...";
  return conn.jobber_account_name || conn.company_name || conn.owner_name || connectionId.slice(0, 8) + "...";
}

function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function HBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ flex: 1, height: 20, borderRadius: 5, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 5, background: color, minWidth: pct > 0 ? 4 : 0, transition: "width 0.4s ease" }} />
    </div>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="kpi-secondary hover-lift" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="text-muted" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: -0.5 }}>{value}</div>
      {sub && <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 className="text-primary" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h3>
      {sub && <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function AdminAnalytics({ analytics, userSummaries, connections }: Props) {
  const [userFilter, setUserFilter] = useState<"all" | "active" | "inactive">("all");
  const a = analytics;

  const onboardingRate = a.onboardingFunnel.tourStarted > 0
    ? Math.round((a.onboardingFunnel.tourCompleted / a.onboardingFunnel.tourStarted) * 100) : 0;
  const upgradeCTR = a.upgradeNudgesSeen > 0
    ? Math.round((a.upgradeCTAClicks / a.upgradeNudgesSeen) * 100) : 0;

  const maxFeature = a.featureUsage.length > 0 ? Math.max(...a.featureUsage.map(f => f.count)) : 1;
  const maxPage = a.topPages.length > 0 ? Math.max(...a.topPages.map(p => p.count)) : 1;
  const maxHourly = Math.max(...a.hourlyActivity, 1);

  const dauPoints = a.dailyActiveUsers.map(d => ({ xLabel: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }), value: d.count, tooltip: `${d.count} users` }));
  const pvPoints = a.dailyPageViews.map(d => ({ xLabel: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }), value: d.count, tooltip: `${d.count} views` }));
  const sessionPoints = a.dailySessions.map(d => ({ xLabel: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }), value: d.count, tooltip: `${d.count} sessions` }));

  // Filter users
  const filteredUsers = userSummaries.filter(u => {
    if (userFilter === "active") return u.event_count_7d > 0;
    if (userFilter === "inactive") return u.event_count_7d === 0;
    return true;
  }).sort((a, b) => (b.last_active || "").localeCompare(a.last_active || ""));

  const tourBadgeColor = (status: string) => {
    if (status === "completed") return "#10b981";
    if (status === "started") return "#f59e0b";
    if (status === "skipped") return "#ef4444";
    return "rgba(255,255,255,0.2)";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ===== ROW 1: Key Metrics ===== */}
      <div className="kpi-grid-secondary animate-in">
        <StatCard label="Daily Active" value={a.dau} color="#5aa6ff" sub={`${a.wau} weekly / ${a.mau} monthly`} />
        <StatCard label="Avg Session" value={formatSeconds(a.avgSessionSeconds)} color="#7c5cff" sub={`${a.totalSessions} total sessions`} />
        <StatCard label="Onboarding Rate" value={`${onboardingRate}%`} color={onboardingRate >= 60 ? "#10b981" : onboardingRate >= 30 ? "#f59e0b" : "#ef4444"} sub={`${a.onboardingFunnel.tourCompleted} of ${a.onboardingFunnel.tourStarted} completed`} />
        <StatCard label="Upgrade CTR" value={upgradeCTR > 0 ? `${upgradeCTR}%` : "0%"} color="#7c5cff" sub={`${a.upgradeCTAClicks} clicks / ${a.upgradeNudgesSeen} seen`} />
      </div>

      {/* ===== ROW 2: Activity + Engagement ===== */}
      <div className="kpi-grid-secondary animate-in delay-1">
        <StatCard label="Syncs" value={a.totalSyncs} color="#06b6d4" sub="Manual sync triggers" />
        <StatCard label="Exports" value={a.totalExports} color="#5aa6ff" sub="CSV downloads" />
        <StatCard label="Rage Clicks" value={a.rageClicks} color={a.rageClicks > 10 ? "#ef4444" : a.rageClicks > 0 ? "#f59e0b" : "#10b981"} sub={a.rageClicks === 0 ? "No confusion signals" : "Users clicking rapidly"} />
        <StatCard label="Errors" value={a.errors} color={a.errors > 0 ? "#ef4444" : "#10b981"} sub={a.errors === 0 ? "Clean" : `${a.errorDetails.length} unique errors`} />
      </div>

      {/* ===== ROW 3: Time Series Charts ===== */}
      <div className="chart-grid animate-in delay-1">
        <SparkLine title="Daily Active Users" subtitle="Unique users per day" points={dauPoints} formatType="number" chartType="line" color="#5aa6ff" />
        <SparkLine title="Page Views" subtitle="Views per day" points={pvPoints} formatType="number" chartType="bar" color="#7c5cff" />
        <SparkLine title="Sessions" subtitle="Sessions per day" points={sessionPoints} formatType="number" chartType="line" color="#10b981" />
      </div>

      {/* ===== ROW 4: Onboarding Funnel ===== */}
      <div className="panel animate-in delay-2" style={{ padding: 20 }}>
        <SectionHeader title="Onboarding Funnel" sub="Tour started, completed, and dropped" />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "Started", value: a.onboardingFunnel.tourStarted, color: "#5aa6ff" },
            { label: "Completed", value: a.onboardingFunnel.tourCompleted, color: "#10b981" },
            { label: "Skipped", value: a.onboardingFunnel.tourSkipped, color: "#ef4444" },
          ].map(item => (
            <div key={item.label} style={{ flex: 1, minWidth: 100, padding: "12px 16px", borderRadius: 10, background: `${item.color}08`, borderLeft: `3px solid ${item.color}` }}>
              <div className="text-muted" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: item.color, marginTop: 4 }}>{item.value}</div>
            </div>
          ))}
        </div>
        {a.onboardingFunnel.tourStarted > 0 && (
          <div style={{ marginTop: 14, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.04)", overflow: "hidden", display: "flex" }}>
            <div style={{ width: `${(a.onboardingFunnel.tourCompleted / a.onboardingFunnel.tourStarted) * 100}%`, background: "#10b981", transition: "width 0.5s ease" }} />
            <div style={{ width: `${(a.onboardingFunnel.tourSkipped / a.onboardingFunnel.tourStarted) * 100}%`, background: "#ef4444", transition: "width 0.5s ease" }} />
          </div>
        )}
      </div>

      {/* ===== ROW 5: Side by side — Top Pages + Hourly Activity ===== */}
      <div className="side-by-side animate-in delay-2">
        {/* Top Pages */}
        <div className="panel" style={{ padding: 20 }}>
          <SectionHeader title="Top Pages" sub="Most visited pages (30d)" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {a.topPages.slice(0, 8).map(p => (
              <div key={p.page} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="text-muted" style={{ width: 80, fontSize: 12, textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.page}</div>
                <HBar value={p.count} max={maxPage} color="linear-gradient(90deg, #7c5cff, #5aa6ff)" />
                <div className="text-primary" style={{ width: 40, fontSize: 13, fontWeight: 700, textAlign: "right", flexShrink: 0 }}>{p.count}</div>
              </div>
            ))}
            {a.topPages.length === 0 && <div className="text-muted" style={{ fontSize: 12, textAlign: "center", padding: 20 }}>No page view data yet</div>}
          </div>
        </div>

        {/* Hourly Activity */}
        <div className="panel" style={{ padding: 20 }}>
          <SectionHeader title="Activity by Hour" sub="When your users are most active" />
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120 }}>
            {a.hourlyActivity.map((count, hour) => {
              const h = maxHourly > 0 ? (count / maxHourly) * 100 : 0;
              const isPeak = count === maxHourly && count > 0;
              return (
                <div key={hour} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: "80%", height: `${Math.max(h, 3)}%`, minHeight: 2,
                    borderRadius: "3px 3px 0 0",
                    background: isPeak ? "#7c5cff" : count > 0 ? "rgba(90,166,255,0.5)" : "rgba(255,255,255,0.06)",
                    transition: "height 0.3s ease",
                  }} title={`${hour}:00 — ${count} events`} />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span className="text-muted" style={{ fontSize: 9 }}>12am</span>
            <span className="text-muted" style={{ fontSize: 9 }}>6am</span>
            <span className="text-muted" style={{ fontSize: 9 }}>12pm</span>
            <span className="text-muted" style={{ fontSize: 9 }}>6pm</span>
            <span className="text-muted" style={{ fontSize: 9 }}>12am</span>
          </div>
        </div>
      </div>

      {/* ===== ROW 6: Chart Engagement + Date Ranges ===== */}
      <div className="side-by-side animate-in delay-2">
        {/* Chart Engagement */}
        <div className="panel" style={{ padding: 20 }}>
          <SectionHeader title="Chart Engagement" sub="How long users look at each chart" />
          {a.chartEngagement.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {a.chartEngagement.map(c => {
                const avgSec = c.viewCount > 0 ? Math.round(c.totalViewMs / c.viewCount / 1000) : 0;
                return (
                  <div key={c.chartName} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
                    <span className="text-primary" style={{ fontSize: 13, fontWeight: 600 }}>{c.chartName.replace(/_/g, " ")}</span>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <span className="text-muted" style={{ fontSize: 12 }}>{c.viewCount} views</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#5aa6ff" }}>{formatSeconds(avgSec)} avg</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-muted" style={{ fontSize: 12, textAlign: "center", padding: 20 }}>No chart data yet</div>
          )}
        </div>

        {/* Date Range Preferences */}
        <div className="panel" style={{ padding: 20 }}>
          <SectionHeader title="Date Range Preferences" sub="Which time periods users select most" />
          {a.dateRangeUsage.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {a.dateRangeUsage.slice(0, 8).map(d => (
                <div key={d.range} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 80, fontSize: 12, fontWeight: 600, color: "#7c5cff", textAlign: "right", flexShrink: 0 }}>{d.range}</div>
                  <HBar value={d.count} max={a.dateRangeUsage[0]?.count || 1} color="linear-gradient(90deg, #7c5cff, #5aa6ff)" />
                  <div className="text-primary" style={{ width: 40, fontSize: 13, fontWeight: 700, textAlign: "right", flexShrink: 0 }}>{d.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted" style={{ fontSize: 12, textAlign: "center", padding: 20 }}>No range data yet</div>
          )}
        </div>
      </div>

      {/* ===== ROW 7: Errors + Rage Clicks ===== */}
      {(a.errors > 0 || a.rageClicks > 0) && (
        <div className="side-by-side animate-in delay-2">
          {a.errorDetails.length > 0 && (
            <div className="panel" style={{ padding: 20, borderLeft: "3px solid #ef4444" }}>
              <SectionHeader title="Error Log" sub={`${a.errors} total errors (${a.errorDetails.length} unique)`} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {a.errorDetails.slice(0, 10).map((e, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 6, background: "rgba(239,68,68,0.06)" }}>
                    <span className="text-muted" style={{ fontSize: 11, maxWidth: "80%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.message}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", flexShrink: 0 }}>{e.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {a.rageClickTargets.length > 0 && (
            <div className="panel" style={{ padding: 20, borderLeft: "3px solid #f59e0b" }}>
              <SectionHeader title="Rage Click Hotspots" sub="Elements users clicked repeatedly in frustration" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {a.rageClickTargets.slice(0, 10).map((r, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 6, background: "rgba(245,158,11,0.06)" }}>
                    <span className="text-muted" style={{ fontSize: 11, fontFamily: "monospace" }}>{r.target}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", flexShrink: 0 }}>{r.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== ROW 8: Feature Usage ===== */}
      <div className="panel animate-in delay-2" style={{ padding: 20 }}>
        <SectionHeader title="Feature Usage" sub="Event frequency across all users (30d)" />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {a.featureUsage.slice(0, 20).map(f => (
            <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="text-muted" style={{ width: 140, fontSize: 11, textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.name.replace(/_/g, " ")}
              </div>
              <HBar value={f.count} max={maxFeature} color="linear-gradient(90deg, #7c5cff, #5aa6ff)" />
              <div className="text-primary" style={{ width: 48, fontSize: 12, fontWeight: 700, textAlign: "right", flexShrink: 0 }}>{f.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== ROW 9: Individual User Table ===== */}
      <div className="panel animate-in delay-3" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <SectionHeader title="User Activity" sub={`${filteredUsers.length} users`} />
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 3 }}>
            {(["all", "active", "inactive"] as const).map(f => (
              <button key={f} onClick={() => setUserFilter(f)} style={{
                padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: userFilter === f ? "linear-gradient(135deg, #7c5cff, #5aa6ff)" : "transparent",
                color: userFilter === f ? "#fff" : "rgba(255,255,255,0.6)",
                boxShadow: userFilter === f ? "0 2px 8px rgba(124,92,255,0.3)" : "none",
              }}>
                {f === "all" ? "All" : f === "active" ? "Active (7d)" : "Inactive"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }} className="text-muted">Company</th>
                <th style={{ padding: "8px 10px", textAlign: "center" }} className="text-muted">Last Active</th>
                <th style={{ padding: "8px 10px", textAlign: "center" }} className="text-muted">Events (7d)</th>
                <th style={{ padding: "8px 10px", textAlign: "center" }} className="text-muted">Total</th>
                <th style={{ padding: "8px 10px", textAlign: "center" }} className="text-muted">Pages</th>
                <th style={{ padding: "8px 10px", textAlign: "center" }} className="text-muted">Tour</th>
                <th style={{ padding: "8px 10px", textAlign: "center" }} className="text-muted">Synced</th>
                <th style={{ padding: "8px 10px", textAlign: "center" }} className="text-muted">Exported</th>
                <th style={{ padding: "8px 6px", textAlign: "center" }} className="text-muted"></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.slice(0, 50).map(u => (
                <tr key={u.connection_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "10px 10px", fontWeight: 600 }} className="text-primary">{getCompanyName(u.connection_id, connections)}</td>
                  <td style={{ padding: "10px 10px", textAlign: "center" }} className="text-muted">{relativeTime(u.last_active)}</td>
                  <td style={{ padding: "10px 10px", textAlign: "center", fontWeight: 700 }} className="text-primary">{u.event_count_7d}</td>
                  <td style={{ padding: "10px 10px", textAlign: "center" }} className="text-muted">{u.total_events}</td>
                  <td style={{ padding: "10px 10px", textAlign: "center" }} className="text-muted">{u.page_views}</td>
                  <td style={{ padding: "10px 10px", textAlign: "center" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: `${tourBadgeColor(u.tour_status)}20`, color: tourBadgeColor(u.tour_status) }}>
                      {u.tour_status === "not_started" ? "none" : u.tour_status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 10px", textAlign: "center", color: u.has_synced ? "#10b981" : "rgba(255,255,255,0.15)", fontSize: 14 }}>{u.has_synced ? "\u2713" : "\u2014"}</td>
                  <td style={{ padding: "10px 10px", textAlign: "center", color: u.has_exported ? "#10b981" : "rgba(255,255,255,0.15)", fontSize: 14 }}>{u.has_exported ? "\u2713" : "\u2014"}</td>
                  <td style={{ padding: "10px 6px", textAlign: "center" }}>
                    <a href={`/jobber/dashboard?admin_connection_id=${u.connection_id}`} className="btn" style={{ padding: "4px 10px", fontSize: 10, textDecoration: "none" }}>View</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
