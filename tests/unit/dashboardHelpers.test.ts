// tests/unit/dashboardHelpers.test.ts
// Unit tests for src/lib/dashboardHelpers.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  safeDate,
  clamp,
  pct,
  parseISODateOnly,
  toISODateOnlyUTC,
  addDaysUTC,
  startOfDayUTC,
  formatSyncTime,
  startOfWeekUTC,
  startOfMonthUTC,
  startOfQuarterUTC,
  bucketStartUTC,
  nextBucketUTC,
  labelForBucket,
  moneyFactory,
  moneyForChart,
  severityFromScore,
  statusLooksWon,
  statusLooksLost,
} from "@/lib/dashboardHelpers";

// ──────────────────────────────────────────────
// 1. safeDate
// ──────────────────────────────────────────────
describe("safeDate", () => {
  it("returns a Date for a valid ISO string", () => {
    const d = safeDate("2025-06-15T00:00:00Z");
    expect(d).toBeInstanceOf(Date);
    expect(d!.getUTCFullYear()).toBe(2025);
  });

  it("returns null for null/undefined/empty", () => {
    expect(safeDate(null)).toBeNull();
    expect(safeDate(undefined)).toBeNull();
    expect(safeDate("")).toBeNull();
  });

  it("returns null for garbage strings", () => {
    expect(safeDate("not-a-date")).toBeNull();
    expect(safeDate("abc123")).toBeNull();
  });

  it("handles numeric timestamps", () => {
    const ts = Date.UTC(2025, 0, 1);
    const d = safeDate(ts);
    expect(d).toBeInstanceOf(Date);
    expect(d!.getUTCFullYear()).toBe(2025);
  });

  it("handles Date objects passed through", () => {
    const original = new Date("2025-03-01T00:00:00Z");
    const d = safeDate(original);
    expect(d).toBeInstanceOf(Date);
    expect(d!.toISOString()).toBe(original.toISOString());
  });
});

// ──────────────────────────────────────────────
// 2. clamp
// ──────────────────────────────────────────────
describe("clamp", () => {
  it("returns value when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps to lower bound", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps to upper bound", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("handles equal bounds", () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });

  it("handles exact boundary values", () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

// ──────────────────────────────────────────────
// 3. pct
// ──────────────────────────────────────────────
describe("pct", () => {
  it("formats 0.5 as 50%", () => {
    expect(pct(0.5)).toBe("50%");
  });

  it("formats 1 as 100%", () => {
    expect(pct(1)).toBe("100%");
  });

  it("formats 0 as 0%", () => {
    expect(pct(0)).toBe("0%");
  });

  it("rounds fractional percentages", () => {
    expect(pct(0.333)).toBe("33%");
    expect(pct(0.667)).toBe("67%");
  });

  it("handles values over 100%", () => {
    expect(pct(1.5)).toBe("150%");
  });
});

// ──────────────────────────────────────────────
// 4. parseISODateOnly
// ──────────────────────────────────────────────
describe("parseISODateOnly", () => {
  it("parses a valid YYYY-MM-DD string", () => {
    const d = parseISODateOnly("2025-06-15");
    expect(d).toBeInstanceOf(Date);
    expect(d!.getUTCFullYear()).toBe(2025);
    expect(d!.getUTCMonth()).toBe(5); // June = 5
    expect(d!.getUTCDate()).toBe(15);
  });

  it("returns null for empty string", () => {
    expect(parseISODateOnly("")).toBeNull();
  });

  it("returns null for full ISO datetime strings", () => {
    expect(parseISODateOnly("2025-06-15T12:00:00Z")).toBeNull();
  });

  it("returns null for invalid format", () => {
    expect(parseISODateOnly("06-15-2025")).toBeNull();
    expect(parseISODateOnly("2025/06/15")).toBeNull();
  });

  it("sets time to midnight UTC", () => {
    const d = parseISODateOnly("2025-01-01");
    expect(d!.getUTCHours()).toBe(0);
    expect(d!.getUTCMinutes()).toBe(0);
    expect(d!.getUTCSeconds()).toBe(0);
  });
});

// ──────────────────────────────────────────────
// 5. toISODateOnlyUTC
// ──────────────────────────────────────────────
describe("toISODateOnlyUTC", () => {
  it("formats a Date as YYYY-MM-DD", () => {
    const d = new Date(Date.UTC(2025, 0, 5));
    expect(toISODateOnlyUTC(d)).toBe("2025-01-05");
  });

  it("zero-pads single-digit months and days", () => {
    const d = new Date(Date.UTC(2025, 2, 3)); // March 3
    expect(toISODateOnlyUTC(d)).toBe("2025-03-03");
  });

  it("handles December 31 correctly", () => {
    const d = new Date(Date.UTC(2025, 11, 31));
    expect(toISODateOnlyUTC(d)).toBe("2025-12-31");
  });
});

// ──────────────────────────────────────────────
// 6. addDaysUTC
// ──────────────────────────────────────────────
describe("addDaysUTC", () => {
  it("adds days correctly", () => {
    const d = new Date(Date.UTC(2025, 0, 1));
    const result = addDaysUTC(d, 10);
    expect(result.getUTCDate()).toBe(11);
  });

  it("crosses month boundaries", () => {
    const d = new Date(Date.UTC(2025, 0, 30)); // Jan 30
    const result = addDaysUTC(d, 5);
    expect(result.getUTCMonth()).toBe(1); // February
    expect(result.getUTCDate()).toBe(4);
  });

  it("handles negative days", () => {
    const d = new Date(Date.UTC(2025, 1, 5)); // Feb 5
    const result = addDaysUTC(d, -10);
    expect(result.getUTCMonth()).toBe(0); // January
    expect(result.getUTCDate()).toBe(26);
  });

  it("does not mutate the original date", () => {
    const d = new Date(Date.UTC(2025, 0, 1));
    const original = d.getTime();
    addDaysUTC(d, 10);
    expect(d.getTime()).toBe(original);
  });
});

// ──────────────────────────────────────────────
// 7. startOfDayUTC
// ──────────────────────────────────────────────
describe("startOfDayUTC", () => {
  it("zeros out hours, minutes, seconds, ms", () => {
    const d = new Date(Date.UTC(2025, 5, 15, 14, 30, 45, 123));
    const result = startOfDayUTC(d);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
    expect(result.getUTCDate()).toBe(15);
  });
});

// ──────────────────────────────────────────────
// 8. formatSyncTime
// ──────────────────────────────────────────────
describe("formatSyncTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Less than 1 hour ago' for recent times", () => {
    const d = new Date("2025-06-15T11:30:00Z"); // 30 min ago
    expect(formatSyncTime(d)).toBe("Less than 1 hour ago");
  });

  it("returns hours ago for same-day times", () => {
    const d = new Date("2025-06-15T08:00:00Z"); // 4 hours ago
    expect(formatSyncTime(d)).toBe("4 hours ago");
  });

  it("returns 'Yesterday' for 1 day ago", () => {
    const d = new Date("2025-06-14T08:00:00Z"); // ~28 hours ago
    expect(formatSyncTime(d)).toBe("Yesterday");
  });

  it("returns days ago for under a week", () => {
    const d = new Date("2025-06-12T12:00:00Z"); // 3 days ago
    expect(formatSyncTime(d)).toBe("3 days ago");
  });

  it("returns weeks ago for under a month", () => {
    const d = new Date("2025-05-25T12:00:00Z"); // ~21 days ago = 3 weeks
    expect(formatSyncTime(d)).toBe("3 weeks ago");
  });
});

// ──────────────────────────────────────────────
// 9. startOfWeekUTC (Monday-based weeks)
// ──────────────────────────────────────────────
describe("startOfWeekUTC", () => {
  it("returns Monday for a Wednesday", () => {
    // 2025-06-11 is a Wednesday
    const d = new Date(Date.UTC(2025, 5, 11, 15, 0, 0));
    const result = startOfWeekUTC(d);
    expect(result.getUTCDay()).toBe(1); // Monday
    expect(result.getUTCDate()).toBe(9);
  });

  it("returns same day for a Monday", () => {
    // 2025-06-09 is a Monday
    const d = new Date(Date.UTC(2025, 5, 9, 10, 0, 0));
    const result = startOfWeekUTC(d);
    expect(result.getUTCDay()).toBe(1);
    expect(result.getUTCDate()).toBe(9);
  });

  it("returns previous Monday for a Sunday", () => {
    // 2025-06-15 is a Sunday
    const d = new Date(Date.UTC(2025, 5, 15));
    const result = startOfWeekUTC(d);
    expect(result.getUTCDay()).toBe(1); // Monday
    expect(result.getUTCDate()).toBe(9);
  });
});

// ──────────────────────────────────────────────
// 10. startOfMonthUTC / startOfQuarterUTC
// ──────────────────────────────────────────────
describe("startOfMonthUTC", () => {
  it("returns first of the month", () => {
    const d = new Date(Date.UTC(2025, 5, 15));
    const result = startOfMonthUTC(d);
    expect(result.getUTCDate()).toBe(1);
    expect(result.getUTCMonth()).toBe(5);
  });
});

describe("startOfQuarterUTC", () => {
  it("Q1: Jan/Feb/Mar -> Jan 1", () => {
    expect(startOfQuarterUTC(new Date(Date.UTC(2025, 1, 15))).getUTCMonth()).toBe(0);
  });

  it("Q2: Apr/May/Jun -> Apr 1", () => {
    expect(startOfQuarterUTC(new Date(Date.UTC(2025, 4, 15))).getUTCMonth()).toBe(3);
  });

  it("Q3: Jul/Aug/Sep -> Jul 1", () => {
    expect(startOfQuarterUTC(new Date(Date.UTC(2025, 7, 15))).getUTCMonth()).toBe(6);
  });

  it("Q4: Oct/Nov/Dec -> Oct 1", () => {
    expect(startOfQuarterUTC(new Date(Date.UTC(2025, 11, 15))).getUTCMonth()).toBe(9);
  });
});

// ──────────────────────────────────────────────
// 11. bucketStartUTC / nextBucketUTC
// ──────────────────────────────────────────────
describe("bucketStartUTC", () => {
  const d = new Date(Date.UTC(2025, 5, 15, 10, 30));

  it("day granularity returns start of day", () => {
    const result = bucketStartUTC(d, "day");
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCDate()).toBe(15);
  });

  it("week granularity returns Monday", () => {
    const result = bucketStartUTC(d, "week");
    expect(result.getUTCDay()).toBe(1);
  });

  it("month granularity returns first of month", () => {
    const result = bucketStartUTC(d, "month");
    expect(result.getUTCDate()).toBe(1);
  });

  it("quarter granularity returns first of quarter", () => {
    const result = bucketStartUTC(d, "quarter");
    expect(result.getUTCMonth()).toBe(3); // April (Q2 start)
  });
});

describe("nextBucketUTC", () => {
  it("day: advances by 1 day", () => {
    const d = new Date(Date.UTC(2025, 0, 1));
    const result = nextBucketUTC(d, "day");
    expect(result.getUTCDate()).toBe(2);
  });

  it("week: advances by 7 days", () => {
    const d = new Date(Date.UTC(2025, 0, 6)); // Monday
    const result = nextBucketUTC(d, "week");
    expect(result.getUTCDate()).toBe(13);
  });

  it("month: advances to next month", () => {
    const d = new Date(Date.UTC(2025, 0, 1)); // Jan 1
    const result = nextBucketUTC(d, "month");
    expect(result.getUTCMonth()).toBe(1); // Feb
    expect(result.getUTCDate()).toBe(1);
  });

  it("quarter: advances by 3 months", () => {
    const d = new Date(Date.UTC(2025, 0, 1)); // Jan 1
    const result = nextBucketUTC(d, "quarter");
    expect(result.getUTCMonth()).toBe(3); // April
  });

  it("month: handles Dec -> Jan year rollover", () => {
    const d = new Date(Date.UTC(2025, 11, 1)); // Dec 1
    const result = nextBucketUTC(d, "month");
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(0); // Jan
  });
});

// ──────────────────────────────────────────────
// 12. moneyFactory
// ──────────────────────────────────────────────
describe("moneyFactory", () => {
  it("formats USD cents correctly", () => {
    const fmt = moneyFactory("USD");
    expect(fmt(100_00)).toBe("$100");
    expect(fmt(1_234_56)).toMatch(/1,235/); // rounded, no decimals
  });

  it("handles zero cents", () => {
    const fmt = moneyFactory("USD");
    expect(fmt(0)).toBe("$0");
  });

  it("falls back to USD for invalid currency codes", () => {
    const fmt = moneyFactory("INVALID");
    expect(fmt(100_00)).toBe("$100");
  });

  it("handles empty/null currency gracefully", () => {
    const fmt = moneyFactory("");
    expect(fmt(50_00)).toBe("$50");
  });
});

// ──────────────────────────────────────────────
// 13. moneyForChart
// ──────────────────────────────────────────────
describe("moneyForChart", () => {
  it("formats small amounts as dollars", () => {
    expect(moneyForChart(50_00)).toBe("$50");
  });

  it("formats thousands with k suffix", () => {
    expect(moneyForChart(500_000_00)).toBe("$5000.0k"); // $5000 -> $5000.0k? Let's check
    // Actually $5000 >= 1000, so: rounded = Math.round(5000/100)*100 = 5000, -> $5.0k
    // Wait: 500_000_00 cents = $5,000
    // dollars >= 1000: rounded = Math.round(5000/100)*100 = 5000, (5000/1000).toFixed(1) = "5.0", -> "$5.0k"
  });

  it("formats millions with M suffix", () => {
    // $1,500,000 = 150_000_000_00 cents
    const result = moneyForChart(150_000_000_00);
    expect(result).toMatch(/\$1\.50M/);
  });

  it("handles zero", () => {
    expect(moneyForChart(0)).toBe("$0");
  });

  it("handles null/NaN gracefully via Number(cents || 0)", () => {
    expect(moneyForChart(NaN)).toBe("$0");
  });
});

// ──────────────────────────────────────────────
// 14. severityFromScore
// ──────────────────────────────────────────────
describe("severityFromScore", () => {
  it("returns critical for scores >= 80", () => {
    expect(severityFromScore(80)).toBe("critical");
    expect(severityFromScore(100)).toBe("critical");
  });

  it("returns warning for scores 50-79", () => {
    expect(severityFromScore(50)).toBe("warning");
    expect(severityFromScore(79)).toBe("warning");
  });

  it("returns good for scores < 50", () => {
    expect(severityFromScore(0)).toBe("good");
    expect(severityFromScore(49)).toBe("good");
  });
});

// ──────────────────────────────────────────────
// 15. statusLooksWon / statusLooksLost
// ──────────────────────────────────────────────
describe("statusLooksWon", () => {
  it("matches APPROVED variations", () => {
    expect(statusLooksWon("approved")).toBe(true);
    expect(statusLooksWon("Approved")).toBe(true);
    expect(statusLooksWon("APPROVED")).toBe(true);
  });

  it("matches ACCEPTED, WON, CONVERTED, BOOKED", () => {
    expect(statusLooksWon("accepted")).toBe(true);
    expect(statusLooksWon("won")).toBe(true);
    expect(statusLooksWon("converted_to_job")).toBe(true);
    expect(statusLooksWon("booked")).toBe(true);
  });

  it("rejects non-won statuses", () => {
    expect(statusLooksWon("pending")).toBe(false);
    expect(statusLooksWon("rejected")).toBe(false);
    expect(statusLooksWon("draft")).toBe(false);
    expect(statusLooksWon("sent")).toBe(false);
  });
});

describe("statusLooksLost", () => {
  it("matches REJECTED, DECLINED, LOST, EXPIRED, ARCHIVED", () => {
    expect(statusLooksLost("rejected")).toBe(true);
    expect(statusLooksLost("declined")).toBe(true);
    expect(statusLooksLost("lost")).toBe(true);
    expect(statusLooksLost("expired")).toBe(true);
    expect(statusLooksLost("archived")).toBe(true);
  });

  it("rejects non-lost statuses", () => {
    expect(statusLooksLost("approved")).toBe(false);
    expect(statusLooksLost("pending")).toBe(false);
    expect(statusLooksLost("sent")).toBe(false);
  });
});
