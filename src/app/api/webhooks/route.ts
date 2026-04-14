import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import { getValidAccessToken } from '@/lib/jobberAuth';
import {
  fetchJob,
  fetchVisit,
  fetchInvoice,
  fetchQuote,
  fetchRequest,
  fetchPayment,
} from '@/lib/jobberFetchers';
import {
  jobToRow,
  visitToRow,
  invoiceToRow,
  quoteToRow,
  requestToRow,
} from '@/lib/jobberMappers';

// Initialize Supabase client (admin — bypasses RLS, required for webhook context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifyJobberSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.JOBBER_CLIENT_SECRET;
  if (!secret || !signatureHeader) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('base64');

  try {
    return timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Connection lookup (accountId from webhook payload → connection row)
// ---------------------------------------------------------------------------

async function getConnectionByAccountId(accountId: string) {
  const { data } = await supabase
    .from('jobber_connections')
    .select('id')
    .eq('jobber_account_id', accountId)
    .maybeSingle();
  return data; // { id } | null
}

// ---------------------------------------------------------------------------
// Analytics event helper (with select-first dedup since the table has no
// unique constraint on (connection_id, properties->jobber_*_id, event))
// ---------------------------------------------------------------------------

async function recordAnalyticsEvent(
  connectionId: string,
  event: string,
  entityIdKey: string,
  entityId: string,
  amountCents: number | null,
) {
  // Dedup: skip if we've already recorded this exact event for this entity
  const { data: existing } = await supabase
    .from('analytics_events')
    .select('id')
    .eq('connection_id', connectionId)
    .eq('event', event)
    .contains('properties', { [entityIdKey]: entityId })
    .limit(1)
    .maybeSingle();
  if (existing) return;

  await supabase.from('analytics_events').insert([
    {
      connection_id: connectionId,
      event,
      properties: {
        [entityIdKey]: entityId,
        amount_cents: amountCents,
        source: 'jobber_webhook',
      },
    },
  ]);
}

// ---------------------------------------------------------------------------
// Per-entity refresh handlers
// ---------------------------------------------------------------------------

async function refreshJob(connectionId: string, token: string, jobId: string) {
  const job = await fetchJob(token, jobId);
  if (!job) return;
  const row = jobToRow(connectionId, job);
  await supabase.from('fact_jobs').upsert(row, { onConflict: 'connection_id,jobber_job_id' });
}

async function deleteJob(connectionId: string, jobId: string) {
  await supabase
    .from('fact_jobs')
    .delete()
    .eq('connection_id', connectionId)
    .eq('jobber_job_id', jobId);
}

async function refreshVisit(connectionId: string, token: string, visitId: string) {
  const visit = await fetchVisit(token, visitId);
  if (!visit) return;
  const row = visitToRow(connectionId, visit);
  await supabase.from('fact_visits').upsert(row, { onConflict: 'connection_id,jobber_visit_id' });
}

async function deleteVisit(connectionId: string, visitId: string) {
  await supabase
    .from('fact_visits')
    .delete()
    .eq('connection_id', connectionId)
    .eq('jobber_visit_id', visitId);
}

async function refreshQuote(connectionId: string, token: string, quoteId: string) {
  const quote = await fetchQuote(token, quoteId);
  if (!quote) return null;
  const row = quoteToRow(connectionId, quote);
  await supabase.from('fact_quotes').upsert(row, { onConflict: 'connection_id,jobber_quote_id' });
  return row;
}

async function deleteQuote(connectionId: string, quoteId: string) {
  await supabase
    .from('fact_quotes')
    .delete()
    .eq('connection_id', connectionId)
    .eq('jobber_quote_id', quoteId);
}

/**
 * Refresh fact_invoices from Jobber. Returns the new and previous balance
 * so callers can detect "balance just hit 0" and fire side effects.
 */
async function refreshInvoice(
  connectionId: string,
  token: string,
  invoiceId: string,
): Promise<{ newBalanceCents: number; prevBalanceCents: number | null } | null> {
  // Capture previous balance BEFORE upserting so we can detect transitions
  const { data: prev } = await supabase
    .from('fact_invoices')
    .select('balance_cents')
    .eq('connection_id', connectionId)
    .eq('jobber_invoice_id', invoiceId)
    .maybeSingle();
  const prevBalanceCents = prev?.balance_cents ?? null;

  const invoice = await fetchInvoice(token, invoiceId);
  if (!invoice) return null;
  const row = invoiceToRow(connectionId, invoice);
  await supabase
    .from('fact_invoices')
    .upsert(row, { onConflict: 'connection_id,jobber_invoice_id' });

  return { newBalanceCents: row.balance_cents, prevBalanceCents };
}

async function deleteInvoice(connectionId: string, invoiceId: string) {
  await supabase
    .from('fact_invoices')
    .delete()
    .eq('connection_id', connectionId)
    .eq('jobber_invoice_id', invoiceId);
}

async function refreshRequest(connectionId: string, token: string, requestId: string) {
  const request = await fetchRequest(token, requestId);
  if (!request) return;
  const row = requestToRow(connectionId, request);
  await supabase
    .from('fact_requests')
    .upsert(row, { onConflict: 'connection_id,jobber_request_id' });
}

async function deleteRequest(connectionId: string, requestId: string) {
  await supabase
    .from('fact_requests')
    .delete()
    .eq('connection_id', connectionId)
    .eq('jobber_request_id', requestId);
}

/**
 * Payment webhook handler. Payments are NOT persisted — instead the parent
 * invoice is refetched and upserted into fact_invoices. On PAYMENT_CREATE,
 * if the new balance hit 0 from a previous non-zero, fire an invoice_paid
 * analytics event for funnel tracking.
 */
async function handlePaymentEvent(
  connectionId: string,
  token: string,
  paymentId: string,
  isCreate: boolean,
) {
  const payment = await fetchPayment(token, paymentId);
  if (!payment) return;
  const invoiceId = payment.invoice?.id;
  if (!invoiceId) {
    console.warn('Payment webhook: payment has no parent invoice link', { paymentId });
    return;
  }

  const result = await refreshInvoice(connectionId, token, invoiceId);
  if (!result) return;

  // Side effect: balance just transitioned to 0 on a payment_create
  if (isCreate && result.newBalanceCents === 0 && (result.prevBalanceCents ?? 0) > 0) {
    await recordAnalyticsEvent(
      connectionId,
      'invoice_paid',
      'jobber_invoice_id',
      invoiceId,
      result.prevBalanceCents,
    );
  }
}

// ---------------------------------------------------------------------------
// Main POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('x-jobber-hmac-sha256');

  if (!verifyJobberSignature(rawBody, signature)) {
    console.error('Webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let webhookData: any;
  try {
    const rawData = JSON.parse(rawBody);
    webhookData = rawData.data?.webHookEvent || rawData;
  } catch {
    return NextResponse.json({ received: true, error: 'Invalid JSON' }, { status: 200 });
  }

  const topic: string = webhookData.topic;
  const accountId: string | undefined = webhookData.accountId;
  // Jobber webhook payloads carry the entity ID at itemId for entity-scoped
  // topics. Fall back to other common shapes just in case.
  const entityId: string | undefined =
    webhookData.itemId || webhookData.id || webhookData.item?.id;

  try {
    // APP_DISCONNECT runs without needing a token (we're tearing the connection down)
    if (topic === 'APP_DISCONNECT') {
      if (!accountId) return NextResponse.json({ received: true }, { status: 200 });

      const { data: connection } = await supabase
        .from('jobber_connections')
        .select('id')
        .eq('jobber_account_id', accountId)
        .maybeSingle();

      if (connection) {
        // Delete Jobber data and tokens, but KEEP the connection row
        // so Stripe billing, user account, and trial info are preserved
        await supabase.from('fact_visits').delete().eq('connection_id', connection.id);
        await supabase.from('fact_invoices').delete().eq('connection_id', connection.id);
        await supabase.from('fact_jobs').delete().eq('connection_id', connection.id);
        await supabase.from('fact_quotes').delete().eq('connection_id', connection.id);
        await supabase.from('fact_requests').delete().eq('connection_id', connection.id);
        await supabase.from('jobber_tokens').delete().eq('connection_id', connection.id);

        // Keep jobber_account_id so a reconnect links back to this row
        // (preserves trial dates + Stripe — prevents disconnect/reconnect trial abuse).
        await supabase
          .from('jobber_connections')
          .update({
            last_sync_at: null,
            sync_status: 'disconnected',
            disconnected_at: new Date().toISOString(),
          })
          .eq('id', connection.id);

        console.log('APP_DISCONNECT: data cleared, connection preserved', connection.id);
      }
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // All other topics need an account → connection → token resolution
    if (!accountId) {
      console.warn('Webhook missing accountId', { topic });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const connection = await getConnectionByAccountId(accountId);
    if (!connection) {
      console.warn('Webhook for unknown account', { topic, accountId });
      return NextResponse.json({ received: true }, { status: 200 });
    }
    const connectionId = connection.id;

    // Entity-scoped topics need an entityId
    const needsEntityId = topic !== 'APP_DISCONNECT';
    if (needsEntityId && !entityId) {
      console.warn('Webhook missing entity id', { topic, accountId });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Lazy: only resolve token for topics that need it (all current topics do)
    const token = await getValidAccessToken(connectionId);

    switch (topic) {
      // -------- Jobs --------
      case 'JOB_CREATE':
      case 'JOB_UPDATE':
      case 'JOB_CLOSED':
        await refreshJob(connectionId, token, entityId!);
        break;
      case 'JOB_DESTROY':
        await deleteJob(connectionId, entityId!);
        break;

      // -------- Visits --------
      case 'VISIT_CREATE':
      case 'VISIT_UPDATE':
      case 'VISIT_COMPLETE':
        await refreshVisit(connectionId, token, entityId!);
        break;
      case 'VISIT_DESTROY':
        await deleteVisit(connectionId, entityId!);
        break;

      // -------- Quotes --------
      case 'QUOTE_CREATE':
      case 'QUOTE_UPDATE':
      case 'QUOTE_SENT':
        await refreshQuote(connectionId, token, entityId!);
        break;
      case 'QUOTE_APPROVED': {
        const row = await refreshQuote(connectionId, token, entityId!);
        if (row) {
          await recordAnalyticsEvent(
            connectionId,
            'quote_approved',
            'jobber_quote_id',
            entityId!,
            row.quote_total_cents ?? null,
          );
        }
        break;
      }
      case 'QUOTE_DESTROY':
        await deleteQuote(connectionId, entityId!);
        break;

      // -------- Invoices --------
      // Note: Jobber does NOT have an INVOICE_UPDATE topic. Live updates to
      // existing invoices flow through PAYMENT_* webhooks below.
      case 'INVOICE_CREATE':
        await refreshInvoice(connectionId, token, entityId!);
        break;
      case 'INVOICE_DESTROY':
        await deleteInvoice(connectionId, entityId!);
        break;

      // -------- Requests --------
      case 'REQUEST_CREATE':
      case 'REQUEST_UPDATE':
        await refreshRequest(connectionId, token, entityId!);
        break;
      case 'REQUEST_DESTROY':
        await deleteRequest(connectionId, entityId!);
        break;

      // -------- Payments (Jobber Payments only — refresh parent invoice) --------
      case 'PAYMENT_CREATE':
        await handlePaymentEvent(connectionId, token, entityId!, true);
        break;
      case 'PAYMENT_UPDATE':
      case 'PAYMENT_DESTROY':
        await handlePaymentEvent(connectionId, token, entityId!, false);
        break;

      default:
        console.log('Unhandled webhook topic:', topic);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    // Log but always return 200 — periodic sync is the safety net.
    // If we returned 5xx, Jobber would retry; we don't want a flood of retries
    // for transient errors when the next sync will reconcile anyway.
    console.error('Webhook processing error', { topic, accountId, entityId, error });
    return NextResponse.json({ received: true, error: 'Processing failed' }, { status: 200 });
  }
}
