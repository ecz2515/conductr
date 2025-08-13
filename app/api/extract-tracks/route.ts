import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const URI_RE = /^spotify:track:[A-Za-z0-9]{22}$/;
const ID_RE = /^[A-Za-z0-9]{22}$/;

// Ensure only valid Spotify track URIs are returned
function normalizeTrackUris(raw: any[]): string[] {
  console.log("Normalizing track URIs:", raw);
  const out: string[] = [];
  for (const v of raw || []) {
    const s = typeof v === "string" ? v.trim() : "";
    if (!s) continue;

    if (URI_RE.test(s)) { 
      out.push(s); 
      console.log("Valid URI added:", s);
      continue; 
    }
    if (ID_RE.test(s)) { 
      const uri = `spotify:track:${s}`;
      out.push(uri); 
      console.log("ID converted to URI and added:", uri);
      continue; 
    }

    const m = s.match(/open\.spotify\.com\/track\/([A-Za-z0-9]{22})/);
    if (m) { 
      const uri = `spotify:track:${m[1]}`;
      out.push(uri); 
      console.log("Open URL converted to URI and added:", uri);
      continue; 
    }
  }
  const uniqueUris = Array.from(new Set(out)).filter(u => URI_RE.test(u));
  console.log("Unique and valid URIs after normalization:", uniqueUris);
  return uniqueUris;
}

export async function POST(req: NextRequest) {
  try {
    const { albumId, accessToken, workTitle, movementTitles = [] } = await req.json();
    console.log("Received request with data:", { albumId, accessToken, workTitle, movementTitles });

    console.log(`Extracting tracks for album ID: ${albumId}, work: ${workTitle}`);

    // 1. Fetch tracks for the album
    const res = await fetch(`${SPOTIFY_API_BASE}/albums/${albumId}/tracks?limit=50`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    console.log("Spotify API response status:", res.status);
    if (!res.ok) {
      console.error("Failed to fetch album tracks");
      return NextResponse.json({ error: "Failed to fetch album tracks" }, { status: 500 });
    }
    
    const data = await res.json();
    const tracks = data.items;
    console.log(`Fetched ${tracks.length} tracks from album`, tracks);

    if (!Array.isArray(tracks) || tracks.length === 0) {
      console.warn("No tracks found in album");
      return NextResponse.json({ uris: [], tracks: [] });
    }

    // 2. Compose AI prompt
    const prompt = `
You are a classical music expert. Here is a list of tracks from a Spotify album:
${tracks.map((t: any, i: number) => `${i + 1}. ${t.name}`).join('\n')}

The user wants to extract tracks for: "${workTitle}"

${movementTitles.length ? `Specifically looking for these movements:\n${movementTitles.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}\n` : ""}

Instructions:
- If the user requests a specific movement or movements, select ALL tracks that correspond to those movements, even if a single movement is split across multiple tracks.
- If the user requests the entire work (e.g., a symphony or concerto), select ALL tracks for ALL movements of that work, in order.
- IMPORTANT: Each movement may be split into multiple tracks on this album. You must extract ALL tracks that belong to the requested work/movements, not just the first few.
- For large works like Mahler symphonies, some albums split movements into many tracks (20+ tracks total). You must include ALL of these tracks.
- If the album contains multiple works, select only the tracks for the requested work or movement(s).
- Match movement names and numbers carefully (e.g., "II. Andante", "2. Andante", "Mvt. 2", "II", "2", etc.).
- Look for partial matches and variations in track naming that might indicate the same movement.
- Do NOT include extra tracks, introductions, or unrelated works.
- Respond ONLY with a comma-separated list of track numbers, no extra text.

Which track numbers from the above list correspond to the requested work/movements (in order)? Respond ONLY with a comma-separated list of track numbers, no extra text.
`.trim();

    console.log("Sending prompt to OpenAI:", prompt);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    });
    
    const content = response.choices[0].message.content ?? "";
    console.log("Received response from OpenAI:", content);

    // Parse comma-separated numbers from the LLM's response
    const indices = content
      .match(/\d+/g)
      ?.map(Number)
      .filter((n) => n > 0 && n <= tracks.length) ?? [];

    console.log("Parsed track indices from response:", indices);

    const aiTracks = indices.map((i) => tracks[i - 1]);
    console.log("AI selected tracks:", aiTracks.map((t: any) => t.name));

    // If the LLM failed, fallback to first N tracks (optional)
    const resultTracks =
      aiTracks.length > 0 ? aiTracks : tracks.slice(0, movementTitles.length || 4);

    console.log("Final selected tracks:", resultTracks.map((t: any) => t.name));

    // Sanitize URIs before sending to client
    const uris = normalizeTrackUris(resultTracks.map((t: any) => t.uri));

    if (uris.length === 0) {
      console.warn("No valid URIs after normalization");
      return NextResponse.json({ error: "No valid Spotify track URIs" }, { status: 422 });
    }

    console.log("Returning response with URIs and tracks:", { uris, tracks: resultTracks });
    return NextResponse.json({
      uris,
      tracks: resultTracks,
    });
  } catch (error: any) {
    console.error("Error in track extraction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
