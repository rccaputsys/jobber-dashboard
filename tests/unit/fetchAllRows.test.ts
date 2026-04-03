// tests/unit/fetchAllRows.test.ts
// Unit tests for src/lib/supabaseAdmin.ts fetchAllRows
// We mock the supabaseAdmin client to test pagination logic.

import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to mock supabaseAdmin before importing fetchAllRows
vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn(() => mockClient),
  };
});

// Build a chainable mock that simulates Supabase PostgREST queries
let mockRangeResults: { data: any[]; error: any }[] = [];
let rangeCallIndex = 0;

const mockClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        range: vi.fn(() => {
          const result = mockRangeResults[rangeCallIndex] || { data: [], error: null };
          rangeCallIndex++;
          return Promise.resolve(result);
        }),
      })),
    })),
  })),
};

// Import after mock is set up
import { fetchAllRows } from "@/lib/supabaseAdmin";

beforeEach(() => {
  rangeCallIndex = 0;
  mockRangeResults = [];
  vi.clearAllMocks();
});

describe("fetchAllRows", () => {
  it("returns all rows from a single page (fewer than pageSize)", async () => {
    mockRangeResults = [
      { data: [{ id: 1 }, { id: 2 }, { id: 3 }], error: null },
    ];

    const result = await fetchAllRows("fact_jobs", "id", "conn-1", 100);
    expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it("paginates through multiple full pages", async () => {
    // Page size = 2 for testing
    const page1 = [{ id: 1 }, { id: 2 }];
    const page2 = [{ id: 3 }, { id: 4 }];
    const page3 = [{ id: 5 }]; // partial page = last page

    mockRangeResults = [
      { data: page1, error: null },
      { data: page2, error: null },
      { data: page3, error: null },
    ];

    const result = await fetchAllRows("fact_jobs", "id", "conn-1", 2);
    expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
  });

  it("returns empty array when no rows exist", async () => {
    mockRangeResults = [
      { data: [], error: null },
    ];

    const result = await fetchAllRows("fact_invoices", "id", "conn-1");
    expect(result).toEqual([]);
  });

  it("returns empty array when data is null", async () => {
    mockRangeResults = [
      { data: null as any, error: null },
    ];

    const result = await fetchAllRows("fact_invoices", "id", "conn-1");
    expect(result).toEqual([]);
  });

  it("throws on Supabase error", async () => {
    mockRangeResults = [
      { data: null as any, error: { message: "relation does not exist" } },
    ];

    await expect(
      fetchAllRows("nonexistent_table", "id", "conn-1")
    ).rejects.toEqual({ message: "relation does not exist" });
  });

  it("stops paginating when a page returns exactly 0 rows", async () => {
    mockRangeResults = [
      { data: [{ id: 1 }], error: null },
      { data: [], error: null },
    ];

    const result = await fetchAllRows("fact_jobs", "id", "conn-1", 1);
    expect(result).toEqual([{ id: 1 }]);
  });
});
