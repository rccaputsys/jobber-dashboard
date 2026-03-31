# AccuInsight Dashboard — Full Technical Audit Report

**Date:** 2026-03-23
**Auditor:** Claude Opus 4.6
**Scope:** Security, Performance, Testing

---

## Executive Summary

**Security:** The application has **7 critical vulnerabilities**, most stemming from unauthenticated API endpoints. The sync, export, and status endpoints accept any `connection_id` without verifying the caller owns that connection — enabling cross-tenant data access. The Jobber webhook endpoint has no signature verification, meaning a forged `APP_DISCONNECT` webhook could delete all data for any account. Several diagnostic endpoints leak infrastructure details. The middleware only protects 2 of 4 dashboard routes. Immediate action required on authentication gaps.

**Performance:** The biggest bottleneck is data fetching — every page loads ALL rows from multiple tables using `SELECT *` with a page size of 100 (causing dozens of round-trips per table). The dashboard page runs ~30 computation passes over the full dataset on every request with no caching. Helper functions are duplicated across 6+ files (~500 lines of identical code). An O(n²) lookup in the capacity page could cause noticeable lag for accounts with thousands of visits. Quick wins (increasing page size, selecting specific columns) would cut load times significantly.

**Testing:** The application has zero automated tests. No test framework is configured. Given the security findings, integration tests for auth and authorization are the highest priority, followed by unit tests for the computation-heavy dashboard logic.

---

## AUDIT 1: SECURITY REVIEW

### CRITICAL (7)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `api/sync/run/route.ts:765` | **Unauthenticated sync endpoint** — anyone with a connection UUID can trigger a full data sync, read results, and consume Jobber API quota | Add `getUser()` check, verify user owns connection |
| 2 | `api/sync/status/route.ts:4` | **Unauthenticated status endpoint** — leaks sync state and error messages for any connection | Add auth + ownership check |
| 3 | `api/export/jobber-job-fields/route.ts:6` | **Unauthenticated export** — exposes Jobber schema and sample data for any account | Add auth + ownership check |
| 4 | `api/export/jobber-quote-fields/route.ts:7` | **Same as above** for quote fields | Add auth + ownership check |
| 5 | `api/export/jobber-visit-fields/route.ts:7` | **Same as above** for visit fields | Add auth + ownership check |
| 6 | `api/webhooks/route.ts:10` | **No webhook signature verification** — forged `APP_DISCONNECT` can delete all account data | Verify HMAC signature or shared secret |
| 7 | `api/auth/complete-signup/route.ts:9` | **Signup hijacking** — anyone with a connection UUID can create an account linked to that Jobber connection | Use cryptographic signup token instead of bare UUID |

### HIGH (6)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 8 | `api/ping/supabase/route.ts` | Unauthenticated diagnostic endpoint leaks infrastructure details | Delete or restrict to admin |
| 9 | `api/ping/supabase-rest/route.ts` | Unauthenticated endpoint makes service-role API calls | Delete or restrict to admin |
| 10 | `api/diag/supabase/route.ts` | Duplicate diagnostic endpoint leaking key metadata | Delete or restrict to admin |
| 11 | `middleware.ts:31` | **Incomplete route protection** — only `/jobber/dashboard` and `/jobber/sales` protected. Missing: `/jobber/capacity`, `/jobber/invoices`, `/admin`, all `/api/*` | Expand to cover all `/jobber/*` and `/admin` |
| 12 | `api/auth/complete-signup/route.ts:95` | Email address logged to console (PII in production logs) | Remove or redact |
| 13 | `api/webhooks/route.ts:15` | Full webhook payload logged including account identifiers | Log only topic + relevant IDs |

### MEDIUM (10)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 14 | `api/auth/complete-signup/route.ts:104` | SSRF risk — `fetch(appUrl/api/sync/run)` with user-influenced connectionId | Call sync function directly |
| 15 | `api/auth/complete-signup/route.ts:106` | Dead code after return statement | Remove lines 108-112 |
| 16 | `api/settings/capacity/route.ts:50` | Admin email hardcoded in source | Move to env var |
| 17 | `api/billing/checkout/route.ts:16` | Stripe price IDs hardcoded | Move to env var |
| 18 | `api/jobber/callback/route.ts:126` | OAuth state not validated for expiration (30-day replay window) | Check timestamp, reject if >10 min old |
| 19 | `middleware.ts:26` | Using `getSession()` instead of `getUser()` — tampered JWT could bypass | Use `getUser()` for server-side verification |
| 20 | `lib/resend.ts:31` | Sync retry link in failure emails is unauthenticated | Fix sync endpoint auth; use signed token in URL |
| 21 | `api/auth/login/route.ts:7` | No rate limiting on login endpoint | Add IP-based throttle |
| 22 | `api/auth/forgot-password/route.ts:6` | No rate limiting on password reset | Add throttle |
| 23 | `app/admin/page.tsx:383` | Admin page fetches `SELECT *` from connections | Select only needed columns |

### LOW (5)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 24 | `api/jobber/callback/route.ts:29` | Token exchange error leaks response body | Log server-side, return generic error |
| 25 | `api/jobber/callback/route.ts:168` | Raw GraphQL response logged on error | Same |
| 26 | `next.config.ts:14` | Missing CSP and HSTS headers | Add security headers |
| 27 | `lib/crypto.ts:10` | 30-day JWE expiration too long for OAuth state | Use different TTLs per purpose |
| 28 | `api/auth/complete-signup/route.ts:35` | `email_confirm: true` bypasses email verification | Require actual verification |

---

## AUDIT 2: PERFORMANCE & EFFICIENCY

### HIGH Impact

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `lib/supabaseAdmin.ts:16` | **fetchAllRows uses pageSize=100** — causes 10-50 round-trips per table | Increase to 1000-5000 |
| 2 | `dashboard/page.tsx:614` | **`SELECT *` on fact_invoices, fact_jobs, fact_visits** — transfers unused columns | Select only needed columns |
| 3 | `capacity/page.tsx:86` | **`SELECT *` on fact_jobs and fact_visits** | Select only needed columns |
| 4 | `invoices/page.tsx:77` | **`SELECT *` on fact_invoices** | Select only needed columns |
| 5 | `dashboard/page.tsx:29-167` | **All dashboardHelpers functions re-declared locally** (~140 lines dead code) | Delete, use imports |
| 6 | `TrendsSection.tsx:25`, `SalesTrendsSection.tsx:21`, `InvoiceTrendsSection.tsx:19` | **Date helpers duplicated in 4+ client components** | Import from shared module |
| 7 | `capacity/page.tsx:160` | **O(n²) visit lookup** — `visits.find()` inside a loop over all schedule items | Build a Map before the loop |
| 8 | `dashboard/page.tsx:614-1400` | **~30 computation passes over full dataset on every request** with no caching | Cache with `unstable_cache` or compute during sync |
| 9 | `api/sync/run/route.ts:826` | **Legacy sync flow doesn't fetch visits** — incomplete data for capacity/dashboard | Add visit fetch to legacy path |

### MEDIUM Impact

| # | File | Issue | Fix |
|---|------|-------|-----|
| 10 | `capacity/page.tsx:176` | Sequential query for `monthly_capacity_cents` after parallel fetch | Add to initial connection select |
| 11 | `api/sync/run/route.ts:546` | Metrics step re-fetches all rows from 3 tables | Use SQL aggregation queries |
| 12 | `api/sync/run/route.ts:306` | Chunked upserts run sequentially | Run 3-4 chunks concurrently |
| 13 | `dashboard/page.tsx:888` | weekSnapshot called 3x, each scanning ALL arrays | Pre-bucket items by week |
| 14 | `dashboard/page.tsx:1012` | computeSparkline scans all events 8x per sparkline | Single-pass bucketing |
| 15 | All pages | **Auth/connection/billing gate logic duplicated** across 4 pages (~100 lines each) | Extract shared helper |
| 16 | All pages | **Paywall UI duplicated** across 4 pages | Extract `<PaywallGate>` component |
| 17 | Multiple components | **Theme detection `useEffect`** duplicated in 8+ components | Extract shared `useIsLight()` hook |
| 18 | `SalesTrendsSection.tsx:86` | `useIsMobile` and `useIsLight` hooks defined locally | Share via hooks file |

### LOW Impact

| # | File | Issue | Fix |
|---|------|-------|-----|
| 19 | `SparkLine.tsx` | 590-line component handles too many concerns | Split or use React.memo |
| 20 | `BusinessPulse.tsx:63` | **Bug:** hover indexes `months` instead of `data` when in weekly view | Use `data[hoveredIdx]` |
| 21 | All pages | No `loading.tsx` skeleton files | Add loading states |
| 22 | `dashboard/page.tsx:169` | DEMO_DATA hardcoded in production file | Move to separate file |

---

## AUDIT 3: TEST PLAN

**Current State:** Zero automated tests. No test framework installed.

**Setup Required:** `npm install -D vitest @playwright/test`

### Test Files Generated (13 files, 100+ test cases)

#### Unit Tests (6 files)

| File | Covers | Test Cases |
|------|--------|-----------|
| `tests/unit/dashboardHelpers.test.ts` | All 16 exported functions from dashboardHelpers.ts | 57 cases — safeDate, clamp, pct, date utils, money formatting, status checks |
| `tests/unit/crypto.test.ts` | Encrypt/decrypt round-trips | 7 cases — normal, empty, special chars, nonce uniqueness, tamper detection |
| `tests/unit/syncHelpers.test.ts` | Sync route pure functions | 16 cases — dollarsToCents, date filtering, quote leak logic |
| `tests/unit/monthRevenue.test.ts` | Revenue computation | 7 cases — visit splitting, visitless fallback, double-counting prevention |
| `tests/unit/fetchAllRows.test.ts` | Supabase pagination | 6 cases — single/multi page, empty, errors, stop conditions |
| `tests/unit/jobberAuth.test.ts` | Token refresh logic | 16 cases — expiry buffer, retry logic, 429/500/400 handling |

#### Integration Tests (5 files)

| File | Covers | Key Scenarios |
|------|--------|--------------|
| `tests/integration/stripeWebhook.test.ts` | Stripe webhook handler | Signature verification, checkout.session.completed, subscription updates/deletes, payment failures |
| `tests/integration/jobberCallback.test.ts` | OAuth callback flow | State validation, token exchange, new vs existing connections, trial setup |
| `tests/integration/middleware.test.ts` | Route protection | Protected routes, auth redirects, **documents gap in /capacity and /invoices** |
| `tests/integration/capacitySettings.test.ts` | Settings API | Auth checks, GET/POST, admin overrides, rounding |
| `tests/integration/syncThrottling.test.ts` | Jobber API throttling | THROTTLED code retry, max retries, 429 Retry-After, backoff |

#### E2E Tests (1 file)

| File | Covers | Test Cases |
|------|--------|-----------|
| `tests/e2e/dashboard.spec.ts` | Full user flows (Playwright) | 30+ cases — login, dashboard load, tab navigation, sync, period toggles, dark mode, responsive |

#### Documentation

| File | Contents |
|------|----------|
| `tests/EDGE_CASES.md` | 12 edge case categories with risk assessment |

### Key Testing Findings

1. **Pure functions are inline, not exported** — `dollarsToCents`, `monthRevenue`, `weekSnapshot` are defined inside page components. Extract to shared modules for testability.
2. **Stripe webhook ordering vulnerability** — No guard against out-of-order delivery. A late `subscription.updated` could overwrite a `canceled` status.
3. **Middleware gap confirmed** — `/jobber/capacity` and `/jobber/invoices` are NOT in `protectedPaths` or `config.matcher`.
4. **Dead code confirmed** — Lines 108-112 in `complete-signup/route.ts` are unreachable after a `return` statement.

---

## Quick Wins (Under 30 Minutes Each)

| # | Change | Impact | Time |
|---|--------|--------|------|
| 1 | **Increase `fetchAllRows` pageSize to 1000** in `supabaseAdmin.ts` | 10x fewer DB round-trips on every page | 2 min |
| 2 | **Delete `/api/ping/*` and `/api/diag/*` endpoints** | Eliminates 3 HIGH security findings | 5 min |
| 3 | **Expand middleware `protectedPaths`** to `["/jobber", "/admin"]` | Covers all dashboard routes | 2 min |
| 4 | **Add auth check to `/api/sync/run`** — copy pattern from settings/capacity | Fixes most critical vulnerability | 15 min |
| 5 | **Replace `SELECT *` with specific columns** on dashboard page | Reduces data transfer 50%+ | 20 min |

---

## Do First — Priority Action List

### Immediate (This Week)
1. Add authentication to `/api/sync/run`, `/api/sync/status`, all `/api/export/*`
2. Delete diagnostic endpoints (`/api/ping/*`, `/api/diag/*`)
3. Expand middleware to protect all `/jobber/*` and `/admin` routes
4. Add Jobber webhook signature verification
5. Increase fetchAllRows pageSize to 1000

### Soon (Next 2 Weeks)
6. Replace `SELECT *` with specific columns on all pages
7. Fix O(n²) visit lookup in capacity page
8. Secure complete-signup with cryptographic token
9. Add rate limiting to login and password reset endpoints
10. Remove PII logging (email, webhook payloads)

### Next Sprint
11. Add `unstable_cache` or revalidation to dashboard page
12. Deduplicate helper functions across components
13. Extract shared auth/billing gate logic
14. Add loading.tsx skeleton files
15. Set up test framework (Vitest) and write auth integration tests

### Technical Debt
16. Remove dead code (local helper re-declarations in dashboard/page.tsx)
17. Extract shared hooks (useIsLight, useIsMobile)
18. Move DEMO_DATA to separate file
19. Add CSP and HSTS security headers
20. Fix BusinessPulse hover bug (months vs data indexing)
