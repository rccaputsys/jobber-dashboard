// tests/unit/syncHelpers.test.ts
// Unit tests for pure functions inside the sync route
// These functions are not exported, so we re-implement them here
// for testing, or alternatively extract them into a shared module.
//
// For now we test them as standalone copies — if you refactor these
// into src/lib/syncHelpers.ts, update the imports.

import { describe, it, expect } from "vitest";

// ──────────────────────────────────────────────
// dollarsToCents — copied from sync/run/route.ts
// ──────────────────────────────────────────────
function dollarsToCents(n: number | null | undefined): number {
  if (n === null || n === undefined) return 0;
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

describe("dollarsToCents", () => {
  it("converts a dollar amount to cents", () => {
    expect(dollarsToCents(10)).toBe(1000);
    expect(dollarsToCents(99.99)).toBe(9999);
  });

  it("returns 0 for null and undefined", () => {
    expect(dollarsToCents(null)).toBe(0);
    expect(dollarsToCents(undefined)).toBe(0);
  });

  it("returns 0 for NaN", () => {
    expect(dollarsToCents(NaN)).toBe(0);
  });

  it("handles floating point edge cases via rounding", () => {
    // 19.99 * 100 = 1998.9999999... in IEEE 754
    expect(dollarsToCents(19.99)).toBe(1999);
  });

  it("handles zero", () => {
    expect(dollarsToCents(0)).toBe(0);
  });

  it("handles negative amounts", () => {
    expect(dollarsToCents(-50.5)).toBe(-5050);
  });
});

// ──────────────────────────────────────────────
// isWithinTwelveMonths — copied from sync/run/route.ts
// ──────────────────────────────────────────────
function isWithinTwelveMonths(dateStr: string | null | undefined, cutoffMs: number): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  return date.getTime() >= cutoffMs;
}

describe("isWithinTwelveMonths", () => {
  const cutoff = new Date("2024-06-01T00:00:00Z").getTime();

  it("returns true for dates after cutoff", () => {
    expect(isWithinTwelveMonths("2024-12-01T00:00:00Z", cutoff)).toBe(true);
  });

  it("returns true for dates exactly at cutoff", () => {
    expect(isWithinTwelveMonths("2024-06-01T00:00:00Z", cutoff)).toBe(true);
  });

  it("returns false for dates before cutoff", () => {
    expect(isWithinTwelveMonths("2024-05-31T23:59:59Z", cutoff)).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isWithinTwelveMonths(null, cutoff)).toBe(false);
    expect(isWithinTwelveMonths(undefined, cutoff)).toBe(false);
  });

  it("returns false for invalid date strings", () => {
    expect(isWithinTwelveMonths("not-a-date", cutoff)).toBe(false);
  });
});

// ──────────────────────────────────────────────
// statusLooksWon — copied from sync/run/route.ts
// ──────────────────────────────────────────────
function statusLooksWon(status: string) {
  const s = status.toUpperCase();
  return s.includes("APPROV") || s.includes("ACCEPT") || s.includes("WON") || s.includes("CONVERT") || s.includes("BOOK");
}

describe("statusLooksWon (sync version)", () => {
  it("identifies won-like statuses", () => {
    expect(statusLooksWon("approved")).toBe(true);
    expect(statusLooksWon("ACCEPTED")).toBe(true);
    expect(statusLooksWon("converted_to_job")).toBe(true);
    expect(statusLooksWon("booked")).toBe(true);
  });

  it("identifies non-won statuses", () => {
    expect(statusLooksWon("sent")).toBe(false);
    expect(statusLooksWon("pending")).toBe(false);
    expect(statusLooksWon("awaiting_response")).toBe(false);
  });
});

// ──────────────────────────────────────────────
// Quote leak logic — integration-style unit test
// ──────────────────────────────────────────────
describe("quote leak calculation logic", () => {
  function isLeaking(q: { sent_at: string | null; quote_status: string }) {
    if (!q.sent_at) return false;
    const st = (q.quote_status || "").toLowerCase().trim();
    if (!st) return true; // sent but no status = leaking
    if (st === "archived" || st === "draft") return false;
    return !statusLooksWon(st);
  }

  it("sent + awaiting_response = leaking", () => {
    expect(isLeaking({ sent_at: "2025-01-01", quote_status: "awaiting_response" })).toBe(true);
  });

  it("sent + approved = NOT leaking", () => {
    expect(isLeaking({ sent_at: "2025-01-01", quote_status: "approved" })).toBe(false);
  });

  it("not sent = NOT leaking (even if status is bad)", () => {
    expect(isLeaking({ sent_at: null, quote_status: "awaiting_response" })).toBe(false);
  });

  it("sent + empty status = leaking", () => {
    expect(isLeaking({ sent_at: "2025-01-01", quote_status: "" })).toBe(true);
  });

  it("sent + archived = NOT leaking", () => {
    expect(isLeaking({ sent_at: "2025-01-01", quote_status: "archived" })).toBe(false);
  });

  it("sent + draft = NOT leaking", () => {
    expect(isLeaking({ sent_at: "2025-01-01", quote_status: "draft" })).toBe(false);
  });
});
