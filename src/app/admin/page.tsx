// src/app/admin/page.tsx
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";
import { globalStyles } from "@/lib/dashboardHelpers";
import { AdminTabs } from "./AdminTabs";
import type { UserAnalyticsSummary, AggregateAnalytics } from "./AdminTabs";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);
const DEMO_CONNECTION_ID = "00000000-0000-0000-0000-de0000000001";

async function getAdminUser() {
  const { createServerClient } = await import("@supabase/ssr");
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
    return null;
  }
  return user;
}

/** Paginated fetch for analytics_events (PostgREST max_rows=100). */
async function fetchAllAnalyticsEvents(since: string, pageSize = 100): Promise<any[]> {
  const all: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("analytics_events")
      .select("connection_id,event,event_name,properties,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("Analytics fetch error:", error.message);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function computeAnalytics(events: any[]): {
  userSummaries: UserAnalyticsSummary[];
  aggregate: AggregateAnalytics;
} {
  const now = Date.now();
  const day1 = now - 86_400_000;
  const day7 = now - 7 * 86_400_000;
  const day30 = now - 30 * 86_400_000;
  const thirtyDaysAgo = new Date(day30);

  // Helper: normalize event name (new column is `event`, old was `event_name`)
  const getEventName = (e: any): string => e.event || e.event_name || "unknown";
  const getProps = (e: any): Record<string, any> => e.properties || {};

  // Per-user summaries (enriched)
  const userMap: Record<string, {
    lastActive: string | null;
    events7d: number;
    totalEvents: number;
    pagesVisited: Set<string>;
    tourStatus: "not_started" | "started" | "completed" | "skipped";
    hasSynced: boolean;
    hasExported: boolean;
    pageViews: number;
  }> = {};

  for (const e of events) {
    const cid = e.connection_id;
    if (!cid) continue;
    if (!userMap[cid]) {
      userMap[cid] = {
        lastActive: null, events7d: 0, totalEvents: 0,
        pagesVisited: new Set(), tourStatus: "not_started",
        hasSynced: false, hasExported: false, pageViews: 0,
      };
    }
    const u = userMap[cid];
    const ts = new Date(e.created_at).getTime();
    const eventName = getEventName(e);
    const props = getProps(e);

    u.totalEvents++;
    if (!u.lastActive || e.created_at > u.lastActive!) u.lastActive = e.created_at;
    if (ts >= day7) u.events7d++;

    if (eventName === "page_view" || eventName === "page_viewed") {
      u.pageViews++;
      if (props.page_name) u.pagesVisited.add(props.page_name);
    }
    if (eventName === "tour_started" && u.tourStatus === "not_started") u.tourStatus = "started";
    if (eventName === "tour_completed") u.tourStatus = "completed";
    if (eventName === "tour_skipped") u.tourStatus = "skipped";
    if (eventName === "sync_complete" || eventName === "sync_started") u.hasSynced = true;
    if (eventName === "export" || eventName === "export_started" || eventName === "csv_export") u.hasExported = true;
  }

  const userSummaries: UserAnalyticsSummary[] = Object.entries(userMap).map(([cid, data]) => ({
    connection_id: cid,
    last_active: data.lastActive,
    event_count_7d: data.events7d,
    total_events: data.totalEvents,
    pages_visited: Array.from(data.pagesVisited),
    tour_status: data.tourStatus,
    has_synced: data.hasSynced,
    has_exported: data.hasExported,
    page_views: data.pageViews,
  }));

  // DAU / WAU / MAU
  const dauSet = new Set<string>();
  const wauSet = new Set<string>();
  const mauSet = new Set<string>();
  for (const e of events) {
    const ts = new Date(e.created_at).getTime();
    if (e.connection_id) {
      mauSet.add(e.connection_id);
      if (ts >= day7) wauSet.add(e.connection_id);
      if (ts >= day1) dauSet.add(e.connection_id);
    }
  }

  // Feature usage (exclude heartbeat)
  const featureMap: Record<string, number> = {};
  for (const e of events) {
    const eventName = getEventName(e);
    if (eventName === "heartbeat") continue;
    featureMap[eventName] = (featureMap[eventName] || 0) + 1;
  }
  const featureUsage = Object.entries(featureMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Onboarding funnel
  let tourStarted = 0, tourCompleted = 0, tourSkipped = 0;
  for (const e of events) {
    const en = getEventName(e);
    if (en === "tour_started") tourStarted++;
    if (en === "tour_completed") tourCompleted++;
    if (en === "tour_skipped") tourSkipped++;
  }

  // Chart engagement
  const chartMap: Record<string, { totalViewMs: number; viewCount: number }> = {};
  for (const e of events) {
    const en = getEventName(e);
    if (en === "chart_visible" || en === "chart_viewed" || en === "chart_hidden") {
      const props = getProps(e);
      const chartName = props.chart_name || "unknown";
      if (!chartMap[chartName]) chartMap[chartName] = { totalViewMs: 0, viewCount: 0 };
      chartMap[chartName].viewCount++;
      if (props.duration_ms) chartMap[chartName].totalViewMs += Number(props.duration_ms);
      if (props.view_duration_ms) chartMap[chartName].totalViewMs += Number(props.view_duration_ms);
    }
  }
  const chartEngagement = Object.entries(chartMap)
    .map(([chartName, data]) => ({ chartName, ...data }))
    .sort((a, b) => b.viewCount - a.viewCount);

  // Rage clicks
  let rageClicks = 0;
  for (const e of events) {
    const en = getEventName(e);
    if (en === "rage_click" || en === "rapid_clicks") rageClicks++;
  }

  // Errors
  let errors = 0;
  for (const e of events) {
    const en = getEventName(e);
    if (en === "error" || en === "error_boundary_hit") errors++;
  }

  // Top pages
  const pageMap: Record<string, number> = {};
  for (const e of events) {
    const en = getEventName(e);
    if (en === "page_view" || en === "page_viewed") {
      const props = getProps(e);
      const pageName = props.page_name || "unknown";
      pageMap[pageName] = (pageMap[pageName] || 0) + 1;
    }
  }
  const topPages = Object.entries(pageMap)
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count);

  // Daily active users series (30 data points)
  const dailyAU: Record<string, Set<string>> = {};
  const dailyPV: Record<string, number> = {};
  const dailySessions: Record<string, Set<string>> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    dailyAU[key] = new Set();
    dailyPV[key] = 0;
    dailySessions[key] = new Set();
  }

  for (const e of events) {
    const key = e.created_at.slice(0, 10);
    const eventName = getEventName(e);
    if (key in dailyAU) {
      if (e.connection_id) {
        dailyAU[key].add(e.connection_id);
        dailySessions[key].add(e.connection_id);
      }
      if (eventName === "page_view" || eventName === "page_viewed") dailyPV[key]++;
    }
  }

  const dailyActiveUsers = Object.entries(dailyAU)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, set]) => ({ date, count: set.size }));

  const dailyPageViews = Object.entries(dailyPV)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const dailySessionsArr = Object.entries(dailySessions)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, set]) => ({ date, count: set.size }));

  // Avg session duration (from session_ended events)
  const sessionDurations: number[] = [];
  for (const e of events) {
    const en = getEventName(e);
    if (en === "session_ended") {
      const props = getProps(e);
      if (props.duration_seconds) sessionDurations.push(Number(props.duration_seconds));
      if (props.duration_ms) sessionDurations.push(Number(props.duration_ms) / 1000);
    }
  }
  const avgSessionSeconds = sessionDurations.length > 0
    ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length)
    : 0;
  const totalSessions = sessionDurations.length || dailySessionsArr.reduce((s, d) => s + d.count, 0);

  // Hourly activity distribution
  const hourlyActivity: number[] = new Array(24).fill(0);
  for (const e of events) {
    const hour = new Date(e.created_at).getHours();
    hourlyActivity[hour]++;
  }

  // Date range changes (which ranges are popular)
  const rangeUsage: Record<string, number> = {};
  for (const e of events) {
    const en = getEventName(e);
    if (en === "date_range_changed") {
      const range = getProps(e).range || "unknown";
      rangeUsage[range] = (rangeUsage[range] || 0) + 1;
    }
  }
  const dateRangeUsage = Object.entries(rangeUsage)
    .map(([range, count]) => ({ range, count }))
    .sort((a, b) => b.count - a.count);

  // Upgrade funnel
  let upgradeNudgesSeen = 0, upgradeCTAClicks = 0;
  for (const e of events) {
    const en = getEventName(e);
    if (en === "upgrade_nudge_seen") upgradeNudgesSeen++;
    if (en === "upgrade_cta_clicked") upgradeCTAClicks++;
  }

  // Sync activity
  let totalSyncs = 0;
  for (const e of events) {
    const en = getEventName(e);
    if (en === "jobber_sync_triggered" || en === "sync_click") totalSyncs++;
  }

  // Export activity
  let totalExports = 0;
  for (const e of events) {
    const en = getEventName(e);
    if (en === "export_clicked" || en === "export" || en === "csv_export") totalExports++;
  }

  // Error details
  const errorDetails: { message: string; count: number }[] = [];
  const errorMap: Record<string, number> = {};
  for (const e of events) {
    const en = getEventName(e);
    if (en === "error" || en === "error_boundary_hit" || en === "client_error") {
      const msg = getProps(e).message || getProps(e).error_name || "Unknown error";
      errorMap[msg] = (errorMap[msg] || 0) + 1;
    }
  }
  for (const [message, count] of Object.entries(errorMap)) {
    errorDetails.push({ message, count });
  }
  errorDetails.sort((a, b) => b.count - a.count);

  // Rage click details
  const rageClickTargets: { target: string; count: number }[] = [];
  const rageMap: Record<string, number> = {};
  for (const e of events) {
    const en = getEventName(e);
    if (en === "rage_click" || en === "rapid_clicks") {
      const target = getProps(e).target_tag || getProps(e).element || "unknown";
      rageMap[target] = (rageMap[target] || 0) + 1;
    }
  }
  for (const [target, count] of Object.entries(rageMap)) {
    rageClickTargets.push({ target, count });
  }
  rageClickTargets.sort((a, b) => b.count - a.count);

  return {
    userSummaries,
    aggregate: {
      dau: dauSet.size,
      wau: wauSet.size,
      mau: mauSet.size,
      featureUsage,
      dailyActiveUsers,
      dailyPageViews,
      dailySessions: dailySessionsArr,
      onboardingFunnel: { tourStarted, tourCompleted, tourSkipped },
      chartEngagement,
      rageClicks,
      errors,
      topPages,
      avgSessionSeconds,
      totalSessions,
      hourlyActivity,
      dateRangeUsage,
      upgradeNudgesSeen,
      upgradeCTAClicks,
      totalSyncs,
      totalExports,
      errorDetails,
      rageClickTargets,
    },
  };
}

/* Admin-specific CSS addendum (trial grid, admin-specific overrides) */
const adminStyles = `
  .trial-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  @media (min-width: 640px) {
    .trial-grid { grid-template-columns: repeat(5, 1fr); gap: 10px; }
  }
`;

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/login");

  // Fetch connections
  const { data: connections } = await supabaseAdmin
    .from("jobber_connections")
    .select("id,billing_status,trial_ends_at,canceled_at,jobber_account_name,company_name,owner_name,created_at,last_sync_at,job_count,quote_count,quote_leak_cents,quote_leak_count,request_count,unscheduled_job_count,invoices_past_due_cents,user_id,stripe_customer_id")
    .order("created_at", { ascending: false })
    .limit(10000);

  const allConnections = connections || [];

  // Fetch analytics events (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  let analyticsEvents: any[] = [];
  try {
    analyticsEvents = await fetchAllAnalyticsEvents(thirtyDaysAgo);
  } catch (err: any) {
    console.error("Failed to fetch analytics:", err.message);
  }

  // Exclude demo account from analytics
  const realEvents = analyticsEvents.filter((e: any) => e.connection_id !== DEMO_CONNECTION_ID);
  const { userSummaries, aggregate } = computeAnalytics(realEvents);

  // KPI calculations
  const totalUsers = allConnections.length;
  const activeSubscribers = allConnections.filter((c) => c.billing_status === "active").length;
  const mrr = activeSubscribers * 29;

  const getTrialDaysLeft = (c: any) => {
    if (c.billing_status !== "trialing") return null;
    const trialEnds = c.trial_ends_at ? new Date(c.trial_ends_at).getTime() : 0;
    return Math.ceil((trialEnds - Date.now()) / 86400000);
  };

  const trialing = allConnections.filter((c) => {
    const days = getTrialDaysLeft(c);
    return days !== null && days > 0;
  }).length;

  const expiredTrials = allConnections.filter((c) => {
    const days = getTrialDaysLeft(c);
    return days !== null && days <= 0;
  }).length;

  const churned = allConnections.filter((c) => c.billing_status === "canceled" || c.canceled_at).length;

  const engagementPct = totalUsers > 0 ? Math.round((aggregate.wau / totalUsers) * 100) : 0;

  // Trial countdown breakdown
  const trial15to11 = allConnections.filter((c) => {
    const d = getTrialDaysLeft(c); return d !== null && d >= 11 && d <= 15;
  }).length;
  const trial10to6 = allConnections.filter((c) => {
    const d = getTrialDaysLeft(c); return d !== null && d >= 6 && d <= 10;
  }).length;
  const trial5to3 = allConnections.filter((c) => {
    const d = getTrialDaysLeft(c); return d !== null && d >= 3 && d <= 5;
  }).length;
  const trial2 = allConnections.filter((c) => {
    const d = getTrialDaysLeft(c); return d !== null && d === 2;
  }).length;
  const trial1 = allConnections.filter((c) => {
    const d = getTrialDaysLeft(c); return d !== null && d === 1;
  }).length;

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <main style={{
      minHeight: "100vh",
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: `
        radial-gradient(ellipse 80% 60% at 50% -20%, rgba(124,92,255,0.15), transparent),
        linear-gradient(180deg, #060811 0%, #0a1020 100%)
      `,
      color: "#EAF1FF",
    }}>
      <style>{globalStyles}</style>
      <style>{adminStyles}</style>

      <div className="dashboard-container" style={{ maxWidth: 1400, paddingBottom: 80 }}>
        {/* Topbar — matching DashboardTopbar */}
        <div className="dashboard-topbar animate-in">
          <header className="dashboard-header">
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <svg width="24" height="24" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <defs>
                  <linearGradient id="adminLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c5cff" />
                    <stop offset="100%" stopColor="#5aa6ff" />
                  </linearGradient>
                </defs>
                <circle cx="25" cy="25" r="22" fill="none" stroke="url(#adminLogoGrad)" strokeWidth="3" />
                <polyline points="8,25 16,25 21,12 29,38 34,20 42,25" fill="none" stroke="url(#adminLogoGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
                  background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>
                  AccuInsight
                </div>
                <div className="text-primary" style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.1 }}>
                  Admin
                </div>
              </div>
            </div>

            <div className="header-actions" style={{ gap: 6 }}>
              <span className="text-muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>{dateStr}</span>
              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
              <a href="/jobber/dashboard" className="btn" style={{ fontSize: 11, padding: "6px 12px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Dashboard
              </a>
            </div>
          </header>
        </div>

        {/* Tabs + Content */}
        <div className="animate-in delay-1" style={{ marginTop: 4 }}>
          <AdminTabs
            connections={allConnections}
            userSummaries={userSummaries}
            aggregateAnalytics={aggregate}
            overview={{
              totalUsers,
              activeSubscribers,
              mrr,
              trialing,
              expiredTrials,
              churned,
              engagementPct,
              trial15to11,
              trial10to6,
              trial5to3,
              trial2,
              trial1,
              dau: aggregate.dau,
              wau: aggregate.wau,
              mau: aggregate.mau,
              onboardingFunnel: aggregate.onboardingFunnel,
            }}
          />
        </div>
      </div>
    </main>
  );
}
