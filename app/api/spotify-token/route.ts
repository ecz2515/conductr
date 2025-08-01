import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("=== [DEBUG] Entering POST function ===");
    const { code } = await req.json();
    console.log("[DEBUG] Request JSON parsed successfully");
    console.log("[DEBUG] Code received:", code);
    console.log("[DEBUG] SPOTIFY_REDIRECT_URI:", process.env.SPOTIFY_REDIRECT_URI);

    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", process.env.SPOTIFY_REDIRECT_URI!);
    console.log("[DEBUG] URLSearchParams constructed:", params.toString());

    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
    console.log("[DEBUG] Client ID and Secret retrieved");

    console.log("[DEBUG] Sending request to Spotify with redirect_uri:", process.env.SPOTIFY_REDIRECT_URI);

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: params,
    });
    console.log("[DEBUG] Request sent to Spotify");

    const text = await response.text();
    console.log("[DEBUG] Spotify API response received:", text);

    const data = JSON.parse(text);
    console.log("[DEBUG] Response JSON parsed successfully");

    if (!response.ok) {
      console.error("[ERROR] Spotify API response not OK:", response.status, data);
      return NextResponse.json({ error: data }, { status: response.status });
    }

    console.log("[DEBUG] Spotify token exchange successful");
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[ERROR] Error exchanging Spotify token:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}