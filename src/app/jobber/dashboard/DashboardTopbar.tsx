import { SyncButton } from "./SyncButton";
import { ThemeToggle } from "./ThemeToggle";
import { SubscriptionStatus, LogoutButton } from "./HeaderButtons";

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
          <div className="text-primary" style={{ fontSize: 14, fontWeight: 800, letterSpacing: -0.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {companyName}
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
    </div>
  );
}
