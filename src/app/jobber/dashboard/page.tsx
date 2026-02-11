// src/app/jobber/dashboard/page.tsx
import { ExportCSV } from "./ExportCSV";
import React from "react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SyncButton } from "./SyncButton";
import { ThemeToggle } from "./ThemeToggle";
import { ActionListTabs } from "./ActionListTabs";
import { getUser } from "@/lib/supabaseAuth";
import { redirect } from "next/navigation";
import { DisconnectJobberButton } from "./DisconnectButton";
import { TrendsSection } from "./TrendsSection";

/* --------------------------------- helpers --------------------------------- */
type Granularity = "day" | "week" | "month" | "quarter";
type ChartType = "line" | "bar";

function safeDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function pct(x: number) {
  return Math.round(x * 100) + "%";
}

function parseISODateOnly(s: string): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  return isNaN(dt.getTime()) ? null : dt;
}
function toISODateOnlyUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDaysUTC(d: Date, days: number) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}
function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}
function formatSyncTime(date: Date): string {
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
function startOfWeekUTC(d: Date) {
  const x = startOfDayUTC(d);
  const day = x.getUTCDay();
  const delta = (day + 6) % 7;
  x.setUTCDate(x.getUTCDate() - delta);
  return x;
}
function startOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}
function startOfQuarterUTC(d: Date) {
  const q = Math.floor(d.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(d.getUTCFullYear(), q, 1, 0, 0, 0, 0));
}
function bucketStartUTC(d: Date, g: Granularity) {
  if (g === "day") return startOfDayUTC(d);
  if (g === "week") return startOfWeekUTC(d);
  if (g === "month") return startOfMonthUTC(d);
  return startOfQuarterUTC(d);
}
function nextBucketUTC(d: Date, g: Granularity) {
  if (g === "day") return addDaysUTC(d, 1);
  if (g === "week") return addDaysUTC(d, 7);
  if (g === "month") return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, 1, 0, 0, 0, 0));
}
function labelForBucket(d: Date, g: Granularity) {
  const y = d.getUTCFullYear();
  const m = d.toLocaleString(undefined, { month: "short", timeZone: "UTC" });
  const day = d.getUTCDate();
  if (g === "day") return `${m} ${day}`;
  if (g === "week") return `${m} ${day}`;
  if (g === "month") return `${m} ${y.toString().slice(2)}`;
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `Q${q} ${y.toString().slice(2)}`;
}

function moneyFactory(currency: string, locale = "en-US") {
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

function moneyForChart(cents: number): string {
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

function severityFromScore(score: number): "critical" | "warning" | "good" {
  if (score >= 80) return "critical";
  if (score >= 50) return "warning";
  return "good";
}

function statusLooksWon(status: string) {
  const s = status.toUpperCase();
  return s.includes("APPROV") || s.includes("ACCEPT") || s.includes("WON") || s.includes("CONVERT") || s.includes("BOOK");
}

function statusLooksLost(status: string) {
  const s = status.toUpperCase();
  return s.includes("REJECTED") || s.includes("DECLINED") || s.includes("LOST") || s.includes("EXPIRED") || s.includes("ARCHIVED");
}
/* --------------------------------- DEMO DATA --------------------------------- */
const DEMO_DATA = {
  companyName: "Greenscape Lawn & Garden",
  currencyCode: "USD",
  lastSyncPretty: "2 hours ago",
  totalAR: 484700,
  b15p: 215500,
  leakDollars: 1234000,
  leakCount: 8,
  changesRequestedCount: 2,
  approvedNoJobCount: 3,
  unscheduledCount: 7,
  quoteWonPct: 0.34,
  quotesWonLast30Days: 11,
  quotesInLast30Days: 32,
  allOverdueCount: 9,
  agedARInvoices: [
    { invoice_number: "1247", client_name: "Johnson Residence", amount_cents: 85000, days_overdue: 34, due_date: "2025-12-30", jobber_url: "#" },
    { invoice_number: "1251", client_name: "Oakwood HOA", amount_cents: 62500, days_overdue: 28, due_date: "2026-01-05", jobber_url: "#" },
    { invoice_number: "1258", client_name: "Martinez Property", amount_cents: 34500, days_overdue: 21, due_date: "2026-01-12", jobber_url: "#" },
    { invoice_number: "1263", client_name: "Thompson Estate", amount_cents: 18500, days_overdue: 18, due_date: "2026-01-15", jobber_url: "#" },
    { invoice_number: "1267", client_name: "Riverside Church", amount_cents: 15000, days_overdue: 16, due_date: "2026-01-17", jobber_url: "#" },
  ],
  unscheduledRows: [
    { job_number: "3847", job_title: "Spring cleanup & mulching", created_at_jobber: "2026-01-15", jobber_url: "#", total_amount_cents: 125000 },
    { job_number: "3851", job_title: "Irrigation system repair", created_at_jobber: "2026-01-18", jobber_url: "#", total_amount_cents: 85000 },
    { job_number: "3854", job_title: "Tree trimming - backyard oaks", created_at_jobber: "2026-01-22", jobber_url: "#", total_amount_cents: 45000 },
    { job_number: "3858", job_title: "Weekly maintenance setup", created_at_jobber: "2026-01-25", jobber_url: "#", total_amount_cents: 32000 },
    { job_number: "3861", job_title: "Fence line clearing", created_at_jobber: "2026-01-28", jobber_url: "#", total_amount_cents: 28000 },
  ],
  leakCandidates: [
    { quote_number: "Q-892", quote_title: "Full landscape redesign", sent_at: "2026-01-08", quote_total_cents: 485000, quote_url: "#", quote_status: "awaiting_response" },
    { quote_number: "Q-897", quote_title: "Patio & retaining wall", sent_at: "2026-01-12", quote_total_cents: 325000, quote_url: "#", quote_status: "awaiting_response" },
    { quote_number: "Q-901", quote_title: "Drainage solution - side yard", sent_at: "2026-01-15", quote_total_cents: 175000, quote_url: "#", quote_status: "awaiting_response" },
    { quote_number: "Q-904", quote_title: "Seasonal flower installation", sent_at: "2026-01-19", quote_total_cents: 125000, quote_url: "#", quote_status: "awaiting_response" },
    { quote_number: "Q-908", quote_title: "Lawn renovation & seeding", sent_at: "2026-01-24", quote_total_cents: 124000, quote_url: "#", quote_status: "awaiting_response" },
  ],
  openRequests: [
    { title: "New lawn care estimate", client_name: "Sarah Mitchell", source: "website", created_at_jobber: "2026-01-30", jobber_url: "#" },
    { title: "Spring cleanup quote needed", client_name: "Oak Valley HOA", source: "phone", created_at_jobber: "2026-01-28", jobber_url: "#" },
    { title: "Irrigation repair assessment", client_name: "Tom Henderson", source: "website", created_at_jobber: "2026-01-25", jobber_url: "#" },
  ],
  openRequestsCount: 3,
  trendLabels: ["Dec 9", "Dec 16", "Dec 23", "Dec 30", "Jan 6", "Jan 13", "Jan 20", "Jan 27"],
  leakTrend: [1850000, 1720000, 1580000, 1450000, 1380000, 1290000, 1260000, 1234000],
  ar15Trend: [385000, 342000, 298000, 275000, 248000, 232000, 218000, 215500],
  unschedTrend: [12, 11, 10, 9, 8, 8, 7, 7],
  recommendations: [
    { icon: "🔴", text: "$2,155 overdue 15+ days (5 invoices). Priority: Call top 3 oldest accounts today.", priority: "high" as const },
    { icon: "✏️", text: "2 quotes waiting for revisions. Hot leads - respond within 24hrs.", priority: "high" as const },
    { icon: "💰", text: "8 quotes pending ($12,340 total). Follow up on top 5 - potential $3,085 recovery.", priority: "medium" as const },
  ],
};

/* ----------------------------------- Global Styles ----------------------------------- */
const globalStyles = `
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
    overflow: hidden;
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
  }
  
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
  
  /* Recommendations */
  .recommendation-banner {
    border-radius: 14px;
    border: 1px solid rgba(245,158,11,0.2);
    background: linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%);
    padding: 14px;
  }
  
  @media (min-width: 640px) {
    .recommendation-banner {
      padding: 18px;
      border-radius: 16px;
    }
  }
  
  .recommendation-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(0,0,0,0.2);
    margin-bottom: 8px;
    font-size: 13px;
    line-height: 1.5;
    border: 1px solid rgba(255,255,255,0.03);
  }
  
  @media (min-width: 640px) {
    .recommendation-item {
      padding: 12px 14px;
      font-size: 14px;
    }
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
  }
  
  html[data-theme="light"] .kpi-secondary:hover {
    background: #f8fafc !important;
    border-color: #cbd5e1 !important;
  }
  
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
  
  /* Recommendations */
  html[data-theme="light"] .recommendation-banner {
    background: linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.03) 100%) !important;
    border-color: rgba(217,119,6,0.3) !important;
  }
  
  html[data-theme="light"] .recommendation-item {
    background: rgba(0,0,0,0.03) !important;
    border-color: rgba(0,0,0,0.05) !important;
    color: #334155 !important;
  }
  
  html[data-theme="light"] .recommendation-item * {
    color: #334155 !important;
  }
  
  html[data-theme="light"] .recommendation-item span {
    color: #334155 !important;
  }
  
  html[data-theme="light"] .focus-title {
    color: #d97706 !important;
  }
  
  /* Catch-all for light mode text */
  html[data-theme="light"] .kpi-label,
  html[data-theme="light"] .kpi-sublabel,
  html[data-theme="light"] .header-subtitle {
    color: #64748b !important;
  }
  
  html[data-theme="light"] .header-subtitle span {
    color: #475569 !important;
  }
  
  /* Dark mode defaults (ensure text is light) */
  html[data-theme="dark"] .kpi-label,
  html[data-theme="dark"] .kpi-sublabel,
  html[data-theme="dark"] .header-subtitle,
  html[data-theme="dark"] .header-subtitle span,
  html[data-theme="dark"] .recommendation-item,
  html[data-theme="dark"] .recommendation-item *,
  html[data-theme="dark"] .status-pill,
  html[data-theme="dark"] .btn,
  html[data-theme="dark"] .btn-muted,
  html[data-theme="dark"] .panel h2,
  html[data-theme="dark"] .panel p {
    color: rgba(234,241,255,0.7) !important;
  }
  
  html[data-theme="dark"] .text-primary,
  html[data-theme="dark"] .panel h2 {
    color: #EAF1FF !important;
  }
  
  html[data-theme="dark"] .focus-title {
    color: #f59e0b !important;
  }
  
  html[data-theme="dark"] svg text,
  html[data-theme="dark"] .chart-axis-label {
    fill: rgba(234,241,255,0.5) !important;
  }
  
  html[data-theme="dark"] .chart-title {
    color: #EAF1FF !important;
  }
  
  html[data-theme="dark"] .chart-subtitle,
  html[data-theme="dark"] .chart-label {
    color: rgba(234,241,255,0.5) !important;
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
  
  html[data-theme="light"] .btn-muted {
    color: #64748b !important;
  }
  
  /* Status Pills */
  html[data-theme="light"] .status-pill {
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
  
  /* SVG Charts - Default (dark mode) */
  svg text {
    fill: rgba(234,241,255,0.5);
  }
  
  svg line {
    stroke: rgba(255,255,255,0.06);
  }
  
  /* SVG Charts - Light mode */
  html[data-theme="light"] svg text {
    fill: #64748b !important;
  }
  
  html[data-theme="light"] svg line {
    stroke: #e2e8f0 !important;
  }
  
  /* Controls component - Light mode */
  html[data-theme="light"] .controls-wrapper select,
  html[data-theme="light"] .controls-wrapper button {
    background: #ffffff !important;
    border-color: #e2e8f0 !important;
    color: #334155 !important;
  }
  
  html[data-theme="light"] .controls-wrapper select:hover,
  html[data-theme="light"] .controls-wrapper button:hover {
    background: #f8fafc !important;
    border-color: #cbd5e1 !important;
  }
  
  html[data-theme="light"] .controls-wrapper label,
  html[data-theme="light"] .controls-wrapper span {
    color: #475569 !important;
  }
  
  /* Action List Tabs */
  .action-tabs {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: rgba(255,255,255,0.04);
    border-radius: 12px;
    margin-bottom: 16px;
  }
  
  .action-tab {
    flex: 1;
    min-width: 0;
    padding: 10px 8px;
    border: none;
    background: transparent;
    color: rgba(234,241,255,0.6);
    font-size: 12px;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    white-space: nowrap;
  }
  
  .action-tab:hover {
    background: rgba(255,255,255,0.06);
    color: rgba(234,241,255,0.8);
  }
  
  .action-tab.active {
    background: rgba(255,255,255,0.1);
    color: #EAF1FF;
  }
  
  .action-tab .tab-label {
    display: none;
  }
  
  .action-tab .badge {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
    background: rgba(255,255,255,0.1);
  }
  
  .action-tab.active .badge {
    background: rgba(90,166,255,0.3);
    color: #5aa6ff;
  }
  
  @media (min-width: 480px) {
    .action-tab {
      padding: 10px 12px;
      font-size: 13px;
      gap: 6px;
    }
    
    .action-tab .tab-label {
      display: inline;
    }
  }
  
  @media (min-width: 640px) {
    .action-tab {
      padding: 10px 16px;
      gap: 8px;
    }
  }
  
  html[data-theme="light"] .action-tabs {
    background: #f1f5f9 !important;
  }
  
  html[data-theme="light"] .action-tab {
    color: #64748b !important;
  }
  
  html[data-theme="light"] .action-tab:hover {
    background: #e2e8f0 !important;
    color: #334155 !important;
  }
  
  html[data-theme="light"] .action-tab.active {
    background: #ffffff !important;
    color: #1e293b !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  html[data-theme="light"] .action-tab .badge {
    background: #e2e8f0 !important;
    color: #475569 !important;
  }
  
  html[data-theme="light"] .action-tab.active .badge {
    background: rgba(90,166,255,0.2) !important;
    color: #2563eb !important;
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

  /* Demo banner */
.demo-banner {
  background: linear-gradient(135deg, #7c5cff, #5aa6ff);
  color: white;
  padding: 12px 20px;
  text-align: center;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.5px;
}
`;

/* ----------------------------------- UI ----------------------------------- */
const theme = {
  text: "#EAF1FF",
  sub: "rgba(234,241,255,0.7)",
  mut: "rgba(234,241,255,0.5)",
  faint: "rgba(234,241,255,0.3)",
};


/* -------------------------------- Page -------------------------------- */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    start?: string;
    end?: string;
    g?: Granularity;
    chart?: ChartType;
    unscheduled_min_days?: string;
    checkout?: string;
    demo?: string;
    sync_error?: string;
  }>;
}) {
  const sp = await searchParams;
  const isDemo = sp.demo === "true";
  const syncError = sp.sync_error;

  if (isDemo) {
    const money = moneyFactory(DEMO_DATA.currencyCode);
    
    const demoPoints = {
      leak: DEMO_DATA.trendLabels.map((label, i) => ({
        xLabel: label,
        value: DEMO_DATA.leakTrend[i],
        tooltip: `${label}: ${money(DEMO_DATA.leakTrend[i])} quote leak balance`,
      })),
      ar15: DEMO_DATA.trendLabels.map((label, i) => ({
        xLabel: label,
        value: DEMO_DATA.ar15Trend[i],
        tooltip: `${label}: ${money(DEMO_DATA.ar15Trend[i])} invoices 15+ days`,
      })),
      unsched: DEMO_DATA.trendLabels.map((label, i) => ({
        xLabel: label,
        value: DEMO_DATA.unschedTrend[i],
        tooltip: `${label}: ${DEMO_DATA.unschedTrend[i]} unscheduled jobs`,
      })),
    };

    const chartType: ChartType = "line";

    const agedARExportData = DEMO_DATA.agedARInvoices.map((inv) => ({
      "Age (days)": inv.days_overdue,
      "Invoice #": inv.invoice_number,
      "Client": inv.client_name,
      "Due Date": new Date(inv.due_date).toLocaleDateString(),
      "Amount": (inv.amount_cents / 100).toFixed(2),
      "Jobber URL": inv.jobber_url,
    }));

    const unscheduledExportData = DEMO_DATA.unscheduledRows.map((r) => ({
      "Age (days)": Math.round((Date.now() - new Date(r.created_at_jobber).getTime()) / 86400000),
      "Job #": `#${r.job_number}`,
      "Job Title": r.job_title,
      "Created": new Date(r.created_at_jobber).toLocaleDateString(),
      "Amount": (r.total_amount_cents / 100).toFixed(2),
      "Jobber URL": r.jobber_url,
    }));

    const leakingQuotesExportData = DEMO_DATA.leakCandidates.map((q) => ({
      "Age (days)": Math.round((Date.now() - new Date(q.sent_at).getTime()) / 86400000),
      "Quote #": q.quote_number,
      "Quote Title": q.quote_title,
      "Sent": new Date(q.sent_at).toLocaleDateString(),
      "Total": (q.quote_total_cents / 100).toFixed(2),
      "Jobber URL": q.quote_url,
    }));

    const sevColor = (sev: "critical" | "warning" | "good") => {
      if (sev === "critical") return "#ef4444";
      if (sev === "warning") return "#f59e0b";
      return "#10b981";
    };

    const sevBg = (sev: "critical" | "warning" | "good") => {
      if (sev === "critical") return "rgba(239,68,68,0.15)";
      if (sev === "warning") return "rgba(245,158,11,0.15)";
      return "rgba(16,185,129,0.15)";
    };

    const arSev = severityFromScore(clamp((DEMO_DATA.b15p / DEMO_DATA.totalAR) * 120, 0, 100));

    return (
      <main className="dashboard-main" style={{
        minHeight: "100vh",
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: `
          radial-gradient(ellipse 80% 60% at 50% -20%, rgba(124,92,255,0.15), transparent),
          radial-gradient(ellipse 60% 40% at 100% 0%, rgba(90,166,255,0.1), transparent),
          linear-gradient(180deg, #060811 0%, #0a1020 100%)
        `,
      }}>
        <style>{globalStyles}</style>

  

        <div className="dashboard-container" data-testid="DEMO-MODE-ACTIVE">
          <header className="dashboard-header animate-in">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <svg width="40" height="40" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c5cff" />
                    <stop offset="100%" stopColor="#5aa6ff" />
                  </linearGradient>
                </defs>
                <circle cx="25" cy="25" r="22" fill="none" stroke="url(#logoGrad)" strokeWidth="3"/>
                <polyline points="8,25 16,25 21,12 29,38 34,20 42,25" fill="none" stroke="url(#logoGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <h1 className="text-primary" style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>
                  {DEMO_DATA.companyName}
                </h1>
                <p className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>
                  Last sync: {DEMO_DATA.lastSyncPretty} • {DEMO_DATA.currencyCode}
                </p>
              </div>
            </div>

            <div className="header-actions">
              <button className="btn" disabled style={{ opacity: 0.5 }}>Sync</button>
              <ThemeToggle />
              <div className="status-pill" style={{
                borderRadius: 10,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(16,185,129,0.15)",
                border: "1px solid rgba(16,185,129,0.4)",
              }}>
                <span style={{ fontSize: 10 }}>⭐</span>
                Pro
              </div>
            </div>
          </header>

          <div className="recommendation-banner animate-in delay-1" style={{ marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>💡</span>
              <span className="focus-title" style={{ fontSize: 13, fontWeight: 700 }}>This Week&apos;s Focus</span>
            </div>
            {DEMO_DATA.recommendations.map((rec, i) => (
              <div key={i} className="recommendation-item">
                <span style={{ fontSize: 14 }}>{rec.icon}</span>
                <span className="text-secondary">{rec.text}</span>
              </div>
            ))}
          </div>

          <div className="kpi-grid-primary animate-in delay-2" style={{ marginTop: 20 }}>
            <div className="kpi-primary gradient-purple hover-lift">
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>💰</span>
                  <span className="text-secondary" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Total Invoices Past Due
                  </span>
                </div>
                <div className="kpi-value-large text-primary">{money(DEMO_DATA.totalAR)}</div>
                <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
                  9 invoices outstanding
                </div>
              </div>
            </div>

            <div className="kpi-primary hover-lift" style={{
              background: `linear-gradient(145deg, ${sevBg(arSev)} 0%, rgba(255,255,255,0.02) 100%)`,
              borderColor: `${sevColor(arSev)}40`,
            }}>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>⚠️</span>
                  <span className="text-secondary" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Invoices 15+ Days
                  </span>
                </div>
                <div className={`kpi-value-large ${arSev === "critical" ? "text-critical" : arSev === "warning" ? "text-warning" : "text-success"}`}>
                  {money(DEMO_DATA.b15p)}
                </div>
                <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
                  {pct(DEMO_DATA.b15p / DEMO_DATA.totalAR)} of total • {DEMO_DATA.agedARInvoices.length} invoices
                </div>
              </div>
            </div>

            <div className="kpi-primary hover-lift" style={{
              background: "linear-gradient(145deg, rgba(239,68,68,0.08) 0%, rgba(255,255,255,0.02) 100%)",
              borderColor: "rgba(239,68,68,0.3)",
            }}>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>📋</span>
                  <span className="text-secondary" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Quote Leak
                  </span>
                </div>
                <div className="kpi-value-large text-critical">
                  {money(DEMO_DATA.leakDollars)}
                </div>
                <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
                  {DEMO_DATA.leakCount} quotes outstanding
                </div>
              </div>
            </div>
          </div>

          <div className="kpi-grid-secondary animate-in delay-3" style={{ marginTop: 20 }}>
            <div className="kpi-secondary">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, minHeight: 32 }}>
                <span style={{ fontSize: 14 }}>✏️</span>
                <span className="text-secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Changes Requested</span>
              </div>
              <div className="kpi-value-medium text-warning">{DEMO_DATA.changesRequestedCount}</div>
              <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Quotes to revise</div>
            </div>

            <div className="kpi-secondary">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, minHeight: 32 }}>
                <span style={{ fontSize: 14 }}>✅</span>
                <span className="text-secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Approved No Job</span>
              </div>
              <div className="kpi-value-medium text-warning">{DEMO_DATA.approvedNoJobCount}</div>
              <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Quotes to schedule</div>
            </div>

            <div className="kpi-secondary">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, minHeight: 32 }}>
                <span style={{ fontSize: 14 }}>📦</span>
                <span className="text-secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Unscheduled</span>
              </div>
              <div className="kpi-value-medium text-warning">{DEMO_DATA.unscheduledCount}</div>
              <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Jobs in backlog</div>
            </div>

            <div className="kpi-secondary">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, minHeight: 32 }}>
                <span style={{ fontSize: 14 }}>📥</span>
                <span className="text-secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Open Requests</span>
              </div>
              <div className="kpi-value-medium text-success">{DEMO_DATA.openRequestsCount}</div>
              <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Pending work requests</div>
            </div>
          </div>

          <div className="animate-in delay-4" style={{ marginTop: 32 }}>
            <TrendsSection
              leakPoints={demoPoints.leak}
              ar15Points={demoPoints.ar15}
              unschedPoints={demoPoints.unsched}
              chartType={chartType}
              rangeLabel="2024-12-09 → 2025-01-27"
              granularityLabel="Weekly"
            />
          </div>

          <div className="panel animate-in delay-5" style={{ marginTop: 32 }}>
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h2 className="text-primary" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Action Lists</h2>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                Collect AR, schedule backlog, close sales leaks
              </p>
            </div>

            <div style={{ padding: 16 }}>
              <ActionListTabs
                agedARInvoices={DEMO_DATA.agedARInvoices}
                agedARExportData={agedARExportData}
                unscheduledRows={DEMO_DATA.unscheduledRows}
                unscheduledExportData={unscheduledExportData}
                leakCandidates={DEMO_DATA.leakCandidates}
                leakingQuotesExportData={leakingQuotesExportData}
                openRequests={DEMO_DATA.openRequests}
                openRequestsExportData={DEMO_DATA.openRequests.map((r: any) => ({
                  "Age (days)": r.created_at_jobber ? Math.max(0, Math.round((Date.now() - new Date(r.created_at_jobber).getTime()) / 86400000)) : 0,
                  "Title": r.title || "Untitled",
                  "Client": r.client_name || "",
                  "Source": r.source || "",
                  "Created": r.created_at_jobber ? new Date(r.created_at_jobber).toLocaleDateString() : "",
                  "Jobber URL": r.jobber_url || "",
                }))}
                currencyCode={DEMO_DATA.currencyCode}
              />
            </div>
          </div>

          <footer style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            textAlign: "center",
            fontSize: 12,
            color: "rgba(234,241,255,0.4)",
          }}>
            <p style={{ margin: 0 }}>© 2026 OwnerView. All rights reserved.</p>
            <p style={{ margin: "8px 0 0" }}>
              <a href="/terms" style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none" }}>Terms</a>
              {" · "}
              <a href="/privacy" style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none" }}>Privacy</a>
            </p>
          </footer>
        </div>
      </main>
    );
  }

  const user = await getUser();
  if (!user) redirect("/login");

  // Get the user's connection
  const { data: connection } = await supabaseAdmin
    .from("jobber_connections")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection) {
    return (
      <div style={{ padding: 24, color: "#EAF1FF", minHeight: "100vh", background: "#060811" }}>
        <h2>No Jobber account connected</h2>
        <p style={{ marginTop: 8, color: theme.sub }}>See Your Numbers Now.</p>
        <a href="/jobber" style={{ color: "#5aa6ff", marginTop: 16, display: "inline-block" }}>Connect Jobber →</a>
      </div>
    );
  }

  const connectionId = connection.id;

  // Connection summary (including billing info)
  const { data: conn } = await supabaseAdmin
    .from("jobber_connections")
    .select("last_sync_at,trial_started_at,trial_ends_at,billing_status,currency_code,company_name,jobber_account_name")
    .eq("id", connectionId)
    .maybeSingle();

  const companyName = conn?.jobber_account_name || conn?.company_name || "Your Company";

  // Check billing status for paywall
  const billingStatus = conn?.billing_status ?? "trialing";
  const trialEndsAt = conn?.trial_ends_at ? new Date(conn.trial_ends_at).getTime() : 0;
  const trialActive = billingStatus === "trialing" && trialEndsAt > Date.now();
  const subscriptionActive = billingStatus === "active";
  const hasAccess = trialActive || subscriptionActive;

  // Block entire dashboard if no access
  if (!hasAccess) {
    return (
      <main style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #060811 0%, #0A1222 100%)",
        padding: 24,
      }}>
        <style>{globalStyles}</style>
        <div className="animate-in" style={{
          maxWidth: 420,
          width: "100%",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
          padding: "48px 32px",
          textAlign: "center",
          boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
        }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: "linear-gradient(135deg, #7c5cff, #5aa6ff)",
            margin: "0 auto 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 40px rgba(90,166,255,0.3)",
          }}>
            <span style={{ fontSize: 32 }}>🔒</span>
          </div>
          
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#EAF1FF", marginBottom: 12 }}>
            {billingStatus === "trialing" ? "Trial Expired" : "Subscribe to Access"}
          </h1>
          
          <p style={{ fontSize: 15, color: "rgba(234,241,255,0.6)", lineHeight: 1.6, marginBottom: 32 }}>
            Your 14-day free trial has ended. Subscribe to continue accessing your AccuInsight dashboard.
          </p>

          <form action="/api/billing/checkout" method="POST">
            <button type="submit" className="btn-primary" style={{
              width: "100%",
              padding: "16px 24px",
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 16,
              border: "none",
              cursor: "pointer",
            }}>
              Subscribe — $29/month
            </button>
          </form>
          
          <p style={{ marginTop: 20, fontSize: 13, color: "rgba(234,241,255,0.4)" }}>
            Cancel anytime • Instant access
          </p>
        </div>
      </main>
    );
  }

  const g: Granularity = (sp.g ?? "week") as Granularity;
  const chartType: ChartType = (sp.chart ?? "line") as ChartType;

  const rangePreset = sp.range ?? "8w";

  const todayUTC = startOfDayUTC(new Date());
  const preset = (() => {
    if (rangePreset === "7d") return { start: addDaysUTC(todayUTC, -7), end: todayUTC };
    if (rangePreset === "30d") return { start: addDaysUTC(todayUTC, -30), end: todayUTC };
    if (rangePreset === "90d") return { start: addDaysUTC(todayUTC, -90), end: todayUTC };
    if (rangePreset === "ytd") return { start: new Date(Date.UTC(todayUTC.getUTCFullYear(), 0, 1)), end: todayUTC };
    return { start: addDaysUTC(todayUTC, -56), end: todayUTC };
  })();

  const start = parseISODateOnly(sp.start ?? "") ?? preset.start;
  const end = parseISODateOnly(sp.end ?? "") ?? preset.end;
  const endExclusive = addDaysUTC(end, 1);

  const minDays = Number(sp.unscheduled_min_days ?? "0");
  const nextMinDays = minDays >= 7 ? 0 : 7;

  // Build toggle URL server-side
  const qp = new URLSearchParams();
  if (sp.range) qp.set("range", sp.range);
  if (sp.start) qp.set("start", sp.start);
  if (sp.end) qp.set("end", sp.end);
  if (sp.g) qp.set("g", sp.g);
  if (sp.chart) qp.set("chart", sp.chart);
  if (nextMinDays) qp.set("unscheduled_min_days", String(nextMinDays));
  const toggleUnscheduledHref = `/jobber/dashboard?${qp.toString()}`;

  const currencyCode = (conn?.currency_code || "USD").toUpperCase();
  const money = moneyFactory(currencyCode);

  const lastSyncPretty = conn?.last_sync_at ? formatSyncTime(new Date(conn.last_sync_at)) : "Not synced yet";

  // Fetch facts IN PARALLEL
  const [
    { data: invoicesData },
    { data: jobsData },
    { data: quotesData },
    { data: requestsData },
  ] = await Promise.all([
    supabaseAdmin.from("fact_invoices").select("*").eq("connection_id", connectionId),
    supabaseAdmin.from("fact_jobs").select("*").eq("connection_id", connectionId),
    supabaseAdmin
      .from("fact_quotes")
      .select("jobber_quote_id,quote_number,quote_title,quote_status,quote_total_cents,quote_url,sent_at,updated_at_jobber,created_at_jobber")
      .eq("connection_id", connectionId),
    supabaseAdmin
      .from("fact_requests")
      .select("jobber_request_id,title,request_status,source,client_name,jobber_url,created_at_jobber")
      .eq("connection_id", connectionId),
  ]);

  const invoices = (invoicesData ?? []) as any[];
  const jobs = (jobsData ?? []) as any[];
  const quotes = (quotesData ?? []) as any[];
  const requests = (requestsData ?? []) as any[];
  console.log("REQUESTS FROM DB:", requests);
  console.log("FILTERED REQUESTS:", requests.filter((r: any) => {
    const status = (r.request_status || "").toUpperCase();
    return status === "NEW" || status === "PENDING" || status === "UNSCHEDULED" || status === "ASSESSMENT_COMPLETED" || status === "ACTION_REQUIRED";
  }));
  console.log("openRequestsCount:", requests.filter((r: any) => {
    const status = (r.request_status || "").toUpperCase();
    return status === "NEW" || status === "PENDING" || status === "UNSCHEDULED" || status === "ASSESSMENT_COMPLETED" || status === "ACTION_REQUIRED";
  }).length);
  
  // Open requests count (PENDING = not yet converted/archived/closed)
  const openRequestsCount = requests.filter((r: any) => {
  const status = (r.request_status || "").toUpperCase();
  // Open requests: NEW, PENDING, UNSCHEDULED, or ASSESSMENT_COMPLETED (action required)
  return status === "NEW" || status === "PENDING" || status === "UNSCHEDULED" || status === "ASSESSMENT_COMPLETED" || status === "ACTION_REQUIRED";
}).length;

  // AR buckets - only unpaid invoices
  const nowMs = Date.now();
  let b0_7 = 0, b8_14 = 0, b15p = 0, totalAR = 0;
  
  // Filter to only unpaid invoices (awaiting_payment, overdue, etc.)
  const unpaidInvoices = invoices.filter((inv: any) => {
    const status = (inv.status || '').toLowerCase();
    // Exclude paid, draft, and voided invoices
    return status !== 'paid' && status !== 'draft' && status !== 'voided' && status !== 'bad_debt';
  });
  
  for (const inv of unpaidInvoices) {
    const amt = Number(inv.balance_cents ?? inv.total_amount_cents ?? 0);
    totalAR += amt;
    
    const due = safeDate(inv.due_at ?? inv.dueDate ?? inv.due_date);
    if (!due) continue;
    const days = (nowMs - due.getTime()) / 86400000;
    
    if (days > 0 && days <= 7) b0_7 += amt;
    else if (days > 7 && days <= 14) b8_14 += amt;
    else if (days > 14) b15p += amt;
  }
  const riskPct = totalAR > 0 ? b15p / totalAR : 0;
  const arScore = clamp(riskPct * 120, 0, 100);
  const arSev = severityFromScore(arScore);

  // Unscheduled count
  const unscheduledCount = jobs.filter((j) => !j.scheduled_start_at).length;

  // Completed & profitability
  const completedDateKeys = ["completed_at_jobber", "completed_at", "completedAt", "completedAtJobber"];

  const completedInRange = jobs.filter((j) => {
    const raw = completedDateKeys.map((k) => j[k]).find((v) => v);
    const dt = safeDate(raw);
    if (!dt) return false;
    return dt.getTime() >= start.getTime() && dt.getTime() < endExclusive.getTime();
  });

  const completedCount = completedInRange.length;
  const revSum = completedInRange.reduce((sum, j) => sum + Number(j.job_revenue_cents ?? 0), 0);
  const profitSum = completedInRange.reduce((sum, j) => {
    const p = j.job_profit_cents;
    if (p !== null && p !== undefined) return sum + Number(p);
    return sum + (Number(j.job_revenue_cents ?? 0) - Number(j.job_cost_cents ?? 0));
  }, 0);

  const marginPerJob = completedCount ? Math.round(profitSum / completedCount) : 0;

  // Quote leak - quotes that are sent but not won
  const leakCandidates = quotes
    .filter((q) => q.sent_at)
    .filter((q) => {
      const st = String(q.quote_status ?? "").toLowerCase().trim();
      if (!st) return true;
      if (st === "archived" || st === "draft") return false;
      return !statusLooksWon(st);
    });

  // Filter leak candidates to range for the KPI card
  const leakCandidatesInRange = leakCandidates.filter((q) => {
    const dt = safeDate(q.sent_at);
    if (!dt) return false;
    return dt.getTime() >= start.getTime() && dt.getTime() < endExclusive.getTime();
  });

  const leakCount = leakCandidatesInRange.length;
  const leakDollars = leakCandidatesInRange.reduce((sum, q) => sum + Number(q.quote_total_cents ?? 0), 0);

  // Quotes with changes requested
  const changesRequestedQuotes = quotes.filter((q) => {
    const st = String(q.quote_status ?? "").toLowerCase().trim();
    return st === "changes_requested";
  });
  const changesRequestedCount = changesRequestedQuotes.length;

  // Quotes approved but no job created yet (not converted)
  const approvedNoJobQuotes = quotes.filter((q) => {
    const st = String(q.quote_status ?? "").toLowerCase().trim();
    return st === "approved";
  });
  const approvedNoJobCount = approvedNoJobQuotes.length;

  // Quote Won % (last 30 days)
  // Numerator: quotes marked won in last 30 days
  // Denominator: ALL quotes sent in last 30 days (including outstanding)
  const thirtyDaysAgo = addDaysUTC(todayUTC, -30);
  
  const quotesInLast30Days = quotes.filter((q) => {
  const st = String(q.quote_status ?? "").toLowerCase().trim();
  if (st === "draft") return false;
  
  const date = safeDate(q.sent_at) || safeDate(q.created_at_jobber);
  if (!date) return false;
  
  return date.getTime() >= thirtyDaysAgo.getTime();
});

const quotesWonLast30Days = quotesInLast30Days.filter((q) => {
  const st = String(q.quote_status ?? "").toLowerCase().trim();
  return statusLooksWon(st);
});

const quoteWonPct = quotesInLast30Days.length > 0 
  ? quotesWonLast30Days.length / quotesInLast30Days.length 
  : 0;
  // Aged AR - only unpaid invoices
  const agedARInvoices = unpaidInvoices
    .filter((inv: any) => {
      const due = safeDate(inv.due_at);
      if (!due) return false;
      const daysOverdue = Math.max(0, Math.round((Date.now() - due.getTime()) / 86400000));
      return daysOverdue >= 15;
    })
    .map((inv) => ({
      invoice_number: inv.invoice_number || "—",
      client_name: inv.client_name || "",
      amount_cents: inv.balance_cents || inv.total_amount_cents || 0,
      days_overdue: Math.max(0, Math.round((Date.now() - (safeDate(inv.due_at)?.getTime() || Date.now())) / 86400000)),
      due_date: inv.due_at,
      jobber_url: inv.jobber_url || (inv.jobber_invoice_id ? `https://secure.getjobber.com/invoices/${inv.jobber_invoice_id}` : null),
    }));

  // Invoices hitting 7 days overdue this week (for recommendations)
  const sevenDaysFromNow = addDaysUTC(todayUTC, 7);
  const invoicesHitting7DaysThisWeek = unpaidInvoices.filter((inv: any) => {
    const due = safeDate(inv.due_at);
    if (!due) return false;
    const daysOverdue = Math.round((nowMs - due.getTime()) / 86400000);
    // Currently 0-6 days overdue, will hit 7 within next 7 days
    return daysOverdue >= 0 && daysOverdue < 7;
  });

  // Unscheduled jobs older than 7 days (for recommendations)
  const ageDays = (ts: string | null) => {
    if (!ts) return 0;
    const d = safeDate(ts);
    if (!d) return 0;
    return Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000));
  };

  const unscheduledOlderThan7Days = jobs.filter((j) => {
    if (j.scheduled_start_at) return false;
    return ageDays(j.created_at_jobber) >= 7;
  });

  // Unscheduled list
  const { data: unsched } = await supabaseAdmin
    .from("fact_jobs")
    .select("job_number,job_title,created_at_jobber,jobber_url,total_amount_cents,scheduled_start_at")
    .eq("connection_id", connectionId)
    .is("scheduled_start_at", null)
    .order("created_at_jobber", { ascending: true })
    .limit(200);

  const rawUn = (unsched ?? []) as any[];

  let unscheduledRows = minDays > 0 ? rawUn.filter((r) => ageDays(r.created_at_jobber) >= minDays) : rawUn;
  unscheduledRows = unscheduledRows.slice(0, 10);

  // Buckets for trends
  const bucketStarts: Date[] = [];
  let cur = bucketStartUTC(start, g);
  while (cur.getTime() < endExclusive.getTime()) {
    bucketStarts.push(cur);
    const nxt = nextBucketUTC(cur, g);
    if (nxt.getTime() === cur.getTime()) break;
    cur = nxt;
    if (bucketStarts.length > 200) break;
  }

  // POINT-IN-TIME Quote Leak by bucket
  // A quote enters leak when sent_at is reached (if not won)
  // A quote exits leak when it becomes won (use updated_at_jobber as proxy)
  const leakByBucket = bucketStarts.map((bs) => {
    const bucketEndTs = nextBucketUTC(bs, g).getTime();
    let sum = 0;
    
    for (const q of quotes) {
      const sentAt = safeDate(q.sent_at);
      if (!sentAt) continue;
      
      const amt = Number(q.quote_total_cents ?? 0);
      const st = String(q.quote_status ?? "").toLowerCase().trim();
      const isWon = statusLooksWon(st);
      const wonAt = isWon ? safeDate(q.updated_at_jobber) : null;
      
      // Skip archived/draft
      if (st === "archived" || st === "draft") continue;
      
      // Quote enters leak when sent
      const enterTs = sentAt.getTime();
      
      // Quote exits leak when won
      const exitTs = wonAt ? wonAt.getTime() : null;
      
      // Is it in leak at bucket end?
      const enteredBeforeBucketEnd = enterTs < bucketEndTs;
      const exitedBeforeBucketEnd = exitTs && exitTs < bucketEndTs;
      
      if (enteredBeforeBucketEnd && !exitedBeforeBucketEnd) {
        sum += amt;
      }
    }
    return sum;
  });

  // POINT-IN-TIME AR 15+ by bucket
  // Invoice enters AR 15+ when due_at + 15 days is reached
  // Invoice exits AR 15+ when paid (paid_at is set)
  const ar15ByBucket = bucketStarts.map((bs) => {
    const bucketEndTs = nextBucketUTC(bs, g).getTime();
    let sum = 0;
    
    for (const inv of invoices) {
      const due = safeDate(inv.due_at ?? inv.dueDate ?? inv.due_date);
      if (!due) continue;
      
      const amt = Number(inv.total_amount_cents ?? inv.total_cents ?? inv.total_amount ?? 0);
      const paidAt = safeDate(inv.paid_at);
      
      // Invoice enters AR 15+ at due_at + 15 days
      const enterTs = due.getTime() + (15 * 24 * 60 * 60 * 1000);
      
      // Invoice exits AR 15+ when paid
      const exitTs = paidAt ? paidAt.getTime() : null;
      
      // Is it in AR 15+ at bucket end?
      const enteredBeforeBucketEnd = enterTs < bucketEndTs;
      const exitedBeforeBucketEnd = exitTs && exitTs < bucketEndTs;
      
      if (enteredBeforeBucketEnd && !exitedBeforeBucketEnd) {
        sum += amt;
      }
    }
    return sum;
  });

  // POINT-IN-TIME Unscheduled by bucket
  // Job enters backlog when created (created_at_jobber)
  // Job exits backlog when scheduled (scheduled_start_at is set)
  const unschedByBucket = bucketStarts.map((bs) => {
    const bucketEndTs = nextBucketUTC(bs, g).getTime();
    let cnt = 0;
    
    for (const j of jobs) {
      const createdAt = safeDate(j.created_at_jobber);
      if (!createdAt) continue;
      
      const scheduledAt = safeDate(j.scheduled_start_at);
      
      // Job enters backlog when created
      const enterTs = createdAt.getTime();
      
      // Job exits backlog when scheduled
      const exitTs = scheduledAt ? scheduledAt.getTime() : null;
      
      // Is it unscheduled at bucket end?
      const enteredBeforeBucketEnd = enterTs < bucketEndTs;
      const exitedBeforeBucketEnd = exitTs && exitTs < bucketEndTs;
      
      if (enteredBeforeBucketEnd && !exitedBeforeBucketEnd) {
        cnt += 1;
      }
    }
    return cnt;
  });

  const points = {
    leak: bucketStarts.map((bs, i) => {
      const label = labelForBucket(bs, g);
      const v = leakByBucket[i];
      return { xLabel: label, value: v, tooltip: `${label}: ${money(v)} quote leak balance` };
    }),
    ar15: bucketStarts.map((bs, i) => {
      const label = labelForBucket(bs, g);
      const v = ar15ByBucket[i];
      return { xLabel: label, value: v, tooltip: `${label}: ${money(v)} invoices 15+ days` };
    }),
    unsched: bucketStarts.map((bs, i) => {
      const label = labelForBucket(bs, g);
      const v = unschedByBucket[i];
      return { xLabel: label, value: v, tooltip: `${label}: ${v} unscheduled jobs` };
    }),
  };

  // Generate recommendations
  type Recommendation = { icon: string; text: string; priority: "high" | "medium" };
  const recommendations: Recommendation[] = [];
  
  if (b15p > 0 && totalAR > 0) {
    const pct15 = b15p / totalAR;
    const agedCount = agedARInvoices.length;
    if (pct15 > 0.15) {
      recommendations.push({
        icon: "🔴",
        text: `${money(b15p)} overdue 15+ days (${agedCount} invoices). Priority: Call top 3 oldest accounts today.`,
        priority: "high"
      });
    } else if (pct15 > 0.08) {
      recommendations.push({
        icon: "⚠️",
        text: `${money(b15p)} aging past 15 days (${agedCount} invoices). Send payment reminders this week.`,
        priority: "medium"
      });
    }
  }

  // Invoices hitting 7 days overdue this week
  if (invoicesHitting7DaysThisWeek.length > 0) {
    recommendations.push({
      icon: "📧",
      text: `${invoicesHitting7DaysThisWeek.length} invoice${invoicesHitting7DaysThisWeek.length > 1 ? 's' : ''} hitting 7 days overdue this week - send reminders now.`,
      priority: "medium"
    });
  }

  // Unscheduled jobs older than 7 days
  if (unscheduledOlderThan7Days.length > 0) {
    recommendations.push({
      icon: "📦",
      text: `${unscheduledOlderThan7Days.length} unscheduled job${unscheduledOlderThan7Days.length > 1 ? 's' : ''} older than 7 days - risk of customer churn.`,
      priority: unscheduledOlderThan7Days.length > 5 ? "high" : "medium"
    });
  }

  if (leakCount > 5) {
    const winRate = 0.25;
    const potentialWin = Math.round(leakDollars * winRate);
    recommendations.push({
      icon: "💰",
      text: `${leakCount} quotes pending (${money(leakDollars)} total). Follow up on top 5 - potential ${money(potentialWin)} recovery.`,
      priority: "medium"
    });
  }

  if (changesRequestedCount > 0) {
    recommendations.push({
      icon: "✏️",
      text: `${changesRequestedCount} quote${changesRequestedCount > 1 ? 's' : ''} waiting for revisions. Hot leads - respond within 24hrs.`,
      priority: "high"
    });
  }

  if (completedCount >= 5 && marginPerJob > 0) {
    const marginPct = profitSum / revSum;
    if (marginPct < 0.20) {
      recommendations.push({
        icon: "📊",
        text: `Margins at ${pct(marginPct)} (target: 25%+). Review pricing or reduce material/labor costs.`,
        priority: "medium"
      });
    }
  }

  // Prepare data for ExportCSV components
  const agedARExportData = agedARInvoices.map((inv) => ({
    "Age (days)": inv.days_overdue,
    "Invoice #": inv.invoice_number,
    "Client": inv.client_name || "",
    "Due Date": inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "",
    "Amount": (inv.amount_cents / 100).toFixed(2),
    "Jobber URL": inv.jobber_url || "",
  }));

  const unscheduledExportData = unscheduledRows.map((r: any) => ({
    "Age (days)": ageDays(r.created_at_jobber),
    "Job #": r.job_number ? `#${r.job_number}` : "",
    "Job Title": r.job_title || "Untitled job",
    "Created": r.created_at_jobber ? new Date(r.created_at_jobber).toLocaleDateString() : "",
    "Amount": r.total_amount_cents ? (r.total_amount_cents / 100).toFixed(2) : "",
    "Jobber URL": r.jobber_url || "",
  }));

  const leakingQuotesExportData = leakCandidatesInRange
    .slice()
    .sort((a: any, b: any) => Number(b.quote_total_cents ?? 0) - Number(a.quote_total_cents ?? 0))
    .slice(0, 10)
    .map((q: any) => {
      const sent = safeDate(q.sent_at);
      const age = sent ? Math.max(0, Math.round((Date.now() - sent.getTime()) / 86400000)) : 0;
      return {
        "Age (days)": age,
        "Quote #": q.quote_number || "",
        "Quote Title": q.quote_title || "Untitled quote",
        "Sent": sent ? sent.toLocaleDateString() : "",
        "Total": ((Number(q.quote_total_cents ?? 0)) / 100).toFixed(2),
        "Jobber URL": q.quote_url || "",
      };
    });

  const sevColor = (sev: "critical" | "warning" | "good") => {
    if (sev === "critical") return "#ef4444";
    if (sev === "warning") return "#f59e0b";
    return "#10b981";
  };

  const sevBg = (sev: "critical" | "warning" | "good") => {
    if (sev === "critical") return "rgba(239,68,68,0.15)";
    if (sev === "warning") return "rgba(245,158,11,0.15)";
    return "rgba(16,185,129,0.15)";
  };

  return (
    <main className="dashboard-main" style={{
      minHeight: "100vh",
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: `
        radial-gradient(ellipse 80% 60% at 50% -20%, rgba(124,92,255,0.15), transparent),
        radial-gradient(ellipse 60% 40% at 100% 0%, rgba(90,166,255,0.1), transparent),
        linear-gradient(180deg, #060811 0%, #0a1020 100%)
      `,
    }}>
      <style>{globalStyles}</style>

      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header animate-in">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="40" height="40" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c5cff" />
                  <stop offset="100%" stopColor="#5aa6ff" />
                </linearGradient>
              </defs>
              <circle cx="25" cy="25" r="22" fill="none" stroke="url(#logoGrad)" strokeWidth="3"/>
              <polyline points="8,25 16,25 21,12 29,38 34,20 42,25" fill="none" stroke="url(#logoGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <h1 className="text-primary" style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>
                {companyName}
              </h1>
              <p className="header-subtitle" style={{ fontSize: 13, marginTop: 4 }}>
                Last sync: <span>{lastSyncPretty}</span> • {currencyCode}
              </p>
            </div>
          </div>

          <div className="header-actions">
            <SyncButton connectionId={connectionId} />
            <ThemeToggle />
            
            {/* Status Pills */}

            <SubscriptionStatus billingStatus={billingStatus} trialEndsAt={trialEndsAt} />
            {subscriptionActive ? <ManageSubscriptionButton /> : <SubscribeButton />}
            <LogoutButton />
          </div>
        </header>

        {/* Empty State - Show when no data */}
        {invoices.length === 0 && jobs.length === 0 && quotes.length === 0 && (
          <div className="panel animate-in delay-1" style={{ 
            marginTop: 20, 
            padding: 32,
            textAlign: "center",
            background: "linear-gradient(145deg, rgba(124,92,255,0.1) 0%, rgba(90,166,255,0.05) 100%)",
            border: "1px solid rgba(124,92,255,0.2)",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Welcome to AccuInsight!</h2>
            <p style={{ fontSize: 15, opacity: 0.7, marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
              Let&apos;s pull in your Jobber data so you can see your business insights.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <SyncButton connectionId={connectionId} />
              <p style={{ fontSize: 13, opacity: 0.5 }}>
                This usually takes 1-2 minutes depending on your data volume.
              </p>
            </div>
            <div style={{ 
              marginTop: 32, 
              paddingTop: 24, 
              borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              justifyContent: "center",
              gap: 24,
              flexWrap: "wrap",
            }}>
              <a 
                href="https://ownerview.io/getting-started-with-accuinsight" 
                target="_blank" 
                rel="noreferrer"
                style={{ 
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 20px",
                  borderRadius: 10,
                  background: "rgba(124,92,255,0.15)",
                  border: "1px solid rgba(124,92,255,0.3)",
                  fontSize: 14,
                  color: "#a5b4fc", 
                  textDecoration: "none",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                }}
              >
                📖 Getting Started Guide
              </a>
              <a 
                href="https://ownerview.io/accuinsight-faq" 
                target="_blank" 
                rel="noreferrer"
                style={{ 
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 20px",
                  borderRadius: 10,
                  background: "rgba(90,166,255,0.15)",
                  border: "1px solid rgba(90,166,255,0.3)",
                  fontSize: 14,
                  color: "#93c5fd", 
                  textDecoration: "none",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                }}
              >
                ❓ FAQ
              </a>
            </div>
          </div>
        )}

        {/* Sync Error Banner */}
        {syncError && (
          <div className="animate-in delay-1" style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 14,
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 600, color: "#fca5a5" }}>Sync failed</div>
              <div style={{ fontSize: 13, color: "rgba(234,241,255,0.7)", marginTop: 2 }}>
                {decodeURIComponent(syncError)}. <a href="/jobber/dashboard" style={{ color: "#5aa6ff" }}>Try again</a>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="recommendation-banner animate-in delay-1" style={{ marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>💡</span>
              <span className="focus-title" style={{ fontSize: 13, fontWeight: 700 }}>This Week&apos;s Focus</span>
            </div>
            {recommendations.slice(0, 3).map((rec, i) => (
              <div key={i} className="recommendation-item">
                <span style={{ fontSize: 14 }}>{rec.icon}</span>
                <span>{rec.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Primary KPIs */}
        <div className="kpi-grid-primary animate-in delay-2" style={{ marginTop: 20 }}>
          <div className="kpi-primary gradient-purple hover-lift">
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>💰</span>
                <span className="kpi-label" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Total Invoices Past Due
                </span>
              </div>
              <div className="kpi-value-large text-primary">{money(totalAR)}</div>
              <div className="kpi-sublabel" style={{ fontSize: 12, marginTop: 8 }}>
                {agedARInvoices.length} invoice{agedARInvoices.length !== 1 ? "s" : ""} outstanding
              </div>
            </div>
          </div>

          <div className="kpi-primary hover-lift" style={{
            background: `linear-gradient(145deg, ${sevBg(arSev === "critical" ? "critical" : arSev === "warning" ? "warning" : "good")} 0%, rgba(255,255,255,0.02) 100%)`,
            borderColor: `${sevColor(arSev)}40`,
          }}>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <span className="kpi-label" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Invoices 15+ Days
                </span>
              </div>
              <div className={`kpi-value-large ${arSev === "critical" ? "text-critical" : arSev === "warning" ? "text-warning" : "text-success"}`}>
                {money(b15p)}
              </div>
              <div className="kpi-sublabel" style={{ fontSize: 12, marginTop: 8 }}>
                {totalAR > 0 ? pct(b15p / totalAR) : "0%"} of total • {agedARInvoices.length} invoices
              </div>
            </div>
          </div>

          <div className="kpi-primary hover-lift" style={{
            background: `linear-gradient(145deg, rgba(239,68,68,0.08) 0%, rgba(255,255,255,0.02) 100%)`,
            borderColor: leakDollars > 0 ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)",
          }}>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>📋</span>
                <span className="kpi-label" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Quote Leak
                </span>
              </div>
              <div className={`kpi-value-large ${leakDollars > 0 ? "text-critical" : "text-success"}`}>
                {money(leakDollars)}
              </div>
              <div className="kpi-sublabel" style={{ fontSize: 12, marginTop: 8 }}>
                {leakCandidatesInRange.length} quote{leakCandidatesInRange.length !== 1 ? "s" : ""} outstanding
              </div>
            </div>
          </div>
        </div>

        {/* Secondary KPIs */}
        <div className="kpi-grid-secondary animate-in delay-3" style={{ marginTop: 20 }}>
          <div className="kpi-secondary">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, minHeight: 32 }}>
              <span style={{ fontSize: 14 }}>✏️</span>
              <span className="kpi-label" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Changes Requested</span>
            </div>
            <div className={`kpi-value-medium ${
              changesRequestedCount > 5 ? "text-critical" : 
              changesRequestedCount > 2 ? "text-warning" : "text-success"
            }`}>
              {changesRequestedCount}
            </div>
            <div className="kpi-label" style={{ fontSize: 11, marginTop: 4 }}>Quotes to revise</div>
          </div>

          <div className="kpi-secondary">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, minHeight: 32 }}>
              <span style={{ fontSize: 14 }}>✅</span>
              <span className="kpi-label" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Approved No Job</span>
            </div>
            <div className={`kpi-value-medium ${
              approvedNoJobCount > 5 ? "text-critical" : 
              approvedNoJobCount > 2 ? "text-warning" : "text-success"
            }`}>
              {approvedNoJobCount}
            </div>
            <div className="kpi-label" style={{ fontSize: 11, marginTop: 4 }}>Quotes to schedule</div>
          </div>

          <div className="kpi-secondary">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, minHeight: 32 }}>
              <span style={{ fontSize: 14 }}>📦</span>
              <span className="kpi-label" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Unscheduled</span>
            </div>
            <div className={`kpi-value-medium ${
              unscheduledCount > 10 ? "text-critical" : 
              unscheduledCount > 5 ? "text-warning" : "text-success"
            }`}>
              {unscheduledCount}
            </div>
            <div className="kpi-label" style={{ fontSize: 11, marginTop: 4 }}>Jobs in backlog</div>
          </div>

          <div className="kpi-secondary">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, minHeight: 32 }}>
              <span style={{ fontSize: 14 }}>📥</span>
              <span className="kpi-label" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Open Requests</span>
            </div>
            <div className={`kpi-value-medium ${
              openRequestsCount > 10 ? "text-critical" : 
              openRequestsCount > 5 ? "text-warning" : "text-success"
            }`}>
              {openRequestsCount}
            </div>
            <div className="kpi-label" style={{ fontSize: 11, marginTop: 4 }}>Pending work requests</div>
          </div>

        </div>

       {/* Trends */}
        <div className="animate-in delay-4" style={{ marginTop: 32 }}>
          <TrendsSection
            leakPoints={points.leak}
            ar15Points={points.ar15}
            unschedPoints={points.unsched}
            chartType={chartType}
            rangeLabel={`${toISODateOnlyUTC(start)} → ${toISODateOnlyUTC(end)}`}
            granularityLabel={g === "day" ? "Daily" : g === "week" ? "Weekly" : g === "month" ? "Monthly" : "Quarterly"}
          />
        </div>

        {/* Action Lists */}
        <div className="panel animate-in delay-5" style={{ marginTop: 32 }}>
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="text-primary" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Action Lists</h2>
            <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
              Collect AR, schedule backlog, close sales leaks
            </p>
          </div>

          <div style={{ padding: 16 }}>
            <ActionListTabs
              agedARInvoices={agedARInvoices}
              agedARExportData={agedARExportData}
              unscheduledRows={unscheduledRows}
              unscheduledExportData={unscheduledExportData}
              leakCandidates={leakCandidatesInRange.slice().sort((a: any, b: any) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())}
              leakingQuotesExportData={leakingQuotesExportData}
              openRequests={requests.filter((r: any) => {
  const status = (r.request_status || "").toUpperCase();
  return status === "NEW" || status === "PENDING" || status === "UNSCHEDULED" || status === "ASSESSMENT_COMPLETED" || status === "ACTION_REQUIRED";
})}
              openRequestsExportData={requests.filter((r: any) => {
  const status = (r.request_status || "").toUpperCase();
  return status === "NEW" || status === "PENDING" || status === "UNSCHEDULED" || status === "ASSESSMENT_COMPLETED" || status === "ACTION_REQUIRED";
}).map((r: any) => ({
                "Age (days)": r.created_at_jobber ? Math.max(0, Math.round((Date.now() - new Date(r.created_at_jobber).getTime()) / 86400000)) : 0,
                "Title": r.title || "Untitled",
                "Client": r.client_name || "",
                "Source": r.source || "",
                "Created": r.created_at_jobber ? new Date(r.created_at_jobber).toLocaleDateString() : "",
                "Jobber URL": r.jobber_url || "",
              }))}
              currencyCode={currencyCode}
            />
          </div>
        </div>

        {/* Footer */}
        <footer style={{
          marginTop: 40,
          paddingTop: 24,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
          fontSize: 12,
          color: "rgba(234,241,255,0.4)",
        }}>
          <p style={{ margin: "0 0 12px" }}>
            Need help?{" "}
            <a href="https://ownerview.io/accuinsight-faq" target="_blank" rel="noreferrer" style={{ color: "rgba(234,241,255,0.6)", textDecoration: "none", fontWeight: 500 }}>FAQ</a>
            {" · "}
            <a href="https://ownerview.io/getting-started-with-accuinsight" target="_blank" rel="noreferrer" style={{ color: "rgba(234,241,255,0.6)", textDecoration: "none", fontWeight: 500 }}>Get Started Guide</a>
          </p>
          <p style={{ margin: 0 }}>© 2026 OwnerView. All rights reserved.</p>
          <p style={{ margin: "8px 0 0" }}>
            <a href="/terms" style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none" }}>Terms</a>
            {" · "}
            <a href="/privacy" style={{ color: "rgba(234,241,255,0.5)", textDecoration: "none" }}>Privacy</a>
            {" · "}
            <DisconnectJobberButton />
          </p>
        </footer>
      </div>
    </main>
  );
}

/* -------------------------------- Subscription Status -------------------------------- */
function SubscriptionStatus({ billingStatus, trialEndsAt }: { billingStatus: string; trialEndsAt: number }) {
  if (billingStatus === "active") {
    return (
      <div className="status-pill" style={{
        borderRadius: 10,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(16,185,129,0.15)",
        border: "1px solid rgba(16,185,129,0.4)",
      }}>
        <span style={{ fontSize: 10 }}>⭐</span>
        Pro
      </div>
    );
  }

  const now = Date.now();
  const daysLeft = Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)));

  return (
    <div className="status-pill" style={{
      borderRadius: 10,
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: daysLeft <= 3 ? "rgba(239,68,68,0.15)" : "rgba(90,166,255,0.15)",
      border: `1px solid ${daysLeft <= 3 ? "rgba(239,68,68,0.4)" : "rgba(90,166,255,0.4)"}`,
    }}>
      <span style={{ fontSize: 10 }}>⏱️</span>
      {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
    </div>
  );
}

/* -------------------------------- Buttons -------------------------------- */


function SubscribeButton() {
  return (
    <form action="/api/billing/checkout" method="POST">
      <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
        Subscribe →
      </button>
    </form>
  );
}

function ManageSubscriptionButton() {
  return (
    <form action="/api/billing/portal" method="POST">
      <button type="submit" className="btn">
        Manage
      </button>
    </form>
  );
}

function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button type="submit" className="btn btn-muted">
        Log out
      </button>
    </form>
  );
}
