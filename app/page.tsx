'use client';

import { useState, useEffect } from 'react';
import { Board } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import BoardView from '@/components/BoardView';
import ContentAnalyzer from '@/components/ContentAnalyzer';
import PromptLibrary from '@/components/PromptLibrary';
import CreatorResearch from '@/components/CreatorResearch';
import TopicSearch from '@/components/TopicSearch';
import { CreateBoardModal } from '@/components/Modals';
import CustomAI from '@/components/CustomAI';
import EngageView from '@/components/EngageView';
import ThinkView from '@/components/ThinkView';
import { getBoards, createBoard, deleteBoard } from '@/lib/boards';
import { AppView } from '@/lib/types';

type View = AppView;

export default function Home() {
  const [view, setView] = useState<View>('analyzer');
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoard, setActiveBoard] = useState<string | null>(null);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [promptRefreshKey, setPromptRefreshKey] = useState(0);
  const [captureSignal, setCaptureSignal] = useState(0);

  useEffect(() => {
    setBoards(getBoards());
  }, []);

  function handleCreateBoard(name: string) {
    const board = createBoard(name);
    setBoards(getBoards());
    setShowCreateBoard(false);
    setActiveBoard(board.id);
    setView('discover');
  }

  function handleDeleteBoard(id: string) {
    deleteBoard(id);
    setBoards(getBoards());
    if (activeBoard === id) setActiveBoard(null);
  }

  // Which board is active in the discover view
  // null → "My Board" (default board id = 'default')
  const activeBoardId = activeBoard ?? 'default';
  const activeBoardName = activeBoard
    ? boards.find((b) => b.id === activeBoard)?.name || 'Board'
    : 'Discover';

  return (
    <div className="flex h-full">
      <Sidebar
        boards={boards}
        activeBoard={activeBoard}
        onSelectBoard={setActiveBoard}
        onCreateBoard={() => setShowCreateBoard(true)}
        onDeleteBoard={handleDeleteBoard}
        activeView={view}
        onSelectView={(v: View) => {
          setView(v);
          if (v !== 'discover') setActiveBoard(null);
        }}
        onCapture={() => {
          setView('discover');
          setActiveBoard(null);
          setCaptureSignal((s) => s + 1);
        }}
      />

      <main className="flex-1 overflow-y-auto">
        {view === 'analyzer' && (
          <ContentAnalyzer
            onPromptSaved={() => setPromptRefreshKey((k) => k + 1)}
            boardId={activeBoardId}
          />
        )}

        {view === 'library' && (
          <PromptLibrary refreshKey={promptRefreshKey} />
        )}

        {view === 'discover' && (
          <BoardView
            key={activeBoardId}
            boardId={activeBoardId}
            boardName={activeBoardName}
            captureSignal={captureSignal}
          />
        )}

        {view === 'creators' && (
          <CreatorResearch boardId={activeBoardId} />
        )}

        {view === 'topics' && (
          <TopicSearch boardId={activeBoardId} />
        )}

        {view === 'customai' && (
          <CustomAI />
        )}

        {view === 'engage' && (
          <EngageView />
        )}

        {view === 'think' && (
          <ThinkView />
        )}
      </main>

      {showCreateBoard && (
        <CreateBoardModal
          onClose={() => setShowCreateBoard(false)}
          onCreate={handleCreateBoard}
        />
      )}
    </div>
  );
}
