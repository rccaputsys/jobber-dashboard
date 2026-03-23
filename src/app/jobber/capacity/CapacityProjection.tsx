"use client";

import { useMemo } from "react";
import { useIsLight } from "@/lib/hooks";
import { SparkLine } from "../dashboard/SparkLine";

type WeekProjection = {
  weekLabel: string;
  revenueCents: number;
  jobCount: number;
};

function moneyFmt(cents: number, code: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: code, maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", maximumFractionDigits: 0,
    }).format(cents / 100);
  }
}

export function CapacityProjection({
  weeks,
  weeklyTargetCents,
  currencyCode,
}: {
  weeks: WeekProjection[];
  weeklyTargetCents: number | null;
  currencyCode: string;
}) {
  const isLight = useIsLight();

  const money = useMemo(() => (cents: number) => moneyFmt(cents, currencyCode), [currencyCode]);

  const points = weeks.map(d => ({
    xLabel: d.weekLabel,
    value: d.revenueCents,
    tooltip: `${d.weekLabel}: ${money(d.revenueCents)}`,
    hoverLabel: `${d.jobCount} ${d.jobCount !== 1 ? "jobs" : "job"}`,
  }));

  // Summary stats
  const totalScheduled = weeks.reduce((s, w) => s + w.revenueCents, 0);
  const totalTarget = weeklyTargetCents ? weeklyTargetCents * weeks.length : 0;
  const overallFill = totalTarget > 0 ? totalScheduled / totalTarget : 0;
  const totalGap = totalTarget - totalScheduled;
  const pctFmt = (v: number) => `${Math.round(v * 100)}%`;

  const hasData = weeks.some(w => w.revenueCents > 0 || w.jobCount > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Summary callout */}
      {weeklyTargetCents && hasData && (
        <div style={{
          padding: "8px 12px",
          borderRadius: 8,
          background: isLight
            ? (totalGap > 0 ? "rgba(245,158,11,0.06)" : "rgba(16,185,129,0.06)")
            : (totalGap > 0 ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)"),
          border: `1px solid ${isLight
            ? (totalGap > 0 ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)")
            : (totalGap > 0 ? "rgba(245,158,11,0.12)" : "rgba(16,185,129,0.12)")}`,
          marginBottom: 12,
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: isLight ? "#334155" : "rgba(255,255,255,0.9)" }}>
            Next {weeks.length} weeks: <span style={{ color: overallFill >= 0.9 ? "#10b981" : overallFill >= 0.5 ? "#f59e0b" : "#ef4444", fontWeight: 800 }}>{pctFmt(overallFill)}</span> filled.
          </span>
          {totalGap > 0 && (
            <span style={{ fontSize: 12, color: isLight ? "#64748b" : "rgba(255,255,255,0.55)", marginLeft: 4 }}>
              Book {money(totalGap)} more.
            </span>
          )}
          {totalGap <= 0 && (
            <span style={{ fontSize: 12, color: "#10b981", marginLeft: 4 }}>
              Over target by {money(Math.abs(totalGap))}.
            </span>
          )}
        </div>
      )}

      {!hasData ? (
        <div className="text-muted" style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          No future jobs scheduled
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          <SparkLine
            title="8-Week Projection"
            subtitle="Scheduled revenue by week"
            points={points}
            formatType="money"
            chartType="bar"
            color="#5aa6ff"
            invertChangeColor={false}
            targetValue={weeklyTargetCents ?? undefined}
            penalizeOverTarget
          />
        </div>
      )}
    </div>
  );
}
