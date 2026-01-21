// src/app/jobber/dashboard/loading.tsx
export default function Loading() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(180deg, #060811 0%, #0A1222 100%)",
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: "3px solid rgba(90,166,255,0.2)",
          borderTopColor: "#5aa6ff",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }} />
        <div style={{
          color: "rgba(234,241,255,0.7)",
          fontSize: 14,
          fontWeight: 600,
        }}>
          Loading dashboard...
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}