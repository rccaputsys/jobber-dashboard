"use client";

import { useIsLight } from "@/lib/hooks";
import { AgingDonutPanel, type AgingBucket } from "../invoices/InvoiceTrendsSection";

export function AgingDonutWrapper({ buckets, totalCents, currencyCode, compact, donutSize }: {
  buckets: AgingBucket[];
  totalCents: number;
  currencyCode: string;
  compact?: boolean;
  donutSize?: number;
}) {
  const isLight = useIsLight();
  return <AgingDonutPanel buckets={buckets} totalCents={totalCents} currencyCode={currencyCode} isLight={isLight} compact={compact} donutSize={donutSize} />;
}
