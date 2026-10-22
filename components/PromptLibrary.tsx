'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Trash2, ExternalLink, Search, Plus, X } from 'lucide-react';
import { PromptItem } from '@/lib/types';
import { getPrompts, deletePrompt, savePrompt } from '@/lib/prompts';

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#e5ded4] bg-white text-[#8a8a9a] hover:text-[#1a1a2e] hover:border-[#1a1a2e] transition-colors"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      {label || (copied ? 'Copied!' : 'Copy')}
    </button>
  );
}

interface PromptCardProps {
  item: PromptItem;
  onDelete: (id: string) => void;
}

function PromptCard({ item, onDelete }: PromptCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-[#e5ded4] overflow-hidden">
      {/* Header */}
      <div
        className="flex gap-3 p-4 cursor-pointer hover:bg-[#fafaf8] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {item.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail}
            alt=""
            className="w-16 h-11 object-cover rounded-lg shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1a1a2e] line-clamp-2">{item.title}</p>
          <div className="flex items-center gap-2 mt-1">
            {item.platform && (
              <span className="text-[11px] bg-[#f5f0e8] text-[#8a8a9a] px-2 py-0.5 rounded-full">
                {item.platform}
              </span>
            )}
            <span className="text-[11px] text-[#8a8a9a]">
              {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="text-[#8a8a9a] shrink-0 mt-0.5">
          <span className="text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Prompt preview (always visible) */}
      <div className="px-4 pb-3">
        <div className="bg-[#fff8f5] border border-[#ffd5c2] rounded-lg p-3 text-xs text-[#2a2a3a] leading-relaxed line-clamp-3">
          {item.prompt}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <CopyButton text={item.prompt} label="Copy Prompt" />
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#e5ded4] text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={12} />
              Source
            </a>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="ml-auto flex items-center gap-1 text-xs text-[#8a8a9a] hover:text-red-500 transition-colors px-2 py-1.5"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Expanded — why it worked + formula */}
      {expanded && (
        <div className="border-t border-[#f0ebe3] mx-4 mb-4 pt-4 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-bold text-[#1a1a2e]">🎯 Why It Worked</h4>
              <CopyButton text={item.whyItWorked} />
            </div>
            <p className="text-xs text-[#4a4a5a] leading-relaxed whitespace-pre-wrap">{item.whyItWorked}</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-bold text-[#1a1a2e]">🏗️ Content Formula</h4>
              <CopyButton text={item.formula} />
            </div>
            <p className="text-xs text-[#4a4a5a] leading-relaxed whitespace-pre-wrap">{item.formula}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = { title: '', prompt: '', whyItWorked: '', formula: '', sourceUrl: '', tags: '' };

function AddPromptModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  function set(field: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.prompt.trim()) { setError('Prompt text is required.'); return; }
    const item: PromptItem = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      prompt: form.prompt.trim(),
      whyItWorked: form.whyItWorked.trim() || '—',
      formula: form.formula.trim() || '—',
      sourceUrl: form.sourceUrl.trim() || undefined,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    };
    savePrompt(item);
    onSave();
    onClose();
  }

  const field = 'w-full border border-[#e5ded4] rounded-xl px-4 py-2.5 text-sm text-[#1a1a2e] outline-none focus:border-[#ff6b35] bg-white placeholder:text-[#b0b0c0]';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-[#fafaf8] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5ded4] bg-white shrink-0">
          <div className="flex items-center gap-2">
            <Plus size={15} className="text-[#ff6b35]" />
            <span className="font-semibold text-sm text-[#1a1a2e]">Add Prompt</span>
          </div>
          <button onClick={onClose} className="text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1a1a2e] mb-1.5">Title <span className="text-[#ff6b35]">*</span></label>
            <input className={field} placeholder="e.g. Hook Formula for Short-form Video" value={form.title} onChange={set('title')} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1a1a2e] mb-1.5">Prompt <span className="text-[#ff6b35]">*</span></label>
            <textarea
              className={`${field} resize-none`}
              rows={6}
              placeholder="Paste the full prompt here…"
              value={form.prompt}
              onChange={set('prompt')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1a1a2e] mb-1.5">Why It Works <span className="text-[#8a8a9a] font-normal">(optional)</span></label>
            <textarea
              className={`${field} resize-none`}
              rows={3}
              placeholder="Explain the psychology or mechanics behind this prompt…"
              value={form.whyItWorked}
              onChange={set('whyItWorked')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1a1a2e] mb-1.5">Content Formula <span className="text-[#8a8a9a] font-normal">(optional)</span></label>
            <textarea
              className={`${field} resize-none`}
              rows={3}
              placeholder="Describe the repeatable structure or template…"
              value={form.formula}
              onChange={set('formula')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1a1a2e] mb-1.5">Source URL <span className="text-[#8a8a9a] font-normal">(optional)</span></label>
            <input className={field} placeholder="https://…" value={form.sourceUrl} onChange={set('sourceUrl')} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1a1a2e] mb-1.5">Tags <span className="text-[#8a8a9a] font-normal">(optional, comma-separated)</span></label>
            <input className={field} placeholder="hooks, storytelling, persuasion" value={form.tags} onChange={set('tags')} />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#e5ded4] text-sm text-[#8a8a9a] hover:text-[#1a1a2e] hover:border-[#1a1a2e] transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-[#ff6b35] text-white text-sm font-semibold hover:bg-[#e85a24] transition-colors">
              Save Prompt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PromptLibrary({ refreshKey }: { refreshKey?: number }) {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  function reload() { setPrompts(getPrompts()); }

  useEffect(() => { reload(); }, [refreshKey]);

  function handleDelete(id: string) {
    deletePrompt(id);
    reload();
  }

  const filtered = prompts.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.prompt.toLowerCase().includes(q) ||
      (p.platform || '').toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Prompt Library</h1>
          <p className="text-sm text-[#8a8a9a] mt-1">
            Saved AI prompts extracted from viral content. Copy and use them anywhere.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff6b35] text-white text-sm font-medium hover:bg-[#e85a24] transition-colors"
        >
          <Plus size={14} />
          Add Prompt
        </button>
      </div>

      {prompts.length > 0 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8a9a]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts…"
            className="w-full pl-9 pr-4 py-2.5 border border-[#e5ded4] rounded-xl text-sm text-[#1a1a2e] outline-none focus:border-[#ff6b35] bg-white"
          />
        </div>
      )}

      {prompts.length === 0 ? (
        <div className="text-center py-20 text-[#8a8a9a]">
          <div className="text-5xl mb-4">📚</div>
          <p className="font-semibold text-[#1a1a2e] text-lg mb-2">No saved prompts yet</p>
          <p className="text-sm max-w-xs mx-auto leading-relaxed mb-6">
            Use the Analyzer to decode viral content, or add your own prompts manually.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#ff6b35] text-white text-sm font-medium hover:bg-[#e85a24] transition-colors"
          >
            <Plus size={14} />
            Add Your First Prompt
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#8a8a9a]">
          <p className="font-medium">No prompts match &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-[#8a8a9a]">{filtered.length} prompt{filtered.length !== 1 ? 's' : ''}</p>
          {filtered.map((item) => (
            <PromptCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showAdd && <AddPromptModal onClose={() => setShowAdd(false)} onSave={reload} />}
    </div>
  );
}
