import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUser } from "@/lib/supabaseAuth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      connection_id,
      session_id,
      user_agent,
      viewport_width,
      page_url,
      events,
    } = body;

    // Support old format: { connection_id, event_name, metadata }
    if (!events && body.event_name) {
      const row = {
        user_id: null as string | null,
        connection_id: body.connection_id || null,
        event: body.event_name,
        properties: body.metadata ?? {},
        user_agent: null,
        viewport_width: null,
        session_id: null,
        page_url: null,
        created_at: new Date().toISOString(),
      };
      try {
        const user = await getUser();
        row.user_id = user?.id ?? null;
      } catch {}
      try { await supabaseAdmin.from("analytics_events").insert([row]); } catch {}
      return NextResponse.json({ ok: true });
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ ok: true });
    }

    // Optional auth — don't require it
    let userId: string | null = null;
    try {
      const user = await getUser();
      userId = user?.id ?? null;
    } catch {
      // Anonymous event — that's fine
    }

    // Build rows for batch insert
    const rows = events.map(
      (evt: { event: string; properties?: Record<string, any>; timestamp?: number }) => ({
        user_id: userId,
        connection_id: connection_id || null,
        event: evt.event,
        properties: evt.properties ?? {},
        user_agent: user_agent || null,
        viewport_width: viewport_width || null,
        session_id: session_id || null,
        page_url: page_url || null,
        created_at: evt.timestamp
          ? new Date(evt.timestamp).toISOString()
          : new Date().toISOString(),
      }),
    );

    const { error } = await supabaseAdmin
      .from("analytics_events")
      .insert(rows);

    if (error) {
      console.error("Analytics insert error:", error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Always return 200 — analytics should never cause client-side errors
    console.error("Analytics route error:", err);
    return NextResponse.json({ ok: true });
  }
}
