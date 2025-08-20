// lib/supabase/server.ts
import { cookies as nextCookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createClient(cookieStore: Awaited<ReturnType<typeof nextCookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},    // no-op in RSC
        remove() {}, // no-op in RSC
      },
    }
  );
}
