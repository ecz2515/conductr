import { NextRequest, NextResponse } from 'next/server';

const SPOTIFY_ACCOUNTS_URL = 'https://accounts.spotify.com';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('🔑 [API/spotify-token] OAuth token exchange request received');
  
  try {
    const body = await req.json();
    console.log('📥 [API/spotify-token] Request body received (code length):', body.code?.length || 0);
    const { code } = body;

    if (!code) {
      console.log('❌ [API/spotify-token] Missing authorization code');
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    console.log('🔧 [API/spotify-token] Checking environment variables...');
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;
    
    console.log('🔧 [API/spotify-token] Environment check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRedirectUri: !!redirectUri,
      redirectUri
    });
    
    if (!clientId || !clientSecret || !redirectUri) {
      console.log('❌ [API/spotify-token] Missing Spotify configuration');
      return NextResponse.json(
        { error: 'Spotify client configuration missing' },
        { status: 500 }
      );
    }

    console.log('🌐 [API/spotify-token] Calling Spotify token exchange API...');
    const response = await fetch(`${SPOTIFY_ACCOUNTS_URL}/api/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    console.log('📡 [API/spotify-token] Spotify response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ [API/spotify-token] Spotify token exchange failed:', errorData);
      return NextResponse.json(
        { error: `Failed to exchange code for token: ${response.status}`, details: errorData },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('✅ [API/spotify-token] Token exchange successful');
    
    const duration = Date.now() - startTime;
    console.log(`🏁 [API/spotify-token] Request completed in ${duration}ms`);
    
    return NextResponse.json({ access_token: data.access_token });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [API/spotify-token] Error after ${duration}ms:`, error);
    return NextResponse.json(
      { error: 'Failed to exchange code for token' },
      { status: 500 }
    );
  }
}