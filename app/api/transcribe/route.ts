import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY not set in .env.local.' },
      { status: 503 }
    );
  }

  const groq = new Groq({ apiKey });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  // Groq Whisper limit is 25 MB
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File too large. Please use a clip under 25 MB (roughly 15–20 minutes of audio).' },
      { status: 413 }
    );
  }

  try {
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3-turbo',
      response_format: 'text',
    });

    return NextResponse.json({ transcript: transcription });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Transcription failed' },
      { status: 500 }
    );
  }
}
