import { SyncButton } from "./SyncButton";
import { ThemeToggle } from "./ThemeToggle";
import { NavTabs } from "./NavTabs";
import { SubscriptionStatus, LogoutButton, TrialBanner } from "./HeaderButtons";

type Props = {
  companyName: string;
  lastSyncPretty: string;
  connectionId: string;
  billingStatus: string;
  trialEndsAt: number;
  subscriptionActive: boolean;
  adminConnectionId?: string;
  autoSync?: boolean;
};

export function DashboardTopbar({
  companyName,
  lastSyncPretty,
  connectionId,
  billingStatus,
  trialEndsAt,
  subscriptionActive,
  adminConnectionId,
  autoSync,
}: Props) {
  return (
    <div className="dashboard-topbar animate-in">
      {adminConnectionId && (
        <div style={{
          background: "linear-gradient(90deg, #7c5cff, #5aa6ff)",
          color: "#fff", textAlign: "center",
          padding: "6px 16px", fontSize: 12, fontWeight: 600,
          borderRadius: "16px 16px 0 0",
        }}>
          Viewing as: {companyName}
          <a href="/admin" style={{ color: "#fff", marginLeft: 10, textDecoration: "underline", opacity: 0.9 }}>&larr; Admin</a>
        </div>
      )}
      <header className="dashboard-header">
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <svg width="24" height="24" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c5cff" />
                <stop offset="100%" stopColor="#5aa6ff" />
              </linearGradient>
            </defs>
            <circle cx="25" cy="25" r="22" fill="none" stroke="url(#logoGrad)" strokeWidth="3" />
            <polyline points="8,25 16,25 21,12 29,38 34,20 42,25" fill="none" stroke="url(#logoGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", background: "linear-gradient(135deg, #7c5cff, #5aa6ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              AccuInsight
            </div>
            <div className="text-primary" style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {companyName}
            </div>
          </div>
        </div>

        <div className="header-actions" style={{ gap: 6 }}>
          <SyncButton connectionId={connectionId} autoSync={autoSync} />
          <span className="header-subtitle" style={{ fontSize: 9, whiteSpace: "nowrap" }}>{lastSyncPretty}</span>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
          <ThemeToggle />
          <SubscriptionStatus billingStatus={billingStatus} trialEndsAt={trialEndsAt} subscriptionActive={subscriptionActive} />
          <LogoutButton />
        </div>
      </header>

      <NavTabs adminConnectionId={adminConnectionId} />
    </div>
  );
}
