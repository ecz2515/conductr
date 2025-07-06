import { NextRequest, NextResponse } from 'next/server';
import { parseMusicalInput } from '@/lib/aiService';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('🎯 [API/parse-music] Received request');
  
  try {
    const body = await req.json();
    console.log('📥 [API/parse-music] Request body:', body);
    const { input, conversationContext } = body;

    if (!input || typeof input !== 'string') {
      console.log('❌ [API/parse-music] Invalid input:', { input, type: typeof input });
      return NextResponse.json(
        { error: 'Input is required and must be a string' },
        { status: 400 }
      );
    }

    console.log('🤖 [API/parse-music] Calling AI service with input:', input);
    console.log('🤖 [API/parse-music] Conversation context:', conversationContext);
    const parsedPiece = await parseMusicalInput(input, conversationContext);
    console.log('📊 [API/parse-music] AI service result:', parsedPiece);

    const duration = Date.now() - startTime;
    console.log(`✅ [API/parse-music] Request completed in ${duration}ms`);
    
    return NextResponse.json(parsedPiece);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [API/parse-music] Error after ${duration}ms:`, error);
    return NextResponse.json(
      { error: 'Failed to parse musical input' },
      { status: 500 }
    );
  }
}