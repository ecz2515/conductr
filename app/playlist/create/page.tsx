"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAlbumStore } from "../../store/albumStore";
import { getWorkTracksFromAlbum } from "../../utils/trackExtractor";
import type { Album } from "../../store/albumStore";

// ====== CONFIGURE THESE ======
const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!;
// =============================

function getStoredToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("spotify_access_token");
  }
  return null;
}

function storeToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("spotify_access_token", token);
  }
}

function getAccessTokenFromUrl() {
  if (typeof window !== "undefined") {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      return params.get("access_token");
    }
  }
  return null;
}

export default function PlaylistCreatePage() {
  const router = useRouter();
  const albums = useAlbumStore((state) => state.albums);
  const [playlistName, setPlaylistName] = useState("");
  const [loading, setLoading] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get access token from URL on OAuth redirect
  useEffect(() => {
    const token = getAccessTokenFromUrl();
    if (token) {
      storeToken(token);
      // Remove token from URL
      window.location.hash = "";
    }
  }, []);

  // Generate canonical playlist name
  useEffect(() => {
    if (albums.length > 0) {
      const firstAlbum = albums[0];
      const canonical = [
        firstAlbum.composer,
        firstAlbum.work_title,
        firstAlbum.orchestra,
        firstAlbum.conductor,
      ]
        .filter(Boolean)
        .join(" — ") || "Conductr Playlist";
      setPlaylistName(canonical);
    }
  }, [albums]);

  function handleBack() {
    router.push("/reorder");
  }

  // Start OAuth login
  function handleSpotifyLogin() {
    const scopes = [
      "playlist-modify-public",
      "playlist-modify-private",
    ].join(" ");
    const authUrl =
      `https://accounts.spotify.com/authorize` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(SPOTIFY_CLIENT_ID)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    window.location.href = authUrl;
  }

  async function handleCreatePlaylist() {
    setLoading(true);
    setError(null);
    setPlaylistUrl(null);

    let token = getStoredToken();
    if (!token) {
      setLoading(false);
      handleSpotifyLogin();
      return;
    }

    try {
      // 1. Get user's Spotify ID
      const userResp = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userResp.status === 401) {
        // Token expired/invalid
        localStorage.removeItem("spotify_access_token");
        setLoading(false);
        handleSpotifyLogin();
        return;
      }
      if (!userResp.ok) throw new Error("Spotify user fetch failed.");
      const user = await userResp.json();

      // 2. Create Playlist
      const playlistResp = await fetch(
        `https://api.spotify.com/v1/users/${user.id}/playlists`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: playlistName,
            description:
              "Playlist created with Conductr — https://concertmastr.com",
            public: false,
          }),
        }
      );
      if (!playlistResp.ok)
        throw new Error("Spotify playlist creation failed.");
      const playlist = await playlistResp.json();

      // 3. For each album, extract only the correct tracks using AI!
      const uris: string[] = [];
      for (const album of albums) {
        const albumId =
          album.id ||
          (album.uri && album.uri.startsWith("spotify:album:")
            ? album.uri.split(":")[2]
            : undefined);
        if (!albumId) continue;

        const workTitle = album.work_title || ""; // REQUIRED!
        const movementTitles =
          Array.isArray(album.movementTitles) && album.movementTitles.length > 0
            ? album.movementTitles
            : [];

        // Fetch tracks using AI (LLM extraction)
        const { uris: matchedUris } = await getWorkTracksFromAlbum({
          albumId,
          accessToken: token,
          workTitle,
          movementTitles,
        });
        uris.push(...matchedUris);
      }


      // 4. Add tracks to the new playlist (max 100 per request)
      for (let i = 0; i < uris.length; i += 100) {
        const addResp = await fetch(
          `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ uris: uris.slice(i, i + 100) }),
          }
        );
        if (!addResp.ok) throw new Error("Adding tracks failed.");
      }

      setPlaylistUrl(playlist.external_urls.spotify);
      setLoading(false);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setLoading(false);
    }
  }

  if (!albums || albums.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#191414] to-[#222326]">
        <div className="text-white text-xl">No recordings found. Go back and select recordings.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-[#191414] to-[#222326] py-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 text-center">
        Name Your Playlist
      </h1>
      <div
        className="w-full flex flex-col items-center transition-all duration-700 animate-expand"
        style={{
          maxWidth: "36rem",
          paddingLeft: "0.75rem",
          paddingRight: "0.75rem",
        }}
      >
        <p className="text-[#b3b3b3] mb-6 text-center text-base sm:text-lg">
          Give your playlist a name. You can edit the suggestion below.
        </p>
        <input
          type="text"
          className="w-full bg-[#232323] border-2 border-[#282828] focus:border-[#1ed760] text-white text-lg rounded-2xl px-5 py-3 mb-8 outline-none transition-all"
          value={playlistName}
          maxLength={100}
          onChange={(e) => setPlaylistName(e.target.value)}
          disabled={loading}
        />

        <div className="w-full mb-8">
          <p className="text-[#b3b3b3] mb-2 text-center text-base">Playlist order:</p>
          {albums.map((album, idx) => (
            <div
              key={album.id}
              className={`
                flex items-center bg-[#232323] rounded-2xl shadow-lg p-4 gap-6
                border-2 border-[#282828] hover:border-[#1ed760]/30
                transition-all duration-300 ease-in-out
                ${idx < albums.length - 1 ? "mb-5" : ""}
              `}
              style={{
                minHeight: "88px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.10)",
              }}
            >
              <div className="flex-shrink-0 font-bold text-[#1ed760] text-2xl w-7 text-center">
                {idx + 1}
              </div>
              <img
                src={album.image}
                alt={album.conductor || "album cover"}
                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl flex-shrink-0"
                style={{ minWidth: "64px" }}
              />
              <div className="flex flex-col gap-1 ml-2 text-left w-2/3">
                <div className="text-white text-base font-semibold leading-snug break-words">
                  {album.conductor && <div>{album.conductor}</div>}
                  {album.orchestra && <div>{album.orchestra}</div>}
                  {album.release_date && (
                    <div>{album.release_date.substring(0, 4)}</div>
                  )}
                </div>
                <a
                  href={album.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 w-28 px-2 py-1 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black text-xs font-semibold transition text-center"
                >
                  Open in Spotify
                </a>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="w-full mb-4 text-red-500 text-center font-semibold">{error}</div>
        )}

        {playlistUrl ? (
          <div className="w-full flex flex-col items-center">
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
        ) : (
          <div className="flex gap-4 mt-2 w-full">
            <button
              onClick={handleBack}
              className="w-1/2 bg-[#191414] hover:bg-[#232323] text-white font-bold px-6 py-3 rounded-full transition text-lg"
              disabled={loading}
            >
              Back
            </button>
            <button
              onClick={handleCreatePlaylist}
              className="w-1/2 bg-[#1ed760] hover:bg-[#1db954] text-black font-bold px-6 py-3 rounded-full transition text-lg shadow"
              disabled={loading || !playlistName.trim()}
            >
              {loading ? <Spinner /> : "Create Playlist"}
            </button>
          </div>
        )}
      </div>
      <style jsx global>{`
        @keyframes expand {
          0% {
            opacity: 0;
            transform: scale(0.97) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-expand {
          animation: expand 0.7s cubic-bezier(0.73, 0, 0.23, 1);
        }
      `}</style>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block align-middle">
      <svg
        className="animate-spin"
        style={{ color: "#1ed760" }}
        width={28}
        height={28}
        viewBox="0 0 44 44"
        fill="none"
      >
        <circle
          className="opacity-25"
          cx="22"
          cy="22"
          r="18"
          stroke="#1ed760"
          strokeWidth="5"
        />
        <path
          d="M40 22c0-9.94-8.06-18-18-18"
          stroke="#1ed760"
          strokeWidth="5"
          strokeLinecap="round"
          className="opacity-85"
        />
      </svg>
    </span>
  );
}
