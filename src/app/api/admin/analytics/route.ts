import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ADMIN_EMAILS = ["rcaputo91@gmail.com"];

async function isAdmin(req: NextRequest): Promise<boolean> {
  const { createServerClient } = await import("@supabase/ssr");
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies: { name: string; value: string }[] = [];
  cookieHeader.split(";").forEach((c) => {
    const [name, ...rest] = c.trim().split("=");
    if (name) cookies.push({ name, value: rest.join("=") });
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookies;
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user && ADMIN_EMAILS.includes(user.email || "");
}

/** Paginated fetch for analytics_events (PostgREST max_rows=100). */
async function fetchAnalyticsEvents(
  connectionId: string,
  since: string,
  pageSize = 100,
): Promise<any[]> {
  const all: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("analytics_events")
      .select("id,connection_id,event_name,metadata,created_at")
      .eq("connection_id", connectionId)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

/** Calculate sessions from events: a session = sequence of events with gaps <90s */
function computeSessions(events: any[]): { count: number; avgSeconds: number } {
  if (events.length === 0) return { count: 0, avgSeconds: 0 };

  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const SESSION_GAP_MS = 90_000; // 90 seconds
  let sessionCount = 1;
  let sessionStart = new Date(sorted[0].created_at).getTime();
  let totalDuration = 0;

  for (let i = 1; i < sorted.length; i++) {
    const ts = new Date(sorted[i].created_at).getTime();
    const prev = new Date(sorted[i - 1].created_at).getTime();
    if (ts - prev > SESSION_GAP_MS) {
      // End of previous session
      totalDuration += prev - sessionStart;
      sessionCount++;
      sessionStart = ts;
    }
  }
  // End final session
  const lastTs = new Date(sorted[sorted.length - 1].created_at).getTime();
  totalDuration += lastTs - sessionStart;

  const avgSeconds = sessionCount > 0 ? Math.round(totalDuration / sessionCount / 1000) : 0;
  return { count: sessionCount, avgSeconds };
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connectionId = req.nextUrl.searchParams.get("connection_id");
  if (!connectionId) {
    return NextResponse.json({ error: "connection_id required" }, { status: 400 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const since = thirtyDaysAgo.toISOString();

  try {
    const events = await fetchAnalyticsEvents(connectionId, since);

    // Last active
    const lastEvent = events.length > 0 ? events[events.length - 1] : null;
    const lastActive = lastEvent ? lastEvent.created_at : null;

    // Session calculation
    const sessions = computeSessions(events);

    // Feature usage (exclude heartbeat)
    const featureMap: Record<string, number> = {};
    for (const e of events) {
      if (e.event_name === "heartbeat") continue;
      featureMap[e.event_name] = (featureMap[e.event_name] || 0) + 1;
    }
    const featureUsage = Object.entries(featureMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Daily activity (30 data points)
    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo.getTime() + i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = 0;
    }
    for (const e of events) {
      const key = e.created_at.slice(0, 10);
      if (key in dailyMap) dailyMap[key]++;
    }
    const dailyActivity = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      last_active: lastActive,
      total_events_30d: events.length,
      session_count: sessions.count,
      avg_session_seconds: sessions.avgSeconds,
      feature_usage: featureUsage,
      daily_activity: dailyActivity,
    });
  } catch (err: any) {
    console.error("Admin analytics error:", err.message);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
