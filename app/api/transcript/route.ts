import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const INNERTUBE_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
const CLIENT_VERSION = '20.10.38';

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string;
  name?: { simpleText?: string };
}

async function getCaptonTracks(videoId: string): Promise<CaptionTrack[]> {
  const resp = await fetch(INNERTUBE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': `com.google.android.youtube/${CLIENT_VERSION} (Linux; U; Android 14)`,
    },
    body: JSON.stringify({
      context: { client: { clientName: 'ANDROID', clientVersion: CLIENT_VERSION } },
      videoId,
    }),
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
}

function pickTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  // prefer auto-generated English, then manual English, then any English, then first
  const order = [
    (t: CaptionTrack) => t.languageCode === 'en' && t.kind === 'asr',
    (t: CaptionTrack) => t.languageCode === 'en',
    (t: CaptionTrack) => t.languageCode?.startsWith('en'),
  ];
  for (const test of order) {
    const found = tracks.find(test);
    if (found) return found;
  }
  return tracks[0] ?? null;
}

function decodeHtml(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\n/g, ' ');
}

function parseXml(xml: string): string {
  // Strip all XML tags and decode HTML entities
  return decodeHtml(xml.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('videoId');
  const debug = searchParams.get('debug') === '1';
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

  try {
    let innertubeStatus = 0;
    const tracks = await (async () => {
      const resp = await fetch(INNERTUBE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `com.google.android.youtube/${CLIENT_VERSION} (Linux; U; Android 14)`,
        },
        body: JSON.stringify({
          context: { client: { clientName: 'ANDROID', clientVersion: CLIENT_VERSION } },
          videoId,
        }),
      });
      innertubeStatus = resp.status;
      if (!resp.ok) return [];
      const data = await resp.json();
      return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [] as CaptionTrack[];
    })();

    if (!tracks.length) {
      return NextResponse.json({ transcript: null, error: 'disabled', _d: debug ? { innertubeStatus, tracksCount: 0 } : undefined });
    }

    const track = pickTrack(tracks);
    if (!track) return NextResponse.json({ transcript: null, error: 'disabled' });

    const xmlResp = await fetch(track.baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!xmlResp.ok) {
      return NextResponse.json({ transcript: null, error: 'disabled', _d: debug ? { innertubeStatus, xmlStatus: xmlResp.status } : undefined });
    }

    const xml = await xmlResp.text();
    const transcript = parseXml(xml);

    if (debug) {
      return NextResponse.json({ transcript: transcript.slice(0, 200), xmlLength: xml.length, transcriptLength: transcript.length, tracksCount: tracks.length, innertubeStatus, xmlStatus: xmlResp.status, xmlContentType: xmlResp.headers.get('content-type') });
    }

    if (transcript.length < 50) {
      return NextResponse.json({ transcript: null, error: 'disabled' });
    }

    return NextResponse.json({ transcript, source: 'captions' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ transcript: null, error: 'disabled', _d: debug ? { caught: msg } : undefined });
  }
}
