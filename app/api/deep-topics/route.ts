import { NextRequest, NextResponse } from 'next/server';

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 });

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ error: 'No YouTube API key' }, { status: 503 });

  // Bias toward educational/philosophical content, then sort by views ourselves
  const enrichedQuery = `${query} philosophy explained thinking`;
  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(enrichedQuery)}&maxResults=20&order=relevance&videoDuration=medium&relevanceLanguage=en&key=${key}`
  );
  const searchData = await searchRes.json();

  if (!searchData.items?.length) return NextResponse.json({ videos: [] });

  const videoIds = searchData.items
    .map((item: { id: { videoId: string } }) => item.id.videoId)
    .filter(Boolean)
    .join(',');

  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${key}`
  );
  const statsData = await statsRes.json();

  const statsMap: Record<string, { viewCount?: string }> = {};
  for (const v of statsData.items || []) {
    statsMap[v.id] = v.statistics;
  }

  const videos = searchData.items
    .map((item: {
      id: { videoId: string };
      snippet: {
        title: string;
        channelTitle: string;
        thumbnails: { medium: { url: string } };
        publishedAt: string;
      };
    }) => ({
      videoId: item.id.videoId,
      title: decodeHtml(item.snippet.title),
      channel: decodeHtml(item.snippet.channelTitle),
      thumbnail: item.snippet.thumbnails?.medium?.url,
      publishedAt: item.snippet.publishedAt,
      views: parseInt(statsMap[item.id.videoId]?.viewCount || '0'),
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }))
    // Sort by view count so the most popular relevant videos appear first
    .sort((a: { views: number }, b: { views: number }) => b.views - a.views)
    .filter((v: { views: number }) => v.views >= 1000)
    .slice(0, 20);

  return NextResponse.json({ videos });
}
