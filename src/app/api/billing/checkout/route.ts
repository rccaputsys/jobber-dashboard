// src/app/api/billing/checkout/route.ts
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
        price: "price_1SrjmhRjFeoAh97X3sJL3RC0", // Your $29/month price ID
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/jobber/dashboard?checkout=success`,
    cancel_url: `${appUrl}/jobber/dashboard?checkout=cancelled`,
    metadata: {
      user_id: user.id,
      connection_id: connection.id,
    },
  });

  // Redirect to Stripe checkout
  return NextResponse.redirect(session.url!, 303);
}