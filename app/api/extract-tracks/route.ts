import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export async function POST(req: NextRequest) {
  try {
    const { albumId, accessToken, workTitle, movementTitles = [] } = await req.json();

    console.log(`Extracting tracks for album ID: ${albumId}, work: ${workTitle}`);

    // 1. Fetch tracks for the album
    const res = await fetch(`${SPOTIFY_API_BASE}/albums/${albumId}/tracks?limit=50`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!res.ok) {
      console.error("Failed to fetch album tracks");
      return NextResponse.json({ error: "Failed to fetch album tracks" }, { status: 500 });
    }
    
    const data = await res.json();
    const tracks = data.items;
    console.log(`Fetched ${tracks.length} tracks from album`);

    // 2. Compose AI prompt
    const prompt = `
You are a classical music expert. Here is a list of tracks from a Spotify album:
${tracks.map((t: any, i: number) => `${i + 1}. ${t.name}`).join('\n')}

The user wants to extract tracks for: "${workTitle}"

${movementTitles.length ? `Specifically looking for these movements:\n${movementTitles.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}\n` : ""}

Instructions:
- If this is a complete symphony/concerto/etc., find all movements of the requested work
- If this is a compilation album with multiple works, find only the tracks for the requested work
- If a specific movement is requested, find only that movement
- Consider common movement names (Allegro, Adagio, Scherzo, Finale, etc.)
- Look for movement numbers (I, II, III, IV or 1, 2, 3, 4)

Which track numbers from the above list correspond to the requested work/movements (in order)? Respond ONLY with a comma-separated list of track numbers, no extra text.
  `.trim();

    console.log("Sending prompt to OpenAI");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 40,
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

    // If the LLM failed, fallback to first N tracks (optional)
    const resultTracks =
      aiTracks.length > 0 ? aiTracks : tracks.slice(0, movementTitles.length || 4);

    console.log("Final selected tracks:", resultTracks.map((t: any) => t.name));

    return NextResponse.json({
      uris: resultTracks.map((t: any) => t.uri),
      tracks: resultTracks,
    });
  } catch (error: any) {
    console.error("Error in track extraction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 