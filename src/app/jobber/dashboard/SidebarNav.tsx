"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsLight } from "@/lib/hooks";
import { SyncButton } from "./SyncButton";
import { ThemeToggle } from "./ThemeToggle";
import { SubscriptionStatus, LogoutButton } from "./HeaderButtons";

const tabs = [
  { label: "Overview", href: "/jobber/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { label: "Sell", href: "/jobber/sales", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { label: "Book", href: "/jobber/capacity", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { label: "Collect", href: "/jobber/invoices", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
];

// Bullseye/target icon paths
const targetIcon = "M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M12 12m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0";

type Props = {
  adminConnectionId?: string;
  companyName?: string;
  connectionId?: string;
  lastSyncPretty?: string;
  billingStatus?: string;
  trialEndsAt?: number;
  subscriptionActive?: boolean;
  autoSync?: boolean;
  onOpenTargets?: () => void;
};

export function SidebarNav({ adminConnectionId, companyName, connectionId, lastSyncPretty, billingStatus, trialEndsAt, subscriptionActive, autoSync, onOpenTargets }: Props) {
  const pathname = usePathname();
  const isLight = useIsLight();

  return (
    <nav className="sidebar-nav">
      {/* Logo + company */}
      <div style={{ padding: "16px 14px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <svg width="24" height="24" viewBox="0 0 50 50" style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id="sidebarLogo" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5aa6ff" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
            <circle cx="25" cy="25" r="22" fill="none" stroke="url(#sidebarLogo)" strokeWidth="3" />
            <polyline points="8,25 16,25 21,12 29,38 34,20 42,25" fill="none" stroke="url(#sidebarLogo)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: 12, fontWeight: 800, background: "linear-gradient(135deg, #5aa6ff, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            AccuInsight
          </div>
        </div>
        {companyName && (
          <div className="text-primary" style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: 32 }}>
            {companyName}
          </div>
        )}
      </div>

      {/* Admin banner */}
      {adminConnectionId && (
        <div style={{
          margin: "0 8px 8px", padding: "6px 10px", borderRadius: 6,
          background: "rgba(90,166,255,0.1)", fontSize: 10, fontWeight: 600, color: "#5aa6ff",
        }}>
          Admin view
          <a href="/admin" style={{ color: "#5aa6ff", marginLeft: 6, textDecoration: "underline", opacity: 0.8 }}>Back</a>
        </div>
      )}

      {/* Nav items */}
      <div style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href !== "/jobber/dashboard" && pathname.startsWith(tab.href));
          const href = adminConnectionId ? `${tab.href}?admin_connection_id=${adminConnectionId}` : tab.href;

          return (
            <Link
              key={tab.href}
              href={href}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8,
                textDecoration: "none",
                background: isActive ? (isLight ? "rgba(90,166,255,0.1)" : "rgba(90,166,255,0.12)") : "transparent",
                color: isActive ? "#5aa6ff" : (isLight ? "#64748b" : "rgba(255,255,255,0.5)"),
                fontSize: 13, fontWeight: isActive ? 700 : 600,
                transition: "all 0.15s ease",
                borderLeft: isActive ? "3px solid #5aa6ff" : "3px solid transparent",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={tab.icon} />
              </svg>
              {tab.label}
            </Link>
          );
        })}

        {/* Targets — opens drawer instead of navigating */}
        <button
          onClick={onOpenTargets}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 8,
            background: "transparent",
            color: isLight ? "#64748b" : "rgba(255,255,255,0.5)",
            fontSize: 13, fontWeight: 600,
            transition: "all 0.15s ease",
            borderLeft: "3px solid transparent",
            border: "none", cursor: "pointer", textAlign: "left",
            width: "100%",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          Targets
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom: Sync + controls */}
      <div style={{ padding: "12px 12px 16px", borderTop: `1px solid ${isLight ? "#e2e8f0" : "rgba(255,255,255,0.06)"}` }}>
        {/* Controls row: sync + theme + logout */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          {connectionId && <SyncButton connectionId={connectionId} autoSync={autoSync} />}
          <div style={{ flex: 1 }} />
          <ThemeToggle />
          <LogoutButton />
        </div>
        {lastSyncPretty && (
          <div className="text-muted" style={{ fontSize: 9, marginTop: 4, paddingLeft: 2 }}>{lastSyncPretty}</div>
        )}

        {/* Subscription status below */}
        {billingStatus && trialEndsAt !== undefined && subscriptionActive !== undefined && (
          <div style={{ marginTop: 10 }}>
            <SubscriptionStatus billingStatus={billingStatus} trialEndsAt={trialEndsAt} subscriptionActive={subscriptionActive} />
          </div>
        )}

        {/* Footer */}
        <div className="text-muted" style={{ marginTop: 12, paddingTop: 8, borderTop: `1px solid ${isLight ? "#e2e8f0" : "rgba(255,255,255,0.06)"}`, fontSize: 9, lineHeight: 1.5, textAlign: "center" }}>
          <div>&copy; {new Date().getFullYear()} OwnerView</div>
          <div style={{ marginTop: 2 }}>
            <a href="/terms" className="text-muted" style={{ textDecoration: "none" }}>Terms</a>
            {" · "}
            <a href="/privacy" className="text-muted" style={{ textDecoration: "none" }}>Privacy</a>
            {" · "}
            <a href="https://ownerview.io/accuinsight-faq" target="_blank" rel="noreferrer" className="text-muted" style={{ textDecoration: "none" }}>FAQ</a>
          </div>
        </div>
      </div>
    </nav>
  );
}
