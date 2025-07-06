import { SpotifyTrack } from '@/types';
import OpenAI from 'openai';

interface ParsedMetadata {
  conductor?: string;
  orchestra?: string;
  soloist?: string;
  performer?: string;
  ensemble?: string;
}

class MetadataParser {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async parseClassicalMetadata(track: SpotifyTrack): Promise<ParsedMetadata> {
    console.log('🎭 [MetadataParser] Parsing metadata for:', track.name);
    
    const artists = track.artists.map(a => a.name);
    const albumName = track.album.name;
    const trackName = track.name;
    
    console.log('🎭 [MetadataParser] Input data:', {
      trackName,
      albumName,
      artists
    });

    const prompt = `
You are an expert in classical music metadata. Parse the following Spotify track information to extract performers:

Track: "${trackName}"
Album: "${albumName}"
Artists: ${artists.join(', ')}

Extract and return ONLY a JSON object with the following structure:
{
  "conductor": "conductor name or null",
  "orchestra": "orchestra/ensemble name or null", 
  "soloist": "soloist name or null",
  "performer": "main performer for solo works or null",
  "ensemble": "chamber ensemble name or null"
}

Rules:
1. Look for conductor names (often listed as artists or in album/track titles)
2. Identify orchestras, philharmonics, symphonies, ensembles
3. For solo works, identify the main performer
4. For concertos, identify the soloist separately from conductor/orchestra
5. Common conductor surnames: Karajan, Bernstein, Barenboim, Abbado, Muti, Rattle, Kleiber, Furtwängler, Toscanini, Solti, Ozawa, Levine, Gardiner, Harnoncourt, Marriner, Davis, Järvi, Mehta, Dudamel, Gergiev, Chailly, Thielemann, Jansons
6. If an artist name contains both conductor and orchestra info, parse them separately
7. Return null for fields that cannot be determined

Examples:
- Artists: ["Herbert von Karajan", "Berlin Philharmonic"] → {"conductor": "Herbert von Karajan", "orchestra": "Berlin Philharmonic", ...}
- Track: "Piano Concerto No. 1 - Martha Argerich, Simon Rattle, London Symphony Orchestra" → {"soloist": "Martha Argerich", "conductor": "Simon Rattle", "orchestra": "London Symphony Orchestra", ...}
- Artists: ["Yo-Yo Ma"] for a solo work → {"performer": "Yo-Yo Ma", ...}
`;

    try {
      console.log('🌐 [MetadataParser] Sending request to OpenAI...');
      const startTime = Date.now();
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 300,
      });

      const duration = Date.now() - startTime;
      console.log(`⚡ [MetadataParser] OpenAI response received in ${duration}ms`);
      
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      console.log('📝 [MetadataParser] Raw response:', content);
      const parsed = JSON.parse(content) as ParsedMetadata;
      console.log('✅ [MetadataParser] Successfully parsed metadata:', parsed);
      
      return parsed;
    } catch (error) {
      console.error('❌ [MetadataParser] Error parsing metadata:', error);
      console.log('🔄 [MetadataParser] Falling back to basic extraction');
      
      // Fallback to basic pattern matching
      return this.basicMetadataExtraction(track);
    }
  }

  private basicMetadataExtraction(track: SpotifyTrack): ParsedMetadata {
    const artists = track.artists.map(a => a.name);
    const albumName = track.album.name.toLowerCase();
    const trackName = track.name.toLowerCase();
    
    console.log('🔧 [MetadataParser] Using basic extraction fallback');
    
    // Basic conductor detection
    const knownConductors = [
      'karajan', 'bernstein', 'barenboim', 'abbado', 'muti', 'rattle',
      'kleiber', 'furtwängler', 'toscanini', 'solti', 'ozawa', 'levine',
      'gardiner', 'harnoncourt', 'marriner', 'davis', 'järvi', 'mehta',
      'dudamel', 'gergiev', 'chailly', 'thielemann', 'jansons'
    ];
    
    const conductor = artists.find(artist => 
      knownConductors.some(cond => artist.toLowerCase().includes(cond))
    );
    
    // Basic orchestra detection
    const orchestra = artists.find(artist => 
      artist.toLowerCase().includes('orchestra') || 
      artist.toLowerCase().includes('philharmonic') ||
      artist.toLowerCase().includes('symphony') ||
      artist.toLowerCase().includes('ensemble')
    );
    
    // For solo works, assume first artist is performer
    const performer = artists.length === 1 && !orchestra ? artists[0] : undefined;
    
    const result = {
      conductor: conductor || undefined,
      orchestra: orchestra || undefined,
      performer: performer || undefined,
      soloist: undefined,
      ensemble: undefined
    };
    
    console.log('🔧 [MetadataParser] Basic extraction result:', result);
    return result;
  }
}

// Export singleton instance
export const metadataParser = new MetadataParser();

export async function parseClassicalMetadata(track: SpotifyTrack): Promise<ParsedMetadata> {
  return await metadataParser.parseClassicalMetadata(track);
}