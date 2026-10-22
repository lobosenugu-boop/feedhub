'use client';

import { useState } from 'react';
import { Loader2, Copy, Check, BookmarkPlus, RefreshCw, X, BookOpen } from 'lucide-react';
import { PromptItem } from '@/lib/types';
import { removeTimestamps, reformatTranscript, savePrompt } from '@/lib/prompts';
import { saveBoardItem, BoardItem } from '@/lib/board-items';

interface Meta {
  title: string;
  author: string;
  image?: string;
  platform: string;
  videoId?: string | null;
}

interface AnalysisResult {
  whyItWorked: string;
  formula: string;
  prompt: string;
}

interface SavedNote {
  title: string;
  content: string;
  wordCount: number;
}

async function callGroq(action: string, content: string, title: string, transcript?: string) {
  const res = await fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, content, title, transcript }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result as string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-md bg-white border border-[#e5ded4] text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  );
}

function Section({ title, content, accent }: { title: string; content: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? 'border-[#ff6b35] bg-[#fff8f5]' : 'border-[#e5ded4] bg-white'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#1a1a2e]">{title}</h3>
        <CopyButton text={content} />
      </div>
      <div className="text-sm text-[#2a2a3a] leading-relaxed whitespace-pre-wrap">{content}</div>
    </div>
  );
}

export default function ContentAnalyzer({
  onPromptSaved,
  boardId = 'default',
}: {
  onPromptSaved?: () => void;
  boardId?: string;
}) {
  const [url, setUrl] = useState('');
  const [meta, setMeta] = useState<Meta | null>(null);
  const [transcript, setTranscript] = useState('');
  const [manualTranscript, setManualTranscript] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [transcriptStatus, setTranscriptStatus] = useState<'idle' | 'fetching' | 'found' | 'failed'>('idle');
  const [analysisStep, setAnalysisStep] = useState<'idle' | 'running' | 'done'>('idle');
  const [currentStep, setCurrentStep] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [savedNote, setSavedNote] = useState<SavedNote | null>(null);
  const [showReader, setShowReader] = useState(false);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);

  const activeTranscript = showManual ? manualTranscript : transcript;

  async function fetchContent() {
    if (!url.trim()) return;
    setError('');
    setMeta(null);
    setTranscript('');
    setResult(null);
    setSaved(false);
    setSavedNote(null);
    setTranscriptStatus('fetching');

    try {
      const metaRes = await fetch(`/api/metadata?url=${encodeURIComponent(url.trim())}`);
      const metaData = await metaRes.json();
      if (metaData.error) throw new Error(metaData.error);
      setMeta(metaData);

      if (metaData.videoId) {
        const tRes = await fetch(`/api/transcript?videoId=${metaData.videoId}`);
        const tData = await tRes.json();
        if (tData.transcript) {
          setTranscript(tData.transcript);
          setTranscriptStatus('found');
        } else {
          setTranscriptStatus('failed');
          setShowManual(true);
        }
      } else {
        const rRes = await fetch(`/api/reader?url=${encodeURIComponent(url.trim())}`);
        const rData = await rRes.json();
        if (rData.content && rData.hasFullContent) {
          const stripped = rData.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          setTranscript(stripped);
          setTranscriptStatus('found');
        } else {
          setTranscriptStatus('failed');
          setShowManual(true);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch content');
      setTranscriptStatus('failed');
    }
  }

  async function runAnalysis() {
    const content = activeTranscript || meta?.title || '';
    if (!content.trim()) return;

    setAnalysisStep('running');
    setResult(null);
    setError('');

    try {
      setCurrentStep('Analyzing why it worked…');
      const whyItWorked = await callGroq('whyworks', content, meta?.title || '', content);

      setCurrentStep('Extracting content formula…');
      const formula = await callGroq('formula', content, meta?.title || '', content);

      setCurrentStep('Generating reusable AI prompt…');
      const prompt = await callGroq('generateprompt', `${whyItWorked}\n\n${formula}`, meta?.title || '');

      setResult({ whyItWorked, formula, prompt });
      setAnalysisStep('done');
      setCurrentStep('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
      setAnalysisStep('idle');
      setCurrentStep('');
    }
  }

  function handleSavePrompt() {
    if (!result) return;
    const item: PromptItem = {
      id: crypto.randomUUID(),
      title: meta?.title || url,
      sourceUrl: url,
      thumbnail: meta?.image,
      platform: meta?.platform,
      whyItWorked: result.whyItWorked,
      formula: result.formula,
      prompt: result.prompt,
      tags: [meta?.platform || 'general'],
      createdAt: new Date().toISOString(),
    };
    savePrompt(item);
    setSaved(true);
    onPromptSaved?.();
  }

  function handleSaveTranscript() {
    const content = manualTranscript.trim();
    if (!content) return;
    const title = meta?.title ? `Transcript: ${meta.title}` : 'Saved Transcript';
    const item: BoardItem = {
      id: crypto.randomUUID(),
      boardId,
      type: 'note',
      title,
      content,
      createdAt: new Date().toISOString(),
    };
    saveBoardItem(item);
    setSavedNote({
      title,
      content,
      wordCount: content.split(/\s+/).filter(Boolean).length,
    });
  }

  function reset() {
    setUrl('');
    setMeta(null);
    setTranscript('');
    setManualTranscript('');
    setShowManual(false);
    setTranscriptStatus('idle');
    setAnalysisStep('idle');
    setResult(null);
    setSaved(false);
    setError('');
    setCurrentStep('');
    setSavedNote(null);
  }

  const hasContent = activeTranscript.trim().length > 20 || (transcriptStatus === 'found' && transcript);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Content Analyzer</h1>
        <p className="text-sm text-[#8a8a9a] mt-1">
          Paste any YouTube video or post URL. We&apos;ll extract the transcript, decode why it went viral, and generate a reusable AI prompt.
        </p>
      </div>

      {/* URL input */}
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setMeta(null); setTranscript(''); setResult(null); setTranscriptStatus('idle'); }}
          onKeyDown={(e) => e.key === 'Enter' && fetchContent()}
          placeholder="Paste a YouTube, Substack, or any content URL…"
          className="flex-1 border border-[#e5ded4] rounded-xl px-4 py-3 text-sm text-[#1a1a2e] outline-none focus:border-[#ff6b35] bg-white"
        />
        <button
          onClick={fetchContent}
          disabled={!url.trim() || transcriptStatus === 'fetching'}
          className="px-5 py-3 rounded-xl bg-[#ff6b35] text-white text-sm font-semibold hover:bg-[#e85a24] disabled:opacity-40 transition-colors shrink-0"
        >
          {transcriptStatus === 'fetching' ? <Loader2 size={16} className="animate-spin" /> : 'Fetch →'}
        </button>
        {meta && (
          <button onClick={reset} className="p-3 rounded-xl border border-[#e5ded4] text-[#8a8a9a] hover:bg-[#f5f0e8]">
            <X size={16} />
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      {/* Content preview */}
      {meta && (
        <div className="flex gap-4 p-4 bg-white rounded-xl border border-[#e5ded4]">
          {meta.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={meta.image} alt="" className="w-28 h-18 object-cover rounded-lg shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-[#1a1a2e] line-clamp-2">{meta.title}</p>
            <p className="text-xs text-[#8a8a9a] mt-0.5">{meta.author} · {meta.platform}</p>
            <div className="mt-2 flex items-center gap-2">
              {transcriptStatus === 'found' && (
                <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  ✓ Transcript extracted ({transcript.split(' ').length.toLocaleString()} words)
                </span>
              )}
              {transcriptStatus === 'failed' && (
                <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  ⚠ No auto-transcript — paste it below
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transcript area */}
      {meta && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-[#1a1a2e]">
              {transcriptStatus === 'found' ? 'Transcript' : 'Paste Transcript'}
            </label>
            {transcriptStatus === 'found' && (
              <button
                onClick={() => setShowManual(!showManual)}
                className="text-xs text-[#8a8a9a] hover:text-[#ff6b35] transition-colors"
              >
                {showManual ? 'Use auto-transcript' : 'Paste my own instead'}
              </button>
            )}
          </div>

          {(transcriptStatus === 'failed' || showManual) ? (
            <div className="space-y-2">
              <textarea
                value={manualTranscript}
                onChange={(e) => setManualTranscript(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text/plain');
                  const { selectionStart, selectionEnd, value } = e.currentTarget;
                  setManualTranscript(value.slice(0, selectionStart) + removeTimestamps(pasted) + value.slice(selectionEnd));
                }}
                placeholder="Paste the transcript here… timestamps will be removed automatically."
                rows={8}
                className="w-full border border-[#e5ded4] rounded-xl px-4 py-3 text-sm text-[#1a1a2e] outline-none focus:border-[#ff6b35] resize-none bg-white font-mono"
              />
              {manualTranscript && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-green-600">
                    ✓ {manualTranscript.split(/\s+/).filter(Boolean).length.toLocaleString()} words ready for analysis
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setManualTranscript(removeTimestamps(manualTranscript))}
                      className="text-xs text-[#8a8a9a] hover:text-[#ff6b35] transition-colors"
                    >
                      Remove timestamps
                    </button>
                    <button
                      onClick={() => setManualTranscript(reformatTranscript(manualTranscript))}
                      className="text-xs text-[#8a8a9a] hover:text-[#ff6b35] transition-colors"
                    >
                      Reformat paragraphs
                    </button>
                    <button
                      onClick={handleSaveTranscript}
                      className="text-xs text-[#ff6b35] font-medium hover:underline"
                    >
                      Save transcript
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : transcript ? (
            <div className="relative">
              <div className="bg-[#f5f0e8] rounded-xl px-4 py-3 max-h-40 overflow-hidden text-xs text-[#4a4a5a] font-mono leading-relaxed">
                {transcript.slice(0, 600)}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#f5f0e8] to-transparent rounded-b-xl pointer-events-none" />
              <button
                onClick={() => setShowTranscriptModal(true)}
                className="mt-2 text-xs text-[#ff6b35] hover:underline font-medium"
              >
                View full transcript ({transcript.split(' ').length.toLocaleString()} words) →
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Saved transcript card */}
      {savedNote && (
        <button
          onClick={() => setShowReader(true)}
          className="w-full text-left rounded-xl border border-[#e5ded4] bg-white hover:border-[#ff6b35] hover:shadow-sm transition-all p-4 group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-[#f5f0e8] flex items-center justify-center">
                <BookOpen size={16} className="text-[#ff6b35]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1a1a2e] truncate">{savedNote.title}</p>
                <p className="text-xs text-[#8a8a9a]">{savedNote.wordCount.toLocaleString()} words · saved to board</p>
              </div>
            </div>
            <span className="shrink-0 text-xs text-[#ff6b35] opacity-0 group-hover:opacity-100 transition-opacity mt-1">
              Read full →
            </span>
          </div>
          <p className="text-xs text-[#6a6a7a] mt-3 leading-relaxed line-clamp-2">
            {savedNote.content.slice(0, 220)}…
          </p>
        </button>
      )}

      {/* Analyze button */}
      {meta && hasContent && analysisStep !== 'done' && (
        <button
          onClick={runAnalysis}
          disabled={analysisStep === 'running'}
          className="w-full py-3.5 rounded-xl bg-[#1a1a2e] text-white font-semibold text-sm hover:bg-[#2a2a3e] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {analysisStep === 'running' ? (
            <><Loader2 size={16} className="animate-spin" />{currentStep}</>
          ) : (
            '🔬 Analyze Why It Worked'
          )}
        </button>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[#1a1a2e]">Analysis Results</h2>
            <button
              onClick={runAnalysis}
              className="flex items-center gap-1.5 text-xs text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors"
            >
              <RefreshCw size={12} /> Re-analyze
            </button>
          </div>

          <Section title="🎯 Why It Worked" content={result.whyItWorked} />
          <Section title="🏗️ Content Formula & Template" content={result.formula} />

          <div className="rounded-xl border-2 border-[#ff6b35] bg-[#fff8f5] p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1a1a2e]">🤖 Reusable AI Prompt</h3>
                <p className="text-[11px] text-[#8a8a9a] mt-0.5">Use this prompt to create content that replicates this success</p>
              </div>
              <CopyButton text={result.prompt} />
            </div>
            <div className="text-sm text-[#2a2a3a] leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-4 border border-[#ffd5c2]">
              {result.prompt}
            </div>
            <button
              onClick={handleSavePrompt}
              disabled={saved}
              className={`mt-4 w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                saved
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-[#ff6b35] text-white hover:bg-[#e85a24]'
              }`}
            >
              <BookmarkPlus size={15} />
              {saved ? 'Saved to Prompt Library ✓' : 'Save to Prompt Library'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!meta && (
        <div className="text-center py-16 text-[#8a8a9a]">
          <div className="text-5xl mb-4">🔬</div>
          <p className="font-semibold text-[#1a1a2e] text-lg mb-2">Paste any content URL above</p>
          <p className="text-sm max-w-sm mx-auto leading-relaxed">
            YouTube videos, Substack posts, articles — we&apos;ll extract the transcript, analyze why it worked, and give you a prompt to replicate it.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {['YouTube video', 'Substack post', 'Blog article', 'Any URL'].map((t) => (
              <span key={t} className="text-xs bg-white border border-[#e5ded4] px-3 py-1.5 rounded-full text-[#8a8a9a]">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Full transcript modal (auto-fetched, pre-save) */}
      {showTranscriptModal && transcript && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowTranscriptModal(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col mt-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-8 py-5 border-b border-[#f0ebe3] shrink-0">
              <div>
                <h2 className="font-semibold text-[#1a1a2e]">{meta?.title || 'Transcript'}</h2>
                <p className="text-xs text-[#8a8a9a] mt-0.5">{transcript.split(' ').length.toLocaleString()} words</p>
              </div>
              <button onClick={() => setShowTranscriptModal(false)} className="text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-12 py-8">
              <div className="text-[15px] text-[#2a2a3a] leading-[1.85] whitespace-pre-wrap">{transcript}</div>
            </div>
          </div>
        </div>
      )}

      {/* Full transcript reader modal */}
      {showReader && savedNote && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowReader(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col mt-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Reader header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-[#f0ebe3] shrink-0">
              <div>
                <h2 className="font-semibold text-[#1a1a2e]">{savedNote.title}</h2>
                <p className="text-xs text-[#8a8a9a] mt-0.5">{savedNote.wordCount.toLocaleString()} words</p>
              </div>
              <button onClick={() => setShowReader(false)} className="text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
                <X size={18} />
              </button>
            </div>
            {/* Reader body */}
            <div className="flex-1 overflow-y-auto px-12 py-8">
              <div className="text-[15px] text-[#2a2a3a] leading-[1.85] whitespace-pre-wrap">
                {savedNote.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
