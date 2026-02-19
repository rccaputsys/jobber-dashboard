import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { connection_id, event_name, metadata } = body;

    if (!connection_id || !event_name) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("analytics_events")
      .insert({
        connection_id,
        event_name,
        metadata: metadata || {},
      });

    if (error) {
      console.error("Analytics insert error:", error.message);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
