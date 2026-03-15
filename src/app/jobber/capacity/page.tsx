// src/app/jobber/capacity/page.tsx
import { supabaseAdmin, fetchAllRows } from "@/lib/supabaseAdmin";
import { getUser } from "@/lib/supabaseAuth";
import { redirect } from "next/navigation";
import { ThemeToggle } from "../dashboard/ThemeToggle";
import { SyncButton } from "../dashboard/SyncButton";
import { NavTabs } from "../dashboard/NavTabs";
import { CapacityEditor } from "../sales/CapacityEditor";
import { CapacityTrendsSection } from "./CapacityTrendsSection";
import { CapacityGauge } from "./CapacityGauge";
import {
  safeDate,
  startOfDayUTC,
  startOfWeekUTC,
  addDaysUTC,
  moneyFactory,
  formatSyncTime,
  pct,
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

  // Current week (Mon-Sun)
  const thisWeekStart = startOfWeekUTC(todayUTC);
  const thisWeekEnd = addDaysUTC(thisWeekStart, 7);

  // Next week
  const nextWeekStart = thisWeekEnd;
  const nextWeekEnd = addDaysUTC(nextWeekStart, 7);

  // Jobs scheduled this week / next week
  function weekJobs(start: Date, end: Date) {
    return jobs.filter((j: any) => {
      const sched = safeDate(j.scheduled_start_at);
      if (!sched) return false;
      return sched >= start && sched < end;
    });
  }

  const thisWeekJobs = weekJobs(thisWeekStart, thisWeekEnd);
  const nextWeekJobs = weekJobs(nextWeekStart, nextWeekEnd);

  const thisWeekRevenue = thisWeekJobs.reduce((s: number, j: any) => s + Number(j.total_amount_cents ?? 0), 0);
  const nextWeekRevenue = nextWeekJobs.reduce((s: number, j: any) => s + Number(j.total_amount_cents ?? 0), 0);

  const thisWeekFill = weeklyCapacityCents ? thisWeekRevenue / weeklyCapacityCents : 0;
  const nextWeekFill = weeklyCapacityCents ? nextWeekRevenue / weeklyCapacityCents : 0;

  function fillColorClass(fill: number) {
    if (fill >= 0.9) return "text-success";
    if (fill >= 0.5) return "text-warning";
    return "text-critical";
  }

  // Job events for CapacityTrendsSection
  const jobEvents = jobs
    .filter((j: any) => safeDate(j.scheduled_start_at))
    .map((j: any) => ({ scheduledAt: safeDate(j.scheduled_start_at)!.getTime(), amount: Number(j.total_amount_cents ?? 0) }));

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

      {adminConnectionId && (
        <div style={{
          background: "linear-gradient(90deg, #7c5cff, #5aa6ff)",
          color: "#fff",
          textAlign: "center",
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.2,
        }}>
          Viewing as: {companyName}
          <a href="/admin" style={{ color: "#fff", marginLeft: 12, textDecoration: "underline", opacity: 0.9 }}>&larr; Back to Admin</a>
        </div>
      )}

      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header animate-in">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="40" height="40" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c5cff" />
                  <stop offset="100%" stopColor="#5aa6ff" />
                </linearGradient>
              </defs>
              <circle cx="25" cy="25" r="22" fill="none" stroke="url(#logoGrad)" strokeWidth="3"/>
              <polyline points="8,25 16,25 21,12 29,38 34,20 42,25" fill="none" stroke="url(#logoGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <h1 className="text-primary" style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>
                {companyName}
              </h1>
              <p className="header-subtitle" style={{ fontSize: 13, marginTop: 4 }}>
                Last sync: <span>{lastSyncPretty}</span> &bull; {currencyCode}
              </p>
            </div>
          </div>
          <div className="header-actions">
            <SyncButton connectionId={connectionId} />
            <ThemeToggle />
          </div>
        </header>

        <NavTabs adminConnectionId={adminConnectionId} />

        {/* ===== Section A: Weekly Capacity KPIs ===== */}
        <div className="kpi-grid-primary animate-in delay-1" style={{ marginTop: 20 }}>
          {/* This Week's Revenue */}
          <div className={`kpi-primary hover-lift ${weeklyCapacityCents ? '' : 'gradient-purple'}`} style={weeklyCapacityCents ? {
            background: `linear-gradient(145deg, ${thisWeekFill >= 0.9 ? 'rgba(16,185,129,0.15)' : thisWeekFill >= 0.5 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'} 0%, rgba(255,255,255,0.02) 100%)`,
            borderColor: `${thisWeekFill >= 0.9 ? 'rgba(16,185,129,0.4)' : thisWeekFill >= 0.5 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'}`,
          } : undefined}>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>&#128176;</span>
                <span className="text-secondary" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  This Week&apos;s Revenue
                </span>
              </div>
              <div className={`kpi-value-large ${weeklyCapacityCents ? fillColorClass(thisWeekFill) : 'text-primary'}`}>
                {money(thisWeekRevenue)}
              </div>
              <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
                {weeklyCapacityCents
                  ? `of ${money(weeklyCapacityCents)} target \u2022 ${thisWeekJobs.length} jobs`
                  : `${thisWeekJobs.length} jobs scheduled`
                }
              </div>
            </div>
          </div>

          {/* Next Week Preview */}
          <div className="kpi-primary hover-lift" style={weeklyCapacityCents ? {
            background: `linear-gradient(145deg, ${nextWeekFill >= 0.9 ? 'rgba(16,185,129,0.08)' : nextWeekFill >= 0.5 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)'} 0%, rgba(255,255,255,0.02) 100%)`,
          } : undefined}>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>&#128197;</span>
                <span className="text-secondary" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Next Week Preview
                </span>
              </div>
              <div className={`kpi-value-large ${weeklyCapacityCents ? fillColorClass(nextWeekFill) : 'text-primary'}`}>
                {money(nextWeekRevenue)}
              </div>
              <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
                {weeklyCapacityCents
                  ? `${pct(nextWeekFill)} of target \u2022 ${nextWeekJobs.length} jobs`
                  : `${nextWeekJobs.length} jobs scheduled`
                }
              </div>
            </div>
          </div>
        </div>

        {/* ===== Capacity Fill Gauges ===== */}
        {weeklyCapacityCents ? (
          <div className="panel animate-in delay-1" style={{ marginTop: 16, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                Capacity Fill Rate
              </h2>
              <span className="info-tooltip" style={{ width: 16, height: 16, fontSize: 10 }}>?<span className="tooltip-text">How full your schedule is relative to your weekly revenue target. Green = 90%+, amber = 50-89%, red = under 50%.</span></span>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
              <CapacityGauge
                fillRate={thisWeekFill}
                label="This Week"
                subtitle={`${money(thisWeekRevenue)} of ${money(weeklyCapacityCents)}`}
                colorClass={fillColorClass(thisWeekFill)}
              />
              <CapacityGauge
                fillRate={nextWeekFill}
                label="Next Week"
                subtitle={`${money(nextWeekRevenue)} of ${money(weeklyCapacityCents)}`}
                colorClass={fillColorClass(nextWeekFill)}
              />
            </div>
          </div>
        ) : null}

        {/* ===== Section B: Capacity Trend Charts ===== */}
        <CapacityTrendsSection
          jobEvents={jobEvents}
          targetCents={weeklyCapacityCents}
          currencyCode={currencyCode}
        />
        <div className="panel animate-in delay-2" style={{ marginTop: 16, padding: 20 }}>
          <CapacityEditor currentCents={weeklyCapacityCents} />
        </div>

        {/* Bottom spacer */}
        <div style={{ height: 40 }} />
      </div>
    </main>
  );
}
