// src/app/api/sync/job-costing/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getValidAccessToken } from "@/lib/jobberAuth";
import { jobberGraphQL } from "@/lib/jobberGraphQL";

function toCents(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!isFinite(n)) return null;
  return Math.round(n * 100);
}

function pick(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null) return v;
  }
  return null;
}

function looksLikeUndefinedFieldError(e: any) {
  const msg = String(e?.message ?? e);
  return msg.includes("undefinedField") || msg.includes("doesn't exist");
}

type JobRow = {
  id: string;
  jobNumber?: number | null;
  jobStatus?: string | null;
  title?: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
  total?: number | null;
  jobCosting?: any | null;
};

async function fetchJobsWithCosting(accessToken: string, after?: string | null) {
  // We’ll try multiple possible jobCosting field sets until one works.
  // If Jobber changes schema, this still keeps you moving.
  const costingVariants = [
    // Variant A (common)
    `jobCosting { totalCost laborCost expensesCost profit profitMargin }`,
    // Variant B
    `jobCosting { totalCost profit profitMargin }`,
    // Variant C
    `jobCosting { totalCost profit margin }`,
    // Variant D
    `jobCosting { totalCost total profit profitMargin margin }`,
    // Variant E (fallback: just totalCost)
    `jobCosting { totalCost }`,
  ];

  let lastErr: any = null;

  for (const jc of costingVariants) {
    const query = `
      query JobsCosting($first: Int!, $after: String) {
        jobs(first: $first, after: $after) {
          pageInfo { endCursor hasNextPage }
          nodes {
            id
            jobNumber
            jobStatus
            title
            updatedAt
            completedAt
            total
            ${jc}
          }
        }
      }
    `;

    try {
      const data = await jobberGraphQL<{ jobs: { pageInfo: any; nodes: JobRow[] } }>(
        accessToken,
        query,
        { first: 50, after: after ?? null }
      );
      return data;
    } catch (e: any) {
      lastErr = e;
      if (!looksLikeUndefinedFieldError(e)) throw e;
      // try next schema variant
    }
  }

  throw lastErr;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const connection_id = searchParams.get("connection_id");
    if (!connection_id) {
      return NextResponse.json({ ok: false, error: "Missing connection_id" }, { status: 400 });
    }

    // Token for this connection
    const accessToken = await getValidAccessToken(connection_id);

    // Paginate through jobs and upsert margin fields
    let after: string | null = null;
    let hasNext = true;

    let updated = 0;
    let scanned = 0;

    while (hasNext) {
      const data = await fetchJobsWithCosting(accessToken, after);
      const pageInfo = data.jobs.pageInfo;
      const nodes = data.jobs.nodes ?? [];

      scanned += nodes.length;

      // Build updates for fact_jobs based on jobber_job_id
      const updates: any[] = [];

      for (const j of nodes) {
        // revenue: from Job.total (Float dollars)
        const revenueCents = toCents(j.total);

        // cost/profit/margin: from jobCosting (field names vary)
        const jc = j.jobCosting ?? null;

        const totalCost = pick(jc, ["totalCost", "total"]);
        const profit = pick(jc, ["profit"]);
        const marginPct = pick(jc, ["profitMargin", "margin"]); // often fraction (0.25)

        const costCents = toCents(totalCost);
        const profitCents = toCents(profit);

        // If profit isn’t provided but we have revenue+cost, compute it.
        const computedProfitCents =
          profitCents ?? (revenueCents !== null && costCents !== null ? revenueCents - costCents : null);

        const computedMarginPct =
          marginPct !== null && marginPct !== undefined
            ? Number(marginPct)
            : revenueCents && computedProfitCents !== null && revenueCents !== 0
            ? computedProfitCents / revenueCents
            : null;

        // Only write if we have at least one of these values.
        if (
          revenueCents !== null ||
          costCents !== null ||
          computedProfitCents !== null ||
          computedMarginPct !== null
        ) {
          updates.push({
            connection_id,
            jobber_job_id: j.id,
            job_revenue_cents: revenueCents,
            job_cost_cents: costCents,
            job_profit_cents: computedProfitCents,
            job_margin_pct: computedMarginPct,
            job_costing_updated_at: new Date().toISOString(),
          });
        }
      }

      if (updates.length) {
        const { error } = await supabaseAdmin
          .from("fact_jobs")
          .upsert(updates, { onConflict: "connection_id,jobber_job_id" });

        if (error) throw error;
        updated += updates.length;
      }

      hasNext = Boolean(pageInfo?.hasNextPage);
      after = pageInfo?.endCursor ?? null;

      // Safety guard to avoid runaway loops if schema behaves weirdly
      if (scanned > 5000) break;
    }

    return NextResponse.json({
      ok: true,
      scanned,
      updated,
      note:
        "If jobCosting fields are not available for this Jobber plan/account, you’ll still get revenue and computed profit where possible.",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
