import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

export const maxDuration = 30;

// Try transcript with multiple language fallbacks
async function fetchWithFallbacks(videoId: string): Promise<string | null> {
  const langOptions = [
    undefined,          // default (whatever YouTube picks)
    [{ lang: 'en' }],
    [{ lang: 'en-US' }],
    [{ lang: 'en-GB' }],
    [{ lang: 'a.en' }], // auto-generated English
  ];

  for (const opts of langOptions) {
    try {
      const segments = await YoutubeTranscript.fetchTranscript(videoId, opts as Parameters<typeof YoutubeTranscript.fetchTranscript>[1]);
      const text = segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
      if (text.length >= 50) return text;
    } catch {
      // try next option
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('videoId');
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

  const transcript = await fetchWithFallbacks(videoId);

  if (!transcript) {
    return NextResponse.json({
      transcript: null,
      error: 'disabled', // channel has disabled captions
    });
  }

  return NextResponse.json({ transcript, source: 'captions' });
}
