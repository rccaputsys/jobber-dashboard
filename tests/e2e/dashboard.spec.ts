// tests/e2e/dashboard.spec.ts
// Playwright E2E test scaffolds for the Jobber Dashboard
//
// Prerequisites:
//   npm install -D @playwright/test
//   npx playwright install
//
// Run with:
//   npx playwright test tests/e2e/dashboard.spec.ts

import { test, expect, type Page } from "@playwright/test";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Login helper — reuse across tests
async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for redirect to dashboard
  await page.waitForURL("**/jobber/dashboard**", { timeout: 10000 });
}

// ──────────────────────────────────────────────
// 1. Login Flow
// ──────────────────────────────────────────────
test.describe("Login Flow", () => {
  test("displays login page with email and password fields", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "bad@example.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    // Should show an error message, not redirect
    await expect(page.locator("text=Invalid")).toBeVisible({ timeout: 5000 });
  });

  test("shows error for empty form submission", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.click('button[type="submit"]');
    // HTML5 validation or custom error
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects to dashboard on successful login", async ({ page }) => {
    // NOTE: Requires a real test account in Supabase
    // await login(page, "test@example.com", "testpassword123");
    // await expect(page).toHaveURL(/\/jobber\/dashboard/);
  });

  test("redirects already-authenticated users from /login to /dashboard", async ({ page }) => {
    // NOTE: Requires pre-setting auth cookies
    // await login(page, "test@example.com", "testpassword123");
    // await page.goto(`${BASE_URL}/login`);
    // await expect(page).toHaveURL(/\/jobber\/dashboard/);
  });
});

// ──────────────────────────────────────────────
// 2. Dashboard Page Load
// ──────────────────────────────────────────────
test.describe("Dashboard Page Load", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    // await login(page, "test@example.com", "testpassword123");
  });

  test("displays company name in header", async ({ page }) => {
    // await expect(page.locator(".dashboard-header h1")).toContainText(/./);
  });

  test("displays KPI cards (revenue, past due, quote leak)", async ({ page }) => {
    // await expect(page.locator(".kpi-primary")).toHaveCount(3);
    // await expect(page.locator(".kpi-value-large")).toHaveCount(3);
  });

  test("displays secondary KPI cards", async ({ page }) => {
    // await expect(page.locator(".kpi-secondary")).toHaveCount(4);
  });

  test("displays last sync time", async ({ page }) => {
    // await expect(page.locator("text=ago")).toBeVisible();
  });

  test("displays billing status pill (trialing/active)", async ({ page }) => {
    // await expect(page.locator(".status-pill")).toBeVisible();
  });

  test("handles empty data gracefully (0 jobs, 0 invoices)", async ({ page }) => {
    // For a brand-new test account with no synced data:
    // KPIs should show $0 or 0, not NaN or errors
    // await expect(page.locator(".kpi-value-large")).not.toContainText("NaN");
    // await expect(page.locator(".kpi-value-large")).not.toContainText("undefined");
  });
});

// ──────────────────────────────────────────────
// 3. Tab Navigation
// ──────────────────────────────────────────────
test.describe("Tab Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // await login(page, "test@example.com", "testpassword123");
  });

  test("Overview tab is active by default", async ({ page }) => {
    // await page.goto(`${BASE_URL}/jobber/dashboard`);
    // await expect(page.locator('.nav-tab.active')).toContainText("Overview");
  });

  test("navigates to Sales tab", async ({ page }) => {
    // await page.click('text=Sales');
    // await expect(page).toHaveURL(/\/jobber\/sales/);
    // await expect(page.locator('.nav-tab.active')).toContainText("Sales");
  });

  test("navigates to Capacity tab", async ({ page }) => {
    // await page.click('text=Capacity');
    // await expect(page).toHaveURL(/\/jobber\/capacity/);
  });

  test("navigates to Invoices tab", async ({ page }) => {
    // await page.click('text=Invoices');
    // await expect(page).toHaveURL(/\/jobber\/invoices/);
  });

  test("navigates back to Overview from Sales", async ({ page }) => {
    // await page.goto(`${BASE_URL}/jobber/sales`);
    // await page.click('text=Overview');
    // await expect(page).toHaveURL(/\/jobber\/dashboard/);
  });

  test("preserves data state across tab switches", async ({ page }) => {
    // Navigate Overview -> Sales -> Overview
    // KPI values should still be correct on return
  });
});

// ──────────────────────────────────────────────
// 4. Sync Button Flow
// ──────────────────────────────────────────────
test.describe("Sync Button", () => {
  test.beforeEach(async ({ page }) => {
    // await login(page, "test@example.com", "testpassword123");
  });

  test("sync button is visible on dashboard", async ({ page }) => {
    // await expect(page.locator('button:has-text("Sync"), a:has-text("Sync")')).toBeVisible();
  });

  test("sync button shows loading state when clicked", async ({ page }) => {
    // await page.click('button:has-text("Sync")');
    // await expect(page.locator('.spin, [class*="spin"]')).toBeVisible();
  });

  test("sync button is disabled while sync is in progress", async ({ page }) => {
    // Prevent double-click during sync
    // await page.click('button:has-text("Sync")');
    // await expect(page.locator('button:has-text("Sync")')).toBeDisabled();
  });

  test("dashboard refreshes after sync completes", async ({ page }) => {
    // After sync, page should reload or update KPIs
    // await page.click('button:has-text("Sync")');
    // await page.waitForResponse(resp => resp.url().includes("/api/sync/run"));
    // Verify last sync time updates
  });

  test("shows error message if sync fails", async ({ page }) => {
    // Mock sync failure
    // Should display a user-friendly error, not crash
  });
});

// ──────────────────────────────────────────────
// 5. Period Toggle Interactions
// ──────────────────────────────────────────────
test.describe("Period Toggle", () => {
  test.beforeEach(async ({ page }) => {
    // await login(page, "test@example.com", "testpassword123");
  });

  test("displays period toggle buttons (30d, 90d, 12mo, All)", async ({ page }) => {
    // await expect(page.locator('button:has-text("30d")')).toBeVisible();
    // await expect(page.locator('button:has-text("90d")')).toBeVisible();
    // await expect(page.locator('button:has-text("12mo")')).toBeVisible();
    // await expect(page.locator('button:has-text("All")')).toBeVisible();
  });

  test("30d is the default period", async ({ page }) => {
    // The active toggle should be 30d by default
    // await expect(page.locator('button:has-text("30d")')).toHaveClass(/active|selected/);
  });

  test("switching to 90d updates charts and KPIs", async ({ page }) => {
    // await page.click('button:has-text("90d")');
    // Charts should re-render with broader date range
    // KPI values may change
  });

  test("switching to All shows all historical data", async ({ page }) => {
    // await page.click('button:has-text("All")');
    // Should not timeout or crash even with large datasets
  });

  test("period selection persists across page navigations", async ({ page }) => {
    // Select 90d, navigate to Sales, come back — should still be 90d
    // (or reset, depending on implementation — document actual behavior)
  });
});

// ──────────────────────────────────────────────
// 6. Light/Dark Mode Toggle
// ──────────────────────────────────────────────
test.describe("Light/Dark Mode", () => {
  test.beforeEach(async ({ page }) => {
    // await login(page, "test@example.com", "testpassword123");
  });

  test("defaults to dark mode", async ({ page }) => {
    // await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    // Or check body background is dark
  });

  test("toggles to light mode when theme button is clicked", async ({ page }) => {
    // await page.click('[aria-label="Toggle theme"], button:has(svg.lucide-sun)');
    // await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test("light mode applies correct styles to panels", async ({ page }) => {
    // Switch to light mode
    // await page.click('[aria-label="Toggle theme"]');
    // Verify panels have light background
    // const panel = page.locator('.panel').first();
    // const bg = await panel.evaluate(el => getComputedStyle(el).backgroundColor);
    // expect(bg).toMatch(/rgb\(255/); // white-ish
  });

  test("light mode applies correct styles to KPI cards", async ({ page }) => {
    // Verify KPI text is dark-colored in light mode
  });

  test("theme preference persists on page reload", async ({ page }) => {
    // Switch to light, reload, verify still light
    // await page.click('[aria-label="Toggle theme"]');
    // await page.reload();
    // await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test("theme preference persists across tab navigation", async ({ page }) => {
    // Switch to light on Overview, navigate to Sales, verify still light
  });
});

// ──────────────────────────────────────────────
// 7. Responsive Layout
// ──────────────────────────────────────────────
test.describe("Responsive Layout", () => {
  test("mobile viewport (375px) shows stacked KPI cards", async ({ page }) => {
    // await page.setViewportSize({ width: 375, height: 812 });
    // await login(page, "test@example.com", "testpassword123");
    // Verify KPIs are in single column
  });

  test("tablet viewport (768px) shows grid layout", async ({ page }) => {
    // await page.setViewportSize({ width: 768, height: 1024 });
    // Verify 2-column or 3-column grid
  });

  test("desktop viewport (1280px) shows full layout", async ({ page }) => {
    // await page.setViewportSize({ width: 1280, height: 900 });
    // Verify 3-column KPI grid, side-by-side panels
  });
});
