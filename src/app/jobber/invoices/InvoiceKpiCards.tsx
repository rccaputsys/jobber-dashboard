"use client";

import { useState } from "react";
import { useIsLight } from "@/lib/hooks";
import { track } from "@/lib/analytics";

type PeriodMetrics = {
  collectedRevenue: string;
  collectedCount: number;
  invoicesSent: number;
  invoicesSentValue: string;
  avgDaysToPay: number;
  periodLabel: string;
};

export type { PeriodMetrics as InvoicePeriodMetrics };

export function InvoiceKpiCards({
  thisWeek,
  lastWeek,
  thisMonth,
  lastMonth,
  allTime,
  outstandingBalance: outBal,
  outstandingBalanceCents,
  pastDueBalance: pdBal,
  pastDueBalanceCents,
  outstandingCount,
  pastDueCount,
}: {
  thisWeek: PeriodMetrics;
  lastWeek: PeriodMetrics;
  thisMonth: PeriodMetrics;
  lastMonth: PeriodMetrics;
  allTime: PeriodMetrics;
  outstandingBalance: string;
  outstandingBalanceCents: number;
  pastDueBalance: string;
  pastDueBalanceCents: number;
  outstandingCount: number;
  pastDueCount: number;
}) {
  const [period, setPeriod] = useState<"thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "allTime">("thisWeek");
  const isLight = useIsLight();
  const [hovered, setHovered] = useState<string | null>(null);

  const metricsMap = { thisWeek, lastWeek, thisMonth, lastMonth, allTime };
  const metrics = metricsMap[period];

  const options = [
    { key: "thisWeek" as const, label: "This Week" },
    { key: "lastWeek" as const, label: "Last Week" },
    { key: "thisMonth" as const, label: "This Month" },
    { key: "lastMonth" as const, label: "Last Month" },
    { key: "allTime" as const, label: "All Time" },
  ];

  const pillGroup: React.CSSProperties = { display: "flex", gap: 2, background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3 };
  const btnStyle = (active: boolean, h: boolean): React.CSSProperties => ({
    padding: "6px 12px", borderRadius: 8, border: "none",
    background: active ? "linear-gradient(135deg, #7c5cff, #5aa6ff)" : h ? (isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)") : "transparent",
    color: active ? "#fff" : isLight ? "#334155" : "rgba(255,255,255,0.85)",
    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
    boxShadow: active ? "0 4px 12px rgba(124,92,255,0.3)" : "none", whiteSpace: "nowrap",
  });

  const daysColor = metrics.avgDaysToPay <= 3 ? "#10b981" : metrics.avgDaysToPay <= 7 ? "#5aa6ff" : "#f59e0b";
  const daysAccent = metrics.avgDaysToPay <= 3 ? "green" : metrics.avgDaysToPay <= 7 ? "blue" : "amber";
  const pdRatio = outstandingBalanceCents > 0 ? pastDueBalanceCents / outstandingBalanceCents : 0;
  const pdColor = pdRatio > 0.5 ? "#ef4444" : pdRatio > 0.25 ? "#f59e0b" : "#10b981";
  const pdAccent = pdRatio > 0.5 ? "red" : pdRatio > 0.25 ? "amber" : "green";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={pillGroup}>
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => { track("date_range_changed", { range: o.key, page: "invoices" }); setPeriod(o.key); }}
              onMouseEnter={() => setHovered(o.key)}
              onMouseLeave={() => setHovered(null)}
              style={btnStyle(period === o.key, hovered === o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="kpi-grid-secondary">
        {/* Outstanding Balance */}
        <div className="kpi-secondary" data-accent={pdAccent} style={{ borderLeft: `3px solid ${pdColor}` }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
              <span className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Outstanding
              </span>
              <span className="info-tooltip" style={{ width: 16, height: 16, fontSize: 10 }}>?<span className="tooltip-text">Total unpaid invoice balance. Color reflects how much is past due — green means most is current.</span></span>
            </div>
            <div className="kpi-value-medium" style={{ color: pdColor }}>
              {outBal}
            </div>
          </div>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
            {outstandingCount} {outstandingCount === 1 ? "invoice" : "invoices"}{pastDueCount > 0 && ` \u2022 ${pastDueCount} past due`}
          </div>
        </div>

        {/* Invoices Sent */}
        <div className="kpi-secondary" data-accent="blue" style={{ borderLeft: "3px solid #5aa6ff" }}>
          <div>
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Sent
            </div>
            <div className="kpi-value-medium" style={{ color: "#5aa6ff" }}>
              {metrics.invoicesSentValue}
            </div>
          </div>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
            {metrics.invoicesSent} {metrics.invoicesSent === 1 ? "invoice" : "invoices"} &bull; {metrics.periodLabel}
          </div>
        </div>

        {/* Collected */}
        <div className="kpi-secondary" data-accent="green" style={{ borderLeft: "3px solid #10b981" }}>
          <div>
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Collected
            </div>
            <div className="kpi-value-medium" style={{ color: "#10b981" }}>
              {metrics.collectedRevenue}
            </div>
          </div>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
            {metrics.collectedCount} paid &bull; {metrics.periodLabel}
          </div>
        </div>

        {/* Avg Days to Pay */}
        <div className="kpi-secondary" data-accent={daysAccent} style={{ borderLeft: `3px solid ${daysColor}` }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
              <span className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Avg Days to Pay
              </span>
              <span className="info-tooltip" style={{ width: 16, height: 16, fontSize: 10 }}>?<span className="tooltip-text">Average days from invoice created to payment received. Under 3 days is excellent. Over 7 days means clients are slow to pay.</span></span>
            </div>
            <div className="kpi-value-medium" style={{ color: daysColor }}>
              {metrics.avgDaysToPay > 0 ? metrics.avgDaysToPay : "\u2014"}
            </div>
          </div>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
            {metrics.periodLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
