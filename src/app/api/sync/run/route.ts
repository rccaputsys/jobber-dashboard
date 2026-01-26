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

type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

function dollarsToCents(n: number | null | undefined): number {
  if (n === null || n === undefined) return 0;
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

// Get date 12 months ago in ISO format
function getTwelveMonthsAgo(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 12);
  return date.toISOString();
}

// Custom GraphQL function that handles partial errors
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

// Paginated fetch helper with optional date filter
async function fetchAllPages<T>(
  accessToken: string,
  resourceName: string,
  nodeFields: string,
  filterClause: string = "",
  maxPages: number = 50
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
  if (!connectionId) {
    return NextResponse.json({ ok: false, error: "Missing connection_id" }, { status: 400 });
  }

  const token = await getValidAccessToken(connectionId);
  const twelveMonthsAgo = getTwelveMonthsAgo();

  // Fetch Jobs created in last 12 months
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
     total`,
    `, filter: { createdAt: { gte: "${twelveMonthsAgo}" } }`
  );

  // Fetch Invoices created in last 12 months
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
     }`,
    `, filter: { createdAt: { gte: "${twelveMonthsAgo}" } }`
  );

  // Fetch Quotes created in last 12 months
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
     amounts { total }`,
    `, filter: { createdAt: { gte: "${twelveMonthsAgo}" } }`
  );

  const jobs = jobResult.nodes;
  const quotes = quoteResult.nodes;

  // Filter invoices to only past_due (these are AR)
  const invoices = invoiceResult.nodes.filter((inv) => {
    const status = (inv.invoiceStatus || '').toLowerCase();
    return status === 'past_due';
  });

  // Log any permission errors (optional)
  const allErrors = [...jobResult.errors, ...invoiceResult.errors, ...quoteResult.errors];
  if (allErrors.length > 0) {
    console.warn("Jobber API partial errors (some items hidden due to permissions):", allErrors.length);
  }

  // Upsert Jobs
  for (const j of jobs) {
    const { error } = await supabaseAdmin
      .from("fact_jobs")
      .upsert(
        {
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
        },
        { onConflict: "connection_id,jobber_job_id" }
      );
    if (error) throw new Error(`fact_jobs upsert failed: ${error.message}`);
  }

  // Upsert Invoices (only past_due)
  for (const inv of invoices) {
    const { error } = await supabaseAdmin
      .from("fact_invoices")
      .upsert(
        {
          connection_id: connectionId,
          jobber_invoice_id: inv.id,
          invoice_number: inv.invoiceNumber ?? null,
          created_at_jobber: inv.createdAt ?? null,
          due_at: inv.dueDate ?? null,
          updated_at_jobber: inv.updatedAt ?? null,
          total_amount_cents: dollarsToCents(inv.total),
          jobber_url: inv.jobberWebUri ?? null,
          client_name: inv.client?.name ?? null,
          subject: inv.subject ?? null,
          status: inv.invoiceStatus ?? null,
        },
        { onConflict: "connection_id,jobber_invoice_id" }
      );
    if (error) throw new Error(`fact_invoices upsert failed: ${error.message}`);
  }

  // Upsert Quotes
  for (const q of quotes) {
    const totalCents = dollarsToCents(q.amounts?.total ?? 0);

    const { error } = await supabaseAdmin
      .from("fact_quotes")
      .upsert(
        {
          connection_id: connectionId,
          jobber_quote_id: q.id,
          quote_number: q.quoteNumber ?? null,
          quote_title: q.title ?? null,
          quote_status: q.quoteStatus ?? null,
          quote_url: q.jobberWebUri ?? null,
          quote_total_cents: totalCents,
          created_at_jobber: q.createdAt ?? null,
          updated_at_jobber: q.updatedAt ?? null,
          sent_at: q.sentAt ?? null,
        },
        { onConflict: "connection_id,jobber_quote_id" }
      );

    if (error) throw new Error(`fact_quotes upsert failed: ${error.message}`);
  }

  // Heartbeat
  const { error: hbErr } = await supabaseAdmin
    .from("jobber_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_invoices: invoices.length,
      last_sync_quotes: quotes.length,
    })
    .eq("id", connectionId);

  if (hbErr) throw new Error(`jobber_connections update failed: ${hbErr.message}`);

  return NextResponse.redirect(new URL(`/jobber/dashboard?connection_id=${connectionId}`, req.url));
}