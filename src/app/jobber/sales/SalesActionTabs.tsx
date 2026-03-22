"use client";

import { useState, useEffect } from "react";
import { ExportCSV } from "../dashboard/ExportCSV";

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
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const total = buckets.reduce((s, b) => s + b.items.length, 0);

  return (
    <div>
      {/* Distribution bar + legend (mirrors quotes) */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: "flex", height: 32, borderRadius: 8, overflow: "hidden",
          background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
        }}>
          {buckets.map((bucket) => {
            const widthPct = total > 0 ? (bucket.items.length / total) * 100 : 0;
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
                title={`${bucket.label}: ${bucket.items.length} requests`}
              />
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${buckets.length}, 1fr)`, gap: 8, marginTop: 10 }}>
          {buckets.map((bucket) => {
            const pctOfTotal = total > 0 ? Math.round((bucket.items.length / total) * 100) : 0;
            return (
              <div key={bucket.key} style={{
                padding: "8px 10px", borderRadius: 8,
                background: bucket.items.length > 0 ? bucket.bg : "transparent",
                borderLeft: `3px solid ${bucket.items.length > 0 ? bucket.color : "rgba(255,255,255,0.06)"}`,
                opacity: bucket.items.length > 0 ? 1 : 0.4,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: bucket.color }}>{bucket.label}</span>
                  {bucket.items.length > 0 && <span className="text-muted" style={{ fontSize: 10 }}>{pctOfTotal}%</span>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: bucket.items.length > 0 ? bucket.color : "rgba(255,255,255,0.2)" }}>
                  {bucket.items.length > 0 ? bucket.items.length : "\u2014"}
                </div>
                <div className="text-muted" style={{ fontSize: 11, marginTop: 1 }}>
                  {bucket.items.length === 1 ? "request" : "requests"}
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
              {!collapsed[bucket.key] && bucket.items.map((r, i) => (
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
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}

function ChangesRequestedContent({ items, isLight }: { items: ChangeRequestedItem[]; isLight: boolean }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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
      {/* Distribution bar + legend */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: "flex", height: 32, borderRadius: 8, overflow: "hidden",
          background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
        }}>
          {buckets.map((bucket) => {
            const widthPct = total > 0 ? (bucket.items.length / total) * 100 : 0;
            if (widthPct === 0) return null;
            return (
              <div key={bucket.key} style={{
                width: `${widthPct}%`, minWidth: widthPct > 0 ? 2 : 0,
                background: bucket.color, opacity: 0.85, transition: "width 0.3s ease",
              }} title={`${bucket.label}: ${bucket.items.length} quotes`} />
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${buckets.length}, 1fr)`, gap: 8, marginTop: 10 }}>
          {buckets.map((bucket) => {
            const pctOfTotal = total > 0 ? Math.round((bucket.items.length / total) * 100) : 0;
            return (
              <div key={bucket.key} style={{
                padding: "8px 10px", borderRadius: 8,
                background: bucket.items.length > 0 ? bucket.bg : "transparent",
                borderLeft: `3px solid ${bucket.items.length > 0 ? bucket.color : "rgba(255,255,255,0.06)"}`,
                opacity: bucket.items.length > 0 ? 1 : 0.4,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: bucket.color }}>{bucket.label}</span>
                  {bucket.items.length > 0 && <span className="text-muted" style={{ fontSize: 10 }}>{pctOfTotal}%</span>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: bucket.items.length > 0 ? bucket.color : "rgba(255,255,255,0.2)" }}>
                  {bucket.items.length > 0 ? bucket.items.length : "\u2014"}
                </div>
                <div className="text-muted" style={{ fontSize: 11, marginTop: 1 }}>
                  {bucket.items.length === 1 ? "quote" : "quotes"}
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
              {!collapsed[bucket.key] && bucket.items.map((item, i) => (
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
            </tbody>
          ))}
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
}: {
  requestCount: number;
  children: React.ReactNode;
  requests: RequestItem[];
  quoteExportData: Record<string, unknown>[];
  changesRequested: ChangeRequestedItem[];
}) {
  const [tab, setTab] = useState<"quotes" | "requests" | "changes">("quotes");
  const [isLight, setIsLight] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

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

  const pillGroup: React.CSSProperties = { display: "flex", gap: 2, background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3 };
  const btnStyle = (active: boolean, h: boolean): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 8, border: "none",
    background: active ? "linear-gradient(135deg, #7c5cff, #5aa6ff)" : h ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)") : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
    boxShadow: active ? "0 4px 12px rgba(124,92,255,0.3)" : "none", whiteSpace: "nowrap",
  });

  return (
    <div>
      {/* Header: title + tabs + export */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              {tab === "quotes" ? "Quote Follow-Up" : tab === "changes" ? "Changes Requested" : "Open Requests"}
            </h2>
            <span className="info-tooltip">?<span className="tooltip-text">{tab === "quotes" ? "Open quotes grouped by how long since last activity. Cold quotes need urgent attention." : tab === "changes" ? "Quotes where the client has requested changes. Revise and resend to keep the deal moving." : "New requests from clients that haven't been converted to quotes or jobs yet. Respond quickly to win the work."}</span></span>
          </div>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
            {tab === "quotes"
              ? "Open quotes grouped by age"
              : tab === "changes"
              ? `${changesRequested.length} ${changesRequested.length === 1 ? "quote" : "quotes"} needing revision`
              : `${requests.length} ${requests.length === 1 ? "request" : "requests"} awaiting action`}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {tab === "quotes" && quoteExportData.length > 0 && (
            <ExportCSV data={quoteExportData} filename="quote-followup" label="Export CSV" />
          )}
          {tab === "changes" && changesExportData.length > 0 && (
            <ExportCSV data={changesExportData} filename="changes-requested" label="Export CSV" />
          )}
          {tab === "requests" && requestExportData.length > 0 && (
            <ExportCSV data={requestExportData} filename="open-requests" label="Export CSV" />
          )}
          <div style={pillGroup}>
            <button
              onClick={() => setTab("quotes")}
              onMouseEnter={() => setHovered("quotes")}
              onMouseLeave={() => setHovered(null)}
              style={btnStyle(tab === "quotes", hovered === "quotes")}
            >
              Quote Follow-Up
            </button>
            <button
              onClick={() => setTab("changes")}
              onMouseEnter={() => setHovered("changes")}
              onMouseLeave={() => setHovered(null)}
              style={btnStyle(tab === "changes", hovered === "changes")}
            >
              Changes Req ({changesRequested.length})
            </button>
            <button
              onClick={() => setTab("requests")}
              onMouseEnter={() => setHovered("requests")}
              onMouseLeave={() => setHovered(null)}
              style={btnStyle(tab === "requests", hovered === "requests")}
            >
              Requests ({requestCount})
            </button>
          </div>
        </div>
      </div>

      {/* Content — minHeight prevents page jump when switching tabs */}
      <div style={{ minHeight: 320 }}>
        {tab === "quotes" ? (
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
