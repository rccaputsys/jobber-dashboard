"use client";

import { useState } from "react";
import { UserTable } from "./UserTable";
import { AdminAnalytics } from "./AdminAnalytics";

export type ConnectionRow = {
  id: string;
  jobber_account_name?: string | null;
  company_name?: string | null;
  owner_name?: string | null;
  billing_status?: string | null;
  trial_ends_at?: string | null;
  canceled_at?: string | null;
  created_at?: string | null;
  last_sync_at?: string | null;
  job_count?: number | null;
  quote_count?: number | null;
  quote_leak_count?: number | null;
  quote_leak_cents?: number | null;
  request_count?: number | null;
  unscheduled_job_count?: number | null;
  invoices_past_due_cents?: number | null;
};

export type UserAnalyticsSummary = {
  connection_id: string;
  last_active: string | null;
  event_count_7d: number;
  total_events: number;
  pages_visited: string[];
  tour_status: "not_started" | "started" | "completed" | "skipped";
  has_synced: boolean;
  has_exported: boolean;
  page_views: number;
};

export type AggregateAnalytics = {
  dau: number;
  wau: number;
  mau: number;
  featureUsage: { name: string; count: number }[];
  dailyActiveUsers: { date: string; count: number }[];
  dailyPageViews: { date: string; count: number }[];
  dailySessions: { date: string; count: number }[];
  onboardingFunnel: { tourStarted: number; tourCompleted: number; tourSkipped: number };
  chartEngagement: { chartName: string; totalViewMs: number; viewCount: number }[];
  rageClicks: number;
  errors: number;
  topPages: { page: string; count: number }[];
};

export type OverviewData = {
  totalUsers: number;
  activeSubscribers: number;
  mrr: number;
  trialing: number;
  expiredTrials: number;
  churned: number;
  engagementPct: number;
  trial15to11: number;
  trial10to6: number;
  trial5to3: number;
  trial2: number;
  trial1: number;
  dau: number;
  wau: number;
  mau: number;
  onboardingFunnel: { tourStarted: number; tourCompleted: number; tourSkipped: number };
};

type Props = {
  connections: ConnectionRow[];
  userSummaries: UserAnalyticsSummary[];
  aggregateAnalytics: AggregateAnalytics;
  overview: OverviewData;
};

export function AdminTabs({ connections, userSummaries, aggregateAnalytics, overview }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "analytics">("overview");

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "users" as const, label: "Users", count: connections.length },
    { id: "analytics" as const, label: "Analytics" },
  ];

  const {
    totalUsers, activeSubscribers, mrr,
    trialing, expiredTrials, churned, engagementPct,
    trial15to11, trial10to6, trial5to3, trial2, trial1,
    dau, wau, mau, onboardingFunnel,
  } = overview;

  const funnelMax = Math.max(onboardingFunnel.tourStarted, 1);

  return (
    <div>
      {/* Nav Tabs — matching dashboard nav-tabs style */}
      <div className="nav-tabs" style={{ marginBottom: 20, borderTop: "none", paddingLeft: 0 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                marginLeft: 6,
                padding: "2px 8px",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                background: activeTab === tab.id ? "rgba(124,92,255,0.2)" : "rgba(255,255,255,0.1)",
                color: activeTab === tab.id ? "#EAF1FF" : "rgba(255,255,255,0.6)",
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div>
          {/* Row 1: Primary KPI cards */}
          <div className="kpi-grid-primary animate-in" style={{ marginBottom: 16 }}>
            <div className="kpi-secondary hover-lift" style={{ borderLeft: "3px solid #7c5cff", minHeight: 100 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }} className="text-muted">
                Total Users
              </div>
              <div className="kpi-value-medium text-primary" style={{ marginTop: 4 }}>
                {totalUsers}
              </div>
            </div>
            <div className="kpi-secondary hover-lift" style={{ borderLeft: "3px solid #10b981", minHeight: 100 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }} className="text-muted">
                Active Subscribers
              </div>
              <div className="kpi-value-medium" style={{ color: "#10b981", marginTop: 4 }}>
                {activeSubscribers}
              </div>
            </div>
            <div className="kpi-secondary hover-lift" style={{ borderLeft: "3px solid #10b981", minHeight: 100 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }} className="text-muted">
                MRR
              </div>
              <div className="kpi-value-medium" style={{ color: "#10b981", marginTop: 4 }}>
                ${mrr}
              </div>
            </div>
          </div>

          {/* Row 2: Secondary KPI cards */}
          <div className="kpi-grid-secondary animate-in delay-1" style={{ marginBottom: 20 }}>
            <div className="kpi-secondary hover-lift">
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }} className="text-muted">
                Trialing
              </div>
              <div className="kpi-value-medium" style={{ color: "#3b82f6" }}>
                {trialing}
              </div>
            </div>
            <div className="kpi-secondary hover-lift">
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }} className="text-muted">
                Expired
              </div>
              <div className="kpi-value-medium" style={{ color: "#f59e0b" }}>
                {expiredTrials}
              </div>
            </div>
            <div className="kpi-secondary hover-lift">
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }} className="text-muted">
                Churned
              </div>
              <div className="kpi-value-medium" style={{ color: "#ef4444" }}>
                {churned}
              </div>
            </div>
            <div className="kpi-secondary hover-lift">
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }} className="text-muted">
                Engagement
              </div>
              <div className="kpi-value-medium" style={{ color: engagementPct >= 50 ? "#10b981" : engagementPct >= 20 ? "#f59e0b" : "#ef4444" }}>
                {engagementPct}%
              </div>
            </div>
          </div>

          {/* Row 3: Trial Countdown */}
          {trialing > 0 && (
            <div className="panel animate-in delay-2" style={{ marginBottom: 20, padding: 20 }}>
              <div className="text-primary" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                Trial Countdown
              </div>
              <div className="trial-grid">
                {[
                  { label: "15-11d", count: trial15to11, color: null },
                  { label: "10-6d", count: trial10to6, color: null },
                  { label: "5-3d", count: trial5to3, color: null },
                  { label: "2d", count: trial2, color: trial2 > 0 ? "#f59e0b" : null },
                  { label: "1d", count: trial1, color: trial1 > 0 ? "#ef4444" : null },
                ].map((bucket) => (
                  <div key={bucket.label} style={{
                    padding: "10px 6px",
                    borderRadius: 10,
                    background: bucket.color === "#f59e0b"
                      ? "rgba(245,158,11,0.1)"
                      : bucket.color === "#ef4444"
                      ? "rgba(239,68,68,0.1)"
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${
                      bucket.color === "#f59e0b"
                        ? "rgba(245,158,11,0.3)"
                        : bucket.color === "#ef4444"
                        ? "rgba(239,68,68,0.3)"
                        : "rgba(255,255,255,0.08)"
                    }`,
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: bucket.color || "rgba(234,241,255,0.5)" }}>
                      {bucket.label}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: bucket.color || "#EAF1FF" }}>
                      {bucket.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Row 4: Quick Activity Summary */}
          <div className="panel animate-in delay-3" style={{ marginBottom: 20, padding: 20 }}>
            <div className="text-primary" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
              Quick Activity Summary
            </div>

            {/* DAU / WAU / MAU row */}
            <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
              {[
                { label: "DAU", value: dau, color: "#5aa6ff" },
                { label: "WAU", value: wau, color: "#7c5cff" },
                { label: "MAU", value: mau, color: "#10b981" },
              ].map((m) => (
                <div key={m.label} className="kpi-secondary hover-lift" style={{ flex: 1, minWidth: 80 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }} className="text-muted">
                    {m.label}
                  </div>
                  <div className="kpi-value-medium" style={{ color: m.color }}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Onboarding funnel bar */}
            <div className="text-muted" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
              Onboarding Funnel
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 100 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span className="text-muted" style={{ fontSize: 11 }}>Started</span>
                  <span className="text-primary" style={{ fontSize: 12, fontWeight: 700 }}>{onboardingFunnel.tourStarted}</span>
                </div>
                <div style={{
                  height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.round((onboardingFunnel.tourStarted / funnelMax) * 100)}%`,
                    borderRadius: 4,
                    background: "linear-gradient(90deg, #7c5cff, #5aa6ff)",
                    transition: "width 0.4s ease",
                  }} />
                </div>
              </div>
              <span className="text-muted" style={{ fontSize: 16 }}>&rarr;</span>
              <div style={{ flex: 1, minWidth: 100 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span className="text-muted" style={{ fontSize: 11 }}>Completed</span>
                  <span className="text-primary" style={{ fontSize: 12, fontWeight: 700 }}>{onboardingFunnel.tourCompleted}</span>
                </div>
                <div style={{
                  height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.round((onboardingFunnel.tourCompleted / funnelMax) * 100)}%`,
                    borderRadius: 4,
                    background: "#10b981",
                    transition: "width 0.4s ease",
                  }} />
                </div>
              </div>
            </div>
            {onboardingFunnel.tourSkipped > 0 && (
              <div className="text-muted" style={{ fontSize: 11, marginTop: 8 }}>
                Skipped: {onboardingFunnel.tourSkipped}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <UserTable connections={connections} userSummaries={userSummaries} />
      )}

      {activeTab === "analytics" && (
        <AdminAnalytics analytics={aggregateAnalytics} userSummaries={userSummaries} connections={connections} />
      )}
    </div>
  );
}
