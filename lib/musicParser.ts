import { ParsedPiece, WorkType } from '@/types';

export async function parseMusicalInput(input: string, conversationContext?: string): Promise<ParsedPiece> {
  console.log('🎼 [musicParser] Starting client-side parsing for:', input);
  console.log('🎼 [musicParser] Conversation context:', conversationContext);
  
  try {
    console.log('📡 [musicParser] Sending request to /api/parse-music...');
    const response = await fetch('/api/parse-music', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input, conversationContext }),
    });

    console.log('📡 [musicParser] API response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const parsedPiece = await response.json();
    console.log('✅ [musicParser] Successfully received parsed piece:', parsedPiece);
    return parsedPiece;
  } catch (error) {
    console.error('❌ [musicParser] Error parsing musical input:', error);
    console.log('🔄 [musicParser] Using fallback response');
    
    // Fallback response
    const fallback = {
      composer: 'Unknown',
      work: input,
      movement: undefined,
      version: undefined,
      isComplete: false
    };
    console.log('⚠️ [musicParser] Fallback response:', fallback);
    return fallback;
  }
}

export function determineWorkType(parsedPiece: ParsedPiece): WorkType {
  const work = parsedPiece.work.toLowerCase();
  
  if (work.includes('concerto')) return 'concerto';
  if (work.includes('symphony') || work.includes('overture')) return 'symphony';
  if (work.includes('sonata') && work.includes('piano')) return 'solo';
  if (work.includes('quartet') || work.includes('trio') || work.includes('quintet')) return 'chamber';
  
  return 'other';
}

export function formatPieceForConfirmation(parsedPiece: ParsedPiece): string {
  let formatted = parsedPiece.composer;
  if (parsedPiece.work) {
    formatted += ` – ${parsedPiece.work}`;
  }
  if (parsedPiece.movement) {
    formatted += `, ${parsedPiece.movement}`;
  }
  if (parsedPiece.version) {
    formatted += ` (${parsedPiece.version})`;
  }
  return formatted;
}