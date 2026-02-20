// src/app/admin/page.tsx
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";
import { AdminTabs } from "./AdminTabs";
import type { UserAnalyticsSummary, AggregateAnalytics } from "./AdminTabs";

const ADMIN_EMAILS = ["rcaputo91@gmail.com"];
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
      .select("connection_id,event_name,created_at")
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

  // Per-user summaries
  const userMap: Record<string, { lastActive: string | null; events7d: number }> = {};
  for (const e of events) {
    const cid = e.connection_id;
    if (!userMap[cid]) userMap[cid] = { lastActive: null, events7d: 0 };
    const ts = new Date(e.created_at).getTime();
    if (!userMap[cid].lastActive || e.created_at > userMap[cid].lastActive!) {
      userMap[cid].lastActive = e.created_at;
    }
    if (ts >= day7) userMap[cid].events7d++;
  }

  const userSummaries: UserAnalyticsSummary[] = Object.entries(userMap).map(([cid, data]) => ({
    connection_id: cid,
    last_active: data.lastActive,
    event_count_7d: data.events7d,
  }));

  // DAU: distinct connection_ids with events in last 24h
  const dauSet = new Set<string>();
  const wauSet = new Set<string>();
  const mauSet = new Set<string>();
  for (const e of events) {
    const ts = new Date(e.created_at).getTime();
    mauSet.add(e.connection_id);
    if (ts >= day7) wauSet.add(e.connection_id);
    if (ts >= day1) dauSet.add(e.connection_id);
  }

  // Feature usage (exclude heartbeat)
  const featureMap: Record<string, number> = {};
  for (const e of events) {
    if (e.event_name === "heartbeat") continue;
    featureMap[e.event_name] = (featureMap[e.event_name] || 0) + 1;
  }
  const featureUsage = Object.entries(featureMap)
    .map(([name, count]) => ({ name, count }))
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
    if (key in dailyAU) {
      dailyAU[key].add(e.connection_id);
      if (e.event_name === "page_view") dailyPV[key]++;
      // Rough session count: each unique connection_id per day = at least 1 session
      dailySessions[key].add(e.connection_id);
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
    },
  };
}

const globalStyles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-in {
    animation: fadeInUp 0.5s ease-out forwards;
    opacity: 0;
  }
  .delay-1 { animation-delay: 0.1s; }
  .delay-2 { animation-delay: 0.2s; }
  .delay-3 { animation-delay: 0.3s; }
  .delay-4 { animation-delay: 0.4s; }
  .delay-5 { animation-delay: 0.5s; }

  .hover-lift {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  }

  .admin-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 16px;
    padding-bottom: 60px;
  }
  @media (min-width: 640px) {
    .admin-container { padding: 20px; padding-bottom: 60px; }
  }
  @media (min-width: 1024px) {
    .admin-container { padding: 24px 32px 80px; }
  }

  .kpi-grid-primary {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  @media (min-width: 640px) {
    .kpi-grid-primary { grid-template-columns: repeat(3, 1fr); gap: 16px; }
  }

  .kpi-grid-secondary {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  @media (min-width: 640px) {
    .kpi-grid-secondary { grid-template-columns: repeat(3, 1fr); gap: 12px; }
  }
  @media (min-width: 1024px) {
    .kpi-grid-secondary { grid-template-columns: repeat(6, 1fr); gap: 14px; }
  }

  .kpi-primary {
    position: relative;
    overflow: hidden;
    border-radius: 20px;
    padding: 20px;
    background: linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 16px 48px rgba(0,0,0,0.25);
  }
  @media (min-width: 640px) {
    .kpi-primary { padding: 24px; }
  }
  .kpi-primary::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.3;
    pointer-events: none;
  }
  .kpi-primary.gradient-purple::before {
    background: linear-gradient(135deg, #7c5cff, #5aa6ff);
  }
  .kpi-primary.gradient-green::before {
    background: #10b981;
  }

  .kpi-value-large {
    font-size: 40px;
    font-weight: 800;
    letter-spacing: -2px;
    line-height: 1;
  }
  @media (min-width: 640px) {
    .kpi-value-large { font-size: 48px; }
  }

  .kpi-secondary {
    padding: 14px;
    border-radius: 14px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 90px;
  }
  .kpi-secondary:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.12);
  }

  .kpi-value-medium {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -1px;
  }
  @media (min-width: 640px) {
    .kpi-value-medium { font-size: 32px; }
  }

  .panel {
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.08);
    background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
    box-shadow: 0 16px 48px rgba(0,0,0,0.3);
    overflow: hidden;
  }
  @media (min-width: 640px) {
    .panel { border-radius: 20px; }
  }

  .chart-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  @media (min-width: 768px) {
    .chart-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; }
  }

  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  @media (min-width: 640px) {
    .data-table { font-size: 13px; }
  }
  .data-table th {
    text-align: left;
    padding: 10px 12px;
    font-weight: 600;
    font-size: 10px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    white-space: nowrap;
    color: rgba(234,241,255,0.5);
  }
  .data-table td {
    padding: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    vertical-align: middle;
  }
  .data-table tbody tr {
    transition: background 0.15s ease;
  }
  .data-table tbody tr:hover {
    background: rgba(255,255,255,0.03);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 5px 10px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 11px;
    text-decoration: none;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05);
    color: rgba(234,241,255,0.7);
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }
  .btn:hover {
    background: rgba(90,166,255,0.15);
    border-color: rgba(90,166,255,0.3);
    color: #5aa6ff;
    transform: translateY(-1px);
  }

  .trial-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  @media (min-width: 640px) {
    .trial-grid { grid-template-columns: repeat(5, 1fr); gap: 10px; }
  }

  .chart-title { color: #EAF1FF; }
  .chart-subtitle { color: rgba(234,241,255,0.5); }
  .chart-label { color: rgba(234,241,255,0.4); }
  .chart-axis-label { fill: rgba(234,241,255,0.4); }
`;

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/login");

  // Fetch connections
  const { data: connections } = await supabaseAdmin
    .from("jobber_connections")
    .select("*")
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

      <div className="admin-container">
        {/* Header */}
        <div className="animate-in" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <svg width="36" height="36" viewBox="0 0 50 50">
            <defs>
              <linearGradient id="admin-g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c5cff" />
                <stop offset="100%" stopColor="#5aa6ff" />
              </linearGradient>
            </defs>
            <circle cx="25" cy="25" r="22" fill="none" stroke="url(#admin-g)" strokeWidth="3" />
            <polyline points="8,25 16,25 21,12 29,38 34,20 42,25" fill="none" stroke="url(#admin-g)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#EAF1FF", margin: 0 }}>Admin Dashboard</h1>
            <p style={{ fontSize: 12, color: "rgba(234,241,255,0.5)", margin: 0, marginTop: 2 }}>
              {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* Primary KPIs */}
        <div className="kpi-grid-primary animate-in delay-1" style={{ marginBottom: 16 }}>
          <div className="kpi-primary gradient-purple hover-lift">
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(234,241,255,0.5)", marginBottom: 8 }}>
              Total Users
            </div>
            <div className="kpi-value-large" style={{ color: "#EAF1FF" }}>
              {totalUsers}
            </div>
          </div>
          <div className="kpi-primary gradient-green hover-lift">
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(234,241,255,0.5)", marginBottom: 8 }}>
              Active Subscribers
            </div>
            <div className="kpi-value-large" style={{ color: "#10b981" }}>
              {activeSubscribers}
            </div>
          </div>
          <div className="kpi-primary gradient-green hover-lift">
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(234,241,255,0.5)", marginBottom: 8 }}>
              MRR
            </div>
            <div className="kpi-value-large" style={{ color: "#10b981" }}>
              ${mrr}
            </div>
          </div>
        </div>

        {/* Secondary KPIs */}
        <div className="kpi-grid-secondary animate-in delay-2" style={{ marginBottom: 20 }}>
          <div className="kpi-secondary hover-lift">
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(234,241,255,0.5)", marginBottom: 4 }}>
              Trial
            </div>
            <div className="kpi-value-medium" style={{ color: "#3b82f6" }}>
              {trialing}
            </div>
          </div>
          <div className="kpi-secondary hover-lift">
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(234,241,255,0.5)", marginBottom: 4 }}>
              Expired
            </div>
            <div className="kpi-value-medium" style={{ color: "#f59e0b" }}>
              {expiredTrials}
            </div>
          </div>
          <div className="kpi-secondary hover-lift">
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(234,241,255,0.5)", marginBottom: 4 }}>
              Churned
            </div>
            <div className="kpi-value-medium" style={{ color: "#ef4444" }}>
              {churned}
            </div>
          </div>
          <div className="kpi-secondary hover-lift">
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(234,241,255,0.5)", marginBottom: 4 }}>
              DAU
            </div>
            <div className="kpi-value-medium" style={{ color: "#5aa6ff" }}>
              {aggregate.dau}
            </div>
          </div>
          <div className="kpi-secondary hover-lift">
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(234,241,255,0.5)", marginBottom: 4 }}>
              WAU
            </div>
            <div className="kpi-value-medium" style={{ color: "#5aa6ff" }}>
              {aggregate.wau}
            </div>
          </div>
          <div className="kpi-secondary hover-lift">
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(234,241,255,0.5)", marginBottom: 4 }}>
              Engagement
            </div>
            <div className="kpi-value-medium" style={{ color: engagementPct >= 50 ? "#10b981" : engagementPct >= 20 ? "#f59e0b" : "#ef4444" }}>
              {engagementPct}%
            </div>
          </div>
        </div>

        {/* Trial Countdown */}
        {trialing > 0 && (
          <div className="panel animate-in delay-3" style={{ marginBottom: 20, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#EAF1FF", marginBottom: 12 }}>
              Trial Countdown
            </div>
            <div className="trial-grid">
              <div style={{
                padding: "10px 6px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(234,241,255,0.5)" }}>15-11d</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#EAF1FF" }}>{trial15to11}</div>
              </div>
              <div style={{
                padding: "10px 6px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(234,241,255,0.5)" }}>10-6d</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#EAF1FF" }}>{trial10to6}</div>
              </div>
              <div style={{
                padding: "10px 6px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(234,241,255,0.5)" }}>5-3d</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#EAF1FF" }}>{trial5to3}</div>
              </div>
              <div style={{
                padding: "10px 6px",
                borderRadius: 10,
                background: trial2 > 0 ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${trial2 > 0 ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.08)"}`,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: trial2 > 0 ? "#f59e0b" : "rgba(234,241,255,0.5)" }}>2d</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: trial2 > 0 ? "#f59e0b" : "#EAF1FF" }}>{trial2}</div>
              </div>
              <div style={{
                padding: "10px 6px",
                borderRadius: 10,
                background: trial1 > 0 ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${trial1 > 0 ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: trial1 > 0 ? "#ef4444" : "rgba(234,241,255,0.5)" }}>1d</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: trial1 > 0 ? "#ef4444" : "#EAF1FF" }}>{trial1}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs: Users | Analytics */}
        <div className="animate-in delay-4">
          <AdminTabs
            connections={allConnections}
            userSummaries={userSummaries}
            aggregateAnalytics={aggregate}
          />
        </div>
      </div>
    </main>
  );
}
