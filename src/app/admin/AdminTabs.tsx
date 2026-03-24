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

type Props = {
  connections: ConnectionRow[];
  userSummaries: UserAnalyticsSummary[];
  aggregateAnalytics: AggregateAnalytics;
};

export function AdminTabs({ connections, userSummaries, aggregateAnalytics }: Props) {
  const [activeTab, setActiveTab] = useState<"users" | "analytics">("users");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const tabs = [
    { id: "users" as const, label: "Users", count: connections.length },
    { id: "analytics" as const, label: "Analytics", count: null },
  ];

  return (
    <div>
      <div style={{
        display: "flex",
        gap: 4,
        padding: 4,
        background: "rgba(255,255,255,0.04)",
        borderRadius: 12,
        marginBottom: 20,
        maxWidth: 320,
      }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isHovered = hoveredTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                flex: 1,
                padding: "10px 16px",
                border: "none",
                borderRadius: 10,
                background: isActive
                  ? "linear-gradient(135deg, #7c5cff, #5aa6ff)"
                  : isHovered
                  ? "rgba(255,255,255,0.1)"
                  : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.8)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                boxShadow: isActive ? "0 4px 12px rgba(124,92,255,0.3)" : "none",
                transform: isHovered && !isActive ? "translateY(-1px)" : "none",
              }}
            >
              {tab.label}
              {tab.count !== null && (
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  background: isActive ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "users" ? (
        <UserTable connections={connections} userSummaries={userSummaries} />
      ) : (
        <AdminAnalytics analytics={aggregateAnalytics} userSummaries={userSummaries} connections={connections} />
      )}
    </div>
  );
}
