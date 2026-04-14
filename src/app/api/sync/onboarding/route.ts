import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUser } from "@/lib/supabaseAuth";
import { runFullSyncForCron } from "@/lib/jobberSync";

export const maxDuration = 300;

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connection_id");

  if (!connectionId) {
    return NextResponse.json({ ok: false, error: "Missing connection_id" }, { status: 400 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: ownerCheck } = await supabaseAdmin
    .from("jobber_connections")
    .select("id")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!ownerCheck) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const result = await runFullSyncForCron(connectionId);
  return NextResponse.json(result);
}
