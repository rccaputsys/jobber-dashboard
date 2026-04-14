import { NextResponse } from "next/server";
import { encryptText } from "@/lib/crypto";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const STATE_COOKIE = "jobber_oauth_state";

export async function GET(req: Request) {
  // 20 OAuth kicks per IP per 15min — generous enough that no real user
  // hits it, tight enough to stop a brute-force attempt.
  const ip = getClientIp(req);
  const limit = await rateLimit(`connect:${ip}`, { maxAttempts: 20, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many connection attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } },
    );
  }

  const nonce = crypto.randomUUID();
  const stateRaw = JSON.stringify({ t: Date.now(), nonce });
  const state = await encryptText(stateRaw, "10m");

  const url = new URL(process.env.JOBBER_OAUTH_AUTHORIZE_URL!);
  url.searchParams.set("client_id", process.env.JOBBER_CLIENT_ID!);
  url.searchParams.set("redirect_uri", process.env.JOBBER_REDIRECT_URI!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  // Bind the nonce to the browser session via httpOnly cookie. Callback
  // compares the decrypted state's nonce to this cookie, stopping a
  // replay / swapped-state CSRF.
  const res = NextResponse.redirect(url.toString());
  res.cookies.set(STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
