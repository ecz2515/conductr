import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level = 'info', message, data, timestamp = new Date().toISOString() } = body;

    // Log to Vercel's server-side logs
    const logMessage = `[CLIENT-${level.toUpperCase()}] ${timestamp}: ${message}`;
    
    if (level === 'error') {
      console.error(logMessage, data);
    } else if (level === 'warn') {
      console.warn(logMessage, data);
    } else {
      console.log(logMessage, data);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DEBUG-LOG-ERROR] Failed to process debug log:', error);
    return NextResponse.json({ success: false, error: 'Failed to process log' }, { status: 500 });
  }
}
