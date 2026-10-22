'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquarePlus, Plus, X, ExternalLink, Copy, Check,
  Loader2, Trash2, ChevronDown, ChevronUp, User,
  RefreshCw, Eye, ThumbsUp, MessageSquare, Play,
} from 'lucide-react';
import type { CreatorPost } from '@/app/api/creator-posts/route';

// ─── Types ────────────────────────────────────────────────────────────────────

type EngagePlatform = 'x' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok';

interface Creator {
  id: string;
  name: string;
  handle: string;
  platform: EngagePlatform;
  profileUrl: string;
  addedAt: string;
}

const PLATFORM_META: Record<EngagePlatform, { label: string; color: string; bg: string; supportsAutoFetch: boolean }> = {
  x:         { label: 'X',         color: '#1a1a2e', bg: '#f0f0f5', supportsAutoFetch: false },
  instagram: { label: 'Instagram', color: '#c13584', bg: '#fdf0f8', supportsAutoFetch: false },
  linkedin:  { label: 'LinkedIn',  color: '#0077b5', bg: '#eef6fd', supportsAutoFetch: false },
  youtube:   { label: 'YouTube',   color: '#ff0000', bg: '#fff0f0', supportsAutoFetch: true  },
  tiktok:    { label: 'TikTok',    color: '#010101', bg: '#f5f5f5', supportsAutoFetch: false },
};

const CREATORS_KEY = 'feedhub-engage-creators';
const BRAND_KEY    = 'feedhub-engage-brand';

function loadCreators(): Creator[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(CREATORS_KEY) || '[]'); } catch { return []; }
}
function saveCreators(list: Creator[]) {
  localStorage.setItem(CREATORS_KEY, JSON.stringify(list));
}

function fmt(n?: number) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

// ─── Add Creator Form ─────────────────────────────────────────────────────────

function AddCreatorForm({ onAdd }: { onAdd: (c: Creator) => void }) {
  const [name, setName]           = useState('');
  const [handle, setHandle]       = useState('');
  const [platform, setPlatform]   = useState<EngagePlatform>('youtube');
  const [url, setUrl]             = useState('');
  const [open, setOpen]           = useState(false);

  function submit() {
    if (!name.trim() || !url.trim()) return;
    onAdd({ id: crypto.randomUUID(), name: name.trim(), handle: handle.trim() || name.trim(), platform, profileUrl: url.trim(), addedAt: new Date().toISOString() });
    setName(''); setHandle(''); setUrl(''); setOpen(false);
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[#e5ded4] text-sm text-[#8a8a9a] hover:border-[#ff6b35] hover:text-[#ff6b35] transition-colors w-full">
      <Plus size={14} /> Add a creator
    </button>
  );

  return (
    <div className="border border-[#e5ded4] rounded-2xl p-4 bg-white space-y-3">
      <p className="text-xs font-semibold text-[#1a1a2e]">New creator</p>
      <div className="grid grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Creator name" className="col-span-2 border border-[#e5ded4] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#ff6b35]" />
        <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@handle or channel name" className="border border-[#e5ded4] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#ff6b35]" />
        <select value={platform} onChange={(e) => setPlatform(e.target.value as EngagePlatform)} className="border border-[#e5ded4] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#ff6b35] bg-white">
          {(Object.keys(PLATFORM_META) as EngagePlatform[]).map((p) => (
            <option key={p} value={p}>{PLATFORM_META[p].label}</option>
          ))}
        </select>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Profile URL" className="col-span-2 border border-[#e5ded4] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#ff6b35]" />
      </div>
      <div className="flex gap-2">
        <button onClick={submit} disabled={!name.trim() || !url.trim()} className="flex-1 py-2 rounded-xl bg-[#ff6b35] text-white text-sm font-medium disabled:opacity-40 hover:bg-[#e55a25] transition-colors">Add</button>
        <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-[#e5ded4] text-sm text-[#8a8a9a] hover:bg-[#f5f0e8] transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: CreatorPost }) {
  const [copied, setCopied] = useState(false);

  async function copyAndOpen() {
    await navigator.clipboard.writeText(post.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    window.open(post.url, '_blank');
  }

  return (
    <div className="bg-white border border-[#e5ded4] rounded-2xl overflow-hidden hover:border-[#ff6b35] hover:shadow-sm transition-all">
      <div className="flex gap-3 p-4">
        {post.thumbnail ? (
          <div className="relative w-24 h-16 rounded-lg overflow-hidden shrink-0 bg-[#1a1a2e]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.thumbnail} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Play size={14} className="text-white fill-white opacity-80" />
            </div>
          </div>
        ) : (
          <div className="w-24 h-16 rounded-lg bg-[#f5f0e8] flex items-center justify-center shrink-0">
            <Play size={16} className="text-[#ccc5b8]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1a1a2e] line-clamp-2 leading-snug">{post.title}</p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-[#8a8a9a]">
            <span className="font-medium text-[#5a5a6a]">{post.creatorName}</span>
            <span className="flex items-center gap-0.5"><Eye size={10} /> {fmt(post.views)}</span>
            <span className="flex items-center gap-0.5"><ThumbsUp size={10} /> {fmt(post.likes)}</span>
            <span className="flex items-center gap-0.5"><MessageSquare size={10} /> {fmt(post.comments)}</span>
            <span>{timeAgo(post.publishedAt)}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 px-4 pb-3">
        <button onClick={copyAndOpen} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff6b35] text-white text-xs font-medium hover:bg-[#e55a25] transition-colors">
          {copied ? <Check size={11} /> : <ExternalLink size={11} />}
          {copied ? 'Opened!' : 'Open & Comment'}
        </button>
        <a href={post.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#e5ded4] text-xs text-[#5a5a6a] hover:bg-[#f5f0e8] transition-colors">
          Watch
        </a>
      </div>
    </div>
  );
}

// ─── Comment Suggestion ───────────────────────────────────────────────────────

function CommentCard({ text, postUrl }: { text: string; postUrl: string }) {
  const [copied, setCopied] = useState(false);
  async function copyAndOpen() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (postUrl) window.open(postUrl, '_blank');
  }
  return (
    <div className="border border-[#e5ded4] rounded-xl p-4 bg-white space-y-3">
      <p className="text-sm text-[#2a2a3a] leading-relaxed">{text}</p>
      <button onClick={copyAndOpen} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff6b35] text-white text-xs font-medium hover:bg-[#e55a25] transition-colors">
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Copied!' : postUrl ? 'Copy & Open post' : 'Copy'}
      </button>
    </div>
  );
}

// ─── Creator Card (sidebar-style) ─────────────────────────────────────────────

function CreatorCard({ creator, onRemove }: { creator: Creator; onRemove: () => void }) {
  const meta = PLATFORM_META[creator.platform];
  return (
    <div className="flex items-center gap-3 p-4 bg-white border border-[#e5ded4] rounded-2xl hover:border-[#ff6b35] hover:shadow-sm transition-all group">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0" style={{ background: meta.bg, color: meta.color }}>
        {creator.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1a1a2e] truncate">{creator.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
          {creator.handle && <span className="text-xs text-[#8a8a9a] truncate">{creator.handle}</span>}
          {meta.supportsAutoFetch && <span className="text-[9px] text-green-600 font-medium">● Auto-fetch on</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <a href={creator.profileUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-[#f5f0e8] text-[#8a8a9a] hover:text-[#ff6b35] transition-colors" title="Visit profile">
          <ExternalLink size={14} />
        </a>
        <button onClick={onRemove} className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-[#ccc] hover:text-red-400 transition-all">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EngageView() {
  const [tab, setTab] = useState<'posts' | 'creators' | 'comment'>('posts');
  const [creators, setCreators] = useState<Creator[]>([]);

  // Brand context
  const [brand, setBrand]         = useState('');
  const [brandSaved, setBrandSaved] = useState(false);
  const [showBrand, setShowBrand] = useState(false);

  // Posts feed
  const [posts, setPosts]         = useState<CreatorPost[]>([]);
  const [fetchingPosts, setFetchingPosts] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [postError, setPostError] = useState('');

  // Comment generator
  const [postUrl, setPostUrl]         = useState('');
  const [postContent, setPostContent] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingComment, setLoadingComment] = useState(false);
  const [commentError, setCommentError]     = useState('');

  useEffect(() => {
    const list = loadCreators();
    setCreators(list);
    setBrand(localStorage.getItem(BRAND_KEY) || '');
  }, []);

  const fetchPosts = useCallback(async (list: Creator[]) => {
    const supported = list.filter((c) => PLATFORM_META[c.platform].supportsAutoFetch);
    if (!supported.length) return;
    setFetchingPosts(true);
    setPostError('');
    try {
      const results = await Promise.all(
        supported.map((c) =>
          fetch('/api/creator-posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform: c.platform, handle: c.handle, name: c.name, profileUrl: c.profileUrl }),
          }).then((r) => r.json()).then((d) => (d.posts as CreatorPost[]) || [])
        )
      );
      const all = results.flat().sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      setPosts(all);
      setFetchedAt(new Date());
    } catch {
      setPostError('Failed to fetch posts. Check your connection.');
    } finally {
      setFetchingPosts(false);
    }
  }, []);

  useEffect(() => {
    if (creators.length) fetchPosts(creators);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function addCreator(c: Creator) {
    const next = [c, ...creators];
    setCreators(next);
    saveCreators(next);
    fetchPosts(next);
  }

  function removeCreator(id: string) {
    const next = creators.filter((c) => c.id !== id);
    setCreators(next);
    saveCreators(next);
  }

  function saveBrand() {
    localStorage.setItem(BRAND_KEY, brand);
    setBrandSaved(true);
    setTimeout(() => setBrandSaved(false), 2000);
    setShowBrand(false);
  }

  async function generateComments() {
    if (!postContent.trim()) return;
    setLoadingComment(true);
    setSuggestions([]);
    setCommentError('');
    const savedBrand = localStorage.getItem(BRAND_KEY) || '';
    const systemPrompt = `You are an engagement strategist. Generate exactly 3 strategic comments for the given post. Each must add genuine value, position the commenter as knowledgeable, feel human and natural, and stay under 280 characters. ${savedBrand ? `Commenter's niche: ${savedBrand}` : ''} Return ONLY the 3 comments separated by "---COMMENT---" with no numbering or labels.`;
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemPrompt, messages: [{ role: 'user', content: `Post:\n${postContent.trim()}` }] }) });
      const data = await res.json();
      if (data.error) { setCommentError(data.error); return; }
      const parts = (data.result as string).split('---COMMENT---').map((s: string) => s.trim()).filter(Boolean);
      setSuggestions(parts.length >= 2 ? parts : [data.result]);
    } catch { setCommentError('Request failed.'); }
    finally { setLoadingComment(false); }
  }

  const supportedCreators = creators.filter((c) => PLATFORM_META[c.platform].supportsAutoFetch);
  const unsupportedCreators = creators.filter((c) => !PLATFORM_META[c.platform].supportsAutoFetch);

  function tabClass(t: 'posts' | 'creators' | 'comment') {
    return `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-[#ff6b35] text-[#ff6b35]' : 'border-transparent text-[#8a8a9a] hover:text-[#1a1a2e]'}`;
  }

  return (
    <div className="min-h-full bg-[#faf8f5]">
      {/* Header */}
      <div className="bg-white border-b border-[#e5ded4] px-8 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <MessageSquarePlus size={20} className="text-[#ff6b35]" />
              <h1 className="text-xl font-bold text-[#1a1a2e]">Engagement Queue</h1>
            </div>
            <button onClick={() => setShowBrand((v) => !v)} className="flex items-center gap-1.5 text-xs text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
              <User size={13} />
              My brand context
              {showBrand ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
          <p className="text-sm text-[#8a8a9a]">Daily posts from creators you follow — with AI-suggested comments.</p>

          {showBrand && (
            <div className="mt-4 p-4 bg-[#f5f0e8] rounded-xl border border-[#e5ded4] space-y-2">
              <p className="text-xs font-semibold text-[#1a1a2e]">Your niche & brand context</p>
              <p className="text-xs text-[#8a8a9a]">Personalises every comment suggestion to your voice and positioning.</p>
              <textarea value={brand} onChange={(e) => setBrand(e.target.value)} rows={3} placeholder="e.g. I'm a content strategist helping creators monetise their audience without burnout. I write about systems, brand building, and the creator economy." className="w-full border border-[#e5ded4] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#ff6b35] bg-white resize-none" />
              <button onClick={saveBrand} className="px-4 py-1.5 rounded-lg bg-[#ff6b35] text-white text-xs font-medium hover:bg-[#e55a25] transition-colors">
                {brandSaved ? '✓ Saved' : 'Save context'}
              </button>
            </div>
          )}

          <div className="flex gap-1 mt-5 border-b border-[#e5ded4]">
            <button onClick={() => setTab('posts')} className={tabClass('posts')}>
              Posts {posts.length > 0 && `(${posts.length})`}
            </button>
            <button onClick={() => setTab('creators')} className={tabClass('creators')}>
              Creators {creators.length > 0 && `(${creators.length})`}
            </button>
            <button onClick={() => setTab('comment')} className={tabClass('comment')}>
              Comment AI
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8">

        {/* ── Posts tab ── */}
        {tab === 'posts' && (
          <div className="space-y-4">
            {/* Refresh bar */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#8a8a9a]">
                {fetchedAt ? `Updated ${timeAgo(fetchedAt.toISOString())}` : 'Not fetched yet'}
                {supportedCreators.length > 0 && ` · ${supportedCreators.length} YouTube creator${supportedCreators.length > 1 ? 's' : ''}`}
              </p>
              <button
                onClick={() => fetchPosts(creators)}
                disabled={fetchingPosts || supportedCreators.length === 0}
                className="flex items-center gap-1.5 text-xs text-[#8a8a9a] hover:text-[#ff6b35] transition-colors disabled:opacity-40"
              >
                {fetchingPosts ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Refresh
              </button>
            </div>

            {postError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">{postError}</div>}

            {fetchingPosts && (
              <div className="flex items-center justify-center py-16 gap-2 text-[#8a8a9a]">
                <Loader2 size={18} className="animate-spin text-[#ff6b35]" />
                <span className="text-sm">Fetching latest posts…</span>
              </div>
            )}

            {!fetchingPosts && posts.length === 0 && (
              <div className="text-center py-16 text-[#8a8a9a]">
                <Play size={32} className="mx-auto mb-3 text-[#e5ded4]" />
                {creators.length === 0 ? (
                  <>
                    <p className="text-sm font-medium text-[#1a1a2e]">No creators yet</p>
                    <p className="text-xs mt-1">Go to the Creators tab and add YouTube channels to see their posts here.</p>
                  </>
                ) : supportedCreators.length === 0 ? (
                  <>
                    <p className="text-sm font-medium text-[#1a1a2e]">Auto-fetch only works for YouTube right now</p>
                    <p className="text-xs mt-1">Add a YouTube creator to see daily posts here. Visit profiles for other platforms.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-[#1a1a2e]">No posts found</p>
                    <p className="text-xs mt-1">Hit Refresh to try again, or check the creator handle.</p>
                  </>
                )}
              </div>
            )}

            {posts.map((post) => <PostCard key={post.id} post={post} />)}

            {/* Manual visit cards for unsupported platforms */}
            {unsupportedCreators.length > 0 && posts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#e5ded4]">
                <p className="text-xs text-[#8a8a9a] mb-3">Visit profiles manually for other platforms:</p>
                <div className="flex flex-wrap gap-2">
                  {unsupportedCreators.map((c) => {
                    const meta = PLATFORM_META[c.platform];
                    return (
                      <a key={c.id} href={c.profileUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#e5ded4] bg-white hover:border-[#ff6b35] text-xs transition-colors">
                        <span className="font-medium" style={{ color: meta.color }}>{meta.label}</span>
                        <span className="text-[#5a5a6a]">{c.name}</span>
                        <ExternalLink size={10} className="text-[#8a8a9a]" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Creators tab ── */}
        {tab === 'creators' && (
          <div className="space-y-3">
            <AddCreatorForm onAdd={addCreator} />
            {creators.length === 0 ? (
              <div className="text-center py-16 text-[#8a8a9a]">
                <MessageSquarePlus size={32} className="mx-auto mb-3 text-[#e5ded4]" />
                <p className="text-sm font-medium text-[#1a1a2e]">No creators yet</p>
                <p className="text-xs mt-1">Add YouTube channels for daily auto-fetch. Other platforms show visit links.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {creators.map((c) => <CreatorCard key={c.id} creator={c} onRemove={() => removeCreator(c.id)} />)}
              </div>
            )}
          </div>
        )}

        {/* ── Comment AI tab ── */}
        {tab === 'comment' && (
          <div className="space-y-5">
            <div className="bg-white border border-[#e5ded4] rounded-2xl p-5 space-y-4">
              <p className="text-sm font-semibold text-[#1a1a2e]">Paste a post</p>
              <textarea value={postContent} onChange={(e) => setPostContent(e.target.value)} rows={5} placeholder="Paste the post text you want to comment on…" className="w-full border border-[#e5ded4] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#ff6b35] resize-none text-[#1a1a2e]" />
              <input value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="Post URL (optional — used for Copy & Open)" className="w-full border border-[#e5ded4] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#ff6b35] text-[#1a1a2e]" />
              <button onClick={generateComments} disabled={!postContent.trim() || loadingComment} className="w-full py-2.5 rounded-xl bg-[#ff6b35] text-white text-sm font-medium disabled:opacity-40 hover:bg-[#e55a25] transition-colors flex items-center justify-center gap-2">
                {loadingComment ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><MessageSquarePlus size={14} /> Generate comment ideas</>}
              </button>
            </div>
            {commentError && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{commentError}</div>}
            {suggestions.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-[#8a8a9a] uppercase tracking-wider">{suggestions.length} comment ideas</p>
                {suggestions.map((s, i) => <CommentCard key={i} text={s} postUrl={postUrl} />)}
                <button onClick={generateComments} className="text-xs text-[#8a8a9a] hover:text-[#ff6b35] transition-colors">Regenerate</button>
              </div>
            )}
            {!brand && !loadingComment && suggestions.length === 0 && (
              <div className="bg-[#f5f0e8] rounded-xl p-4 text-xs text-[#5a5a6a] leading-relaxed">
                <strong className="text-[#1a1a2e]">Tip:</strong> Set your brand context (top right) so suggestions match your voice.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
