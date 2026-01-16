// src/app/api/sync/run/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getValidAccessToken } from "@/lib/jobberAuth";
import { jobberGraphQL } from "@/lib/jobberGraphQL";

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
};

type InvoiceNode = {
  id: string;
  invoiceNumber?: string | null;
  createdAt?: string | null;
  dueDate?: string | null;
  updatedAt?: string | null;
  total?: number | null; // float
};

type QuoteAmounts = {
  total?: number | null; // float (Jobber frequently uses Float totals)
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connection_id");
  if (!connectionId) {
    return NextResponse.json({ ok: false, error: "Missing connection_id" }, { status: 400 });
  }

  const token = await getValidAccessToken(connectionId);

  // Jobs
  const jobData = await jobberGraphQL<{ jobs: { nodes: JobNode[] } }>(
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
        }
      }
    }`
  );

  // Invoices
  const invoiceData = await jobberGraphQL<{ invoices: { nodes: InvoiceNode[] } }>(
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
        }
      }
    }`
  );

  // Quotes (REAL fields: quoteStatus, jobberWebUri, amounts, title)
  const quoteData = await jobberGraphQL<{ quotes: { nodes: QuoteNode[] } }>(
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

  // Upsert Jobs
  for (const j of jobData.jobs.nodes ?? []) {
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
        },
        { onConflict: "connection_id,jobber_job_id" }
      );
    if (error) throw new Error(`fact_jobs upsert failed: ${error.message}`);
  }

  // Upsert Invoices
  for (const inv of invoiceData.invoices.nodes ?? []) {
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
        },
        { onConflict: "connection_id,jobber_invoice_id" }
      );
    if (error) throw new Error(`fact_invoices upsert failed: ${error.message}`);
  }

  // Upsert Quotes (REAL quote leak inputs)
  for (const q of quoteData.quotes.nodes ?? []) {
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
      last_sync_invoices: (invoiceData.invoices.nodes ?? []).length,
      last_sync_quotes: (quoteData.quotes.nodes ?? []).length,
    })
    .eq("id", connectionId);

  if (hbErr) throw new Error(`jobber_connections update failed: ${hbErr.message}`);

  return NextResponse.redirect(new URL(`/dashboard?connection_id=${connectionId}`, req.url));
}
