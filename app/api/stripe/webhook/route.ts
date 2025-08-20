// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sb } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const WEBHOOK_SECRETS_CSV = process.env.STRIPE_WEBHOOK_SECRET!; // comma-separated
const VERBOSE = process.env.VERBOSE_LOGS === "1";

if (!SECRET_KEY || !WEBHOOK_SECRETS_CSV) {
  throw new Error("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
}

const stripe = new Stripe(SECRET_KEY);

function mask(sec: string) {
  if (!sec) return "";
  const last = sec.slice(-6);
  return `whsec_${"•".repeat(10)}${last}`;
}

function constructEventWithAnySecret(
  payload: string | Buffer,
  sig: string,
  secretsCSV: string
): Stripe.Event {
  const secrets = secretsCSV.split(",").map((s) => s.trim()).filter(Boolean);
  let lastErr: any;
  for (let i = 0; i < secrets.length; i++) {
    const sec = secrets[i];
    try {
      const evt = stripe.webhooks.constructEvent(payload, sig, sec);
      console.info("[stripe] ✅ signature verified with secret", mask(sec), `(index ${i})`);
      return evt;
    } catch (e) {
      if (VERBOSE) console.warn("[stripe] signature try failed for", mask(sec));
      lastErr = e;
    }
  }
  throw lastErr;
}

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get("stripe-signature");
    if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

    // raw body for verification
    const raw = await req.text();
    const event = constructEventWithAnySecret(raw, sig, WEBHOOK_SECRETS_CSV);
    console.log("[stripe] ▶︎", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Prefer metadata.spotify_email; fall back to checkout email for CLI/demo payloads
        const spotify_email_raw =
          (session.metadata?.spotify_email as string | undefined) ??
          session.customer_details?.email ??
          (typeof session.customer_email === "string" ? session.customer_email : "") ??
          "";

        const spotify_email = spotify_email_raw.trim().toLowerCase();

        const stripe_customer_id =
          typeof session.customer === "string" ? session.customer : undefined;
        const stripe_subscription_id =
          typeof session.subscription === "string" ? session.subscription : undefined;
        const stripe_payment_intent_id =
          typeof session.payment_intent === "string" ? session.payment_intent : undefined;

        if (!spotify_email) {
          console.warn("[stripe] checkout completed but no email found (metadata/customer_details)");
          break;
        }

        const { error } = await sb.from("access_requests").upsert(
          {
            spotify_email,
            status: "added", // so your seats counter increments
            stripe_customer_id,
            stripe_subscription_id,
            stripe_payment_intent_id,
          },
          { onConflict: "spotify_email" }
        );
        if (error) throw error;

        console.log("[stripe] upserted access_requests for", spotify_email);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orFilters = [
          `stripe_subscription_id.eq.${sub.id}`,
          typeof sub.customer === "string" ? `stripe_customer_id.eq.${sub.customer}` : "",
        ]
          .filter(Boolean)
          .join(",");

        const { error } = await sb
          .from("access_requests")
          .update({ status: "canceled" })
          .or(orFilters);
        if (error) throw error;

        console.log("[stripe] marked canceled for sub", sub.id);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.status === "canceled" || sub.status === "incomplete_expired") {
          const orFilters = [
            `stripe_subscription_id.eq.${sub.id}`,
            typeof sub.customer === "string" ? `stripe_customer_id.eq.${sub.customer}` : "",
          ]
            .filter(Boolean)
            .join(",");
          const { error } = await sb
            .from("access_requests")
            .update({ status: "canceled" })
            .or(orFilters);
          if (error) throw error;
          console.log("[stripe] marked canceled via update for sub", sub.id);
        }
        break;
      }

      default:
        if (VERBOSE) console.log("[stripe] ignoring event", event.type);
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("[stripe] handler error:", err?.message || err);
    // Return 200 to prevent Stripe retry storms for app-side errors
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
