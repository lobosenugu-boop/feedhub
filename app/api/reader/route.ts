import { NextRequest, NextResponse } from 'next/server';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/json',
  'Accept-Language': 'en-US,en;q=0.9',
};

function attr(html: string, tag: string, prop: string, value: string, capture: string): string {
  const re = new RegExp(`<${tag}[^>]+${prop}=["']${value}["'][^>]+${capture}=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`<${tag}[^>]+${capture}=["']([^"']+)["'][^>]+${prop}=["']${value}["']`, 'i');
  return (html.match(re) || html.match(re2))?.[1]?.trim() || '';
}

function stripTags(html: string, ...tags: string[]): string {
  let out = html;
  for (const t of tags) out = out.replace(new RegExp(`<${t}[\\s\\S]*?<\\/${t}>`, 'gi'), '');
  return out;
}

function cleanHtml(raw: string, baseUrl: string): string {
  let html = stripTags(raw, 'script', 'style', 'nav', 'header', 'footer', 'iframe', 'form', 'button', 'aside');
  html = html.replace(/\s(on\w+|style|class|id|data-\w+)="[^"]*"/gi, '');
  try {
    const base = new URL(baseUrl);
    html = html.replace(/(<img[^>]+src=")(\/?[^"http][^"]*")/gi, (_, p, s) => {
      try { return p + new URL(s.replace(/"/g, ''), base).href + '"'; } catch { return p + s; }
    });
    html = html.replace(/(<a[^>]+href=")(\/?[^"http#][^"]*")/gi, (_, p, h) => {
      try { return p + new URL(h.replace(/"/g, ''), base).href + '" target="_blank" rel="noopener"'; } catch { return p + h; }
    });
  } catch { /* skip */ }
  html = html.replace(/<a([^>]+href="https?:\/\/[^"]*")/gi, '<a$1 target="_blank" rel="noopener"');
  return html.replace(/\n{3,}/g, '\n\n').trim();
}

function htmlToText(html: string): string {
  return html
    .replace(/<\/?(h[1-6]|p|div|section|article|li|blockquote)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function extractFromHtml(html: string): string {
  const selectors = [
    /<article[^>]*>([\s\S]+?)<\/article>/i,
    /<div[^>]+id="article-body"[^>]*>([\s\S]+?)<\/div>\s*<\/div>/i,
    /<div[^>]+class="[^"]*(?:entry-content|post-body|article-content|content-body|prose|richtext)[^"]*"[^>]*>([\s\S]+?)<\/div>\s*(?:<div|<\/)/i,
    /<main[^>]*>([\s\S]+?)<\/main>/i,
  ];
  for (const sel of selectors) {
    const m = html.match(sel);
    if (m && m[1] && m[1].trim().length > 200) return m[1];
  }
  // Fallback: largest div after stripping chrome
  const stripped = html.replace(/<(nav|header|footer|aside|script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '');
  const blocks = [...stripped.matchAll(/<div[^>]*>([\s\S]{400,}?)<\/div>/gi)]
    .map(m => m[1] ?? '')
    .filter(t => t.length > 400);
  if (blocks.length > 0) {
    const longest = blocks.reduce((a, b) => b.length > a.length ? b : a);
    if (longest.trim().length > 400) return longest;
  }
  return '';
}

// ─── Substack via their JSON API ──────────────────────────────────────────────
async function trySubstackApi(url: string): Promise<{ content: string; title: string; author: string; coverImage: string; description: string } | null> {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname; // e.g. aaronparnas.substack.com

    // Specific post: /p/<slug>
    const postSlug = parsed.pathname.match(/^\/p\/([^/?#]+)/)?.[1];
    if (postSlug) {
      const apiUrl = `https://${hostname}/api/v1/posts/${postSlug}`;
      const res = await fetch(apiUrl, { headers: FETCH_HEADERS });
      if (res.ok) {
        const post = await res.json();
        const bodyHtml: string = post.body_html || post.truncated_body_text || '';
        if (bodyHtml.length > 100) {
          return {
            title: post.title || '',
            author: post.publishedBylines?.[0]?.name || post.author?.name || '',
            coverImage: post.cover_image || post.social_image || '',
            description: post.description || post.subtitle || '',
            content: htmlToText(bodyHtml),
          };
        }
      }
    }

    // Homepage / profile — fetch recent posts feed
    const feedUrl = `https://${hostname}/api/v1/posts?limit=1`;
    const feedRes = await fetch(feedUrl, { headers: FETCH_HEADERS });
    if (feedRes.ok) {
      const data = await feedRes.json();
      const latest = Array.isArray(data) ? data[0] : data?.posts?.[0];
      if (latest?.body_html) {
        return {
          title: latest.title || '',
          author: latest.publishedBylines?.[0]?.name || '',
          coverImage: latest.cover_image || '',
          description: latest.subtitle || '',
          content: htmlToText(latest.body_html),
        };
      }
    }
  } catch { /* fall through */ }
  return null;
}

// ─── __NEXT_DATA__ extraction (Substack, Vercel apps, etc.) ───────────────────
function tryNextData(html: string): string {
  const m = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/i);
  if (!m) return '';
  try {
    const data = JSON.parse(m[1]);
    const post = data?.props?.pageProps?.post ?? data?.props?.pageProps?.article;
    const bodyHtml: string = post?.body_html || post?.body || '';
    if (bodyHtml.length > 100) return htmlToText(bodyHtml);
  } catch { /* ignore */ }
  return '';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url')?.trim();
  const videoId = searchParams.get('videoId');

  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  if (videoId) {
    return NextResponse.json({ type: 'youtube', videoId, embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0` });
  }

  try {
    const parsedUrl = new URL(url);
    const isSubstack = parsedUrl.hostname.endsWith('.substack.com');

    // ── 1. Substack: use their JSON API first ──
    if (isSubstack) {
      const sub = await trySubstackApi(url);
      if (sub && sub.content.length > 100) {
        return NextResponse.json({
          type: 'article',
          title: sub.title,
          author: sub.author,
          coverImage: sub.coverImage,
          description: sub.description,
          content: sub.content,
          hasFullContent: true,
        });
      }
    }

    // ── 2. Fetch raw HTML ──
    const res = await fetch(url, { headers: FETCH_HEADERS, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const title =
      attr(html, 'meta', 'property', 'og:title', 'content') ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '';
    const coverImage =
      attr(html, 'meta', 'property', 'og:image', 'content') ||
      attr(html, 'meta', 'name', 'twitter:image', 'content') || '';
    const author =
      attr(html, 'meta', 'name', 'author', 'content') ||
      attr(html, 'meta', 'property', 'article:author', 'content') || '';
    const description =
      attr(html, 'meta', 'property', 'og:description', 'content') ||
      attr(html, 'meta', 'name', 'description', 'content') || '';

    // ── 3. Try __NEXT_DATA__ (JS-rendered sites) ──
    let content = tryNextData(html);

    // ── 4. Fall back to HTML regex extraction ──
    if (!content) {
      const rawHtml = extractFromHtml(html);
      content = rawHtml ? htmlToText(cleanHtml(rawHtml, url)) : '';
    }

    return NextResponse.json({
      type: 'article',
      title: title.replace(/\s+/g, ' ').trim(),
      author,
      coverImage,
      description,
      content,
      hasFullContent: content.length > 100,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not fetch article' },
      { status: 422 }
    );
  }
}
