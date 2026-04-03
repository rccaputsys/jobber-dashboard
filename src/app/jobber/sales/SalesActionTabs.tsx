"use client";

import { useState } from "react";
import { useIsLight } from "@/lib/hooks";
import { ExportCSV } from "../dashboard/ExportCSV";
import { QuotePipeline } from "./QuotePipeline";

type RequestItem = {
  title: string;
  client_name: string;
  source: string;
  jobber_url: string;
  created_at: string | null;
  days_old: number;
};

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ageColor(days: number): string {
  if (days >= 7) return "#ef4444";
  if (days >= 3) return "#f59e0b";
  return "#10b981";
}

function sourceLabel(s: string): string {
  if (s === "embedded_inline") return "Website";
  if (s === "internal") return "Internal";
  if (s === "facebook") return "Facebook";
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

type ChangeRequestedItem = {
  quote_number: string;
  quote_title: string;
  amount: string;
  amount_cents: number;
  updated_at: string | null;
  days_waiting: number;
  quote_url: string;
};

type Bucket = {
  key: string;
  label: string;
  range: string;
  color: string;
  bg: string;
  items: RequestItem[];
};

function RequestsContent({ buckets, isLight }: { buckets: Bucket[]; isLight: boolean }) {
  const nonEmpty = buckets.filter(b => b.items.length > 0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const b of buckets) init[b.key] = true;
    return init;
  });
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const PAGE_SIZE = 20;
  const total = buckets.reduce((s, b) => s + b.items.length, 0);

  return (
    <div>
      {/* Distribution bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{
          display: "flex", height: 22, borderRadius: 6, overflow: "visible",
          background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
          position: "relative",
        }}>
          {buckets.map((bucket) => {
            const widthPct = total > 0 ? (bucket.items.length / total) * 100 : 0;
            if (widthPct === 0) return null;
            return (
              <div key={bucket.key} className="chart-bar-hover"
                onClick={() => setCollapsed(prev => ({ ...prev, [bucket.key]: !prev[bucket.key] }))}
                style={{
                  width: `${widthPct}%`, minWidth: widthPct > 0 ? 2 : 0,
                  background: bucket.color, opacity: 0.85, transition: "width 0.3s ease",
                  position: "relative", cursor: "pointer",
                }}>
                <div className="chart-bar-tooltip" style={{
                  position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                  padding: "6px 10px", borderRadius: 6, whiteSpace: "nowrap",
                  background: "rgba(0,0,0,0.9)", color: "#fff", fontSize: 12, lineHeight: 1.5,
                  pointerEvents: "none", transition: "opacity 0.15s ease",
                  zIndex: 10, marginBottom: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}>
                  <div style={{ fontWeight: 700, color: bucket.color }}>{bucket.label}</div>
                  <div>{bucket.items.length.toLocaleString()} requests</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grouped table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ textAlign: "center", width: 80 }}>Days Old</th>
              <th>Request</th>
              <th style={{ textAlign: "center" }}>Source</th>
              <th style={{ textAlign: "center" }}>Received</th>
              <th style={{ textAlign: "center", width: 70 }}>Action</th>
            </tr>
          </thead>
          {nonEmpty.map((bucket) => (
            <tbody key={bucket.key}>
              <tr
                onClick={() => setCollapsed(prev => ({ ...prev, [bucket.key]: !prev[bucket.key] }))}
                style={{ cursor: "pointer" }}
              >
                <td colSpan={5} style={{
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
                    <span className="text-muted" style={{ fontSize: 13, fontWeight: 600 }}>
                      {bucket.items.length} {bucket.items.length === 1 ? "request" : "requests"}
                    </span>
                  </div>
                </td>
              </tr>
              {!collapsed[bucket.key] && (showAll[bucket.key] ? bucket.items : bucket.items.slice(0, PAGE_SIZE)).map((r, i) => (
                <tr key={i}>
                  <td style={{ textAlign: "center" }}>
                    <span style={{
                      padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 700,
                      color: ageColor(r.days_old),
                      background: `${ageColor(r.days_old)}18`,
                    }}>{r.days_old}d</span>
                  </td>
                  <td>
                    <div className="cell-primary" style={{ fontWeight: 600 }}>{r.title}</div>
                    <div className="cell-secondary" style={{ fontSize: 11, marginTop: 2 }}>{r.client_name}</div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className="text-muted" style={{
                      padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 600,
                      background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)",
                    }}>{sourceLabel(r.source)}</span>
                  </td>
                  <td className="cell-muted" style={{ textAlign: "center", whiteSpace: "nowrap" }}>{fmtDate(r.created_at)}</td>
                  <td style={{ textAlign: "center" }}>
                    {r.jobber_url && (
                      <a href={r.jobber_url} target="_blank" rel="noreferrer" className="btn" style={{ padding: "4px 10px", fontSize: 11 }}>
                        View &rarr;
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {!collapsed[bucket.key] && !showAll[bucket.key] && bucket.items.length > PAGE_SIZE && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "10px 16px" }}>
                    <button onClick={() => setShowAll(prev => ({ ...prev, [bucket.key]: true }))} style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 700, color: "#5aa6ff", padding: "6px 16px",
                    }}>
                      Show all {bucket.items.length.toLocaleString()}
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}

function ChangesRequestedContent({ items, isLight }: { items: ChangeRequestedItem[]; isLight: boolean }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ urgent: true, recent: true, new: true });
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const PAGE_SIZE = 20;

  // Bucket by wait time (sorted descending — oldest first)
  const buckets = [
    { key: "urgent", label: "Urgent", range: "7+ days waiting", color: "#ef4444", bg: "rgba(239,68,68,0.08)", items: [] as ChangeRequestedItem[] },
    { key: "aging", label: "Aging", range: "3\u20136 days waiting", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", items: [] as ChangeRequestedItem[] },
    { key: "recent", label: "Recent", range: "0\u20132 days waiting", color: "#10b981", bg: "rgba(16,185,129,0.08)", items: [] as ChangeRequestedItem[] },
  ];
  for (const item of items) {
    if (item.days_waiting >= 7) buckets[0].items.push(item);
    else if (item.days_waiting >= 3) buckets[1].items.push(item);
    else buckets[2].items.push(item);
  }
  // Sort each bucket descending by days_waiting
  for (const b of buckets) b.items.sort((a, b) => b.days_waiting - a.days_waiting);

  const total = items.length;
  const nonEmpty = buckets.filter(b => b.items.length > 0);

  return (
    <div>
      {/* Distribution bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{
          display: "flex", height: 22, borderRadius: 6, overflow: "visible",
          background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
          position: "relative",
        }}>
          {buckets.map((bucket) => {
            const widthPct = total > 0 ? (bucket.items.length / total) * 100 : 0;
            if (widthPct === 0) return null;
            return (
              <div key={bucket.key} className="chart-bar-hover"
                onClick={() => setCollapsed(prev => ({ ...prev, [bucket.key]: !prev[bucket.key] }))}
                style={{
                  width: `${widthPct}%`, minWidth: widthPct > 0 ? 2 : 0,
                  background: bucket.color, opacity: 0.85, transition: "width 0.3s ease",
                  position: "relative", cursor: "pointer",
                }}>
                <div className="chart-bar-tooltip" style={{
                  position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                  padding: "6px 10px", borderRadius: 6, whiteSpace: "nowrap",
                  background: "rgba(0,0,0,0.9)", color: "#fff", fontSize: 12, lineHeight: 1.5,
                  pointerEvents: "none", transition: "opacity 0.15s ease",
                  zIndex: 10, marginBottom: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}>
                  <div style={{ fontWeight: 700, color: bucket.color }}>{bucket.label}</div>
                  <div>{bucket.items.length.toLocaleString()} quotes</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ textAlign: "center", width: 80 }}>Waiting</th>
              <th>Quote</th>
              <th style={{ textAlign: "center" }}>Amount</th>
              <th style={{ textAlign: "center" }}>Last Updated</th>
              <th style={{ textAlign: "center", width: 70 }}>Action</th>
            </tr>
          </thead>
          {nonEmpty.map((bucket) => (
            <tbody key={bucket.key}>
              <tr
                onClick={() => setCollapsed(prev => ({ ...prev, [bucket.key]: !prev[bucket.key] }))}
                style={{ cursor: "pointer" }}
              >
                <td colSpan={5} style={{
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
                    <span className="text-muted" style={{ fontSize: 13, fontWeight: 600 }}>
                      {bucket.items.length} {bucket.items.length === 1 ? "quote" : "quotes"}
                    </span>
                  </div>
                </td>
              </tr>
              {!collapsed[bucket.key] && (showAll[bucket.key] ? bucket.items : bucket.items.slice(0, PAGE_SIZE)).map((item, i) => (
                <tr key={i}>
                  <td style={{ textAlign: "center" }}>
                    <span style={{
                      padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 700,
                      color: ageColor(item.days_waiting),
                      background: `${ageColor(item.days_waiting)}18`,
                    }}>{item.days_waiting}d</span>
                  </td>
                  <td>
                    <div className="cell-primary" style={{ fontWeight: 600 }}>
                      {item.quote_number ? `#${item.quote_number} \u2014 ` : ""}{item.quote_title}
                    </div>
                  </td>
                  <td className="cell-primary" style={{ textAlign: "center", fontWeight: 600 }}>{item.amount}</td>
                  <td className="cell-muted" style={{ textAlign: "center", whiteSpace: "nowrap" }}>{fmtDate(item.updated_at)}</td>
                  <td style={{ textAlign: "center" }}>
                    {item.quote_url && (
                      <a href={item.quote_url} target="_blank" rel="noreferrer" className="btn" style={{ padding: "4px 10px", fontSize: 11 }}>
                        View &rarr;
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {!collapsed[bucket.key] && !showAll[bucket.key] && bucket.items.length > PAGE_SIZE && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "10px 16px" }}>
                    <button onClick={() => setShowAll(prev => ({ ...prev, [bucket.key]: true }))} style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 700, color: "#5aa6ff", padding: "6px 16px",
                    }}>
                      Show all {bucket.items.length.toLocaleString()}
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}

type PipelineStage = { label: string; count: number; value: string };
type PipelineQuoteRow = { quote_number: string; quote_title: string; amount_cents: number; status: string; quote_url: string; sent_at: string | null; updated_at: string | null; days_quiet: number };

function PipelineQuoteList({ quotes, isLight }: { quotes: PipelineQuoteRow[]; isLight: boolean }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ high: true, medium: true, low: true });
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const PAGE_SIZE = 20;

  type ValueBucket = { key: string; label: string; range: string; color: string; bg: string; quotes: PipelineQuoteRow[]; totalCents: number };
  const buckets: ValueBucket[] = [
    { key: "high", label: "High Value", range: "$1,000+", color: "#10b981", bg: "rgba(16,185,129,0.08)", quotes: [], totalCents: 0 },
    { key: "medium", label: "Medium Value", range: "$250\u2013$999", color: "#5aa6ff", bg: "rgba(90,166,255,0.08)", quotes: [], totalCents: 0 },
    { key: "low", label: "Low Value", range: "Under $250", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", quotes: [], totalCents: 0 },
  ];
  for (const q of quotes) {
    const dollars = q.amount_cents / 100;
    const b = dollars >= 1000 ? buckets[0] : dollars >= 250 ? buckets[1] : buckets[2];
    b.totalCents += q.amount_cents;
    b.quotes.push(q);
  }
  for (const b of buckets) b.quotes.sort((a, c) => c.amount_cents - a.amount_cents);

  const total = quotes.reduce((s, q) => s + q.amount_cents, 0);
  const nonEmpty = buckets.filter(b => b.quotes.length > 0);
  const fmt = (c: number) => { try { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(c / 100); } catch { return `$${Math.round(c / 100).toLocaleString()}`; } };

  return (
    <div>
      {/* Distribution bar */}
      {total > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: "flex", height: 22, borderRadius: 6, overflow: "visible", position: "relative",
            background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)",
          }}>
            {nonEmpty.map(b => {
              const w = total > 0 ? (b.totalCents / total) * 100 : 0;
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
                    {b.label}: {b.quotes.length} &middot; {fmt(b.totalCents)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grouped table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Quote</th>
              <th style={{ textAlign: "center" }}>Sent</th>
              <th style={{ textAlign: "right" }}>Amount</th>
              <th style={{ textAlign: "center", width: 70 }}>Action</th>
            </tr>
          </thead>
          {nonEmpty.map(bucket => {
            const isCol = collapsed[bucket.key] ?? true;
            const displayed = showAll[bucket.key] ? bucket.quotes : bucket.quotes.slice(0, PAGE_SIZE);
            return (
              <tbody key={bucket.key}>
                <tr onClick={() => setCollapsed(prev => ({ ...prev, [bucket.key]: !isCol }))} style={{ cursor: "pointer" }}>
                  <td colSpan={4} style={{
                    padding: "10px 14px", background: bucket.bg, borderLeft: `3px solid ${bucket.color}`,
                    borderBottom: "1px solid rgba(255,255,255,0.06)", userSelect: "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 18, height: 18, borderRadius: 4, fontSize: 11, fontWeight: 700,
                          color: bucket.color, background: `${bucket.color}20`,
                          transform: isCol ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s ease",
                        }}>&#9662;</span>
                        <span style={{ fontWeight: 800, fontSize: 14, color: bucket.color }}>{bucket.label}</span>
                        <span className="text-muted" style={{ fontSize: 12 }}>{bucket.range}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span className="text-muted" style={{ fontSize: 12, fontWeight: 600 }}>{bucket.quotes.length.toLocaleString()} quotes</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: bucket.color }}>{fmt(bucket.totalCents)}</span>
                      </div>
                    </div>
                  </td>
                </tr>
                {!isCol && displayed.map((q, i) => (
                  <tr key={q.quote_number || i}>
                    <td>
                      <div className="cell-primary" style={{ fontWeight: 600 }}>#{q.quote_number}</div>
                      <div className="cell-secondary" style={{ fontSize: 11, marginTop: 2 }}>{q.quote_title}</div>
                    </td>
                    <td className="cell-muted" style={{ whiteSpace: "nowrap", textAlign: "center" }}>
                      {q.sent_at ? new Date(q.sent_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "\u2014"}
                    </td>
                    <td className="cell-primary" style={{ fontWeight: 600, whiteSpace: "nowrap", textAlign: "right" }}>
                      {fmt(q.amount_cents)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {q.quote_url && <a href={q.quote_url} target="_blank" rel="noreferrer" className="btn" style={{ padding: "4px 10px", fontSize: 11 }}>View &rarr;</a>}
                    </td>
                  </tr>
                ))}
                {!isCol && !showAll[bucket.key] && bucket.quotes.length > PAGE_SIZE && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "10px 16px" }}>
                      <button onClick={(e) => { e.stopPropagation(); setShowAll(prev => ({ ...prev, [bucket.key]: true })); }} style={{
                        background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#5aa6ff", padding: "6px 16px",
                      }}>Show all {bucket.quotes.length.toLocaleString()}</button>
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}

export function SalesActionTabs({
  requestCount,
  children,
  requests,
  quoteExportData,
  changesRequested,
  pipelineStages,
  pipelineQuotes,
}: {
  requestCount: number;
  children: React.ReactNode;
  requests: RequestItem[];
  quoteExportData: Record<string, unknown>[];
  changesRequested: ChangeRequestedItem[];
  pipelineStages?: PipelineStage[];
  pipelineQuotes?: Record<string, PipelineQuoteRow[]>;
}) {
  type TabKey = "requests" | "draft" | "awaiting" | "changes" | "approved";
  const [tab, setTab] = useState<TabKey>("awaiting");
  const [pipelineSelected, setPipelineSelected] = useState<string | null>(null);
  const isLight = useIsLight();

  // Bucket requests by age
  const requestBuckets: Bucket[] = [
    { key: "stale", label: "Stale", range: "7+ days old", color: "#ef4444", bg: "rgba(239,68,68,0.08)", items: [] },
    { key: "aging", label: "Aging", range: "3\u20136 days old", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", items: [] },
    { key: "new", label: "New", range: "0\u20132 days old", color: "#10b981", bg: "rgba(16,185,129,0.08)", items: [] },
  ];
  for (const r of requests) {
    if (r.days_old >= 7) requestBuckets[0].items.push(r);
    else if (r.days_old >= 3) requestBuckets[1].items.push(r);
    else requestBuckets[2].items.push(r);
  }
  // Sort each bucket descending by days old
  for (const b of requestBuckets) b.items.sort((a, b) => b.days_old - a.days_old);

  // Export data for changes requested
  const changesExportData = changesRequested.map((item) => ({
    "Days Waiting": item.days_waiting,
    "Quote #": item.quote_number,
    "Title": item.quote_title,
    "Amount": item.amount,
    "Last Updated": item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "",
    "Jobber URL": item.quote_url,
  }));

  // Export data for requests
  const requestExportData = requests.map((r) => ({
    "Age Group": r.days_old >= 7 ? "Stale" : r.days_old >= 3 ? "Aging" : "New",
    "Days Old": r.days_old,
    "Title": r.title,
    "Client": r.client_name,
    "Source": sourceLabel(r.source),
    "Received": r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
    "Jobber URL": r.jobber_url,
  }));

  const draftQuotes = pipelineQuotes?.["Draft"] || [];
  const awaitingQuotes = pipelineQuotes?.["Awaiting Response"] || [];
  const approvedQuotes = pipelineQuotes?.["Approved"] || [];

  type ToggleCard = { key: TabKey; label: string; count: number; color: string };
  const toggleCards: ToggleCard[] = [
    { key: "requests", label: "Requests", count: requestCount, color: "#5aa6ff" },
    { key: "draft", label: "Draft", count: draftQuotes.length, color: "#6b7280" },
    { key: "awaiting", label: "Awaiting Response", count: awaitingQuotes.length, color: "#f59e0b" },
    { key: "changes", label: "Changes Requested", count: changesRequested.length, color: "#ef4444" },
    { key: "approved", label: "Approved", count: approvedQuotes.length, color: "#10b981" },
  ];

  // Map between toggle card keys and pipeline labels
  const tabToPipeline: Record<string, string> = { requests: "Requests", draft: "Draft", awaiting: "Awaiting Response", changes: "Changes Requested", approved: "Approved" };
  const pipelineToTab: Record<string, TabKey> = {
    Requests: "requests", Draft: "draft", "Awaiting Response": "awaiting", "Changes Requested": "changes", Approved: "approved",
  };

  // Toggle card click → set tab + highlight pipeline
  function handleTabClick(key: TabKey) {
    setTab(key);
    setPipelineSelected(tabToPipeline[key] || null);
  }

  // Pipeline click → show that stage's quotes + sync tab
  function handlePipelineClick(label: string | null) {
    if (label === pipelineSelected) { setPipelineSelected(null); setTab("awaiting"); return; }
    setPipelineSelected(label);
    const mappedTab = label ? pipelineToTab[label] : undefined;
    if (mappedTab) setTab(mappedTab);
    else setTab("awaiting");
  }

  // No longer need separate pipeline-filtered view — all stages are tabs

  return (
    <div>
      {/* Pipeline */}
      {pipelineStages && (
        <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}` }}>
          <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px" }}>Quote Pipeline</h2>
          <QuotePipeline
            stages={pipelineStages}
            lostCount={0}
            lostValue=""
            selected={pipelineSelected}
            onSelect={handlePipelineClick}
          />
        </div>
      )}

      {/* Action list header with toggle cards — always visible */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Action List</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", overflow: "visible" }}>
            {toggleCards.map(card => {
              const active = tab === card.key;
              return (
                <button
                  key={card.key}
                  className="toggle-btn"
                  onClick={() => handleTabClick(card.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 14px", borderRadius: 10,
                    border: "none",
                    background: active
                      ? `linear-gradient(135deg, ${card.color}22, ${card.color}10)`
                      : (isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)"),
                    boxShadow: active
                      ? `0 0 0 1.5px ${card.color}, 0 2px 8px ${card.color}20`
                      : `inset 0 0 0 1px ${isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
                    cursor: "pointer", transition: "all 0.2s ease",
                    opacity: active ? 1 : 0.65,
                  }}
                >
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: card.color, flexShrink: 0,
                    boxShadow: active ? `0 0 6px ${card.color}60` : "none",
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: isLight ? "#334155" : "rgba(255,255,255,0.8)" }}>
                    {card.label}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: isLight ? "#1e293b" : "#EAF1FF" }}>
                    {card.count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {tab === "awaiting" && quoteExportData.length > 0 && (
              <ExportCSV data={quoteExportData} filename="quote-followup" label="Download" />
            )}
            {tab === "changes" && changesExportData.length > 0 && (
              <ExportCSV data={changesExportData} filename="changes-requested" label="Download" />
            )}
            {tab === "requests" && requestExportData.length > 0 && (
              <ExportCSV data={requestExportData} filename="open-requests" label="Download" />
            )}
          </div>
        </div>

      {/* Content */}
      <div style={{ minHeight: 200 }}>
        {tab === "awaiting" ? (
          <div>{children}</div>
        ) : tab === "changes" ? (
          <div>
            {changesRequested.length === 0 ? (
              <div className="text-muted" style={{ textAlign: "center", padding: 24, fontSize: 14 }}>
                No quotes with changes requested.
              </div>
            ) : (
              <ChangesRequestedContent items={changesRequested} isLight={isLight} />
            )}
          </div>
        ) : tab === "draft" ? (
          <div>
            {draftQuotes.length === 0 ? (
              <div className="text-muted" style={{ textAlign: "center", padding: 24, fontSize: 14 }}>
                No draft quotes.
              </div>
            ) : (
              <PipelineQuoteList quotes={draftQuotes} isLight={isLight} />
            )}
          </div>
        ) : tab === "approved" ? (
          <div>
            {approvedQuotes.length === 0 ? (
              <div className="text-muted" style={{ textAlign: "center", padding: 24, fontSize: 14 }}>
                No approved quotes.
              </div>
            ) : (
              <PipelineQuoteList quotes={approvedQuotes} isLight={isLight} />
            )}
          </div>
        ) : (
          <div>
            {requests.length === 0 ? (
              <div className="text-muted" style={{ textAlign: "center", padding: 24, fontSize: 14 }}>
                No open requests.
              </div>
            ) : (
              <RequestsContent buckets={requestBuckets} isLight={isLight} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
