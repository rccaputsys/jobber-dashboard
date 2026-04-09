// src/app/api/cron/sync-all/route.ts
//
// Nightly cron entry point. Iterates every active Jobber connection and runs
// a full reconciling sync (delegates to runFullSyncForCron in /api/sync/run).
//
// Auth: matches the /api/cleanup pattern — accepts either Vercel's
// `x-vercel-cron: 1` header or a `Bearer ${CRON_SECRET}` Authorization header
// (so it can also be invoked manually for testing).
//
// Scaling note: this runs sequentially with a small stagger between syncs.
// Vercel's 300s function timeout caps us at roughly 15–30 customers per run
// (each full sync takes 5–30s depending on account size). When the customer
// count grows past that, switch to either:
//   1. A `last_full_sync_at` column on jobber_connections + filter so each run
//      only picks up connections that haven't been synced in the last 23h
//      (the cron resumes naturally if it times out partway through), or
//   2. Multiple cron entries split by ID range / shard.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runFullSyncForCron } from "@/lib/jobberSync";

export const maxDuration = 300;

const STAGGER_MS = 1000; // 1s gap between customer syncs

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(req: Request) {
  // Auth — same pattern as /api/cleanup
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "";
  const expectedHeader = cronSecret ? `Bearer ${cronSecret}` : null;
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const isAuthHeader = !!expectedHeader && authHeader === expectedHeader;

  if (!isVercelCron && !isAuthHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pull all currently-connected accounts. Exclude rows that are explicitly
  // disconnected or cleaned up — those have no usable token.
  const { data: connections, error } = await supabaseAdmin
    .from("jobber_connections")
    .select("id, jobber_account_name, sync_status")
    .not("jobber_account_id", "is", null)
    .not("sync_status", "in", "(disconnected,cleaned_up)")
    .limit(10000);

  if (error) {
    console.error("cron/sync-all: failed to fetch connections", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!connections || connections.length === 0) {
    return NextResponse.json({ ok: true, message: "No active connections", total: 0 });
  }

  type Result = {
    id: string;
    name: string | null;
    ok: boolean;
    error?: string;
    jobs?: number;
    visits?: number;
    reconciled?: { jobs: number; visits: number; invoices: number; quotes: number; requests: number };
    reconciliationSkipped?: boolean;
  };
  const results: Result[] = [];

  for (const conn of connections) {
    try {
      const result = await runFullSyncForCron(conn.id);
      results.push({
        id: conn.id,
        name: conn.jobber_account_name,
        ok: result.ok,
        error: result.error,
        jobs: result.jobs,
        visits: result.visits,
        reconciled: result.reconciled,
        reconciliationSkipped: result.reconciliationSkipped,
      });
      const tag = `${conn.jobber_account_name || conn.id}`;
      if (result.ok) {
        console.log(
          `cron/sync-all: ${tag} → ok ` +
          `(jobs=${result.jobs} visits=${result.visits} ` +
          `invoices=${result.invoices} quotes=${result.quotes} requests=${result.requests}) ` +
          `reconciled=${JSON.stringify(result.reconciled)}` +
          (result.reconciliationSkipped ? " [reconcile skipped]" : "")
        );
      } else {
        console.warn(`cron/sync-all: ${tag} → fail: ${result.error}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      results.push({ id: conn.id, name: conn.jobber_account_name, ok: false, error: msg });
      console.error(`cron/sync-all: ${conn.id} threw`, err);
    }

    await delay(STAGGER_MS);
  }

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: true,
    total: results.length,
    succeeded: okCount,
    failed: results.length - okCount,
    results,
  });
}
