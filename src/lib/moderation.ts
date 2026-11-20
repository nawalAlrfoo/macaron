import { useEffect, useState } from 'react';
import { arrayRemove, arrayUnion, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { showToast } from './toast';

export type ReportReason = 'spam' | 'abuse' | 'inappropriate' | 'other';

/** Live list of uids the current user has blocked */
export function useBlockedUids(myUid: string | undefined): string[] {
  const [blocked, setBlocked] = useState<string[]>([]);
  useEffect(() => {
    if (!myUid) {
      setBlocked([]);
      return;
    }
    return onSnapshot(
      doc(db, 'blocks', myUid),
      (snap) => setBlocked(((snap.data()?.blocked as string[] | undefined) ?? []).filter(Boolean)),
      () => setBlocked([])
    );
  }, [myUid]);
  return blocked;
}

export async function blockUser(myUid: string, targetUid: string) {
  if (!myUid || !targetUid || myUid === targetUid) return;
  try {
    await setDoc(
      doc(db, 'blocks', myUid),
      { uid: myUid, blocked: arrayUnion(targetUid), updatedAt: serverTimestamp() },
      { merge: true }
    );
    showToast({ kind: 'success', key: 'blockedToast' });
  } catch (err) {
    console.error('Block failed:', err);
    showToast({ kind: 'error', key: 'errGeneric' });
  }
}

export async function unblockUser(myUid: string, targetUid: string) {
  try {
    await setDoc(
      doc(db, 'blocks', myUid),
      { uid: myUid, blocked: arrayRemove(targetUid), updatedAt: serverTimestamp() },
      { merge: true }
    );
    showToast({ kind: 'success', key: 'unblockedToast' });
  } catch (err) {
    console.error('Unblock failed:', err);
    showToast({ kind: 'error', key: 'errGeneric' });
  }
}

export interface ReportInput {
  reporterUid: string;
  targetUid: string;
  targetName?: string;
  targetNickname?: string;
  reason: ReportReason;
  note?: string;
  roomId?: string;
  chatId?: string;
  messageId?: string;
  messageText?: string;
}

export async function submitReport(input: ReportInput): Promise<boolean> {
  const id = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const data: Record<string, unknown> = {
    id,
    reporterUid: input.reporterUid,
    targetUid: input.targetUid,
    reason: input.reason,
    status: 'open',
    createdAt: serverTimestamp(),
  };
  if (input.targetName) data.targetName = input.targetName.slice(0, 60);
  if (input.targetNickname) data.targetNickname = input.targetNickname.slice(0, 40);
  if (input.note?.trim()) data.note = input.note.trim().slice(0, 300);
  if (input.roomId) data.roomId = input.roomId;
  if (input.chatId) data.chatId = input.chatId;
  if (input.messageId) data.messageId = input.messageId;
  if (input.messageText) data.messageText = input.messageText.slice(0, 300);
  try {
    await setDoc(doc(db, 'reports', id), data);
    showToast({ kind: 'success', key: 'reportSentToast' });
    return true;
  } catch (err) {
    console.error('Report failed:', err);
    showToast({ kind: 'error', key: 'errGeneric' });
    return false;
  }
}
