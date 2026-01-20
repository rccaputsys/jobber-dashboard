// src/app/api/billing/portal/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getUser } from "@/lib/supabaseAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const user = await getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Get the user's connection
  const { data: connection } = await supabaseAdmin
    .from("jobber_connections")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection?.stripe_customer_id) {
    return NextResponse.redirect(new URL("/jobber/dashboard?error=no_subscription", req.url));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: connection.stripe_customer_id,
    return_url: `${appUrl}/jobber/dashboard`,
  });

  return NextResponse.redirect(session.url, 303);
}