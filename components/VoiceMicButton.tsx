'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface Props {
  onResult: (text: string) => void;
  /** Appends to existing value by default. Pass append=false to replace. */
  append?: boolean;
  className?: string;
  size?: number;
}

type State = 'idle' | 'listening' | 'processing';

export default function VoiceMicButton({ onResult, className = '', size = 16 }: Props) {
  const [state, setState] = useState<State>('idle');
  const recRef = useRef<{ stop(): void } | null>(null);

  const start = useCallback(() => {
    type SR = {
      new(): {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onstart: (() => void) | null;
        onresult: ((e: { results: { [i: number]: { [i: number]: { transcript: string } } } }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start(): void;
        stop(): void;
      };
    };
    const w = window as typeof window & { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    const SpeechRec = w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (!SpeechRec) {
      alert('Voice input requires Chrome, Edge, or Safari.');
      return;
    }

    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => setState('listening');

    rec.onresult = (e) => {
      setState('processing');
      const text = e.results[0][0].transcript;
      onResult(text);
      setState('idle');
    };

    rec.onerror = () => setState('idle');
    rec.onend = () => setState((s) => (s === 'listening' ? 'idle' : s));

    recRef.current = rec;
    rec.start();
  }, [onResult]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setState('idle');
  }, []);

  return (
    <button
      type="button"
      onClick={state === 'listening' ? stop : start}
      title={state === 'listening' ? 'Stop recording' : 'Voice input'}
      className={`flex items-center justify-center rounded-lg transition-all ${
        state === 'listening'
          ? 'text-red-500 bg-red-50 animate-pulse'
          : state === 'processing'
          ? 'text-[#ff6b35]'
          : 'text-[#8a8a9a] hover:text-[#1a1a2e] hover:bg-[#f0ebe3]'
      } ${className}`}
    >
      {state === 'processing' ? (
        <Loader2 size={size} className="animate-spin" />
      ) : state === 'listening' ? (
        <MicOff size={size} />
      ) : (
        <Mic size={size} />
      )}
    </button>
  );
}
