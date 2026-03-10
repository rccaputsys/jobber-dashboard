// src/app/jobber/sales/page.tsx
import React from "react";
import { supabaseAdmin, fetchAllRows } from "@/lib/supabaseAdmin";
import { getUser } from "@/lib/supabaseAuth";
import { redirect } from "next/navigation";
import { ExportCSV } from "../dashboard/ExportCSV";
import { ThemeToggle } from "../dashboard/ThemeToggle";
import { SyncButton } from "../dashboard/SyncButton";
import { NavTabs } from "../dashboard/NavTabs";
import { CapacityEditor } from "./CapacityEditor";
import { QuotePipeline } from "./QuotePipeline";
import { CapacityChart } from "./CapacityChart";
import {
  safeDate,
  startOfDayUTC,
  startOfWeekUTC,
  addDaysUTC,
  moneyFactory,
  formatSyncTime,
  statusLooksWon,
  statusLooksLost,
  pct,
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

  const isAdmin = user.email === "alex@ownerview.io";
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

  // Fetch connection details + data in parallel
  const [connDetails, jobs, quotes] = await Promise.all([
    supabaseAdmin
      .from("jobber_connections")
      .select("last_sync_at,trial_started_at,trial_ends_at,billing_status,currency_code,company_name,jobber_account_name,weekly_capacity_cents")
      .eq("id", connectionId)
      .maybeSingle()
      .then((r) => r.data),
    fetchAllRows("fact_jobs", "*", connectionId),
    fetchAllRows(
      "fact_quotes",
      "jobber_quote_id,quote_number,quote_title,quote_status,quote_total_cents,quote_url,sent_at,updated_at_jobber,created_at_jobber",
      connectionId,
    ),
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

  function fillSeverity(fill: number): "critical" | "warning" | "good" {
    if (fill >= 0.9) return "good";
    if (fill >= 0.5) return "warning";
    return "critical";
  }

  function fillColorClass(fill: number) {
    const sev = fillSeverity(fill);
    if (sev === "good") return "text-success";
    if (sev === "warning") return "text-warning";
    return "text-critical";
  }

  // Capacity trend: last 12 weeks
  const capacityWeeks: { label: string; cents: number; fillRate: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const wStart = addDaysUTC(thisWeekStart, -7 * i);
    const wEnd = addDaysUTC(wStart, 7);
    const wJobs = weekJobs(wStart, wEnd);
    const wRevenue = wJobs.reduce((s: number, j: any) => s + Number(j.total_amount_cents ?? 0), 0);
    const label = wStart.toLocaleString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
    capacityWeeks.push({
      label,
      cents: wRevenue,
      fillRate: weeklyCapacityCents ? wRevenue / weeklyCapacityCents : 0,
    });
  }

  /* ----------- Quote pipeline ----------- */
  const now30d = addDaysUTC(todayUTC, -30);

  // Pipeline stages
  const draftQuotes = quotes.filter((q: any) => {
    const s = (q.quote_status || "").toUpperCase();
    return s === "DRAFT";
  });
  const sentQuotes = quotes.filter((q: any) => {
    const s = (q.quote_status || "").toUpperCase();
    return s === "AWAITING_RESPONSE" || s === "SENT";
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

  const pipelineStages = [
    { label: "Draft", count: draftQuotes.length, value: money(sumCents(draftQuotes)) },
    { label: "Sent", count: sentQuotes.length, value: money(sumCents(sentQuotes)) },
    { label: "Changes Req", count: changesReqQuotes.length, value: money(sumCents(changesReqQuotes)) },
    { label: "Approved", count: approvedQuotes.length, value: money(sumCents(approvedQuotes)) },
    { label: "Won", count: wonQuotes.length, value: money(sumCents(wonQuotes)) },
  ];

  // 30-day win rate
  const recentQuotes = quotes.filter((q: any) => {
    const updated = safeDate(q.updated_at_jobber);
    return updated && updated >= now30d;
  });
  const recentWon = recentQuotes.filter((q: any) => statusLooksWon(q.quote_status || ""));
  const recentLost = recentQuotes.filter((q: any) => statusLooksLost(q.quote_status || ""));
  const recentSent = recentQuotes.filter((q: any) => {
    const s = (q.quote_status || "").toUpperCase();
    return s === "AWAITING_RESPONSE" || s === "SENT";
  });
  const winRateDenom = recentWon.length + recentLost.length + recentSent.length;
  const winRate = winRateDenom > 0 ? recentWon.length / winRateDenom : 0;

  // Avg days to close
  const wonWithDates = wonQuotes.filter((q: any) => safeDate(q.sent_at) && safeDate(q.updated_at_jobber));
  const avgDaysToClose = wonWithDates.length > 0
    ? Math.round(
        wonWithDates.reduce((s: number, q: any) => {
          const sent = safeDate(q.sent_at)!;
          const closed = safeDate(q.updated_at_jobber)!;
          return s + (closed.getTime() - sent.getTime()) / 86400000;
        }, 0) / wonWithDates.length
      )
    : 0;

  // Pipeline value (all open/sent, not won/lost)
  const openQuotes = quotes.filter((q: any) => {
    const s = (q.quote_status || "").toUpperCase();
    return !statusLooksWon(s) && !statusLooksLost(s);
  });
  const pipelineValue = sumCents(openQuotes);

  // Quotes sent this month
  const thisMonthStart = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), 1));
  const quotesSentThisMonth = quotes.filter((q: any) => {
    const sent = safeDate(q.sent_at);
    return sent && sent >= thisMonthStart;
  }).length;

  // Win rate trend (weekly, last 12 weeks)
  const winRateTrend: { label: string; rate: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const wStart = addDaysUTC(thisWeekStart, -7 * i);
    const wEnd = addDaysUTC(wStart, 7);
    const wQuotes = quotes.filter((q: any) => {
      const updated = safeDate(q.updated_at_jobber);
      return updated && updated >= wStart && updated < wEnd;
    });
    const wWon = wQuotes.filter((q: any) => statusLooksWon(q.quote_status || "")).length;
    const wLost = wQuotes.filter((q: any) => statusLooksLost(q.quote_status || "")).length;
    const wSent = wQuotes.filter((q: any) => {
      const s = (q.quote_status || "").toUpperCase();
      return s === "AWAITING_RESPONSE" || s === "SENT";
    }).length;
    const denom = wWon + wLost + wSent;
    winRateTrend.push({
      label: wStart.toLocaleString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }),
      rate: denom > 0 ? wWon / denom : 0,
    });
  }

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
    .sort((a: any, b: any) => b.days_quiet - a.days_quiet)
    .slice(0, 25);

  function ageSev(days: number): "critical" | "warning" | "good" {
    if (days >= 14) return "critical";
    if (days >= 7) return "warning";
    return "good";
  }

  // Export data
  const followUpExportData = followUpQuotes.map((q) => ({
    "Days Quiet": q.days_quiet,
    "Quote #": q.quote_number,
    "Title": q.quote_title,
    "Sent": q.sent_at ? q.sent_at.toLocaleDateString() : "",
    "Amount": (q.amount_cents / 100).toFixed(2),
    "Last Activity": q.updated_at ? q.updated_at.toLocaleDateString() : "",
    "Status": q.status,
    "Jobber URL": q.quote_url,
  }));

  // SparkLine for win rate trend
  const sparkH = 80;
  const sparkW = 600;
  const maxRate = Math.max(...winRateTrend.map((w) => w.rate), 0.01);
  const sparkPoints = winRateTrend
    .map((w, i) => {
      const x = (i / Math.max(winRateTrend.length - 1, 1)) * sparkW;
      const y = sparkH - (w.rate / maxRate) * sparkH;
      return `${x},${y}`;
    })
    .join(" ");

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
                  ? `of ${money(weeklyCapacityCents)} target • ${thisWeekJobs.length} jobs`
                  : `${thisWeekJobs.length} jobs scheduled`
                }
              </div>
            </div>
          </div>

          {/* Capacity Fill Rate */}
          <div className="kpi-primary gradient-purple hover-lift">
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>&#128200;</span>
                <span className="text-secondary" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Capacity Fill Rate
                </span>
              </div>
              <div className={`kpi-value-large ${weeklyCapacityCents ? fillColorClass(thisWeekFill) : 'text-muted'}`}>
                {weeklyCapacityCents ? pct(thisWeekFill) : "—"}
              </div>
              <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
                {weeklyCapacityCents
                  ? `${thisWeekJobs.length} jobs scheduled this week`
                  : "Set a weekly target to track"
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
                  ? `${pct(nextWeekFill)} of target • ${nextWeekJobs.length} jobs`
                  : `${nextWeekJobs.length} jobs scheduled`
                }
              </div>
            </div>
          </div>
        </div>

        {/* ===== Section B: Capacity Trend Chart ===== */}
        <div className="panel animate-in delay-2" style={{ marginTop: 20, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              Capacity Trend
            </h2>
            <span className="info-tooltip">?<span className="tooltip-text">Shows your total scheduled revenue per week for the last 12 weeks. Bars are color-coded: green = 90%+ of target, amber = 50-89%, red = under 50%. The dashed line is your weekly target.</span></span>
          </div>
          <p className="text-muted" style={{ fontSize: 12, marginBottom: 16 }}>
            Weekly scheduled revenue — last 12 weeks
          </p>
          <CapacityChart
            weeks={capacityWeeks}
            targetCents={weeklyCapacityCents}
          />
          <CapacityEditor currentCents={weeklyCapacityCents} />
        </div>

        {/* ===== Section C: Quote Pipeline ===== */}
        <div className="panel animate-in delay-3" style={{ marginTop: 20, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              Quote Pipeline
            </h2>
            <span className="info-tooltip">?<span className="tooltip-text">Shows all your quotes grouped by status stage, from draft to won. Track how quotes flow through your sales process and where they get stuck.</span></span>
          </div>
          <QuotePipeline
            stages={pipelineStages}
            lostCount={lostQuotes.length}
            lostValue={money(sumCents(lostQuotes))}
          />
        </div>

        {/* Quote KPIs */}
        <div className="kpi-grid-secondary animate-in delay-3" style={{ marginTop: 16 }}>
          {/* Win Rate */}
          <div className="kpi-secondary">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Win Rate (30D)
                </span>
                <span className="info-tooltip" style={{ width: 16, height: 16, fontSize: 10 }}>?<span className="tooltip-text">Percentage of quotes won out of all decided quotes (won + lost + pending) in the last 30 days. Higher is better — 40%+ is strong.</span></span>
              </div>
              <div className={`kpi-value-medium ${winRate >= 0.4 ? 'text-success' : winRate >= 0.2 ? 'text-warning' : 'text-critical'}`}>
                {pct(winRate)}
              </div>
            </div>
            <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
              {recentWon.length}W / {recentLost.length}L / {recentSent.length}P
            </div>
          </div>

          {/* Avg Days to Close */}
          <div className="kpi-secondary">
            <div>
              <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                Avg Days to Close
              </div>
              <div className="kpi-value-medium text-primary">
                {avgDaysToClose || "—"}
              </div>
            </div>
            <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
              {wonWithDates.length} won quotes
            </div>
          </div>

          {/* Pipeline Value */}
          <div className="kpi-secondary">
            <div>
              <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                Pipeline Value
              </div>
              <div className="kpi-value-medium text-primary">
                {money(pipelineValue)}
              </div>
            </div>
            <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
              {openQuotes.length} open quotes
            </div>
          </div>

          {/* Quotes Sent This Month */}
          <div className="kpi-secondary">
            <div>
              <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                Quotes Sent (Month)
              </div>
              <div className="kpi-value-medium text-primary">
                {quotesSentThisMonth}
              </div>
            </div>
            <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
              {new Date().toLocaleString(undefined, { month: "long" })}
            </div>
          </div>
        </div>

        {/* Conversion Trend SparkLine */}
        <div className="panel animate-in delay-4" style={{ marginTop: 16, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>
                Conversion Trend
              </h2>
              <p className="text-muted" style={{ fontSize: 12 }}>Weekly win rate — last 12 weeks</p>
            </div>
          </div>
          <svg viewBox={`0 0 ${sparkW} ${sparkH}`} width="100%" style={{ overflow: "visible" }} preserveAspectRatio="xMidYMid meet">
            {/* Grid */}
            <line x1={0} y1={sparkH} x2={sparkW} y2={sparkH} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <line x1={0} y1={0} x2={sparkW} y2={0} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            {/* Area */}
            <polygon
              points={`0,${sparkH} ${sparkPoints} ${sparkW},${sparkH}`}
              fill="rgba(90,166,255,0.1)"
            />
            {/* Line */}
            <polyline
              points={sparkPoints}
              fill="none"
              stroke="#5aa6ff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Dots */}
            {winRateTrend.map((w, i) => {
              const x = (i / Math.max(winRateTrend.length - 1, 1)) * sparkW;
              const y = sparkH - (w.rate / maxRate) * sparkH;
              return (
                <circle key={i} cx={x} cy={y} r={2.5} fill="#5aa6ff" />
              );
            })}
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span className="text-muted" style={{ fontSize: 10 }}>{winRateTrend[0]?.label}</span>
            <span className="text-muted" style={{ fontSize: 10 }}>{winRateTrend[winRateTrend.length - 1]?.label}</span>
          </div>
        </div>

        {/* ===== Section D: Quote Follow-Up Table ===== */}
        <div className="panel animate-in delay-4" style={{ marginTop: 20, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <div>
              <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>
                Quote Follow-Up
              </h2>
              <p className="text-muted" style={{ fontSize: 12 }}>
                Open quotes sorted by staleness — {followUpQuotes.length} quotes
              </p>
            </div>
            {followUpExportData.length > 0 && (
              <ExportCSV data={followUpExportData} filename="quote-followup" label="Export CSV" />
            )}
          </div>

          {followUpQuotes.length === 0 ? (
            <div className="text-muted" style={{ textAlign: "center", padding: 24, fontSize: 14 }}>
              No open quotes to follow up on.
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Days Quiet</th>
                    <th>Quote</th>
                    <th>Sent</th>
                    <th>Amount</th>
                    <th>Last Activity</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {followUpQuotes.map((q) => (
                    <tr key={q.quote_number}>
                      <td>
                        <span className={`age-badge ${ageSev(q.days_quiet)}`}>
                          {q.days_quiet}d
                        </span>
                      </td>
                      <td>
                        <div className="cell-primary" style={{ fontWeight: 600 }}>#{q.quote_number}</div>
                        <div className="cell-secondary" style={{ fontSize: 11, marginTop: 2 }}>{q.quote_title}</div>
                      </td>
                      <td className="cell-muted" style={{ whiteSpace: "nowrap" }}>
                        {q.sent_at?.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </td>
                      <td className="cell-primary" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                        {money(q.amount_cents)}
                      </td>
                      <td className="cell-muted" style={{ whiteSpace: "nowrap" }}>
                        {q.updated_at?.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </td>
                      <td>
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
                      <td>
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
              </table>
            </div>
          )}
        </div>

        {/* ===== Section E: Coming Soon ===== */}
        <div className="coming-soon-banner animate-in delay-5" style={{ marginTop: 20 }}>
          <span style={{ fontSize: 24, display: "block", marginBottom: 8 }}>&#128101;</span>
          <h3 className="text-primary" style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
            Sales Person Tracking — Coming Soon
          </h3>
          <p className="text-muted" style={{ fontSize: 13, maxWidth: 400, margin: "0 auto" }}>
            Track revenue by team member, compare close rates, and identify top performers. Staff data sync will be added in Phase 2.
          </p>
        </div>

        {/* Bottom spacer */}
        <div style={{ height: 40 }} />
      </div>
    </main>
  );
}
