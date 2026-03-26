// src/app/api/settings/capacity/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUser } from "@/lib/supabaseAuth";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: conn } = await supabaseAdmin
      .from("jobber_connections")
      .select("weekly_capacity_cents,monthly_capacity_cents,capacity_daily_targets,capacity_work_days,capacity_targets_set")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      weekly_capacity_cents: conn?.weekly_capacity_cents ?? null,
      monthly_capacity_cents: (conn as any)?.monthly_capacity_cents ?? null,
      capacity_daily_targets: (conn as any)?.capacity_daily_targets ?? {},
      capacity_work_days: (conn as any)?.capacity_work_days ?? ["Mon", "Tue", "Wed", "Thu", "Fri"],
      capacity_targets_set: (conn as any)?.capacity_targets_set ?? false,
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

    // Build update object with only provided fields
    const update: Record<string, any> = {};

    if ("weekly_capacity_cents" in body) {
      update.weekly_capacity_cents = typeof body.weekly_capacity_cents === "number" ? Math.round(body.weekly_capacity_cents) : null;
    }
    if ("monthly_capacity_cents" in body) {
      update.monthly_capacity_cents = typeof body.monthly_capacity_cents === "number" ? Math.round(body.monthly_capacity_cents) : null;
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
