import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const log: Record<string, unknown> = {};
  
  try {
    const resp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
      },
      body: JSON.stringify({
        context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38' } },
        videoId: 'arj7oStGLkU',
      }),
    });
    log.innertubeStatus = resp.status;
    log.innertubeOk = resp.ok;
    
    if (resp.ok) {
      const data = await resp.json();
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
      log.tracksCount = tracks.length;
      
      if (tracks.length > 0) {
        const enTrack = tracks.find((t: {languageCode: string; kind?: string}) => t.languageCode === 'en') || tracks[0];
        log.pickedLang = enTrack?.languageCode;
        log.urlStart = enTrack?.baseUrl?.slice(0, 80);
        
        const xmlResp = await fetch(enTrack.baseUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
        });
        log.xmlStatus = xmlResp.status;
        log.xmlContentType = xmlResp.headers.get('content-type');
        const xml = await xmlResp.text();
        log.xmlLength = xml.length;
        log.xmlSample = xml.slice(0, 200);
      }
    }
  } catch (e: unknown) {
    log.error = e instanceof Error ? e.message : String(e);
  }
  
  return NextResponse.json(log);
}
