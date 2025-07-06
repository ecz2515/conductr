'use client';

import { useState } from 'react';
import { Recording, ParsedPiece } from '@/types';
import { createSpotifyPlaylist } from '@/lib/spotifyApi';
import { Music, CheckCircle, ExternalLink } from 'lucide-react';

interface PlaylistCreatorProps {
  selectedRecordings: Recording[];
  parsedPiece: ParsedPiece;
  accessToken: string;
  onPlaylistCreated: (playlistId: string) => void;
}

export default function PlaylistCreator({ 
  selectedRecordings, 
  parsedPiece, 
  accessToken, 
  onPlaylistCreated 
}: PlaylistCreatorProps) {
  const [playlistName, setPlaylistName] = useState(
    `${parsedPiece.composer} - ${parsedPiece.work}${parsedPiece.movement ? ` (${parsedPiece.movement})` : ''}`
  );
  const [isCreating, setIsCreating] = useState(false);
  const [createdPlaylistId, setCreatedPlaylistId] = useState<string | null>(null);

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim()) return;

    setIsCreating(true);
    try {
      const trackIds = selectedRecordings.map(r => r.spotifyTrack.id);
      const playlistId = await createSpotifyPlaylist(accessToken, playlistName, trackIds);
      
      setCreatedPlaylistId(playlistId);
      onPlaylistCreated(playlistId);
    } catch (error) {
      console.error('Failed to create playlist:', error);
      alert('Failed to create playlist. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  if (createdPlaylistId) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md mx-auto">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Playlist Created!
          </h3>
          
          <p className="text-gray-600 mb-6">
            Your playlist "<strong>{playlistName}</strong>" has been successfully created with {selectedRecordings.length} recordings.
          </p>
          
          <a
            href={`https://open.spotify.com/playlist/${createdPlaylistId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Spotify
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md mx-auto">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-conductr-gold bg-opacity-20 rounded-full p-3">
            <Music className="w-8 h-8 text-conductr-gold" />
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Create Your Playlist
        </h3>
        
        <p className="text-gray-600 mb-4">
          You've selected {selectedRecordings.length} recordings. 
          Give your playlist a name and we'll create it in your Spotify account.
        </p>
        
        <div className="mb-6">
          <label htmlFor="playlist-name" className="block text-sm font-medium text-gray-700 mb-2">
            Playlist Name
          </label>
          <input
            id="playlist-name"
            type="text"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-conductr-gold"
            placeholder="Enter playlist name..."
          />
        </div>
        
        <button
          onClick={handleCreatePlaylist}
          disabled={isCreating || !playlistName.trim()}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-conductr-dark"></div>
              Creating Playlist...
            </>
          ) : (
            <>
              <Music className="w-5 h-5" />
              Create Playlist
            </>
          )}
        </button>
      </div>
    </div>
  );
}