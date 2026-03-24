# AccuInsight — Complete Calculation Reference

Every metric, KPI, and derived value in the dashboard. Use this to audit accuracy.

---

## Data Sources

| Table | Key Columns |
|-------|------------|
| `fact_quotes` | quote_status, quote_total_cents, sent_at, updated_at_jobber, created_at_jobber |
| `fact_jobs` | status, scheduled_start_at, total_amount_cents, job_revenue_cents, job_cost_cents, job_profit_cents, created_at_jobber, updated_at_jobber |
| `fact_invoices` | status, balance_cents, total_amount_cents, due_at, paid_at, created_at_jobber |
| `fact_visits` | jobber_job_id, start_at, end_at, completed_at, visit_status, is_complete, duration_minutes |
| `fact_requests` | request_status, created_at_jobber, title, client_name |
| `jobber_connections` | weekly_capacity_cents, monthly_capacity_cents, currency_code, billing_status |

---

## Key Concepts

### Visit-Based Revenue Distribution
Jobs can have 0-N visits. Revenue is split proportionally:
- **Job with visits**: Each visit = `job_total_amount_cents / visit_count`
- **Job without visits**: Full `total_amount_cents` attributed to the job itself

### "Completed" Status Detection
Jobber users rarely use "completed" status. A job is considered completed if:
- Status is `completed`, `requires_invoicing`, or `archived`
- Completion date uses fallback chain: `completed_at_jobber` → `updated_at_jobber`

### Status Pattern Matching
- **Won**: Status contains APPROV, ACCEPT, WON, CONVERT, or BOOK (case-insensitive)
- **Lost**: Status contains REJECTED, DECLINED, LOST, EXPIRED, or ARCHIVED
- **Sent/Open**: Status is AWAITING_RESPONSE or SENT

### Period Filters
All pages default to "This Week". Available periods:
- **This Week**: Monday 00:00 UTC → Sunday 23:59 UTC (current week)
- **Last Week**: Prior Monday-Sunday
- **This Month**: 1st of current month → end of month
- **Last Month**: 1st of prior month → end of prior month
- **All Time**: All available data

---

## Overview Tab (`src/app/jobber/dashboard/page.tsx`)

### Week at a Glance KPI Cards

#### Scheduled Revenue
- **Formula**: Sum of `(job_total / visit_count)` for visits with `start_at` in period + sum of `total_amount_cents` for visitless jobs with `scheduled_start_at` in period
- **Sub-text**: Count of booked items + next week count if viewing This Week

#### Earned Revenue
- **Formula**: Sum of `(job_total / visit_count)` for visits with `completed_at` in period + sum of `job_revenue_cents` (or `total_amount_cents`) for completed visitless jobs in period
- **Sub-text**: Count of completed items

#### Collected Revenue
- **Formula**: Sum of `total_amount_cents` for invoices where `status = 'paid'` and `paid_at` in period
- **Sub-text**: Count of paid invoices + count due in period

#### Quotes Won
- **Formula**: Sum of `quote_total_cents` for quotes with won status and `updated_at_jobber` in period
- **Sub-text**: "X won of Y sent • Z% close rate"
- **Close Rate**: `quotesWon / (quotesWon + quotesLost + sentStillOpen)` — includes unresolved quotes in denominator

#### Delta Indicators (▲/▼)
- Shown for This Week (vs Last Week) and This Month (vs Last Month)
- **Formula**: `((current - prior) / prior) * 100`, rounded to whole %
- Hidden when prior = 0 or delta = 0

### Business Pulse Chart

#### Monthly Revenue Bars
- **Source**: Pre-bucketed cache of completed visits + completed visitless jobs per month
- **Per Month**: Sum of visit revenue (`job_total / visit_count`) + visitless job revenue
- **Display**: 12 months rolling, leading empty months trimmed
- **Current Month Delta**: `((thisMonth - lastMonth) / lastMonth) * 100`%
- **Average Line**: `totalRevenue / monthCount` (all displayed months)

#### Weekly Revenue Bars
- Same logic as monthly but bucketed by week (12 weeks rolling)

### Sparklines (8-week mini charts)

#### Pipeline Sparkline
- **Type**: Point-in-time snapshot
- **Logic**: For each week endpoint, count active leak events where `enterAt < weekEnd && (exitAt == null || exitAt >= weekEnd)`
- **Leak Events**: Quotes sent 6+ months ago, not won, not lost, not archived/draft

#### Unscheduled Sparkline
- **Type**: Point-in-time snapshot
- **Logic**: Jobs with no `scheduled_start_at`, created in last 6 months
- Same point-in-time logic as pipeline

#### Overdue Sparkline
- **Type**: Point-in-time snapshot
- **Logic**: Unpaid invoices past due date, using `enterAt = due_date + 15 days` buffer

#### Collections Sparkline
- **Type**: Aggregate per week
- **Logic**: Sum of `total_amount_cents` for invoices paid in each week

### Money Flow Pipeline

| Stage | Filter | Value |
|-------|--------|-------|
| Leads | `fact_requests` with open status | Count |
| Quoting | Quotes with status AWAITING_RESPONSE, SENT, CHANGES_REQUESTED | Sum of quote_total_cents |
| Won | Quotes matching won patterns, updated in last 6 months | Sum of quote_total_cents |
| Scheduled | Jobs with `scheduled_start_at` set, status active | Sum of total_amount_cents |
| Needs Invoice | Jobs with status `requires_invoicing` | Sum of total_amount_cents |
| Outstanding | Unpaid invoices (awaiting_payment, past_due) | Sum of balance_cents |

### Recommendations

Recommendations are prioritized by dollar impact. Each checks:
1. **Overdue Invoices**: Count of unpaid invoices past due, sorted by amount
2. **Unscheduled Work**: Jobs without scheduled dates, value > 0
3. **Quote Follow-Ups**: Open quotes with no activity > 14 days
4. **Changes Requested**: Quotes awaiting revisions
5. **Needs Invoicing**: Completed work not yet invoiced

### Accounts Receivable Aging

| Bucket | Filter |
|--------|--------|
| 0-7 Days Overdue | `(now - due_at) / 86400000 <= 7` |
| 8-14 Days Overdue | `7 < days <= 14` |
| 15+ Days Overdue | `days > 14` |
| **Total AR** | Sum of `balance_cents` for all unpaid past-due invoices |

---

## Sales Tab (`src/app/jobber/sales/page.tsx`)

### Quote Pipeline Stages

| Stage | Status Filter | Color |
|-------|--------------|-------|
| Requests | Open requests (not converted/archived) | Purple |
| Draft | status = 'DRAFT' | Gray |
| Sent | status in (AWAITING_RESPONSE, SENT) | Blue |
| Changes Req | status in (CHANGES_REQUESTED, CHANGE_ORDER) | Orange |
| Approved | status contains APPROV or ACCEPT | Cyan |
| Won | Matches won patterns | Green |
| Lost | Matches lost patterns | Red |

Each stage: count + sum of `quote_total_cents`

### KPI Cards (per period)

#### Won Sales
- **Formula**: Sum of `quote_total_cents` for quotes matching won status with `updated_at_jobber` in period
- **Sub-text**: "X won • [period]"

#### Win Rate
- **Numerator**: Count of won quotes in period
- **Denominator**: Won + Lost + Sent-But-Still-Open (quotes sent in period, status still pending)
- **Formula**: `wonCount / (wonCount + lostCount + sentOpenCount)`
- **Color**: ≥40% green, 20-40% amber, <20% red

#### Avg Days to Close
- **Formula**: For won quotes with both `sent_at` and `updated_at_jobber`: `sum((updated_at - sent_at) / 86400000) / wonCount`
- **Color**: ≤7 days green, 8-14 blue, 15+ amber

#### Quotes Sent
- **Primary Value**: Sum of `quote_total_cents` for quotes with `sent_at` in period
- **Sub-text**: "X quotes • [period]"

### Sales Trends Chart

#### Revenue Points (bar chart)
- Per bucket (day/week/month): Sum of `amount` for won quote events with `closedAt` in bucket

#### Win Rate Points (line chart)
- Per bucket: `won / (won + lost + sentOpen)` where events fall in bucket
- **Sent Open**: Counted by `sentAt` date falling in bucket
- **Weighted Average**: `totalWon / totalDenom` across entire visible range

### Quote Follow-Up Table
- **Days Quiet**: `(now - updated_at_jobber) / 86400000`
- **Age Buckets**: Cold (30+), Going Cold (15-30), Warm (8-14), Hot (0-7)
- **Sort**: By days quiet descending

### Action Tabs
- **Awaiting Response**: Quotes with status AWAITING_RESPONSE/SENT, sorted by days old
- **Changes Requested**: Status CHANGES_REQUESTED/CHANGE_ORDER, sorted by days old
- **Drafts**: Status DRAFT, sorted by created date
- **Follow-Ups**: Open quotes sorted by staleness

---

## Capacity Tab (`src/app/jobber/capacity/page.tsx`)

### Unified Schedule Items
- **Visits**: From `fact_visits`, each gets revenue = `job_total / visit_count_for_that_job`
- **Visitless Jobs**: Jobs not in any visit's `jobber_job_id`, use full `total_amount_cents`

### KPI Cards (per period)

#### Scheduled Revenue
- **Formula**: Sum of `amountCents` for schedule items with `startAt` in period

#### Fill Rate
- **Weekly**: `scheduledRevenue / weeklyTargetCents` (user-set target)
- **Monthly**: `scheduledRevenue / monthlyTargetCents` (if set, else `weeklyTarget * weeks`)
- **Color**: 70-150% green, 30-70% amber, <30% blue, >150% amber (overbooked)

#### Gap to Book
- **Formula**: `targetCents - scheduledRevenue` (positive = under target)

#### Revenue Per Weekday
- **Formula**: `scheduledRevenue / workingDays`
- **Working Days**: `max(1, daysInPeriod * 5/7)`

#### Revenue Per Job
- **Formula**: `scheduledRevenue / jobCount` for the period

### Capacity Chart (8-week view)
- 4 weeks back + current week + 3 weeks forward
- **Per bar**: Revenue from schedule items starting in that week
- **Target line**: Dashed green line at `weeklyTargetCents`
- **Bar color with target**: ≥70% green, 30-70% amber, <30% blue
- **Bar color without target**: All blue

### Monthly View
- Same logic but bucketed by calendar month
- Uses `monthlyTargetCents` for target line if set

### Quick Stats

| Metric | Formula |
|--------|---------|
| Revenue/Weekday | `thisWeekRevenue / 5` |
| Avg Per Visit | `thisWeekRevenue / thisWeekJobCount` |
| Backlog | Sum of `total_amount_cents` for unscheduled jobs |
| Week over Week | `((thisWeek - lastWeek) / lastWeek) * 100`% |

### Schedule Health
- **Late Visits**: Visits with `visit_status = 'LATE'`, shows per-visit revenue
- **Unscheduled**: Jobs with no `scheduled_start_at` + visits with status 'UNSCHEDULED'

### 8-Week Projection
- **Total Scheduled**: Sum of next 8 weeks' revenue
- **Total Target**: `weeklyTargetCents * 8`
- **Fill %**: `totalScheduled / totalTarget`
- **Gap**: `totalTarget - totalScheduled`

---

## Invoices Tab (`src/app/jobber/invoices/page.tsx`)

### KPI Cards (per period)

#### Collected Revenue
- **Formula**: Sum of `total_amount_cents` for invoices with `status = 'paid'` and `paid_at` in period
- **Sub-text**: "X invoices paid • [period]"

#### Invoices Sent
- **Primary**: Sum of `total_amount_cents` for invoices with `created_at_jobber` in period
- **Sub-text**: Count of invoices

#### Avg Days to Pay
- **Formula**: For paid invoices in period: `sum((paid_at - created_at) / 86400000) / paidCount`

#### Outstanding Balance
- **Formula**: Sum of `balance_cents` for unpaid invoices (status: awaiting_payment, past_due)
- **Not period-filtered** — always shows current total

#### Past Due Balance
- **Formula**: Sum of `balance_cents` for invoices with `due_at` before today and unpaid
- **Color**: Amount > 0 = red

### Collection Chart

#### Invoiced vs Collected (per period bucket)
- **Invoiced**: Sum of `total_amount_cents` for invoices with `due_at` in bucket (excludes drafts)
- **Collected**: Sum of `total_amount_cents` for paid invoices with `paid_at` in bucket
- **Collection Rate**: `(totalCollected / totalInvoiced) * 100`%
- **Color**: ≥80% green, 50-80% amber, <50% red

### Aging Donut

| Bucket | Filter |
|--------|--------|
| Current | due_at >= today (not yet due) |
| 1-7 Days | 1 ≤ overdue days < 7 |
| 7-30 Days | 7 ≤ overdue days < 30 |
| 30+ Days | overdue days ≥ 30 |

### Outstanding Invoices Tab
- **Filter**: status in (awaiting_payment, past_due)
- **Sort**: By days overdue descending
- **Days Overdue**: `max(0, (now - due_at) / 86400000)`

### Needs Invoicing Tab
- **Filter**: Jobs with `status = 'requires_invoicing'`
- **Per Job**: Shows completed visit count + latest completion date
- **Sort**: By total_amount_cents descending

### Drafts Tab
- **Filter**: Invoices with `status = 'draft'`
- **Metrics**: Count + sum of total_amount_cents

---

## Chart Component Details

### SparkLine Average Calculation (`src/app/jobber/dashboard/SparkLine.tsx`)
- **For percentages** (like win rate): Exclude zero-value periods from average (no data ≠ 0%)
- **For money/numbers**: Include all periods (zeros are real data)
- **Incomplete period**: Current week excluded from weekly views; current month included for monthly

### SparkLine Target Coloring
- **Capacity mode** (penalizeOverTarget):
  - >130% of target: Red
  - >115%: Orange
  - 85-115%: Green
  - 50-85%: Orange
  - <50%: Red
- **Sales mode**: Above target = green, 75-100% = orange, below 75% = red

### TrendsSection Bucketing (`src/app/jobber/dashboard/TrendsSection.tsx`)
- **Granularity options**: Day, Week, Month, Quarter
- **Range presets**: 7D, 30D, 8W, 90D, YTD
- **Point-in-time metrics**: Count active events at each bucket endpoint
- **Aggregate metrics**: Sum all events within each bucket

---

## Important Notes

1. **All monetary values stored in cents** — displayed as dollars via `Intl.NumberFormat`
2. **All dates UTC** — week starts Monday, month starts 1st
3. **Win rate includes unresolved quotes** — `won / (won + lost + sentOpen)` so owners who don't archive quotes see honest rates
4. **6-month window** for pipeline/quote metrics — prevents stale data from years ago skewing numbers
5. **Visit revenue is proportional** — a $1,000 job with 4 visits = $250 per visit
6. **"Completed" means actionable** — `requires_invoicing` and `archived` count as completed since Jobber users rarely mark jobs as "completed"
