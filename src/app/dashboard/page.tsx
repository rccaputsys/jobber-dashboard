// src/app/dashboard/page.tsx
import React from "react";
import { Controls } from "./controls";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
function startOfWeekUTC(d: Date) {
  const x = startOfDayUTC(d);
  const day = x.getUTCDay();
  const delta = (day + 6) % 7; // Monday-start
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
    padding: "12px 10px",
    color: theme.mut,
    fontWeight: 1000,
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    fontSize: 12,
    letterSpacing: 0.2,
    userSelect: "none",
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  td: { padding: "12px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)", verticalAlign: "top" } as React.CSSProperties,
};

function InfoIcon(props: { text: string }) {
  return (
    <span style={ui.info} title={props.text} aria-label={props.text}>
      i
    </span>
  );
}

/* ------------------------------ Mini Charts ------------------------------ */
function SparkLine(props: {
  title: string;
  subtitle: string;
  points: { xLabel: string; value: number; tooltip: string }[];
  formatY: (v: number) => string;
  tooltip: string;
  chartType: ChartType;
}) {
  const vbW = 360;
  const vbH = 150;

  const padL = 52;
  const padR = 18;
  const padT = 18;
  const padB = 36;

  const vals = props.points.map((p) => p.value);
  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 1;
  const span = Math.max(1e-9, max - min);

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

  return (
    <div style={{ ...ui.card, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 1000, letterSpacing: -0.2 }}>
            {props.title} <InfoIcon text={props.tooltip} />
          </div>
          <div style={{ marginTop: 3, fontSize: 12, color: theme.mut }}>{props.subtitle}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: theme.mut, fontWeight: 950 }}>Max</div>
          <div style={{ fontWeight: 1000 }}>{props.formatY(yTop)}</div>
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
              <path d={d} fill="none" stroke="rgba(90,166,255,0.16)" strokeWidth="10" strokeLinecap="round" />
              <path d={d} fill="none" stroke="rgba(234,241,255,0.92)" strokeWidth="2.4" strokeLinecap="round" />
              {props.points.map((p, i) => (
                <g key={i}>
                  <circle cx={xOf(i)} cy={yOf(p.value)} r={3.4} fill="rgba(234,241,255,0.95)">
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
                  <rect key={i} x={x} y={y} width={barW} height={Math.max(1, h)} rx={6} fill="rgba(234,241,255,0.80)">
                    <title>{p.tooltip}</title>
                  </rect>
                );
              })}
            </>
          )}
        </g>

        {props.points.map((p, i) => {
          if (i % 2 === 1) return null;
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
    connection_id?: string;
    range?: string;
    start?: string;
    end?: string;
    g?: Granularity;
    chart?: ChartType;
    unscheduled_min_days?: string;
  }>;
}) {
  const sp = await searchParams;
  const connectionId = sp.connection_id;
  if (!connectionId) return <div style={{ padding: 24 }}>Missing connection_id</div>;

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

  // Build toggle URL server-side (NO onClick)
  const qp = new URLSearchParams();
  qp.set("connection_id", connectionId);
  if (sp.range) qp.set("range", sp.range);
  if (sp.start) qp.set("start", sp.start);
  if (sp.end) qp.set("end", sp.end);
  if (sp.g) qp.set("g", sp.g);
  if (sp.chart) qp.set("chart", sp.chart);
  if (nextMinDays) qp.set("unscheduled_min_days", String(nextMinDays));
  const toggleUnscheduledHref = `/dashboard?${qp.toString()}`;

  // Connection summary
  const { data: conn } = await supabaseAdmin
    .from("jobber_connections")
    .select("last_sync_at,trial_started_at,trial_ends_at,billing_status,currency_code")
    .eq("id", connectionId)
    .maybeSingle();

  const currencyCode = (conn?.currency_code || "USD").toUpperCase();
  const money = moneyFactory(currencyCode);

  const lastSyncPretty = conn?.last_sync_at ? new Date(conn.last_sync_at).toLocaleString() : "Not synced yet";
  const lastSyncAge = conn?.last_sync_at ? Math.max(0, daysBetweenUTC(todayUTC, startOfDayUTC(new Date(conn.last_sync_at)))) : null;

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
  let b0_7 = 0, b8_14 = 0, b15_30 = 0, b30p = 0;
  for (const inv of invoices) {
    const due = safeDate(inv.due_at ?? inv.dueDate ?? inv.due_date);
    if (!due) continue;
    const days = (nowMs - due.getTime()) / 86400000;
    const amt = Number(inv.total_amount_cents ?? inv.total_cents ?? inv.total_amount ?? 0);
    if (days <= 7) b0_7 += amt;
    else if (days <= 14) b8_14 += amt;
    else if (days <= 30) b15_30 += amt;
    else b30p += amt;
  }
  const totalAR = b0_7 + b8_14 + b15_30 + b30p;
  const riskPct = totalAR > 0 ? (b15_30 + b30p) / totalAR : 0;
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
  const overbookedHard = daysBookedAhead > 21;

  const capScore = clamp(
    (underbooked ? (TARGET_LOW - daysBookedAhead) * 14 : 0) + (overbookedHard ? 55 : 0) + clamp(unscheduledCount * 4, 0, 30),
    0,
    100
  );
  const capSev = severityFromScore(capScore);
  const capState = underbooked ? "Underbooked" : balanced ? "Balanced" : "Overbooked";

  // Completed & profitability (range-bound)
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

  const revPerJob = completedCount ? Math.round(revSum / completedCount) : 0;
  const marginPerJob = completedCount ? Math.round(profitSum / completedCount) : 0;

  const jobsWithProfit = jobs.filter((j) => j.job_profit_cents !== null && j.job_profit_cents !== undefined).length;
  const profitCoverageAll = jobs.length ? jobsWithProfit / jobs.length : 0;
  const jobsWithProfitInRange = completedInRange.filter((j) => j.job_profit_cents !== null && j.job_profit_cents !== undefined).length;
  const profitCoverageRange = completedCount ? jobsWithProfitInRange / completedCount : 0;

  // Make this actionable: convert coverage into an “insight”
  const coverageLabel =
    jobs.length === 0
      ? { label: "No jobs yet", sev: "good" as const }
      : profitCoverageAll >= 0.8
      ? { label: "Strong coverage", sev: "good" as const }
      : profitCoverageAll >= 0.4
      ? { label: "Partial coverage", sev: "warning" as const }
      : { label: "Low coverage", sev: "critical" as const };

  const coverageWhatToDo =
    jobs.length === 0
      ? "Once you have jobs, this will track margin per job over time."
      : profitCoverageAll >= 0.8
      ? "Your margin signals are reliable. Use Margin/Job trends to spot price or labor drift."
      : profitCoverageAll >= 0.4
      ? "Margins are usable but incomplete. Treat the trend directionally."
      : "Margin trends may be misleading until more jobs have costs/profit synced.";

  // Quote leak (range-bound on sent_at)
  const leakCandidates = quotes
    .filter((q) => q.sent_at)
    .filter((q) => {
      const dt = safeDate(q.sent_at);
      if (!dt) return false;
      return dt.getTime() >= start.getTime() && dt.getTime() < endExclusive.getTime();
    })
    .filter((q) => {
      const st = String(q.quote_status ?? "").trim();
      if (!st) return true;
      return !statusLooksWon(st);
    });

  const leakCount = leakCandidates.length;
  const leakDollars = leakCandidates.reduce((sum, q) => sum + Number(q.quote_total_cents ?? 0), 0);
  const qScore = clamp(leakCount * 8, 0, 100);
  const qSev = severityFromScore(qScore);

  // Unscheduled list (table)
  const { data: unsched } = await supabaseAdmin
    .from("fact_jobs")
    .select("job_number,job_title,created_at_jobber,jobber_url")
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
    let sum = 0;
    for (const q of leakCandidates) {
      const dt = safeDate(q.sent_at);
      if (!dt) continue;
      const t = dt.getTime();
      if (t >= bs.getTime() && t < be.getTime()) sum += Number(q.quote_total_cents ?? 0);
    }
    return sum;
  });

  const ar30ByBucket = bucketStarts.map((bs) => {
    const be = nextBucketUTC(bs, g);
    const endTs = be.getTime();
    let sum = 0;
    for (const inv of invoices) {
      const due = safeDate(inv.due_at ?? inv.dueDate ?? inv.due_date);
      if (!due) continue;
      const daysLate = (endTs - due.getTime()) / 86400000;
      if (daysLate > 30) sum += Number(inv.total_amount_cents ?? inv.total_cents ?? inv.total_amount ?? 0);
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

  const marginPerJobByBucket = bucketStarts.map((bs) => {
    const be = nextBucketUTC(bs, g).getTime();
    const inBucket = jobs.filter((j) => {
      const raw = completedDateKeys.map((k) => j[k]).find((v) => v);
      const dt = safeDate(raw);
      if (!dt) return false;
      const t = dt.getTime();
      return t >= bs.getTime() && t < be;
    });

    if (!inBucket.length) return 0;

    const profit = inBucket.reduce((sum, j) => {
      const p = j.job_profit_cents;
      if (p !== null && p !== undefined) return sum + Number(p);
      return sum + (Number(j.job_revenue_cents ?? 0) - Number(j.job_cost_cents ?? 0));
    }, 0);

    return Math.round(profit / inBucket.length);
  });

  const points = {
    leak: bucketStarts.map((bs, i) => {
      const label = labelForBucket(bs, g);
      const v = leakByBucket[i];
      return { xLabel: label, value: v, tooltip: `${label}: ${money(v)} leaked quotes` };
    }),
    ar30: bucketStarts.map((bs, i) => {
      const label = labelForBucket(bs, g);
      const v = ar30ByBucket[i];
      return { xLabel: label, value: v, tooltip: `${label}: ${money(v)} AR 30+ balance` };
    }),
    unsched: bucketStarts.map((bs, i) => {
      const label = labelForBucket(bs, g);
      const v = unschedByBucket[i];
      return { xLabel: label, value: v, tooltip: `${label}: ${v} unscheduled jobs` };
    }),
    margin: bucketStarts.map((bs, i) => {
      const label = labelForBucket(bs, g);
      const v = marginPerJobByBucket[i];
      return { xLabel: label, value: v, tooltip: `${label}: ${money(v)} margin/job` };
    }),
  };

  const trialEnds = conn?.trial_ends_at ? new Date(conn.trial_ends_at).getTime() : 0;
  const trialActive = trialEnds > Date.now();
  const upgradeHref = `/billing/upgrade?connection_id=${connectionId}`;

  // Shared table column widths so both tables align perfectly
  const colW = {
    age: "96px",
    title: "auto",
    date: "140px",
    amount: "140px",
    open: "190px",
  };

  return (
    <main style={ui.page}>
      <style>{`
        a:hover { filter: brightness(1.06); }
        tr:hover td { background: rgba(255,255,255,0.030); }
        tbody tr:nth-child(2n) td { background: rgba(255,255,255,0.012); }
        @media (max-width: 980px) {
          .span3 { grid-column: span 12 !important; }
          .span4 { grid-column: span 12 !important; }
          .span6 { grid-column: span 12 !important; }
        }
      `}</style>

      <div style={ui.container}>
        <div style={ui.header}>
          <div style={ui.brand}>
            <div style={ui.logo} />
            <div>
              <div style={ui.h1}>Jobber Insights</div>
              <div style={ui.hSub}>
                Last sync: <strong style={{ color: theme.text }}>{lastSyncPretty}</strong>
                {lastSyncAge !== null ? <span style={{ color: theme.mut }}> • {lastSyncAge} day(s) ago</span> : null}
                <span style={{ color: theme.mut }}> • Currency {currencyCode}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={ui.pill} title="Share of AR that is 15+ days overdue.">
              <span style={ui.dot(sevBg(arSev))} />
              AR Risk <strong style={{ color: theme.text }}>{pct(riskPct)}</strong>
            </span>

            <span style={ui.pill} title="Capacity uses days booked ahead plus unscheduled job volume.">
              <span style={ui.dot(sevBg(capSev))} />
              Capacity <strong style={{ color: theme.text }}>{capState}</strong>
            </span>

            <a href={upgradeHref} style={ui.btnPrimary} title="Unlock trends + exports after the 14-day trial.">
              Activate subscription →
            </a>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <Controls />
        </div>

        {/* KPIs */}
        <div style={ui.panel}>
          <div style={ui.section}>
            <div>
              <div style={ui.sectionTitle}>Overview KPIs</div>
              <div style={ui.sectionSub}>
                High-signal KPIs tied to cash, conversion, and profitability (range applies to completion + quote leak).
              </div>
            </div>
            <span style={ui.badge("rgba(124,92,255,0.16)")}>
              Range: {toISODateOnlyUTC(start)} → {toISODateOnlyUTC(end)}
            </span>
          </div>

          <div style={ui.grid}>
            <div className="span3" style={{ ...ui.kpiCard, gridColumn: "span 3" }}>
              <div style={ui.kpiLabel}>
                TOTAL AR <InfoIcon text="Total AR = sum(invoice totals) across due buckets (as of today)." />
              </div>
              <div style={ui.kpiValue}>{money(totalAR)}</div>
              <div style={ui.kpiMeta}>
                15+ days risk: <strong>{pct(riskPct)}</strong>
              </div>
            </div>

            <div className="span3" style={{ ...ui.kpiCard, gridColumn: "span 3" }}>
              <div style={ui.kpiLabel}>
                DAYS BOOKED AHEAD <InfoIcon text="Days booked ahead = days until the latest scheduled job start (target 7–14)." />
              </div>
              <div style={ui.kpiValue}>{daysBookedAhead}</div>
              <div style={ui.kpiMeta}>
                Target: <strong>{TARGET_LOW}–{TARGET_HIGH}</strong>
              </div>
            </div>

            <div className="span3" style={{ ...ui.kpiCard, gridColumn: "span 3" }}>
              <div style={ui.kpiLabel}>
                UNSCHEDULED JOBS <InfoIcon text="Unscheduled jobs = count of jobs with no scheduled_start_at." />
              </div>
              <div style={ui.kpiValue}>{unscheduledCount}</div>
              <div style={ui.kpiMeta}>Backlog you can schedule quickly.</div>
            </div>

            <div className="span3" style={{ ...ui.kpiCard, gridColumn: "span 3" }}>
              <div style={ui.kpiLabel}>
                QUOTE LEAK <InfoIcon text="Quote leak = sum of quote_total_cents for sent quotes in range not won/converted." />
              </div>
              <div style={ui.kpiValue}>{money(leakDollars)}</div>
              <div style={ui.kpiMeta}>
                {leakCount} quote(s) at risk • <strong>{qSev.toUpperCase()}</strong>
              </div>
            </div>

            <div className="span3" style={{ ...ui.kpiCard, gridColumn: "span 3" }}>
              <div style={ui.kpiLabel}>
                JOBS COMPLETED <InfoIcon text="Completed jobs = count of jobs with completed_at inside selected range." />
              </div>
              <div style={ui.kpiValue}>{completedCount}</div>
              <div style={ui.kpiMeta}>Throughput signal.</div>
            </div>

            <div className="span3" style={{ ...ui.kpiCard, gridColumn: "span 3" }}>
              <div style={ui.kpiLabel}>
                REVENUE / JOB <InfoIcon text="Revenue/job = avg(job_revenue_cents) over completed jobs in range." />
              </div>
              <div style={ui.kpiValue}>{money(revPerJob)}</div>
              <div style={ui.kpiMeta}>Uses job revenue sync.</div>
            </div>

            <div className="span3" style={{ ...ui.kpiCard, gridColumn: "span 3" }}>
              <div style={ui.kpiLabel}>
                MARGIN / JOB <InfoIcon text="Margin/job = avg(job_profit_cents) over completed jobs in range." />
              </div>
              <div style={ui.kpiValue}>{money(marginPerJob)}</div>
              <div style={ui.kpiMeta}>Uses profitability sync.</div>
            </div>

            <div className="span3" style={{ ...ui.kpiCard, gridColumn: "span 3" }}>
              <div style={ui.kpiLabel}>
                PROFIT COVERAGE <InfoIcon text="Coverage = % of jobs with job_profit_cents populated (all jobs vs completed jobs in range)." />
              </div>
              <div style={ui.kpiValue}>{pct(profitCoverageAll)}</div>
              <div style={ui.kpiMeta}>
                In-range: <strong>{pct(profitCoverageRange)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Trends + Action Lists */}
        <div style={{ marginTop: 14 }}>
          {!trialActive ? (
            <div
              style={{
                borderRadius: 18,
                border: `1px solid ${theme.border2}`,
                background:
                  "radial-gradient(900px 520px at 50% 30%, rgba(124,92,255,0.26), transparent 62%), rgba(6,8,17,0.76)",
                backdropFilter: "blur(12px)",
                padding: 18,
                boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 16,
                    background: "linear-gradient(135deg, rgba(124,92,255,0.95), rgba(90,166,255,0.95))",
                    border: "1px solid rgba(255,255,255,0.18)",
                    boxShadow: "0 16px 42px rgba(90,166,255,0.20)",
                  }}
                />
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 16, fontWeight: 1000, letterSpacing: -0.2 }}>Unlock trends & exports</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: theme.sub, lineHeight: 1.5 }}>
                    KPIs remain visible. Trends and CSV exports are subscription features.
                  </div>
                </div>
                <a href={upgradeHref} style={ui.btnPrimary}>
                  Activate subscription →
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Trends */}
              <div style={ui.panel}>
                <div style={ui.section}>
                  <div>
                    <div style={ui.sectionTitle}>Trends</div>
                    <div style={ui.sectionSub}>
                      Bucketed by your selection (Daily/Weekly/Monthly/Quarterly). Hover points/bars for exact values.
                    </div>
                  </div>
                  <span style={ui.badge("rgba(90,166,255,0.16)")}>
                    View: {g === "day" ? "Daily" : g === "week" ? "Weekly" : g === "month" ? "Monthly" : "Quarterly"} •{" "}
                    {chartType === "line" ? "Line" : "Bars"}
                  </span>
                </div>

                <div style={ui.grid}>
                  <div className="span4" style={{ gridColumn: "span 4" }}>
                    <SparkLine
                      title="Quote leak"
                      subtitle="Sum of leaked quote totals"
                      points={points.leak}
                      formatY={(v) => money(v)}
                      tooltip="Each bucket = sum(quote_total_cents) for leaked quotes with sent_at inside that bucket."
                      chartType={chartType}
                    />
                  </div>

                  <div className="span4" style={{ gridColumn: "span 4" }}>
                    <SparkLine
                      title="AR 30+"
                      subtitle="Overdue > 30 days (as-of each bucket end)"
                      points={points.ar30}
                      formatY={(v) => money(v)}
                      tooltip="Each bucket = AR 30+ balance computed as of bucket end."
                      chartType={chartType}
                    />
                  </div>

                  <div className="span4" style={{ gridColumn: "span 4" }}>
                    <SparkLine
                      title="Unscheduled jobs"
                      subtitle="Backlog count (as-of bucket end)"
                      points={points.unsched}
                      formatY={(v) => `${Math.round(v)}`}
                      tooltip="Each bucket = count of unscheduled jobs as of bucket end."
                      chartType={chartType}
                    />
                  </div>

                  <div className="span6" style={{ gridColumn: "span 6" }}>
                    <SparkLine
                      title="Margin / job"
                      subtitle="Avg profit for completed jobs per bucket"
                      points={points.margin}
                      formatY={(v) => money(v)}
                      tooltip="Each bucket = average job_profit_cents for jobs completed within that bucket."
                      chartType={chartType}
                    />
                  </div>

                  {/* Rebuilt Insight Card (replaces Profitability Sync box) */}
                  <div className="span6" style={{ gridColumn: "span 6" }}>
                    <div style={{ ...ui.card, height: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 1000, letterSpacing: -0.2 }}>
                            Profit insight{" "}
                            <InfoIcon text="This section helps you trust (or distrust) margin signals by showing coverage. Coverage is % of jobs with job_profit_cents populated." />
                            <span style={ui.badge(sevBg(coverageLabel.sev))}>{coverageLabel.label}</span>
                          </div>
                          <div style={{ marginTop: 6, fontSize: 12, color: theme.sub, lineHeight: 1.55 }}>
                            {coverageWhatToDo}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                        <div style={{ border: `1px solid ${theme.border}`, borderRadius: 14, padding: 12, background: "rgba(255,255,255,0.04)" }}>
                          <div style={{ fontSize: 11, color: theme.mut, fontWeight: 950 }}>Coverage (all jobs)</div>
                          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 1000 }}>{pct(profitCoverageAll)}</div>
                        </div>

                        <div style={{ border: `1px solid ${theme.border}`, borderRadius: 14, padding: 12, background: "rgba(255,255,255,0.04)" }}>
                          <div style={{ fontSize: 11, color: theme.mut, fontWeight: 950 }}>Coverage (in range)</div>
                          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 1000 }}>{pct(profitCoverageRange)}</div>
                        </div>

                        <div style={{ border: `1px solid ${theme.border}`, borderRadius: 14, padding: 12, background: "rgba(255,255,255,0.04)" }}>
                          <div style={{ fontSize: 11, color: theme.mut, fontWeight: 950 }}>Margin / job (range)</div>
                          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 1000 }}>{money(marginPerJob)}</div>
                        </div>
                      </div>

                      <div style={{ marginTop: 12, fontSize: 12, color: theme.mut, lineHeight: 1.55 }}>
                        <strong style={{ color: theme.text }}>How to use this:</strong> If Margin/Job trends down while Revenue/Job stays flat, it usually points to
                        labor creep, route inefficiency, or discounting.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Lists */}
              <div style={{ ...ui.panel, marginTop: 14 }}>
                <div style={ui.section}>
                  <div>
                    <div style={ui.sectionTitle}>Action Lists</div>
                    <div style={ui.sectionSub}>Two lists that drive weekly wins: schedule backlog + close sales leaks.</div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a href={toggleUnscheduledHref} style={ui.btn} title="Filter unscheduled jobs to oldest items">
                      {minDays >= 7 ? "Show all unscheduled" : "Show 7+ day unscheduled"}
                    </a>

                    <a href={`/api/export/leaking-quotes?connection_id=${connectionId}&limit=200`} style={ui.btnPrimary}>
                      Export leaking quotes CSV →
                    </a>
                    <a href={`/api/export/unscheduled-jobs?connection_id=${connectionId}&min_days=${minDays}&limit=200`} style={ui.btnPrimary}>
                      Export unscheduled jobs CSV →
                    </a>
                  </div>
                </div>

                <div style={{ padding: 16 }}>
                  {/* Unscheduled Jobs */}
                  <div style={ui.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 1000, letterSpacing: -0.2 }}>Top Unscheduled Jobs</div>
                        <div style={{ marginTop: 3, fontSize: 12, color: theme.mut }}>
                          Oldest first. Shows Job # and Title.
                        </div>
                      </div>
                      <span style={ui.badge("rgba(90,166,255,0.16)")}>Scheduling</span>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      {unscheduledRows.length === 0 ? (
                        <div style={{ fontSize: 12, color: theme.sub }}>No unscheduled jobs found 🎉</div>
                      ) : (
                        <table style={ui.table}>
                          <colgroup>
                            <col style={{ width: colW.age }} />
                            <col style={{ width: colW.title }} />
                            <col style={{ width: colW.date }} />
                            <col style={{ width: colW.open }} />
                          </colgroup>
                          <thead>
                            <tr>
                              <th style={ui.th}>Age (days)</th>
                              <th style={ui.th}>Job # + Title</th>
                              <th style={ui.th}>Created</th>
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
                                  <td style={ui.td}>{age}</td>
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
                      )}
                    </div>
                  </div>

                  {/* Leaking Quotes */}
                  <div style={{ ...ui.card, marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 1000, letterSpacing: -0.2 }}>Top Leaking Quotes</div>
                        <div style={{ marginTop: 3, fontSize: 12, color: theme.mut }}>
                          Quotes sent in range that are not won/converted. Highest value first.
                        </div>
                      </div>
                      <span style={ui.badge("rgba(124,92,255,0.16)")}>Sales follow-up</span>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      {leakCandidates.length === 0 ? (
                        <div style={{ fontSize: 12, color: theme.sub }}>No leaking quotes in this range ✅</div>
                      ) : (
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
                              <th style={ui.th}>Age (days)</th>
                              <th style={ui.th}>Quote # + Title</th>
                              <th style={ui.th}>Sent</th>
                              <th style={ui.th}>Total</th>
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
                                    <td style={ui.td}>{age}</td>
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
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
