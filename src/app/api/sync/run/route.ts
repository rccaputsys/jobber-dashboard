// src/app/api/sync/run/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getValidAccessToken } from "@/lib/jobberAuth";

type JobNode = {
  id: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  jobStatus?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  jobNumber?: number | null;
  jobberWebUri?: string | null;
  title?: string | null;
  total?: number | null;
};

type InvoiceClient = {
  name?: string | null;
};

type InvoiceAmounts = {
  invoiceBalance?: number | null;
};

type InvoiceNode = {
  id: string;
  invoiceNumber?: string | null;
  createdAt?: string | null;
  dueDate?: string | null;
  updatedAt?: string | null;
  total?: number | null;
  jobberWebUri?: string | null;
  client?: InvoiceClient | null;
  subject?: string | null;
  invoiceStatus?: string | null;
  amounts?: InvoiceAmounts | null;
};

type QuoteAmounts = {
  total?: number | null;
};

type QuoteNode = {
  id: string;
  quoteNumber?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  sentAt?: string | null;
  quoteStatus?: string | null;
  jobberWebUri?: string | null;
  title?: string | null;
  amounts?: QuoteAmounts | null;
};

type RequestClient = {
  id?: string | null;
  name?: string | null;
};

type RequestNode = {
  id: string;
  title?: string | null;
  requestStatus?: string | null;
  source?: string | null;
  jobberWebUri?: string | null;
  createdAt?: string | null;
  contactName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  client?: RequestClient | null;
};

type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

function dollarsToCents(n: number | null | undefined): number {
  if (n === null || n === undefined) return 0;
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
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
  query: string
): Promise<{ data: T | null; errors: unknown[] }> {
  const version = process.env.JOBBER_GRAPHQL_VERSION!;

  const res = await fetch(process.env.JOBBER_GRAPHQL_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-JOBBER-GRAPHQL-VERSION": version,
    },
    body: JSON.stringify({ query }),
  });

  const json = await res.json();

  return {
    data: json.data as T | null,
    errors: json.errors || [],
  };
}

// Fetch all pages WITHOUT filter (for jobs)
async function fetchAllPages<T>(
  accessToken: string,
  resourceName: string,
  nodeFields: string,
  maxPages: number = 100
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
    const query: string = `query {
      ${resourceName}(first: 100${afterClause}) {
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
    cursor = data.pageInfo.endCursor;
    pageCount++;
  }

  return { nodes: allNodes, errors: allErrors };
}

// Fetch all pages WITH updatedAt filter (for invoices, quotes, requests)
async function fetchAllPagesIncremental<T>(
  accessToken: string,
  resourceName: string,
  nodeFields: string,
  updatedAfter: string | null,
  maxPages: number = 100
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
      if (n !== null) {
        validNodes.push(n);
      }
    }
    allNodes.push(...validNodes);

    if (!data.pageInfo.hasNextPage) break;
    cursor = data.pageInfo.endCursor;
    pageCount++;
  }

  return { nodes: allNodes, errors: allErrors };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connection_id");
  const fullSync = searchParams.get("full") === "true";
  
  if (!connectionId) {
    return NextResponse.json({ ok: false, error: "Missing connection_id" }, { status: 400 });
  }

  try {
    const token = await getValidAccessToken(connectionId);
    const twelveMonthsAgoMs = getTwelveMonthsAgoMs();

    // Get last sync time for incremental sync (skip if full sync requested)
    const { data: connectionData } = await supabaseAdmin
      .from("jobber_connections")
      .select("last_sync_at")
      .eq("id", connectionId)
      .single();

    const lastSyncAt = fullSync ? null : (connectionData?.last_sync_at || null);

    // Fetch Jobs (no filter support, fetch all)
    const jobResult = await fetchAllPages<JobNode>(
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
       total`
    );

    // Fetch Invoices (incremental)
    const invoiceResult = await fetchAllPagesIncremental<InvoiceNode>(
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
    );

    // Fetch Quotes (incremental)
    const quoteResult = await fetchAllPagesIncremental<QuoteNode>(
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
    );

    // Fetch Requests (incremental)
    const requestResult = await fetchAllPagesIncremental<RequestNode>(
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
    );

    // No filter - sync all data
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

      const chunkSize = 500;
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

      const chunkSize = 500;
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

      const chunkSize = 500;
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

      const chunkSize = 500;
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
    
    // Query current state from DB for accurate counts
    const { data: allInvoices } = await supabaseAdmin
      .from("fact_invoices")
      .select("status, balance_cents, total_amount_cents, due_at")
      .eq("connection_id", connectionId);
    
    const { data: allJobs } = await supabaseAdmin
      .from("fact_jobs")
      .select("status")
      .eq("connection_id", connectionId);
    
    const { data: allRequests } = await supabaseAdmin
      .from("fact_requests")
      .select("id")
      .eq("connection_id", connectionId);
    
    const unpaidInvoices = (allInvoices || []).filter(inv => {
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
    
    const unscheduledJobs = (allJobs || []).filter(j => {
      const st = (j.status || "").toUpperCase();
      return st === "UNSCHEDULED" || st === "REQUIRES_INVOICING";
    });
    
    const pastDueCents = pastDueInvoices.reduce((sum, inv) => sum + (inv.balance_cents || inv.total_amount_cents || 0), 0);
    const fifteenPlusCents = invoices15plus.reduce((sum, inv) => sum + (inv.balance_cents || inv.total_amount_cents || 0), 0);

    // Update heartbeat with metrics
    const { error: hbErr } = await supabaseAdmin
      .from("jobber_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_invoices: invoices.length,
        last_sync_quotes: quotes.length,
        job_count: (allJobs || []).length,
        request_count: (allRequests || []).length,
        unscheduled_job_count: unscheduledJobs.length,
        invoices_past_due_count: pastDueInvoices.length,
        invoices_past_due_cents: pastDueCents,
        invoices_15plus_count: invoices15plus.length,
        invoices_15plus_cents: fifteenPlusCents,
      })
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