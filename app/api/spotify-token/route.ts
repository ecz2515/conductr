import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("[spotify-token] POST request received");
    const { code } = await req.json();
    console.log("[spotify-token] Received code:", code);

    if (!code) {
      console.warn("[spotify-token] Missing code in request");
      return NextResponse.json({ error: "missing_code" }, { status: 400 });
    }

    const redirectUri =
      process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ||
      process.env.NEXT_PUBLIC_REDIRECT_URI ||
      process.env.SPOTIFY_REDIRECT_URI;
    console.log("[spotify-token] Using redirectUri:", redirectUri);

    const clientId =
      process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    console.log("[spotify-token] Using clientId:", clientId);
    console.log("[spotify-token] Client secret is set:", !!clientSecret);

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("[spotify-token] Missing environment variables", {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        redirectUri,
      });
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

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString();
    console.log("[spotify-token] Built request body for token exchange");

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body,
    });
    console.log("[spotify-token] Token request sent, awaiting response");

    const text = await tokenRes.text();
    console.log("[spotify-token] Received response text:", text);

    let json: any = {};
    try {
      json = JSON.parse(text);
      console.log("[spotify-token] Parsed JSON response:", json);
    } catch (error) {
      console.error("[spotify-token] Failed to parse JSON, using raw text");
      json = { raw: text };
    }

    if (!tokenRes.ok) {
      console.error("[spotify-token] Error response from Spotify", tokenRes.status, json);
      return NextResponse.json(
        { error: "spotify_token_error", status: tokenRes.status, spotify: json },
        { status: 500 }
      );
    }

    console.log("[spotify-token] Successfully retrieved token:", json);
    return NextResponse.json(json);
  } catch (err: any) {
    console.error("[spotify-token] server_error", err);
    return NextResponse.json({ error: "server_error", detail: err.message }, { status: 500 });
  }
}
