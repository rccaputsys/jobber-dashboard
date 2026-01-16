// src/app/api/export/leaking-quotes/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function csvEscape(v: any) {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function statusLooksWon(status: string) {
  const s = (status || "").toUpperCase();
  return (
    s.includes("APPROV") ||
    s.includes("ACCEPT") ||
    s.includes("WON") ||
    s.includes("CONVERT") ||
    s.includes("BOOK")
  );
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const connection_id = searchParams.get("connection_id");
    const limit = Math.min(Number(searchParams.get("limit") ?? "200"), 2000);

    if (!connection_id) {
      return NextResponse.json({ ok: false, error: "Missing connection_id" }, { status: 400 });
    }

    // Select ONLY columns we know exist in your table
    const { data, error } = await supabaseAdmin
      .from("fact_quotes")
      .select("jobber_quote_id,quote_number,quote_title,quote_status,quote_total_cents,quote_url,sent_at")
      .eq("connection_id", connection_id)
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: true })
      .limit(limit);

    if (error) throw error;

    const rows = (data ?? [])
      .map((q: any) => ({
        age_days: q.sent_at ? Math.max(0, Math.round((Date.now() - new Date(q.sent_at).getTime()) / 86400000)) : "",
        quote_number: q.quote_number ?? "",
        quote_title: q.quote_title ?? "",
        quote_status: q.quote_status ?? "",
        quote_total_cents: q.quote_total_cents ?? 0,
        sent_at: q.sent_at ?? "",
        quote_url: q.quote_url ?? "",
        jobber_quote_id: q.jobber_quote_id ?? "",
      }))
      .filter((q: any) => !statusLooksWon(q.quote_status))
      .sort((a: any, b: any) => (b.age_days || 0) - (a.age_days || 0));

    const header = [
      "age_days",
      "quote_number",
      "quote_title",
      "quote_status",
      "quote_total_cents",
      "sent_at",
      "quote_url",
      "jobber_quote_id",
    ];

    const csv = [
      header.join(","),
      ...rows.map((r: any) => header.map((k) => csvEscape(r[k])).join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leaking_quotes_${connection_id}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
