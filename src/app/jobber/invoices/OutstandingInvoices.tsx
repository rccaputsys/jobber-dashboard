"use client";

import { useState, useEffect, useMemo } from "react";
import { ExportCSV } from "../dashboard/ExportCSV";

type OutstandingInvoice = {
  invoice_number: string;
  client_name: string;
  subject: string;
  status: string;
  total_amount_cents: number;
  balance_cents: number;
  due_at: string | null;
  jobber_url: string;
  days_overdue: number;
};

type NeedsInvoicingJob = {
  job_number: number;
  job_title: string;
  total_amount_cents: number;
  jobber_url: string;
  scheduled_at: string | null;
};

type Bucket = {
  key: string;
  label: string;
  range: string;
  color: string;
  bg: string;
  items: { key: string; cells: React.ReactNode[] }[];
  totalCents: number;
};

function moneyFmt(cents: number, code: string): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100); }
  catch { return `$${Math.round(cents / 100).toLocaleString()}`; }
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}

function ageColor(days: number): string {
  if (days >= 30) return "#ef4444";
  if (days >= 7) return "#f59e0b";
  if (days > 0) return "#5aa6ff";
  return "#10b981";
}

/* ---- Collapsible grouped table ---- */
function GroupedTable({ buckets, headers }: { buckets: Bucket[]; headers: React.ReactNode[] }) {
  const nonEmpty = buckets.filter(b => b.items.length > 0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const colCount = headers.length;

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        {nonEmpty.map((bucket) => (
          <tbody key={bucket.key}>
            <tr onClick={() => setCollapsed(prev => ({ ...prev, [bucket.key]: !prev[bucket.key] }))} style={{ cursor: "pointer" }}>
              <td colSpan={colCount} style={{
                padding: "12px 16px", background: bucket.bg,
                borderLeft: `3px solid ${bucket.color}`,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                userSelect: "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 20, height: 20, borderRadius: 5, fontSize: 12, fontWeight: 700, color: bucket.color,
                      background: `${bucket.color}20`, transition: "transform 0.2s ease",
                      transform: collapsed[bucket.key] ? "rotate(-90deg)" : "rotate(0deg)",
                    }}>&#9662;</span>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: bucket.color }} />
                    <span style={{ fontWeight: 800, fontSize: 15, color: bucket.color }}>{bucket.label}</span>
                    <span className="text-muted" style={{ fontSize: 13 }}>{bucket.range}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span className="text-muted" style={{ fontSize: 13, fontWeight: 600 }}>
                      {bucket.items.length} {bucket.items.length === 1 ? "item" : "items"}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: bucket.color }}>
                      {moneyFmt(bucket.totalCents, "USD")}
                    </span>
                  </div>
                </div>
              </td>
            </tr>
            {!collapsed[bucket.key] && bucket.items.map((item) => (
              <tr key={item.key}>{item.cells.map((c, i) => <td key={i}>{c}</td>)}</tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

/* ---- Main component ---- */
export function OutstandingInvoices({
  invoices,
  needsInvoicing,
  currencyCode,
}: {
  invoices: OutstandingInvoice[];
  needsInvoicing: NeedsInvoicingJob[];
  currencyCode: string;
}) {
  const [tab, setTab] = useState<"outstanding" | "needs_invoicing">("outstanding");
  const [isLight, setIsLight] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const money = useMemo(() => (cents: number) => moneyFmt(cents, currencyCode), [currencyCode]);

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  if (invoices.length === 0 && needsInvoicing.length === 0) return null;

  const hasOutstanding = invoices.length > 0;
  const hasNeedsInvoicing = needsInvoicing.length > 0;
  const activeTab = tab === "outstanding" && !hasOutstanding ? "needs_invoicing" : tab === "needs_invoicing" && !hasNeedsInvoicing ? "outstanding" : tab;

  const totalOutstanding = invoices.reduce((s, i) => s + i.balance_cents, 0);
  const totalNeedsInvoicing = needsInvoicing.reduce((s, j) => s + j.total_amount_cents, 0);

  // Outstanding buckets by aging
  const outstandingBuckets: Bucket[] = [
    { key: "30plus", label: "30+ Days Overdue", range: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.08)", items: [], totalCents: 0 },
    { key: "7to30", label: "7\u201330 Days Overdue", range: "Needs follow-up", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", items: [], totalCents: 0 },
    { key: "1to7", label: "1\u20137 Days Overdue", range: "Recently due", color: "#5aa6ff", bg: "rgba(90,166,255,0.08)", items: [], totalCents: 0 },
    { key: "current", label: "Not Yet Due", range: "Current", color: "#10b981", bg: "rgba(16,185,129,0.08)", items: [], totalCents: 0 },
  ];
  for (const inv of invoices) {
    const b = inv.days_overdue >= 30 ? outstandingBuckets[0] : inv.days_overdue >= 7 ? outstandingBuckets[1] : inv.days_overdue > 0 ? outstandingBuckets[2] : outstandingBuckets[3];
    b.totalCents += inv.balance_cents;
    b.items.push({
      key: inv.invoice_number,
      cells: [
        inv.days_overdue > 0
          ? <span key="age" style={{ textAlign: "center", display: "block" }}><span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 700, color: ageColor(inv.days_overdue), background: `${ageColor(inv.days_overdue)}18` }}>{inv.days_overdue}d</span></span>
          : <span key="age" className="text-muted" style={{ textAlign: "center", display: "block" }}>&mdash;</span>,
        <div key="name"><div className="cell-primary" style={{ fontWeight: 600 }}>#{inv.invoice_number}</div><div className="cell-secondary" style={{ fontSize: 11, marginTop: 2 }}>{inv.client_name}</div></div>,
        <span key="bal" className="cell-primary" style={{ fontWeight: 600, whiteSpace: "nowrap", textAlign: "right", display: "block" }}>{money(inv.balance_cents)}</span>,
        <span key="due" className="cell-muted" style={{ whiteSpace: "nowrap", textAlign: "center", display: "block" }}>{fmtDate(inv.due_at)}</span>,
        inv.jobber_url ? <a key="link" href={inv.jobber_url} target="_blank" rel="noreferrer" className="btn" style={{ padding: "4px 10px", fontSize: 11 }}>View &rarr;</a> : <span key="link" />,
      ],
    });
  }

  // Needs invoicing buckets by age (how long since job was completed)
  const nowMs = Date.now();
  const needsBuckets: Bucket[] = [
    { key: "30plus", label: "30+ Days Waiting", range: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.08)", items: [], totalCents: 0 },
    { key: "7to30", label: "7\u201330 Days Waiting", range: "Send soon", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", items: [], totalCents: 0 },
    { key: "under7", label: "Under 7 Days", range: "Recent", color: "#10b981", bg: "rgba(16,185,129,0.08)", items: [], totalCents: 0 },
  ];
  for (const j of needsInvoicing) {
    const completedDate = j.scheduled_at ? new Date(j.scheduled_at).getTime() : 0;
    const daysWaiting = completedDate > 0 ? Math.max(0, Math.floor((nowMs - completedDate) / 86400000)) : 999;
    const b = daysWaiting >= 30 ? needsBuckets[0] : daysWaiting >= 7 ? needsBuckets[1] : needsBuckets[2];
    b.totalCents += j.total_amount_cents;
    const waitColor = daysWaiting >= 30 ? "#ef4444" : daysWaiting >= 7 ? "#f59e0b" : "#10b981";
    b.items.push({
      key: String(j.job_number),
      cells: [
        <span key="age" style={{ textAlign: "center", display: "block" }}><span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 700, color: waitColor, background: `${waitColor}18` }}>{daysWaiting}d</span></span>,
        <div key="name"><div className="cell-primary" style={{ fontWeight: 600 }}>#{j.job_number}</div><div className="cell-secondary" style={{ fontSize: 11, marginTop: 2 }}>{j.job_title}</div></div>,
        <span key="amt" className="cell-primary" style={{ fontWeight: 600, whiteSpace: "nowrap", textAlign: "right", display: "block" }}>{money(j.total_amount_cents)}</span>,
        j.jobber_url ? <a key="link" href={j.jobber_url} target="_blank" rel="noreferrer" className="btn" style={{ padding: "4px 10px", fontSize: 11 }}>View &rarr;</a> : <span key="link" />,
      ],
    });
  }

  const activeBuckets = activeTab === "outstanding" ? outstandingBuckets : needsBuckets;
  const activeTotal = activeTab === "outstanding" ? totalOutstanding : totalNeedsInvoicing;
  const activeCount = activeTab === "outstanding" ? invoices.length : needsInvoicing.length;
  const activeHeaders = activeTab === "outstanding"
    ? [
        <span key="age" style={{ textAlign: "center", display: "block", width: 80 }}>Overdue</span>,
        <span key="inv">Invoice</span>,
        <span key="bal" style={{ textAlign: "right", display: "block" }}>Balance</span>,
        <span key="due" style={{ textAlign: "center", display: "block" }}>Due Date</span>,
        <span key="act" style={{ textAlign: "center", display: "block", width: 70 }}>Action</span>,
      ]
    : [
        <span key="age" style={{ textAlign: "center", display: "block", width: 80 }}>Waiting</span>,
        <span key="job">Job</span>,
        <span key="amt" style={{ textAlign: "right", display: "block" }}>Amount</span>,
        <span key="act" style={{ textAlign: "center", display: "block", width: 70 }}>Action</span>,
      ];

  const titles = { outstanding: "Outstanding Invoices", needs_invoicing: "Needs Invoicing" };
  const tooltips = {
    outstanding: "Unpaid invoices grouped by how overdue they are. Follow up on overdue invoices to improve cash flow.",
    needs_invoicing: "Completed jobs that haven't been invoiced yet. Send these invoices to get paid for work already done.",
  };
  const subtitles = {
    outstanding: `${activeCount} ${activeCount === 1 ? "invoice" : "invoices"} totaling ${money(activeTotal)} outstanding`,
    needs_invoicing: `${activeCount} ${activeCount === 1 ? "job" : "jobs"} totaling ${money(activeTotal)} not yet invoiced`,
  };

  // Export data
  const exportData = activeTab === "outstanding"
    ? invoices.map((i) => ({
        "Aging": i.days_overdue >= 30 ? "30+ Days" : i.days_overdue >= 7 ? "7-30 Days" : i.days_overdue > 0 ? "1-7 Days" : "Current",
        "Invoice #": i.invoice_number, "Client": i.client_name,
        "Amount": (i.total_amount_cents / 100).toFixed(2), "Balance": (i.balance_cents / 100).toFixed(2),
        "Due Date": i.due_at ? new Date(i.due_at).toLocaleDateString() : "", "Jobber URL": i.jobber_url,
      }))
    : needsInvoicing.map((j) => ({
        "Job #": j.job_number, "Title": j.job_title,
        "Amount": (j.total_amount_cents / 100).toFixed(2),
        "Completed": j.scheduled_at ? new Date(j.scheduled_at).toLocaleDateString() : "", "Jobber URL": j.jobber_url,
      }));

  const pillGroup: React.CSSProperties = { display: "flex", gap: 2, background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3 };
  const btnStyle = (active: boolean, h: boolean): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 8, border: "none",
    background: active ? "linear-gradient(135deg, #7c5cff, #5aa6ff)" : h ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)") : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
    boxShadow: active ? "0 4px 12px rgba(124,92,255,0.3)" : "none", whiteSpace: "nowrap",
  });

  return (
    <div className="panel animate-in delay-2" style={{ marginTop: 20, padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              {titles[activeTab]}
            </h2>
            <span className="info-tooltip">?<span className="tooltip-text">{tooltips[activeTab]}</span></span>
          </div>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
            {subtitles[activeTab]}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {exportData.length > 0 && (
            <ExportCSV data={exportData} filename={activeTab === "outstanding" ? "outstanding-invoices" : "needs-invoicing"} label="Export CSV" />
          )}
          {hasOutstanding && hasNeedsInvoicing && (
            <div style={pillGroup}>
              <button onClick={() => setTab("outstanding")} onMouseEnter={() => setHovered("out")} onMouseLeave={() => setHovered(null)} style={btnStyle(activeTab === "outstanding", hovered === "out")}>
                Outstanding ({invoices.length})
              </button>
              <button onClick={() => setTab("needs_invoicing")} onMouseEnter={() => setHovered("ni")} onMouseLeave={() => setHovered(null)} style={btnStyle(activeTab === "needs_invoicing", hovered === "ni")}>
                Needs Invoicing ({needsInvoicing.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Distribution bar */}
      {activeTotal > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", height: 32, borderRadius: 8, overflow: "hidden", background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)" }}>
            {activeBuckets.map((bucket) => {
              const widthPct = activeTotal > 0 ? (bucket.totalCents / activeTotal) * 100 : 0;
              if (widthPct === 0) return null;
              return (
                <div key={bucket.key} style={{ width: `${widthPct}%`, minWidth: 2, background: bucket.color, opacity: 0.85, transition: "width 0.3s ease" }}
                  title={`${bucket.label}: ${bucket.items.length} items — ${money(bucket.totalCents)}`} />
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${activeBuckets.length}, 1fr)`, gap: 8, marginTop: 10 }}>
            {activeBuckets.map((bucket) => {
              const pct = activeTotal > 0 ? Math.round((bucket.totalCents / activeTotal) * 100) : 0;
              return (
                <div key={bucket.key} style={{
                  padding: "8px 10px", borderRadius: 8,
                  background: bucket.items.length > 0 ? bucket.bg : "transparent",
                  borderLeft: `3px solid ${bucket.items.length > 0 ? bucket.color : "rgba(255,255,255,0.06)"}`,
                  opacity: bucket.items.length > 0 ? 1 : 0.4,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: bucket.color }}>{bucket.label}</span>
                    {bucket.items.length > 0 && <span className="text-muted" style={{ fontSize: 10 }}>{pct}%</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: bucket.items.length > 0 ? bucket.color : "rgba(255,255,255,0.2)" }}>
                    {bucket.items.length > 0 ? money(bucket.totalCents) : "\u2014"}
                  </div>
                  <div className="text-muted" style={{ fontSize: 11, marginTop: 1 }}>
                    {bucket.items.length} {bucket.items.length === 1 ? "item" : "items"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grouped table */}
      <GroupedTable buckets={activeBuckets} headers={activeHeaders} />
    </div>
  );
}
