'use client';

import { useState } from 'react';
import { X, Sparkles, Copy, Check, ChevronRight } from 'lucide-react';
import { Post } from '@/lib/types';

type Tab = 'create' | 'analyze' | 'transcript';

const CREATE_ACTIONS = [
  { id: 'summarize', label: 'Summarize', icon: '📋' },
  { id: 'linkedin', label: 'LinkedIn Post', icon: '💼' },
  { id: 'thread', label: 'X Thread', icon: '🧵' },
  { id: 'variations', label: '3 Angles', icon: '🎯' },
  { id: 'improve', label: 'Improve', icon: '✨' },
];

interface AIPanelProps {
  post: Post & { videoId?: string };
  onClose: () => void;
}

function ResultBox({ text, loading }: { text: string; loading: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#8a8a9a] py-10 justify-center">
        <div className="w-4 h-4 border-2 border-[#ff6b35] border-t-transparent rounded-full animate-spin" />
        Generating with Groq AI…
      </div>
    );
  }
  if (!text) return null;

  return (
    <div className="relative bg-[#f5f0e8] rounded-xl p-4 text-sm text-[#1a1a2e] leading-relaxed whitespace-pre-wrap">
      {text}
      <button
        onClick={copy}
        className="absolute top-3 right-3 p-1.5 bg-white rounded-md border border-[#e5ded4] text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors"
        title="Copy"
      >
        {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

export default function AIPanel({ post, onClose }: AIPanelProps) {
  const [tab, setTab] = useState<Tab>('analyze');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState('');
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState('');
  const [transcriptFetched, setTranscriptFetched] = useState(false);

  async function runGroq(action: string, extraTranscript?: string) {
    setLoading(true);
    setActiveAction(action);
    setResult('');
    setError('');
    try {
      const res = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          title: post.title,
          content: post.excerpt || post.title,
          transcript: extraTranscript || transcript || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data.result);
    } catch {
      setError('Request failed. Check your network connection.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchTranscript() {
    if (!post.videoId) return;
    setTranscriptLoading(true);
    setTranscriptError('');
    try {
      const res = await fetch(`/api/transcript?videoId=${post.videoId}`);
      const data = await res.json();
      if (data.transcript) {
        setTranscript(data.transcript);
        setTranscriptFetched(true);
      } else {
        setTranscriptError(data.error || 'No captions available for this video');
      }
    } catch {
      setTranscriptError('Could not fetch transcript');
    } finally {
      setTranscriptLoading(false);
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'analyze', label: '🔍 Analyze' },
    { id: 'create', label: '✍️ Create' },
    ...(post.videoId ? [{ id: 'transcript' as Tab, label: '📜 Transcript' }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5ded4]">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#ff6b35]" />
            <span className="font-semibold text-sm text-[#1a1a2e]">AI Tools</span>
          </div>
          <button onClick={onClose} className="text-[#8a8a9a] hover:text-[#1a1a2e]">
            <X size={18} />
          </button>
        </div>

        {/* Post preview */}
        <div className="px-5 py-3 border-b border-[#e5ded4] bg-[#f5f0e8]">
          <p className="text-xs font-medium text-[#1a1a2e] line-clamp-2">{post.title}</p>
          <p className="text-[11px] text-[#8a8a9a] mt-0.5">{post.platform}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#e5ded4] px-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setResult(''); setError(''); }}
              className={`py-2.5 mr-4 text-xs font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-[#ff6b35] text-[#ff6b35]'
                  : 'border-transparent text-[#8a8a9a] hover:text-[#1a1a2e]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">

          {/* ANALYZE TAB */}
          {tab === 'analyze' && (
            <div className="p-5 space-y-3">
              <p className="text-xs text-[#8a8a9a]">Break down what makes this content work.</p>
              <button
                onClick={() => runGroq('analyze')}
                disabled={loading}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#e5ded4] hover:border-[#ff6b35] hover:bg-[#fff8f5] transition-all group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔬</span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[#1a1a2e]">Full Viral Analysis</p>
                    <p className="text-[11px] text-[#8a8a9a]">Hook · Structure · Why it works · Template</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#8a8a9a] group-hover:text-[#ff6b35]" />
              </button>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">{error}</div>
              )}
              {(result || loading) && activeAction === 'analyze' && (
                <ResultBox text={result} loading={loading} />
              )}

              {!result && !loading && !error && (
                <div className="mt-6 space-y-2">
                  <p className="text-[11px] text-[#8a8a9a] font-medium uppercase tracking-wide">What you&apos;ll get</p>
                  {[
                    ['🎣', 'Hook analysis', 'Why the opening grabs attention'],
                    ['🏗️', 'Structure breakdown', 'How the content is organized'],
                    ['🧠', 'Why it works', '3 psychological principles'],
                    ['📋', 'Reusable template', 'Fill-in-the-blank outline'],
                    ['📊', 'Virality score', '1–10 with explanation'],
                  ].map(([icon, title, desc]) => (
                    <div key={title} className="flex items-start gap-2.5 py-1.5">
                      <span className="text-base mt-0.5">{icon}</span>
                      <div>
                        <p className="text-xs font-medium text-[#1a1a2e]">{title}</p>
                        <p className="text-[11px] text-[#8a8a9a]">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CREATE TAB */}
          {tab === 'create' && (
            <div className="p-5">
              <p className="text-xs text-[#8a8a9a] mb-3">Repurpose this content for different platforms.</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {CREATE_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => runGroq(action.id)}
                    disabled={loading}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      activeAction === action.id && result
                        ? 'bg-[#ff6b35] text-white border-[#ff6b35]'
                        : 'border-[#e5ded4] text-[#1a1a2e] hover:border-[#ff6b35] hover:text-[#ff6b35] bg-white'
                    } disabled:opacity-50`}
                  >
                    <span>{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">{error}</div>
              )}
              {(result || loading) && (
                <ResultBox text={result} loading={loading} />
              )}
              {!loading && !result && !error && (
                <div className="text-center py-10 text-[#8a8a9a]">
                  <Sparkles size={28} className="mx-auto mb-2 text-[#e5ded4]" />
                  <p className="text-sm">Pick a format above</p>
                  <p className="text-xs mt-1">Powered by Groq (free)</p>
                </div>
              )}
            </div>
          )}

          {/* TRANSCRIPT TAB (YouTube only) */}
          {tab === 'transcript' && (
            <div className="p-5 space-y-3">
              {!transcriptFetched ? (
                <>
                  <p className="text-xs text-[#8a8a9a]">
                    Fetch the auto-generated transcript for this YouTube video, then run AI analysis on the full content.
                  </p>
                  <button
                    onClick={fetchTranscript}
                    disabled={transcriptLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1a1a2e] text-white text-sm font-medium hover:bg-[#2a2a3e] transition-colors disabled:opacity-50"
                  >
                    {transcriptLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Fetching transcript…
                      </>
                    ) : (
                      '📜 Get Transcript'
                    )}
                  </button>
                  {transcriptError && (
                    <p className="text-xs text-red-500">{transcriptError}</p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-green-600 font-medium">✓ Transcript fetched</span>
                    <span className="text-xs text-[#8a8a9a]">({transcript.split(' ').length.toLocaleString()} words)</span>
                  </div>
                  <div className="bg-[#f5f0e8] rounded-xl p-3 max-h-40 overflow-y-auto text-xs text-[#8a8a9a] leading-relaxed">
                    {transcript.slice(0, 500)}…
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => runGroq('analyze', transcript)}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#e5ded4] text-[#1a1a2e] hover:border-[#ff6b35] hover:text-[#ff6b35] bg-white disabled:opacity-50 transition-all"
                    >
                      🔬 Full Analysis
                    </button>
                    <button
                      onClick={() => runGroq('transcript', transcript)}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#e5ded4] text-[#1a1a2e] hover:border-[#ff6b35] hover:text-[#ff6b35] bg-white disabled:opacity-50 transition-all"
                    >
                      📋 Structured Breakdown
                    </button>
                    <button
                      onClick={() => runGroq('summarize', transcript)}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#e5ded4] text-[#1a1a2e] hover:border-[#ff6b35] hover:text-[#ff6b35] bg-white disabled:opacity-50 transition-all"
                    >
                      📋 Summarize
                    </button>
                    <button
                      onClick={() => runGroq('linkedin', transcript)}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#e5ded4] text-[#1a1a2e] hover:border-[#ff6b35] hover:text-[#ff6b35] bg-white disabled:opacity-50 transition-all"
                    >
                      💼 LinkedIn Post
                    </button>
                  </div>
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">{error}</div>
                  )}
                  {(result || loading) && (
                    <ResultBox text={result} loading={loading} />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
