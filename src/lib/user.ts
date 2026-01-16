import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const COOKIE_NAME = "app_user_id";

/**
 * Ensures there is a user id in cookies.
 * If missing, creates a new user row and sets the cookie.
 */
export async function ensureUserId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const { data, error } = await supabaseAdmin
    .from("app_users")
    .insert({ email: `local-${Date.now()}@example.com` })
    .select("id")
    .single();

  if (error || !data?.id) throw new Error(error?.message || "Failed to create user");

  jar.set(COOKIE_NAME, data.id, { httpOnly: true, sameSite: "lax", path: "/" });
  return data.id;
}

export async function getUserId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}
