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
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  if (!src || failed) {
    return (
      <div
        aria-label={name}
        className={`${sizeClass} rounded-full flex items-center justify-center font-semibold text-slate-700 dark:text-slate-200 shrink-0 select-none bg-gradient-to-br from-[#FEF08A] via-[#FBCFE8] to-[#BAE6FD] dark:from-[#4B4429] dark:via-[#4A2B3D] dark:to-[#243B53] border border-slate-200 dark:border-slate-700 ${className}`}
      >
        <span className="text-xs">{initials}</span>
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
