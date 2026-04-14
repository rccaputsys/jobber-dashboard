import { NextResponse } from "next/server";
import { encryptText } from "@/lib/crypto";

const STATE_COOKIE = "jobber_oauth_state";

export async function GET() {
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
