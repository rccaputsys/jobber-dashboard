// src/app/admin/page.tsx
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";

// Simple admin auth - change this to your email
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

  // Fetch all stats in parallel
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

  // Calculate metrics
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

  // Trial buckets
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

  // MRR calculation ($29/month per active subscriber)
  const mrr = activeSubscribers * 29;

  // Recent syncs (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSyncs = allConnections.filter(c => {
    if (!c.last_sync_at) return false;
    return new Date(c.last_sync_at) >= sevenDaysAgo;
  }).length;

  // Synced today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const syncedToday = allConnections.filter(c => {
    if (!c.last_sync_at) return false;
    return new Date(c.last_sync_at) >= today;
  }).length;

  // Format date helper
  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatRelative = (d: string | null) => {
    if (!d) return "Never";
    const diff = Date.now() - new Date(d).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (hours < 1) return "< 1 hour ago";
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return formatDate(d);
  };

  const statusBadge = (status: string | null, trialEnds: string | null) => {
    if (status === "active") {
      return <span style={{ background: "rgba(16,185,129,0.2)", color: "#10b981", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>ACTIVE</span>;
    }
    if (status === "trialing") {
      const ends = trialEnds ? new Date(trialEnds).getTime() : 0;
      const daysLeft = Math.ceil((ends - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 0) {
        return <span style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>EXPIRED</span>;
      }
      return <span style={{ background: "rgba(59,130,246,0.2)", color: "#3b82f6", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>TRIAL ({daysLeft}d)</span>;
    }
    if (status === "canceled") {
      return <span style={{ background: "rgba(107,114,128,0.2)", color: "#6b7280", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>CANCELED</span>;
    }
    return <span style={{ background: "rgba(107,114,128,0.2)", color: "#6b7280", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{status || "—"}</span>;
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#e5e5e5",
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: 24,
    }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "#fff" }}>Admin Dashboard</h1>
          <p style={{ fontSize: 14, color: "#666", marginTop: 4 }}>AccuInsight internal metrics</p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
          <KPICard label="Total Users" value={totalUsers} />
          <KPICard label="Active Subscribers" value={activeSubscribers} color="#10b981" />
          <KPICard label="Trialing" value={trialing} color="#3b82f6" />
          <KPICard label="Expired Trials" value={expiredTrials} color="#f59e0b" />
          <KPICard label="Churned" value={churned} color="#ef4444" />
          <KPICard label="MRR" value={`$${mrr}`} color="#10b981" />
          <KPICard label="Synced Today" value={syncedToday} />
          <KPICard label="Synced (7d)" value={recentSyncs} />
        </div>

        {/* Trial Buckets */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "#fff" }}>Trial Days Remaining</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
            <SmallCard label="15-11 days" value={trial15to11.toString()} />
            <SmallCard label="10-6 days" value={trial10to6.toString()} />
            <SmallCard label="5-3 days" value={trial5to3.toString()} />
            <SmallCard label="2 days" value={trial2.toString()} color={trial2 > 0 ? "#f59e0b" : undefined} />
            <SmallCard label="1 day" value={trial1.toString()} color={trial1 > 0 ? "#ef4444" : undefined} />
          </div>
        </div>

        {/* Data Volume */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "#fff" }}>Data Volume</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <SmallCard label="Invoices" value={(totalInvoices || 0).toLocaleString()} />
            <SmallCard label="Jobs" value={(totalJobs || 0).toLocaleString()} />
            <SmallCard label="Quotes" value={(totalQuotes || 0).toLocaleString()} />
            <SmallCard label="Requests" value={(totalRequests || 0).toLocaleString()} />
          </div>
        </div>

        {/* Users Table */}
        <div style={{ background: "#111", borderRadius: 12, border: "1px solid #222", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #222" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "#fff" }}>All Users ({totalUsers})</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#0a0a0a" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: "#666", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Company</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: "#666", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Owner</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: "#666", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: "#666", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Last Sync</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: "#666", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Created</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: "#666", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allConnections.map((conn) => (
                  <tr key={conn.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 500, color: "#fff" }}>{conn.jobber_account_name || conn.company_name || "Unknown"}</div>
                      <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{conn.business_type || "—"} • {conn.team_size || "—"}</div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#999" }}>{conn.owner_name || "—"}</td>
                    <td style={{ padding: "12px 16px" }}>{statusBadge(conn.billing_status, conn.trial_ends_at)}</td>
                    <td style={{ padding: "12px 16px", color: "#999" }}>{formatRelative(conn.last_sync_at)}</td>
                    <td style={{ padding: "12px 16px", color: "#999" }}>{formatDate(conn.created_at)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <a
                        href={`/api/sync/run?connection_id=${conn.id}&full=true`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-block",
                          padding: "6px 12px",
                          background: "#222",
                          border: "1px solid #333",
                          borderRadius: 6,
                          color: "#999",
                          fontSize: 11,
                          textDecoration: "none",
                          fontWeight: 500,
                        }}
                      >
                        Resync
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

function KPICard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      background: "#111",
      border: "1px solid #222",
      borderRadius: 12,
      padding: 20,
    }}>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: color || "#fff" }}>{value}</div>
    </div>
  );
}

function SmallCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      background: "#111",
      border: "1px solid #222",
      borderRadius: 8,
      padding: 14,
    }}>
      <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: color || "#fff" }}>{value}</div>
    </div>
  );
}
