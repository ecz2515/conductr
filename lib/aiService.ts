import { ParsedPiece } from '@/types';
import OpenAI from 'openai';

interface AIService {
  parseMusicalInput(input: string, conversationContext?: string): Promise<ParsedPiece>;
}

class OpenAIService implements AIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async parseMusicalInput(input: string, conversationContext?: string): Promise<ParsedPiece> {
    console.log('🤖 [OpenAIService] Starting parsing for input:', input);
    console.log('🤖 [OpenAIService] Conversation context:', conversationContext);
    
    const contextPrompt = conversationContext ? `

CONVERSATION CONTEXT: ${conversationContext}

IMPORTANT: Use this context to understand the user's current input. If the user mentions movements, numbers, or musical terms that relate to the previous context, interpret them accordingly.` : '';
    
    const prompt = `
You are a classical music expert. Parse the following user input and extract:
1. Composer name (standardized, e.g., "Beethoven", "Mozart")
2. Work title (standardized, e.g., "Symphony No. 5 in C minor", "Piano Concerto No. 21")
3. Movement (if specified, e.g., "I. Allegro", "II. Andante", "III. Adagio")
4. Version (if specified, e.g., "Piano Reduction", "Orchestral")
${contextPrompt}

User input: "${input}"

Return ONLY a JSON object with this exact structure:
{
  "composer": "composer name or 'Unknown'",
  "work": "work title or the original input if unclear",
  "movement": "movement or null",
  "version": "version or null",
  "isComplete": boolean (true if composer and work are clearly identified)
}

Examples:
- "Beethoven 5th symphony" → {"composer": "Beethoven", "work": "Symphony No. 5 in C minor", "movement": null, "version": null, "isComplete": true}
- "Mozart piano concerto 21 second movement" → {"composer": "Mozart", "work": "Piano Concerto No. 21 in C major", "movement": "II. Andante", "version": null, "isComplete": true}
- If context is "Mahler Symphony No. 9" and user says "mvt 3" → {"composer": "Mahler", "work": "Symphony No. 9", "movement": "III", "version": null, "isComplete": true}
- If context is "Mahler Symphony No. 9" and user says "3" → {"composer": "Mahler", "work": "Symphony No. 9", "movement": "III", "version": null, "isComplete": true}
`;

    try {
      console.log('🌐 [OpenAIService] Sending request to OpenAI...');
      const startTime = Date.now();
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
      });

      const duration = Date.now() - startTime;
      console.log(`⚡ [OpenAIService] OpenAI response received in ${duration}ms`);
      console.log('📝 [OpenAIService] Raw response:', response.choices[0].message.content);

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content) as ParsedPiece;
      console.log('✅ [OpenAIService] Successfully parsed:', parsed);
      return parsed;
    } catch (error) {
      console.error('❌ [OpenAIService] Error parsing musical input:', error);
      console.log('🔄 [OpenAIService] Falling back to default response');
      
      // Fallback to a basic parse
      const fallback = {
        composer: 'Unknown',
        work: input,
        movement: undefined,
        version: undefined,
        isComplete: false
      };
      console.log('⚠️ [OpenAIService] Fallback response:', fallback);
      return fallback;
    }
  }
}

class AnthropicService implements AIService {
  async parseMusicalInput(input: string, conversationContext?: string): Promise<ParsedPiece> {
    // Placeholder for Anthropic API integration
    // You would implement this with the @anthropic-ai/sdk package
    throw new Error('Anthropic service not implemented yet');
  }
}

class GoogleAIService implements AIService {
  async parseMusicalInput(input: string, conversationContext?: string): Promise<ParsedPiece> {
    // Placeholder for Google AI API integration
    // You would implement this with the @google-ai/generativelanguage package
    throw new Error('Google AI service not implemented yet');
  }
}

// Factory function to create the appropriate AI service
export function createAIService(): AIService {
  const service = process.env.AI_SERVICE || 'openai';
  
  switch (service) {
    case 'openai':
      return new OpenAIService();
    case 'anthropic':
      return new AnthropicService();
    case 'google':
      return new GoogleAIService();
    default:
      throw new Error(`Unsupported AI service: ${service}`);
  }
}

// Main function to be used by the app
export async function parseMusicalInput(input: string, conversationContext?: string): Promise<ParsedPiece> {
  const aiService = createAIService();
  return await aiService.parseMusicalInput(input, conversationContext);
}