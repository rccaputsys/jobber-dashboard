// src/app/jobber/dashboard/page.tsx
import React from "react";
import { supabaseAdmin, fetchAllRows } from "@/lib/supabaseAdmin";
import { SyncButton } from "./SyncButton";
import { ThemeToggle } from "./ThemeToggle";
import { getUser } from "@/lib/supabaseAuth";
import { redirect } from "next/navigation";
import { DisconnectJobberButton } from "./DisconnectButton";
import { TrendsSection } from "./TrendsSection";
import { AnalyticsProvider } from "./AnalyticsProvider";
import { NavTabs } from "./NavTabs";
import { AccuScore } from "./AccuScore";
import { MoneyFlowFunnel } from "./MoneyFlowFunnel";
import { MoneyFlowList } from "./MoneyFlowList";
import { CommandStrip } from "./CommandStrip";
import { WeekGlance } from "./WeekGlance";
import { BusinessPulse } from "./BusinessPulse";
import { DashboardTopbar } from "./DashboardTopbar";
import { OnboardingOverlay } from "./OnboardingOverlay";
import { ErrorBoundary } from "./ErrorBoundary";
import {
  safeDate as _safeDate,
  globalStyles,
  theme,
} from "@/lib/dashboardHelpers";

/* --------------------------------- helpers --------------------------------- */
type Granularity = "day" | "week" | "month" | "quarter";
type ChartType = "line" | "bar";

function safeDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function pct(x: number) {
  return Math.round(x * 100) + "%";
}

function parseISODateOnly(s: string): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  return isNaN(dt.getTime()) ? null : dt;
}
function toISODateOnlyUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDaysUTC(d: Date, days: number) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}
function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}
function formatSyncTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHr = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHr / 24);
  
  if (diffHr < 1) return "Less than 1 hour ago";
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function startOfWeekUTC(d: Date) {
  const x = startOfDayUTC(d);
  const day = x.getUTCDay();
  const delta = (day + 6) % 7;
  x.setUTCDate(x.getUTCDate() - delta);
  return x;
}
function startOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}
function startOfQuarterUTC(d: Date) {
  const q = Math.floor(d.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(d.getUTCFullYear(), q, 1, 0, 0, 0, 0));
}
function bucketStartUTC(d: Date, g: Granularity) {
  if (g === "day") return startOfDayUTC(d);
  if (g === "week") return startOfWeekUTC(d);
  if (g === "month") return startOfMonthUTC(d);
  return startOfQuarterUTC(d);
}
function nextBucketUTC(d: Date, g: Granularity) {
  if (g === "day") return addDaysUTC(d, 1);
  if (g === "week") return addDaysUTC(d, 7);
  if (g === "month") return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, 1, 0, 0, 0, 0));
}
function labelForBucket(d: Date, g: Granularity) {
  const y = d.getUTCFullYear();
  const m = d.toLocaleString(undefined, { month: "short", timeZone: "UTC" });
  const day = d.getUTCDate();
  if (g === "day") return `${m} ${day}`;
  if (g === "week") return `${m} ${day}`;
  if (g === "month") return `${m} ${y.toString().slice(2)}`;
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `Q${q} ${y.toString().slice(2)}`;
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

function moneyForChart(cents: number): string {
  const dollars = Math.round((Number(cents || 0) as number) / 100);
  if (dollars >= 1000000) {
    const rounded = Math.round(dollars / 10000) * 10000;
    return `$${(rounded / 1000000).toFixed(2)}M`;
  }
  if (dollars >= 1000) {
    const rounded = Math.round(dollars / 100) * 100;
    return `$${(rounded / 1000).toFixed(1)}k`;
  }
  if (dollars >= 100) {
    const rounded = Math.round(dollars / 100) * 100;
    return `$${rounded}`;
  }
  return `$${dollars}`;
}

function severityFromScore(score: number): "critical" | "warning" | "good" {
  if (score >= 80) return "critical";
  if (score >= 50) return "warning";
  return "good";
}

function statusLooksWon(status: string) {
  const s = status.toUpperCase();
  return s.includes("APPROV") || s.includes("ACCEPT") || s.includes("WON") || s.includes("CONVERT") || s.includes("BOOK");
}

function statusLooksLost(status: string) {
  const s = status.toUpperCase();
  return s.includes("REJECTED") || s.includes("DECLINED") || s.includes("LOST") || s.includes("EXPIRED") || s.includes("ARCHIVED");
}
/* --------------------------------- DEMO DATA --------------------------------- */
const DEMO_DATA = {
  companyName: "Greenscape Lawn & Garden",
  currencyCode: "USD",
  lastSyncPretty: "2 hours ago",
  totalAR: 484700,
  b15p: 215500,
  leakDollars: 1234000,
  leakCount: 8,
  changesRequestedCount: 2,
  approvedNoJobCount: 3,
  unscheduledCount: 7,
  quoteWonPct: 0.34,
  quotesWonLast30Days: 11,
  quotesInLast30Days: 32,
  allOverdueCount: 9,
  agedARInvoices: [
    { invoice_number: "1247", client_name: "Johnson Residence", amount_cents: 85000, days_overdue: 34, due_date: "2025-12-30", jobber_url: "#" },
    { invoice_number: "1251", client_name: "Oakwood HOA", amount_cents: 62500, days_overdue: 28, due_date: "2026-01-05", jobber_url: "#" },
    { invoice_number: "1258", client_name: "Martinez Property", amount_cents: 34500, days_overdue: 21, due_date: "2026-01-12", jobber_url: "#" },
    { invoice_number: "1263", client_name: "Thompson Estate", amount_cents: 18500, days_overdue: 18, due_date: "2026-01-15", jobber_url: "#" },
    { invoice_number: "1267", client_name: "Riverside Church", amount_cents: 15000, days_overdue: 16, due_date: "2026-01-17", jobber_url: "#" },
  ],
  unscheduledRows: [
    { job_number: "3847", job_title: "Spring cleanup & mulching", created_at_jobber: "2026-01-15", jobber_url: "#", total_amount_cents: 125000 },
    { job_number: "3851", job_title: "Irrigation system repair", created_at_jobber: "2026-01-18", jobber_url: "#", total_amount_cents: 85000 },
    { job_number: "3854", job_title: "Tree trimming - backyard oaks", created_at_jobber: "2026-01-22", jobber_url: "#", total_amount_cents: 45000 },
    { job_number: "3858", job_title: "Weekly maintenance setup", created_at_jobber: "2026-01-25", jobber_url: "#", total_amount_cents: 32000 },
    { job_number: "3861", job_title: "Fence line clearing", created_at_jobber: "2026-01-28", jobber_url: "#", total_amount_cents: 28000 },
  ],
  leakCandidates: [
    { quote_number: "Q-892", quote_title: "Full landscape redesign", sent_at: "2026-01-08", quote_total_cents: 485000, quote_url: "#", quote_status: "awaiting_response" },
    { quote_number: "Q-897", quote_title: "Patio & retaining wall", sent_at: "2026-01-12", quote_total_cents: 325000, quote_url: "#", quote_status: "awaiting_response" },
    { quote_number: "Q-901", quote_title: "Drainage solution - side yard", sent_at: "2026-01-15", quote_total_cents: 175000, quote_url: "#", quote_status: "awaiting_response" },
    { quote_number: "Q-904", quote_title: "Seasonal flower installation", sent_at: "2026-01-19", quote_total_cents: 125000, quote_url: "#", quote_status: "awaiting_response" },
    { quote_number: "Q-908", quote_title: "Lawn renovation & seeding", sent_at: "2026-01-24", quote_total_cents: 124000, quote_url: "#", quote_status: "awaiting_response" },
  ],
  openRequests: [
    { title: "New lawn care estimate", client_name: "Sarah Mitchell", source: "website", created_at_jobber: "2026-01-30", jobber_url: "#" },
    { title: "Spring cleanup quote needed", client_name: "Oak Valley HOA", source: "phone", created_at_jobber: "2026-01-28", jobber_url: "#" },
    { title: "Irrigation repair assessment", client_name: "Tom Henderson", source: "website", created_at_jobber: "2026-01-25", jobber_url: "#" },
  ],
  openRequestsCount: 3,
  trendLabels: ["Dec 9", "Dec 16", "Dec 23", "Dec 30", "Jan 6", "Jan 13", "Jan 20", "Jan 27"],
  leakTrend: [1850000, 1720000, 1580000, 1450000, 1380000, 1290000, 1260000, 1234000],
  ar15Trend: [385000, 342000, 298000, 275000, 248000, 232000, 218000, 215500],
  unschedTrend: [
    { cnt: 12, cents: 480000 }, { cnt: 11, cents: 420000 }, { cnt: 10, cents: 385000 }, { cnt: 9, cents: 340000 },
    { cnt: 8, cents: 295000 }, { cnt: 8, cents: 280000 }, { cnt: 7, cents: 250000 }, { cnt: 7, cents: 245000 },
  ],
  recommendations: [
    { icon: "🔴", text: "$2,155 overdue 15+ days (5 invoices). Priority: Call top 3 oldest accounts today.", priority: "high" as const },
    { icon: "✏️", text: "2 quotes waiting for revisions. Hot leads - respond within 24hrs.", priority: "high" as const },
    { icon: "💰", text: "8 quotes pending ($12,340 total). Follow up on top 5 - potential $3,085 recovery.", priority: "medium" as const },
  ],
};
/* -------------------------------- Page -------------------------------- */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    start?: string;
    end?: string;
    g?: Granularity;
    chart?: ChartType;
    unscheduled_min_days?: string;
    checkout?: string;
    demo?: string;
    sync_error?: string;
    admin_connection_id?: string;
    retry_sync?: string;
  }>;
}) {
  const sp = await searchParams;
  const isDemo = sp.demo === "true";
  const syncError = sp.sync_error;
  const retrySync = sp.retry_sync === "true";

  if (isDemo) {
    const money = moneyFactory(DEMO_DATA.currencyCode);

    // Convert demo data to event arrays for TrendsSection
    const demoLeakEvents = DEMO_DATA.leakCandidates.map((q) => ({
      enterAt: new Date(q.sent_at).getTime(),
      exitAt: null,
      amount: q.quote_total_cents,
    }));
    const demoArEvents = DEMO_DATA.agedARInvoices.map((inv) => ({
      enterAt: new Date(inv.due_date).getTime() + 15 * 86400000,
      exitAt: null,
      amount: inv.amount_cents,
    }));
    const demoUnschedEvents = DEMO_DATA.unscheduledRows.map((j) => ({
      enterAt: new Date(j.created_at_jobber).getTime(),
      exitAt: null,
      amount: j.total_amount_cents,
    }));

    const demoHealthScore = 66;
    const demoBreakdown = [
      { label: "Sales", score: 68, detail: "34% win rate \u2022 8 open quotes \u2022 5 pending action", action: "Follow up on cold quotes", href: "/jobber/sales" },
      { label: "Capacity", score: 65, detail: "15% of jobs unscheduled \u2022 target: under 10%", action: "Schedule unbooked jobs", href: "/jobber/capacity" },
      { label: "Invoices", score: 60, detail: "25% of overdue amount is 15+ days old \u2022 target: under 10%", action: "Send payment reminders", href: "/jobber/invoices" },
    ];
    const demoFunnel = [
      { label: "Leads", count: 3, value: null, icon: "\uD83D\uDCE5", href: "/jobber/sales", color: "#8b5cf6", unitLabel: "requests" },
      { label: "Quoting", count: 8, value: money(1234000), icon: "\uD83D\uDCDD", href: "/jobber/sales", color: "#5aa6ff", unitLabel: "quotes" },
      { label: "Won", count: 3, value: money(475000), icon: "\uD83C\uDFC6", href: "/jobber/sales", color: "#10b981", unitLabel: "quotes" },
      { label: "Scheduled", count: 14, value: money(890000), icon: "\uD83D\uDCC5", href: "/jobber/capacity", color: "#06b6d4", unitLabel: "jobs" },
      { label: "Needs Invoice", count: 4, value: money(245000), icon: "\uD83D\uDCC4", href: "/jobber/invoices", color: "#f59e0b", unitLabel: "jobs" },
      { label: "Outstanding", count: 9, value: money(484700), icon: "\uD83D\uDCB0", href: "/jobber/invoices", color: "#ef4444", unitLabel: "invoices" },
    ];

    return (
      <main className="dashboard-main" style={{
        minHeight: "100vh",
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: `
          radial-gradient(ellipse 80% 60% at 50% -20%, rgba(124,92,255,0.15), transparent),
          radial-gradient(ellipse 60% 40% at 100% 0%, rgba(90,166,255,0.1), transparent),
          linear-gradient(180deg, #060811 0%, #0a1020 100%)
        `,
      }}>
        <style>{globalStyles}</style>

        <div className="dashboard-container" data-testid="DEMO-MODE-ACTIVE">
          <div className="dashboard-topbar animate-in">
            <header className="dashboard-header">
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="32" height="32" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                    <defs><linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#7c5cff" /><stop offset="100%" stopColor="#5aa6ff" /></linearGradient></defs>
                    <circle cx="25" cy="25" r="22" fill="none" stroke="url(#logoGrad)" strokeWidth="3"/>
                    <polyline points="8,25 16,25 21,12 29,38 34,20 42,25" fill="none" stroke="url(#logoGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", background: "linear-gradient(135deg, #7c5cff, #5aa6ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AccuInsight</div>
                    <div className="text-primary" style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.1 }}>{DEMO_DATA.companyName}</div>
                  </div>
                </div>
              </div>
              <div className="header-actions">
                <span className="header-subtitle" style={{ fontSize: 10 }}>{DEMO_DATA.lastSyncPretty}</span>
                <button className="btn" disabled style={{ opacity: 0.5, fontSize: 11, padding: "5px 10px" }}>Sync</button>
                <ThemeToggle />
                <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
                <div className="status-pill" style={{ borderRadius: 8, fontWeight: 600, fontSize: 11, padding: "4px 10px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)" }}>Pro</div>
              </div>
            </header>
            <NavTabs />
          </div>

          {/* AccuScore */}
          <div className="panel animate-in delay-1" style={{ marginTop: 20, padding: "20px 24px" }}>
            <AccuScore score={demoHealthScore} breakdown={demoBreakdown} />
          </div>

          {/* Primary KPIs */}
          <div className="kpi-grid-primary animate-in delay-1" style={{ marginTop: 16 }}>
            <div className="kpi-primary gradient-purple hover-lift">
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="kpi-label" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Revenue March</span>
                </div>
                <div className="kpi-value-large text-primary">{money(1245000)}</div>
                <div className="kpi-sublabel" style={{ fontSize: 12, marginTop: 8 }}>
                  <span style={{ color: "#10b981", fontWeight: 600 }}>{"\u25B2"} 18% vs last month</span>
                </div>
              </div>
            </div>
            <div className="kpi-primary hover-lift" style={{ background: "linear-gradient(145deg, rgba(90,166,255,0.1) 0%, rgba(255,255,255,0.02) 100%)", borderColor: "rgba(90,166,255,0.3)" }}>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="kpi-label" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Pipeline Value</span>
                </div>
                <div className="kpi-value-large" style={{ color: "#5aa6ff" }}>{money(1234000)}</div>
                <div className="kpi-sublabel" style={{ fontSize: 12, marginTop: 8 }}>8 open quotes</div>
              </div>
            </div>
            <div className="kpi-primary hover-lift" style={{ background: "linear-gradient(145deg, rgba(245,158,11,0.15) 0%, rgba(255,255,255,0.02) 100%)", borderColor: "rgba(245,158,11,0.4)" }}>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="kpi-label" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Overdue Invoices</span>
                </div>
                <div className="kpi-value-large text-warning">{money(484700)}</div>
                <div className="kpi-sublabel" style={{ fontSize: 12, marginTop: 8 }}>9 invoices past due</div>
              </div>
            </div>
          </div>

          {/* Secondary KPIs */}
          <div className="kpi-grid-secondary animate-in delay-2" style={{ marginTop: 16 }}>
            <div className="kpi-secondary">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, minHeight: 32 }}>
                <span className="kpi-label" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Win Rate (30d)</span>
              </div>
              <div className="kpi-value-medium text-warning">{pct(0.34)}</div>
              <div className="kpi-sublabel" style={{ fontSize: 11, marginTop: 4 }}>11 won of 32 quotes</div>
            </div>
            <div className="kpi-secondary">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, minHeight: 32 }}>
                <span className="kpi-label" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Unscheduled</span>
              </div>
              <div className="kpi-value-medium text-warning">{money(315000)}</div>
              <div className="kpi-sublabel" style={{ fontSize: 11, marginTop: 4 }}>7 jobs in backlog</div>
            </div>
            <div className="kpi-secondary">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, minHeight: 32 }}>
                <span className="kpi-label" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Needs Invoicing</span>
              </div>
              <div className="kpi-value-medium text-warning">{money(245000)}</div>
              <div className="kpi-sublabel" style={{ fontSize: 11, marginTop: 4 }}>4 jobs completed, not billed</div>
            </div>
            <div className="kpi-secondary">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, minHeight: 32 }}>
                <span className="kpi-label" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Open Requests</span>
              </div>
              <div className="kpi-value-medium text-success">3</div>
              <div className="kpi-sublabel" style={{ fontSize: 11, marginTop: 4 }}>3 pending requests</div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="panel animate-in delay-2" style={{ marginTop: 20 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h2 className="text-primary" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>This Week&apos;s Focus</h2>
            </div>
            <div style={{ padding: "10px 16px" }}>
              {[
                { headline: `Collect ${money(215500)}`, detail: "5 invoices overdue 15+ days. Call your oldest accounts today.", priority: "high" as const, href: "/jobber/invoices" },
                { headline: "Close $3,500 faster", detail: "2 quotes need your revisions. These clients are ready to buy.", priority: "high" as const, href: "/jobber/sales" },
                { headline: `Win back ${money(308500)}`, detail: `8 quotes worth ${money(1234000)} going cold. Follow up on the largest ones today.`, priority: "medium" as const, href: "/jobber/sales" },
              ].map((rec, i) => {
                const prioClass = rec.priority === "high" ? "rec-card-high" : "rec-card-medium";
                return (
                  <a key={i} href={rec.href} className={`rec-card ${prioClass}`} style={{ borderLeft: `3px solid ${rec.priority === "high" ? "#ef4444" : "#f59e0b"}`, flexDirection: "column", gap: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                      <span className="text-primary" style={{ fontSize: 13, fontWeight: 700 }}>{rec.headline}</span>
                      <span className="text-muted" style={{ fontSize: 11, flexShrink: 0, fontWeight: 600 }}>&rarr;</span>
                    </div>
                    <span className="text-muted" style={{ fontSize: 11, lineHeight: 1.4 }}>{rec.detail}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Money Flow */}
          <div className="panel animate-in delay-3" style={{ marginTop: 20, overflow: "visible" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h2 className="text-primary" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Money Flow</h2>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Track jobs from lead to collected payment</p>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <MoneyFlowFunnel stages={demoFunnel} />
            </div>
          </div>

          <div className="animate-in delay-4" style={{ marginTop: 20 }}>
            <TrendsSection
              leakEvents={demoLeakEvents}
              arEvents={demoArEvents}
              unschedEvents={demoUnschedEvents}
              currencyCode={DEMO_DATA.currencyCode}
            />
          </div>

          <footer style={{
            marginTop: 40, paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            textAlign: "center", fontSize: 12, color: "rgba(234,241,255,0.4)",
          }}>
            <p style={{ margin: 0 }}>&copy; 2026 OwnerView. All rights reserved.</p>
            <p style={{ margin: "8px 0 0" }}>
              <a href="/terms" style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none" }}>Terms</a>
              {" \u00B7 "}
              <a href="/privacy" style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none" }}>Privacy</a>
            </p>
          </footer>
        </div>
      </main>
    );
  }

  const user = await getUser();
  if (!user) redirect("/login");

  // Admin impersonation: if admin_connection_id is set and user is admin, use that connection
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);
  const isAdmin = ADMIN_EMAILS.includes(user.email || "");
  const adminConnectionId = isAdmin ? sp.admin_connection_id : undefined;

  // Get the user's connection (or admin-specified connection)
  let connectionId: string;
  if (adminConnectionId) {
    const { data: adminConn } = await supabaseAdmin
      .from("jobber_connections")
      .select("id")
      .eq("id", adminConnectionId)
      .maybeSingle();
    if (!adminConn) {
      return (
        <div style={{ padding: 24, color: "#EAF1FF", minHeight: "100vh", background: "#060811" }}>
          <h2>Connection not found</h2>
          <p style={{ marginTop: 8, color: theme.sub }}>The specified connection ID does not exist.</p>
          <a href="/admin" style={{ color: "#5aa6ff", marginTop: 16, display: "inline-block" }}>← Back to Admin</a>
        </div>
      );
    }
    connectionId = adminConn.id;
  } else {
    const { data: connection } = await supabaseAdmin
      .from("jobber_connections")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!connection) {
      return (
        <div style={{ padding: 24, color: "#EAF1FF", minHeight: "100vh", background: "#060811" }}>
          <h2>No Jobber account connected</h2>
          <p style={{ marginTop: 8, color: theme.sub }}>See Your Numbers Now.</p>
          <a href="/jobber" style={{ color: "#5aa6ff", marginTop: 16, display: "inline-block" }}>Connect Jobber →</a>
        </div>
      );
    }
    connectionId = connection.id;
  }

  // Connection summary (including billing info)
  const { data: conn } = await supabaseAdmin
    .from("jobber_connections")
    .select("last_sync_at,trial_started_at,trial_ends_at,billing_status,currency_code,company_name,jobber_account_name,weekly_capacity_cents")
    .eq("id", connectionId)
    .maybeSingle();

  const companyName = conn?.jobber_account_name || conn?.company_name || "Your Company";

  // Check billing status for paywall
  const billingStatus = conn?.billing_status ?? "trialing";
  const trialEndsAt = conn?.trial_ends_at ? new Date(conn.trial_ends_at).getTime() : 0;
  const trialActive = billingStatus === "trialing" && trialEndsAt > Date.now();
  const subscriptionActive = billingStatus === "active";
  const hasAccess = trialActive || subscriptionActive || !!adminConnectionId;

  // Block entire dashboard if no access
  if (!hasAccess) {
    return (
      <main style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #060811 0%, #0A1222 100%)",
        padding: 24,
      }}>
        <style>{globalStyles}</style>
        <div className="animate-in" style={{
          maxWidth: 420,
          width: "100%",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
          padding: "48px 32px",
          textAlign: "center",
          boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
        }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
            margin: "0 auto 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 40px rgba(90,166,255,0.3)",
          }}>
            <span style={{ fontSize: 32 }}>🔒</span>
          </div>
          
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#EAF1FF", marginBottom: 12 }}>
            {billingStatus === "trialing" ? "Trial Expired" : "Subscribe to Access"}
          </h1>
          
          <p style={{ fontSize: 15, color: "rgba(234,241,255,0.6)", lineHeight: 1.6, marginBottom: 32 }}>
            Your 14-day free trial has ended. Subscribe to continue accessing your AccuInsight dashboard.
          </p>

          <form action="/api/billing/checkout" method="POST">
            <button type="submit" className="btn-primary" style={{
              width: "100%",
              padding: "16px 24px",
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 16,
              border: "none",
              cursor: "pointer",
            }}>
              Subscribe — $29/month
            </button>
          </form>
          
          <p style={{ marginTop: 20, fontSize: 13, color: "rgba(234,241,255,0.4)" }}>
            Cancel anytime • Instant access
          </p>
        </div>
      </main>
    );
  }



  const rangePreset = sp.range ?? "8w";

  const todayUTC = startOfDayUTC(new Date());
  const preset = (() => {
    if (rangePreset === "7d") return { start: addDaysUTC(todayUTC, -7), end: todayUTC };
    if (rangePreset === "30d") return { start: addDaysUTC(todayUTC, -30), end: todayUTC };
    if (rangePreset === "90d") return { start: addDaysUTC(todayUTC, -90), end: todayUTC };
    if (rangePreset === "ytd") return { start: new Date(Date.UTC(todayUTC.getUTCFullYear(), 0, 1)), end: todayUTC };
    return { start: addDaysUTC(todayUTC, -56), end: todayUTC };
  })();

  const start = parseISODateOnly(sp.start ?? "") ?? preset.start;
  const end = parseISODateOnly(sp.end ?? "") ?? preset.end;
  const endExclusive = addDaysUTC(end, 1);

  const minDays = Number(sp.unscheduled_min_days ?? "0");
  const nextMinDays = minDays >= 7 ? 0 : 7;

  // Build toggle URL server-side
  const qp = new URLSearchParams();
  if (sp.range) qp.set("range", sp.range);
  if (sp.start) qp.set("start", sp.start);
  if (sp.end) qp.set("end", sp.end);
  if (sp.g) qp.set("g", sp.g);
  if (sp.chart) qp.set("chart", sp.chart);
  if (nextMinDays) qp.set("unscheduled_min_days", String(nextMinDays));
  const toggleUnscheduledHref = `/jobber/dashboard?${qp.toString()}`;

  const currencyCode = (conn?.currency_code || "USD").toUpperCase();
  const money = moneyFactory(currencyCode);

  const lastSyncPretty = conn?.last_sync_at ? formatSyncTime(new Date(conn.last_sync_at)) : "Not synced yet";

  // Fetch facts IN PARALLEL (paginated to bypass PostgREST max_rows=100)
  const [invoices, jobs, quotes, requests, visits] = await Promise.all([
    fetchAllRows("fact_invoices", "status,balance_cents,total_amount_cents,due_at,paid_at,invoice_number,client_name,jobber_invoice_id,jobber_url", connectionId),
    fetchAllRows("fact_jobs", "jobber_job_id,status,total_amount_cents,job_revenue_cents,job_cost_cents,job_profit_cents,scheduled_start_at,scheduled_end_at,created_at_jobber,updated_at_jobber,jobber_url,job_number,job_title", connectionId),
    fetchAllRows(
      "fact_quotes",
      "jobber_quote_id,quote_number,quote_title,quote_status,quote_total_cents,quote_url,sent_at,updated_at_jobber,created_at_jobber",
      connectionId,
    ),
    fetchAllRows(
      "fact_requests",
      "jobber_request_id,title,request_status,source,client_name,jobber_url,created_at_jobber",
      connectionId,
    ),
    fetchAllRows(
      "fact_visits",
      "jobber_visit_id,jobber_job_id,title,visit_status,is_complete,start_at,completed_at,duration_minutes",
      connectionId,
    ),
  ]);
  // Open requests count (PENDING = not yet converted/archived/closed)
  const openRequestsCount = requests.filter((r: any) => {
  const status = (r.request_status || "").toUpperCase();
  // Open requests: NEW, PENDING, UNSCHEDULED, or ASSESSMENT_COMPLETED (action required)
  return status === "NEW" || status === "PENDING" || status === "UNSCHEDULED" || status === "ASSESSMENT_COMPLETED" || status === "ACTION_REQUIRED";
}).length;

  // AR buckets - only unpaid invoices
  const nowMs = Date.now();
  let b0_7 = 0, b8_14 = 0, b15p = 0, totalAR = 0;
  let totalPastDueCount = 0, b15pCount = 0;

  // Filter to only unpaid invoices (awaiting_payment, overdue, etc.)
  const unpaidInvoices = invoices.filter((inv: any) => {
    const status = (inv.status || '').toLowerCase();
    // Exclude paid, draft, and voided invoices
    return status !== 'paid' && status !== 'draft' && status !== 'voided' && status !== 'bad_debt';
  });

  for (const inv of unpaidInvoices) {
    const amt = Number(inv.balance_cents ?? inv.total_amount_cents ?? 0);

    const due = safeDate(inv.due_at ?? inv.dueDate ?? inv.due_date);
    if (!due) continue;
    const days = (nowMs - due.getTime()) / 86400000;

    // Only count invoices that are actually past due
    if (days > 0) {
      totalAR += amt;
      totalPastDueCount += 1;
      if (days <= 7) b0_7 += amt;
      else if (days <= 14) b8_14 += amt;
      else { b15p += amt; b15pCount += 1; }
    }
  }
  const riskPct = totalAR > 0 ? b15p / totalAR : 0;
  const arScore = clamp(riskPct * 120, 0, 100);
  const arSev = severityFromScore(arScore);

  // ---- Outlier cutoffs ----
  // Many Jobber accounts have old quotes/jobs that were never closed out.
  // We exclude these so stale data doesn't penalize owners with messy workflows.
  // KPI cards/funnel use 6-month window for pipeline data.
  // Business Health Score uses 90-day window — responsive to recent improvements.
  const sixMonthsAgo = addDaysUTC(todayUTC, -180);
  const ninetyDaysAgo = addDaysUTC(todayUTC, -90);
  const sixMonthsAgoMs = sixMonthsAgo.getTime();
  const ninetyDaysAgoMs = ninetyDaysAgo.getTime();

  // Unscheduled count & value (only jobs created in last 6 months)
  const unscheduledJobs = jobs.filter((j) => {
    if (j.scheduled_start_at) return false;
    const created = safeDate(j.created_at_jobber);
    return created && created.getTime() >= sixMonthsAgoMs;
  });
  const unscheduledCount = unscheduledJobs.length;
  const unscheduledCents = unscheduledJobs.reduce((sum, j) => sum + Number(j.total_amount_cents ?? 0), 0);

  // Completed & profitability
  // "Completed" in Jobber means different things — most businesses never use the "completed" status.
  // Jobs go: active → requires_invoicing → archived. We treat requires_invoicing/archived as done.
  // For timing, we check completed_at fields first, then fall back to updated_at_jobber.
  const completedDateKeys = ["completed_at_jobber", "completed_at", "completedAt", "completedAtJobber", "updated_at_jobber"];
  const completedStatuses = ["completed", "requires_invoicing", "archived"];

  const completedInRange = jobs.filter((j) => {
    const raw = completedDateKeys.map((k) => j[k]).find((v) => v);
    const dt = safeDate(raw);
    if (!dt) return false;
    return dt.getTime() >= start.getTime() && dt.getTime() < endExclusive.getTime();
  });

  const completedCount = completedInRange.length;
  const revSum = completedInRange.reduce((sum, j) => sum + Number(j.job_revenue_cents ?? 0), 0);
  const profitSum = completedInRange.reduce((sum, j) => {
    const p = j.job_profit_cents;
    if (p !== null && p !== undefined) return sum + Number(p);
    return sum + (Number(j.job_revenue_cents ?? 0) - Number(j.job_cost_cents ?? 0));
  }, 0);

  const marginPerJob = completedCount ? Math.round(profitSum / completedCount) : 0;

  // Quote leak - quotes sent but not won (last 6 months only — older ones are likely dead)
  const leakCandidates = quotes
    .filter((q) => {
      const sent = safeDate(q.sent_at);
      if (!sent || sent.getTime() < sixMonthsAgoMs) return false;
      const st = String(q.quote_status ?? "").toLowerCase().trim();
      if (!st) return true;
      if (st === "archived" || st === "draft") return false;
      return !statusLooksWon(st);
    });

  // Filter leak candidates to range for the KPI card
  const leakCandidatesInRange = leakCandidates.filter((q) => {
    const dt = safeDate(q.sent_at);
    if (!dt) return false;
    return dt.getTime() >= start.getTime() && dt.getTime() < endExclusive.getTime();
  });

  const leakCount = leakCandidates.length;
  const leakDollars = leakCandidates.reduce((sum, q) => sum + Number(q.quote_total_cents ?? 0), 0);

  // Quotes with changes requested (last 6 months)
  const changesRequestedQuotes = quotes.filter((q) => {
    const st = String(q.quote_status ?? "").toLowerCase().trim();
    if (st !== "changes_requested") return false;
    const updated = safeDate(q.updated_at_jobber) || safeDate(q.created_at_jobber);
    return updated && updated.getTime() >= sixMonthsAgoMs;
  });
  const changesRequestedCount = changesRequestedQuotes.length;
  const changesRequestedCents = changesRequestedQuotes.reduce((sum, q) => sum + Number(q.quote_total_cents ?? 0), 0);

  // Quotes approved but no job created yet (last 6 months)
  const approvedNoJobQuotes = quotes.filter((q) => {
    const st = String(q.quote_status ?? "").toLowerCase().trim();
    if (st !== "approved") return false;
    const updated = safeDate(q.updated_at_jobber) || safeDate(q.created_at_jobber);
    return updated && updated.getTime() >= sixMonthsAgoMs;
  });
  const approvedNoJobCount = approvedNoJobQuotes.length;
  const approvedNoJobCents = approvedNoJobQuotes.reduce((sum, q) => sum + Number(q.quote_total_cents ?? 0), 0);

  // Quote Won % (last 30 days)
  // Numerator: quotes marked won in last 30 days
  // Denominator: ALL quotes sent in last 30 days (including outstanding)
  const thirtyDaysAgo = addDaysUTC(todayUTC, -30);
  
  const quotesInLast30Days = quotes.filter((q) => {
  const st = String(q.quote_status ?? "").toLowerCase().trim();
  if (st === "draft") return false;
  
  const date = safeDate(q.sent_at) || safeDate(q.created_at_jobber);
  if (!date) return false;
  
  return date.getTime() >= thirtyDaysAgo.getTime();
});

const quotesWonLast30Days = quotesInLast30Days.filter((q) => {
  const st = String(q.quote_status ?? "").toLowerCase().trim();
  return statusLooksWon(st);
});

const quoteWonPct = quotesInLast30Days.length > 0 
  ? quotesWonLast30Days.length / quotesInLast30Days.length 
  : 0;
  // Aged AR - only unpaid invoices
  const agedARInvoices = unpaidInvoices
    .filter((inv: any) => {
      const due = safeDate(inv.due_at);
      if (!due) return false;
      const daysOverdue = Math.max(0, Math.round((Date.now() - due.getTime()) / 86400000));
      return daysOverdue > 0;
    })
    .map((inv) => ({
      invoice_number: inv.invoice_number || "—",
      client_name: inv.client_name || "",
      amount_cents: inv.balance_cents || inv.total_amount_cents || 0,
      days_overdue: Math.max(0, Math.round((Date.now() - (safeDate(inv.due_at)?.getTime() || Date.now())) / 86400000)),
      due_date: inv.due_at,
      jobber_url: inv.jobber_url || (inv.jobber_invoice_id ? `https://secure.getjobber.com/invoices/${inv.jobber_invoice_id}` : null),
    }));

  // Invoices hitting 7 days overdue this week (for recommendations)
  const sevenDaysFromNow = addDaysUTC(todayUTC, 7);
  const invoicesHitting7DaysThisWeek = unpaidInvoices.filter((inv: any) => {
    const due = safeDate(inv.due_at);
    if (!due) return false;
    const daysOverdue = Math.round((nowMs - due.getTime()) / 86400000);
    // Currently 0-6 days overdue, will hit 7 within next 7 days
    return daysOverdue >= 0 && daysOverdue < 7;
  });

  // Unscheduled jobs older than 7 days (for recommendations)
  const ageDays = (ts: string | null) => {
    if (!ts) return 0;
    const d = safeDate(ts);
    if (!d) return 0;
    return Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000));
  };

  const unscheduledOlderThan7Days = jobs.filter((j) => {
    if (j.scheduled_start_at) return false;
    const created = safeDate(j.created_at_jobber);
    if (!created || created.getTime() < sixMonthsAgoMs) return false;
    return ageDays(j.created_at_jobber) >= 7;
  });

  // Unscheduled list - derive from already-fetched jobs array for consistency with KPI count
  const rawUn = jobs
    .filter((j) => !j.scheduled_start_at)
    .sort((a, b) => {
      const aDate = safeDate(a.created_at_jobber)?.getTime() ?? 0;
      const bDate = safeDate(b.created_at_jobber)?.getTime() ?? 0;
      return aDate - bDate;
    })
    .map((j) => ({
      ...j,
      jobber_url: j.jobber_url || (j.jobber_job_id ? `https://secure.getjobber.com/jobs/${j.jobber_job_id}` : null),
    })) as any[];

  const unscheduledRows = minDays > 0 ? rawUn.filter((r) => ageDays(r.created_at_jobber) >= minDays) : rawUn;

  // Prepare compact event arrays for client-side trend computation
  // (TrendsSection computes buckets client-side so controls work instantly)
  const leakEvents = quotes
    .filter((q) => {
      const st = String(q.quote_status ?? "").toLowerCase().trim();
      return q.sent_at && st !== "archived" && st !== "draft";
    })
    .map((q) => {
      const sentAt = safeDate(q.sent_at)!;
      const st = String(q.quote_status ?? "").toLowerCase().trim();
      const isWon = statusLooksWon(st);
      const wonAt = isWon ? safeDate(q.updated_at_jobber) : null;
      return { enterAt: sentAt.getTime(), exitAt: wonAt ? wonAt.getTime() : null, amount: Number(q.quote_total_cents ?? 0) };
    });

  const arEvents = unpaidInvoices
    .filter((inv) => safeDate(inv.due_at ?? inv.dueDate ?? inv.due_date))
    .map((inv) => {
      const due = safeDate(inv.due_at ?? inv.dueDate ?? inv.due_date)!;
      const paidAt = safeDate(inv.paid_at);
      return { enterAt: due.getTime(), exitAt: paidAt ? paidAt.getTime() : null, amount: Number(inv.balance_cents ?? inv.total_amount_cents ?? 0) };
    });

  const unschedEvents = jobs
    .filter((j) => safeDate(j.created_at_jobber))
    .map((j) => {
      const createdAt = safeDate(j.created_at_jobber)!;
      const scheduledAt = safeDate(j.scheduled_start_at);
      return { enterAt: createdAt.getTime(), exitAt: scheduledAt ? scheduledAt.getTime() : null, amount: Number(j.total_amount_cents ?? 0) };
    });

  // ===== Week at a Glance =====
  const thisWeekStart = startOfWeekUTC(todayUTC);
  const thisWeekEnd = addDaysUTC(thisWeekStart, 7);
  const lastWeekStart = addDaysUTC(thisWeekStart, -7);
  const nextWeekStart = thisWeekEnd;
  const nextWeekEnd = addDaysUTC(nextWeekStart, 7);

  const weeklyTargetCents: number | null = conn?.weekly_capacity_cents ?? null;

  // Build job visit counts and totals for per-visit revenue distribution
  const jobVisitCountMap = new Map<string, number>();
  const jobTotalMap = new Map<string, number>();
  for (const v of visits) {
    const jid = (v as any).jobber_job_id;
    if (jid) jobVisitCountMap.set(jid, (jobVisitCountMap.get(jid) || 0) + 1);
  }
  for (const j of jobs) {
    jobTotalMap.set((j as any).jobber_job_id, Number((j as any).total_amount_cents ?? 0));
  }
  const jobIdsWithVisits = new Set(visits.map((v: any) => v.jobber_job_id).filter(Boolean));

  function weekSnapshot(wStart: Date, wEnd: Date) {
    const wStartMs = wStart.getTime();
    const wEndMs = wEnd.getTime();

    // Visits scheduled this week
    const scheduledVisits = visits.filter((v: any) => {
      const s = safeDate(v.start_at);
      return s && s.getTime() >= wStartMs && s.getTime() < wEndMs;
    });
    // Visitless jobs scheduled this week
    const scheduledVisitlessJobs = jobs.filter((j: any) => {
      if (jobIdsWithVisits.has(j.jobber_job_id)) return false;
      const s = safeDate(j.scheduled_start_at);
      return s && s.getTime() >= wStartMs && s.getTime() < wEndMs;
    });

    // Revenue: visit revenue (job total / visit count) + visitless job totals
    let scheduledRevenue = 0;
    for (const v of scheduledVisits) {
      const jid = (v as any).jobber_job_id;
      const jobTotal = jobTotalMap.get(jid) || 0;
      const visitCount = jobVisitCountMap.get(jid) || 1;
      scheduledRevenue += Math.round(jobTotal / visitCount);
    }
    for (const j of scheduledVisitlessJobs) {
      scheduledRevenue += Number((j as any).total_amount_cents ?? 0);
    }

    const totalScheduledCount = scheduledVisits.length + scheduledVisitlessJobs.length;
    const revenuePerJob = totalScheduledCount > 0 ? Math.round(scheduledRevenue / totalScheduledCount) : 0;

    // Capacity fill %
    const fillPct = weeklyTargetCents && weeklyTargetCents > 0
      ? Math.round((scheduledRevenue / weeklyTargetCents) * 100) : null;

    // Completed this week: completed visits + completed visitless jobs
    const completedVisits = visits.filter((v: any) => {
      const c = safeDate(v.completed_at);
      return c && c.getTime() >= wStartMs && c.getTime() < wEndMs;
    });
    const completedVisitlessJobs = jobs.filter((j: any) => {
      if (jobIdsWithVisits.has(j.jobber_job_id)) return false;
      const st = (j.status || "").toLowerCase();
      if (!completedStatuses.includes(st)) return false;
      const raw = completedDateKeys.map((k: string) => j[k]).find((v: any) => v);
      const dt = safeDate(raw);
      return dt && dt.getTime() >= wStartMs && dt.getTime() < wEndMs;
    });

    let completedRevenue = 0;
    for (const v of completedVisits) {
      const jid = (v as any).jobber_job_id;
      const jobTotal = jobTotalMap.get(jid) || 0;
      const visitCount = jobVisitCountMap.get(jid) || 1;
      completedRevenue += Math.round(jobTotal / visitCount);
    }
    for (const j of completedVisitlessJobs) {
      completedRevenue += Number((j as any).job_revenue_cents ?? (j as any).total_amount_cents ?? 0);
    }
    const completedCount = completedVisits.length + completedVisitlessJobs.length;

    // Invoices due this week
    const invoicesDue = invoices.filter((inv: any) => {
      const due = safeDate(inv.due_at);
      if (!due) return false;
      const st = (inv.status || "").toLowerCase();
      if (st === "paid" || st === "draft" || st === "voided" || st === "bad_debt") return false;
      return due.getTime() >= wStartMs && due.getTime() < wEndMs;
    });
    const invoicesDueCents = invoicesDue.reduce((s: number, inv: any) => s + Number(inv.balance_cents ?? inv.total_amount_cents ?? 0), 0);

    // Invoices collected (paid this week)
    const collected = invoices.filter((inv: any) => {
      const pd = safeDate(inv.paid_at);
      if (!pd) return false;
      return pd.getTime() >= wStartMs && pd.getTime() < wEndMs && (inv.status || "").toLowerCase() === "paid";
    });
    const collectedCents = collected.reduce((s: number, inv: any) => s + Number(inv.total_amount_cents ?? 0), 0);

    // Quotes sent, won, and lost this week
    const quotesSent = quotes.filter((q: any) => {
      const sent = safeDate(q.sent_at);
      return sent && sent.getTime() >= wStartMs && sent.getTime() < wEndMs;
    });
    const quotesWon = quotes.filter((q: any) => {
      const updated = safeDate(q.updated_at_jobber);
      if (!updated || updated.getTime() < wStartMs || updated.getTime() >= wEndMs) return false;
      return statusLooksWon(String(q.quote_status ?? ""));
    });
    const quotesLost = quotes.filter((q: any) => {
      const updated = safeDate(q.updated_at_jobber);
      if (!updated || updated.getTime() < wStartMs || updated.getTime() >= wEndMs) return false;
      return statusLooksLost(String(q.quote_status ?? ""));
    });
    const quotesWonCents = quotesWon.reduce((s: number, q: any) => s + Number(q.quote_total_cents ?? 0), 0);
    // Sent-but-still-open quotes sent in this period
    const sentStillOpen = quotesSent.filter((q: any) => {
      const st = String(q.quote_status ?? "").toLowerCase();
      return !statusLooksWon(st) && !statusLooksLost(st);
    });
    const winDenom = quotesWon.length + quotesLost.length + sentStillOpen.length;
    const winRate = winDenom > 0 ? Math.round((quotesWon.length / winDenom) * 100) : 0;

    // Needs attention count (overdue + unscheduled + pending requests + changes requested in this window)
    const overdueThisWeek = invoices.filter((inv: any) => {
      const due = safeDate(inv.due_at);
      if (!due) return false;
      const st = (inv.status || "").toLowerCase();
      if (st === "paid" || st === "draft" || st === "voided" || st === "bad_debt") return false;
      return due.getTime() < wStartMs; // was due before this week = overdue
    }).length;

    return {
      jobCount: totalScheduledCount,
      scheduledRevenue,
      revenuePerJob,
      fillPct,
      completedCount,
      completedRevenue,
      invoicesDueCount: invoicesDue.length,
      invoicesDueCents,
      collectedCount: collected.length,
      collectedCents,
      quotesSent: quotesSent.length,
      quotesWon: quotesWon.length,
      quotesWonCents,
      winRate,
      overdueCount: overdueThisWeek,
    };
  }

  const lastWeekSnap = weekSnapshot(lastWeekStart, thisWeekStart);
  const thisWeekSnap = weekSnapshot(thisWeekStart, thisWeekEnd);
  const nextWeekSnap = weekSnapshot(nextWeekStart, nextWeekEnd);

  // Additional period snapshots for the period toggle
  const thisMonthStart = startOfMonthUTC(todayUTC);
  const thisMonthEnd = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth() + 1, 1));
  const lastMonthStart = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth() - 1, 1));
  const thisMonthSnap = weekSnapshot(thisMonthStart, thisMonthEnd);
  const lastMonthSnap = weekSnapshot(lastMonthStart, thisMonthStart);
  const allTimeSnap = weekSnapshot(new Date(0), new Date(Date.now() + 86400000));

  // Compute inline sparklines (8-week point-in-time snapshots)
  type TrendEvent = { enterAt: number; exitAt: number | null; amount: number };
  function computeSparkline(events: TrendEvent[], weeks: number): number[] {
    const points: number[] = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const weekEnd = addDaysUTC(startOfWeekUTC(todayUTC), -7 * w + 7);
      const ts = weekEnd.getTime();
      let sum = 0;
      for (const ev of events) {
        if (ev.enterAt < ts && (ev.exitAt === null || ev.exitAt >= ts)) {
          sum += ev.amount;
        }
      }
      points.push(sum);
    }
    return points;
  }
  const pipelineSparkline = computeSparkline(leakEvents, 8);
  const unschedSparkline = computeSparkline(unschedEvents, 8);
  const overdueSparkline = computeSparkline(arEvents, 8);

  // Collections sparkline — cash received per week (aggregate, not point-in-time)
  const collectionsSparkline: number[] = [];
  for (let w = 7; w >= 0; w--) {
    const wStart = addDaysUTC(startOfWeekUTC(todayUTC), -7 * w);
    const wEnd = addDaysUTC(wStart, 7);
    const wStartMs = wStart.getTime();
    const wEndMs = wEnd.getTime();
    const collected = invoices.filter((inv: any) => {
      const pd = safeDate(inv.paid_at);
      return pd && pd.getTime() >= wStartMs && pd.getTime() < wEndMs && (inv.status || "").toLowerCase() === "paid";
    }).reduce((s: number, inv: any) => s + Number(inv.total_amount_cents ?? 0), 0);
    collectionsSparkline.push(collected);
  }

  // Pre-bucket completed visits and visitless jobs by month key (single pass)
  const _monthRevCache = new Map<string, { revenue: number; count: number }>();
  function _monthKey(d: Date) { return `${d.getUTCFullYear()}-${d.getUTCMonth()}`; }
  for (const v of visits) {
    const c = safeDate((v as any).completed_at);
    if (!c) continue;
    const key = _monthKey(c);
    const entry = _monthRevCache.get(key) || { revenue: 0, count: 0 };
    const jid = (v as any).jobber_job_id;
    const jobTotal = jobTotalMap.get(jid) || 0;
    const vCount = jobVisitCountMap.get(jid) || 1;
    entry.revenue += Math.round(jobTotal / vCount);
    entry.count++;
    _monthRevCache.set(key, entry);
  }
  for (const j of jobs) {
    if (jobIdsWithVisits.has((j as any).jobber_job_id)) continue;
    const st = ((j as any).status || "").toLowerCase();
    if (!completedStatuses.includes(st)) continue;
    const raw = completedDateKeys.map((k: string) => (j as any)[k]).find((v: any) => v);
    const dt = safeDate(raw);
    if (!dt) continue;
    const key = _monthKey(dt);
    const entry = _monthRevCache.get(key) || { revenue: 0, count: 0 };
    entry.revenue += Number((j as any).job_revenue_cents ?? (j as any).total_amount_cents ?? 0);
    entry.count++;
    _monthRevCache.set(key, entry);
  }

  function monthRevenue(mStart: Date, mEnd: Date) {
    // For single-month lookups, use the cache directly
    if (mEnd.getUTCMonth() === (mStart.getUTCMonth() + 1) % 12 ||
        (mEnd.getUTCMonth() === 0 && mStart.getUTCMonth() === 11)) {
      const cached = _monthRevCache.get(_monthKey(mStart));
      return cached || { revenue: 0, count: 0 };
    }
    // Multi-month range: sum buckets
    let rev = 0, count = 0;
    const cursor = new Date(mStart);
    while (cursor < mEnd) {
      const cached = _monthRevCache.get(_monthKey(cursor));
      if (cached) { rev += cached.revenue; count += cached.count; }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return { revenue: rev, count };
  }

  // Revenue sparkline (aggregate per month, last 6 months — uses visit completions)
  const revenueSparkline: number[] = [];
  for (let m = 5; m >= 0; m--) {
    const mStart = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth() - m, 1));
    const mEnd = new Date(Date.UTC(mStart.getUTCFullYear(), mStart.getUTCMonth() + 1, 1));
    revenueSparkline.push(monthRevenue(mStart, mEnd).revenue);
  }

  // Business Pulse: monthly revenue for 12 months (trim leading empty months)
  const pulseMonthsRaw: { label: string; revenueCents: number; completedCount: number; isCurrent: boolean }[] = [];
  for (let m = 11; m >= 0; m--) {
    const mStart = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth() - m, 1));
    const mEnd = new Date(Date.UTC(mStart.getUTCFullYear(), mStart.getUTCMonth() + 1, 1));
    const mLabel = mStart.toLocaleString(undefined, { month: "short", timeZone: "UTC" });
    const mData = monthRevenue(mStart, mEnd);
    pulseMonthsRaw.push({ label: mLabel, revenueCents: mData.revenue, completedCount: mData.count, isCurrent: m === 0 });
  }
  // Trim leading months with no data
  const firstWithData = pulseMonthsRaw.findIndex(m => m.revenueCents > 0 || m.completedCount > 0);
  const pulseMonths = firstWithData >= 0 ? pulseMonthsRaw.slice(firstWithData) : pulseMonthsRaw.slice(-1);

  // Weekly revenue (12 weeks, trim leading empty)
  const pulseWeeksRaw: typeof pulseMonthsRaw = [];
  for (let w = 11; w >= 0; w--) {
    const wStart = addDaysUTC(startOfWeekUTC(todayUTC), -7 * w);
    const wEnd = addDaysUTC(wStart, 7);
    const wLabel = `${wStart.toLocaleString(undefined, { month: "short", timeZone: "UTC" })} ${wStart.getUTCDate()}`;
    const wData = (() => {
      const wStartMs = wStart.getTime(); const wEndMs = wEnd.getTime();
      const cv = visits.filter((v: any) => { const c = safeDate(v.completed_at); return c && c.getTime() >= wStartMs && c.getTime() < wEndMs; });
      let rev = 0;
      for (const v of cv) { const jid = (v as any).jobber_job_id; rev += Math.round((jobTotalMap.get(jid) || 0) / (jobVisitCountMap.get(jid) || 1)); }
      const cj = jobs.filter((j: any) => {
        if (jobIdsWithVisits.has(j.jobber_job_id)) return false;
        const st = (j.status || "").toLowerCase();
        if (!completedStatuses.includes(st)) return false;
        const raw = completedDateKeys.map((k: string) => j[k]).find((v: any) => v);
        const dt = safeDate(raw); return dt && dt.getTime() >= wStartMs && dt.getTime() < wEndMs;
      });
      for (const j of cj) rev += Number((j as any).job_revenue_cents ?? (j as any).total_amount_cents ?? 0);
      return { revenue: rev, count: cv.length + cj.length };
    })();
    pulseWeeksRaw.push({ label: wLabel, revenueCents: wData.revenue, completedCount: wData.count, isCurrent: w === 0 });
  }
  const firstWeekWithData = pulseWeeksRaw.findIndex(w => w.revenueCents > 0 || w.completedCount > 0);
  const pulseWeeks = firstWeekWithData >= 0 ? pulseWeeksRaw.slice(firstWeekWithData) : pulseWeeksRaw.slice(-1);

  // Needs invoicing (computed early for use in recommendations)
  const needsInvoiceJobs = jobs.filter((j: any) => (j.status || "").toLowerCase() === "requires_invoicing");
  const needsInvoiceCount = needsInvoiceJobs.length;
  const needsInvoiceCents = needsInvoiceJobs.reduce((s: number, j: any) => s + Number(j.total_amount_cents ?? 0), 0);

  // Generate recommendations
  const adminQs = adminConnectionId ? `?admin_connection_id=${adminConnectionId}` : "";
  type Recommendation = { headline: string; detail: string; priority: "high" | "medium"; href: string };
  const recommendations: Recommendation[] = [];

  // Overdue invoices — only high if large amount or many invoices
  if (b15p > 0 && totalAR > 0) {
    const agedCount = agedARInvoices.length;
    recommendations.push({
      headline: `Collect ${money(b15p)}`,
      detail: `${agedCount} invoice${agedCount !== 1 ? "s" : ""} overdue 15+ days. Call your oldest accounts today.`,
      priority: agedCount >= 5 || b15p > 500000 ? "high" : "medium",
      href: `/jobber/invoices${adminQs}`,
    });
  }

  // Needs invoicing
  if (needsInvoiceCount > 0) {
    recommendations.push({
      headline: `Bill ${money(needsInvoiceCents)}`,
      detail: `${needsInvoiceCount} completed job${needsInvoiceCount > 1 ? "s aren't" : " isn't"} invoiced yet. Send invoices today.`,
      priority: needsInvoiceCount >= 5 ? "high" : "medium",
      href: `/jobber/invoices${adminQs}`,
    });
  }

  // Changes requested
  if (changesRequestedCount > 0) {
    recommendations.push({
      headline: `Close ${money(changesRequestedCents)} faster`,
      detail: `${changesRequestedCount} quote${changesRequestedCount > 1 ? "s need" : " needs"} your revisions. These clients are ready to buy.`,
      priority: changesRequestedCount >= 3 ? "high" : "medium",
      href: `/jobber/sales${adminQs}`,
    });
  }

  // Unscheduled jobs
  if (unscheduledOlderThan7Days.length > 0) {
    const unschedOldCents = unscheduledOlderThan7Days.reduce((s: number, j: any) => s + Number(j.total_amount_cents ?? 0), 0);
    recommendations.push({
      headline: unschedOldCents > 0 ? `Schedule ${money(unschedOldCents)}` : `Schedule ${unscheduledOlderThan7Days.length} jobs`,
      detail: `${unscheduledOlderThan7Days.length} job${unscheduledOlderThan7Days.length > 1 ? "s" : ""} unscheduled 7+ days. Customers are waiting.`,
      priority: unscheduledOlderThan7Days.length > 5 ? "high" : "medium",
      href: `/jobber/capacity${adminQs}`,
    });
  }

  // Invoices about to age
  if (invoicesHitting7DaysThisWeek.length > 0) {
    const hittingCents = invoicesHitting7DaysThisWeek.reduce((s: number, inv: any) => s + Number(inv.balance_cents ?? inv.total_amount_cents ?? 0), 0);
    recommendations.push({
      headline: `Protect ${money(hittingCents)}`,
      detail: `${invoicesHitting7DaysThisWeek.length} invoice${invoicesHitting7DaysThisWeek.length > 1 ? "s" : ""} hitting 7 days overdue this week. Send reminders now.`,
      priority: "medium",
      href: `/jobber/invoices${adminQs}`,
    });
  }

  // Quote follow-up
  if (leakCount > 3) {
    const potentialWin = Math.round(leakDollars * 0.25);
    recommendations.push({
      headline: `Win back ${money(potentialWin)}`,
      detail: `${leakCount} quotes worth ${money(leakDollars)} going cold. Follow up on the largest ones today.`,
      priority: "medium",
      href: `/jobber/sales${adminQs}`,
    });
  }

  // Low margins
  if (completedCount >= 5 && marginPerJob > 0) {
    const marginPct = profitSum / revSum;
    if (marginPct < 0.20) {
      recommendations.push({
        headline: `Margins at ${pct(marginPct)}`,
        detail: `You're leaving money on the table. Review pricing or cut material costs to hit 25%+.`,
        priority: "medium",
        href: `/jobber/capacity${adminQs}`,
      });
    }
  }

  // Prepare data for ExportCSV components
  const agedARExportData = agedARInvoices.map((inv) => ({
    "Age (days)": inv.days_overdue,
    "Invoice #": inv.invoice_number,
    "Client": inv.client_name || "",
    "Due Date": inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "",
    "Amount": (inv.amount_cents / 100).toFixed(2),
    "Jobber URL": inv.jobber_url || "",
  }));

  const unscheduledExportData = unscheduledRows.map((r: any) => ({
    "Age (days)": ageDays(r.created_at_jobber),
    "Job #": r.job_number ? `#${r.job_number}` : "",
    "Job Title": r.job_title || "Untitled job",
    "Created": r.created_at_jobber ? new Date(r.created_at_jobber).toLocaleDateString() : "",
    "Amount": r.total_amount_cents ? (r.total_amount_cents / 100).toFixed(2) : "",
    "Jobber URL": r.jobber_url || "",
  }));

  const leakingQuotesExportData = leakCandidates
    .slice()
    .sort((a: any, b: any) => Number(b.quote_total_cents ?? 0) - Number(a.quote_total_cents ?? 0))
    .map((q: any) => {
      const sent = safeDate(q.sent_at);
      const age = sent ? Math.max(0, Math.round((Date.now() - sent.getTime()) / 86400000)) : 0;
      return {
        "Age (days)": age,
        "Quote #": q.quote_number || "",
        "Quote Title": q.quote_title || "Untitled quote",
        "Sent": sent ? sent.toLocaleDateString() : "",
        "Total": ((Number(q.quote_total_cents ?? 0)) / 100).toFixed(2),
        "Jobber URL": q.quote_url || "",
      };
    });

  const sevColor = (sev: "critical" | "warning" | "good") => {
    if (sev === "critical") return "#ef4444";
    if (sev === "warning") return "#f59e0b";
    return "#10b981";
  };

  const sevBg = (sev: "critical" | "warning" | "good") => {
    if (sev === "critical") return "rgba(239,68,68,0.15)";
    if (sev === "warning") return "rgba(245,158,11,0.15)";
    return "rgba(16,185,129,0.15)";
  };

  /* ===== Revenue & collection metrics ===== */
  const nextMonthStart = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth() + 1, 1));

  const thisMonthData = monthRevenue(thisMonthStart, nextMonthStart);
  const lastMonthData = monthRevenue(lastMonthStart, thisMonthStart);
  const revenueThisMonth = thisMonthData.revenue;
  const completedThisMonthCount = thisMonthData.count;
  const revenueLastMonth = lastMonthData.revenue;

  // Pipeline value (open quotes, not won/lost/draft, last 6 months only)
  const pipelineQuotes = quotes.filter((q: any) => {
    const st = String(q.quote_status ?? "").toUpperCase();
    if (statusLooksWon(st) || statusLooksLost(st) || st === "DRAFT") return false;
    const sent = safeDate(q.sent_at) || safeDate(q.created_at_jobber);
    return sent && sent.getTime() >= sixMonthsAgoMs;
  });
  const pipelineValue = pipelineQuotes.reduce((s: number, q: any) => s + Number(q.quote_total_cents ?? 0), 0);

  // Revenue delta
  const revDelta = revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) : null;
  const thisMonthName = new Date().toLocaleString(undefined, { month: "long" });

  /* ===== Business Health Score ===== */
  // 3 categories, each maps to a tab: Sales, Capacity, Invoices

  // SALES score (0-100): win rate + cold quotes + open requests + changes requested
  // Uses 90-day window — responsive to recent improvements
  let salesScore = 85;
  if (quotes.length > 0 || openRequestsCount > 0) {
    // Win rate component (0-35 pts)
    const winPts = quoteWonPct >= 0.4 ? 35 : quoteWonPct >= 0.25 ? 28 : quoteWonPct >= 0.1 ? 18 : 8;

    // Cold quote component (0-35 pts) — % of open quotes going cold (30+ days quiet)
    const openQuotesForScore = quotes.filter((q: any) => {
      const st = String(q.quote_status ?? "").toUpperCase();
      if (statusLooksWon(st) || statusLooksLost(st) || !q.sent_at) return false;
      const sent = safeDate(q.sent_at);
      return sent && sent.getTime() >= ninetyDaysAgoMs;
    });
    const coldQuotes = openQuotesForScore.filter((q: any) => {
      const updated = safeDate(q.updated_at_jobber);
      if (!updated) return true;
      return (nowMs - updated.getTime()) / 86400000 >= 30;
    });
    const coldPct = openQuotesForScore.length > 0 ? coldQuotes.length / openQuotesForScore.length : 0;
    const coldPts = coldPct === 0 ? 35 : coldPct <= 0.2 ? 28 : coldPct <= 0.5 ? 18 : 8;

    // Response speed component (0-30 pts) — avg age of open requests + changes requested
    const openReqs = requests.filter((r: any) => {
      const status = (r.request_status || "").toUpperCase();
      if (status !== "NEW" && status !== "PENDING" && status !== "UNSCHEDULED" && status !== "ASSESSMENT_COMPLETED" && status !== "ACTION_REQUIRED") return false;
      const created = safeDate(r.created_at_jobber);
      return created && created.getTime() >= ninetyDaysAgoMs;
    });
    const pendingCount = openReqs.length + changesRequestedCount;
    let responsePts = 30;
    if (pendingCount > 0) {
      const avgAge = openReqs.length > 0
        ? openReqs.reduce((s: number, r: any) => {
            const created = safeDate(r.created_at_jobber);
            return s + (created ? (nowMs - created.getTime()) / 86400000 : 0);
          }, 0) / openReqs.length
        : 0;
      if (avgAge < 2 && changesRequestedCount === 0) responsePts = 30;
      else if (avgAge < 3 && changesRequestedCount <= 1) responsePts = 25;
      else if (avgAge < 5) responsePts = 18;
      else if (avgAge < 7) responsePts = 12;
      else responsePts = 5;
    }

    salesScore = Math.max(50, winPts + coldPts + responsePts);
  }

  // CAPACITY score (0-100): unscheduled ratio (90-day window)
  let capacityScore = 85;
  const activeJobs = jobs.filter((j: any) => {
    const st = (j.status || "").toLowerCase();
    if (st === "completed" || st === "archived" || st === "cancelled") return false;
    const created = safeDate(j.created_at_jobber);
    return created && created.getTime() >= ninetyDaysAgoMs;
  });
  if (activeJobs.length > 0) {
    const unschedPct = unscheduledCount / activeJobs.length;
    if (unschedPct === 0) capacityScore = 100;
    else if (unschedPct < 0.1) capacityScore = 85;
    else if (unschedPct < 0.25) capacityScore = 65;
    else if (unschedPct < 0.5) capacityScore = 50;
    else capacityScore = 50;
  }

  // INVOICES score (0-100): based on % of AR that's 15+ days
  let invoicesScore = 85;
  if (unpaidInvoices.length > 0) {
    const aged15Pct = totalAR > 0 ? b15p / totalAR : 0;
    if (totalAR === 0) invoicesScore = 100;
    else if (aged15Pct === 0) invoicesScore = 95;
    else if (aged15Pct <= 0.1) invoicesScore = 80;
    else if (aged15Pct <= 0.25) invoicesScore = 60;
    else if (aged15Pct <= 0.5) invoicesScore = 50;
    else invoicesScore = 50;
  }

  const rawHealthScore = Math.round((salesScore + capacityScore + invoicesScore) / 3);
  const healthScore = Math.max(50, rawHealthScore);

  // Readable metrics for breakdown
  const aged15PctDisplay = totalAR > 0 ? Math.round((b15p / totalAR) * 100) : 0;
  const unschedPctDisplay = activeJobs.length > 0 ? Math.round((unscheduledCount / activeJobs.length) * 100) : 0;

  const healthBreakdown = [
    {
      label: "Sales",
      score: salesScore,
      detail: `${pct(quoteWonPct)} win rate \u2022 ${leakCount} open quotes \u2022 ${openRequestsCount + changesRequestedCount} pending action`,
      action: salesScore >= 80 ? "Looking good" : salesScore >= 60 ? "Follow up on cold quotes" : "Urgent: respond to pending quotes",
      href: `/jobber/sales${adminQs}`,
    },
    {
      label: "Capacity",
      score: capacityScore,
      detail: activeJobs.length === 0
        ? "No active jobs yet"
        : `${unschedPctDisplay}% of jobs unscheduled \u2022 target: under 10%`,
      action: capacityScore >= 80 ? "Schedule is healthy" : capacityScore >= 60 ? "Schedule unbooked jobs" : "Urgent: jobs need scheduling",
      href: `/jobber/capacity${adminQs}`,
    },
    {
      label: "Invoices",
      score: invoicesScore,
      detail: totalAR === 0
        ? "No overdue invoices"
        : `${aged15PctDisplay}% of overdue amount is 15+ days old \u2022 target: under 10%`,
      action: invoicesScore >= 80 ? "Collections on track" : invoicesScore >= 60 ? "Send payment reminders" : "Urgent: call overdue accounts",
      href: `/jobber/invoices${adminQs}`,
    },
  ];

  /* ===== Money flow funnel ===== */
  const scheduledActiveJobs = jobs.filter((j: any) => {
    if (!j.scheduled_start_at) return false;
    const st = (j.status || "").toLowerCase();
    return st !== "completed" && st !== "archived" && st !== "cancelled" && st !== "requires_invoicing";
  });
  const scheduledActiveCents = scheduledActiveJobs.reduce((s: number, j: any) => s + Number(j.total_amount_cents ?? 0), 0);

  const funnelStages = [
    { label: "Leads", count: openRequestsCount, value: null, icon: "\uD83D\uDCE5", href: `/jobber/sales${adminQs}`, color: "#8b5cf6", unitLabel: "requests" },
    { label: "Quoting", count: pipelineQuotes.length, value: pipelineValue > 0 ? money(pipelineValue) : null, icon: "\uD83D\uDCDD", href: `/jobber/sales${adminQs}`, color: "#5aa6ff", unitLabel: "quotes" },
    { label: "Won", count: approvedNoJobCount, value: approvedNoJobCents > 0 ? money(approvedNoJobCents) : null, icon: "\uD83C\uDFC6", href: `/jobber/sales${adminQs}`, color: "#10b981", unitLabel: "quotes" },
    { label: "Scheduled", count: scheduledActiveJobs.length, value: scheduledActiveCents > 0 ? money(scheduledActiveCents) : null, icon: "\uD83D\uDCC5", href: `/jobber/capacity${adminQs}`, color: "#06b6d4", unitLabel: "jobs" },
    { label: "Needs Invoice", count: needsInvoiceCount, value: needsInvoiceCents > 0 ? money(needsInvoiceCents) : null, icon: "\uD83D\uDCC4", href: `/jobber/invoices${adminQs}`, color: "#8b5cf6", unitLabel: "jobs" },
    { label: "Outstanding", count: totalPastDueCount, value: totalAR > 0 ? money(totalAR) : null, icon: "\uD83D\uDCB0", href: `/jobber/invoices${adminQs}`, color: "#f59e0b", unitLabel: "invoices" },
  ];

  return (
    <main className="dashboard-main" style={{
      minHeight: "100vh",
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: `
        radial-gradient(ellipse 80% 60% at 50% -20%, rgba(124,92,255,0.15), transparent),
        radial-gradient(ellipse 60% 40% at 100% 0%, rgba(90,166,255,0.1), transparent),
        linear-gradient(180deg, #060811 0%, #0a1020 100%)
      `,
    }}>
      <style>{globalStyles}</style>
      {!adminConnectionId && <AnalyticsProvider connectionId={connectionId} />}

      <ErrorBoundary>
      <div className="dashboard-container">
        <DashboardTopbar
          companyName={companyName}
          lastSyncPretty={lastSyncPretty}
          connectionId={connectionId}
          billingStatus={billingStatus}
          trialEndsAt={trialEndsAt}
          subscriptionActive={subscriptionActive}
          adminConnectionId={adminConnectionId}
          autoSync={retrySync}
        />

        {/* Empty State - Show when no data */}
        {invoices.length === 0 && jobs.length === 0 && quotes.length === 0 && (
          <div className="panel animate-in delay-1" style={{ 
            marginTop: 20, 
            padding: 32,
            textAlign: "center",
            background: "linear-gradient(145deg, rgba(124,92,255,0.1) 0%, rgba(90,166,255,0.05) 100%)",
            border: "1px solid rgba(124,92,255,0.2)",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Welcome to AccuInsight!</h2>
            <p style={{ fontSize: 15, opacity: 0.7, marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
              Let&apos;s pull in your Jobber data so you can see your business insights.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <SyncButton connectionId={connectionId} />
              <p style={{ fontSize: 13, opacity: 0.5 }}>
                This usually takes 1-2 minutes depending on your data volume.
              </p>
            </div>
            <div style={{ 
              marginTop: 32, 
              paddingTop: 24, 
              borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              justifyContent: "center",
              gap: 24,
              flexWrap: "wrap",
            }}>
              <a 
                href="https://ownerview.io/getting-started-with-accuinsight" 
                target="_blank" 
                rel="noreferrer"
                style={{ 
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 20px",
                  borderRadius: 10,
                  background: "rgba(124,92,255,0.15)",
                  border: "1px solid rgba(124,92,255,0.3)",
                  fontSize: 14,
                  color: "#a5b4fc", 
                  textDecoration: "none",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                }}
              >
                📖 Getting Started Guide
              </a>
              <a 
                href="https://ownerview.io/accuinsight-faq" 
                target="_blank" 
                rel="noreferrer"
                style={{ 
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 20px",
                  borderRadius: 10,
                  background: "rgba(90,166,255,0.15)",
                  border: "1px solid rgba(90,166,255,0.3)",
                  fontSize: 14,
                  color: "#93c5fd", 
                  textDecoration: "none",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                }}
              >
                ❓ FAQ
              </a>
            </div>
          </div>
        )}

        {/* Sync Error Banner */}
        {syncError && (
          <div className="animate-in delay-1" style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 14,
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 600, color: "#fca5a5" }}>Sync failed</div>
              <div style={{ fontSize: 13, color: "rgba(234,241,255,0.7)", marginTop: 2 }}>
                {decodeURIComponent(syncError)}. <a href="/jobber/dashboard" style={{ color: "#5aa6ff" }}>Try again</a>
              </div>
            </div>
          </div>
        )}

        {/* ===== Week at a Glance — top KPI cards ===== */}
        <div data-tour="week-glance" className="animate-in delay-1" style={{ marginTop: 20 }}>
          <WeekGlance
            lastWeek={lastWeekSnap}
            thisWeek={thisWeekSnap}
            nextWeek={nextWeekSnap}
            thisMonth={thisMonthSnap}
            lastMonth={lastMonthSnap}
            allTime={allTimeSnap}
            currencyCode={currencyCode}
            sparklines={{
              revenue: revenueSparkline,
              pipeline: pipelineSparkline,
              collections: collectionsSparkline,
              unscheduled: unschedSparkline,
            }}
          />
        </div>

        {/* ===== Business Pulse — revenue chart ===== */}
        <div data-tour="revenue-chart" className="panel animate-in delay-1" style={{ marginTop: 16, padding: "24px 28px", overflow: "visible" }}>
          <BusinessPulse
            months={pulseMonths}
            weeks={pulseWeeks}
            currencyCode={currencyCode}
          />
        </div>

        {/* ===== This Week's Focus + Money Flow ===== */}
        <div data-tour="recommendations" className="side-by-side animate-in delay-2" style={{ marginTop: 16 }}>
          {/* Left: Recommendations */}
          <div className="panel" style={{ padding: "18px 20px", overflow: "visible", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 className="text-primary" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>This Week&apos;s Focus</h2>
              {recommendations.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(90,166,255,0.1)", color: "#5aa6ff" }}>
                  {recommendations.length} {recommendations.length === 1 ? "item" : "items"}
                </span>
              )}
            </div>
            {recommendations.length > 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                {recommendations.slice(0, 4).map((rec, i) => {
                  const prioColor = rec.priority === "high" ? "#f59e0b" : "#5aa6ff";
                  const prioClass = rec.priority === "high" ? "rec-card-high" : "rec-card-medium";
                  return (
                    <a key={i} href={rec.href} className={`rec-card ${prioClass}`} style={{ borderLeft: `3px solid ${prioColor}`, flexDirection: "column", gap: 3, padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                        <span className="text-primary" style={{ fontSize: 14, fontWeight: 700 }}>{rec.headline}</span>
                        <span style={{ fontSize: 12, flexShrink: 0, fontWeight: 600, color: prioColor }}>&rarr;</span>
                      </div>
                      <span className="text-muted" style={{ fontSize: 12, lineHeight: 1.4 }}>{rec.detail}</span>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted" style={{ textAlign: "center", padding: 32, fontSize: 14, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                Nothing urgent — you&apos;re on top of things.
              </div>
            )}
          </div>

          {/* Right: Money Flow */}
          <div className="panel" style={{ padding: "18px 20px", overflow: "visible", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 className="text-primary" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Money Flow</h2>
              <span className="info-tooltip">?<span className="tooltip-text">Where work and money sit in your pipeline. Click any stage to drill in.</span></span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <MoneyFlowList stages={funnelStages} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={{
          marginTop: 40,
          paddingTop: 24,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
          fontSize: 12,
          color: "rgba(234,241,255,0.4)",
        }}>
          <p style={{ margin: "0 0 12px" }}>
            Need help?{" "}
            <a href="https://ownerview.io/accuinsight-faq" target="_blank" rel="noreferrer" style={{ color: "rgba(234,241,255,0.6)", textDecoration: "none", fontWeight: 500 }}>FAQ</a>
            {" · "}
            <a href="https://ownerview.io/getting-started-with-accuinsight" target="_blank" rel="noreferrer" style={{ color: "rgba(234,241,255,0.6)", textDecoration: "none", fontWeight: 500 }}>Get Started Guide</a>
          </p>
          <p style={{ margin: 0 }}>© 2026 OwnerView. All rights reserved.</p>
          <p style={{ margin: "8px 0 0" }}>
            <a href="/terms" style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none" }}>Terms</a>
            {" · "}
            <a href="/privacy" style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none" }}>Privacy</a>
            {" · "}
            <DisconnectJobberButton />
          </p>
        </footer>
      </div>
      {/* Onboarding overlay */}
      {!isDemo && (
        <OnboardingOverlay
          state={{
            hasData: jobs.length > 0 || invoices.length > 0,
            weeklyTargetSet: !!(conn?.weekly_capacity_cents),
            trialDaysLeft: trialEndsAt > Date.now() ? Math.ceil((trialEndsAt - Date.now()) / 86400000) : 0,
          }}
          connectionId={connectionId}
          adminConnectionId={adminConnectionId}
        />
      )}
      </ErrorBoundary>
    </main>
  );
}

