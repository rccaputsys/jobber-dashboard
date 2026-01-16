import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${base}/rest/v1/app_users?select=id&limit=1`, {
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
    },
  });

  const text = await res.text();

  return NextResponse.json({
    ok: res.ok,
    status: res.status,
    bodyPreview: text.slice(0, 200),
  });
}
