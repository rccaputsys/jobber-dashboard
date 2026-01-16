// src/app/api/jobber/callback/route.ts
import { NextResponse } from "next/server";
import { decryptText, encryptText } from "@/lib/crypto";
import { getUserId, ensureUserId } from "@/lib/user";
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

  console.log("Jobber token response keys:", Object.keys(json ?? {}));

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
  await ensureUserId();
  const userId = await getUserId();
  if (!userId) return NextResponse.redirect(new URL("/?err=no_user", req.url));

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/?err=missing_code_state", req.url));
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

  const acct = await jobberGraphQL<{ account: { id: string; name: string } }>(
    token.access_token,
    `query { account { id name } }`
  );

  const { data: conn, error: connErr } = await supabaseAdmin
    .from("jobber_connections")
    .upsert(
      {
        user_id: userId,
        jobber_account_id: acct.account.id,
        jobber_account_name: acct.account.name,
      },
      { onConflict: "user_id,jobber_account_id" }
    )
    .select("id")
    .single();

  if (connErr || !conn?.id) {
    throw new Error(connErr?.message || "Failed to upsert connection");
  }

  const encAccess = await encryptText(token.access_token);
  const encRefresh = await encryptText(token.refresh_token);

  const { error: tokErr } = await supabaseAdmin.from("jobber_tokens").insert({
    connection_id: conn.id,
    access_token: encAccess,
    refresh_token: encRefresh,
    expires_at: expiresAt,
  });

  if (tokErr) throw new Error(tokErr.message);

  // Kick off sync
  return NextResponse.redirect(
    new URL(`/api/sync/run?connection_id=${conn.id}`, req.url)
  );
}
