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

function dollarsToCents(n: number | null | undefined): number {
  if (n === null || n === undefined) return 0;
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
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
  
  // Return both data and errors - don't throw on partial errors
  return {
    data: json.data as T | null,
    errors: json.errors || [],
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connection_id");
  if (!connectionId) {
    return NextResponse.json({ ok: false, error: "Missing connection_id" }, { status: 400 });
  }

  const token = await getValidAccessToken(connectionId);

  // Jobs
  const jobResult = await jobberGraphQLWithPartialErrors<{ jobs: { nodes: (JobNode | null)[] } }>(
    token,
    `query {
      jobs(first: 100) {
        nodes {
          id
          createdAt
          updatedAt
          jobStatus
          startAt
          endAt
          jobNumber
          jobberWebUri
          title
          total
        }
      }
    }`
  );

  // Invoices
  const invoiceResult = await jobberGraphQLWithPartialErrors<{ invoices: { nodes: (InvoiceNode | null)[] } }>(
    token,
    `query {
      invoices(first: 100) {
        nodes {
          id
          invoiceNumber
          createdAt
          dueDate
          updatedAt
          total
          jobberWebUri
          subject
          client {
            name
          }
        }
      }
    }`
  );

  // Quotes
  const quoteResult = await jobberGraphQLWithPartialErrors<{ quotes: { nodes: (QuoteNode | null)[] } }>(
    token,
    `query {
      quotes(first: 200) {
        nodes {
          id
          quoteNumber
          title
          createdAt
          updatedAt
          sentAt
          quoteStatus
          jobberWebUri
          amounts { total }
        }
      }
    }`
  );

  // Filter out null nodes (hidden due to permissions)
  const jobs = (jobResult.data?.jobs?.nodes ?? []).filter((j): j is JobNode => j !== null);
  const invoices = (invoiceResult.data?.invoices?.nodes ?? []).filter((i): i is InvoiceNode => i !== null);
  const quotes = (quoteResult.data?.quotes?.nodes ?? []).filter((q): q is QuoteNode => q !== null);

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

  // Upsert Invoices
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