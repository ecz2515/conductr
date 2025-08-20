import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-07-30.basil" });

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY!;
  const from = process.env.FROM_EMAIL!;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!r.ok) throw new Error(`Resend failed: ${r.status} ${await r.text()}`);
}

export async function POST(req: NextRequest) {
  try {
    const { email, returnUrl } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: true });
    }

    // 1) Find Stripe customer in TEST mode for that email
    const list = await stripe.customers.list({ email, limit: 3 });
    const customer = list.data[0];

    // DEV: tell you whether we matched a customer
    const dev: { matchedCustomer: boolean; emailSent?: boolean; emailError?: string } = { matchedCustomer: !!customer };

    if (!customer) {
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({ ok: true, ...dev });
      }
      return NextResponse.json({ ok: true });
    }

    // 2) Create Billing Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl || process.env.NEXT_PUBLIC_BASE_URL || "https://www.conductr.dev/account",
    });

    // 3) In dev, return the URL as well so you can click it immediately
    if (process.env.NODE_ENV !== "production") {
      try {
        await sendEmail(email, "Your Conductr billing link", `<p><a href="${session.url}">Open Billing Portal</a></p>`);
        dev.emailSent = true;
      } catch (e) {
        dev.emailSent = false;
        dev.emailError = String(e);
      }
      return NextResponse.json({ ok: true, devPortalUrl: session.url, ...dev });
    }

    // 4) In prod, email only
    await sendEmail(
      email,
      "Your Conductr billing link",
      `<p>Use this secure link to manage your Conductr subscription:</p>
       <p><a href="${session.url}">Open Billing Portal</a></p>
       <p>This link expires soon.</p>`
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[send-portal-link] error:", err);
    return NextResponse.json({ ok: true }); // generic OK to avoid enumeration
  }
}
