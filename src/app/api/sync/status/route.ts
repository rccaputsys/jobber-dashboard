import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connection_id");

  if (!connectionId) {
    return NextResponse.json({ error: "Missing connection_id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("jobber_connections")
    .select("sync_status, sync_started_at, sync_error, last_sync_at")
    .eq("id", connectionId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: data.sync_status || "idle",
    started_at: data.sync_started_at,
    error: data.sync_error,
    last_sync_at: data.last_sync_at,
  });
}
