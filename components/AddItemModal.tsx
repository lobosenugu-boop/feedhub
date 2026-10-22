'use client';

import { useState, useRef, DragEvent } from 'react';
import { X, Link2, FileText, Loader2, Video, Upload } from 'lucide-react';
import { BoardItem } from '@/lib/board-items';
import { removeTimestamps } from '@/lib/prompts';

type Tab = 'link' | 'note' | 'video';

interface Props {
  boardId: string;
  onClose: () => void;
  onAdd: (item: BoardItem) => void;
  defaultTab?: Tab;
}

function htmlToText(html: string): string {
  return html
    .replace(/<\/?(h[1-6]|p|div|section|article|li|blockquote)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function AddItemModal({ boardId, onClose, onAdd, defaultTab = 'link' }: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  // Link state
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [preview, setPreview] = useState<{
    title: string; author: string; image?: string; platform: string; videoId?: string | null;
  } | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [articleText, setArticleText] = useState<string | null>(null);
  const [contentStatus, setContentStatus] = useState<'idle' | 'fetching' | 'found' | 'failed'>('idle');
  const [fetchError, setFetchError] = useState('');

  // Note state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Video state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoPlatform, setVideoPlatform] = useState('Instagram');
  const [videoStatus, setVideoStatus] = useState<'idle' | 'uploading' | 'transcribing' | 'done' | 'error'>('idle');
  const [videoError, setVideoError] = useState('');
  const [videoTranscript, setVideoTranscript] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSocialVideo = (u: string) =>
    /instagram\.com|tiktok\.com|facebook\.com\/.*video|fb\.watch|twitter\.com\/.*\/video|x\.com\/.*\/video/i.test(u);

  async function fetchPreview() {
    if (!url.trim()) return;
    setFetching(true);
    setFetchError('');
    setPreview(null);
    setTranscript(null);
    setArticleText(null);
    setContentStatus('idle');

    try {
      // Social video (Instagram, TikTok, etc.) — extract via yt-dlp + Whisper
      if (isSocialVideo(url.trim())) {
        setPreview({ title: 'Extracting…', author: '', platform: detectPlatform(url.trim()) });
        setContentStatus('fetching');
        const res = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Extraction failed');
        setPreview({
          title: data.title || url.trim(),
          author: '',
          platform: detectPlatform(url.trim()),
          image: data.thumbnail || undefined,
        });
        setTranscript(data.transcript);
        setContentStatus('found');
        setFetching(false);
        return;
      }

      // Step 1 — metadata
      const metaRes = await fetch(`/api/metadata?url=${encodeURIComponent(url.trim())}`);
      const metaData = await metaRes.json();
      if (metaData.error) throw new Error(metaData.error);
      setPreview(metaData);
      setContentStatus('fetching');

      if (metaData.videoId) {
        // YouTube — fetch transcript
        const tRes = await fetch(`/api/transcript?videoId=${metaData.videoId}`);
        const tData = await tRes.json();
        if (tData.transcript) {
          setTranscript(removeTimestamps(tData.transcript));
          setContentStatus('found');
        } else {
          setContentStatus('failed');
        }
      } else {
        // Article — fetch full text via reader
        const rRes = await fetch(`/api/reader?url=${encodeURIComponent(url.trim())}`);
        const rData = await rRes.json();
        if (rData.hasFullContent && rData.content) {
          const text = htmlToText(rData.content);
          if (text.length > 100) {
            setArticleText(text);
            setContentStatus('found');
          } else {
            setContentStatus('failed');
          }
        } else {
          setContentStatus('failed');
        }
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to fetch URL');
      setContentStatus('failed');
    } finally {
      setFetching(false);
    }
  }

  function detectPlatform(u: string): string {
    if (/instagram\.com/i.test(u)) return 'Instagram';
    if (/tiktok\.com/i.test(u)) return 'TikTok';
    if (/facebook\.com|fb\.watch/i.test(u)) return 'Facebook';
    if (/twitter\.com|x\.com/i.test(u)) return 'X';
    return 'Social';
  }

  function addLink() {
    if (!url.trim()) return;
    const item: BoardItem = {
      id: crypto.randomUUID(),
      boardId,
      type: 'link',
      title: preview?.title || url,
      url: url.trim(),
      thumbnail: preview?.image,
      platform: preview?.platform,
      author: preview?.author,
      videoId: preview?.videoId ?? undefined,
      transcript: transcript ?? undefined,
      content: articleText ?? undefined,
      createdAt: new Date().toISOString(),
    };
    onAdd(item);
  }

  function addNote() {
    if (!noteContent.trim() && !noteTitle.trim()) return;
    const item: BoardItem = {
      id: crypto.randomUUID(),
      boardId,
      type: 'note',
      title: noteTitle.trim() || noteContent.trim().slice(0, 60),
      content: noteContent.trim(),
      createdAt: new Date().toISOString(),
    };
    onAdd(item);
  }

  async function transcribeVideo() {
    if (!videoFile) return;
    setVideoStatus('uploading');
    setVideoError('');
    setVideoTranscript('');
    try {
      const fd = new FormData();
      fd.append('file', videoFile);
      setVideoStatus('transcribing');
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Transcription failed');
      setVideoTranscript(data.transcript);
      setVideoStatus('done');
    } catch (e) {
      setVideoError(e instanceof Error ? e.message : 'Something went wrong');
      setVideoStatus('error');
    }
  }

  function addVideo() {
    if (!videoTranscript) return;
    const item: BoardItem = {
      id: crypto.randomUUID(),
      boardId,
      type: 'link',
      title: videoTitle.trim() || videoFile?.name || 'Untitled Video',
      platform: videoPlatform,
      transcript: videoTranscript,
      createdAt: new Date().toISOString(),
    };
    onAdd(item);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setVideoFile(f); setVideoTitle(f.name.replace(/\.[^.]+$/, '')); }
  }

  const wordCount = (transcript ?? articleText ?? '').split(/\s+/).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#f0ebe3]">
          <h2 className="font-semibold text-[#1a1a2e]">Add to Board</h2>
          <button onClick={onClose} className="text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4">
          {([
            { id: 'link' as Tab, icon: Link2, label: 'Link' },
            { id: 'note' as Tab, icon: FileText, label: 'Note' },
            { id: 'video' as Tab, icon: Video, label: 'Video' },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === id
                  ? 'bg-[#1a1a2e] text-white'
                  : 'text-[#8a8a9a] hover:bg-[#f5f0e8] hover:text-[#1a1a2e]'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 space-y-3">
          {tab === 'link' && (
            <>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setPreview(null);
                    setTranscript(null);
                    setArticleText(null);
                    setContentStatus('idle');
                    setFetchError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && fetchPreview()}
                  placeholder="Paste any URL…"
                  autoFocus
                  className="flex-1 border border-[#e5ded4] rounded-xl px-3 py-2.5 text-sm text-[#1a1a2e] outline-none focus:border-[#ff6b35] bg-[#fafaf8]"
                />
                <button
                  onClick={fetchPreview}
                  disabled={!url.trim() || fetching}
                  className="px-4 py-2.5 rounded-xl bg-[#f5f0e8] text-[#1a1a2e] text-sm font-medium hover:bg-[#ede7db] disabled:opacity-40 transition-colors shrink-0"
                >
                  {fetching ? <Loader2 size={14} className="animate-spin" /> : 'Preview'}
                </button>
              </div>

              {fetchError && <p className="text-xs text-red-500">{fetchError}</p>}

              {preview && (
                <div className="rounded-xl border border-[#e5ded4] overflow-hidden bg-[#f5f0e8]">
                  {preview.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview.image}
                      alt=""
                      className="w-full aspect-video object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="p-3">
                    <p className="text-sm font-semibold text-[#1a1a2e] line-clamp-2">{preview.title}</p>
                    <p className="text-xs text-[#8a8a9a] mt-0.5">
                      {[preview.author, preview.platform].filter(Boolean).join(' · ')}
                    </p>
                    <div className="mt-2">
                      {contentStatus === 'fetching' && (
                        <span className="flex items-center gap-1 text-[11px] text-[#8a8a9a]">
                          <Loader2 size={10} className="animate-spin" />
                          {isSocialVideo(url) ? 'Downloading & transcribing — up to 60s…' : 'Extracting content…'}
                        </span>
                      )}
                      {contentStatus === 'found' && (
                        <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          ✓ {preview.videoId ? 'Transcript' : 'Text'} extracted ({wordCount.toLocaleString()} words)
                        </span>
                      )}
                      {contentStatus === 'failed' && (
                        <>
                          {/instagram\.com|tiktok\.com|facebook\.com\/.*video|fb\.watch/i.test(url) ? (
                            <div className="text-[11px] bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg leading-relaxed">
                              <p className="font-semibold mb-1">📥 Social video detected</p>
                              <p>Download the video first, then use the <button className="underline font-semibold" onClick={() => setTab('video')}>Video tab</button> to transcribe it.</p>
                            </div>
                          ) : (
                            <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                              Content not available — you can paste it manually in the Analyzer
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={addLink}
                disabled={!url.trim() || fetching || contentStatus === 'fetching'}
                className="w-full py-2.5 rounded-xl bg-[#ff6b35] text-white text-sm font-semibold hover:bg-[#e85a24] disabled:opacity-40 transition-colors"
              >
                {contentStatus === 'fetching' ? 'Extracting content…' : 'Add to Board'}
              </button>
            </>
          )}

          {tab === 'video' && (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  dragging ? 'border-[#ff6b35] bg-[#fff5f0]' : 'border-[#e5ded4] hover:border-[#ff6b35] bg-[#fafaf8]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setVideoFile(f); setVideoTitle(f.name.replace(/\.[^.]+$/, '')); setVideoStatus('idle'); }
                  }}
                />
                {videoFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[#1a1a2e]">{videoFile.name}</p>
                    <p className="text-xs text-[#8a8a9a]">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    <p className="text-xs text-[#ff6b35]">Click to change file</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload size={24} className="mx-auto text-[#8a8a9a]" />
                    <p className="text-sm font-medium text-[#1a1a2e]">Drop your video or audio here</p>
                    <p className="text-xs text-[#8a8a9a]">Instagram, TikTok, MP4, MP3, M4A…</p>
                  </div>
                )}
              </div>

              {/* Title + platform */}
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full border border-[#e5ded4] rounded-xl px-3 py-2.5 text-sm text-[#1a1a2e] outline-none focus:border-[#ff6b35] bg-[#fafaf8]"
              />
              <select
                value={videoPlatform}
                onChange={(e) => setVideoPlatform(e.target.value)}
                className="w-full border border-[#e5ded4] rounded-xl px-3 py-2.5 text-sm text-[#1a1a2e] outline-none focus:border-[#ff6b35] bg-[#fafaf8]"
              >
                {['Instagram', 'TikTok', 'Facebook', 'Twitter / X', 'LinkedIn', 'Podcast', 'Other'].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>

              {/* Status */}
              {videoStatus === 'uploading' && (
                <div className="flex items-center gap-2 text-xs text-[#8a8a9a]">
                  <Loader2 size={12} className="animate-spin" /> Uploading to transcription service…
                </div>
              )}
              {videoStatus === 'transcribing' && (
                <div className="flex items-center gap-2 text-xs text-[#8a8a9a]">
                  <Loader2 size={12} className="animate-spin" /> Transcribing — this takes 20–60 seconds…
                </div>
              )}
              {videoStatus === 'done' && (
                <div className="text-xs bg-green-50 text-green-700 px-3 py-2 rounded-lg font-medium">
                  ✓ Transcript ready — {videoTranscript.split(/\s+/).filter(Boolean).length.toLocaleString()} words
                </div>
              )}
              {videoStatus === 'error' && (
                <p className="text-xs text-red-500">{videoError}</p>
              )}

              {/* Actions */}
              {videoStatus !== 'done' ? (
                <button
                  onClick={transcribeVideo}
                  disabled={!videoFile || videoStatus === 'uploading' || videoStatus === 'transcribing'}
                  className="w-full py-2.5 rounded-xl bg-[#ff6b35] text-white text-sm font-semibold hover:bg-[#e85a24] disabled:opacity-40 transition-colors"
                >
                  {videoStatus === 'uploading' || videoStatus === 'transcribing'
                    ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Working…</span>
                    : 'Transcribe Video'}
                </button>
              ) : (
                <button
                  onClick={addVideo}
                  className="w-full py-2.5 rounded-xl bg-[#ff6b35] text-white text-sm font-semibold hover:bg-[#e85a24] transition-colors"
                >
                  Add to Board
                </button>
              )}
            </>
          )}

          {tab === 'note' && (
            <>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Title (optional)"
                autoFocus
                className="w-full border border-[#e5ded4] rounded-xl px-3 py-2.5 text-sm font-medium text-[#1a1a2e] outline-none focus:border-[#ff6b35] bg-[#fafaf8]"
              />
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write your idea, draft, or note…"
                rows={5}
                className="w-full border border-[#e5ded4] rounded-xl px-3 py-2.5 text-sm text-[#1a1a2e] outline-none focus:border-[#ff6b35] resize-none bg-[#fafaf8]"
              />
              <button
                onClick={addNote}
                disabled={!noteContent.trim() && !noteTitle.trim()}
                className="w-full py-2.5 rounded-xl bg-[#ff6b35] text-white text-sm font-semibold hover:bg-[#e85a24] disabled:opacity-40 transition-colors"
              >
                Add Note
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
