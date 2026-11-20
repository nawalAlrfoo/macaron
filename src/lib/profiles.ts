import { useEffect, useSyncExternalStore } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Messages no longer carry a copy of the sender's photo (a data-URL avatar is up to 60 KB,
 * repeated on every message). They store this short marker instead, and the photo is
 * loaded once per person from users_public — which also keeps avatars current after a change.
 */
export const PROFILE_PHOTO_REF = '@p';

/** What to store as senderPhoto: short image links stay inline, big data URLs become a reference. */
export function senderPhotoValue(photoUrl: string): string {
  if (!photoUrl) return PROFILE_PHOTO_REF;
  return photoUrl.startsWith('data:') || photoUrl.length > 1000 ? PROFILE_PHOTO_REF : photoUrl;
}

interface CachedProfile {
  photoUrl: string;
  name: string;
  at: number;
}

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CachedProfile>();
const pending = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

async function load(uid: string) {
  if (pending.has(uid)) return;
  const hit = cache.get(uid);
  if (hit && Date.now() - hit.at < TTL_MS) return;
  pending.add(uid);
  try {
    const snap = await getDoc(doc(db, 'users_public', uid));
    const data = snap.data() as { photoUrl?: string; name?: string } | undefined;
    cache.set(uid, { photoUrl: data?.photoUrl ?? '', name: data?.name ?? '', at: Date.now() });
  } catch {
    // deleted account or no access: fall back to initials
    cache.set(uid, { photoUrl: '', name: '', at: Date.now() });
  } finally {
    pending.delete(uid);
    emit();
  }
}

/** Seed the cache with a profile we already have (e.g. the signed-in user). */
export function primeProfile(uid: string, photoUrl: string, name: string) {
  const cur = cache.get(uid);
  if (cur && cur.photoUrl === photoUrl && cur.name === name) return;
  cache.set(uid, { photoUrl, name, at: Date.now() });
  emit();
}

/** Re-renders when any requested profile arrives; returns a lookup for photo URLs. */
export function useProfilePhotos(uids: string[]): (uid: string, stored?: string) => string | undefined {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version
  );
  const key = Array.from(new Set(uids)).sort().join(',');
  useEffect(() => {
    if (!key) return;
    key.split(',').forEach((uid) => void load(uid));
  }, [key]);

  return (uid, stored) => {
    if (stored && stored !== PROFILE_PHOTO_REF) return stored;
    return cache.get(uid)?.photoUrl || undefined;
  };
}
