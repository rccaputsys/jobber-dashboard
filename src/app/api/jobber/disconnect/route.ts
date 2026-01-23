// src/app/api/jobber/disconnect/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUser } from "@/lib/supabaseAuth";
import { decryptText } from "@/lib/crypto";

export async function POST() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the user's connection
  const { data: connection } = await supabaseAdmin
    .from("jobber_connections")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: "No connection found" }, { status: 404 });
  }

  // Get tokens
  const { data: tokenRow } = await supabaseAdmin
    .from("jobber_tokens")
    .select("access_token")
    .eq("connection_id", connection.id)
    .maybeSingle();

  if (tokenRow?.access_token) {
    try {
      const accessToken = await decryptText(tokenRow.access_token);

      // Call Jobber's appDisconnect mutation
      const res = await fetch(process.env.JOBBER_GRAPHQL_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-JOBBER-GRAPHQL-VERSION": process.env.JOBBER_GRAPHQL_VERSION!,
        },
        body: JSON.stringify({
          query: `mutation { appDisconnect { app { id } userErrors { message } } }`,
        }),
      });

      const json = await res.json();
      console.log("appDisconnect response:", json);
    } catch (err) {
      console.error("Error calling appDisconnect:", err);
      // Continue anyway - we still want to clean up locally
    }
  }

  // Delete local data
  await supabaseAdmin.from("fact_invoices").delete().eq("connection_id", connection.id);
  await supabaseAdmin.from("fact_jobs").delete().eq("connection_id", connection.id);
  await supabaseAdmin.from("fact_quotes").delete().eq("connection_id", connection.id);
  await supabaseAdmin.from("jobber_tokens").delete().eq("connection_id", connection.id);
  await supabaseAdmin.from("jobber_connections").delete().eq("id", connection.id);

  return NextResponse.json({ success: true });
}
