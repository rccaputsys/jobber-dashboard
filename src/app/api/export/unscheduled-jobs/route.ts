import { supabaseAdmin } from "@/lib/supabaseAdmin";

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function ageDays(ts: string | null) {
  if (!ts) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 86400000));
}

function priorityLabel(age: number) {
  if (age >= 14) return "High";
  if (age >= 7) return "Medium";
  return "Low";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connection_id");
  const minDays = Number(searchParams.get("unscheduled_min_days") ?? "0");

  if (!connectionId) {
    return new Response("Missing connection_id", { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("fact_jobs")
    .select("jobber_job_id,created_at_jobber,jobber_url,scheduled_start_at")
    .eq("connection_id", connectionId)
    .is("scheduled_start_at", null)
    .order("created_at_jobber", { ascending: true })
    .limit(200);

  if (error) {
    return new Response(`Supabase error: ${error.message}`, { status: 500 });
  }

  let rows = (data ?? []).map((r: any) => ({
    jobber_job_id: r.jobber_job_id,
    created_at_jobber: r.created_at_jobber,
    jobber_url: r.jobber_url,
    age_days: ageDays(r.created_at_jobber),
  }));

  if (minDays > 0) {
    rows = rows.filter((r) => r.age_days >= minDays);
  }

  const header = ["priority", "age_days", "jobber_job_id", "created_at_jobber", "jobber_url"];
  const csvRows = rows.map((r) =>
    [
      priorityLabel(r.age_days),
      r.age_days,
      r.jobber_job_id,
      r.created_at_jobber ?? "",
      r.jobber_url ?? "",
    ]
      .map(csvEscape)
      .join(",")
  );

  const csv = [header.join(","), ...csvRows].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="unscheduled_jobs_${minDays ? `min${minDays}_` : ""}${connectionId}.csv"`,
    },
  });
}
