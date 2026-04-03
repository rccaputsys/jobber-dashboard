// tests/integration/capacitySettings.test.ts
// Integration test scaffolds for src/app/api/settings/capacity/route.ts
// Tests GET (read capacity targets) and POST (save capacity targets)

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getUser
const mockGetUser = vi.fn();
vi.mock("@/lib/supabaseAuth", () => ({
  getUser: () => mockGetUser(),
}));

// Mock supabaseAdmin
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
      update: vi.fn((data: any) => {
        mockUpdate(data);
        return {
          eq: vi.fn(() => Promise.resolve({ error: null })),
        };
      }),
    })),
  },
}));

// NOTE: Import route handlers after mocks are set up.
// import { GET, POST } from "@/app/api/settings/capacity/route";

describe("Capacity Settings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/settings/capacity", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue(null);
      // const res = await GET();
      // expect(res.status).toBe(401);
    });

    it("returns current weekly and monthly capacity for authenticated user", async () => {
      mockGetUser.mockResolvedValue({ id: "user-1", email: "test@example.com" });
      mockMaybeSingle.mockResolvedValue({
        data: { weekly_capacity_cents: 500000, monthly_capacity_cents: 2000000 },
        error: null,
      });

      // const res = await GET();
      // const body = await res.json();
      // expect(body.ok).toBe(true);
      // expect(body.weekly_capacity_cents).toBe(500000);
    });

    it("returns null values when no capacity is set yet", async () => {
      mockGetUser.mockResolvedValue({ id: "user-1", email: "test@example.com" });
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      // const res = await GET();
      // const body = await res.json();
      // expect(body.weekly_capacity_cents).toBeNull();
      // expect(body.monthly_capacity_cents).toBeNull();
    });

    it("handles missing monthly_capacity_cents column gracefully", async () => {
      // The route has a try/catch around the monthly query
      // to handle the case where the column doesn't exist yet
    });
  });

  describe("POST /api/settings/capacity", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue(null);
      // const req = new Request("http://localhost/api/settings/capacity", {
      //   method: "POST",
      //   body: JSON.stringify({ weekly_capacity_cents: 500000 }),
      // });
      // const res = await POST(req);
      // expect(res.status).toBe(401);
    });

    it("saves weekly_capacity_cents for authenticated user", async () => {
      mockGetUser.mockResolvedValue({ id: "user-1", email: "test@example.com" });
      // const req = new Request("http://localhost/api/settings/capacity", {
      //   method: "POST",
      //   body: JSON.stringify({ weekly_capacity_cents: 750000 }),
      // });
      // const res = await POST(req);
      // const body = await res.json();
      // expect(body.ok).toBe(true);
      // expect(body.weekly_capacity_cents).toBe(750000);
      // expect(mockUpdate).toHaveBeenCalledWith({ weekly_capacity_cents: 750000 });
    });

    it("saves monthly_capacity_cents", async () => {
      mockGetUser.mockResolvedValue({ id: "user-1", email: "test@example.com" });
      // POST with { monthly_capacity_cents: 3000000 }
    });

    it("saves both weekly and monthly in one request", async () => {
      mockGetUser.mockResolvedValue({ id: "user-1", email: "test@example.com" });
      // POST with both fields
    });

    it("rounds non-integer cents values", async () => {
      mockGetUser.mockResolvedValue({ id: "user-1", email: "test@example.com" });
      // POST with weekly_capacity_cents: 750000.7 -> should round to 750001
    });

    it("sets null when value is not a number", async () => {
      mockGetUser.mockResolvedValue({ id: "user-1", email: "test@example.com" });
      // POST with weekly_capacity_cents: "not a number" -> null
    });

    it("returns 400 when no fields are provided", async () => {
      mockGetUser.mockResolvedValue({ id: "user-1", email: "test@example.com" });
      // POST with {} -> "No fields to update"
    });

    it("allows admin to set capacity for a specific connection", async () => {
      mockGetUser.mockResolvedValue({ id: "admin-1", email: "rcaputo91@gmail.com" });
      // POST with { connection_id: "conn-123", weekly_capacity_cents: 500000 }
      // Should use .eq("id", "conn-123") instead of .eq("user_id", ...)
    });

    it("ignores connection_id from non-admin users", async () => {
      mockGetUser.mockResolvedValue({ id: "user-1", email: "user@example.com" });
      // POST with { connection_id: "conn-123", weekly_capacity_cents: 500000 }
      // Should use .eq("user_id", "user-1") — not .eq("id", "conn-123")
    });
  });
});
