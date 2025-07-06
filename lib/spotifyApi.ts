import { SpotifyTrack, Recording, ParsedPiece } from '@/types';

const SPOTIFY_BASE_URL = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS_URL = 'https://accounts.spotify.com';

export async function searchSpotifyRecordings(parsedPiece: ParsedPiece): Promise<Recording[]> {
  console.log('🎵 [spotifyApi] Starting client-side Spotify search for:', parsedPiece);
  
  try {
    console.log('📡 [spotifyApi] Sending request to /api/spotify-search...');
    const response = await fetch('/api/spotify-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ parsedPiece }),
    });

    console.log('📡 [spotifyApi] API response status:', response.status);

    if (!response.ok) {
      throw new Error(`Spotify search failed: ${response.status}`);
    }

    const recordings = await response.json();
    console.log(`✅ [spotifyApi] Successfully received ${recordings.length} recordings`);
    console.log('🎼 [spotifyApi] Sample recordings:', recordings.slice(0, 2));
    return recordings;
  } catch (error) {
    console.error('❌ [spotifyApi] Error searching Spotify:', error);
    console.log('🔄 [spotifyApi] Returning empty array');
    return [];
  }
}

export async function createSpotifyPlaylist(
  accessToken: string,
  name: string,
  trackIds: string[]
): Promise<string> {
  try {
    // Get user profile
    const userResponse = await fetch(`${SPOTIFY_BASE_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error(`Failed to get user profile: ${userResponse.status}`);
    }

    const userData = await userResponse.json();
    const userId = userData.id;

    // Create playlist
    const playlistResponse = await fetch(
      `${SPOTIFY_BASE_URL}/users/${userId}/playlists`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: 'Created with Conductr - Classical Music Playlist Generator',
          public: false,
        }),
      }
    );

    if (!playlistResponse.ok) {
      throw new Error(`Failed to create playlist: ${playlistResponse.status}`);
    }

    const playlistData = await playlistResponse.json();
    const playlistId = playlistData.id;

    // Add tracks to playlist
    const trackUris = trackIds.map(id => `spotify:track:${id}`);
    
    // Spotify API accepts max 100 tracks per request
    const chunks = [];
    for (let i = 0; i < trackUris.length; i += 100) {
      chunks.push(trackUris.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      const addTracksResponse = await fetch(
        `${SPOTIFY_BASE_URL}/playlists/${playlistId}/tracks`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uris: chunk,
          }),
        }
      );

      if (!addTracksResponse.ok) {
        throw new Error(`Failed to add tracks to playlist: ${addTracksResponse.status}`);
      }
    }

    return playlistId;
  } catch (error) {
    console.error('Error creating Spotify playlist:', error);
    throw error;
  }
}

export function getSpotifyAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    throw new Error('Spotify client configuration missing');
  }
  
  const scopes = [
    'playlist-modify-public',
    'playlist-modify-private',
    'playlist-read-private',
    'playlist-read-collaborative'
  ].join(' ');
  
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes,
    show_dialog: 'true',
  });

  return `${SPOTIFY_ACCOUNTS_URL}/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  try {
    const response = await fetch('/api/spotify-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code for token: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
}