"use client";

// Skeleton loading components for dashboard
export function SkeletonPulse({ width, height, borderRadius = 8 }: { 
  width?: string | number; 
  height?: string | number;
  borderRadius?: number;
}) {
  return (
    <div 
      className="skeleton-pulse"
      style={{ 
        width: width ?? "100%", 
        height: height ?? 20,
        borderRadius,
        background: "linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.06) 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.5s infinite",
      }} 
    />
  );
}

export function SkeletonKPICard({ isPrimary = false }: { isPrimary?: boolean }) {
  return (
    <div 
      className={isPrimary ? "kpi-primary" : "kpi-secondary"}
      style={{ padding: isPrimary ? 24 : 20 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <SkeletonPulse width={24} height={24} borderRadius={6} />
        <SkeletonPulse width={100} height={14} />
      </div>
      <SkeletonPulse width={isPrimary ? 140 : 80} height={isPrimary ? 48 : 36} borderRadius={8} />
      <div style={{ marginTop: 12 }}>
        <SkeletonPulse width={isPrimary ? 160 : 100} height={12} />
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="panel" style={{ padding: 16, height: 220 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <SkeletonPulse width={100} height={16} />
          <div style={{ marginTop: 6 }}>
            <SkeletonPulse width={140} height={12} />
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <SkeletonPulse width={70} height={24} />
          <div style={{ marginTop: 4 }}>
            <SkeletonPulse width={50} height={10} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120, paddingTop: 20 }}>
        {[40, 65, 45, 80, 55, 70, 60, 75, 50, 85, 65, 70].map((h, i) => (
          <div key={i} style={{ flex: 1 }}>
            <SkeletonPulse height={h} borderRadius={4} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <SkeletonPulse width={60} height={14} />
        <SkeletonPulse width={120} height={14} />
        <SkeletonPulse width={80} height={14} />
        <SkeletonPulse width={80} height={14} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 16, alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <SkeletonPulse width={40} height={24} borderRadius={12} />
          <div style={{ flex: 1 }}>
            <SkeletonPulse width={100} height={14} />
            <div style={{ marginTop: 4 }}>
              <SkeletonPulse width={140} height={12} />
            </div>
          </div>
          <SkeletonPulse width={70} height={14} />
          <SkeletonPulse width={60} height={14} />
          <SkeletonPulse width={60} height={32} borderRadius={8} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div>
      {/* Primary KPIs */}
      <div className="kpi-grid-primary" style={{ marginTop: 20 }}>
        <SkeletonKPICard isPrimary />
        <SkeletonKPICard isPrimary />
        <SkeletonKPICard isPrimary />
      </div>
      
      {/* Secondary KPIs */}
      <div className="kpi-grid-secondary" style={{ marginTop: 16 }}>
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
      </div>
      
      {/* Charts */}
      <div className="panel" style={{ marginTop: 20, padding: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <SkeletonPulse width={200} height={16} />
        </div>
        <div className="chart-grid">
          <SkeletonChart />
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
      
      {/* Action Lists */}
      <div className="panel" style={{ marginTop: 20 }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <SkeletonPulse width={120} height={18} />
        </div>
        <SkeletonTable />
      </div>
      
      {/* CSS for skeleton animation */}
      <style jsx global>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        html[data-theme="light"] .skeleton-pulse {
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%) !important;
          background-size: 200% 100%;
        }
      `}</style>
    </div>
  );
}
