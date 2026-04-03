// tests/unit/monthRevenue.test.ts
// Unit tests for the monthRevenue() logic from the dashboard overview page.
//
// monthRevenue is defined inline in page.tsx and depends on closures over
// visits, jobs, jobTotalMap, jobVisitCountMap, jobIdsWithVisits, etc.
// We re-implement it here as a pure function for testability.
//
// RECOMMENDATION: Extract monthRevenue into src/lib/revenueHelpers.ts
// and import it both here and in page.tsx.

import { describe, it, expect } from "vitest";

function safeDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

type Visit = {
  completed_at: string | null;
  jobber_job_id: string;
};

type Job = {
  jobber_job_id: string;
  status: string;
  created_at_jobber: string | null;
  updated_at_jobber: string | null;
  total_amount_cents: number;
  job_revenue_cents?: number;
};

const completedStatuses = ["requires_invoicing", "archived"];
const completedDateKeys = ["updated_at_jobber", "created_at_jobber"];

function monthRevenue(
  mStart: Date,
  mEnd: Date,
  visits: Visit[],
  jobs: Job[],
  jobTotalMap: Map<string, number>,
  jobVisitCountMap: Map<string, number>,
  jobIdsWithVisits: Set<string>,
) {
  const mStartMs = mStart.getTime();
  const mEndMs = mEnd.getTime();

  // Completed visits in this month
  const monthVisits = visits.filter((v) => {
    const c = safeDate(v.completed_at);
    return c && c.getTime() >= mStartMs && c.getTime() < mEndMs;
  });
  let rev = 0;
  for (const v of monthVisits) {
    const jobTotal = jobTotalMap.get(v.jobber_job_id) || 0;
    const vCount = jobVisitCountMap.get(v.jobber_job_id) || 1;
    rev += Math.round(jobTotal / vCount);
  }

  // Completed visitless jobs in this month
  const monthJobs = jobs.filter((j) => {
    if (jobIdsWithVisits.has(j.jobber_job_id)) return false;
    const st = (j.status || "").toLowerCase();
    if (!completedStatuses.includes(st)) return false;
    const raw = completedDateKeys.map((k) => (j as any)[k]).find((v: any) => v);
    const dt = safeDate(raw);
    return dt && dt.getTime() >= mStartMs && dt.getTime() < mEndMs;
  });
  for (const j of monthJobs) {
    rev += Number(j.job_revenue_cents ?? j.total_amount_cents ?? 0);
  }

  return { revenue: rev, count: monthVisits.length + monthJobs.length };
}

describe("monthRevenue", () => {
  const jan1 = new Date(Date.UTC(2025, 0, 1));
  const feb1 = new Date(Date.UTC(2025, 1, 1));

  it("returns zero for no data", () => {
    const result = monthRevenue(
      jan1, feb1,
      [], [], new Map(), new Map(), new Set()
    );
    expect(result).toEqual({ revenue: 0, count: 0 });
  });

  it("counts revenue from completed visits, splitting by visit count", () => {
    const visits: Visit[] = [
      { completed_at: "2025-01-10T00:00:00Z", jobber_job_id: "job1" },
      { completed_at: "2025-01-20T00:00:00Z", jobber_job_id: "job1" },
    ];
    const jobTotalMap = new Map([["job1", 10000]]); // $100 in cents
    const jobVisitCountMap = new Map([["job1", 2]]);

    const result = monthRevenue(
      jan1, feb1,
      visits, [], jobTotalMap, jobVisitCountMap, new Set(["job1"])
    );
    // Each visit gets 10000/2 = 5000, two visits = 10000
    expect(result.revenue).toBe(10000);
    expect(result.count).toBe(2);
  });

  it("counts revenue from visitless completed jobs", () => {
    const jobs: Job[] = [
      {
        jobber_job_id: "job2",
        status: "requires_invoicing",
        updated_at_jobber: "2025-01-15T00:00:00Z",
        created_at_jobber: "2025-01-01T00:00:00Z",
        total_amount_cents: 5000,
      },
    ];

    const result = monthRevenue(
      jan1, feb1,
      [], jobs, new Map(), new Map(), new Set()
    );
    expect(result.revenue).toBe(5000);
    expect(result.count).toBe(1);
  });

  it("excludes jobs that have visits (avoids double-counting)", () => {
    const jobs: Job[] = [
      {
        jobber_job_id: "job1",
        status: "requires_invoicing",
        updated_at_jobber: "2025-01-15T00:00:00Z",
        created_at_jobber: "2025-01-01T00:00:00Z",
        total_amount_cents: 5000,
      },
    ];

    const result = monthRevenue(
      jan1, feb1,
      [], jobs, new Map(), new Map(), new Set(["job1"]) // job1 has visits
    );
    expect(result.revenue).toBe(0);
    expect(result.count).toBe(0);
  });

  it("excludes visits completed outside the month range", () => {
    const visits: Visit[] = [
      { completed_at: "2024-12-31T23:59:59Z", jobber_job_id: "job1" }, // before range
      { completed_at: "2025-02-01T00:00:00Z", jobber_job_id: "job1" }, // after range
    ];
    const jobTotalMap = new Map([["job1", 10000]]);
    const jobVisitCountMap = new Map([["job1", 1]]);

    const result = monthRevenue(
      jan1, feb1,
      visits, [], jobTotalMap, jobVisitCountMap, new Set(["job1"])
    );
    expect(result.revenue).toBe(0);
    expect(result.count).toBe(0);
  });

  it("prefers job_revenue_cents over total_amount_cents for visitless jobs", () => {
    const jobs: Job[] = [
      {
        jobber_job_id: "job3",
        status: "requires_invoicing",
        updated_at_jobber: "2025-01-10T00:00:00Z",
        created_at_jobber: "2025-01-01T00:00:00Z",
        total_amount_cents: 5000,
        job_revenue_cents: 7500, // Should use this value
      },
    ];

    const result = monthRevenue(
      jan1, feb1,
      [], jobs, new Map(), new Map(), new Set()
    );
    expect(result.revenue).toBe(7500);
  });

  it("handles a job with null dates gracefully", () => {
    const jobs: Job[] = [
      {
        jobber_job_id: "job4",
        status: "requires_invoicing",
        updated_at_jobber: null,
        created_at_jobber: null,
        total_amount_cents: 5000,
      },
    ];

    const result = monthRevenue(
      jan1, feb1,
      [], jobs, new Map(), new Map(), new Set()
    );
    expect(result.revenue).toBe(0);
    expect(result.count).toBe(0);
  });
});
