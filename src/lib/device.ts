/**
 * Real phones/tablets only. Don't use `(pointer: coarse)` for this: touch laptops and
 * some embedded browsers report a coarse pointer even when the user has a mouse and keyboard.
 */
export function isPhoneLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua)) return true;
  // iPadOS 13+ pretends to be a Mac
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}
