'use client';

import { useEffect, useRef, useState } from 'react';
import {
  X, Check, Bold, Italic, Underline, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, Undo2, Redo2, Type,
} from 'lucide-react';
import { BoardItem } from '@/lib/board-items';

interface Props {
  item?: BoardItem;   // undefined → creating new note
  boardId: string;
  onClose: () => void;
  onSave: (item: BoardItem) => void;
}

interface ToolbarBtn {
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  action: () => void;
  isBlock?: boolean;
}

export default function NoteEditor({ item, boardId, onClose, onSave }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [saved, setSaved] = useState(false);

  // Seed editor on mount
  useEffect(() => {
    if (editorRef.current && item?.content) {
      editorRef.current.innerHTML = item.content;
      updateCounts();
    }
    titleRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update counts on input
  function updateCounts() {
    const text = editorRef.current?.innerText ?? '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setCharCount(text.length);
  }

  // Update toolbar state on selection change
  useEffect(() => {
    function onSelChange() {
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
    }
    document.addEventListener('selectionchange', onSelChange);
    return () => document.removeEventListener('selectionchange', onSelChange);
  }, []);

  function exec(command: string, value?: string) {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateCounts();
  }

  function save() {
    const html = editorRef.current?.innerHTML?.trim() ?? '';
    const title = titleRef.current?.value?.trim() || '';
    if (!html && !title) return;
    const fallbackTitle = title || editorRef.current?.innerText?.trim()?.slice(0, 60) || 'Untitled';
    const noteItem: BoardItem = {
      id: item?.id ?? crypto.randomUUID(),
      boardId,
      type: 'note',
      title: fallbackTitle,
      content: html,
      createdAt: item?.createdAt ?? new Date().toISOString(),
    };
    onSave(noteItem);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === 's') { e.preventDefault(); save(); }
      if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); onClose(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const TOOLBAR: (ToolbarBtn | 'sep')[] = [
    { icon: Undo2,        label: 'Undo',        shortcut: '⌘Z',  action: () => exec('undo') },
    { icon: Redo2,        label: 'Redo',        shortcut: '⇧⌘Z', action: () => exec('redo') },
    'sep',
    { icon: Type,         label: 'Paragraph',   action: () => exec('formatBlock', 'p'), isBlock: true },
    { icon: Heading2,     label: 'Heading 2',   action: () => exec('formatBlock', 'h2'), isBlock: true },
    { icon: Heading3,     label: 'Heading 3',   action: () => exec('formatBlock', 'h3'), isBlock: true },
    'sep',
    { icon: Bold,         label: 'Bold',        shortcut: '⌘B',  action: () => exec('bold') },
    { icon: Italic,       label: 'Italic',      shortcut: '⌘I',  action: () => exec('italic') },
    { icon: Underline,    label: 'Underline',   shortcut: '⌘U',  action: () => exec('underline') },
    'sep',
    { icon: List,         label: 'Bullet list', action: () => exec('insertUnorderedList'), isBlock: true },
    { icon: ListOrdered,  label: 'Numbered list', action: () => exec('insertOrderedList'), isBlock: true },
    { icon: Quote,        label: 'Blockquote',  action: () => exec('formatBlock', 'blockquote'), isBlock: true },
    { icon: Minus,        label: 'Divider',     action: () => exec('insertHorizontalRule') },
  ];

  function isActive(btn: ToolbarBtn): boolean {
    if (btn.icon === Bold) return isBold;
    if (btn.icon === Italic) return isItalic;
    if (btn.icon === Underline) return isUnderline;
    return false;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#f0ebe3] shrink-0">
          <input
            ref={titleRef}
            defaultValue={item?.title && item.title !== item.content?.slice(0, 60) ? item.title : ''}
            placeholder="Note title (optional)"
            className="flex-1 text-lg font-semibold text-[#1a1a2e] bg-transparent outline-none placeholder:text-[#c0c0cc] placeholder:font-normal"
          />
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={save}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                saved ? 'bg-green-500 text-white' : 'bg-[#ff6b35] text-white hover:bg-[#e85a24]'
              }`}
            >
              <Check size={14} />
              {saved ? 'Saved!' : 'Save'}
            </button>
            <button onClick={onClose} className="text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-4 py-2 border-b border-[#f0ebe3] bg-[#fafaf8] shrink-0 flex-wrap">
          {TOOLBAR.map((btn, i) => {
            if (btn === 'sep') {
              return <div key={`sep-${i}`} className="w-px h-5 bg-[#e5ded4] mx-1.5" />;
            }
            const active = isActive(btn);
            return (
              <button
                key={btn.label}
                title={btn.shortcut ? `${btn.label} ${btn.shortcut}` : btn.label}
                onMouseDown={(e) => { e.preventDefault(); btn.action(); }}
                className={`p-1.5 rounded-md transition-colors group relative ${
                  active
                    ? 'bg-[#1a1a2e] text-white'
                    : 'text-[#6a6a7a] hover:bg-[#f0ebe3] hover:text-[#1a1a2e]'
                }`}
              >
                <btn.icon size={15} />
              </button>
            );
          })}
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-16 py-8 bg-white">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={updateCounts}
            onKeyDown={(e) => {
              // Tab → indent
              if (e.key === 'Tab') { e.preventDefault(); exec('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;'); }
            }}
            data-placeholder="Start writing…"
            className={`
              min-h-full outline-none text-[#1a1a2e] leading-[1.75] text-base
              prose prose-sm max-w-none
              [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-[#1a1a2e]
              [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-1.5 [&_h3]:text-[#1a1a2e]
              [&_p]:my-2 [&_p]:leading-relaxed
              [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2 [&_ul]:space-y-1
              [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2 [&_ol]:space-y-1
              [&_blockquote]:border-l-4 [&_blockquote]:border-[#ff6b35] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#6a6a7a] [&_blockquote]:my-4
              [&_hr]:border-[#e5ded4] [&_hr]:my-5
              [&_strong]:font-bold [&_em]:italic
              empty:before:content-[attr(data-placeholder)] empty:before:text-[#c0c0cc] empty:before:pointer-events-none
            `}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-2.5 border-t border-[#f0ebe3] bg-[#fafaf8] shrink-0">
          <div className="flex items-center gap-4 text-[11px] text-[#a0a0b0]">
            <span>{wordCount.toLocaleString()} word{wordCount !== 1 ? 's' : ''}</span>
            <span>{charCount.toLocaleString()} char{charCount !== 1 ? 's' : ''}</span>
          </div>
          <p className="text-[10px] text-[#c0c0c0]">⌘S to save · ⌘↩ to close</p>
        </div>
      </div>
    </div>
  );
}
