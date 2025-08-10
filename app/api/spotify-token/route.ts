import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: "missing_code" }, { status: 400 });
    }

    // MUST match the redirect used in /authorize EXACTLY.
    const redirectUri =
      process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ||
      process.env.NEXT_PUBLIC_REDIRECT_URI ||
      process.env.SPOTIFY_REDIRECT_URI;

    const clientId =
      process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        {
          error: "missing_env",
          detail: {
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
            redirectUri,
          },
        },
        { status: 500 }
      );
    }

    // Build x-www-form-urlencoded body
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString();

    // Debug: log exactly what we’re sending (minus secrets)
    console.log("[spotify-token] redirect_uri used in token exchange:", redirectUri);

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body,
    });

    const text = await tokenRes.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!tokenRes.ok) {
      // Surface Spotify's actual error (e.g., invalid_grant, invalid_client, invalid_redirect)
      console.error("[spotify-token] error", tokenRes.status, json);
      return NextResponse.json(
        { error: "spotify_token_error", status: tokenRes.status, spotify: json },
        { status: 500 }
      );
    }

    return NextResponse.json(json);
  } catch (err: any) {
    console.error("[spotify-token] server_error", err);
    return NextResponse.json({ error: "server_error", detail: err.message }, { status: 500 });
  }
}
