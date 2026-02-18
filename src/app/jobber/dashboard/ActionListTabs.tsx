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

// Check theme
function useIsLight() {
  const [isLight, setIsLight] = useState(false);
  
  useEffect(() => {
    const check = () => {
      setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  
  return isLight;
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

type OpenRequest = {
  jobber_request_id?: string;
  title?: string;
  client_name?: string;
  source?: string;
  jobber_url?: string | null;
  created_at_jobber?: string;
};

type Props = {
  agedARInvoices: AgedARInvoice[];
  agedARExportData: Record<string, any>[];
  unscheduledRows: UnscheduledJob[];
  unscheduledExportData: Record<string, any>[];
  leakCandidates: LeakingQuote[];
  leakingQuotesExportData: Record<string, any>[];
  openRequests?: OpenRequest[];
  openRequestsExportData?: Record<string, any>[];
  currencyCode: string;
};

const INITIAL_SHOW = 10;
const LOAD_MORE_COUNT = 50;

export function ActionListTabs({
  agedARInvoices,
  agedARExportData,
  unscheduledRows,
  unscheduledExportData,
  leakCandidates,
  leakingQuotesExportData,
  openRequests = [],
  openRequestsExportData = [],
  currencyCode,
}: Props) {
  console.log("ActionListTabs received openRequests:", openRequests);
  const [activeTab, setActiveTab] = useState<"ar" | "unscheduled" | "quotes" | "requests">("ar");
  const [arShowCount, setArShowCount] = useState(INITIAL_SHOW);
  const [unscheduledShowCount, setUnscheduledShowCount] = useState(INITIAL_SHOW);
  const [quotesShowCount, setQuotesShowCount] = useState(INITIAL_SHOW);
  const [requestsShowCount, setRequestsShowCount] = useState(INITIAL_SHOW);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const isLight = useIsLight();

  const money = moneyFactory(currencyCode);

  const tabs = [
    { id: "ar" as const, label: "Invoices", count: agedARInvoices.length, icon: "💰" },
    { id: "unscheduled" as const, label: "Unscheduled", count: unscheduledRows.length, icon: "📦" },
    { id: "quotes" as const, label: "Quotes", count: leakCandidates.length, icon: "📋" },
    { id: "requests" as const, label: "Requests", count: openRequests.length, icon: "📥" },
  ];

  const sortedRequests = [...openRequests].sort((a, b) => 
    new Date(a.created_at_jobber ?? 0).getTime() - new Date(b.created_at_jobber ?? 0).getTime()
  );

  const sortedAR = [...agedARInvoices].sort((a, b) => b.days_overdue - a.days_overdue);
  const sortedQuotes = [...leakCandidates].sort((a, b) => new Date(a.sent_at ?? 0).getTime() - new Date(b.sent_at ?? 0).getTime());

  // Tab button style with hover
  const tabStyle = (active: boolean, hovered: boolean): React.CSSProperties => ({
    flex: 1,
    minWidth: 0, // Allow shrinking
    padding: "10px 4px",
    border: "none",
    borderRadius: 10,
    background: active
      ? "linear-gradient(135deg, #7c5cff, #5aa6ff)"
      : hovered
      ? isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)"
      : "transparent",
    color: active 
      ? "#fff" 
      : isLight ? "#334155" : "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    boxShadow: active ? "0 4px 12px rgba(124,92,255,0.3)" : "none",
    transform: hovered && !active ? "translateY(-1px)" : "none",
    overflow: "hidden",
  });

  const badgeStyle = (active: boolean): React.CSSProperties => ({
    padding: "2px 6px",
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 700,
    flexShrink: 0,
    background: active 
      ? "rgba(255,255,255,0.2)" 
      : isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)",
    color: active 
      ? "#fff" 
      : isLight ? "#64748b" : "rgba(255,255,255,0.7)",
  });

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
    const id = `showmore-${currentCount}`;

    return (
      <div style={{ textAlign: "center", marginTop: 12 }}>
        <button
          onClick={onShowMore}
          onMouseEnter={() => setHoveredButton(id)}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            padding: "8px 20px",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            border: "none",
            background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
            color: "#fff",
            cursor: "pointer",
            boxShadow: hoveredButton === id 
              ? "0 6px 20px rgba(124,92,255,0.4)" 
              : "0 2px 8px rgba(124,92,255,0.25)",
            transition: "all 0.15s ease",
            transform: hoveredButton === id ? "translateY(-2px)" : "none",
          }}
        >
          Show More ({remaining} remaining)
        </button>
      </div>
    );
  };

  // Link component for Open buttons with hover
  const OpenLink = ({ url, id }: { url: string | null | undefined; id: string }) => {
    if (!url) return <span style={{ color: isLight ? "#94a3b8" : "rgba(255,255,255,0.3)" }}>—</span>;
    
    const isHovered = hoveredButton === id;
    
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noreferrer" 
        onMouseEnter={() => setHoveredButton(id)}
        onMouseLeave={() => setHoveredButton(null)}
        style={{
          padding: "6px 12px",
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
          color: "#fff",
          cursor: "pointer",
          whiteSpace: "nowrap",
          boxShadow: isHovered 
            ? "0 6px 20px rgba(124,92,255,0.4)" 
            : "0 2px 8px rgba(124,92,255,0.25)",
          transition: "all 0.15s ease",
          textDecoration: "none",
          display: "inline-block",
          transform: isHovered ? "translateY(-2px)" : "none",
        }}
      >
        Open →
      </a>
    );
  };

  // Mobile card view
  const MobileCard = ({ 
    age, 
    title, 
    subtitle, 
    date, 
    amount, 
    url,
    id,
    ageThresholds = [30, 15],
  }: { 
    age: number;
    title: string;
    subtitle?: string;
    date?: string;
    amount?: string;
    url?: string | null;
    id: string;
    ageThresholds?: [number, number];
  }) => (
    <div style={{
      padding: "10px 16px",
      borderBottom: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}>
      <span className={`age-badge ${age > ageThresholds[0] ? "critical" : age > ageThresholds[1] ? "warning" : "good"}`}>
        {age}d
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontSize: 14, 
          fontWeight: 600, 
          color: isLight ? "#1e293b" : "#fff",
          overflow: "hidden", 
          textOverflow: "ellipsis", 
          whiteSpace: "nowrap" 
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ 
            fontSize: 12, 
            marginTop: 1, 
            color: isLight ? "#64748b" : "rgba(255,255,255,0.6)",
            overflow: "hidden", 
            textOverflow: "ellipsis", 
            whiteSpace: "nowrap" 
          }}>
            {subtitle}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 2, fontSize: 12 }}>
          {date && <span style={{ color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)" }}>{date}</span>}
          {amount && <span style={{ fontWeight: 600, color: isLight ? "#1e293b" : "#fff" }}>{amount}</span>}
        </div>
      </div>
      <OpenLink url={url} id={id} />
    </div>
  );

  return (
    <div>
      {/* Full-width horizontal tabs - all visible */}
      <div style={{ 
        display: "flex", 
        gap: 4,
        padding: 4,
        background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.04)",
        borderRadius: 12,
        marginBottom: 12,
        border: isLight ? "1px solid #e2e8f0" : "1px solid transparent",
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onMouseEnter={() => setHoveredTab(tab.id)}
            onMouseLeave={() => setHoveredTab(null)}
            style={tabStyle(activeTab === tab.id, hoveredTab === tab.id)}
          >
            <span style={{ flexShrink: 0 }}>{tab.icon}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tab.label}</span>
            <span style={badgeStyle(activeTab === tab.id)}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Tab Content - min-height prevents page jumping when switching tabs */}
      <div style={{ minHeight: 300 }}>
      {activeTab === "ar" && (
        <div>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            flexWrap: "wrap", 
            gap: 8, 
            marginBottom: 8,
            paddingTop: 4,
          }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: isLight ? "#1e293b" : "#fff" }}>
                Aged Invoices
              </h3>
              <p style={{ fontSize: 12, marginTop: 2, color: isLight ? "#64748b" : "rgba(255,255,255,0.5)" }}>
                Oldest first
              </p>
            </div>
            {agedARInvoices.length > 0 && (
              <ExportCSV data={agedARExportData} filename="aged-invoices" />
            )}
          </div>

          {agedARInvoices.length === 0 ? (
            <div style={{ 
              padding: 20, 
              textAlign: "center", 
              fontSize: 14,
              color: isLight ? "#64748b" : "rgba(255,255,255,0.6)",
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>✨</div>
              No past due invoices!
            </div>
          ) : isMobile ? (
            <div style={{ margin: "0 -16px" }}>
              {sortedAR.slice(0, arShowCount).map((inv, idx) => (
                <MobileCard
                  key={idx}
                  id={`ar-${idx}`}
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
            <div className="table-container">
              <table className="data-table" style={{ fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ width: "10%", padding: "8px 12px" }}>Age</th>
                    <th style={{ width: "30%", padding: "8px 12px" }}>Invoice</th>
                    <th style={{ width: "20%", padding: "8px 12px" }}>Due</th>
                    <th style={{ width: "20%", padding: "8px 12px" }}>Amount</th>
                    <th style={{ width: "20%", padding: "8px 12px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAR.slice(0, arShowCount).map((inv, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: "12px" }}>
                        <span className={`age-badge ${inv.days_overdue > 30 ? "critical" : inv.days_overdue > 15 ? "warning" : "good"}`}>
                          {inv.days_overdue}d
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: isLight ? "#1e293b" : "#fff" }}>
                          #{inv.invoice_number}
                        </div>
                        {inv.client_name && (
                          <div style={{ fontSize: 13, marginTop: 2, color: isLight ? "#64748b" : "rgba(255,255,255,0.6)" }}>
                            {inv.client_name}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px", fontSize: 14, color: isLight ? "#64748b" : "rgba(255,255,255,0.7)" }}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "12px", fontSize: 16, fontWeight: 700, color: isLight ? "#1e293b" : "#fff" }}>
                        {money(inv.amount_cents)}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <OpenLink url={inv.jobber_url} id={`ar-table-${idx}`} />
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
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            flexWrap: "wrap", 
            gap: 8, 
            marginBottom: 8,
            paddingTop: 4,
          }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: isLight ? "#1e293b" : "#fff" }}>
                Unscheduled Jobs
              </h3>
              <p style={{ fontSize: 12, marginTop: 2, color: isLight ? "#64748b" : "rgba(255,255,255,0.5)" }}>
                Oldest first
              </p>
            </div>
            {unscheduledRows.length > 0 && (
              <ExportCSV data={unscheduledExportData} filename="unscheduled-jobs" />
            )}
          </div>

          {unscheduledRows.length === 0 ? (
            <div style={{ 
              padding: 20, 
              textAlign: "center", 
              fontSize: 14,
              color: isLight ? "#64748b" : "rgba(255,255,255,0.6)",
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>✨</div>
              No unscheduled jobs!
            </div>
          ) : isMobile ? (
            <div style={{ margin: "0 -16px" }}>
              {unscheduledRows.slice(0, unscheduledShowCount).map((r, idx) => {
                const age = ageDays(r.created_at_jobber || null);
                return (
                  <MobileCard
                    key={idx}
                    id={`unsched-${idx}`}
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
                    <th style={{ width: "10%", padding: "8px 12px" }}>Age</th>
                    <th style={{ width: "30%", padding: "8px 12px" }}>Job</th>
                    <th style={{ width: "20%", padding: "8px 12px" }}>Created</th>
                    <th style={{ width: "20%", padding: "8px 12px" }}>Amount</th>
                    <th style={{ width: "20%", padding: "8px 12px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {unscheduledRows.slice(0, unscheduledShowCount).map((r, idx) => {
                    const age = ageDays(r.created_at_jobber || null);
                    return (
                      <tr key={idx}>
                        <td style={{ padding: "12px" }}>
                          <span className={`age-badge ${age > 14 ? "critical" : age > 7 ? "warning" : "good"}`}>
                            {age}d
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: isLight ? "#1e293b" : "#fff" }}>
                            {r.job_number ? `#${r.job_number}` : "—"}
                          </div>
                          {r.job_title && (
                            <div style={{ fontSize: 13, marginTop: 2, color: isLight ? "#64748b" : "rgba(255,255,255,0.6)" }}>
                              {r.job_title}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px", fontSize: 14, color: isLight ? "#64748b" : "rgba(255,255,255,0.7)" }}>
                          {r.created_at_jobber ? new Date(r.created_at_jobber).toLocaleDateString() : "—"}
                        </td>
                        <td style={{ padding: "12px", fontSize: 16, fontWeight: 700, color: isLight ? "#1e293b" : "#fff" }}>
                          {r.total_amount_cents ? money(r.total_amount_cents) : "—"}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <OpenLink url={r.jobber_url} id={`unsched-table-${idx}`} />
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
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            flexWrap: "wrap", 
            gap: 8, 
            marginBottom: 8,
            paddingTop: 4,
          }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: isLight ? "#1e293b" : "#fff" }}>
                Leaking Quotes
              </h3>
              <p style={{ fontSize: 12, marginTop: 2, color: isLight ? "#64748b" : "rgba(255,255,255,0.5)" }}>
                Oldest first
              </p>
            </div>
            {leakCandidates.length > 0 && (
              <ExportCSV data={leakingQuotesExportData} filename="leaking-quotes" />
            )}
          </div>

          {leakCandidates.length === 0 ? (
            <div style={{ 
              padding: 20, 
              textAlign: "center", 
              fontSize: 14,
              color: isLight ? "#64748b" : "rgba(255,255,255,0.6)",
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>✨</div>
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
                    id={`quote-${idx}`}
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
                    <th style={{ width: "10%", padding: "8px 12px" }}>Age</th>
                    <th style={{ width: "30%", padding: "8px 12px" }}>Quote</th>
                    <th style={{ width: "20%", padding: "8px 12px" }}>Sent</th>
                    <th style={{ width: "20%", padding: "8px 12px" }}>Amount</th>
                    <th style={{ width: "20%", padding: "8px 12px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedQuotes.slice(0, quotesShowCount).map((q, idx) => {
                    const sent = safeDate(q.sent_at);
                    const age = sent ? Math.max(0, Math.round((Date.now() - sent.getTime()) / 86400000)) : 0;
                    return (
                      <tr key={idx}>
                        <td style={{ padding: "12px" }}>
                          <span className={`age-badge ${age > 14 ? "critical" : age > 7 ? "warning" : "good"}`}>
                            {age}d
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: isLight ? "#1e293b" : "#fff" }}>
                            {q.quote_number ? `#${q.quote_number}` : "—"}
                          </div>
                          {q.quote_title && (
                            <div style={{ fontSize: 13, marginTop: 2, color: isLight ? "#64748b" : "rgba(255,255,255,0.6)" }}>
                              {q.quote_title}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px", fontSize: 14, color: isLight ? "#64748b" : "rgba(255,255,255,0.7)" }}>
                          {sent ? sent.toLocaleDateString() : "—"}
                        </td>
                        <td style={{ padding: "12px", fontSize: 16, fontWeight: 700, color: isLight ? "#1e293b" : "#fff" }}>
                          {money(Number(q.quote_total_cents ?? 0))}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <OpenLink url={q.quote_url} id={`quote-table-${idx}`} />
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

      {activeTab === "requests" && (
        <div>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            flexWrap: "wrap", 
            gap: 8, 
            marginBottom: 8,
            paddingTop: 4,
          }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: isLight ? "#1e293b" : "#fff" }}>
                Open Requests
              </h3>
              <p style={{ fontSize: 12, marginTop: 2, color: isLight ? "#64748b" : "rgba(255,255,255,0.5)" }}>
                Oldest first
              </p>
            </div>
            {openRequests.length > 0 && (
              <ExportCSV data={openRequestsExportData} filename="open-requests" />
            )}
          </div>

          {openRequests.length === 0 ? (
            <div style={{ 
              padding: 20, 
              textAlign: "center", 
              fontSize: 14,
              color: isLight ? "#64748b" : "rgba(255,255,255,0.6)",
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>✨</div>
              No open requests!
            </div>
          ) : isMobile ? (
            <div style={{ margin: "0 -16px" }}>
              {sortedRequests.slice(0, requestsShowCount).map((r, idx) => {
                const age = ageDays(r.created_at_jobber || null);
                return (
                  <MobileCard
                    key={idx}
                    id={`request-${idx}`}
                    age={age}
                    title={r.title || "Untitled request"}
                    subtitle={r.client_name || r.source}
                    date={r.created_at_jobber ? new Date(r.created_at_jobber).toLocaleDateString() : undefined}
                    url={r.jobber_url}
                    ageThresholds={[7, 3]}
                  />
                );
              })}
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table" style={{ fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ width: "10%", padding: "8px 12px" }}>Age</th>
                    <th style={{ width: "35%", padding: "8px 12px" }}>Request</th>
                    <th style={{ width: "20%", padding: "8px 12px" }}>Source</th>
                    <th style={{ width: "15%", padding: "8px 12px" }}>Created</th>
                    <th style={{ width: "20%", padding: "8px 12px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRequests.slice(0, requestsShowCount).map((r, idx) => {
                    const age = ageDays(r.created_at_jobber || null);
                    return (
                      <tr key={idx}>
                        <td style={{ padding: "12px" }}>
                          <span className={`age-badge ${age > 7 ? "critical" : age > 3 ? "warning" : "good"}`}>
                            {age}d
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: isLight ? "#1e293b" : "#fff" }}>
                            {r.title || "Untitled request"}
                          </div>
                          {r.client_name && (
                            <div style={{ fontSize: 13, marginTop: 2, color: isLight ? "#64748b" : "rgba(255,255,255,0.6)" }}>
                              {r.client_name}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px", fontSize: 14, color: isLight ? "#64748b" : "rgba(255,255,255,0.7)" }}>
                          {r.source || "—"}
                        </td>
                        <td style={{ padding: "12px", fontSize: 14, color: isLight ? "#64748b" : "rgba(255,255,255,0.7)" }}>
                          {r.created_at_jobber ? new Date(r.created_at_jobber).toLocaleDateString() : "—"}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <OpenLink url={r.jobber_url} id={`request-table-${idx}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <ShowMoreButton
            currentCount={requestsShowCount}
            totalCount={sortedRequests.length}
            onShowMore={() => setRequestsShowCount(prev => prev + LOAD_MORE_COUNT)}
          />
        </div>
      )}
      </div>
    </div>
  );
}
