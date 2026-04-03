# Edge Cases to Cover

## Jobber API Throttling (HTTP 200 with THROTTLED code)
- **What**: Jobber returns HTTP 200 but `data: null` with `extensions.code: "THROTTLED"` — NOT a standard 429.
- **Risk**: Naive error handling will see 200 and assume success, silently dropping data.
- **Test**: Verify `jobberGraphQLWithPartialErrors` retries on THROTTLED, with exponential backoff.
- **Test**: Verify THROTTLED errors are filtered from the final error array (non-THROTTLED errors pass through).
- **Test**: Verify max-retry exhaustion returns a clear "Max retries exceeded" error.

## Jobber API Rate Limit Recovery
- **What**: Standard HTTP 429 with optional `Retry-After` header.
- **Test**: Verify both 429 retry and Retry-After header parsing.
- **Test**: Verify that the 350ms delay between paginated requests isn't currently enforced (was removed).

## Stripe Webhook Out-of-Order Delivery
- **What**: Stripe doesn't guarantee webhook ordering. `subscription.deleted` may arrive before `subscription.updated`.
- **Risk**: A late `subscription.updated` event could overwrite `billing_status: "canceled"` with `"active"`.
- **Current status**: **NOT GUARDED** — the handler applies status unconditionally.
- **Recommendation**: Add an `event.created` timestamp check or DB `updated_at` comparison before applying status changes.
- **Test**: Deliver "updated(active)" after "deleted(canceled)" and verify final state.

## Trial Expiration Mid-Session
- **What**: A user's 14-day trial ends while they're using the dashboard.
- **Risk**: Middleware doesn't check `billing_status` or `trial_ends_at`. User keeps accessing features.
- **Current status**: **NO SERVER-SIDE ENFORCEMENT** — trial gates are likely client-side only.
- **Recommendation**: Add billing status check to middleware or page-level server component.
- **Test**: Set `trial_ends_at` to past, verify dashboard blocks or downgrades access.

## User with 0 Jobs/Invoices/Quotes
- **What**: Brand-new account that has connected Jobber but has no data yet.
- **Risk**: Division by zero, empty chart rendering, NaN in KPIs.
- **Test**: Run full dashboard computation with empty arrays — verify 0 counts, no NaN/undefined.
- **Test**: Verify monthRevenue returns `{ revenue: 0, count: 0 }` for empty data.
- **Test**: Verify moneyForChart(0) returns "$0", not "$NaN".

## Very Large Accounts (10k+ Jobs)
- **What**: Accounts with 10,000+ jobs, invoices, quotes.
- **Risk**: Supabase PostgREST default `max_rows` (100) silently truncates queries.
- **Test**: Verify `fetchAllRows` correctly paginates beyond 100 rows using `.range()`.
- **Test**: Verify sync `fetchAllPages` deduplicates entities that appear on multiple pages.
- **Test**: Verify 1000-row chunk upserts handle 10k+ rows correctly (10+ batches).
- **Risk**: Vercel 300s timeout on large full syncs.
- **Test**: Verify `maxDuration = 300` is set on the sync route.

## Missing/Expired Jobber Tokens
- **What**: Token row doesn't exist, or token is expired and refresh fails.
- **Risk**: Sync crashes, dashboard shows stale data.
- **Test**: `getValidAccessToken` with no token rows → throws "No tokens found".
- **Test**: `getValidAccessToken` with expired token and 400 refresh response → throws (doesn't retry).
- **Test**: `getValidAccessToken` with expired token and 429 refresh response → retries then succeeds.
- **Test**: `getValidAccessToken` with NaN `expires_at` → treats as expired, triggers refresh.

## Supabase PostgREST max_rows Limit
- **What**: Default limit is 100 rows. Queries without explicit `.limit()` or `.range()` get truncated.
- **Risk**: Dashboard shows exactly 100 of something when there should be more. Metrics are wrong.
- **Test**: `fetchAllRows` iterates until `data.length < pageSize` (not just `data.length === 0`).
- **Test**: Metrics queries in sync route use `fetchAllRows` or `.select("*", { count: "exact", head: true })`.

## Encryption Key Rotation
- **What**: `APP_ENCRYPTION_SECRET` changes. All stored tokens become undecryptable.
- **Risk**: Every sync fails, every login flow breaks for connected users.
- **Test**: `decryptText` with wrong key → throws (not silent failure).
- **Recommendation**: Consider a key-version prefix on encrypted tokens for future rotation support.

## Concurrent Syncs
- **What**: Two sync requests arrive simultaneously for the same connection.
- **Risk**: Duplicate data, race conditions on heartbeat update.
- **Current mitigation**: `sync_status: "syncing"` + `sync_started_at` check (5-minute window).
- **Test**: Second sync request within 5 minutes returns 409 "Sync already in progress".
- **Test**: Stale sync (>5 min old) is overridden by new sync.

## Complete-Signup Dead Code
- **What**: `src/app/api/auth/complete-signup/route.ts` has unreachable code after `return NextResponse.json({ success: true })` — duplicate email-sending logic on lines 108-112.
- **Risk**: Welcome email is sent twice if the dead code were somehow reached. Currently benign.
- **Recommendation**: Remove the dead code block.

## Middleware Protected Path Gaps
- **What**: Middleware protects `/jobber/dashboard` and `/jobber/sales` but NOT `/jobber/capacity` or `/jobber/invoices`.
- **Risk**: Unauthenticated users could access capacity and invoices pages.
- **Recommendation**: Add these paths to both `protectedPaths` and `config.matcher`.
