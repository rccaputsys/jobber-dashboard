// src/app/admin/page.tsx
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";

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

  const [
    { data: connections },
    { count: totalInvoices },
    { count: totalJobs },
    { count: totalQuotes },
    { count: totalRequests },
  ] = await Promise.all([
    supabaseAdmin
      .from("jobber_connections")
      .select("*")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("fact_invoices").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("fact_jobs").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("fact_quotes").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("fact_requests").select("*", { count: "exact", head: true }),
  ]);

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

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSyncs = allConnections.filter(c => {
    if (!c.last_sync_at) return false;
    return new Date(c.last_sync_at) >= sevenDaysAgo;
  }).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const syncedToday = allConnections.filter(c => {
    if (!c.last_sync_at) return false;
    return new Date(c.last_sync_at) >= today;
  }).length;

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatRelative = (d: string | null) => {
    if (!d) return "Never";
    const diff = Date.now() - new Date(d).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (hours < 1) return "< 1hr ago";
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
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
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
        .kpi-primary {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          padding: 24px;
          background: linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 16px 48px rgba(0,0,0,0.25);
        }
        .kpi-secondary {
          padding: 16px;
          border-radius: 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.2s ease;
        }
        .kpi-secondary:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.12);
        }
        .panel {
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
          box-shadow: 0 16px 48px rgba(0,0,0,0.3);
          overflow: hidden;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .data-table th {
          text-align: left;
          padding: 14px 16px;
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: rgba(234,241,255,0.5);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          white-space: nowrap;
        }
        .data-table td {
          padding: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          vertical-align: middle;
          color: rgba(234,241,255,0.8);
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
          gap: 6px;
          padding: 8px 14px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 12px;
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
          transform: translateY(-1px);
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
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
        .trial-bucket {
          padding: 14px 16px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          text-align: center;
          transition: all 0.2s ease;
        }
        .trial-bucket:hover {
          background: rgba(255,255,255,0.06);
        }
        .trial-bucket.urgent {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.3);
        }
        .trial-bucket.warning {
          background: rgba(245,158,11,0.1);
          border-color: rgba(245,158,11,0.3);
        }
      `}</style>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 32px 80px" }}>
        {/* Header */}
        <header className="animate-in" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <svg width="48" height="48" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
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
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, margin: 0, color: "#EAF1FF" }}>
              Admin Dashboard
            </h1>
            <p style={{ fontSize: 14, color: "rgba(234,241,255,0.5)", marginTop: 4 }}>
              AccuInsight internal metrics • {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
        </header>

        {/* Primary KPIs */}
        <div className="animate-in delay-1" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 24 }}>
          <div className="kpi-primary hover-lift" style={{ background: "linear-gradient(145deg, rgba(124,92,255,0.15) 0%, rgba(255,255,255,0.02) 100%)", borderColor: "rgba(124,92,255,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>👥</span>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(234,241,255,0.6)" }}>Total Users</span>
            </div>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2, color: "#EAF1FF" }}>{totalUsers}</div>
            <div style={{ fontSize: 12, color: "rgba(234,241,255,0.5)", marginTop: 8 }}>All time signups</div>
          </div>

          <div className="kpi-primary hover-lift" style={{ background: "linear-gradient(145deg, rgba(16,185,129,0.15) 0%, rgba(255,255,255,0.02) 100%)", borderColor: "rgba(16,185,129,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>⭐</span>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(234,241,255,0.6)" }}>Active Subscribers</span>
            </div>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2, color: "#10b981" }}>{activeSubscribers}</div>
            <div style={{ fontSize: 12, color: "rgba(234,241,255,0.5)", marginTop: 8 }}>Paying customers</div>
          </div>

          <div className="kpi-primary hover-lift" style={{ background: "linear-gradient(145deg, rgba(16,185,129,0.15) 0%, rgba(255,255,255,0.02) 100%)", borderColor: "rgba(16,185,129,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>💰</span>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(234,241,255,0.6)" }}>MRR</span>
            </div>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2, color: "#10b981" }}>${mrr}</div>
            <div style={{ fontSize: 12, color: "rgba(234,241,255,0.5)", marginTop: 8 }}>Monthly recurring revenue</div>
          </div>

          <div className="kpi-primary hover-lift" style={{ background: "linear-gradient(145deg, rgba(59,130,246,0.15) 0%, rgba(255,255,255,0.02) 100%)", borderColor: "rgba(59,130,246,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>⏳</span>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(234,241,255,0.6)" }}>Trialing</span>
            </div>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2, color: "#3b82f6" }}>{trialing}</div>
            <div style={{ fontSize: 12, color: "rgba(234,241,255,0.5)", marginTop: 8 }}>Active trials</div>
          </div>
        </div>

        {/* Secondary KPIs */}
        <div className="animate-in delay-2" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          <div className="kpi-secondary">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, color: "rgba(234,241,255,0.5)" }}>Expired Trials</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#f59e0b" }}>{expiredTrials}</div>
          </div>

          <div className="kpi-secondary">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>🚪</span>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, color: "rgba(234,241,255,0.5)" }}>Churned</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#ef4444" }}>{churned}</div>
          </div>

          <div className="kpi-secondary">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>🔄</span>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, color: "rgba(234,241,255,0.5)" }}>Synced Today</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#EAF1FF" }}>{syncedToday}</div>
          </div>

          <div className="kpi-secondary">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>📊</span>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, color: "rgba(234,241,255,0.5)" }}>Synced (7d)</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#EAF1FF" }}>{recentSyncs}</div>
          </div>
        </div>

        {/* Trial Countdown Buckets */}
        <div className="panel animate-in delay-3" style={{ marginBottom: 32, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 18 }}>⏰</span>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#EAF1FF" }}>Trial Countdown</h2>
            <span style={{ fontSize: 13, color: "rgba(234,241,255,0.5)", marginLeft: 8 }}>Days remaining until conversion deadline</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            <div className="trial-bucket">
              <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", marginBottom: 6, fontWeight: 600 }}>15-11 DAYS</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#EAF1FF" }}>{trial15to11}</div>
            </div>
            <div className="trial-bucket">
              <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", marginBottom: 6, fontWeight: 600 }}>10-6 DAYS</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#EAF1FF" }}>{trial10to6}</div>
            </div>
            <div className="trial-bucket">
              <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", marginBottom: 6, fontWeight: 600 }}>5-3 DAYS</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#EAF1FF" }}>{trial5to3}</div>
            </div>
            <div className={`trial-bucket ${trial2 > 0 ? "warning" : ""}`}>
              <div style={{ fontSize: 11, color: trial2 > 0 ? "#f59e0b" : "rgba(234,241,255,0.5)", marginBottom: 6, fontWeight: 600 }}>2 DAYS</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: trial2 > 0 ? "#f59e0b" : "#EAF1FF" }}>{trial2}</div>
            </div>
            <div className={`trial-bucket ${trial1 > 0 ? "urgent" : ""}`}>
              <div style={{ fontSize: 11, color: trial1 > 0 ? "#ef4444" : "rgba(234,241,255,0.5)", marginBottom: 6, fontWeight: 600 }}>1 DAY</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: trial1 > 0 ? "#ef4444" : "#EAF1FF" }}>{trial1}</div>
            </div>
          </div>
        </div>

        {/* Data Volume */}
        <div className="panel animate-in delay-4" style={{ marginBottom: 32, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 18 }}>📦</span>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#EAF1FF" }}>Data Volume</h2>
            <span style={{ fontSize: 13, color: "rgba(234,241,255,0.5)", marginLeft: 8 }}>Total records synced across all accounts</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <div className="kpi-secondary">
              <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", marginBottom: 6, fontWeight: 600 }}>INVOICES</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#EAF1FF" }}>{(totalInvoices || 0).toLocaleString()}</div>
            </div>
            <div className="kpi-secondary">
              <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", marginBottom: 6, fontWeight: 600 }}>JOBS</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#EAF1FF" }}>{(totalJobs || 0).toLocaleString()}</div>
            </div>
            <div className="kpi-secondary">
              <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", marginBottom: 6, fontWeight: 600 }}>QUOTES</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#EAF1FF" }}>{(totalQuotes || 0).toLocaleString()}</div>
            </div>
            <div className="kpi-secondary">
              <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", marginBottom: 6, fontWeight: 600 }}>REQUESTS</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#EAF1FF" }}>{(totalRequests || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="panel animate-in delay-5">
          <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#EAF1FF" }}>All Users</h2>
              <p style={{ fontSize: 13, color: "rgba(234,241,255,0.5)", marginTop: 4 }}>{totalUsers} total accounts</p>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Trial Ends</th>
                  <th>Last Sync</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
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
                      statusText = `TRIAL (${daysLeft}d)`;
                    } else {
                      statusClass = "status-expired";
                      statusText = "EXPIRED";
                    }
                  } else if (conn.billing_status === "canceled" || conn.canceled_at) {
                    statusClass = "status-canceled";
                    statusText = "CANCELED";
                  }

                  return (
                    <tr key={conn.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "#EAF1FF" }}>{conn.jobber_account_name || conn.company_name || "Unknown"}</div>
                        <div style={{ fontSize: 11, color: "rgba(234,241,255,0.4)", marginTop: 2 }}>
                          {conn.business_type || "—"} • {conn.team_size || "—"}
                        </div>
                      </td>
                      <td style={{ color: "rgba(234,241,255,0.7)" }}>{conn.owner_name || "—"}</td>
                      <td><span className={`status-badge ${statusClass}`}>{statusText}</span></td>
                      <td style={{ color: "rgba(234,241,255,0.6)" }}>{formatDate(conn.trial_ends_at)}</td>
                      <td style={{ color: "rgba(234,241,255,0.6)" }}>{formatRelative(conn.last_sync_at)}</td>
                      <td style={{ color: "rgba(234,241,255,0.6)" }}>{formatDate(conn.created_at)}</td>
                      <td>
                        <a
                          href={`/api/sync/run?connection_id=${conn.id}&full=true`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn"
                        >
                          🔄 Resync
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <footer style={{
          marginTop: 40,
          paddingTop: 24,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
          fontSize: 12,
          color: "rgba(234,241,255,0.4)",
        }}>
          <p style={{ margin: 0 }}>© 2026 OwnerView. Admin Dashboard.</p>
        </footer>
      </div>
    </main>
  );
}
