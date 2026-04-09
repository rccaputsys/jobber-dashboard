// src/app/jobber/invoices/page.tsx
import { supabaseAdmin, fetchAllRows } from "@/lib/supabaseAdmin";
import { getUser } from "@/lib/supabaseAuth";
import { redirect } from "next/navigation";
import { DashboardTopbar } from "../dashboard/DashboardTopbar";
import { OnboardingOverlay } from "../dashboard/OnboardingOverlay";
import { ActionStrip } from "../dashboard/ActionStrip";
import { AttentionList } from "../dashboard/AttentionList";
import { OutstandingInvoices } from "./OutstandingInvoices";
import { ErrorBoundary } from "../dashboard/ErrorBoundary";
import { DashboardLayout } from "../dashboard/DashboardLayout";
import {
  safeDate,
  startOfDayUTC,
  startOfWeekUTC,
  addDaysUTC,
  moneyFactory,
  formatSyncTime,
  globalStyles,
  theme,
} from "@/lib/dashboardHelpers";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ admin_connection_id?: string }>;
}) {
  const sp = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login?redirect=/jobber/invoices");

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

  // Fetch data
  const [connDetails, invoices, needsInvoicingRaw, visits] = await Promise.all([
    supabaseAdmin
      .from("jobber_connections")
      .select("last_sync_at,trial_started_at,trial_ends_at,billing_status,currency_code,company_name,jobber_account_name")
      .eq("id", connectionId)
      .maybeSingle()
      .then((r) => r.data),
    fetchAllRows("fact_invoices", "status,paid_at,total_amount_cents,created_at_jobber,due_at,invoice_number,client_name,subject,balance_cents,jobber_url,jobber_invoice_id", connectionId),
    supabaseAdmin
      .from("fact_jobs")
      .select("job_number,job_title,total_amount_cents,jobber_url,scheduled_start_at,jobber_job_id")
      .eq("connection_id", connectionId)
      .eq("status", "requires_invoicing")
      .order("total_amount_cents", { ascending: false })
      .limit(100)
      .then((r) => r.data ?? []),
    fetchAllRows("fact_visits", "jobber_visit_id,jobber_job_id,title,visit_status,completed_at,job_number", connectionId),
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
        minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(180deg, #060811 0%, #0A1222 100%)", padding: 24,
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
  const nowMs = Date.now();

  const thisWeekStart = startOfWeekUTC(todayUTC);
  const lastWeekStart = addDaysUTC(thisWeekStart, -7);
  const thisMonthStart = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth() - 1, 1));

  function computeKpi(periodStart: Date | null, periodEnd: Date | null, periodLabel: string) {
    const inPeriod = (d: Date | null) => {
      if (!d || !periodStart || !periodEnd) return true;
      return d >= periodStart && d < periodEnd;
    };

    const paidInPeriod = invoices.filter((i: any) => i.status === "paid" && inPeriod(safeDate(i.paid_at)));
    const collectedCents = paidInPeriod.reduce((s: number, i: any) => s + Number(i.total_amount_cents ?? 0), 0);

    const sentInPeriod = invoices.filter((i: any) => inPeriod(safeDate(i.created_at_jobber)));
    const sentValue = sentInPeriod.reduce((s: number, i: any) => s + Number(i.total_amount_cents ?? 0), 0);

    // Avg days to pay: due date → paid date
    const paidWithDates = paidInPeriod.filter((i: any) => safeDate(i.due_at) && safeDate(i.paid_at));
    const avgDaysToPay = paidWithDates.length > 0
      ? Math.round(paidWithDates.reduce((s: number, i: any) => {
          const due = safeDate(i.due_at)!.getTime();
          const paid = safeDate(i.paid_at)!.getTime();
          return s + (paid - due) / 86400000;
        }, 0) / paidWithDates.length)
      : 0;

    return {
      collectedRevenue: money(collectedCents),
      collectedCount: paidInPeriod.length,
      invoicesSent: sentInPeriod.length,
      invoicesSentValue: money(sentValue),
      avgDaysToPay,
      periodLabel,
    };
  }

  const thisWeekKpi = computeKpi(thisWeekStart, addDaysUTC(todayUTC, 1), "This Week");
  const lastWeekKpi = computeKpi(lastWeekStart, thisWeekStart, "Last Week");
  const thisMonthKpi = computeKpi(thisMonthStart, addDaysUTC(todayUTC, 1), "This Month");
  const lastMonthKpi = computeKpi(lastMonthStart, thisMonthStart, "Last Month");
  const allTimeKpi = computeKpi(null, null, "All Time");

  // Outstanding invoices
  const outstanding = invoices
    .filter((i: any) => i.status === "awaiting_payment" || i.status === "past_due")
    .map((i: any) => {
      const dueDate = safeDate(i.due_at);
      const daysOverdue = dueDate ? Math.max(0, Math.floor((nowMs - dueDate.getTime()) / 86400000)) : 0;
      return {
        invoice_number: i.invoice_number || "",
        client_name: i.client_name || "",
        subject: i.subject || "",
        status: i.status || "",
        total_amount_cents: Number(i.total_amount_cents ?? 0),
        balance_cents: Number(i.balance_cents ?? i.total_amount_cents ?? 0),
        due_at: i.due_at || null,
        jobber_url: i.jobber_url || "",
        days_overdue: daysOverdue,
      };
    })
    .sort((a, b) => b.days_overdue - a.days_overdue);

  const outstandingBalance = outstanding.reduce((s, i) => s + i.balance_cents, 0);
  const pastDueCount = outstanding.filter(i => i.days_overdue > 0).length;
  const pastDueBalance = outstanding.filter(i => i.days_overdue > 0).reduce((s, i) => s + i.balance_cents, 0);

  // Aging buckets for donut chart (matches OutstandingInvoices categories)
  const agingBuckets = [
    { label: "30+ Days", color: "#ef4444", balanceCents: 0, count: 0 },
    { label: "8\u201330 Days", color: "#f59e0b", balanceCents: 0, count: 0 },
    { label: "1\u20137 Days", color: "#5aa6ff", balanceCents: 0, count: 0 },
    { label: "Current", color: "#10b981", balanceCents: 0, count: 0 },
  ];
  for (const inv of outstanding) {
    const b = inv.days_overdue >= 30 ? agingBuckets[0] : inv.days_overdue >= 7 ? agingBuckets[1] : inv.days_overdue > 0 ? agingBuckets[2] : agingBuckets[3];
    b.balanceCents += inv.balance_cents;
    b.count++;
  }

  // Draft invoices (not sent yet)
  const draftInvoices = invoices.filter((i: any) => (i.status || "").toLowerCase() === "draft");
  const draftCount = draftInvoices.length;
  const draftCents = draftInvoices.reduce((s: number, i: any) => s + Number(i.total_amount_cents ?? 0), 0);

  // Trend events — use due_at for "sent" (when invoice became active), not created_at
  // This prevents the mismatch where invoices created in month A show as "invoiced" in A
  // but collected in month B, making B look >100% collected
  const invoiceEvents = invoices
    .filter((i: any) => (i.status || "").toLowerCase() !== "draft") // exclude drafts
    .map((i: any) => {
      const events: { ts: number; amount: number; type: "sent" | "paid" }[] = [];
      const due = safeDate(i.due_at) || safeDate(i.created_at_jobber);
      if (due) events.push({ ts: due.getTime(), amount: Number(i.total_amount_cents ?? 0), type: "sent" });
      if (i.status === "paid") {
        const paid = safeDate(i.paid_at);
        if (paid) events.push({ ts: paid.getTime(), amount: Number(i.total_amount_cents ?? 0), type: "paid" });
      }
      return events;
    })
    .flat();

  // Payment timings for avg days to pay (reactive to range slicer)
  const paymentTimings = invoices
    .filter((i: any) => i.status === "paid" && safeDate(i.due_at) && safeDate(i.paid_at))
    .map((i: any) => ({ paidTs: safeDate(i.paid_at)!.getTime(), dueTs: safeDate(i.due_at)!.getTime() }));

  // Jobs needing invoicing — include completed visits for context
  const needsInvoicingJobIds = new Set(needsInvoicingRaw.map((j: any) => j.jobber_job_id).filter(Boolean));

  // Count completed visits per needs-invoicing job
  const visitCountByJob = new Map<string, number>();
  const latestVisitByJob = new Map<string, string>();
  for (const v of visits) {
    const jid = (v as any).jobber_job_id;
    if (!jid || !needsInvoicingJobIds.has(jid)) continue;
    if ((v as any).visit_status === "COMPLETED") {
      visitCountByJob.set(jid, (visitCountByJob.get(jid) || 0) + 1);
      const ca = (v as any).completed_at;
      if (ca && (!latestVisitByJob.has(jid) || ca > latestVisitByJob.get(jid)!)) {
        latestVisitByJob.set(jid, ca);
      }
    }
  }

  const needsInvoicing = needsInvoicingRaw.map((j: any) => ({
    job_number: Number(j.job_number ?? 0),
    job_title: j.job_title || "",
    total_amount_cents: Number(j.total_amount_cents ?? 0),
    jobber_url: j.jobber_url || "",
    scheduled_at: latestVisitByJob.get(j.jobber_job_id) || j.scheduled_start_at || null,
    completedVisits: visitCountByJob.get(j.jobber_job_id) || 0,
  }));

  /* ------------------------------------------------------------------ */
  /*  Prioritized action list — "here's what needs your attention"      */
  /* ------------------------------------------------------------------ */
  type InvoiceAction = {
    text: string;
    why: string;
    color: string;
    priority: number;
  };
  const invoiceActions: InvoiceAction[] = [];

  // Split outstanding into fresh vs stale (180+ days = likely abandoned)
  const STALE_INV_DAYS = 180;
  const freshOutstanding = outstanding.filter((i) => i.days_overdue < STALE_INV_DAYS);
  const staleOutstanding = outstanding.filter((i) => i.days_overdue >= STALE_INV_DAYS);

  // P1 — Severely overdue (30+ days late, but not yet stale)
  const veryOverdue = freshOutstanding.filter((i) => i.days_overdue >= 30);
  if (veryOverdue.length > 0) {
    const cents = veryOverdue.reduce((s, i) => s + i.balance_cents, 0);
    invoiceActions.push({
      text: `Call on ${veryOverdue.length} invoice${veryOverdue.length !== 1 ? "s" : ""} 30+ days overdue — ${money(cents)}`,
      why: "This money is yours. A phone call today could collect it.",
      color: "#ef4444",
      priority: 1,
    });
  }

  // P2 — Recently overdue (8-30 days)
  const recentlyOverdue = freshOutstanding.filter((i) => i.days_overdue >= 8 && i.days_overdue < 30);
  if (recentlyOverdue.length > 0) {
    const cents = recentlyOverdue.reduce((s, i) => s + i.balance_cents, 0);
    invoiceActions.push({
      text: `Send firm reminders for ${recentlyOverdue.length} late invoice${recentlyOverdue.length !== 1 ? "s" : ""} — ${money(cents)}`,
      why: "Past due 8+ days. A direct ask now keeps these from sliding to 30+ days.",
      color: "#f59e0b",
      priority: 2,
    });
  }

  // P2 — Jobs done but not yet invoiced
  if (needsInvoicing.length > 0) {
    const cents = needsInvoicing.reduce((s, j) => s + j.total_amount_cents, 0);
    invoiceActions.push({
      text: `Invoice ${needsInvoicing.length} completed job${needsInvoicing.length !== 1 ? "s" : ""} — ${money(cents)}`,
      why: "Work is done — get the bill out so you can get paid.",
      color: "#5aa6ff",
      priority: 2,
    });
  }

  // P3 — Draft invoices ready to send
  if (draftCount > 0) {
    invoiceActions.push({
      text: `Send ${draftCount} draft invoice${draftCount !== 1 ? "s" : ""} — ${money(draftCents)}`,
      why: "These are ready — takes 2 minutes to hit send.",
      color: "#5aa6ff",
      priority: 3,
    });
  }

  // P3 — Just barely overdue (1-7 days) — friendly nudge
  const justLate = freshOutstanding.filter((i) => i.days_overdue >= 1 && i.days_overdue < 8);
  if (justLate.length > 0) {
    const cents = justLate.reduce((s, i) => s + i.balance_cents, 0);
    invoiceActions.push({
      text: `Friendly reminder for ${justLate.length} invoice${justLate.length !== 1 ? "s" : ""} just past due — ${money(cents)}`,
      why: "Still recent — a polite check-in often clears them up.",
      color: "#5aa6ff",
      priority: 3,
    });
  }

  // P5 — Cleanup: stale outstanding (180+ days) — likely uncollectible
  if (staleOutstanding.length > 0) {
    const cents = staleOutstanding.reduce((s, i) => s + i.balance_cents, 0);
    invoiceActions.push({
      text: `Write off or archive ${staleOutstanding.length} dead invoice${staleOutstanding.length !== 1 ? "s" : ""}${cents > 0 ? ` — ${money(cents)}` : ""}`,
      why: "Outstanding 180+ days. Either collect now via collections or write them off so your AR reflects reality.",
      color: "#6b7280",
      priority: 5,
    });
  }

  invoiceActions.sort((a, b) => a.priority - b.priority);

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

        {/* ===== Here's What Needs Your Attention (prioritized invoice actions) ===== */}
        <AttentionList
          actions={invoiceActions}
          emptyMessage="Nothing urgent right now — collections are in good shape."
        />

        {/* Invoice Action List */}
        <OutstandingInvoices
          invoices={outstanding}
          needsInvoicing={needsInvoicing}
          drafts={draftInvoices.map((i: any) => ({
            invoice_number: i.invoice_number || "",
            client_name: i.client_name || "",
            total_amount_cents: Number(i.total_amount_cents ?? 0),
            jobber_url: i.jobber_url || (i.jobber_invoice_id ? `https://secure.getjobber.com/invoices/${i.jobber_invoice_id}` : ""),
            created_at: i.created_at_jobber || null,
          }))}
          currencyCode={currencyCode}
        />

        <div style={{ height: 40 }} />
      </div>
      <OnboardingOverlay
        state={{ hasData: invoices.length > 0, weeklyTargetSet: false, trialDaysLeft: trialEndsAt > Date.now() ? Math.ceil((trialEndsAt - Date.now()) / 86400000) : 0 }}
        connectionId={connectionId}
        adminConnectionId={adminConnectionId}
      />
      </ErrorBoundary>
      </DashboardLayout>
    </main>
  );
}
