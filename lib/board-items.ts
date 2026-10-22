'use client';

export type BoardItemType = 'link' | 'note' | 'mindmap';

export interface BoardItem {
  id: string;
  boardId: string;
  type: BoardItemType;
  title: string;
  content?: string;    // note text or document body
  url?: string;
  thumbnail?: string;
  excerpt?: string;
  platform?: string;
  author?: string;
  videoId?: string;
  transcript?: string;
  createdAt: string;
}

function key(boardId: string) {
  return `feedhub_items_${boardId}`;
}

export function getBoardItems(boardId: string): BoardItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(key(boardId)) || '[]'); }
  catch { return []; }
}

export function saveBoardItem(item: BoardItem): void {
  const all = getBoardItems(item.boardId).filter((i) => i.id !== item.id);
  localStorage.setItem(key(item.boardId), JSON.stringify([item, ...all]));
}

export function deleteBoardItem(boardId: string, itemId: string): void {
  const all = getBoardItems(boardId).filter((i) => i.id !== itemId);
  localStorage.setItem(key(boardId), JSON.stringify(all));
}

export function updateBoardItem(item: BoardItem): void {
  const all = getBoardItems(item.boardId);
  const idx = all.findIndex((i) => i.id === item.id);
  if (idx !== -1) {
    all[idx] = item;
    localStorage.setItem(key(item.boardId), JSON.stringify(all));
  }
}

export function clearBoardItems(boardId: string): void {
  localStorage.removeItem(key(boardId));
}
