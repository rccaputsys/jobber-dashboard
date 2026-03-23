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
      .select("weekly_capacity_cents")
      .eq("user_id", user.id)
      .maybeSingle();

    // Monthly column may not exist yet
    let monthly = null;
    try {
      const { data: mc } = await supabaseAdmin
        .from("jobber_connections")
        .select("monthly_capacity_cents")
        .eq("user_id", user.id)
        .maybeSingle();
      monthly = mc?.monthly_capacity_cents ?? null;
    } catch {}

    return NextResponse.json({
      ok: true,
      weekly_capacity_cents: conn?.weekly_capacity_cents ?? null,
      monthly_capacity_cents: monthly,
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

    // Save weekly and monthly separately so a missing column doesn't block the other
    const result: Record<string, number | null> = {};

    if ("weekly_capacity_cents" in body) {
      const cents = typeof body.weekly_capacity_cents === "number" ? Math.round(body.weekly_capacity_cents) : null;
      const { error } = await supabaseAdmin
        .from("jobber_connections")
        .update({ weekly_capacity_cents: cents })
        .eq(eqField, eqValue);
      if (error) throw error;
      result.weekly_capacity_cents = cents;
    }

    if ("monthly_capacity_cents" in body) {
      const cents = typeof body.monthly_capacity_cents === "number" ? Math.round(body.monthly_capacity_cents) : null;
      try {
        await supabaseAdmin
          .from("jobber_connections")
          .update({ monthly_capacity_cents: cents } as any)
          .eq(eqField, eqValue);
        result.monthly_capacity_cents = cents;
      } catch {
        // Column may not exist yet
        result.monthly_capacity_cents = null;
      }
    }

    if (Object.keys(result).length === 0) {
      return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
