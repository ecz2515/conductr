"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAlbumStore } from "./store/albumStore";

const SEARCH_MESSAGES = [
  "This can take up to a minute…",
  "Filtering out Spotify junk…",
  "Sifting through 300 Karajan albums…",
  "Removing ‘Greatest Hits’ editions…",
  "Double-checking movements…",
  "Optimizing your playlist for max culture points…",
  "Counting how many times Bernstein recorded this…"
];

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [canonical, setCanonical] = useState<any>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [albums, setAlbums] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<string[]>([]);
  const [searchMsgIdx, setSearchMsgIdx] = useState(0);
  const searchMsgTimer = useRef<NodeJS.Timeout | null>(null);

  // Rotating search message logic
  useEffect(() => {
    if (isSearching) {
      setSearchMsgIdx(0);
      searchMsgTimer.current = setInterval(() => {
        setSearchMsgIdx(idx => (idx + 1) % SEARCH_MESSAGES.length);
      }, 5000);
    } else {
      setSearchMsgIdx(0);
      if (searchMsgTimer.current) clearInterval(searchMsgTimer.current);
    }
    return () => {
      if (searchMsgTimer.current) clearInterval(searchMsgTimer.current);
    };
  }, [isSearching]);

  function handleToggleAlbum(id: string) {
    setSelectedAlbumIds(ids =>
      ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
    );
  }

  function handleAddToPlaylist() {
    console.log('handleAddToPlaylist called');
    console.log('selectedAlbumIds:', selectedAlbumIds);
    console.log('completeAlbums:', completeAlbums);
    
    // Only continue if at least one album selected
    if (selectedAlbumIds.length === 0) return;
    const selectedAlbums = completeAlbums.filter(a => selectedAlbumIds.includes(a.id));
    console.log('selectedAlbums to save:', selectedAlbums);
    
    // Save albums and search context globally
    console.log('Setting albums:', selectedAlbums);
    console.log('Setting search context:', { originalQuery: query, canonical: canonical });
    
    useAlbumStore.getState().setAlbums(selectedAlbums);
    useAlbumStore.getState().setSearchContext({
      originalQuery: query,
      canonical: canonical
    });
    
    console.log('Album store state after setting:', useAlbumStore.getState());
    
    router.push(`/reorder?ids=${selectedAlbumIds.join(",")}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setCanonical(null);
    setAwaitingConfirmation(false);
    setAlbums(null);
    setSelectedAlbumIds([]);

    const res = await fetch("/api/canonicalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    setIsLoading(false);

    if (!res.ok) {
      setError("Something went wrong. Try rephrasing your query.");
      return;
    }

    try {
      const data = await res.json();
      setCanonical(data);
      setAwaitingConfirmation(true);
    } catch {
      setError("Failed to parse server response.");
    }
  }

  function handleNo() {
    setAwaitingConfirmation(false);
    setCanonical(null);
    setQuery("");
    setAlbums(null);
    setSelectedAlbumIds([]);
  }

  async function handleYes() {
    setIsSearching(true);
    setAlbums(null);
    setError(null);
    setSelectedAlbumIds([]);
    setAwaitingConfirmation(false);

    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(canonical),
    });

    setIsSearching(false);

    if (!res.ok) {
      setError("Failed to fetch recordings. Try again later.");
      return;
    }

    try {
      const data = await res.json();
      setAlbums(data);
    } catch {
      setError("Failed to parse recordings from server.");
    }
  }

  const completeAlbums =
    albums && Array.isArray(albums)
      ? albums.filter((album: any) => album.isComplete)
      : [];

  // Center content if there are NO album results (including while loading/searching)
  const shouldCenter =
    !albums || (albums && Array.isArray(albums) && albums.length === 0);

  // Add margin above the title if showing results
  const mainTopSpacing = !shouldCenter ? "mt-10 sm:mt-16" : "";

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#191414] to-[#222326]">
      <main
        className={`
          flex flex-1 flex-col items-center w-full transition-all duration-700
          ${shouldCenter ? "justify-center" : "justify-start"}
        `}
        style={{
          minHeight: 0,
          transition: 'justify-content 0.5s cubic-bezier(.73,0,.23,1)'
        }}
      >
        {/* Title */}
        <div className={`flex flex-col items-center w-full ${mainTopSpacing} transition-all duration-700 px-3`}>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-lg mb-2 text-center">
            Classical Playlist Builder
          </h1>
          {!albums && !awaitingConfirmation && !isLoading && (
            <p className="text-base sm:text-lg text-[#b3b3b3] mt-2 sm:mt-1 transition-opacity duration-200 text-center">
              Search any piece, movement, or nickname
            </p>
          )}
        </div>

        {/* Search Bar */}
        {!awaitingConfirmation && !albums && (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 w-full max-w-lg items-center rounded-xl shadow-lg p-5 animate-fade-in mt-8 sm:mt-5 mx-auto"
            style={{ boxSizing: "border-box" }}
          >
            <input
              type="text"
              placeholder='e.g. "Mozart Jupiter" or "Tchaik 6"'
              value={query}
              onChange={e => setQuery(e.target.value)}
              className={`w-full sm:flex-1 bg-[#181818] text-white px-5 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#1ed760] text-base sm:text-lg transition mb-3 sm:mb-0 border border-[#1ed760]${(isLoading || isSearching) ? ' opacity-60 cursor-not-allowed' : ''}`}
              autoFocus
              disabled={isLoading || isSearching}
            />
            <button
              type="submit"
              disabled={isLoading || isSearching}
              className={`w-full sm:w-auto bg-[#1ed760] hover:bg-[#1db954] text-black font-semibold px-6 py-3 rounded-lg transition shadow-md text-base sm:text-lg flex items-center justify-center min-w-[120px]${(isLoading || isSearching) ? ' opacity-60 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <Spinner />
              ) : (
                "Search"
              )}
            </button>
          </form>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-[#ff5555] mt-6 text-base sm:text-lg animate-fade-in text-center px-3">{error}</div>
        )}

        {/* Confirmation UI */}
        {awaitingConfirmation && canonical && (
          <div className="mt-12 w-full max-w-lg bg-[#181818] rounded-2xl shadow-xl px-4 py-7 flex flex-col items-center border border-[#282828] animate-fade-in mx-auto">
            <div className="mb-6 w-full">
              <div className="text-[#1ed760] uppercase tracking-widest text-xs font-semibold mb-2 text-center">
                Is this what you're looking for?
              </div>
              <div className="text-white text-lg sm:text-xl font-bold mb-2 text-center">
                {canonical.composer && <span>{canonical.composer}, </span>}
                {canonical.work}
                {canonical.movement ? (
                  <>
                    <br />
                    <span className="text-[#b3b3b3] font-normal">
                      Movement: {canonical.movement}
                      {canonical.movementNumber ? ` (No. ${canonical.movementNumber})` : ""}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
            {!isSearching && (
              <div className="flex flex-col sm:flex-row gap-4 mt-2 w-full justify-center animate-fade-in">
                <button
                  onClick={handleYes}
                  className="w-full sm:w-auto bg-[#1ed760] hover:bg-[#1db954] text-black font-bold px-6 py-3 rounded-full transition text-lg shadow flex items-center justify-center min-w-[100px]"
                  disabled={isSearching}
                >
                  {isSearching ? <Spinner /> : "Yes"}
                </button>
                <button
                  onClick={handleNo}
                  className="w-full sm:w-auto bg-[#222326] hover:bg-[#333] text-white border border-[#282828] px-6 py-3 rounded-full transition text-lg"
                  disabled={isSearching}
                >
                  No, try again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loading UI for searching or thinking */}
        {(isLoading || isSearching) && (
          <div className="mt-12 flex flex-col items-center animate-fade-in px-3 w-full max-w-lg">
            <Spinner />
            <span className="text-white text-base sm:text-lg mt-4 text-center" style={{minHeight: 28}}>
              {isLoading
                ? "Thinking…"
                : SEARCH_MESSAGES[searchMsgIdx]
              }
            </span>
          </div>
        )}

        {/* Album Results */}
        {albums && !isSearching && albums.length > 0 && (
          <div
            className="w-full flex flex-col items-center transition-all duration-700 animate-expand"
            style={{
              marginTop: "2.5rem",
              maxWidth: "36rem",
              paddingLeft: "0.75rem",
              paddingRight: "0.75rem"
            }}
          >
            {completeAlbums.length > 0 ? (
              <>
                <div className="w-full flex flex-col gap-5 animate-fade-in">
                  {completeAlbums.map((album: any) => {
                    const isSelected = selectedAlbumIds.includes(album.id);
                    return (
                      <div
                        key={album.id}
                        className={`
                          flex items-center relative bg-[#232323] rounded-2xl shadow-lg
                          transition-all duration-150 p-4 gap-6 cursor-pointer group
                          border-2
                          ${isSelected
                            ? "border-[#1ed760] ring-2 ring-[#1ed760]/40 shadow-[#1ed760] shadow-md"
                            : "border-[#282828] hover:border-[#1ed760]/40"
                          }
                        `}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => handleToggleAlbum(album.id)}
                        onKeyDown={e => {
                          if (e.key === " " || e.key === "Enter") handleToggleAlbum(album.id);
                        }}
                        style={{
                          minHeight: "112px", // more tap area
                          touchAction: "manipulation"
                        }}
                      >
                        {/* Checkbox visual */}
                        <span
                          className={`
                            absolute top-3 right-3 z-10 flex items-center justify-center
                            h-7 w-7 rounded-full
                            border-2 border-[#1ed760]
                            ${isSelected ? "bg-[#1ed760]" : "bg-[#191414]"}
                            transition-all duration-150
                            shadow ${isSelected ? "shadow-[#1ed760]/60" : ""}
                          `}
                        >
                          {isSelected && (
                            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
                              <path
                                d="M5 10.5L9 14L15 7"
                                stroke="#191414"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <img
                          src={album.image}
                          alt={album.conductor || "album cover"}
                          className="w-20 h-20 sm:w-28 sm:h-28 object-cover rounded-xl flex-shrink-0"
                          style={{ minWidth: "80px" }}
                        />
                        <div className="flex flex-col gap-2 ml-2 text-left w-2/3">
                          <div className="text-white text-base font-semibold leading-snug break-words">
                            {album.conductor && <div>{album.conductor}</div>}
                            {album.orchestra && <div>{album.orchestra}</div>}
                            {album.release_date && <div>{album.release_date.substring(0, 4)}</div>}
                          </div>
                          {/* Open in Spotify link */}
                          <a
                            href={album.uri && album.uri.startsWith("spotify:") ?
                              `https://open.spotify.com/album/${album.id}` : album.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-block mt-2 w-32 px-2 py-1 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black text-xs font-semibold transition text-center"
                          >
                            Open in Spotify
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Add to Playlist Button */}
                <div className="flex justify-center items-center mt-12 w-full">
                  <button
                    onClick={handleAddToPlaylist}
                    disabled={selectedAlbumIds.length === 0}
                    className={`
                      w-full sm:w-auto px-10 py-4 rounded-full font-bold text-lg
                      shadow-xl transition-all duration-200
                      bg-[#1ed760]
                      ${
                        selectedAlbumIds.length
                          ? "hover:bg-[#1db954] hover:scale-105 shadow-green-400/40 animate-bounce-once"
                          : "opacity-60 cursor-not-allowed"
                      }
                      text-black
                      outline-none
                      relative
                    `}
                    style={{
                      boxShadow: selectedAlbumIds.length
                        ? "0 0 16px 2px #1ed76088"
                        : "none"
                    }}
                  >
                    {selectedAlbumIds.length === 0
                      ? "Select recordings to add"
                      : `Add ${selectedAlbumIds.length} to Playlist`}
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-10 text-white text-xl animate-fade-in">
                No complete recordings found. Try another search!
              </div>
            )}
          </div>
        )}
      </main>
      <footer className="text-[#b3b3b3] text-xs mt-8 mb-4 text-center px-3">
        Built with ❤️ for conductors • Not affiliated with Spotify
      </footer>
      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes bounce-once {
          0%, 100% { transform: translateY(0);}
          20% { transform: translateY(-8px);}
          40% { transform: translateY(0);}
        }
        .animate-bounce-once { animation: bounce-once 0.7s; }
        @keyframes fade-in {
          from { opacity: 0;}
          to { opacity: 1;}
        }
        .animate-fade-in { animation: fade-in 0.45s; }
        @keyframes expand {
          0% { opacity: 0; transform: scale(0.97) translateY(20px);}
          100% { opacity: 1; transform: scale(1) translateY(0);}
        }
        .animate-expand { animation: expand 0.7s cubic-bezier(.73,0,.23,1); }
      `}</style>
    </div>
  );
}

// Spinner component
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
