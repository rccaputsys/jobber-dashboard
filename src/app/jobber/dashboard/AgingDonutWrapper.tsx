"use client";

import { useIsLight } from "@/lib/hooks";
import { AgingDonutPanel, type AgingBucket } from "../invoices/InvoiceTrendsSection";

export function AgingDonutWrapper({ buckets, totalCents, currencyCode }: {
  buckets: AgingBucket[];
  totalCents: number;
  currencyCode: string;
}) {
  const isLight = useIsLight();
  return <AgingDonutPanel buckets={buckets} totalCents={totalCents} currencyCode={currencyCode} isLight={isLight} />;
}
