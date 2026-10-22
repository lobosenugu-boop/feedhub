import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { unlink, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import Groq from 'groq-sdk';

export const maxDuration = 120;

const execFileAsync = promisify(execFile);

const YT_DLP = '/usr/local/bin/yt-dlp';

export async function POST(req: NextRequest) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY not set in .env.local.' }, { status: 503 });
  }

  const { url } = await req.json();
  if (!url?.trim()) {
    return NextResponse.json({ error: 'No URL provided.' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  // Use mp4 — no ffmpeg conversion needed, Groq Whisper accepts it directly
  const outPath = join(tmpdir(), `feedhub-${id}.mp4`);

  try {
    // Download best available format without any post-processing (no ffmpeg needed)
    await execFileAsync(YT_DLP, [
      '--js-runtimes', 'node:/usr/local/bin/node',
      '-f', '91/92/93/bestaudio[ext=mp4]/bestaudio[ext=m4a]/best[ext=mp4]/best',
      '-o', outPath, '--no-playlist', '--no-part', url,
    ], { timeout: 90000 });

    // Read the file and send to Groq Whisper
    const audioBuffer = await readFile(outPath);
    const audioFile = new File([audioBuffer], 'audio.mp4', { type: 'video/mp4' });

    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Video too long. Try a clip under ~20 minutes.' },
        { status: 413 }
      );
    }

    const groq = new Groq({ apiKey: groqKey });
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      response_format: 'text',
    });

    // Grab title + thumbnail
    let title = '';
    let thumbnail = '';
    try {
      const { stdout } = await execFileAsync(YT_DLP, [
        '--js-runtimes', 'node:/usr/local/bin/node',
        '--print', '%(title)s\t%(thumbnail)s', '--no-playlist', url,
      ], { timeout: 15000 });
      const [t, th] = stdout.trim().split('\t');
      title = t || '';
      thumbnail = th || '';
    } catch { /* metadata is optional */ }

    return NextResponse.json({ transcript: transcription, title, thumbnail });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Extraction failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    unlink(outPath).catch(() => {});
  }
}
