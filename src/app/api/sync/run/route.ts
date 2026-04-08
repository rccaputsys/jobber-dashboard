// src/app/api/sync/run/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin, fetchAllRows } from "@/lib/supabaseAdmin";
import { getValidAccessToken } from "@/lib/jobberAuth";
import { sendSyncFailureEmail } from "@/lib/resend";
import { getUser } from "@/lib/supabaseAuth";
import {
  dollarsToCents,
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

export const maxDuration = 300; // Tell Vercel this route needs full 300s

type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTwelveMonthsAgoMs(): number {
  const date = new Date();
  date.setMonth(date.getMonth() - 12);
  return date.getTime();
}

function isWithinTwelveMonths(dateStr: string | null | undefined, cutoffMs: number): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  return date.getTime() >= cutoffMs;
}

async function jobberGraphQLWithPartialErrors<T>(
  accessToken: string,
  query: string,
  maxRetries: number = 5
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

    // Retry on HTTP 429 rate limiting
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : attempt * 2000;
      console.warn(`Rate limited (HTTP 429). Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
      await delay(waitTime);
      continue;
    }

    // Retry on server errors (5xx) and auth errors (401/403)
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

    // Parse JSON safely — malformed responses shouldn't crash the sync
    let json: any;
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

    // Retry on GraphQL-level THROTTLED errors (HTTP 200 but data is null)
    const isThrottled = (json.errors || []).some(
      (e: any) => e?.extensions?.code === "THROTTLED"
    );
    if (isThrottled && attempt < maxRetries) {
      const waitTime = attempt * 2000;
      console.warn(`Throttled by Jobber API. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
      await delay(waitTime);
      continue;
    }

    return {
      data: json.data as T | null,
      errors: (json.errors || []).filter((e: any) => e?.extensions?.code !== "THROTTLED"),
    };
  }

  return { data: null, errors: [{ message: "Max retries exceeded due to throttling" }] };
}

// Fetch all pages with optional updatedAt filter
async function fetchAllPages<T>(
  accessToken: string,
  resourceName: string,
  nodeFields: string,
  updatedAfter: string | null = null,
  maxPages: number = 250
): Promise<{ nodes: T[]; errors: unknown[] }> {
  const allNodes: T[] = [];
  const allErrors: unknown[] = [];
  let cursor: string | null = null;
  let pageCount = 0;

  type PageResponse = {
    [key: string]: { nodes: (T | null)[]; pageInfo: PageInfo } | undefined;
  };

  while (pageCount < maxPages) {
    // No artificial delay — throttle retry handles rate limiting automatically

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
      if (n !== null) {
        validNodes.push(n);
      }
    }
    allNodes.push(...validNodes);

    if (!data.pageInfo.hasNextPage) break;
    if (!data.pageInfo.endCursor) break; // Prevent infinite loop on null cursor
    cursor = data.pageInfo.endCursor;
    pageCount++;
  }

  // Deduplicate — API can return the same entity on multiple pages
  const deduped = new Map<string, T>();
  for (const node of allNodes) {
    deduped.set((node as any).id, node);
  }

  return { nodes: Array.from(deduped.values()), errors: allErrors };
}

// ---- Step-based sync helpers (used by multi-step SyncButton flow) ----

async function handleSyncJobsStep(
  connectionId: string,
  token: string,
  lastSyncAt: string | null = null,
): Promise<{ jobCount: number; visitCount: number }> {
  // Step 1: Fetch jobs (without visits — visits are synced separately to avoid query issues)
  const jobResult = await fetchAllPages<JobNode>(
    token,
    "jobs",
    JOB_FIELDS,
    lastSyncAt
  );

  if (jobResult.errors.length > 0) {
    console.warn("Jobber API job errors:", jobResult.errors.length);
  }

  const jobs = jobResult.nodes;
  if (jobs.length > 0) {
    const jobRows = jobs.map(j => jobToRow(connectionId, j));

    const chunkSize = 1000;
    for (let i = 0; i < jobRows.length; i += chunkSize) {
      const chunk = jobRows.slice(i, i + chunkSize);
      const { error } = await supabaseAdmin
        .from("fact_jobs")
        .upsert(chunk, { onConflict: "connection_id,jobber_job_id" });
      if (error) throw new Error(`fact_jobs batch upsert failed: ${error.message}`);
    }
  }

  // Step 2: Fetch visits as a top-level resource
  const visitResult = await fetchAllPages<VisitNode>(
    token,
    "visits",
    VISIT_FIELDS,
    lastSyncAt
  );

  if (visitResult.errors.length > 0) {
    console.warn("Jobber API visit errors:", visitResult.errors.length);
  }

  const visits = visitResult.nodes;
  let visitCount = 0;
  if (visits.length > 0) {
    const visitRows = visits.map(v => visitToRow(connectionId, v));

    const chunkSize = 1000;
    for (let i = 0; i < visitRows.length; i += chunkSize) {
      const chunk = visitRows.slice(i, i + chunkSize);
      const { error } = await supabaseAdmin
        .from("fact_visits")
        .upsert(chunk, { onConflict: "connection_id,jobber_visit_id" });
      if (error) throw new Error(`fact_visits batch upsert failed: ${error.message}`);
    }
    visitCount = visitRows.length;
  }

  return { jobCount: jobs.length, visitCount };
}

async function handleSyncOtherStep(
  connectionId: string,
  token: string,
  lastSyncAt: string | null,
): Promise<{ invoiceCount: number; quoteCount: number; requestCount: number }> {
  const [invoiceResult, quoteResult, requestResult] = await Promise.all([
    fetchAllPages<InvoiceNode>(token, "invoices", INVOICE_FIELDS, lastSyncAt),
    fetchAllPages<QuoteNode>(token, "quotes", QUOTE_FIELDS, lastSyncAt),
    fetchAllPages<RequestNode>(token, "requests", REQUEST_FIELDS, lastSyncAt),
  ]);

  const invoices = invoiceResult.nodes;
  const quotes = quoteResult.nodes;
  const requests = requestResult.nodes;

  const allErrors = [...invoiceResult.errors, ...quoteResult.errors, ...requestResult.errors];
  if (allErrors.length > 0) {
    console.warn("Jobber API partial errors:", allErrors.length);
  }

  // BATCH UPSERT: Invoices
  if (invoices.length > 0) {
    const invoiceRows = invoices.map(inv => invoiceToRow(connectionId, inv));

    const chunkSize = 1000;
    for (let i = 0; i < invoiceRows.length; i += chunkSize) {
      const chunk = invoiceRows.slice(i, i + chunkSize);
      const { error } = await supabaseAdmin
        .from("fact_invoices")
        .upsert(chunk, { onConflict: "connection_id,jobber_invoice_id" });
      if (error) throw new Error(`fact_invoices batch upsert failed: ${error.message}`);
    }
  }

  // BATCH UPSERT: Quotes
  if (quotes.length > 0) {
    const quoteRows = quotes.map(q => quoteToRow(connectionId, q));

    const chunkSize = 1000;
    for (let i = 0; i < quoteRows.length; i += chunkSize) {
      const chunk = quoteRows.slice(i, i + chunkSize);
      const { error } = await supabaseAdmin
        .from("fact_quotes")
        .upsert(chunk, { onConflict: "connection_id,jobber_quote_id" });
      if (error) throw new Error(`fact_quotes batch upsert failed: ${error.message}`);
    }
  }

  // BATCH UPSERT: Requests
  if (requests.length > 0) {
    const requestRows = requests.map(r => requestToRow(connectionId, r));

    const chunkSize = 1000;
    for (let i = 0; i < requestRows.length; i += chunkSize) {
      const chunk = requestRows.slice(i, i + chunkSize);
      const { error } = await supabaseAdmin
        .from("fact_requests")
        .upsert(chunk, { onConflict: "connection_id,jobber_request_id" });
      if (error) throw new Error(`fact_requests batch upsert failed: ${error.message}`);
    }
  }

  return {
    invoiceCount: invoices.length,
    quoteCount: quotes.length,
    requestCount: requests.length,
  };
}

async function handleSyncMetricsStep(
  connectionId: string,
  syncCounts: { jobs: number; invoices: number; quotes: number; requests: number },
): Promise<void> {
  const now = new Date();
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

  // Read accountName from connection (may have been backfilled in step=jobs)
  const { data: connData } = await supabaseAdmin
    .from("jobber_connections")
    .select("jobber_account_name")
    .eq("id", connectionId)
    .single();
  const accountName = connData?.jobber_account_name || null;

  // Always use DB path (data isn't in memory across requests)
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

  const allInvoices: any[] = dbInvoices || [];
  const allJobs: any[] = dbJobs || [];
  const allQuotes: any[] = dbQuotes || [];
  const jobCount = dbJobCount || 0;
  const requestCount = dbRequestCount || 0;
  const quoteCount = dbQuoteCount || 0;

  const unpaidInvoices = allInvoices.filter(inv => {
    const st = (inv.status || "").toLowerCase();
    return st !== "paid" && st !== "draft" && st !== "void";
  });

  const pastDueInvoices = unpaidInvoices.filter(inv => {
    if (!inv.due_at) return false;
    return new Date(inv.due_at) < now;
  });

  const invoices15plus = unpaidInvoices.filter(inv => {
    if (!inv.due_at) return false;
    return new Date(inv.due_at) < fifteenDaysAgo;
  });

  const unscheduledJobs = allJobs.filter((j: any) => !j.scheduled_start_at);

  const pastDueCents = pastDueInvoices.reduce((sum: number, inv: any) => sum + (inv.balance_cents || inv.total_amount_cents || 0), 0);
  const fifteenPlusCents = invoices15plus.reduce((sum: number, inv: any) => sum + (inv.balance_cents || inv.total_amount_cents || 0), 0);

  const statusLooksWon = (status: string) => {
    const s = status.toUpperCase();
    return s.includes("APPROV") || s.includes("ACCEPT") || s.includes("WON") || s.includes("CONVERT") || s.includes("BOOK");
  };

  const leakingQuotes = allQuotes.filter((q: any) => {
    if (!q.sent_at) return false;
    const st = (q.quote_status || "").toLowerCase().trim();
    if (!st) return true;
    if (st === "archived" || st === "draft") return false;
    return !statusLooksWon(st);
  });

  const quoteLeakCount = leakingQuotes.length;
  const quoteLeakCents = leakingQuotes.reduce((sum: number, q: any) => sum + (q.quote_total_cents || 0), 0);

  const heartbeat: Record<string, any> = {
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
}

async function handleStepSync(
  req: Request,
  connectionId: string,
  step: string,
  searchParams: URLSearchParams,
): Promise<NextResponse> {
  try {
    if (step === "jobs") {
      const token = await getValidAccessToken(connectionId);

      const { data: connectionData } = await supabaseAdmin
        .from("jobber_connections")
        .select("jobber_account_name, sync_status, sync_started_at, last_sync_at")
        .eq("id", connectionId)
        .single();

      // Prevent concurrent syncs
      if (connectionData?.sync_status === "syncing" && connectionData?.sync_started_at) {
        const startedAt = new Date(connectionData.sync_started_at).getTime();
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        if (startedAt > fiveMinutesAgo) {
          return NextResponse.json({ ok: false, error: "Sync already in progress" }, { status: 409 });
        }
      }

      // Mark sync as started
      await supabaseAdmin
        .from("jobber_connections")
        .update({ sync_status: "syncing", sync_started_at: new Date().toISOString(), sync_error: null })
        .eq("id", connectionId);

      // Backfill company name if missing
      if (!connectionData?.jobber_account_name) {
        try {
          const acctResult = await jobberGraphQLWithPartialErrors<{ account: { name: string } }>(
            token,
            `query { account { name } }`
          );
          const name = acctResult.data?.account?.name || null;
          if (name) {
            await supabaseAdmin
              .from("jobber_connections")
              .update({ jobber_account_name: name })
              .eq("id", connectionId);
          }
        } catch { /* non-critical */ }
      }

      const fullSync = searchParams.get("full") === "true";
      const lastSyncAt = fullSync ? null : (connectionData?.last_sync_at || null);
      const { jobCount, visitCount } = await handleSyncJobsStep(connectionId, token, lastSyncAt);
      return NextResponse.json({ ok: true, jobs: jobCount, visits: visitCount });

    } else if (step === "other") {
      const { data: connectionData } = await supabaseAdmin
        .from("jobber_connections")
        .select("sync_status, last_sync_at")
        .eq("id", connectionId)
        .single();

      if (connectionData?.sync_status !== "syncing") {
        return NextResponse.json({ ok: false, error: "No sync in progress" }, { status: 409 });
      }

      const token = await getValidAccessToken(connectionId);
      const fullSync = searchParams.get("full") === "true";
      const lastSyncAt = fullSync ? null : (connectionData?.last_sync_at || null);

      const counts = await handleSyncOtherStep(connectionId, token, lastSyncAt);
      return NextResponse.json({
        ok: true,
        invoices: counts.invoiceCount,
        quotes: counts.quoteCount,
        requests: counts.requestCount,
      });

    } else if (step === "metrics") {
      const { data: connectionData } = await supabaseAdmin
        .from("jobber_connections")
        .select("sync_status")
        .eq("id", connectionId)
        .single();

      if (connectionData?.sync_status !== "syncing") {
        return NextResponse.json({ ok: false, error: "No sync in progress" }, { status: 409 });
      }

      const syncCounts = {
        jobs: parseInt(searchParams.get("jobs") || "0", 10),
        invoices: parseInt(searchParams.get("invoices") || "0", 10),
        quotes: parseInt(searchParams.get("quotes") || "0", 10),
        requests: parseInt(searchParams.get("requests") || "0", 10),
      };

      await handleSyncMetricsStep(connectionId, syncCounts);
      return NextResponse.json({ ok: true });

    } else {
      return NextResponse.json({ ok: false, error: `Unknown step: ${step}` }, { status: 400 });
    }
  } catch (error) {
    console.error(`Sync step=${step} failed:`, error);
    const message = error instanceof Error ? error.message : "Sync failed";

    await supabaseAdmin
      .from("jobber_connections")
      .update({ sync_status: "failed", sync_error: message })
      .eq("id", connectionId);

    try {
      await sendSyncFailureEmail({
        connectionId,
        accountName: null,
        error: message,
      });
    } catch (emailErr) {
      console.error("Failed to send sync failure email:", emailErr);
    }

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connection_id");
  const fullSync = searchParams.get("full") === "true";

  if (!connectionId) {
    return NextResponse.json({ ok: false, error: "Missing connection_id" }, { status: 400 });
  }

  // Auth: allow either (a) logged-in user who owns the connection, or (b) internal server call
  const internalToken = req.headers.get("x-internal-token");
  const isInternalCall = internalToken === process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isInternalCall) {
    const user = await getUser();
    if (!user) {
      const wantsJson = req.headers.get("accept")?.includes("application/json") ||
                        searchParams.get("json") === "true";
      if (wantsJson) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    // Verify user owns this connection
    const { data: ownerCheck } = await supabaseAdmin
      .from("jobber_connections")
      .select("id")
      .eq("id", connectionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!ownerCheck) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
  }

  // Multi-step sync: dispatch to step handler if step param is present
  const step = searchParams.get("step");
  if (step) {
    return handleStepSync(req, connectionId, step, searchParams);
  }

  // Legacy single-call flow (unchanged) — used by ResyncButton, complete-signup, email retry links
  try {
    const token = await getValidAccessToken(connectionId);
    const twelveMonthsAgoMs = getTwelveMonthsAgoMs();

    // Get last sync time for incremental sync (skip if full sync requested)
    const { data: connectionData } = await supabaseAdmin
      .from("jobber_connections")
      .select("last_sync_at, jobber_account_name, sync_status, sync_started_at")
      .eq("id", connectionId)
      .single();

    // Prevent concurrent syncs — if already syncing and started within last 5 minutes, bail
    if (connectionData?.sync_status === "syncing" && connectionData?.sync_started_at) {
      const startedAt = new Date(connectionData.sync_started_at).getTime();
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      if (startedAt > fiveMinutesAgo) {
        const wantsJson = req.headers.get("accept")?.includes("application/json") ||
                          searchParams.get("json") === "true";
        if (wantsJson) {
          return NextResponse.json({ ok: false, error: "Sync already in progress" }, { status: 409 });
        }
        return NextResponse.redirect(new URL(`/jobber/dashboard?sync_error=${encodeURIComponent("Sync already in progress")}`, req.url));
      }
    }

    // Mark sync as started
    await supabaseAdmin
      .from("jobber_connections")
      .update({ sync_status: "syncing", sync_started_at: new Date().toISOString(), sync_error: null })
      .eq("id", connectionId);

    const lastSyncAt = fullSync ? null : (connectionData?.last_sync_at || null);

    // Backfill company name if missing
    let accountName: string | null = connectionData?.jobber_account_name || null;
    if (!accountName) {
      try {
        const acctResult = await jobberGraphQLWithPartialErrors<{ account: { name: string } }>(
          token,
          `query { account { name } }`
        );
        accountName = acctResult.data?.account?.name || null;
      } catch { /* non-critical, skip */ }
    }

    // Fetch all resources in parallel to stay within Vercel timeout
    const [jobResult, invoiceResult, quoteResult, requestResult] = await Promise.all([
      fetchAllPages<JobNode>(
        token,
        "jobs",
        `id
         createdAt
         updatedAt
         jobStatus
         startAt
         endAt
         jobNumber
         jobberWebUri
         title
         total`,
        lastSyncAt
      ),
      fetchAllPages<InvoiceNode>(
        token,
        "invoices",
        `id
         invoiceNumber
         createdAt
         dueDate
         updatedAt
         total
         jobberWebUri
         subject
         invoiceStatus
         client {
           name
         }
         amounts {
           invoiceBalance
         }`,
        lastSyncAt
      ),
      fetchAllPages<QuoteNode>(
        token,
        "quotes",
        `id
         quoteNumber
         title
         createdAt
         updatedAt
         sentAt
         quoteStatus
         jobberWebUri
         amounts { total }`,
        lastSyncAt
      ),
      fetchAllPages<RequestNode>(
        token,
        "requests",
        `id
         title
         requestStatus
         source
         jobberWebUri
         createdAt
         contactName
         companyName
         email
         phone
         client {
           id
           name
         }`,
        lastSyncAt
      ),
    ]);

    const jobs = jobResult.nodes;
    const invoices = invoiceResult.nodes;
    const quotes = quoteResult.nodes;
    const requests = requestResult.nodes;

    // Log any permission errors
    const allErrors = [...jobResult.errors, ...invoiceResult.errors, ...quoteResult.errors, ...requestResult.errors];
    if (allErrors.length > 0) {
      console.warn("Jobber API partial errors:", allErrors.length);
    }

    // BATCH UPSERT: Jobs (chunked)
    if (jobs.length > 0) {
      const jobRows = jobs.map(j => ({
        connection_id: connectionId,
        jobber_job_id: j.id,
        job_number: j.jobNumber ?? null,
        job_title: j.title ?? null,
        jobber_url: j.jobberWebUri ?? null,
        status: j.jobStatus ?? null,
        scheduled_start_at: j.startAt ?? null,
        scheduled_end_at: j.endAt ?? null,
        created_at_jobber: j.createdAt ?? null,
        updated_at_jobber: j.updatedAt ?? null,
        total_amount_cents: dollarsToCents(j.total),
      }));

      const chunkSize = 1000;
      for (let i = 0; i < jobRows.length; i += chunkSize) {
        const chunk = jobRows.slice(i, i + chunkSize);
        const { error } = await supabaseAdmin
          .from("fact_jobs")
          .upsert(chunk, { onConflict: "connection_id,jobber_job_id" });
        if (error) throw new Error(`fact_jobs batch upsert failed: ${error.message}`);
      }
    }

    // BATCH UPSERT: Invoices (chunked)
    if (invoices.length > 0) {
      const invoiceRows = invoices.map(inv => {
        const isPaid = (inv.invoiceStatus || '').toLowerCase() === 'paid';
        return {
          connection_id: connectionId,
          jobber_invoice_id: inv.id,
          invoice_number: inv.invoiceNumber ?? null,
          created_at_jobber: inv.createdAt ?? null,
          due_at: inv.dueDate ?? null,
          paid_at: isPaid ? inv.updatedAt : null,
          updated_at_jobber: inv.updatedAt ?? null,
          total_amount_cents: dollarsToCents(inv.total),
          balance_cents: dollarsToCents(inv.amounts?.invoiceBalance),
          jobber_url: inv.jobberWebUri ?? null,
          client_name: inv.client?.name ?? null,
          subject: inv.subject ?? null,
          status: inv.invoiceStatus ?? null,
        };
      });

      const chunkSize = 1000;
      for (let i = 0; i < invoiceRows.length; i += chunkSize) {
        const chunk = invoiceRows.slice(i, i + chunkSize);
        const { error } = await supabaseAdmin
          .from("fact_invoices")
          .upsert(chunk, { onConflict: "connection_id,jobber_invoice_id" });
        if (error) throw new Error(`fact_invoices batch upsert failed: ${error.message}`);
      }
    }

    // BATCH UPSERT: Quotes (chunked)
    if (quotes.length > 0) {
      const quoteRows = quotes.map(q => ({
        connection_id: connectionId,
        jobber_quote_id: q.id,
        quote_number: q.quoteNumber ?? null,
        quote_title: q.title ?? null,
        quote_status: q.quoteStatus ?? null,
        quote_url: q.jobberWebUri ?? null,
        quote_total_cents: dollarsToCents(q.amounts?.total ?? 0),
        created_at_jobber: q.createdAt ?? null,
        updated_at_jobber: q.updatedAt ?? null,
        sent_at: q.sentAt ?? null,
      }));

      const chunkSize = 1000;
      for (let i = 0; i < quoteRows.length; i += chunkSize) {
        const chunk = quoteRows.slice(i, i + chunkSize);
        const { error } = await supabaseAdmin
          .from("fact_quotes")
          .upsert(chunk, { onConflict: "connection_id,jobber_quote_id" });
        if (error) throw new Error(`fact_quotes batch upsert failed: ${error.message}`);
      }
    }

    // BATCH UPSERT: Requests (chunked)
    if (requests.length > 0) {
      const requestRows = requests.map(r => ({
        connection_id: connectionId,
        jobber_request_id: r.id,
        title: r.title ?? null,
        request_status: r.requestStatus ?? null,
        source: r.source ?? null,
        client_name: r.client?.name ?? null,
        client_id: r.client?.id ?? null,
        contact_name: r.contactName ?? null,
        company_name: r.companyName ?? null,
        email: r.email ?? null,
        phone: r.phone ?? null,
        jobber_url: r.jobberWebUri ?? null,
        created_at_jobber: r.createdAt ?? null,
        synced_at: new Date().toISOString(),
      }));

      const chunkSize = 1000;
      for (let i = 0; i < requestRows.length; i += chunkSize) {
        const chunk = requestRows.slice(i, i + chunkSize);
        const { error } = await supabaseAdmin
          .from("fact_requests")
          .upsert(chunk, { onConflict: "connection_id,jobber_request_id" });
        if (error) throw new Error(`fact_requests batch upsert failed: ${error.message}`);
      }
    }

    // Calculate metrics for admin dashboard
    const now = new Date();
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const isFullSync = !lastSyncAt;

    // For full sync: compute metrics from in-memory arrays (skip redundant DB re-fetch)
    // For incremental sync: use lightweight count queries (we only have the delta in memory)
    let allInvoices: any[];
    let allJobs: any[];
    let allQuotes: any[];
    let jobCount: number;
    let requestCount: number;
    let quoteCount: number;

    if (isFullSync) {
      // Full sync — we have ALL data in memory, no need to re-query DB
      allInvoices = invoices.map(inv => ({
        status: inv.invoiceStatus,
        balance_cents: dollarsToCents(inv.amounts?.invoiceBalance),
        total_amount_cents: dollarsToCents(inv.total),
        due_at: inv.dueDate,
      }));
      allJobs = jobs.map(j => ({ scheduled_start_at: j.startAt }));
      allQuotes = quotes.map(q => ({
        quote_status: q.quoteStatus,
        quote_total_cents: dollarsToCents(q.amounts?.total ?? 0),
        sent_at: q.sentAt,
      }));
      jobCount = jobs.length;
      requestCount = requests.length;
      quoteCount = quotes.length;
    } else {
      // Incremental sync — need DB for totals (we only fetched the delta)
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
      allInvoices = dbInvoices || [];
      allJobs = dbJobs || [];
      allQuotes = dbQuotes || [];
      jobCount = dbJobCount || 0;
      requestCount = dbRequestCount || 0;
      quoteCount = dbQuoteCount || 0;
    }

    const unpaidInvoices = allInvoices.filter(inv => {
      const st = (inv.status || "").toLowerCase();
      return st !== "paid" && st !== "draft" && st !== "void";
    });

    const pastDueInvoices = unpaidInvoices.filter(inv => {
      if (!inv.due_at) return false;
      return new Date(inv.due_at) < now;
    });

    const invoices15plus = unpaidInvoices.filter(inv => {
      if (!inv.due_at) return false;
      return new Date(inv.due_at) < fifteenDaysAgo;
    });

    const unscheduledJobs = allJobs.filter(j => !j.scheduled_start_at);

    const pastDueCents = pastDueInvoices.reduce((sum: number, inv: any) => sum + (inv.balance_cents || inv.total_amount_cents || 0), 0);
    const fifteenPlusCents = invoices15plus.reduce((sum: number, inv: any) => sum + (inv.balance_cents || inv.total_amount_cents || 0), 0);

    // Calculate quote leak
    const statusLooksWon = (status: string) => {
      const s = status.toUpperCase();
      return s.includes("APPROV") || s.includes("ACCEPT") || s.includes("WON") || s.includes("CONVERT") || s.includes("BOOK");
    };

    const leakingQuotes = allQuotes.filter(q => {
      if (!q.sent_at) return false;
      const st = (q.quote_status || "").toLowerCase().trim();
      if (!st) return true;
      if (st === "archived" || st === "draft") return false;
      return !statusLooksWon(st);
    });

    const quoteLeakCount = leakingQuotes.length;
    const quoteLeakCents = leakingQuotes.reduce((sum: number, q: any) => sum + (q.quote_total_cents || 0), 0);

    // Update heartbeat with metrics
    const heartbeat: Record<string, any> = {
        last_sync_at: new Date().toISOString(),
        sync_status: "complete",
        sync_error: null,
        last_sync_invoices: invoices.length,
        last_sync_quotes: quotes.length,
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

    // If called with json=true, return JSON. Otherwise redirect to dashboard.
    const wantsJson = req.headers.get("accept")?.includes("application/json") || 
                      searchParams.get("json") === "true";
    
    if (wantsJson) {
      return NextResponse.json({
        ok: true,
        jobs: jobs.length,
        invoices: invoices.length,
        quotes: quotes.length,
        requests: requests.length,
      });
    }
    
    return NextResponse.redirect(new URL(`/jobber/dashboard`, req.url));
  } catch (error) {
    console.error("Sync failed:", error);
    const message = error instanceof Error ? error.message : "Sync failed";

    // Update sync status to failed
    await supabaseAdmin
      .from("jobber_connections")
      .update({ sync_status: "failed", sync_error: message })
      .eq("id", connectionId);

    // Send failure notification email (best-effort, don't let email errors mask the sync error)
    try {
      await sendSyncFailureEmail({
        connectionId,
        accountName: null,
        error: message,
      });
    } catch (emailErr) {
      console.error("Failed to send sync failure email:", emailErr);
    }

    const wantsJson = req.headers.get("accept")?.includes("application/json") ||
                      new URL(req.url).searchParams.get("json") === "true";

    if (wantsJson) {
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }

    return NextResponse.redirect(
      new URL(`/jobber/dashboard?sync_error=${encodeURIComponent(message)}`, req.url)
    );
  }
}