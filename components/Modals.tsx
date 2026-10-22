'use client';

import { useState } from 'react';
import { X, Rss, Loader2 } from 'lucide-react';

interface CreateBoardModalProps {
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function CreateBoardModal({ onClose, onCreate }: CreateBoardModalProps) {
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#1a1a2e]">New Board</h2>
          <button onClick={onClose}><X size={18} className="text-[#8a8a9a]" /></button>
        </div>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && onCreate(name.trim())}
          placeholder="Board name…"
          className="w-full border border-[#e5ded4] rounded-lg px-3 py-2.5 text-sm text-[#1a1a2e] outline-none focus:border-[#ff6b35] mb-4"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-[#e5ded4] text-sm text-[#8a8a9a] hover:bg-[#f5f0e8]">
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onCreate(name.trim())}
            className="flex-1 py-2 rounded-lg bg-[#1a1a2e] text-sm text-white hover:bg-[#2a2a3e] disabled:opacity-40"
            disabled={!name.trim()}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

interface AddRSSModalProps {
  onClose: () => void;
  onAdd: (url: string, title: string) => void;
}

export function AddRSSModal({ onClose, onAdd }: AddRSSModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function validate() {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/rss?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        onAdd(url.trim(), title.trim() || data.feedTitle || url);
      }
    } catch {
      setError('Could not reach that URL. Check the feed address.');
    } finally {
      setLoading(false);
    }
  }

  const EXAMPLES = [
    { label: 'Morning Brew', url: 'https://feeds.morningbrew.com/morning-brew/rss' },
    { label: 'Hacker Newsletter', url: 'https://hackernewsletter.com/rss' },
    { label: 'Lenny\'s Newsletter', url: 'https://www.lennysnewsletter.com/feed' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Rss size={16} className="text-[#ff6b35]" />
            <h2 className="font-semibold text-[#1a1a2e]">Add RSS / Substack Feed</h2>
          </div>
          <button onClick={onClose}><X size={18} className="text-[#8a8a9a]" /></button>
        </div>

        <p className="text-[11px] text-[#8a8a9a] mb-2">
          Paste the <strong>newsletter homepage</strong> — not a single post link.
          <br />e.g. <span className="font-mono">https://yourname.substack.com</span>
        </p>
        <input
          autoFocus
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourname.substack.com"
          className="w-full border border-[#e5ded4] rounded-lg px-3 py-2.5 text-sm text-[#1a1a2e] outline-none focus:border-[#ff6b35] mb-3"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Label (optional)"
          className="w-full border border-[#e5ded4] rounded-lg px-3 py-2.5 text-sm text-[#1a1a2e] outline-none focus:border-[#ff6b35] mb-3"
        />

        <div className="mb-4">
          <p className="text-[11px] text-[#8a8a9a] mb-1.5">Try an example:</p>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.url}
                onClick={() => setUrl(ex.url)}
                className="text-[11px] px-2 py-1 rounded-md bg-[#f5f0e8] text-[#1a1a2e] hover:bg-[#ede7db] transition-colors"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-[#e5ded4] text-sm text-[#8a8a9a] hover:bg-[#f5f0e8]">
            Cancel
          </button>
          <button
            onClick={validate}
            disabled={!url.trim() || loading}
            className="flex-1 py-2 rounded-lg bg-[#ff6b35] text-sm text-white hover:bg-[#e85a24] disabled:opacity-40 transition-colors"
          >
            {loading ? 'Checking…' : 'Add Feed'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface MetaPreview {
  title: string;
  description: string;
  image?: string;
  author: string;
  platform: string;
  source: string;
  videoId?: string | null;
}

interface UploadModalProps {
  onClose: () => void;
  onAdd: (post: {
    title: string;
    excerpt: string;
    url: string;
    author: string;
    thumbnail?: string;
    videoId?: string;
    source?: string;
    platform?: string;
  }) => void;
}

export function UploadModal({ onClose, onAdd }: UploadModalProps) {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<MetaPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetched, setFetched] = useState(false);

  async function fetchPreview() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setPreview(null);
    setFetched(false);
    try {
      const res = await fetch(`/api/metadata?url=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setPreview(data);
        setFetched(true);
      }
    } catch {
      setError('Could not fetch that URL. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    if (!preview) return;
    onAdd({
      title: preview.title,
      excerpt: preview.description,
      url: url.trim(),
      author: preview.author,
      thumbnail: preview.image,
      videoId: preview.videoId || undefined,
      source: preview.source,
      platform: preview.platform,
    });
  }

  const isYouTube = preview?.videoId || url.includes('youtube.com') || url.includes('youtu.be');
  const isSubstack = preview?.platform === 'Substack' || url.includes('substack.com');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5ded4]">
          <h2 className="font-semibold text-sm text-[#1a1a2e]">Add Content</h2>
          <button onClick={onClose}><X size={18} className="text-[#8a8a9a]" /></button>
        </div>

        <div className="p-5 space-y-3">
          {/* Platform hint */}
          <div className="flex gap-2">
            {[
              { label: '▶ YouTube', hint: isYouTube },
              { label: '✉ Substack', hint: isSubstack },
              { label: '🔗 Any link', hint: !isYouTube && !isSubstack },
            ].map(({ label, hint }) => (
              <span
                key={label}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                  hint
                    ? 'bg-[#ff6b35] text-white border-[#ff6b35]'
                    : 'border-[#e5ded4] text-[#8a8a9a]'
                }`}
              >
                {label}
              </span>
            ))}
          </div>

          {/* URL input + fetch */}
          <div className="flex gap-2">
            <input
              autoFocus
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setFetched(false); setPreview(null); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && fetchPreview()}
              placeholder="Paste a YouTube or Substack link…"
              className="flex-1 border border-[#e5ded4] rounded-lg px-3 py-2.5 text-sm text-[#1a1a2e] outline-none focus:border-[#ff6b35] min-w-0"
            />
            <button
              onClick={fetchPreview}
              disabled={!url.trim() || loading}
              className="px-3 py-2.5 rounded-lg bg-[#1a1a2e] text-white text-sm font-medium hover:bg-[#2a2a3e] disabled:opacity-40 transition-colors shrink-0"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'Fetch'}
            </button>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Preview card */}
          {fetched && preview && (
            <div className="border border-[#e5ded4] rounded-xl overflow-hidden">
              {preview.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.image}
                  alt=""
                  className="w-full h-36 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-medium text-[#ff6b35]">{preview.platform}</span>
                  {preview.videoId && (
                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">VIDEO + TRANSCRIPT</span>
                  )}
                  {isSubstack && !preview.videoId && (
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">ARTICLE</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-[#1a1a2e] line-clamp-2 leading-snug">{preview.title}</p>
                {preview.description && (
                  <p className="text-[11px] text-[#8a8a9a] mt-1 line-clamp-2">{preview.description}</p>
                )}
                <p className="text-[11px] text-[#8a8a9a] mt-1">by {preview.author}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-[#e5ded4] text-sm text-[#8a8a9a] hover:bg-[#f5f0e8]">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!fetched || !preview}
            className="flex-1 py-2 rounded-lg bg-[#ff6b35] text-sm text-white hover:bg-[#e85a24] disabled:opacity-40 transition-colors"
          >
            Add to Feed
          </button>
        </div>
      </div>
    </div>
  );
}
