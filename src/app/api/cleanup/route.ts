import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  
  // Use env var or fallback
  const cronSecret = process.env.CRON_SECRET || "f869d50f-2b07-4974-9440-c5863ba968aa";
  const expectedHeader = `Bearer ${cronSecret}`;
  
  const isVercelCron = authHeader === expectedHeader;
  const isVercelCronHeader = req.headers.get("x-vercel-cron") === "1";

  if (!isVercelCron && !isVercelCronHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: expiredConnections, error } = await supabaseAdmin
    .from("jobber_connections")
    .select("id")
    .eq("billing_status", "canceled")
    .lt("canceled_at", thirtyDaysAgo);

  if (error) {
    console.error("Error fetching expired connections:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expiredConnections || expiredConnections.length === 0) {
    return NextResponse.json({ deleted: 0, message: "No expired accounts to clean up" });
  }

  let deletedCount = 0;

  for (const conn of expiredConnections) {
    try {
      await supabaseAdmin.from("fact_invoices").delete().eq("connection_id", conn.id);
      await supabaseAdmin.from("fact_jobs").delete().eq("connection_id", conn.id);
      await supabaseAdmin.from("fact_quotes").delete().eq("connection_id", conn.id);
      await supabaseAdmin.from("jobber_tokens").delete().eq("connection_id", conn.id);
      await supabaseAdmin.from("jobber_connections").delete().eq("id", conn.id);
      
      deletedCount++;
      console.log("Cleaned up expired connection:", conn.id);
    } catch (err) {
      console.error("Failed to clean up connection:", conn.id, err);
    }
  }

  return NextResponse.json({ 
    deleted: deletedCount, 
    message: `Cleaned up ${deletedCount} expired accounts` 
  });
}
