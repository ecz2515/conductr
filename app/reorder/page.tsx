"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAlbumStore } from "../store/albumStore";
import type { Album } from "../store/albumStore";
import { encodeBase64 } from "../utils/base64";

function ReorderContent() {
  const searchParams = useSearchParams();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingIndex, setMovingIndex] = useState<number | null>(null);

  // Load albums from Zustand by IDs in the URL
  useEffect(() => {
    const ids = searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
    const storedAlbums = useAlbumStore.getState().getAlbumsByIds(ids);
    const searchContext = useAlbumStore.getState().getSearchContext();
    
    console.log('Reorder page - IDs:', ids);
    console.log('Reorder page - Stored albums:', storedAlbums);
    console.log('Reorder page - Search context:', searchContext);
    
    setAlbums(storedAlbums);
    setLoading(false);
  }, [searchParams]);

  function moveUp(index: number) {
    if (index === 0) return;
    setMovingIndex(index);
    setTimeout(() => {
      const newAlbums = [...albums];
      const temp = newAlbums[index];
      newAlbums[index] = newAlbums[index - 1];
      newAlbums[index - 1] = temp;
      setAlbums(newAlbums);
      setTimeout(() => setMovingIndex(null), 300);
    }, 150);
  }

  function moveDown(index: number) {
    if (index === albums.length - 1) return;
    setMovingIndex(index);
    setTimeout(() => {
      const newAlbums = [...albums];
      const temp = newAlbums[index];
      newAlbums[index] = newAlbums[index + 1];
      newAlbums[index + 1] = temp;
      setAlbums(newAlbums);
      setTimeout(() => setMovingIndex(null), 300);
    }, 150);
  }

  function handleConfirm() {
    const ids = albums.map(album => album.id).join(",");
    // Encode the full album data as base64 to pass through URL
    const albumData = encodeBase64(JSON.stringify(albums));
    // Get canonical info from Zustand store
    const searchContext = useAlbumStore.getState().getSearchContext();
    let canonicalData = "";
    if (searchContext && searchContext.canonical) {
      canonicalData = encodeBase64(JSON.stringify(searchContext.canonical));
    }
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const redirectUri = "http://127.0.0.1:3000/playlist/create"; // or use your env var
    const scopes = [
      "playlist-modify-public",
      "playlist-modify-private"
    ].join(" ");
    // Add canonicalData as a third part of the state param
    const stateParts = [ids, albumData, canonicalData];
    const spotifyAuthorizeUrl =
      `https://accounts.spotify.com/authorize?response_type=code` +
      `&client_id=${encodeURIComponent(clientId ?? "")}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(stateParts.join("|"))}`;
    window.location.href = spotifyAuthorizeUrl;
  }
  

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#191414] to-[#222326]">
        <Spinner />
      </div>
    );
  }

  if (albums.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#191414] to-[#222326]">
        <div className="text-white text-xl">No albums found. Go back and select recordings.</div>
      </div>
    );
  }

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
                  onClick={() => moveUp(idx)}
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
                  onClick={() => moveDown(idx)}
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
            onClick={handleConfirm}
            className="w-full bg-[#1ed760] hover:bg-[#1db954] text-black font-bold px-6 py-3 rounded-full transition text-lg shadow"
          >
            Confirm Order
          </button>
        </div>
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
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#191414] to-[#222326]">
      <Spinner />
    </div>
  );
}

export default function ReorderPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ReorderContent />
    </Suspense>
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
