// src/app/api/webhooks/stripe/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const connectionId = session.metadata?.connection_id;
      const subscriptionId = session.subscription;

      if (connectionId && typeof subscriptionId === "string") {
        await supabaseAdmin
          .from("jobber_connections")
          .update({
            stripe_subscription_id: subscriptionId,
            billing_status: "active",
          })
          .eq("id", connectionId);

        console.log(`Subscription activated for connection ${connectionId}`);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const status = subscription.status;

      const { data: conn } = await supabaseAdmin
        .from("jobber_connections")
        .select("id")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle();

      if (conn) {
        let billingStatus = "active";
        if (status === "canceled" || status === "unpaid") {
          billingStatus = "canceled";
        } else if (status === "past_due") {
          billingStatus = "past_due";
        } else if (status === "trialing") {
          billingStatus = "trialing";
        }

        await supabaseAdmin
          .from("jobber_connections")
          .update({ billing_status: billingStatus })
          .eq("id", conn.id);

        console.log(`Subscription ${subscription.id} status updated to ${billingStatus}`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      const { data: conn } = await supabaseAdmin
        .from("jobber_connections")
        .select("id")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle();

      if (conn) {
        await supabaseAdmin
          .from("jobber_connections")
          .update({ billing_status: "canceled" })
          .eq("id", conn.id);

        console.log(`Subscription ${subscription.id} canceled`);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as unknown as Record<string, unknown>;
      const subscriptionId = invoice.subscription;
      const subId =
        typeof subscriptionId === "string"
          ? subscriptionId
          : typeof subscriptionId === "object" &&
            subscriptionId !== null &&
            "id" in subscriptionId
          ? (subscriptionId as { id: string }).id
          : null;

      if (subId) {
        const { data: conn } = await supabaseAdmin
          .from("jobber_connections")
          .select("id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();

        if (conn) {
          await supabaseAdmin
            .from("jobber_connections")
            .update({ billing_status: "past_due" })
            .eq("id", conn.id);

          console.log(`Payment failed for subscription ${subId}`);
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
