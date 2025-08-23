"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PageContainer,
  ContentWrapper,
  Card,
  Button,
  Input,
  PageTitle,
  PageSubtitle,
  Alert,
  Footer,
} from "../../components/design-system";

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
    <PageContainer centered>
      <ContentWrapper maxWidth="md">
        <Card variant="elevated" className="p-8 animate-expand animate-fade-in">
          <div className="text-center mb-8">
            <PageTitle className="mb-4">Account & Billing</PageTitle>
            <PageSubtitle>Manage your subscription and billing preferences</PageSubtitle>
          </div>

          {sent ? (
            <Alert variant="success" className="mb-8">
              If an account exists for that email, we've sent a secure link to manage billing.
              Please check your inbox.
            </Alert>
          ) : (
            <form onSubmit={sendLink} className="space-y-6 mb-8">
              <Input
                label="Email Address"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              
              <Button
                type="submit"
                loading={loading}
                size="lg"
                className="w-full"
              >
                {loading ? "Sending..." : "Email me a billing link"}
              </Button>

              {err && <Alert variant="error">{err}</Alert>}
            </form>
          )}

          <div className="flex flex-col items-center space-y-6">
            <Footer />
            
            <Link href="/">
              <Button variant="secondary" size="sm">
                ← Back to Home
              </Button>
            </Link>
          </div>
        </Card>
      </ContentWrapper>
    </PageContainer>
  );
}
