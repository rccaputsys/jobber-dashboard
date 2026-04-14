// src/lib/jobberSync.ts
//
// Shared sync infrastructure used by both /api/sync/run (the in-browser
// SyncButton step flow) and /api/cron/sync-all (the nightly cron).
//
// Lives in lib/ rather than the route file because Next.js App Router only
// allows specific named exports from route.ts files (HTTP method handlers
// + a small set of config exports). Anything else needs to live elsewhere
// so it can be imported across files.

import { revalidateTag } from "next/cache";
import { supabaseAdmin, fetchAllRows } from "@/lib/supabaseAdmin";
import { getValidAccessToken } from "@/lib/jobberAuth";
import {
  jobToRow,
  visitToRow,
  invoiceToRow,
  quoteToRow,
  requestToRow,
  JOB_FIELDS,
  VISIT_FIELDS,
  INVOICE_FIELDS,
  QUOTE_FIELDS,
  REQUEST_FIELDS,
  type JobNode,
  type VisitNode,
  type InvoiceNode,
  type QuoteNode,
  type RequestNode,
} from "@/lib/jobberMappers";

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SyncEntity = "jobs" | "visits" | "quotes" | "invoices" | "requests";

async function markEntityStatus(
  connectionId: string,
  entity: SyncEntity,
  status: "pending" | "syncing" | "done" | "error",
  count?: number,
): Promise<void> {
  const update: Record<string, unknown> = { [`sync_status_${entity}`]: status };
  if (typeof count === "number") update[`sync_count_${entity}`] = count;
  await supabaseAdmin
    .from("jobber_connections")
    .update(update)
    .eq("id", connectionId);
}

export async function resetEntityStatuses(connectionId: string): Promise<void> {
  await supabaseAdmin
    .from("jobber_connections")
    .update({
      sync_status_jobs: "pending",
      sync_status_visits: "pending",
      sync_status_quotes: "pending",
      sync_status_invoices: "pending",
      sync_status_requests: "pending",
      sync_count_jobs: 0,
      sync_count_visits: 0,
      sync_count_quotes: 0,
      sync_count_invoices: 0,
      sync_count_requests: 0,
    })
    .eq("id", connectionId);
}

/**
 * GraphQL client that tolerates partial errors and retries on rate-limit /
 * 5xx / THROTTLED responses. Used by the sync path; the webhook path uses
 * the simpler `jobberGraphQL` helper.
 */
export async function jobberGraphQLWithPartialErrors<T>(
  accessToken: string,
  query: string,
  maxRetries: number = 5,
): Promise<{ data: T | null; errors: unknown[] }> {
  const version = process.env.JOBBER_GRAPHQL_VERSION!;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(process.env.JOBBER_GRAPHQL_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-JOBBER-GRAPHQL-VERSION": version,
      },
      body: JSON.stringify({ query }),
    });

    // HTTP 429 → respect Retry-After header
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : attempt * 2000;
      console.warn(`Rate limited (HTTP 429). Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
      await delay(waitTime);
      continue;
    }

    // 5xx → retry; other non-2xx → fail fast
    if (!res.ok && res.status !== 429) {
      if (attempt < maxRetries && res.status >= 500) {
        const waitTime = attempt * 2000;
        console.warn(`Jobber API HTTP ${res.status}. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
        await delay(waitTime);
        continue;
      }
      const body = await res.text().catch(() => "");
      return { data: null, errors: [{ message: `Jobber API error: HTTP ${res.status} — ${body.slice(0, 200)}` }] };
    }

    // Malformed JSON → retry
    let json: { data?: T | null; errors?: unknown[] };
    try {
      json = await res.json();
    } catch {
      if (attempt < maxRetries) {
        const waitTime = attempt * 2000;
        console.warn(`Invalid JSON from Jobber API. Retry ${attempt}/${maxRetries}`);
        await delay(waitTime);
        continue;
      }
      return { data: null, errors: [{ message: "Invalid JSON response from Jobber API" }] };
    }

    // GraphQL-level THROTTLED → HTTP 200 but data is null
    const isThrottled = (json.errors || []).some(
      (e) => (e as { extensions?: { code?: string } })?.extensions?.code === "THROTTLED",
    );
    if (isThrottled && attempt < maxRetries) {
      const waitTime = attempt * 2000;
      console.warn(`Throttled by Jobber API. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
      await delay(waitTime);
      continue;
    }

    return {
      data: (json.data ?? null) as T | null,
      errors: (json.errors || []).filter(
        (e) => (e as { extensions?: { code?: string } })?.extensions?.code !== "THROTTLED",
      ),
    };
  }

  return { data: null, errors: [{ message: "Max retries exceeded due to throttling" }] };
}

/**
 * Fetch every page of a top-level Jobber resource. Optional updatedAt filter
 * for incremental syncs. Caps at maxPages to avoid runaway loops.
 */
export async function fetchAllPages<T>(
  accessToken: string,
  resourceName: string,
  nodeFields: string,
  updatedAfter: string | null = null,
  maxPages: number = 250,
): Promise<{ nodes: T[]; errors: unknown[] }> {
  const allNodes: T[] = [];
  const allErrors: unknown[] = [];
  let cursor: string | null = null;
  let pageCount = 0;

  type PageResponse = {
    [key: string]: { nodes: (T | null)[]; pageInfo: PageInfo } | undefined;
  };

  while (pageCount < maxPages) {
    const afterClause: string = cursor ? `, after: "${cursor}"` : "";
    const filterClause: string = updatedAfter
      ? `, filter: { updatedAt: { after: "${updatedAfter}" } }`
      : "";
    const query: string = `query {
      ${resourceName}(first: 100${afterClause}${filterClause}) {
        nodes {
          ${nodeFields}
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`;

    const result = await jobberGraphQLWithPartialErrors<PageResponse>(accessToken, query);

    if (result.errors.length > 0) {
      allErrors.push(...result.errors);
    }

    const data = result.data?.[resourceName];
    if (!data) break;

    const validNodes: T[] = [];
    for (const n of data.nodes || []) {
      if (n !== null) validNodes.push(n);
    }
    allNodes.push(...validNodes);

    if (!data.pageInfo.hasNextPage) break;
    if (!data.pageInfo.endCursor) break;
    cursor = data.pageInfo.endCursor;
    pageCount++;
  }

  // Dedup — Jobber occasionally returns the same node on multiple pages.
  // Walk once, Set tracks ids so we keep the first occurrence in order.
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const node of allNodes) {
    const id = (node as { id: string }).id;
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push(node);
    }
  }

  return { nodes: deduped, errors: allErrors };
}

// ---------------------------------------------------------------------------
// Reconciliation: delete fact rows that no longer exist in Jobber.
//
// Used by the nightly full sync to catch deletions that incremental sync
// (filtered by updatedAt) and webhooks would otherwise miss.
//
// SAFETY: never deletes anything if `keepIds` is empty. An empty fetch
// usually means a permission/throttle issue, not "the customer deleted
// everything." Better to leave stale rows than wipe a real account.
// ---------------------------------------------------------------------------

export async function reconcileFactTable(
  table: string,
  idColumn: string,
  connectionId: string,
  keepIds: Set<string>,
): Promise<{ deleted: number; skipped: boolean }> {
  if (keepIds.size === 0) {
    console.warn(`reconcile ${table}: empty keepIds — skipping (likely fetch issue)`);
    return { deleted: 0, skipped: true };
  }

  const existing = await fetchAllRows(table, idColumn, connectionId);
  const toDelete = (existing || [])
    .map((row: Record<string, unknown>) => row[idColumn] as string)
    .filter((id) => id && !keepIds.has(id));

  if (toDelete.length === 0) return { deleted: 0, skipped: false };

  let deleted = 0;
  const chunkSize = 500;
  for (let i = 0; i < toDelete.length; i += chunkSize) {
    const chunk = toDelete.slice(i, i + chunkSize);
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq("connection_id", connectionId)
      .in(idColumn, chunk);
    if (error) throw new Error(`reconcile ${table} failed: ${error.message}`);
    deleted += chunk.length;
  }
  return { deleted, skipped: false };
}

// ---------------------------------------------------------------------------
// Heartbeat + dashboard metrics — recomputes connection-level rollups from
// the fact tables and writes them onto jobber_connections. Called at the end
// of every sync (step flow + cron).
// ---------------------------------------------------------------------------

export async function syncMetricsAndHeartbeat(
  connectionId: string,
  syncCounts: { jobs: number; invoices: number; quotes: number; requests: number },
): Promise<void> {
  const now = new Date();
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

  // Read accountName from connection (may have been backfilled earlier in the sync)
  const { data: connData } = await supabaseAdmin
    .from("jobber_connections")
    .select("jobber_account_name")
    .eq("id", connectionId)
    .single();
  const accountName = connData?.jobber_account_name || null;

  const [
    dbInvoices,
    dbJobs,
    { count: dbRequestCount },
    { count: dbJobCount },
    { count: dbQuoteCount },
    dbQuotes,
  ] = await Promise.all([
    fetchAllRows("fact_invoices", "status, balance_cents, total_amount_cents, due_at", connectionId),
    fetchAllRows("fact_jobs", "status, scheduled_start_at", connectionId),
    supabaseAdmin
      .from("fact_requests")
      .select("*", { count: "exact", head: true })
      .eq("connection_id", connectionId),
    supabaseAdmin
      .from("fact_jobs")
      .select("*", { count: "exact", head: true })
      .eq("connection_id", connectionId),
    supabaseAdmin
      .from("fact_quotes")
      .select("*", { count: "exact", head: true })
      .eq("connection_id", connectionId),
    fetchAllRows("fact_quotes", "quote_status, quote_total_cents, sent_at", connectionId),
  ]);

  type InvoiceRow = { status?: string | null; balance_cents?: number | null; total_amount_cents?: number | null; due_at?: string | null };
  type JobRow = { scheduled_start_at?: string | null };
  type QuoteRow = { quote_status?: string | null; quote_total_cents?: number | null; sent_at?: string | null };

  const allInvoices: InvoiceRow[] = (dbInvoices as InvoiceRow[]) || [];
  const allJobs: JobRow[] = (dbJobs as JobRow[]) || [];
  const allQuotes: QuoteRow[] = (dbQuotes as QuoteRow[]) || [];
  const jobCount = dbJobCount || 0;
  const requestCount = dbRequestCount || 0;
  const quoteCount = dbQuoteCount || 0;

  const unpaidInvoices = allInvoices.filter((inv) => {
    const st = (inv.status || "").toLowerCase();
    return st !== "paid" && st !== "draft" && st !== "void";
  });

  const pastDueInvoices = unpaidInvoices.filter((inv) => {
    if (!inv.due_at) return false;
    return new Date(inv.due_at) < now;
  });

  const invoices15plus = unpaidInvoices.filter((inv) => {
    if (!inv.due_at) return false;
    return new Date(inv.due_at) < fifteenDaysAgo;
  });

  const unscheduledJobs = allJobs.filter((j) => !j.scheduled_start_at);

  const pastDueCents = pastDueInvoices.reduce(
    (sum, inv) => sum + (inv.balance_cents || inv.total_amount_cents || 0),
    0,
  );
  const fifteenPlusCents = invoices15plus.reduce(
    (sum, inv) => sum + (inv.balance_cents || inv.total_amount_cents || 0),
    0,
  );

  const statusLooksWon = (status: string) => {
    const s = status.toUpperCase();
    return s.includes("APPROV") || s.includes("ACCEPT") || s.includes("WON") || s.includes("CONVERT") || s.includes("BOOK");
  };

  const leakingQuotes = allQuotes.filter((q) => {
    if (!q.sent_at) return false;
    const st = (q.quote_status || "").toLowerCase().trim();
    if (!st) return true;
    if (st === "archived" || st === "draft") return false;
    return !statusLooksWon(st);
  });

  const quoteLeakCount = leakingQuotes.length;
  const quoteLeakCents = leakingQuotes.reduce((sum, q) => sum + (q.quote_total_cents || 0), 0);

  const heartbeat: Record<string, unknown> = {
    last_sync_at: new Date().toISOString(),
    sync_status: "complete",
    sync_error: null,
    last_sync_invoices: syncCounts.invoices,
    last_sync_quotes: syncCounts.quotes,
    job_count: jobCount,
    request_count: requestCount,
    quote_count: quoteCount,
    unscheduled_job_count: unscheduledJobs.length,
    invoices_past_due_count: pastDueInvoices.length,
    invoices_past_due_cents: pastDueCents,
    invoices_15plus_count: invoices15plus.length,
    invoices_15plus_cents: fifteenPlusCents,
    quote_leak_count: quoteLeakCount,
    quote_leak_cents: quoteLeakCents,
  };
  if (accountName) heartbeat.jobber_account_name = accountName;

  const { error: hbErr } = await supabaseAdmin
    .from("jobber_connections")
    .update(heartbeat)
    .eq("id", connectionId);

  if (hbErr) throw new Error(`jobber_connections update failed: ${hbErr.message}`);

  // Bust the dashboard's unstable_cache so the user sees fresh numbers on
  // their next page load instead of waiting up to 60s. Next 16 requires a
  // profile arg; {expire:0} means "expire immediately".
  try {
    revalidateTag(`dashboard-facts:${connectionId}`, { expire: 0 });
  } catch { /* best-effort — revalidateTag can't fail in practice */ }
}

// ---------------------------------------------------------------------------
// Cron orchestrator: runs a full reconciling sync for a single connection.
//
// Differences from the SyncButton step flow:
//   - Always full sync (no updatedAt filter)
//   - Fetches all 5 entities including visits
//   - Reconciles deletions when fetch returns zero errors
//   - Returns a structured result instead of an HTTP response
// ---------------------------------------------------------------------------

export async function runFullSyncForCron(connectionId: string): Promise<{
  ok: boolean;
  jobs: number;
  visits: number;
  invoices: number;
  quotes: number;
  requests: number;
  reconciled: { jobs: number; visits: number; invoices: number; quotes: number; requests: number };
  reconciliationSkipped: boolean;
  error?: string;
}> {
  const emptyReconcile = { jobs: 0, visits: 0, invoices: 0, quotes: 0, requests: 0 };

  try {
    const token = await getValidAccessToken(connectionId);

    const { data: connectionData } = await supabaseAdmin
      .from("jobber_connections")
      .select("jobber_account_name, sync_status, sync_started_at")
      .eq("id", connectionId)
      .single();

    // Skip if a sync is already running and started recently
    if (connectionData?.sync_status === "syncing" && connectionData?.sync_started_at) {
      const startedAt = new Date(connectionData.sync_started_at).getTime();
      // Window > Vercel maxDuration (300s) so we don't racily start a second
      // sync while the first is still legitimately running.
      const staleCutoff = Date.now() - 10 * 60 * 1000;
      if (startedAt > staleCutoff) {
        return {
          ok: false,
          jobs: 0, visits: 0, invoices: 0, quotes: 0, requests: 0,
          reconciled: emptyReconcile,
          reconciliationSkipped: true,
          error: "Sync already in progress",
        };
      }
    }

    await supabaseAdmin
      .from("jobber_connections")
      .update({
        sync_status: "syncing",
        sync_started_at: new Date().toISOString(),
        sync_error: null,
      })
      .eq("id", connectionId);

    await resetEntityStatuses(connectionId);

    // Backfill account name if missing
    let accountName: string | null = connectionData?.jobber_account_name || null;
    if (!accountName) {
      try {
        const acctResult = await jobberGraphQLWithPartialErrors<{ account: { name: string } }>(
          token,
          `query { account { name } }`,
        );
        accountName = acctResult.data?.account?.name || null;
        if (accountName) {
          await supabaseAdmin
            .from("jobber_connections")
            .update({ jobber_account_name: accountName })
            .eq("id", connectionId);
        }
      } catch { /* non-critical */ }
    }

    // Per-entity pipeline: mark syncing, fetch, then mark done with count.
    // Upsert happens after Promise.all so we can still reconcile in one pass.
    const fetchEntity = async <T>(
      entity: SyncEntity,
      resource: string,
      fields: string,
    ): Promise<{ nodes: T[]; errors: unknown[] }> => {
      await markEntityStatus(connectionId, entity, "syncing");
      const result = await fetchAllPages<T>(token, resource, fields, null);
      await markEntityStatus(connectionId, entity, "done", result.nodes.length);
      return result;
    };

    const [jobResult, visitResult, invoiceResult, quoteResult, requestResult] = await Promise.all([
      fetchEntity<JobNode>("jobs", "jobs", JOB_FIELDS),
      fetchEntity<VisitNode>("visits", "visits", VISIT_FIELDS),
      fetchEntity<InvoiceNode>("invoices", "invoices", INVOICE_FIELDS),
      fetchEntity<QuoteNode>("quotes", "quotes", QUOTE_FIELDS),
      fetchEntity<RequestNode>("requests", "requests", REQUEST_FIELDS),
    ]);

    const totalErrors =
      jobResult.errors.length +
      visitResult.errors.length +
      invoiceResult.errors.length +
      quoteResult.errors.length +
      requestResult.errors.length;

    if (totalErrors > 0) {
      console.warn(`runFullSyncForCron ${connectionId}: ${totalErrors} fetch errors`);
    }

    const upsertChunked = async (
      rows: Record<string, unknown>[],
      table: string,
      onConflict: string,
    ) => {
      if (rows.length === 0) return;
      const chunkSize = 1000;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabaseAdmin.from(table).upsert(chunk, { onConflict });
        if (error) throw new Error(`${table} upsert failed: ${error.message}`);
      }
    };

    await upsertChunked(
      jobResult.nodes.map((j) => jobToRow(connectionId, j)),
      "fact_jobs",
      "connection_id,jobber_job_id",
    );
    await upsertChunked(
      visitResult.nodes.map((v) => visitToRow(connectionId, v)),
      "fact_visits",
      "connection_id,jobber_visit_id",
    );
    await upsertChunked(
      invoiceResult.nodes.map((inv) => invoiceToRow(connectionId, inv)),
      "fact_invoices",
      "connection_id,jobber_invoice_id",
    );
    await upsertChunked(
      quoteResult.nodes.map((q) => quoteToRow(connectionId, q)),
      "fact_quotes",
      "connection_id,jobber_quote_id",
    );
    await upsertChunked(
      requestResult.nodes.map((r) => requestToRow(connectionId, r)),
      "fact_requests",
      "connection_id,jobber_request_id",
    );

    // Reconcile (delete rows not in fetched set) — only when fetch was clean
    let reconciled = { ...emptyReconcile };
    let reconciliationSkipped = false;

    if (totalErrors > 0) {
      reconciliationSkipped = true;
    } else {
      const jobIds = new Set(jobResult.nodes.map((j) => j.id));
      const visitIds = new Set(visitResult.nodes.map((v) => v.id));
      const invoiceIds = new Set(invoiceResult.nodes.map((inv) => inv.id));
      const quoteIds = new Set(quoteResult.nodes.map((q) => q.id));
      const requestIds = new Set(requestResult.nodes.map((r) => r.id));

      const [jR, vR, iR, qR, rR] = await Promise.all([
        reconcileFactTable("fact_jobs", "jobber_job_id", connectionId, jobIds),
        reconcileFactTable("fact_visits", "jobber_visit_id", connectionId, visitIds),
        reconcileFactTable("fact_invoices", "jobber_invoice_id", connectionId, invoiceIds),
        reconcileFactTable("fact_quotes", "jobber_quote_id", connectionId, quoteIds),
        reconcileFactTable("fact_requests", "jobber_request_id", connectionId, requestIds),
      ]);

      reconciled = {
        jobs: jR.deleted,
        visits: vR.deleted,
        invoices: iR.deleted,
        quotes: qR.deleted,
        requests: rR.deleted,
      };
      reconciliationSkipped = jR.skipped || vR.skipped || iR.skipped || qR.skipped || rR.skipped;
    }

    // Heartbeat + metrics
    await syncMetricsAndHeartbeat(connectionId, {
      jobs: jobResult.nodes.length,
      invoices: invoiceResult.nodes.length,
      quotes: quoteResult.nodes.length,
      requests: requestResult.nodes.length,
    });

    return {
      ok: true,
      jobs: jobResult.nodes.length,
      visits: visitResult.nodes.length,
      invoices: invoiceResult.nodes.length,
      quotes: quoteResult.nodes.length,
      requests: requestResult.nodes.length,
      reconciled,
      reconciliationSkipped,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    console.error(`runFullSyncForCron ${connectionId} failed:`, message);

    await supabaseAdmin
      .from("jobber_connections")
      .update({ sync_status: "failed", sync_error: message })
      .eq("id", connectionId);

    return {
      ok: false,
      jobs: 0, visits: 0, invoices: 0, quotes: 0, requests: 0,
      reconciled: emptyReconcile,
      reconciliationSkipped: true,
      error: message,
    };
  }
}
