// src/lib/jobberAuth.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decryptText, encryptText } from "@/lib/crypto";

type TokenRow = {
  id: string;
  connection_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

async function refreshToken(refreshTokenPlain: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.JOBBER_CLIENT_ID!,
    client_secret: process.env.JOBBER_CLIENT_SECRET!,
    refresh_token: refreshTokenPlain,
  });

  const res = await fetch(process.env.JOBBER_OAUTH_TOKEN_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Refresh failed: ${res.status} ${t}`);
  }

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number | string;
    expires_at?: string;
    token_type?: string;
  };

  if (!json.access_token || !json.refresh_token) {
    throw new Error(`Refresh response missing tokens. keys=${Object.keys(json).join(",")}`);
  }

  return json;
}

function computeExpiresAt(token: { expires_at?: string; expires_in?: number | string }) {
  if (token.expires_at) {
    const d = new Date(token.expires_at);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid expires_at from Jobber");
    return d.toISOString();
  }

  const raw = token.expires_in;
  const seconds =
    typeof raw === "string" ? Number(raw) :
    typeof raw === "number" ? raw :
    NaN;

  if (!Number.isFinite(seconds)) {
    // fallback: 1 hour
    return new Date(Date.now() + 3600 * 1000).toISOString();
  }

  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function getValidAccessToken(connectionId: string): Promise<string> {
  // IMPORTANT: tokens table can have multiple rows per connection_id (history)
  // So: fetch the most recent by expires_at descending.
  const { data, error } = await supabaseAdmin
    .from("jobber_tokens")
    .select("id,connection_id,access_token,refresh_token,expires_at")
    .eq("connection_id", connectionId)
    .order("expires_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("No tokens found");

  const row = data[0] as TokenRow;

  const expiresAtMs = new Date(row.expires_at).getTime();
  const now = Date.now();

  // If invalid date somehow, force refresh
  const isExpired = Number.isNaN(expiresAtMs) ? true : expiresAtMs - now < 60_000;

  if (!isExpired) {
    return decryptText(row.access_token);
  }

  const refreshPlain = await decryptText(row.refresh_token);
  const refreshed = await refreshToken(refreshPlain);

  const newExpiresAt = computeExpiresAt({
    expires_at: refreshed.expires_at,
    expires_in: refreshed.expires_in,
  });

  const encAccess = await encryptText(refreshed.access_token!);
  const encRefresh = await encryptText(refreshed.refresh_token!);

  // Insert a new row (keep history)
  const { error: insErr } = await supabaseAdmin.from("jobber_tokens").insert({
    connection_id: connectionId,
    access_token: encAccess,
    refresh_token: encRefresh,
    expires_at: newExpiresAt,
  });

  if (insErr) throw new Error(insErr.message);

  return refreshed.access_token!;
}
