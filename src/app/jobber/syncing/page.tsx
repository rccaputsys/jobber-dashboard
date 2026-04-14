import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabaseAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SyncingClient } from "./SyncingClient";

export const dynamic = "force-dynamic";

export default async function SyncingPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const { data: connection } = await supabaseAdmin
    .from("jobber_connections")
    .select("id, last_sync_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection) redirect("/jobber");

  // Existing users who already have data go straight to dashboard.
  if (connection.last_sync_at) redirect("/jobber/dashboard");

  return <SyncingClient connectionId={connection.id} />;
}
