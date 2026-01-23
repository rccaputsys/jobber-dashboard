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

  const { data: { session } } = await supabase.auth.getSession();

  const path = req.nextUrl.pathname;

  // Protected routes
  const protectedPaths = ["/jobber/dashboard"];
  const isProtected = protectedPaths.some((p) => path.startsWith(p));

  // Auth routes (redirect away if already logged in)
  const authPaths = ["/login", "/signup"];
  const isAuthPage = authPaths.some((p) => path.startsWith(p));

  if (isProtected && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL("/jobber/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/jobber/dashboard/:path*", "/login", "/signup"],
};
