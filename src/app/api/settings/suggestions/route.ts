// src/app/api/settings/suggestions/route.ts
// Returns suggested target values based on recent data (last 4 weeks)
import { NextResponse } from "next/server";
import { supabaseAdmin, fetchAllRows } from "@/lib/supabaseAdmin";
import { getUser } from "@/lib/supabaseAuth";

export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);
    const isAdmin = ADMIN_EMAILS.includes(user.email || "");
    const adminConnectionId = isAdmin ? url.searchParams.get("connection_id") : null;

    // Get connection ID
    let connectionId: string;
    if (adminConnectionId) {
      connectionId = adminConnectionId;
    } else {
      const { data: conn } = await supabaseAdmin
        .from("jobber_connections")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!conn) return NextResponse.json({ ok: true, suggestions: {} });
      connectionId = conn.id;
    }

    // Fetch last 4 weeks of jobs for capacity suggestion
    const fourWeeksAgo = new Date(Date.now() - 28 * 86400000).toISOString();
    const { data: recentJobs } = await supabaseAdmin
      .from("fact_jobs")
      .select("total_amount_cents,scheduled_start_at")
      .eq("connection_id", connectionId)
      .gte("scheduled_start_at", fourWeeksAgo)
      .limit(50000);

    // Compute weekly revenue buckets
    const now = Date.now();
    const weekBuckets = [0, 0, 0, 0]; // 4 weeks
    for (const j of recentJobs || []) {
      if (!j.scheduled_start_at) continue;
      const age = now - new Date(j.scheduled_start_at).getTime();
      const weekIdx = Math.floor(age / (7 * 86400000));
      if (weekIdx >= 0 && weekIdx < 4) {
        weekBuckets[weekIdx] += Number(j.total_amount_cents || 0);
      }
    }
    const nonZeroWeeks = weekBuckets.filter(w => w > 0);
    const avgWeeklyCents = nonZeroWeeks.length > 0
      ? Math.round(nonZeroWeeks.reduce((a, b) => a + b, 0) / nonZeroWeeks.length)
      : 0;

    // YTD revenue for extrapolation
    const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    const { data: ytdJobs } = await supabaseAdmin
      .from("fact_jobs")
      .select("total_amount_cents,scheduled_start_at,status")
      .eq("connection_id", connectionId)
      .gte("scheduled_start_at", yearStart.toISOString())
      .limit(50000);

    const ytdRevenue = (ytdJobs || []).reduce((s: number, j: any) => {
      const st = String(j.status ?? "").toLowerCase();
      if (st === "completed" || st === "closed" || st === "archived") return s + Number(j.total_amount_cents || 0);
      return s;
    }, 0);

    const dayOfYear = Math.max(1, Math.floor((Date.now() - yearStart.getTime()) / 86400000));
    const daysInYear = 365;
    const ytdExtrapolated = ytdRevenue > 0 ? Math.round(ytdRevenue * (daysInYear / dayOfYear)) : 0;

    // Annual suggestion: prefer YTD extrapolation (puts user "on pace"), fall back to weekly×52
    const suggestedAnnualRevenueCents = ytdExtrapolated || (avgWeeklyCents > 0 ? avgWeeklyCents * 52 : 0);

    // Fetch quotes for close rate suggestion
    const { data: recentQuotes } = await supabaseAdmin
      .from("fact_quotes")
      .select("quote_status")
      .eq("connection_id", connectionId)
      .gte("created_at", fourWeeksAgo)
      .limit(50000);

    const totalQuotes = recentQuotes?.length || 0;
    const wonQuotes = recentQuotes?.filter((q: any) => q.quote_status === "approved" || q.quote_status === "won" || q.quote_status === "converted").length || 0;
    const actualCloseRate = totalQuotes > 0 ? Math.round((wonQuotes / totalQuotes) * 100) : null;

    return NextResponse.json({
      ok: true,
      suggestions: {
        weekly_capacity_cents: avgWeeklyCents || null,
        monthly_capacity_cents: avgWeeklyCents ? avgWeeklyCents * 4 : null,
        annual_revenue_target_cents: suggestedAnnualRevenueCents || null,
        annual_sales_target_cents: suggestedAnnualRevenueCents || null,
        close_rate: actualCloseRate ?? 40, // default 40% if no data
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
