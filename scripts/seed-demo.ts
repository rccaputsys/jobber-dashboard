/**
 * Seed script: inserts realistic demo data into Supabase so the dashboard
 * displays all features (KPIs, action lists, trends, recommendations).
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts
 *
 * This creates a demo connection row + fact table data.
 * The demo user can view the dashboard at:
 *   /jobber/dashboard?admin_connection_id=<DEMO_CONNECTION_ID>
 *
 * To clean up:
 *   npx tsx scripts/seed-demo.ts --clean
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DEMO_CONNECTION_ID = "00000000-0000-0000-0000-de0000000001";
const DEMO_USER_ID = "00000000-0000-0000-0000-de0000000002";

const isClean = process.argv.includes("--clean");

// ─── Helpers ──────────────────────────────────────────────────────────

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86_400_000).toISOString();
}

function daysFromNow(d: number): string {
  return new Date(Date.now() + d * 86_400_000).toISOString();
}

/** Generate a deterministic valid UUID from a readable suffix. */
let _uuidCounter = 0;
const _uuidCache: Record<string, string> = {};
function uuid(suffix: string): string {
  if (_uuidCache[suffix]) return _uuidCache[suffix];
  _uuidCounter++;
  const hex = _uuidCounter.toString(16).padStart(12, "0");
  const id = `de000000-0000-0000-0000-${hex}`;
  _uuidCache[suffix] = id;
  return id;
}

// ─── Clean ────────────────────────────────────────────────────────────

async function clean() {
  console.log("Cleaning demo data...");
  const factTables = [
    "analytics_events",
    "fact_requests",
    "fact_quotes",
    "fact_invoices",
    "fact_jobs",
  ];
  for (const t of factTables) {
    const { error } = await supabase
      .from(t)
      .delete()
      .eq("connection_id", DEMO_CONNECTION_ID);
    if (error) console.error(`  ${t}: ${error.message}`);
    else console.log(`  ${t}: cleaned`);
  }
  // jobber_connections uses "id", not "connection_id"
  const { error: connCleanErr } = await supabase
    .from("jobber_connections")
    .delete()
    .eq("id", DEMO_CONNECTION_ID);
  if (connCleanErr) console.error(`  jobber_connections: ${connCleanErr.message}`);
  else console.log(`  jobber_connections: cleaned`);
  console.log("Done.");
}

// ─── Seed ─────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding demo data...");

  // 1. Connection row
  console.log("  jobber_connections...");
  const { error: connErr } = await supabase.from("jobber_connections").upsert(
    {
      id: DEMO_CONNECTION_ID,
      user_id: null,
      jobber_account_id: "demo-account-001",
      jobber_account_name: "Greenscape Lawn & Garden",
      company_name: "Greenscape Lawn & Garden",
      owner_name: "Ryan Caputo",
      billing_status: "trialing",
      currency_code: "USD",
      trial_started_at: daysAgo(1),
      trial_ends_at: daysFromNow(13),
      last_sync_at: daysAgo(0),
      job_count: 47,
      quote_count: 32,
      request_count: 8,
      unscheduled_job_count: 7,
      invoices_past_due_count: 9,
      invoices_past_due_cents: 484700,
      invoices_15plus_count: 5,
      invoices_15plus_cents: 215500,
      quote_leak_count: 8,
      quote_leak_cents: 1234000,
      last_sync_invoices: 42,
      last_sync_quotes: 32,
    },
    { onConflict: "id" },
  );
  if (connErr) throw new Error(`Connection: ${connErr.message}`);

  // 2. Jobs (mix of scheduled, unscheduled, completed)
  console.log("  fact_jobs...");
  const jobs = [
    // Completed jobs with costing (for profitability KPIs & trends)
    ...Array.from({ length: 20 }, (_, i) => ({
      connection_id: DEMO_CONNECTION_ID,
      jobber_job_id: uuid(`job-done-${i}`),
      job_number: 3800 + i,
      job_title: [
        "Weekly lawn maintenance",
        "Spring cleanup - front yard",
        "Hedge trimming & shaping",
        "Mulch delivery & spreading",
        "Leaf removal - full property",
        "Aeration & overseeding",
        "Flower bed installation",
        "Drainage assessment",
        "Sod installation - backyard",
        "Landscape lighting install",
        "Paver walkway repair",
        "Retaining wall build",
        "French drain install",
        "Tree removal - oak",
        "Stump grinding",
        "Fence staining",
        "Irrigation winterize",
        "Snow removal contract",
        "Seasonal color change",
        "Property grading",
      ][i],
      status: "completed",
      scheduled_start_at: daysAgo(50 - i * 2),
      scheduled_end_at: daysAgo(50 - i * 2),
      created_at_jobber: daysAgo(60 - i * 2),
      updated_at_jobber: daysAgo(48 - i * 2),
      total_amount_cents: [
        45000, 85000, 32000, 28000, 55000, 42000, 125000, 18500, 275000,
        95000, 38000, 180000, 145000, 62000, 28000, 35000, 22000, 48000,
        65000, 75000,
      ][i],
      job_revenue_cents: [
        45000, 85000, 32000, 28000, 55000, 42000, 125000, 18500, 275000,
        95000, 38000, 180000, 145000, 62000, 28000, 35000, 22000, 48000,
        65000, 75000,
      ][i],
      job_cost_cents: [
        18000, 42000, 12000, 14000, 22000, 18000, 55000, 8000, 135000,
        42000, 16000, 85000, 68000, 28000, 12000, 15000, 10000, 22000,
        28000, 32000,
      ][i],
      job_profit_cents: [
        27000, 43000, 20000, 14000, 33000, 24000, 70000, 10500, 140000,
        53000, 22000, 95000, 77000, 34000, 16000, 20000, 12000, 26000,
        37000, 43000,
      ][i],
      job_margin_pct: [
        0.6, 0.51, 0.63, 0.5, 0.6, 0.57, 0.56, 0.57, 0.51,
        0.56, 0.58, 0.53, 0.53, 0.55, 0.57, 0.57, 0.55, 0.54,
        0.57, 0.57,
      ][i],
      job_costing_updated_at: daysAgo(48 - i * 2),
    })),

    // Scheduled (active) jobs
    ...Array.from({ length: 10 }, (_, i) => ({
      connection_id: DEMO_CONNECTION_ID,
      jobber_job_id: uuid(`job-sched-${i}`),
      job_number: 3830 + i,
      job_title: [
        "Weekly mow - Thompson",
        "Fertilizer application",
        "Irrigation system check",
        "Patio cleaning - pressure wash",
        "Garden bed weeding",
        "Tree pruning - maple",
        "Gutter cleaning",
        "Deck staining",
        "Outdoor kitchen prep",
        "Pool area landscaping",
      ][i],
      status: "active",
      scheduled_start_at: daysFromNow(i + 1),
      scheduled_end_at: daysFromNow(i + 1),
      created_at_jobber: daysAgo(14 - i),
      updated_at_jobber: daysAgo(7 - Math.min(i, 6)),
      total_amount_cents: [
        15000, 32000, 22000, 45000, 18000, 55000, 28000, 62000, 85000, 125000,
      ][i],
    })),

    // Unscheduled jobs (shows in "Unscheduled" action list)
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_job_id: uuid("job-unsched-0"),
      job_number: 3847,
      job_title: "Spring cleanup & mulching",
      status: "active",
      scheduled_start_at: null,
      created_at_jobber: daysAgo(35),
      updated_at_jobber: daysAgo(35),
      total_amount_cents: 125000,
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_job_id: uuid("job-unsched-1"),
      job_number: 3851,
      job_title: "Irrigation system repair",
      status: "active",
      scheduled_start_at: null,
      created_at_jobber: daysAgo(32),
      updated_at_jobber: daysAgo(32),
      total_amount_cents: 85000,
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_job_id: uuid("job-unsched-2"),
      job_number: 3854,
      job_title: "Tree trimming - backyard oaks",
      status: "active",
      scheduled_start_at: null,
      created_at_jobber: daysAgo(28),
      updated_at_jobber: daysAgo(28),
      total_amount_cents: 45000,
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_job_id: uuid("job-unsched-3"),
      job_number: 3858,
      job_title: "Weekly maintenance setup",
      status: "active",
      scheduled_start_at: null,
      created_at_jobber: daysAgo(25),
      updated_at_jobber: daysAgo(25),
      total_amount_cents: 32000,
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_job_id: uuid("job-unsched-4"),
      job_number: 3861,
      job_title: "Fence line clearing",
      status: "active",
      scheduled_start_at: null,
      created_at_jobber: daysAgo(22),
      updated_at_jobber: daysAgo(22),
      total_amount_cents: 28000,
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_job_id: uuid("job-unsched-5"),
      job_number: 3864,
      job_title: "Landscape lighting - pathway",
      status: "active",
      scheduled_start_at: null,
      created_at_jobber: daysAgo(18),
      updated_at_jobber: daysAgo(18),
      total_amount_cents: 72000,
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_job_id: uuid("job-unsched-6"),
      job_number: 3867,
      job_title: "Retaining wall consultation",
      status: "active",
      scheduled_start_at: null,
      created_at_jobber: daysAgo(12),
      updated_at_jobber: daysAgo(12),
      total_amount_cents: 15000,
    },
  ];

  const { error: jobErr } = await supabase
    .from("fact_jobs")
    .upsert(jobs, { onConflict: "connection_id,jobber_job_id" });
  if (jobErr) throw new Error(`Jobs: ${jobErr.message}`);
  console.log(`    ${jobs.length} jobs inserted`);

  // 3. Invoices (mix of paid, overdue at various ages, fresh)
  console.log("  fact_invoices...");
  const invoices = [
    // Paid invoices (for history/trends)
    ...Array.from({ length: 15 }, (_, i) => ({
      connection_id: DEMO_CONNECTION_ID,
      jobber_invoice_id: uuid(`inv-paid-${i}`),
      invoice_number: `${1200 + i}`,
      client_name: [
        "Anderson Family", "Baker Residence", "Cooper HOA",
        "Davis Landscaping", "Evans Property", "Foster Home",
        "Garcia Estate", "Harris Commercial", "Ingram Office",
        "Jones Family", "Kim Residence", "Lee Property",
        "Morgan HOA", "Nelson Family", "O'Brien Estate",
      ][i],
      status: "paid",
      total_amount_cents: [
        45000, 85000, 125000, 32000, 55000, 28000, 95000, 62000,
        38000, 72000, 48000, 115000, 82000, 35000, 68000,
      ][i],
      balance_cents: 0,
      due_at: daysAgo(60 - i * 3),
      paid_at: daysAgo(55 - i * 3),
      created_at_jobber: daysAgo(70 - i * 3),
      updated_at_jobber: daysAgo(55 - i * 3),
      subject: "Completed work",
    })),

    // Overdue invoices 15+ days (triggers "Aged AR" section)
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_invoice_id: uuid("inv-overdue-0"),
      invoice_number: "1247",
      client_name: "Johnson Residence",
      status: "awaiting_payment",
      total_amount_cents: 85000,
      balance_cents: 85000,
      due_at: daysAgo(34),
      created_at_jobber: daysAgo(45),
      updated_at_jobber: daysAgo(34),
      subject: "Full landscape redesign",
      jobber_url: "https://secure.getjobber.com/invoices/demo1",
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_invoice_id: uuid("inv-overdue-1"),
      invoice_number: "1251",
      client_name: "Oakwood HOA",
      status: "awaiting_payment",
      total_amount_cents: 62500,
      balance_cents: 62500,
      due_at: daysAgo(28),
      created_at_jobber: daysAgo(40),
      updated_at_jobber: daysAgo(28),
      subject: "Monthly grounds maintenance",
      jobber_url: "https://secure.getjobber.com/invoices/demo2",
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_invoice_id: uuid("inv-overdue-2"),
      invoice_number: "1258",
      client_name: "Martinez Property",
      status: "awaiting_payment",
      total_amount_cents: 34500,
      balance_cents: 34500,
      due_at: daysAgo(21),
      created_at_jobber: daysAgo(35),
      updated_at_jobber: daysAgo(21),
      subject: "Tree removal and stump grinding",
      jobber_url: "https://secure.getjobber.com/invoices/demo3",
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_invoice_id: uuid("inv-overdue-3"),
      invoice_number: "1263",
      client_name: "Thompson Estate",
      status: "awaiting_payment",
      total_amount_cents: 18500,
      balance_cents: 18500,
      due_at: daysAgo(18),
      created_at_jobber: daysAgo(30),
      updated_at_jobber: daysAgo(18),
      subject: "Irrigation repair",
      jobber_url: "https://secure.getjobber.com/invoices/demo4",
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_invoice_id: uuid("inv-overdue-4"),
      invoice_number: "1267",
      client_name: "Riverside Church",
      status: "awaiting_payment",
      total_amount_cents: 15000,
      balance_cents: 15000,
      due_at: daysAgo(16),
      created_at_jobber: daysAgo(28),
      updated_at_jobber: daysAgo(16),
      subject: "Parking lot cleanup",
      jobber_url: "https://secure.getjobber.com/invoices/demo5",
    },

    // Overdue 8-14 days
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_invoice_id: uuid("inv-overdue-5"),
      invoice_number: "1272",
      client_name: "Westlake Apartments",
      status: "awaiting_payment",
      total_amount_cents: 145000,
      balance_cents: 145000,
      due_at: daysAgo(12),
      created_at_jobber: daysAgo(24),
      updated_at_jobber: daysAgo(12),
      subject: "Common area landscaping",
      jobber_url: "https://secure.getjobber.com/invoices/demo6",
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_invoice_id: uuid("inv-overdue-6"),
      invoice_number: "1275",
      client_name: "Park View Dental",
      status: "awaiting_payment",
      total_amount_cents: 38000,
      balance_cents: 38000,
      due_at: daysAgo(9),
      created_at_jobber: daysAgo(21),
      updated_at_jobber: daysAgo(9),
      subject: "Office exterior maintenance",
      jobber_url: "https://secure.getjobber.com/invoices/demo7",
    },

    // Overdue 1-7 days (triggers "hitting 7 days" recommendation)
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_invoice_id: uuid("inv-overdue-7"),
      invoice_number: "1280",
      client_name: "Summit Real Estate",
      status: "awaiting_payment",
      total_amount_cents: 52000,
      balance_cents: 52000,
      due_at: daysAgo(5),
      created_at_jobber: daysAgo(18),
      updated_at_jobber: daysAgo(5),
      subject: "Property showing prep",
      jobber_url: "https://secure.getjobber.com/invoices/demo8",
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_invoice_id: uuid("inv-overdue-8"),
      invoice_number: "1283",
      client_name: "Hillcrest Academy",
      status: "awaiting_payment",
      total_amount_cents: 34200,
      balance_cents: 34200,
      due_at: daysAgo(3),
      created_at_jobber: daysAgo(15),
      updated_at_jobber: daysAgo(3),
      subject: "Sports field maintenance",
      jobber_url: "https://secure.getjobber.com/invoices/demo9",
    },
  ];

  const { error: invErr } = await supabase
    .from("fact_invoices")
    .upsert(invoices, { onConflict: "connection_id,jobber_invoice_id" });
  if (invErr) throw new Error(`Invoices: ${invErr.message}`);
  console.log(`    ${invoices.length} invoices inserted`);

  // 4. Quotes (mix of won, lost, awaiting, changes_requested, approved)
  console.log("  fact_quotes...");
  const quotes = [
    // Won quotes (for Quote Won % KPI)
    ...Array.from({ length: 11 }, (_, i) => ({
      connection_id: DEMO_CONNECTION_ID,
      jobber_quote_id: uuid(`quote-won-${i}`),
      quote_number: `Q-${850 + i}`,
      quote_title: [
        "Lawn care package", "Hedge trimming", "Garden bed refresh",
        "Fertilization plan", "Mulch delivery", "Leaf cleanup",
        "Tree pruning", "Flower planting", "Weed control",
        "Edging & borders", "Spring prep package",
      ][i],
      quote_status: "approved",
      quote_total_cents: [
        48000, 22000, 35000, 28000, 18000, 42000,
        55000, 32000, 25000, 15000, 68000,
      ][i],
      sent_at: daysAgo(28 - i),
      created_at_jobber: daysAgo(30 - i),
      updated_at_jobber: daysAgo(25 - i),
      quote_url: "https://secure.getjobber.com/quotes/demo",
    })),

    // Lost/rejected quotes (for Quote Won % denominator)
    ...Array.from({ length: 6 }, (_, i) => ({
      connection_id: DEMO_CONNECTION_ID,
      jobber_quote_id: uuid(`quote-lost-${i}`),
      quote_number: `Q-${870 + i}`,
      quote_title: [
        "Driveway repaving", "Backyard pond", "Outdoor kitchen",
        "Hot tub surround", "Fence replacement", "Deck expansion",
      ][i],
      quote_status: "rejected",
      quote_total_cents: [85000, 125000, 195000, 68000, 95000, 145000][i],
      sent_at: daysAgo(22 - i * 2),
      created_at_jobber: daysAgo(24 - i * 2),
      updated_at_jobber: daysAgo(18 - i * 2),
      quote_url: "https://secure.getjobber.com/quotes/demo",
    })),

    // Leaking quotes — sent but no response (shows in Quote Leak KPI + action list)
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_quote_id: uuid("quote-leak-0"),
      quote_number: "Q-892",
      quote_title: "Full landscape redesign",
      quote_status: "awaiting_response",
      quote_total_cents: 485000,
      sent_at: daysAgo(42),
      created_at_jobber: daysAgo(45),
      updated_at_jobber: daysAgo(42),
      quote_url: "https://secure.getjobber.com/quotes/demo-leak1",
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_quote_id: uuid("quote-leak-1"),
      quote_number: "Q-897",
      quote_title: "Patio & retaining wall",
      quote_status: "awaiting_response",
      quote_total_cents: 325000,
      sent_at: daysAgo(38),
      created_at_jobber: daysAgo(40),
      updated_at_jobber: daysAgo(38),
      quote_url: "https://secure.getjobber.com/quotes/demo-leak2",
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_quote_id: uuid("quote-leak-2"),
      quote_number: "Q-901",
      quote_title: "Drainage solution - side yard",
      quote_status: "awaiting_response",
      quote_total_cents: 175000,
      sent_at: daysAgo(35),
      created_at_jobber: daysAgo(37),
      updated_at_jobber: daysAgo(35),
      quote_url: "https://secure.getjobber.com/quotes/demo-leak3",
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_quote_id: uuid("quote-leak-3"),
      quote_number: "Q-904",
      quote_title: "Seasonal flower installation",
      quote_status: "awaiting_response",
      quote_total_cents: 125000,
      sent_at: daysAgo(31),
      created_at_jobber: daysAgo(33),
      updated_at_jobber: daysAgo(31),
      quote_url: "https://secure.getjobber.com/quotes/demo-leak4",
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_quote_id: uuid("quote-leak-4"),
      quote_number: "Q-908",
      quote_title: "Lawn renovation & seeding",
      quote_status: "awaiting_response",
      quote_total_cents: 124000,
      sent_at: daysAgo(26),
      created_at_jobber: daysAgo(28),
      updated_at_jobber: daysAgo(26),
      quote_url: "https://secure.getjobber.com/quotes/demo-leak5",
    },

    // Changes requested (shows in "Quotes to revise" recommendation)
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_quote_id: uuid("quote-change-0"),
      quote_number: "Q-912",
      quote_title: "Pergola installation - revised scope",
      quote_status: "changes_requested",
      quote_total_cents: 285000,
      sent_at: daysAgo(14),
      created_at_jobber: daysAgo(16),
      updated_at_jobber: daysAgo(10),
      quote_url: "https://secure.getjobber.com/quotes/demo-change1",
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_quote_id: uuid("quote-change-1"),
      quote_number: "Q-915",
      quote_title: "Front walkway redesign",
      quote_status: "changes_requested",
      quote_total_cents: 165000,
      sent_at: daysAgo(10),
      created_at_jobber: daysAgo(12),
      updated_at_jobber: daysAgo(7),
      quote_url: "https://secure.getjobber.com/quotes/demo-change2",
    },

    // Draft quotes (should be excluded from leak calculation)
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_quote_id: uuid("quote-draft-0"),
      quote_number: "Q-920",
      quote_title: "Pool area hardscape - draft",
      quote_status: "draft",
      quote_total_cents: 450000,
      sent_at: null,
      created_at_jobber: daysAgo(3),
      updated_at_jobber: daysAgo(3),
    },
  ];

  const { error: quoteErr } = await supabase
    .from("fact_quotes")
    .upsert(quotes, { onConflict: "connection_id,jobber_quote_id" });
  if (quoteErr) throw new Error(`Quotes: ${quoteErr.message}`);
  console.log(`    ${quotes.length} quotes inserted`);

  // 5. Requests (open requests show in action list)
  console.log("  fact_requests...");
  const requests = [
    // Open requests
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_request_id: uuid("req-0"),
      title: "New lawn care estimate",
      request_status: "new",
      source: "website",
      client_name: "Sarah Mitchell",
      contact_name: "Sarah Mitchell",
      email: "sarah@example.com",
      phone: "555-0101",
      jobber_url: "https://secure.getjobber.com/requests/demo1",
      created_at_jobber: daysAgo(1),
      synced_at: new Date().toISOString(),
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_request_id: uuid("req-1"),
      title: "Spring cleanup quote needed",
      request_status: "new",
      source: "phone",
      client_name: "Oak Valley HOA",
      contact_name: "Tom Anderson",
      email: "tom@oakvalley.com",
      phone: "555-0202",
      jobber_url: "https://secure.getjobber.com/requests/demo2",
      created_at_jobber: daysAgo(3),
      synced_at: new Date().toISOString(),
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_request_id: uuid("req-2"),
      title: "Irrigation repair assessment",
      request_status: "new",
      source: "website",
      client_name: "Tom Henderson",
      contact_name: "Tom Henderson",
      email: "tom.h@example.com",
      phone: "555-0303",
      jobber_url: "https://secure.getjobber.com/requests/demo3",
      created_at_jobber: daysAgo(5),
      synced_at: new Date().toISOString(),
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_request_id: uuid("req-3"),
      title: "Backyard transformation consultation",
      request_status: "assessment_completed",
      source: "referral",
      client_name: "Lisa Chen",
      contact_name: "Lisa Chen",
      email: "lisa@example.com",
      phone: "555-0404",
      jobber_url: "https://secure.getjobber.com/requests/demo4",
      created_at_jobber: daysAgo(7),
      synced_at: new Date().toISOString(),
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_request_id: uuid("req-4"),
      title: "Commercial property maintenance bid",
      request_status: "pending",
      source: "website",
      client_name: "Riverstone Office Park",
      contact_name: "Mark Williams",
      email: "mark@riverstone.com",
      phone: "555-0505",
      jobber_url: "https://secure.getjobber.com/requests/demo5",
      created_at_jobber: daysAgo(10),
      synced_at: new Date().toISOString(),
    },

    // Closed requests (should not show in action list)
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_request_id: uuid("req-closed-0"),
      title: "Hedge trimming estimate",
      request_status: "converted",
      source: "phone",
      client_name: "Dave Brown",
      contact_name: "Dave Brown",
      created_at_jobber: daysAgo(20),
      synced_at: new Date().toISOString(),
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_request_id: uuid("req-closed-1"),
      title: "Fall leaf removal",
      request_status: "archived",
      source: "website",
      client_name: "Maple Street HOA",
      contact_name: "Jane Smith",
      created_at_jobber: daysAgo(45),
      synced_at: new Date().toISOString(),
    },
    {
      connection_id: DEMO_CONNECTION_ID,
      jobber_request_id: uuid("req-closed-2"),
      title: "Snow removal pricing",
      request_status: "closed",
      source: "phone",
      client_name: "Greg Wilson",
      contact_name: "Greg Wilson",
      created_at_jobber: daysAgo(60),
      synced_at: new Date().toISOString(),
    },
  ];

  const { error: reqErr } = await supabase
    .from("fact_requests")
    .upsert(requests, { onConflict: "connection_id,jobber_request_id" });
  if (reqErr) throw new Error(`Requests: ${reqErr.message}`);
  console.log(`    ${requests.length} requests inserted`);

  // 6. Analytics events — SKIPPED for demo account
  // Demo account should not pollute admin analytics (DAU, WAU, engagement).
  // The per-user analytics endpoint still works (returns empty data).
  console.log("  analytics_events: skipped (demo account excluded from analytics)");

  console.log("\nDone! Demo connection ID:", DEMO_CONNECTION_ID);
  console.log(
    "View dashboard: /jobber/dashboard?admin_connection_id=" +
      DEMO_CONNECTION_ID,
  );
  console.log("View in admin: /admin");
}

// ─── Main ─────────────────────────────────────────────────────────────

(async () => {
  try {
    if (isClean) {
      await clean();
    } else {
      await clean(); // clean first to avoid duplicates
      await seed();
    }
  } catch (err: any) {
    console.error("Error:", err.message);
    process.exit(1);
  }
})();
