export default function Loading() {
  return <TabLoadingScreen tab="Overview" />;
}

function TabLoadingScreen({ tab }: { tab: string }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #060811 0%, #0A1222 100%)",
      padding: "0 20px",
    }}>
      {/* Topbar skeleton */}
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        paddingTop: 20,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderRadius: 16,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Logo */}
            <svg width="30" height="30" viewBox="0 0 50 50">
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
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", background: "linear-gradient(135deg, #7c5cff, #5aa6ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", opacity: 0.5 }}>
                AccuInsight
              </div>
              <div className="shimmer-bar" style={{ width: 120, height: 14, marginTop: 4, borderRadius: 4 }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="shimmer-bar" style={{ width: 60, height: 28, borderRadius: 6 }} />
            <div className="shimmer-bar" style={{ width: 28, height: 28, borderRadius: 6 }} />
          </div>
        </div>

        {/* Nav tabs skeleton */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, padding: "0 4px" }}>
          {["Overview", "Sales", "Capacity", "Invoices"].map((t) => (
            <div key={t} style={{
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: t === tab ? "#fff" : "rgba(255,255,255,0.3)",
              background: t === tab ? "linear-gradient(135deg, #7c5cff, #5aa6ff)" : "transparent",
              boxShadow: t === tab ? "0 2px 8px rgba(124,92,255,0.3)" : "none",
            }}>
              {t}
            </div>
          ))}
        </div>

        {/* Center loading indicator */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 80,
          gap: 20,
        }}>
          {/* Animated rings */}
          <div style={{ position: "relative", width: 64, height: 64 }}>
            <div style={{
              position: "absolute", inset: 0,
              border: "3px solid rgba(124,92,255,0.15)",
              borderTopColor: "#7c5cff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
            <div style={{
              position: "absolute", inset: 8,
              border: "3px solid rgba(90,166,255,0.15)",
              borderBottomColor: "#5aa6ff",
              borderRadius: "50%",
              animation: "spin 1.5s linear infinite reverse",
            }} />
          </div>
          <div style={{
            color: "rgba(234,241,255,0.8)",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: -0.2,
          }}>
            Loading {tab}
          </div>
          <div style={{
            color: "rgba(234,241,255,0.35)",
            fontSize: 12,
            fontWeight: 500,
          }}>
            Crunching your numbers...
          </div>
        </div>

        {/* Skeleton cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginTop: 48,
          opacity: 0.4,
        }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              padding: 16,
              borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderLeft: "3px solid rgba(255,255,255,0.08)",
            }}>
              <div className="shimmer-bar" style={{ width: "60%", height: 10, borderRadius: 4, marginBottom: 12 }} />
              <div className="shimmer-bar" style={{ width: "80%", height: 28, borderRadius: 6, marginBottom: 8 }} />
              <div className="shimmer-bar" style={{ width: "90%", height: 10, borderRadius: 4 }} />
            </div>
          ))}
        </div>

        {/* Skeleton chart area */}
        <div style={{
          marginTop: 24,
          padding: 24,
          borderRadius: 16,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          opacity: 0.3,
        }}>
          <div className="shimmer-bar" style={{ width: 140, height: 12, borderRadius: 4, marginBottom: 20 }} />
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
            {[40, 65, 50, 80, 70, 55, 90, 60, 75, 45, 85, 70].map((h, i) => (
              <div key={i} className="shimmer-bar" style={{ flex: 1, height: `${h}%`, borderRadius: "4px 4px 0 0" }} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-bar {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export { TabLoadingScreen };
