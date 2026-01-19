// scripts/seed-demo-data.ts
// Run with: npx tsx scripts/seed-demo-data.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure .env.local has:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=...');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=...');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDemoData() {
  console.log('🌱 Seeding demo data...');

  // Use a valid UUID for demo connection (proper format: 8-4-4-4-12 hex digits)
  const demoConnectionId = 'd3f40000-0000-0000-0000-000000000001';

  // Create demo connection
  const { data: conn, error: connError } = await supabase
    .from('jobber_connections')
    .upsert({
      id: demoConnectionId,
      jobber_account_id: 'demo-account-12345',
      company_name: 'ABC Home Services',
      company_logo_url: 'https://placehold.co/200x200/5A6FFF/FFF?text=ABC',
      last_sync_at: new Date().toISOString(),
      currency_code: 'USD',
      trial_started_at: new Date().toISOString(),
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      billing_status: 'trial',
    }, { onConflict: 'id' })
    .select()
    .single();

  if (connError) {
    console.error('Error creating demo connection:', connError);
    return;
  }

  console.log('✅ Created demo connection');

  const connectionId = demoConnectionId;

  // Clear existing demo data
  await supabase.from('fact_invoices').delete().eq('connection_id', connectionId);
  await supabase.from('fact_jobs').delete().eq('connection_id', connectionId);
  await supabase.from('fact_quotes').delete().eq('connection_id', connectionId);

  console.log('🧹 Cleared old demo data');

  // Generate Invoices (some aged)
  const invoices = [];
  const now = Date.now();
  
  // 8 current invoices (0-7 days overdue)
  for (let i = 0; i < 8; i++) {
    invoices.push({
      connection_id: connectionId,
      jobber_invoice_id: `demo-inv-current-${i}`,
      invoice_number: `INV-${1000 + i}`,
      total_amount_cents: Math.floor(Math.random() * 500000) + 50000, // $500-$5000
      due_at: new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at_jobber: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at_jobber: new Date().toISOString(),
      jobber_url: `https://secure.getjobber.com/invoices/demo-inv-current-${i}`,
    });
  }

  // 5 invoices 8-14 days overdue
  for (let i = 0; i < 5; i++) {
    invoices.push({
      connection_id: connectionId,
      jobber_invoice_id: `demo-inv-med-${i}`,
      invoice_number: `INV-${1100 + i}`,
      total_amount_cents: Math.floor(Math.random() * 300000) + 100000, // $1000-$4000
      due_at: new Date(now - (8 + Math.random() * 6) * 24 * 60 * 60 * 1000).toISOString(),
      created_at_jobber: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at_jobber: new Date().toISOString(),
      jobber_url: `https://secure.getjobber.com/invoices/demo-inv-med-${i}`,
    });
  }

  // Create invoices that become 15+ days old at different points in the 8-week window
  // This creates a trend where AR15+ grows over time
  const invoiceAges = [16, 18, 20, 22, 25, 28, 32, 35, 38, 42, 45, 48, 52, 55];
  for (let i = 0; i < invoiceAges.length; i++) {
    const daysOverdue = invoiceAges[i];
    invoices.push({
      connection_id: connectionId,
      jobber_invoice_id: `demo-inv-aged15-${i}`,
      invoice_number: `INV-${1200 + i}`,
      total_amount_cents: Math.floor(Math.random() * 400000) + 150000, // $1500-$5500
      due_at: new Date(now - daysOverdue * 24 * 60 * 60 * 1000).toISOString(),
      created_at_jobber: new Date(now - (daysOverdue + 10) * 24 * 60 * 60 * 1000).toISOString(),
      updated_at_jobber: new Date().toISOString(),
      jobber_url: `https://secure.getjobber.com/invoices/demo-inv-aged15-${i}`,
    });
  }

  const { error: invError } = await supabase.from('fact_invoices').insert(invoices);
  if (invError) console.error('Invoice error:', invError);
  else {
    console.log(`✅ Created ${invoices.length} demo invoices`);
    const aged15Count = invoices.filter(inv => {
      const daysOverdue = Math.round((Date.now() - new Date(inv.due_at).getTime()) / 86400000);
      return daysOverdue >= 15;
    }).length;
    console.log(`   📊 ${aged15Count} invoices are 15+ days overdue`);
  }

  // Generate Jobs
  const jobs = [];
  
  // 20 scheduled jobs (booked 3-21 days ahead for variety)
  for (let i = 0; i < 20; i++) {
    const daysAhead = 3 + Math.random() * 18;
    jobs.push({
      connection_id: connectionId,
      jobber_job_id: `demo-job-scheduled-${i}`,
      job_number: 2000 + i,
      job_title: `${['HVAC', 'Plumbing', 'Electrical', 'Landscaping'][Math.floor(Math.random() * 4)]} - ${['Service', 'Repair', 'Installation', 'Inspection', 'Maintenance'][Math.floor(Math.random() * 5)]}`,
      status: 'scheduled',
      scheduled_start_at: new Date(now + daysAhead * 24 * 60 * 60 * 1000).toISOString(),
      created_at_jobber: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at_jobber: new Date().toISOString(),
      jobber_url: `https://secure.getjobber.com/jobs/demo-job-scheduled-${i}`,
    });
  }

  // Create unscheduled jobs spread over the 8-week period
  // This creates a trend where backlog grows over time
  const unscheduledAges = [2, 4, 6, 8, 10, 12, 15, 18, 21, 24, 28, 32, 36, 40, 45, 50, 54];
  for (let i = 0; i < unscheduledAges.length; i++) {
    const daysOld = unscheduledAges[i];
    jobs.push({
      connection_id: connectionId,
      jobber_job_id: `demo-job-unscheduled-${i}`,
      job_number: 2100 + i,
      job_title: `${['Plumbing', 'Electrical', 'HVAC', 'Landscaping', 'Roofing'][Math.floor(Math.random() * 5)]} - Needs Scheduling`,
      status: 'unscheduled',
      scheduled_start_at: null,
      created_at_jobber: new Date(now - daysOld * 24 * 60 * 60 * 1000).toISOString(),
      updated_at_jobber: new Date().toISOString(),
      jobber_url: `https://secure.getjobber.com/jobs/demo-job-unscheduled-${i}`,
    });
  }

  // 30 completed jobs (spread over last 8 weeks for trend charts)
  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 56);
    const revenue = Math.floor(Math.random() * 300000) + 100000; // $1000-$4000
    const cost = Math.floor(revenue * (0.5 + Math.random() * 0.3)); // 50-80% cost
    const profit = revenue - cost;
    
    jobs.push({
      connection_id: connectionId,
      jobber_job_id: `demo-job-completed-${i}`,
      job_number: 3000 + i,
      job_title: `Completed ${['Service Call', 'Installation', 'Repair', 'Maintenance', 'Emergency'][Math.floor(Math.random() * 5)]}`,
      status: 'completed',
      job_revenue_cents: revenue,
      job_cost_cents: cost,
      job_profit_cents: profit,
      created_at_jobber: new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      updated_at_jobber: new Date().toISOString(),
    });
  }

  const { error: jobError } = await supabase.from('fact_jobs').insert(jobs);
  if (jobError) console.error('Job error:', jobError);
  else {
    console.log(`✅ Created ${jobs.length} demo jobs`);
    const unscheduledCount = jobs.filter(j => !j.scheduled_start_at).length;
    console.log(`   📊 ${unscheduledCount} jobs are unscheduled`);
  }

  // Generate Quotes
  const quotes = [];
  
  // 8 converted quotes (won deals)
  for (let i = 0; i < 8; i++) {
    const daysAgo = Math.floor(Math.random() * 40);
    quotes.push({
      connection_id: connectionId,
      jobber_quote_id: `demo-quote-won-${i}`,
      quote_number: `Q-${4000 + i}`,
      quote_title: `${['HVAC System', 'Water Heater', 'AC Unit', 'Furnace', 'Heat Pump'][Math.floor(Math.random() * 5)]} Installation`,
      quote_status: 'converted',
      quote_total_cents: Math.floor(Math.random() * 500000) + 200000,
      sent_at: new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      created_at_jobber: new Date(now - (daysAgo + 5) * 24 * 60 * 60 * 1000).toISOString(),
      updated_at_jobber: new Date().toISOString(),
      quote_url: `https://secure.getjobber.com/quotes/demo-quote-won-${i}`,
    });
  }

  // Create leaking quotes spread over the 8-week period
  // This creates a trend where leak $ grows over time
  const leakAges = [5, 8, 10, 12, 15, 18, 21, 25, 28, 32, 36, 40, 45, 50, 54];
  for (let i = 0; i < leakAges.length; i++) {
    const daysAgo = leakAges[i];
    quotes.push({
      connection_id: connectionId,
      jobber_quote_id: `demo-quote-leak-${i}`,
      quote_number: `Q-${4100 + i}`,
      quote_title: `${['HVAC System Replacement', 'Plumbing Overhaul', 'Electrical Upgrade', 'Landscaping Project', 'Roof Repair', 'Kitchen Remodel'][Math.floor(Math.random() * 6)]}`,
      quote_status: 'awaiting_response',
      quote_total_cents: Math.floor(Math.random() * 800000) + 150000, // $1500-$9500
      sent_at: new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      created_at_jobber: new Date(now - (daysAgo + 3) * 24 * 60 * 60 * 1000).toISOString(),
      updated_at_jobber: new Date().toISOString(),
      quote_url: `https://secure.getjobber.com/quotes/demo-quote-leak-${i}`,
    });
  }

  // 4 quotes with changes requested (hot leads!)
  for (let i = 0; i < 4; i++) {
    quotes.push({
      connection_id: connectionId,
      jobber_quote_id: `demo-quote-changes-${i}`,
      quote_number: `Q-${4200 + i}`,
      quote_title: `${['Commercial HVAC', 'Multi-Unit Plumbing', 'Panel Upgrade'][Math.floor(Math.random() * 3)]} - Revision Needed`,
      quote_status: 'changes_requested',
      quote_total_cents: Math.floor(Math.random() * 400000) + 200000,
      sent_at: new Date(now - (3 + Math.random() * 12) * 24 * 60 * 60 * 1000).toISOString(),
      created_at_jobber: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at_jobber: new Date().toISOString(),
      quote_url: `https://secure.getjobber.com/quotes/demo-quote-changes-${i}`,
    });
  }

  // 5 archived quotes (should NOT show in leak)
  for (let i = 0; i < 5; i++) {
    quotes.push({
      connection_id: connectionId,
      jobber_quote_id: `demo-quote-archived-${i}`,
      quote_number: `Q-${4300 + i}`,
      quote_title: 'Old Archived Quote',
      quote_status: 'archived',
      quote_total_cents: Math.floor(Math.random() * 300000) + 100000,
      sent_at: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(),
      created_at_jobber: new Date(now - 65 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at_jobber: new Date().toISOString(),
      quote_url: `https://secure.getjobber.com/quotes/demo-quote-archived-${i}`,
    });
  }

  // 3 draft quotes (should NOT show in leak)
  for (let i = 0; i < 3; i++) {
    quotes.push({
      connection_id: connectionId,
      jobber_quote_id: `demo-quote-draft-${i}`,
      quote_number: `Q-${4400 + i}`,
      quote_title: 'Draft Quote - Not Sent Yet',
      quote_status: 'draft',
      quote_total_cents: Math.floor(Math.random() * 250000) + 100000,
      sent_at: null,
      created_at_jobber: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at_jobber: new Date().toISOString(),
      quote_url: `https://secure.getjobber.com/quotes/demo-quote-draft-${i}`,
    });
  }

  const { error: quoteError } = await supabase.from('fact_quotes').insert(quotes);
  if (quoteError) console.error('Quote error:', quoteError);
  else console.log(`✅ Created ${quotes.length} demo quotes`);

  console.log('\n🎉 Demo data seeded successfully!');
  console.log('\n📊 Test your dashboard at:');
  console.log('http://localhost:3000/dashboard?connection_id=d3f40000-0000-0000-0000-000000000001');
  console.log('\n✅ Expected results:');
  console.log('');
  console.log('📍 Company Info:');
  console.log('  - Company Name: ABC Home Services');
  console.log('  - Logo: Placeholder with "ABC"');
  console.log('');
  console.log('💰 Financial KPIs:');
  console.log('  - Total AR: ~$70,000-$120,000');
  console.log('  - AR 15+ Days: ~$35,000-$60,000 (14 invoices in table)');
  console.log('  - Quote Leak: ~$45,000-$80,000 (15 quotes in table)');
  console.log('');
  console.log('📊 Operations KPIs:');
  console.log('  - Days Booked Ahead: ~18-21 days');
  console.log('  - Unscheduled Jobs: 17 jobs in table');
  console.log('  - Changes Requested: 4 quotes');
  console.log('');
  console.log('📈 Trends (8-week view with VISIBLE GROWTH):');
  console.log('  - Quote Leak: CUMULATIVE growth as quotes leak over time');
  console.log('  - AR 15+: CUMULATIVE growth as invoices age');
  console.log('  - Unscheduled Jobs: CUMULATIVE growth as backlog builds');
  console.log('  ⚡ All trends show upward curves (problems growing)');
  console.log('');
  console.log('📋 CSV Exports:');
  console.log('  - AR 15+: 14 invoices with Jobber URLs');
  console.log('  - Unscheduled Jobs: 17 jobs with details');
  console.log('  - Leaking Quotes: 15 quotes sorted by value');
  console.log('');
  console.log('🎯 Test Features:');
  console.log('  ✓ Change date ranges (day/week/month) - watch trends adjust');
  console.log('  ✓ Export all 3 CSV files');
  console.log('  ✓ Check graph Y-axis (rounded $100s)');
  console.log('  ✓ Check graph labels don\'t overlap');
  console.log('  ✓ Verify company name in title');
  console.log('  ✓ Confirm KPIs don\'t change with date filter');
  console.log('  ✓ Test Controls in Trends section');
  console.log('  ✓ Verify cumulative trends (should go UP over time)');
}

seedDemoData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error seeding demo data:', err);
    process.exit(1);
  });