// src/app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  // Rate limit: 20 attempts per 15 minutes per IP. Loose enough to not
  // block a flailing user; tight enough to stop spam-bombing a mailbox.
  const ip = getClientIp(req);
  const limit = await rateLimit(`forgot:${ip}`, { maxAttempts: 20, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }

  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore
          }
        },
      },
    }
  );

  // Derive the base URL from the incoming request, not a build-time env
  // var. Whichever domain the user submitted the form from is where we
  // send them back — no config, no Supabase allow-list truncation to
  // fight with. Falls back to NEXT_PUBLIC_APP_URL, then localhost.
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  const reqUrl = new URL(req.url);
  const host = forwardedHost || reqUrl.host;
  const proto = forwardedHost ? forwardedProto : reqUrl.protocol.replace(":", "");
  const derivedAppUrl = host ? `${proto}://${host}` : null;
  const appUrl = derivedAppUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const redirectTo = `${appUrl}/reset-password`;
  console.log("Password reset redirectTo:", redirectTo);

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
