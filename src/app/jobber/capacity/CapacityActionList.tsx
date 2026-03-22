"use client";

import { useState, useMemo } from "react";
import { ExportCSV } from "../dashboard/ExportCSV";

type UnscheduledJob = {
  job_number: number;
  job_title: string;
  total_amount_cents: number;
  jobber_url: string;
  status: string;
  created_at: string | null;
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
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}

/* ---- Collapsible grouped table (mirrors QuoteFollowUpTable) ---- */
function GroupedTable({ buckets, money }: { buckets: Bucket[]; money: (c: number) => string }) {
  const nonEmpty = buckets.filter(b => b.jobs.length > 0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Job</th>
            <th style={{ textAlign: "center" }}>Created</th>
            <th style={{ textAlign: "right" }}>Amount</th>
            <th style={{ textAlign: "center", width: 70 }}>Action</th>
          </tr>
        </thead>
        {nonEmpty.map((bucket) => (
          <tbody key={bucket.key}>
            <tr
              onClick={() => setCollapsed(prev => ({ ...prev, [bucket.key]: !prev[bucket.key] }))}
              style={{ cursor: "pointer" }}
            >
              <td colSpan={4} style={{
                padding: "12px 16px",
                background: bucket.bg,
                borderLeft: `3px solid ${bucket.color}`,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                userSelect: "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 20, height: 20, borderRadius: 5,
                      fontSize: 12, fontWeight: 700, color: bucket.color,
                      background: `${bucket.color}20`,
                      transition: "transform 0.2s ease",
                      transform: collapsed[bucket.key] ? "rotate(-90deg)" : "rotate(0deg)",
                    }}>&#9662;</span>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: bucket.color }} />
                    <span style={{ fontWeight: 800, fontSize: 15, color: bucket.color }}>{bucket.label}</span>
                    <span className="text-muted" style={{ fontSize: 13 }}>{bucket.range}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span className="text-muted" style={{ fontSize: 13, fontWeight: 600 }}>
                      {bucket.jobs.length} {bucket.jobs.length === 1 ? "job" : "jobs"}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: bucket.color }}>
                      {money(bucket.totalCents)}
                    </span>
                  </div>
                </div>
              </td>
            </tr>
            {!collapsed[bucket.key] && bucket.jobs.map((j) => (
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
        ))}
      </table>
    </div>
  );
}

/* ---- Main component ---- */
export function CapacityActionList({
  unscheduledJobs,
  currencyCode,
}: {
  unscheduledJobs: UnscheduledJob[];
  currencyCode: string;
}) {
  const money = useMemo(() => (cents: number) => moneyFmt(cents, currencyCode), [currencyCode]);

  if (unscheduledJobs.length === 0) return null;

  const totalCents = unscheduledJobs.reduce((s, j) => s + j.total_amount_cents, 0);

  // Bucket by value
  const buckets: Bucket[] = [
    { key: "high", label: "High Value", range: "$1,000+", color: "#10b981", bg: "rgba(16,185,129,0.08)", jobs: [], totalCents: 0 },
    { key: "medium", label: "Medium Value", range: "$250\u2013$999", color: "#5aa6ff", bg: "rgba(90,166,255,0.08)", jobs: [], totalCents: 0 },
    { key: "low", label: "Low Value", range: "Under $250", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", jobs: [], totalCents: 0 },
  ];
  for (const j of unscheduledJobs) {
    const dollars = j.total_amount_cents / 100;
    const bucket = dollars >= 1000 ? buckets[0] : dollars >= 250 ? buckets[1] : buckets[2];
    bucket.totalCents += j.total_amount_cents;
    bucket.jobs.push(j);
  }

  return (
    <div className="panel animate-in delay-2" style={{ marginTop: 20, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              Unscheduled Jobs
            </h2>
            <span className="info-tooltip">?<span className="tooltip-text">Jobs without a scheduled date. Schedule these to fill your capacity gaps — sorted by value so you can prioritize the biggest opportunities first.</span></span>
          </div>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
            {unscheduledJobs.length} {unscheduledJobs.length === 1 ? "job" : "jobs"} totaling {money(totalCents)} not yet scheduled
          </p>
        </div>
        <ExportCSV
          data={unscheduledJobs.map(j => ({
            "Value Group": j.total_amount_cents >= 100000 ? "High Value" : j.total_amount_cents >= 25000 ? "Medium Value" : "Low Value",
            "Job #": j.job_number,
            "Title": j.job_title,
            "Amount": (j.total_amount_cents / 100).toFixed(2),
            "Created": j.created_at ? new Date(j.created_at).toLocaleDateString() : "",
            "Jobber URL": j.jobber_url,
          }))}
          filename="unscheduled-jobs"
          label="Export CSV"
        />
      </div>

      {/* Distribution bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: "flex", height: 32, borderRadius: 8, overflow: "hidden",
          background: "rgba(255,255,255,0.04)",
        }}>
          {buckets.map((bucket) => {
            const widthPct = totalCents > 0 ? (bucket.totalCents / totalCents) * 100 : 0;
            if (widthPct === 0) return null;
            return (
              <div
                key={bucket.key}
                style={{
                  width: `${widthPct}%`,
                  minWidth: widthPct > 0 ? 2 : 0,
                  background: bucket.color,
                  opacity: 0.85,
                  transition: "width 0.3s ease",
                }}
                title={`${bucket.label}: ${bucket.jobs.length} jobs — ${money(bucket.totalCents)}`}
              />
            );
          })}
        </div>

        {/* Bucket legend */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 10 }}>
          {buckets.map((bucket) => {
            const pctOfTotal = totalCents > 0 ? Math.round((bucket.totalCents / totalCents) * 100) : 0;
            return (
              <div key={bucket.key} style={{
                padding: "8px 10px", borderRadius: 8,
                background: bucket.jobs.length > 0 ? bucket.bg : "transparent",
                borderLeft: `3px solid ${bucket.jobs.length > 0 ? bucket.color : "rgba(255,255,255,0.06)"}`,
                opacity: bucket.jobs.length > 0 ? 1 : 0.4,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: bucket.color }}>{bucket.label}</span>
                  {bucket.jobs.length > 0 && <span className="text-muted" style={{ fontSize: 10 }}>{pctOfTotal}%</span>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: bucket.jobs.length > 0 ? bucket.color : "rgba(255,255,255,0.2)" }}>
                  {bucket.jobs.length > 0 ? money(bucket.totalCents) : "\u2014"}
                </div>
                <div className="text-muted" style={{ fontSize: 11, marginTop: 1 }}>
                  {bucket.jobs.length} {bucket.jobs.length === 1 ? "job" : "jobs"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collapsible grouped table */}
      <GroupedTable buckets={buckets} money={money} />
    </div>
  );
}
