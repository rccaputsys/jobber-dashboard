"use client";

import { useState, useEffect } from "react";

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

  const shimmerGradient = `linear-gradient(90deg, ${shimmerFrom} 25%, ${shimmerTo} 50%, ${shimmerFrom} 75%)`;

  // Per-tab skeleton shapes
  const skeletonContent = tab === "Overview" ? (
    <>
      {/* Revenue goal bar */}
      <div className="loading-shimmer" style={{ height: 32, borderRadius: 8, marginBottom: 16 }} />
      {/* Three cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ padding: 20, borderRadius: 14, background: panelBg, border: `1px solid ${panelBorder}` }}>
            <div className="loading-shimmer" style={{ width: "40%", height: 12, borderRadius: 4, marginBottom: 12 }} />
            <div className="loading-shimmer" style={{ width: "70%", height: 24, borderRadius: 6, marginBottom: 10 }} />
            <div className="loading-shimmer" style={{ width: "100%", height: 80, borderRadius: 8, marginBottom: 10 }} />
            <div className="loading-shimmer" style={{ width: "55%", height: 10, borderRadius: 4 }} />
          </div>
        ))}
      </div>
    </>
  ) : tab === "Sales" ? (
    <>
      {/* Trends chart */}
      <div style={{ padding: 20, borderRadius: 14, background: panelBg, border: `1px solid ${panelBorder}`, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div className="loading-shimmer" style={{ width: 120, height: 14, borderRadius: 4 }} />
          <div style={{ display: "flex", gap: 6 }}>
            <div className="loading-shimmer" style={{ width: 60, height: 24, borderRadius: 6 }} />
            <div className="loading-shimmer" style={{ width: 60, height: 24, borderRadius: 6 }} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
          {[40, 65, 50, 80, 70, 55, 90, 60].map((h, i) => (
            <div key={i} className="loading-shimmer" style={{ flex: 1, height: `${h}%`, borderRadius: "4px 4px 0 0" }} />
          ))}
        </div>
      </div>
      {/* Pipeline cards */}
      <div style={{ padding: 20, borderRadius: 14, background: panelBg, border: `1px solid ${panelBorder}` }}>
        <div className="loading-shimmer" style={{ width: 140, height: 14, borderRadius: 4, marginBottom: 14 }} />
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ flex: 1, padding: 12, borderRadius: 8, background: panelBg, border: `1px solid ${panelBorder}` }}>
              <div className="loading-shimmer" style={{ width: "60%", height: 10, borderRadius: 3, marginBottom: 8 }} />
              <div className="loading-shimmer" style={{ width: "80%", height: 18, borderRadius: 4, marginBottom: 6 }} />
              <div className="loading-shimmer" style={{ width: "50%", height: 10, borderRadius: 3 }} />
            </div>
          ))}
        </div>
        {/* Toggle buttons + distribution bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="loading-shimmer" style={{ width: 110, height: 30, borderRadius: 10 }} />
          ))}
        </div>
        <div className="loading-shimmer" style={{ height: 22, borderRadius: 6, marginBottom: 12 }} />
        {[1, 2, 3].map(i => (
          <div key={i} className="loading-shimmer" style={{ height: 42, borderRadius: 6, marginBottom: 4 }} />
        ))}
      </div>
    </>
  ) : tab === "Capacity" ? (
    <>
      {/* Heatmap */}
      <div style={{ padding: 20, borderRadius: 14, background: panelBg, border: `1px solid ${panelBorder}`, marginBottom: 16 }}>
        <div className="loading-shimmer" style={{ width: 140, height: 14, borderRadius: 4, marginBottom: 14 }} />
        {/* Header row */}
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          <div style={{ width: 76 }} />
          <div style={{ width: 76 }} />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="loading-shimmer" style={{ flex: 1, height: 14, borderRadius: 3 }} />
          ))}
        </div>
        {/* Rows */}
        {[1, 2, 3, 4, 5, 6].map(r => (
          <div key={r} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            <div className="loading-shimmer" style={{ width: 76, height: 44, borderRadius: 4 }} />
            <div className="loading-shimmer" style={{ width: 76, height: 44, borderRadius: 4 }} />
            {[1, 2, 3, 4, 5].map(c => (
              <div key={c} className="loading-shimmer" style={{ flex: 1, height: 44, borderRadius: 4 }} />
            ))}
          </div>
        ))}
      </div>
      {/* Action list */}
      <div style={{ padding: 20, borderRadius: 14, background: panelBg, border: `1px solid ${panelBorder}` }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div className="loading-shimmer" style={{ width: 100, height: 16, borderRadius: 4 }} />
          {[1, 2, 3].map(i => (
            <div key={i} className="loading-shimmer" style={{ width: 110, height: 30, borderRadius: 10 }} />
          ))}
        </div>
        <div className="loading-shimmer" style={{ height: 22, borderRadius: 6 }} />
      </div>
    </>
  ) : (
    <>
      {/* Invoices: trends + action list */}
      <div style={{ padding: 20, borderRadius: 14, background: panelBg, border: `1px solid ${panelBorder}`, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div className="loading-shimmer" style={{ width: 120, height: 14, borderRadius: 4 }} />
          <div style={{ display: "flex", gap: 6 }}>
            <div className="loading-shimmer" style={{ width: 60, height: 24, borderRadius: 6 }} />
            <div className="loading-shimmer" style={{ width: 60, height: 24, borderRadius: 6 }} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
          {[50, 70, 45, 85, 60, 75, 55, 90, 65, 80, 50, 70].map((h, i) => (
            <div key={i} className="loading-shimmer" style={{ flex: 1, height: `${h}%`, borderRadius: "4px 4px 0 0" }} />
          ))}
        </div>
      </div>
      <div style={{ padding: 20, borderRadius: 14, background: panelBg, border: `1px solid ${panelBorder}` }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div className="loading-shimmer" style={{ width: 140, height: 16, borderRadius: 4 }} />
          {[1, 2, 3].map(i => (
            <div key={i} className="loading-shimmer" style={{ width: 110, height: 30, borderRadius: 10 }} />
          ))}
        </div>
        <div className="loading-shimmer" style={{ height: 22, borderRadius: 6, marginBottom: 12 }} />
        {[1, 2, 3].map(i => (
          <div key={i} className="loading-shimmer" style={{ height: 42, borderRadius: 6, marginBottom: 4 }} />
        ))}
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar skeleton */}
      <div style={{
        width: 220, flexShrink: 0,
        background: sidebarBg,
        borderRight: `1px solid ${sidebarBorder}`,
        padding: "20px 12px",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px 16px" }}>
          <svg width="26" height="26" viewBox="0 0 50 50">
            <defs>
              <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c5cff" />
                <stop offset="100%" stopColor="#5aa6ff" />
              </linearGradient>
            </defs>
            <circle cx="25" cy="25" r="22" fill="none" stroke="url(#lg)" strokeWidth="3" opacity="0.4" />
            <polyline points="8,25 16,25 21,12 29,38 34,20 42,25" fill="none" stroke="url(#lg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
          </svg>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", background: "linear-gradient(135deg, #7c5cff, #5aa6ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", opacity: 0.5 }}>
              AccuInsight
            </div>
            <div className="loading-shimmer" style={{ width: 90, height: 10, marginTop: 3, borderRadius: 3 }} />
          </div>
        </div>
        {/* Nav items */}
        {[{ label: "Overview", tab: "Overview" }, { label: "Sell", tab: "Sales" }, { label: "Book", tab: "Capacity" }, { label: "Collect", tab: "Invoices" }].map(t => (
          <div key={t.tab} style={{
            padding: "10px 12px", borderRadius: 8,
            background: t.tab === tab
              ? (isLight ? "rgba(124,92,255,0.08)" : "rgba(124,92,255,0.15)")
              : "transparent",
            color: t.tab === tab
              ? (isLight ? "#5b21b6" : "#a78bfa")
              : (isLight ? "#64748b" : "rgba(255,255,255,0.4)"),
            fontSize: 13, fontWeight: t.tab === tab ? 700 : 500,
          }}>
            {t.label}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        {/* Bottom sidebar items */}
        <div className="loading-shimmer" style={{ width: "80%", height: 28, borderRadius: 6 }} />
        <div className="loading-shimmer" style={{ width: "60%", height: 10, borderRadius: 3, marginTop: 4 }} />
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
            <div style={{
              position: "absolute", inset: 0,
              border: `2.5px solid ${isLight ? "rgba(124,92,255,0.12)" : "rgba(124,92,255,0.15)"}`,
              borderTopColor: "#7c5cff",
              borderRadius: "50%",
              animation: "loading-spin 1s linear infinite",
            }} />
            <div style={{
              position: "absolute", inset: 5,
              border: `2.5px solid ${isLight ? "rgba(90,166,255,0.12)" : "rgba(90,166,255,0.15)"}`,
              borderBottomColor: "#5aa6ff",
              borderRadius: "50%",
              animation: "loading-spin 1.5s linear infinite reverse",
            }} />
          </div>
          <div>
            <div style={{ color: textPrimary, fontSize: 14, fontWeight: 700 }}>
              Loading {tab}
            </div>
            <div style={{ color: textMuted, fontSize: 11, fontWeight: 500 }}>
              Crunching your numbers...
            </div>
          </div>
        </div>

        {/* Tab-specific skeleton */}
        <div style={{ maxWidth: 1600, margin: "0 auto" }}>
          {skeletonContent}
        </div>
      </div>

      <style>{`
        @keyframes loading-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes loading-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .loading-shimmer {
          background: ${shimmerGradient};
          background-size: 200% 100%;
          animation: loading-shimmer 1.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export { TabLoadingScreen };
