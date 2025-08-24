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
import { logger } from "../../utils/logger";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

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

  // fetched via /api/auth-state?id=...
  const [canonical, setCanonical] = useState<any>(null);
  const [storedAlbums, setStoredAlbums] = useState<any[]>([]);

  useEffect(() => {
    console.log("[create] useEffect");
    logger.info("[create] useEffect");
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const stateParam = urlParams.get("state"); // short nonce
    console.log("[create] code:", Boolean(code), "state:", stateParam);
    logger.info("[create] code and state", { hasCode: Boolean(code), state: stateParam });

    if (!code || !stateParam) {
      setError("Missing required information from Spotify. Try again.");
      return;
    }

    (async () => {
      try {
        console.log("[create] GET /api/auth-state?id=…");
        logger.info("[create] GET /api/auth-state", { id: stateParam });
        const resp = await fetch(`/api/auth-state?id=${encodeURIComponent(stateParam)}`);
        const text = await resp.text();
        let json: any = {};
        try { json = text ? JSON.parse(text) : {}; } catch {}
        console.log("[create] /api/auth-state status:", resp.status, {
          albums: Array.isArray(json?.albums) ? json.albums.length : "n/a",
          hasCanonical: !!json?.canonical,
        });
        logger.info("[create] /api/auth-state status", { 
          status: resp.status, 
          albums: Array.isArray(json?.albums) ? json.albums.length : "n/a",
          hasCanonical: !!json?.canonical 
        });

        if (!resp.ok || !Array.isArray(json?.albums) || json.albums.length === 0) {
          setError("Session expired or invalid. Please go back and try again.");
          return;
        }

        setStoredAlbums(json.albums);
        setCanonical(json.canonical ?? null);

        // Stash a page-local copy as a resilience fallback
        (window as any).__AUTH_STATE__ = { albums: json.albums, canonical: json.canonical };

        // Prefill form from canonical
        const c = json.canonical;
        if (c) {
          const defaultName = c.movement
            ? `${c.composer}: ${c.work} - ${c.movement}`
            : `${c.composer}: ${c.work}`;
          setPlaylistName(defaultName);
          setPlaylistDescription("Created with conductr.dev");
          setShowPlaylistForm(true);
        } else {
          setError("Canonical info not found. Please go back and try again.");
        }
      } catch (e) {
        console.error("[create] auth-state fetch failed:", e);
        logger.error("[create] auth-state fetch failed", { error: e });
        setError("Something went wrong loading your session. Please try again.");
      }
    })();
  }, []);

  function normalizeUris(raw: any[]): string[] {
    const out: string[] = [];
    for (const t of raw || []) {
      if (typeof t === "string") {
        if (/^spotify:track:[A-Za-z0-9]{22}$/.test(t)) out.push(t);
        else if (/^[A-Za-z0-9]{22}$/.test(t)) out.push(`spotify:track:${t}`);
        else {
          const m = t.match(/open\.spotify\.com\/track\/([A-Za-z0-9]{22})/);
          if (m) out.push(`spotify:track:${m[1]}`);
        }
      } else if (t?.uri && /^spotify:track:[A-Za-z0-9]{22}$/.test(t.uri)) {
        out.push(t.uri);
      } else if (t?.id && /^[A-Za-z0-9]{22}$/.test(t.id)) {
        out.push(`spotify:track:${t.id}`);
      }
    }
    return Array.from(new Set(out));
  }

  async function createPlaylist(name: string, description: string, canonicalArg: any) {
    try {
      console.log("[create] start createPlaylist");
      logger.info("[create] start createPlaylist");
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      if (!code) throw new Error("Missing required Spotify authorization code.");

      const albums =
        storedAlbums?.length ? storedAlbums : (window as any).__AUTH_STATE__?.albums ?? [];
      if (!albums.length) throw new Error("No albums found. Go back and select albums.");
      if (!canonicalArg) throw new Error("Canonical info not found. Please go back and try again.");

      setLoading(true);
      setCurrentStep("Getting Spotify access token…");

      // 1) Exchange code for token
      const tokenRes = await fetch("/api/spotify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const tokenText = await tokenRes.text();
      let tokenJson: any = {};
      try { tokenJson = tokenText ? JSON.parse(tokenText) : {}; } catch {}
      console.log("[create] /api/spotify-token status:", tokenRes.status, !!tokenJson?.access_token);
      logger.info("[create] /api/spotify-token status", { status: tokenRes.status, hasAccessToken: !!tokenJson?.access_token });

      if (!tokenRes.ok || !tokenJson?.access_token) {
        throw new Error(`Could not get Spotify access token. ${tokenText || ""}`);
      }
      const accessToken: string = tokenJson.access_token;

      // 2) Clean URL
      window.history.replaceState({}, document.title, "/playlist/create");

      // 3) Who am I?
      setCurrentStep("Getting user information…");
      const meRes = await fetch(`${SPOTIFY_API_BASE}/me`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      });
      if (!meRes.ok) {
        const t = await meRes.text();
        throw new Error(`[GET /me ${meRes.status}] ${t || "no body"}`);
      }
      const meJson = await meRes.json();
      console.log("[create] GET /v1/me status:", meRes.status, !!meJson?.id);
      logger.info("[create] GET /v1/me status", { status: meRes.status, hasUserId: !!meJson?.id });
      if (!meJson?.id) throw new Error("Could not fetch Spotify profile (no id).");

      // 4) Create playlist (improved error surface)
      setCurrentStep("Creating playlist…");
      const finalName =
        name ||
        (canonicalArg.movement
          ? `${canonicalArg.composer}: ${canonicalArg.work} - ${canonicalArg.movement}`
          : `${canonicalArg.composer}: ${canonicalArg.work}`);
      const finalDesc = description || "Created with conductr.dev";

      const createUrl = `${SPOTIFY_API_BASE}/users/${encodeURIComponent(meJson.id)}/playlists`;
      const plRes = await fetch(createUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ name: finalName, description: finalDesc, public: false }),
      });

      if (plRes.status === 403) {
        router.push("/access-gate");
        return;
      }
      if (!plRes.ok) {
        const errText = await plRes.text();
        throw new Error(`[create playlist ${plRes.status}] ${errText || "no body"}`);
      }

      let plJson: any;
      try { plJson = await plRes.json(); } catch {
        throw new Error("Playlist created but response had no JSON body.");
      }
      if (!plJson?.id) throw new Error("Playlist create returned no id.");
      console.log("[create] playlist id:", plJson.id);
      logger.info("[create] playlist created", { playlistId: plJson.id });

      // 5) Extract tracks per album (server API first; fallback to full album)
      setCurrentStep("Analyzing albums with AI…");
      let uris: string[] = [];
      let processed = 0;

      for (const album of albums) {
        processed += 1;
        setCurrentStep(`Analyzing album ${processed} of ${albums.length}…`);
        try {
          const xtRes = await fetch("/api/extract-tracks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              albumId: album.id,
              accessToken,
              workTitle: canonicalArg.work,
              movementTitles: canonicalArg.movement ? [canonicalArg.movement] : [],
            }),
          });

          const xtText = await xtRes.text();
          let xtJson: any = {};
          try { xtJson = xtText ? JSON.parse(xtText) : {}; } catch {}

          console.log("[create] /api/extract-tracks status:", xtRes.status, {
            album: album.id,
            uris: Array.isArray(xtJson?.uris) ? xtJson.uris.length : "n/a",
          });
          logger.info("[create] /api/extract-tracks status", {
            status: xtRes.status,
            album: album.id,
            uris: Array.isArray(xtJson?.uris) ? xtJson.uris.length : "n/a",
          });

          if (!xtRes.ok || !Array.isArray(xtJson?.uris)) throw new Error(xtText || "extract-tracks failed");

          const cleaned = normalizeUris(xtJson.uris);
          if (!cleaned.length) throw new Error("no valid URIs returned");
          uris = uris.concat(cleaned);
        } catch (e) {
          console.warn("[create] extract-tracks failed; fallback to full album:", album.id, e);
          logger.warn("[create] extract-tracks failed; fallback to full album", { albumId: album.id, error: e });
          const trRes = await fetch(
            `${SPOTIFY_API_BASE}/albums/${album.id}/tracks?limit=50`,
            { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } }
          );
          const trText = await trRes.text();
          let trJson: any = {};
          try { trJson = trText ? JSON.parse(trText) : {}; } catch {}
          console.log("[create] GET /albums/:id/tracks status:", trRes.status, {
            album: album.id,
            items: Array.isArray(trJson?.items) ? trJson.items.length : "n/a",
          });
          logger.info("[create] GET /albums/:id/tracks status", {
            status: trRes.status,
            album: album.id,
            items: Array.isArray(trJson?.items) ? trJson.items.length : "n/a",
          });
          const allUris = normalizeUris((trJson?.items || []).map((t: any) => t?.uri || t?.id));
          uris = uris.concat(allUris);
        }
      }

      // 6) Finalize and validate URIs
      uris = Array.from(new Set(uris)).filter(u => /^spotify:track:[A-Za-z0-9]{22}$/.test(u));
      console.log("[create] total URIs after normalize/dedupe:", uris.length);
      logger.info("[create] total URIs after normalize/dedupe", { uriCount: uris.length });
      if (!uris.length) throw new Error("No valid tracks found to add to the playlist.");

      // 7) Add tracks in chunks of 100
      setCurrentStep("Adding tracks to playlist…");
      for (let i = 0; i < uris.length; i += 100) {
        const chunk = uris.slice(i, i + 100);
        const addRes = await fetch(`${SPOTIFY_API_BASE}/playlists/${encodeURIComponent(plJson.id)}/tracks`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ uris: chunk }),
        });
        if (!addRes.ok) {
          const addText = await addRes.text();
          throw new Error(`[add tracks ${addRes.status}] ${addText || "no body"}`);
        }
        const addJson = await addRes.json().catch(() => ({}));
        console.log("[create] POST add-tracks status:", addRes.status, {
          added: chunk.length,
          snapshot: !!addJson?.snapshot_id,
        });
        logger.info("[create] POST add-tracks status", {
          status: addRes.status,
          added: chunk.length,
          snapshot: !!addJson?.snapshot_id,
        });
      }

      setPlaylistUrl(plJson?.external_urls?.spotify ?? null);
      setLoading(false);
      setCurrentStep("");
      console.log("[create] success:", plJson?.id, plJson?.external_urls?.spotify);
      logger.info("[create] success", { playlistId: plJson?.id, spotifyUrl: plJson?.external_urls?.spotify });
    } catch (err: any) {
      console.error("[create] failed:", err);
      logger.error("[create] failed", { error: err?.message ?? String(err) });
      setError("Something went wrong: " + (err?.message ?? String(err)));
      setLoading(false);
      setCurrentStep("");
    }
  }

  if (loading) {
    return (
      <PageContainer centered>
        {/* Account Icon - Fixed Position */}
        <div className="fixed top-6 right-6 z-50">
          <a
            href="/account"
            className="flex items-center justify-center w-12 h-12 bg-[#181818] hover:bg-[#232323] rounded-full shadow-lg border border-[#282828] transition-all duration-200 hover:scale-110 group"
            aria-label="Account & Billing"
          >
            <svg
              className="w-6 h-6 text-[#b3b3b3] group-hover:text-white transition-colors duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </a>
        </div>

        <ContentWrapper maxWidth="md">
          <div className="text-center">
            <div className="mb-6"><Spinner size="lg" /></div>
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
        {/* Account Icon - Fixed Position */}
        <div className="fixed top-6 right-6 z-50">
          <a
            href="/account"
            className="flex items-center justify-center w-12 h-12 bg-[#181818] hover:bg-[#232323] rounded-full shadow-lg border border-[#282828] transition-all duration-200 hover:scale-110 group"
            aria-label="Account & Billing"
          >
            <svg
              className="w-6 h-6 text-[#b3b3b3] group-hover:text-white transition-colors duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </a>
        </div>

        <ContentWrapper maxWidth="md">
          <Card variant="elevated" className="p-8 text-center animate-expand animate-fade-in">
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
                <Button variant="secondary" onClick={() => router.push("/")} className="flex-1 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </Button>
              </div>
            </div>

            <Footer />
          </Card>

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
        {/* Account Icon - Fixed Position */}
        <div className="fixed top-6 right-6 z-50">
          <a
            href="/account"
            className="flex items-center justify-center w-12 h-12 bg-[#181818] hover:bg-[#232323] rounded-full shadow-lg border border-[#282828] transition-all duration-200 hover:scale-110 group"
            aria-label="Account & Billing"
          >
            <svg
              className="w-6 h-6 text-[#b3b3b3] group-hover:text-white transition-colors duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </a>
        </div>

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
                  setCurrentStep("Starting playlist creation…");
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
        {/* Account Icon - Fixed Position */}
        <div className="fixed top-6 right-6 z-50">
          <a
            href="/account"
            className="flex items-center justify-center w-12 h-12 bg-[#181818] hover:bg-[#232323] rounded-full shadow-lg border border-[#282828] transition-all duration-200 hover:scale-110 group"
            aria-label="Account & Billing"
          >
            <svg
              className="w-6 h-6 text-[#b3b3b3] group-hover:text-white transition-colors duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </a>
        </div>

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
