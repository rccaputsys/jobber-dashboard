// src/app/jobber/sales/page.tsx
import React from "react";
import { supabaseAdmin, fetchAllRows } from "@/lib/supabaseAdmin";
import { getUser } from "@/lib/supabaseAuth";
import { redirect } from "next/navigation";
import { ExportCSV } from "../dashboard/ExportCSV";
import { DashboardTopbar } from "../dashboard/DashboardTopbar";
import { OnboardingOverlay } from "../dashboard/OnboardingOverlay";
import { QuotePipeline } from "./QuotePipeline";
import { SalesTrendsSection } from "./SalesTrendsSection";
import { QuoteFollowUpTable } from "./QuoteFollowUpTable";
import { SalesActionTabs } from "./SalesActionTabs";
import { ErrorBoundary } from "../dashboard/ErrorBoundary";
import { DashboardLayout } from "../dashboard/DashboardLayout";
import {
  safeDate,
  startOfDayUTC,
  startOfWeekUTC,
  addDaysUTC,
  moneyFactory,
  formatSyncTime,
  statusLooksWon,
  statusLooksLost,
  globalStyles,
  theme,
} from "@/lib/dashboardHelpers";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    admin_connection_id?: string;
  }>;
}) {
  const sp = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login?redirect=/jobber/sales");

  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);
  const isAdmin = ADMIN_EMAILS.includes(user.email || "");
  const adminConnectionId = isAdmin ? sp.admin_connection_id : undefined;

  // Get connection
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
          <a href="/admin" style={{ color: "#5aa6ff", marginTop: 16, display: "inline-block" }}>&larr; Back to Admin</a>
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
          <a href="/jobber" style={{ color: "#5aa6ff", marginTop: 16, display: "inline-block" }}>Connect Jobber &rarr;</a>
        </div>
      );
    }
    connectionId = connection.id;
  }

  // Fetch connection details + quotes
  const [connDetails, quotes, openRequests] = await Promise.all([
    supabaseAdmin
      .from("jobber_connections")
      .select("last_sync_at,trial_started_at,trial_ends_at,billing_status,currency_code,company_name,jobber_account_name")
      .eq("id", connectionId)
      .maybeSingle()
      .then((r) => r.data),
    fetchAllRows(
      "fact_quotes",
      "jobber_quote_id,quote_number,quote_title,quote_status,quote_total_cents,quote_url,sent_at,updated_at_jobber,created_at_jobber",
      connectionId,
    ),
    supabaseAdmin
      .from("fact_requests")
      .select("title,request_status,client_name,phone,email,source,jobber_url,created_at_jobber")
      .eq("connection_id", connectionId)
      .not("request_status", "eq", "converted")
      .not("request_status", "eq", "archived")
      .order("created_at_jobber", { ascending: false })
      .limit(100)
      .then((r) => r.data ?? []),
  ]);

  const companyName = connDetails?.jobber_account_name || connDetails?.company_name || "Your Company";
  const currencyCode = (connDetails?.currency_code || "USD").toUpperCase();
  const money = moneyFactory(currencyCode);
  const lastSyncPretty = connDetails?.last_sync_at ? formatSyncTime(new Date(connDetails.last_sync_at)) : "Not synced yet";

  // Billing gate
  const billingStatus = connDetails?.billing_status ?? "trialing";
  const trialEndsAt = connDetails?.trial_ends_at ? new Date(connDetails.trial_ends_at).getTime() : 0;
  const trialActive = billingStatus === "trialing" && trialEndsAt > Date.now();
  const subscriptionActive = billingStatus === "active";
  const hasAccess = trialActive || subscriptionActive || !!adminConnectionId;

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
          maxWidth: 420, width: "100%", borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
          padding: "48px 32px", textAlign: "center",
          boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
        }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg, #7c5cff, #5aa6ff)", margin: "0 auto 28px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 40px rgba(90,166,255,0.3)" }}>
            <span style={{ fontSize: 32 }}>&#128274;</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#EAF1FF", marginBottom: 12 }}>
            {billingStatus === "trialing" ? "Trial Expired" : "Subscribe to Access"}
          </h1>
          <p style={{ fontSize: 15, color: "rgba(234,241,255,0.6)", lineHeight: 1.6, marginBottom: 32 }}>
            Your 14-day free trial has ended. Subscribe to continue accessing your AccuInsight dashboard.
          </p>
          <form action="/api/billing/checkout" method="POST">
            <button type="submit" className="btn-primary" style={{ width: "100%", padding: "16px 24px", borderRadius: 14, fontWeight: 700, fontSize: 16, border: "none", cursor: "pointer" }}>
              Subscribe — $29/month
            </button>
          </form>
        </div>
      </main>
    );
  }

  /* --------------------------------- Metrics --------------------------------- */
  const now = new Date();
  const todayUTC = startOfDayUTC(now);

  /* ----------- Quote pipeline ----------- */
  // Pipeline stages
  const draftQuotes = quotes.filter((q: any) => {
    const s = (q.quote_status || "").toUpperCase();
    return s === "DRAFT";
  });
  // Quote age helper
  const nowHealth = Date.now();
  function quoteAgeDays(q: any): number {
    const d = safeDate(q.updated_at_jobber) || safeDate(q.sent_at) || safeDate(q.created_at_jobber);
    return d ? (nowHealth - d.getTime()) / 86400000 : 9999;
  }

  const sentQuotes = quotes.filter((q: any) => {
    const s = (q.quote_status || "").toUpperCase();
    return (s === "AWAITING_RESPONSE" || s === "SENT") && quoteAgeDays(q) <= 45;
  });
  const changesReqQuotes = quotes.filter((q: any) => {
    const s = (q.quote_status || "").toUpperCase();
    return s === "CHANGES_REQUESTED" || s === "CHANGE_ORDER";
  });
  const approvedQuotes = quotes.filter((q: any) => {
    const s = (q.quote_status || "").toUpperCase();
    return s.includes("APPROV") || s.includes("ACCEPT");
  });
  const wonQuotes = quotes.filter((q: any) => statusLooksWon(q.quote_status || ""));
  const lostQuotes = quotes.filter((q: any) => statusLooksLost(q.quote_status || ""));

  function sumCents(arr: any[]) {
    return arr.reduce((s: number, q: any) => s + Number(q.quote_total_cents ?? 0), 0);
  }

  // Build quote rows for each pipeline stage (for action list + export)
  function quoteToRow(q: any) {
    const updated = safeDate(q.updated_at_jobber);
    const sent = safeDate(q.sent_at);
    return {
      quote_number: q.quote_number || "",
      quote_title: q.quote_title || "",
      amount_cents: Number(q.quote_total_cents ?? 0),
      status: q.quote_status || "",
      quote_url: q.quote_url || "",
      sent_at: sent ? sent.toISOString() : null,
      updated_at: updated ? updated.toISOString() : null,
      days_quiet: updated ? Math.max(0, Math.round((Date.now() - updated.getTime()) / 86400000)) : 999,
    };
  }

  const pipelineStages = [
    { label: "Requests", count: openRequests.length, value: "" },
    { label: "Draft", count: draftQuotes.length, value: money(sumCents(draftQuotes)) },
    { label: "Waiting on Customers", count: sentQuotes.length, value: money(sumCents(sentQuotes)) },
    { label: "Customer Wants Changes", count: changesReqQuotes.length, value: money(sumCents(changesReqQuotes)) },
    { label: "Won", count: approvedQuotes.length, value: money(sumCents(approvedQuotes)) },
  ];

  const pipelineQuoteRows = {
    Draft: draftQuotes.map(quoteToRow),
    "Waiting on Customers": sentQuotes.map(quoteToRow),
    "Customer Wants Changes": changesReqQuotes.map(quoteToRow),
    Won: approvedQuotes.map(quoteToRow),
  };

  // Pipeline value (all open/sent, not won/lost)
  const openQuotes = quotes.filter((q: any) => {
    const s = (q.quote_status || "").toUpperCase();
    return !statusLooksWon(s) && !statusLooksLost(s);
  });
  const pipelineValue = sumCents(openQuotes);

  /* ----------- Period-scoped KPI computation ----------- */
  const thisMonthStart = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth() - 1, 1));
  const thisMonthName = new Date().toLocaleString(undefined, { month: "long" });
  const lastMonthName = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth() - 1, 15)).toLocaleString(undefined, { month: "long" });

  function computeKpi(periodStart: Date | null, periodEnd: Date | null, periodLabel: string, winRateLabel: string) {
    const inPeriod = (d: Date | null) => {
      if (!d || !periodStart || !periodEnd) return true; // all-time
      return d >= periodStart && d < periodEnd;
    };

    // Win Rate: won / (won + lost + sent-still-open) — includes unresolved quotes
    // so owners who don't archive quotes still see an honest rate
    const periodWon = wonQuotes.filter((q: any) => inPeriod(safeDate(q.updated_at_jobber)));
    const periodLost = lostQuotes.filter((q: any) => inPeriod(safeDate(q.updated_at_jobber)));
    const periodSentOpen = sentQuotes.filter((q: any) => {
      const sent = safeDate(q.sent_at);
      return periodStart ? (sent && sent >= periodStart && sent < (periodEnd || todayUTC)) : true;
    });
    const winDenom = periodWon.length + periodLost.length + periodSentOpen.length;
    const winRate = winDenom > 0 ? periodWon.length / winDenom : 0;

    // Avg days to close for won quotes in period
    const wonWithDates = periodWon.filter((q: any) => safeDate(q.sent_at) && safeDate(q.updated_at_jobber));
    const avgDaysToClose = wonWithDates.length > 0
      ? Math.round(
          wonWithDates.reduce((s: number, q: any) => {
            const sent = safeDate(q.sent_at)!;
            const closed = safeDate(q.updated_at_jobber)!;
            return s + (closed.getTime() - sent.getTime()) / 86400000;
          }, 0) / wonWithDates.length
        )
      : 0;

    // Quotes sent in period
    const periodQuotesSent = quotes.filter((q: any) => {
      const sent = safeDate(q.sent_at);
      return sent && inPeriod(sent);
    });
    const quotesSent = periodQuotesSent.length;
    const quotesSentValue = sumCents(periodQuotesSent);

    const wonRevenue = sumCents(periodWon);

    return {
      winRate,
      winRateLabel,
      avgDaysToClose,
      wonCount: periodWon.length,
      wonRevenue: money(wonRevenue),
      quotesSent,
      quotesSentValue: money(quotesSentValue),
      monthLabel: periodLabel,
    };
  }

  const thisWeekStart = startOfWeekUTC(todayUTC);
  const lastWeekStart = addDaysUTC(thisWeekStart, -7);

  const thisWeekKpi = computeKpi(thisWeekStart, addDaysUTC(todayUTC, 1), "This Week", "Win Rate (This Week)");
  const lastWeekKpi = computeKpi(lastWeekStart, thisWeekStart, "Last Week", "Win Rate (Last Week)");
  const thisMonthKpi = computeKpi(thisMonthStart, addDaysUTC(todayUTC, 1), thisMonthName, "Win Rate (This Month)");
  const lastMonthKpi = computeKpi(lastMonthStart, thisMonthStart, lastMonthName, "Win Rate (Last Month)");
  const allTimeKpi = computeKpi(null, null, "All Time", "Win Rate (All Time)");

  // Event arrays for SalesTrendsSection
  const wonQuoteEvents = wonQuotes
    .filter((q: any) => safeDate(q.updated_at_jobber))
    .map((q: any) => ({ closedAt: safeDate(q.updated_at_jobber)!.getTime(), amount: Number(q.quote_total_cents ?? 0) }));
  const allClosureEvents = quotes
    .filter((q: any) => (statusLooksWon(q.quote_status) || statusLooksLost(q.quote_status)) && safeDate(q.updated_at_jobber))
    .map((q: any) => ({ closedAt: safeDate(q.updated_at_jobber)!.getTime(), won: statusLooksWon(q.quote_status) }));
  // Sent-but-still-open quotes — bucketed by sent_at so they count in the period they were sent
  const sentOpenEvents = sentQuotes
    .filter((q: any) => safeDate(q.sent_at))
    .map((q: any) => ({ sentAt: safeDate(q.sent_at)!.getTime() }));

  // Quote follow-up table: open quotes sorted by staleness
  const followUpQuotes = openQuotes
    .map((q: any) => {
      const updated = safeDate(q.updated_at_jobber);
      const sent = safeDate(q.sent_at);
      const daysQuiet = updated ? Math.max(0, Math.round((Date.now() - updated.getTime()) / 86400000)) : 999;
      return {
        quote_number: q.quote_number || "",
        quote_title: q.quote_title || "Untitled",
        sent_at: sent,
        amount_cents: Number(q.quote_total_cents ?? 0),
        updated_at: updated,
        days_quiet: daysQuiet,
        status: q.quote_status || "",
        quote_url: q.quote_url || "",
      };
    })
    .filter((q: any) => q.sent_at) // only show sent quotes
    .sort((a: any, b: any) => b.days_quiet - a.days_quiet);

  // Group quotes by age bucket (coldest first)
  // Age buckets — matches overview: Hot <14, Warm 14-30, Going Cold 30-45, Inactive 45+
  const ageBuckets = [
    { key: "hot", label: "Customers are interested", range: "< 14 days", color: "#10b981", bg: "rgba(16,185,129,0.08)", quotes: [] as typeof followUpQuotes },
    { key: "warm", label: "Follow up soon", range: "14\u201330 days", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", quotes: [] as typeof followUpQuotes },
    { key: "going-cold", label: "Call today or lose them", range: "30\u201345 days", color: "#ef4444", bg: "rgba(239,68,68,0.08)", quotes: [] as typeof followUpQuotes },
    { key: "inactive", label: "Probably lost", range: "45+ days", color: "#6b7280", bg: "rgba(107,114,128,0.08)", quotes: [] as typeof followUpQuotes },
  ];
  for (const q of followUpQuotes) {
    if (q.days_quiet <= 14) ageBuckets[0].quotes.push(q);
    else if (q.days_quiet <= 30) ageBuckets[1].quotes.push(q);
    else if (q.days_quiet <= 45) ageBuckets[2].quotes.push(q);
    else ageBuckets[3].quotes.push(q);
  }
  // Export data
  const followUpExportData = followUpQuotes.map((q) => ({
    "Age Group": q.days_quiet > 45 ? "Probably lost" : q.days_quiet > 30 ? "Call today or lose them" : q.days_quiet > 14 ? "Follow up soon" : "Customers are interested",
    "Days Quiet": q.days_quiet,
    "Quote #": q.quote_number,
    "Title": q.quote_title,
    "Sent": q.sent_at ? q.sent_at.toLocaleDateString() : "",
    "Amount": (q.amount_cents / 100).toFixed(2),
    "Last Activity": q.updated_at ? q.updated_at.toLocaleDateString() : "",
    "Status": q.status,
    "Jobber URL": q.quote_url,
  }));

  // Requests needing attention (not converted, not archived)
  const nowMs = Date.now();
  const requestsList = openRequests.map((r: any) => ({
    title: r.title || "Untitled Request",
    client_name: r.client_name || "",
    source: r.source || "",
    jobber_url: r.jobber_url || "",
    created_at: r.created_at_jobber || null,
    days_old: r.created_at_jobber ? Math.max(0, Math.floor((nowMs - new Date(r.created_at_jobber).getTime()) / 86400000)) : 0,
  }));

  // Changes requested quotes for action list
  const changesRequestedList = changesReqQuotes.map((q: any) => {
    const updated = safeDate(q.updated_at_jobber);
    const daysWaiting = updated ? Math.max(0, Math.round((nowMs - updated.getTime()) / 86400000)) : 0;
    return {
      quote_number: q.quote_number || "",
      quote_title: q.quote_title || "Untitled",
      amount: money(Number(q.quote_total_cents ?? 0)),
      amount_cents: Number(q.quote_total_cents ?? 0),
      updated_at: updated ? updated.toISOString() : null,
      days_waiting: daysWaiting,
      quote_url: q.quote_url || "",
    };
  }).sort((a: any, b: any) => b.days_waiting - a.days_waiting);

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <main className="dashboard-main" style={{
      minHeight: "100%",
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: "linear-gradient(180deg, #0b0e14 0%, #0f1219 100%)",
    }}>
      <DashboardLayout adminConnectionId={adminConnectionId} companyName={companyName} connectionId={connectionId} lastSyncPretty={lastSyncPretty} billingStatus={billingStatus} trialEndsAt={trialEndsAt} subscriptionActive={subscriptionActive}>
      <style>{globalStyles}</style>

      <ErrorBoundary>
      <div className="dashboard-container">

        {/* Sales Trends */}
        <SalesTrendsSection
          wonQuoteEvents={wonQuoteEvents}
          allClosureEvents={allClosureEvents}
          sentOpenEvents={sentOpenEvents}
          currencyCode={currencyCode}
        />

        {/* ===== Pipeline + Action List ===== */}
        <div data-tour="sales-actions" className="panel animate-in delay-1" style={{ marginTop: 12, padding: "12px 20px", overflow: "visible" }}>
          <SalesActionTabs
            requestCount={requestsList.length}
            requests={requestsList}
            quoteExportData={followUpExportData}
            changesRequested={changesRequestedList}
            pipelineStages={pipelineStages}
            pipelineQuotes={pipelineQuoteRows}
          >

          {followUpQuotes.length === 0 ? (
            <div className="text-muted" style={{ textAlign: "center", padding: 24, fontSize: 14 }}>
              No open quotes to follow up on.
            </div>
          ) : (<>
            {/* Collapsible grouped detail table (includes distribution bar) */}
            <QuoteFollowUpTable
              buckets={ageBuckets.map(b => ({
                ...b,
                quotes: b.quotes.map(q => ({
                  ...q,
                  sent_at: q.sent_at?.toISOString() ?? null,
                  updated_at: q.updated_at?.toISOString() ?? null,
                })),
              }))}
              currencyCode={currencyCode}
            />
          </>)}

          </SalesActionTabs>
        </div>

        {/* Bottom spacer */}
        <div style={{ height: 40 }} />
      </div>
      <OnboardingOverlay
        state={{ hasData: quotes.length > 0, weeklyTargetSet: false, trialDaysLeft: trialEndsAt > Date.now() ? Math.ceil((trialEndsAt - Date.now()) / 86400000) : 0 }}
        connectionId={connectionId}
        adminConnectionId={adminConnectionId}
      />
      </ErrorBoundary>
      </DashboardLayout>
    </main>
  );
}
