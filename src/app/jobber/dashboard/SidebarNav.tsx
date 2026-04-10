"use client";

import { useState, useEffect } from "react";
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

type Props = {
  adminConnectionId?: string;
  companyName?: string;
  connectionId?: string;
  lastSyncPretty?: string;
  billingStatus?: string;
  trialEndsAt?: number;
  subscriptionActive?: boolean;
  autoSync?: boolean;
};

export function SidebarNav({ adminConnectionId, companyName, connectionId, lastSyncPretty, billingStatus, trialEndsAt, subscriptionActive, autoSync }: Props) {
  const pathname = usePathname();
  const isLight = useIsLight();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mobileOpen]);

  const activeTab = tabs.find(t =>
    pathname === t.href || (t.href !== "/jobber/dashboard" && pathname.startsWith(t.href))
  );

  // ---- Shared content (rendered in both desktop sidebar + mobile overlay) ----
  const navLinks = (
    <div className="sidebar-nav-links" style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || (tab.href !== "/jobber/dashboard" && pathname.startsWith(tab.href));
        const href = adminConnectionId ? `${tab.href}?admin_connection_id=${adminConnectionId}` : tab.href;
        return (
          <Link
            key={tab.href}
            href={href}
            onClick={() => setMobileOpen(false)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 8,
              textDecoration: "none",
              background: isActive ? (isLight ? "rgba(90,166,255,0.1)" : "rgba(90,166,255,0.12)") : "transparent",
              color: isActive ? "#5aa6ff" : (isLight ? "#64748b" : "rgba(255,255,255,0.65)"),
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
    </div>
  );

  const btnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    flex: 1, gap: 6, padding: "8px 0", borderRadius: 6,
    background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
    border: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
    color: isLight ? "#64748b" : "rgba(255,255,255,0.65)",
    fontSize: 10, fontWeight: 600, cursor: "pointer",
    transition: "all 0.15s ease",
  };

  const bottomSection = (
    <div style={{ padding: "12px 12px 14px", borderTop: `1px solid ${isLight ? "#e2e8f0" : "rgba(255,255,255,0.06)"}` }}>
      {/* Sync row */}
      {connectionId && (
        <div style={{ marginBottom: 8 }}>
          <SyncButton connectionId={connectionId} autoSync={autoSync} />
          {lastSyncPretty && (
            <div className="text-muted" style={{ fontSize: 9, marginTop: 3, paddingLeft: 2 }}>{lastSyncPretty}</div>
          )}
        </div>
      )}

      {/* Action buttons — 3 across: Dark/Light | Restart Tour | Logout */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <div style={btnStyle}>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={() => {
            try {
              Object.keys(localStorage)
                .filter(k => k.startsWith("tour_") || k.startsWith("welcome_") || k.startsWith("aha_") || k.startsWith("checklist_"))
                .forEach(k => localStorage.removeItem(k));
            } catch {}
            window.location.reload();
          }}
          style={btnStyle}
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <polygon points="6.5,5 11,8 6.5,11" fill="currentColor" />
          </svg>
          Tour
        </button>
        <div style={btnStyle}>
          <LogoutButton />
        </div>
      </div>

      {/* Subscription */}
      {billingStatus && trialEndsAt !== undefined && subscriptionActive !== undefined && (
        <div style={{ marginBottom: 10 }}>
          <SubscriptionStatus billingStatus={billingStatus} trialEndsAt={trialEndsAt} subscriptionActive={subscriptionActive} />
        </div>
      )}

      {/* Footer */}
      <div className="text-muted" style={{ fontSize: 9, lineHeight: 1.5, textAlign: "center" }}>
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
  );

  const logoBlock = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
  );

  return (
    <>
      {/* ---- Desktop sidebar (hidden on mobile via CSS) ---- */}
      <nav className="sidebar-nav sidebar-desktop">
        <div style={{ padding: "16px 14px 12px" }}>
          {logoBlock}
          {companyName && (
            <div className="text-primary" style={{ fontSize: 13, fontWeight: 700, paddingLeft: 32, marginTop: 6, lineHeight: 1.3, wordBreak: "break-word" }}>
              {companyName}
            </div>
          )}
        </div>

        {adminConnectionId && (
          <div style={{
            margin: "0 8px 8px", padding: "6px 10px", borderRadius: 6,
            background: "rgba(90,166,255,0.1)", fontSize: 10, fontWeight: 600, color: "#5aa6ff",
          }}>
            Admin view
            <a href="/admin" style={{ color: "#5aa6ff", marginLeft: 6, textDecoration: "underline", opacity: 0.8 }}>Back</a>
          </div>
        )}

        {navLinks}
        <div style={{ flex: 1 }} />
        {bottomSection}
      </nav>

      {/* ---- Mobile header bar + hamburger (visible on mobile via CSS) ---- */}
      <div className="sidebar-mobile-bar">
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px",
          background: isLight ? "#ffffff" : "rgba(255,255,255,0.02)",
          borderBottom: `1px solid ${isLight ? "#e2e8f0" : "rgba(255,255,255,0.06)"}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {logoBlock}
            {activeTab && (
              <span className="text-muted" style={{ fontSize: 11, fontWeight: 600, marginLeft: 4 }}>
                / {activeTab.label}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, padding: 0, borderRadius: 8,
              background: mobileOpen
                ? (isLight ? "rgba(90,166,255,0.1)" : "rgba(90,166,255,0.15)")
                : "transparent",
              border: `1px solid ${isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)"}`,
              color: isLight ? "#334155" : "rgba(255,255,255,0.8)",
              cursor: "pointer",
            }}
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>

        {/* Slide-down overlay */}
        {mobileOpen && (
          <>
            <div
              onClick={() => setMobileOpen(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 998,
                background: "rgba(0,0,0,0.4)",
              }}
            />
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
              maxHeight: "90vh", overflowY: "auto",
              background: isLight ? "#ffffff" : "#0a0e18",
              borderBottom: `1px solid ${isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)"}`,
              boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
              display: "flex", flexDirection: "column",
            }}>
              {/* Header inside overlay */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px",
                borderBottom: `1px solid ${isLight ? "#e2e8f0" : "rgba(255,255,255,0.06)"}`,
              }}>
                {logoBlock}
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 36, height: 36, padding: 0, borderRadius: 8,
                    background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)",
                    border: "none", color: isLight ? "#334155" : "rgba(255,255,255,0.8)",
                    cursor: "pointer",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {companyName && (
                <div className="text-primary" style={{ fontSize: 14, fontWeight: 700, padding: "8px 14px 4px" }}>
                  {companyName}
                </div>
              )}

              <div style={{ padding: "8px 0" }}>
                {navLinks}
              </div>

              {bottomSection}
            </div>
          </>
        )}
      </div>
    </>
  );
}
