'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X, Loader2, Copy, Check, Sparkles, FileText, Search, RefreshCw,
  BookMarked, Send, Play, Link2, ArrowLeft, RotateCcw,
} from 'lucide-react';
import { BoardItem } from '@/lib/board-items';
import { getPrompts } from '@/lib/prompts';
import { renderMarkdown } from '@/lib/markdown';

interface Props {
  item: BoardItem;
  onClose: () => void;
}

const BOOST_ACTIONS = [
  { id: 'variations', icon: RefreshCw, label: 'Variations',         desc: 'Generate 3 powerful angles from this content' },
  { id: 'longform',   icon: FileText,  label: 'Expand to Longform', desc: 'Build a full article from this content' },
  { id: 'analyze',    icon: Search,    label: 'Reverse Engineer',   desc: 'Understand why it works — element by element' },
  { id: 'replicate',  icon: Sparkles,  label: 'Replicate',          desc: 'Extract the formula and apply it to a new topic' },
] as const;

const TEMPLATES = [
  { id: 'dailypost',      emoji: '📝', label: 'Daily Post',         desc: 'A publishable post built around your perspective' },
  { id: 'ideabank',       emoji: '💡', label: 'Idea Bank',          desc: 'Weeks of content ideas from your niche angle' },
  { id: 'scriptemulator', emoji: '🎬', label: 'Script Emulator',    desc: 'A script in your delivery style and voice' },
  { id: 'xposts',         emoji: '𝕏',  label: 'X Posts',            desc: '7 posts + thread that sound authentically like you' },
  { id: 'atomizer',       emoji: '⚛️', label: 'Content Atomizer',   desc: 'A week of platform content from your angle' },
  { id: 'linkedin',       emoji: '💼', label: 'LinkedIn Post',      desc: 'A post in your professional voice' },
  { id: 'thread',         emoji: '🧵', label: 'Thread',             desc: 'A thread built on your strongest perspective' },
] as const;

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-xs text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors px-2 py-1 rounded-lg border border-[#e5ded4] bg-white"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

type Mode = 'list' | 'result';

export default function BoostPanel({ item, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('list');
  const [activeAction, setActiveAction] = useState('');
  const [activeLabel, setActiveLabel] = useState('');
  const [finalOutput, setFinalOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // List-view extras
  const [showPrompts, setShowPrompts] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatResult, setChatResult] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const contentText = item.transcript || item.content || '';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [loading, finalOutput]);

  // ── API helpers ──────────────────────────────────────────────────────────────

  async function callGroq(body: object): Promise<string> {
    const res = await fetch('/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.result as string;
  }

  // ── Start action → instant generate ─────────────────────────────────────────

  async function startAction(id: string, label: string) {
    setActiveAction(id);
    setActiveLabel(label);
    setFinalOutput('');
    setError('');
    setMode('result');
    setLoading(true);
    try {
      const raw = await callGroq({
        action: id,
        content: contentText,
        title: item.title,
        transcript: item.transcript,
      });
      setFinalOutput(raw);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate');
    } finally {
      setLoading(false);
    }
  }

  // ── List-view quick chat ─────────────────────────────────────────────────────

  async function sendChat() {
    const q = chatInput.trim();
    if (!q || loading) return;
    setChatInput('');
    setLoading(true);
    try {
      const raw = await callGroq({
        action: 'chat',
        content: `USER QUESTION: ${q}\n\nCONTENT CONTEXT:\n${contentText || item.title}`,
        title: item.title,
      });
      setChatResult(raw);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function runSavedPrompt(promptText: string) {
    setShowPrompts(false);
    setActiveAction('chat');
    setActiveLabel('Your Prompt');
    setFinalOutput('');
    setError('');
    setMode('result');
    setLoading(true);
    callGroq({
      action: 'chat',
      content: `${promptText}\n\nContent:\n${contentText || item.title}`,
      title: item.title,
    }).then((raw) => {
      setFinalOutput(raw);
    }).catch((e) => {
      setError(e instanceof Error ? e.message : 'Failed');
    }).finally(() => setLoading(false));
  }

  function reset() {
    setMode('list');
    setFinalOutput('');
    setError('');
    setActiveAction('');
    setActiveLabel('');
  }

  const savedPrompts = getPrompts();

  // ── Render helpers ───────────────────────────────────────────────────────────

  const cardPreview = (
    <div className="mx-4 mt-4 flex gap-3 p-3 bg-[#f5f0e8] rounded-xl border border-[#e5ded4] shrink-0">
      {item.thumbnail ? (
        <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-[#1a1a2e]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.thumbnail} alt="" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          {item.videoId && <div className="absolute inset-0 flex items-center justify-center"><Play size={12} className="text-white fill-white" /></div>}
        </div>
      ) : (
        <div className="w-20 h-14 rounded-lg bg-white border border-[#e5ded4] flex items-center justify-center shrink-0">
          <Link2 size={16} className="text-[#ccc5b8]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1a1a2e] line-clamp-2">{item.title}</p>
        <p className="text-xs text-[#8a8a9a] mt-0.5">{item.platform}</p>
        {!(contentText.trim().length > 30) && (
          <p className="text-[10px] text-amber-600 mt-1">⚠ No content — AI will work from title only</p>
        )}
      </div>
    </div>
  );

  // ── RESULT VIEW ──────────────────────────────────────────────────────────────

  if (mode === 'result') {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
        <div className="fixed right-0 top-0 bottom-0 z-50 w-[440px] bg-white shadow-2xl flex flex-col overflow-hidden border-l border-[#e5ded4]">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f0ebe3] shrink-0">
            <button onClick={reset} className="text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
              <ArrowLeft size={16} />
            </button>
            <span className="font-semibold text-[#1a1a2e] text-sm flex-1">{activeLabel}</span>
            {finalOutput && <CopyBtn text={finalOutput} />}
            <button onClick={reset} title="Start over" className="text-[#8a8a9a] hover:text-[#ff6b35] transition-colors ml-1">
              <RotateCcw size={15} />
            </button>
            <button onClick={onClose} className="text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-[#8a8a9a] py-6 justify-center">
                <Loader2 size={16} className="animate-spin text-[#ff6b35]" />
                Generating…
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {finalOutput && (
              <div className="text-[#2a2a3a]">
                {renderMarkdown(finalOutput)}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      </>
    );
  }

  // ── LIST VIEW ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[420px] bg-white shadow-2xl flex flex-col overflow-hidden border-l border-[#e5ded4]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0ebe3] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#ff6b35] flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="font-semibold text-[#1a1a2e]">Boost</span>
          </div>
          <button onClick={onClose} className="text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
            <X size={18} />
          </button>
        </div>

        {cardPreview}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Boost actions */}
          <div>
            <p className="text-[11px] font-bold text-[#8a8a9a] uppercase tracking-wider mb-2">Boost</p>
            <div className="space-y-1">
              {BOOST_ACTIONS.map(({ id, icon: Icon, label, desc }) => (
                <button
                  key={id}
                  onClick={() => startAction(id, label)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-[#f5f0e8] border border-transparent transition-colors"
                >
                  <Icon size={16} className="text-[#ff6b35] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1a2e]">{label}</p>
                    <p className="text-xs text-[#8a8a9a]">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Templates */}
          <div>
            <p className="text-[11px] font-bold text-[#8a8a9a] uppercase tracking-wider mb-2">Templates</p>
            <div className="space-y-1">
              {TEMPLATES.map(({ id, emoji, label, desc }) => (
                <button
                  key={id}
                  onClick={() => startAction(id, label)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-[#f5f0e8] border border-transparent transition-colors"
                >
                  <span className="text-base shrink-0 w-5 text-center">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1a2e]">{label}</p>
                    <p className="text-xs text-[#8a8a9a]">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Saved prompts */}
          {savedPrompts.length > 0 && (
            <div>
              <button
                onClick={() => setShowPrompts(!showPrompts)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f5f0e8] border border-transparent text-left transition-colors"
              >
                <BookMarked size={16} className="text-[#ff6b35] shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1a1a2e]">Your Prompts</p>
                  <p className="text-xs text-[#8a8a9a]">Run a saved prompt on this content</p>
                </div>
                <span className="text-xs text-[#8a8a9a]">{showPrompts ? '▲' : '▶'}</span>
              </button>
              {showPrompts && (
                <div className="ml-9 space-y-1 mt-1">
                  {savedPrompts.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => runSavedPrompt(p.prompt)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#f5f0e8] text-xs text-[#3a3a4a] truncate transition-colors"
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick chat */}
          <div>
            <p className="text-[11px] font-bold text-[#8a8a9a] uppercase tracking-wider mb-2">Chat with this post</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Ask anything about this content…"
                className="flex-1 border border-[#e5ded4] rounded-xl px-3 py-2.5 text-sm text-[#1a1a2e] outline-none focus:border-[#ff6b35] bg-[#fafaf8]"
              />
              <button
                onClick={sendChat}
                disabled={!chatInput.trim() || loading}
                className="p-2.5 rounded-xl bg-[#ff6b35] text-white hover:bg-[#e85a24] disabled:opacity-40 transition-colors shrink-0"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
            {chatResult && (
              <div className="mt-3 rounded-xl border border-[#e5ded4] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-[#f5f0e8] border-b border-[#e5ded4]">
                  <span className="text-xs font-semibold text-[#1a1a2e]">Response</span>
                  <CopyBtn text={chatResult} />
                </div>
                <div className="p-4 text-sm text-[#2a2a3a] leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {chatResult}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
