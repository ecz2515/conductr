// app/thank-you/page.tsx
import {
  PageContainer,
  ContentWrapper,
  Card,
  PageTitle,
  PageSubtitle,
  Footer,
} from "../../components/design-system";

export default async function ThankYou({
    searchParams,
  }: {
    searchParams: Promise<{ mode?: string; email?: string }>;
  }) {
    const sp = await searchParams;
    const mode = sp.mode ?? "apply";
    const email = sp.email ?? "";
  
    const heading =
      mode === "waitlist"
        ? "You're on the waitlist"
        : "Payment received";
    const body =
      mode === "waitlist"
        ? "We'll email you if a seat opens up."
        : "We'll manually add your Spotify email to our allowlist and notify you when you're in. If we can't add you within 7 days, you'll be refunded automatically.";
  
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

        <ContentWrapper maxWidth="md">
          <Card variant="elevated" className="p-8 text-center animate-expand animate-fade-in">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 bg-[#1ed760] rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            <PageTitle className="mb-4">{heading}</PageTitle>
            <PageSubtitle className="mb-8">{body}</PageSubtitle>
            
            {email && (
              <div className="mb-8 p-4 bg-[#232323] rounded-xl border border-[#282828]">
                <p className="text-[#b3b3b3] text-sm border border-[#1ed760] rounded-full p-2">Email: <span className="text-white font-medium">{email}</span></p>
              </div>
            )}

            <div className="flex justify-center">
              <a
                href="/"
                className="bg-[#1ed760] hover:bg-[#1db954] text-black font-bold px-6 py-3 rounded-xl text-base shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Back to Home
              </a>
            </div>

            <Footer />
          </Card>
        </ContentWrapper>
      </PageContainer>
    );
  }
  