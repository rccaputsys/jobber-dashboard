"use client";

import { useState, useMemo } from "react";

type FollowUpQuote = {
  quote_number: string;
  quote_title: string;
  sent_at: string | null;
  amount_cents: number;
  updated_at: string | null;
  days_quiet: number;
  status: string;
  quote_url: string;
};

type Bucket = {
  key: string;
  label: string;
  range: string;
  color: string;
  bg: string;
  quotes: FollowUpQuote[];
};

// Returns a color matching the bucket the quote belongs to
function ageColor(days: number): string {
  if (days > 45) return "#6b7280";   // Inactive — grey
  if (days > 30) return "#ef4444";   // Going Cold — red
  if (days > 14) return "#f59e0b";   // Warm — amber
  return "#10b981";                   // Hot — green
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function moneyFmt(cents: number, code: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: code, maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", maximumFractionDigits: 0,
    }).format(cents / 100);
  }
}

export function QuoteFollowUpTable({
  buckets,
  currencyCode,
}: {
  buckets: Bucket[];
  currencyCode: string;
}) {
  type SortKey = "days" | "amount" | "sent" | "activity";
  type SortDir = "asc" | "desc";

  const money = useMemo(() => (cents: number) => moneyFmt(cents, currencyCode), [currencyCode]);
  const nonEmpty = buckets.filter(b => b.quotes.length > 0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const b of buckets) init[b.key] = true;
    return init;
  });
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const PAGE_SIZE = 20;
  const [sortKey, setSortKey] = useState<SortKey>("days");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggle = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function arrow(key: SortKey) {
    if (sortKey !== key) return <span style={{ opacity: 0.3, marginLeft: 3, fontSize: 10 }}>{"\u2195"}</span>;
    return <span style={{ marginLeft: 3, fontSize: 10 }}>{sortDir === "desc" ? "\u25BC" : "\u25B2"}</span>;
  }

  function sortQuotes(quotes: FollowUpQuote[]) {
    return [...quotes].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "days") cmp = a.days_quiet - b.days_quiet;
      else if (sortKey === "amount") cmp = a.amount_cents - b.amount_cents;
      else if (sortKey === "sent") {
        const aT = a.sent_at ? new Date(a.sent_at).getTime() : 0;
        const bT = b.sent_at ? new Date(b.sent_at).getTime() : 0;
        cmp = aT - bT;
      } else {
        const aT = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bT = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        cmp = aT - bT;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }

  // Distribution bar
  const activeBkts = buckets.filter(b => b.key !== "inactive");
  const activeTotal = activeBkts.reduce((s, b) => s + b.quotes.length, 0);

  return (
    <div>
      {activeTotal > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", height: 22, borderRadius: 6, overflow: "visible", background: "rgba(255,255,255,0.04)", position: "relative" }}>
            {activeBkts.map(b => {
              const pct = (b.quotes.length / activeTotal) * 100;
              const bucketCents = b.quotes.reduce((s, q) => s + q.amount_cents, 0);
              if (pct === 0) return null;
              return (
                <div key={b.key} className="chart-bar-hover"
                  onClick={() => toggle(b.key)}
                  style={{ width: `${pct}%`, minWidth: 2, background: b.color, opacity: 0.85, transition: "width 0.3s ease", position: "relative", cursor: "pointer" }}>
                  <div className="chart-bar-tooltip" style={{
                    position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                    padding: "6px 10px", borderRadius: 6, whiteSpace: "nowrap",
                    background: "rgba(0,0,0,0.9)", color: "#fff", fontSize: 12, lineHeight: 1.5,
                    pointerEvents: "none", transition: "opacity 0.15s ease",
                    zIndex: 10, marginBottom: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  }}>
                    <div style={{ fontWeight: 700, color: b.color }}>{b.label}</div>
                    <div>{b.quotes.length.toLocaleString()} quotes &middot; {money(bucketCents)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th className="sortable" onClick={() => toggleSort("days")} style={{ textAlign: "center", width: 80 }}>Days Quiet {arrow("days")}</th>
            <th>Quote</th>
            <th className="sortable" onClick={() => toggleSort("sent")} style={{ textAlign: "center" }}>Sent {arrow("sent")}</th>
            <th className="sortable" onClick={() => toggleSort("amount")} style={{ textAlign: "right" }}>Amount {arrow("amount")}</th>
            <th style={{ textAlign: "center", width: 70 }}>Action</th>
          </tr>
        </thead>
        {nonEmpty.map((bucket) => {
          const isCollapsed = collapsed[bucket.key] ?? false;
          const bucketTotal = bucket.quotes.reduce((s, q) => s + q.amount_cents, 0);
          const sorted = sortQuotes(bucket.quotes);
          return (
            <tbody key={bucket.key}>
              <tr
                onClick={() => toggle(bucket.key)}
                style={{ cursor: "pointer" }}
              >
                <td colSpan={5} style={{
                  padding: "10px 16px",
                  background: bucket.bg,
                  borderLeft: `3px solid ${bucket.color}`,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  userSelect: "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: bucket.color,
                        background: `${bucket.color}20`,
                        transition: "transform 0.2s ease",
                        transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                      }}>
                        &#9662;
                      </span>
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: bucket.color, display: "inline-block",
                      }} />
                      <span style={{ fontWeight: 800, fontSize: 14, color: bucket.color }}>
                        {bucket.label}
                      </span>
                      <span className="text-muted" style={{ fontSize: 11 }}>
                        {bucket.range}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="text-muted" style={{ fontSize: 11, fontWeight: 600 }}>
                        {bucket.quotes.length} quotes
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: bucket.color }}>
                        {money(bucketTotal)}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
              {!isCollapsed && (showAll[bucket.key] ? sorted : sorted.slice(0, PAGE_SIZE)).map((q) => (
                <tr key={q.quote_number}>
                  <td style={{ textAlign: "center" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      color: ageColor(q.days_quiet),
                      background: `${ageColor(q.days_quiet)}18`,
                    }}>
                      {q.days_quiet}d
                    </span>
                  </td>
                  <td>
                    <div className="cell-primary" style={{ fontWeight: 600 }}>#{q.quote_number}</div>
                    <div className="cell-secondary" style={{ fontSize: 11, marginTop: 2 }}>{q.quote_title}</div>
                  </td>
                  <td className="cell-muted" style={{ whiteSpace: "nowrap", textAlign: "center" }}>
                    {fmtDate(q.sent_at)}
                  </td>
                  <td className="cell-primary" style={{ fontWeight: 600, whiteSpace: "nowrap", textAlign: "right" }}>
                    {money(q.amount_cents)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {q.quote_url && (
                      <a
                        href={q.quote_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn"
                        style={{ padding: "4px 10px", fontSize: 11 }}
                      >
                        View &rarr;
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {!isCollapsed && !showAll[bucket.key] && sorted.length > PAGE_SIZE && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "10px 16px" }}>
                    <button onClick={(e) => { e.stopPropagation(); setShowAll(prev => ({ ...prev, [bucket.key]: true })); }} style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 700, color: "#5aa6ff",
                      padding: "6px 16px",
                    }}>
                      Show all {sorted.length.toLocaleString()} quotes
                    </button>
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
