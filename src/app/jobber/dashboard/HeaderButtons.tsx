export function SubscriptionStatus({ billingStatus, trialEndsAt, subscriptionActive }: {
  billingStatus: string;
  trialEndsAt: number;
  subscriptionActive: boolean;
}) {
  if (subscriptionActive) {
    return (
      <form action="/api/billing/portal" method="POST">
        <button type="submit" className="btn" style={{
          padding: "5px 10px", fontSize: 11, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 5,
          background: "rgba(16,185,129,0.12)",
          borderColor: "rgba(16,185,129,0.3)",
          color: "#10b981",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
          Pro &middot; Manage
        </button>
      </form>
    );
  }

  const now = Date.now();
  const daysLeft = Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)));
  const urgent = daysLeft <= 3;

  return (
    <form action="/api/billing/checkout" method="POST">
      <button type="submit" className="btn" style={{
        padding: "5px 10px", fontSize: 11, fontWeight: 700,
        display: "flex", alignItems: "center", gap: 5,
        background: urgent ? "rgba(239,68,68,0.12)" : "rgba(90,166,255,0.12)",
        borderColor: urgent ? "rgba(239,68,68,0.3)" : "rgba(90,166,255,0.3)",
        color: urgent ? "#ef4444" : "#5aa6ff",
      }}>
        {daysLeft}d left &middot; Subscribe
      </button>
    </form>
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
