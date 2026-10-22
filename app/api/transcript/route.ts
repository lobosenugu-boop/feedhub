import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('videoId');
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    const transcript = segments
      .map((s) => s.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!transcript || transcript.length < 50) {
      return NextResponse.json({ transcript: null, error: 'No transcript available' });
    }
    return NextResponse.json({ transcript, source: 'captions' });
  } catch (e) {
    return NextResponse.json({ transcript: null, error: e instanceof Error ? e.message : 'No transcript available' });
  }
}
