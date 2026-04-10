export function SubscriptionStatus({ billingStatus, trialEndsAt, subscriptionActive, isLight }: {
  billingStatus: string;
  trialEndsAt: number;
  subscriptionActive: boolean;
  isLight?: boolean;
}) {
  const pillStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "100%", gap: 6, padding: "8px 0", borderRadius: 6,
    background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
    border: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
    color: isLight ? "#64748b" : "rgba(255,255,255,0.65)",
    fontSize: 10, fontWeight: 600, cursor: "pointer",
  };

  if (subscriptionActive) {
    return (
      <form action="/api/billing/portal" method="POST" style={{ width: "100%" }}>
        <button type="submit" style={pillStyle}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
          Pro &middot; Manage
        </button>
      </form>
    );
  }

  return (
    <form action="/api/billing/checkout" method="POST" style={{ width: "100%" }}>
      <button type="submit" style={pillStyle}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5aa6ff", flexShrink: 0 }} />
        Manage Subscription
      </button>
    </form>
  );
}

export function TrialBanner({ trialEndsAt, subscriptionActive }: {
  trialEndsAt: number;
  subscriptionActive: boolean;
}) {
  if (subscriptionActive) return null;

  const now = Date.now();
  const daysLeft = Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)));
  const expired = daysLeft === 0;
  const urgent = daysLeft <= 3;
  const warning = daysLeft <= 7;

  const bgColor = expired
    ? "linear-gradient(90deg, rgba(239,68,68,0.12), rgba(239,68,68,0.06))"
    : urgent
    ? "linear-gradient(90deg, rgba(239,68,68,0.1), rgba(245,158,11,0.06))"
    : warning
    ? "linear-gradient(90deg, rgba(245,158,11,0.08), rgba(245,158,11,0.04))"
    : "linear-gradient(90deg, rgba(90,166,255,0.08), rgba(90,166,255,0.04))";

  const borderColor = expired || urgent ? "rgba(239,68,68,0.2)" : warning ? "rgba(245,158,11,0.15)" : "rgba(90,166,255,0.12)";
  const textColor = expired || urgent ? "#ef4444" : warning ? "#f59e0b" : "#5aa6ff";

  const message = expired
    ? "Your free trial has ended. Upgrade to keep your dashboard."
    : daysLeft === 1
    ? "Last day of your free trial. Upgrade now to keep your data."
    : daysLeft <= 3
    ? `${daysLeft} days left on your free trial. Don't lose access to your dashboard.`
    : daysLeft <= 7
    ? `${daysLeft} days left in your trial. Lock in your $29/mo rate before it ends.`
    : `${daysLeft} days left in your free trial. Enjoying it? Upgrade anytime.`;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
      padding: "8px 16px",
      background: bgColor,
      borderBottom: `1px solid ${borderColor}`,
      flexWrap: "wrap",
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: textColor }}>
        {message}
      </span>
      <form action="/api/billing/checkout" method="POST" style={{ margin: 0 }}>
        <button type="submit" style={{
          padding: "4px 14px", fontSize: 11, fontWeight: 700,
          background: expired || urgent ? "#ef4444" : warning ? "#f59e0b" : "linear-gradient(135deg, #5aa6ff, #38bdf8)",
          color: "#fff", border: "none", borderRadius: 6,
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          whiteSpace: "nowrap",
        }}>
          {expired ? "Upgrade Now" : "Upgrade for $29/mo"}
        </button>
      </form>
    </div>
  );
}

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button type="submit" className="btn" title="Log out" style={{
        padding: "5px 8px", fontSize: 11, display: "flex",
        alignItems: "center", justifyContent: "center", minWidth: 28,
      }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M6 2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2M10.5 11.5L14 8l-3.5-3.5M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </form>
  );
}
