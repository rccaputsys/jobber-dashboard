// src/app/api/metrics/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connection_id");

  if (!connectionId) {
    return NextResponse.json(
      { ok: false, error: "Missing connection_id" },
      { status: 400 }
    );
  }

  const demoMode = (process.env.DEMO_MODE ?? "0") === "1";

  // Pull last sync info (always exists now)
  const { data: conn, error: connErr } = await supabaseAdmin
    .from("jobber_connections")
    .select("last_sync_at,last_sync_invoices,last_sync_quotes")
    .eq("id", connectionId)
    .maybeSingle();

  if (connErr) {
    return NextResponse.json({ ok: false, error: connErr.message }, { status: 500 });
  }

  // Demo mode: fabricate a 30-day series if no real invoices
  if (demoMode && (conn?.last_sync_invoices ?? 0) === 0) {
    const today = new Date();
    const series: Array<{ day: string; invoiced_cents: number; overdue_cents: number }> = [];

    for (let i = 29; i >= 0; i--) {
      const day = dayKey(addDays(today, -i));
      const base = 120000 + (i % 7) * 15000; // deterministic-ish
      const invoiced = i % 6 === 0 ? base * 2 : base;
      const overdue = i % 9 === 0 ? 45000 : 0;
      series.push({ day, invoiced_cents: invoiced, overdue_cents: overdue });
    }

    const total30 = series.reduce((s, r) => s + r.invoiced_cents, 0);
    const overdue30 = series.reduce((s, r) => s + r.overdue_cents, 0);

    return NextResponse.json({
      ok: true,
      demo: true,
      last_sync_at: conn?.last_sync_at ?? null,
      last_sync_invoices: conn?.last_sync_invoices ?? 0,
      last_sync_quotes: conn?.last_sync_quotes ?? 0,
      kpis: {
        invoiced_30d_cents: total30,
        overdue_30d_cents: overdue30,
        invoice_count_30d: 0,
        quote_count_30d: 0,
      },
      series,
    });
  }

  // Real mode: query invoices (will be empty until Jobber has invoices)
  const since = addDays(new Date(), -30).toISOString();

  const { data: invRows, error: invErr } = await supabaseAdmin
    .from("fact_invoices")
    .select("created_at_jobber,due_at,total_amount_cents")
    .eq("connection_id", connectionId)
    .gte("created_at_jobber", since);

  if (invErr) {
    return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  }

  const invoiceCount = invRows?.length ?? 0;
  const total30 = (invRows ?? []).reduce((s, r) => s + (r.total_amount_cents ?? 0), 0);

  const now = Date.now();
  const overdue30 = (invRows ?? []).reduce((s, r) => {
    const due = r.due_at ? new Date(r.due_at).getTime() : NaN;
    if (!Number.isNaN(due) && due < now) return s + (r.total_amount_cents ?? 0);
    return s;
  }, 0);

  // Daily series
  const map = new Map<string, { invoiced_cents: number; overdue_cents: number }>();
  for (const r of invRows ?? []) {
    if (!r.created_at_jobber) continue;
    const day = String(r.created_at_jobber).slice(0, 10);
    if (!map.has(day)) map.set(day, { invoiced_cents: 0, overdue_cents: 0 });
    map.get(day)!.invoiced_cents += r.total_amount_cents ?? 0;

    const due = r.due_at ? new Date(r.due_at).getTime() : NaN;
    if (!Number.isNaN(due) && due < now) map.get(day)!.overdue_cents += r.total_amount_cents ?? 0;
  }

  const series = Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, v]) => ({ day, ...v }));

  return NextResponse.json({
    ok: true,
    demo: false,
    last_sync_at: conn?.last_sync_at ?? null,
    last_sync_invoices: conn?.last_sync_invoices ?? 0,
    last_sync_quotes: conn?.last_sync_quotes ?? 0,
    kpis: {
      invoiced_30d_cents: total30,
      overdue_30d_cents: overdue30,
      invoice_count_30d: invoiceCount,
      quote_count_30d: 0,
    },
    series,
  });
}
