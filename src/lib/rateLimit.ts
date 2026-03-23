// Simple in-memory rate limiter (per-process; resets on deploy)
// For production scale, replace with Redis-backed limiter

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

export function rateLimit(
  key: string,
  { maxAttempts = 5, windowMs = 15 * 60 * 1000 } = {}
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, retryAfterMs: 0 };
  }

  entry.count++;

  if (entry.count > maxAttempts) {
    return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
  }

  return { allowed: true, remaining: maxAttempts - entry.count, retryAfterMs: 0 };
}

export function getClientIp(req: Request): string {
  const headers = req.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
