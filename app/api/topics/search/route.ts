import { NextRequest, NextResponse } from 'next/server';

const YT_KEY = process.env.YOUTUBE_API_KEY;

export interface TopicResult {
  id: string;
  platform: 'youtube' | 'reddit';
  title: string;
  url: string;
  thumbnail?: string;
  description?: string;
  author?: string;
  meta?: string;
  publishedAt?: string;
  videoId?: string;
}

async function searchYouTube(q: string): Promise<TopicResult[]> {
  if (!YT_KEY) return [];
  try {
    // Run two searches in parallel: relevance + viewCount
    const [relRes, viewRes] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=20&order=relevance&key=${YT_KEY}`),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=10&order=viewCount&key=${YT_KEY}`),
    ]);

    const [relData, viewData] = await Promise.all([
      relRes.ok ? relRes.json() : { items: [] },
      viewRes.ok ? viewRes.json() : { items: [] },
    ]);

    // Merge and deduplicate
    const seen = new Set<string>();
    const items: { id: { videoId: string }; snippet: { title: string; description: string; channelTitle: string; thumbnails: { medium?: { url: string } }; publishedAt: string } }[] = [];
    for (const item of [...(relData.items || []), ...(viewData.items || [])]) {
      if (!seen.has(item.id.videoId)) { seen.add(item.id.videoId); items.push(item); }
    }

    const videoIds = items.map((i) => i.id.videoId).join(',');
    let viewMap: Record<string, string> = {};
    if (videoIds) {
      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${YT_KEY}`
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

    return items.map((item) => ({
      id: item.id.videoId,
      platform: 'youtube' as const,
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail: item.snippet.thumbnails.medium?.url,
      description: item.snippet.description?.slice(0, 150),
      author: item.snippet.channelTitle,
      meta: viewMap[item.id.videoId] || '',
      publishedAt: item.snippet.publishedAt,
      videoId: item.id.videoId,
    }));
  } catch { return []; }
}

type RedditChild = {
  data: {
    id: string;
    title: string;
    url: string;
    permalink: string;
    thumbnail?: string;
    selftext?: string;
    author: string;
    subreddit_name_prefixed: string;
    score: number;
    created_utc: number;
    num_comments: number;
  };
};

function parseRedditChildren(children: RedditChild[]): TopicResult[] {
  return children
    .filter((c) => c.data.url)
    .map((child) => {
      const d = child.data;
      const score = d.score >= 1000 ? `${(d.score / 1000).toFixed(1)}K` : String(d.score);
      const thumb = d.thumbnail && !['self', 'default', 'nsfw', 'spoiler', ''].includes(d.thumbnail)
        ? d.thumbnail : undefined;
      return {
        id: d.id,
        platform: 'reddit' as const,
        title: d.title,
        url: `https://reddit.com${d.permalink}`,
        thumbnail: thumb,
        description: d.selftext?.slice(0, 150) || '',
        author: `u/${d.author}`,
        meta: `${score} upvotes · ${d.num_comments} comments · ${d.subreddit_name_prefixed}`,
        publishedAt: new Date(d.created_utc * 1000).toISOString(),
      };
    });
}

async function searchReddit(q: string): Promise<TopicResult[]> {
  try {
    const base = `https://www.reddit.com`;
    const headers = { 'User-Agent': 'FeedHub/1.0' };

    // Three parallel Reddit queries: top/year, top/month, new (for recency)
    const [topYear, topMonth, relevance] = await Promise.all([
      fetch(`${base}/search.json?q=${encodeURIComponent(q)}&sort=top&type=link&limit=15&t=year`, { headers }),
      fetch(`${base}/search.json?q=${encodeURIComponent(q)}&sort=top&type=link&limit=10&t=month`, { headers }),
      fetch(`${base}/search.json?q=${encodeURIComponent(q)}&sort=relevance&type=link&limit=10&t=all`, { headers }),
    ]);

    const [yearData, monthData, relevanceData] = await Promise.all([
      topYear.ok ? topYear.json() : { data: { children: [] } },
      topMonth.ok ? topMonth.json() : { data: { children: [] } },
      relevance.ok ? relevance.json() : { data: { children: [] } },
    ]);

    const allChildren: RedditChild[] = [
      ...(yearData?.data?.children || []),
      ...(monthData?.data?.children || []),
      ...(relevanceData?.data?.children || []),
    ];

    // Deduplicate by id
    const seen = new Set<string>();
    const unique = allChildren.filter((c) => {
      if (seen.has(c.data.id)) return false;
      seen.add(c.data.id);
      return true;
    });

    // Sort by score descending
    unique.sort((a, b) => b.data.score - a.data.score);

    return parseRedditChildren(unique);
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const platform = searchParams.get('platform') || 'all';

  if (!q) return NextResponse.json({ results: [] });

  const [youtube, reddit] = await Promise.all([
    platform !== 'reddit' ? searchYouTube(q) : Promise.resolve([]),
    platform !== 'youtube' ? searchReddit(q) : Promise.resolve([]),
  ]);

  if (platform === 'youtube') return NextResponse.json({ results: youtube });
  if (platform === 'reddit') return NextResponse.json({ results: reddit });

  // Interleave for 'all' — 2 YouTube then 1 Reddit pattern keeps variety
  const results: TopicResult[] = [];
  let yi = 0, ri = 0;
  while (yi < youtube.length || ri < reddit.length) {
    if (youtube[yi]) results.push(youtube[yi++]);
    if (youtube[yi]) results.push(youtube[yi++]);
    if (reddit[ri]) results.push(reddit[ri++]);
  }

  return NextResponse.json({ results });
}
