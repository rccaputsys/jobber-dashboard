"use client";

import { useState, useEffect } from "react";

// Playful loading messages — themed for home service / trade businesses.
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

/**
 * Loading skeleton — content-only, NO sidebar. The real sidebar lives in
 * DashboardLayout which each page renders. Showing a duplicate sidebar in
 * the skeleton causes visual "jumping" because the two don't match pixel-
 * perfectly. Instead we show a clean full-width content skeleton that
 * transitions smoothly to the real page.
 */
function TabLoadingScreen({ tab }: { tab: string }) {
  const isLight = useTheme();
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
  const accentColor = "#5aa6ff";

  const shimmerGradient = `linear-gradient(90deg, ${shimmerFrom} 25%, ${shimmerTo} 50%, ${shimmerFrom} 75%)`;

  // Reusable AttentionList skeleton
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

  // Toggle button skeleton (reused on Sell/Book/Collect)
  const toggleSkeleton = (
    <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="loading-shimmer" style={{ width: 160, height: 40, borderRadius: 12 }} />
      ))}
    </div>
  );

  // Per-tab skeleton shapes
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
      {/* Three overview cards — responsive */}
      <div className="loading-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ padding: "12px 14px 8px", borderRadius: 14, background: panelBg, border: `1px solid ${panelBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div className="loading-shimmer" style={{ width: 120, height: 16, borderRadius: 4 }} />
              <div className="loading-shimmer" style={{ width: 80, height: 22, borderRadius: 6 }} />
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              <div className="loading-shimmer" style={{ width: 80, height: 18, borderRadius: 4 }} />
              <div className="loading-shimmer" style={{ width: 60, height: 18, borderRadius: 4 }} />
            </div>
            <div className="loading-shimmer" style={{ width: "100%", height: 160, borderRadius: 8 }} />
          </div>
        ))}
      </div>
    </>
  ) : tab === "Sales" ? (
    <>
      {attentionListSkeleton}
      <div style={{ padding: 20, borderRadius: 14, background: panelBg, border: `1px solid ${panelBorder}` }}>
        <div className="loading-shimmer" style={{ width: 140, height: 16, borderRadius: 4, marginBottom: 14 }} />
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="loading-shimmer" style={{ flex: 1, height: 76, borderRadius: 8 }} />
          ))}
        </div>
        {toggleSkeleton}
        <div className="loading-shimmer" style={{ height: 22, borderRadius: 6, marginBottom: 12 }} />
        {[1, 2, 3].map(i => (
          <div key={i} className="loading-shimmer" style={{ height: 44, borderRadius: 6, marginBottom: 4 }} />
        ))}
      </div>
    </>
  ) : tab === "Capacity" ? (
    <>
      {attentionListSkeleton}
      <div style={{ padding: 20, borderRadius: 14, background: panelBg, border: `1px solid ${panelBorder}` }}>
        {toggleSkeleton}
        <div className="loading-shimmer" style={{ height: 22, borderRadius: 6, marginBottom: 12 }} />
        {[1, 2, 3].map(i => (
          <div key={i} className="loading-shimmer" style={{ height: 44, borderRadius: 6, marginBottom: 8 }} />
        ))}
      </div>
    </>
  ) : (
    <>
      {attentionListSkeleton}
      <div style={{ padding: 20, borderRadius: 14, background: panelBg, border: `1px solid ${panelBorder}` }}>
        {toggleSkeleton}
        <div className="loading-shimmer" style={{ height: 22, borderRadius: 6, marginBottom: 12 }} />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="loading-shimmer" style={{ height: 44, borderRadius: 6, marginBottom: 4 }} />
        ))}
      </div>
    </>
  );

  return (
    <div style={{
      minHeight: "100vh",
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
        @media (max-width: 768px) {
          .loading-card-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export { TabLoadingScreen };
