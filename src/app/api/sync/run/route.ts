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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connection_id");
  if (!connectionId) {
    return NextResponse.json({ ok: false, error: "Missing connection_id" }, { status: 400 });
  }

  try {
    const token = await getValidAccessToken(connectionId);
    const twelveMonthsAgoMs = getTwelveMonthsAgoMs();

    // Fetch all data
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

    const invoiceResult = await fetchAllPages<InvoiceNode>(
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
       }`
    );

    const quoteResult = await fetchAllPages<QuoteNode>(
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
       amounts { total }`
    );

    const requestResult = await fetchAllPages<RequestNode>(
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
       }`
    );

    // Filter to last 12 months
    const jobs = jobResult.nodes.filter(j => isWithinTwelveMonths(j.createdAt, twelveMonthsAgoMs));
    const invoices = invoiceResult.nodes.filter(inv => isWithinTwelveMonths(inv.createdAt, twelveMonthsAgoMs));
    const quotes = quoteResult.nodes.filter(q => isWithinTwelveMonths(q.createdAt, twelveMonthsAgoMs));
    const requests = requestResult.nodes.filter(r => isWithinTwelveMonths(r.createdAt, twelveMonthsAgoMs));

    // Log any permission errors
    const allErrors = [...jobResult.errors, ...invoiceResult.errors, ...quoteResult.errors, ...requestResult.errors];
    if (allErrors.length > 0) {
      console.warn("Jobber API partial errors:", allErrors.length);
    }

    // BATCH UPSERT: Jobs
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

      const { error } = await supabaseAdmin
        .from("fact_jobs")
        .upsert(jobRows, { onConflict: "connection_id,jobber_job_id" });

      if (error) throw new Error(`fact_jobs batch upsert failed: ${error.message}`);
    }

    // BATCH UPSERT: Invoices
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
          jobber_url: inv.jobberWebUri ?? null,
          client_name: inv.client?.name ?? null,
          subject: inv.subject ?? null,
          status: inv.invoiceStatus ?? null,
        };
      });

      const { error } = await supabaseAdmin
        .from("fact_invoices")
        .upsert(invoiceRows, { onConflict: "connection_id,jobber_invoice_id" });

      if (error) throw new Error(`fact_invoices batch upsert failed: ${error.message}`);
    }

    // BATCH UPSERT: Quotes
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

      const { error } = await supabaseAdmin
        .from("fact_quotes")
        .upsert(quoteRows, { onConflict: "connection_id,jobber_quote_id" });

      if (error) throw new Error(`fact_quotes batch upsert failed: ${error.message}`);
    }

    // BATCH UPSERT: Requests
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

      const { error } = await supabaseAdmin
        .from("fact_requests")
        .upsert(requestRows, { onConflict: "connection_id,jobber_request_id" });

      if (error) throw new Error(`fact_requests batch upsert failed: ${error.message}`);
    }

    // Update heartbeat
    const { error: hbErr } = await supabaseAdmin
      .from("jobber_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_invoices: invoices.length,
        last_sync_quotes: quotes.length,
      })
      .eq("id", connectionId);

    if (hbErr) throw new Error(`jobber_connections update failed: ${hbErr.message}`);

    return NextResponse.redirect(new URL(`/jobber/dashboard`, req.url));
  } catch (error) {
    console.error("Sync failed:", error);
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.redirect(
      new URL(`/jobber/dashboard?sync_error=${encodeURIComponent(message)}`, req.url)
    );
  }
}