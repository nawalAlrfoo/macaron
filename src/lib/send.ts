import { doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { senderPhotoValue } from './profiles';
import { ChatMessage, UserPublicProfile, VALIDATION_LIMITS } from '@/src/types/chat';

/** Same gap the composer uses; firestore.rules enforces at least 1 second (passesSlowMode). */
export const SEND_GAP_MS = 1500;
let lastSentAt = 0;

/** Shared by every composer so the main chat and the thread panel never trip the rule together */
export async function waitForSendSlot(): Promise<void> {
  const wait = lastSentAt + SEND_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => window.setTimeout(r, wait));
}
export function markSent() {
  lastSentAt = Date.now();
}

/**
 * Text reply to a room message (used by the thread panel).
 * Writes the message + the slow-mode stamp in one batch, like the main composer.
 */
export async function sendRoomReply(opts: {
  roomId: string;
  profile: UserPublicProfile;
  text: string;
  replyTo: ChatMessage;
  voiceLabel: string;
  photoLabel: string;
}): Promise<void> {
  const { roomId, profile, replyTo } = opts;
  const text = opts.text.trim().slice(0, VALIDATION_LIMITS.MAX_MESSAGE_LEN);
  if (!text) return;

  await waitForSendSlot();

  const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const batch = writeBatch(db);
  batch.set(doc(db, 'rooms', roomId, 'messages', msgId), {
    id: msgId,
    roomId,
    senderUid: profile.uid,
    senderName: profile.name.slice(0, VALIDATION_LIMITS.MAX_NAME_LEN),
    senderNickname: profile.nickname.slice(0, VALIDATION_LIMITS.MAX_NICKNAME_LEN),
    senderPhoto: senderPhotoValue(profile.photoUrl).slice(0, VALIDATION_LIMITS.MAX_PHOTO_LEN),
    text,
    replyToId: replyTo.id.slice(0, VALIDATION_LIMITS.MAX_ID_LEN),
    replyToSender: replyTo.senderName.slice(0, VALIDATION_LIMITS.MAX_NAME_LEN),
    replyToText: (replyTo.text || (replyTo.audioUrl ? opts.voiceLabel : opts.photoLabel)).slice(
      0,
      VALIDATION_LIMITS.MAX_REPLY_TEXT_LEN
    ),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'rate_limits', profile.uid), { lastMessageAt: serverTimestamp() });
  await batch.commit();
  markSent();
  void updateDoc(doc(db, 'rooms', roomId), { lastMessageAt: serverTimestamp() }).catch(() => {});
}

/** "3 ردود" / "3 replies" with Arabic plural forms */
export function repliesLabel(n: number, lang: 'ar' | 'en'): string {
  if (lang === 'en') return n === 1 ? '1 reply' : `${n} replies`;
  if (n === 1) return 'رد واحد';
  if (n === 2) return 'ردّين';
  if (n <= 10) return `${n} ردود`;
  return `${n} رد`;
}
