// src/app/api/settings/capacity/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUser } from "@/lib/supabaseAuth";

export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Support admin reading a specific connection
    const url = new URL(req.url);
    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);
    const isAdmin = ADMIN_EMAILS.includes(user.email || "");
    const connectionId = isAdmin ? url.searchParams.get("connection_id") : null;

    const eqField = connectionId ? "id" : "user_id";
    const eqValue = connectionId || user.id;

    const { data: conn } = await supabaseAdmin
      .from("jobber_connections")
      .select("id,weekly_capacity_cents,monthly_capacity_cents,capacity_daily_targets,capacity_work_days,capacity_targets_set,annual_sales_target_cents,close_rate_target")
      .eq(eqField, eqValue)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      weekly_capacity_cents: conn?.weekly_capacity_cents ?? null,
      monthly_capacity_cents: (conn as any)?.monthly_capacity_cents ?? null,
      capacity_daily_targets: (conn as any)?.capacity_daily_targets ?? {},
      capacity_work_days: (conn as any)?.capacity_work_days ?? ["Mon", "Tue", "Wed", "Thu", "Fri"],
      capacity_targets_set: (conn as any)?.capacity_targets_set ?? false,
      annual_sales_target_cents: (conn as any)?.annual_sales_target_cents ?? null,
      close_rate_target: (conn as any)?.close_rate_target ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Support admin setting target for a specific connection
    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);
    const isAdmin = ADMIN_EMAILS.includes(user.email || "");
    const connectionId = isAdmin && body.connection_id ? body.connection_id : null;
    const eqField = connectionId ? "id" : "user_id";
    const eqValue = connectionId || user.id;

    // Sanity bounds — reject negative or absurdly large values. Max cents
    // is 100 billion ($1B) which is well beyond any realistic service
    // business. Prevents DB pollution from a fat-fingered or malicious input.
    const MAX_CENTS = 100_000_000_000; // $1,000,000,000
    const boundedCents = (v: unknown): number | null => {
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
      const n = Math.round(v);
      if (n < 0 || n > MAX_CENTS) return null;
      return n;
    };
    const boundedRate = (v: unknown): number | null => {
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
      if (v < 0 || v > 1) return null;
      return v;
    };

    // Build update object with only provided fields
    const update: Record<string, any> = {};

    if ("weekly_capacity_cents" in body) {
      update.weekly_capacity_cents = boundedCents(body.weekly_capacity_cents);
    }
    if ("monthly_capacity_cents" in body) {
      update.monthly_capacity_cents = boundedCents(body.monthly_capacity_cents);
    }
    if ("capacity_daily_targets" in body) {
      update.capacity_daily_targets = body.capacity_daily_targets || {};
    }
    if ("capacity_work_days" in body) {
      update.capacity_work_days = body.capacity_work_days || ["Mon", "Tue", "Wed", "Thu", "Fri"];
    }
    if ("capacity_targets_set" in body) {
      update.capacity_targets_set = !!body.capacity_targets_set;
    }
    if ("annual_sales_target_cents" in body) {
      update.annual_sales_target_cents = boundedCents(body.annual_sales_target_cents);
    }
    if ("close_rate_target" in body) {
      update.close_rate_target = boundedRate(body.close_rate_target);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("jobber_connections")
      .update(update)
      .eq(eqField, eqValue);

    if (error) throw error;

    return NextResponse.json({ ok: true, ...update });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
