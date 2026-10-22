import { NextRequest, NextResponse } from 'next/server';
import { Post, Category } from '@/lib/types';

const YT_KEY = process.env.YOUTUBE_API_KEY;
const BASE = 'https://www.googleapis.com/youtube/v3';

// YouTube category IDs for the trending chart
const YT_CATEGORY_IDS: Partial<Record<Category, string>> = {
  technology: '28',   // Science & Technology
  ai: '28',
  business: '22',     // People & Blogs (closest to business)
  marketing: '22',
  productivity: '27', // Education
  selfimprovement: '27',
  psychology: '27',
};

// Search terms for category-specific viral search
const VIRAL_QUERIES: Record<Category, string> = {
  all: '',
  technology: 'tech viral 2025',
  ai: 'AI artificial intelligence viral',
  business: 'business entrepreneur viral',
  marketing: 'marketing viral content strategy',
  productivity: 'productivity tips viral',
  selfimprovement: 'self improvement mindset viral',
  psychology: 'psychology behavior viral',
};

function formatViews(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

async function fetchTrending(categoryId: string | undefined, limit: number): Promise<Post[]> {
  const params = new URLSearchParams({
    part: 'snippet,statistics',
    chart: 'mostPopular',
    regionCode: 'US',
    maxResults: String(limit),
    key: YT_KEY!,
  });
  if (categoryId) params.set('videoCategoryId', categoryId);

  const res = await fetch(`${BASE}/videos?${params}`, { next: { revalidate: 1800 } });
  const data = await res.json();

  if (data.error) throw new Error(data.error.message);

  return (data.items || []).map((item: Record<string, unknown>) => {
    const snippet = item.snippet as Record<string, unknown>;
    const stats = item.statistics as Record<string, string>;
    const thumbs = snippet.thumbnails as Record<string, { url: string }>;
    const views = Number(stats?.viewCount || 0);

    return {
      id: `yt-${item.id}`,
      title: String(snippet.title || ''),
      excerpt: String(snippet.description || '').slice(0, 280),
      author: String(snippet.channelTitle || ''),
      source: 'youtube',
      platform: 'YouTube',
      url: `https://www.youtube.com/watch?v=${item.id}`,
      thumbnail: thumbs?.maxres?.url || thumbs?.high?.url || thumbs?.medium?.url,
      publishedAt: String(snippet.publishedAt || new Date().toISOString()),
      score: Number(stats?.likeCount || 0),
      views,
      comments: Number(stats?.commentCount || 0),
      tags: ['youtube', 'trending'],
      category: 'all',
      videoId: String(item.id),
      trending: true,
    } as Post;
  });
}

async function fetchViralSearch(query: string, limit: number): Promise<Post[]> {
  // Search by viewCount for category-specific viral content
  const searchParams = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    order: 'viewCount',
    maxResults: String(limit),
    relevanceLanguage: 'en',
    publishedAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // last 30 days
    key: YT_KEY!,
  });

  const searchRes = await fetch(`${BASE}/search?${searchParams}`, { next: { revalidate: 1800 } });
  const searchData = await searchRes.json();
  if (searchData.error) throw new Error(searchData.error.message);

  const items: Record<string, unknown>[] = searchData.items || [];
  const videoIds = items.map((i) => (i.id as Record<string, string>).videoId).filter(Boolean);
  if (!videoIds.length) return [];

  // Fetch stats
  const statsRes = await fetch(
    `${BASE}/videos?part=snippet,statistics&id=${videoIds.join(',')}&key=${YT_KEY}`,
    { next: { revalidate: 1800 } }
  );
  const statsData = await statsRes.json();

  return (statsData.items || []).map((item: Record<string, unknown>) => {
    const snippet = item.snippet as Record<string, unknown>;
    const stats = item.statistics as Record<string, string>;
    const thumbs = snippet.thumbnails as Record<string, { url: string }>;
    const views = Number(stats?.viewCount || 0);

    return {
      id: `yt-${item.id}`,
      title: String(snippet.title || ''),
      excerpt: String(snippet.description || '').slice(0, 280),
      author: String(snippet.channelTitle || ''),
      source: 'youtube',
      platform: 'YouTube',
      url: `https://www.youtube.com/watch?v=${item.id}`,
      thumbnail: thumbs?.maxres?.url || thumbs?.high?.url || thumbs?.medium?.url,
      publishedAt: String(snippet.publishedAt || new Date().toISOString()),
      score: Number(stats?.likeCount || 0),
      views,
      comments: Number(stats?.commentCount || 0),
      tags: ['youtube', 'viral'],
      category: 'all',
      videoId: String(item.id),
      trending: views > 500_000,
    } as Post;
  });
}

export async function GET(req: NextRequest) {
  if (!YT_KEY) {
    return NextResponse.json({ posts: [], missingKey: true });
  }

  const { searchParams } = new URL(req.url);
  const category = (searchParams.get('category') || 'all') as Category;
  const limit = Math.min(Number(searchParams.get('limit') || 24), 50);

  try {
    let posts: Post[];

    if (category === 'all') {
      // Use actual YouTube trending chart
      posts = await fetchTrending(undefined, limit);
    } else {
      const categoryId = YT_CATEGORY_IDS[category];
      const query = VIRAL_QUERIES[category];

      // Mix: half from trending chart (filtered by category), half from viral search
      const [trending, viral] = await Promise.allSettled([
        categoryId ? fetchTrending(categoryId, Math.ceil(limit / 2)) : Promise.resolve([]),
        query ? fetchViralSearch(query, Math.ceil(limit / 2)) : Promise.resolve([]),
      ]);

      posts = [
        ...(trending.status === 'fulfilled' ? trending.value : []),
        ...(viral.status === 'fulfilled' ? viral.value : []),
      ];
    }

    // Sort by views descending
    posts.sort((a, b) => (b.views || 0) - (a.views || 0));

    // Add formatted view count to excerpt prefix for display
    posts = posts.map((p) => ({
      ...p,
      excerpt: p.views
        ? `${formatViews(p.views)} views · ${p.excerpt || ''}`
        : p.excerpt,
    }));

    return NextResponse.json({ posts: posts.slice(0, limit) });
  } catch (err) {
    return NextResponse.json(
      { posts: [], error: err instanceof Error ? err.message : 'YouTube fetch failed' }
    );
  }
}
