'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ExternalLink, Plus, Loader2, Play, MessageSquare } from 'lucide-react';
import { TopicResult } from '@/app/api/topics/search/route';
import { BoardItem, saveBoardItem } from '@/lib/board-items';
import { removeTimestamps } from '@/lib/prompts';

type Platform = 'all' | 'youtube' | 'reddit';

const PLATFORMS: { id: Platform; label: string; icon: string }[] = [
  { id: 'all',     label: 'All',     icon: '🌐' },
  { id: 'youtube', label: 'YouTube', icon: '▶' },
  { id: 'reddit',  label: 'Reddit',  icon: '🔴' },
];

function PlatformBadge({ platform }: { platform: string }) {
  if (platform === 'youtube') return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium flex items-center gap-1">
      <Play size={9} /> YouTube
    </span>
  );
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium flex items-center gap-1">
      <MessageSquare size={9} /> Reddit
    </span>
  );
}

function ResultCard({ result, boardId }: { result: TopicResult; boardId: string }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  async function addToBoard() {
    setAdding(true);
    try {
      let transcript: string | undefined;
      if (result.videoId) {
        try {
          const tRes = await fetch(`/api/transcript?videoId=${result.videoId}`);
          const tData = await tRes.json();
          if (tData.transcript) transcript = removeTimestamps(tData.transcript);
        } catch { /* transcript optional */ }
      }

      const item: BoardItem = {
        id: crypto.randomUUID(),
        boardId,
        type: 'link',
        title: result.title,
        url: result.url,
        thumbnail: result.thumbnail,
        platform: result.platform === 'youtube' ? 'YouTube' : 'Reddit',
        author: result.author,
        videoId: result.videoId,
        transcript,
        content: result.description,
        createdAt: new Date().toISOString(),
      };
      saveBoardItem(item);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#e5ded4] overflow-hidden hover:shadow-sm transition-shadow">
      {result.thumbnail && (
        <a href={result.url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.thumbnail}
            alt=""
            className="w-full aspect-video object-cover hover:opacity-90 transition-opacity"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </a>
      )}
      <div className="p-3">
        <div className="flex items-start gap-2 mb-1.5">
          <PlatformBadge platform={result.platform} />
          {result.author && (
            <span className="text-[11px] text-[#8a8a9a] truncate">{result.author}</span>
          )}
        </div>
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-[#1a1a2e] line-clamp-2 hover:text-[#ff6b35] transition-colors block mb-1.5"
        >
          {result.title}
        </a>
        {result.description && (
          <p className="text-xs text-[#6a6a7a] line-clamp-2 mb-2 leading-relaxed">{result.description}</p>
        )}
        <div className="flex items-center gap-2 text-[11px] text-[#8a8a9a] mb-2">
          {result.meta && <span>{result.meta}</span>}
          {result.publishedAt && (
            <span>{new Date(result.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={addToBoard}
            disabled={adding || added}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              added
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-[#e5ded4] text-[#8a8a9a] hover:border-[#ff6b35] hover:text-[#ff6b35]'
            } disabled:opacity-50`}
          >
            {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            {added ? 'Added!' : adding ? 'Adding…' : 'Add to Board'}
          </button>
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-[#e5ded4] text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors"
          >
            <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function TopicSearch({ boardId }: { boardId: string }) {
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState<Platform>('all');
  const [results, setResults] = useState<TopicResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function triggerSearch(q: string, p: Platform) {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const res = await fetch(`/api/topics/search?q=${encodeURIComponent(q)}&platform=${p}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 500);
  }

  function handleQuery(q: string) {
    setQuery(q);
    triggerSearch(q, platform);
  }

  function handlePlatform(p: Platform) {
    setPlatform(p);
    triggerSearch(query, p);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a2e] mb-1">Topic Search</h1>
        <p className="text-sm text-[#8a8a9a]">Search posts and videos about any topic across YouTube and Reddit</p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8a9a]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            placeholder="Search any topic, keyword, or question…"
            className="w-full pl-10 pr-4 py-3 border border-[#e5ded4] rounded-xl text-sm text-[#1a1a2e] outline-none focus:border-[#ff6b35] bg-white shadow-sm"
          />
          {loading && <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-[#8a8a9a]" />}
        </div>

        <div className="flex gap-1.5">
          {PLATFORMS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => handlePlatform(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                platform === id
                  ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]'
                  : 'border-[#e5ded4] text-[#8a8a9a] hover:border-[#1a1a2e] hover:text-[#1a1a2e] bg-white'
              }`}
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {!searched && (
        <div className="text-center py-24 text-[#8a8a9a]">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-lg font-semibold text-[#1a1a2e] mb-2">Search any topic</p>
          <p className="text-sm max-w-sm mx-auto">
            Type a keyword above to find videos and posts from YouTube and Reddit — then add the best ones straight to your board.
          </p>
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="text-center py-20 text-[#8a8a9a]">
          <p className="font-medium">No results found for &ldquo;{query}&rdquo;</p>
          <p className="text-sm mt-1">Try a different keyword or switch platforms</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <p className="text-xs text-[#8a8a9a] mb-4">{results.length} results for &ldquo;{query}&rdquo;</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((result) => (
              <ResultCard key={`${result.platform}-${result.id}`} result={result} boardId={boardId} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
