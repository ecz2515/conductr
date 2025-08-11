"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageContainer,
  ContentWrapper,
  Card,
  Button,
  Input,
  Textarea,
  PageTitle,
  PageSubtitle,
  Spinner,
  Alert,
  Footer,
} from "../../../components/design-system";

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

  // NEW: fetched from server using the short UUID in ?state
  const [canonical, setCanonical] = useState<any>(null);
  const [storedAlbums, setStoredAlbums] = useState<any[]>([]);

  useEffect(() => {
    console.log("useEffect triggered");
    // Extract ?code and ?state (UUID now) from URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const stateParam = urlParams.get("state"); // UUID

    console.log("OAuth code:", code, "State (UUID):", stateParam);

    if (!code || !stateParam) {
      setError("Missing required information from Spotify. Try again.");
      return;
    }

    // Fetch payload (albums, canonical) that we stashed before redirect
    (async () => {
      try {
        const resp = await fetch(`/api/auth-state?state=${encodeURIComponent(stateParam)}`);
        if (!resp.ok) {
          setError("Session expired or invalid. Please go back and try again.");
          return;
        }
        const data = await resp.json(); // { albums, canonical }
        if (!data?.albums || data.albums.length === 0) {
          setError("No albums found. Go back and select albums.");
          return;
        }

        setStoredAlbums(data.albums);
        setCanonical(data.canonical ?? null);

        // Set up playlist form using canonical info if available
        const canonicalObj = data.canonical;
        if (canonicalObj) {
          const defaultName = canonicalObj.movement
            ? `${canonicalObj.composer}: ${canonicalObj.work} - ${canonicalObj.movement}`
            : `${canonicalObj.composer}: ${canonicalObj.work}`;
          setPlaylistName(defaultName);
          setPlaylistDescription(`Created with conductr.dev`);
          setShowPlaylistForm(true);
        } else {
          setError("Canonical info not found. Please go back and try again.");
        }
      } catch (e) {
        console.error("Failed to load saved state:", e);
        setError("Something went wrong loading your session. Please try again.");
      }
    })();
  }, []);  

  async function createPlaylist(
    name: string,
    description: string,
    canonicalArg: any
  ) {
    if (!canonicalArg) {
      setError("Canonical info not found. Please go back and try again.");
      setLoading(false);
      return;
    }
  
    if (!storedAlbums || storedAlbums.length === 0) {
      setError("No albums found. Go back and select albums.");
      setLoading(false);
      return;
    }
  
    try {
      setCurrentStep("Getting Spotify access token...");
      setLoading(true);
  
      // We saved code/state in URL only for the first page load, so now grab code from state
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      if (!code) {
        setError("Missing required Spotify authorization code.");
        setLoading(false);
        return;
      }
  
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
  
      // 2. Clean up URL (remove code/state from address bar)
      window.history.replaceState({}, document.title, "/playlist/create");
  
      setCurrentStep("Getting user information...");
      // 3. Get user info
      const userResp = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const user = await userResp.json();
  
      setCurrentStep("Creating playlist...");
      // 4. Create playlist with custom name
      const finalPlaylistName =
        name ||
        (canonicalArg.movement
          ? `${canonicalArg.composer}: ${canonicalArg.work} - ${canonicalArg.movement}`
          : `${canonicalArg.composer}: ${canonicalArg.work}`);
  
      const finalDescription = description || `Created with conductr.dev`;
  
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
      // 5. For each album, extract relevant tracks using AI
      let uris: string[] = [];
      let processedAlbums = 0;
  
      for (const album of storedAlbums) {
        setCurrentStep(
          `Analyzing album ${processedAlbums + 1} of ${storedAlbums.length}...`
        );
        try {
          const extractResp = await fetch("/api/extract-tracks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              albumId: album.id,
              accessToken: tokenData.access_token,
              workTitle: canonicalArg.work,
              movementTitles: canonicalArg.movement
                ? [canonicalArg.movement]
                : [],
            }),
          });
  
          if (!extractResp.ok) {
            throw new Error("Track extraction API failed");
          }
  
          const { uris: albumUris } = await extractResp.json();
          uris = uris.concat(albumUris);
        } catch (error) {
          console.error(
            `Failed to extract tracks from album ${album.id}:`,
            error
          );
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
      // 6. Add tracks to playlist in chunks of 100 (Spotify's API limit)
      for (let i = 0; i < uris.length; i += 100) {
        await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uris: uris.slice(i, i + 100) }),
        });
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
      <PageContainer centered>
        <ContentWrapper maxWidth="md">
          <div className="text-center">
            <div className="mb-6">
              <Spinner size="lg" />
            </div>
            <PageTitle className="mb-4">Creating your playlist...</PageTitle>
            {currentStep && <PageSubtitle>{currentStep}</PageSubtitle>}
          </div>
        </ContentWrapper>
      </PageContainer>
    );
  }

  if (playlistUrl) {
    return (
      <PageContainer centered>
        <ContentWrapper maxWidth="md">
          <Card variant="elevated" className="p-8 text-center animate-expand animate-fade-in">
            {/* Success Icon */}
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 bg-[#1ed760] rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <PageTitle className="mb-4">Playlist Created!</PageTitle>
            <PageSubtitle className="mb-8">
              Your classical music playlist has been successfully created with AI-powered track selection.
            </PageSubtitle>

            {/* Action Buttons */}
            <div className="space-y-4 mb-8">
              <a
                href={playlistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-[#1ed760] hover:bg-[#1db954] text-black font-bold px-6 py-4 rounded-xl text-lg shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                Open in Spotify
              </a>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => router.push("/")}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  Home
                </Button>

                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      if (playlistUrl) {
                        await navigator.clipboard.writeText(playlistUrl);
                        setShowToast(true);
                        setTimeout(() => setShowToast(false), 2000);
                      }
                    } catch (err) {
                      console.error("Failed to copy link:", err);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy Link
                </Button>
              </div>
            </div>

            <Footer />
          </Card>

          {/* Toast Notification */}
          {showToast && (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-[#1ed760] text-black px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="font-semibold">Link copied to clipboard!</span>
            </div>
          )}
        </ContentWrapper>
      </PageContainer>
    );
  }

  if (showPlaylistForm) {
    return (
      <PageContainer centered>
        <ContentWrapper maxWidth="md">
          <Card variant="elevated" className="p-8 animate-expand animate-fade-in">
            <div className="text-center mb-8">
              <PageTitle className="mb-4">Customize Your Playlist</PageTitle>
              <PageSubtitle>Feel free to edit the name and description</PageSubtitle>
            </div>

            <div className="space-y-6 mb-8">
              <Input
                label="Playlist Name"
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="Enter playlist name"
              />

              <Textarea
                label="Description (optional)"
                value={playlistDescription}
                onChange={(e) => setPlaylistDescription(e.target.value)}
                rows={3}
                placeholder="Add a description..."
              />
            </div>

            <div className="flex justify-center mb-8">
              <Button
                size="lg"
                onClick={() => {
                  setShowPlaylistForm(false);
                  setLoading(true);
                  setCurrentStep("Starting playlist creation...");
                  createPlaylist(playlistName, playlistDescription, canonical);
                }}
                className="w-full max-w-xs"
              >
                Create Playlist
              </Button>
            </div>

            <Footer />
          </Card>
        </ContentWrapper>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer centered>
        <ContentWrapper maxWidth="md">
          <Alert variant="error" className="text-center">
            {error}
          </Alert>
        </ContentWrapper>
      </PageContainer>
    );
  }

  return null;
}
