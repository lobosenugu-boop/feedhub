import { NextRequest, NextResponse } from 'next/server';
import { Post } from '@/lib/types';

const HN_BASE = 'https://hacker-news.firebaseio.com/v0';

async function fetchHN(limit: number): Promise<Post[]> {
  try {
    const res = await fetch(`${HN_BASE}/topstories.json`, { next: { revalidate: 300 } });
    const ids: number[] = await res.json();
    const top = ids.slice(0, limit * 3);

    const stories = await Promise.allSettled(
      top.map((id) =>
        fetch(`${HN_BASE}/item/${id}.json`, { next: { revalidate: 300 } }).then((r) => r.json())
      )
    );

    return stories
      .filter(
        (s): s is PromiseFulfilledResult<Record<string, unknown>> =>
          s.status === 'fulfilled' && s.value?.type === 'story' && !!s.value?.url
      )
      .slice(0, limit)
      .map((s) => {
        const item = s.value;
        return {
          id: `hn-${item.id}`,
          title: String(item.title || ''),
          author: String(item.by || 'anonymous'),
          source: 'hackernews',
          platform: 'Hacker News',
          url: String(item.url || `https://news.ycombinator.com/item?id=${item.id}`),
          publishedAt: new Date((Number(item.time) || 0) * 1000).toISOString(),
          score: Number(item.score) || 0,
          comments: Number(item.descendants) || 0,
          tags: ['technology'],
          category: 'technology',
          trending: Number(item.score) > 500,
        } as Post;
      });
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit') || 30), 60);

  const posts = await fetchHN(limit);
  posts.sort((a, b) => (b.score || 0) - (a.score || 0));

  return NextResponse.json({ posts });
}
