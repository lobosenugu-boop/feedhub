'use client';

import { useState, useRef, useEffect } from 'react';
import { Bookmark, Plus, X, FlaskConical, BookMarked, LayoutGrid, MoreHorizontal, ScanLine, Zap, Highlighter, Clock, Settings2, Users, Globe, Sparkles, MessageSquarePlus, Brain } from 'lucide-react';
import { Board, AppView } from '@/lib/types';

type View = AppView;

interface SidebarProps {
  boards: Board[];
  activeBoard: string | null;
  onSelectBoard: (id: string | null) => void;
  onCreateBoard: () => void;
  onDeleteBoard: (id: string) => void;
  activeView: View;
  onSelectView: (v: View) => void;
  onCapture?: () => void;
}

const MORE_ITEMS = [
  { id: 'capture',   icon: ScanLine,   label: 'Capture',          available: true },
  { id: 'prompts',   icon: Zap,        label: 'Prompts',           available: true },
  { id: 'highlights',icon: Highlighter,label: 'Highlights',        available: false },
  { id: 'schedule',  icon: Clock,      label: 'Schedule',          available: false },
] as const;

export default function Sidebar({
  boards,
  activeBoard,
  onSelectBoard,
  onCreateBoard,
  onDeleteBoard,
  activeView,
  onSelectView,
  onCapture,
}: SidebarProps) {
  const [showMore, setShowMore] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(e.target as Node)
      ) {
        setShowMore(false);
      }
    }
    if (showMore) document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [showMore]);

  function openMore() {
    if (!moreButtonRef.current) return;
    const rect = moreButtonRef.current.getBoundingClientRect();
    setPopupPos({ top: rect.top, left: rect.right + 8 });
    setShowMore((v) => !v);
  }

  function handleMoreAction(id: string) {
    setShowMore(false);
    if (id === 'capture') {
      onSelectView('discover');
      onSelectBoard(null);
      onCapture?.();
    } else if (id === 'prompts') {
      onSelectView('library');
      onSelectBoard(null);
    }
  }

  function navClass(active: boolean) {
    return `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
      active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
    }`;
  }

  return (
    <>
      <aside className="w-56 flex-shrink-0 bg-[#111318] text-white flex flex-col h-screen sticky top-0 overflow-y-auto">
        {/* Logo */}
        <div className="px-4 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#ff6b35] flex items-center justify-center text-white font-bold text-sm">
              F
            </div>
            <span className="font-semibold text-sm tracking-wide">FeedHub</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <button
            onClick={() => { onSelectView('analyzer'); onSelectBoard(null); }}
            className={navClass(activeView === 'analyzer')}
          >
            <FlaskConical size={16} />
            Analyzer
          </button>

          <button
            onClick={() => { onSelectView('library'); onSelectBoard(null); }}
            className={navClass(activeView === 'library')}
          >
            <BookMarked size={16} />
            Prompt Library
          </button>

          <button
            onClick={() => { onSelectView('discover'); onSelectBoard(null); }}
            className={navClass(activeView === 'discover' && !activeBoard)}
          >
            <LayoutGrid size={16} />
            Discover
          </button>

          <button
            onClick={() => { onSelectView('creators'); onSelectBoard(null); }}
            className={navClass(activeView === 'creators')}
          >
            <Users size={16} />
            Creators
          </button>

          <button
            onClick={() => { onSelectView('topics'); onSelectBoard(null); }}
            className={navClass(activeView === 'topics')}
          >
            <Globe size={16} />
            Topic Search
          </button>

          <button
            onClick={() => { onSelectView('customai'); onSelectBoard(null); }}
            className={navClass(activeView === 'customai')}
          >
            <Sparkles size={16} />
            Custom AI
          </button>

          <button
            onClick={() => { onSelectView('engage'); onSelectBoard(null); }}
            className={navClass(activeView === 'engage')}
          >
            <MessageSquarePlus size={16} />
            Engage
          </button>

          <button
            onClick={() => { onSelectView('think'); onSelectBoard(null); }}
            className={navClass(activeView === 'think')}
          >
            <Brain size={16} />
            Deep Think
          </button>

          {/* More button */}
          <button
            ref={moreButtonRef}
            onClick={openMore}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-full border text-sm transition-colors mt-1 ${
              showMore
                ? 'border-white/20 bg-white/10 text-white'
                : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/80'
            }`}
          >
            <MoreHorizontal size={15} />
            More
          </button>

          {/* Boards section */}
          <div className="pt-4">
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Boards</span>
              <button
                onClick={onCreateBoard}
                className="text-white/40 hover:text-white/80 transition-colors"
                title="New board"
              >
                <Plus size={14} />
              </button>
            </div>
            {boards.length === 0 && (
              <p className="text-xs text-white/30 px-3 py-1">No boards yet</p>
            )}
            {boards.map((board) => (
              <div key={board.id} className="group flex items-center">
                <button
                  onClick={() => { onSelectView('discover'); onSelectBoard(board.id); }}
                  className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeView === 'discover' && activeBoard === board.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Bookmark size={14} />
                  <span className="truncate">{board.name}</span>
                </button>
                <button
                  onClick={() => onDeleteBoard(board.id)}
                  className="opacity-0 group-hover:opacity-100 pr-2 text-white/30 hover:text-white/70 transition-all"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-xs text-white/25">FeedHub · Free · No credits</p>
        </div>
      </aside>

      {/* More popup — fixed so it's not clipped by sidebar overflow */}
      {showMore && (
        <div
          ref={popupRef}
          style={{ top: popupPos.top, left: popupPos.left }}
          className="fixed z-[200] w-52 bg-white rounded-xl shadow-xl border border-[#e5e5e5] py-1.5 overflow-hidden"
        >
          {MORE_ITEMS.map(({ id, icon: Icon, label, available }) => (
            <button
              key={id}
              onClick={() => available && handleMoreAction(id)}
              disabled={!available}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                available
                  ? 'text-[#1a1a2e] hover:bg-[#f5f5f5]'
                  : 'text-[#bbb] cursor-not-allowed'
              }`}
            >
              <Icon size={15} className={available ? 'text-[#555]' : 'text-[#ccc]'} />
              <span className="flex-1">{label}</span>
              {!available && (
                <span className="text-[10px] text-[#ccc] font-medium">Soon</span>
              )}
            </button>
          ))}

          <div className="border-t border-[#f0f0f0] my-1" />

          <button
            onClick={() => setShowMore(false)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-[#1a1a2e] hover:bg-[#f5f5f5] transition-colors"
          >
            <Settings2 size={15} className="text-[#555]" />
            Customize sidebar
            <span className="text-[10px] text-[#ccc] font-medium ml-auto">Soon</span>
          </button>
        </div>
      )}
    </>
  );
}
