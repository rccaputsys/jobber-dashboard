"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsLight } from "@/lib/hooks";

const tabs = [
  { label: "Overview", href: "/jobber/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { label: "Sales", href: "/jobber/sales", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { label: "Capacity", href: "/jobber/capacity", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { label: "Invoices", href: "/jobber/invoices", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
];

export function SidebarNav({ adminConnectionId }: { adminConnectionId?: string }) {
  const pathname = usePathname();
  const isLight = useIsLight();

  return (
    <nav className="sidebar-nav">
      {/* Logo */}
      <div style={{ padding: "20px 16px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="28" height="28" viewBox="0 0 50 50" style={{ flexShrink: 0 }}>
          <defs>
            <linearGradient id="sidebarLogo" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5aa6ff" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          <circle cx="25" cy="25" r="22" fill="none" stroke="url(#sidebarLogo)" strokeWidth="3" />
          <polyline points="8,25 16,25 21,12 29,38 34,20 42,25" fill="none" stroke="url(#sidebarLogo)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ fontSize: 13, fontWeight: 800, background: "linear-gradient(135deg, #5aa6ff, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          AccuInsight
        </div>
      </div>

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
                padding: "10px 12px", borderRadius: 10,
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
      </div>
    </nav>
  );
}
