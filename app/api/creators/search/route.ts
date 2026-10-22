import { NextRequest, NextResponse } from 'next/server';

const YT_KEY = process.env.YOUTUBE_API_KEY;

interface CreatorResult {
  id: string;
  platform: 'youtube' | 'substack' | 'x';
  name: string;
  handle: string;
  avatar?: string;
  subscribers?: string;
  description?: string;
}

async function searchYouTube(q: string): Promise<CreatorResult[]> {
  if (!YT_KEY) return [];

  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(q)}&maxResults=8&key=${YT_KEY}`
  );
  if (!searchRes.ok) return [];
  const searchData = await searchRes.json();

  const channelIds = (searchData.items || []).map((i: { id: { channelId: string } }) => i.id.channelId).join(',');
  if (!channelIds) return [];

  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds}&key=${YT_KEY}`
  );
  if (!statsRes.ok) return [];
  const statsData = await statsRes.json();

  return (statsData.items || []).map((ch: {
    id: string;
    snippet: { title: string; customUrl?: string; description: string; thumbnails: { default?: { url: string }; medium?: { url: string } } };
    statistics: { subscriberCount?: string };
  }) => {
    const subs = parseInt(ch.statistics.subscriberCount || '0');
    const subsLabel =
      subs >= 1_000_000 ? `${(subs / 1_000_000).toFixed(1)}M`
      : subs >= 1_000 ? `${(subs / 1_000).toFixed(1)}K`
      : String(subs);

    return {
      id: ch.id,
      platform: 'youtube' as const,
      name: ch.snippet.title,
      handle: ch.snippet.customUrl || ch.id,
      avatar: ch.snippet.thumbnails.medium?.url || ch.snippet.thumbnails.default?.url,
      subscribers: subsLabel,
      description: ch.snippet.description?.slice(0, 160),
    };
  });
}

async function searchSubstack(q: string): Promise<CreatorResult[]> {
  // Substack has no public search API — try the user's URL as a direct lookup
  const slug = q.toLowerCase().replace(/\s+/g, '').replace(/https?:\/\/(www\.)?/, '').replace(/\.substack\.com.*/, '');
  const rssUrl = `https://${slug}.substack.com/feed`;

  try {
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'FeedHub/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const title = xml.match(/<title>([^<]+)<\/title>/)?.[1]?.trim() || slug;
    const desc = xml.match(/<description>([^<]+)<\/description>/)?.[1]?.trim() || '';
    const image = xml.match(/<url>([^<]+)<\/url>/)?.[1]?.trim();

    return [{
      id: `substack:${slug}`,
      platform: 'substack',
      name: title,
      handle: `${slug}.substack.com`,
      avatar: image,
      description: desc.slice(0, 160),
    }];
  } catch { return []; }
}

function resolveX(q: string): CreatorResult | null {
  const match = q.match(/(?:x\.com|twitter\.com)\/([A-Za-z0-9_]+)/i)
    || (!/\s/.test(q) && !q.includes('.') ? [null, q.replace(/^@/, '')] : null);
  if (!match?.[1]) return null;
  const handle = match[1];
  return {
    id: `x:${handle}`,
    platform: 'x',
    name: `@${handle}`,
    handle,
    description: 'X profile — posts require X API key to load.',
  };
}

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ results: [] });

  const isSubstackUrl = /substack\.com/i.test(q);
  const isXUrl = /x\.com|twitter\.com/i.test(q);
  const xResult = resolveX(q);

  const [youtube, substack] = await Promise.all([
    isSubstackUrl || isXUrl ? Promise.resolve([]) : searchYouTube(q),
    isXUrl ? Promise.resolve([]) : searchSubstack(q),
  ]);

  const results = [...youtube, ...substack];
  if (xResult) results.unshift(xResult);

  return NextResponse.json({ results });
}
