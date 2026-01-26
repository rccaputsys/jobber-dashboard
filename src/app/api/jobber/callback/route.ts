// src/app/api/jobber/callback/route.ts
import { NextResponse } from "next/server";
import { decryptText, encryptText } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function tokenExchange(code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.JOBBER_CLIENT_ID!,
    client_secret: process.env.JOBBER_CLIENT_SECRET!,
    redirect_uri: process.env.JOBBER_REDIRECT_URI!,
    code,
  });

  const res = await fetch(process.env.JOBBER_OAUTH_TOKEN_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`Token exchange non-JSON response: ${res.status} ${text}`);
  }

  if (!res.ok) {
    throw new Error(
      `Token exchange failed: ${res.status} keys=${Object.keys(json ?? {}).join(",")}`
    );
  }

  return json as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number | string;
    expires_at?: string;
    token_type?: string;
    scope?: string;
  };
}

async function jobberGraphQL<T>(
  accessToken: string,
  query: string
): Promise<{ data: T | null; errors: unknown[]; raw: unknown }> {
  const version = process.env.JOBBER_GRAPHQL_VERSION!;
  if (!version) {
    throw new Error("Missing JOBBER_GRAPHQL_VERSION");
  }

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
  return { data: json.data as T | null, errors: json.errors || [], raw: json };
}

async function getLoggedInUser() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/jobber?err=missing_code_state", req.url));
  }

  await decryptText(state);

  const token = await tokenExchange(code);

  // Compute expiresAt safely
  let expiresAt: string;
  if (token.expires_at) {
    const d = new Date(token.expires_at);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid expires_at from Jobber");
    expiresAt = d.toISOString();
  } else {
    const raw = token.expires_in;
    const seconds =
      typeof raw === "string" ? Number(raw) :
      typeof raw === "number" ? raw :
      NaN;

    if (!Number.isFinite(seconds)) {
      expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
      console.warn("Missing expires_in; defaulting token expiry to 1 hour");
    } else {
      expiresAt = new Date(Date.now() + seconds * 1000).toISOString();
    }
  }

  if (!token.access_token || !token.refresh_token) {
    throw new Error(
      `Token response missing access_token/refresh_token. keys=${Object.keys(token ?? {}).join(",")}`
    );
  }

  // Fetch account info from Jobber
  const acctResult = await jobberGraphQL<{ account: { id: string; name: string } }>(
    token.access_token,
    `query { account { id name } }`
  );

  if (acctResult.errors.length > 0) {
    console.error("Jobber GraphQL errors:", acctResult.errors);
  }

  if (!acctResult.data?.account) {
    throw new Error(`Could not get account from Jobber. Response: ${JSON.stringify(acctResult.raw)}`);
  }

  const acct = acctResult.data.account;

  // Check if user is already logged in
  const loggedInUser = await getLoggedInUser();

  // Check if this Jobber account already has a connection
  const { data: existingConn } = await supabaseAdmin
    .from("jobber_connections")
    .select("id, user_id")
    .eq("jobber_account_id", acct.id)
    .maybeSingle();

  let connectionId: string;

  if (existingConn) {
    // Update existing connection
    connectionId = existingConn.id;
    
    // If logged in user exists but connection has no user_id, link them
    if (loggedInUser && !existingConn.user_id) {
      await supabaseAdmin
        .from("jobber_connections")
        .update({ 
          jobber_account_name: acct.name,
          user_id: loggedInUser.id 
        })
        .eq("id", connectionId);
    } else {
      await supabaseAdmin
        .from("jobber_connections")
        .update({ jobber_account_name: acct.name })
        .eq("id", connectionId);
    }

    // Update tokens
    const encAccess = await encryptText(token.access_token);
    const encRefresh = await encryptText(token.refresh_token);

    await supabaseAdmin
      .from("jobber_tokens")
      .upsert({
        connection_id: connectionId,
        access_token: encAccess,
        refresh_token: encRefresh,
        expires_at: expiresAt,
      }, { onConflict: "connection_id" });

    // If user exists on this connection
    if (existingConn.user_id) {
      // If user is already logged in, go straight to dashboard
      if (loggedInUser && loggedInUser.id === existingConn.user_id) {
        return NextResponse.redirect(new URL("/jobber/dashboard", req.url));
      }
      // If not logged in, redirect to login
      return NextResponse.redirect(new URL("/login?message=jobber_reconnected", req.url));
    }
    
    // If we just linked a logged-in user to an orphaned connection, go to dashboard
    if (loggedInUser) {
      return NextResponse.redirect(new URL("/jobber/dashboard", req.url));
    }
  } else {
    // Create new connection
    const now = new Date();
    const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // If user is logged in, link the connection to them immediately
    const insertData: any = {
      jobber_account_id: acct.id,
      jobber_account_name: acct.name,
      billing_status: 'trialing',
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEnds.toISOString(),
    };
    
    if (loggedInUser) {
      insertData.user_id = loggedInUser.id;
    }

    const { data: conn, error: connErr } = await supabaseAdmin
      .from("jobber_connections")
      .insert(insertData)
      .select("id")
      .single();

    if (connErr || !conn?.id) {
      throw new Error(connErr?.message || "Failed to create connection");
    }
    connectionId = conn.id;

    const encAccess = await encryptText(token.access_token);
    const encRefresh = await encryptText(token.refresh_token);

    // Insert token for new connection
    const { error: tokErr } = await supabaseAdmin
      .from("jobber_tokens")
      .upsert({
        connection_id: connectionId,
        access_token: encAccess,
        refresh_token: encRefresh,
        expires_at: expiresAt,
      }, { onConflict: "connection_id" });

    if (tokErr) throw new Error(tokErr.message);
    
    // If user was logged in, go straight to dashboard
    if (loggedInUser) {
      return NextResponse.redirect(new URL("/jobber/dashboard", req.url));
    }
  }

  // Redirect to complete signup (email/password collection)
  return NextResponse.redirect(new URL(`/complete-signup?connection_id=${connectionId}`, req.url));
}