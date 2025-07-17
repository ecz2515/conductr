"use client";
import React, { useState } from "react";

export default function Home() {
  const [query, setQuery] = useState("");
  const [canonical, setCanonical] = useState<any>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [albums, setAlbums] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Submit query to canonicalizer
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setCanonical(null);
    setAwaitingConfirmation(false);
    setAlbums(null);

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

  // Step 2: User says "No"
  function handleNo() {
    setAwaitingConfirmation(false);
    setCanonical(null);
    setQuery(""); // Optionally: keep last query for retry
    setAlbums(null);
  }

  // Step 3: User says "Yes" — fetch albums/recordings
  async function handleYes() {
    setIsSearching(true);
    setAlbums(null);
    setError(null);

    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(canonical), // send the canonical object!
    });

    setIsSearching(false);

    if (!res.ok) {
      setError("Failed to fetch recordings. Try again later.");
      return;
    }

    try {
      const data = await res.json();
      setAlbums(data);
      setAwaitingConfirmation(false); // Done with confirmation, show results
    } catch {
      setError("Failed to parse recordings from server.");
    }
  }

  // Main Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#191414] to-[#222326] flex flex-col items-center justify-center p-4">
      {/* Logo / Title */}
      <div className="mb-10 flex flex-col items-center">
        <div className="bg-[#1ed760] rounded-full w-16 h-16 flex items-center justify-center shadow-lg mb-4">
          {/* Spotify style note icon */}
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <ellipse cx="12" cy="12" rx="12" ry="12" fill="#1ed760" />
            <path
              d="M7 17C8.5 16 15.5 16 17 17M8.5 14C10 13 14.5 13 16 14M9.5 11C11 10 13 10 14.5 11"
              stroke="#191414"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Classical Playlist Builder</h1>
        <p className="text-lg text-[#b3b3b3] mt-1">Search any piece, movement, or nickname</p>
      </div>

      {/* Search Bar */}
      {!awaitingConfirmation && !albums && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-3 w-full max-w-lg items-center bg-[#222326] rounded-xl shadow-lg p-5"
        >
          <input
            type="text"
            placeholder="e.g. Shosty 7 mvt 3"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-[#181818] text-white px-5 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#1ed760] text-lg transition"
            autoFocus
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-[#1ed760] hover:bg-[#1db954] text-black font-semibold px-6 py-3 rounded-lg transition shadow-md text-lg"
          >
            {isLoading ? "Thinking..." : "Search"}
          </button>
        </form>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-[#ff5555] mt-4 text-lg">{error}</div>
      )}

      {/* Confirmation UI */}
      {awaitingConfirmation && canonical && (
        <div className="mt-10 w-full max-w-lg bg-[#181818] rounded-2xl shadow-xl p-8 flex flex-col items-center border border-[#282828]">
          <div className="mb-6">
            <div className="text-[#1ed760] uppercase tracking-widest text-xs font-semibold mb-1">
              Confirm Selection
            </div>
            <div className="text-white text-xl font-bold mb-2">
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
            <div className="text-sm text-[#b3b3b3] mt-1 italic">
              <span>“{canonical.rawInput}”</span>
            </div>
          </div>
          <div className="flex gap-6 mt-2">
            <button
              onClick={handleYes}
              className="bg-[#1ed760] hover:bg-[#1db954] text-black font-bold px-6 py-2 rounded-full transition text-lg shadow"
              disabled={isSearching}
            >
              {isSearching ? "Searching..." : "Yes"}
            </button>
            <button
              onClick={handleNo}
              className="bg-[#222326] hover:bg-[#333] text-white border border-[#282828] px-6 py-2 rounded-full transition text-lg"
              disabled={isSearching}
            >
              No, try again
            </button>
          </div>
        </div>
      )}

      {/* Album Results */}
      {isSearching && (
        <div className="mt-10 text-white text-lg">Searching recordings...</div>
      )}

      {albums && albums.length > 0 && (
        <div className="mt-10 w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album: any) => (
            <div
              key={album.id}
              className="bg-[#282828] rounded-2xl p-4 flex flex-col items-center shadow-lg"
            >
              <img src={album.image} alt={album.name} className="w-32 h-32 object-cover rounded-xl mb-3" />
              <div className="text-white text-center font-semibold text-lg">{album.name}</div>
              <div className="text-[#b3b3b3] text-sm mt-1 text-center">
                {album.conductor} · {album.orchestra}
              </div>
              <div className="text-xs text-[#888] mt-1">{album.release_date}</div>
              <a
                href={album.uri.startsWith("spotify:") ? 
                  `https://open.spotify.com/album/${album.id}` : album.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 bg-[#1ed760] text-black font-bold px-4 py-2 rounded-full hover:bg-[#1db954] transition"
              >
                Open in Spotify
              </a>
            </div>
          ))}
        </div>
      )}

      {albums && albums.length === 0 && (
        <div className="mt-10 text-white text-xl">No recordings found. Try another search!</div>
      )}

      <div className="flex-grow" />
      <footer className="text-[#b3b3b3] text-xs mt-8 mb-2">
        Built with ❤️ for classical musicians • Not affiliated with Spotify
      </footer>
    </div>
  );
}
