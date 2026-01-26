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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function refreshToken(refreshTokenPlain: string, maxRetries: number = 3) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.JOBBER_CLIENT_ID!,
    client_secret: process.env.JOBBER_CLIENT_SECRET!,
    refresh_token: refreshTokenPlain,
  });

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(process.env.JOBBER_OAUTH_TOKEN_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    // Handle rate limiting
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : attempt * 2000;
      console.warn(`Rate limited on token refresh. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
      await delay(waitTime);
      continue;
    }

    // Handle server errors with retry
    if (res.status >= 500) {
      const waitTime = attempt * 1000;
      console.warn(`Server error ${res.status} on token refresh. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
      await delay(waitTime);
      continue;
    }

    if (!res.ok) {
      const t = await res.text();
      lastError = new Error(`Refresh failed: ${res.status} ${t}`);
      break; // Don't retry on 4xx errors (except 429)
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

  throw lastError || new Error("Max retries exceeded on token refresh");
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

  const { error: insErr } = await supabaseAdmin.from("jobber_tokens").insert({
    connection_id: connectionId,
    access_token: encAccess,
    refresh_token: encRefresh,
    expires_at: newExpiresAt,
  });

  if (insErr) throw new Error(insErr.message);

  return refreshed.access_token!;
}
