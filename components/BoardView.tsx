'use client';

import { useState, useEffect } from 'react';
import { Trash2, Link2, FileText, Plus, Search, ChevronDown, ChevronUp, Play, Zap, Pencil, Network, Brain, FlaskConical, X as XIcon, ScrollText, Video } from 'lucide-react';

import { BoardItem, getBoardItems, saveBoardItem, deleteBoardItem, updateBoardItem } from '@/lib/board-items';
import { removeTimestamps, reformatTranscript } from '@/lib/prompts';
import AddItemModal from '@/components/AddItemModal';
import BoostPanel from '@/components/BoostPanel';
import LearnPanel from '@/components/LearnPanel';
import NoteEditor from '@/components/NoteEditor';
import MindMapEditor, { MindMapPreview, parseMindMap } from '@/components/MindMapEditor';
import ContentAnalyzer from '@/components/ContentAnalyzer';

function isHtml(text: string) {
  return /<[a-z][\s\S]*>/i.test(text);
}

// ── Link Card ─────────────────────────────────────────────────────────────────

function LinkCard({ item, onDelete, onBoost, onLearn, onProcess }: { item: BoardItem; onDelete: () => void; onBoost: () => void; onLearn: () => void; onProcess: () => void }) {
  const [showContent, setShowContent] = useState(false);
  const isYouTube = !!item.videoId;
  const readableText = item.transcript || item.content;
  const readableLabel = item.transcript ? 'transcript' : 'content';
  const displayText = readableText ? removeTimestamps(readableText) : null;

  return (
    <div className="group bg-white rounded-xl border border-[#e5ded4] overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {item.url ? (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="block shrink-0">
          {item.thumbnail ? (
            <div className="relative w-full aspect-video overflow-hidden bg-[#1a1a2e]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumbnail}
                alt=""
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              {isYouTube && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                    <Play size={20} className="text-white fill-white translate-x-0.5" />
                  </div>
                </div>
              )}
              {readableText && (
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-medium shadow capitalize">
                    {readableLabel}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full aspect-video bg-[#f5f0e8] flex items-center justify-center">
              <Link2 size={28} className="text-[#ccc5b8]" />
            </div>
          )}
        </a>
      ) : item.thumbnail ? (
        <div className="relative w-full aspect-video overflow-hidden bg-[#1a1a2e] shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {readableText && (
            <div className="absolute top-2 right-2">
              <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-medium shadow capitalize">
                {readableLabel}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full aspect-video bg-[#f5f0e8] flex items-center justify-center shrink-0">
          <Link2 size={28} className="text-[#ccc5b8]" />
        </div>
      )}

      <div className="p-3 flex flex-col flex-1">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-[#1a1a2e] line-clamp-2 mb-1 hover:text-[#ff6b35] transition-colors"
          >
            {item.title}
          </a>
        ) : (
          <p className="text-sm font-semibold text-[#1a1a2e] line-clamp-2 mb-1">{item.title}</p>
        )}
        <div className="flex items-center gap-2 mb-2">
          {item.platform && (
            <span className="text-[11px] bg-[#f5f0e8] text-[#8a8a9a] px-2 py-0.5 rounded-full shrink-0">
              {item.platform}
            </span>
          )}
          {item.author && item.author !== item.platform && (
            <span className="text-[11px] text-[#8a8a9a] truncate">{item.author}</span>
          )}
        </div>

        {readableText ? (
          <div className="mt-auto">
            <button
              onClick={() => setShowContent(!showContent)}
              className="flex items-center gap-1 text-xs text-[#ff6b35] hover:text-[#e85a24] font-medium transition-colors mb-1"
            >
              {showContent ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showContent ? `Hide ${readableLabel}` : `View ${readableLabel}`}
            </button>
            {showContent && (
              <div className="bg-[#f5f0e8] rounded-lg p-2.5 max-h-56 overflow-y-auto text-xs text-[#3a3a4a] leading-relaxed whitespace-pre-wrap mb-2">
                {displayText}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-auto text-[11px] text-[#b0b0c0] italic">No content extracted — try the Analyzer</p>
        )}

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f0ebe3]">
          <div className="flex items-center gap-1">
            <button
              onClick={onBoost}
              className="flex items-center gap-1 text-xs font-medium text-[#ff6b35] hover:text-[#e85a24] px-2 py-1 rounded-lg hover:bg-[#fff8f5] transition-colors"
            >
              <Zap size={12} className="fill-[#ff6b35]" />
              Boost
            </button>
            <button
              onClick={onLearn}
              className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 px-2 py-1 rounded-lg hover:bg-teal-50 transition-colors"
            >
              <Brain size={12} />
              Learn
            </button>
            <button
              onClick={onProcess}
              className="flex items-center gap-1 text-xs font-medium text-[#6a6a9a] hover:text-[#1a1a2e] px-2 py-1 rounded-lg hover:bg-[#f0ebe3] transition-colors"
            >
              <ScrollText size={12} />
              Process
            </button>
          </div>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-[#8a8a9a] hover:text-red-500 transition-all px-2 py-1 rounded-lg hover:bg-red-50"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Note Card ─────────────────────────────────────────────────────────────────

function NoteCard({ item, onDelete, onEdit, onLearn, onProcess }: {
  item: BoardItem; onDelete: () => void; onEdit: () => void; onLearn: () => void; onProcess: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayContent = item.content ?? '';
  const contentIsHtml = isHtml(displayContent);
  const isLong = displayContent.length > 300;

  return (
    <div className="group bg-[#fffdf7] rounded-xl border border-[#e8e2d4] p-4 hover:shadow-md transition-shadow flex flex-col">
      {item.title && displayContent && item.title !== displayContent.replace(/<[^>]+>/g, '').slice(0, 60) && (
        <p className="text-sm font-semibold text-[#1a1a2e] mb-2">{item.title}</p>
      )}

      {displayContent ? (
        <div className="relative">
          {contentIsHtml ? (
            <div
              className={`text-sm text-[#3a3a4a] leading-relaxed note-body ${!expanded ? 'max-h-44 overflow-hidden' : ''}`}
              dangerouslySetInnerHTML={{ __html: displayContent }}
            />
          ) : (
            <p className="text-sm text-[#3a3a4a] leading-relaxed whitespace-pre-wrap">
              {expanded ? displayContent : displayContent.slice(0, 300)}{!expanded && isLong ? '…' : ''}
            </p>
          )}
          {!expanded && isLong && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#fffdf7] to-transparent pointer-events-none" />
          )}
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-[#ff6b35] hover:text-[#e85a24] font-medium mt-2 transition-colors"
            >
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm font-semibold text-[#1a1a2e]">{item.title}</p>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#ede7d8]">
        <div className="flex items-center gap-1">
          <button
            onClick={onLearn}
            className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 px-2 py-1 rounded-lg hover:bg-teal-50 transition-colors"
          >
            <Brain size={11} /> Learn
          </button>
          <button
            onClick={onProcess}
            className="flex items-center gap-1 text-xs font-medium text-[#6a6a9a] hover:text-[#1a1a2e] px-2 py-1 rounded-lg hover:bg-[#f0ebe3] transition-colors"
          >
            <ScrollText size={11} /> Process
          </button>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="flex items-center gap-1 text-xs text-[#8a8a9a] hover:text-[#ff6b35] px-2 py-1 rounded-lg hover:bg-[#fff8f5] transition-all"
          >
            <Pencil size={11} /> Edit
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1 text-xs text-[#8a8a9a] hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-all"
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mind Map Card ─────────────────────────────────────────────────────────────

function MindMapCard({ item, onDelete, onEdit }: { item: BoardItem; onDelete: () => void; onEdit: () => void }) {
  const root = item.content ? parseMindMap(item.content) : null;
  const branchCount = root ? (function count(n: typeof root): number {
    return n!.children.reduce((s, c) => s + 1 + count(c), 0);
  })(root) : 0;

  return (
    <div className="group bg-white rounded-xl border border-[#e5ded4] overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Mini SVG preview */}
      <div className="w-full aspect-video bg-[#f5f0e8] flex items-center justify-center overflow-hidden shrink-0">
        {root ? (
          <div className="w-full h-full p-1">
            <MindMapPreview root={root} />
          </div>
        ) : (
          <Network size={28} className="text-[#ccc5b8]" />
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <p className="text-sm font-semibold text-[#1a1a2e] line-clamp-1 mb-1">{item.title}</p>
        <p className="text-[11px] text-[#8a8a9a]">{branchCount} branch{branchCount !== 1 ? 'es' : ''}</p>

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#f0ebe3] mt-3">
          <button
            onClick={onEdit}
            className="flex items-center gap-1 text-xs font-medium text-[#ff6b35] hover:text-[#e85a24] px-2 py-1 rounded-lg hover:bg-[#fff8f5] transition-colors"
          >
            <Pencil size={11} /> Edit map
          </button>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-[#8a8a9a] hover:text-red-500 transition-all px-2 py-1 rounded-lg hover:bg-red-50"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: (type: 'link' | 'note' | 'mindmap') => void }) {
  return (
    <div className="flex items-start justify-center pt-12 px-6">
      <div className="w-full max-w-md">
        <div className="border-2 border-dashed border-[#e5ded4] rounded-2xl p-8">
          <h2 className="text-lg font-bold text-[#1a1a2e] mb-1">Add To This Board</h2>
          <p className="text-sm text-[#8a8a9a] mb-6">New items will land here in a tidy grid.</p>

          <div className="space-y-1">
            <button
              onClick={() => onAdd('link')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f5f0e8] transition-colors text-left group"
            >
              <Link2 size={16} className="text-[#8a8a9a] group-hover:text-[#ff6b35] transition-colors shrink-0" />
              <span className="text-sm text-[#2a2a3a] font-medium flex-1">Insert a link</span>
              <span className="text-xs text-[#b0b0c0] font-mono">⌘V</span>
            </button>
            <button
              onClick={() => onAdd('note')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f5f0e8] transition-colors text-left group"
            >
              <FileText size={16} className="text-[#8a8a9a] group-hover:text-[#ff6b35] transition-colors shrink-0" />
              <span className="text-sm text-[#2a2a3a] font-medium flex-1">Jot a quick idea or draft</span>
              <span className="text-xs text-[#b0b0c0] font-mono">N</span>
            </button>
            <button
              onClick={() => onAdd('mindmap')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f5f0e8] transition-colors text-left group"
            >
              <Network size={16} className="text-[#8a8a9a] group-hover:text-[#ff6b35] transition-colors shrink-0" />
              <span className="text-sm text-[#2a2a3a] font-medium flex-1">Create a Mind Map</span>
              <span className="text-xs text-[#b0b0c0] font-mono">M</span>
            </button>
          </div>
        </div>

        <div className="mt-6 bg-white border border-[#e5ded4] rounded-xl p-5">
          <p className="text-sm font-semibold text-[#1a1a2e] mb-1">Capture ideas, links, and notes</p>
          <p className="text-sm text-[#8a8a9a] leading-relaxed">
            Boards are where your content lives. Paste links to auto-preview them — YouTube videos get transcript extraction automatically.
          </p>
          <ul className="mt-3 space-y-1.5">
            {[
              'Link cards with full thumbnail preview',
              'YouTube videos auto-extract transcripts',
              'Write and edit notes',
              'Build visual mind maps',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-xs text-[#6a6a7a]">
                <span className="text-[#ff6b35] shrink-0 mt-0.5">+</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Board View ────────────────────────────────────────────────────────────────

interface BoardViewProps {
  boardId: string;
  boardName: string;
  captureSignal?: number;
}

export default function BoardView({ boardId, boardName, captureSignal }: BoardViewProps) {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [defaultTab, setDefaultTab] = useState<'link' | 'note' | 'video'>('link');
  const [search, setSearch] = useState('');
  const [boostedItem, setBoostedItem] = useState<BoardItem | null>(null);
  const [learnedItem, setLearnedItem] = useState<BoardItem | null>(null);
  const [mindMapItem, setMindMapItem] = useState<BoardItem | undefined>(undefined);
  const [showMindMap, setShowMindMap] = useState(false);
  const [editingNote, setEditingNote] = useState<BoardItem | undefined>(undefined);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [processItem, setProcessItem] = useState<BoardItem | null>(null);
  const [processContent, setProcessContent] = useState('');

  useEffect(() => {
    if (captureSignal && captureSignal > 0) {
      setDefaultTab('link');
      setShowModal(true);
    }
  }, [captureSignal]);

  useEffect(() => {
    setItems(getBoardItems(boardId));
  }, [boardId]);

  function handleAdd(item: BoardItem) {
    saveBoardItem(item);
    setItems(getBoardItems(boardId));
    setShowModal(false);
    setShowMindMap(false);
    setShowNoteEditor(false);
  }

  function handleDelete(itemId: string) {
    deleteBoardItem(boardId, itemId);
    setItems(getBoardItems(boardId));
  }

  function openAdd(type: 'link' | 'note' | 'mindmap' | 'video') {
    if (type === 'mindmap') {
      setMindMapItem(undefined);
      setShowMindMap(true);
    } else if (type === 'note') {
      setEditingNote(undefined);
      setShowNoteEditor(true);
    } else if (type === 'video') {
      setDefaultTab('video');
      setShowModal(true);
    } else {
      setDefaultTab('link');
      setShowModal(true);
    }
  }

  function openEditMindMap(item: BoardItem) {
    setMindMapItem(item);
    setShowMindMap(true);
  }

  function openEditNote(item: BoardItem) {
    setEditingNote(item);
    setShowNoteEditor(true);
  }

  function handleNoteSave(item: BoardItem) {
    if (editingNote) {
      updateBoardItem(item);
    } else {
      saveBoardItem(item);
    }
    setItems(getBoardItems(boardId));
    setShowNoteEditor(false);
    setEditingNote(undefined);
  }

  function openProcessor(item: BoardItem) {
    const raw = item.transcript || item.content || '';
    setProcessContent(removeTimestamps(raw));
    setProcessItem(item);
  }

  function saveProcessed() {
    if (!processItem) return;
    const updated: BoardItem = {
      ...processItem,
      ...(processItem.transcript !== undefined
        ? { transcript: processContent }
        : { content: processContent }),
    };
    updateBoardItem(updated);
    setItems(getBoardItems(boardId));
    setProcessItem(null);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showModal || showMindMap || showNoteEditor) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') { e.preventDefault(); openAdd('link'); }
      if (e.key === 'n' || e.key === 'N') { openAdd('note'); }
      if (e.key === 'm' || e.key === 'M') { openAdd('mindmap'); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal, showMindMap, showNoteEditor]);

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.content || '').toLowerCase().includes(q) ||
      (item.transcript || '').toLowerCase().includes(q) ||
      (item.platform || '').toLowerCase().includes(q)
    );
  });

  const header = (
    <div className="sticky top-0 z-10 bg-[#f5f0e8]/90 backdrop-blur-sm border-b border-[#e5ded4] px-6 py-3">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <h1 className="font-semibold text-lg text-[#1a1a2e] mr-auto">{boardName}</h1>
        <button
          onClick={() => openAdd('mindmap')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5ded4] text-[#1a1a2e] text-xs font-medium hover:bg-[#f5f0e8] transition-colors"
        >
          <Network size={13} />
          Mind Map
        </button>
        <button
          onClick={() => openAdd('note')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5ded4] text-[#1a1a2e] text-xs font-medium hover:bg-[#f5f0e8] transition-colors"
        >
          <FileText size={13} />
          Note
        </button>
        <button
          onClick={() => openAdd('video')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5ded4] text-[#1a1a2e] text-xs font-medium hover:bg-[#f5f0e8] transition-colors"
        >
          <Video size={13} />
          Video
        </button>
        <button
          onClick={() => setShowAnalyzer(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5ded4] text-[#1a1a2e] text-xs font-medium hover:bg-[#f5f0e8] transition-colors"
        >
          <FlaskConical size={13} />
          Analyze
        </button>
        <button
          onClick={() => openAdd('link')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff6b35] text-white text-xs font-medium hover:bg-[#e85a24] transition-colors"
        >
          <Plus size={13} />
          Add Content
        </button>
      </div>
      {items.length > 0 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8a9a]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search this board…"
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#e5ded4] rounded-lg text-sm text-[#1a1a2e] outline-none focus:border-[#ff6b35] placeholder:text-[#8a8a9a]"
          />
        </div>
      )}
    </div>
  );

  const processorPanel = processItem && (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setProcessItem(null)} />
      <div className="relative ml-auto w-full max-w-2xl h-full bg-[#fafaf8] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5ded4] bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <ScrollText size={15} className="text-[#ff6b35]" />
              <span className="font-semibold text-sm text-[#1a1a2e]">Process Content</span>
            </div>
            <p className="text-[11px] text-[#8a8a9a] mt-0.5 ml-6 truncate max-w-xs">{processItem.title}</p>
          </div>
          <button onClick={() => setProcessItem(null)} className="text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
            <XIcon size={18} />
          </button>
        </div>
        <div className="flex-1 flex flex-col p-5 gap-3 overflow-hidden">
          <textarea
            value={processContent}
            onChange={(e) => setProcessContent(e.target.value)}
            className="flex-1 border border-[#e5ded4] rounded-xl px-4 py-3 text-sm text-[#1a1a2e] outline-none focus:border-[#ff6b35] resize-none bg-white font-mono leading-relaxed"
          />
          <div className="flex items-center justify-between shrink-0">
            <p className="text-xs text-[#8a8a9a]">
              {processContent.split(/\s+/).filter(Boolean).length.toLocaleString()} words
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setProcessContent(removeTimestamps(processContent))}
                className="px-3 py-1.5 rounded-lg border border-[#e5ded4] text-xs text-[#6a6a7a] hover:border-[#ff6b35] hover:text-[#ff6b35] transition-colors"
              >
                Remove timestamps
              </button>
              <button
                onClick={() => setProcessContent(reformatTranscript(processContent))}
                className="px-3 py-1.5 rounded-lg border border-[#e5ded4] text-xs text-[#6a6a7a] hover:border-[#ff6b35] hover:text-[#ff6b35] transition-colors"
              >
                Reformat paragraphs
              </button>
              <button
                onClick={saveProcessed}
                className="px-4 py-1.5 rounded-lg bg-[#ff6b35] text-white text-xs font-semibold hover:bg-[#e85a24] transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const analyzerOverlay = showAnalyzer && (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAnalyzer(false)} />
      <div className="relative ml-auto w-full max-w-2xl h-full bg-[#fafaf8] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5ded4] bg-white shrink-0">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-[#ff6b35]" />
            <span className="font-semibold text-sm text-[#1a1a2e]">Content Analyzer</span>
          </div>
          <button onClick={() => setShowAnalyzer(false)} className="text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
            <XIcon size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ContentAnalyzer boardId={boardId} onPromptSaved={() => {}} />
        </div>
      </div>
    </div>
  );

  if (items.length === 0) {
    return (
      <>
        {header}
        <EmptyState onAdd={openAdd} />
        {showModal && (
          <AddItemModal boardId={boardId} onClose={() => setShowModal(false)} onAdd={handleAdd} defaultTab={defaultTab} />
        )}
        {showMindMap && (
          <MindMapEditor boardId={boardId} existingItem={mindMapItem} onClose={() => setShowMindMap(false)} onSave={handleAdd} />
        )}
        {processorPanel}
        {analyzerOverlay}
      </>
    );
  }

  return (
    <>
      {header}

      <div className="px-6 py-5">
        {filtered.length === 0 ? (
          <p className="text-center py-12 text-sm text-[#8a8a9a]">No items match &ldquo;{search}&rdquo;</p>
        ) : (
          <>
            <p className="text-xs text-[#8a8a9a] mb-4">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
              {filtered.map((item) => {
                if (item.type === 'link') {
                  return (
                    <LinkCard
                      key={item.id}
                      item={item}
                      onDelete={() => handleDelete(item.id)}
                      onBoost={() => setBoostedItem(item)}
                      onLearn={() => setLearnedItem(item)}
                      onProcess={() => openProcessor(item)}
                    />
                  );
                }
                if (item.type === 'mindmap') {
                  return (
                    <MindMapCard
                      key={item.id}
                      item={item}
                      onDelete={() => handleDelete(item.id)}
                      onEdit={() => openEditMindMap(item)}
                    />
                  );
                }
                return (
                  <NoteCard
                    key={item.id}
                    item={item}
                    onDelete={() => handleDelete(item.id)}
                    onEdit={() => openEditNote(item)}
                    onLearn={() => setLearnedItem(item)}
                    onProcess={() => openProcessor(item)}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <AddItemModal boardId={boardId} onClose={() => setShowModal(false)} onAdd={handleAdd} defaultTab={defaultTab} />
      )}

      {showMindMap && (
        <MindMapEditor boardId={boardId} existingItem={mindMapItem} onClose={() => setShowMindMap(false)} onSave={handleAdd} />
      )}

      {boostedItem && (
        <BoostPanel item={boostedItem} onClose={() => setBoostedItem(null)} />
      )}

      {learnedItem && (
        <LearnPanel item={learnedItem} onClose={() => setLearnedItem(null)} />
      )}

      {showNoteEditor && (
        <NoteEditor
          boardId={boardId}
          item={editingNote}
          onClose={() => { setShowNoteEditor(false); setEditingNote(undefined); }}
          onSave={handleNoteSave}
        />
      )}

      {processorPanel}
      {analyzerOverlay}
    </>
  );
}
