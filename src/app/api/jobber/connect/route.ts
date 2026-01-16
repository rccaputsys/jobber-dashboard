import { NextResponse } from "next/server";
import { ensureUserId } from "@/lib/user";
import { encryptText } from "@/lib/crypto";

export async function GET() {
  await ensureUserId();

  const stateRaw = JSON.stringify({
    t: Date.now(),
    nonce: crypto.randomUUID(),
  });
  const state = await encryptText(stateRaw);

  // HARDCODED for production - change this later
  const HARDCODED_REDIRECT = "https://jobber-dashboard-yixj.vercel.app/api/jobber/callback";

  const url = new URL(process.env.JOBBER_OAUTH_AUTHORIZE_URL!);
  url.searchParams.set("client_id", process.env.JOBBER_CLIENT_ID!);
  url.searchParams.set("redirect_uri", HARDCODED_REDIRECT); // Using hardcoded value
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  console.log("Using hardcoded redirect:", HARDCODED_REDIRECT);

  return NextResponse.redirect(url.toString());
}