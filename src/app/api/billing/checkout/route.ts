// src/app/api/billing/checkout/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getUser } from "@/lib/supabaseAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ============================================
// PRICING TIERS — set price IDs in env vars
// ============================================
// STRIPE_PRICE_CORE       — Core tier
// STRIPE_PRICE_PRO        — Pro tier (default)
// STRIPE_PRICE_PRO_PLUS   — Pro Plus tier
// ============================================

const TIER_PRICES: Record<string, string | undefined> = {
  core:     process.env.STRIPE_PRICE_CORE,
  pro:      process.env.STRIPE_PRICE_PRO,
  pro_plus: process.env.STRIPE_PRICE_PRO_PLUS,
};

export async function POST(req: Request) {
  const user = await getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Read tier from form data (default to "pro")
  let tier = "pro";
  try {
    const formData = await req.formData();
    const t = formData.get("tier");
    if (typeof t === "string" && TIER_PRICES[t]) {
      tier = t;
    }
  } catch {
    // No form data or not form-encoded — use default tier
  }

  const priceId = TIER_PRICES[tier];
  if (!priceId) {
    return NextResponse.redirect(new URL("/jobber/dashboard?error=invalid_tier", req.url));
  }

  // Get the user's connection
  const { data: connection, error: connErr } = await supabaseAdmin
    .from("jobber_connections")
    .select("id, stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (connErr || !connection) {
    return NextResponse.redirect(new URL("/jobber/dashboard?error=no_connection", req.url));
  }

  // Create or retrieve Stripe customer
  let customerId = connection.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        user_id: user.id,
        connection_id: connection.id,
      },
    });

    customerId = customer.id;

    // Save customer ID
    await supabaseAdmin
      .from("jobber_connections")
      .update({ stripe_customer_id: customerId })
      .eq("id", connection.id);
  }

  // Create checkout session
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/jobber/dashboard?checkout=success`,
    cancel_url: `${appUrl}/jobber/dashboard?checkout=cancelled`,
    metadata: {
      user_id: user.id,
      connection_id: connection.id,
      tier,
    },
  });

  // Redirect to Stripe checkout
  return NextResponse.redirect(session.url!, 303);
}
