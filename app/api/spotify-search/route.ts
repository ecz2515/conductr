import { NextRequest, NextResponse } from 'next/server';
import { ParsedPiece } from '@/types';
import { parseClassicalMetadata } from '@/lib/metadataParser';

const SPOTIFY_BASE_URL = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS_URL = 'https://accounts.spotify.com';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('🎵 [API/spotify-search] Received request');
  
  try {
    const body = await req.json();
    console.log('📥 [API/spotify-search] Request body:', body);
    const { parsedPiece }: { parsedPiece: ParsedPiece } = body;

    if (!parsedPiece) {
      console.log('❌ [API/spotify-search] Missing parsed piece');
      return NextResponse.json(
        { error: 'Parsed piece is required' },
        { status: 400 }
      );
    }

    console.log('🔐 [API/spotify-search] Getting Spotify client credentials...');
    // Get client credentials token
    const accessToken = await getClientCredentialsToken();
    console.log('✅ [API/spotify-search] Got access token');
    
    // Build search query
    const searchQuery = buildSearchQuery(parsedPiece);
    console.log('🔍 [API/spotify-search] Search query:', searchQuery);
    
    // Search Spotify with broader scope
    console.log('🌐 [API/spotify-search] Calling Spotify search API...');
    const searchResponse = await fetch(
      `${SPOTIFY_BASE_URL}/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=50&market=US`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!searchResponse.ok) {
      console.error(`❌ [API/spotify-search] Spotify API error: ${searchResponse.status} ${searchResponse.statusText}`);
      return NextResponse.json(
        { error: `Spotify search failed: ${searchResponse.status}` },
        { status: 500 }
      );
    }

    const searchData = await searchResponse.json();
    const tracks = searchData.tracks.items;
    console.log(`📀 [API/spotify-search] Found ${tracks.length} raw tracks from Spotify`);

    // Convert to Recording format and filter
    console.log('🔄 [API/spotify-search] Filtering and converting tracks...');
    const filteredTracks = tracks.filter((track: any) => isClassicalMusic(track, parsedPiece));
    console.log(`✨ [API/spotify-search] ${filteredTracks.length} tracks passed classical music filter`);
    
    // Rank tracks by quality/importance before AI parsing
    console.log('📊 [API/spotify-search] Ranking tracks by importance...');
    const rankedTracks = rankTracksByImportance(filteredTracks);
    
    // Take top 25 results for AI parsing
    const tracksToProcess = rankedTracks.slice(0, 25);
    console.log('🤖 [API/spotify-search] Starting AI metadata parsing for top tracks...');
    
    const recordings = await Promise.all(
      tracksToProcess.map(async (track: any) => await convertTrackToRecordingWithAI(track))
    );
    
    // Final ranking after AI parsing
    const finalRecordings = rankRecordingsByImportance(recordings).slice(0, 20);
    
    console.log('🎭 [API/spotify-search] AI metadata parsing completed');
    console.log(`📊 [API/spotify-search] Returning ${finalRecordings.length} final recordings`);
    console.log('🎼 [API/spotify-search] Sample recordings with AI metadata:', finalRecordings.slice(0, 2).map(r => ({ 
      title: r.title, 
      conductor: r.conductor, 
      orchestra: r.orchestra,
      soloist: r.soloist,
      performer: r.performer
    })));

    const duration = Date.now() - startTime;
    console.log(`✅ [API/spotify-search] Request completed in ${duration}ms`);

    return NextResponse.json(finalRecordings);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [API/spotify-search] Error after ${duration}ms:`, error);
    return NextResponse.json(
      { error: 'Failed to search Spotify' },
      { status: 500 }
    );
  }
}

function rankTracksByImportance(tracks: any[]): any[] {
  console.log('🏆 [rankTracksByImportance] Ranking tracks...');
  
  const famousConductors = [
    'karajan', 'bernstein', 'barenboim', 'abbado', 'muti', 'rattle', 'kleiber', 
    'furtwängler', 'toscanini', 'solti', 'ozawa', 'levine', 'gardiner', 'harnoncourt',
    'marriner', 'davis', 'järvi', 'mehta', 'dudamel', 'gergiev', 'chailly', 'thielemann',
    'jansons', 'alsop', 'petrenko', 'nezet-seguin', 'currentzis'
  ];
  
  const famousOrchestras = [
    'berliner philharmoniker', 'berlin philharmonic', 'vienna philharmonic', 'london symphony', 
    'chicago symphony', 'new york philharmonic', 'boston symphony', 'cleveland orchestra', 
    'philadelphia orchestra', 'royal concertgebouw', 'bavarian radio', 'london philharmonic', 
    'los angeles philharmonic', 'mahler chamber', 'chamber orchestra of europe', 'academy of st martin'
  ];
  
  return tracks.map(track => {
    let score = 0;
    const trackText = (track.name + ' ' + track.album.name + ' ' + track.artists.map((a: any) => a.name).join(' ')).toLowerCase();
    
    // MAJOR bonus for complete symphony recordings (not parts)
    if (!trackText.includes(', pt.') && !trackText.includes('part ') && !trackText.includes('movement')) {
      score += 20;
      console.log(`🎯 [rankTracksByImportance] Complete work bonus for: ${track.name}`);
    }
    
    // Famous conductor bonus
    for (const conductor of famousConductors) {
      if (trackText.includes(conductor)) {
        score += 15;
        console.log(`👨‍🎼 [rankTracksByImportance] Famous conductor bonus (${conductor}) for: ${track.name}`);
        break;
      }
    }
    
    // Famous orchestra bonus
    for (const orchestra of famousOrchestras) {
      if (trackText.includes(orchestra)) {
        score += 12;
        console.log(`🏛️ [rankTracksByImportance] Famous orchestra bonus (${orchestra}) for: ${track.name}`);
        break;
      }
    }
    
    // Album quality indicators
    if (trackText.includes('complete') || trackText.includes('edition') || trackText.includes('collection')) {
      score += 8;
    }
    
    // Avoid partial recordings and amateur recordings
    if (trackText.includes('student') || trackText.includes('amateur') || trackText.includes('karaoke')) {
      score -= 20;
    }
    
    // Popularity bonus (Spotify's popularity score)
    score += (track.popularity || 0) / 10;
    
    return { ...track, _score: score };
  }).sort((a, b) => b._score - a._score);
}

function rankRecordingsByImportance(recordings: any[]): any[] {
  console.log('🏆 [rankRecordingsByImportance] Final ranking...');
  
  return recordings.map(recording => {
    let score = 0;
    
    // Has conductor info
    if (recording.conductor) score += 15;
    
    // Has orchestra info  
    if (recording.orchestra) score += 10;
    
    // Famous conductor
    const famousConductors = [
      'karajan', 'bernstein', 'barenboim', 'abbado', 'muti', 'rattle', 'kleiber',
      'alsop', 'petrenko', 'dudamel', 'gergiev'
    ];
    if (recording.conductor && famousConductors.some(c => recording.conductor.toLowerCase().includes(c))) {
      score += 20;
    }
    
    // Famous orchestra
    const famousOrchestras = [
      'berlin philharmonic', 'vienna philharmonic', 'london symphony', 'london philharmonic',
      'chicago symphony', 'new york philharmonic', 'boston symphony'
    ];
    if (recording.orchestra && famousOrchestras.some(o => recording.orchestra.toLowerCase().includes(o))) {
      score += 15;
    }
    
    return { ...recording, _score: score };
  }).sort((a, b) => b._score - a._score);
}

async function getClientCredentialsToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Spotify client credentials not configured');
  }

  const response = await fetch(`${SPOTIFY_ACCOUNTS_URL}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Failed to get Spotify token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

function buildSearchQuery(parsedPiece: ParsedPiece): string {
  let query = '';
  
  // For symphonies, be very specific about the number
  if (parsedPiece.work && parsedPiece.work.toLowerCase().includes('symphony')) {
    // Extract symphony number
    const symphonyMatch = parsedPiece.work.match(/symphony\s+no\.?\s*(\d+)/i);
    if (symphonyMatch) {
      const symphonyNum = symphonyMatch[1];
      query = `${parsedPiece.composer} symphony ${symphonyNum}`;
      console.log('🔍 [buildSearchQuery] Symphony-specific query:', query);
      return query;
    }
  }
  
  // For other works, use exact matching
  if (parsedPiece.composer && parsedPiece.composer !== 'Unknown' && parsedPiece.work) {
    query = `"${parsedPiece.composer}" "${parsedPiece.work}"`;
    if (parsedPiece.movement) {
      query += ` "${parsedPiece.movement}"`;
    }
  } else if (parsedPiece.work) {
    query = `"${parsedPiece.work}"`;
  } else if (parsedPiece.composer && parsedPiece.composer !== 'Unknown') {
    query = parsedPiece.composer;
  }
  
  console.log('🔍 [buildSearchQuery] Final query strategy:', query);
  return query;
}

function isClassicalMusic(track: any, parsedPiece: ParsedPiece): boolean {
  const trackName = track.name.toLowerCase();
  const artistNames = track.artists.map((a: any) => a.name.toLowerCase()).join(' ');
  const albumName = track.album.name.toLowerCase();
  const allText = trackName + ' ' + artistNames + ' ' + albumName;
  
  // For symphonies, be very strict about the number
  if (parsedPiece.work && parsedPiece.work.toLowerCase().includes('symphony')) {
    const symphonyMatch = parsedPiece.work.match(/symphony\s+no\.?\s*(\d+)/i);
    if (symphonyMatch) {
      const requestedNum = symphonyMatch[1];
      
      // Must mention the composer
      if (parsedPiece.composer && parsedPiece.composer !== 'Unknown') {
        const composer = parsedPiece.composer.toLowerCase();
        if (!allText.includes(composer)) {
          return false;
        }
      }
      
      // Must mention symphony
      if (!allText.includes('symphony')) {
        return false;
      }
      
      // Must mention the correct number
      const numberPatterns = [
        `symphony no. ${requestedNum}`,
        `symphony no.${requestedNum}`,
        `symphony ${requestedNum}`,
        `symphony no ${requestedNum}`
      ];
      
      const hasCorrectNumber = numberPatterns.some(pattern => allText.includes(pattern));
      if (!hasCorrectNumber) {
        console.log(`❌ [isClassicalMusic] Rejecting "${trackName}" - wrong symphony number (wanted ${requestedNum})`);
        return false;
      }
      
      return true;
    }
  }
  
  // Check for composer mention
  if (parsedPiece.composer && parsedPiece.composer !== 'Unknown') {
    const composer = parsedPiece.composer.toLowerCase();
    if (!allText.includes(composer)) {
      return false;
    }
  }
  
  // Check for work title
  if (parsedPiece.work) {
    const work = parsedPiece.work.toLowerCase();
    if (allText.includes(work) || allText.includes(work.replace(/[^\w\s]/g, ''))) {
      return true;
    }
  }
  
  // Check for classical music indicators
  const classicalIndicators = [
    'symphony', 'concerto', 'sonata', 'quartet', 'trio', 'quintet',
    'prelude', 'fugue', 'etude', 'nocturne', 'waltz', 'mazurka',
    'overture', 'suite', 'mass', 'requiem', 'cantata', 'oratorio',
    'philharmonic', 'orchestra', 'chamber', 'ensemble'
  ];
  
  const hasClassicalIndicator = classicalIndicators.some(indicator => allText.includes(indicator));
  
  // Exclude obvious non-classical
  const nonClassicalIndicators = ['rock', 'pop', 'hip-hop', 'rap', 'electronic', 'dance', 'country', 'folk', 'jazz'];
  const hasNonClassicalIndicator = nonClassicalIndicators.some(indicator => allText.includes(indicator));
  
  return hasClassicalIndicator && !hasNonClassicalIndicator;
}

async function convertTrackToRecordingWithAI(track: any): Promise<any> {
  console.log('🤖 [convertTrackToRecordingWithAI] Processing:', track.name);
  
  try {
    // Use AI to parse metadata
    const aiMetadata = await parseClassicalMetadata(track);
    
    return {
      id: track.id,
      title: track.name,
      conductor: aiMetadata.conductor || undefined,
      orchestra: aiMetadata.orchestra || undefined,
      soloist: aiMetadata.soloist || undefined,
      performer: aiMetadata.performer || aiMetadata.soloist || undefined,
      ensemble: aiMetadata.ensemble || undefined,
      duration: formatDuration(track.duration_ms),
      year: track.album.release_date.split('-')[0],
      spotifyTrack: track
    };
  } catch (error) {
    console.error('❌ [convertTrackToRecordingWithAI] Error, falling back to basic conversion:', error);
    // Fallback to basic conversion
    return convertTrackToRecording(track);
  }
}

function convertTrackToRecording(track: any): any {
  // Extract conductor, orchestra, and soloist from artists
  const artists = track.artists.map((a: any) => a.name);
  
  // Common patterns in classical music artist names
  const conductor = artists.find((a: string) => 
    a.toLowerCase().includes('conductor') || 
    a.toLowerCase().includes('dirigent') ||
    isKnownConductor(a)
  );
  
  const orchestra = artists.find((a: string) => 
    a.toLowerCase().includes('orchestra') || 
    a.toLowerCase().includes('philharmonic') ||
    a.toLowerCase().includes('symphony') ||
    a.toLowerCase().includes('ensemble')
  );
  
  const soloist = artists.find((a: string) => 
    !a.toLowerCase().includes('orchestra') && 
    !a.toLowerCase().includes('philharmonic') &&
    !a.toLowerCase().includes('ensemble') &&
    !isKnownConductor(a)
  );
  
  return {
    id: track.id,
    title: track.name,
    conductor: conductor || undefined,
    orchestra: orchestra || undefined,
    soloist: soloist || undefined,
    performer: soloist || undefined,
    duration: formatDuration(track.duration_ms),
    year: track.album.release_date.split('-')[0],
    spotifyTrack: track
  };
}

function isKnownConductor(name: string): boolean {
  const knownConductors = [
    'karajan', 'bernstein', 'barenboim', 'abbado', 'muti', 'rattle',
    'kleiber', 'furtwängler', 'toscanini', 'solti', 'ozawa', 'levine',
    'gardiner', 'harnoncourt', 'marriner', 'davis', 'järvi', 'mehta'
  ];
  
  return knownConductors.some(conductor => 
    name.toLowerCase().includes(conductor)
  );
}

function formatDuration(durationMs: number): string {
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}