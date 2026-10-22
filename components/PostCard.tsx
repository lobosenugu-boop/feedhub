'use client';

import { useState } from 'react';
import { ExternalLink, Bookmark, BookmarkCheck, Sparkles, MessageSquare, ThumbsUp, Clock } from 'lucide-react';
import { Post, Board } from '@/lib/types';

const SOURCE_COLORS: Record<string, string> = {
  hackernews: 'bg-orange-100 text-orange-700',
  rss: 'bg-blue-100 text-blue-700',
  youtube: 'bg-red-100 text-red-700',
  manual: 'bg-purple-100 text-purple-700',
};

const SOURCE_LABELS: Record<string, string> = {
  hackernews: 'HN',
  rss: 'RSS',
  youtube: 'YouTube',
  manual: 'Saved',
};

function formatViews(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface PostCardProps {
  post: Post;
  boards: Board[];
  savedPostIds: Set<string>;
  onSave: (post: Post, boardId: string) => void;
  onAI: (post: Post) => void;
  onRead: (post: Post) => void;
}

export default function PostCard({ post, boards, savedPostIds, onSave, onAI, onRead }: PostCardProps) {
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const isSaved = savedPostIds.has(post.id);

  return (
    <div className="bg-white rounded-xl border border-[#e5ded4] p-4 flex flex-col gap-3 hover:border-[#d0c8bc] hover:shadow-sm transition-all group relative">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${SOURCE_COLORS[post.source] || 'bg-gray-100 text-gray-600'}`}>
            {SOURCE_LABELS[post.source] || post.source}
          </span>
          {post.trending && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ff6b35] text-white shrink-0">
              🔥 VIRAL
            </span>
          )}
          <span className="text-xs text-[#8a8a9a] truncate">{post.platform}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAI(post)}
            className="p-1 rounded-md hover:bg-[#f5f0e8] text-[#8a8a9a] hover:text-[#ff6b35] transition-colors"
            title="AI tools"
          >
            <Sparkles size={14} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowBoardPicker(!showBoardPicker)}
              className={`p-1 rounded-md hover:bg-[#f5f0e8] transition-colors ${isSaved ? 'text-[#ff6b35]' : 'text-[#8a8a9a] hover:text-[#ff6b35]'}`}
              title="Save to board"
            >
              {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            </button>
            {showBoardPicker && (
              <div className="absolute right-0 top-7 z-10 bg-white border border-[#e5ded4] rounded-lg shadow-lg py-1 min-w-[140px]">
                {boards.length === 0 ? (
                  <p className="text-xs text-[#8a8a9a] px-3 py-2">Create a board first</p>
                ) : (
                  boards.map((board) => (
                    <button
                      key={board.id}
                      onClick={() => { onSave(post, board.id); setShowBoardPicker(false); }}
                      className="w-full text-left text-xs px-3 py-2 hover:bg-[#f5f0e8] text-[#1a1a2e] transition-colors"
                    >
                      {board.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-md hover:bg-[#f5f0e8] text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Content — clicks open the inline reader */}
      <div className="flex-1 cursor-pointer" onClick={() => onRead(post)}>
        <p className="font-semibold text-sm text-[#1a1a2e] leading-snug hover:text-[#ff6b35] transition-colors line-clamp-3">
          {post.title}
        </p>
        {post.excerpt && (
          <p className="text-xs text-[#8a8a9a] mt-1.5 line-clamp-3 leading-relaxed">{post.excerpt}</p>
        )}
      </div>

      {/* Thumbnail */}
      {post.thumbnail && (
        <div className="w-full h-28 rounded-lg overflow-hidden bg-[#f5f0e8] cursor-pointer" onClick={() => onRead(post)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-[#8a8a9a]">
        <span className="truncate max-w-[100px]">by {post.author}</span>
        <div className="flex items-center gap-2.5 shrink-0">
          {post.views != null && post.views > 0 && (
            <span className="flex items-center gap-1 font-medium text-[#ff6b35]">
              👁 {formatViews(post.views)}
            </span>
          )}
          {post.views == null && post.score != null && (
            <span className="flex items-center gap-1">
              <ThumbsUp size={11} /> {post.score.toLocaleString()}
            </span>
          )}
          {post.comments != null && (
            <span className="flex items-center gap-1">
              <MessageSquare size={11} /> {post.comments.toLocaleString()}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={11} /> {timeAgo(post.publishedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
