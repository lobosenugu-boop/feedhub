import { NextRequest, NextResponse } from 'next/server';

const YT_KEY = process.env.YOUTUBE_API_KEY;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get('channelId');
  const substackSlug = searchParams.get('substackSlug');
  const sort = searchParams.get('sort') || 'top'; // 'top' | 'latest'

  // ── YouTube ──────────────────────────────────────────────────────────────
  if (channelId) {
    if (!YT_KEY) return NextResponse.json({ error: 'YOUTUBE_API_KEY not set' }, { status: 503 });

    const order = sort === 'latest' ? 'date' : 'viewCount';
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=${order}&type=video&maxResults=12&key=${YT_KEY}`
    );
    if (!res.ok) return NextResponse.json({ error: 'YouTube API error' }, { status: 500 });
    const data = await res.json();

    const videoIds = (data.items || []).map((i: { id: { videoId: string } }) => i.id.videoId).join(',');

    // Fetch view counts
    let viewMap: Record<string, string> = {};
    if (videoIds) {
      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${YT_KEY}`
      );
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        for (const v of statsData.items || []) {
          const views = parseInt(v.statistics.viewCount || '0');
          viewMap[v.id] =
            views >= 1_000_000 ? `${(views / 1_000_000).toFixed(1)}M views`
            : views >= 1_000 ? `${(views / 1_000).toFixed(0)}K views`
            : `${views} views`;
        }
      }
    }

    const videos = (data.items || []).map((item: {
      id: { videoId: string };
      snippet: { title: string; description: string; thumbnails: { medium?: { url: string }; default?: { url: string } }; publishedAt: string };
    }) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      description: item.snippet.description?.slice(0, 120),
      publishedAt: item.snippet.publishedAt,
      views: viewMap[item.id.videoId] || '',
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    return NextResponse.json({ videos });
  }

  // ── Substack ─────────────────────────────────────────────────────────────
  if (substackSlug) {
    try {
      const rssUrl = `https://${substackSlug}.substack.com/feed`;
      const res = await fetch(rssUrl, { headers: { 'User-Agent': 'FeedHub/1.0' } });
      if (!res.ok) return NextResponse.json({ videos: [] });
      const xml = await res.text();

      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
        const block = m[1];
        const title = block.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/)?.[1]
          || block.match(/<title>([^<]+)<\/title>/)?.[1] || '';
        const link = block.match(/<link>([^<]+)<\/link>/)?.[1]
          || block.match(/<guid[^>]*>([^<]+)<\/guid>/)?.[1] || '';
        const pubDate = block.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] || '';
        const desc = block.match(/<description><!\[CDATA\[([^\]]+)\]\]><\/description>/)?.[1]
          || block.match(/<description>([^<]+)<\/description>/)?.[1] || '';
        const thumb = block.match(/<media:thumbnail[^>]+url="([^"]+)"/)?.[1]
          || block.match(/<enclosure[^>]+url="([^"]+)"/)?.[1] || '';

        return {
          id: link,
          title: title.trim(),
          url: link.trim(),
          thumbnail: thumb,
          description: desc.replace(/<[^>]+>/g, '').slice(0, 120).trim(),
          publishedAt: pubDate ? new Date(pubDate).toISOString() : '',
          views: '',
        };
      });

      return NextResponse.json({ videos: items.slice(0, 12) });
    } catch {
      return NextResponse.json({ videos: [] });
    }
  }

  return NextResponse.json({ error: 'Missing channelId or substackSlug' }, { status: 400 });
}
