export interface TrackedCreator {
  id: string;
  platform: 'youtube' | 'substack' | 'x';
  name: string;
  handle: string;
  avatar?: string;
  subscribers?: string;
  description?: string;
  trackedAt: string;
}

const KEY = 'feedhub_tracked_creators';

export function getTrackedCreators(): TrackedCreator[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch { return []; }
}

export function trackCreator(creator: TrackedCreator): void {
  const existing = getTrackedCreators();
  if (existing.find((c) => c.id === creator.id)) return;
  localStorage.setItem(KEY, JSON.stringify([creator, ...existing]));
}

export function untrackCreator(id: string): void {
  const existing = getTrackedCreators().filter((c) => c.id !== id);
  localStorage.setItem(KEY, JSON.stringify(existing));
}

export function isTracked(id: string): boolean {
  return getTrackedCreators().some((c) => c.id === id);
}
