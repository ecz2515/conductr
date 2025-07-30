import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import Redis from "ioredis";
import pLimit from "p-limit";

// ---- REDIS CONFIG ----
const redis = new Redis(process.env.REDIS_URL!, {
  tls: {}, // Required for Upstash SSL
  maxRetriesPerRequest: 1, // Avoid long retry loops
  enableReadyCheck: false,
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// ---- SPOTIFY ACCESS TOKEN ----
let tokenCache = { token: null as null | string, expires: 0 };

async function getAccessToken() {
  console.log('[DEBUG] Getting Spotify access token');
  console.log('[DEBUG] Spotify credentials:', {
    hasClientId: !!SPOTIFY_CLIENT_ID,
    hasClientSecret: !!SPOTIFY_CLIENT_SECRET,
    clientIdLength: SPOTIFY_CLIENT_ID?.length || 0,
    clientSecretLength: SPOTIFY_CLIENT_SECRET?.length || 0
  });
  
  if (tokenCache.token && Date.now() < tokenCache.expires) {
    console.log('[DEBUG] Using cached token');
    return tokenCache.token;
  }
  
  try {
    console.log('[DEBUG] Fetching new token from Spotify');
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
    console.log('[DEBUG] Spotify token response received');
    console.log('[DEBUG] Token response status:', res.status);
    console.log('[DEBUG] Token response has access_token:', !!res.data.access_token);
    tokenCache.token = res.data.access_token;
    tokenCache.expires = Date.now() + res.data.expires_in * 1000 - 60000;
    console.log('[DEBUG] Token cached, expires in:', res.data.expires_in, 'seconds');
    return tokenCache.token;
  } catch (error: any) {
    console.error('[DEBUG] Spotify token error:', {
      message: error.message,
      response: error?.response?.data,
      status: error?.response?.status,
      statusText: error?.response?.statusText
    });
    throw error;
  }
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

// ---- AI ANALYSIS ----
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
2. What is the conductor and orchestra (guess from artist/album name if possible)? If you are not sure, leave blank.

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
      model: "gpt-4o-mini",
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

// ---- MAIN API ROUTE ----
export async function POST(req: NextRequest) {
  try {
    console.log('[DEBUG] ===== SEARCH API START =====');
    console.log('[DEBUG] Environment variables check:', {
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasSpotifyClientId: !!process.env.SPOTIFY_CLIENT_ID,
      hasSpotifySecret: !!process.env.SPOTIFY_CLIENT_SECRET,
      hasRedis: !!process.env.REDIS_URL,
      redisUrl: process.env.REDIS_URL ? 'SET' : 'NOT SET'
    });
    
    const startTime = Date.now();
    console.log('[DEBUG] Parsing request body...');
    const canonical = await req.json();
    console.log('[DEBUG] Received canonical data:', canonical);
    
    if (!canonical || !canonical.composer || !canonical.work) {
      console.log('[DEBUG] Missing canonical data:', { canonical });
      return NextResponse.json(
        { error: "Missing canonical composer or work" },
        { status: 400 }
      );
    }

    const parts = [
      canonical.composer,
      canonical.work,
      canonical.movement || "",
      canonical.catalog || "",
    ].filter(Boolean);
    const query = parts.join(" ").replace(/\s+/g, " ");
    console.log('[DEBUG] Built search query:', query);

    const canonicalKey = parts.join(":").toLowerCase().replace(/\s+/g, "_");
    console.log('[DEBUG] Canonical key:', canonicalKey);

    console.log('[DEBUG] Getting Spotify access token...');
    const token = await getAccessToken();
    console.log('[DEBUG] Spotify token obtained successfully');

    console.log('[DEBUG] Fetching Spotify albums...');
    const albums = await fetchSpotifyAlbums(token as string, query, 3);
    if (!albums || albums.length === 0) {
      console.log('[DEBUG] No albums found for query:', query);
      return NextResponse.json(
        { error: "No albums found for the given query" },
        { status: 404 }
      );
    }
    console.log(`[DEBUG] Fetched ${albums.length} albums for query: ${query}`);

    console.log('[DEBUG] Starting AI analysis...');
    const limit = pLimit(5);
    const albumResults: any[] = [];
    const uncachedTasks: any[] = [];
    const uncachedIndexes: number[] = [];
    const cachedResults: any[] = [];

    for (let i = 0; i < albums.length; i++) {
      const album = albums[i];
      console.log(`[DEBUG] Processing album ${i + 1}/${albums.length}: ${album.name}`);
      const cacheKey = `search:ai:analysis:${album.id}:${canonicalKey}`;
      let ai: any;

      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          console.log(`[CACHE] Hit for album ${album.id} (${album.name})`);
          ai = JSON.parse(cached);
        } else {
          console.log(`[CACHE] Miss for album ${album.id} (${album.name}) - calling OpenAI`);
          uncachedIndexes.push(i);
          uncachedTasks.push(limit(async () => {
            console.log(`[OPENAI] Analyzing album ${album.id} (${album.name})`);
            ai = await analyzeAlbumMeta({ album, userQuery: query });
            try {
              await redis.set(cacheKey, JSON.stringify(ai), 'EX', 60 * 60 * 24 * 30);
              console.log(`[DEBUG] Cached AI result for album ${album.id}`);
            } catch (cacheError) {
              console.log(`[DEBUG] Failed to cache AI result for album ${album.id}:`, cacheError);
            }
            return { ...album, isComplete: ai.isComplete, conductor: ai.conductor, orchestra: ai.orchestra };
          }));
        }
      } catch (redisError) {
        console.log(`[DEBUG] Redis error for album ${album.id}:`, redisError);
        uncachedIndexes.push(i);
        uncachedTasks.push(limit(async () => {
          console.log(`[OPENAI] Analyzing album ${album.id} (${album.name}) - Redis failed`);
          ai = await analyzeAlbumMeta({ album, userQuery: query });
          return { ...album, isComplete: ai.isComplete, conductor: ai.conductor, orchestra: ai.orchestra };
        }));
      }

      if (ai) {
        cachedResults[i] = { ...album, isComplete: ai.isComplete, conductor: ai.conductor, orchestra: ai.orchestra };
      }
    }

    console.log(`[DEBUG] Waiting for ${uncachedTasks.length} AI analysis tasks...`);
    const uncachedResults = await Promise.all(uncachedTasks);
    console.log('[DEBUG] All AI analysis tasks completed');

    let uncachedIdx = 0;
    for (let i = 0; i < albums.length; i++) {
      if (cachedResults[i]) {
        albumResults[i] = cachedResults[i];
      } else {
        albumResults[i] = uncachedResults[uncachedIdx++];
      }
    }

    console.log('[DEBUG] Sorting results...');
    albumResults.sort((a, b) => (b.isComplete ? 1 : 0) - (a.isComplete ? 1 : 0));

    const elapsed = Date.now() - startTime;
    const MIN_LOADING_TIME = 4000;
    if (elapsed < MIN_LOADING_TIME) {
      const wait = MIN_LOADING_TIME - elapsed;
      console.log(`[DEBUG] Artificially waiting ${wait}ms for minimum loading time.`);
      await new Promise(res => setTimeout(res, wait));
    }

    console.log(`[DEBUG] Total search time (including any artificial wait): ${Date.now() - startTime}ms`);
    console.log(`[DEBUG] Returning ${albumResults.length} album results`);
    console.log('[DEBUG] ===== SEARCH API SUCCESS =====');

    return NextResponse.json(albumResults);
  } catch (error: any) {
    console.error('[DEBUG] ===== SEARCH API ERROR =====');
    console.error('[DEBUG] Main search API error:', {
      message: error.message,
      response: error?.response?.data,
      status: error?.response?.status,
      stack: error.stack
    });
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
