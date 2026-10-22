'use client';

import { Board, Post } from './types';

const BOARDS_KEY = 'feedhub_boards';
const SAVED_POSTS_KEY = 'feedhub_saved_posts';
const RSS_FEEDS_KEY = 'feedhub_rss_feeds';

export function getBoards(): Board[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(BOARDS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveBoards(boards: Board[]): void {
  localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
}

export function createBoard(name: string): Board {
  const board: Board = {
    id: crypto.randomUUID(),
    name,
    postIds: [],
    createdAt: new Date().toISOString(),
  };
  const boards = getBoards();
  saveBoards([...boards, board]);
  return board;
}

export function deleteBoard(id: string): void {
  saveBoards(getBoards().filter((b) => b.id !== id));
}

export function addPostToBoard(boardId: string, postId: string): void {
  const boards = getBoards();
  saveBoards(
    boards.map((b) =>
      b.id === boardId && !b.postIds.includes(postId)
        ? { ...b, postIds: [...b.postIds, postId] }
        : b
    )
  );
}

export function removePostFromBoard(boardId: string, postId: string): void {
  const boards = getBoards();
  saveBoards(
    boards.map((b) =>
      b.id === boardId ? { ...b, postIds: b.postIds.filter((id) => id !== postId) } : b
    )
  );
}

export function getSavedPosts(): Record<string, Post> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(SAVED_POSTS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function savePost(post: Post): void {
  const saved = getSavedPosts();
  saved[post.id] = post;
  localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(saved));
}

export function getRSSFeeds(): { id: string; title: string; url: string }[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RSS_FEEDS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addRSSFeed(feed: { id: string; title: string; url: string }): void {
  const feeds = getRSSFeeds();
  localStorage.setItem(RSS_FEEDS_KEY, JSON.stringify([...feeds, feed]));
}

export function removeRSSFeed(id: string): void {
  localStorage.setItem(
    RSS_FEEDS_KEY,
    JSON.stringify(getRSSFeeds().filter((f) => f.id !== id))
  );
}
