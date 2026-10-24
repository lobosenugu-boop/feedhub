import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GEMINI_MODEL = 'gemini-3.8-flash';

async function transcriptViaGemini(videoId: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            fileData: {
              fileUri: `https://www.youtube.com/watch?v=${videoId}`,
              mimeType: 'video/*',
            },
          },
          {
            text: 'Generate a complete word-for-word transcript of this video. Output only the spoken transcript text, no headers, timestamps, or labels.',
          },
        ],
      }],
      generationConfig: { maxOutputTokens: 8192 },
    }),
  });

  if (!resp.ok) return null;
  const data = await resp.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text && text.length >= 50 ? text : null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('videoId');
  if (!videoId) return NextResponse.json({ v: 'gemini-v1', error: 'Missing videoId' }, { status: 400 });

  try {
    const transcript = await transcriptViaGemini(videoId);
    if (!transcript) {
      return NextResponse.json({ transcript: null, error: 'disabled' });
    }
    return NextResponse.json({ transcript, source: 'captions' });
  } catch {
    return NextResponse.json({ transcript: null, error: 'disabled' });
  }
}
