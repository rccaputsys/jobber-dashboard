import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json();
    
    console.log('Received webhook from Jobber:', {
      topic: webhookData.topic,
      resource: webhookData.resource,
      timestamp: new Date().toISOString()
    });

    // Handle different webhook types
    switch (webhookData.topic) {
      case 'job.created':
        console.log('New job created:', webhookData.resource.id);
        break;

      case 'job.updated':
        console.log('Job updated:', webhookData.resource.id);
        break;

      case 'visit.created':
        console.log('New visit scheduled:', webhookData.resource.id);
        break;

      case 'client.created':
        console.log('New client added:', webhookData.resource.id);
        break;

      default:
        console.log('Unhandled webhook topic:', webhookData.topic);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Still return 200 so Jobber doesn't retry
    return NextResponse.json({ 
      received: true, 
      error: 'Processing failed' 
    }, { status: 200 });
  }
}

// Optional: Handle GET requests for testing
export async function GET() {
  return NextResponse.json({ 
    message: 'Webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}
