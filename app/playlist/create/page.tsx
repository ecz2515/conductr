"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAlbumStore } from "../../store/albumStore"; // import your album store

export default function PlaylistCreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

    useEffect(() => {
    console.log("useEffect triggered");
    // Extract ?code and ?state from URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const stateParam = urlParams.get("state");
    console.log("OAuth code:", code, "State:", stateParam);

    if (!code || !stateParam) {
      setError("Missing required information from Spotify. Try again.");
      return;
    }

    setLoading(true);

    // Parse the state parameter which contains both IDs and album data
    const [idsStr, albumDataStr] = stateParam.split("|");
    const ids = idsStr.split(",").filter(Boolean);
    
    // Decode album data from base64
    let storedAlbums = [];
    if (albumDataStr) {
      try {
        const decodedData = atob(albumDataStr);
        storedAlbums = JSON.parse(decodedData);
        console.log("Decoded albums from URL:", storedAlbums);
      } catch (e) {
        console.error("Failed to decode album data:", e);
        setError("Failed to decode album data. Go back and try again.");
        setLoading(false);
        return;
      }
    }
    
    if (!storedAlbums || storedAlbums.length === 0) {
      setError("No albums found. Go back and select albums.");
      setLoading(false);
      return;
    }

    // 1. Exchange code for access token
    fetch("/api/spotify-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(res => res.json())
      .then(async data => {
        if (!data.access_token) {
          setError("Could not get Spotify access token.");
          setLoading(false);
          return;
        }
        // 2. Clean up URL
        window.history.replaceState({}, document.title, "/playlist/create");
        // 3. Get user info
        const userResp = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        const user = await userResp.json();

        // 4. Create playlist
        const playlistResp = await fetch(
          `https://api.spotify.com/v1/users/${user.id}/playlists`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${data.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: "Your Playlist",
              description: "Created with Conductr",
              public: false,
            }),
          }
        );
        const playlist = await playlistResp.json();

        // 5. For each album, fetch tracks and add them
        let uris: string[] = [];
        for (const album of storedAlbums) {
          const tracksResp = await fetch(
            `https://api.spotify.com/v1/albums/${album.id}/tracks`,
            {
              headers: { Authorization: `Bearer ${data.access_token}` },
            }
          );
          const tracks = await tracksResp.json();
          // === PLACE YOUR LLM LOGIC HERE ===
          uris = uris.concat(tracks.items.map((track: any) => track.uri));
        }

        // 6. Add tracks to playlist in chunks of 100 (Spotify's API limit)
        for (let i = 0; i < uris.length; i += 100) {
          await fetch(
            `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${data.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ uris: uris.slice(i, i + 100) }),
            }
          );
        }

        setPlaylistUrl(playlist.external_urls.spotify);
        setLoading(false);
      })
      .catch(err => {
        setError("Something went wrong: " + err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#191414] to-[#222326]">
        <div className="text-white text-xl">Creating your playlist...</div>
      </div>
    );
  }

  if (playlistUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#191414] to-[#222326] py-10">
        <a
          href={playlistUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#1ed760] hover:bg-[#1db954] text-black font-bold px-6 py-3 rounded-full text-lg shadow transition mb-4 w-full text-center"
        >
          View Playlist on Spotify
        </a>
        <button
          onClick={() => router.push("/")}
          className="w-full bg-[#191414] hover:bg-[#232323] text-white font-bold px-6 py-3 rounded-full transition text-lg"
        >
          Done
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#191414] to-[#222326]">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return null;
}
