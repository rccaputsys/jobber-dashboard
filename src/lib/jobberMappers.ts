// src/lib/jobberMappers.ts
//
// Shared logic for mapping Jobber GraphQL responses to fact-table rows.
// Used by both the periodic sync (`/api/sync/run`) and the webhook
// dispatcher (`/api/webhooks`) so the two code paths can never drift.
//
// Each entity exports:
//   - A *Node type describing the GraphQL response shape
//   - A *_FIELDS constant containing the GraphQL field selection string
//   - A *ToRow function mapping a node to a fact-table row object

// ---------------------------------------------------------------------------
// Currency helper
// ---------------------------------------------------------------------------

export function dollarsToCents(n: number | null | undefined): number {
  if (n === null || n === undefined) return 0;
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

// ---------------------------------------------------------------------------
// Job
// ---------------------------------------------------------------------------

export type JobNode = {
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

export const JOB_FIELDS = `id
  createdAt
  updatedAt
  jobStatus
  startAt
  endAt
  jobNumber
  jobberWebUri
  title
  total`;

export function jobToRow(connectionId: string, j: JobNode) {
  return {
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
  };
}

// ---------------------------------------------------------------------------
// Visit
// ---------------------------------------------------------------------------

export type VisitLineItem = {
  name?: string | null;
  description?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
};

export type VisitNode = {
  id: string;
  title?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  completedAt?: string | null;
  visitStatus?: string | null;
  isComplete?: boolean | null;
  duration?: number | null;
  createdAt?: string | null;
  job?: { id?: string | null; jobNumber?: number | null } | null;
  lineItems?: { nodes?: VisitLineItem[] } | null;
};

export const VISIT_FIELDS = `id
  title
  startAt
  endAt
  completedAt
  visitStatus
  isComplete
  duration
  createdAt
  job { id jobNumber }
  lineItems(first: 100) {
    nodes {
      name
      description
      quantity
      unitPrice
      totalPrice
    }
  }`;

export function visitToRow(connectionId: string, v: VisitNode) {
  // Sum line item revenue if available (dollars → cents)
  const lineItems = v.lineItems?.nodes || [];
  const lineItemRevenueCents =
    lineItems.length > 0
      ? Math.round(
          lineItems.reduce(
            (s: number, li: VisitLineItem) => s + Number(li.totalPrice ?? 0) * 100,
            0,
          ),
        )
      : null;

  return {
    connection_id: connectionId,
    jobber_visit_id: v.id,
    jobber_job_id: v.job?.id ?? null,
    job_number: v.job?.jobNumber ?? null,
    title: v.title ?? null,
    visit_status: v.visitStatus ?? null,
    is_complete: v.isComplete ?? false,
    start_at: v.startAt ?? null,
    end_at: v.endAt ?? null,
    completed_at: v.completedAt ?? null,
    duration_minutes: v.duration ?? null,
    created_at_jobber: v.createdAt ?? null,
    visit_revenue_cents: lineItemRevenueCents,
  };
}

// ---------------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------------

export type InvoiceNode = {
  id: string;
  invoiceNumber?: string | null;
  createdAt?: string | null;
  dueDate?: string | null;
  updatedAt?: string | null;
  total?: number | null;
  jobberWebUri?: string | null;
  client?: { name?: string | null } | null;
  subject?: string | null;
  invoiceStatus?: string | null;
  amounts?: { invoiceBalance?: number | null } | null;
};

export const INVOICE_FIELDS = `id
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
  }`;

export function invoiceToRow(connectionId: string, inv: InvoiceNode) {
  const isPaid = (inv.invoiceStatus || "").toLowerCase() === "paid";
  return {
    connection_id: connectionId,
    jobber_invoice_id: inv.id,
    invoice_number: inv.invoiceNumber ?? null,
    created_at_jobber: inv.createdAt ?? null,
    due_at: inv.dueDate ?? null,
    paid_at: isPaid ? inv.updatedAt ?? null : null,
    updated_at_jobber: inv.updatedAt ?? null,
    total_amount_cents: dollarsToCents(inv.total),
    balance_cents: dollarsToCents(inv.amounts?.invoiceBalance),
    jobber_url: inv.jobberWebUri ?? null,
    client_name: inv.client?.name ?? null,
    subject: inv.subject ?? null,
    status: inv.invoiceStatus ?? null,
  };
}

// ---------------------------------------------------------------------------
// Quote
// ---------------------------------------------------------------------------

export type QuoteNode = {
  id: string;
  quoteNumber?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  sentAt?: string | null;
  quoteStatus?: string | null;
  jobberWebUri?: string | null;
  title?: string | null;
  amounts?: { total?: number | null } | null;
};

export const QUOTE_FIELDS = `id
  quoteNumber
  title
  createdAt
  updatedAt
  sentAt
  quoteStatus
  jobberWebUri
  amounts { total }`;

export function quoteToRow(connectionId: string, q: QuoteNode) {
  return {
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
  };
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export type RequestNode = {
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
  client?: { id?: string | null; name?: string | null } | null;
};

export const REQUEST_FIELDS = `id
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
  }`;

export function requestToRow(connectionId: string, r: RequestNode) {
  return {
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
  };
}

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------
//
// NOTE: Payments are NOT persisted to a fact table. The webhook handler uses
// the parent invoice link to refresh fact_invoices. Field selection is minimal
// — just enough to drive the cascade. The exact field name for the parent
// invoice link is unverified; if Jobber's schema uses something other than
// `invoice { id }`, fix this constant and the type below.

export type PaymentNode = {
  id: string;
  amount?: number | null;
  entryDate?: string | null;
  invoice?: { id?: string | null } | null;
};

export const PAYMENT_FIELDS = `id
  amount
  entryDate
  invoice { id }`;
