import { deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

/**
 * Permanently deletes the signed-in user's account:
 * profile, private data, @nickname, block list, read state, then the Auth user.
 * Messages they already sent stay in rooms/chats (with their name at the time),
 * like most chat apps.
 *
 * Google sign-in is confirmed again first, so the Auth delete never fails with
 * "requires-recent-login" after the data is already gone.
 */
export async function deleteMyAccount(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('not-signed-in');

  await reauthenticateWithPopup(user, googleProvider);

  const uid = user.uid;
  let nickname = '';
  try {
    const pub = await getDoc(doc(db, 'users_public', uid));
    nickname = (pub.data()?.nickname as string) || '';
  } catch {
    // profile may already be gone
  }

  const refs = [
    nickname ? doc(db, 'nicknames', nickname) : null,
    doc(db, 'users_public', uid),
    doc(db, 'users_private', uid),
    doc(db, 'blocks', uid),
    doc(db, 'read_states', uid),
    doc(db, 'rate_limits', uid),
  ].filter(Boolean) as ReturnType<typeof doc>[];

  for (const ref of refs) {
    try {
      await deleteDoc(ref);
    } catch (err) {
      console.warn('Account cleanup skipped', ref.path, err);
    }
  }

  await deleteUser(user);
}
