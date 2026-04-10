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
  text: "#f1f4f9",
  sub: "#a0aab8",
  mut: "#8590a2",
  faint: "#6b7585",
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
    transition: box-shadow 0.15s ease, border-color 0.15s ease;
  }
  .hover-lift:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  }

  .toggle-btn {
    transition: all 0.15s ease;
  }
  .toggle-btn:hover {
    filter: brightness(1.15);
    transform: scale(1.05);
  }

  .chart-bar-hover .chart-bar-tooltip { opacity: 0 !important; }
  .chart-bar-hover .bar-label { opacity: 0.7; transform: scale(1); }
  .chart-bar-hover { transition: opacity 0.15s ease, filter 0.15s ease, transform 0.15s ease; }
  .chart-bar-hover:hover { opacity: 1 !important; filter: brightness(1.15); transform: scale(1.03); }
  .chart-bar-hover:hover .chart-bar-tooltip { opacity: 1 !important; }
  .chart-bar-hover:hover .bar-label { opacity: 1 !important; transform: scale(1.08); font-weight: 800; }

  /* Aging distribution bar — segment hover pops matching labels */
  .aging-bar-seg { transition: filter 0.15s ease; }
  .aging-bar-seg:hover { filter: brightness(1.2); }

  /* Donut segment hover */
  .donut-seg { transition: opacity 0.15s ease, filter 0.15s ease; cursor: pointer; }
  .donut-seg:hover { filter: brightness(1.25); }

  /* Donut labels hover — breathe */
  .donut-label { transition: opacity 0.15s ease, transform 0.15s ease; cursor: pointer; }
  .donut-label:hover { transform: scale(1.02); }

  /* Cross-highlight: segment hover dims other labels, label hover dims other segments */
  .donut-group:has(.donut-seg:hover) .donut-label { opacity: 0.35 !important; }
  .donut-group:has(.donut-seg.di0:hover) .donut-label.di0,
  .donut-group:has(.donut-seg.di1:hover) .donut-label.di1,
  .donut-group:has(.donut-seg.di2:hover) .donut-label.di2,
  .donut-group:has(.donut-seg.di3:hover) .donut-label.di3,
  .donut-group:has(.donut-seg.di4:hover) .donut-label.di4 { opacity: 1 !important; transform: scale(1.02); }

  .donut-group:has(.donut-label:hover) .donut-seg { opacity: 0.35 !important; }
  .donut-group:has(.donut-label.di0:hover) .donut-seg.di0,
  .donut-group:has(.donut-label.di1:hover) .donut-seg.di1,
  .donut-group:has(.donut-label.di2:hover) .donut-seg.di2,
  .donut-group:has(.donut-label.di3:hover) .donut-seg.di3,
  .donut-group:has(.donut-label.di4:hover) .donut-seg.di4 { opacity: 1 !important; filter: brightness(1.25); }

  /* Invoice aging bar segments breathe */
  .aging-bar-seg { transition: filter 0.15s ease, transform 0.15s ease; cursor: default; }
  .aging-bar-seg:hover { filter: brightness(1.15); transform: scaleX(1.03); }

  /* RPM gauge breathe */
  .rpm-gauge { transition: transform 0.2s ease, filter 0.2s ease; }
  .rpm-gauge:hover { transform: scale(1.02); filter: brightness(1.05); }

  /* Day bar hover tooltip */
  .day-bar-wrap { position: relative; }
  .day-bar-wrap .day-tip { opacity: 0; transition: opacity 0.15s ease; pointer-events: none;
    position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
    padding: 8px 12px; border-radius: 8px; white-space: nowrap; z-index: 10;
    background: rgba(0,0,0,0.92); color: #fff; font-size: 13px; font-weight: 700;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3); line-height: 1.4; }
  .day-bar-wrap:hover .day-tip { opacity: 1; }
  .day-bar-wrap:hover .day-bar-fill { filter: brightness(1.2); }

  .hover-glow {
    transition: box-shadow 0.2s ease;
  }
  .hover-glow:hover {
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  }

  .pulse-dot {
    animation: pulse 2s ease-in-out infinite;
  }

  /* Mobile-first responsive */
  .dashboard-container {
    max-width: 1600px;
    margin: 0 auto;
    padding: 12px 16px 16px;
    width: 100%;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }

  @media (min-width: 640px) {
    .dashboard-container {
      padding: 15px 20px 20px;
    }
  }

  @media (min-width: 1024px) {
    .dashboard-container {
      padding: 18px 32px 80px;
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
    border-radius: 12px;
    padding: 20px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  @media (min-width: 640px) {
    .kpi-primary {
      padding: 24px;
    }
  }

  .kpi-primary::before { display: none; }

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
    border-radius: 12px;
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
    }
  }

  .kpi-secondary:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.1);
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
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    overflow: visible;
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
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 0;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    white-space: nowrap;
    color: rgba(234,241,255,0.5);
  }

  @media (min-width: 640px) {
    .data-table th {
      padding: 10px 14px;
    }
  }

  .data-table td {
    padding: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    vertical-align: middle;
    color: rgba(234,241,255,0.85);
  }
  .cell-primary { color: #f1f4f9; }
  .cell-secondary { color: #a0aab8; }
  .cell-muted { color: #8590a2; }

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
    border-radius: 8px;
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
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.15);
  }

  @media (min-width: 640px) {
    .btn {
      padding: 9px 14px;
      font-size: 13px;
    }
  }

  .btn-primary {
    background: #2563eb;
    color: #ffffff;
    border: 1px solid #3b82f6;
    box-shadow: 0 2px 8px rgba(37,99,235,0.25);
    transition: all 0.2s ease;
  }

  .btn-primary:hover {
    background: #1d4ed8;
    border-color: #2563eb;
    box-shadow: 0 4px 12px rgba(37,99,235,0.3);
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
    background: #f5f6f8 !important;
    color: #0f1729 !important;
  }

  /* Panels and Cards */
  html[data-theme="light"] .panel {
    background: #ffffff !important;
    border-color: #e2e5ea !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
  }

  html[data-theme="light"] .kpi-primary {
    background: #ffffff !important;
    border-color: #e2e5ea !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
  }

  html[data-theme="light"] .kpi-secondary {
    background: #ffffff !important;
    border-color: #e2e5ea !important;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03) !important;
  }

  html[data-theme="light"] .kpi-secondary:hover {
    background: #fafbfc !important;
    border-color: #cbd5e1 !important;
  }

  /* ALL TEXT - Default dark for light mode */
  html[data-theme="light"] h1,
  html[data-theme="light"] h2,
  html[data-theme="light"] h3,
  html[data-theme="light"] .dashboard-header h1 {
    color: #1e293b !important;
  }

  /* Theme-aware text classes — 3 tiers only */
  .text-primary { color: #f1f4f9; }
  .text-secondary { color: #a0aab8; }
  .text-muted { color: #a8b3c4; }

  html[data-theme="light"] .text-primary { color: #0f1729 !important; }
  html[data-theme="light"] .text-secondary { color: #4b5563 !important; }
  html[data-theme="light"] .text-muted { color: #9ca3af !important; }

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
    color: #6b7280 !important;
    background: #fafbfc !important;
    border-color: #e2e5ea !important;
  }

  html[data-theme="light"] .data-table td {
    color: #1e293b !important;
    border-color: #f0f1f3 !important;
  }

  html[data-theme="light"] .data-table tbody tr:hover {
    background: #f8f9fb !important;
  }

  html[data-theme="light"] .cell-primary {
    color: #0f1729 !important;
  }

  html[data-theme="light"] .cell-secondary {
    color: #4b5563 !important;
  }

  html[data-theme="light"] .cell-muted {
    color: #9ca3af !important;
  }

  /* Buttons */
  html[data-theme="light"] .btn {
    background: #ffffff !important;
    border-color: #e2e5ea !important;
    color: #334155 !important;
  }

  html[data-theme="light"] .btn:hover {
    background: #f5f6f8 !important;
    border-color: #cbd5e1 !important;
    color: #1e293b !important;
  }

  html[data-theme="light"] .btn-primary {
    background: #2563eb !important;
    border-color: #3b82f6 !important;
    color: #ffffff !important;
  }

  html[data-theme="light"] .btn-primary:hover {
    background: #1d4ed8 !important;
    border-color: #2563eb !important;
    color: #ffffff !important;
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
    fill: #8590a2;
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
    color: #f1f4f9 !important;
  }

  html[data-theme="dark"] svg text {
    fill: #8590a2 !important;
  }

  /* Hover micro-animations */
  .hover-lift {
    transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .hover-lift:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  .kpi-primary {
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }
  .kpi-primary:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  }
  .kpi-secondary {
    transition: background 0.2s ease, border-color 0.2s ease;
  }
  .btn {
    transition: all 0.15s ease;
  }
  .btn:active {
    transform: scale(0.98);
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

  /* Sidebar layout */
  .app-layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }
  .sidebar-nav {
    width: 200px;
    flex-shrink: 0;
    border-right: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.015);
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  .app-main {
    flex: 1;
    min-width: 0;
    overflow-x: hidden;
    overflow-y: auto;
  }
  html[data-theme="light"] .sidebar-nav {
    background: #ffffff !important;
    border-right-color: #e2e5ea !important;
  }

  /* Mobile: hamburger menu replaces the sidebar */
  .sidebar-mobile-bar { display: none; }
  @media (max-width: 768px) {
    .app-layout {
      flex-direction: column;
      height: auto !important;
      min-height: 100dvh;
      overflow: visible !important;
    }
    .app-main {
      overflow-x: hidden !important;
      overflow-y: visible !important;
    }
    .sidebar-desktop { display: none !important; }
    .sidebar-mobile-bar { display: block; }
    html, body {
      overflow-x: hidden;
      overflow-y: auto !important;
    }
  }

  /* Nav tabs (legacy — kept for compatibility) */
  /* Dashboard top bar — slim header strip (nav moved to sidebar) */
  .dashboard-topbar {
    border-radius: 0;
    border: none;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: transparent;
    box-shadow: none;
    overflow: hidden;
    margin-bottom: 4px;
  }
  .dashboard-topbar .dashboard-header {
    padding: 10px 20px;
    flex-direction: row;
    align-items: center;
  }
  @media (min-width: 640px) {
    .dashboard-topbar {
      border-radius: 20px;
    }
  }
  html[data-theme="light"] .dashboard-topbar {
    background: transparent !important;
    border-bottom-color: #e2e8f0 !important;
    box-shadow: none !important;
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

  /* Command Strip — dense KPI row */
  .command-strip {
    display: grid;
    grid-template-columns: auto repeat(3, 1fr);
    gap: 0;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.08);
    background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    overflow: visible;
  }
  .command-strip > div {
    padding: 14px 16px;
    border-right: 1px solid rgba(255,255,255,0.06);
  }
  .command-strip > div:last-child { border-right: none; }
  @media (max-width: 768px) {
    .command-strip {
      grid-template-columns: repeat(2, 1fr);
    }
    .command-strip > div:nth-child(odd) { border-right: 1px solid rgba(255,255,255,0.06); }
    .command-strip > div:nth-child(even) { border-right: none; }
  }
  @media (max-width: 480px) {
    .command-strip { grid-template-columns: 1fr; }
    .command-strip > div { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .command-strip > div:last-child { border-bottom: none; }
  }
  html[data-theme="light"] .command-strip {
    background: #ffffff !important;
    border-color: #e2e8f0 !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.06) !important;
  }
  html[data-theme="light"] .command-strip > div {
    border-color: #e2e8f0 !important;
  }

  /* Side-by-side layout */
  .side-by-side {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 16px;
    align-items: stretch;
  }
  @media (max-width: 768px) {
    .side-by-side { grid-template-columns: 1fr; }
  }

  /* Sortable table headers */
  .data-table th.sortable {
    cursor: pointer;
    user-select: none;
    transition: color 0.15s ease;
  }
  .data-table th.sortable:hover {
    color: #5aa6ff !important;
  }
  html[data-theme="light"] .data-table th.sortable:hover {
    color: #2563eb !important;
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
  /* Priority-tinted rec cards */
  .rec-card-high {
    background: rgba(245,158,11,0.04) !important;
    border-color: rgba(245,158,11,0.1) !important;
  }
  .rec-card-medium {
    background: rgba(90,166,255,0.04) !important;
    border-color: rgba(90,166,255,0.1) !important;
  }
  html[data-theme="light"] .rec-card-high {
    background: #fffbeb !important;
    border-color: #fde68a !important;
  }
  html[data-theme="light"] .rec-card-medium {
    background: #eff6ff !important;
    border-color: #bfdbfe !important;
  }

  /* Money Flow vertical list */
  .money-flow-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.12s ease;
    margin-bottom: 2px;
  }
  .money-flow-row:last-child { margin-bottom: 0; }
  .money-flow-row:hover {
    background: rgba(255,255,255,0.04);
  }
  html[data-theme="light"] .money-flow-row:hover {
    background: #f8fafc !important;
  }

  /* ===== GLOBAL OVERFLOW PREVENTION ===== */
  * { box-sizing: border-box; }
  html, body { overflow-x: hidden; max-width: 100vw; }

  /* ===== TABLET OPTIMIZATION (481-768px) ===== */
  @media (max-width: 768px) {
    /* Overview 3-column card grid → stacked on tablet/mobile */
    [data-tour="overview-cards"] {
      grid-template-columns: 1fr !important;
      gap: 10px !important;
    }
    /* Donut/gauge SVG responsive */
    .rpm-gauge svg, .donut-group svg {
      max-width: 100% !important;
      height: auto !important;
    }
    /* Toggle buttons wrap + smaller */
    .toggle-btn {
      padding: 8px 12px !important;
      font-size: 12px !important;
    }
  }

  @media (max-width: 640px) {
    .header-actions { gap: 4px !important; }
    .header-subtitle { display: none !important; }
    .kpi-grid-secondary { grid-template-columns: repeat(2, 1fr) !important; }
    .command-strip { grid-template-columns: 1fr 1fr !important; }

    /* Funnel arrows hidden on narrow screens */
    .funnel-arrow { display: none !important; }
  }

  /* ===== MOBILE OPTIMIZATION (<480px) ===== */
  @media (max-width: 480px) {
    .dashboard-container { padding: 0 6px 16px !important; width: 100% !important; max-width: 100vw !important; }
    .dashboard-topbar { border-radius: 10px !important; overflow: hidden !important; }
    .dashboard-header { padding: 8px 10px !important; gap: 4px !important; }
    .header-actions { gap: 3px !important; flex-wrap: nowrap !important; }

    .kpi-value-large { font-size: 24px !important; letter-spacing: -0.5px !important; }
    .kpi-value-medium { font-size: 18px !important; letter-spacing: -0.3px !important; }

    .kpi-grid-primary { gap: 6px !important; grid-template-columns: 1fr !important; }
    .kpi-grid-secondary { grid-template-columns: 1fr 1fr !important; gap: 6px !important; }
    .kpi-secondary { padding: 10px 12px !important; min-height: 80px !important; border-radius: 10px !important; }

    .nav-tabs { padding: 0 8px !important; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
    .nav-tabs::-webkit-scrollbar { display: none; }
    .nav-tab { padding: 8px 10px !important; font-size: 11px !important; flex-shrink: 0; }

    .panel { padding: 10px !important; border-radius: 10px !important; overflow: hidden !important; }
    .side-by-side { gap: 10px !important; }
    .command-strip { gap: 6px !important; grid-template-columns: 1fr !important; }

    .chart-grid { gap: 6px !important; }

    h2 { font-size: 13px !important; }

    .info-tooltip .tooltip-text {
      max-width: 180px !important;
      font-size: 10px !important;
      left: auto !important;
      right: -8px !important;
      transform: none !important;
    }

    /* Tables: compact but scrollable — no data hidden */
    .data-table { min-width: 500px !important; font-size: 11px !important; }
    .data-table th, .data-table td { padding: 6px 6px !important; }
    .data-table th:first-child, .data-table td:first-child { width: 50px !important; }
    .table-container { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }

    /* Quote pipeline: stack vertically */
    .quote-pipeline-bar { flex-direction: column !important; height: auto !important; gap: 6px !important; }
    .quote-pipeline-bar > div { min-width: 0 !important; }
    .funnel-stage { padding: 10px !important; }

    /* Toggle buttons: compact on small screens, allow wrapping */
    .toggle-btn {
      padding: 6px 10px !important;
      font-size: 11px !important;
      border-radius: 8px !important;
    }

    /* Day bars: narrower gap */
    .day-bar-wrap {
      gap: 2px !important;
    }

    /* Gauge: remove negative margin that clips into header on mobile */
    .gauge-container {
      margin-top: 0 !important;
    }

    /* Donut labels: tighter on mobile */
    .donut-label {
      font-size: 11px !important;
    }

    /* Sidebar bottom: hide restart tour and footer on very small screens */
    .sidebar-nav > div:nth-child(3) { display: none !important; } /* spacer */
  }
`;
