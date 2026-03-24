import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

// Initialize Supabase client
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

export async function POST(request: NextRequest) {
  // Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('x-jobber-hmac-sha256');

  if (!verifyJobberSignature(rawBody, signature)) {
    console.error('Webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const rawData = JSON.parse(rawBody);
    const webhookData = rawData.data?.webHookEvent || rawData;

    // Handle different webhook types
    switch (webhookData.topic) {
      case 'APP_DISCONNECT': {
        const accountId = webhookData.accountId;

        if (accountId) {
          const { data: connection } = await supabase
            .from("jobber_connections")
            .select("id")
            .eq("jobber_account_id", accountId)
            .maybeSingle();

          if (connection) {
            // Delete Jobber data and tokens, but KEEP the connection row
            // so Stripe billing, user account, and trial info are preserved
            await supabase.from("fact_visits").delete().eq("connection_id", connection.id);
            await supabase.from("fact_invoices").delete().eq("connection_id", connection.id);
            await supabase.from("fact_jobs").delete().eq("connection_id", connection.id);
            await supabase.from("fact_quotes").delete().eq("connection_id", connection.id);
            await supabase.from("fact_requests").delete().eq("connection_id", connection.id);
            await supabase.from("jobber_tokens").delete().eq("connection_id", connection.id);

            // Mark as disconnected instead of deleting
            await supabase.from("jobber_connections")
              .update({
                jobber_account_id: null,
                last_sync_at: null,
                sync_status: "disconnected",
                disconnected_at: new Date().toISOString(),
              })
              .eq("id", connection.id);

            console.log('APP_DISCONNECT: data cleared, connection preserved', connection.id);
          }
        }
        break;
      }

      case 'job.created':
      case 'job.updated':
      case 'visit.created':
      case 'client.created':
        // Acknowledged — no action needed (data pulled during sync)
        break;

      default:
        console.log('Unhandled webhook topic:', webhookData.topic);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('Webhook processing error');
    return NextResponse.json({ received: true, error: 'Processing failed' }, { status: 200 });
  }
}
