// src/app/api/billing/init-trial/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connection_id");
  if (!connectionId) {
    return NextResponse.json({ ok: false, error: "Missing connection_id" }, { status: 400 });
  }

  const now = new Date();
  const ends = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // Only set trial fields if not already set
  const { data: existing, error: selErr } = await supabaseAdmin
    .from("jobber_connections")
    .select("trial_started_at,trial_ends_at,billing_status")
    .eq("id", connectionId)
    .maybeSingle();

  if (selErr) return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Connection not found" }, { status: 404 });
  }

  const needsInit = !existing.trial_started_at || !existing.trial_ends_at;

  if (needsInit) {
    const { error } = await supabaseAdmin
      .from("jobber_connections")
      .update({
        trial_started_at: now.toISOString(),
        trial_ends_at: ends.toISOString(),
        billing_status: existing.billing_status ?? "trialing",
      })
      .eq("id", connectionId);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      initialized: true,
      trial_started_at: now.toISOString(),
      trial_ends_at: ends.toISOString(),
      billing_status: "trialing",
    });
  }

  return NextResponse.json({
    ok: true,
    initialized: false,
    trial_started_at: existing.trial_started_at,
    trial_ends_at: existing.trial_ends_at,
    billing_status: existing.billing_status ?? "trialing",
  });
}
