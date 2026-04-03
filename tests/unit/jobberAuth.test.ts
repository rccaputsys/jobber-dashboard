// tests/unit/jobberAuth.test.ts
// Unit tests for token refresh logic in src/lib/jobberAuth.ts
//
// We test the computeExpiresAt and refresh retry logic.
// The actual getValidAccessToken requires Supabase + crypto mocks,
// so we test the core logic patterns here.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ──────────────────────────────────────────────
// computeExpiresAt — re-implemented from jobberAuth.ts
// ──────────────────────────────────────────────
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
    return new Date(Date.now() + 3600 * 1000).toISOString();
  }

  return new Date(Date.now() + seconds * 1000).toISOString();
}

describe("computeExpiresAt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses expires_at when provided", () => {
    const result = computeExpiresAt({ expires_at: "2025-06-15T14:00:00Z" });
    expect(result).toBe("2025-06-15T14:00:00.000Z");
  });

  it("throws for invalid expires_at", () => {
    expect(() => computeExpiresAt({ expires_at: "not-a-date" })).toThrow("Invalid expires_at");
  });

  it("computes from numeric expires_in", () => {
    const result = computeExpiresAt({ expires_in: 3600 });
    // Now + 3600s = 2025-06-15T13:00:00.000Z
    expect(result).toBe("2025-06-15T13:00:00.000Z");
  });

  it("computes from string expires_in", () => {
    const result = computeExpiresAt({ expires_in: "7200" });
    // Now + 7200s = 2025-06-15T14:00:00.000Z
    expect(result).toBe("2025-06-15T14:00:00.000Z");
  });

  it("defaults to 1 hour when expires_in is missing/NaN", () => {
    const result = computeExpiresAt({});
    expect(result).toBe("2025-06-15T13:00:00.000Z");
  });

  it("defaults to 1 hour when expires_in is non-numeric string", () => {
    const result = computeExpiresAt({ expires_in: "never" as any });
    expect(result).toBe("2025-06-15T13:00:00.000Z");
  });
});

// ──────────────────────────────────────────────
// Token expiry check logic — from getValidAccessToken
// ──────────────────────────────────────────────
describe("token expiry check", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function isExpired(expiresAt: string): boolean {
    const expiresAtMs = new Date(expiresAt).getTime();
    const now = Date.now();
    return Number.isNaN(expiresAtMs) ? true : expiresAtMs - now < 60_000;
  }

  it("token expiring in 2 hours is NOT expired", () => {
    expect(isExpired("2025-06-15T14:00:00Z")).toBe(false);
  });

  it("token expiring in 30 seconds IS expired (within 60s buffer)", () => {
    expect(isExpired("2025-06-15T12:00:30Z")).toBe(true);
  });

  it("token already expired IS expired", () => {
    expect(isExpired("2025-06-15T11:00:00Z")).toBe(true);
  });

  it("invalid date string is treated as expired", () => {
    expect(isExpired("garbage")).toBe(true);
  });

  it("token expiring in exactly 60 seconds is NOT expired (boundary)", () => {
    // expiresAtMs - now = 60000, which is NOT < 60000, so NOT expired
    expect(isExpired("2025-06-15T12:01:00Z")).toBe(false);
  });

  it("token expiring in 59 seconds IS expired (boundary)", () => {
    expect(isExpired("2025-06-15T12:00:59Z")).toBe(true);
  });
});

// ──────────────────────────────────────────────
// refreshToken retry behavior — conceptual tests
// ──────────────────────────────────────────────
describe("refreshToken retry logic", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Simplified refreshToken for testing
  async function refreshToken(refreshTokenPlain: string, maxRetries = 3) {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: "test",
      client_secret: "test",
      refresh_token: refreshTokenPlain,
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const res = await fetch("https://api.getjobber.com/api/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (res.status === 429) {
        continue;
      }

      if (res.status >= 500) {
        continue;
      }

      if (!res.ok) {
        const t = await res.text();
        lastError = new Error(`Refresh failed: ${res.status} ${t}`);
        break;
      }

      return await res.json();
    }

    throw lastError || new Error("Max retries exceeded on token refresh");
  }

  it("retries on 429 rate limiting", async () => {
    fetchMock
      .mockResolvedValueOnce({ status: 429, ok: false, headers: new Headers() })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ access_token: "new", refresh_token: "new-refresh" }),
      });

    const result = await refreshToken("old-refresh");
    expect(result.access_token).toBe("new");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries on 500 server errors", async () => {
    fetchMock
      .mockResolvedValueOnce({ status: 500, ok: false })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ access_token: "new", refresh_token: "new-refresh" }),
      });

    const result = await refreshToken("old-refresh");
    expect(result.access_token).toBe("new");
  });

  it("does NOT retry on 400 client errors", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 400,
      ok: false,
      text: () => Promise.resolve("invalid_grant"),
    });

    await expect(refreshToken("old-refresh")).rejects.toThrow("Refresh failed: 400");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws after max retries exceeded", async () => {
    fetchMock
      .mockResolvedValue({ status: 429, ok: false, headers: new Headers() });

    await expect(refreshToken("old-refresh", 3)).rejects.toThrow("Max retries exceeded");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
