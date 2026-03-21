// src/app/jobber/capacity/page.tsx
import { supabaseAdmin, fetchAllRows } from "@/lib/supabaseAdmin";
import { getUser } from "@/lib/supabaseAuth";
import { redirect } from "next/navigation";
import { DashboardTopbar } from "../dashboard/DashboardTopbar";
import { CapacityTrendsSection } from "./CapacityTrendsSection";
import { CapacityWeekBreakdown } from "./CapacityWeekBreakdown";
import { CapacityKpiCards } from "./CapacityKpiCards";
import { CapacityActionList } from "./CapacityActionList";
import {
  safeDate,
  startOfDayUTC,
  startOfWeekUTC,
  startOfMonthUTC,
  addDaysUTC,
  moneyFactory,
  formatSyncTime,
  globalStyles,
  theme,
} from "@/lib/dashboardHelpers";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default async function CapacityPage({
  searchParams,
}: {
  searchParams: Promise<{
    admin_connection_id?: string;
  }>;
}) {
  const sp = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login?redirect=/jobber/capacity");

  const ADMIN_EMAILS = ["rcaputo91@gmail.com"];
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
        <div style={{ padding: 24, color: "#EAF1FF", minHeight: "100vh", background: "#060811" }}>
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
        <div style={{ padding: 24, color: "#EAF1FF", minHeight: "100vh", background: "#060811" }}>
          <h2>No Jobber account connected</h2>
          <p style={{ marginTop: 8, color: theme.sub }}>See Your Numbers Now.</p>
          <a href="/jobber" style={{ color: "#5aa6ff", marginTop: 16, display: "inline-block" }}>Connect Jobber &rarr;</a>
        </div>
      );
    }
    connectionId = connection.id;
  }

  // Fetch connection details + jobs
  const [connDetails, jobs] = await Promise.all([
    supabaseAdmin
      .from("jobber_connections")
      .select("last_sync_at,trial_started_at,trial_ends_at,billing_status,currency_code,company_name,jobber_account_name,weekly_capacity_cents")
      .eq("id", connectionId)
      .maybeSingle()
      .then((r) => r.data),
    fetchAllRows("fact_jobs", "*", connectionId),
  ]);

  const companyName = connDetails?.jobber_account_name || connDetails?.company_name || "Your Company";
  const currencyCode = (connDetails?.currency_code || "USD").toUpperCase();
  const money = moneyFactory(currencyCode);
  const lastSyncPretty = connDetails?.last_sync_at ? formatSyncTime(new Date(connDetails.last_sync_at)) : "Not synced yet";
  const weeklyCapacityCents: number | null = connDetails?.weekly_capacity_cents ?? null;

  // Monthly target — query separately so missing column doesn't break the page
  let monthlyCapacityCents: number | null = null;
  try {
    const { data: mc } = await supabaseAdmin
      .from("jobber_connections")
      .select("monthly_capacity_cents")
      .eq("id", connectionId)
      .maybeSingle();
    monthlyCapacityCents = mc?.monthly_capacity_cents ?? null;
  } catch {
    // Column doesn't exist yet — that's fine
  }

  // Billing gate
  const billingStatus = connDetails?.billing_status ?? "trialing";
  const trialEndsAt = connDetails?.trial_ends_at ? new Date(connDetails.trial_ends_at).getTime() : 0;
  const trialActive = billingStatus === "trialing" && trialEndsAt > Date.now();
  const subscriptionActive = billingStatus === "active";
  const hasAccess = trialActive || subscriptionActive || !!adminConnectionId;

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
  const thisWeekStart = startOfWeekUTC(todayUTC);
  const thisWeekEnd = addDaysUTC(thisWeekStart, 7);
  const nextWeekStart = thisWeekEnd;
  const nextWeekEnd = addDaysUTC(nextWeekStart, 7);
  const thisMonthStart = startOfMonthUTC(todayUTC);
  const thisMonthEnd = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth() + 1, 1));
  const nextMonthStart = thisMonthEnd;
  const nextMonthEnd = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth() + 2, 1));

  function periodJobs(start: Date, end: Date) {
    return jobs.filter((j: any) => {
      const sched = safeDate(j.scheduled_start_at);
      return sched && sched >= start && sched < end;
    });
  }

  // For monthly periods: use monthlyCapacityCents if set, otherwise fall back to weekly × weeks-in-period
  function computePeriodMetrics(start: Date, end: Date, weeklyTarget: number | null, periodLabel: string, monthlyTarget?: number | null) {
    const pJobs = periodJobs(start, end);
    const revenueCents = pJobs.reduce((s: number, j: any) => s + Number(j.total_amount_cents ?? 0), 0);

    const daysInPeriod = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const weeksInPeriod = daysInPeriod / 7;

    // Use explicit monthly target for month-length periods, otherwise scale weekly
    const periodTargetCents = monthlyTarget
      ? monthlyTarget
      : weeklyTarget ? Math.round(weeklyTarget * weeksInPeriod) : 0;

    const fillRate = periodTargetCents > 0 ? revenueCents / periodTargetCents : 0;
    const gapCents = periodTargetCents - revenueCents;
    const workingDays = Math.max(1, Math.round(daysInPeriod * 5 / 7));
    const avgPerDayCents = Math.round(revenueCents / workingDays);
    const dailyTargetCents = periodTargetCents > 0 ? Math.round(periodTargetCents / workingDays) : 0;

    // Prior period comparison (same duration, shifted back)
    const priorStart = addDaysUTC(start, -daysInPeriod);
    const priorEnd = start;
    const priorJobs = periodJobs(priorStart, priorEnd);
    const priorRevenueCents = priorJobs.reduce((s: number, j: any) => s + Number(j.total_amount_cents ?? 0), 0);
    const priorJobCount = priorJobs.length;

    // Revenue per job
    const revenuePerJobCents = pJobs.length > 0 ? Math.round(revenueCents / pJobs.length) : 0;
    const priorRevenuePerJobCents = priorJobCount > 0 ? Math.round(priorRevenueCents / priorJobCount) : 0;

    return {
      scheduledRevenue: money(revenueCents),
      scheduledRevenueCents: revenueCents,
      targetCents: periodTargetCents,
      fillRate,
      gapCents,
      gapLabel: gapCents > 0 ? `${money(gapCents)} to go` : `Over by ${money(Math.abs(gapCents))}`,
      avgRevenuePerDay: money(avgPerDayCents),
      avgRevenuePerDayCents: avgPerDayCents,
      dailyTargetCents,
      jobCount: pJobs.length,
      periodLabel,
      priorRevenueCents,
      revenuePerJobCents,
      priorJobCount,
      priorRevenuePerJobCents,
    };
  }

  const kpiThisWeek = computePeriodMetrics(thisWeekStart, thisWeekEnd, weeklyCapacityCents, "This Week");
  const kpiNextWeek = computePeriodMetrics(nextWeekStart, nextWeekEnd, weeklyCapacityCents, "Next Week");
  const kpiThisMonth = computePeriodMetrics(thisMonthStart, thisMonthEnd, weeklyCapacityCents, "This Month", monthlyCapacityCents);
  const kpiNextMonth = computePeriodMetrics(nextMonthStart, nextMonthEnd, weeklyCapacityCents, "Next Month", monthlyCapacityCents);

  // 8-week projection summary (for the hero callout)
  let projectionSummary: { fillPct: number; gapCents: number; weeks: number } | null = null;
  if (weeklyCapacityCents) {
    const PROJ_WEEKS = 8;
    let totalScheduled = 0;
    for (let i = 0; i < PROJ_WEEKS; i++) {
      const wStart = addDaysUTC(thisWeekStart, i * 7);
      const wEnd = addDaysUTC(wStart, 7);
      const rev = periodJobs(wStart, wEnd).reduce((s: number, j: any) => s + Number(j.total_amount_cents ?? 0), 0);
      totalScheduled += rev;
    }
    const totalTarget = weeklyCapacityCents * PROJ_WEEKS;
    projectionSummary = {
      fillPct: totalTarget > 0 ? totalScheduled / totalTarget : 0,
      gapCents: totalTarget - totalScheduled,
      weeks: PROJ_WEEKS,
    };
  }

  // Daily breakdown
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const thisWeekDaily = dayLabels.map((label, i) => {
    const dayStart = addDaysUTC(thisWeekStart, i);
    const dayEnd = addDaysUTC(dayStart, 1);
    const dayJobs = periodJobs(dayStart, dayEnd);
    const revenue = dayJobs.reduce((s: number, j: any) => s + Number(j.total_amount_cents ?? 0), 0);
    return { label, revenue, jobCount: dayJobs.length, date: dayStart.toISOString() };
  });
  const nextWeekDaily = dayLabels.map((label, i) => {
    const dayStart = addDaysUTC(nextWeekStart, i);
    const dayEnd = addDaysUTC(dayStart, 1);
    const dayJobs = periodJobs(dayStart, dayEnd);
    const revenue = dayJobs.reduce((s: number, j: any) => s + Number(j.total_amount_cents ?? 0), 0);
    return { label, revenue, jobCount: dayJobs.length, date: dayStart.toISOString() };
  });

  // Historical job events for trends
  const jobEvents = jobs
    .filter((j: any) => safeDate(j.scheduled_start_at))
    .map((j: any) => ({ scheduledAt: safeDate(j.scheduled_start_at)!.getTime(), amount: Number(j.total_amount_cents ?? 0) }));

  // Unscheduled jobs — no scheduled_start_at
  const unscheduledJobs = jobs
    .filter((j: any) => !j.scheduled_start_at)
    .map((j: any) => ({
      job_number: Number(j.job_number ?? 0),
      job_title: j.job_title || "",
      total_amount_cents: Number(j.total_amount_cents ?? 0),
      jobber_url: j.jobber_url || "",
      status: j.status || "",
      created_at: j.created_at_jobber || j.created_at || null,
    }))
    .sort((a, b) => {
      // Sort by age descending (oldest unscheduled first)
      const aTime = a.created_at ? new Date(a.created_at).getTime() : Infinity;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : Infinity;
      return aTime - bTime;
    });


  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
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

      <div className="dashboard-container">
        <DashboardTopbar
          companyName={companyName}
          lastSyncPretty={lastSyncPretty}
          connectionId={connectionId}
          billingStatus={billingStatus}
          trialEndsAt={trialEndsAt}
          subscriptionActive={subscriptionActive}
          adminConnectionId={adminConnectionId}
        />

        {/* Hero: Capacity Overview — gauge + KPIs + projection callout */}
        <div className="animate-in delay-1" style={{ marginTop: 20 }}>
          <CapacityKpiCards
            thisWeek={kpiThisWeek}
            nextWeek={kpiNextWeek}
            thisMonth={kpiThisMonth}
            nextMonth={kpiNextMonth}
            hasTarget={!!(weeklyCapacityCents || monthlyCapacityCents)}
            currentWeeklyCents={weeklyCapacityCents}
            currentMonthlyCents={monthlyCapacityCents}
            currencyCode={currencyCode}
            adminConnectionId={adminConnectionId}
            projectionSummary={projectionSummary}
          />
        </div>

        {/* Daily Breakdown — full width, the actionable day-by-day view */}
        <div className="animate-in delay-1" style={{ marginTop: 16 }}>
          <CapacityWeekBreakdown
            thisWeekDaily={thisWeekDaily}
            nextWeekDaily={nextWeekDaily}
            weeklyCapacityCents={weeklyCapacityCents}
            currencyCode={currencyCode}
          />
        </div>

        {/* Section divider */}
        <div className="animate-in delay-2" style={{
          marginTop: 28,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div className="text-muted" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>
            Historical
          </div>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
        </div>

        {/* Capacity Trends — full width, 2-up charts */}
        <CapacityTrendsSection
          jobEvents={jobEvents}
          targetCents={weeklyCapacityCents}
          monthlyTargetCents={monthlyCapacityCents}
          currencyCode={currencyCode}
        />

        {/* Unscheduled Jobs — at the very bottom */}
        <CapacityActionList
          unscheduledJobs={unscheduledJobs}
          currencyCode={currencyCode}
        />

        <div style={{ height: 40 }} />
      </div>
    </main>
  );
}
