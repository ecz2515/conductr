// app/access-gate/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sb } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const SEATS_CAP = 25;

async function seatsUsed() {
  const { count } = await sb.from("access_requests").select("*", { head: true, count: "exact" }).eq("status","added");
  return count ?? 0;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const intent = String(form.get("intent") || "");
  const spotify_email = String(form.get("spotify_email") || "").trim().toLowerCase();

  if (!spotify_email) return NextResponse.redirect("/access-gate?error=missing_email", { status: 303 });

  const used = await seatsUsed();
  const full = used >= SEATS_CAP;

  // derive absolute origin from the incoming request (works locally & on Vercel)
  const origin = req.nextUrl.origin; // e.g., http://localhost:3000 or https://www.conductr.dev

  if (intent === "waitlist" || full) {
    await sb.from("access_requests").upsert({ spotify_email, status: "waitlist" }, { onConflict: "spotify_email" });
    return NextResponse.redirect(`${origin}/thank-you?mode=waitlist&email=${encodeURIComponent(spotify_email)}`, { status: 303 });
  }

  if (intent === "apply") {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${origin}/thank-you?mode=apply&email=${encodeURIComponent(spotify_email)}`,
      cancel_url: `${origin}/access-gate?canceled=1`,
      metadata: { spotify_email },
    });
    return NextResponse.redirect(session.url!, { status: 303 });
  }

  return NextResponse.redirect(`${origin}/access-gate?error=invalid_intent`, { status: 303 });
}
