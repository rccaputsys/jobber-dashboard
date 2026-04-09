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

type DraftInvoice = {
  invoice_number: string;
  client_name: string;
  total_amount_cents: number;
  jobber_url: string;
  created_at: string | null;
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

/* ---- Distribution bar ---- */
function DistributionBar({ buckets, total, money, isLight }: { buckets: Bucket[]; total: number; money: (c: number) => string; isLight: boolean }) {
  if (total === 0) return null;
  const nonEmpty = buckets.filter(b => b.items.length > 0);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex", height: 22, borderRadius: 6, overflow: "visible", position: "relative",
        background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)",
      }}>
        {nonEmpty.map((b) => {
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
                {b.label}: {b.items.length} &middot; {money(b.totalCents)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Collapsible grouped table ---- */
type SortKey = "days" | "amount" | "date";
type SortDir = "asc" | "desc";

function GroupedTable({ buckets, headers, sortableColumns, headerStyles, money }: {
  buckets: Bucket[];
  headers: React.ReactNode[];
  sortableColumns?: { index: number; key: SortKey }[];
  headerStyles?: { textAlign?: string; width?: number | string }[];
  money: (c: number) => string;
}) {
  const nonEmpty = buckets.filter(b => b.items.length > 0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const b of buckets) init[b.key] = true;
    return init;
  });
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
                padding: "10px 14px", background: bucket.bg,
                borderLeft: `3px solid ${bucket.color}`,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                userSelect: "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 18, height: 18, borderRadius: 4, fontSize: 11, fontWeight: 700, color: bucket.color,
                      background: `${bucket.color}20`, transition: "transform 0.2s ease",
                      transform: collapsed[bucket.key] ? "rotate(-90deg)" : "rotate(0deg)",
                    }}>&#9662;</span>
                    <span style={{ fontWeight: 800, fontSize: 14, color: bucket.color }}>{bucket.label}</span>
                    <span className="text-muted" style={{ fontSize: 12 }}>{bucket.range}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="text-muted" style={{ fontSize: 12, fontWeight: 600 }}>
                      {bucket.items.length.toLocaleString()} {bucket.items.length === 1 ? "item" : "items"}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: bucket.color }}>
                      {money(bucket.totalCents)}
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
  type TabKey = "needs_invoicing" | "drafts" | "outstanding";
  const [tab, setTab] = useState<TabKey>("outstanding");
  const isLight = useIsLight();
  const money = useMemo(() => (cents: number) => moneyFmt(cents, currencyCode), [currencyCode]);

  const totalOutstanding = invoices.reduce((s, i) => s + i.balance_cents, 0);
  const totalNeedsInvoicing = needsInvoicing.reduce((s, j) => s + j.total_amount_cents, 0);
  const totalDrafts = drafts.reduce((s, d) => s + d.total_amount_cents, 0);
  const activeTab: TabKey = tab;

  const nowMs = Date.now();

  // Outstanding buckets by aging
  // Order: most actionable first → stale (write-off candidates) last.
  // Stale = 180+ days overdue. These are pulled out so they don't inflate
  // the "way overdue" panic number — they're effectively write-offs.
  const STALE_OVERDUE_DAYS = 180;
  const outstandingBuckets: Bucket[] = [
    { key: "30plus", label: "Way Overdue (30\u2013179 days)", range: "Call them today", color: "#ef4444", bg: "rgba(239,68,68,0.08)", items: [], totalCents: 0 },
    { key: "7to30", label: "Getting Late (8\u201330 days)", range: "Send a reminder", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", items: [], totalCents: 0 },
    { key: "1to7", label: "Just Past Due (1\u20137 days)", range: "Just came due", color: "#5aa6ff", bg: "rgba(90,166,255,0.08)", items: [], totalCents: 0 },
    { key: "current", label: "Not Due Yet", range: "On time", color: "#10b981", bg: "rgba(16,185,129,0.08)", items: [], totalCents: 0 },
    { key: "stale", label: "Stale (180+ days)", range: "Likely write-off \u2014 archive if not collectible", color: "#6b7280", bg: "rgba(107,114,128,0.08)", items: [], totalCents: 0 },
  ];
  for (const inv of invoices) {
    const b = inv.days_overdue >= STALE_OVERDUE_DAYS ? outstandingBuckets[4]
      : inv.days_overdue >= 30 ? outstandingBuckets[0]
      : inv.days_overdue >= 7 ? outstandingBuckets[1]
      : inv.days_overdue > 0 ? outstandingBuckets[2]
      : outstandingBuckets[3];
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

  // Needs invoicing buckets — by days since work completed
  const needsBuckets: Bucket[] = [
    { key: "30plus", label: "Way Overdue \u2014 Bill Now", range: "30+ days since work done", color: "#ef4444", bg: "rgba(239,68,68,0.08)", items: [], totalCents: 0 },
    { key: "7to30", label: "Send the Invoice Soon", range: "7\u201329 days since work done", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", items: [], totalCents: 0 },
    { key: "under7", label: "Recently Finished", range: "0\u20136 days since work done", color: "#10b981", bg: "rgba(16,185,129,0.08)", items: [], totalCents: 0 },
  ];
  for (const j of needsInvoicing) {
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
        <span key="completed" className="cell-muted" style={{ whiteSpace: "nowrap", textAlign: "center", display: "block" }}>{fmtDate(j.scheduled_at)}</span>,
        <span key="amt" className="cell-primary" style={{ fontWeight: 600, whiteSpace: "nowrap", textAlign: "right", display: "block" }}>{money(j.total_amount_cents)}</span>,
        j.jobber_url ? <a key="link" href={j.jobber_url} target="_blank" rel="noreferrer" className="btn" style={{ padding: "4px 10px", fontSize: 11 }}>View &rarr;</a> : <span key="link" />,
      ],
    });
  }

  // Draft buckets — by days sitting in draft
  const draftBuckets: Bucket[] = [
    { key: "30plus", label: "Sitting Too Long \u2014 Send Now", range: "30+ days in draft", color: "#ef4444", bg: "rgba(239,68,68,0.08)", items: [], totalCents: 0 },
    { key: "7to30", label: "Review and Send", range: "7\u201329 days in draft", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", items: [], totalCents: 0 },
    { key: "under7", label: "Just Created", range: "0\u20136 days in draft", color: "#10b981", bg: "rgba(16,185,129,0.08)", items: [], totalCents: 0 },
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

  // Active tab data
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
        { label: "Job", width: "35%" },
        { label: "Work Done", align: "center", width: "20%" },
        { label: "Amount", align: "right", width: "20%" },
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

  // Toggle cards — always show all 3
  type ToggleCard = { key: TabKey; label: string; count: number; dollars: string; color: string };
  const toggleCards: ToggleCard[] = [
    { key: "needs_invoicing", label: "Work Done, Not Billed", count: needsInvoicing.length, dollars: money(totalNeedsInvoicing), color: "#10b981" },
    { key: "drafts", label: "Draft Invoices", count: drafts.length, dollars: money(totalDrafts), color: "#6b7280" },
    { key: "outstanding", label: "Money Owed to You", count: invoices.length, dollars: money(totalOutstanding), color: "#ef4444" },
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
                  <span style={{ fontSize: 13, fontWeight: 700, color: card.color }}>
                    {card.dollars}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {exportData.length > 0 && (
            <ExportCSV data={exportData} filename={activeTab === "outstanding" ? "outstanding-invoices" : activeTab === "needs_invoicing" ? "needs-invoicing" : "draft-invoices"} label="Download" />
          )}
        </div>
      </div>

      {/* Content for active tab */}
      {activeCount > 0 ? (
        <>
          <DistributionBar buckets={activeBuckets} total={activeTotal} money={money} isLight={isLight} />
          <GroupedTable
            key={activeTab}
            buckets={activeBuckets}
            headers={activeHeaders}
            headerStyles={activeHeaderStyles}
            money={money}
            sortableColumns={
              activeTab === "outstanding"
                ? [{ index: 0, key: "days" as SortKey }, { index: 2, key: "amount" as SortKey }, { index: 3, key: "date" as SortKey }]
                : activeTab === "needs_invoicing"
                ? [{ index: 0, key: "days" as SortKey }, { index: 2, key: "amount" as SortKey }]
                : [{ index: 0, key: "days" as SortKey }, { index: 2, key: "amount" as SortKey }, { index: 3, key: "date" as SortKey }]
            }
          />
        </>
      ) : (
        <div className="text-muted" style={{ textAlign: "center", padding: 24, fontSize: 14 }}>
          {activeTab === "outstanding" && "Everyone's paid up."}
          {activeTab === "needs_invoicing" && "All your work has been billed."}
          {activeTab === "drafts" && "No unsent invoices."}
        </div>
      )}
    </div>
  );
}
