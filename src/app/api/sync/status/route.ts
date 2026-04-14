import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUser } from "@/lib/supabaseAuth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connection_id");

  if (!connectionId) {
    return NextResponse.json({ error: "Missing connection_id" }, { status: 400 });
  }

  // Auth: require logged-in user who owns this connection
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("jobber_connections")
    .select(`
      sync_status, sync_started_at, sync_error, last_sync_at,
      sync_status_jobs, sync_status_visits, sync_status_quotes, sync_status_invoices, sync_status_requests,
      sync_count_jobs, sync_count_visits, sync_count_quotes, sync_count_invoices, sync_count_requests
    `)
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const entityStatus = (s: string | null | undefined) => s || "pending";
  const entities = [
    { key: "jobs",     label: "Jobs",      status: entityStatus(data.sync_status_jobs),     count: data.sync_count_jobs ?? 0 },
    { key: "visits",   label: "Visits",    status: entityStatus(data.sync_status_visits),   count: data.sync_count_visits ?? 0 },
    { key: "quotes",   label: "Quotes",    status: entityStatus(data.sync_status_quotes),   count: data.sync_count_quotes ?? 0 },
    { key: "invoices", label: "Invoices",  status: entityStatus(data.sync_status_invoices), count: data.sync_count_invoices ?? 0 },
    { key: "requests", label: "Requests",  status: entityStatus(data.sync_status_requests), count: data.sync_count_requests ?? 0 },
  ];

  return NextResponse.json({
    status: data.sync_status || "idle",
    started_at: data.sync_started_at,
    error: data.sync_error,
    last_sync_at: data.last_sync_at,
    entities,
  });
}
