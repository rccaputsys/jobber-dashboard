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
        
        /* Container */
        .admin-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 16px;
        }
        @media (min-width: 640px) {
          .admin-container {
            padding: 20px;
          }
        }
        @media (min-width: 1024px) {
          .admin-container {
            padding: 24px 32px 80px;
          }
        }
        
        /* Header */
        .admin-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .admin-header svg {
          width: 36px;
          height: 36px;
        }
        @media (min-width: 640px) {
          .admin-header {
            gap: 16px;
            margin-bottom: 32px;
          }
          .admin-header svg {
            width: 48px;
            height: 48px;
          }
        }
        .admin-title {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin: 0;
          color: #EAF1FF;
        }
        @media (min-width: 640px) {
          .admin-title {
            font-size: 24px;
          }
        }
        
        /* KPI Grids */
        .kpi-grid-primary {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        @media (min-width: 768px) {
          .kpi-grid-primary {
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 24px;
          }
        }
        
        .kpi-grid-secondary {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 24px;
        }
        @media (min-width: 768px) {
          .kpi-grid-secondary {
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 32px;
          }
        }
        
        .trial-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        @media (min-width: 640px) {
          .trial-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
          }
        }
        
        .data-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (min-width: 640px) {
          .data-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
          }
        }
        
        /* KPI Cards */
        .kpi-primary {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          padding: 16px;
          background: linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 16px 48px rgba(0,0,0,0.25);
        }
        @media (min-width: 640px) {
          .kpi-primary {
            border-radius: 20px;
            padding: 24px;
          }
        }
        
        .kpi-primary-value {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -2px;
          color: #EAF1FF;
        }
        @media (min-width: 640px) {
          .kpi-primary-value {
            font-size: 44px;
          }
        }
        
        .kpi-secondary {
          padding: 14px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.2s ease;
        }
        @media (min-width: 640px) {
          .kpi-secondary {
            padding: 16px;
            border-radius: 16px;
          }
        }
        .kpi-secondary:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.12);
        }
        
        .kpi-secondary-value {
          font-size: 24px;
          font-weight: 800;
        }
        @media (min-width: 640px) {
          .kpi-secondary-value {
            font-size: 32px;
          }
        }
        
        /* Panels */
        .panel {
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
          box-shadow: 0 16px 48px rgba(0,0,0,0.3);
          overflow: hidden;
          margin-bottom: 24px;
        }
        @media (min-width: 640px) {
          .panel {
            border-radius: 20px;
            margin-bottom: 32px;
          }
        }
        
        .panel-header {
          padding: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        @media (min-width: 640px) {
          .panel-header {
            padding: 20px 24px;
          }
        }
        
        .panel-content {
          padding: 16px;
        }
        @media (min-width: 640px) {
          .panel-content {
            padding: 24px;
          }
        }
        
        .panel-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .panel-title h2 {
          font-size: 14px;
          font-weight: 700;
          margin: 0;
          color: #EAF1FF;
        }
        @media (min-width: 640px) {
          .panel-title h2 {
            font-size: 16px;
          }
        }
        
        /* Trial Buckets */
        .trial-bucket {
          padding: 12px 8px;
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          text-align: center;
          transition: all 0.2s ease;
        }
        @media (min-width: 640px) {
          .trial-bucket {
            padding: 14px 16px;
            border-radius: 12px;
          }
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
        .trial-bucket-value {
          font-size: 22px;
          font-weight: 800;
          color: #EAF1FF;
        }
        @media (min-width: 640px) {
          .trial-bucket-value {
            font-size: 28px;
          }
        }
        
        /* Table */
        .table-container {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 0 -16px;
          padding: 0 16px;
        }
        @media (min-width: 640px) {
          .table-container {
            margin: 0;
            padding: 0;
          }
        }
        
        .data-table {
          width: 100%;
          min-width: 700px;
          border-collapse: collapse;
          font-size: 12px;
        }
        @media (min-width: 640px) {
          .data-table {
            font-size: 13px;
          }
        }
        .data-table th {
          text-align: left;
          padding: 12px 14px;
          font-weight: 600;
          font-size: 10px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: rgba(234,241,255,0.5);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          white-space: nowrap;
        }
        @media (min-width: 640px) {
          .data-table th {
            padding: 14px 16px;
            font-size: 11px;
          }
        }
        .data-table td {
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          vertical-align: middle;
          color: rgba(234,241,255,0.8);
        }
        @media (min-width: 640px) {
          .data-table td {
            padding: 16px;
          }
        }
        .data-table tbody tr {
          transition: background 0.15s ease;
        }
        .data-table tbody tr:hover {
          background: rgba(255,255,255,0.03);
        }
        
        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 7px 12px;
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
        @media (min-width: 640px) {
          .btn {
            padding: 8px 14px;
            border-radius: 10px;
            font-size: 12px;
          }
        }
        .btn:hover {
          background: rgba(90,166,255,0.15);
          border-color: rgba(90,166,255,0.4);
          color: #5aa6ff;
          transform: translateY(-1px);
        }
        
        /* Status Badges */
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
        @media (min-width: 640px) {
          .status-badge {
            padding: 5px 10px;
            border-radius: 8px;
            font-size: 11px;
          }
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
        
        /* Footer */
        .admin-footer {
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
          text-align: center;
          font-size: 11px;
          color: rgba(234,241,255,0.4);
        }
        @media (min-width: 640px) {
          .admin-footer {
            margin-top: 40px;
            padding-top: 24px;
            font-size: 12px;
          }
        }
      `}</style>

      <div className="admin-container">
        {/* Header */}
        <header className="admin-header animate-in">
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
            <h1 className="admin-title">Admin Dashboard</h1>
            <p style={{ fontSize: 13, color: "rgba(234,241,255,0.5)", marginTop: 4 }}>
              AccuInsight internal metrics
            </p>
          </div>
        </header>

        {/* Primary KPIs */}
        <div className="kpi-grid-primary animate-in delay-1">
          <div className="kpi-primary hover-lift" style={{ background: "linear-gradient(145deg, rgba(124,92,255,0.15) 0%, rgba(255,255,255,0.02) 100%)", borderColor: "rgba(124,92,255,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>👥</span>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(234,241,255,0.6)" }}>Total Users</span>
            </div>
            <div className="kpi-primary-value">{totalUsers}</div>
            <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", marginTop: 6 }}>All time signups</div>
          </div>

          <div className="kpi-primary hover-lift" style={{ background: "linear-gradient(145deg, rgba(16,185,129,0.15) 0%, rgba(255,255,255,0.02) 100%)", borderColor: "rgba(16,185,129,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>⭐</span>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(234,241,255,0.6)" }}>Active</span>
            </div>
            <div className="kpi-primary-value" style={{ color: "#10b981" }}>{activeSubscribers}</div>
            <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", marginTop: 6 }}>Paying customers</div>
          </div>

          <div className="kpi-primary hover-lift" style={{ background: "linear-gradient(145deg, rgba(16,185,129,0.15) 0%, rgba(255,255,255,0.02) 100%)", borderColor: "rgba(16,185,129,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>💰</span>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(234,241,255,0.6)" }}>MRR</span>
            </div>
            <div className="kpi-primary-value" style={{ color: "#10b981" }}>${mrr}</div>
            <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", marginTop: 6 }}>Monthly revenue</div>
          </div>

          <div className="kpi-primary hover-lift" style={{ background: "linear-gradient(145deg, rgba(59,130,246,0.15) 0%, rgba(255,255,255,0.02) 100%)", borderColor: "rgba(59,130,246,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>⏳</span>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(234,241,255,0.6)" }}>Trialing</span>
            </div>
            <div className="kpi-primary-value" style={{ color: "#3b82f6" }}>{trialing}</div>
            <div style={{ fontSize: 11, color: "rgba(234,241,255,0.5)", marginTop: 6 }}>Active trials</div>
          </div>
        </div>

        {/* Secondary KPIs */}
        <div className="kpi-grid-secondary animate-in delay-2">
          <div className="kpi-secondary">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, color: "rgba(234,241,255,0.5)" }}>Expired</span>
            </div>
            <div className="kpi-secondary-value" style={{ color: "#f59e0b" }}>{expiredTrials}</div>
          </div>

          <div className="kpi-secondary">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>🚪</span>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, color: "rgba(234,241,255,0.5)" }}>Churned</span>
            </div>
            <div className="kpi-secondary-value" style={{ color: "#ef4444" }}>{churned}</div>
          </div>

          <div className="kpi-secondary">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>🔄</span>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, color: "rgba(234,241,255,0.5)" }}>Today</span>
            </div>
            <div className="kpi-secondary-value" style={{ color: "#EAF1FF" }}>{syncedToday}</div>
          </div>

          <div className="kpi-secondary">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>📊</span>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, color: "rgba(234,241,255,0.5)" }}>7d Syncs</span>
            </div>
            <div className="kpi-secondary-value" style={{ color: "#EAF1FF" }}>{recentSyncs}</div>
          </div>
        </div>

        {/* Trial Countdown Buckets */}
        <div className="panel animate-in delay-3">
          <div className="panel-header">
            <div className="panel-title">
              <span style={{ fontSize: 16 }}>⏰</span>
              <h2>Trial Countdown</h2>
            </div>
            <p style={{ fontSize: 12, color: "rgba(234,241,255,0.5)", margin: 0 }}>Days until conversion</p>
          </div>
          <div className="panel-content">
            <div className="trial-grid">
              <div className="trial-bucket">
                <div style={{ fontSize: 10, color: "rgba(234,241,255,0.5)", marginBottom: 4, fontWeight: 600 }}>15-11d</div>
                <div className="trial-bucket-value">{trial15to11}</div>
              </div>
              <div className="trial-bucket">
                <div style={{ fontSize: 10, color: "rgba(234,241,255,0.5)", marginBottom: 4, fontWeight: 600 }}>10-6d</div>
                <div className="trial-bucket-value">{trial10to6}</div>
              </div>
              <div className="trial-bucket">
                <div style={{ fontSize: 10, color: "rgba(234,241,255,0.5)", marginBottom: 4, fontWeight: 600 }}>5-3d</div>
                <div className="trial-bucket-value">{trial5to3}</div>
              </div>
              <div className={`trial-bucket ${trial2 > 0 ? "warning" : ""}`}>
                <div style={{ fontSize: 10, color: trial2 > 0 ? "#f59e0b" : "rgba(234,241,255,0.5)", marginBottom: 4, fontWeight: 600 }}>2d</div>
                <div className="trial-bucket-value" style={{ color: trial2 > 0 ? "#f59e0b" : "#EAF1FF" }}>{trial2}</div>
              </div>
              <div className={`trial-bucket ${trial1 > 0 ? "urgent" : ""}`}>
                <div style={{ fontSize: 10, color: trial1 > 0 ? "#ef4444" : "rgba(234,241,255,0.5)", marginBottom: 4, fontWeight: 600 }}>1d</div>
                <div className="trial-bucket-value" style={{ color: trial1 > 0 ? "#ef4444" : "#EAF1FF" }}>{trial1}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Volume */}
        <div className="panel animate-in delay-4">
          <div className="panel-header">
            <div className="panel-title">
              <span style={{ fontSize: 16 }}>📦</span>
              <h2>Data Volume</h2>
            </div>
            <p style={{ fontSize: 12, color: "rgba(234,241,255,0.5)", margin: 0 }}>Total synced records</p>
          </div>
          <div className="panel-content">
            <div className="data-grid">
              <div className="kpi-secondary">
                <div style={{ fontSize: 10, color: "rgba(234,241,255,0.5)", marginBottom: 4, fontWeight: 600 }}>INVOICES</div>
                <div className="kpi-secondary-value">{(totalInvoices || 0).toLocaleString()}</div>
              </div>
              <div className="kpi-secondary">
                <div style={{ fontSize: 10, color: "rgba(234,241,255,0.5)", marginBottom: 4, fontWeight: 600 }}>JOBS</div>
                <div className="kpi-secondary-value">{(totalJobs || 0).toLocaleString()}</div>
              </div>
              <div className="kpi-secondary">
                <div style={{ fontSize: 10, color: "rgba(234,241,255,0.5)", marginBottom: 4, fontWeight: 600 }}>QUOTES</div>
                <div className="kpi-secondary-value">{(totalQuotes || 0).toLocaleString()}</div>
              </div>
              <div className="kpi-secondary">
                <div style={{ fontSize: 10, color: "rgba(234,241,255,0.5)", marginBottom: 4, fontWeight: 600 }}>REQUESTS</div>
                <div className="kpi-secondary-value">{(totalRequests || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="panel animate-in delay-5">
          <div className="panel-header">
            <div className="panel-title">
              <span style={{ fontSize: 16 }}>👤</span>
              <h2>All Users</h2>
            </div>
            <p style={{ fontSize: 12, color: "rgba(234,241,255,0.5)", margin: 0 }}>{totalUsers} total accounts</p>
          </div>
          <div className="table-container">
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
                        <ResyncButton connectionId={conn.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <footer className="admin-footer">
          <p style={{ margin: 0 }}>© 2026 OwnerView. Admin Dashboard.</p>
        </footer>
      </div>
    </main>
  );
}
