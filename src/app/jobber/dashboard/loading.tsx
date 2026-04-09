"use client";

import { useState, useEffect } from "react";

// Playful loading messages — themed for home service / trade businesses.
// One picked at random per load so it doesn't feel canned.
const LOADING_MESSAGES = [
  "Loading the spreader...",
  "Topping off the tank...",
  "Sharpening the blades...",
  "Coiling the hoses...",
  "Stocking the van...",
  "Greasing the wheels...",
  "Tightening the bolts...",
  "Calibrating the GPS...",
  "Calling dispatch...",
  "Warming up the truck...",
];

function pickLoadingMessage(): string {
  return LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
}

function useTheme() {
  const [isLight, setIsLight] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem("dashboard-theme");
    setIsLight(saved !== "dark");
  }, []);
  return isLight;
}

export default function Loading() {
  return <TabLoadingScreen tab="Overview" />;
}

function TabLoadingScreen({ tab }: { tab: string }) {
  const isLight = useTheme();
  // Pick a random message once on mount (memoized via useState)
  const [loadingMessage] = useState(pickLoadingMessage);

  const bg = isLight
    ? "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)"
    : "linear-gradient(180deg, #060811 0%, #0A1222 100%)";
  const panelBg = isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)";
  const panelBorder = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  const shimmerFrom = isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)";
  const shimmerTo = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";
  const textPrimary = isLight ? "rgba(0,0,0,0.7)" : "rgba(234,241,255,0.8)";
  const textMuted = isLight ? "rgba(0,0,0,0.35)" : "rgba(234,241,255,0.35)";
  const sidebarBg = isLight ? "#ffffff" : "rgba(255,255,255,0.02)";
  const sidebarBorder = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)";

  // App accent color — must match SidebarNav active state
  const accentColor = "#5aa6ff";
  const accentBgActive = isLight ? "rgba(90,166,255,0.1)" : "rgba(90,166,255,0.12)";

  const shimmerGradient = `linear-gradient(90deg, ${shimmerFrom} 25%, ${shimmerTo} 50%, ${shimmerFrom} 75%)`;

  // Reusable AttentionList skeleton (top of every action tab)
  const attentionListSkeleton = (
    <div style={{ padding: "14px 18px", borderRadius: 14, background: panelBg, border: `1px solid ${panelBorder}`, marginBottom: 12 }}>
      <div className="loading-shimmer" style={{ width: 200, height: 16, borderRadius: 4, marginBottom: 12 }} />
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          display: "flex", gap: 10, padding: "10px 12px", borderRadius: 8,
          marginBottom: 6,
          borderLeft: `3px solid ${accentColor}30`,
          background: `${accentColor}08`,
        }}>
          <div className="loading-shimmer" style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 6 }} />
          <div style={{ flex: 1 }}>
            <div className="loading-shimmer" style={{ width: "60%", height: 14, borderRadius: 4, marginBottom: 4 }} />
            <div className="loading-shimmer" style={{ width: "85%", height: 11, borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );

  // Per-tab skeleton shapes — match the current UI
  const skeletonContent = tab === "Overview" ? (
    <>
      {/* "What to Do Today" panel */}
      <div style={{ padding: "14px 18px", borderRadius: 14, background: panelBg, border: `1px solid ${panelBorder}`, marginBottom: 12 }}>
        <div className="loading-shimmer" style={{ width: 140, height: 14, borderRadius: 4, marginBottom: 10 }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: "flex", gap: 8, padding: "8px 10px", borderRadius: 6, marginBottom: 4, borderLeft: `3px solid ${accentColor}30`, background: `${accentColor}08` }}>
            <div className="loading-shimmer" style={{ width: "70%", height: 14, borderRadius: 3 }} />
          </div>
        ))}
      </div>
      {/* Three overview cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ padding: "12px 14px 8px", borderRadius: 14, background: panelBg, border: `1px solid ${panelBorder}` }}>
            {/* Title row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div className="loading-shimmer" style={{ width: 120, height: 16, borderRadius: 4 }} />
              <div className="loading-shimmer" style={{ width: 90, height: 22, borderRadius: 6 }} />
            </div>
            {/* Stat strip */}
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              <div className="loading-shimmer" style={{ width: 80, height: 18, borderRadius: 4 }} />
              <div className="loading-shimmer" style={{ width: 80, height: 18, borderRadius: 4 }} />
            </div>
            {/* Chart area */}
            <div className="loading-shimmer" style={{ width: "100%", height: 180, borderRadius: 8 }} />
            {/* Bottom toggle row */}
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 8 }}>
              <div className="loading-shimmer" style={{ width: 60, height: 14, borderRadius: 3 }} />
              <div className="loading-shimmer" style={{ width: 60, height: 14, borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
    </>
  ) : tab === "Sales" ? (
    <>
      {attentionListSkeleton}
      {/* Pipeline + tabs panel */}
      <div style={{ padding: 20, borderRadius: 14, background: panelBg, border: `1px solid ${panelBorder}` }}>
        {/* Pipeline header */}
        <div className="loading-shimmer" style={{ width: 140, height: 16, borderRadius: 4, marginBottom: 14 }} />
        {/* Pipeline stages */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="loading-shimmer" style={{ flex: 1, height: 76, borderRadius: 8 }} />
          ))}
        </div>
        {/* Distribution bar */}
        <div className="loading-shimmer" style={{ height: 22, borderRadius: 6, marginBottom: 12 }} />
        {/* Action rows */}
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="loading-shimmer" style={{ height: 44, borderRadius: 6, marginBottom: 4 }} />
        ))}
      </div>
    </>
  ) : tab === "Capacity" ? (
    <>
      {attentionListSkeleton}
      {/* Action list panel */}
      <div style={{ padding: 20, borderRadius: 14, background: panelBg, border: `1px solid ${panelBorder}` }}>
        {/* Toggle buttons (no header) */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="loading-shimmer" style={{ width: 180, height: 40, borderRadius: 12 }} />
          ))}
        </div>
        {/* Distribution bar */}
        <div className="loading-shimmer" style={{ height: 22, borderRadius: 6, marginBottom: 12 }} />
        {/* Bucket rows */}
        {[1, 2, 3].map(i => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div className="loading-shimmer" style={{ height: 44, borderRadius: 6, marginBottom: 4 }} />
          </div>
        ))}
      </div>
    </>
  ) : (
    <>
      {/* Invoices: attention list + outstanding action list */}
      {attentionListSkeleton}
      <div style={{ padding: 20, borderRadius: 14, background: panelBg, border: `1px solid ${panelBorder}` }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="loading-shimmer" style={{ width: 180, height: 40, borderRadius: 12 }} />
          ))}
        </div>
        <div className="loading-shimmer" style={{ height: 22, borderRadius: 6, marginBottom: 12 }} />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="loading-shimmer" style={{ height: 44, borderRadius: 6, marginBottom: 4 }} />
        ))}
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar skeleton — must match SidebarNav.tsx layout exactly to
          prevent the nav from "snapping" when the real component mounts. */}
      <div style={{
        width: 200, flexShrink: 0,
        background: sidebarBg,
        borderRight: `1px solid ${sidebarBorder}`,
        height: "100%",
        display: "flex", flexDirection: "column",
      }}>
        {/* Logo + company — matches SidebarNav padding "16px 14px 12px" */}
        <div style={{ padding: "16px 14px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <svg width="24" height="24" viewBox="0 0 50 50" style={{ flexShrink: 0 }}>
              <defs>
                <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5aa6ff" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              <circle cx="25" cy="25" r="22" fill="none" stroke="url(#lg)" strokeWidth="3" opacity="0.4" />
              <polyline points="8,25 16,25 21,12 29,38 34,20 42,25" fill="none" stroke="url(#lg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
            </svg>
            <div style={{ fontSize: 12, fontWeight: 800, background: "linear-gradient(135deg, #5aa6ff, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", opacity: 0.5 }}>
              AccuInsight
            </div>
          </div>
          {/* Company name placeholder (matches paddingLeft: 32 from real nav) */}
          <div className="loading-shimmer" style={{ height: 13, width: "70%", marginLeft: 32, borderRadius: 3 }} />
        </div>
        {/* Nav items — matches SidebarNav padding "0 8px", gap 2 */}
        <div style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {[{ label: "Overview", tab: "Overview" }, { label: "Sell", tab: "Sales" }, { label: "Book", tab: "Capacity" }, { label: "Collect", tab: "Invoices" }].map(t => {
            const isActive = t.tab === tab;
            return (
              <div key={t.tab} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8,
                background: isActive ? accentBgActive : "transparent",
                color: isActive ? accentColor : (isLight ? "#64748b" : "rgba(255,255,255,0.5)"),
                fontSize: 13, fontWeight: isActive ? 700 : 600,
                borderLeft: isActive ? `3px solid ${accentColor}` : "3px solid transparent",
              }}>
                <div style={{ width: 18, height: 18, opacity: 0.5 }} />
                {t.label}
              </div>
            );
          })}
        </div>
        {/* Spacer */}
        <div style={{ flex: 1 }} />
        {/* Bottom — matches SidebarNav padding "12px 12px 16px" with top border */}
        <div style={{ padding: "12px 12px 16px", borderTop: `1px solid ${sidebarBorder}` }}>
          <div className="loading-shimmer" style={{ width: "100%", height: 28, borderRadius: 6, marginBottom: 6 }} />
          <div className="loading-shimmer" style={{ width: "60%", height: 10, borderRadius: 3 }} />
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, overflow: "hidden",
        background: bg,
        padding: "24px 32px",
      }}>
        {/* Center loading indicator */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 16, marginBottom: 24,
        }}>
          <div style={{ position: "relative", width: 36, height: 36 }}>
            <div className="loading-spin-outer" style={{
              position: "absolute", inset: 0,
              border: `2.5px solid ${isLight ? "rgba(90,166,255,0.12)" : "rgba(90,166,255,0.15)"}`,
              borderTopColor: accentColor,
              borderRadius: "50%",
            }} />
            <div className="loading-spin-inner" style={{
              position: "absolute", inset: 5,
              border: `2.5px solid ${isLight ? "rgba(56,189,248,0.12)" : "rgba(56,189,248,0.15)"}`,
              borderBottomColor: "#38bdf8",
              borderRadius: "50%",
            }} />
          </div>
          <div>
            <div style={{ color: textPrimary, fontSize: 14, fontWeight: 700 }}>
              Loading {tab}
            </div>
            <div style={{ color: textMuted, fontSize: 11, fontWeight: 500 }}>
              {loadingMessage}
            </div>
          </div>
        </div>

        {/* Tab-specific skeleton */}
        <div style={{ maxWidth: 1600, margin: "0 auto" }}>
          {skeletonContent}
        </div>
      </div>

      <style>{`
        @keyframes accuLoadingSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes accuLoadingShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .loading-spin-outer {
          animation: accuLoadingSpin 1s linear infinite;
        }
        .loading-spin-inner {
          animation: accuLoadingSpin 1.5s linear infinite reverse;
        }
        .loading-shimmer {
          background: ${shimmerGradient};
          background-size: 200% 100%;
          animation: accuLoadingShimmer 1.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export { TabLoadingScreen };
