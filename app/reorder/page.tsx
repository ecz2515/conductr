"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAlbumStore } from "../store/albumStore";
import type { Album } from "../store/albumStore";
import { encodeBase64 } from "../utils/base64";

/** ---------- DEBUG HELPERS (display-only; does not affect flow) ---------- */
function redact(str: string | null | undefined, keep = 6) {
  if (!str) return "(missing)";
  if (str.length <= keep) return `…${str}`;
  return `${"•".repeat(Math.max(0, str.length - keep))}${str.slice(-keep)}`;
}
function bytes(str: string) {
  return new Blob([str]).size;
}
function buildSpotifyAuthUrl({
  clientId,
  scopes,
  redirectUri,
  stateParts,
}: {
  clientId: string | undefined;
  scopes: string;
  redirectUri: string;
  stateParts: string[];
}) {
  const stateRaw = stateParts.join("|");
  const url =
    `https://accounts.spotify.com/authorize?response_type=code` +
    `&client_id=${encodeURIComponent(clientId ?? "")}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(stateRaw)}`;

  const metrics = {
    clientId_tail: redact(clientId),
    redirectUri,
    scopes,
    state_parts: stateParts.map((p, i) => ({
      idx: i,
      bytes: bytes(p),
      preview: p.slice(0, 80) + (p.length > 80 ? "…[truncated]" : ""),
    })),
    state_total_bytes: bytes(stateRaw),
    full_url_length: url.length,
  };
  return { url, metrics };
}
/** ----------------------------------------------------------------------- */

function ReorderContent() {
  const searchParams = useSearchParams();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingIndex, setMovingIndex] = useState<number | null>(null);

  // Load albums from Zustand by IDs in the URL
  useEffect(() => {
    console.log("[DEBUG] useEffect triggered with searchParams:", searchParams);
    const ids = searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
    console.log("[DEBUG] Extracted IDs:", ids);
    const storedAlbums = useAlbumStore.getState().getAlbumsByIds(ids);
    console.log("[DEBUG] Retrieved stored albums:", storedAlbums);
    const searchContext = useAlbumStore.getState().getSearchContext();
    console.log("[DEBUG] Retrieved search context:", searchContext);
    
    setAlbums(storedAlbums);
    setLoading(false);
    console.log("[DEBUG] Albums set and loading state updated");
  }, [searchParams]);

  function moveUp(index: number) {
    console.log("[DEBUG] moveUp called with index:", index);
    if (index === 0) {
      console.log("[DEBUG] Index is 0, cannot move up");
      return;
    }
    setMovingIndex(index);
    console.log("[DEBUG] Moving index set to:", index);
    setTimeout(() => {
      const newAlbums = [...albums];
      const temp = newAlbums[index];
      newAlbums[index] = newAlbums[index - 1];
      newAlbums[index - 1] = temp;
      setAlbums(newAlbums);
      console.log("[DEBUG] Albums reordered:", newAlbums);
      setTimeout(() => {
        setMovingIndex(null);
        console.log("[DEBUG] Moving index reset to null");
      }, 300);
    }, 150);
  }

  function moveDown(index: number) {
    console.log("[DEBUG] moveDown called with index:", index);
    if (index === albums.length - 1) {
      console.log("[DEBUG] Index is at the last position, cannot move down");
      return;
    }
    setMovingIndex(index);
    console.log("[DEBUG] Moving index set to:", index);
    setTimeout(() => {
      const newAlbums = [...albums];
      const temp = newAlbums[index];
      newAlbums[index] = newAlbums[index + 1];
      newAlbums[index + 1] = temp;
      setAlbums(newAlbums);
      console.log("[DEBUG] Albums reordered:", newAlbums);
      setTimeout(() => {
        setMovingIndex(null);
        console.log("[DEBUG] Moving index reset to null");
      }, 300);
    }, 150);
  }

  function handleConfirm() {
    console.log("[DEBUG] handleConfirm called");
    const ids = albums.map(album => album.id).join(",");
    console.log("[DEBUG] Album IDs for confirmation:", ids);
    const albumData = encodeBase64(JSON.stringify(albums));
    console.log("[DEBUG] Encoded album data:", albumData);
    const searchContext = useAlbumStore.getState().getSearchContext();
    console.log("[DEBUG] Retrieved search context for confirmation:", searchContext);
    let canonicalData = "";
    if (searchContext && searchContext.canonical) {
      canonicalData = encodeBase64(JSON.stringify(searchContext.canonical));
      console.log("[DEBUG] Encoded canonical data:", canonicalData);
    }
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    console.log("[DEBUG] Spotify Client ID:", clientId);
    const redirectUri =
      process.env.NODE_ENV === "production"
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/playlist/create`
        : "http://127.0.0.1:3000/playlist/create";
    console.log("[DEBUG] Redirect URI:", redirectUri);

    const scopes = [
      "playlist-modify-public",
      "playlist-modify-private"
    ].join(" ");
    console.log("[DEBUG] Spotify scopes:", scopes);
    const stateParts = [ids, albumData, canonicalData];
    console.log("[DEBUG] State parts for Spotify authorization:", stateParts);
    const spotifyAuthorizeUrl =
      `https://accounts.spotify.com/authorize?response_type=code` +
      `&client_id=${encodeURIComponent(clientId ?? "")}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(stateParts.join("|"))}`;
    console.log("[DEBUG] Spotify authorization URL:", spotifyAuthorizeUrl);
    window.location.href = spotifyAuthorizeUrl;
  }
  

  if (loading) {
    console.log("[DEBUG] Loading state is true, rendering Spinner");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#191414] to-[#222326]">
        <Spinner />
      </div>
    );
  }

  if (albums.length === 0) {
    console.log("[DEBUG] No albums found, rendering message");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#191414] to-[#222326]">
        <div className="text-white text-xl">No albums found. Go back and select recordings.</div>
      </div>
    );
  }

  console.log("[DEBUG] Rendering ReorderContent with albums:", albums);
  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-[#191414] to-[#222326] py-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-8 text-center">
        Arrange Your Recordings
      </h1>
      <div
        className="w-full flex flex-col items-center transition-all duration-700 animate-expand"
        style={{
          maxWidth: "36rem",
          paddingLeft: "0.75rem",
          paddingRight: "0.75rem"
        }}
      >
        <p className="text-[#b3b3b3] mb-6 text-center text-base sm:text-lg">
          Use the up and down arrows to reorder. This controls how the performances will appear in your playlist.
        </p>
        <div className="w-full">
          {albums.map((album, idx) => (
            <div
              key={album.id}
              className={`
                flex items-center bg-[#232323] rounded-2xl shadow-lg p-3 sm:p-4 gap-3 sm:gap-6
                border-2 border-[#282828] hover:border-[#1ed760]/30
                transition-all duration-300 ease-in-out
                ${idx < albums.length - 1 ? 'mb-4 sm:mb-5' : ''}
                group
                ${movingIndex === idx ? 'z-10' : ''}
              `}
              style={{
                minHeight: "96px",
                transform: movingIndex === idx ? "scale(1.02)" : "scale(1)",
                opacity: movingIndex === idx ? 0.8 : 1,
                boxShadow: movingIndex === idx
                  ? "0 10px 30px rgba(30, 215, 96, 0.3)"
                  : "0 4px 6px rgba(0, 0, 0, 0.1)"
              }}
            >
              <div className="flex flex-col gap-2 mr-2 p-2 bg-[#191414] rounded-xl border border-[#333]">
                <button
                  onClick={() => {
                    console.log("[DEBUG] Move up button clicked for index:", idx);
                    moveUp(idx);
                  }}
                  disabled={idx === 0}
                  className={`
                    flex items-center justify-center h-8 w-8 rounded-lg
                    bg-[#232323] text-[#b3b3b3] hover:bg-[#2a2a2a] active:bg-[#1ed760]/20
                    transition-all duration-150 select-none border border-[#444]
                    ${idx === 0
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:text-[#1ed760] hover:scale-110 hover:border-[#1ed760]/50'
                    }
                  `}
                  aria-label="Move up"
                >
                  <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    console.log("[DEBUG] Move down button clicked for index:", idx);
                    moveDown(idx);
                  }}
                  disabled={idx === albums.length - 1}
                  className={`
                    flex items-center justify-center h-8 w-8 rounded-lg
                    bg-[#232323] text-[#b3b3b3] hover:bg-[#2a2a2a] active:bg-[#1ed760]/20
                    transition-all duration-150 select-none border border-[#444]
                    ${idx === albums.length - 1
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:text-[#1ed760] hover:scale-110 hover:border-[#1ed760]/50'
                    }
                  `}
                  aria-label="Move down"
                >
                  <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              <img
                src={album.image}
                alt={album.conductor || "album cover"}
                className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 object-cover rounded-xl flex-shrink-0"
                style={{ minWidth: "64px" }}
              />
              <div className="flex flex-col gap-1 sm:gap-2 ml-2 sm:ml-4 text-left flex-1 min-w-0">
                <div className="text-white text-sm sm:text-base font-semibold leading-tight sm:leading-snug break-words">
                  {album.conductor && <div className="truncate">{album.conductor}</div>}
                  {album.orchestra && <div className="truncate">{album.orchestra}</div>}
                  {album.release_date && <div>{album.release_date.substring(0, 4)}</div>}
                </div>
                <a
                  href={album.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 w-32 px-2 py-1 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black text-xs font-semibold transition text-center"
                >
                  Open in Spotify
                </a>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-10 w-full">
          <button
            onClick={() => {
              console.log("[DEBUG] Confirm Order button clicked");
              handleConfirm();
            }}
            className="w-full bg-[#1ed760] hover:bg-[#1db954] text-black font-bold px-6 py-3 rounded-full transition text-lg shadow"
          >
            Confirm Order
          </button>
        </div>

        {/* ---------- Auth Debug Panel (view-only) ---------- */}
        {(typeof window !== "undefined") && (
          <AuthDebugPanel albums={albums} />
        )}
        {/* ----------------------------------------------- */}
      </div>
      <style jsx global>{`
        @keyframes expand {
          0% { opacity: 0; transform: scale(0.97) translateY(20px);}
          100% { opacity: 1; transform: scale(1) translateY(0);}
        }
        .animate-expand { animation: expand 0.7s cubic-bezier(.73,0,.23,1); }
      `}</style>
    </div>
  );
}

function LoadingFallback() {
  console.log("[DEBUG] Rendering LoadingFallback");
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#191414] to-[#222326]">
      <Spinner />
    </div>
  );
}

export default function ReorderPage() {
  console.log("[DEBUG] Rendering ReorderPage");
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ReorderContent />
    </Suspense>
  );
}

function Spinner() {
  console.log("[DEBUG] Rendering Spinner");
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

/** ---------- View-only panel that mirrors your current handleConfirm ---------- */
function AuthDebugPanel({ albums }: { albums: Album[] }) {
  const searchParams = useSearchParams();
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri =
    process.env.NODE_ENV === "production"
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/playlist/create`
      : "http://127.0.0.1:3000/playlist/create";
  const scopes = ["playlist-modify-public", "playlist-modify-private"].join(" ");

  // These lines replicate your handleConfirm inputs exactly
  const ids = albums.map((a) => a.id).join(",");
  const albumData = encodeBase64(JSON.stringify(albums));
  const searchContext = useAlbumStore.getState().getSearchContext();
  const canonicalData =
    searchContext?.canonical ? encodeBase64(JSON.stringify(searchContext.canonical)) : "";

  // State format EXACTLY as your current handleConfirm uses
  const stateParts = [ids, albumData, canonicalData];

  const { url, metrics } = buildSpotifyAuthUrl({
    clientId,
    scopes,
    redirectUri,
    stateParts,
  });

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    console.log("[AUTH-DEBUG] Copied auth URL to clipboard");
  };

  const open = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mt-6 w-full max-w-xl text-xs text-[#b3b3b3] bg-[#141414] border border-[#333] rounded-xl p-4 space-y-2">
      <div className="text-white font-semibold">Auth Debug (view-only)</div>
      <div>Client ID: {redact(clientId)}</div>
      <div>Redirect URI: {redirectUri}</div>
      <div>Scopes: {scopes}</div>
      <div>State total bytes: {metrics.state_total_bytes}</div>
      <div>Full URL length: {metrics.full_url_length}</div>
      <div className="space-y-1">
        {metrics.state_parts.map((p: any) => (
          <div key={p.idx}>
            part[{p.idx}] — {p.bytes}B — {p.preview}
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={copy} className="px-3 py-1 rounded bg-[#232323] hover:bg-[#2a2a2a] text-white border border-[#444]">
          Copy URL
        </button>
        <button onClick={open} className="px-3 py-1 rounded bg-[#1ed760] hover:bg-[#1db954] text-black font-semibold">
          Open URL
        </button>
      </div>
      <div className="pt-1">
        Tip: add <code>?debug=1</code> to the page URL in production to show this panel.
      </div>
    </div>
  );
}
