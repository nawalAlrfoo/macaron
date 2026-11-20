import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

interface VoiceNoteProps {
  src: string;
  /** Duration in seconds saved with the message (MediaRecorder files often report Infinity) */
  duration?: number;
  isMine: boolean;
  accent: string;
  unsupportedLabel?: string;
  downloadLabel?: string;
}

const fmt = (secs: number) => {
  const s = Math.max(0, Math.round(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Fixed pseudo-waveform so every note looks like audio without decoding the file
const BARS = [6, 10, 14, 9, 16, 12, 7, 13, 17, 11, 8, 15, 10, 6, 12, 16, 9, 13, 7, 11, 14, 8, 10, 6];

export const VoiceNote: React.FC<VoiceNoteProps> = ({ src, duration, isMine, accent, unsupportedLabel, downloadLabel }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration ?? 0);
  // e.g. a WebM/Opus note recorded on Chrome, opened on an older iPhone
  const [unsupported, setUnsupported] = useState(() => {
    if (!src.startsWith('data:audio/')) return false;
    const end = src.search(/[;,]/);
    const mime = src.slice(5, end > 0 ? end : undefined);
    try {
      return document.createElement('audio').canPlayType(mime) === '';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) setTotal(a.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('durationchange', onMeta);
    const onError = () => setUnsupported(true);
    a.addEventListener('ended', onEnd);
    a.addEventListener('error', onError);
    a.addEventListener('pause', () => setPlaying(false));
    a.addEventListener('play', () => setPlaying(true));
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('durationchange', onMeta);
      a.removeEventListener('ended', onEnd);
      a.removeEventListener('error', onError);
    };
  }, []);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      // pause any other voice note that is playing
      document.querySelectorAll('audio[data-voice-note]').forEach((el) => {
        if (el !== a) (el as HTMLAudioElement).pause();
      });
      a.play().catch((err) => {
        if (err?.name === 'NotSupportedError') setUnsupported(true);
      });
    } else {
      a.pause();
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a || !total) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isRtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    let ratio = (e.clientX - rect.left) / rect.width;
    if (isRtl) ratio = 1 - ratio;
    a.currentTime = Math.min(Math.max(ratio, 0), 1) * total;
  };

  const progress = total > 0 ? current / total : 0;
  const played = isMine ? 'rgba(255,255,255,0.95)' : accent;
  const unplayed = isMine ? 'rgba(255,255,255,0.4)' : 'rgba(148,163,184,0.5)';

  if (unsupported) {
    return (
      <div className={`flex items-center gap-3 text-xs ${isMine ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'}`}>
        <span>🎙️ {unsupportedLabel || "Can't play this recording here"}</span>
        <a href={src} download="macaron-voice" onClick={(e) => e.stopPropagation()} className="underline font-semibold">
          {downloadLabel || 'Download'}
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-[200px] sm:min-w-[240px]" dir="ltr">
      <audio ref={audioRef} src={src} preload="metadata" data-voice-note />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-95 ${
          isMine ? 'bg-white/20 text-white' : 'text-white'
        }`}
        style={isMine ? undefined : { backgroundColor: accent }}
      >
        {playing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ms-0.5" />}
      </button>
      <div className="flex-1 flex items-center gap-[3px] h-8 cursor-pointer" onClick={seek}>
        {BARS.map((h, i) => (
          <span
            key={i}
            className="flex-1 rounded-full transition-colors"
            style={{ height: `${h + 4}px`, backgroundColor: i / BARS.length < progress ? played : unplayed }}
          />
        ))}
      </div>
      <span className={`text-[11px] tabular-nums shrink-0 ${isMine ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
        {fmt(playing || current > 0 ? current : total)}
      </span>
    </div>
  );
};
