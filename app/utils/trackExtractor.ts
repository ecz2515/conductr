// app/utils/trackExtractor.ts
import OpenAI from "openai";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export async function getWorkTracksFromAlbum({
  albumId,
  accessToken,
  workTitle,
  movementTitles = [],
}: {
  albumId: string;
  accessToken: string;
  workTitle: string;
  movementTitles?: string[];
}): Promise<{ uris: string[]; tracks: any[] }> {
  console.log(`Fetching tracks for album ID: ${albumId}`);

  // 1. Fetch tracks for the album
  const res = await fetch(`${SPOTIFY_API_BASE}/albums/${albumId}/tracks?limit=50`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    console.error("Failed to fetch album tracks");
    throw new Error("Failed to fetch album tracks");
  }
  const data = await res.json();
  const tracks = data.items;
  console.log(`Fetched ${tracks.length} tracks from album`);

  // 2. Compose AI prompt
  const prompt = `
Here is a list of tracks from a Spotify album:
${tracks.map((t: any, i: number) => `${i + 1}. ${t.name}`).join('\n')}

The user wants to extract all movements of the following work for a playlist:
"${workTitle}"

${movementTitles.length ? `The movements are:\n${movementTitles.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}\n` : ""}

Which track numbers from the above list correspond to this work (in order)? Respond ONLY with a comma-separated list of track numbers, no extra text.
  `.trim();

  console.log("Sending prompt to OpenAI:", prompt);

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

  return {
    uris: resultTracks.map((t: any) => t.uri),
    tracks: resultTracks,
  };
}
