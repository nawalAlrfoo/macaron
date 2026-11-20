import type { ChatBgStyle, SiteSettings, ThemeMode } from '@/src/types/chat';

function parseHex(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) {
    return { r: 248, g: 250, b: 252 };
  }
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, '0');
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Computes high-contrast text color (#0F172A or #F8FAFC) for any background hex.
 */
export function getReadableTextColor(bgHex: string): string {
  const { r, g, b } = parseHex(bgHex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#1E293B' : '#F8FAFC';
}

/**
 * Adapts a light pastel bubble color into a cozy muted twilight shade in Dark Mode
 * so custom Admin pastel colors always look harmonious and readable at night.
 */
export function resolveBubbleSurface(hex: string, mode: ThemeMode): string {
  if (mode === 'light') {
    return hex;
  }
  const { r, g, b } = parseHex(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // White / near-white "other" bubbles become the dark surface colour
  if (lum > 0.85) return '#1E2230';
  // Saturated colours (e.g. the violet primary) already read well on dark backgrounds
  if (lum < 0.6) return hex;
  // Mix 26% of the chosen pastel hue into deep slate (#1A1D2E -> 26, 29, 46)
  const mix = 0.28;
  const nr = 26 * (1 - mix) + r * mix;
  const ng = 29 * (1 - mix) + g * mix;
  const nb = 46 * (1 - mix) + b * mix;
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}

export function resolveChatBackdropStyle(
  settings: SiteSettings,
  mode: ThemeMode
): React.CSSProperties {
  const y = settings.yellowAccent;
  const p = settings.pinkAccent;
  const b = settings.blueAccent;
  const bgStyle: ChatBgStyle = settings.chatBgStyle;

  if (mode === 'dark') {
    if (bgStyle === 'pastel-blend') {
      return {
        backgroundColor: '#131624',
        backgroundImage: `radial-gradient(circle at 12% 18%, ${hexToRgba(y, 0.09)} 0%, transparent 45%), radial-gradient(circle at 88% 22%, ${hexToRgba(p, 0.11)} 0%, transparent 45%), radial-gradient(circle at 50% 88%, ${hexToRgba(b, 0.1)} 0%, transparent 50%)`,
      };
    }
    if (bgStyle === 'soft-sky') {
      return { backgroundColor: '#121826', backgroundImage: `radial-gradient(circle at 75% 20%, ${hexToRgba(b, 0.1)} 0%, transparent 55%)` };
    }
    if (bgStyle === 'soft-blush') {
      return { backgroundColor: '#1A1421', backgroundImage: `radial-gradient(circle at 75% 20%, ${hexToRgba(p, 0.1)} 0%, transparent 55%)` };
    }
    if (bgStyle === 'soft-butter') {
      return { backgroundColor: '#191814', backgroundImage: `radial-gradient(circle at 75% 20%, ${hexToRgba(y, 0.09)} 0%, transparent 55%)` };
    }
    return { backgroundColor: '#0F1117' };
  }

  switch (bgStyle) {
    case 'pastel-blend':
      return {
        backgroundColor: '#FFFDF8',
        backgroundImage: `radial-gradient(circle at 10% 15%, ${hexToRgba(y, 0.42)} 0%, transparent 42%), radial-gradient(circle at 90% 18%, ${hexToRgba(p, 0.4)} 0%, transparent 44%), radial-gradient(circle at 55% 88%, ${hexToRgba(b, 0.38)} 0%, transparent 48%)`,
      };
    case 'soft-sky':
      return {
        backgroundColor: '#F5FAFF',
        backgroundImage: `radial-gradient(circle at 80% 15%, ${hexToRgba(b, 0.35)} 0%, transparent 55%)`,
      };
    case 'soft-blush':
      return {
        backgroundColor: '#FFF8FB',
        backgroundImage: `radial-gradient(circle at 80% 15%, ${hexToRgba(p, 0.35)} 0%, transparent 55%)`,
      };
    case 'soft-butter':
      return {
        backgroundColor: '#FFFDF2',
        backgroundImage: `radial-gradient(circle at 80% 15%, ${hexToRgba(y, 0.35)} 0%, transparent 55%)`,
      };
    case 'soft-cream':
    default:
      return { backgroundColor: '#F7F7FA' };
  }
}
