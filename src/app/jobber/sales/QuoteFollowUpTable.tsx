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
  if (days >= 30) return "#ef4444";  // Cold — red
  if (days >= 15) return "#f59e0b";  // Going Cold — amber
  if (days >= 8) return "#5aa6ff";   // Warm — blue
  return "#10b981";                   // Hot — green
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
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
  const money = useMemo(() => (cents: number) => moneyFmt(cents, currencyCode), [currencyCode]);
  const nonEmpty = buckets.filter(b => b.quotes.length > 0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ textAlign: "center", width: 80 }}>Days Quiet</th>
            <th>Quote</th>
            <th style={{ textAlign: "center" }}>Sent</th>
            <th style={{ textAlign: "right" }}>Amount</th>
            <th style={{ textAlign: "center" }}>Last Activity</th>
            <th style={{ textAlign: "center" }}>Status</th>
            <th style={{ textAlign: "center", width: 70 }}>Action</th>
          </tr>
        </thead>
        {nonEmpty.map((bucket) => {
          const isCollapsed = collapsed[bucket.key] ?? false;
          const bucketTotal = bucket.quotes.reduce((s, q) => s + q.amount_cents, 0);
          return (
            <tbody key={bucket.key}>
              <tr
                onClick={() => toggle(bucket.key)}
                style={{ cursor: "pointer" }}
              >
                <td colSpan={7} style={{
                  padding: "12px 16px",
                  background: bucket.bg,
                  borderLeft: `3px solid ${bucket.color}`,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  userSelect: "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 20,
                        height: 20,
                        borderRadius: 5,
                        fontSize: 12,
                        fontWeight: 700,
                        color: bucket.color,
                        background: `${bucket.color}20`,
                        transition: "transform 0.2s ease",
                        transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                      }}>
                        &#9662;
                      </span>
                      <span style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: bucket.color, display: "inline-block",
                      }} />
                      <span style={{ fontWeight: 800, fontSize: 15, color: bucket.color }}>
                        {bucket.label}
                      </span>
                      <span className="text-muted" style={{ fontSize: 13 }}>
                        {bucket.range}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span className="text-muted" style={{ fontSize: 13, fontWeight: 600 }}>
                        {bucket.quotes.length} {bucket.quotes.length === 1 ? "quote" : "quotes"}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: bucket.color }}>
                        {money(bucketTotal)}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
              {!isCollapsed && bucket.quotes.map((q) => (
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
                  <td className="cell-muted" style={{ whiteSpace: "nowrap", textAlign: "center" }}>
                    {fmtDate(q.updated_at)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      background: "rgba(90,166,255,0.15)",
                      color: "#5aa6ff",
                      textTransform: "capitalize",
                    }}>
                      {(q.status || "").replace(/_/g, " ").toLowerCase()}
                    </span>
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
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
