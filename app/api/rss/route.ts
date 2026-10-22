import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { Post } from '@/lib/types';

const parser = new Parser({
  requestOptions: {
    rejectUnauthorized: false,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FeedHub/1.0; +RSS reader)' },
  },
  timeout: 10000,
});

// Convert any pasted URL into the most likely RSS feed URL
function normalizeFeedUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());

    // Strip UTM params and tracking noise
    url.search = '';
    url.hash = '';

    const host = url.hostname; // e.g. substack.com or foo.substack.com

    // substack.com/home/post/... or substack.com/p/... → not a feed URL
    // foo.substack.com/p/... → feed is foo.substack.com/feed
    if (host.includes('substack.com')) {
      const base = `${url.protocol}//${host}`;
      // Already a feed URL
      if (url.pathname === '/feed' || url.pathname === '/feed.xml') return `${base}/feed`;
      // Post or notes URL → strip to root + /feed
      return `${base}/feed`;
    }

    // medium.com/@author or medium.com/publication → feed is medium.com/feed/@author
    if (host === 'medium.com' || host.endsWith('.medium.com')) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0 && !url.pathname.startsWith('/feed')) {
        return `${url.protocol}//${host}/feed/${parts[0]}`;
      }
    }

    // beehiiv.com/subscribe or post URLs → newsletter.beehiiv.com/feed
    if (host.endsWith('beehiiv.com')) {
      return `${url.protocol}//${host}/feed`;
    }

    // Ghost blogs: site.com/p/post → site.com/rss/
    if (url.pathname.startsWith('/p/') || url.pathname.startsWith('/post/')) {
      return `${url.protocol}//${host}/rss/`;
    }

    // If URL already ends in /feed or /rss, use as-is
    if (
      url.pathname.endsWith('/feed') ||
      url.pathname.endsWith('/rss') ||
      url.pathname.endsWith('/feed.xml') ||
      url.pathname.endsWith('/rss.xml')
    ) {
      return url.toString();
    }

    // Generic fallback: try appending /feed
    if (url.pathname === '/' || url.pathname === '') {
      return `${url.protocol}//${host}/feed`;
    }

    return url.toString();
  } catch {
    return raw.trim();
  }
}

// Try a list of candidate feed URLs and return the first that parses
async function tryFeedUrls(candidates: string[]) {
  for (const url of candidates) {
    try {
      const feed = await parser.parseURL(url);
      if ((feed.items || []).length > 0) return { feed, url };
    } catch {
      // try next
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  const normalized = normalizeFeedUrl(rawUrl);

  // Build candidate list: normalized first, then common suffixes on the root
  const candidates = Array.from(
    new Set([
      normalized,
      rawUrl.trim(),
      // Also try root + common RSS paths
      ...['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml'].map((suffix) => {
        try {
          const u = new URL(rawUrl.trim());
          return `${u.protocol}//${u.hostname}${suffix}`;
        } catch {
          return '';
        }
      }),
    ])
  ).filter(Boolean);

  const result = await tryFeedUrls(candidates);

  if (!result) {
    const hint = rawUrl.includes('substack.com')
      ? "That looks like a Substack post link. Use your newsletter's homepage URL instead, e.g. https://yourname.substack.com"
      : "Couldn't find a valid RSS feed at that URL. Try the publication's homepage or look for a /feed or /rss link.";
    return NextResponse.json({ error: hint }, { status: 422 });
  }

  const { feed, url: resolvedUrl } = result;

  const posts: Post[] = (feed.items || []).slice(0, 20).map((item) => ({
    id: `rss-${Buffer.from(item.link || item.guid || item.title || '').toString('base64').slice(0, 16)}`,
    title: item.title || 'Untitled',
    excerpt: item.contentSnippet?.slice(0, 280) || item.summary?.slice(0, 280),
    author: item.creator || feed.title || 'Newsletter',
    source: 'rss',
    platform: feed.title || new URL(resolvedUrl).hostname,
    url: item.link || resolvedUrl,
    publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
    score: undefined,
    comments: undefined,
    tags: ['newsletter'],
    category: 'all',
  }));

  return NextResponse.json({ posts, feedTitle: feed.title });
}
