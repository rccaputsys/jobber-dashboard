// src/app/api/auth/complete-signup/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { sendWelcomeEmail } from "@/lib/resend";
import { decryptText } from "@/lib/crypto";

export async function POST(req: Request) {
  const { email, password, signupToken, ownerName, businessType, teamSize } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  if (!signupToken) {
    return NextResponse.json({ error: "Invalid or expired signup link" }, { status: 400 });
  }

  // Decrypt the signup token to get the connection ID
  let connectionId: string;
  try {
    connectionId = await decryptText(signupToken);
  } catch {
    return NextResponse.json({ error: "Invalid or expired signup link. Please reconnect your Jobber account." }, { status: 400 });
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
    return NextResponse.json({ error: "Email already registered. Please log in." }, { status: 400 });
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

  // Link the user to the connection and save profile data
  const { error: linkError } = await supabaseAdmin
    .from("jobber_connections")
    .update({
      user_id: newUser.user.id,
      owner_name: ownerName || null,
      business_type: businessType || null,
      team_size: teamSize || null,
    })
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

  // Send welcome email
  try {
    await sendWelcomeEmail(email);
  } catch (err) {
    console.error("Failed to send welcome email");
  }

  // Trigger initial sync (internal server-to-server call with auth bypass)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  fetch(`${appUrl}/api/sync/run?connection_id=${connectionId}`, {
    headers: { "x-internal-token": process.env.SUPABASE_SERVICE_ROLE_KEY || "" },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
