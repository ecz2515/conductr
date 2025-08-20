// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sb } from "@/lib/supabase-admin";

// Environment variable guards
if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("Missing required environment variables for Stripe integration");
}

// Stripe SDK (server-side)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1) Verify signature with the raw request body
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    console.error("[stripe] Missing signature");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = Buffer.from(await req.arrayBuffer());
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    console.log("[stripe] Event constructed successfully:", event);
  } catch (err) {
    console.error("[stripe] Bad signature:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    console.log("[stripe] Processing event type:", event.type);
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("[stripe] Checkout session completed:", session);

        const spotify_email = (session.metadata?.spotify_email || "").trim().toLowerCase();
        console.log("[stripe] Spotify email extracted:", spotify_email);

        const stripe_customer_id =
          typeof session.customer === "string" ? session.customer : undefined;
        const stripe_subscription_id =
          typeof session.subscription === "string" ? session.subscription : undefined;
        const stripe_payment_intent_id =
          typeof session.payment_intent === "string" ? session.payment_intent : undefined;

        if (!spotify_email) {
          console.warn("[stripe] Checkout completed but no spotify_email in metadata");
          break;
        }

        const { error } = await sb.from("access_requests").upsert(
          {
            spotify_email,
            status: "paid",
            stripe_customer_id,
            stripe_subscription_id,
            stripe_payment_intent_id,
          },
          { onConflict: "spotify_email" }
        );
        if (error) {
          console.error("[stripe] Database upsert error:", error);
          throw error;
        }

        console.log("[stripe] Database upsert successful for email:", spotify_email);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        console.log("[stripe] Subscription deleted:", sub);

        const stripe_subscription_id = sub.id;
        const stripe_customer_id =
          typeof sub.customer === "string" ? sub.customer : undefined;

        const { error } = await sb
          .from("access_requests")
          .update({ status: "canceled" })
          .or(
            [
              stripe_subscription_id ? `stripe_subscription_id.eq.${stripe_subscription_id}` : "",
              stripe_customer_id ? `stripe_customer_id.eq.${stripe_customer_id}` : "",
            ]
              .filter(Boolean)
              .join(",")
          );

        if (error) {
          console.error("[stripe] Database update error:", error);
          throw error;
        }

        console.log("[stripe] Database update successful for subscription ID:", stripe_subscription_id);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        console.log("[stripe] Subscription updated:", sub);

        const isCanceled =
          sub.status === "canceled" || sub.status === "incomplete_expired";

        const stripe_subscription_id = sub.id;
        const stripe_customer_id =
          typeof sub.customer === "string" ? sub.customer : undefined;

        if (isCanceled) {
          const { error } = await sb
            .from("access_requests")
            .update({ status: "canceled" })
            .or(
              [
                `stripe_subscription_id.eq.${stripe_subscription_id}`,
                stripe_customer_id ? `stripe_customer_id.eq.${stripe_customer_id}` : "",
              ]
                .filter(Boolean)
                .join(",")
            );
          if (error) {
            console.error("[stripe] Database update error on cancellation:", error);
            throw error;
          }

          console.log("[stripe] Subscription cancellation processed for ID:", stripe_subscription_id);
        }
        break;
      }

      default:
        console.log("[stripe] Ignoring unhandled event type:", event.type);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe] Webhook handling error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
