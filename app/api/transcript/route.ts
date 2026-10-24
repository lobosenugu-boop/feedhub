import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const INNERTUBE_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
const CLIENT_VERSION = '20.10.38';
const UA = `com.google.android.youtube/${CLIENT_VERSION} (Linux; U; Android 14)`;

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string;
}

async function innertubePost(videoId: string, visitorData?: string) {
  const context = {
    client: {
      clientName: 'ANDROID',
      clientVersion: CLIENT_VERSION,
      hl: 'en',
      gl: 'US',
      ...(visitorData ? { visitorData } : {}),
    },
  };
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': UA,
  };
  if (visitorData) headers['X-Goog-Visitor-Id'] = visitorData;

  const resp = await fetch(INNERTUBE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ context, videoId }),
  });
  if (!resp.ok) return { tracks: [], visitorData: undefined };
  const data = await resp.json();
  return {
    tracks: (data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []) as CaptionTrack[],
    visitorData: data?.responseContext?.visitorData as string | undefined,
  };
}

async function getCaptionTracks(videoId: string): Promise<{ tracks: CaptionTrack[]; visitorData?: string }> {
  // First call — gets visitorData even if tracks are empty (cloud IP restriction)
  const first = await innertubePost(videoId);
  if (first.tracks.length > 0) return first;

  // Second call with visitorData — sometimes unlocks tracks on restricted IPs
  if (first.visitorData) {
    const second = await innertubePost(videoId, first.visitorData);
    if (second.tracks.length > 0) return second;
  }
  return first;
}

function pickTrack(tracks: CaptionTrack[]): CaptionTrack | null {
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
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n/g, ' ');
}

function parseXml(xml: string): string {
  return decodeHtml(xml.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('videoId');
  const debug = searchParams.get('debug') === '1';
  if (!videoId) return NextResponse.json({ v: 'edge-v3', error: 'Missing videoId' }, { status: 400 });

  try {
    const { tracks, visitorData } = await getCaptionTracks(videoId);

    if (!tracks.length) {
      return NextResponse.json({
        transcript: null,
        error: 'disabled',
        _d: debug ? { tracksCount: 0, hasVisitorData: !!visitorData } : undefined,
      });
    }

    const track = pickTrack(tracks);
    if (!track) return NextResponse.json({ transcript: null, error: 'disabled' });

    const xmlResp = await fetch(track.baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!xmlResp.ok) {
      return NextResponse.json({
        transcript: null,
        error: 'disabled',
        _d: debug ? { tracksCount: tracks.length, xmlStatus: xmlResp.status } : undefined,
      });
    }

    const xml = await xmlResp.text();
    const transcript = parseXml(xml);

    if (debug) {
      return NextResponse.json({
        v: 'edge-v3',
        transcript: transcript.slice(0, 200),
        xmlLength: xml.length,
        transcriptLength: transcript.length,
        tracksCount: tracks.length,
        xmlStatus: xmlResp.status,
        hasVisitorData: !!visitorData,
      });
    }

    if (transcript.length < 50) {
      return NextResponse.json({ transcript: null, error: 'disabled' });
    }

    return NextResponse.json({ transcript, source: 'captions' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      transcript: null,
      error: 'disabled',
      _d: debug ? { caught: msg } : undefined,
    });
  }
}
