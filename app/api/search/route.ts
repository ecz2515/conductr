import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// ---- SPOTIFY ACCESS TOKEN ----
let tokenCache = { token: null as null | string, expires: 0 };

async function getAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expires) {
    return tokenCache.token;
  }
  const res = await axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({ grant_type: "client_credentials" }),
    {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET
          ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  tokenCache.token = res.data.access_token;
  tokenCache.expires = Date.now() + res.data.expires_in * 1000 - 60000;
  return tokenCache.token;
}

// ---- FETCH ALBUMS ----
async function fetchSpotifyAlbums(token: string, query: string, pages = 1) {
  let allAlbums: any[] = [];
  for (let page = 0; page < pages; page++) {
    const offset = page * 20;
    const res = await axios.get("https://api.spotify.com/v1/search", {
      headers: { Authorization: "Bearer " + token },
      params: {
        q: query,
        type: "album",
        limit: 20,
        offset,
      },
    });
    const albums = res.data.albums.items.map((album: any) => ({
      id: album.id,
      name: album.name,
      artists: album.artists.map((a: any) => a.name).join(", "),
      release_date: album.release_date,
      total_tracks: album.total_tracks,
      image: album.images?.[0]?.url,
      uri: album.uri,
    }));
    allAlbums.push(...albums);
    if (albums.length < 20) break;
  }
  // Remove duplicates by album id
  const seen = new Set();
  allAlbums = allAlbums.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
  return allAlbums;
}

// ---- AI ANALYSIS (album name only) ----
async function analyzeAlbumMeta({
  album,
  userQuery,
}: {
  album: any;
  userQuery: string;
}) {
  const prompt = `
You are a classical music metadata expert. 
The user is searching for: "${userQuery}".
Here is a Spotify album:
- Album name: ${album.name}
- Album artists: ${album.artists}
- Release date: ${album.release_date}
- Total tracks: ${album.total_tracks}

Based on the album metadata and your knowledge of classical discography, answer:
1. Does this album most likely contain a complete recording of the user's requested work (not just a single movement or excerpt)? Only say "true" if you are quite certain.
2. What is the likely conductor and orchestra (guess from artist/album name if possible)?

Output JSON like:
{
  "isComplete": true/false,
  "conductor": "...",
  "orchestra": "..."
}
`;

  const completion = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert classical music metadata assistant.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 400,
      temperature: 0.0,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  const content = completion.data.choices[0].message.content;
  let parsed: any = {};
  try {
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}") + 1;
    parsed = JSON.parse(content.slice(jsonStart, jsonEnd));
  } catch (e) {
    parsed = { isComplete: false };
  }
  return parsed;
}

// ---- MAIN API ROUTE (POST: canonical object) ----
export async function POST(req: NextRequest) {
  try {
    const canonical = await req.json();
    if (!canonical || !canonical.composer || !canonical.work) {
      return NextResponse.json(
        { error: "Missing canonical composer or work" },
        { status: 400 }
      );
    }

    // Build a strong search string from canonical fields
    const parts = [
      canonical.composer,
      canonical.work,
      canonical.movement || "",
      canonical.catalog || "",
    ].filter(Boolean);
    const query = parts.join(" ").replace(/\s+/g, " ");

    // 1. Get Spotify token
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json(
        { error: "Spotify token fetch failed" },
        { status: 500 }
      );
    }

    // 2. Search albums for built query
    const albums = await fetchSpotifyAlbums(token, query, 3); // up to 60 albums

    // 3. AI analysis for each album
    const albumResults: any[] = [];
    for (const album of albums) {
      const ai = await analyzeAlbumMeta({ album, userQuery: query });

      albumResults.push({
        ...album,
        isComplete: ai.isComplete,
        conductor: ai.conductor,
        orchestra: ai.orchestra,
      });
    }

    // 4. Sort complete albums first
    albumResults.sort((a, b) => (b.isComplete ? 1 : 0) - (a.isComplete ? 1 : 0));

    return NextResponse.json(albumResults);
  } catch (error: any) {
    console.error(error?.response?.data || error.message);
    return NextResponse.json({ error: "Spotify/OpenAI API error" }, { status: 500 });
  }
}

// ---- Optional: Legacy GET handler ----
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  if (!query) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  }

  try {
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ error: "Spotify token fetch failed" }, { status: 500 });
    }

    const albums = await fetchSpotifyAlbums(token, query!, 3);

    const albumResults: any[] = [];
    for (const album of albums) {
      const ai = await analyzeAlbumMeta({ album, userQuery: query! });
      albumResults.push({
        ...album,
        isComplete: ai.isComplete,
        conductor: ai.conductor,
        orchestra: ai.orchestra,
      });
    }

    albumResults.sort((a, b) => (b.isComplete ? 1 : 0) - (a.isComplete ? 1 : 0));
    return NextResponse.json(albumResults);
  } catch (error: any) {
    console.error(error?.response?.data || error.message);
    return NextResponse.json({ error: "Spotify/OpenAI API error" }, { status: 500 });
  }
}
