// Rate limiter. Uses Vercel KV (Upstash Redis) when KV env vars are set;
// falls back to an in-memory limiter for local dev.
//
// In production the in-memory path is NOT safe — each Vercel function
// instance has its own Map, so an attacker can hammer across instances
// without tripping limits. KV fixes that by keeping counters in one
// shared store across the fleet.

import { kv } from "@vercel/kv";

type LimitResult = { allowed: boolean; remaining: number; retryAfterMs: number };

// KV is configured when either of these are set (Vercel auto-injects both).
const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// ---------------- In-memory fallback (dev only) ----------------

type Entry = { count: number; resetAt: number };
const memStore = new Map<string, Entry>();
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memStore) {
    if (now > entry.resetAt) memStore.delete(key);
  }
}, 60_000);

function rateLimitMemory(
  key: string,
  maxAttempts: number,
  windowMs: number,
): LimitResult {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, retryAfterMs: 0 };
  }
  entry.count++;
  if (entry.count > maxAttempts) {
    return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
  }
  return { allowed: true, remaining: maxAttempts - entry.count, retryAfterMs: 0 };
}

// ---------------- KV-backed limiter (production) ----------------

async function rateLimitKV(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<LimitResult> {
  const redisKey = `rl:${key}`;
  // INCR creates the key at 1 on first hit and returns the new count.
  const count = (await kv.incr(redisKey)) as number;
  if (count === 1) {
    // First hit in this window — set TTL so the key auto-expires.
    await kv.pexpire(redisKey, windowMs);
  }
  if (count > maxAttempts) {
    const ttlMs = (await kv.pttl(redisKey)) as number;
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, ttlMs) };
  }
  return { allowed: true, remaining: maxAttempts - count, retryAfterMs: 0 };
}

// ---------------- Public API ----------------

export async function rateLimit(
  key: string,
  { maxAttempts = 5, windowMs = 15 * 60 * 1000 }: { maxAttempts?: number; windowMs?: number } = {},
): Promise<LimitResult> {
  if (hasKV) {
    try {
      return await rateLimitKV(key, maxAttempts, windowMs);
    } catch (err) {
      // KV unreachable — fall through to memory rather than blocking all traffic.
      console.error("Rate limiter KV error, falling back to memory:", err);
    }
  }
  return rateLimitMemory(key, maxAttempts, windowMs);
}

export function getClientIp(req: Request): string {
  const headers = req.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
