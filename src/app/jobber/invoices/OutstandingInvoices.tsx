"use client";

import { useState, useMemo } from "react";
import { useIsLight } from "@/lib/hooks";
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
  completedVisits?: number;
};

type BucketItem = { key: string; cells: React.ReactNode[]; sortDays: number; sortAmount: number; sortDate: number };

type Bucket = {
  key: string;
  label: string;
  range: string;
  color: string;
  bg: string;
  items: BucketItem[];
  totalCents: number;
};

function moneyFmt(cents: number, code: string): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100); }
  catch { return `$${Math.round(cents / 100).toLocaleString()}`; }
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ageColor(days: number): string {
  if (days >= 30) return "#ef4444";
  if (days >= 7) return "#f59e0b";
  if (days > 0) return "#5aa6ff";
  return "#10b981";
}

/* ---- Collapsible grouped table ---- */
type SortKey = "days" | "amount" | "date";
type SortDir = "asc" | "desc";

function GroupedTable({ buckets, headers, sortableColumns, headerStyles }: {
  buckets: Bucket[];
  headers: React.ReactNode[];
  sortableColumns?: { index: number; key: SortKey }[];
  headerStyles?: { textAlign?: string; width?: number | string }[];
}) {
  const nonEmpty = buckets.filter(b => b.items.length > 0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<SortKey>("days");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const colCount = headers.length;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function arrow(key: SortKey) {
    if (sortKey !== key) return <span style={{ opacity: 0.3, marginLeft: 3, fontSize: 10 }}>{"\u2195"}</span>;
    return <span style={{ marginLeft: 3, fontSize: 10 }}>{sortDir === "desc" ? "\u25BC" : "\u25B2"}</span>;
  }

  function sortItems(items: BucketItem[]) {
    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "days") cmp = a.sortDays - b.sortDays;
      else if (sortKey === "amount") cmp = a.sortAmount - b.sortAmount;
      else cmp = a.sortDate - b.sortDate;
      return sortDir === "desc" ? -cmp : cmp;
    });
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>{headers.map((h, i) => {
            const sc = sortableColumns?.find(s => s.index === i);
            const hs = headerStyles?.[i];
            const style: React.CSSProperties = {
              textAlign: (hs?.textAlign as any) || "left",
              width: hs?.width,
              verticalAlign: "middle",
            };
            if (sc) return <th key={i} className="sortable" onClick={() => toggleSort(sc.key)} style={style}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>{h}{arrow(sc.key)}</span>
            </th>;
            return <th key={i} style={style}>{h}</th>;
          })}</tr>
        </thead>
        {nonEmpty.map((bucket) => {
          const sorted = sortItems(bucket.items);
          return (
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
            {!collapsed[bucket.key] && sorted.map((item) => (
              <tr key={item.key}>{item.cells.map((c, i) => {
                const hs = headerStyles?.[i];
                return <td key={i} style={{ textAlign: (hs?.textAlign as any) || "left", verticalAlign: "middle" }}>{c}</td>;
              })}</tr>
            ))}
          </tbody>
          );
        })}
      </table>
    </div>
  );
}

/* ---- Main component ---- */
type DraftInvoice = {
  invoice_number: string;
  client_name: string;
  total_amount_cents: number;
  jobber_url: string;
  created_at: string | null;
};

export function OutstandingInvoices({
  invoices,
  needsInvoicing,
  drafts = [],
  currencyCode,
}: {
  invoices: OutstandingInvoice[];
  needsInvoicing: NeedsInvoicingJob[];
  drafts?: DraftInvoice[];
  currencyCode: string;
}) {
  const [tab, setTab] = useState<"outstanding" | "needs_invoicing" | "drafts">("outstanding");
  const isLight = useIsLight();
  const [hovered, setHovered] = useState<string | null>(null);
  const money = useMemo(() => (cents: number) => moneyFmt(cents, currencyCode), [currencyCode]);

  if (invoices.length === 0 && needsInvoicing.length === 0 && drafts.length === 0) return null;

  const hasOutstanding = invoices.length > 0;
  const hasNeedsInvoicing = needsInvoicing.length > 0;
  const hasDrafts = drafts.length > 0;
  const activeTab = tab === "outstanding" && !hasOutstanding
    ? (hasNeedsInvoicing ? "needs_invoicing" : hasDrafts ? "drafts" : "outstanding")
    : tab === "needs_invoicing" && !hasNeedsInvoicing
    ? (hasOutstanding ? "outstanding" : hasDrafts ? "drafts" : "outstanding")
    : tab === "drafts" && !hasDrafts
    ? "outstanding"
    : tab;

  const totalOutstanding = invoices.reduce((s, i) => s + i.balance_cents, 0);
  const totalNeedsInvoicing = needsInvoicing.reduce((s, j) => s + j.total_amount_cents, 0);
  const totalDrafts = drafts.reduce((s, d) => s + d.total_amount_cents, 0);

  // Outstanding buckets by aging
  const outstandingBuckets: Bucket[] = [
    { key: "30plus", label: "30+ Days Overdue", range: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.08)", items: [], totalCents: 0 },
    { key: "7to30", label: "8\u201330 Days Overdue", range: "Needs follow-up", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", items: [], totalCents: 0 },
    { key: "1to7", label: "1\u20137 Days Overdue", range: "Recently due", color: "#5aa6ff", bg: "rgba(90,166,255,0.08)", items: [], totalCents: 0 },
    { key: "current", label: "Not Yet Due", range: "Current", color: "#10b981", bg: "rgba(16,185,129,0.08)", items: [], totalCents: 0 },
  ];
  for (const inv of invoices) {
    const b = inv.days_overdue >= 30 ? outstandingBuckets[0] : inv.days_overdue >= 7 ? outstandingBuckets[1] : inv.days_overdue > 0 ? outstandingBuckets[2] : outstandingBuckets[3];
    b.totalCents += inv.balance_cents;
    b.items.push({
      key: inv.invoice_number,
      sortDays: inv.days_overdue,
      sortAmount: inv.balance_cents,
      sortDate: inv.due_at ? new Date(inv.due_at).getTime() : 0,
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
    { key: "7to30", label: "8\u201330 Days Waiting", range: "Send soon", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", items: [], totalCents: 0 },
    { key: "under7", label: "Under 7 Days", range: "Recent", color: "#10b981", bg: "rgba(16,185,129,0.08)", items: [], totalCents: 0 },
  ];
  for (const j of needsInvoicing) {
    // Use latest visit completion or scheduled date for "waiting" calculation
    const completedDate = j.scheduled_at ? new Date(j.scheduled_at).getTime() : 0;
    const daysWaiting = completedDate > 0 ? Math.max(0, Math.floor((nowMs - completedDate) / 86400000)) : 0;
    const b = daysWaiting >= 30 ? needsBuckets[0] : daysWaiting >= 7 ? needsBuckets[1] : needsBuckets[2];
    b.totalCents += j.total_amount_cents;
    const waitColor = daysWaiting >= 30 ? "#ef4444" : daysWaiting >= 7 ? "#f59e0b" : "#10b981";
    b.items.push({
      key: String(j.job_number),
      sortDays: daysWaiting,
      sortAmount: j.total_amount_cents,
      sortDate: completedDate,
      cells: [
        <span key="age" style={{ textAlign: "center", display: "block" }}><span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 700, color: waitColor, background: `${waitColor}18` }}>{daysWaiting}d</span></span>,
        <div key="name"><div className="cell-primary" style={{ fontWeight: 600 }}>#{j.job_number}{j.completedVisits ? <span className="text-muted" style={{ fontWeight: 500, fontSize: 11 }}> &bull; {j.completedVisits} visit{j.completedVisits !== 1 ? "s" : ""}</span> : null}</div><div className="cell-secondary" style={{ fontSize: 11, marginTop: 2 }}>{j.job_title}</div></div>,
        <span key="amt" className="cell-primary" style={{ fontWeight: 600, whiteSpace: "nowrap", textAlign: "right", display: "block" }}>{money(j.total_amount_cents)}</span>,
        j.jobber_url ? <a key="link" href={j.jobber_url} target="_blank" rel="noreferrer" className="btn" style={{ padding: "4px 10px", fontSize: 11 }}>View &rarr;</a> : <span key="link" />,
      ],
    });
  }

  // Draft invoices bucket (by age since created)
  const draftBuckets: Bucket[] = [
    { key: "30plus", label: "30+ Days in Draft", range: "Send now", color: "#ef4444", bg: "rgba(239,68,68,0.08)", items: [], totalCents: 0 },
    { key: "7to30", label: "8\u201330 Days in Draft", range: "Review & send", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", items: [], totalCents: 0 },
    { key: "under7", label: "Under 7 Days", range: "Recently created", color: "#10b981", bg: "rgba(16,185,129,0.08)", items: [], totalCents: 0 },
  ];
  for (const d of drafts) {
    const createdDate = d.created_at ? new Date(d.created_at).getTime() : 0;
    const daysInDraft = createdDate > 0 ? Math.max(0, Math.floor((nowMs - createdDate) / 86400000)) : 0;
    const b = daysInDraft >= 30 ? draftBuckets[0] : daysInDraft >= 7 ? draftBuckets[1] : draftBuckets[2];
    b.totalCents += d.total_amount_cents;
    const draftColor = daysInDraft >= 30 ? "#ef4444" : daysInDraft >= 7 ? "#f59e0b" : "#10b981";
    b.items.push({
      key: d.invoice_number,
      sortDays: daysInDraft,
      sortAmount: d.total_amount_cents,
      sortDate: createdDate,
      cells: [
        <span key="age" style={{ textAlign: "center", display: "block" }}><span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 700, color: draftColor, background: `${draftColor}18` }}>{daysInDraft}d</span></span>,
        <div key="name"><div className="cell-primary" style={{ fontWeight: 600 }}>#{d.invoice_number}</div><div className="cell-secondary" style={{ fontSize: 11, marginTop: 2 }}>{d.client_name}</div></div>,
        <span key="amt" className="cell-primary" style={{ fontWeight: 600, whiteSpace: "nowrap", textAlign: "right", display: "block" }}>{money(d.total_amount_cents)}</span>,
        <span key="date" className="cell-muted" style={{ whiteSpace: "nowrap", textAlign: "center", display: "block" }}>{fmtDate(d.created_at)}</span>,
        d.jobber_url ? <a key="link" href={d.jobber_url} target="_blank" rel="noreferrer" className="btn" style={{ padding: "4px 10px", fontSize: 11 }}>View &rarr;</a> : <span key="link" />,
      ],
    });
  }

  const activeBuckets = activeTab === "outstanding" ? outstandingBuckets : activeTab === "needs_invoicing" ? needsBuckets : draftBuckets;
  const activeTotal = activeTab === "outstanding" ? totalOutstanding : activeTab === "needs_invoicing" ? totalNeedsInvoicing : totalDrafts;
  const activeCount = activeTab === "outstanding" ? invoices.length : activeTab === "needs_invoicing" ? needsInvoicing.length : drafts.length;
  type HeaderDef = { label: string; align?: "center" | "right" | "left"; width?: number | string };
  const activeHeaderDefs: HeaderDef[] = activeTab === "outstanding"
    ? [
        { label: "Overdue", align: "center", width: 90 },
        { label: "Invoice", width: "30%" },
        { label: "Balance", align: "right", width: "20%" },
        { label: "Due Date", align: "center", width: "20%" },
        { label: "Action", align: "center", width: 80 },
      ]
    : activeTab === "needs_invoicing"
    ? [
        { label: "Waiting", align: "center", width: 90 },
        { label: "Job", width: "40%" },
        { label: "Amount", align: "right", width: "25%" },
        { label: "Action", align: "center", width: 80 },
      ]
    : [
        { label: "In Draft", align: "center", width: 90 },
        { label: "Invoice", width: "25%" },
        { label: "Amount", align: "right", width: "20%" },
        { label: "Created", align: "center", width: "20%" },
        { label: "Action", align: "center", width: 80 },
      ];
  const activeHeaders = activeHeaderDefs.map((h, i) => <span key={i}>{h.label}</span>);
  const activeHeaderStyles = activeHeaderDefs.map(h => ({ textAlign: h.align || "left" as const, width: h.width }));

  const titles: Record<string, string> = { outstanding: "Outstanding Invoices", needs_invoicing: "Needs Invoicing", drafts: "Draft Invoices" };
  const tooltips: Record<string, string> = {
    outstanding: "Unpaid invoices grouped by how overdue they are. Follow up on overdue invoices to improve cash flow.",
    needs_invoicing: "Completed jobs that haven't been invoiced yet. Send these invoices to get paid for work already done.",
    drafts: "Invoices created but never sent. Review and send these to start collecting.",
  };
  const subtitles: Record<string, string> = {
    outstanding: `${activeCount} ${activeCount === 1 ? "invoice" : "invoices"} totaling ${money(activeTotal)} outstanding`,
    needs_invoicing: `${activeCount} ${activeCount === 1 ? "job" : "jobs"} totaling ${money(activeTotal)} not yet invoiced`,
    drafts: `${activeCount} draft${activeCount !== 1 ? "s" : ""} totaling ${money(activeTotal)} not sent`,
  };

  // Export data
  const exportData = activeTab === "outstanding"
    ? invoices.map((i) => ({
        "Aging": i.days_overdue >= 30 ? "30+ Days" : i.days_overdue >= 7 ? "7-30 Days" : i.days_overdue > 0 ? "1-7 Days" : "Current",
        "Invoice #": i.invoice_number, "Client": i.client_name,
        "Amount": (i.total_amount_cents / 100).toFixed(2), "Balance": (i.balance_cents / 100).toFixed(2),
        "Due Date": i.due_at ? new Date(i.due_at).toLocaleDateString() : "", "Jobber URL": i.jobber_url,
      }))
    : activeTab === "needs_invoicing"
    ? needsInvoicing.map((j) => ({
        "Job #": j.job_number, "Title": j.job_title,
        "Amount": (j.total_amount_cents / 100).toFixed(2),
        "Completed": j.scheduled_at ? new Date(j.scheduled_at).toLocaleDateString() : "", "Jobber URL": j.jobber_url,
      }))
    : drafts.map((d) => ({
        "Invoice #": d.invoice_number, "Client": d.client_name,
        "Amount": (d.total_amount_cents / 100).toFixed(2),
        "Created": d.created_at ? new Date(d.created_at).toLocaleDateString() : "", "Jobber URL": d.jobber_url,
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
          <div style={pillGroup}>
            <button onClick={() => setTab("outstanding")} onMouseEnter={() => setHovered("out")} onMouseLeave={() => setHovered(null)} style={btnStyle(activeTab === "outstanding", hovered === "out")}>
              Outstanding ({invoices.length})
            </button>
            <button onClick={() => setTab("needs_invoicing")} onMouseEnter={() => setHovered("ni")} onMouseLeave={() => setHovered(null)} style={btnStyle(activeTab === "needs_invoicing", hovered === "ni")}>
              Needs Invoicing ({needsInvoicing.length})
            </button>
            <button onClick={() => setTab("drafts")} onMouseEnter={() => setHovered("dr")} onMouseLeave={() => setHovered(null)} style={btnStyle(activeTab === "drafts", hovered === "dr")}>
              Drafts ({drafts.length})
            </button>
          </div>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginTop: 10 }}>
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
      <GroupedTable
        buckets={activeBuckets}
        headers={activeHeaders}
        headerStyles={activeHeaderStyles}
        sortableColumns={
          activeTab === "outstanding"
            ? [{ index: 0, key: "days" as SortKey }, { index: 2, key: "amount" as SortKey }, { index: 3, key: "date" as SortKey }]
            : activeTab === "needs_invoicing"
            ? [{ index: 0, key: "days" as SortKey }, { index: 2, key: "amount" as SortKey }]
            : [{ index: 0, key: "days" as SortKey }, { index: 2, key: "amount" as SortKey }, { index: 3, key: "date" as SortKey }]
        }
      />
    </div>
  );
}
