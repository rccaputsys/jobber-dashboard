import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(
      new URL(`/?error=${error}`, request.url)
    );
  }

  // Validate authorization code
  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=no_code', request.url)
    );
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.getjobber.com/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.JOBBER_CLIENT_ID,
        client_secret: process.env.JOBBER_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.JOBBER_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(
        new URL('/?error=token_exchange_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    
    console.log('Successfully received tokens from Jobber');
    
    // TODO: Store tokens in Supabase
    // Example code commented below:
    /*
    const { error: dbError } = await supabase
      .from('jobber_connections')
      .insert({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
        created_at: new Date()
      });

    if (dbError) {
      console.error('Failed to store tokens:', dbError);
      return NextResponse.redirect(
        new URL('/?error=storage_failed', request.url)
      );
    }
    */

    // Redirect to dashboard with success message
    return NextResponse.redirect(
      new URL('/dashboard?connected=true', request.url)
    );

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/?error=unexpected_error', request.url)
    );
  }
}