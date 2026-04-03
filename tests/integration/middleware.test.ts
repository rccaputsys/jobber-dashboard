// tests/integration/middleware.test.ts
// Integration test scaffolds for src/middleware.ts
// Tests auth middleware routing: protected routes, auth page redirects

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @supabase/ssr
const mockGetSession = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
    },
  })),
}));

// NOTE: Testing Next.js middleware requires simulating NextRequest/NextResponse.
// In a full setup, use @edge-runtime/jest or next/server test utilities.
// This scaffold shows the test structure.

describe("Auth Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("protected routes (no session)", () => {
    it("redirects /jobber/dashboard to /login when not authenticated", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      // const req = createMockNextRequest("/jobber/dashboard");
      // const res = await middleware(req);
      // expect(res.status).toBe(307);
      // const location = new URL(res.headers.get("Location")!);
      // expect(location.pathname).toBe("/login");
      // expect(location.searchParams.get("redirect")).toBe("/jobber/dashboard");
    });

    it("redirects /jobber/sales to /login when not authenticated", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      // Same pattern as above for /jobber/sales
    });

    it("preserves the original path in ?redirect param", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      // Verify redirect=/jobber/dashboard/some/subpath
    });

    it("redirects nested protected paths like /jobber/dashboard/settings", async () => {
      // Middleware uses .startsWith() so /jobber/dashboard/anything should be protected
    });
  });

  describe("protected routes (with session)", () => {
    it("allows access to /jobber/dashboard when authenticated", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
      });
      // const res = await middleware(req);
      // expect(res.status).not.toBe(307); // should pass through
    });

    it("allows access to /jobber/sales when authenticated", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
      });
    });
  });

  describe("auth pages (with session)", () => {
    it("redirects /login to /jobber/dashboard when already authenticated", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
      });
      // const req = createMockNextRequest("/login");
      // const res = await middleware(req);
      // expect(new URL(res.headers.get("Location")!).pathname).toBe("/jobber/dashboard");
    });

    it("redirects /signup to /jobber/dashboard when already authenticated", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
      });
    });
  });

  describe("auth pages (no session)", () => {
    it("allows access to /login when not authenticated", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      // Should pass through without redirect
    });

    it("allows access to /signup when not authenticated", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
    });
  });

  describe("unprotected routes", () => {
    it("does not intercept /api/* routes", async () => {
      // Middleware matcher doesn't include /api/*, so it should not run
      // This is tested by the config.matcher pattern, not by the function itself
    });

    it("does not intercept / (homepage)", async () => {
      // Not in matcher
    });

    it("does not intercept /jobber/capacity (not in protectedPaths)", async () => {
      // NOTE: /jobber/capacity is NOT in the protectedPaths array nor in the matcher.
      // This may be intentional (public page) or a gap (should be protected).
      // RECOMMENDATION: Add /jobber/capacity and /jobber/invoices to protectedPaths.
    });
  });

  describe("cookie handling", () => {
    it("forwards cookies from request to Supabase client", async () => {
      // Verify createServerClient receives cookie getter/setter
    });

    it("sets cookies from Supabase response on the Next response", async () => {
      // Verify session refresh tokens are forwarded
    });
  });
});
