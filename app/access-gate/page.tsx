// app/access-gate/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sb } from "@/lib/supabase-admin";
import {
  PageContainer,
  ContentWrapper,
  Card,
  Button,
  Input,
  PageTitle,
  PageSubtitle,
  Alert,
} from "../../components/design-system";

// ---- CONFIG ----
const SEATS_CAP = 25; // hard cap per Spotify dev rules

// TODO: Replace with your actual DB call.
async function getSeatsUsed(): Promise<number> {
  const { count, error } = await sb
    .from("access_requests")
    .select("*", { head: true, count: "exact" })
    .eq("status", "added");

  if (error) {
    console.error("Supabase error:", error);
    return 0;
  }
  return count ?? 0;
}

export const metadata: Metadata = {
  title: "Conductr — Invite‑Only Access",
  description:
    "Spotify limits developer apps to 25 allowlisted users. Apply for access, join the free waitlist, or run Conductr locally.",
};

// Next 15 note: searchParams is a *Promise*.
// Accept both string and string[] just in case.
type SP = { [key: string]: string | string[] | undefined };

export default async function AccessGatePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const reason =
    (Array.isArray(sp?.reason) ? sp?.reason?.[0] : sp?.reason) ?? undefined;
  const canceled =
    (Array.isArray(sp?.canceled) ? sp?.canceled?.[0] : sp?.canceled) ??
    undefined;

  const seatsUsed = await getSeatsUsed();
  const seatsFull = seatsUsed >= SEATS_CAP;

  // Optional: require a reason (e.g., only reachable after a 403). Comment out if you want it public.
  // if (!reason) redirect("/");

  return (
    <PageContainer centered>
      {/* Account Icon - Fixed Position */}
      <div className="fixed top-6 right-6 z-50">
        <a
          href="/account"
          className="flex items-center justify-center w-12 h-12 bg-[#181818] hover:bg-[#232323] rounded-full shadow-lg border border-[#282828] transition-all duration-200 hover:scale-110 group"
          aria-label="Account & Billing"
        >
          <svg
            className="w-6 h-6 text-[#b3b3b3] group-hover:text-white transition-colors duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </a>
      </div>

      <ContentWrapper maxWidth="xl" className="py-8">
        <div className="space-y-6 mt-12">
          {/* Header Section */}
          <div className="text-center space-y-3">
            <PageTitle>Invite‑Only Access (Limited by Spotify)</PageTitle>
            <PageSubtitle>
              You authenticated successfully, but your Spotify account isn't on
              our allowlist yet. Spotify limits developer apps to{" "}
              <strong>25 users</strong>. If a seat is available, you can apply
              for access ($5/month, fully refundable if we can't add you). Or
              join the free waitlist.
            </PageSubtitle>
          </div>

          {/* Seat Counter */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[#b3b3b3] text-sm">Seats in use:</span>
              <span className="text-white text-lg font-semibold">
                {seatsUsed}/{SEATS_CAP}
              </span>
            </div>
            {seatsFull && (
              <Alert variant="warning" className="mt-3">
                All seats are currently full. You can still join the waitlist or
                run Conductr locally.
              </Alert>
            )}
          </Card>

          {/* Access Form */}
          <AccessForm seatsFull={seatsFull} />

          {/* FAQ Section */}
          <Card className="p-4">
            <h2 className="text-white text-lg font-semibold mb-4">
              Frequently Asked Questions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="text-[#1ed760] font-medium text-sm mb-1">
                  Why invite‑only?
                </h3>
                <p className="text-[#b3b3b3] text-xs leading-relaxed">
                  Spotify restricts developer apps to a small allowlist unless
                  you're a large, launched company. Conductr is open‑source; the
                  hosted version is invite‑only to stay compliant.
                </p>
              </div>

              <div>
                <h3 className="text-[#1ed760] font-medium text-sm mb-1">
                  How long after I pay?
                </h3>
                <p className="text-[#b3b3b3] text-xs leading-relaxed">
                  Adding is manual due to Spotify policy. You'll get an email
                  when your account is on the allowlist. If we can't add you
                  within <strong>7 days</strong>, we automatically refund.
                </p>
              </div>

              <div>
                <h3 className="text-[#1ed760] font-medium text-sm mb-1">
                  What if seats are full?
                </h3>
                <p className="text-[#b3b3b3] text-xs leading-relaxed">
                  The hosted version is capped at 25 accounts. You can join the
                  free waitlist or run Conductr locally with your own Spotify
                  credentials.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </ContentWrapper>
    </PageContainer>
  );
}

function AccessForm({ seatsFull }: { seatsFull: boolean }) {
  return (
    <Card className="p-4">
      <form className="space-y-4" action="/access-gate/submit" method="POST">
        {/* We post to a single endpoint that branches server‑side into checkout vs waitlist */}
        <Input
          label="Email associated with your Spotify account"
          name="spotify_email"
          type="email"
          inputMode="email"
          placeholder="Enter here"
          required
        />

        {/* Button Row */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            name="intent"
            value="apply"
            type="submit"
            disabled={seatsFull}
            variant="primary"
            size="md"
            className="w-full sm:flex-1"
            title={
              seatsFull
                ? "Seats are full — join the waitlist instead."
                : "Apply for Access — $5"
            }
          >
            Get Access
            <br />
            ($5 per month)
          </Button>

          <Button
            name="intent"
            value="waitlist"
            type="submit"
            variant="secondary"
            size="md"
            className="w-full sm:flex-1"
          >
            Join Free Waitlist
          </Button>
        </div>

        {/* Local Link */}
        <div className="flex justify-center">
          <Link
            href="https://github.com/ecz2515/conductr"
            className="text-[#1ed760] hover:text-[#1db954] text-sm underline transition-colors"
          >
            Run Conductr locally
          </Link>
        </div>

        {/* Terms */}
        <div className="space-y-1 text-xs text-[#666666] bg-[#181818] p-3 rounded-lg border border-[#282828]">
          <p>• If we can't add you within 7 days, we automatically refund.</p>
          <p>
            • Adding is manual due to Spotify policy; expect a short delay after
            payment.
          </p>
        </div>
      </form>
    </Card>
  );
}
