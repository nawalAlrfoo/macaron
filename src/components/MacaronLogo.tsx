import React, { useId } from 'react';

interface MacaronLogoProps {
  size?: number;
  className?: string;
  /** Shell color (top & bottom cookie) */
  shell?: string;
  /** Cream filling color */
  filling?: string;
  /** Tile background colors */
  bgFrom?: string;
  bgTo?: string;
  /** Draw the rounded tile behind the macaron */
  tile?: boolean;
  title?: string;
}

/** Macaron brand mark — a small stacked macaron on a calm lavender tile. */
export const MacaronLogo: React.FC<MacaronLogoProps> = ({
  size = 40,
  className = '',
  shell = '#7C66DC',
  filling = '#F6EBD9',
  bgFrom = '#F4F1FD',
  bgTo = '#E7E2FA',
  tile = true,
  title,
}) => {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={bgFrom} />
          <stop offset="1" stopColor={bgTo} />
        </linearGradient>
        <linearGradient id={`shell-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {tile && <rect width="64" height="64" rx="18" fill={`url(#bg-${id})`} />}
      {/* top shell */}
      <path d="M11 28.5C11 17 53 17 53 28.5Z" fill={shell} />
      <path d="M11 28.5C11 17 53 17 53 28.5Z" fill={`url(#shell-${id})`} />
      {/* top ruffle */}
      <rect x="12" y="27.5" width="40" height="4" rx="2" fill={shell} opacity="0.75" />
      {/* filling */}
      <rect x="13.5" y="31" width="37" height="6" rx="3" fill={filling} />
      {/* bottom ruffle */}
      <rect x="12" y="36.5" width="40" height="4" rx="2" fill={shell} opacity="0.75" />
      {/* bottom shell */}
      <path d="M11 39.5C11 49 53 49 53 39.5Z" fill={shell} />
      {/* shine */}
      <ellipse cx="24" cy="22.5" rx="5" ry="1.8" fill="#FFFFFF" opacity="0.7" />
    </svg>
  );
};
