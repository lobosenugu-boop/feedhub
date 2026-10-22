'use client';

import { useState } from 'react';
import {
  Brain, Search, Plus, X, Loader2, BookOpen,
  ArrowRight, PlayCircle, Clock, Zap
} from 'lucide-react';

const DAILY_TOPICS = [
  'Consciousness', 'Identity', 'Meaning', 'Status anxiety', 'Desire',
  'Attention', 'Solitude', 'Excellence', 'Fear', 'Ego',
  'Truth', 'Time', 'Purpose', 'Focus', 'Creativity', 'Envy',
  'Courage', 'Memory', 'Certainty', 'Comparison', 'Ambition',
  'Regret', 'Discipline', 'Language', 'Loneliness', 'Authenticity',
  'Power', 'Knowledge', 'Belief', 'Suffering', 'Joy', 'Change',
  'Clarity', 'Perception', 'Will', 'Silence', 'Resistance',
];

function getDailyTopic(): string {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start.getTime()) / 86400000);
  return DAILY_TOPICS[dayOfYear % DAILY_TOPICS.length];
}

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K views`;
  return `${n} views`;
}

interface VideoResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail?: string;
  views: number;
  url: string;
}

interface SourceVideo {
  videoId: string;
  url: string;
  title: string;
  channel?: string;
  transcript?: string;
  status: 'loading' | 'ready' | 'error';
  showPaste?: boolean;
  pasteValue?: string;
}

interface Synthesis {
  coreIdea: string;
  keyArguments: string[];
  tensions: string[];
  questionsToHold: string[];
  writingPrompt: string;
}

export default function ThinkView() {
  const [tab, setTab] = useState<'discover' | 'synthesize'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VideoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  const [sources, setSources] = useState<SourceVideo[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthError, setSynthError] = useState('');

  const dailyTopic = getDailyTopic();

  async function searchTopics(query: string) {
    if (!query.trim()) return;
    setSearching(true);
    setSearchResults([]);
    setSearchDone(false);
    try {
      const res = await fetch(`/api/deep-topics?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.videos || []);
    } catch {
      // silent
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  }

  async function addVideoUrl(url: string) {
    const videoId = extractVideoId(url.trim());
    if (!videoId) return;
    if (sources.find((s) => s.videoId === videoId)) return;

    const newSource: SourceVideo = { videoId, url: url.trim(), title: 'Loading…', status: 'loading' };
    setSources((prev) => [...prev, newSource]);
    setUrlInput('');

    try {
      const [metaRes, transcriptRes] = await Promise.all([
        fetch(`/api/metadata?url=${encodeURIComponent(url.trim())}`),
        fetch(`/api/transcript?videoId=${videoId}`),
      ]);
      const meta = await metaRes.json();
      const transcriptData = await transcriptRes.json();

      setSources((prev) =>
        prev.map((s) =>
          s.videoId === videoId
            ? {
                ...s,
                title: meta.title || 'Unknown title',
                channel: meta.author,
                transcript: transcriptData.transcript || undefined,
                status: transcriptData.transcript ? 'ready' : 'error',
              }
            : s
        )
      );
    } catch {
      setSources((prev) =>
        prev.map((s) => (s.videoId === videoId ? { ...s, status: 'error' } : s))
      );
    }
  }

  function addFromSearch(video: VideoResult) {
    addVideoUrl(video.url);
    setTab('synthesize');
  }

  async function synthesize() {
    const ready = sources.filter((s) => s.status === 'ready' && s.transcript);
    if (!ready.length) return;
    setSynthesizing(true);
    setSynthesis(null);
    setSynthError('');

    const combinedContext = ready
      .map((s, i) => `VIDEO ${i + 1}: "${s.title}"${s.channel ? ` by ${s.channel}` : ''}\n\n${s.transcript}`)
      .join('\n\n---\n\n');

    const systemPrompt = `You are a thinking coach who helps people develop deep, articulate thought through pen-and-paper writing.

Analyze the provided video transcripts and extract the essential ideas for a writer who wants to form their own view.

Respond ONLY with valid JSON — no markdown, no explanation, just the JSON object:
{
  "coreIdea": "What this topic is really about (2 sentences max)",
  "keyArguments": ["Distinct argument 1", "Distinct argument 2", "...up to 5"],
  "tensions": ["Where ideas complicate or contradict each other", "...up to 3"],
  "questionsToHold": ["An open question to sit with while writing", "...up to 3"],
  "writingPrompt": "A specific, challenging 30-minute pen-and-paper prompt that pushes the writer to form their own original view, not just summarize what they heard"
}`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          messages: [
            {
              role: 'user',
              content: `Here are the video transcripts to synthesize:\n\n${combinedContext.slice(0, 50000)}`,
            },
          ],
        }),
      });
      const data = await res.json();
      if (data.error) { setSynthError(data.error); return; }
      const text: string = data.result || '';
      // Strip markdown code fences if present, then extract JSON object
      const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
      const jsonMatch = stripped.match(/\{[\s\S]+\}/);
      if (!jsonMatch) { setSynthError('Could not parse response. Try again.'); return; }
      const parsed: Synthesis = JSON.parse(jsonMatch[0]);
      setSynthesis(parsed);
    } catch {
      setSynthError('Something went wrong. Please try again.');
    } finally {
      setSynthesizing(false);
    }
  }

  const readySources = sources.filter((s) => s.status === 'ready');

  return (
    <div className="min-h-full bg-[#f9f6f0] p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#1a1a2e] flex items-center justify-center shrink-0">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1a1a2e]">Deep Think</h1>
            <p className="text-xs text-[#8a8a9a]">Research human thinkers. Combine ideas. Write for 30 minutes.</p>
          </div>
        </div>

        {/* Daily topic card */}
        <div className="bg-[#1a1a2e] text-white rounded-2xl p-6 mb-6">
          <p className="text-[10px] text-[#8a8a9a] uppercase tracking-widest mb-1">Today&apos;s topic</p>
          <h2 className="text-2xl font-bold mb-2">{dailyTopic}</h2>
          <p className="text-sm text-[#b0b0c0] mb-4 leading-relaxed">
            Search for deep thinkers who&apos;ve spoken on this. Gather their ideas. Then write your own view.
          </p>
          <button
            onClick={() => {
              setSearchQuery(dailyTopic);
              searchTopics(dailyTopic);
              setTab('discover');
            }}
            className="text-sm bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            Find videos on &ldquo;{dailyTopic}&rdquo; <ArrowRight size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#ede8e0] rounded-xl p-1 mb-6">
          <button
            onClick={() => setTab('discover')}
            className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
              tab === 'discover'
                ? 'bg-white text-[#1a1a2e] shadow-sm'
                : 'text-[#8a8a9a] hover:text-[#1a1a2e]'
            }`}
          >
            Discover Videos
          </button>
          <button
            onClick={() => setTab('synthesize')}
            className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
              tab === 'synthesize'
                ? 'bg-white text-[#1a1a2e] shadow-sm'
                : 'text-[#8a8a9a] hover:text-[#1a1a2e]'
            }`}
          >
            Synthesize &amp; Write
            {sources.length > 0 && (
              <span className="ml-1.5 bg-[#ff6b35] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {sources.length}
              </span>
            )}
          </button>
        </div>

        {/* ── DISCOVER TAB ── */}
        {tab === 'discover' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchTopics(searchQuery)}
                placeholder="Search a topic… e.g. attention, identity, fear, meaning"
                className="flex-1 border border-[#e5ded4] rounded-xl px-4 py-3 text-sm bg-white outline-none focus:border-[#1a1a2e] text-[#1a1a2e]"
              />
              <button
                onClick={() => searchTopics(searchQuery)}
                disabled={!searchQuery.trim() || searching}
                className="px-5 py-3 rounded-xl bg-[#1a1a2e] text-white text-sm font-semibold disabled:opacity-60 hover:bg-[#2a2a3e] transition-colors flex items-center gap-2 shrink-0"
              >
                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Search
              </button>
            </div>

            {searching && (
              <div className="text-center py-16 text-[#8a8a9a] text-sm">
                <Loader2 size={20} className="animate-spin mx-auto mb-3" />
                Finding deep thinking videos…
              </div>
            )}

            {!searching && searchDone && searchResults.length === 0 && (
              <div className="text-center py-16 text-[#8a8a9a] text-sm">No videos found. Try a different topic.</div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-[#8a8a9a] font-medium uppercase tracking-wide">
                  {searchResults.length} videos — click &ldquo;Add&rdquo; to research
                </p>
                {searchResults.map((video) => {
                  const added = !!sources.find((s) => s.videoId === video.videoId);
                  return (
                    <div
                      key={video.videoId}
                      className="bg-white rounded-xl border border-[#e5ded4] p-4 flex gap-4"
                    >
                      {video.thumbnail && (
                        <img
                          src={video.thumbnail}
                          alt=""
                          className="w-28 h-16 object-cover rounded-lg shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1a1a2e] line-clamp-2 mb-1">{video.title}</p>
                        <p className="text-xs text-[#8a8a9a] mb-2">
                          {video.channel} · {fmtViews(video.views)}
                        </p>
                        <button
                          onClick={() => addFromSearch(video)}
                          disabled={added}
                          className="text-xs font-semibold text-[#ff6b35] hover:underline disabled:text-[#b0b0c0] disabled:no-underline flex items-center gap-1"
                        >
                          {added ? 'Added ✓' : <><Plus size={11} /> Add to research</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!searching && !searchDone && (
              <div className="text-center py-16 text-[#8a8a9a] text-sm">
                <Search size={24} className="mx-auto mb-3 opacity-30" />
                <p>Search a topic to find human thinkers speaking about it.</p>
                <p className="mt-1 text-xs opacity-70">Not AI content — real lectures, talks, essays.</p>
              </div>
            )}
          </div>
        )}

        {/* ── SYNTHESIZE TAB ── */}
        {tab === 'synthesize' && (
          <div className="space-y-4">
            {/* Add URL input */}
            <div className="bg-white rounded-xl border border-[#e5ded4] p-4">
              <p className="text-sm font-semibold text-[#1a1a2e] mb-1">Add YouTube videos</p>
              <p className="text-xs text-[#8a8a9a] mb-3">
                Add 1–5 videos on the same topic. We&apos;ll extract all transcripts and combine the ideas.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addVideoUrl(urlInput)}
                  placeholder="Paste YouTube URL…"
                  className="flex-1 border border-[#e5ded4] rounded-xl px-4 py-2.5 text-sm bg-[#f9f6f0] outline-none focus:border-[#1a1a2e] text-[#1a1a2e]"
                />
                <button
                  onClick={() => addVideoUrl(urlInput)}
                  disabled={!urlInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#1a1a2e] text-white text-sm font-semibold disabled:opacity-50 hover:bg-[#2a2a3e] transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            {/* Source list */}
            {sources.length > 0 && (
              <div className="space-y-2">
                {sources.map((source) => (
                  <div
                    key={source.videoId}
                    className="bg-white rounded-xl border border-[#e5ded4] overflow-hidden"
                  >
                    <div className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <PlayCircle size={14} className="text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a1a2e] truncate">{source.title}</p>
                      <p className="text-xs text-[#8a8a9a]">
                        {source.status === 'loading' && 'Fetching transcript…'}
                        {source.status === 'ready' &&
                          `✓ Ready · ${source.transcript?.split(' ').length.toLocaleString() ?? 0} words`}
                        {source.status === 'error' && (
                          <button
                            onClick={() => setSources(prev => prev.map(s => s.videoId === source.videoId ? { ...s, showPaste: !s.showPaste } : s))}
                            className="text-amber-600 hover:underline"
                          >
                            ⚠ No captions — paste transcript manually
                          </button>
                        )}
                      </p>
                    </div>
                    {source.status === 'loading' && (
                      <Loader2 size={14} className="animate-spin text-[#8a8a9a] shrink-0" />
                    )}
                    <button
                      onClick={() => setSources((prev) => prev.filter((s) => s.videoId !== source.videoId))}
                      className="text-[#c0c0c0] hover:text-[#1a1a2e] transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                    {/* Manual paste area for videos without captions */}
                    {source.status === 'error' && source.showPaste && (
                      <div className="border-t border-[#f0ebe3] p-3">
                        <p className="text-xs text-[#8a8a9a] mb-2">
                          On YouTube: open the video → <strong>⋮</strong> menu → <strong>Show transcript</strong> → copy all text, paste below.
                        </p>
                        <textarea
                          rows={5}
                          value={source.pasteValue || ''}
                          onChange={(e) => setSources(prev => prev.map(s => s.videoId === source.videoId ? { ...s, pasteValue: e.target.value } : s))}
                          placeholder="Paste the transcript here…"
                          className="w-full border border-[#e5ded4] rounded-lg px-3 py-2 text-xs font-mono text-[#2a2a3a] outline-none focus:border-[#1a1a2e] resize-none bg-[#f9f6f0]"
                        />
                        <button
                          disabled={!source.pasteValue?.trim()}
                          onClick={() => setSources(prev => prev.map(s => s.videoId === source.videoId ? { ...s, transcript: s.pasteValue, status: 'ready', showPaste: false } : s))}
                          className="mt-2 text-xs font-semibold text-white bg-[#1a1a2e] px-3 py-1.5 rounded-lg disabled:opacity-40 hover:bg-[#2a2a3e] transition-colors"
                        >
                          Use this transcript
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Synthesize button */}
            {readySources.length >= 1 && !synthesis && (
              <button
                onClick={synthesize}
                disabled={synthesizing}
                className="w-full py-3.5 rounded-xl bg-[#ff6b35] text-white font-semibold text-sm hover:bg-[#e55a25] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {synthesizing ? (
                  <><Loader2 size={16} className="animate-spin" />Extracting ideas…</>
                ) : (
                  <><Zap size={16} />Synthesize {readySources.length} video{readySources.length > 1 ? 's' : ''} → Get Writing Brief</>
                )}
              </button>
            )}

            {synthError && (
              <p className="text-sm text-red-500 text-center">{synthError}</p>
            )}

            {/* Empty state */}
            {sources.length === 0 && (
              <div className="text-center py-16 text-[#8a8a9a] text-sm">
                <BookOpen size={24} className="mx-auto mb-3 opacity-30" />
                <p>No videos added yet.</p>
                <p className="mt-1">
                  <button
                    onClick={() => setTab('discover')}
                    className="text-[#ff6b35] hover:underline"
                  >
                    ← Discover videos first
                  </button>{' '}
                  or paste a YouTube URL above.
                </p>
              </div>
            )}

            {/* ── SYNTHESIS RESULT ── */}
            {synthesis && (
              <div className="space-y-4 mt-2">
                {/* Core idea */}
                <div className="bg-[#1a1a2e] text-white rounded-2xl p-6">
                  <p className="text-[10px] text-[#6a6a8a] uppercase tracking-widest mb-2">The Core Idea</p>
                  <p className="text-base leading-relaxed">{synthesis.coreIdea}</p>
                </div>

                {/* Key arguments */}
                <div className="bg-white rounded-2xl border border-[#e5ded4] p-6">
                  <p className="text-[10px] text-[#8a8a9a] uppercase tracking-widest mb-4">Key Arguments</p>
                  <ul className="space-y-3">
                    {synthesis.keyArguments.map((arg, i) => (
                      <li key={i} className="flex gap-3 text-sm text-[#2a2a3a] leading-relaxed">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-[#f5f0e8] text-[#ff6b35] flex items-center justify-center text-[11px] font-bold mt-0.5">
                          {i + 1}
                        </span>
                        {arg}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tensions */}
                {synthesis.tensions.length > 0 && (
                  <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6">
                    <p className="text-[10px] text-amber-600 uppercase tracking-widest mb-4">Tensions &amp; Nuances</p>
                    <ul className="space-y-3">
                      {synthesis.tensions.map((t, i) => (
                        <li key={i} className="text-sm text-[#2a2a3a] leading-relaxed flex gap-2">
                          <span className="text-amber-500 shrink-0 mt-0.5">⚡</span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Questions to hold */}
                <div className="bg-white rounded-2xl border border-[#e5ded4] p-6">
                  <p className="text-[10px] text-[#8a8a9a] uppercase tracking-widest mb-4">Questions to Hold</p>
                  <ul className="space-y-3">
                    {synthesis.questionsToHold.map((q, i) => (
                      <li key={i} className="text-sm text-[#2a2a3a] leading-relaxed flex gap-2">
                        <span className="text-[#1a1a2e] font-bold shrink-0 mt-0.5">?</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Writing prompt */}
                <div className="bg-[#ff6b35] rounded-2xl p-6 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={14} />
                    <p className="text-[10px] uppercase tracking-widest font-semibold">30-Minute Writing Prompt</p>
                  </div>
                  <p className="text-base font-medium leading-relaxed">{synthesis.writingPrompt}</p>
                  <p className="text-xs mt-4 text-white/60">Set a timer. Pen and paper. Don&apos;t stop writing.</p>
                </div>

                <button
                  onClick={() => { setSynthesis(null); setSources([]); setSynthError(''); }}
                  className="w-full py-2.5 rounded-xl border border-[#e5ded4] text-sm text-[#8a8a9a] hover:text-[#1a1a2e] hover:border-[#1a1a2e] transition-colors"
                >
                  Start fresh
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
