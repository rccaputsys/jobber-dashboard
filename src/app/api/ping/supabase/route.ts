import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({
    hasUrl: Boolean(url),
    urlStartsWithHttps: (url ?? "").startsWith("https://"),
    urlHost: url ? new URL(url).host : null,
    anonLength: anon ? anon.length : 0,
    serviceLength: service ? service.length : 0,
  });
}
