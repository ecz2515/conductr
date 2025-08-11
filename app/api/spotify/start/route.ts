// app/api/spotify/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = (() => {
  try {
    return Redis.fromEnv();
  } catch {
    // tiny in-memory fallback for local if UPSTASH_* missing
    const mem = new Map<string, { v: string; exp: number }>();
    return {
      async set(key: string, val: string, opts?: { ex?: number }) {
        mem.set(key, { v: val, exp: opts?.ex ? Date.now() + opts.ex * 1000 : Infinity });
      },
      async get<T>(_key: string): Promise<T | null> { return null; },
      async del(_key: string) {},
    } as unknown as Redis;
  }
})();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const state = crypto.randomUUID();

    // save the session payload for 15 minutes
    await redis.set(`oauth:state:${state}`, JSON.stringify(body), { ex: 15 * 60 });

    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;
    const scopes = "playlist-modify-public playlist-modify-private";

    if (!clientId || !redirectUri) {
      return NextResponse.json({ error: "Missing SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI" }, { status: 500 });
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state,
    });

    return NextResponse.json({ url: `https://accounts.spotify.com/authorize?${params.toString()}` });
  } catch (e: any) {
    console.error("[spotify/start] error:", e);
    return NextResponse.json({ error: "Failed to prepare Spotify auth" }, { status: 500 });
  }
}
