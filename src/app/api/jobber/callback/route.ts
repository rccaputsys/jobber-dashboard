// src/app/api/jobber/callback/route.ts
import { NextResponse } from "next/server";
import { decryptText, encryptText } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

  const json = await res.json().catch(async () => {
    const t = await res.text();
    throw new Error(`Token exchange non-JSON response: ${res.status} ${t}`);
  });

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
  query: string,
  variables?: Record<string, unknown>
) {
  const version = process.env.JOBBER_GRAPHQL_VERSION!;
  if (!version) {
    throw new Error(
      "Missing JOBBER_GRAPHQL_VERSION in .env.local (example: 2025-04-16)"
    );
  }

  const res = await fetch(process.env.JOBBER_GRAPHQL_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-JOBBER-GRAPHQL-VERSION": version,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors ?? json)}`);
  }
  return json.data as T;
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

  // Fetch account info AND user email from Jobber
  const data = await jobberGraphQL<{ 
    account: { id: string; name: string }; 
    user: { email: { raw: string } } 
  }>(
    token.access_token,
    `query { 
      account { id name } 
      user { email { raw } }
    }`
  );

  const acct = data.account;
  const userEmail = data.user?.email?.raw;

  if (!userEmail) {
    throw new Error("Could not get user email from Jobber");
  }

  // Check if this Jobber account already has a connection
  const { data: existingConn } = await supabaseAdmin
    .from("jobber_connections")
    .select("id, user_id")
    .eq("jobber_account_id", acct.id)
    .maybeSingle();

  let connectionId: string;
  let userId: string;

  if (existingConn) {
    // Update existing connection
    connectionId = existingConn.id;
    await supabaseAdmin
      .from("jobber_connections")
      .update({ jobber_account_name: acct.name })
      .eq("id", connectionId);

    if (existingConn.user_id) {
      userId = existingConn.user_id;
    } else {
      // Connection exists but no user - create one
      const { data: newUser, error: userErr } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
      });

      if (userErr || !newUser.user) {
        throw new Error(userErr?.message || "Failed to create user");
      }

      userId = newUser.user.id;

      // Link user to connection
      await supabaseAdmin
        .from("jobber_connections")
        .update({ user_id: userId })
        .eq("id", connectionId);
    }
  } else {
    // Check if user already exists with this email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === userEmail);

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: userErr } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
      });

      if (userErr || !newUser.user) {
        throw new Error(userErr?.message || "Failed to create user");
      }

      userId = newUser.user.id;
    }

    // Create new connection
    const now = new Date();
    const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const { data: conn, error: connErr } = await supabaseAdmin
      .from("jobber_connections")
      .insert({
        jobber_account_id: acct.id,
        jobber_account_name: acct.name,
        user_id: userId,
        billing_status: 'trialing',
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnds.toISOString(),
      })
      .select("id")
      .single();

    if (connErr || !conn?.id) {
      throw new Error(connErr?.message || "Failed to create connection");
    }
    connectionId = conn.id;
  }

  const encAccess = await encryptText(token.access_token);
  const encRefresh = await encryptText(token.refresh_token);

  // Upsert token
  const { error: tokErr } = await supabaseAdmin
    .from("jobber_tokens")
    .upsert({
      connection_id: connectionId,
      access_token: encAccess,
      refresh_token: encRefresh,
      expires_at: expiresAt,
    }, { onConflict: "connection_id" });

  if (tokErr) throw new Error(tokErr.message);

  // Generate magic link to sign user in
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: userEmail,
  });

  if (linkErr || !linkData.properties?.hashed_token) {
    throw new Error(linkErr?.message || "Failed to generate session");
  }

  // Start sync in background
  fetch(new URL(`/api/sync/run?connection_id=${connectionId}`, req.url)).catch(() => {});

  // Redirect to verify the magic link token (this logs them in)
  const verifyUrl = new URL("/api/auth/callback", req.url);
  verifyUrl.searchParams.set("token_hash", linkData.properties.hashed_token);
  verifyUrl.searchParams.set("type", "magiclink");
  verifyUrl.searchParams.set("next", "/jobber/dashboard");

  return NextResponse.redirect(verifyUrl.toString());
}