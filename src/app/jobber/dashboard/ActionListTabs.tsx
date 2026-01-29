"use client";

import { useState } from "react";
import { ExportCSV } from "./ExportCSV";

/* --------------------------------- helpers --------------------------------- */
function safeDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function ageDays(ts: string | null): number {
  if (!ts) return 0;
  const d = safeDate(ts);
  if (!d) return 0;
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000));
}

function moneyFactory(currency: string, locale = "en-US") {
  const code = (currency || "USD").toUpperCase();
  const safeCode = code.length === 3 ? code : "USD";
  try {
    const fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: safeCode,
      currencyDisplay: "symbol",
      maximumFractionDigits: 0,
    });
    return (cents: number) => fmt.format((Number(cents || 0) as number) / 100);
  } catch {
    const fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      currencyDisplay: "symbol",
      maximumFractionDigits: 0,
    });
    return (cents: number) => fmt.format((Number(cents || 0) as number) / 100);
  }
}

/* --------------------------------- types --------------------------------- */
type AgedARInvoice = {
  invoice_number: string;
  client_name: string;
  amount_cents: number;
  days_overdue: number;
  due_date: string | null;
  jobber_url: string | null;
};

type UnscheduledJob = {
  job_number?: string;
  job_title?: string;
  created_at_jobber?: string;
  jobber_url?: string;
  total_amount_cents?: number;
};

type LeakingQuote = {
  quote_number?: string;
  quote_title?: string;
  quote_total_cents?: number;
  quote_url?: string;
  sent_at?: string;
};

type Props = {
  agedARInvoices: AgedARInvoice[];
  agedARExportData: Record<string, any>[];
  unscheduledRows: UnscheduledJob[];
  unscheduledExportData: Record<string, any>[];
  leakCandidates: LeakingQuote[];
  leakingQuotesExportData: Record<string, any>[];
  toggleUnscheduledHref: string;
  minDays: number;
  currencyCode: string;
};

const INITIAL_SHOW = 10;
const LOAD_MORE_COUNT = 10;

export function ActionListTabs({
  agedARInvoices,
  agedARExportData,
  unscheduledRows,
  unscheduledExportData,
  leakCandidates,
  leakingQuotesExportData,
  toggleUnscheduledHref,
  minDays,
  currencyCode,
}: Props) {
  const [activeTab, setActiveTab] = useState<"ar" | "unscheduled" | "quotes">("ar");
  const [arShowCount, setArShowCount] = useState(INITIAL_SHOW);
  const [unscheduledShowCount, setUnscheduledShowCount] = useState(INITIAL_SHOW);
  const [quotesShowCount, setQuotesShowCount] = useState(INITIAL_SHOW);

  // Create money formatter from currency code
  const money = moneyFactory(currencyCode);

  const tabs = [
    { id: "ar" as const, label: "Aged AR", count: agedARInvoices.length, icon: "💰" },
    { id: "unscheduled" as const, label: "Unscheduled", count: unscheduledRows.length, icon: "📦" },
    { id: "quotes" as const, label: "Leaking Quotes", count: leakCandidates.length, icon: "📋" },
  ];

  // Sorted data
  const sortedAR = [...agedARInvoices].sort((a, b) => b.days_overdue - a.days_overdue);
  const sortedQuotes = [...leakCandidates].sort((a, b) => new Date(a.sent_at ?? 0).getTime() - new Date(b.sent_at ?? 0).getTime());

  const ShowMoreButton = ({ 
    currentCount, 
    totalCount, 
    onShowMore 
  }: { 
    currentCount: number; 
    totalCount: number; 
    onShowMore: () => void;
  }) => {
    if (currentCount >= totalCount) return null;
    const remaining = totalCount - currentCount;

    return (
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button
          onClick={onShowMore}
          className="btn"
          style={{ padding: "10px 24px" }}
        >
          Show More ({remaining} remaining)
        </button>
      </div>
    );
  };

  return (
    <div>
      {/* Tabs */}
      <div className="action-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`action-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            <span className="badge">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "ar" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
            <div>
              <h3 className="text-primary" style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Aged Receivables (Past Due)</h3>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Oldest first</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {agedARInvoices.length > 0 && (
                <ExportCSV data={agedARExportData} filename="aged-ar" />
              )}
            </div>
          </div>

          {agedARInvoices.length === 0 ? (
            <div className="empty-state" style={{ padding: 24, textAlign: "center", fontSize: 13 }}>
              ✨ No past due invoices!
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 70 }}>Age</th>
                      <th>Invoice</th>
                      <th style={{ width: 100 }}>Due</th>
                      <th style={{ width: 100 }}>Amount</th>
                      <th style={{ width: 120 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAR.slice(0, arShowCount).map((inv, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className={`age-badge ${inv.days_overdue > 30 ? "critical" : inv.days_overdue > 15 ? "warning" : "good"}`}>
                            {inv.days_overdue}d
                          </span>
                        </td>
                        <td>
                          <div className="cell-primary">#{inv.invoice_number}</div>
                          {inv.client_name && (
                            <div className="cell-secondary" style={{ fontSize: 11, marginTop: 2 }}>{inv.client_name}</div>
                          )}
                        </td>
                        <td className="cell-muted">
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="cell-primary">{money(inv.amount_cents)}</td>
                        <td>
                          {inv.jobber_url ? (
                            <a href={inv.jobber_url} target="_blank" rel="noreferrer" className="btn">
                              Open →
                            </a>
                          ) : (
                            <span className="cell-secondary">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ShowMoreButton
                currentCount={arShowCount}
                totalCount={sortedAR.length}
                onShowMore={() => setArShowCount(prev => prev + LOAD_MORE_COUNT)}
              />
            </>
          )}
        </div>
      )}

      {activeTab === "unscheduled" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
            <div>
              <h3 className="text-primary" style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Unscheduled Jobs</h3>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Oldest first</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <a href={toggleUnscheduledHref} className="btn">
                {minDays >= 7 ? "Show all" : "7+ days only"}
              </a>
              {unscheduledRows.length > 0 && (
                <ExportCSV data={unscheduledExportData} filename="unscheduled-jobs" />
              )}
            </div>
          </div>

          {unscheduledRows.length === 0 ? (
            <div className="empty-state" style={{ padding: 24, textAlign: "center", fontSize: 13 }}>
              ✨ No unscheduled jobs!
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 70 }}>Age</th>
                      <th>Job</th>
                      <th style={{ width: 100 }}>Created</th>
                      <th style={{ width: 100 }}>Amount</th>
                      <th style={{ width: 120 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unscheduledRows.slice(0, unscheduledShowCount).map((r, idx) => {
                      const age = ageDays(r.created_at_jobber || null);
                      return (
                        <tr key={idx}>
                          <td>
                            <span className={`age-badge ${age > 14 ? "critical" : age > 7 ? "warning" : "good"}`}>
                              {age}d
                            </span>
                          </td>
                          <td>
                            <div className="cell-primary">
                              {r.job_number ? `#${r.job_number}` : "—"}
                            </div>
                            {r.job_title && (
                              <div className="cell-secondary" style={{ fontSize: 11, marginTop: 2 }}>{r.job_title}</div>
                            )}
                          </td>
                          <td className="cell-muted">
                            {r.created_at_jobber ? new Date(r.created_at_jobber).toLocaleDateString() : "—"}
                          </td>
                          <td className="cell-primary">
                            {r.total_amount_cents ? money(r.total_amount_cents) : "—"}
                          </td>
                          <td>
                            {r.jobber_url ? (
                              <a href={r.jobber_url} target="_blank" rel="noreferrer" className="btn">
                                Open →
                              </a>
                            ) : (
                              <span className="cell-secondary">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ShowMoreButton
                currentCount={unscheduledShowCount}
                totalCount={unscheduledRows.length}
                onShowMore={() => setUnscheduledShowCount(prev => prev + LOAD_MORE_COUNT)}
              />
            </>
          )}
        </div>
      )}

      {activeTab === "quotes" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
            <div>
              <h3 className="text-primary" style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Leaking Quotes</h3>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Oldest first</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {leakCandidates.length > 0 && (
                <ExportCSV data={leakingQuotesExportData} filename="leaking-quotes" />
              )}
            </div>
          </div>

          {leakCandidates.length === 0 ? (
            <div className="empty-state" style={{ padding: 24, textAlign: "center", fontSize: 13 }}>
              ✨ No leaking quotes!
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 70 }}>Age</th>
                      <th>Quote</th>
                      <th style={{ width: 100 }}>Sent</th>
                      <th style={{ width: 100 }}>Amount</th>
                      <th style={{ width: 120 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedQuotes.slice(0, quotesShowCount).map((q, idx) => {
                      const sent = safeDate(q.sent_at);
                      const age = sent ? Math.max(0, Math.round((Date.now() - sent.getTime()) / 86400000)) : 0;
                      return (
                        <tr key={idx}>
                          <td>
                            <span className={`age-badge ${age > 14 ? "critical" : age > 7 ? "warning" : "good"}`}>
                              {age}d
                            </span>
                          </td>
                          <td>
                            <div className="cell-primary">
                              {q.quote_number ? `#${q.quote_number}` : "—"}
                            </div>
                            {q.quote_title && (
                              <div className="cell-secondary" style={{ fontSize: 11, marginTop: 2 }}>{q.quote_title}</div>
                            )}
                          </td>
                          <td className="cell-muted">
                            {sent ? sent.toLocaleDateString() : "—"}
                          </td>
                          <td className="cell-primary">{money(Number(q.quote_total_cents ?? 0))}</td>
                          <td>
                            {q.quote_url ? (
                              <a href={q.quote_url} target="_blank" rel="noreferrer" className="btn">
                                Open →
                              </a>
                            ) : (
                              <span className="cell-secondary">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ShowMoreButton
                currentCount={quotesShowCount}
                totalCount={sortedQuotes.length}
                onShowMore={() => setQuotesShowCount(prev => prev + LOAD_MORE_COUNT)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
