'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { exchangeCodeForToken } from '@/lib/spotifyApi';
import { Music, CheckCircle, XCircle } from 'lucide-react';

export default function CallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage('Authorization was cancelled or failed. Please try again.');
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received. Please try again.');
        return;
      }

      try {
        const accessToken = await exchangeCodeForToken(code);
        setStatus('success');
        setMessage('Successfully connected to Spotify!');
        
        // Store the token and redirect back to the main app
        localStorage.setItem('spotify_access_token', accessToken);
        
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } catch (error) {
        setStatus('error');
        setMessage('Failed to connect to Spotify. Please try again.');
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-conductr-gray flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          {status === 'loading' && (
            <div className="bg-blue-100 rounded-full p-3">
              <Music className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
          )}
          {status === 'success' && (
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          )}
          {status === 'error' && (
            <div className="bg-red-100 rounded-full p-3">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          )}
        </div>

        <h1 className="text-xl font-semibold mb-4">
          {status === 'loading' && 'Connecting to Spotify...'}
          {status === 'success' && 'Connected Successfully!'}
          {status === 'error' && 'Connection Failed'}
        </h1>

        <p className="text-gray-600 mb-6">{message}</p>

        {status === 'loading' && (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-conductr-gold mx-auto"></div>
        )}

        {status === 'success' && (
          <p className="text-sm text-gray-500">
            Redirecting you back to Conductr...
          </p>
        )}

        {status === 'error' && (
          <button
            onClick={() => window.location.href = '/'}
            className="btn-primary"
          >
            Return to Conductr
          </button>
        )}
      </div>
    </div>
  );
}