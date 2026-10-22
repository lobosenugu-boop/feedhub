'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, UserCheck, Play, ExternalLink, ChevronDown, Loader2, BookOpen, Plus, ScrollText, X, Copy, Check } from 'lucide-react';
import { TrackedCreator, getTrackedCreators, trackCreator, untrackCreator, isTracked } from '@/lib/creators';
import { BoardItem, saveBoardItem } from '@/lib/board-items';
import { removeTimestamps } from '@/lib/prompts';

interface VideoItem {
  id: string;
  title: string;
  thumbnail?: string;
  description?: string;
  publishedAt?: string;
  views?: string;
  url: string;
}

const PLATFORM_ICONS: Record<string, string> = {
  youtube: '▶',
  substack: '📬',
  x: '𝕏',
};

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
      platform === 'youtube'
        ? 'bg-red-100 text-red-600'
        : 'bg-orange-100 text-orange-600'
    }`}>
      {PLATFORM_ICONS[platform]} {platform === 'youtube' ? 'YouTube' : 'Substack'}
    </span>
  );
}

function CreatorCard({
  creator,
  tracked,
  onTrack,
  onUntrack,
  onSelect,
  selected,
}: {
  creator: TrackedCreator;
  tracked: boolean;
  onTrack: () => void;
  onUntrack: () => void;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-xl border p-4 transition-all hover:shadow-sm ${
        selected
          ? 'border-[#ff6b35] bg-[#fff8f5] shadow-sm'
          : 'border-[#e5ded4] bg-white hover:border-[#ff6b35]/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {creator.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creator.avatar} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-[#f5f0e8] flex items-center justify-center text-lg shrink-0">
            {creator.name[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-[#1a1a2e] truncate">{creator.name}</p>
          <p className="text-xs text-[#8a8a9a] truncate">@{creator.handle}</p>
          <div className="flex items-center gap-2 mt-1">
            <PlatformBadge platform={creator.platform} />
            {creator.subscribers && (
              <span className="text-[10px] text-[#8a8a9a]">{creator.subscribers} subscribers</span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); tracked ? onUntrack() : onTrack(); }}
          className={`shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
            tracked
              ? 'border-green-200 bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
              : 'border-[#e5ded4] text-[#8a8a9a] hover:border-[#ff6b35] hover:text-[#ff6b35]'
          }`}
        >
          {tracked ? <UserCheck size={12} /> : <UserPlus size={12} />}
          {tracked ? 'Tracking' : 'Track'}
        </button>
      </div>
      {creator.description && (
        <p className="text-xs text-[#6a6a7a] mt-2 line-clamp-2 leading-relaxed">{creator.description}</p>
      )}
    </div>
  );
}

function VideoCard({ video, platform, boardId, onAdded }: {
  video: VideoItem;
  platform: string;
  boardId: string;
  onAdded?: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [fetchingTranscript, setFetchingTranscript] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [copied, setCopied] = useState(false);

  async function fetchTranscript() {
    if (transcript) { setShowTranscript(true); return; }
    setFetchingTranscript(true);
    try {
      const res = await fetch(`/api/transcript?videoId=${video.id}`);
      const data = await res.json();
      const cleaned = data.transcript ? removeTimestamps(data.transcript) : null;
      setTranscript(cleaned);
      setShowTranscript(true);
    } catch { setTranscript(null); }
    finally { setFetchingTranscript(false); }
  }

  async function copyTranscript() {
    if (!transcript) return;
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function addToBoard() {
    if (platform === 'youtube') {
      const videoId = video.id;
      setTranscribing(true);
      try {
        const tRes = await fetch(`/api/transcript?videoId=${videoId}`);
        const tData = await tRes.json();
        const item: BoardItem = {
          id: crypto.randomUUID(),
          boardId,
          type: 'link',
          title: video.title,
          url: video.url,
          thumbnail: video.thumbnail,
          platform: 'YouTube',
          videoId,
          transcript: tData.transcript ? removeTimestamps(tData.transcript) : undefined,
          createdAt: new Date().toISOString(),
        };
        saveBoardItem(item);
      } catch {
        const item: BoardItem = {
          id: crypto.randomUUID(),
          boardId,
          type: 'link',
          title: video.title,
          url: video.url,
          thumbnail: video.thumbnail,
          platform: 'YouTube',
          videoId,
          createdAt: new Date().toISOString(),
        };
        saveBoardItem(item);
      } finally {
        setTranscribing(false);
      }
    } else {
      setAdding(true);
      const item: BoardItem = {
        id: crypto.randomUUID(),
        boardId,
        type: 'link',
        title: video.title,
        url: video.url,
        thumbnail: video.thumbnail,
        platform: 'Substack',
        content: video.description,
        createdAt: new Date().toISOString(),
      };
      saveBoardItem(item);
      setAdding(false);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    onAdded?.();
  }

  const busy = adding || transcribing;

  return (
    <div className="bg-white rounded-xl border border-[#e5ded4] overflow-hidden hover:shadow-sm transition-shadow">
      {video.thumbnail && (
        <a href={video.url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={video.thumbnail}
            alt=""
            className="w-full aspect-video object-cover hover:opacity-90 transition-opacity"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </a>
      )}
      <div className="p-3">
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-[#1a1a2e] line-clamp-2 hover:text-[#ff6b35] transition-colors block mb-1"
        >
          {video.title}
        </a>
        <div className="flex items-center gap-2 text-[11px] text-[#8a8a9a] mb-2">
          {video.views && <span>{video.views}</span>}
          {video.publishedAt && (
            <span>{new Date(video.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={addToBoard}
            disabled={busy || added}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              added
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-[#e5ded4] text-[#8a8a9a] hover:border-[#ff6b35] hover:text-[#ff6b35]'
            } disabled:opacity-50`}
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            {added ? 'Added!' : transcribing ? 'Fetching…' : 'Add to Board'}
          </button>
          {platform === 'youtube' && (
            <button
              onClick={fetchTranscript}
              disabled={fetchingTranscript}
              className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border transition-colors ${
                showTranscript
                  ? 'border-[#ff6b35] text-[#ff6b35] bg-[#fff5f0]'
                  : 'border-[#e5ded4] text-[#8a8a9a] hover:border-[#ff6b35] hover:text-[#ff6b35]'
              }`}
              title="View transcript"
            >
              {fetchingTranscript ? <Loader2 size={11} className="animate-spin" /> : <ScrollText size={11} />}
            </button>
          )}
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-[#e5ded4] text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors"
          >
            <ExternalLink size={11} />
          </a>
        </div>

        {/* Transcript panel */}
        {showTranscript && (
          <div className="mt-3 border border-[#e5ded4] rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-[#fafaf8] border-b border-[#e5ded4]">
              <span className="text-xs font-semibold text-[#1a1a2e]">Transcript</span>
              <div className="flex items-center gap-1.5">
                {transcript && (
                  <button onClick={copyTranscript} className="flex items-center gap-1 text-xs text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
                    {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                )}
                <button onClick={() => setShowTranscript(false)} className="text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors ml-1">
                  <X size={13} />
                </button>
              </div>
            </div>
            <div className="p-3 max-h-48 overflow-y-auto">
              {transcript ? (
                <p className="text-xs text-[#4a4a5a] leading-relaxed whitespace-pre-wrap">{transcript}</p>
              ) : (
                <p className="text-xs text-[#8a8a9a] italic">No transcript available for this video.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreatorResearch({ boardId }: { boardId: string }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<TrackedCreator[]>([]);
  const [tracked, setTracked] = useState<TrackedCreator[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<TrackedCreator | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [sort, setSort] = useState<'top' | 'latest'>('top');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setTracked(getTrackedCreators()); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/creators/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 500);
  }, [query]);

  useEffect(() => {
    if (!selectedCreator || selectedCreator.platform === 'x') return;
    setVideos([]);
    setLoadingVideos(true);
    const params = new URLSearchParams({ sort });
    if (selectedCreator.platform === 'youtube') {
      params.set('channelId', selectedCreator.id);
    } else {
      const slug = selectedCreator.id.replace('substack:', '');
      params.set('substackSlug', slug);
    }
    fetch(`/api/creators/videos?${params}`)
      .then((r) => r.json())
      .then((d) => setVideos(d.videos || []))
      .catch(() => setVideos([]))
      .finally(() => setLoadingVideos(false));
  }, [selectedCreator, sort]);

  function handleTrack(creator: TrackedCreator) {
    trackCreator({ ...creator, trackedAt: new Date().toISOString() });
    setTracked(getTrackedCreators());
  }

  function handleUntrack(id: string) {
    untrackCreator(id);
    setTracked(getTrackedCreators());
    if (selectedCreator?.id === id) setSelectedCreator(null);
  }

  const displayResults: TrackedCreator[] = query.trim() ? results : tracked;
  const showingTracked = !query.trim();

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-80 shrink-0 border-r border-[#e5ded4] bg-[#fafaf8] flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-[#e5ded4]">
          <div className="flex items-center gap-2 mb-1">
            <Search size={15} className="text-[#ff6b35]" />
            <h1 className="font-bold text-[#1a1a2e]">Creator Research</h1>
          </div>
          <p className="text-xs text-[#8a8a9a]">Search and track creators across YouTube & Substack</p>

          <div className="relative mt-4">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8a9a]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or paste Substack URL…"
              className="w-full pl-8 pr-3 py-2.5 border border-[#e5ded4] rounded-xl text-sm text-[#1a1a2e] outline-none focus:border-[#ff6b35] bg-white"
            />
            {searching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#8a8a9a]" />}
          </div>
        </div>

        {/* Results / tracked list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {showingTracked && tracked.length === 0 && !query && (
            <div className="text-center py-16 text-[#8a8a9a]">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm font-medium text-[#1a1a2e]">No tracked creators yet</p>
              <p className="text-xs mt-1">Search for a creator above to get started</p>
            </div>
          )}

          {showingTracked && tracked.length > 0 && (
            <p className="text-xs font-medium text-[#8a8a9a] px-1 mb-2">
              Tracking {tracked.length} creator{tracked.length !== 1 ? 's' : ''}
            </p>
          )}

          {!showingTracked && results.length === 0 && !searching && query && (
            <p className="text-xs text-[#8a8a9a] text-center py-8">No creators found for &ldquo;{query}&rdquo;</p>
          )}

          {displayResults.map((creator) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              tracked={isTracked(creator.id)}
              onTrack={() => handleTrack(creator)}
              onUntrack={() => handleUntrack(creator.id)}
              onSelect={() => setSelectedCreator(creator)}
              selected={selectedCreator?.id === creator.id}
            />
          ))}
        </div>
      </div>

      {/* Right panel — creator content */}
      <div className="flex-1 overflow-y-auto bg-white">
        {!selectedCreator ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#8a8a9a] px-8">
            <div className="text-5xl mb-4">🎥</div>
            <p className="text-lg font-semibold text-[#1a1a2e] mb-2">Select a creator</p>
            <p className="text-sm max-w-xs">Search or pick a tracked creator on the left to browse their top content</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-6 py-6">
            {/* Creator header */}
            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-[#f0ebe3]">
              {selectedCreator.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedCreator.avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#f5f0e8] flex items-center justify-center text-2xl">
                  {selectedCreator.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-[#1a1a2e]">{selectedCreator.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <PlatformBadge platform={selectedCreator.platform} />
                  {selectedCreator.subscribers && (
                    <span className="text-sm text-[#8a8a9a]">{selectedCreator.subscribers} subscribers</span>
                  )}
                </div>
                {selectedCreator.description && (
                  <p className="text-xs text-[#6a6a7a] mt-1.5 line-clamp-2">{selectedCreator.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedCreator.platform === 'youtube' && (
                  <a href={`https://www.youtube.com/channel/${selectedCreator.id}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#e5ded4] text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
                    <Play size={12} /> Channel
                  </a>
                )}
                {selectedCreator.platform === 'substack' && (
                  <a href={`https://${selectedCreator.id.replace('substack:', '')}.substack.com`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#e5ded4] text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
                    <BookOpen size={12} /> Newsletter
                  </a>
                )}
                {selectedCreator.platform === 'x' && (
                  <a href={`https://x.com/${selectedCreator.handle}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#e5ded4] text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
                    <ExternalLink size={12} /> Profile
                  </a>
                )}
              </div>
            </div>

            {/* X — no API notice */}
            {selectedCreator.platform === 'x' && (
              <div className="bg-[#f5f0e8] rounded-xl p-6 text-center">
                <p className="text-2xl mb-2">𝕏</p>
                <p className="font-semibold text-[#1a1a2e] mb-1">X API key required</p>
                <p className="text-sm text-[#6a6a7a] max-w-sm mx-auto">
                  Viewing posts from X requires a paid X Developer account ($100/month).
                  For now, visit their profile directly.
                </p>
                <a
                  href={`https://x.com/${selectedCreator.handle}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-4 text-sm px-4 py-2 rounded-xl bg-[#1a1a2e] text-white hover:bg-[#2a2a4a] transition-colors"
                >
                  <ExternalLink size={13} /> Open on X
                </a>
              </div>
            )}

            {/* Sort tabs */}
            {selectedCreator.platform === 'youtube' && (
              <div className="flex gap-1 mb-5">
                {(['top', 'latest'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      sort === s
                        ? 'bg-[#1a1a2e] text-white'
                        : 'text-[#8a8a9a] hover:bg-[#f5f0e8] hover:text-[#1a1a2e]'
                    }`}
                  >
                    {s === 'top' ? '🔥 Most Viewed' : '🕐 Latest'}
                  </button>
                ))}
              </div>
            )}

            {/* Videos grid */}
            {loadingVideos ? (
              <div className="flex items-center justify-center py-20 text-[#8a8a9a]">
                <Loader2 size={20} className="animate-spin mr-2" />
                Loading content…
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-20 text-[#8a8a9a]">
                <ChevronDown size={24} className="mx-auto mb-3 opacity-30" />
                <p>No content found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    platform={selectedCreator.platform}
                    boardId={boardId}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
