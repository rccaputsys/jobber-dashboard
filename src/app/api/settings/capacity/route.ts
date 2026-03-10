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

    return NextResponse.json({
      ok: true,
      weekly_capacity_cents: conn?.weekly_capacity_cents ?? null,
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
    const cents = typeof body.weekly_capacity_cents === "number" ? Math.round(body.weekly_capacity_cents) : null;

    const { error } = await supabaseAdmin
      .from("jobber_connections")
      .update({ weekly_capacity_cents: cents })
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true, weekly_capacity_cents: cents });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
