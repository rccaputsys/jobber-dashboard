"use client";

import { useState, useMemo } from "react";
import { useIsLight } from "@/lib/hooks";
import { CollectionChart } from "./CollectionChart";

type InvoiceEvent = { ts: number; amount: number; type: "sent" | "paid" };
type AgingBucket = { label: string; color: string; balanceCents: number; count: number };
type Granularity = "week" | "month";

type Props = {
  events: InvoiceEvent[];
  agingBuckets: AgingBucket[];
  totalOutstandingCents: number;
  currencyCode: string;
  draftCount?: number;
  draftCents?: number;
};

function startOfDayUTC(d: Date) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
function addDaysUTC(d: Date, n: number) { const x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + n); return x; }
function startOfWeekUTC(d: Date) { const x = startOfDayUTC(d); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x; }
function startOfMonthUTC(d: Date) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); }
function bucketStartUTC(d: Date, g: Granularity) { if (g === "week") return startOfWeekUTC(d); return startOfMonthUTC(d); }
function nextBucketUTC(d: Date, g: Granularity) { if (g === "week") return addDaysUTC(d, 7); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); }
function labelForBucket(d: Date, g: Granularity) { const m = d.toLocaleString(undefined, { month: "short", timeZone: "UTC" }); if (g === "month") return `${m} ${d.getUTCFullYear().toString().slice(2)}`; return `${m} ${d.getUTCDate()}`; }

function moneyFmt(cents: number, code: string): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(cents / 100); }
  catch { return `$${Math.round(cents / 100).toLocaleString()}`; }
}

function defaultRange(preset: string) {
  const today = startOfDayUTC(new Date());
  if (preset === "30d") return { start: addDaysUTC(today, -30), end: today };
  if (preset === "90d") return { start: addDaysUTC(today, -90), end: today };
  if (preset === "ytd") return { start: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)), end: today };
  if (preset === "t12m") return { start: addDaysUTC(today, -365), end: today };
  return { start: addDaysUTC(today, -56), end: today };
}

/* ---- Aging donut panel ---- */
function AgingDonutPanel({ buckets, totalCents, currencyCode, isLight }: {
  buckets: AgingBucket[];
  totalCents: number;
  currencyCode: string;
  isLight: boolean;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const size = 180;
  const svgPad = 8; // extra padding for hover stroke expansion
  const stroke = 24;
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const money = (c: number) => moneyFmt(c, currencyCode);

  const nonEmpty = buckets.filter(b => b.balanceCents > 0);

  let accumulated = 0;
  const segments = nonEmpty.map((bucket, idx) => {
    const pct = totalCents > 0 ? bucket.balanceCents / totalCents : 0;
    const segLen = circumference * pct;
    const startOffset = accumulated;
    accumulated += pct;
    return { ...bucket, pct, segLen, startOffset, idx };
  });

  const hoveredBucket = hoveredIdx !== null ? nonEmpty[hoveredIdx] : null;
  const hoveredPct = hoveredBucket && totalCents > 0 ? Math.round((hoveredBucket.balanceCents / totalCents) * 100) : 0;

  return (
    <div className="panel hover-lift" style={{ padding: 16, height: "100%", display: "flex", flexDirection: "column", overflow: "visible" }}>
      <div style={{ marginBottom: 12 }}>
        <div className="text-primary" style={{ fontWeight: 700, fontSize: 14 }}>Outstanding Aging</div>
        <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
          {nonEmpty.length > 0
            ? `${buckets.reduce((s, b) => s + b.count, 0)} invoices across ${nonEmpty.length} ${nonEmpty.length === 1 ? "category" : "categories"}`
            : "No outstanding invoices"}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ position: "relative", width: size + svgPad * 2, height: size + svgPad * 2, margin: `${-svgPad}px` }}>
          <svg width={size + svgPad * 2} height={size + svgPad * 2} viewBox={`${-svgPad} ${-svgPad} ${size + svgPad * 2} ${size + svgPad * 2}`}>
            <circle cx={cx} cy={cy} r={radius} fill="none"
              stroke={isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)"}
              strokeWidth={stroke} />
            {segments.map((seg, i) => (
              <circle key={seg.label} cx={cx} cy={cy} r={radius} fill="none"
                stroke={seg.color}
                strokeWidth={hoveredIdx === i ? stroke + 6 : stroke}
                strokeDasharray={`${seg.segLen} ${circumference - seg.segLen}`}
                strokeDashoffset={-circumference * seg.startOffset}
                transform={`rotate(-90 ${cx} ${cy})`}
                opacity={hoveredIdx !== null && hoveredIdx !== i ? 0.4 : 1}
                style={{ cursor: "pointer", transition: "stroke-width 0.2s ease, opacity 0.2s ease" }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            ))}
          </svg>
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)", textAlign: "center",
            pointerEvents: "none",
          }}>
            {hoveredBucket ? (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: hoveredBucket.color, marginBottom: 3 }}>
                  {hoveredBucket.label}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: isLight ? "#1e293b" : "#EAF1FF", letterSpacing: -0.5, lineHeight: 1 }}>
                  {money(hoveredBucket.balanceCents)}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: hoveredBucket.color, marginTop: 3 }}>
                  {hoveredPct}% &bull; {hoveredBucket.count} inv
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)", marginBottom: 3 }}>
                  Outstanding
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: isLight ? "#1e293b" : "#EAF1FF", letterSpacing: -0.5, lineHeight: 1 }}>
                  {money(totalCents)}
                </div>
                <div className="text-muted" style={{ fontSize: 11, marginTop: 3 }}>
                  {buckets.reduce((s, b) => s + b.count, 0)} invoices
                </div>
              </>
            )}
          </div>
        </div>

        {/* Legend rows */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
          {buckets.map((bucket, i) => {
            const pct = totalCents > 0 ? Math.round((bucket.balanceCents / totalCents) * 100) : 0;
            const isHov = hoveredIdx === i;
            return (
              <div key={bucket.label}
                onMouseEnter={() => { if (bucket.balanceCents > 0) setHoveredIdx(nonEmpty.indexOf(bucket)); }}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "6px 10px", borderRadius: 8,
                  background: isHov ? (isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)") : "transparent",
                  cursor: bucket.balanceCents > 0 ? "pointer" : "default",
                  transition: "background 0.15s ease",
                  opacity: bucket.balanceCents > 0 ? 1 : 0.35,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: bucket.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: isLight ? "#334155" : "rgba(255,255,255,0.8)" }}>
                    {bucket.label}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="text-muted" style={{ fontSize: 11 }}>
                    {bucket.count} inv
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: bucket.balanceCents > 0 ? bucket.color : (isLight ? "#cbd5e1" : "rgba(255,255,255,0.15)"), minWidth: 60, textAlign: "right" }}>
                    {bucket.balanceCents > 0 ? money(bucket.balanceCents) : "\u2014"}
                  </span>
                  {bucket.balanceCents > 0 && (
                    <span className="text-muted" style={{ fontSize: 10, minWidth: 28, textAlign: "right" }}>{pct}%</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---- Main component ---- */
export function InvoiceTrendsSection({ events, agingBuckets, totalOutstandingCents, currencyCode, draftCount, draftCents }: Props) {
  const [range, setRangeRaw] = useState("8w");
  const [g, setGRaw] = useState<Granularity>("week");

  // Auto-switch to monthly for long ranges (too many weekly bars)
  const setRange = (v: string) => {
    setRangeRaw(v);
    if ((v === "t12m" || v === "ytd") && g === "week") setGRaw("month");
  };
  const setG = (v: Granularity) => {
    // Prevent weekly on 12M/YTD
    if (v === "week" && (range === "t12m" || range === "ytd")) return;
    setGRaw(v);
  };
  const [hovered, setHovered] = useState<string | null>(null);
  const isLight = useIsLight();
  const money = useMemo(() => (cents: number) => moneyFmt(cents, currencyCode), [currencyCode]);

  const rangeOptions = [
    { key: "30d", label: "30D" },
    { key: "8w", label: "8W" },
    { key: "90d", label: "90D" },
    { key: "ytd", label: "YTD" },
    { key: "t12m", label: "12M" },
  ];
  const gOptions: { key: Granularity; label: string }[] = [
    { key: "week", label: "Wk" },
    { key: "month", label: "Mo" },
  ];

  const btnStyle = (active: boolean, h: boolean): React.CSSProperties => ({
    padding: "5px 8px", borderRadius: 6, border: "none",
    background: active ? "linear-gradient(135deg, #7c5cff, #5aa6ff)" : h ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)") : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
    boxShadow: active ? "0 2px 8px rgba(124,92,255,0.3)" : "none", whiteSpace: "nowrap",
  });
  const pillGroup: React.CSSProperties = { display: "flex", gap: 1, background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)", borderRadius: 8, padding: 2 };
  const labelStyle: React.CSSProperties = { fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: isLight ? "#94a3b8" : "rgba(255,255,255,0.4)", marginRight: 6, whiteSpace: "nowrap" };

  // Compute period data for CollectionChart
  const periodData = useMemo(() => {
    const r = defaultRange(range);
    const today = startOfDayUTC(new Date());
    const todayTs = today.getTime();
    const starts: Date[] = [];
    let cur = bucketStartUTC(r.start, g);
    const endExcl = addDaysUTC(r.end, 1);
    while (cur.getTime() < endExcl.getTime()) {
      const bucketEnd = nextBucketUTC(cur, g);
      // Only exclude current incomplete period for weekly view
      // Monthly view: include current month (has enough data to be meaningful)
      if (g === "week" && bucketEnd.getTime() > todayTs + 86400000) {
        cur = bucketEnd; continue;
      }
      starts.push(cur);
      if (bucketEnd.getTime() === cur.getTime()) break;
      cur = bucketEnd;
      if (starts.length > 200) break;
    }

    return starts.map((bs) => {
      const bsTs = bs.getTime();
      const beTs = nextBucketUTC(bs, g).getTime();
      let invoiced = 0, collected = 0;
      for (const ev of events) {
        if (ev.ts >= bsTs && ev.ts < beTs) {
          if (ev.type === "sent") invoiced += ev.amount;
          else collected += ev.amount;
        }
      }
      return { label: labelForBucket(bs, g), invoiced, collected };
    });
  }, [range, g, events]);

  return (
    <div className="panel animate-in delay-2" style={{ padding: 0, marginTop: 16, overflow: "visible" }}>
      <div style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <h2 className="text-primary" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              Collections & Aging
            </h2>
            <span className="info-tooltip">?<span className="tooltip-text">Left: Cash collected vs invoiced per period — are you keeping up? Right: How old your current outstanding balance is.</span></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={labelStyle}>Range</span>
            <div style={pillGroup}>
              {rangeOptions.map((o) => (
                <button key={o.key} onClick={() => setRange(o.key)} onMouseEnter={() => setHovered(`r-${o.key}`)} onMouseLeave={() => setHovered(null)} style={btnStyle(range === o.key, hovered === `r-${o.key}`)}>{o.label}</button>
              ))}
            </div>
            <div style={{ width: 1, height: 22, background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)", flexShrink: 0 }} />
            <span style={labelStyle}>Group</span>
            <div style={pillGroup}>
              {gOptions.map((o) => (
                <button key={o.key} onClick={() => setG(o.key)} onMouseEnter={() => setHovered(`g-${o.key}`)} onMouseLeave={() => setHovered(null)} style={btnStyle(g === o.key, hovered === `g-${o.key}`)}>{o.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, padding: "0 16px 20px" }} className="invoice-trends-grid">
        <style>{`@media (min-width: 768px) { .invoice-trends-grid { grid-template-columns: minmax(0, 1fr) 280px !important; } }`}</style>

        {/* Left: Collection Chart */}
        {events.length > 0 ? (
          <CollectionChart
            periods={periodData}
            currencyCode={currencyCode}
            outstandingCents={totalOutstandingCents}
            draftCount={draftCount}
            draftCents={draftCents}
          />
        ) : (
          <div className="panel" style={{ padding: 32, textAlign: "center" }}>
            <span className="text-muted">No invoice data yet</span>
          </div>
        )}

        {/* Right: Aging Donut */}
        <div style={{ minWidth: 280 }}>
          <AgingDonutPanel
            buckets={agingBuckets}
            totalCents={totalOutstandingCents}
            currencyCode={currencyCode}
            isLight={isLight}
          />
        </div>
      </div>
    </div>
  );
}
