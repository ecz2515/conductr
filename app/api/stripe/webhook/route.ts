// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sb } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- Env guards (at runtime) ---
const SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRETS_CSV = process.env.STRIPE_WEBHOOK_SECRET; // allow comma-separated: whsec_dash,whsec_cli
if (!SECRET_KEY || !WEBHOOK_SECRETS_CSV) {
  throw new Error("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
}

// Server-side Stripe client
const stripe = new Stripe(SECRET_KEY);

// Try verifying with any of the comma-separated secrets
function constructEventWithAnySecret(
  payload: string | Buffer,
  sig: string,
  secretsCSV: string
): Stripe.Event {
  console.debug("[stripe] Constructing event with payload.");
  const secrets = secretsCSV.split(",").map((s) => s.trim()).filter(Boolean);
  let lastErr: any;
  for (const sec of secrets) {
    try {
      const event = stripe.webhooks.constructEvent(payload, sig, sec);
      console.debug("[stripe] Event successfully constructed with a secret.");
      return event;
    } catch (e) {
      lastErr = e;
    }
  }
  console.error("[stripe] All secrets failed, throwing last error");
  throw lastErr;
}

export async function POST(req: NextRequest) {
  console.debug("[stripe] POST request received with headers:", req.headers);
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    console.error("[stripe] ❌ Missing signature");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Use the raw body (string is fine; Buffer also works)
  const rawBody = await req.text();
  console.debug("[stripe] Raw body received:", rawBody);

  let event: Stripe.Event;
  try {
    event = constructEventWithAnySecret(rawBody, sig, WEBHOOK_SECRETS_CSV!);
    console.log("[stripe] ✅ Event received:", event.type);
  } catch (err: any) {
    console.error("[stripe] ❌ Invalid signature:", err?.message || err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    console.debug("[stripe] Processing event type:", event.type);
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.debug("[stripe] Session data:", session);

        // Metadata fields you set when creating the Session
        const spotify_email = (session.metadata?.spotify_email || "").trim().toLowerCase();
        console.debug("[stripe] Extracted spotify_email:", spotify_email);

        const stripe_customer_id =
          typeof session.customer === "string" ? session.customer : undefined;
        const stripe_subscription_id =
          typeof session.subscription === "string" ? session.subscription : undefined;
        const stripe_payment_intent_id =
          typeof session.payment_intent === "string" ? session.payment_intent : undefined;

        if (!spotify_email) {
          console.warn("[stripe] Checkout completed without metadata.spotify_email");
          break;
        }

        // Flip to 'added' so your /access-gate counter (status='added') increments
        const { error } = await sb.from("access_requests").upsert(
          {
            spotify_email,
            status: "added", // <-- important for your seat counter
            stripe_customer_id,
            stripe_subscription_id,
            stripe_payment_intent_id,
          },
          { onConflict: "spotify_email" }
        );
        if (error) {
          console.error("[stripe] DB upsert error:", error);
          throw error;
        }
        console.log("[stripe] DB upsert OK for", spotify_email);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        console.debug("[stripe] Subscription data:", sub);
        const stripe_subscription_id = sub.id;
        const stripe_customer_id =
          typeof sub.customer === "string" ? sub.customer : undefined;

        const orFilters = [
          stripe_subscription_id ? `stripe_subscription_id.eq.${stripe_subscription_id}` : "",
          stripe_customer_id ? `stripe_customer_id.eq.${stripe_customer_id}` : "",
        ]
          .filter(Boolean)
          .join(",");

        console.debug("[stripe] Constructed OR filters:", orFilters);

        const { error } = await sb
          .from("access_requests")
          .update({ status: "canceled" })
          .or(orFilters);

        if (error) {
          console.error("[stripe] DB update error (deleted):", error);
          throw error;
        }
        console.log("[stripe] Subscription deleted processed:", stripe_subscription_id);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        console.debug("[stripe] Subscription data:", sub);
        const isCanceled = sub.status === "canceled" || sub.status === "incomplete_expired";
        console.debug("[stripe] Subscription isCanceled:", isCanceled);

        if (isCanceled) {
          const stripe_subscription_id = sub.id;
          const stripe_customer_id =
            typeof sub.customer === "string" ? sub.customer : undefined;

          const orFilters = [
            `stripe_subscription_id.eq.${stripe_subscription_id}`,
            stripe_customer_id ? `stripe_customer_id.eq.${stripe_customer_id}` : "",
          ]
            .filter(Boolean)
            .join(",");

          console.debug("[stripe] Constructed OR filters for update:", orFilters);

          const { error } = await sb
            .from("access_requests")
            .update({ status: "canceled" })
            .or(orFilters);

          if (error) {
            console.error("[stripe] DB update error (updated->canceled):", error);
            throw error;
          }
          console.log("[stripe] Subscription canceled via update:", stripe_subscription_id);
        }
        break;
      }

      default:
        console.debug("[stripe] No operation for event type:", event.type);
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    // Return 200 to avoid Stripe retry storms for app-side errors
    console.error("[stripe] Handler error:", err);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
