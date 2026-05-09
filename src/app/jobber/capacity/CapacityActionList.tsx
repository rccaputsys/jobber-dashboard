"use client";

import { useState, useMemo } from "react";
import { useIsLight } from "@/lib/hooks";
import { ExportCSV } from "../dashboard/ExportCSV";

type UnscheduledJob = {
  job_number: number;
  job_title: string;
  total_amount_cents: number;
  jobber_url: string;
  status: string;
  created_at: string | null;
};

type LateVisit = {
  title: string;
  job_number: number;
  start_at: string | null;
  days_late: number;
  amount_cents: number;
  jobber_url?: string;
};

type ApprovedQuote = {
  quote_number: string;
  quote_title: string;
  quote_total_cents: number;
  quote_url: string;
  updated_at_jobber: string | null;
};

type Bucket = {
  key: string;
  label: string;
  range: string;
  color: string;
  bg: string;
  jobs: UnscheduledJob[];
  totalCents: number;
};

function moneyFmt(cents: number, code: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `$${Math.round(cents / 100).toLocaleString()}`;
  }
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/* ---- Distribution bar ---- */
function DistributionBar({ buckets, total, money, isLight }: { buckets: Bucket[]; total: number; money: (c: number) => string; isLight: boolean }) {
  if (total === 0) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex", height: 22, borderRadius: 6, overflow: "visible", position: "relative",
        background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)",
      }}>
        {buckets.map((b) => {
          const w = total > 0 ? (b.totalCents / total) * 100 : 0;
          if (w === 0) return null;
          return (
            <div key={b.key} className="chart-bar-hover" style={{
              width: `${w}%`, minWidth: w > 0 ? 3 : 0,
              background: b.color, opacity: 0.85, transition: "width 0.3s ease",
              position: "relative",
            }}>
              <span className="chart-bar-tooltip" style={{
                position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                background: isLight ? "#1e293b" : "rgba(10,15,30,0.95)", color: "#fff",
                padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap",
                pointerEvents: "none", opacity: 0,
              }}>
                {b.label}: {b.jobs.length} &middot; {money(b.totalCents)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Collapsible grouped table ---- */
type SortKey = "age" | "amount" | "date";
type SortDir = "asc" | "desc";

function sortArrow(active: boolean, dir: SortDir) {
  if (!active) return <span style={{ opacity: 0.3, marginLeft: 3, fontSize: 10 }}>{"\u2195"}</span>;
  return <span style={{ marginLeft: 3, fontSize: 10 }}>{dir === "desc" ? "\u25BC" : "\u25B2"}</span>;
}

function sortJobs(jobs: UnscheduledJob[], key: SortKey, dir: SortDir): UnscheduledJob[] {
  return [...jobs].sort((a, b) => {
    let cmp = 0;
    if (key === "age") {
      const aT = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bT = b.created_at ? new Date(b.created_at).getTime() : 0;
      cmp = aT - bT;
    } else if (key === "amount") {
      cmp = a.total_amount_cents - b.total_amount_cents;
    } else {
      const aT = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bT = b.created_at ? new Date(b.created_at).getTime() : 0;
      cmp = aT - bT;
    }
    return dir === "desc" ? -cmp : cmp;
  });
}

function GroupedTable({ buckets, money, startCollapsed }: { buckets: Bucket[]; money: (c: number) => string; startCollapsed?: boolean }) {
  const nonEmpty = buckets.filter(b => b.jobs.length > 0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(
    startCollapsed ? Object.fromEntries(nonEmpty.map(b => [b.key, true])) : {}
  );
  const [sortKey, setSortKey] = useState<SortKey>("age");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th className="sortable" onClick={() => toggleSort("age")}>Job {sortArrow(sortKey === "age", sortDir)}</th>
            <th className="sortable" onClick={() => toggleSort("date")} style={{ textAlign: "center" }}>Created {sortArrow(sortKey === "date", sortDir)}</th>
            <th className="sortable" onClick={() => toggleSort("amount")} style={{ textAlign: "right" }}>Amount {sortArrow(sortKey === "amount", sortDir)}</th>
            <th style={{ textAlign: "center", width: 70 }}>Action</th>
          </tr>
        </thead>
        {nonEmpty.map((bucket) => {
          const sorted = sortJobs(bucket.jobs, sortKey, sortDir);
          return (
            <tbody key={bucket.key}>
              <tr
                onClick={() => setCollapsed(prev => ({ ...prev, [bucket.key]: !prev[bucket.key] }))}
                style={{ cursor: "pointer" }}
              >
                <td colSpan={4} style={{
                  padding: "10px 14px",
                  background: bucket.bg,
                  borderLeft: `3px solid ${bucket.color}`,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  userSelect: "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 18, height: 18, borderRadius: 4,
                        fontSize: 11, fontWeight: 700, color: bucket.color,
                        background: `${bucket.color}20`,
                        transition: "transform 0.2s ease",
                        transform: collapsed[bucket.key] ? "rotate(-90deg)" : "rotate(0deg)",
                      }}>&#9662;</span>
                      <span style={{ fontWeight: 800, fontSize: 14, color: bucket.color }}>{bucket.label}</span>
                      <span className="text-muted" style={{ fontSize: 12 }}>{bucket.range}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="text-muted" style={{ fontSize: 12, fontWeight: 600 }}>
                        {bucket.jobs.length} {bucket.jobs.length === 1 ? "job" : "jobs"}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: bucket.color }}>
                        {money(bucket.totalCents)}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
              {!collapsed[bucket.key] && sorted.map((j) => (
                <tr key={j.job_number}>
                  <td>
                    <div className="cell-primary" style={{ fontWeight: 600 }}>#{j.job_number}</div>
                    <div className="cell-secondary" style={{ fontSize: 11, marginTop: 2 }}>{j.job_title}</div>
                  </td>
                  <td className="cell-muted" style={{ whiteSpace: "nowrap", textAlign: "center" }}>{fmtDate(j.created_at)}</td>
                  <td className="cell-primary" style={{ fontWeight: 600, whiteSpace: "nowrap", textAlign: "right" }}>{money(j.total_amount_cents)}</td>
                  <td style={{ textAlign: "center" }}>
                    {j.jobber_url && (
                      <a href={j.jobber_url} target="_blank" rel="noreferrer" className="btn" style={{ padding: "4px 10px", fontSize: 11 }}>
                        View &rarr;
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

/* ---- Main component ---- */
export function CapacityActionList({
  unscheduledJobs,
  lateVisits = [],
  approvedQuotes = [],
  currencyCode,
}: {
  unscheduledJobs: UnscheduledJob[];
  lateVisits?: LateVisit[];
  approvedQuotes?: ApprovedQuote[];
  currencyCode: string;
}) {
  type TabKey = "unscheduled" | "late" | "approved";
  const [tab, setTab] = useState<TabKey>("unscheduled");
  const isLight = useIsLight();
  const money = useMemo(() => (cents: number) => moneyFmt(cents, currencyCode), [currencyCode]);

  const totalCents = unscheduledJobs.reduce((s, j) => s + j.total_amount_cents, 0);
  const approvedTotalCents = approvedQuotes.reduce((s, q) => s + Number(q.quote_total_cents ?? 0), 0);
  const activeTab: TabKey = tab;

  // Bucket unscheduled by AGE — matches the staleness split in the
  // top "Here's what needs your attention" panel.
  // Stale  = 60+ days old   (grey, archive candidate)
  // Aging  = 30-59 days old (orange, needs scheduling soon)
  // Recent = <30 days old   (blue, fresh)
  const nowMs = Date.now();
  const ageDays = (createdAt: string | null) => {
    if (!createdAt) return 0;
    return Math.max(0, (nowMs - new Date(createdAt).getTime()) / 86400000);
  };
  const buckets: Bucket[] = [
    { key: "recent", label: "Recent", range: "< 30 days old", color: "#5aa6ff", bg: "rgba(90,166,255,0.08)", jobs: [], totalCents: 0 },
    { key: "aging", label: "Aging", range: "30\u201359 days old", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", jobs: [], totalCents: 0 },
    { key: "stale", label: "Stale", range: "60+ days old \— archive if not needed", color: "#6b7280", bg: "rgba(107,114,128,0.08)", jobs: [], totalCents: 0 },
  ];
  for (const j of unscheduledJobs) {
    const days = ageDays(j.created_at);
    const bucket = days >= 60 ? buckets[2] : days >= 30 ? buckets[1] : buckets[0];
    bucket.totalCents += j.total_amount_cents;
    bucket.jobs.push(j);
  }

  // Bucket late visits by HOW LATE — matches the staleness split.
  // Stale     = 30+ days late (grey, archive candidate)
  // Very Late = 7-29 days late (red, needs a call)
  // Late      = 1-6 days late (orange, getting late)
  const lateBuckets: Bucket[] = [
    { key: "late", label: "Late", range: "1\u20136 days late", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", jobs: [], totalCents: 0 },
    { key: "very-late", label: "Very Late", range: "7\u201329 days late \— needs a call", color: "#ef4444", bg: "rgba(239,68,68,0.08)", jobs: [], totalCents: 0 },
    { key: "stale-late", label: "Stale", range: "30+ days late \— archive if not needed", color: "#6b7280", bg: "rgba(107,114,128,0.08)", jobs: [], totalCents: 0 },
  ];
  for (const v of lateVisits) {
    const bucket = v.days_late >= 30 ? lateBuckets[2] : v.days_late >= 7 ? lateBuckets[1] : lateBuckets[0];
    bucket.totalCents += v.amount_cents;
    bucket.jobs.push({
      job_number: v.job_number,
      job_title: v.title,
      total_amount_cents: v.amount_cents,
      jobber_url: v.jobber_url || "",
      status: "late",
      created_at: v.start_at,
    });
  }

  const lateTotalCents = lateBuckets.reduce((s, b) => s + b.totalCents, 0);

  type ToggleCard = { key: TabKey; label: string; count: number; color: string };
  const toggleCards: ToggleCard[] = [
    { key: "unscheduled", label: "Needs Scheduling", count: unscheduledJobs.length, color: "#5aa6ff" },
    { key: "late", label: "Running Late", count: lateVisits.length, color: "#ef4444" },
    { key: "approved", label: "Ready to Book", count: approvedQuotes.length, color: "#10b981" },
  ];

  return (
    <div className="panel animate-in delay-2" style={{ marginTop: 20, padding: 20 }}>
      {/* Toggle cards row (left-aligned, no header) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {toggleCards.map(card => {
            const active = activeTab === card.key;
            return (
              <button
                key={card.key}
                className="toggle-btn"
                onClick={() => setTab(card.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 18px", borderRadius: 12,
                  border: "none",
                  background: active
                    ? `linear-gradient(135deg, ${card.color}25, ${card.color}12)`
                    : (isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)"),
                  boxShadow: active
                    ? `0 0 0 2px ${card.color}, 0 4px 12px ${card.color}25`
                    : `inset 0 0 0 1px ${isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
                  cursor: "pointer", transition: "all 0.2s ease",
                  opacity: active ? 1 : 0.65,
                  transform: active ? "scale(1)" : "scale(0.97)",
                }}
              >
                <span style={{
                  width: 9, height: 9, borderRadius: "50%",
                  background: card.color, flexShrink: 0,
                  boxShadow: active ? `0 0 8px ${card.color}80` : "none",
                }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: isLight ? "#334155" : "rgba(255,255,255,0.85)" }}>
                  {card.label}
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: isLight ? "#1e293b" : "#EAF1FF" }}>
                  {card.count.toLocaleString()}
                </span>
                {card.count > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: isLight ? "#64748b" : "rgba(255,255,255,0.5)" }}>
                    {card.count === 1 ? "job" : "jobs"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {activeTab === "unscheduled" && unscheduledJobs.length > 0 && (
            <ExportCSV
              data={unscheduledJobs.map(j => {
                const days = j.created_at ? Math.max(0, (Date.now() - new Date(j.created_at).getTime()) / 86400000) : 0;
                return {
                  "Age Group": days >= 60 ? "Stale (60+ days)" : days >= 30 ? "Aging (30-59 days)" : "Recent (<30 days)",
                  "Days Old": Math.round(days),
                  "Job #": j.job_number,
                  "Title": j.job_title,
                  "Amount": (j.total_amount_cents / 100).toFixed(2),
                  "Created": j.created_at ? new Date(j.created_at).toLocaleDateString() : "",
                  "Jobber URL": j.jobber_url,
                };
              })}
              filename="unscheduled-jobs"
              label="Download"
            />
          )}
          {activeTab === "late" && lateVisits.length > 0 && (
            <ExportCSV
              data={lateVisits.map(v => ({
                "Job #": v.job_number,
                "Title": v.title,
                "Days Late": v.days_late,
                "Scheduled": v.start_at ? new Date(v.start_at).toLocaleDateString() : "",
                "Amount": (v.amount_cents / 100).toFixed(2),
              }))}
              filename="late-visits"
              label="Download"
            />
          )}
        </div>
      </div>

      {/* Unscheduled tab */}
      {activeTab === "unscheduled" && unscheduledJobs.length > 0 && (
        <>
          <DistributionBar buckets={buckets} total={totalCents} money={money} isLight={isLight} />
          <GroupedTable key="unscheduled" buckets={buckets} money={money} startCollapsed />
        </>
      )}
      {activeTab === "unscheduled" && unscheduledJobs.length === 0 && (
        <div className="text-muted" style={{ textAlign: "center", padding: 24, fontSize: 14 }}>
          Everything's on the calendar.
        </div>
      )}

      {/* Late tab */}
      {activeTab === "late" && lateVisits.length > 0 && (
        <>
          <DistributionBar buckets={lateBuckets} total={lateTotalCents} money={money} isLight={isLight} />
          <GroupedTable key="late" buckets={lateBuckets} money={money} startCollapsed />
        </>
      )}
      {activeTab === "late" && lateVisits.length === 0 && (
        <div className="text-muted" style={{ textAlign: "center", padding: 24, fontSize: 14 }}>
          Nothing's running late.
        </div>
      )}

      {/* Approved tab */}
      {activeTab === "approved" && approvedQuotes.length > 0 && (() => {
        const approvedBuckets: Bucket[] = [
          { key: "high", label: "Big Jobs ($1,000+)", range: "", color: "#10b981", bg: "rgba(16,185,129,0.08)", jobs: [], totalCents: 0 },
          { key: "medium", label: "Mid-Size Jobs ($250\u2013$999)", range: "", color: "#5aa6ff", bg: "rgba(90,166,255,0.08)", jobs: [], totalCents: 0 },
          { key: "low", label: "Smaller Jobs (Under $250)", range: "", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", jobs: [], totalCents: 0 },
        ];
        for (const q of approvedQuotes) {
          const dollars = Number(q.quote_total_cents ?? 0) / 100;
          const bucket = dollars >= 1000 ? approvedBuckets[0] : dollars >= 250 ? approvedBuckets[1] : approvedBuckets[2];
          bucket.totalCents += Number(q.quote_total_cents ?? 0);
          bucket.jobs.push({
            job_number: Number(q.quote_number) || 0,
            job_title: q.quote_title || `Quote #${q.quote_number}`,
            total_amount_cents: Number(q.quote_total_cents ?? 0),
            jobber_url: q.quote_url || "",
            status: "approved",
            created_at: q.updated_at_jobber,
          });
        }
        return (
          <>
            <DistributionBar buckets={approvedBuckets} total={approvedTotalCents} money={money} isLight={isLight} />
            <GroupedTable key="approved" buckets={approvedBuckets} money={money} startCollapsed />
          </>
        );
      })()}
      {activeTab === "approved" && approvedQuotes.length === 0 && (
        <div className="text-muted" style={{ textAlign: "center", padding: 24, fontSize: 14 }}>
          No approved quotes to book right now.
        </div>
      )}
    </div>
  );
}
