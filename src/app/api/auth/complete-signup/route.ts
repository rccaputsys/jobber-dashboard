// src/app/api/auth/complete-signup/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  const { email, password, connectionId } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  if (!connectionId) {
    return NextResponse.json({ error: "Connection ID required" }, { status: 400 });
  }

  // Verify the connection exists and doesn't have a user yet
  const { data: connection } = await supabaseAdmin
    .from("jobber_connections")
    .select("id, user_id")
    .eq("id", connectionId)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: "Invalid connection" }, { status: 400 });
  }

  if (connection.user_id) {
    return NextResponse.json({ error: "Account already exists. Please log in." }, { status: 400 });
  }

  // Create the user with email and password
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !newUser.user) {
    // Check if user already exists
    if (createError?.message?.includes("already been registered")) {
      return NextResponse.json({ error: "Email already registered. Please log in." }, { status: 400 });
    }
    return NextResponse.json({ error: createError?.message || "Failed to create account" }, { status: 400 });
  }

  // Link the user to the connection
  const { error: linkError } = await supabaseAdmin
    .from("jobber_connections")
    .update({ user_id: newUser.user.id })
    .eq("id", connectionId);

  if (linkError) {
    return NextResponse.json({ error: "Failed to link account" }, { status: 500 });
  }

  // Sign in the user
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
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return NextResponse.json({ error: "Account created but sign in failed. Please log in." }, { status: 500 });
  }

  // Trigger initial sync
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  fetch(`${appUrl}/api/sync/run?connection_id=${connectionId}`).catch(() => {});

  return NextResponse.json({ success: true });
}
