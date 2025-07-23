"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAlbumStore } from "../../store/albumStore"; // import your album store
import { decodeBase64 } from "../../utils/base64";


export default function PlaylistCreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [showPlaylistForm, setShowPlaylistForm] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [canonical, setCanonical] = useState<any>(null);

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

    // Parse the state parameter which contains IDs, album data, and canonical info
    const [idsStr, albumDataStr, canonicalDataStr] = stateParam.split("|");
    const ids = idsStr.split(",").filter(Boolean);
    
    // Decode album data from base64
    let storedAlbums = [];
    if (albumDataStr) {
      try {
        const decodedData = decodeBase64(albumDataStr);
        storedAlbums = JSON.parse(decodedData);
        console.log("Decoded albums from URL:", storedAlbums);
      } catch (e) {
        console.error("Failed to decode album data:", e);
        setError("Failed to decode album data. Go back and try again.");
        return;
      }
    }
    
    if (!storedAlbums || storedAlbums.length === 0) {
      setError("No albums found. Go back and select albums.");
      return;
    }

    // Decode canonical info from base64 if present
    let canonicalObj = null;
    if (canonicalDataStr) {
      try {
        const decodedCanonical = decodeBase64(canonicalDataStr);
        canonicalObj = JSON.parse(decodedCanonical);
        setCanonical(canonicalObj);
        console.log("Decoded canonical from URL:", canonicalObj);
      } catch (e) {
        console.error("Failed to decode canonical data:", e);
      }
    }

    // Set up playlist form using canonical info if available
    if (canonicalObj) {
      const defaultName = canonicalObj.movement 
        ? `${canonicalObj.composer}: ${canonicalObj.work} - ${canonicalObj.movement}`
        : `${canonicalObj.composer}: ${canonicalObj.work}`;
      setPlaylistName(defaultName);
      setPlaylistDescription(`Created with Conductr`);
      setShowPlaylistForm(true);
    } else {
      setError("Canonical info not found. Please go back and try again.");
    }
  }, []);

  async function createPlaylist(name: string, description: string, canonical: any) {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const stateParam = urlParams.get("state");
    
    if (!code || !stateParam) {
      setError("Missing required information from Spotify. Try again.");
      setLoading(false);
      return;
    }

    // Parse the state parameter which contains both IDs and album data
    const [idsStr, albumDataStr] = stateParam.split("|");
    const ids = idsStr.split(",").filter(Boolean);
    
    // Decode album data from base64
    let storedAlbums = [];
    if (albumDataStr) {
      try {
        const decodedData = decodeBase64(albumDataStr);
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

    try {
      setCurrentStep("Getting Spotify access token...");

      // 1. Exchange code for access token
    const tokenRes = await fetch("/api/spotify-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      setError("Could not get Spotify access token.");
      setLoading(false);
      return;
    }

    // 2. Clean up URL
    window.history.replaceState({}, document.title, "/playlist/create");
    
    // 3. Use canonical from argument (from URL)
    const canonicalInfo = canonical;
    if (!canonicalInfo) {
      setError("Canonical info not found. Please go back and try again.");
      setLoading(false);
      return;
    }
    
    setCurrentStep("Getting user information...");
    
    // 4. Get user info
    const userResp = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userResp.json();

    setCurrentStep("Creating playlist...");
    
    // 5. Create playlist with custom name
    const finalPlaylistName = name || (canonicalInfo.movement 
      ? `${canonicalInfo.composer}: ${canonicalInfo.work} - ${canonicalInfo.movement}`
      : `${canonicalInfo.composer}: ${canonicalInfo.work}`);
      
    const finalDescription = description || `Created with Conductr`;
          
    const playlistResp = await fetch(
      `https://api.spotify.com/v1/users/${user.id}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: finalPlaylistName,
          description: finalDescription,
          public: false,
        }),
      }
    );
    const playlist = await playlistResp.json();

    setCurrentStep("Analyzing albums with AI...");
    
    // 6. For each album, extract relevant tracks using AI
    let uris: string[] = [];
    let processedAlbums = 0;

    for (const album of storedAlbums) {
      setCurrentStep(`Analyzing album ${processedAlbums + 1} of ${storedAlbums.length}...`);
      
      try {
        // Use the server-side track extractor API
        const extractResp = await fetch("/api/extract-tracks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            albumId: album.id,
            accessToken: tokenData.access_token,
            workTitle: canonicalInfo.work,
            movementTitles: canonicalInfo.movement ? [canonicalInfo.movement] : []
          }),
        });
        
        if (!extractResp.ok) {
          throw new Error("Track extraction API failed");
        }
        
        const { uris: albumUris } = await extractResp.json();
        uris = uris.concat(albumUris);
      } catch (error) {
        console.error(`Failed to extract tracks from album ${album.id}:`, error);
        // Fallback: add all tracks from the album
        const tracksResp = await fetch(
          `https://api.spotify.com/v1/albums/${album.id}/tracks`,
          {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          }
        );
        const tracks = await tracksResp.json();
        uris = uris.concat(tracks.items.map((track: any) => track.uri));
      }
      
      processedAlbums++;
    }

    setCurrentStep("Adding tracks to playlist...");
    
    // 7. Add tracks to playlist in chunks of 100 (Spotify's API limit)
    for (let i = 0; i < uris.length; i += 100) {
      await fetch(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uris: uris.slice(i, i + 100) }),
        }
      );
    }

    setPlaylistUrl(playlist.external_urls.spotify);
    setLoading(false);
  } catch (err: any) {
    setError("Something went wrong: " + err.message);
    setLoading(false);
  }
}

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#191414] to-[#222326]">
        <div className="text-center">
          <div className="mb-6">
            <Spinner />
          </div>
          <div className="text-white text-xl mb-2">Creating your playlist...</div>
          {currentStep && (
            <div className="text-[#b3b3b3] text-base">{currentStep}</div>
          )}
        </div>
      </div>
    );
  }

  if (playlistUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#191414] to-[#222326] py-10 px-4">
        <div className="w-full max-w-md text-center">
          {/* Success Icon */}
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-[#1ed760] rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-white mb-2">Playlist Created!</h1>
          <p className="text-[#b3b3b3] text-base mb-8">
            Your classical music playlist has been successfully created with AI-powered track selection.
          </p>

          {/* Playlist Info Card */}
          {/* <div className="bg-[#181818] rounded-xl p-6 mb-8 border border-[#282828]">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#1ed760] to-[#1db954] rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Ready to Listen</h3>
            <p className="text-[#b3b3b3] text-sm">
              Your playlist is now available on Spotify with carefully selected tracks.
            </p>
          </div> */}

          {/* Action Buttons */}
          <div className="space-y-4">
            <a
              href={playlistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-[#1ed760] hover:bg-[#1db954] text-black font-bold px-6 py-4 rounded-xl text-lg shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Open in Spotify
            </a>
            
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/")}
                className="flex-1 bg-[#232323] hover:bg-[#333] text-white font-semibold px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </button>
              
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(playlistUrl);
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 2000);
                  } catch (err) {
                    console.error('Failed to copy link:', err);
                  }
                }}
                className="flex-1 bg-[#232323] hover:bg-[#333] text-white font-semibold px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-[#666] text-xs">
            <p>Created with ❤️ using Conductr</p>
            <p className="mt-1">AI-powered classical music playlist builder</p>
          </div>
        </div>

        {/* Toast Notification */}
        {showToast && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-[#1ed760] text-black px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span className="font-semibold">Link copied to clipboard!</span>
          </div>
        )}
      </div>
    );
  }

  if (showPlaylistForm) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#191414] to-[#222326] py-10">
        <div className="w-full max-w-md bg-[#181818] rounded-2xl shadow-2xl px-6 py-10 border border-[#282828] animate-expand animate-fade-in flex flex-col items-center">
          <h2 className="text-2xl sm:text-2xl font-bold text-white mb-2 text-center drop-shadow-lg">Customize Your Playlist</h2>
          <p className="text-[#b3b3b3] text-base sm:text-md mb-8 text-center">Feel free to edit the name and description</p>
          <div className="w-full max-w-xs mx-auto space-y-7 flex flex-col items-center">
            <div className="w-full">
              <label className="block text-[#b3b3b3] text-sm font-medium mb-2">Playlist Name</label>
              <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="w-full bg-[#232323] text-white px-5 py-3 mb-4 rounded-lg outline-none focus:ring-2 focus:ring-[#1ed760] border border-[#333] shadow-sm text-base transition"
                placeholder="Enter playlist name"
              />
            </div>
            <div className="w-full">
              <label className="block text-[#b3b3b3] text-sm font-medium mb-2">Description (optional)</label>
              <textarea
                value={playlistDescription}
                onChange={(e) => setPlaylistDescription(e.target.value)}
                rows={3}
                className="w-full bg-[#232323] text-white px-5 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#1ed760] border border-[#333] shadow-sm text-base resize-none transition"
                placeholder="Add a description..."
              />
            </div>
          </div>
          <div className="flex gap-3 mt-12 w-full justify-center">
            <button
              onClick={() => {
                setShowPlaylistForm(false);
                setLoading(true);
                setCurrentStep("Starting playlist creation...");
                createPlaylist(playlistName, playlistDescription, canonical);
              }}
              className="max-w-xs w-full bg-[#1ed760] hover:bg-[#1db954] text-black font-bold px-6 py-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 text-lg"
            >
              Create Playlist
            </button>
          </div>
          <div className="mt-12 text-[#666] text-xs text-center select-none w-full max-w-xs mx-auto">
            <p>Created with ❤️ using Conductr</p>
            <p className="mt-1">AI-powered classical music playlist builder</p>
          </div>
        </div>
        <style jsx global>{`
          @keyframes expand {
            0% { opacity: 0; transform: scale(0.97) translateY(20px);}
            100% { opacity: 1; transform: scale(1) translateY(0);}
          }
          .animate-expand { animation: expand 0.7s cubic-bezier(.73,0,.23,1); }
          .animate-fade-in { animation: fadeIn 0.7s cubic-bezier(.73,0,.23,1); }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
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
