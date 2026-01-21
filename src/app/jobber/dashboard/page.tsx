// src/app/jobber/dashboard/page.tsx
import React from "react";
import { Controls } from "./controls";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SyncButton } from "./SyncButton";
import { ThemeToggle } from "./ThemeToggle";
import { getUser } from "@/lib/supabaseAuth";
import { redirect } from "next/navigation";

/* --------------------------------- helpers --------------------------------- */
type Granularity = "day" | "week" | "month" | "quarter";
type ChartType = "line" | "bar";

// Helper to generate CSV download link
function generateCSV(data: any[], filename: string): string {
  if (!data.length) return "";
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(",") ? `"${escaped}"` : escaped;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  return URL.createObjectURL(blob);
}

function safeDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function pct(x: number) {
  return (x * 100).toFixed(1) + "%";
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
      maximumFractionDigits: 2,
    });
    return (cents: number) => fmt.format((Number(cents || 0) as number) / 100);
  } catch {
    const fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      currencyDisplay: "symbol",
      maximumFractionDigits: 2,
    });
    return (cents: number) => fmt.format((Number(cents || 0) as number) / 100);
  }
}

function moneyForChart(cents: number): string {
  const dollars = Math.round((Number(cents || 0) as number) / 100);
  const rounded = Math.round(dollars / 100) * 100;
  return `$${rounded.toLocaleString()}`;
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

function daysBetweenUTC(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

/* ----------------------------------- UI ----------------------------------- */
const theme = {
  bg0: "#060811",
  bg1: "#0A1222",
  card: "rgba(255,255,255,0.060)",
  border: "rgba(255,255,255,0.10)",
  border2: "rgba(255,255,255,0.16)",
  text: "#EAF1FF",
  sub: "rgba(234,241,255,0.74)",
  mut: "rgba(234,241,255,0.58)",
  faint: "rgba(234,241,255,0.38)",
  good: "rgba(34,197,94,0.20)",
  warn: "rgba(245,158,11,0.20)",
  crit: "rgba(239,68,68,0.20)",
};

function sevBg(sev: "critical" | "warning" | "good") {
  if (sev === "critical") return theme.crit;
  if (sev === "warning") return theme.warn;
  return theme.good;
}

const ui = {
  page: {
    minHeight: "100vh",
    color: theme.text,
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
    background: `
      radial-gradient(1200px 760px at 12% -12%, rgba(124,92,255,0.26), transparent 60%),
      radial-gradient(960px 640px at 88% -6%, rgba(90,166,255,0.20), transparent 56%),
      radial-gradient(800px 520px at 52% 8%, rgba(34,197,94,0.10), transparent 60%),
      linear-gradient(180deg, ${theme.bg0} 0%, ${theme.bg1} 74%, #050713 100%)
    `,
  } as React.CSSProperties,

  container: { maxWidth: 1220, margin: "0 auto", padding: "24px 18px 76px" } as React.CSSProperties,

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    flexWrap: "wrap",
  } as React.CSSProperties,

  brand: { display: "flex", alignItems: "center", gap: 12 } as React.CSSProperties,

  logo: {
    width: 40,
    height: 40,
    borderRadius: 16,
    background: "linear-gradient(135deg, rgba(124,92,255,0.98), rgba(90,166,255,0.98))",
    boxShadow: "0 18px 44px rgba(90,166,255,0.20)",
    border: "1px solid rgba(255,255,255,0.20)",
  } as React.CSSProperties,

  h1: { fontSize: 22, fontWeight: 1000, letterSpacing: -0.4 } as React.CSSProperties,
  hSub: { marginTop: 2, fontSize: 13, color: theme.sub } as React.CSSProperties,

  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${theme.border}`,
    background: "rgba(255,255,255,0.06)",
    fontSize: 12,
    color: theme.sub,
    fontWeight: 950,
  } as React.CSSProperties,

  dot: (bg: string) => ({
    width: 8,
    height: 8,
    borderRadius: 999,
    background: bg,
    boxShadow: `0 0 0 4px ${bg.replace("0.20", "0.08")}`,
  } as React.CSSProperties),

  panel: {
    marginTop: 14,
    borderRadius: 18,
    border: `1px solid ${theme.border}`,
    background: "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.04) 100%)",
    boxShadow: "0 18px 54px rgba(0,0,0,0.40)",
    overflow: "hidden",
  } as React.CSSProperties,

  section: {
    padding: "16px 16px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
    flexWrap: "wrap",
  } as React.CSSProperties,

  sectionTitle: { fontSize: 14, fontWeight: 1000, letterSpacing: -0.18 } as React.CSSProperties,
  sectionSub: { fontSize: 12, color: theme.mut } as React.CSSProperties,

  grid: { display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12, padding: 16 } as React.CSSProperties,

  card: {
    borderRadius: 16,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    padding: 14,
    boxShadow: "0 12px 34px rgba(0,0,0,0.30)",
  } as React.CSSProperties,

  kpiCard: {
    borderRadius: 16,
    border: `1px solid ${theme.border2}`,
    background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.05) 100%)",
    padding: 14,
    boxShadow: "0 18px 46px rgba(0,0,0,0.40)",
  } as React.CSSProperties,

  kpiLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: theme.mut, fontWeight: 950 } as React.CSSProperties,
  kpiValue: { marginTop: 8, fontSize: 28, fontWeight: 1000, letterSpacing: -0.7 } as React.CSSProperties,
  kpiMeta: { marginTop: 8, fontSize: 12, color: theme.sub, lineHeight: 1.35 } as React.CSSProperties,

  recommendationBanner: {
    marginTop: 14,
    borderRadius: 14,
    border: `1px solid rgba(245,158,11,0.25)`,
    background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 100%)",
    padding: "14px 18px",
    boxShadow: "0 8px 24px rgba(245,158,11,0.08)",
  } as React.CSSProperties,

  recommendationTitle: {
    fontSize: 13,
    fontWeight: 1000,
    color: "#f59e0b",
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    gap: 6,
    letterSpacing: -0.2,
  } as React.CSSProperties,

  recommendationItem: {
    padding: "8px 12px 8px 10px",
    borderRadius: 8,
    background: "rgba(0,0,0,0.15)",
    marginBottom: 6,
    fontSize: 13,
    lineHeight: 1.5,
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    border: "1px solid rgba(255,255,255,0.05)",
  } as React.CSSProperties,
  
  recommendationIcon: {
    fontSize: 14,
    marginTop: 1,
    flexShrink: 0,
  } as React.CSSProperties,
  
  recommendationText: {
    flex: 1,
  } as React.CSSProperties,

  kpiGroup: {
    border: `1px solid ${theme.border2}`,
    borderRadius: 16,
    padding: 16,
    background: "rgba(255,255,255,0.03)",
    marginBottom: 14,
  } as React.CSSProperties,

  kpiGroupTitle: {
    fontSize: 13,
    fontWeight: 1000,
    color: theme.mut,
    marginBottom: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  } as React.CSSProperties,

  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "10px 14px",
    borderRadius: 12,
    fontWeight: 1000,
    fontSize: 13,
    textDecoration: "none",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "linear-gradient(135deg, rgba(124,92,255,0.95), rgba(90,166,255,0.95))",
    color: "white",
    boxShadow: "0 18px 48px rgba(90,166,255,0.22)",
  } as React.CSSProperties,

  btn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "9px 12px",
    borderRadius: 12,
    fontWeight: 950,
    fontSize: 13,
    textDecoration: "none",
    border: `1px solid ${theme.border}`,
    background: "rgba(255,255,255,0.06)",
    color: theme.text,
    cursor: "pointer",
  } as React.CSSProperties,

  badge: (bg: string) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 980,
    border: `1px solid ${theme.border}`,
    background: bg,
    color: theme.text,
    whiteSpace: "nowrap",
  } as React.CSSProperties),

  info: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.05)",
    color: theme.sub,
    fontSize: 12,
    fontWeight: 1000,
    cursor: "help",
  } as React.CSSProperties,

  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" } as React.CSSProperties,
  th: {
    textAlign: "left",
    padding: "8px 10px",
    color: theme.mut,
    fontWeight: 700,
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    userSelect: "none",
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  td: { padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)", verticalAlign: "middle" } as React.CSSProperties,
};

/* ------------------------------ Mini Charts ------------------------------ */
function SparkLine(props: {
  title: string;
  subtitle: string;
  points: { xLabel: string; value: number; tooltip: string }[];
  formatY: (v: number) => string;
  chartType: ChartType;
  color?: string;
}) {
  const vbW = 360;
  const vbH = 150;

  const padL = 52;
  const padR = 28;
  const padT = 24;
  const padB = 36;

  const chartColor = props.color || "#5aa6ff";
  const glowColor = props.color ? `${props.color}28` : "rgba(90,166,255,0.16)";

  const vals = props.points.map((p) => p.value);
  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 1;
  const maxWithBuffer = max * 1.1;
  const span = Math.max(1e-9, maxWithBuffer - min);

  const xStep = (vbW - padL - padR) / Math.max(1, props.points.length - 1);
  const yOf = (v: number) => {
    const t = (v - min) / span;
    return padT + (1 - t) * (vbH - padT - padB);
  };
  const xOf = (i: number) => padL + i * xStep;

  const d = props.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(p.value).toFixed(1)}`)
    .join(" ");

  const yTop = max;
  const yMid = (max + min) / 2;
  const yBot = min;

  const clipId = `clip-${Math.random().toString(16).slice(2)}`;

  const barW = Math.max(2, (vbW - padL - padR) / Math.max(1, props.points.length) - 6);
  
  const labelSkip = props.points.length > 20 ? 4 : props.points.length > 12 ? 3 : 2;

  return (
    <div style={{ ...ui.card, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 1000, letterSpacing: -0.2 }}>
            {props.title}
          </div>
          <div style={{ marginTop: 3, fontSize: 12, color: theme.mut }}>{props.subtitle}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: theme.mut, fontWeight: 950 }}>Max</div>
          <div style={{ fontWeight: 1000, color: chartColor }}>{props.formatY(yTop)}</div>
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${vbW} ${vbH}`} preserveAspectRatio="xMidYMid meet" style={{ marginTop: 10, display: "block" }}>
        <defs>
          <clipPath id={clipId}>
            <rect x={padL} y={padT} width={vbW - padL - padR} height={vbH - padT - padB} rx="8" />
          </clipPath>
        </defs>

        <line x1={padL} y1={yOf(yTop)} x2={vbW - padR} y2={yOf(yTop)} stroke="rgba(255,255,255,0.10)" />
        <line x1={padL} y1={yOf(yMid)} x2={vbW - padR} y2={yOf(yMid)} stroke="rgba(255,255,255,0.06)" />
        <line x1={padL} y1={yOf(yBot)} x2={vbW - padR} y2={yOf(yBot)} stroke="rgba(255,255,255,0.10)" />

        <text x={10} y={yOf(yTop) + 4} fill={theme.faint} fontSize="10">{props.formatY(yTop)}</text>
        <text x={10} y={yOf(yMid) + 4} fill="rgba(234,241,255,0.30)" fontSize="10">{props.formatY(yMid)}</text>
        <text x={10} y={yOf(yBot) + 4} fill={theme.faint} fontSize="10">{props.formatY(yBot)}</text>

        <g clipPath={`url(#${clipId})`}>
          {props.chartType === "line" ? (
            <>
              <path d={d} fill="none" stroke={glowColor} strokeWidth="10" strokeLinecap="round" />
              <path d={d} fill="none" stroke={chartColor} strokeWidth="2.4" strokeLinecap="round" />
              {props.points.map((p, i) => (
                <g key={i}>
                  <circle cx={xOf(i)} cy={yOf(p.value)} r={3.4} fill={chartColor}>
                    <title>{p.tooltip}</title>
                  </circle>
                  <circle cx={xOf(i)} cy={yOf(p.value)} r={10} fill="transparent">
                    <title>{p.tooltip}</title>
                  </circle>
                </g>
              ))}
            </>
          ) : (
            <>
              {props.points.map((p, i) => {
                const x = padL + i * ((vbW - padL - padR) / Math.max(1, props.points.length)) + 3;
                const y = yOf(p.value);
                const h = vbH - padB - y;
                return (
                  <rect key={i} x={x} y={y} width={barW} height={Math.max(1, h)} rx={6} fill={chartColor}>
                    <title>{p.tooltip}</title>
                  </rect>
                );
              })}
            </>
          )}
        </g>

        {props.points.map((p, i) => {
          if (i % labelSkip !== 0) return null;
          return (
            <text key={`x-${i}`} x={xOf(i)} y={vbH - 12} fill="rgba(234,241,255,0.40)" fontSize="10" textAnchor="middle">
              {p.xLabel}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

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
  }>;
}) {
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
      <div style={{ padding: 24, color: "#EAF1FF", minHeight: "100vh", background: theme.bg0 }}>
        <h2>No Jobber account connected</h2>
        <p style={{ marginTop: 8, color: theme.sub }}>Please connect your Jobber account first.</p>
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
      <main className="paywall-page" style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #060811 0%, #0A1222 100%)",
        padding: 24,
      }}>
        <style>{`
          html[data-theme="light"] .paywall-page {
            background: linear-gradient(180deg, #f0f4f8 0%, #e2e8f0 100%) !important;
          }
          html[data-theme="light"] .paywall-card {
            background: #ffffff !important;
            border-color: #d1d5db !important;
            box-shadow: 0 24px 80px rgba(0,0,0,0.1) !important;
          }
          html[data-theme="light"] .paywall-title {
            color: #1a202c !important;
          }
          html[data-theme="light"] .paywall-text {
            color: #4b5563 !important;
          }
          html[data-theme="light"] .paywall-subtext {
            color: #6b7280 !important;
          }
        `}</style>
        <div className="paywall-card" style={{
          maxWidth: 480,
          width: "100%",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
          padding: 40,
          textAlign: "center",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: "linear-gradient(135deg, rgba(124,92,255,0.95), rgba(90,166,255,0.95))",
            margin: "0 auto 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 16px 48px rgba(90,166,255,0.25)",
          }}>
            <span style={{ fontSize: 28 }}>🔒</span>
          </div>
          
          <h1 className="paywall-title" style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#EAF1FF",
            marginBottom: 12,
          }}>
            {billingStatus === "trialing" ? "Trial Expired" : "Subscribe to Access"}
          </h1>
          
          <p className="paywall-text" style={{
            fontSize: 15,
            color: "rgba(234,241,255,0.65)",
            lineHeight: 1.6,
            marginBottom: 8,
          }}>
            Your 14-day free trial has ended. Subscribe to continue accessing your AccuInsight dashboard.
          </p>
          
          <p className="paywall-subtext" style={{
            fontSize: 14,
            color: "rgba(234,241,255,0.5)",
            marginBottom: 32,
          }}>
            {companyName}
          </p>

          <form action="/api/billing/checkout" method="POST">
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "16px 24px",
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 16,
                border: "none",
                background: "linear-gradient(135deg, rgba(124,92,255,0.95), rgba(90,166,255,0.95))",
                color: "white",
                cursor: "pointer",
                boxShadow: "0 12px 40px rgba(90,166,255,0.3)",
              }}
            >
              Subscribe — $29/month
            </button>
          </form>
          
          <p className="paywall-subtext" style={{
            marginTop: 20,
            fontSize: 13,
            color: "rgba(234,241,255,0.4)",
          }}>
            Cancel anytime • Instant access after payment
          </p>
        </div>
      </main>
    );
  }

  const sp = await searchParams;
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

  // Fetch facts
  const { data: invoicesData } = await supabaseAdmin.from("fact_invoices").select("*").eq("connection_id", connectionId);
  const invoices = (invoicesData ?? []) as any[];

  const { data: jobsData } = await supabaseAdmin.from("fact_jobs").select("*").eq("connection_id", connectionId);
  const jobs = (jobsData ?? []) as any[];

  const { data: quotesData } = await supabaseAdmin
    .from("fact_quotes")
    .select("jobber_quote_id,quote_number,quote_title,quote_status,quote_total_cents,quote_url,sent_at")
    .eq("connection_id", connectionId);
  const quotes = (quotesData ?? []) as any[];

  // AR buckets
  const nowMs = Date.now();
  let b0_7 = 0, b8_14 = 0, b15p = 0, totalAR = 0;
  for (const inv of invoices) {
    const amt = Number(inv.total_amount_cents ?? inv.total_cents ?? inv.total_amount ?? 0);
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

  // Capacity
  const scheduledStarts = jobs.map((j) => j.scheduled_start_at).filter(Boolean) as string[];
  const unscheduledCount = jobs.filter((j) => !j.scheduled_start_at).length;

  const daysBookedAhead = (() => {
    if (!scheduledStarts.length) return 0;
    const maxTs = Math.max(...scheduledStarts.map((x) => new Date(x).getTime()));
    const days = (maxTs - Date.now()) / 86400000;
    return Math.max(0, Math.round(days));
  })();

  const TARGET_LOW = 7;
  const TARGET_HIGH = 14;
  const underbooked = daysBookedAhead < TARGET_LOW;
  const balanced = daysBookedAhead >= TARGET_LOW && daysBookedAhead <= TARGET_HIGH;
  const overbookedMild = daysBookedAhead > TARGET_HIGH && daysBookedAhead <= 21;
  const overbookedHard = daysBookedAhead > 21;

  const capScore = clamp(
    (underbooked ? (TARGET_LOW - daysBookedAhead) * 14 : 0) + 
    (overbookedMild ? 60 : 0) +
    (overbookedHard ? 90 : 0) +
    clamp(unscheduledCount * 4, 0, 30),
    0,
    100
  );
  const capSev = severityFromScore(capScore);
  const capState = underbooked ? "Underbooked" : balanced ? "Balanced" : "Overbooked";

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

  // Quote leak
  const leakCandidates = quotes
    .filter((q) => q.sent_at)
    .filter((q) => {
      const dt = safeDate(q.sent_at);
      if (!dt) return false;
      return dt.getTime() >= start.getTime() && dt.getTime() < endExclusive.getTime();
    })
    .filter((q) => {
      const st = String(q.quote_status ?? "").toLowerCase().trim();
      if (!st) return true;
      if (st === "archived" || st === "draft") return false;
      return !statusLooksWon(st);
    });

  const leakCount = leakCandidates.length;
  const leakDollars = leakCandidates.reduce((sum, q) => sum + Number(q.quote_total_cents ?? 0), 0);

  // Quotes with changes requested
  const changesRequestedQuotes = quotes.filter((q) => {
    const st = String(q.quote_status ?? "").toLowerCase().trim();
    return st === "changes_requested";
  });
  const changesRequestedCount = changesRequestedQuotes.length;

  // Aged AR
  const agedARInvoices = invoices
    .filter((inv) => {
      const due = safeDate(inv.due_at);
      if (!due) return false;
      const daysOverdue = Math.max(0, Math.round((Date.now() - due.getTime()) / 86400000));
      return daysOverdue >= 15;
    })
    .map((inv) => ({
      invoice_number: inv.invoice_number || "—",
      client_name: inv.client_name || "",
      amount_cents: inv.total_amount_cents || 0,
      days_overdue: Math.max(0, Math.round((Date.now() - (safeDate(inv.due_at)?.getTime() || Date.now())) / 86400000)),
      due_date: inv.due_at,
      jobber_url: inv.jobber_url || (inv.jobber_invoice_id ? `https://secure.getjobber.com/invoices/${inv.jobber_invoice_id}` : null),
    }));

  // Unscheduled list
  const { data: unsched } = await supabaseAdmin
    .from("fact_jobs")
    .select("job_number,job_title,created_at_jobber,jobber_url,total_amount_cents")
    .eq("connection_id", connectionId)
    .is("scheduled_start_at", null)
    .order("created_at_jobber", { ascending: true })
    .limit(200);

  const rawUn = (unsched ?? []) as any[];

  const ageDays = (ts: string | null) => {
    if (!ts) return 0;
    const d = safeDate(ts);
    if (!d) return 0;
    return Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000));
  };

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

  const leakByBucket = bucketStarts.map((bs) => {
    const be = nextBucketUTC(bs, g);
    const endTs = be.getTime();
    let sum = 0;
    for (const q of leakCandidates) {
      const dt = safeDate(q.sent_at);
      if (!dt) continue;
      const t = dt.getTime();
      if (t < endTs) sum += Number(q.quote_total_cents ?? 0);
    }
    return sum;
  });

  const ar15ByBucket = bucketStarts.map((bs) => {
    const be = nextBucketUTC(bs, g);
    const endTs = be.getTime();
    let sum = 0;
    for (const inv of invoices) {
      const due = safeDate(inv.due_at ?? inv.dueDate ?? inv.due_date);
      if (!due) continue;
      const daysLate = (endTs - due.getTime()) / 86400000;
      if (daysLate > 15) sum += Number(inv.total_amount_cents ?? inv.total_cents ?? inv.total_amount ?? 0);
    }
    return sum;
  });

  const unschedByBucket = bucketStarts.map((bs) => {
    const be = nextBucketUTC(bs, g).getTime();
    let cnt = 0;
    for (const j of rawUn) {
      const dt = safeDate(j.created_at_jobber);
      if (!dt) continue;
      if (dt.getTime() < be) cnt += 1;
    }
    return cnt;
  });

  const points = {
    leak: bucketStarts.map((bs, i) => {
      const label = labelForBucket(bs, g);
      const v = leakByBucket[i];
      return { xLabel: label, value: v, tooltip: `${label}: ${money(v)} total leaked quotes` };
    }),
    ar15: bucketStarts.map((bs, i) => {
      const label = labelForBucket(bs, g);
      const v = ar15ByBucket[i];
      return { xLabel: label, value: v, tooltip: `${label}: ${money(v)} AR 15+ balance` };
    }),
    unsched: bucketStarts.map((bs, i) => {
      const label = labelForBucket(bs, g);
      const v = unschedByBucket[i];
      return { xLabel: label, value: v, tooltip: `${label}: ${v} unscheduled jobs` };
    }),
  };

  // Shared table column widths
  const colW = {
    age: "96px",
    title: "auto",
    date: "140px",
    amount: "140px",
    open: "190px",
  };

  // Generate recommendations
  type Recommendation = { icon: string; text: string; };
  const recommendations: Recommendation[] = [];
  
  if (b15p > 0 && totalAR > 0) {
    const pct15 = b15p / totalAR;
    const agedCount = agedARInvoices.length;
    if (pct15 > 0.15) {
      recommendations.push({
        icon: "🔴",
        text: `${money(b15p)} overdue 15+ days (${agedCount} invoices). Priority: Call top 3 oldest accounts today.`
      });
    } else if (pct15 > 0.08) {
      recommendations.push({
        icon: "⚠️",
        text: `${money(b15p)} aging past 15 days (${agedCount} invoices). Send payment reminders this week.`
      });
    }
  }

  if (daysBookedAhead < 5) {
    recommendations.push({
      icon: "🔴",
      text: `Only ${daysBookedAhead} days scheduled ahead. Book ${Math.min(5, unscheduledCount)} jobs from backlog by Friday.`
    });
  } else if (daysBookedAhead < 7) {
    recommendations.push({
      icon: "📅",
      text: `${daysBookedAhead} days booked (target: 7-14). Schedule ${Math.min(3, unscheduledCount)} more jobs this week.`
    });
  } else if (daysBookedAhead > 21) {
    recommendations.push({
      icon: "⚠️",
      text: `${daysBookedAhead} days ahead (overbooked). Push lower-margin work or add crew capacity.`
    });
  }

  if (leakCount > 5) {
    const winRate = 0.25;
    const potentialWin = Math.round(leakDollars * winRate);
    recommendations.push({
      icon: "💰",
      text: `${leakCount} quotes pending (${money(leakDollars)} total). Follow up on top 5 - potential ${money(potentialWin)} recovery.`
    });
  }

  if (changesRequestedCount > 0) {
    recommendations.push({
      icon: "✏️",
      text: `${changesRequestedCount} quote${changesRequestedCount > 1 ? 's' : ''} waiting for revisions. Hot leads - respond within 24hrs.`
    });
  }

  if (completedCount >= 5 && marginPerJob > 0) {
    const marginPct = profitSum / revSum;
    if (marginPct < 0.20) {
      recommendations.push({
        icon: "📊",
        text: `Margins at ${pct(marginPct)} (target: 25%+). Review pricing or reduce material/labor costs.`
      });
    }
  }

  if (unscheduledCount > 15 && daysBookedAhead < 10) {
    recommendations.push({
      icon: "📋",
      text: `${unscheduledCount} jobs unscheduled. Fill calendar gaps to maintain steady cash flow.`
    });
  }

  return (
    <main style={ui.page}>
      <style>{`
          html[data-theme="dark"] {
            --bg0: #060811;
            --bg1: #0A1222;
            --card: rgba(255,255,255,0.060);
            --border: rgba(255,255,255,0.10);
            --text: #EAF1FF;
            --sub: rgba(234,241,255,0.74);
            --mut: rgba(234,241,255,0.58);
          }
          
          html[data-theme="light"] {
            --bg0: #f0f4f8;
            --bg1: #ffffff;
            --card: #ffffff;
            --border: #e2e8f0;
            --text: #1a202c;
            --sub: #374151;
            --mut: #4b5563;
          }
          
          html[data-theme="light"],
          html[data-theme="light"] body,
          html[data-theme="light"] main {
            background: #f0f4f8 !important;
            color: #1a202c !important;
          }
          
          html[data-theme="light"] * {
            color: inherit;
          }
          
          html[data-theme="light"] div,
          html[data-theme="light"] span,
          html[data-theme="light"] p,
          html[data-theme="light"] h1,
          html[data-theme="light"] h2,
          html[data-theme="light"] h3,
          html[data-theme="light"] h4,
          html[data-theme="light"] h5,
          html[data-theme="light"] h6,
          html[data-theme="light"] label,
          html[data-theme="light"] strong,
          html[data-theme="light"] b {
            color: #1a202c !important;
          }
          
          html[data-theme="light"] [style*="color: rgba(234"],
          html[data-theme="light"] [style*="color:rgba(234"],
          html[data-theme="light"] [style*="color: #EAF1FF"],
          html[data-theme="light"] [style*="color:#EAF1FF"],
          html[data-theme="light"] [style*="color: rgb(234"],
          html[data-theme="light"] [style*="opacity: 0.74"],
          html[data-theme="light"] [style*="opacity: 0.58"],
          html[data-theme="light"] [style*="opacity: 0.38"],
          html[data-theme="light"] [style*="opacity:0.74"],
          html[data-theme="light"] [style*="opacity:0.58"],
          html[data-theme="light"] [style*="opacity:0.38"] {
            color: #4b5563 !important;
            opacity: 1 !important;
          }
          
          html[data-theme="light"] [style*="background: rgba(255,255,255"],
          html[data-theme="light"] [style*="background:rgba(255,255,255"],
          html[data-theme="light"] [style*="background: rgba(255, 255, 255"] {
            background: #ffffff !important;
            border: 1px solid #d1d5db !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04) !important;
          }
          
          html[data-theme="light"] [style*="linear-gradient(180deg"] {
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
            border: 1px solid #d1d5db !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important;
          }
          
          html[data-theme="light"] table {
            background: #ffffff !important;
          }
          
          html[data-theme="light"] th {
            color: #374151 !important;
            background: #f8fafc !important;
            border-color: #e2e8f0 !important;
            padding: 8px 10px !important;
          }
          
          html[data-theme="light"] td {
            color: #1f2937 !important;
            border-color: #e5e7eb !important;
            background: #ffffff !important;
            padding: 8px 10px !important;
          }
          
          html[data-theme="light"] td span,
          html[data-theme="light"] td div,
          html[data-theme="light"] td strong,
          html[data-theme="light"] td a {
            color: #1f2937 !important;
          }
          
          html[data-theme="light"] td a[href] {
            color: #4338ca !important;
          }
          
          html[data-theme="light"] tr:hover td {
            background: #f3f4f6 !important;
          }
          
          html[data-theme="light"] tbody tr:nth-child(2n) td {
            background: #f9fafb !important;
          }
          
          html[data-theme="light"] svg text,
          html[data-theme="light"] svg tspan {
            fill: #1f2937 !important;
            color: #1f2937 !important;
          }
          
          html[data-theme="light"] svg line {
            stroke: #d1d5db !important;
            stroke-width: 1px !important;
          }
          
          html[data-theme="light"] svg path.domain,
          html[data-theme="light"] svg .domain {
            stroke: #6b7280 !important;
          }
          
          html[data-theme="light"] svg path[stroke="#5a67d8"],
          html[data-theme="light"] svg path[stroke="#667eea"],
          html[data-theme="light"] svg path[stroke="rgb(90, 103, 216)"],
          html[data-theme="light"] svg path[fill="none"],
          html[data-theme="light"] svg polyline {
            stroke: #4338ca !important;
            stroke-width: 3px !important;
          }
          
          html[data-theme="light"] svg rect[fill]:not([fill="none"]):not([fill="transparent"]) {
            fill: #4c51bf !important;
          }
          
          html[data-theme="light"] svg path[fill*="rgba"] {
            fill: rgba(67, 56, 202, 0.12) !important;
          }
          
          html[data-theme="light"] svg circle {
            fill: #4338ca !important;
            stroke: #ffffff !important;
            stroke-width: 2px !important;
            r: 4 !important;
          }
          
          html[data-theme="light"] a {
            color: #4338ca !important;
          }
          
          html[data-theme="light"] a:hover {
            color: #3730a3 !important;
          }
          
          html[data-theme="light"] button {
            color: #1f2937 !important;
          }
          
          html[data-theme="light"] [style*="background: #5a67d8"],
          html[data-theme="light"] [style*="background:#5a67d8"],
          html[data-theme="light"] [style*="background: rgb(90, 103, 216)"] {
            background: #4c51bf !important;
            color: #ffffff !important;
          }
          
          html[data-theme="light"] [style*="rgba(239,68,68,0.2"],
          html[data-theme="light"] [style*="rgba(239, 68, 68, 0.2"] {
            background: rgba(239,68,68,0.15) !important;
          }
          
          html[data-theme="light"] [style*="rgba(245,158,11,0.2"],
          html[data-theme="light"] [style*="rgba(245, 158, 11, 0.2"] {
            background: rgba(245,158,11,0.15) !important;
          }
          
          html[data-theme="light"] [style*="rgba(16,185,129,0.2"],
          html[data-theme="light"] [style*="rgba(16, 185, 129, 0.2"] {
            background: rgba(16,185,129,0.15) !important;
          }
          
          html[data-theme="light"] input,
          html[data-theme="light"] select,
          html[data-theme="light"] textarea {
            background: #ffffff !important;
            color: #1f2937 !important;
            border-color: #d1d5db !important;
          }
          
          html[data-theme="light"] input:focus,
          html[data-theme="light"] select:focus {
            border-color: #4c51bf !important;
            box-shadow: 0 0 0 3px rgba(76, 81, 191, 0.1) !important;
          }
          
          html[data-theme="light"] [style*="rgba(245,158,11,0.08)"],
          html[data-theme="light"] [style*="linear-gradient(135deg, rgba(245,158,11"] {
            background: linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.05) 100%) !important;
            border-color: rgba(245,158,11,0.4) !important;
          }
          
          html[data-theme="light"] ::-webkit-scrollbar {
            background: #f0f4f8;
            width: 8px;
          }
          
          html[data-theme="light"] ::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 4px;
          }
          
          html[data-theme="light"] ::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          
          a:hover { filter: brightness(1.06); }
          
          @media (max-width: 980px) {
            .span3 { grid-column: span 12 !important; }
            .span4 { grid-column: span 12 !important; }
            .span6 { grid-column: span 12 !important; }
          }
          
          @media (max-width: 768px) {
            table {
              display: block;
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
              white-space: nowrap;
            }
            
            th, td {
              min-width: 70px !important;
              padding: 8px 6px !important;
              font-size: 12px !important;
            }
            
            th:nth-child(2), td:nth-child(2) {
              min-width: 140px !important;
              white-space: normal !important;
            }
            
            th:last-child, td:last-child {
              min-width: 90px !important;
            }
            
            td a {
              padding: 6px 10px !important;
              font-size: 11px !important;
            }
          }
          
          @media (max-width: 480px) {
            th, td {
              padding: 6px 4px !important;
              font-size: 11px !important;
            }
            
            th:nth-child(3), td:nth-child(3) {
              display: none !important;
            }
          }
        `}</style>

      <div style={ui.container}>
        <div style={ui.header}>
          <div style={ui.brand}>
            <div>
              <div style={ui.h1}>{companyName} | AccuInsight</div>
              <div style={ui.hSub}>
                Last sync: <strong style={{ color: theme.text }}>{lastSyncPretty}</strong>
                <span style={{ color: theme.mut }}> • {currencyCode}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <SyncButton connectionId={connectionId} />
            
            <ThemeToggle />
            
            <span style={{
              padding: "8px 14px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: theme.text,
              background: arSev === "critical" ? "rgba(239,68,68,0.25)" : 
                         arSev === "warning" ? "rgba(245,158,11,0.25)" : 
                         "rgba(16,185,129,0.25)",
              border: `2px solid ${arSev === "critical" ? "#ef4444" : 
                                  arSev === "warning" ? "#f59e0b" : "#10b981"}`,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }} title="Share of AR that is 15+ days overdue.">
              <span style={ui.dot(sevBg(arSev))} />
              AR Risk <strong style={{ color: theme.text }}>{pct(riskPct)}</strong>
            </span>

            <span style={{
              padding: "8px 14px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: theme.text,
              background: capSev === "critical" ? "rgba(239,68,68,0.25)" : 
                         capSev === "warning" ? "rgba(245,158,11,0.25)" : 
                         "rgba(16,185,129,0.25)",
              border: `2px solid ${capSev === "critical" ? "#ef4444" : 
                                  capSev === "warning" ? "#f59e0b" : "#10b981"}`,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }} title="Capacity uses days booked ahead plus unscheduled job volume.">
              <span style={ui.dot(sevBg(capSev))} />
              Capacity <strong style={{ color: theme.text }}>{capState}</strong>
            </span>

            {subscriptionActive ? (
  <ManageSubscriptionButton />
) : (
  <SubscribeButton />
)}

<LogoutButton />
          </div>
        </div>

        {/* RECOMMENDATIONS */}
        {recommendations.length > 0 && (
          <div style={ui.recommendationBanner}>
            <div style={ui.recommendationTitle}>
              💡 This Week&apos;s Focus
            </div>
            {recommendations.map((rec, i) => (
              <div key={i} style={ui.recommendationItem}>
                <span style={ui.recommendationIcon}>{rec.icon}</span>
                <span style={ui.recommendationText}>{rec.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* KPIs */}
        <div style={ui.panel}>
          <div style={ui.section}>
            <div>
              <div style={ui.sectionTitle}>Overview KPIs</div>
              <div style={ui.sectionSub}>
                Current status as of today. High-signal metrics for cash, capacity, and sales.
              </div>
            </div>
          </div>

          <div style={{ padding: 16 }}>
            <div style={ui.kpiGroup}>
              <div style={ui.kpiGroupTitle}>💰 Financial Metrics</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <div style={ui.kpiCard}>
                  <div style={ui.kpiLabel}>TOTAL AR</div>
                  <div style={ui.kpiValue}>{money(totalAR)}</div>
                  <div style={ui.kpiMeta}>
                    Total outstanding receivables
                  </div>
                </div>

                <div style={ui.kpiCard}>
                  <div style={ui.kpiLabel}>AR 15+ DAYS</div>
                  <div style={{ ...ui.kpiValue, color: b15p > 0 ? (riskPct >= 15 ? "#ef4444" : "#f59e0b") : "#10b981" }}>
                    {money(b15p)}
                  </div>
                  <div style={ui.kpiMeta}>
                    {totalAR > 0 ? pct(b15p / totalAR) : "0%"} of total AR • Invoices overdue 15+ days
                  </div>
                </div>

                <div style={ui.kpiCard}>
                  <div style={ui.kpiLabel}>QUOTE LEAK</div>
                  <div style={{ ...ui.kpiValue, color: leakDollars > 0 ? "#ef4444" : "#10b981" }}>
                    {money(leakDollars)}
                  </div>
                  <div style={ui.kpiMeta}>
                    {leakCount} quotes not won • Sent in range, not converted
                  </div>
                </div>
              </div>
            </div>

            <div style={ui.kpiGroup}>
              <div style={ui.kpiGroupTitle}>📊 Operations Metrics</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <div style={ui.kpiCard}>
                  <div style={ui.kpiLabel}>DAYS BOOKED AHEAD</div>
                  <div style={{ 
                    ...ui.kpiValue, 
                    color: daysBookedAhead < TARGET_LOW ? "#ef4444" : 
                           daysBookedAhead > 21 ? "#ef4444" :
                           daysBookedAhead > TARGET_HIGH ? "#f59e0b" : "#10b981" 
                  }}>
                    {daysBookedAhead}
                  </div>
                  <div style={ui.kpiMeta}>
                    Target: {TARGET_LOW}-{TARGET_HIGH} days • Days until latest scheduled job
                  </div>
                </div>

                <div style={ui.kpiCard}>
                  <div style={ui.kpiLabel}>UNSCHEDULED JOBS</div>
                  <div style={{ 
                    ...ui.kpiValue, 
                    color: unscheduledCount > 10 ? "#ef4444" : 
                           unscheduledCount > 5 ? "#f59e0b" : "#10b981" 
                  }}>
                    {unscheduledCount}
                  </div>
                  <div style={ui.kpiMeta}>
                    Jobs with no scheduled start • Available backlog
                  </div>
                </div>

                <div style={ui.kpiCard}>
                  <div style={ui.kpiLabel}>CHANGES REQUESTED</div>
                  <div style={{ 
                    ...ui.kpiValue, 
                    color: changesRequestedCount > 5 ? "#ef4444" : 
                           changesRequestedCount > 2 ? "#f59e0b" : "#10b981" 
                  }}>
                    {changesRequestedCount}
                  </div>
                  <div style={ui.kpiMeta}>
                    Quotes waiting for revisions • Respond quickly to close
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trends */}
        <div style={{ marginTop: 14 }}>
          <div style={ui.panel}>
            <div style={ui.section}>
              <div>
                <div style={ui.sectionTitle}>Trends</div>
                <div style={ui.sectionSub}>
                  Historical view over time. Bucketed by your selection (Daily/Weekly/Monthly/Quarterly).
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span style={ui.badge("rgba(124,92,255,0.16)")}>
                  Range: {toISODateOnlyUTC(start)} → {toISODateOnlyUTC(end)}
                </span>
                <span style={ui.badge("rgba(90,166,255,0.16)")}>
                  {g === "day" ? "Daily" : g === "week" ? "Weekly" : g === "month" ? "Monthly" : "Quarterly"} •{" "}
                  {chartType === "line" ? "Line" : "Bars"}
                </span>
              </div>
            </div>

            <div style={{ padding: "0 16px 16px" }}>
              <Controls />
            </div>

            <div style={ui.grid}>
              <div className="span4" style={{ gridColumn: "span 4" }}>
                <SparkLine
                  title="Quote leak"
                  subtitle="Cumulative total of leaked quotes (as-of each point)"
                  points={points.leak}
                  formatY={(v) => moneyForChart(v)}
                  chartType={chartType}
                  color="#ef4444"
                />
              </div>

              <div className="span4" style={{ gridColumn: "span 4" }}>
                <SparkLine
                  title="AR 15+"
                  subtitle="Cumulative AR overdue 15+ days (as-of each point)"
                  points={points.ar15}
                  formatY={(v) => moneyForChart(v)}
                  chartType={chartType}
                  color="#f59e0b"
                />
              </div>

              <div className="span4" style={{ gridColumn: "span 4" }}>
                <SparkLine
                  title="Unscheduled jobs"
                  subtitle="Cumulative backlog count (as-of each point)"
                  points={points.unsched}
                  formatY={(v) => `${Math.round(v)}`}
                  chartType={chartType}
                  color="#5aa6ff"
                />
              </div>
            </div>
          </div>

          {/* Action Lists */}
          <div style={{ ...ui.panel, marginTop: 14 }}>
            <div style={ui.section}>
              <div>
                <div style={ui.sectionTitle}>Action Lists</div>
                <div style={ui.sectionSub}>Lists that drive weekly wins: collect AR, schedule backlog, close sales leaks.</div>
              </div>
            </div>

            <div style={{ padding: 16 }}>
              {/* Aged AR */}
              <div style={{ ...ui.card, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 1000, letterSpacing: -0.2 }}>Aged AR (15+ Days)</div>
                    <div style={{ marginTop: 3, fontSize: 12, color: theme.mut }}>
                      Invoices overdue 15+ days - oldest first
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={ui.badge("rgba(239,68,68,0.16)")}>Collections</span>
                    {agedARInvoices.length > 0 && (
                      <a
                        href={generateCSV(
                          agedARInvoices.map((inv) => ({
                            "Age (days)": inv.days_overdue,
                            "Invoice #": inv.invoice_number,
                            "Client": inv.client_name || "",
                            "Due Date": inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "",
                            "Amount": (inv.amount_cents / 100).toFixed(2),
                            "Jobber URL": inv.jobber_url || "",
                          })),
                          "aged-ar-15plus"
                        )}
                        download={`aged-ar-15plus-${new Date().toISOString().split("T")[0]}.csv`}
                        style={ui.btnPrimary}
                      >
                        Export CSV →
                      </a>
                    )}
                  </div>
                </div>

                {agedARInvoices.length === 0 ? (
                  <div style={{ fontSize: 12, color: theme.sub }}>No aged AR 15+ days! 🎉</div>
                ) : (
                  <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table style={ui.table}>
                      <colgroup>
                        <col style={{ width: colW.age }} />
                        <col style={{ width: colW.title }} />
                        <col style={{ width: colW.date }} />
                        <col style={{ width: colW.amount }} />
                        <col style={{ width: colW.open }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={ui.th}>Age</th>
                          <th style={ui.th}>Invoice # + Client</th>
                          <th style={ui.th}>Due Date</th>
                          <th style={ui.th}>Amount</th>
                          <th style={ui.th}>Open</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agedARInvoices
                          .sort((a, b) => b.days_overdue - a.days_overdue)
                          .map((inv, idx) => (
                            <tr key={idx}>
                              <td style={ui.td}>{inv.days_overdue}d</td>
                              <td style={ui.td}>
                                <div style={{ fontWeight: 950 }}>
                                  <span style={{ color: theme.sub }}>#{inv.invoice_number}</span>
                                  {inv.client_name && (
                                    <span style={{ color: theme.text }}> • {inv.client_name}</span>
                                  )}
                                </div>
                              </td>
                              <td style={ui.td}>
                                {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                              </td>
                              <td style={ui.td}>{money(inv.amount_cents)}</td>
                              <td style={ui.td}>
                                {inv.jobber_url ? (
                                  <a href={inv.jobber_url} target="_blank" rel="noreferrer" style={ui.btn}>
                                    Open in Jobber →
                                  </a>
                                ) : (
                                  <span style={{ fontSize: 12, color: theme.mut }}>—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Unscheduled Jobs */}
              <div style={ui.card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 1000, letterSpacing: -0.2 }}>Top Unscheduled Jobs</div>
                    <div style={{ marginTop: 3, fontSize: 12, color: theme.mut }}>
                      Oldest first. Shows Job # and Title.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={ui.badge("rgba(90,166,255,0.16)")}>Scheduling</span>
                    <a href={toggleUnscheduledHref} style={ui.btn} title="Filter unscheduled jobs">
                      {minDays >= 7 ? "Show all" : "Show 7+ days only"}
                    </a>
                    {unscheduledRows.length > 0 && (
                      <a
                        href={generateCSV(
                          unscheduledRows.map((r: any) => ({
                            "Age (days)": ageDays(r.created_at_jobber),
                            "Job #": r.job_number ? `#${r.job_number}` : "",
                            "Job Title": r.job_title || "Untitled job",
                            "Created": r.created_at_jobber ? new Date(r.created_at_jobber).toLocaleDateString() : "",
                            "Amount": r.total_amount_cents ? (r.total_amount_cents / 100).toFixed(2) : "",
                            "Jobber URL": r.jobber_url || "",
                          })),
                          "unscheduled-jobs"
                        )}
                        download={`unscheduled-jobs-${new Date().toISOString().split("T")[0]}.csv`}
                        style={ui.btnPrimary}
                      >
                        Export CSV →
                      </a>
                    )}
                  </div>
                </div>

                {unscheduledRows.length === 0 ? (
                  <div style={{ fontSize: 12, color: theme.sub }}>No unscheduled jobs found 🎉</div>
                ) : (
                  <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table style={ui.table}>
                      <colgroup>
                        <col style={{ width: colW.age }} />
                        <col style={{ width: colW.title }} />
                        <col style={{ width: colW.date }} />
                        <col style={{ width: colW.amount }} />
                        <col style={{ width: colW.open }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={ui.th}>Age</th>
                          <th style={ui.th}>Job # + Title</th>
                          <th style={ui.th}>Created</th>
                          <th style={ui.th}>Amount</th>
                          <th style={ui.th}>Open</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unscheduledRows.map((r: any, idx: number) => {
                          const age = ageDays(r.created_at_jobber);
                          const jobNum = r.job_number ? `#${r.job_number}` : "—";
                          const title = r.job_title ? r.job_title : "Untitled job";
                          return (
                            <tr key={`${jobNum}-${idx}`}>
                              <td style={ui.td}>{age}d</td>
                              <td style={ui.td}>
                                <div style={{ fontWeight: 950 }}>
                                  <span style={{ color: theme.sub }}>{jobNum}</span>{" "}
                                  <span style={{ color: theme.text }}>• {title}</span>
                                </div>
                              </td>
                              <td style={ui.td}>
                                {r.created_at_jobber ? new Date(r.created_at_jobber).toLocaleDateString() : "—"}
                              </td>
                              <td style={ui.td}>
                                {r.total_amount_cents ? money(r.total_amount_cents) : "—"}
                              </td>
                              <td style={ui.td}>
                                {r.jobber_url ? (
                                  <a href={r.jobber_url} target="_blank" rel="noreferrer" style={ui.btn}>
                                    Open in Jobber →
                                  </a>
                                ) : (
                                  <span style={{ fontSize: 12, color: theme.mut }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Leaking Quotes */}
              <div style={{ ...ui.card, marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 1000, letterSpacing: -0.2 }}>Top Leaking Quotes</div>
                    <div style={{ marginTop: 3, fontSize: 12, color: theme.mut }}>
                      Quotes sent that are not won/converted. Highest value first.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={ui.badge("rgba(124,92,255,0.16)")}>Sales follow-up</span>
                    {leakCandidates.length > 0 && (
                      <a
                        href={generateCSV(
                          leakCandidates
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
                            }),
                          "leaking-quotes"
                        )}
                        download={`leaking-quotes-${new Date().toISOString().split("T")[0]}.csv`}
                        style={ui.btnPrimary}
                      >
                        Export CSV →
                      </a>
                    )}
                  </div>
                </div>

                {leakCandidates.length === 0 ? (
                  <div style={{ fontSize: 12, color: theme.sub }}>No leaking quotes ✅</div>
                ) : (
                  <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table style={ui.table}>
                      <colgroup>
                        <col style={{ width: colW.age }} />
                        <col style={{ width: colW.title }} />
                        <col style={{ width: colW.date }} />
                        <col style={{ width: colW.amount }} />
                        <col style={{ width: colW.open }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={ui.th}>Age</th>
                          <th style={ui.th}>Quote # + Title</th>
                          <th style={ui.th}>Sent</th>
                          <th style={ui.th}>Amount</th>
                          <th style={ui.th}>Open</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leakCandidates
                          .slice()
                          .sort((a: any, b: any) => Number(b.quote_total_cents ?? 0) - Number(a.quote_total_cents ?? 0))
                          .slice(0, 10)
                          .map((q: any, idx: number) => {
                            const sent = safeDate(q.sent_at);
                            const age = sent ? Math.max(0, Math.round((Date.now() - sent.getTime()) / 86400000)) : 0;
                            const quoteNum = q.quote_number ? `#${q.quote_number}` : "—";
                            const title = q.quote_title ? q.quote_title : "Untitled quote";
                            return (
                              <tr key={`${quoteNum}-${idx}`}>
                                <td style={ui.td}>{age}d</td>
                                <td style={ui.td}>
                                  <div style={{ fontWeight: 950 }}>
                                    <span style={{ color: theme.sub }}>{quoteNum}</span>{" "}
                                    <span style={{ color: theme.text }}>• {title}</span>
                                  </div>
                                </td>
                                <td style={ui.td}>{sent ? sent.toLocaleDateString() : "—"}</td>
                                <td style={ui.td}>{money(Number(q.quote_total_cents ?? 0))}</td>
                                <td style={ui.td}>
                                  {q.quote_url ? (
                                    <a href={q.quote_url} target="_blank" rel="noreferrer" style={ui.btn}>
                                      Open in Jobber →
                                    </a>
                                  ) : (
                                    <span style={{ fontSize: 12, color: theme.mut }}>—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* -------------------------------- Subscribe Button -------------------------------- */
function SubscribeButton() {
  return (
    <form action="/api/billing/checkout" method="POST">
      <button
        type="submit"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 12,
          fontWeight: 1000,
          fontSize: 13,
          textDecoration: "none",
          border: "1px solid rgba(255,255,255,0.16)",
          background: "linear-gradient(135deg, rgba(124,92,255,0.95), rgba(90,166,255,0.95))",
          color: "white",
          boxShadow: "0 18px 48px rgba(90,166,255,0.22)",
          cursor: "pointer",
        }}
      >
        Subscribe — $29/mo →
      </button>
    </form>
  );
}
/* -------------------------------- Manage Subscription Button -------------------------------- */
function ManageSubscriptionButton() {
  return (
    <form action="/api/billing/portal" method="POST">
      <button
        type="submit"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "9px 12px",
          borderRadius: 12,
          fontWeight: 950,
          fontSize: 13,
          textDecoration: "none",
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.06)",
          color: "#EAF1FF",
          cursor: "pointer",
        }}
      >
        Manage Subscription
      </button>
    </form>
  );
}

/* -------------------------------- Logout Button -------------------------------- */
function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "9px 12px",
          borderRadius: 12,
          fontWeight: 950,
          fontSize: 13,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "transparent",
          color: "rgba(234,241,255,0.6)",
          cursor: "pointer",
        }}
      >
        Log out
      </button>
    </form>
  );
}