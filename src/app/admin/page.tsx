// src/app/admin/page.tsx
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";
import { ResyncButton } from "./ResyncButton";

const ADMIN_EMAILS = ["rcaputo91@gmail.com"];

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

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/login");

  const { data: connections } = await supabaseAdmin
    .from("jobber_connections")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10000);

  const allConnections = connections || [];

  const totalUsers = allConnections.length;
  const activeSubscribers = allConnections.filter(c => c.billing_status === "active").length;
  
  const getTrialDaysLeft = (c: any) => {
    if (c.billing_status !== "trialing") return null;
    const trialEnds = c.trial_ends_at ? new Date(c.trial_ends_at).getTime() : 0;
    return Math.ceil((trialEnds - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const trialing = allConnections.filter(c => {
    const days = getTrialDaysLeft(c);
    return days !== null && days > 0;
  }).length;
  
  const expiredTrials = allConnections.filter(c => {
    const days = getTrialDaysLeft(c);
    return days !== null && days <= 0;
  }).length;

  const trial15to11 = allConnections.filter(c => {
    const days = getTrialDaysLeft(c);
    return days !== null && days >= 11 && days <= 15;
  }).length;
  const trial10to6 = allConnections.filter(c => {
    const days = getTrialDaysLeft(c);
    return days !== null && days >= 6 && days <= 10;
  }).length;
  const trial5to3 = allConnections.filter(c => {
    const days = getTrialDaysLeft(c);
    return days !== null && days >= 3 && days <= 5;
  }).length;
  const trial2 = allConnections.filter(c => {
    const days = getTrialDaysLeft(c);
    return days !== null && days === 2;
  }).length;
  const trial1 = allConnections.filter(c => {
    const days = getTrialDaysLeft(c);
    return days !== null && days === 1;
  }).length;

  const churned = allConnections.filter(c => c.billing_status === "canceled" || c.canceled_at).length;
  const mrr = activeSubscribers * 29;

  const formatCents = (cents: number) => {
    if (cents >= 100000) {
      return `$${(cents / 100000).toFixed(1)}k`;
    }
    return `$${Math.round(cents / 100).toLocaleString()}`;
  };

  const formatRelative = (d: string | null) => {
    if (!d) return "Never";
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  };

  return (
    <main style={{
      minHeight: "100vh",
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: `
        radial-gradient(ellipse 80% 60% at 50% -20%, rgba(124,92,255,0.15), transparent),
        linear-gradient(180deg, #060811 0%, #0a1020 100%)
      `,
    }}>
      <style>{`
        * { box-sizing: border-box; }
        .container { max-width: 500px; margin: 0 auto; padding: 16px; padding-bottom: 60px; }
        
        .header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .header h1 { font-size: 18px; font-weight: 800; color: #EAF1FF; margin: 0; }
        
        .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
        .kpi { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 6px; text-align: center; }
        .kpi.green { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); }
        .kpi-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; color: rgba(234,241,255,0.5); margin-bottom: 2px; }
        .kpi-value { font-size: 20px; font-weight: 800; color: #EAF1FF; }
        .kpi-value.green { color: #10b981; }
        .kpi-value.blue { color: #3b82f6; }
        .kpi-value.amber { color: #f59e0b; }
        .kpi-value.red { color: #ef4444; }
        
        .section { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
        .section-header { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; font-weight: 700; color: #EAF1FF; }
        .section-content { padding: 10px; }
        
        .trial-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
        .trial-box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px 4px; text-align: center; }
        .trial-box.warning { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.3); }
        .trial-box.urgent { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); }
        .trial-label { font-size: 9px; font-weight: 600; color: rgba(234,241,255,0.5); }
        .trial-value { font-size: 18px; font-weight: 800; color: #EAF1FF; }
        
        .user { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; margin-bottom: 8px; overflow: hidden; }
        .user:last-child { margin-bottom: 0; }
        .user-top { padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; }
        .user-name { font-size: 13px; font-weight: 700; color: #EAF1FF; margin: 0; }
        .user-meta { font-size: 10px; color: rgba(234,241,255,0.4); margin-top: 2px; }
        .badge { display: inline-block; padding: 3px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
        .badge-active { background: rgba(16,185,129,0.15); color: #10b981; }
        .badge-trial { background: rgba(59,130,246,0.15); color: #3b82f6; }
        .badge-expired { background: rgba(239,68,68,0.15); color: #ef4444; }
        .badge-canceled { background: rgba(107,114,128,0.15); color: #6b7280; }
        
        .user-metrics { display: grid; grid-template-columns: repeat(6, 1fr); gap: 1px; background: rgba(255,255,255,0.05); }
        .metric { background: #080c16; padding: 8px 4px; text-align: center; }
        .metric-label { font-size: 7px; font-weight: 700; text-transform: uppercase; color: rgba(234,241,255,0.4); margin-bottom: 1px; }
        .metric-value { font-size: 12px; font-weight: 700; color: #EAF1FF; }
        .metric-value.red { color: #ef4444; }
        .metric-value.amber { color: #f59e0b; }
        
        .user-footer { padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); }
        .sync-time { font-size: 10px; color: rgba(234,241,255,0.4); }
        
        .btn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 6px; font-weight: 600; font-size: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: rgba(234,241,255,0.7); cursor: pointer; }
        .btn:hover { background: rgba(90,166,255,0.15); border-color: rgba(90,166,255,0.3); color: #5aa6ff; }
        
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div className="container">
        <div className="header">
          <svg width="28" height="28" viewBox="0 0 50 50">
            <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#7c5cff"/><stop offset="100%" stopColor="#5aa6ff"/></linearGradient></defs>
            <circle cx="25" cy="25" r="22" fill="none" stroke="url(#g)" strokeWidth="3"/>
            <polyline points="8,25 16,25 21,12 29,38 34,20 42,25" fill="none" stroke="url(#g)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1>Admin</h1>
        </div>

        {/* Top KPIs */}
        <div className="kpi-row">
          <div className="kpi">
            <div className="kpi-label">Users</div>
            <div className="kpi-value">{totalUsers}</div>
          </div>
          <div className="kpi green">
            <div className="kpi-label">Active</div>
            <div className="kpi-value green">{activeSubscribers}</div>
          </div>
          <div className="kpi green">
            <div className="kpi-label">MRR</div>
            <div className="kpi-value green">${mrr}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Trial</div>
            <div className="kpi-value blue">{trialing}</div>
          </div>
        </div>

        <div className="kpi-row">
          <div className="kpi">
            <div className="kpi-label">Expired</div>
            <div className="kpi-value amber">{expiredTrials}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Churned</div>
            <div className="kpi-value red">{churned}</div>
          </div>
          <div className="kpi" style={{ gridColumn: "span 2" }}></div>
        </div>

        {/* Trial Countdown */}
        <div className="section">
          <div className="section-header">⏰ Trial Countdown</div>
          <div className="section-content">
            <div className="trial-row">
              <div className="trial-box">
                <div className="trial-label">15-11d</div>
                <div className="trial-value">{trial15to11}</div>
              </div>
              <div className="trial-box">
                <div className="trial-label">10-6d</div>
                <div className="trial-value">{trial10to6}</div>
              </div>
              <div className="trial-box">
                <div className="trial-label">5-3d</div>
                <div className="trial-value">{trial5to3}</div>
              </div>
              <div className={`trial-box ${trial2 > 0 ? "warning" : ""}`}>
                <div className="trial-label" style={{ color: trial2 > 0 ? "#f59e0b" : undefined }}>2d</div>
                <div className="trial-value" style={{ color: trial2 > 0 ? "#f59e0b" : undefined }}>{trial2}</div>
              </div>
              <div className={`trial-box ${trial1 > 0 ? "urgent" : ""}`}>
                <div className="trial-label" style={{ color: trial1 > 0 ? "#ef4444" : undefined }}>1d</div>
                <div className="trial-value" style={{ color: trial1 > 0 ? "#ef4444" : undefined }}>{trial1}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Users */}
        <div className="section">
          <div className="section-header">👤 Users ({totalUsers})</div>
          <div className="section-content">
            {allConnections.map((conn) => {
              const daysLeft = getTrialDaysLeft(conn);
              let badgeClass = "badge-canceled";
              let badgeText = conn.billing_status || "—";
              
              if (conn.billing_status === "active") {
                badgeClass = "badge-active";
                badgeText = "ACTIVE";
              } else if (conn.billing_status === "trialing") {
                if (daysLeft !== null && daysLeft > 0) {
                  badgeClass = "badge-trial";
                  badgeText = `${daysLeft}d`;
                } else {
                  badgeClass = "badge-expired";
                  badgeText = "EXP";
                }
              } else if (conn.billing_status === "canceled" || conn.canceled_at) {
                badgeClass = "badge-canceled";
                badgeText = "CANCEL";
              }

              const pastDue = conn.invoices_past_due_cents || 0;
              const quoteLeak = conn.quote_leak_cents || 0;
              const unscheduled = conn.unscheduled_job_count || 0;
              const requests = conn.request_count || 0;
              const jobs = conn.job_count || 0;
              const quotes = conn.quote_count || 0;

              return (
                <div key={conn.id} className="user">
                  <div className="user-top">
                    <div>
                      <div className="user-name">{conn.jobber_account_name || conn.company_name || "Unknown"}</div>
                      <div className="user-meta">{conn.owner_name || "—"}</div>
                    </div>
                    <span className={`badge ${badgeClass}`}>{badgeText}</span>
                  </div>
                  
                  <div className="user-metrics">
                    <div className="metric">
                      <div className="metric-label">Jobs</div>
                      <div className="metric-value">{jobs}</div>
                    </div>
                    <div className="metric">
                      <div className="metric-label">Quotes</div>
                      <div className="metric-value">{quotes}</div>
                    </div>
                    <div className="metric">
                      <div className="metric-label">Requests</div>
                      <div className="metric-value">{requests}</div>
                    </div>
                    <div className="metric">
                      <div className="metric-label">Unsched</div>
                      <div className={`metric-value ${unscheduled > 0 ? "amber" : ""}`}>{unscheduled}</div>
                    </div>
                    <div className="metric">
                      <div className="metric-label">Leak</div>
                      <div className={`metric-value ${quoteLeak > 0 ? "amber" : ""}`}>{formatCents(quoteLeak)}</div>
                    </div>
                    <div className="metric">
                      <div className="metric-label">Past Due</div>
                      <div className={`metric-value ${pastDue > 0 ? "amber" : ""}`}>{formatCents(pastDue)}</div>
                    </div>
                  </div>
                  
                  <div className="user-footer">
                    <span className="sync-time">Synced: {formatRelative(conn.last_sync_at)}</span>
                    <ResyncButton connectionId={conn.id} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
