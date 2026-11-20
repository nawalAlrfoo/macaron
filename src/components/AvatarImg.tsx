import React, { useEffect, useState } from 'react';
import { assetUrl } from '@/src/utils/image';

interface AvatarImgProps {
  src?: string;
  name: string;
  sizeClass?: string;
  className?: string;
}

export const AvatarImg: React.FC<AvatarImgProps> = ({
  src,
  name,
  sizeClass = 'w-10 h-10',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);
  // a new photo gets a fresh chance to load
  useEffect(() => setFailed(false), [src]);

  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 1)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  if (!src || failed) {
    // calm, stable colour per person (same name → same colour)
    const tones = ['#6E56CF', '#3B82C4', '#C2577A', '#2F9C88', '#C98A2E', '#7A6BB0', '#4E7A9E'];
    let h = 0;
    for (const ch of name || '?') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const tone = tones[h % tones.length];
    const px = Number(/w-(\d+(?:\.\d+)?)/.exec(sizeClass)?.[1] ?? 10) * 4;
    return (
      <div
        aria-label={name}
        className={`${sizeClass} rounded-full flex items-center justify-center font-semibold shrink-0 select-none ${className}`}
        style={{ backgroundColor: `${tone}22`, color: tone, fontSize: Math.max(10, Math.round(px * 0.38)) }}
      >
        <span>{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={assetUrl(src)}
      alt={name}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`${sizeClass} rounded-full object-cover shrink-0 border border-slate-200/80 dark:border-slate-700 bg-amber-50 dark:bg-slate-800 ${className}`}
    />
  );
};
