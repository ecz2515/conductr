"use client";

import { useState } from "react";

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/billing/send-portal-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, returnUrl: `${window.location.origin}/account` }),
      });
      // Always show success, even if no account found (avoid enumeration)
      setSent(true);
    } catch (e: any) {
      setErr("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Account & Billing</h1>

      {sent ? (
        <div className="rounded-lg border p-3 bg-green-50">
          If an account exists for that email, we’ve sent a secure link to manage billing.
          Please check your inbox.
        </div>
      ) : (
        <form onSubmit={sendLink} className="space-y-3">
          <label className="block text-sm">Enter your email to receive a secure billing link:</label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded px-4 py-2 border"
          >
            {loading ? "Sending..." : "Email me a billing link"}
          </button>
          {err && <div className="text-sm text-red-600">{err}</div>}
        </form>
      )}
    </div>
  );
}
