// src/lib/dashboardHelpers.ts
// Shared helpers extracted from dashboard page.tsx

export type Granularity = "day" | "week" | "month" | "quarter";
export type ChartType = "line" | "bar";

export function safeDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function pct(x: number) {
  return Math.round(x * 100) + "%";
}

export function parseISODateOnly(s: string): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  return isNaN(dt.getTime()) ? null : dt;
}

export function toISODateOnlyUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysUTC(d: Date, days: number) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

export function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export function formatSyncTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHr = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHr / 24);

  if (diffHr < 1) return "Less than 1 hour ago";
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function startOfWeekUTC(d: Date) {
  const x = startOfDayUTC(d);
  const day = x.getUTCDay();
  const delta = (day + 6) % 7;
  x.setUTCDate(x.getUTCDate() - delta);
  return x;
}

export function startOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function startOfQuarterUTC(d: Date) {
  const q = Math.floor(d.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(d.getUTCFullYear(), q, 1, 0, 0, 0, 0));
}

export function bucketStartUTC(d: Date, g: Granularity) {
  if (g === "day") return startOfDayUTC(d);
  if (g === "week") return startOfWeekUTC(d);
  if (g === "month") return startOfMonthUTC(d);
  return startOfQuarterUTC(d);
}

export function nextBucketUTC(d: Date, g: Granularity) {
  if (g === "day") return addDaysUTC(d, 1);
  if (g === "week") return addDaysUTC(d, 7);
  if (g === "month") return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, 1, 0, 0, 0, 0));
}

export function labelForBucket(d: Date, g: Granularity) {
  const y = d.getUTCFullYear();
  const m = d.toLocaleString(undefined, { month: "short", timeZone: "UTC" });
  const day = d.getUTCDate();
  if (g === "day") return `${m} ${day}`;
  if (g === "week") return `${m} ${day}`;
  if (g === "month") return `${m} ${y.toString().slice(2)}`;
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `Q${q} ${y.toString().slice(2)}`;
}

export function moneyFactory(currency: string, locale = "en-US") {
  const code = (currency || "USD").toUpperCase();
  const safeCode = code.length === 3 ? code : "USD";
  try {
    const fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: safeCode,
      currencyDisplay: "symbol",
      maximumFractionDigits: 0,
    });
    return (cents: number) => fmt.format((Number(cents || 0) as number) / 100);
  } catch {
    const fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      currencyDisplay: "symbol",
      maximumFractionDigits: 0,
    });
    return (cents: number) => fmt.format((Number(cents || 0) as number) / 100);
  }
}

export function moneyForChart(cents: number): string {
  const dollars = Math.round((Number(cents || 0) as number) / 100);
  if (dollars >= 1000000) {
    const rounded = Math.round(dollars / 10000) * 10000;
    return `$${(rounded / 1000000).toFixed(2)}M`;
  }
  if (dollars >= 1000) {
    const rounded = Math.round(dollars / 100) * 100;
    return `$${(rounded / 1000).toFixed(1)}k`;
  }
  if (dollars >= 100) {
    const rounded = Math.round(dollars / 100) * 100;
    return `$${rounded}`;
  }
  return `$${dollars}`;
}

export function severityFromScore(score: number): "critical" | "warning" | "good" {
  if (score >= 80) return "critical";
  if (score >= 50) return "warning";
  return "good";
}

export function statusLooksWon(status: string) {
  const s = status.toUpperCase();
  return s.includes("APPROV") || s.includes("ACCEPT") || s.includes("WON") || s.includes("CONVERT") || s.includes("BOOK");
}

export function statusLooksLost(status: string) {
  const s = status.toUpperCase();
  return s.includes("REJECTED") || s.includes("DECLINED") || s.includes("LOST") || s.includes("EXPIRED") || s.includes("ARCHIVED");
}

export const theme = {
  text: "#EAF1FF",
  sub: "rgba(234,241,255,0.7)",
  mut: "rgba(234,241,255,0.5)",
  faint: "rgba(234,241,255,0.3)",
};

export function sevColor(sev: "critical" | "warning" | "good") {
  if (sev === "critical") return "#ef4444";
  if (sev === "warning") return "#f59e0b";
  return "#10b981";
}

export function sevBg(sev: "critical" | "warning" | "good") {
  if (sev === "critical") return "rgba(239,68,68,0.15)";
  if (sev === "warning") return "rgba(245,158,11,0.15)";
  return "rgba(16,185,129,0.15)";
}

export const globalStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-in {
    animation: fadeInUp 0.5s ease-out forwards;
    opacity: 0;
  }

  .delay-1 { animation-delay: 0.1s; }
  .delay-2 { animation-delay: 0.2s; }
  .delay-3 { animation-delay: 0.3s; }
  .delay-4 { animation-delay: 0.4s; }
  .delay-5 { animation-delay: 0.5s; }

  .hover-lift {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  }

  .hover-glow {
    transition: box-shadow 0.2s ease;
  }
  .hover-glow:hover {
    box-shadow: 0 0 30px rgba(90,166,255,0.2);
  }

  .pulse-dot {
    animation: pulse 2s ease-in-out infinite;
  }

  /* Mobile-first responsive */
  .dashboard-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 16px;
  }

  @media (min-width: 640px) {
    .dashboard-container {
      padding: 20px;
    }
  }

  @media (min-width: 1024px) {
    .dashboard-container {
      padding: 24px 32px 80px;
    }
  }

  /* Header responsive */
  .dashboard-header {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  @media (min-width: 768px) {
    .dashboard-header {
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-end;
    }
  }

  .header-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  @media (min-width: 640px) {
    .header-actions {
      gap: 10px;
    }
  }

  /* Status pills responsive */
  .status-pill {
    padding: 6px 10px;
    font-size: 11px;
  }

  @media (min-width: 640px) {
    .status-pill {
      padding: 8px 14px;
      font-size: 13px;
    }
  }

  /* KPI Grid responsive */
  .kpi-grid-primary {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  @media (min-width: 640px) {
    .kpi-grid-primary {
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
  }

  @media (min-width: 1024px) {
    .kpi-grid-primary {
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
  }

  .kpi-grid-secondary {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  @media (min-width: 640px) {
    .kpi-grid-secondary {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
  }

  @media (min-width: 1024px) {
    .kpi-grid-secondary {
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
  }

  /* Chart grid responsive */
  .chart-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  @media (min-width: 768px) {
    .chart-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
  }

  /* Primary KPI card */
  .kpi-primary {
    position: relative;
    overflow: hidden;
    border-radius: 20px;
    padding: 20px;
    background: linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 16px 48px rgba(0,0,0,0.25);
  }

  @media (min-width: 640px) {
    .kpi-primary {
      padding: 24px;
    }
  }

  .kpi-primary::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.3;
    pointer-events: none;
  }

  .kpi-primary.gradient-purple::before {
    background: linear-gradient(135deg, #7c5cff, #5aa6ff);
  }

  .kpi-primary.gradient-red::before {
    background: #ef4444;
  }

  .kpi-primary.gradient-amber::before {
    background: #f59e0b;
  }

  .kpi-primary.gradient-green::before {
    background: #10b981;
  }

  .kpi-value-large {
    font-size: 44px;
    font-weight: 800;
    letter-spacing: -2px;
    line-height: 1;
  }

  @media (min-width: 640px) {
    .kpi-value-large {
      font-size: 52px;
    }
  }

  /* Secondary KPI card */
  .kpi-secondary {
    padding: 14px;
    border-radius: 14px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 120px;
  }

  @media (min-width: 640px) {
    .kpi-secondary {
      padding: 16px;
      border-radius: 16px;
    }
  }

  .kpi-secondary:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.12);
  }

  .kpi-value-medium {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -1px;
  }

  @media (min-width: 640px) {
    .kpi-value-medium {
      font-size: 36px;
    }
  }

  /* Panel */
  .panel {
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.08);
    background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
    box-shadow: 0 16px 48px rgba(0,0,0,0.3);
    overflow: visible;
  }

  @media (min-width: 640px) {
    .panel {
      border-radius: 20px;
    }
  }

  /* Table responsive */
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin: 0 -16px;
    padding: 0 16px;
  }

  @media (min-width: 640px) {
    .table-container {
      margin: 0;
      padding: 0;
    }
  }

  .data-table {
    width: 100%;
    min-width: 500px;
    border-collapse: collapse;
    font-size: 12px;
  }

  @media (min-width: 640px) {
    .data-table {
      font-size: 13px;
    }
  }

  .data-table th {
    text-align: left;
    padding: 10px 12px;
    font-weight: 600;
    font-size: 10px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    white-space: nowrap;
    color: rgba(234,241,255,0.5);
  }

  @media (min-width: 640px) {
    .data-table th {
      padding: 12px 14px;
      font-size: 11px;
    }
  }

  .data-table td {
    padding: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    vertical-align: middle;
    color: rgba(234,241,255,0.85);
  }
  .cell-primary { color: #EAF1FF; }
  .cell-secondary { color: rgba(234,241,255,0.7); }
  .cell-muted { color: rgba(234,241,255,0.5); }

  @media (min-width: 640px) {
    .data-table td {
      padding: 14px;
    }
  }

  .data-table tbody tr {
    transition: background 0.15s ease;
  }

  .data-table tbody tr:hover {
    background: rgba(255,255,255,0.03);
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 12px;
    text-decoration: none;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.06);
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .btn:hover {
    background: rgba(90,166,255,0.15);
    border-color: rgba(90,166,255,0.4);
    color: #5aa6ff;
    transform: translateY(-1px);
  }

  @media (min-width: 640px) {
    .btn {
      padding: 9px 14px;
      font-size: 13px;
    }
  }

  .btn-primary {
    background: linear-gradient(135deg, rgba(124,92,255,0.95), rgba(90,166,255,0.95));
    border: 1px solid rgba(255,255,255,0.2);
    box-shadow: 0 8px 24px rgba(90,166,255,0.25);
    transition: all 0.2s ease;
  }

   .btn-primary:hover {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.15);
    box-shadow: none;
    transform: translateY(-1px);
  }

  /* Age badge */
  .age-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
  }

  .age-badge.critical {
    background: rgba(239,68,68,0.2);
    color: #fca5a5;
  }

  .age-badge.warning {
    background: rgba(245,158,11,0.2);
    color: #fcd34d;
  }

  .age-badge.good {
    background: rgba(16,185,129,0.2);
    color: #6ee7b7;
  }

  /* ================================ */
  /* LIGHT MODE - COMPREHENSIVE FIXES */
  /* ================================ */

  html[data-theme="light"] body,
  html[data-theme="light"] main,
  html[data-theme="light"] .dashboard-main {
    background: #f1f5f9 !important;
    color: #1e293b !important;
  }

  /* Panels and Cards */
  html[data-theme="light"] .panel {
    background: #ffffff !important;
    border-color: #e2e8f0 !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.06) !important;
  }

  html[data-theme="light"] .kpi-primary {
    background: #ffffff !important;
    border-color: #e2e8f0 !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.06) !important;
  }

  html[data-theme="light"] .kpi-secondary {
    background: #ffffff !important;
    border-color: #e2e8f0 !important;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06) !important;
  }

  html[data-theme="light"] .kpi-secondary:hover {
    background: #f8fafc !important;
    border-color: #cbd5e1 !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
  }

  html[data-theme="light"] .kpi-secondary[data-accent="green"]  { background: linear-gradient(135deg, rgba(16,185,129,0.06), #ffffff) !important; }
  html[data-theme="light"] .kpi-secondary[data-accent="amber"]  { background: linear-gradient(135deg, rgba(245,158,11,0.06), #ffffff) !important; }
  html[data-theme="light"] .kpi-secondary[data-accent="red"]    { background: linear-gradient(135deg, rgba(239,68,68,0.06), #ffffff) !important; }
  html[data-theme="light"] .kpi-secondary[data-accent="blue"]   { background: linear-gradient(135deg, rgba(90,166,255,0.06), #ffffff) !important; }
  html[data-theme="light"] .kpi-secondary[data-accent="purple"] { background: linear-gradient(135deg, rgba(139,92,246,0.06), #ffffff) !important; }

  /* ALL TEXT - Default dark for light mode */
  html[data-theme="light"] h1,
  html[data-theme="light"] h2,
  html[data-theme="light"] h3,
  html[data-theme="light"] .dashboard-header h1 {
    color: #1e293b !important;
  }

  /* Theme-aware text classes */
  .text-primary { color: #EAF1FF; }
  .text-secondary { color: rgba(234,241,255,0.7); }
  .text-muted { color: rgba(234,241,255,0.5); }

  html[data-theme="light"] .text-primary { color: #1e293b !important; }
  html[data-theme="light"] .text-secondary { color: #475569 !important; }
  html[data-theme="light"] .text-muted { color: #64748b !important; }

  /* Semantic status colors */
  .text-critical { color: #ef4444 !important; }
  .text-warning { color: #f59e0b !important; }
  .text-success { color: #10b981 !important; }

  html[data-theme="light"] .text-critical { color: #dc2626 !important; }
  html[data-theme="light"] .text-warning { color: #d97706 !important; }
  html[data-theme="light"] .text-success { color: #059669 !important; }

  /* KPI Values */
  html[data-theme="light"] .kpi-value-large,
  html[data-theme="light"] .kpi-value-medium {
    color: #1e293b !important;
  }

  /* Override for semantic colors in KPIs */
  html[data-theme="light"] .kpi-value-large.text-critical,
  html[data-theme="light"] .kpi-value-medium.text-critical {
    color: #dc2626 !important;
  }

  html[data-theme="light"] .kpi-value-large.text-warning,
  html[data-theme="light"] .kpi-value-medium.text-warning {
    color: #d97706 !important;
  }

  html[data-theme="light"] .kpi-value-large.text-success,
  html[data-theme="light"] .kpi-value-medium.text-success {
    color: #059669 !important;
  }

  /* Tables */
  html[data-theme="light"] .data-table th {
    color: #64748b !important;
    background: #f8fafc !important;
    border-color: #e2e8f0 !important;
  }

  html[data-theme="light"] .data-table td {
    color: #334155 !important;
    border-color: #f1f5f9 !important;
  }

  html[data-theme="light"] .data-table tbody tr:hover {
    background: #f8fafc !important;
  }

  html[data-theme="light"] .cell-primary {
    color: #1e293b !important;
  }

  html[data-theme="light"] .cell-secondary {
    color: #64748b !important;
  }

  html[data-theme="light"] .cell-muted {
    color: #475569 !important;
  }

  /* Buttons */
  html[data-theme="light"] .btn {
    background: #ffffff !important;
    border-color: #e2e8f0 !important;
    color: #334155 !important;
  }

  html[data-theme="light"] .btn:hover {
    background: rgba(90,166,255,0.1) !important;
    border-color: rgba(90,166,255,0.4) !important;
    color: #2563eb !important;
    transform: translateY(-1px);
  }

  html[data-theme="light"] .btn-primary:hover {
    background: #f1f5f9 !important;
    border-color: #e2e8f0 !important;
    color: #334155 !important;
  }

  /* Age Badges - Darker colors for light mode */
  html[data-theme="light"] .age-badge.critical {
    background: rgba(220,38,38,0.12) !important;
    color: #dc2626 !important;
  }

  html[data-theme="light"] .age-badge.warning {
    background: rgba(217,119,6,0.12) !important;
    color: #d97706 !important;
  }

  html[data-theme="light"] .age-badge.good {
    background: rgba(5,150,105,0.12) !important;
    color: #059669 !important;
  }

  /* SVG Charts */
  svg text {
    fill: rgba(234,241,255,0.5);
  }

  svg line {
    stroke: rgba(255,255,255,0.06);
  }

  html[data-theme="light"] svg text {
    fill: #64748b !important;
  }

  html[data-theme="light"] svg line {
    stroke: #e2e8f0 !important;
  }

  /* Dark mode defaults */
  html[data-theme="dark"] .text-primary {
    color: #EAF1FF !important;
  }

  html[data-theme="dark"] svg text {
    fill: rgba(234,241,255,0.5) !important;
  }

  /* Hover micro-animations */
  .hover-lift {
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .hover-lift:hover {
    transform: translateY(-2px);
  }
  .kpi-primary {
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                border-color 0.25s ease;
  }
  .kpi-primary:hover {
    transform: translateY(-3px) scale(1.005);
  }
  .kpi-secondary {
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                background 0.2s ease,
                border-color 0.2s ease;
  }
  .kpi-secondary:hover {
    transform: translateY(-2px);
  }
  .btn {
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .btn:hover {
    transform: translateY(-1px);
  }
  .btn:active {
    transform: translateY(0px) scale(0.98);
  }
  .age-badge.critical {
    animation: badge-pulse 2s ease-in-out infinite;
  }
  @keyframes badge-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  @keyframes skeleton-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  html[data-theme="light"] .skeleton-pulse {
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%) !important;
    background-size: 200% 100%;
  }

  /* Nav tabs */
  /* Dashboard top bar — frames header + tabs as one unit */
  .dashboard-topbar {
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.08);
    background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    overflow: visible;
    margin-bottom: 4px;
  }
  .dashboard-topbar .dashboard-header {
    padding: 16px 20px 12px;
    flex-direction: row;
    align-items: center;
  }
  @media (min-width: 640px) {
    .dashboard-topbar {
      border-radius: 20px;
    }
  }
  html[data-theme="light"] .dashboard-topbar {
    background: #ffffff !important;
    border-color: #e2e8f0 !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.06) !important;
  }

  /* Nav tabs — underline style inside topbar */
  .nav-tabs {
    display: flex;
    gap: 0;
    padding: 0 20px;
    border-top: 1px solid rgba(255,255,255,0.06);
    background: transparent;
    border-radius: 0;
    width: 100%;
  }

  .nav-tab {
    padding: 12px 18px;
    border-radius: 0;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.15s ease;
    color: rgba(234,241,255,0.5);
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    cursor: pointer;
    white-space: nowrap;
    margin-bottom: -1px;
  }

  .nav-tab:hover {
    color: rgba(234,241,255,0.85);
    background: rgba(255,255,255,0.03);
    border-bottom-color: rgba(124,92,255,0.3);
  }

  .nav-tab.active {
    color: #EAF1FF;
    background: transparent;
    border-bottom-color: #7c5cff;
  }

  html[data-theme="light"] .nav-tabs {
    border-top-color: #e2e8f0 !important;
  }

  html[data-theme="light"] .nav-tab {
    color: #94a3b8 !important;
  }

  html[data-theme="light"] .nav-tab:hover {
    color: #334155 !important;
    background: rgba(0,0,0,0.02) !important;
    border-bottom-color: rgba(124,92,255,0.3) !important;
  }

  html[data-theme="light"] .nav-tab.active {
    color: #1e293b !important;
    background: transparent !important;
    border-bottom-color: #7c5cff !important;
    box-shadow: none;
  }

  /* Funnel visualization */
  .funnel-stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    padding: 12px 8px;
    border-radius: 12px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.06);
    transition: all 0.2s ease;
    min-width: 80px;
  }

  .funnel-stage:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.1);
  }

  .funnel-arrow {
    display: flex;
    align-items: center;
    color: rgba(234,241,255,0.3);
    font-size: 18px;
    padding: 0 2px;
  }

  html[data-theme="light"] .funnel-stage {
    background: #f8fafc !important;
    border-color: #e2e8f0 !important;
  }

  html[data-theme="light"] .funnel-stage:hover {
    background: #f1f5f9 !important;
    border-color: #cbd5e1 !important;
  }

  html[data-theme="light"] .funnel-arrow {
    color: #cbd5e1 !important;
  }

  /* Coming soon banner */
  .coming-soon-banner {
    border-radius: 16px;
    border: 1px dashed rgba(124,92,255,0.3);
    background: linear-gradient(135deg, rgba(124,92,255,0.05) 0%, rgba(90,166,255,0.05) 100%);
    padding: 24px;
    text-align: center;
  }

  html[data-theme="light"] .coming-soon-banner {
    border-color: rgba(124,92,255,0.2) !important;
    background: linear-gradient(135deg, rgba(124,92,255,0.03) 0%, rgba(90,166,255,0.03) 100%) !important;
  }

  /* Info tooltip */
  .info-tooltip {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    color: rgba(234,241,255,0.5);
    font-size: 11px;
    font-weight: 700;
    cursor: help;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }

  .info-tooltip:hover {
    background: rgba(90,166,255,0.2);
    border-color: rgba(90,166,255,0.5);
    color: #5aa6ff;
  }

  .info-tooltip .tooltip-text {
    visibility: hidden;
    opacity: 0;
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: 260px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(10,16,32,0.95);
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: 0 12px 32px rgba(0,0,0,0.5);
    color: rgba(234,241,255,0.85);
    font-size: 12px;
    font-weight: 500;
    line-height: 1.5;
    text-transform: none;
    letter-spacing: 0;
    white-space: normal;
    z-index: 9999;
    transition: opacity 0.15s ease, visibility 0.15s ease;
    pointer-events: none;
  }

  .info-tooltip .tooltip-text::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: rgba(10,16,32,0.95);
  }

  .info-tooltip:hover .tooltip-text {
    visibility: visible;
    opacity: 1;
  }

  html[data-theme="light"] .info-tooltip {
    background: #e2e8f0 !important;
    border-color: #cbd5e1 !important;
    color: #64748b !important;
  }

  html[data-theme="light"] .info-tooltip:hover {
    background: rgba(37,99,235,0.1) !important;
    border-color: rgba(37,99,235,0.4) !important;
    color: #2563eb !important;
  }

  html[data-theme="light"] .info-tooltip .tooltip-text {
    background: #ffffff !important;
    border-color: #e2e8f0 !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
    color: #334155 !important;
  }

  html[data-theme="light"] .info-tooltip .tooltip-text::after {
    border-top-color: #ffffff !important;
  }

  /* Capacity onboarding card */
  .capacity-onboard {
    border-radius: 16px;
    border: 1px solid rgba(90,166,255,0.3);
    background: linear-gradient(135deg, rgba(124,92,255,0.1) 0%, rgba(90,166,255,0.08) 100%);
    padding: 24px;
    margin-top: 16px;
  }

  html[data-theme="light"] .capacity-onboard {
    background: linear-gradient(135deg, rgba(124,92,255,0.06) 0%, rgba(90,166,255,0.04) 100%) !important;
    border-color: rgba(90,166,255,0.2) !important;
  }

  .capacity-onboard input {
    width: 160px;
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid rgba(90,166,255,0.4);
    background: rgba(255,255,255,0.06);
    color: #EAF1FF;
    font-size: 18px;
    font-weight: 700;
    outline: none;
    transition: all 0.15s ease;
  }

  .capacity-onboard input:focus {
    border-color: rgba(90,166,255,0.7);
    box-shadow: 0 0 0 3px rgba(90,166,255,0.15);
  }

  html[data-theme="light"] .capacity-onboard input {
    background: #ffffff !important;
    border-color: #cbd5e1 !important;
    color: #1e293b !important;
  }

  html[data-theme="light"] .capacity-onboard input:focus {
    border-color: #2563eb !important;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important;
  }

  /* SparkLine data-point label pills */
  .chart-label-pill {
    fill: rgba(6,8,17,0.7);
  }
  html[data-theme="light"] .chart-label-pill {
    fill: rgba(255,255,255,0.85);
  }

  /* Recommendation cards (inside a .panel) */
  .rec-card {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.05);
    text-decoration: none;
    transition: all 0.15s ease;
    margin-bottom: 6px;
    font-size: 13px;
    line-height: 1.5;
  }
  .rec-card:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.10);
  }
  .rec-card:last-child {
    margin-bottom: 0;
  }
  html[data-theme="light"] .rec-card {
    background: #f8fafc !important;
    border-color: #e2e8f0 !important;
  }
  html[data-theme="light"] .rec-card:hover {
    background: #f1f5f9 !important;
    border-color: #cbd5e1 !important;
  }
`;
