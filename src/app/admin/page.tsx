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
    .order("created_at", { ascending: false });

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

  // Aggregate metrics across all users
  const totalPastDueCents = allConnections.reduce((sum, c) => sum + (c.invoices_past_due_cents || 0), 0);
  const total15PlusCents = allConnections.reduce((sum, c) => sum + (c.invoices_15plus_cents || 0), 0);

  const formatCents = (cents: number) => {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatRelative = (d: string | null) => {
    if (!d) return "Never";
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return formatDate(d);
  };

  return (
    <main style={{
      minHeight: "100vh",
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: `
        radial-gradient(ellipse 80% 60% at 50% -20%, rgba(124,92,255,0.15), transparent),
        radial-gradient(ellipse 60% 40% at 100% 0%, rgba(90,166,255,0.1), transparent),
        linear-gradient(180deg, #060811 0%, #0a1020 100%)
      `,
    }}>
      <style>{`
        * { box-sizing: border-box; }
        
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 16px;
          padding-bottom: 80px;
        }
        
        .header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .header h1 {
          font-size: 20px;
          font-weight: 800;
          color: #EAF1FF;
          margin: 0;
        }
        .header p {
          font-size: 12px;
          color: rgba(234,241,255,0.5);
          margin: 4px 0 0 0;
        }
        
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        .kpi-box {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 12px 8px;
          text-align: center;
        }
        .kpi-box.highlight {
          background: rgba(16,185,129,0.1);
          border-color: rgba(16,185,129,0.3);
        }
        .kpi-label {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(234,241,255,0.5);
          margin-bottom: 4px;
        }
        .kpi-value {
          font-size: 22px;
          font-weight: 800;
          color: #EAF1FF;
        }
        .kpi-value.green { color: #10b981; }
        .kpi-value.blue { color: #3b82f6; }
        .kpi-value.amber { color: #f59e0b; }
        .kpi-value.red { color: #ef4444; }
        
        .section {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          margin-bottom: 16px;
          overflow: hidden;
        }
        .section-header {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-header h2 {
          font-size: 14px;
          font-weight: 700;
          color: #EAF1FF;
          margin: 0;
        }
        .section-content {
          padding: 12px;
        }
        
        .trial-buckets {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
        }
        .trial-bucket {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 10px 4px;
          text-align: center;
        }
        .trial-bucket.warning {
          background: rgba(245,158,11,0.1);
          border-color: rgba(245,158,11,0.3);
        }
        .trial-bucket.urgent {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.3);
        }
        .trial-bucket-label {
          font-size: 9px;
          font-weight: 600;
          color: rgba(234,241,255,0.5);
          margin-bottom: 2px;
        }
        .trial-bucket-value {
          font-size: 18px;
          font-weight: 800;
          color: #EAF1FF;
        }
        
        .user-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          margin-bottom: 10px;
          overflow: hidden;
        }
        .user-card:last-child {
          margin-bottom: 0;
        }
        .user-header {
          padding: 14px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .user-name {
          font-size: 14px;
          font-weight: 700;
          color: #EAF1FF;
          margin: 0 0 4px 0;
        }
        .user-meta {
          font-size: 11px;
          color: rgba(234,241,255,0.5);
        }
        .user-status {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.3px;
          white-space: nowrap;
        }
        .status-active {
          background: rgba(16,185,129,0.15);
          color: #10b981;
          border: 1px solid rgba(16,185,129,0.3);
        }
        .status-trial {
          background: rgba(59,130,246,0.15);
          color: #3b82f6;
          border: 1px solid rgba(59,130,246,0.3);
        }
        .status-expired {
          background: rgba(239,68,68,0.15);
          color: #ef4444;
          border: 1px solid rgba(239,68,68,0.3);
        }
        .status-canceled {
          background: rgba(107,114,128,0.15);
          color: #6b7280;
          border: 1px solid rgba(107,114,128,0.3);
        }
        
        .user-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: rgba(255,255,255,0.06);
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .metric {
          background: #0a0f1a;
          padding: 10px 8px;
          text-align: center;
        }
        .metric-label {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          color: rgba(234,241,255,0.4);
          margin-bottom: 2px;
        }
        .metric-value {
          font-size: 14px;
          font-weight: 700;
          color: #EAF1FF;
        }
        .metric-value.red { color: #ef4444; }
        .metric-value.amber { color: #f59e0b; }
        
        .user-footer {
          padding: 10px 14px;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: rgba(234,241,255,0.5);
        }
        
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 11px;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.06);
          color: rgba(234,241,255,0.8);
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .btn:hover {
          background: rgba(90,166,255,0.15);
          border-color: rgba(90,166,255,0.4);
          color: #5aa6ff;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="container">
        {/* Header */}
        <div className="header">
          <svg width="32" height="32" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
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
            <h1>Admin</h1>
            <p>AccuInsight Dashboard</p>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="kpi-row">
          <div className="kpi-box">
            <div className="kpi-label">Users</div>
            <div className="kpi-value">{totalUsers}</div>
          </div>
          <div className="kpi-box highlight">
            <div className="kpi-label">Active</div>
            <div className="kpi-value green">{activeSubscribers}</div>
          </div>
          <div className="kpi-box highlight">
            <div className="kpi-label">MRR</div>
            <div className="kpi-value green">${mrr}</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">Trial</div>
            <div className="kpi-value blue">{trialing}</div>
          </div>
        </div>

        <div className="kpi-row">
          <div className="kpi-box">
            <div className="kpi-label">Expired</div>
            <div className="kpi-value amber">{expiredTrials}</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">Churned</div>
            <div className="kpi-value red">{churned}</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">Past Due</div>
            <div className="kpi-value">{formatCents(totalPastDueCents)}</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">15+ DPD</div>
            <div className="kpi-value">{formatCents(total15PlusCents)}</div>
          </div>
        </div>

        {/* Trial Countdown */}
        <div className="section">
          <div className="section-header">
            <span>⏰</span>
            <h2>Trial Countdown</h2>
          </div>
          <div className="section-content">
            <div className="trial-buckets">
              <div className="trial-bucket">
                <div className="trial-bucket-label">15-11d</div>
                <div className="trial-bucket-value">{trial15to11}</div>
              </div>
              <div className="trial-bucket">
                <div className="trial-bucket-label">10-6d</div>
                <div className="trial-bucket-value">{trial10to6}</div>
              </div>
              <div className="trial-bucket">
                <div className="trial-bucket-label">5-3d</div>
                <div className="trial-bucket-value">{trial5to3}</div>
              </div>
              <div className={`trial-bucket ${trial2 > 0 ? "warning" : ""}`}>
                <div className="trial-bucket-label" style={{ color: trial2 > 0 ? "#f59e0b" : undefined }}>2d</div>
                <div className="trial-bucket-value" style={{ color: trial2 > 0 ? "#f59e0b" : undefined }}>{trial2}</div>
              </div>
              <div className={`trial-bucket ${trial1 > 0 ? "urgent" : ""}`}>
                <div className="trial-bucket-label" style={{ color: trial1 > 0 ? "#ef4444" : undefined }}>1d</div>
                <div className="trial-bucket-value" style={{ color: trial1 > 0 ? "#ef4444" : undefined }}>{trial1}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="section">
          <div className="section-header">
            <span>👤</span>
            <h2>Users ({totalUsers})</h2>
          </div>
          <div className="section-content">
            {allConnections.map((conn) => {
              const daysLeft = getTrialDaysLeft(conn);
              let statusClass = "status-canceled";
              let statusText = conn.billing_status || "—";
              
              if (conn.billing_status === "active") {
                statusClass = "status-active";
                statusText = "ACTIVE";
              } else if (conn.billing_status === "trialing") {
                if (daysLeft !== null && daysLeft > 0) {
                  statusClass = "status-trial";
                  statusText = `${daysLeft}d LEFT`;
                } else {
                  statusClass = "status-expired";
                  statusText = "EXPIRED";
                }
              } else if (conn.billing_status === "canceled" || conn.canceled_at) {
                statusClass = "status-canceled";
                statusText = "CANCELED";
              }

              const pastDue = conn.invoices_past_due_cents || 0;
              const fifteenPlus = conn.invoices_15plus_cents || 0;

              return (
                <div key={conn.id} className="user-card">
                  <div className="user-header">
                    <div>
                      <div className="user-name">{conn.jobber_account_name || conn.company_name || "Unknown"}</div>
                      <div className="user-meta">
                        {conn.owner_name || "—"} • {conn.business_type || "—"}
                      </div>
                    </div>
                    <span className={`user-status ${statusClass}`}>{statusText}</span>
                  </div>
                  
                  <div className="user-metrics">
                    <div className="metric">
                      <div className="metric-label">Jobs</div>
                      <div className="metric-value">{conn.job_count || 0}</div>
                    </div>
                    <div className="metric">
                      <div className="metric-label">Past Due</div>
                      <div className={`metric-value ${pastDue > 0 ? "amber" : ""}`}>
                        {formatCents(pastDue)}
                      </div>
                    </div>
                    <div className="metric">
                      <div className="metric-label">15+ DPD</div>
                      <div className={`metric-value ${fifteenPlus > 0 ? "red" : ""}`}>
                        {formatCents(fifteenPlus)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="user-footer">
                    <span>Synced: {formatRelative(conn.last_sync_at)}</span>
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
