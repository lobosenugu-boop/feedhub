import { NextRequest, NextResponse } from 'next/server';

function decodeEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function extractMeta(html: string, ...props: string[]): string {
  for (const prop of props) {
    const patterns = [
      new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]*)"`, 'i'),
      new RegExp(`<meta[^>]+content="([^"]*)"[^>]+property="${prop}"`, 'i'),
      new RegExp(`<meta[^>]+name="${prop}"[^>]+content="([^"]*)"`, 'i'),
      new RegExp(`<meta[^>]+content="([^"]*)"[^>]+name="${prop}"`, 'i'),
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]?.trim()) return m[1].trim();
    }
  }
  return '';
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url')?.trim();
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  // YouTube — use oEmbed (no API key needed)
  const videoId = extractYouTubeId(url);
  if (videoId) {
    try {
      const oembed = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FeedHub)' } }
      );
      if (oembed.ok) {
        const data = await oembed.json();
        return NextResponse.json({
          title: data.title || '',
          description: `By ${data.author_name}`,
          image: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          author: data.author_name || 'YouTube',
          platform: 'YouTube',
          source: 'youtube',
          videoId,
        });
      }
    } catch { /* fall through */ }
  }

  // Generic OG / meta scrape (works for Substack posts, any blog, etc.)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FeedHub/1.0; +RSS reader)',
        Accept: 'text/html',
      },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const title =
      extractMeta(html, 'og:title', 'twitter:title') ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
      '';

    const description = extractMeta(
      html,
      'og:description',
      'twitter:description',
      'description'
    ).slice(0, 280);

    const image = extractMeta(html, 'og:image', 'twitter:image', 'twitter:image:src');
    const siteName =
      extractMeta(html, 'og:site_name') ||
      extractMeta(html, 'application-name') ||
      new URL(url).hostname.replace(/^www\./, '');

    const author =
      extractMeta(html, 'article:author', 'author', 'twitter:creator') || siteName;

    const isSubstack =
      url.includes('substack.com') ||
      html.includes('substackcdn.com') ||
      html.includes('substack-post-media');

    const cleanTitle = decodeEntities(title.replace(/\s+/g, ' ').trim());
    const cleanAuthor = decodeEntities(author.replace(/^@/, ''));
    const platform = isSubstack ? 'Substack' : siteName;

    return NextResponse.json({
      title: cleanTitle,
      description,
      image: image || undefined,
      author: cleanAuthor === platform ? '' : cleanAuthor,
      platform,
      source: isSubstack ? 'rss' : 'manual',
      videoId: null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not fetch URL' },
      { status: 422 }
    );
  }
}
