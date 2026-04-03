// tests/integration/jobberCallback.test.ts
// Integration test scaffolds for the Jobber OAuth callback
// src/app/api/jobber/callback/route.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

// ──────────────────────────────────────────────
// Mock dependencies
// ──────────────────────────────────────────────

vi.mock("@/lib/crypto", () => ({
  encryptText: vi.fn(async (text: string) => `encrypted:${text}`),
  decryptText: vi.fn(async (token: string) => {
    if (token.startsWith("encrypted:")) return token.slice(10);
    if (token === "valid-state") return "decrypted-state";
    throw new Error("Invalid encrypted payload");
  }),
}));

vi.mock("@/lib/supabaseAdmin", () => {
  const mockFrom = vi.fn();
  return {
    supabaseAdmin: { from: mockFrom },
  };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

// NOTE: Actual import of the route would require more extensive mocking
// of @supabase/ssr createServerClient. This scaffold shows the test structure.

describe("Jobber OAuth Callback (GET /api/jobber/callback)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock global fetch for token exchange + GraphQL calls
    vi.stubGlobal("fetch", vi.fn());
  });

  describe("parameter validation", () => {
    it("redirects to /jobber?err=missing_code_state when code is missing", async () => {
      // const req = new Request("http://localhost/api/jobber/callback?state=valid-state");
      // const res = await GET(req);
      // expect(res.status).toBe(307);
      // expect(res.headers.get("Location")).toContain("err=missing_code_state");
    });

    it("redirects to /jobber?err=missing_code_state when state is missing", async () => {
      // const req = new Request("http://localhost/api/jobber/callback?code=abc");
      // const res = await GET(req);
      // expect(res.headers.get("Location")).toContain("err=missing_code_state");
    });
  });

  describe("state validation", () => {
    it("redirects to /jobber?err=oauth_failed when state decryption fails", async () => {
      // Invalid state token should trigger decryptText error
      // which is caught by the try/catch and redirects to err=oauth_failed
    });
  });

  describe("token exchange", () => {
    it("sends correct parameters to Jobber OAuth token endpoint", async () => {
      // Verify fetch is called with:
      //   - grant_type=authorization_code
      //   - client_id from env
      //   - client_secret from env
      //   - redirect_uri from env
      //   - code from query param
    });

    it("handles non-JSON response from token endpoint", async () => {
      // Token endpoint returns HTML error page
      // Should throw "Token exchange non-JSON response"
    });

    it("handles token exchange HTTP error", async () => {
      // Token endpoint returns 400 with JSON error body
    });

    it("handles missing access_token or refresh_token in response", async () => {
      // Token endpoint returns 200 but with empty tokens
    });
  });

  describe("expires_at computation", () => {
    it("uses expires_at from token response when available", async () => {
      // Token response includes expires_at: "2025-06-15T14:00:00Z"
    });

    it("computes from expires_in when expires_at is absent", async () => {
      // Token response includes expires_in: 3600
    });

    it("defaults to 1 hour when neither field is usable", async () => {
      // Neither expires_at nor expires_in present
    });
  });

  describe("new connection flow", () => {
    it("creates a new jobber_connections row with trial billing status", async () => {
      // Verify insert includes:
      //   - billing_status: "trialing"
      //   - trial_started_at
      //   - trial_ends_at (14 days in future)
      //   - jobber_account_id / jobber_account_name
    });

    it("sets 14-day trial period", async () => {
      // Verify trial_ends_at is exactly 14 days after now
    });

    it("redirects to /complete-signup with connection_id for new anonymous users", async () => {
      // No logged-in user, new connection -> complete-signup page
    });

    it("redirects to /jobber/dashboard for logged-in users", async () => {
      // Logged-in user + new connection -> dashboard
    });
  });

  describe("existing connection flow", () => {
    it("updates existing connection and saves new tokens", async () => {
      // Existing Jobber account reconnecting -> update tokens, reset last_sync_at
    });

    it("redirects to /login for existing connection with user_id (not logged in)", async () => {
      // Connection has user_id but current request has no session
    });

    it("redirects to /jobber/dashboard for existing connection with matching logged-in user", async () => {
      // Connection has user_id matching the logged-in user
    });

    it("links orphaned connection to logged-in user", async () => {
      // Existing connection has no user_id, user is logged in
      // Should update user_id on the connection
    });
  });

  describe("token storage", () => {
    it("encrypts both access_token and refresh_token before storage", async () => {
      // Verify encryptText is called for both tokens
    });

    it("deletes old tokens before inserting new ones", async () => {
      // Verify delete + insert pattern (not upsert) for jobber_tokens
    });
  });
});
