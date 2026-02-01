"use client";

import { useState, useEffect } from "react";
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

// Check if user is on mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  
  return isMobile;
}

/* --------------------------------- types --------------------------------- */
type AgedARInvoice = {
  invoice_number: string;
  client_name: string;
  amount_cents: number;
  days_overdue: number;
  due_date: string | null | undefined;
  jobber_url: string | null | undefined;
};

type UnscheduledJob = {
  job_number?: string;
  job_title?: string;
  created_at_jobber?: string;
  jobber_url?: string | null;
  total_amount_cents?: number;
};

type LeakingQuote = {
  quote_number?: string;
  quote_title?: string;
  quote_total_cents?: number;
  quote_url?: string | null;
  sent_at?: string;
};

type Props = {
  agedARInvoices: AgedARInvoice[];
  agedARExportData: Record<string, any>[];
  unscheduledRows: UnscheduledJob[];
  unscheduledExportData: Record<string, any>[];
  leakCandidates: LeakingQuote[];
  leakingQuotesExportData: Record<string, any>[];
  currencyCode: string;
};

const INITIAL_SHOW = 10;
const LOAD_MORE_COUNT = 10;

// Smart link component that tries Jobber app first on mobile
function JobberLink({ url, children, isMobile }: { url: string | null | undefined; children: React.ReactNode; isMobile: boolean }) {
  if (!url) return <span className="cell-secondary">—</span>;
  
  const handleClick = (e: React.MouseEvent) => {
    if (isMobile) {
      // Try to open Jobber app - if it fails, the web link will work as fallback
      // Jobber's app uses universal links, so https://app.getjobber.com links may open the app
      // We'll just use the regular link which should work with iOS/Android universal links
    }
  };
  
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noreferrer" 
      className="btn"
      onClick={handleClick}
      style={{ 
        padding: "6px 12px", 
        fontSize: 13,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </a>
  );
}

export function ActionListTabs({
  agedARInvoices,
  agedARExportData,
  unscheduledRows,
  unscheduledExportData,
  leakCandidates,
  leakingQuotesExportData,
  currencyCode,
}: Props) {
  const [activeTab, setActiveTab] = useState<"ar" | "unscheduled" | "quotes">("ar");
  const [arShowCount, setArShowCount] = useState(INITIAL_SHOW);
  const [unscheduledShowCount, setUnscheduledShowCount] = useState(INITIAL_SHOW);
  const [quotesShowCount, setQuotesShowCount] = useState(INITIAL_SHOW);
  const isMobile = useIsMobile();

  const money = moneyFactory(currencyCode);

  const tabs = [
    { id: "ar" as const, label: "Aged AR", count: agedARInvoices.length, icon: "💰" },
    { id: "unscheduled" as const, label: "Unscheduled", count: unscheduledRows.length, icon: "📦" },
    { id: "quotes" as const, label: "Leaking Quotes", count: leakCandidates.length, icon: "📋" },
  ];

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
      <div style={{ textAlign: "center", marginTop: 12 }}>
        <button
          onClick={onShowMore}
          className="btn"
          style={{ padding: "8px 20px", fontSize: 13 }}
        >
          Show More ({remaining} remaining)
        </button>
      </div>
    );
  };

  // Mobile card view for each item
  const MobileCard = ({ 
    age, 
    title, 
    subtitle, 
    date, 
    amount, 
    url,
    ageThresholds = [30, 15],
  }: { 
    age: number;
    title: string;
    subtitle?: string;
    date?: string;
    amount?: string;
    url?: string | null;
    ageThresholds?: [number, number];
  }) => (
    <div style={{
      padding: 14,
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      <span className={`age-badge ${age > ageThresholds[0] ? "critical" : age > ageThresholds[1] ? "warning" : "good"}`}>
        {age}d
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="cell-primary" style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </div>
        {subtitle && (
          <div className="cell-secondary" style={{ fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {subtitle}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 12 }}>
          {date && <span className="cell-muted">{date}</span>}
          {amount && <span className="cell-primary" style={{ fontWeight: 600 }}>{amount}</span>}
        </div>
      </div>
      <JobberLink url={url} isMobile={isMobile}>Open</JobberLink>
    </div>
  );

  return (
    <div>
      {/* Tabs */}
      <div className="action-tabs" style={{ overflowX: "auto", margin: "0 -16px", padding: "0 16px" }}>
        <div style={{ display: "flex", minWidth: "fit-content" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`action-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ whiteSpace: "nowrap" }}
            >
              <span>{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              <span className="badge">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "ar" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <div>
              <h3 className="text-primary" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Aged Receivables</h3>
              <p className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>Oldest first</p>
            </div>
            {agedARInvoices.length > 0 && (
              <ExportCSV data={agedARExportData} filename="aged-ar" />
            )}
          </div>

          {agedARInvoices.length === 0 ? (
            <div className="empty-state" style={{ padding: 24, textAlign: "center", fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
              No past due invoices!
            </div>
          ) : isMobile ? (
            // Mobile card view
            <div style={{ margin: "0 -16px" }}>
              {sortedAR.slice(0, arShowCount).map((inv, idx) => (
                <MobileCard
                  key={idx}
                  age={inv.days_overdue}
                  title={`#${inv.invoice_number}`}
                  subtitle={inv.client_name}
                  date={inv.due_date ? new Date(inv.due_date).toLocaleDateString() : undefined}
                  amount={money(inv.amount_cents)}
                  url={inv.jobber_url}
                />
              ))}
            </div>
          ) : (
            // Desktop table view
            <div className="table-container">
              <table className="data-table" style={{ fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ width: 60, padding: "8px 10px" }}>Age</th>
                    <th style={{ padding: "8px 10px" }}>Invoice</th>
                    <th style={{ width: 100, padding: "8px 10px" }}>Due</th>
                    <th style={{ width: 100, padding: "8px 10px" }}>Amount</th>
                    <th style={{ width: 90, padding: "8px 10px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAR.slice(0, arShowCount).map((inv, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: "10px" }}>
                        <span className={`age-badge ${inv.days_overdue > 30 ? "critical" : inv.days_overdue > 15 ? "warning" : "good"}`}>
                          {inv.days_overdue}d
                        </span>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <div className="cell-primary" style={{ fontSize: 14, fontWeight: 600 }}>#{inv.invoice_number}</div>
                        {inv.client_name && (
                          <div className="cell-secondary" style={{ fontSize: 13, marginTop: 1 }}>{inv.client_name}</div>
                        )}
                      </td>
                      <td className="cell-muted" style={{ padding: "10px", fontSize: 13 }}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="cell-primary" style={{ padding: "10px", fontSize: 14, fontWeight: 600 }}>{money(inv.amount_cents)}</td>
                      <td style={{ padding: "10px" }}>
                        <JobberLink url={inv.jobber_url} isMobile={isMobile}>Open →</JobberLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ShowMoreButton
            currentCount={arShowCount}
            totalCount={sortedAR.length}
            onShowMore={() => setArShowCount(prev => prev + LOAD_MORE_COUNT)}
          />
        </div>
      )}

      {activeTab === "unscheduled" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <div>
              <h3 className="text-primary" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Unscheduled Jobs</h3>
              <p className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>Oldest first</p>
            </div>
            {unscheduledRows.length > 0 && (
              <ExportCSV data={unscheduledExportData} filename="unscheduled-jobs" />
            )}
          </div>

          {unscheduledRows.length === 0 ? (
            <div className="empty-state" style={{ padding: 24, textAlign: "center", fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
              No unscheduled jobs!
            </div>
          ) : isMobile ? (
            <div style={{ margin: "0 -16px" }}>
              {unscheduledRows.slice(0, unscheduledShowCount).map((r, idx) => {
                const age = ageDays(r.created_at_jobber || null);
                return (
                  <MobileCard
                    key={idx}
                    age={age}
                    title={r.job_number ? `#${r.job_number}` : "—"}
                    subtitle={r.job_title}
                    date={r.created_at_jobber ? new Date(r.created_at_jobber).toLocaleDateString() : undefined}
                    amount={r.total_amount_cents ? money(r.total_amount_cents) : undefined}
                    url={r.jobber_url}
                    ageThresholds={[14, 7]}
                  />
                );
              })}
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table" style={{ fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ width: 60, padding: "8px 10px" }}>Age</th>
                    <th style={{ padding: "8px 10px" }}>Job</th>
                    <th style={{ width: 100, padding: "8px 10px" }}>Created</th>
                    <th style={{ width: 100, padding: "8px 10px" }}>Amount</th>
                    <th style={{ width: 90, padding: "8px 10px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {unscheduledRows.slice(0, unscheduledShowCount).map((r, idx) => {
                    const age = ageDays(r.created_at_jobber || null);
                    return (
                      <tr key={idx}>
                        <td style={{ padding: "10px" }}>
                          <span className={`age-badge ${age > 14 ? "critical" : age > 7 ? "warning" : "good"}`}>
                            {age}d
                          </span>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <div className="cell-primary" style={{ fontSize: 14, fontWeight: 600 }}>
                            {r.job_number ? `#${r.job_number}` : "—"}
                          </div>
                          {r.job_title && (
                            <div className="cell-secondary" style={{ fontSize: 13, marginTop: 1 }}>{r.job_title}</div>
                          )}
                        </td>
                        <td className="cell-muted" style={{ padding: "10px", fontSize: 13 }}>
                          {r.created_at_jobber ? new Date(r.created_at_jobber).toLocaleDateString() : "—"}
                        </td>
                        <td className="cell-primary" style={{ padding: "10px", fontSize: 14, fontWeight: 600 }}>
                          {r.total_amount_cents ? money(r.total_amount_cents) : "—"}
                        </td>
                        <td style={{ padding: "10px" }}>
                          <JobberLink url={r.jobber_url} isMobile={isMobile}>Open →</JobberLink>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <ShowMoreButton
            currentCount={unscheduledShowCount}
            totalCount={unscheduledRows.length}
            onShowMore={() => setUnscheduledShowCount(prev => prev + LOAD_MORE_COUNT)}
          />
        </div>
      )}

      {activeTab === "quotes" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <div>
              <h3 className="text-primary" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Leaking Quotes</h3>
              <p className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>Oldest first</p>
            </div>
            {leakCandidates.length > 0 && (
              <ExportCSV data={leakingQuotesExportData} filename="leaking-quotes" />
            )}
          </div>

          {leakCandidates.length === 0 ? (
            <div className="empty-state" style={{ padding: 24, textAlign: "center", fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
              No leaking quotes!
            </div>
          ) : isMobile ? (
            <div style={{ margin: "0 -16px" }}>
              {sortedQuotes.slice(0, quotesShowCount).map((q, idx) => {
                const sent = safeDate(q.sent_at);
                const age = sent ? Math.max(0, Math.round((Date.now() - sent.getTime()) / 86400000)) : 0;
                return (
                  <MobileCard
                    key={idx}
                    age={age}
                    title={q.quote_number ? `#${q.quote_number}` : "—"}
                    subtitle={q.quote_title}
                    date={sent ? sent.toLocaleDateString() : undefined}
                    amount={money(Number(q.quote_total_cents ?? 0))}
                    url={q.quote_url}
                    ageThresholds={[14, 7]}
                  />
                );
              })}
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table" style={{ fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ width: 60, padding: "8px 10px" }}>Age</th>
                    <th style={{ padding: "8px 10px" }}>Quote</th>
                    <th style={{ width: 100, padding: "8px 10px" }}>Sent</th>
                    <th style={{ width: 100, padding: "8px 10px" }}>Amount</th>
                    <th style={{ width: 90, padding: "8px 10px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedQuotes.slice(0, quotesShowCount).map((q, idx) => {
                    const sent = safeDate(q.sent_at);
                    const age = sent ? Math.max(0, Math.round((Date.now() - sent.getTime()) / 86400000)) : 0;
                    return (
                      <tr key={idx}>
                        <td style={{ padding: "10px" }}>
                          <span className={`age-badge ${age > 14 ? "critical" : age > 7 ? "warning" : "good"}`}>
                            {age}d
                          </span>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <div className="cell-primary" style={{ fontSize: 14, fontWeight: 600 }}>
                            {q.quote_number ? `#${q.quote_number}` : "—"}
                          </div>
                          {q.quote_title && (
                            <div className="cell-secondary" style={{ fontSize: 13, marginTop: 1 }}>{q.quote_title}</div>
                          )}
                        </td>
                        <td className="cell-muted" style={{ padding: "10px", fontSize: 13 }}>
                          {sent ? sent.toLocaleDateString() : "—"}
                        </td>
                        <td className="cell-primary" style={{ padding: "10px", fontSize: 14, fontWeight: 600 }}>{money(Number(q.quote_total_cents ?? 0))}</td>
                        <td style={{ padding: "10px" }}>
                          <JobberLink url={q.quote_url} isMobile={isMobile}>Open →</JobberLink>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <ShowMoreButton
            currentCount={quotesShowCount}
            totalCount={sortedQuotes.length}
            onShowMore={() => setQuotesShowCount(prev => prev + LOAD_MORE_COUNT)}
          />
        </div>
      )}
    </div>
  );
}
