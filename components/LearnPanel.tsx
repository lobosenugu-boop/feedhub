'use client';

import { useState } from 'react';
import {
  X, Loader2, Copy, Check, BookOpen, AlignLeft, Smile,
  Layers, HelpCircle, Target, Link2, Play, ChevronLeft, ChevronRight,
  Brain, RotateCcw, ChevronDown, ChevronUp,
  FileText, Lightbulb, Eraser, List, Sparkles, Search,
  GitBranch, Star, Network, Table2, Video, Mic, Bot, TrendingUp,
  MessageSquare, Filter, Zap, FileEdit, Columns, Bookmark, Hash,
  StickyNote,
} from 'lucide-react';
import { BoardItem } from '@/lib/board-items';

interface Props { item: BoardItem; onClose: () => void; }

// ── Parsing ───────────────────────────────────────────────────────────────────

interface Flashcard { q: string; a: string; }
interface QuizQuestion {
  question: string;
  options: { letter: string; text: string }[];
  correct: string;
  explanation: string;
}

function parseFlashcards(text: string): Flashcard[] {
  const cards: Flashcard[] = [];
  const blocks = text.split(/FLASHCARD\s+\d+/i).filter((b) => b.trim());
  for (const block of blocks) {
    const qMatch = block.match(/Q:\s*([\s\S]+?)(?=\nA:|\r\nA:)/i);
    const aMatch = block.match(/A:\s*([\s\S]+?)$/i);
    if (qMatch?.[1] && aMatch?.[1]) cards.push({ q: qMatch[1].trim(), a: aMatch[1].trim() });
  }
  if (cards.length === 0) {
    const qRe = /Q:\s*([\s\S]+?)(?=\nA:)/gi;
    const aRe = /A:\s*([\s\S]+?)(?=\nQ:|\n\n|$)/gi;
    const qs: string[] = [], as: string[] = [];
    let m;
    while ((m = qRe.exec(text)) !== null) qs.push(m[1].trim());
    while ((m = aRe.exec(text)) !== null) as.push(m[1].trim());
    for (let i = 0; i < Math.min(qs.length, as.length); i++) {
      if (qs[i] && as[i]) cards.push({ q: qs[i], a: as[i] });
    }
  }
  return cards;
}

function parseQuiz(text: string): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const blocks = text.split(/QUESTION\s+\d+:/i).filter((b) => b.trim());
  for (const block of blocks) {
    const questionMatch = block.match(/^([\s\S]+?)(?=\nA\)|\r\nA\))/i);
    const question = questionMatch?.[1]?.trim() ?? '';
    if (!question) continue;
    const options: { letter: string; text: string }[] = [];
    const optRe = /([A-D])\)\s*([\s\S]+?)(?=\n[A-D]\)|\nCORRECT:|$)/gi;
    let m;
    while ((m = optRe.exec(block)) !== null) options.push({ letter: m[1].toUpperCase(), text: m[2].trim() });
    const correctMatch = block.match(/CORRECT:\s*([A-D])/i);
    const correct = correctMatch?.[1]?.toUpperCase() ?? '';
    const explanationMatch = block.match(/EXPLANATION:\s*([\s\S]+?)$/i);
    const explanation = explanationMatch?.[1]?.trim() ?? '';
    if (question && options.length === 4) questions.push({ question, options, correct, explanation });
  }
  return questions;
}

function parseKeyPoints(text: string): { point: string; detail: string }[] {
  const items: { point: string; detail: string }[] = [];
  const blocks = text.split(/KEY POINT \d+:/i).filter((b) => b.trim());
  for (const block of blocks) {
    const pointMatch = block.match(/^([\s\S]+?)(?=\nDETAIL:|$)/i);
    const detailMatch = block.match(/DETAIL:\s*([\s\S]+?)$/i);
    const point = pointMatch?.[1]?.trim() ?? '';
    const detail = detailMatch?.[1]?.trim() ?? '';
    if (point) items.push({ point, detail });
  }
  return items;
}

// ── Flashcard Deck ────────────────────────────────────────────────────────────

function FlashcardDeck({ cards }: { cards: Flashcard[] }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  if (cards.length === 0) return <p className="text-sm text-[#8a8a9a] italic">Could not parse flashcards — try again.</p>;
  const card = cards[idx];
  const progress = (known.size / cards.length) * 100;
  function next() { setFlipped(false); setTimeout(() => setIdx((i) => Math.min(i + 1, cards.length - 1)), 100); }
  function prev() { setFlipped(false); setTimeout(() => setIdx((i) => Math.max(i - 1, 0)), 100); }
  function markKnown() { setKnown((k) => new Set(k).add(idx)); next(); }
  function reset() { setIdx(0); setFlipped(false); setKnown(new Set()); }
  const allDone = known.size === cards.length;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-[#8a8a9a]">Card {idx + 1} of {cards.length}</span>
        <span className="text-[11px] text-teal-600 font-medium">{known.size} / {cards.length} known</span>
      </div>
      <div className="h-1.5 bg-[#e5ded4] rounded-full mb-3 overflow-hidden">
        <div className="h-full bg-teal-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      {allDone ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-5 text-center">
          <p className="text-lg mb-1">🎉</p>
          <p className="text-sm font-semibold text-teal-700">You know all {cards.length} cards!</p>
          <button onClick={reset} className="mt-3 flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 mx-auto"><RotateCcw size={11} /> Reset deck</button>
        </div>
      ) : (
        <>
          <div
            onClick={() => setFlipped(!flipped)}
            className={`min-h-[130px] rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center text-center select-none ${flipped ? 'border-teal-400 bg-teal-50' : 'border-[#e5ded4] bg-white hover:border-teal-200'}`}
          >
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${flipped ? 'text-teal-500' : 'text-[#aaa]'}`}>{flipped ? 'Answer' : 'Question'}</p>
            <p className="text-sm text-[#1a1a2e] leading-relaxed font-medium">{flipped ? card.a : card.q}</p>
            {!flipped && <p className="text-[10px] text-[#ccc] mt-4">Tap to reveal</p>}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={prev} disabled={idx === 0} className="p-2 rounded-lg border border-[#e5ded4] hover:bg-[#f5f0e8] disabled:opacity-30 transition-colors"><ChevronLeft size={14} className="text-[#8a8a9a]" /></button>
            {flipped ? (
              <>
                <button onClick={markKnown} className="flex-1 py-2 rounded-lg bg-teal-500 text-white text-xs font-semibold hover:bg-teal-600 transition-colors">✓ Got it</button>
                <button onClick={next} disabled={idx === cards.length - 1} className="flex-1 py-2 rounded-lg border border-[#e5ded4] text-xs font-medium text-[#3a3a4a] hover:bg-[#f5f0e8] disabled:opacity-30 transition-colors">Skip →</button>
              </>
            ) : (
              <button onClick={() => setFlipped(true)} className="flex-1 py-2 rounded-lg bg-[#1a1a2e] text-white text-xs font-semibold hover:bg-[#2a2a3e] transition-colors">Reveal Answer</button>
            )}
            <button onClick={next} disabled={idx === cards.length - 1} className="p-2 rounded-lg border border-[#e5ded4] hover:bg-[#f5f0e8] disabled:opacity-30 transition-colors"><ChevronRight size={14} className="text-[#8a8a9a]" /></button>
          </div>
          <button onClick={reset} className="flex items-center gap-1 text-[10px] text-[#aaa] hover:text-[#8a8a9a] mt-2 mx-auto transition-colors"><RotateCcw size={9} /> Restart</button>
        </>
      )}
    </div>
  );
}

// ── Quiz ──────────────────────────────────────────────────────────────────────

function QuizComponent({ questions }: { questions: QuizQuestion[] }) {
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  if (questions.length === 0) return <p className="text-sm text-[#8a8a9a] italic">Could not parse quiz — try again.</p>;
  const q = questions[qIdx];
  const isCorrect = selected === q.correct;
  function reveal() { if (!selected) return; setRevealed(true); if (isCorrect) setScore((s) => s + 1); }
  function next() { if (qIdx + 1 >= questions.length) { setDone(true); return; } setQIdx((i) => i + 1); setSelected(null); setRevealed(false); }
  function reset() { setQIdx(0); setSelected(null); setRevealed(false); setScore(0); setDone(false); }
  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="rounded-xl border border-[#e5ded4] bg-white p-5 text-center">
        <p className="text-3xl mb-2">{pct >= 80 ? '🏆' : pct >= 60 ? '💪' : '📖'}</p>
        <p className="text-base font-bold text-[#1a1a2e]">{score} / {questions.length} correct</p>
        <p className="text-sm text-[#8a8a9a] mt-1">{pct >= 80 ? 'Excellent comprehension!' : pct >= 60 ? 'Good — review the ones you missed.' : 'Re-read and try again.'}</p>
        <button onClick={reset} className="mt-4 flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 mx-auto font-medium"><RotateCcw size={11} /> Retake quiz</button>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-[#8a8a9a]">Question {qIdx + 1} of {questions.length}</span>
        <span className="text-[11px] text-teal-600 font-medium">{score} correct</span>
      </div>
      <p className="text-sm font-semibold text-[#1a1a2e] mb-3 leading-relaxed">{q.question}</p>
      <div className="space-y-2">
        {q.options.map((opt) => {
          let style = 'border-[#e5ded4] bg-white hover:border-teal-300 hover:bg-teal-50';
          if (revealed) {
            if (opt.letter === q.correct) style = 'border-teal-500 bg-teal-50';
            else if (opt.letter === selected) style = 'border-red-400 bg-red-50';
            else style = 'border-[#e5ded4] bg-white opacity-60';
          } else if (selected === opt.letter) style = 'border-teal-400 bg-teal-50';
          return (
            <button key={opt.letter} onClick={() => !revealed && setSelected(opt.letter)} disabled={revealed}
              className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all text-sm ${style}`}>
              <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{opt.letter}</span>
              <span className="text-[#1a1a2e]">{opt.text}</span>
              {revealed && opt.letter === q.correct && <Check size={14} className="text-teal-500 ml-auto shrink-0 mt-0.5" />}
            </button>
          );
        })}
      </div>
      {revealed && q.explanation && (
        <div className="mt-3 p-3 rounded-lg bg-[#f5f0e8] border border-[#e5ded4]">
          <p className="text-[11px] font-bold text-[#8a8a9a] mb-1">EXPLANATION</p>
          <p className="text-xs text-[#3a3a4a] leading-relaxed">{q.explanation}</p>
        </div>
      )}
      <div className="flex gap-2 mt-3">
        {!revealed ? (
          <button onClick={reveal} disabled={!selected} className="flex-1 py-2 rounded-lg bg-[#1a1a2e] text-white text-xs font-semibold hover:bg-[#2a2a3e] disabled:opacity-30 transition-colors">Check Answer</button>
        ) : (
          <button onClick={next} className="flex-1 py-2 rounded-lg bg-teal-500 text-white text-xs font-semibold hover:bg-teal-600 transition-colors">{qIdx + 1 >= questions.length ? 'See Results' : 'Next Question →'}</button>
        )}
      </div>
    </div>
  );
}

// ── Key Points renderer ───────────────────────────────────────────────────────

function KeyPointsList({ points }: { points: { point: string; detail: string }[] }) {
  if (points.length === 0) return null;
  return (
    <div className="space-y-3">
      {points.map((p, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
          <div>
            <p className="text-sm font-semibold text-[#1a1a2e] leading-snug">{p.point}</p>
            {p.detail && <p className="text-xs text-[#6a6a7a] mt-0.5 leading-relaxed">{p.detail}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-xs text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors px-2 py-1 rounded-lg border border-[#e5ded4] bg-white"
    >
      {copied ? <Check size={12} className="text-teal-500" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ── Action catalogue ──────────────────────────────────────────────────────────

type ActionItem = { id: string; Icon: React.ElementType; label: string; desc?: string };
type Category = { id: string; Icon: React.ElementType; label: string; desc: string; items: ActionItem[] };

const POPULAR: ActionItem[] = [
  { id: 'summary',       Icon: FileText,   label: 'Summary',          desc: 'Comprehensive overview' },
  { id: 'keypoints',     Icon: Lightbulb,  label: 'Key Insights',     desc: 'Main takeaways' },
  { id: 'cleantranscript', Icon: Eraser,   label: 'Clean Transcript', desc: 'Remove filler words' },
  { id: 'propernotes',   Icon: BookOpen,   label: 'Proper Notes',     desc: 'Comprehensive notes' },
];

const CATEGORIES: Category[] = [
  {
    id: 'basic', Icon: FileText, label: 'Basic Content', desc: 'Summaries and transcripts',
    items: [
      { id: 'cleantranscript', Icon: Eraser,         label: 'Clean Transcript' },
      { id: 'microsummary',    Icon: MessageSquare,  label: 'Micro Summary' },
      { id: 'shortsummary',    Icon: AlignLeft,      label: 'Short Summary' },
      { id: 'bulletpoints',    Icon: List,           label: 'Bullet Points' },
      { id: 'summary',         Icon: FileText,       label: 'Summary' },
      { id: 'keypoints',       Icon: Lightbulb,      label: 'Key Insights' },
      { id: 'notablequotes',   Icon: Bookmark,       label: 'Notable Quotes' },
    ],
  },
  {
    id: 'analysis', Icon: TrendingUp, label: 'Analysis', desc: 'Deep insights and patterns',
    items: [
      { id: 'extractideas',    Icon: Sparkles,       label: 'Extract Ideas' },
      { id: 'extractinsights', Icon: Search,         label: 'Extract Insights' },
      { id: 'extractpatterns', Icon: GitBranch,      label: 'Extract Patterns' },
      { id: 'extractwisdom',   Icon: Star,           label: 'Extract Wisdom' },
      { id: 'whymatters',      Icon: Target,         label: 'Why It Matters' },
      { id: 'connections',     Icon: Network,        label: 'Connections' },
    ],
  },
  {
    id: 'study', Icon: Brain, label: 'Study & Education', desc: 'Learning and note-taking tools',
    items: [
      { id: 'flashcards',    Icon: Layers,         label: 'Flashcards' },
      { id: 'conceptmap',    Icon: Network,        label: 'Concept Map' },
      { id: 'qa',            Icon: HelpCircle,     label: 'Q&A' },
      { id: 'outlinenotes',  Icon: List,           label: 'Outline Notes' },
      { id: 'cornellnotes',  Icon: Columns,        label: 'Cornell Notes' },
      { id: 'rapidlogging',  Icon: Zap,            label: 'Rapid Logging' },
      { id: 'tnotemethod',   Icon: StickyNote,     label: 'T-Note Method' },
      { id: 'chartingmethod',Icon: Table2,         label: 'Charting Method' },
      { id: 'qecmethod',     Icon: Filter,         label: 'QEC Method' },
      { id: 'qasplitpage',   Icon: Layers,         label: 'Q&A Split Page' },
      { id: 'quiz',          Icon: HelpCircle,     label: 'Quiz Me' },
      { id: 'eli5',          Icon: Smile,          label: 'Explain Simply' },
    ],
  },
  {
    id: 'content', Icon: FileEdit, label: 'Content Creation', desc: 'Social media and blog content',
    items: [
      { id: 'viralclips',      Icon: Video,         label: 'Viral Clips' },
      { id: 'twitterideas',    Icon: Hash,          label: 'Twitter Ideas' },
      { id: 'linkedinarticle', Icon: FileEdit,      label: 'LinkedIn Article' },
      { id: 'xposts',          Icon: Hash,          label: 'Twitter X' },
      { id: 'blogarticle',     Icon: FileText,      label: 'Blog Article' },
      { id: 'blogoutline',     Icon: List,          label: 'Blog Outline' },
      { id: 'tweetideas',      Icon: MessageSquare, label: 'Tweet Ideas' },
      { id: 'linkedin',        Icon: Bookmark,      label: 'LinkedIn Post' },
      { id: 'thread',          Icon: MessageSquare, label: 'Twitter Thread' },
    ],
  },
  {
    id: 'specialized', Icon: Bot, label: 'Specialized', desc: 'Advanced analysis tools',
    items: [
      { id: 'speakerid',   Icon: Mic,         label: 'Speaker ID' },
      { id: 'aichecker',   Icon: Bot,         label: 'AI Checker' },
      { id: 'predictions', Icon: TrendingUp,  label: 'Predictions' },
      { id: 'references',  Icon: Link2,       label: 'References' },
      { id: 'mainidea',    Icon: Target,      label: 'Main Idea' },
      { id: 'propernotes', Icon: BookOpen,    label: 'Proper Notes' },
    ],
  },
];

function getAllLabel(id: string): string {
  for (const p of POPULAR) if (p.id === id) return p.label;
  for (const cat of CATEGORIES) for (const item of cat.items) if (item.id === id) return item.label;
  return id;
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function LearnPanel({ item, onClose }: Props) {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState('');
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const contentText = item.transcript || item.content || '';
  const hasContent = contentText.trim().length > 30;

  async function runAction(action: string) {
    setLoading(true);
    setResult('');
    setError('');
    setActiveAction(action);
    try {
      const res = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, content: contentText, title: item.title }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function toggleCategory(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function renderResult() {
    if (!result) return null;
    if (activeAction === 'flashcards') return <FlashcardDeck cards={parseFlashcards(result)} />;
    if (activeAction === 'quiz') return <QuizComponent questions={parseQuiz(result)} />;
    if (activeAction === 'keypoints') {
      const points = parseKeyPoints(result);
      if (points.length > 0) return <KeyPointsList points={points} />;
    }
    return <div className="text-sm text-[#2a2a3a] leading-relaxed whitespace-pre-wrap">{result}</div>;
  }

  // ── Popular tile ──
  function PopularTile({ id, Icon, label, desc }: ActionItem) {
    const isActive = activeAction === id && !loading;
    return (
      <button
        onClick={() => runAction(id)}
        disabled={loading}
        className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all disabled:opacity-50 ${
          isActive ? 'border-teal-400 bg-teal-50' : 'border-[#ffd5c2] bg-white hover:bg-[#fff8f5] hover:border-[#ff6b35]'
        }`}
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2.5 ${isActive ? 'bg-teal-100' : 'bg-[#fff0e8]'}`}>
          <Icon size={20} className={isActive ? 'text-teal-600' : 'text-[#ff6b35]'} />
        </div>
        <p className="text-xs font-bold text-[#1a1a2e] leading-tight">{label}</p>
        {desc && <p className="text-[10px] text-[#8a8a9a] mt-0.5 leading-tight">{desc}</p>}
        {loading && activeAction === id && <Loader2 size={11} className="animate-spin text-teal-500 mt-1" />}
      </button>
    );
  }

  // ── Category item tile ──
  function ItemTile({ id, Icon, label }: ActionItem) {
    const isActive = activeAction === id && !loading;
    return (
      <button
        onClick={() => runAction(id)}
        disabled={loading}
        className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition-all disabled:opacity-50 ${
          isActive ? 'border-teal-400 bg-teal-50' : 'border-[#e5ded4] bg-white hover:border-[#ff6b35] hover:bg-[#fff8f5]'
        }`}
      >
        {loading && activeAction === id
          ? <Loader2 size={16} className="animate-spin text-teal-500 mb-1" />
          : <Icon size={16} className={isActive ? 'text-teal-600' : 'text-[#ff6b35]'} />
        }
        <span className="text-[10px] text-[#1a1a2e] font-medium mt-1 leading-tight">{label}</span>
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-[460px] bg-[#fafaf8] shadow-2xl flex flex-col overflow-hidden border-l border-[#e5ded4]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0ebe3] bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center">
              <Brain size={14} className="text-white" />
            </div>
            <span className="font-semibold text-[#1a1a2e]">Learn</span>
          </div>
          <button onClick={onClose} className="text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Card preview */}
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
              <Brain size={16} className="text-[#ccc5b8]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1a1a2e] line-clamp-2">{item.title}</p>
            {!hasContent && <p className="text-[10px] text-amber-600 mt-1">⚠ No content — results will use title only</p>}
            {hasContent && <p className="text-[10px] text-teal-600 mt-1">✓ {item.transcript ? 'Transcript' : 'Article'} loaded ({Math.round(contentText.split(/\s+/).length / 100) * 100}+ words)</p>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Popular Features */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#fff0e8] flex items-center justify-center">
                <Zap size={14} className="text-[#ff6b35]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#1a1a2e] leading-tight">Popular Features</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {POPULAR.map((a) => <PopularTile key={a.id} {...a} />)}
            </div>
          </div>

          {/* Categories */}
          {CATEGORIES.map((cat) => {
            const isOpen = !collapsed.has(cat.id);
            return (
              <div key={cat.id} className="rounded-xl border border-[#e5ded4] overflow-hidden bg-white">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f0e8] transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#f5f0e8] flex items-center justify-center shrink-0">
                    <cat.Icon size={15} className="text-[#6a6a9a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1a1a2e] leading-tight">{cat.label}</p>
                    <p className="text-[11px] text-[#8a8a9a]">{cat.desc}</p>
                  </div>
                  {isOpen ? <ChevronUp size={15} className="text-[#8a8a9a] shrink-0" /> : <ChevronDown size={15} className="text-[#8a8a9a] shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 pt-1 border-t border-[#f0ebe3]">
                    <div className="grid grid-cols-4 gap-2">
                      {cat.items.map((a) => <ItemTile key={`${cat.id}-${a.id}`} {...a} />)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Result */}
          {(result || error || (loading && activeAction)) && (
            <div className="rounded-xl border border-[#e5ded4] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-teal-50 border-b border-teal-100">
                <span className="text-xs font-semibold text-teal-700">
                  {loading ? 'Generating…' : getAllLabel(activeAction)}
                </span>
                {result && !['flashcards', 'quiz'].includes(activeAction) && <CopyBtn text={result} />}
              </div>
              <div className="p-4 bg-white">
                {loading && <div className="flex items-center gap-2 text-sm text-[#8a8a9a]"><Loader2 size={14} className="animate-spin text-teal-500" />Working on it…</div>}
                {error && <p className="text-sm text-red-500">{error}</p>}
                {result && renderResult()}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
