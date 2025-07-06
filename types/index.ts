export interface ParsedPiece {
  composer: string;
  work: string;
  movement?: string;
  version?: string;
  isComplete?: boolean;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    release_date: string;
  };
  duration_ms: number;
  preview_url?: string;
}

export interface Recording {
  id: string;
  title: string;
  conductor?: string;
  orchestra?: string;
  soloist?: string;
  performer?: string;
  ensemble?: string;
  duration: string;
  year: string;
  spotifyTrack: SpotifyTrack;
}

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type WorkType = 'concerto' | 'symphony' | 'solo' | 'chamber' | 'other';