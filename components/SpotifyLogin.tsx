'use client';

import { useState } from 'react';
import { getSpotifyAuthUrl } from '@/lib/spotifyApi';
import { Music, ExternalLink } from 'lucide-react';

interface SpotifyLoginProps {
  onLogin: (accessToken: string) => void;
}

export default function SpotifyLogin({ onLogin }: SpotifyLoginProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const authUrl = getSpotifyAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to initiate Spotify login:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md mx-auto">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-green-100 rounded-full p-3">
            <Music className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Connect to Spotify
        </h3>
        
        <p className="text-gray-600 mb-6">
          To create your playlist, we need access to your Spotify account. 
          This will allow us to add the selected recordings to a new playlist.
        </p>
        
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <ExternalLink className="w-5 h-5" />
              Connect with Spotify
            </>
          )}
        </button>
        
        <p className="text-xs text-gray-500 mt-4">
          We'll only access your playlists to create new ones. 
          Your listening history remains private.
        </p>
      </div>
    </div>
  );
}