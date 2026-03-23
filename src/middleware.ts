// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Use getUser() for server-side JWT verification (not getSession which only checks locally)
  const { data: { user } } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;

  // Protected routes — all /jobber/* and /admin pages
  const isProtected = path.startsWith("/jobber") || path.startsWith("/admin");

  // Auth routes (redirect away if already logged in)
  const authPaths = ["/login", "/signup"];
  const isAuthPage = authPaths.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/jobber/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/jobber/:path*", "/admin/:path*", "/login", "/signup"],
};
