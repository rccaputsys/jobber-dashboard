// src/app/jobber/dashboard/page.tsx
import React from "react";
import { unstable_cache } from "next/cache";
import { supabaseAdmin, fetchAllRows } from "@/lib/supabaseAdmin";
import { SyncButton } from "./SyncButton";
import { getUser } from "@/lib/supabaseAuth";
import { redirect } from "next/navigation";
import { AnalyticsProvider } from "./AnalyticsProvider";
import { AttentionList } from "./AttentionList";
import { CapacityTargetDisplay } from "./CapacityTargetDisplay";
import { InlineCapacityEditor } from "./InlineCapacityEditor";
import { FlipCard } from "./FlipCard";
import { OnboardingOverlay } from "./OnboardingOverlay";
import { ErrorBoundary } from "./ErrorBoundary";
import { DashboardLayout } from "./DashboardLayout";
import { globalStyles, theme } from "@/lib/dashboardHelpers";

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
    sync_error?: string;
    admin_connection_id?: string;
    retry_sync?: string;
  }>;
}) {
  const sp = await searchParams;
  const syncError = sp.sync_error;
  const retrySync = sp.retry_sync === "true";

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
        <div style={{ padding: 24, color: "#EAF1FF", minHeight: "100%", background: "#060811" }}>
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
        <div style={{ padding: 24, color: "#EAF1FF", minHeight: "100%", background: "#060811" }}>
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
    .select("last_sync_at,trial_started_at,trial_ends_at,billing_status,currency_code,company_name,jobber_account_name,weekly_capacity_cents,monthly_capacity_cents,capacity_daily_targets,capacity_work_days,capacity_targets_set,annual_sales_target_cents,close_rate_target")
    .eq("id", connectionId)
    .maybeSingle();

  // Brand-new connections (never synced) go through the onboarding sync page.
  // Admin impersonation skips this so we can still inspect empty connections.
  if (!adminConnectionId && conn && !conn.last_sync_at) {
    redirect("/jobber/syncing");
  }

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
        minHeight: "100%",
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

  // Fetch facts IN PARALLEL (paginated to bypass PostgREST max_rows=100).
  // Cache per-connection for 60s — webhook updates show up within a minute,
  // and a page reload is free in the meantime. Keyed by connection_id so
  // users never see each other's data. Tag allows future explicit busting.
  const fetchFacts = unstable_cache(
    async (connId: string) => {
      return Promise.all([
        fetchAllRows("fact_invoices", "status,balance_cents,total_amount_cents,due_at,paid_at,invoice_number,client_name,jobber_invoice_id,jobber_url", connId),
        fetchAllRows("fact_jobs", "jobber_job_id,status,total_amount_cents,job_revenue_cents,job_cost_cents,job_profit_cents,scheduled_start_at,scheduled_end_at,created_at_jobber,updated_at_jobber,jobber_url,job_number,job_title", connId),
        fetchAllRows("fact_quotes", "jobber_quote_id,quote_number,quote_title,quote_status,quote_total_cents,quote_url,sent_at,updated_at_jobber,created_at_jobber", connId),
        fetchAllRows("fact_requests", "jobber_request_id,title,request_status,source,client_name,jobber_url,created_at_jobber", connId),
        fetchAllRows("fact_visits", "jobber_visit_id,jobber_job_id,title,visit_status,is_complete,start_at,completed_at,duration_minutes,visit_revenue_cents", connId),
      ]);
    },
    ["dashboard-facts"],
    { revalidate: 60, tags: [`dashboard-facts:${connectionId}`] },
  );
  const [invoices, jobs, quotes, requests, visits] = await fetchFacts(connectionId);
  // Open requests count (PENDING = not yet converted/archived/closed)
  const openRequestsCount = requests.filter((r: any) => {
  const status = (r.request_status || "").toUpperCase();
  // Open requests: NEW, PENDING, UNSCHEDULED, or ASSESSMENT_COMPLETED (action required)
  return status === "NEW" || status === "PENDING" || status === "UNSCHEDULED" || status === "ASSESSMENT_COMPLETED" || status === "ACTION_REQUIRED";
}).length;

  // AR buckets - only unpaid invoices
  const nowMs = Date.now();
  let b0_7 = 0, b8_14 = 0, b15p = 0, totalAR = 0;
  let totalPastDueCount = 0, b0_7Count = 0, b8_14Count = 0, b15pCount = 0;
  let currentCents = 0, currentCount = 0;

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

    if (days > 0) {
      // Past due
      totalAR += amt;
      totalPastDueCount += 1;
      if (days <= 7) { b0_7 += amt; b0_7Count++; }
      else if (days <= 14) { b8_14 += amt; b8_14Count++; }
      else { b15p += amt; b15pCount++; }
    } else {
      // Current — not yet due
      currentCents += amt;
      currentCount++;
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
  // Draft invoices (unsent)
  const draftInvoices = invoices.filter((inv: any) => (inv.status || '').toLowerCase() === 'draft');
  const draftInvoiceCount = draftInvoices.length;
  const draftInvoiceCents = draftInvoices.reduce((s: number, inv: any) => s + Number(inv.total_amount_cents ?? 0), 0);

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
  const annualSalesTargetCents: number | null = (conn as any)?.annual_sales_target_cents ?? null;
  const closeRateTarget: number | null = (conn as any)?.close_rate_target ?? null;

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
  const monthlyCapacityCents: number | null = (conn as any)?.monthly_capacity_cents ?? null;

  // Capacity chart: compute scheduled revenue per week/month
  function capacityPeriodRevenue(start: Date, end: Date) {
    const startMs = start.getTime(), endMs = end.getTime();
    let rev = 0, count = 0;
    for (const v of visits) {
      const s = safeDate(v.start_at);
      if (s && s.getTime() >= startMs && s.getTime() < endMs) {
        const jid = v.jobber_job_id;
        const total = jobTotalMap.get(jid) || 0;
        const vc = jobVisitCountMap.get(jid) || 1;
        rev += Math.round(total / vc);
        count++;
      }
    }
    for (const j of jobs) {
      if (jobIdsWithVisits.has((j as any).jobber_job_id)) continue;
      const s = safeDate((j as any).scheduled_start_at);
      if (s && s.getTime() >= startMs && s.getTime() < endMs) {
        rev += Number((j as any).total_amount_cents ?? 0);
        count++;
      }
    }
    return { rev, count };
  }

  // Suggested weekly target: average of last 12 weeks (non-zero weeks only)
  let suggestedWeeklyTarget = 0;
  {
    const weekRevs: number[] = [];
    for (let w = -12; w <= -1; w++) {
      const wStart = addDaysUTC(thisWeekStart, w * 7);
      const wEnd = addDaysUTC(wStart, 7);
      const { rev } = capacityPeriodRevenue(wStart, wEnd);
      if (rev > 0) weekRevs.push(rev);
    }
    if (weekRevs.length >= 3) {
      suggestedWeeklyTarget = Math.round(weekRevs.reduce((a, b) => a + b, 0) / weekRevs.length);
    }
  }

  const capacityWeeks: { label: string; revenueCents: number; count: number; isCurrent: boolean; isFuture: boolean }[] = [];
  for (let w = -4; w <= 3; w++) {
    const wStart = addDaysUTC(thisWeekStart, w * 7);
    const wEnd = addDaysUTC(wStart, 7);
    const { rev, count } = capacityPeriodRevenue(wStart, wEnd);
    const month = wStart.toLocaleString(undefined, { month: "short", timeZone: "UTC" });
    const day = wStart.getUTCDate();
    capacityWeeks.push({ label: `${month} ${day}`, revenueCents: rev, count, isCurrent: w === 0, isFuture: w > 0 });
  }

  const capacityMonths: typeof capacityWeeks = [];
  for (let m = -3; m <= 2; m++) {
    const mStart = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth() + m, 1));
    const mEnd = new Date(Date.UTC(mStart.getUTCFullYear(), mStart.getUTCMonth() + 1, 1));
    const { rev, count } = capacityPeriodRevenue(mStart, mEnd);
    capacityMonths.push({ label: mStart.toLocaleString(undefined, { month: "short", timeZone: "UTC" }), revenueCents: rev, count, isCurrent: m === 0, isFuture: m > 0 });
  }

  // Auto weekly target: average work-day revenue of last 4 completed weeks
  const _workDays: string[] = (conn as any)?.capacity_work_days || ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const _allDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const autoWeeklyTargetCents = (() => {
    let total = 0;
    for (let w = 1; w <= 4; w++) {
      const wStart = addDaysUTC(thisWeekStart, -7 * w);
      for (let d = 0; d < 7; d++) {
        if (!_workDays.includes(_allDayLabels[d])) continue;
        const dStart = addDaysUTC(wStart, d);
        const dEnd = addDaysUTC(dStart, 1);
        total += capacityPeriodRevenue(dStart, dEnd).rev;
      }
    }
    return total > 0 ? Math.round(total / 4) : 0;
  })();
  const effectiveWeeklyTarget = weeklyTargetCents || autoWeeklyTargetCents;
  const isAutoCapacity = !weeklyTargetCents && autoWeeklyTargetCents > 0;

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

    // Revenue: prefer visit line item revenue, fall back to duration-weighted, then equal split
    let scheduledRevenue = 0;
    for (const v of scheduledVisits) {
      const visitRev = Number((v as any).visit_revenue_cents ?? 0);
      if (visitRev > 0) {
        scheduledRevenue += visitRev;
      } else {
        const jid = (v as any).jobber_job_id;
        const jobTotal = jobTotalMap.get(jid) || 0;
        const visitCount = jobVisitCountMap.get(jid) || 1;
        // Duration-weighted if available, else equal split
        const vDuration = Number((v as any).duration_minutes ?? 0);
        const totalDuration = scheduledVisits.filter((sv: any) => sv.jobber_job_id === jid).reduce((s: number, sv: any) => s + Number(sv.duration_minutes ?? 0), 0);
        if (vDuration > 0 && totalDuration > 0) {
          scheduledRevenue += Math.round(jobTotal * (vDuration / totalDuration));
        } else {
          scheduledRevenue += Math.round(jobTotal / visitCount);
        }
      }
    }
    for (const j of scheduledVisitlessJobs) {
      scheduledRevenue += Number((j as any).total_amount_cents ?? 0);
    }

    const totalScheduledCount = scheduledVisits.length + scheduledVisitlessJobs.length;
    const revenuePerJob = totalScheduledCount > 0 ? Math.round(scheduledRevenue / totalScheduledCount) : 0;

    // Capacity fill %
    const fillPct = effectiveWeeklyTarget > 0
      ? Math.round((scheduledRevenue / effectiveWeeklyTarget) * 100) : null;

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
      const visitRev = Number((v as any).visit_revenue_cents ?? 0);
      if (visitRev > 0) {
        completedRevenue += visitRev;
        continue;
      }
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
    // Sent-but-still-open: quotes sent in period that are NOT yet won or lost
    const wonIds = new Set(quotesWon.map((q: any) => q.jobber_quote_id));
    const lostIds = new Set(quotesLost.map((q: any) => q.jobber_quote_id));
    const sentStillOpen = quotesSent.filter((q: any) => {
      return !wonIds.has(q.jobber_quote_id) && !lostIds.has(q.jobber_quote_id);
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
    const visitRev = Number((v as any).visit_revenue_cents ?? 0);
    if (visitRev > 0) {
      entry.revenue += visitRev;
    } else {
      const jid = (v as any).jobber_job_id;
      const jobTotal = jobTotalMap.get(jid) || 0;
      const vCount = jobVisitCountMap.get(jid) || 1;
      entry.revenue += Math.round(jobTotal / vCount);
    }
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
  type Recommendation = { headline: string; detail: string; priority: "high" | "medium"; href: string; amount?: number; icon: string; color: string; tab: string };
  const recommendations: Recommendation[] = [];

  // Overdue invoices
  if (b15p > 0 && totalAR > 0) {
    const agedCount = agedARInvoices.length;
    recommendations.push({
      headline: `${agedCount} overdue invoice${agedCount !== 1 ? "s" : ""}`,
      detail: `Past due 15+ days. Call your oldest accounts first.`,
      priority: agedCount >= 5 || b15p > 500000 ? "high" : "medium",
      href: `/jobber/invoices${adminQs}`,
      amount: b15p,
      icon: "collect",
      color: "#ef4444",
      tab: "Invoices",
    });
  }

  // Needs invoicing
  if (needsInvoiceCount > 0) {
    recommendations.push({
      headline: `${needsInvoiceCount} job${needsInvoiceCount > 1 ? "s" : ""} need invoicing`,
      detail: `Work is done but you haven't billed for it yet.`,
      priority: needsInvoiceCount >= 5 ? "high" : "medium",
      href: `/jobber/invoices${adminQs}`,
      amount: needsInvoiceCents,
      icon: "bill",
      color: "#f59e0b",
      tab: "Invoices",
    });
  }

  // Changes requested
  if (changesRequestedCount > 0) {
    recommendations.push({
      headline: `${changesRequestedCount} quote${changesRequestedCount > 1 ? "s" : ""} need revisions`,
      detail: `These clients asked for changes. They're ready to buy once you update.`,
      priority: changesRequestedCount >= 3 ? "high" : "medium",
      href: `/jobber/sales${adminQs}`,
      amount: changesRequestedCents,
      icon: "revise",
      color: "#f59e0b",
      tab: "Sales",
    });
  }

  // Unscheduled jobs
  if (unscheduledOlderThan7Days.length > 0) {
    const unschedOldCents = unscheduledOlderThan7Days.reduce((s: number, j: any) => s + Number(j.total_amount_cents ?? 0), 0);
    recommendations.push({
      headline: `${unscheduledOlderThan7Days.length} job${unscheduledOlderThan7Days.length > 1 ? "s" : ""} not scheduled`,
      detail: `Sitting unbooked for 7+ days. Customers are waiting on you.`,
      priority: unscheduledOlderThan7Days.length > 5 ? "high" : "medium",
      href: `/jobber/capacity${adminQs}`,
      amount: unschedOldCents,
      icon: "schedule",
      color: "#5aa6ff",
      tab: "Capacity",
    });
  }

  // Invoices about to age
  if (invoicesHitting7DaysThisWeek.length > 0) {
    const hittingCents = invoicesHitting7DaysThisWeek.reduce((s: number, inv: any) => s + Number(inv.balance_cents ?? inv.total_amount_cents ?? 0), 0);
    recommendations.push({
      headline: `${invoicesHitting7DaysThisWeek.length} invoice${invoicesHitting7DaysThisWeek.length > 1 ? "s" : ""} aging this week`,
      detail: `About to hit 7 days overdue. Send a reminder before they go stale.`,
      priority: "medium",
      href: `/jobber/invoices${adminQs}`,
      amount: hittingCents,
      icon: "aging",
      color: "#f59e0b",
      tab: "Invoices",
    });
  }

  // Quote follow-up
  if (leakCount > 3) {
    recommendations.push({
      headline: `${leakCount} quotes going cold`,
      detail: `These have been sitting with no response. Follow up on the big ones today.`,
      priority: "medium",
      href: `/jobber/sales${adminQs}`,
      amount: leakDollars,
      icon: "followup",
      color: "#5aa6ff",
      tab: "Sales",
    });
  }

  // Low margins
  if (completedCount >= 5 && marginPerJob > 0) {
    const marginPct = profitSum / revSum;
    if (marginPct < 0.20) {
      recommendations.push({
        headline: `Margins at ${pct(marginPct)}`,
        detail: `Below 25%. Review your pricing or material costs.`,
        priority: "medium",
        href: `/jobber/capacity${adminQs}`,
        icon: "margin",
        color: "#ef4444",
        tab: "Capacity",
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
    { label: "Leads", count: openRequestsCount, value: null, icon: "\uD83D\uDCE5", href: `/jobber/sales${adminQs}`, color: "#5aa6ff", unitLabel: "requests" },
    { label: "Quoting", count: pipelineQuotes.length, value: pipelineValue > 0 ? money(pipelineValue) : null, icon: "\uD83D\uDCDD", href: `/jobber/sales${adminQs}`, color: "#5aa6ff", unitLabel: "quotes" },
    { label: "Won", count: approvedNoJobCount, value: approvedNoJobCents > 0 ? money(approvedNoJobCents) : null, icon: "\uD83C\uDFC6", href: `/jobber/sales${adminQs}`, color: "#10b981", unitLabel: "quotes" },
    { label: "Scheduled", count: scheduledActiveJobs.length, value: scheduledActiveCents > 0 ? money(scheduledActiveCents) : null, icon: "\uD83D\uDCC5", href: `/jobber/capacity${adminQs}`, color: "#06b6d4", unitLabel: "jobs" },
    { label: "Needs Invoice", count: needsInvoiceCount, value: needsInvoiceCents > 0 ? money(needsInvoiceCents) : null, icon: "\uD83D\uDCC4", href: `/jobber/invoices${adminQs}`, color: "#5aa6ff", unitLabel: "jobs" },
    { label: "Outstanding", count: totalPastDueCount, value: totalAR > 0 ? money(totalAR) : null, icon: "\uD83D\uDCB0", href: `/jobber/invoices${adminQs}`, color: "#f59e0b", unitLabel: "invoices" },
  ];

  return (
    <main className="dashboard-main" style={{
      minHeight: "100%",
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: "linear-gradient(180deg, #0b0e14 0%, #0f1219 100%)",
    }}>
      <DashboardLayout adminConnectionId={adminConnectionId} companyName={companyName} connectionId={connectionId} lastSyncPretty={lastSyncPretty} billingStatus={billingStatus} trialEndsAt={trialEndsAt} subscriptionActive={subscriptionActive} autoSync={retrySync}>
      <style>{globalStyles}</style>
      {!adminConnectionId && <AnalyticsProvider connectionId={connectionId} />}

      <ErrorBoundary>
      <div className="dashboard-container">

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

        {/* ============================================================ */}
        {/* THREE-CARD OVERVIEW                                            */}
        {/* ============================================================ */}
        {(() => {
          const now = Date.now();
          const sumCents = (arr: any[]) => arr.reduce((s: number, q: any) => s + Number(q.quote_total_cents ?? 0), 0);
          const adminQs = adminConnectionId ? `?admin_connection_id=${adminConnectionId}` : "";

          // Quote health
          const openQuotes = quotes.filter((q: any) => {
            const st = String(q.quote_status ?? "").toLowerCase().trim();
            return !statusLooksWon(st) && !statusLooksLost(st) && st !== "draft";
          });
          function quoteAgeDays(q: any): number {
            const d = safeDate(q.updated_at_jobber) || safeDate(q.sent_at) || safeDate(q.created_at_jobber);
            return d ? (now - d.getTime()) / 86400000 : 9999;
          }
          const hotQuotes = openQuotes.filter((q: any) => quoteAgeDays(q) <= 14);
          const warmQuotes = openQuotes.filter((q: any) => { const d = quoteAgeDays(q); return d > 14 && d <= 30; });
          const goingColdQuotes = openQuotes.filter((q: any) => { const d = quoteAgeDays(q); return d > 30 && d <= 45; });
          const inactiveQuotes = openQuotes.filter((q: any) => quoteAgeDays(q) > 45);
          // Aliases for compatibility
          const activeQuotes = [...hotQuotes, ...warmQuotes];
          const atRiskQuotes = goingColdQuotes;
          const likelyLostQuotes = inactiveQuotes;
          const activePipelineCents = sumCents(activeQuotes);

          const wonThisMonth = quotes.filter((q: any) => { const st = String(q.quote_status ?? "").toLowerCase().trim(); if (!statusLooksWon(st)) return false; const d = safeDate(q.updated_at_jobber); return d && d >= thisMonthStart; });
          const wonThisMonthCents = sumCents(wonThisMonth);

          // Annual goal
          const yearStart = new Date(Date.UTC(todayUTC.getUTCFullYear(), 0, 1));
          const yearEnd = new Date(Date.UTC(todayUTC.getUTCFullYear() + 1, 0, 1));
          const yearRevenue = (() => { let t = 0; const c = new Date(yearStart); while (c < todayUTC) { const cached = _monthRevCache.get(`${c.getUTCFullYear()}-${c.getUTCMonth()}`); if (cached) t += cached.revenue; c.setUTCMonth(c.getUTCMonth() + 1); } return t; })();

          // Projected: scheduled jobs not yet completed, within this calendar year
          const projectedCents = jobs.reduce((sum: number, j: any) => {
            const st = String(j.status ?? "").toLowerCase();
            if (st === "completed" || st === "closed" || st === "archived") return sum;
            const sched = safeDate(j.scheduled_start_at);
            if (!sched || sched < todayUTC || sched >= yearEnd) return sum;
            return sum + Number(j.total_amount_cents ?? 0);
          }, 0);

          // Yearly goal: explicit annual target > explicit weekly×52 > extrapolate YTD pace
          // The extrapolated goal puts users "on pace" by default — their current trajectory projected to year-end
          const dayOfYearSoFar = Math.max(1, Math.floor((todayUTC.getTime() - yearStart.getTime()) / 86400000));
          const daysInFullYear = Math.floor((yearEnd.getTime() - yearStart.getTime()) / 86400000);
          const extrapolatedGoal = yearRevenue > 0 ? Math.round(yearRevenue * (daysInFullYear / dayOfYearSoFar)) : (autoWeeklyTargetCents > 0 ? autoWeeklyTargetCents * 52 : 0);
          const yearlyGoal = annualSalesTargetCents || (weeklyTargetCents ? weeklyTargetCents * 52 : extrapolatedGoal);
          const isAutoGoal = !annualSalesTargetCents && !weeklyTargetCents;
          const yearPct = yearlyGoal > 0 ? Math.round((yearRevenue / yearlyGoal) * 100) : 0;
          const projectedPct = yearlyGoal > 0 ? Math.round(((yearRevenue + projectedCents) / yearlyGoal) * 100) : 0;
          const dayOfYear = Math.floor((todayUTC.getTime() - yearStart.getTime()) / 86400000);
          const daysInYear = Math.floor((yearEnd.getTime() - yearStart.getTime()) / 86400000);
          const monthsElapsed = todayUTC.getUTCMonth() + 1;
          const expectedPct = Math.round((dayOfYear / daysInYear) * 100);
          const onPace = projectedPct >= expectedPct - 5 || yearPct >= expectedPct - 5;
          const remainingMonths = 12 - monthsElapsed;
          const remainingCents = Math.max(0, yearlyGoal - yearRevenue - projectedCents);
          const monthlyNeeded = remainingMonths > 0 ? Math.round(remainingCents / remainingMonths) : 0;
          const weeklyNeeded = remainingMonths > 0 ? Math.round(remainingCents / (remainingMonths * (52/12))) : 0;

          // Close rate — based on recent quotes only (last 30 days) for accuracy
          const recentQuotes = quotes.filter((q: any) => quoteAgeDays(q) <= 30);
          const recentWon = recentQuotes.filter((q: any) => statusLooksWon(String(q.quote_status ?? "").toLowerCase().trim())).length;
          const recentLost = recentQuotes.filter((q: any) => statusLooksLost(String(q.quote_status ?? "").toLowerCase().trim())).length;
          const recentDecided = recentWon + recentLost + activeQuotes.length;
          const actualCloseRate = recentDecided > 0 ? Math.round((recentWon / recentDecided) * 100) : 0;
          const crTarget = closeRateTarget || 40;

          // How far ahead/behind in dollars (including scheduled)
          const expectedRevenue = Math.round(yearlyGoal * (dayOfYear / daysInYear));
          const totalProjected = yearRevenue + projectedCents;
          const aheadByCents = yearRevenue - expectedRevenue;
          const isAhead = aheadByCents >= 0;

          const paceColor = isAhead ? "#10b981" : "#f59e0b";
          const paceGrad = isAhead ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, #f59e0b, #fbbf24)";

          // Capacity data for the card
          const capacityGapCents = effectiveWeeklyTarget > 0 ? Math.max(0, effectiveWeeklyTarget - thisWeekSnap.scheduledRevenue) : 0;
          const capacityPct = effectiveWeeklyTarget > 0 ? Math.round((thisWeekSnap.scheduledRevenue / effectiveWeeklyTarget) * 100) : 0;
          // Invoice data for the card
          const totalOutstandingCard = currentCents + totalAR;
          return (
            <div className="animate-in" style={{ marginTop: 12, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

              {/* What to Do Today — moved above cards */}
              {(() => {
                const adminQs = adminConnectionId ? `?admin_connection_id=${adminConnectionId}` : "";
                const todayActions: { text: string; why: string; href: string; color: string; priority: number }[] = [];

                // P1 — Urgent collections
                if (b15p > 0) todayActions.push({ text: `Call on ${money(b15p)} in overdue invoices (30+ days)`, why: "This money is yours — a phone call could collect it today", href: `/jobber/invoices${adminQs}`, color: "#ef4444", priority: 1 });
                if (b8_14 > 0) todayActions.push({ text: `Follow up on ${money(b8_14)} in late invoices (8\u201330 days)`, why: "Getting stale — send a firm reminder before they go 30+", href: `/jobber/invoices${adminQs}`, color: "#f59e0b", priority: 2 });

                // P1 — Cooling quotes
                if (goingColdQuotes.length > 0) todayActions.push({ text: `Follow up on ${goingColdQuotes.length} cooling quote${goingColdQuotes.length !== 1 ? "s" : ""} (${money(sumCents(goingColdQuotes))})`, why: "30+ days quiet — one call could save the deal", href: `/jobber/sales${adminQs}`, color: "#ef4444", priority: 1 });

                // P2 — Capacity gap (job count based)
                if (unscheduledCount > 0) {
                  todayActions.push({ text: `Schedule ${unscheduledCount} unscheduled job${unscheduledCount !== 1 ? "s" : ""}`, why: "Open slots mean lost revenue — pull from approved quotes or reach out to leads", href: `/jobber/capacity${adminQs}`, color: "#f59e0b", priority: 2 });
                }

                // P2 — Approved quotes ready to book
                if (approvedNoJobCount > 0) todayActions.push({ text: `Book ${approvedNoJobCount} approved quote${approvedNoJobCount !== 1 ? "s" : ""} (${money(approvedNoJobCents)})`, why: "Customers said yes — get them on the schedule before they reconsider", href: `/jobber/capacity${adminQs}`, color: "#10b981", priority: 2 });

                // P3 — Work done, not billed
                if (needsInvoiceCount > 0) todayActions.push({ text: `Invoice ${needsInvoiceCount} completed job${needsInvoiceCount !== 1 ? "s" : ""} (${money(needsInvoiceCents)})`, why: "Work is done — get the bill out so you can get paid", href: `/jobber/invoices${adminQs}`, color: "#5aa6ff", priority: 3 });

                // P3 — Warm quotes
                if (warmQuotes.length > 0) todayActions.push({ text: `Check in on ${warmQuotes.length} warm quote${warmQuotes.length !== 1 ? "s" : ""} (${money(sumCents(warmQuotes))})`, why: "14\u201330 days — a friendly check-in keeps you top of mind", href: `/jobber/sales${adminQs}`, color: "#f59e0b", priority: 3 });

                // P3 — Draft invoices
                if (draftInvoiceCount > 0) todayActions.push({ text: `Send ${draftInvoiceCount} draft invoice${draftInvoiceCount !== 1 ? "s" : ""} (${money(draftInvoiceCents)})`, why: "Written and ready — hit send", href: `/jobber/invoices${adminQs}`, color: "#5aa6ff", priority: 3 });

                // P3 — New requests
                if (openRequestsCount > 0) todayActions.push({ text: `Respond to ${openRequestsCount} new request${openRequestsCount !== 1 ? "s" : ""}`, why: "Fresh leads — speed wins the job", href: `/jobber/sales${adminQs}`, color: "#10b981", priority: 3 });

                // P3 — Changes requested
                if (changesRequestedCount > 0) todayActions.push({ text: `Reply to ${changesRequestedCount} change request${changesRequestedCount !== 1 ? "s" : ""}`, why: "Customers asked for changes — quick replies close deals", href: `/jobber/sales${adminQs}`, color: "#ef4444", priority: 3 });

                // P4 — Unscheduled jobs
                if (unscheduledCount > 0) todayActions.push({ text: `Schedule ${unscheduledCount} unscheduled job${unscheduledCount !== 1 ? "s" : ""}`, why: "Sitting in your queue without a date", href: `/jobber/capacity${adminQs}`, color: "#5aa6ff", priority: 4 });

                // P4 — Recently overdue (1-7 days)
                if (b0_7 > 0 && b15p === 0 && b8_14 === 0) todayActions.push({ text: `Friendly reminder for ${money(b0_7)} just past due`, why: "Still recent — a polite nudge usually clears it up", href: `/jobber/invoices${adminQs}`, color: "#5aa6ff", priority: 4 });

                // P4 — Hot quotes (informational)
                if (hotQuotes.length >= 5) todayActions.push({ text: `${hotQuotes.length} hot quotes in play (${money(sumCents(hotQuotes))})`, why: "Fresh and looking good — no action needed yet", href: `/jobber/sales${adminQs}`, color: "#94a3b8", priority: 4 });

                todayActions.sort((a, b) => a.priority - b.priority);

                return todayActions.length > 0 ? (
                  <AttentionList
                    actions={todayActions}
                    title="What to Do Today"
                    tourId="overview-actions"
                    emptyMessage="Nothing urgent — your business is running clean today."
                  />
                ) : null;
              })()}

            <div data-tour="overview-cards" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, alignItems: "stretch", flex: 1 }}>

              {/* ═══ INVOICES CARD ═══ */}
              {(() => {
                const thirtyDaysAgo = addDaysUTC(todayUTC, -30);

                // Invoiced last 30 days (by due date as proxy for issue date)
                const invoiced30 = invoices.filter((inv: any) => {
                  const d = safeDate(inv.due_at);
                  return d && d >= thirtyDaysAgo;
                });
                const invoiced30Cents = invoiced30.reduce((s: number, inv: any) => s + Number(inv.total_amount_cents ?? 0), 0);

                // Collected last 30 days
                const collected30 = invoices.filter((inv: any) => {
                  const pd = safeDate(inv.paid_at);
                  return pd && pd >= thirtyDaysAgo;
                });
                const collected30Cents = collected30.reduce((s: number, inv: any) => s + Number(inv.total_amount_cents ?? 0), 0);

                // Avg days to pay
                const recentPaid = invoices.filter((inv: any) => {
                  const pd = safeDate(inv.paid_at);
                  const due = safeDate(inv.due_at);
                  return pd && due && pd >= thirtyDaysAgo;
                });
                const avgDaysToPay = recentPaid.length > 0
                  ? Math.round(recentPaid.reduce((s: number, inv: any) => {
                      const pd = safeDate(inv.paid_at)!;
                      const due = safeDate(inv.due_at)!;
                      return s + Math.max(0, (pd.getTime() - due.getTime()) / 86400000);
                    }, 0) / recentPaid.length)
                  : null;

                // Collection rate
                const collectionRate = invoiced30Cents > 0 ? Math.round((collected30Cents / invoiced30Cents) * 100) : null;

                const agingRows = [
                  { label: "30+ days late", color: "#dc2626", cents: b15p, count: b15pCount },
                  { label: "8–30 days late", color: "#ef4444", cents: b8_14, count: b8_14Count },
                  { label: "1–7 days late", color: "#f59e0b", cents: b0_7, count: b0_7Count },
                  { label: "Not due yet", color: "#10b981", cents: currentCents, count: currentCount },
                ].filter(b => b.count > 0);
                const agingTotal = agingRows.reduce((s, b) => s + b.count, 0) || 1;

                // 6-month invoiced vs collected bars
                const cashFlowMonths: { label: string; invoicedCents: number; collectedCents: number; avgDays: number | null; isCurrent: boolean }[] = [];
                for (let m = -5; m <= 0; m++) {
                  const mStart = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth() + m, 1));
                  const mEnd = new Date(Date.UTC(mStart.getUTCFullYear(), mStart.getUTCMonth() + 1, 1));
                  const mInvoiced = invoices.filter((inv: any) => { const d = safeDate(inv.due_at); return d && d >= mStart && d < mEnd; });
                  const mCollected = invoices.filter((inv: any) => { const pd = safeDate(inv.paid_at); return pd && pd >= mStart && pd < mEnd; });
                  const mInvoicedCents = mInvoiced.reduce((s: number, inv: any) => s + Number(inv.total_amount_cents ?? 0), 0);
                  const mCollectedCents = mCollected.reduce((s: number, inv: any) => s + Number(inv.total_amount_cents ?? 0), 0);
                  // Avg days to pay for invoices paid this month
                  const mPaid = mCollected.filter((inv: any) => safeDate(inv.due_at));
                  const mAvgDays = mPaid.length > 0
                    ? Math.round(mPaid.reduce((s: number, inv: any) => s + Math.max(0, (safeDate(inv.paid_at)!.getTime() - safeDate(inv.due_at)!.getTime()) / 86400000), 0) / mPaid.length)
                    : null;
                  cashFlowMonths.push({
                    label: mStart.toLocaleString(undefined, { month: "short", timeZone: "UTC" }),
                    invoicedCents: mInvoicedCents,
                    collectedCents: mCollectedCents,
                    avgDays: mAvgDays,
                    isCurrent: m === 0,
                  });
                }
                const cfMax = Math.max(...cashFlowMonths.flatMap(m => [m.invoicedCents, m.collectedCents]), 1);

                const invPage1 = (
                  <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    {/* Legend */}
                    <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 14, height: 14, borderRadius: 3, background: "rgba(90,166,255,0.15)", border: "2px solid rgba(90,166,255,0.5)", flexShrink: 0 }} />
                        <span className="text-primary" style={{ fontSize: 12, fontWeight: 700 }}>Invoiced</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 14, height: 14, borderRadius: 3, background: "#10b981", flexShrink: 0 }} />
                        <span className="text-primary" style={{ fontSize: 12, fontWeight: 700 }}>Collected</span>
                      </div>
                    </div>
                    {/* Fill-style bar chart — invoiced is container, collected fills it */}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, flex: 1, minHeight: 45 }}>
                      {cashFlowMonths.map((m, i) => {
                        const barH = cfMax > 0 ? Math.max((m.invoicedCents / cfMax) * 100, m.invoicedCents > 0 ? 6 : 1) : 1;
                        const fillPct = m.invoicedCents > 0 ? (m.collectedCents / m.invoicedCents) * 100 : 0;
                        const prev = i > 0 ? cashFlowMonths[i - 1] : null;
                        const invChange = prev && prev.invoicedCents > 0 ? Math.round(((m.invoicedCents - prev.invoicedCents) / prev.invoicedCents) * 100) : null;
                        const colChange = prev && prev.collectedCents > 0 ? Math.round(((m.collectedCents - prev.collectedCents) / prev.collectedCents) * 100) : null;
                        return (
                          <div key={i} className="chart-bar-hover" style={{
                            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
                            height: "100%", cursor: "default", position: "relative",
                            borderRadius: 4,
                          }}>
                            {/* Tooltip — inside chart area */}
                            <div className="chart-bar-tooltip" style={{
                              position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)",
                              padding: "6px 10px", borderRadius: 6, whiteSpace: "nowrap",
                              background: "rgba(0,0,0,0.92)", color: "#fff", fontSize: 10, lineHeight: 1.5,
                              pointerEvents: "none", zIndex: 10, opacity: 0,
                              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                            }}>
                              <div style={{ fontWeight: 800, marginBottom: 2 }}>{m.label}</div>
                              <div>Invoiced: <span style={{ color: "rgba(90,166,255,0.9)", fontWeight: 700 }}>{money(m.invoicedCents)}</span>
                                {invChange !== null && <span style={{ color: invChange >= 0 ? "#34d399" : "#fca5a5", marginLeft: 4 }}>{invChange >= 0 ? "+" : ""}{invChange}%</span>}
                              </div>
                              <div>Collected: <span style={{ color: "#10b981", fontWeight: 700 }}>{money(m.collectedCents)}</span>
                                {colChange !== null && <span style={{ color: colChange >= 0 ? "#34d399" : "#fca5a5", marginLeft: 4 }}>{colChange >= 0 ? "+" : ""}{colChange}%</span>}
                              </div>
                              {m.avgDays !== null && <div>Avg to pay: <span style={{ fontWeight: 700 }}>{m.avgDays}d</span></div>}
                            </div>
                            {/* Collection % above bar */}
                            <div style={{ fontSize: 10, fontWeight: 800, marginBottom: 2, whiteSpace: "nowrap", color: fillPct > 100 ? "#10b981" : fillPct >= 70 ? "#f59e0b" : m.invoicedCents > 0 ? "#ef4444" : "transparent" }}>
                              {m.invoicedCents > 0 ? `${Math.round(fillPct)}%` : ""}
                            </div>
                            {/* Bar: invoiced is the container, collected fills it from the bottom */}
                            {(() => {
                              const over = m.collectedCents > m.invoicedCents && m.invoicedCents > 0;
                              const maxAmount = Math.max(m.invoicedCents, m.collectedCents);
                              const containerH = cfMax > 0 ? Math.max((maxAmount / cfMax) * 100, maxAmount > 0 ? 6 : 1) : 1;
                              const fillH = maxAmount > 0 ? Math.min((m.collectedCents / maxAmount) * 100, 100) : 0;
                              return (
                                <div style={{
                                  width: "80%", borderRadius: "5px 5px 3px 3px",
                                  height: `${containerH}%`,
                                  background: "rgba(90,166,255,0.1)",
                                  border: over ? "1.5px solid #10b981" : "1.5px solid rgba(90,166,255,0.4)",
                                  boxShadow: over ? "0 0 8px rgba(16,185,129,0.3)" : "none",
                                  position: "relative", overflow: "hidden",
                                  transition: "height 0.5s ease",
                                }}>
                                  {m.collectedCents > 0 && (
                                    <div style={{
                                      position: "absolute", bottom: 0, left: 0, right: 0,
                                      height: `${fillH}%`,
                                      background: "linear-gradient(0deg, #10b981, #34d399)",
                                      transition: "height 0.5s ease",
                                    }} />
                                  )}
                                </div>
                              );
                            })()}
                            {/* Month label + values — inside the bar column so
                                they react to the hover (pop out effect) */}
                            <div className="bar-label" style={{ textAlign: "center", marginTop: 4, transition: "transform 0.15s ease, opacity 0.15s ease" }}>
                              <div className="text-muted" style={{ fontSize: 10, fontWeight: m.isCurrent ? 700 : 500 }}>{m.label}</div>
                              <div className="text-primary" style={{ fontSize: 9, fontWeight: 700, marginTop: 1 }}>{m.invoicedCents > 0 ? money(m.invoicedCents) : "—"}</div>
                              <div style={{ fontSize: 9, fontWeight: 700, color: "#10b981" }}>{m.collectedCents > 0 ? money(m.collectedCents) : "—"}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );

                // Past-due commentary based on the worst bucket (used in card header)
                const pastDueCommentary = (() => {
                  if (totalAR === 0) return "Everyone's paid up — nothing to chase right now";
                  const pct15p = totalAR > 0 ? b15p / totalAR : 0;
                  if (b15p > 0 && pct15p >= 0.5) {
                    return `Over half of what's owed is 30+ days late — call those clients first`;
                  }
                  if (b15p > 0) {
                    return `${money(b15p)} is 30+ days late — start with the oldest accounts`;
                  }
                  if (b8_14 > 0) {
                    return `Send firm reminders today before these get stale`;
                  }
                  return `All overdue is recent — a friendly nudge should clear it up`;
                })();
                const pastDueColor = totalAR === 0
                  ? "#10b981"
                  : b15p > 0 ? "#dc2626" : b8_14 > 0 ? "#ef4444" : "#f59e0b";

                const invPage2 = (
                  <div style={{ display: "flex", flex: 1, padding: 0, flexDirection: "column" }}>
                    {agingRows.length > 0 ? (
                      <div style={{ display: "flex", flex: 1, width: "100%" }}>
                        {/* Left labels */}
                        <div style={{ display: "flex", flexDirection: "column", paddingRight: 14, textAlign: "right", flex: 1, justifyContent: "center" }}>
                          {agingRows.map((b, bi) => (
                            <div key={b.label} className="aging-row-label" data-aging-idx={bi} style={{
                              flex: Math.max(b.cents, 1), display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end",
                              opacity: 0.85, transition: "transform 0.15s ease, opacity 0.15s ease",
                            }}>
                              <div style={{ fontSize: 17, fontWeight: 800, color: b.color, lineHeight: 1.1 }}>{money(b.cents)}</div>
                              <div className="text-muted" style={{ fontSize: 11, lineHeight: 1.3 }}>{b.count} invoice{b.count !== 1 ? "s" : ""}</div>
                            </div>
                          ))}
                        </div>
                        {/* Connected vertical bar with faint dividers */}
                        <div style={{
                          width: 56, borderRadius: 10, overflow: "hidden",
                          display: "flex", flexDirection: "column", flexShrink: 0,
                          background: "rgba(255,255,255,0.03)",
                        }}>
                          {agingRows.map((b, bi) => (
                            <div key={b.label} className="aging-bar-seg" data-aging-idx={bi} style={{
                              flex: Math.max(b.cents, 1), minHeight: 6,
                              background: b.color,
                              borderBottom: bi < agingRows.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                              cursor: "default",
                            }} />
                          ))}
                        </div>
                        {/* Right labels */}
                        <div style={{ display: "flex", flexDirection: "column", paddingLeft: 14, flex: 1, justifyContent: "center" }}>
                          {agingRows.map((b, bi) => (
                            <div key={b.label} className="aging-row-label" data-aging-idx={bi} style={{
                              flex: Math.max(b.cents, 1), display: "flex", flexDirection: "column", justifyContent: "center",
                              opacity: 0.85, transition: "transform 0.15s ease, opacity 0.15s ease",
                            }}>
                              <div className="text-primary" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{b.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span className="text-muted" style={{ fontSize: 14 }}>Everyone&apos;s paid up</span>
                      </div>
                    )}
                  </div>
                );

                // Per-page header for the OVERDUE tab
                const overdueHeader = (
                  <div style={{ display: "flex", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: totalAR > 0 ? pastDueColor : "#10b981", lineHeight: 1 }}>
                        {money(totalAR)}
                      </span>
                      <span className="text-muted" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Past due
                      </span>
                    </div>
                    {totalPastDueCount > 0 && (
                      <span className="text-muted" style={{ fontSize: 11, fontWeight: 600 }}>
                        {totalPastDueCount} invoice{totalPastDueCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                );

                // Per-page header for the CASH FLOW tab
                const cashFlowHeader = (
                  <div style={{ display: "flex", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span className="text-primary" style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>
                        {money(invoiced30Cents)}
                      </span>
                      <span className="text-muted" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Invoiced 30d
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: collected30Cents > 0 ? "#10b981" : "#a8b3c4", lineHeight: 1 }}>
                        {money(collected30Cents)}
                      </span>
                      <span className="text-muted" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Collected 30d
                      </span>
                    </div>
                    {collectionRate !== null && (
                      <span className="text-muted" style={{ fontSize: 11, fontWeight: 600 }}>
                        {collectionRate}% rate
                      </span>
                    )}
                  </div>
                );

                return (
                  <div className="panel" style={{ padding: "12px 14px 8px", display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <a href={`/jobber/invoices${adminQs}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, minHeight: 28 }}>
                      <h2 className="text-primary" style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
                        Cash You Need to Collect
                      </h2>
                      <span className="btn" style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px" }}>Collect Payments &#8594;</span>
                    </a>
                    <FlipCard
                      pages={[invPage2, invPage1]}
                      labels={["What's Overdue", "Cash Flow"]}
                      headers={[overdueHeader, cashFlowHeader]}
                    />
                  </div>
                );
              })()}

              {/* ═══ SCHEDULE CARD ═══ */}
              {(() => {
                const dailyTargets: Record<string, number> = (conn as any)?.capacity_daily_targets || {};
                const workDaysList: string[] = (conn as any)?.capacity_work_days || ["Mon", "Tue", "Wed", "Thu", "Fri"];
                const today = new Date();
                const todayDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][today.getDay()];
                const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

                function buildWeekDays(weekStart: Date) {
                  return dayLabels.map((day, i) => {
                    const dayStart = addDaysUTC(weekStart, i);
                    const dayEnd = addDaysUTC(dayStart, 1);
                    const { rev, count } = capacityPeriodRevenue(dayStart, dayEnd);
                    const isWorkDay = workDaysList.includes(day);
                    const dayTarget = dailyTargets[day] || (isWorkDay && effectiveWeeklyTarget ? Math.round(effectiveWeeklyTarget / workDaysList.length) : 0);
                    return { day, scheduledCents: rev, targetCents: dayTarget, isToday: day === todayDay, isWorkDay, jobCount: count };
                  });
                }

                const thisWeekDays = buildWeekDays(thisWeekStart);
                const nextWeekDays = buildWeekDays(addDaysUTC(thisWeekStart, 7));

                // This Month: build weekly bars
                const mStart = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), 1));
                const mEnd = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth() + 1, 1));
                const monthWeeks: typeof thisWeekDays = [];
                let cursor = new Date(mStart);
                let weekNum = 1;
                while (cursor < mEnd) {
                  const wEnd = addDaysUTC(cursor, 7) > mEnd ? mEnd : addDaysUTC(cursor, 7);
                  const wDays = buildWeekDays(cursor);
                  const wRev = wDays.filter(d => {
                    const dStart = addDaysUTC(cursor, dayLabels.indexOf(d.day));
                    return dStart >= mStart && dStart < mEnd;
                  }).reduce((s, d) => s + d.scheduledCents, 0);
                  const wCount = wDays.reduce((s, d) => s + d.jobCount, 0);
                  const isCurrent = todayUTC >= cursor && todayUTC < addDaysUTC(cursor, 7);
                  const wLabel = `${cursor.toLocaleString(undefined, { month: "short", timeZone: "UTC" })} ${cursor.getUTCDate()}`;
                  monthWeeks.push({
                    day: wLabel,
                    scheduledCents: wRev,
                    targetCents: effectiveWeeklyTarget || 0,
                    isToday: isCurrent,
                    isWorkDay: true,
                    jobCount: wCount,
                  });
                  cursor = addDaysUTC(cursor, 7);
                  weekNum++;
                }
                const monthBooked = monthWeeks.reduce((s, w) => s + w.scheduledCents, 0);

                // Next 6 weeks: build daily data per week for heatmap
                const heatmapData: { label: string; isCurrent: boolean; days: typeof thisWeekDays }[] = [];
                for (let w = 0; w < 6; w++) {
                  const wStart = addDaysUTC(thisWeekStart, w * 7);
                  const wLabel = `${wStart.toLocaleString(undefined, { month: "short", timeZone: "UTC" })} ${wStart.getUTCDate()}`;
                  const wDays = buildWeekDays(wStart).map(d => ({ ...d, isToday: w === 0 && d.isToday }));
                  heatmapData.push({ label: wLabel, isCurrent: w === 0, days: wDays });
                }
                const next6Booked = heatmapData.reduce((s, w) => s + w.days.reduce((ds, d) => ds + d.scheduledCents, 0), 0);

                const weekSets = [
                  { label: "This Week", days: thisWeekDays, bookedCents: thisWeekSnap.scheduledRevenue },
                  { label: "Next Week", days: nextWeekDays.map(d => ({ ...d, isToday: false })), bookedCents: nextWeekDays.reduce((s, d) => s + d.scheduledCents, 0) },
                ];

                // Per-view headers and measure-aware math now live inside
                // CapacityTargetDisplay (it reads localStorage via the
                // useCapacityMeasure hook, which a server component can't do).

                return (
                  <div className="panel" style={{ padding: "12px 14px 8px", display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6, minHeight: 28 }}>
                      <a href={`/jobber/capacity${adminQs}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <h2 className="text-primary" style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
                          Weekly Capacity
                        </h2>
                      </a>
                      <InlineCapacityEditor
                        currentWorkDays={workDaysList}
                        adminConnectionId={adminConnectionId}
                      />
                      <a href={`/jobber/capacity${adminQs}`} className="btn" style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", textDecoration: "none" }}>Book Work &#8594;</a>
                    </div>
                    <CapacityTargetDisplay
                      weeklyTargetCents={effectiveWeeklyTarget || 0}
                      weeks={weekSets}
                      defaultWeek={0}
                      currencyCode={currencyCode}
                      settingsHref={`/jobber/capacity${adminQs}`}
                      workDays={workDaysList}
                      dailyTargets={dailyTargets}
                      heatmapWeeks={heatmapData}
                      heatmapTotalBooked={next6Booked}
                    />
                  </div>
                );
              })()}

              {/* ═══ SALES CARD ═══ */}
              {(() => {
                // Mini bar chart: won revenue by month (last 6 months)
                const monthBars: { label: string; cents: number; count: number; isCurrent: boolean }[] = [];
                for (let m = -5; m <= 0; m++) {
                  const mStart = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth() + m, 1));
                  const mEnd = new Date(Date.UTC(mStart.getUTCFullYear(), mStart.getUTCMonth() + 1, 1));
                  const wonInMonth = quotes.filter((q: any) => {
                    if (!statusLooksWon(String(q.quote_status ?? "").toLowerCase().trim())) return false;
                    const d = safeDate(q.updated_at_jobber);
                    return d && d >= mStart && d < mEnd;
                  });
                  monthBars.push({
                    label: mStart.toLocaleString(undefined, { month: "short", timeZone: "UTC" }),
                    cents: sumCents(wonInMonth),
                    count: wonInMonth.length,
                    isCurrent: m === 0,
                  });
                }
                const maxBar = Math.max(...monthBars.map(b => b.cents), 1);

                const healthBuckets = [
                  ...(openRequestsCount > 0 ? [{ label: "Requests", days: "new", count: openRequestsCount, cents: 0, color: "#5aa6ff", hideValue: true }] : []),
                  { label: "Active", days: "< 14d", count: hotQuotes.length, cents: sumCents(hotQuotes), color: "#10b981", hideValue: false },
                  { label: "Follow up soon", days: "14–30d", count: warmQuotes.length, cents: sumCents(warmQuotes), color: "#f59e0b", hideValue: false },
                  { label: "At risk", days: "30–45d", count: goingColdQuotes.length, cents: sumCents(goingColdQuotes), color: "#ef4444", hideValue: false },
                  ...(inactiveQuotes.length > 0 ? [{ label: "Stale", days: "45+d", count: inactiveQuotes.length, cents: sumCents(inactiveQuotes), color: "#6b7280", hideValue: false }] : []),
                ];
                const healthTotal = healthBuckets.filter(b => b.label !== "Stale").reduce((s, b) => s + b.count, 0) || 1;

                // SVG donut for quote health (+30% from 195)
                const donutSize = 254;
                const donutR = 94;
                const donutStroke = 27;
                const donutCirc = 2 * Math.PI * donutR;
                const activeBuckets = healthBuckets.filter(b => b.label !== "Stale" && b.count > 0);
                const activeTotal = activeBuckets.reduce((s, b) => s + b.count, 0) || 1;
                let donutOffset = 0;

                const page1 = (
                  <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    {/* Mini bar chart */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, flex: 1, minHeight: 45 }}>
                        {monthBars.map((b, i) => {
                          const prev = i > 0 ? monthBars[i - 1] : null;
                          const change = prev && prev.cents > 0 ? Math.round(((b.cents - prev.cents) / prev.cents) * 100) : null;
                          const barH = maxBar > 0 ? Math.max((b.cents / maxBar) * 100, b.cents > 0 ? 4 : 1) : 1;
                          return (
                            <div key={i} className="chart-bar-hover" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", borderRadius: 4, outline: b.isCurrent ? "2px solid rgba(16,185,129,0.35)" : "none", outlineOffset: 2, cursor: "default", position: "relative" }}>
                              <div className="chart-bar-tooltip" style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", padding: "8px 12px", borderRadius: 8, whiteSpace: "nowrap", background: "rgba(0,0,0,0.9)", color: "#fff", fontSize: 12, lineHeight: 1.6, pointerEvents: "none", transition: "opacity 0.15s ease", zIndex: 10, marginBottom: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                                <div style={{ fontWeight: 800 }}>{money(b.cents)}</div>
                                <div style={{ color: "rgba(255,255,255,0.6)" }}>{b.count.toLocaleString()} quotes won</div>
                                {change !== null && prev && (<div style={{ color: change >= 0 ? "#34d399" : "#fca5a5", fontWeight: 700, marginTop: 2 }}>{change >= 0 ? "+" : ""}{change}% vs {prev.label} ({money(prev.cents)})</div>)}
                              </div>
                              <div className="text-primary" style={{ fontSize: 9, fontWeight: 700, marginBottom: 1, whiteSpace: "nowrap" }}>{b.cents > 0 ? money(b.cents) : "$0"}</div>
                              <div style={{ width: "80%", borderRadius: "3px 3px 0 0", height: `${barH}%`, background: b.isCurrent ? "linear-gradient(180deg, #10b981, #34d399)" : "linear-gradient(180deg, #10b981a0, #34d399a0)", transition: "height 0.5s ease" }} />
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                        {monthBars.map((b, i) => (<div key={i} className="text-muted" style={{ flex: 1, textAlign: "center", fontSize: 10, fontWeight: b.isCurrent ? 700 : 500 }}>{b.label}</div>))}
                      </div>
                    </div>
                  </div>
                );

                const realOpps = hotQuotes.length + warmQuotes.length;
                const realOppsCents = sumCents(hotQuotes) + sumCents(warmQuotes);

                const page2 = (
                  <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    <div className="donut-group" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    {/* Donut + center count */}
                    <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", marginTop: "5%", minWidth: 0, overflow: "hidden" }}>
                      <svg width={donutSize} height={donutSize} viewBox={`0 0 ${donutSize} ${donutSize}`} style={{ maxWidth: "100%", height: "auto" }}>
                        {/* Track */}
                        <circle cx={donutSize/2} cy={donutSize/2} r={donutR} fill="none" strokeWidth={donutStroke} stroke="rgba(255,255,255,0.04)" />
                        {/* Segments */}
                        {activeBuckets.map((b, bi) => {
                          const segLen = (b.count / activeTotal) * donutCirc;
                          const gap = activeBuckets.length > 1 ? 3 : 0;
                          const el = (
                            <circle key={b.label} className={`donut-seg di${bi}`}
                              cx={donutSize/2} cy={donutSize/2} r={donutR} fill="none"
                              strokeWidth={donutStroke} stroke={b.color}
                              strokeDasharray={`${Math.max(segLen - gap, 1)} ${donutCirc - Math.max(segLen - gap, 1)}`}
                              strokeDashoffset={-donutOffset}
                              strokeLinecap="butt"
                              style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.2s ease, stroke-dasharray 0.2s ease" }}
                            />
                          );
                          donutOffset += segLen;
                          return el;
                        })}
                        {/* Center text */}
                        <text x={donutSize/2} y={donutSize/2 - 12} textAnchor="middle" dominantBaseline="middle"
                          style={{ fontSize: 44, fontWeight: 800, fill: "currentColor", letterSpacing: -2 }} className="text-primary">
                          {realOpps}
                        </text>
                        <text x={donutSize/2} y={donutSize/2 + 18} textAnchor="middle" dominantBaseline="middle"
                          style={{ fontSize: 14, fontWeight: 600 }} className="text-muted">
                          active deals
                        </text>
                      </svg>
                    </div>
                    {/* Labels */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: "auto", paddingTop: 4 }}>
                      {healthBuckets.map((b, bi) => (
                        <div key={b.label} className={`donut-label di${bi}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", opacity: b.label === "Stale" ? 0.5 : 1, lineHeight: 1.2 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: b.label === "Stale" ? "rgba(107,114,128,0.3)" : b.color, flexShrink: 0 }} />
                            <span className="text-primary" style={{ fontSize: 13, fontWeight: 800 }}>{b.count.toLocaleString()}</span>
                            <span className="text-primary" style={{ fontSize: 12, fontWeight: 600 }}>{b.label}</span>
                            <span className="text-muted" style={{ fontSize: 10 }}>({b.days})</span>
                          </div>
                          {!b.hideValue && <span style={{ fontSize: 12, fontWeight: 700, color: b.label === "Stale" ? undefined : b.color }} className={b.label === "Stale" ? "text-muted" : ""}>{money(b.cents)}</span>}
                        </div>
                      ))}
                    </div>
                    </div>
                  </div>
                );

                // Open pipeline = everything not yet stale: hot + warm + going cold
                const openPipelineQuotes = [...hotQuotes, ...warmQuotes, ...goingColdQuotes];
                const openPipelineCents = sumCents(openPipelineQuotes);
                const openPipelineCount = openPipelineQuotes.length;
                // Total sales over the 6-month chart window
                const totalSales6moCents = monthBars.reduce((s, b) => s + b.cents, 0);
                const totalSales6moCount = monthBars.reduce((s, b) => s + b.count, 0);

                // Per-page header for the OPEN QUOTES tab
                const quotesHeader = (
                  <div style={{ display: "flex", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: openPipelineCents > 0 ? "#5aa6ff" : "#a8b3c4", lineHeight: 1 }}>
                        {money(openPipelineCents)}
                      </span>
                      <span className="text-muted" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Open pipeline
                      </span>
                    </div>
                  </div>
                );

                // Per-page header for the SALES tab
                const salesHeader = (
                  <div style={{ display: "flex", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: totalSales6moCents > 0 ? "#10b981" : "#a8b3c4", lineHeight: 1 }}>
                        {money(totalSales6moCents)}
                      </span>
                      <span className="text-muted" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Sales 6mo
                      </span>
                    </div>
                  </div>
                );

                return (
                  <div className="panel" style={{ padding: "12px 14px 8px", display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <a href={`/jobber/sales${adminQs}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, minHeight: 28 }}>
                      <h2 className="text-primary" style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
                        Sales Pipeline
                      </h2>
                      <span className="btn" style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px" }}>Win Work &#8594;</span>
                    </a>
                    <FlipCard
                      pages={[page2, page1]}
                      labels={["Your Open Quotes", "Sales"]}
                      headers={[quotesHeader, salesHeader]}
                    />
                  </div>
                );
              })()}
            </div>

            </div>
          );
        })()}

      </div>
      {/* Onboarding overlay */}
      <OnboardingOverlay
        state={{
          hasData: jobs.length > 0 || invoices.length > 0,
          weeklyTargetSet: !!(conn?.weekly_capacity_cents),
          trialDaysLeft: trialEndsAt > Date.now() ? Math.ceil((trialEndsAt - Date.now()) / 86400000) : 0,
        }}
        connectionId={connectionId}
        adminConnectionId={adminConnectionId}
      />
      </ErrorBoundary>
      </DashboardLayout>
    </main>
  );
}

