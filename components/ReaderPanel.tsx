'use client';

import { useState, useEffect } from 'react';
import { X, ExternalLink, Sparkles, ArrowLeft } from 'lucide-react';
import { Post } from '@/lib/types';

interface ReaderData {
  type: 'article' | 'youtube';
  title?: string;
  author?: string;
  coverImage?: string;
  description?: string;
  content?: string;
  hasFullContent?: boolean;
  videoId?: string;
  embedUrl?: string;
  error?: string;
}

interface ReaderPanelProps {
  post: Post & { videoId?: string };
  onClose: () => void;
  onAI: (post: Post) => void;
}

export default function ReaderPanel({ post, onClose, onAI }: ReaderPanelProps) {
  const [data, setData] = useState<ReaderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ url: post.url });
        if (post.videoId) params.set('videoId', post.videoId);
        const res = await fetch(`/api/reader?${params}`);
        const json = await res.json();
        setData(json);
      } catch {
        setData({ type: 'article', error: 'Could not load content.' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [post.url, post.videoId]);

  const isYouTube = post.videoId || post.source === 'youtube';

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#e5ded4] shrink-0">
          <button onClick={onClose} className="text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
            <ArrowLeft size={18} />
          </button>
          <span className="text-xs font-medium text-[#8a8a9a] truncate flex-1">{post.platform}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAI(post)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#e5ded4] text-[#1a1a2e] hover:border-[#ff6b35] hover:text-[#ff6b35] transition-colors"
            >
              <Sparkles size={12} />
              AI Tools
            </button>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-[#f5f0e8] text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors"
              title="Open original"
            >
              <ExternalLink size={15} />
            </a>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5f0e8] text-[#8a8a9a] hover:text-[#1a1a2e]">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-4 p-8 animate-pulse">
              <div className="h-48 bg-[#f5f0e8] rounded-xl" />
              <div className="h-6 bg-[#f5f0e8] rounded w-3/4" />
              <div className="h-4 bg-[#f5f0e8] rounded w-1/2" />
              <div className="space-y-2 mt-4">
                {[1, 0.9, 0.95, 0.7, 0.85, 0.6].map((w, i) => (
                  <div key={i} className="h-3.5 bg-[#f5f0e8] rounded" style={{ width: `${w * 100}%` }} />
                ))}
              </div>
            </div>
          ) : isYouTube && data?.embedUrl ? (
            <YouTubeReader post={post} data={data} />
          ) : data?.error ? (
            <ErrorState post={post} message={data.error} />
          ) : (
            <ArticleReader post={post} data={data} />
          )}
        </div>
      </div>
    </div>
  );
}

function YouTubeReader({ post, data }: { post: Post & { videoId?: string }; data: ReaderData }) {
  return (
    <div className="flex flex-col">
      {/* Embed */}
      <div className="w-full bg-black" style={{ aspectRatio: '16/9' }}>
        <iframe
          src={data.embedUrl}
          title={post.title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {/* Info */}
      <div className="p-6">
        <h1 className="text-lg font-bold text-[#1a1a2e] leading-snug mb-2">{post.title}</h1>
        <p className="text-sm text-[#8a8a9a] mb-4">by {post.author} · YouTube</p>
        {post.excerpt && (
          <p className="text-sm text-[#4a4a5a] leading-relaxed">{post.excerpt}</p>
        )}
        <div className="mt-6 pt-4 border-t border-[#e5ded4]">
          <p className="text-xs text-[#8a8a9a]">
            ✨ Use <strong>AI Tools</strong> above to get a transcript breakdown, LinkedIn post, or content analysis.
          </p>
        </div>
      </div>
    </div>
  );
}

function ArticleReader({ post, data }: { post: Post; data: ReaderData | null }) {
  const title = data?.title || post.title;
  const author = data?.author || post.author;
  const coverImage = data?.coverImage || post.thumbnail;
  const hasContent = data?.hasFullContent && data.content;

  return (
    <article className="max-w-xl mx-auto px-6 py-8">
      {/* Cover image */}
      {coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverImage}
          alt=""
          className="w-full h-56 object-cover rounded-xl mb-6"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}

      {/* Title */}
      <h1 className="text-xl font-bold text-[#1a1a2e] leading-snug mb-3">{title}</h1>

      {/* Meta */}
      {author && (
        <p className="text-sm text-[#8a8a9a] mb-6">by {author} · {post.platform}</p>
      )}

      {/* Full content or excerpt */}
      {hasContent ? (
        <div
          className="reader-content text-[15px] text-[#2a2a3a] leading-[1.8]"
          dangerouslySetInnerHTML={{ __html: data!.content! }}
        />
      ) : (
        <div>
          {(data?.description || post.excerpt) && (
            <p className="text-[15px] text-[#2a2a3a] leading-[1.8] mb-6">
              {data?.description || post.excerpt}
            </p>
          )}
          <div className="bg-[#f5f0e8] rounded-xl p-5 text-sm text-[#8a8a9a]">
            <p className="font-medium text-[#1a1a2e] mb-1">Full content not available inline</p>
            <p className="mb-3">This post may be behind a login, paywall, or uses a format we can&apos;t extract. Open the original to read it.</p>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1a1a2e] text-white text-sm font-medium hover:bg-[#2a2a3e] transition-colors"
            >
              <ExternalLink size={13} /> Open original
            </a>
          </div>
        </div>
      )}
    </article>
  );
}

function ErrorState({ post, message }: { post: Post; message: string }) {
  return (
    <div className="p-8">
      {post.thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.thumbnail} alt="" className="w-full h-48 object-cover rounded-xl mb-6"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      <h1 className="text-lg font-bold text-[#1a1a2e] mb-2">{post.title}</h1>
      {post.excerpt && <p className="text-sm text-[#8a8a9a] mb-4">{post.excerpt}</p>}
      <div className="bg-[#f5f0e8] rounded-xl p-4 text-sm text-[#8a8a9a]">
        <p>{message}</p>
        <a href={post.url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 px-3 py-2 rounded-lg bg-[#1a1a2e] text-white text-sm font-medium">
          <ExternalLink size={13} /> Open original
        </a>
      </div>
    </div>
  );
}
