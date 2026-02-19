"use client";

import { useState, useMemo } from "react";
import { ResyncButton } from "./ResyncButton";
import { UserDetail } from "./UserDetail";
import type { ConnectionRow, UserAnalyticsSummary } from "./AdminTabs";

type SortKey = "company" | "status" | "jobs" | "quotes" | "leak" | "lastActive" | "engagement";
type SortDir = "asc" | "desc";

function formatRelative(d: string | null | undefined): string {
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

function formatCents(cents: number): string {
  if (cents >= 100000) return `$${(cents / 100000).toFixed(1)}k`;
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

function getTrialDaysLeft(c: ConnectionRow): number | null {
  if (c.billing_status !== "trialing") return null;
  const trialEnds = c.trial_ends_at ? new Date(c.trial_ends_at).getTime() : 0;
  return Math.ceil((trialEnds - Date.now()) / 86400000);
}

function engagementLevel(eventCount7d: number): { color: string; label: string } {
  if (eventCount7d >= 50) return { color: "#10b981", label: "High" };
  if (eventCount7d >= 15) return { color: "#f59e0b", label: "Medium" };
  if (eventCount7d >= 1) return { color: "#6b7280", label: "Low" };
  return { color: "#ef4444", label: "None" };
}

type Props = {
  connections: ConnectionRow[];
  userSummaries: UserAnalyticsSummary[];
};

export function UserTable({ connections, userSummaries }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("lastActive");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const summaryMap = useMemo(() => {
    const m: Record<string, UserAnalyticsSummary> = {};
    for (const s of userSummaries) m[s.connection_id] = s;
    return m;
  }, [userSummaries]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return connections.filter((c) => {
      const name = (c.jobber_account_name || c.company_name || "").toLowerCase();
      return name.includes(q);
    });
  }, [connections, search]);

  const sorted = useMemo(() => {
    const mult = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const sa = summaryMap[a.id];
      const sb = summaryMap[b.id];
      switch (sortKey) {
        case "company":
          return mult * (a.jobber_account_name || a.company_name || "").localeCompare(b.jobber_account_name || b.company_name || "");
        case "status":
          return mult * (a.billing_status || "").localeCompare(b.billing_status || "");
        case "jobs":
          return mult * ((a.job_count || 0) - (b.job_count || 0));
        case "quotes":
          return mult * ((a.quote_count || 0) - (b.quote_count || 0));
        case "leak":
          return mult * ((a.quote_leak_cents || 0) - (b.quote_leak_cents || 0));
        case "lastActive": {
          const ta = sa?.last_active ? new Date(sa.last_active).getTime() : 0;
          const tb = sb?.last_active ? new Date(sb.last_active).getTime() : 0;
          return mult * (ta - tb);
        }
        case "engagement":
          return mult * ((sa?.event_count_7d || 0) - (sb?.event_count_7d || 0));
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir, summaryMap]);

  const SortHeader = ({ label, sKey }: { label: string; sKey: SortKey }) => (
    <th
      onClick={() => handleSort(sKey)}
      style={{
        textAlign: "left",
        padding: "10px 12px",
        fontWeight: 600,
        fontSize: 10,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        whiteSpace: "nowrap",
        cursor: "pointer",
        userSelect: "none",
        color: sortKey === sKey ? "#5aa6ff" : "rgba(234,241,255,0.5)",
        transition: "color 0.15s",
      }}
    >
      {label} {sortKey === sKey ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div>
      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 360,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)",
            color: "#EAF1FF",
            fontSize: 13,
            outline: "none",
          }}
        />
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      <div className="table-container" style={{ margin: 0, padding: 0 }}>
        <table className="data-table" style={{ minWidth: 800 }}>
          <thead>
            <tr>
              <SortHeader label="Company" sKey="company" />
              <SortHeader label="Status" sKey="status" />
              <SortHeader label="Jobs" sKey="jobs" />
              <SortHeader label="Quotes" sKey="quotes" />
              <SortHeader label="Leak" sKey="leak" />
              <SortHeader label="Last Active" sKey="lastActive" />
              <SortHeader label="Engagement" sKey="engagement" />
              <th style={{
                textAlign: "left",
                padding: "10px 12px",
                fontWeight: 600,
                fontSize: 10,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(234,241,255,0.5)",
              }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((conn) => {
              const summary = summaryMap[conn.id];
              const daysLeft = getTrialDaysLeft(conn);
              const engagement = engagementLevel(summary?.event_count_7d || 0);
              const isExpanded = expandedId === conn.id;

              let badgeClass = "";
              let badgeText = conn.billing_status || "--";
              let badgeBg = "rgba(107,114,128,0.15)";
              let badgeColor = "#6b7280";

              if (conn.billing_status === "active") {
                badgeText = "ACTIVE";
                badgeBg = "rgba(16,185,129,0.15)";
                badgeColor = "#10b981";
              } else if (conn.billing_status === "trialing") {
                if (daysLeft !== null && daysLeft > 0) {
                  badgeText = `${daysLeft}d`;
                  badgeBg = "rgba(59,130,246,0.15)";
                  badgeColor = "#3b82f6";
                } else {
                  badgeText = "EXP";
                  badgeBg = "rgba(239,68,68,0.15)";
                  badgeColor = "#ef4444";
                }
              } else if (conn.billing_status === "canceled" || conn.canceled_at) {
                badgeText = "CANCEL";
              }

              return (
                <tr
                  key={conn.id}
                  onClick={() => setExpandedId(isExpanded ? null : conn.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ padding: "12px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#EAF1FF" }}>
                      {conn.jobber_account_name || conn.company_name || "Unknown"}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(234,241,255,0.4)", marginTop: 2 }}>
                      {conn.owner_name || "--"}
                    </div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      background: badgeBg,
                      color: badgeColor,
                    }}>
                      {badgeText}
                    </span>
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 600, color: "#EAF1FF" }}>
                    {conn.job_count || 0}
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 600, color: "#EAF1FF" }}>
                    {conn.quote_count || 0}
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 600, color: (conn.quote_leak_cents || 0) > 0 ? "#f59e0b" : "#EAF1FF" }}>
                    {formatCents(conn.quote_leak_cents || 0)}
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: "rgba(234,241,255,0.6)" }}>
                    {formatRelative(summary?.last_active)}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: engagement.color,
                        display: "inline-block",
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 11, color: engagement.color, fontWeight: 600 }}>
                        {engagement.label}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "12px" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <a
                        href={`/jobber/dashboard?admin_connection_id=${conn.id}`}
                        className="btn"
                        style={{ fontSize: 11, padding: "5px 10px" }}
                      >
                        View
                      </a>
                      <ResyncButton connectionId={conn.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expanded user detail (rendered outside the table for clean layout) */}
      {expandedId && (
        <div
          className="animate-in"
          style={{
            marginTop: 8,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            overflow: "hidden",
          }}
        >
          <UserDetail connectionId={expandedId} />
        </div>
      )}
    </div>
  );
}
