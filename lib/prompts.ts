'use client';

import { PromptItem } from './types';

const KEY = 'feedhub_prompt_library';

export function getPrompts(): PromptItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export function savePrompt(item: PromptItem): void {
  const all = getPrompts().filter((p) => p.id !== item.id);
  localStorage.setItem(KEY, JSON.stringify([item, ...all]));
}

export function deletePrompt(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getPrompts().filter((p) => p.id !== id)));
}

export function reformatTranscript(text: string): string {
  const words = text
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return '';

  const paragraphs: string[] = [];
  let start = 0;

  while (start < words.length) {
    let end = Math.min(start + 120, words.length);
    // Extend up to 30 more words to land on a sentence boundary
    if (end < words.length) {
      for (let i = end; i < Math.min(end + 30, words.length); i++) {
        if (/[.!?]$/.test(words[i])) { end = i + 1; break; }
      }
    }
    paragraphs.push(words.slice(start, end).join(' '));
    start = end;
  }

  return paragraphs.join('\n\n');
}

export function removeTimestamps(text: string): string {
  return text
    // Format A: numeric H:MM:SS fused with verbose e.g. "1:07:521 hour, 7 minutes, 52 seconds"
    .replace(/\d{1,2}:\d{2}:\d{2}\s*\d+\s*hours?,\s*\d+\s*minutes?(?:,\s*\d+\s*seconds?)?/gi, ' ')
    // Format B line-starting: " 9 seconds", " 1 minute, 6 seconds", " 6 minutes", " 1 hour, 6 minutes"
    .replace(/^[ \t]*(?:\d+\s+hours?,\s+)?(?:\d+\s+minutes?,\s+)?\d+\s+seconds?[ \t]*/gim, ' ')
    .replace(/^[ \t]*(?:\d+\s+hours?,\s+)?\d+\s+minutes?[ \t]*/gim, ' ')
    // Format B mid-text: "something 9 secondsword" or "18 secondscontradicting" —
    // timestamp fused directly to the next word (no space before next letter)
    .replace(/ \d+\s+(?:hours?,\s+)?(?:minutes?,\s+)?seconds?(?=[a-z])/gi, ' ')
    .replace(/ \d+\s+(?:hours?,\s+)?minutes?(?=[a-z])/gi, ' ')
    // Bare numeric timestamps: 1:07:52, [0:00], (1:23)
    .replace(/\[?\(?\d{1,2}:\d{2}(?::\d{2})?\)?\]?/g, '')
    // Bracketed annotations left after stripping e.g. [Music]
    .replace(/\[\w+\]/g, '')
    // Collapse leftover whitespace
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
