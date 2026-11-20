import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  ArrowDown,
  Award,
  CheckCircle2,
  Flag,
  Mic,
  Camera,
  Square,
  Check,
  Copy,
  Edit3,
  ImagePlus,
  Reply,
  Search,
  Send,
  Smile,
  SmilePlus,
  MoreHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { TRANSLATIONS } from '@/src/i18n/translations';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import {
  ChatMessage,
  ChatRoom,
  DirectChat,
  isChatAccepted,
  Language,
  DEFAULT_SITE_SETTINGS,
  REACTION_EMOJIS,
  readKey,
  SiteSettings,
  ThemeMode,
  TYPING_TTL_MS,
  UserPublicProfile,
  VALIDATION_LIMITS,
} from '@/src/types/chat';
import {
  getReadableTextColor,
  hexToRgba,
  resolveBubbleSurface,
  resolveChatBackdropStyle,
} from '@/src/utils/colors';
import { compressChatPhotoFile } from '@/src/utils/image';
import { getPrefs } from '@/src/lib/prefs';
import { primeProfile, senderPhotoValue, useProfilePhotos } from '@/src/lib/profiles';
import { showToast } from '@/src/lib/toast';
import { VoiceNote } from './VoiceNote';
import { renderRichText, setMentionSelf } from './RichText';
import { markSent, repliesLabel, waitForSendSlot } from '@/src/lib/send';
import { isPhoneLike } from '@/src/lib/device';
import { ThreadPanel } from './ThreadPanel';
import { ProfileCard, type ProfileCardTarget } from './ProfileCard';
import { MessageSheet, QUICK_REACTIONS } from './MessageSheet';
import { ReportDialog, type ReportTarget } from './ReportDialog';
import { AvatarImg } from './AvatarImg';
import { MacaronLogo } from './MacaronLogo';

interface ChatRoomViewProps {
  mode: 'room' | 'direct';
  room?: ChatRoom;
  directChat?: DirectChat;
  currentUserProfile: UserPublicProfile;
  isAdmin: boolean;
  language: Language;
  themeMode: ThemeMode;
  settings: SiteSettings;
  /** Called whenever the user has seen the latest messages of this conversation */
  onMarkRead?: (key: string) => void;
  /** Called after the current user declines/cancels a pending request (chat is deleted) */
  onLeaveChat?: () => void;
  /** Messages from these people are hidden */
  blockedUids?: string[];
  /** Open / request a private chat with someone (from their profile card) */
  onMessageUser?: (profile: UserPublicProfile) => Promise<void> | void;
}

const QUICK_EMOJIS = ['✨', '💛', '🩷', '🩵', '🌸', '☁️', '☕', '😊', '🫶', '🌟'];
const TYPING_WRITE_INTERVAL_MS = 2500;
const NEAR_BOTTOM_PX = 140;
const PAGE_SIZE = 40;
const MAX_LOADED = 200; // keep in sync with request.query.limit in firestore.rules

/** Quote preview without formatting marks (`code`, **bold**, ```blocks```) */
function plainQuote(text: string) {
  return text.replace(/```[a-z0-9+#-]*\n?/gi, '').replace(/`/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

/** A room message that asks something and hasn't been answered/solved yet */
function isOpenQuestion(m: ChatMessage) {
  return !m.replyToId && !m.solved && !m.acceptedAnswerId && /[?؟]/.test(m.text || '');
}
const QUEUE_AFTER_MS = 6000;

function dayKeyOf(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

interface TyperEntry {
  uid: string;
  name: string;
  seenAt: number;
}

export const ChatRoomView: React.FC<ChatRoomViewProps> = ({
  mode,
  room,
  directChat,
  currentUserProfile,
  isAdmin,
  language,
  themeMode,
  settings,
  onMarkRead,
  onLeaveChat,
  blockedUids,
  onMessageUser,
}) => {
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';
  const locale = isRtl ? 'ar-JO' : 'en-US';
  const myUid = currentUserProfile.uid;

  const targetId = mode === 'room' ? room?.id : directChat?.id;
  const baseCollection = mode === 'room' ? 'rooms' : 'direct_chats';

  // ---------- Message requests (private chats) ----------
  const isPending = mode === 'direct' && !!directChat && !isChatAccepted(directChat);
  const iRequested = isPending && directChat?.requestedBy === currentUserProfile.uid;
  const requestUsed = isPending && !!directChat?.requestMessageSent;
  const canCompose = !isPending || (iRequested && !requestUsed);
  const [requestBusy, setRequestBusy] = useState(false);

  const handleAcceptRequest = async () => {
    if (!directChat) return;
    setRequestBusy(true);
    try {
      await updateDoc(doc(db, 'direct_chats', directChat.id), {
        status: 'accepted',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `direct_chats/${directChat.id}`);
    } finally {
      setRequestBusy(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!directChat) return;
    setRequestBusy(true);
    try {
      // remove the request message(s) first so a future request starts clean
      const msgs = messages.map((m) => m.id);
      const batch = writeBatch(db);
      msgs.forEach((id) => batch.delete(doc(db, 'direct_chats', directChat.id, 'messages', id)));
      batch.delete(doc(db, 'direct_chats', directChat.id));
      await batch.commit();
      onLeaveChat?.();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `direct_chats/${directChat.id}`);
    } finally {
      setRequestBusy(false);
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showEmojiTray, setShowEmojiTray] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // UX state
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [reactPickerFor, setReactPickerFor] = useState<string | null>(null);
  const [actionsOpenFor, setActionsOpenFor] = useState<string | null>(null);
  const [onlyOpenQuestions, setOnlyOpenQuestions] = useState(false);
  // Thread (question + its answers) open in the side panel
  const [threadQuestion, setThreadQuestion] = useState<ChatMessage | null>(null);
  const [profileTarget, setProfileTarget] = useState<ProfileCardTarget | null>(null);
  const closeProfile = useCallback(() => setProfileTarget(null), []);
  // Tap anywhere outside the open message closes its action bar / emoji picker (phones)
  useEffect(() => {
    const openId = actionsOpenFor ?? reactPickerFor;
    if (!openId) return;
    const onDown = (e: PointerEvent) => {
      const row = (e.target as Element | null)?.closest?.('[data-msg-id]');
      if (row?.getAttribute('data-msg-id') === openId) return;
      setActionsOpenFor(null);
      setReactPickerFor(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [actionsOpenFor, reactPickerFor]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasNewBelow, setHasNewBelow] = useState(false);

  // Typing indicator
  const [typers, setTypers] = useState<TyperEntry[]>([]);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const typersMapRef = useRef<Map<string, TyperEntry>>(new Map());
  const lastTypingWriteRef = useRef(0);
  const typingActiveRef = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const nearBottomRef = useRef(true);
  const prevCountRef = useRef(0);

  const markRead = useCallback(() => {
    if (!targetId || !onMarkRead) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    onMarkRead(readKey(mode, targetId));
  }, [mode, targetId, onMarkRead]);

  // ---------- Messages listener (paged: newest PAGE_SIZE, older on demand) ----------
  const [pageLimit, setPageLimit] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scrollRestoreRef = useRef<{ height: number; top: number } | null>(null);
  const lastMsgIdRef = useRef<string | null>(null);

  // reset per conversation
  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    setPageLimit(PAGE_SIZE);
    setHasMore(false);
    lastMsgIdRef.current = null;
    scrollRestoreRef.current = null;
    setReplyTo(null);
    setEditingMsgId(null);
    setAttachedPhoto(null);
    setPhotoError('');
    setConfirmDeleteId(null);
    setReactPickerFor(null);
    setSearchQuery('');
    setSearchOpen(false);
    setHasNewBelow(false);
    nearBottomRef.current = true;
    prevCountRef.current = 0;
  }, [mode, targetId]);

  useEffect(() => {
    if (!targetId) return;
    const collectionPath = `${baseCollection}/${targetId}/messages`;

    // Single-field ordering → no composite index needed (access is checked by the rules on the parent)
    const q = query(collection(db, collectionPath), orderBy('createdAt', 'desc'), limit(pageLimit));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: ChatMessage[] = snapshot.docs.map((d) => d.data() as ChatMessage);
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? Date.now();
          const tb = b.createdAt?.toMillis?.() ?? Date.now();
          return ta - tb;
        });
        setMessages(list);
        setHasMore(snapshot.size >= pageLimit && pageLimit < MAX_LOADED);
        setLoading(false);
        setLoadingOlder(false);
      },
      (err) => {
        setLoading(false);
        setLoadingOlder(false);
        handleFirestoreError(err, OperationType.LIST, collectionPath);
      }
    );

    return () => unsub();
  }, [targetId, baseCollection, pageLimit]);

  const loadOlder = () => {
    if (!hasMore || loadingOlder) return;
    const el = scrollRef.current;
    if (el) scrollRestoreRef.current = { height: el.scrollHeight, top: el.scrollTop };
    setLoadingOlder(true);
    setPageLimit((n) => Math.min(n + PAGE_SIZE, MAX_LOADED));
  };

  // keep the reading position when older messages are added on top
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const saved = scrollRestoreRef.current;
    if (!el || !saved) return;
    el.scrollTop = el.scrollHeight - saved.height + saved.top;
    scrollRestoreRef.current = null;
  }, [messages]);

  // Mark as read when new messages arrive or the tab becomes visible again
  useEffect(() => {
    if (!loading) markRead();
  }, [messages, loading, markRead]);

  useEffect(() => {
    const onVis = () => markRead();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [markRead]);

  // ---------- Typing indicator ----------
  const typingDoc = useCallback(
    (id: string) => doc(db, baseCollection, id, 'typing', myUid),
    [baseCollection, myUid]
  );

  const clearTyping = useCallback(
    (id: string | undefined) => {
      if (!id || !typingActiveRef.current) return;
      typingActiveRef.current = false;
      lastTypingWriteRef.current = 0;
      deleteDoc(typingDoc(id)).catch(() => {});
    },
    [typingDoc]
  );

  const pingTyping = () => {
    if (!targetId) return;
    const now = Date.now();
    if (now - lastTypingWriteRef.current < TYPING_WRITE_INTERVAL_MS) return;
    lastTypingWriteRef.current = now;
    typingActiveRef.current = true;
    setDoc(typingDoc(targetId), {
      uid: myUid,
      name: currentUserProfile.name.slice(0, VALIDATION_LIMITS.MAX_NAME_LEN),
      updatedAt: serverTimestamp(),
    }).catch(() => {
      // rules not deployed yet or offline — the indicator is optional
    });
  };

  useEffect(() => {
    if (!targetId) return;
    typersMapRef.current = new Map();
    setTypers([]);

    const unsub = onSnapshot(
      collection(db, baseCollection, targetId, 'typing'),
      (snap) => {
        const map = typersMapRef.current;
        const now = Date.now();
        snap.docChanges().forEach((change) => {
          const data = change.doc.data() as { uid: string; name: string };
          if (!data?.uid || data.uid === myUid) return;
          if (change.type === 'removed') {
            map.delete(data.uid);
          } else {
            map.set(data.uid, { uid: data.uid, name: data.name, seenAt: now });
          }
        });
        setTypers(Array.from(map.values()));
        setNowTick(now);
      },
      () => setTypers([])
    );

    return () => {
      unsub();
      clearTyping(targetId);
    };
  }, [baseCollection, targetId, myUid, clearTyping]);

  // Re-render every 2s while someone is typing so stale entries expire
  useEffect(() => {
    if (typers.length === 0) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 2000);
    return () => window.clearInterval(id);
  }, [typers.length]);

  const activeTypers = typers.filter((ty) => nowTick - ty.seenAt < TYPING_TTL_MS);
  const typingLabel =
    activeTypers.length === 0
      ? ''
      : activeTypers.length === 1
        ? t.typingOne.replace('{name}', activeTypers[0].name)
        : t.typingMany.replace('{count}', String(activeTypers.length));

  // ---------- Scrolling ----------
  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
    setHasNewBelow(false);
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    nearBottomRef.current = near;
    if (el.scrollTop < 80 && hasMore && !loadingOlder && !loading) loadOlder();
    if (near) setHasNewBelow(false);
  };

  useEffect(() => {
    if (loading) return;
    const prev = prevCountRef.current;
    prevCountRef.current = messages.length;
    const last = messages[messages.length - 1];
    const lastId = last?.id ?? null;
    const sameLast = lastId === lastMsgIdRef.current;
    lastMsgIdRef.current = lastId;
    if (messages.length <= prev) return;
    if (prev > 0 && sameLast) return; // older page prepended — not a new message

    if (prev === 0) {
      // first load of this conversation: jump without animation
      requestAnimationFrame(() => scrollToBottom(false));
    } else if (nearBottomRef.current || last?.senderUid === myUid) {
      scrollToBottom(true);
    } else {
      setHasNewBelow(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, loading]);

  const closeThread = useCallback(() => setThreadQuestion(null), []);
  const openProfileOf = (msg: ChatMessage) => {
    if (msg.senderUid === myUid) return;
    setActionsOpenFor(null);
    setProfileTarget({
      uid: msg.senderUid,
      name: msg.senderName,
      nickname: msg.senderNickname,
      photoUrl: photoFor(msg.senderUid, msg.senderPhoto),
    });
  };

  const jumpToMessage = (msgId?: string) => {
    if (!msgId) return;
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-msg-id="${CSS.escape(msgId)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(msgId);
    window.setTimeout(() => setHighlightId((cur) => (cur === msgId ? null : cur)), 1600);
  };

  // ---------- Composer ----------
  const autoGrow = () => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // hidden (e.g. phone list screen showing): measure later instead of locking it at 0px
    if (!el.scrollHeight) return;
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  useEffect(() => {
    autoGrow();
  }, [text]);

  const handlePhotoFile = async (file: File) => {
    setPhotoError('');
    try {
      const compressed = await compressChatPhotoFile(file);
      setAttachedPhoto(compressed);
    } catch {
      setPhotoError(t.imageTooLargeError);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await handlePhotoFile(file);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await handlePhotoFile(file);
          break;
        }
      }
    }
  };

  const handleTextChange = (value: string) => {
    setText(value);
    if (value.trim()) pingTyping();
    else clearTyping(targetId);
  };

  // Give the user their message back instead of losing it
  const onSendFailed = (
    err: unknown,
    backup: { text: string; photo: string | null; replyTo: ChatMessage | null } | null,
    voice: unknown,
    path: string
  ) => {
    if (backup && !voice) {
      setText((cur) => cur || backup.text);
      setAttachedPhoto((cur) => cur ?? backup.photo);
      setReplyTo((cur) => cur ?? backup.replyTo);
    }
    if ((err as { code?: string })?.code === 'permission-denied') {
      showToast({ kind: 'error', key: 'sendTooFast' });
    } else {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  /** Offline: Firestore keeps the write queued; don't keep the composer locked meanwhile. */
  const commitOrQueue = async (commit: Promise<void>, onLateError: (err: unknown) => void) => {
    let timer = 0;
    const result = await Promise.race([
      commit.then(() => 'sent' as const),
      new Promise<'queued'>((resolve) => {
        timer = window.setTimeout(() => resolve('queued'), QUEUE_AFTER_MS);
      }),
    ]);
    window.clearTimeout(timer);
    if (result === 'queued') {
      commit.catch(onLateError);
      showToast({ kind: 'info', key: 'messageQueued' });
    }
  };

  const handleSend = async (e?: React.FormEvent, voice?: { url: string; duration: number }) => {
    e?.preventDefault();
    if (!targetId) return;

    const clean = voice ? '' : text.trim().slice(0, VALIDATION_LIMITS.MAX_MESSAGE_LEN);
    const hasPhoto = !voice && Boolean(attachedPhoto && attachedPhoto.length > 0);
    if ((!clean && !hasPhoto && !voice) || sending) return;

    setSending(true);
    setShowEmojiTray(false);
    setPhotoError('');
    clearTyping(targetId);

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const path = `${baseCollection}/${targetId}/messages/${msgId}`;
    let draftBackup: { text: string; photo: string | null; replyTo: ChatMessage | null } | null = null;

    try {
      const payload: Record<string, unknown> = {
        id: msgId,
        senderUid: myUid,
        senderName: currentUserProfile.name.slice(0, VALIDATION_LIMITS.MAX_NAME_LEN),
        senderNickname: currentUserProfile.nickname.slice(0, VALIDATION_LIMITS.MAX_NICKNAME_LEN),
        // big data-URL avatars are loaded once per person instead of copied into every message
        senderPhoto: senderPhotoValue(currentUserProfile.photoUrl).slice(0, VALIDATION_LIMITS.MAX_PHOTO_LEN),
        text: clean,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (mode === 'room') {
        payload.roomId = targetId;
      } else if (directChat) {
        payload.chatId = targetId;
        payload.participantUids = directChat.participantUids;
      }

      if (hasPhoto && attachedPhoto) {
        payload.imageUrl = attachedPhoto.slice(0, VALIDATION_LIMITS.MAX_CHAT_IMAGE_LEN);
      }

      if (voice) {
        payload.audioUrl = voice.url;
        payload.audioDuration = Math.round(voice.duration);
      }

      if (replyTo) {
        payload.replyToId = replyTo.id.slice(0, VALIDATION_LIMITS.MAX_ID_LEN);
        payload.replyToSender = replyTo.senderName.slice(0, VALIDATION_LIMITS.MAX_NAME_LEN);
        payload.replyToText = (replyTo.text || (replyTo.audioUrl ? t.voiceMessage : t.photoSentPreview)).slice(
          0,
          VALIDATION_LIMITS.MAX_REPLY_TEXT_LEN
        );
      }

      // Clear the composer right away so it feels instant
      draftBackup = { text, photo: attachedPhoto, replyTo };
      if (!voice) {
        setText('');
        setAttachedPhoto(null);
      }
      setReplyTo(null);

      // Slow mode (also enforced by firestore.rules): one message per SEND_GAP_MS
      await waitForSendSlot();

      const rateRef = doc(db, 'rate_limits', myUid);
      if (mode === 'direct' && directChat) {
        const batch = writeBatch(db);
        batch.set(doc(db, 'direct_chats', targetId, 'messages', msgId), payload);
        batch.set(rateRef, { lastMessageAt: serverTimestamp() });
        batch.update(doc(db, 'direct_chats', targetId), {
          lastMessageText: (clean || (voice ? t.voiceMessage : t.photoSentPreview)).slice(0, 200),
          updatedAt: serverTimestamp(),
          // the single message allowed while the chat is still a request
          ...(isPending && iRequested ? { requestMessageSent: true } : {}),
        });
        await commitOrQueue(batch.commit(), (err) => onSendFailed(err, draftBackup, voice, path));
      } else {
        const batch = writeBatch(db);
        batch.set(doc(db, 'rooms', targetId, 'messages', msgId), payload);
        batch.set(rateRef, { lastMessageAt: serverTimestamp() });
        await commitOrQueue(batch.commit(), (err) => onSendFailed(err, draftBackup, voice, path));
        // Separate, non-blocking write: sending must still work if the
        // lastMessageAt rule isn't deployed yet.
        void updateDoc(doc(db, 'rooms', targetId), { lastMessageAt: serverTimestamp() }).catch(
          (err) => console.warn('lastMessageAt update skipped:', err?.message ?? err)
        );
      }
      markSent();
      markRead();
    } catch (err) {
      onSendFailed(err, draftBackup, voice, path);
    } finally {
      setSending(false);
      composerRef.current?.focus();
    }
  };

  // ---------- Voice messages ----------
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [voiceError, setVoiceError] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recStreamRef = useRef<MediaStream | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef(0);
  const recCancelledRef = useRef(false);
  const recTimerRef = useRef<number | null>(null);

  const stopStream = () => {
    recStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    recStreamRef.current = null;
    if (recTimerRef.current) window.clearInterval(recTimerRef.current);
    recTimerRef.current = null;
  };

  const startRecording = async () => {
    setVoiceError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceError(t.voiceUnsupported);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recStreamRef.current = stream;
      const mimeType = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find(
        (m) => MediaRecorder.isTypeSupported?.(m)
      );
      const rec = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 24000,
      });
      recChunksRef.current = [];
      recCancelledRef.current = false;
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) recChunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        const duration = (Date.now() - recStartRef.current) / 1000;
        stopStream();
        setRecording(false);
        if (recCancelledRef.current || duration < 0.5) return;
        const blob = new Blob(recChunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const url = String(reader.result || '');
          if (url.length > VALIDATION_LIMITS.MAX_AUDIO_LEN) {
            setVoiceError(t.voiceTooLong);
            return;
          }
          void handleSend(undefined, { url, duration });
        };
        reader.readAsDataURL(blob);
      };
      recorderRef.current = rec;
      recStartRef.current = Date.now();
      rec.start(250);
      setRecSeconds(0);
      setRecording(true);
      clearTyping(targetId);
      recTimerRef.current = window.setInterval(() => {
        const secs = Math.floor((Date.now() - recStartRef.current) / 1000);
        setRecSeconds(secs);
        if (secs >= VALIDATION_LIMITS.MAX_VOICE_SECONDS) recorderRef.current?.stop();
      }, 250);
    } catch {
      stopStream();
      setVoiceError(t.voiceMicDenied);
    }
  };

  const finishRecording = (cancel: boolean) => {
    recCancelledRef.current = cancel;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    } else {
      stopStream();
      setRecording(false);
    }
  };

  // Stop the microphone if the user switches conversation while recording
  useEffect(() => {
    return () => {
      recCancelledRef.current = true;
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
      stopStream();
    };
  }, [targetId]);

  const fmtSecs = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const enterSends = getPrefs().enterToSend && !isPhoneLike();
    const isSendCombo = enterSends
      ? e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing
      : e.key === 'Enter' && (e.ctrlKey || e.metaKey);
    if (isSendCombo) {
      e.preventDefault();
      void handleSend();
    } else if (e.key === 'Escape') {
      setReplyTo(null);
      setShowEmojiTray(false);
    }
  };

  // ---------- Message actions ----------
  const handleSaveEdit = async (msg: ChatMessage) => {
    if (!targetId) return;
    const clean = editValue.trim().slice(0, VALIDATION_LIMITS.MAX_MESSAGE_LEN);
    if (!clean && !msg.imageUrl) return;
    if (clean === msg.text) {
      setEditingMsgId(null);
      return;
    }
    const path = `${baseCollection}/${targetId}/messages/${msg.id}`;
    try {
      await updateDoc(doc(db, baseCollection, targetId, 'messages', msg.id), {
        text: clean,
        updatedAt: serverTimestamp(),
      });
      setEditingMsgId(null);
      setEditValue('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!targetId) return;
    setConfirmDeleteId(null);
    const path = `${baseCollection}/${targetId}/messages/${msgId}`;
    try {
      await deleteDoc(doc(db, baseCollection, targetId, 'messages', msgId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleToggleReaction = async (msg: ChatMessage, emoji: string) => {
    if (!targetId) return;
    setReactPickerFor(null);
    const current = msg.reactions?.[myUid];
    try {
      await updateDoc(doc(db, baseCollection, targetId, 'messages', msg.id), {
        [`reactions.${myUid}`]: current === emoji ? deleteField() : emoji,
      });
    } catch (err) {
      console.warn('Reaction failed (are the new firestore.rules deployed?):', err);
    }
  };

  const handleCopy = async (msg: ChatMessage) => {
    if (!msg.text) return;
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopiedId(msg.id);
      window.setTimeout(() => setCopiedId((cur) => (cur === msg.id ? null : cur)), 1200);
    } catch {
      // clipboard blocked — ignore
    }
  };

  // Close floating menus with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setReactPickerFor(null);
      setConfirmDeleteId(null);
      setLightboxImage(null);
      setActionsOpenFor(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---------- Formatting ----------
  const formatTime = (msg: ChatMessage) => {
    const date = msg.createdAt?.toDate?.();
    if (!date) return '···';
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
  };

  const formatDayLabel = (date: Date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (dayKeyOf(date) === dayKeyOf(today)) return t.todayLabel;
    if (dayKeyOf(date) === dayKeyOf(yesterday)) return t.yesterdayLabel;
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
    }).format(date);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const blockedSet = useMemo(() => new Set(blockedUids ?? []), [blockedUids]);
  // How many loaded answers each message has (thread chips)
  const replyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of messages) {
      if (m.replyToId && !blockedSet.has(m.senderUid)) counts[m.replyToId] = (counts[m.replyToId] ?? 0) + 1;
    }
    return counts;
  }, [messages, blockedSet]);
  // Switching rooms closes the thread
  useEffect(() => setThreadQuestion(null), [targetId]);
  const msgById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const acceptedIds = useMemo(
    () => new Set(messages.map((m) => m.acceptedAnswerId).filter(Boolean) as string[]),
    [messages]
  );

  const toggleSolved = async (msg: ChatMessage) => {
    if (mode !== 'room' || !targetId) return;
    setActionsOpenFor(null);
    try {
      await updateDoc(
        doc(db, 'rooms', targetId, 'messages', msg.id),
        msg.solved ? { solved: false, acceptedAnswerId: deleteField() } : { solved: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${targetId}/messages/${msg.id}`);
    }
  };

  const pickBestAnswer = async (questionMsg: ChatMessage, answer: ChatMessage) => {
    if (mode !== 'room' || !targetId) return;
    setActionsOpenFor(null);
    const already = questionMsg.acceptedAnswerId === answer.id;
    try {
      await updateDoc(
        doc(db, 'rooms', targetId, 'messages', questionMsg.id),
        already ? { acceptedAnswerId: deleteField() } : { solved: true, acceptedAnswerId: answer.id }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${targetId}/messages/${questionMsg.id}`);
    }
  };
  const visibleMessages = useMemo(() => {
    let base = blockedSet.size ? messages.filter((m) => !blockedSet.has(m.senderUid)) : messages;
    if (onlyOpenQuestions && mode === 'room') base = base.filter(isOpenQuestion);
    if (!normalizedQuery) return base;
    return base.filter(
      (m) =>
        m.text?.toLowerCase().includes(normalizedQuery) ||
        m.senderName?.toLowerCase().includes(normalizedQuery) ||
        m.senderNickname?.toLowerCase().includes(normalizedQuery)
    );
  }, [messages, normalizedQuery, blockedSet, onlyOpenQuestions, mode]);
  const openQuestionsCount = useMemo(
    () => (mode === 'room' ? messages.filter((m) => isOpenQuestion(m) && !blockedSet.has(m.senderUid)).length : 0),
    [messages, mode, blockedSet]
  );

  setMentionSelf(currentUserProfile.nickname ?? '');
  useEffect(() => {
    primeProfile(myUid, currentUserProfile.photoUrl, currentUserProfile.name);
  }, [myUid, currentUserProfile.photoUrl, currentUserProfile.name]);
  const photoFor = useProfilePhotos(
    visibleMessages.filter((m) => m.senderPhoto === '@p').map((m) => m.senderUid)
  );

  // Instagram-style look is fixed by the design (the brand violet from CSS), so old saved
  // pastel colours in site settings can't override it.
  const backdropStyle: React.CSSProperties = { backgroundColor: 'var(--surface)' };
  const myBg = 'var(--primary)';
  const myText = '#FFFFFF';
  const otherBg = 'var(--bubble-other)';
  const otherText = themeMode === 'dark' ? '#F2F2F5' : '#111114';
  const gradient = 'var(--primary)';

  // ---------- Touch interactions: long-press menu, double-tap ❤️, swipe to reply ----------
  const [sheetMsg, setSheetMsg] = useState<ChatMessage | null>(null);
  const [heartBurstId, setHeartBurstId] = useState<string | null>(null);
  const closeSheet = useCallback(() => setSheetMsg(null), []);
  const gestureRef = useRef<{
    id: string;
    x: number;
    y: number;
    timer: number;
    dx: number;
    swiping: boolean;
    longPressed: boolean;
    el: HTMLElement | null;
  } | null>(null);
  const lastTapRef = useRef<{ id: string; at: number }>({ id: '', at: 0 });
  const lastPointerTypeRef = useRef<string>('mouse');
  // Mouse hover tracked in JS: Tailwind v4 `hover:` is off on devices that report no hover (touch laptops)
  const [hoverMsgId, setHoverMsgId] = useState<string | null>(null);
  const SWIPE_REPLY_PX = 56;

  const vibrate = (ms = 10) => {
    try {
      navigator.vibrate?.(ms);
    } catch {
      // not supported
    }
  };

  const startReply = (msg: ChatMessage) => {
    setReplyTo(msg);
    setSheetMsg(null);
    setReactPickerFor(null);
    composerRef.current?.focus();
  };

  /** Instagram-style like: double tap always adds ❤️ (never removes it) */
  const likeMessage = (msg: ChatMessage) => {
    setHeartBurstId(msg.id);
    window.setTimeout(() => setHeartBurstId((cur) => (cur === msg.id ? null : cur)), 750);
    vibrate(12);
    if (msg.reactions?.[myUid] !== '❤️') void handleToggleReaction(msg, '❤️');
  };

  const onBubbleTap = (msg: ChatMessage) => {
    if (gestureRef.current?.longPressed || gestureRef.current?.swiping) return;
    const now = Date.now();
    const last = lastTapRef.current;
    // touch screens: two taps = like (mouse users get onDoubleClick)
    if (lastPointerTypeRef.current !== 'mouse' && last.id === msg.id && now - last.at < 320) {
      lastTapRef.current = { id: '', at: 0 };
      likeMessage(msg);
      return;
    }
    lastTapRef.current = { id: msg.id, at: now };
  };

  const resetSwipe = (el: HTMLElement | null) => {
    if (!el) return;
    el.style.transition = 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)';
    el.style.transform = '';
    window.setTimeout(() => {
      el.style.transition = '';
    }, 200);
  };

  const onBubblePointerDown = (e: React.PointerEvent<HTMLDivElement>, msg: ChatMessage) => {
    lastPointerTypeRef.current = e.pointerType;
    if (e.pointerType === 'mouse' || editingMsgId === msg.id) return;
    const el = e.currentTarget;
    const g = { id: msg.id, x: e.clientX, y: e.clientY, timer: 0, dx: 0, swiping: false, longPressed: false, el };
    g.timer = window.setTimeout(() => {
      g.longPressed = true;
      vibrate(15);
      setSheetMsg(msg);
    }, 430);
    gestureRef.current = g;
  };

  const onBubblePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g || e.pointerType === 'mouse') return;
    const dxRaw = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (Math.abs(dxRaw) > 8 || Math.abs(dy) > 8) window.clearTimeout(g.timer);
    // swipe towards the reading direction's end (right in LTR, left in RTL) = reply
    const dx = isRtl ? -dxRaw : dxRaw;
    if (!g.swiping && dx > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) g.swiping = true;
    if (g.swiping && g.el) {
      g.dx = Math.max(0, Math.min(dx, 90));
      const shown = g.dx < SWIPE_REPLY_PX ? g.dx : SWIPE_REPLY_PX + (g.dx - SWIPE_REPLY_PX) * 0.3;
      g.el.style.transform = `translateX(${isRtl ? -shown : shown}px)`;
    }
  };

  const onBubblePointerUp = (_e: React.PointerEvent<HTMLDivElement>, msg: ChatMessage) => {
    const g = gestureRef.current;
    if (!g) return;
    window.clearTimeout(g.timer);
    if (g.swiping) {
      if (g.dx >= SWIPE_REPLY_PX) {
        vibrate(10);
        startReply(msg);
      }
      resetSwipe(g.el);
    }
    // keep the flags for the click that follows, then forget the gesture
    window.setTimeout(() => {
      if (gestureRef.current === g) gestureRef.current = null;
    }, 60);
  };

  const onBubblePointerCancel = () => {
    const g = gestureRef.current;
    if (!g) return;
    window.clearTimeout(g.timer);
    resetSwipe(g.el);
    gestureRef.current = null;
  };

  // ---------- Bubble shape (Instagram Direct style: tight corners inside a group) ----------
  type GroupPos = 'single' | 'first' | 'middle' | 'last';
  const bubbleRadius = (isMine: boolean, pos: GroupPos) => {
    const base = 'rounded-[22px]';
    if (pos === 'single') return base;
    if (isMine) {
      if (pos === 'first') return `${base} rounded-ee-[6px]`;
      if (pos === 'middle') return `${base} rounded-se-[6px] rounded-ee-[6px]`;
      return `${base} rounded-se-[6px]`;
    }
    if (pos === 'first') return `${base} rounded-es-[6px]`;
    if (pos === 'middle') return `${base} rounded-ss-[6px] rounded-es-[6px]`;
    return `${base} rounded-ss-[6px]`;
  };

  const hoverBtn =
    'p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-100 dark:hover:bg-white/10 cursor-pointer transition-colors';

  // Reactions: one small pill hanging off the bubble corner
  const renderReactions = (msg: ChatMessage, isMine: boolean) => {
    const entries = Object.entries(msg.reactions ?? {});
    if (entries.length === 0) return null;
    const counts = new Map<string, number>();
    for (const [, emoji] of entries) counts.set(emoji, (counts.get(emoji) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([e]) => e);
    const mine = Boolean(msg.reactions?.[myUid]);
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setSheetMsg(msg);
        }}
        className={`pop-in relative z-[2] -mt-2 ${isMine ? 'me-2' : 'ms-2'} inline-flex items-center gap-0.5 ps-1.5 pe-2 py-[3px] rounded-full text-[13px] leading-none border-2 border-[var(--surface)] cursor-pointer shadow-sm ${
          mine ? 'bg-[var(--primary-soft)]' : 'bg-[var(--surface-2)]'
        }`}
      >
        <span className="tracking-[-0.15em]">{top.join('')}</span>
        {entries.length > 1 && (
          <span className="ms-1 text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-300">{entries.length}</span>
        )}
      </button>
    );
  };

  // Pre-compute grouping so we know the first AND last bubble of each group
  const rows = visibleMessages.map((msg, i) => {
    const prev = visibleMessages[i - 1];
    const date = msg.createdAt?.toDate?.() ?? new Date();
    const prevDate = prev?.createdAt?.toDate?.();
    const newDay = !prevDate || dayKeyOf(prevDate) !== dayKeyOf(date);
    const thisTime = msg.createdAt?.toMillis?.() ?? Date.now();
    const prevTime = prev?.createdAt?.toMillis?.() ?? 0;
    const withPrev =
      !newDay && !normalizedQuery && !!prev && prev.senderUid === msg.senderUid && thisTime - prevTime < 5 * 60 * 1000;
    // a long pause inside the same day gets a centred time label, like Instagram
    const timeBreak = !newDay && !!prev && thisTime - prevTime > 60 * 60 * 1000;
    return { msg, date, newDay, withPrev: withPrev && !timeBreak, timeBreak };
  });

  const streamItems: React.ReactNode[] = [];
  rows.forEach((row, i) => {
    const { msg, date, newDay, withPrev, timeBreak } = row;
    const withNext = !!rows[i + 1]?.withPrev;
    const pos: GroupPos = withPrev ? (withNext ? 'middle' : 'last') : withNext ? 'first' : 'single';

    if (newDay || timeBreak) {
      streamItems.push(
        <div
          key={`sep-${msg.id}`}
          className="flex justify-center pt-6 pb-2 first:pt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500"
          role="separator"
        >
          {newDay ? formatDayLabel(date) : formatTime(msg)}
        </div>
      );
    }

    const isMine = msg.senderUid === myUid;
    const isAccepted = mode === 'room' && acceptedIds.has(msg.id);
    const isEdited =
      msg.createdAt && msg.updatedAt && msg.updatedAt.toMillis() - msg.createdAt.toMillis() > 1500;
    const showName = mode === 'room' && !isMine && !withPrev;
    const showAvatar = !isMine && (pos === 'last' || pos === 'single');
    const isEditing = editingMsgId === msg.id;
    const imageOnly = Boolean(msg.imageUrl) && !msg.text && !msg.audioUrl && !isEditing;
    const hasThreadChip = mode === 'room' && !msg.replyToId && (replyCounts[msg.id] || isOpenQuestion(msg));

    streamItems.push(
      <div
        key={msg.id}
        data-msg-id={msg.id}
        onMouseEnter={() => setHoverMsgId(msg.id)}
        onMouseLeave={() => setHoverMsgId((cur) => (cur === msg.id ? null : cur))}
        className={`msg-in group relative flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'} ${
          withPrev ? 'mt-[3px]' : 'mt-3'
        }`}
      >
        {/* Avatar (others, last bubble of a group) */}
        {!isMine && (
          <span className="w-7 shrink-0 self-end mb-[2px]">
            {showAvatar && (
              <button
                type="button"
                onClick={() => openProfileOf(msg)}
                aria-label={msg.senderName}
                className="rounded-full cursor-pointer hover:opacity-90"
              >
                <AvatarImg src={photoFor(msg.senderUid, msg.senderPhoto)} name={msg.senderName} sizeClass="w-7 h-7" />
              </button>
            )}
          </span>
        )}

        <div className={`flex flex-col min-w-0 max-w-[78%] sm:max-w-[62%] ${isMine ? 'items-end' : 'items-start'}`}>
          {showName && (
            <button
              type="button"
              onClick={() => openProfileOf(msg)}
              className="px-3 pb-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              {msg.senderName}
            </button>
          )}

          {/* Quoted message ("replied to …") */}
          {msg.replyToText && (
            <button
              type="button"
              onClick={() => jumpToMessage(msg.replyToId)}
              className={`max-w-full mb-[-10px] pb-3 pt-1.5 px-3 rounded-[18px] text-[12px] text-start cursor-pointer bg-[var(--surface-2)] text-slate-500 dark:text-slate-400 border border-slate-200/70 dark:border-white/[0.06] ${
                isMine ? 'me-1' : 'ms-1'
              }`}
            >
              <span className="block text-[10.5px] font-semibold opacity-80">↩ {msg.replyToSender}</span>
              <span className="block truncate max-w-[16rem]">{plainQuote(msg.replyToText)}</span>
            </button>
          )}

          {/* Bubble line: bubble + hover tools (desktop) */}
          <div className={`relative flex items-center gap-1 max-w-full ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
            <div
              onPointerDown={(e) => onBubblePointerDown(e, msg)}
              onPointerMove={onBubblePointerMove}
              onPointerUp={(e) => onBubblePointerUp(e, msg)}
              onPointerCancel={onBubblePointerCancel}
              onClick={() => onBubbleTap(msg)}
              onDoubleClick={() => likeMessage(msg)}
              onContextMenu={(e) => {
                if (editingMsgId === msg.id) return;
                e.preventDefault();
                if (lastPointerTypeRef.current === 'mouse') setSheetMsg(msg);
              }}
              style={
                imageOnly
                  ? { touchAction: 'pan-y' }
                  : {
                      touchAction: 'pan-y',
                      backgroundColor: isMine ? myBg : otherBg,
                      color: isMine ? myText : otherText,
                    }
              }
              className={`relative max-w-full [@media(pointer:coarse)]:select-none transition-[box-shadow] ${
                imageOnly ? 'rounded-[20px] overflow-hidden' : `px-3.5 py-2 text-[0.94rem] leading-[1.45] space-y-1.5 ${bubbleRadius(isMine, pos)}`
              } ${isAccepted ? 'ring-2 ring-amber-400/90 ring-offset-2 ring-offset-[var(--surface)]' : ''} ${
                highlightId === msg.id ? 'ring-4 ring-[var(--primary)]/35' : ''
              }`}
            >
              {msg.imageUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxImage(msg.imageUrl || null);
                  }}
                  className={`block overflow-hidden cursor-zoom-in focus:outline-none ${imageOnly ? '' : 'rounded-[14px] -mx-1.5 mt-0.5'}`}
                >
                  <img
                    src={msg.imageUrl}
                    alt={msg.text || t.photoSentPreview}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    draggable={false}
                    className="max-h-80 w-auto max-w-full object-cover"
                  />
                </button>
              )}

              {msg.audioUrl && (
                <VoiceNote
                  src={msg.audioUrl}
                  duration={msg.audioDuration}
                  unsupportedLabel={t.voiceCantPlay}
                  downloadLabel={t.voiceDownload}
                  isMine={isMine}
                  accent={gradient}
                />
              )}

              {isEditing ? (
                <div className="space-y-2 min-w-[220px]" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                  <textarea
                    value={editValue}
                    autoFocus
                    rows={2}
                    maxLength={VALIDATION_LIMITS.MAX_MESSAGE_LEN}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSaveEdit(msg);
                      } else if (e.key === 'Escape') {
                        setEditingMsgId(null);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-white/95 dark:bg-black/40 text-slate-900 dark:text-slate-100 resize-none focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingMsgId(null)}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-black/10 dark:bg-white/10 cursor-pointer"
                    >
                      {t.cancelAction}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(msg)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white text-slate-900 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      {t.saveAction}
                    </button>
                  </div>
                </div>
              ) : msg.text ? (
                <div className="whitespace-pre-wrap break-words" dir="auto">
                  {renderRichText(msg.text, isMine, t.copyAction, t.copiedToast)}
                </div>
              ) : null}

              {heartBurstId === msg.id && (
                <span className="heart-burst pointer-events-none absolute inset-0 flex items-center justify-center text-4xl" aria-hidden="true">
                  ❤️
                </span>
              )}
            </div>

            {/* Hover tools (mouse only) */}
            <div className={`hidden sm:flex items-center transition-opacity shrink-0 ${hoverMsgId === msg.id || reactPickerFor === msg.id ? 'opacity-100' : 'opacity-0 focus-within:opacity-100'}`}>
              <button type="button" onClick={() => setReactPickerFor((c) => (c === msg.id ? null : msg.id))} title={t.reactAction} aria-label={t.reactAction} className={hoverBtn}>
                <SmilePlus className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => startReply(msg)} title={t.replyAction} aria-label={t.replyAction} className={hoverBtn}>
                <Reply className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setSheetMsg(msg)} title={t.moreActions} aria-label={t.moreActions} className={hoverBtn}>
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {reactPickerFor === msg.id && (
              <div
                className={`pop-in absolute bottom-full mb-2 z-30 flex items-center gap-0.5 p-1.5 rounded-full bg-[var(--surface)] border border-slate-200 dark:border-white/10 shadow-xl ${
                  isMine ? 'end-0' : 'start-0'
                }`}
              >
                {QUICK_REACTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => handleToggleReaction(msg, em)}
                    className={`w-10 h-10 rounded-full text-[22px] flex items-center justify-center cursor-pointer transition-transform hover:scale-125 ${
                      msg.reactions?.[myUid] === em ? 'bg-[var(--primary-soft)]' : ''
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>

          {renderReactions(msg, isMine)}

          {/* Under the bubble: badges, answers, time */}
          {(msg.solved || isAccepted || hasThreadChip || pos === 'last' || pos === 'single') && (
            <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 px-2 text-[11px] text-slate-400 dark:text-slate-500 ${isMine ? 'justify-end' : ''}`}>
              {msg.solved && <span className="font-semibold text-emerald-600 dark:text-emerald-400">✅ {t.solvedBadge}</span>}
              {isAccepted && <span className="font-semibold text-amber-600 dark:text-amber-400">⭐ {t.bestAnswerBadge}</span>}
              {hasThreadChip && (
                <button
                  type="button"
                  onClick={() => setThreadQuestion(msg)}
                  className={`font-semibold cursor-pointer hover:underline ${
                    threadQuestion?.id === msg.id ? 'text-[var(--primary)]' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  💬 {replyCounts[msg.id] ? repliesLabel(replyCounts[msg.id], isRtl ? 'ar' : 'en') : t.threadAnswerCta}
                </button>
              )}
              {(pos === 'last' || pos === 'single') && (
                <span className="tabular-nums">
                  {formatTime(msg)}
                  {isEdited ? ` · ${t.editedTag}` : ''}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  });

  // Typing bubble at the end of the conversation
  if (typingLabel) {
    streamItems.push(
      <div key="typing" className="flex items-end gap-2 mt-3 msg-in" aria-live="polite">
        <span className="w-7 shrink-0" />
        <div className="flex flex-col items-start gap-1">
          <div className="px-4 py-3 rounded-[22px] flex items-center gap-1" style={{ backgroundColor: otherBg }}>
            <span className="typing-dot" />
            <span className="typing-dot [animation-delay:150ms]" />
            <span className="typing-dot [animation-delay:300ms]" />
          </div>
          <span className="px-2 text-[11px] text-slate-400">{typingLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={backdropStyle} className="flex-1 flex flex-col min-h-0 relative">
      {/* Search in conversation */}
      <div className="absolute top-2.5 sm:top-3 end-3 sm:end-4 z-20 flex items-center gap-2 max-w-[calc(100%-1.5rem)]">
        {searchOpen && (
          <div className="msg-in glass-strong flex items-center gap-2 ps-3.5 pe-2 py-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-md">
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                  setSearchOpen(false);
                }
              }}
              placeholder={t.searchMessagesPlaceholder}
              className="w-36 min-w-0 sm:w-60 bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
            {normalizedQuery && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                {t.searchResultsCount.replace('{count}', String(visibleMessages.length))}
              </span>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setSearchOpen((v) => !v);
            if (searchOpen) setSearchQuery('');
          }}
          title={searchOpen ? t.closeBtn : t.searchMessagesPlaceholder}
          className="glass p-2.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-300 shadow-sm cursor-pointer transition-colors"
        >
          {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
        </button>
      </div>

      {mode === 'room' && (openQuestionsCount > 0 || onlyOpenQuestions) && (
        <div className="absolute top-2.5 sm:top-3 start-3 sm:start-4 z-20">
          <button
            type="button"
            onClick={() => setOnlyOpenQuestions((v) => !v)}
            aria-pressed={onlyOpenQuestions}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border shadow-sm cursor-pointer transition-colors ${
              onlyOpenQuestions
                ? 'bg-[var(--primary)] text-white border-transparent'
                : 'glass text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-violet-600'
            }`}
          >
            <span aria-hidden="true">❓</span>
            <span>{t.openQuestionsFilter}</span>
            <span className={`tabular-nums px-1.5 rounded-full text-[10px] ${onlyOpenQuestions ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'}`}>
              {openQuestionsCount}
            </span>
          </button>
        </div>
      )}

      {/* Messages Stream */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain pastel-scroll px-3 sm:px-5 lg:px-8 pt-14 pb-3"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            {t.loadingMessages}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="msg-in glass relative overflow-hidden max-w-sm text-center space-y-3 px-8 py-9 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm">
              <span className="pastel-blob w-32 h-32 -top-10 -start-10" style={{ backgroundColor: settings.yellowAccent }} />
              <span className="pastel-blob w-32 h-32 -bottom-12 -end-10 [animation-delay:-5s]" style={{ backgroundColor: settings.blueAccent }} />
              <span className="logo-shine relative inline-flex mx-auto rounded-[1.1rem] shadow-md rotate-6">
                <MacaronLogo size={64} />
              </span>
              <h3 className="relative text-lg font-bold text-slate-800 dark:text-slate-100">{t.emptyRoomTitle}</h3>
              <p className="relative text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.emptyRoomDesc}</p>
            </div>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            {onlyOpenQuestions && !normalizedQuery ? t.openQuestionsEmpty : t.searchNoResults}
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={loadOlder}
                  disabled={loadingOlder}
                  className="px-4 py-1.5 rounded-full text-[11px] font-medium border border-slate-200 dark:border-[#26272F] bg-white dark:bg-[#16171C] text-slate-500 dark:text-slate-400 hover:text-[var(--primary)] cursor-pointer disabled:opacity-60"
                >
                  {loadingOlder ? t.loadingMessages : t.loadOlderMessages}
                </button>
              </div>
            )}
            {streamItems}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Jump to latest */}
      {hasNewBelow && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="pop-in absolute bottom-28 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 z-20 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-semibold text-white shadow-md cursor-pointer hover:-translate-y-0.5 transition-transform"
          style={{ background: gradient }}
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>{t.jumpToLatest}</span>
        </button>
      )}

      {/* Composer */}
      <div className="shrink-0 px-3 sm:px-4 pb-safe-sm sm:pb-4 pt-2 bg-[var(--surface)]">
        {photoError && (
          <div className="mb-2 px-4 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {photoError}
          </div>
        )}

        {attachedPhoto && (
          <div className="msg-in mb-2 p-2 rounded-2xl bg-[var(--surface-2)] flex items-center justify-between gap-3 w-fit">
            <div className="flex items-center gap-3">
              <img
                src={attachedPhoto}
                alt={t.photoSentPreview}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{t.photoSentPreview}</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachedPhoto(null)}
              title={t.removePhoto}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {replyTo && (
          <div className="msg-in mb-2 ps-4 pe-2 py-2 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {replyTo.senderUid === myUid ? t.replyingToSelf : `${t.replyingTo} ${replyTo.senderName}`}
              </div>
              <div className="truncate text-slate-500 dark:text-slate-400">{replyTo.text || (replyTo.audioUrl ? t.voiceMessage : t.photoSentPreview)}</div>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              aria-label={t.cancelReply}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {showEmojiTray && (
          <div className="msg-in mb-2 p-1.5 rounded-full bg-[var(--surface)] border border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-0.5 w-fit max-w-full shadow-lg">
            {QUICK_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => {
                  setText((prev) => `${prev}${em}`);
                  composerRef.current?.focus();
                }}
                className="w-10 h-10 rounded-full hover:bg-[var(--surface-2)] text-[22px] flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-90"
              >
                {em}
              </button>
            ))}
          </div>
        )}

        {isPending && !canCompose ? (
          iRequested ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#16171C] text-xs text-slate-600 dark:text-slate-300">
              <span aria-hidden="true">⏳</span>
              <span className="flex-1">{t.requestSentWaiting}</span>
              <button
                type="button"
                disabled={requestBusy}
                onClick={handleDeclineRequest}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
              >
                {t.cancelRequest}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-2xl border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 text-xs text-slate-700 dark:text-slate-200">
              <span className="flex-1 leading-relaxed">{t.requestReceivedText}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={requestBusy}
                  onClick={handleDeclineRequest}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {t.declineRequest}
                </button>
                <button
                  type="button"
                  disabled={requestBusy}
                  onClick={handleAcceptRequest}
                  className="px-4 py-2 rounded-full text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: gradient }}
                >
                  {t.acceptRequest}
                </button>
              </div>
            </div>
          )
        ) : (
        <>
        {isPending && iRequested && !requestUsed && (
          <p className="mb-2 px-2 text-[11px] text-slate-500 dark:text-slate-400">{t.requestOneMessageHint}</p>
        )}
        {voiceError && (
          <div className="mb-2 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
            <span>{voiceError}</span>
            <button type="button" onClick={() => setVoiceError('')} className="cursor-pointer" aria-label={t.closeBtn}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {recording ? (
          <div className="flex items-center gap-3 p-1.5 ps-4 rounded-full bg-[var(--surface-2)]">
            <span className="relative flex w-2.5 h-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
              <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-rose-500" />
            </span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.voiceRecording}</span>
            <span className="tabular-nums text-sm text-slate-500 dark:text-slate-400" dir="ltr">
              {fmtSecs(recSeconds)} / {fmtSecs(VALIDATION_LIMITS.MAX_VOICE_SECONDS)}
            </span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => finishRecording(true)}
              title={t.voiceCancel}
              className="p-2.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => finishRecording(false)}
              title={t.voiceSend}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full text-xs font-semibold text-white cursor-pointer hover:brightness-110 active:scale-95 transition-transform"
              style={{ background: gradient }}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">{t.voiceSend}</span>
            </button>
          </div>
        ) : (
        <form
          onSubmit={handleSend}
          className="flex items-end gap-1 p-1.5 rounded-[26px] bg-[var(--surface-2)] border border-transparent focus-within:border-slate-300 dark:focus-within:border-white/15 transition-colors"
        >
          <input ref={photoInputRef} type="file" accept="image/*" onChange={handleFileInputChange} className="hidden" />

          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            title={t.attachPhoto}
            aria-label={t.attachPhoto}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 cursor-pointer active:scale-90 transition-transform"
            style={{ background: gradient }}
          >
            <Camera className="w-[18px] h-[18px]" />
          </button>

          <textarea
            ref={composerRef}
            rows={1}
            dir="auto"
            value={text}
            maxLength={VALIDATION_LIMITS.MAX_MESSAGE_LEN}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            onPaste={handlePaste}
            onBlur={() => clearTyping(targetId)}
            placeholder={t.typeMessagePlaceholder}
            title={`${t.composerHint}\n${t.formatHint}`}
            onFocus={autoGrow}
            className="flex-1 min-h-[36px] resize-none bg-transparent px-2 py-[7px] text-[15px] leading-[1.45] text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-500 focus:outline-none min-w-0 max-h-36 pastel-scroll"
          />

          {!text.trim() && !attachedPhoto ? (
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={startRecording}
                disabled={sending}
                title={t.voiceRecord}
                aria-label={t.voiceRecord}
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-800 dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 cursor-pointer active:scale-90 transition-transform"
              >
                <Mic className="w-[22px] h-[22px] stroke-[1.8]" />
              </button>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                title={t.attachPhoto}
                aria-label={t.attachPhoto}
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-800 dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer active:scale-90 transition-transform"
              >
                <ImagePlus className="w-[22px] h-[22px] stroke-[1.8]" />
              </button>
              <button
                type="button"
                onClick={() => setShowEmojiTray((v) => !v)}
                title={t.quickEmojisLabel}
                aria-label={t.quickEmojisLabel}
                className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform ${
                  showEmojiTray ? 'text-[var(--primary)]' : 'text-slate-800 dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                <Smile className="w-[22px] h-[22px] stroke-[1.8]" />
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={sending}
              className="h-9 px-3 rounded-full text-[15px] font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] disabled:opacity-40 cursor-pointer shrink-0 send-pop"
            >
              {t.sendMessage}
            </button>
          )}
        </form>
        )}
        {mode === 'room' && !recording && text.length > 0 && (
          <p className="mt-1 px-3 text-[10px] text-slate-400 dark:text-slate-500" dir="auto">{t.formatHint}</p>
        )}
        </>
        )}
      </div>

      {threadQuestion && mode === 'room' && targetId && (
        <ThreadPanel
          roomId={targetId}
          question={messages.find((m) => m.id === threadQuestion.id) ?? threadQuestion}
          currentUserProfile={currentUserProfile}
          language={language}
          locale={locale}
          accent={gradient}
          myBg={myBg}
          myText={myText}
          otherBg={otherBg}
          otherText={otherText}
          blockedUids={blockedSet}
          onClose={closeThread}
          onToggleSolved={toggleSolved}
          onPickBest={pickBestAnswer}
          onJumpTo={(id) => {
            setThreadQuestion(null);
            window.setTimeout(() => jumpToMessage(id), 50);
          }}
        />
      )}

      {sheetMsg && (() => {
        const m = messages.find((x) => x.id === sheetMsg.id) ?? sheetMsg;
        const mine = m.senderUid === myUid;
        const q = m.replyToId ? msgById.get(m.replyToId) : undefined;
        const d = m.createdAt?.toDate?.();
        return (
          <MessageSheet
            msg={m}
            myUid={myUid}
            timeLabel={d ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(d) : '···'}
            labels={{
              reply: t.replyAction,
              copy: t.copyAction,
              copied: t.copiedToast,
              edit: t.editAction,
              delete: t.deleteAction,
              confirmDelete: t.confirmDeleteQuestion,
              cancel: t.cancelAction,
              report: t.reportAction,
              thread: t.threadTitle,
              markSolved: t.markSolved,
              unmarkSolved: t.unmarkSolved,
              markBest: t.markBestAnswer,
              unmarkBest: t.unmarkBestAnswer,
            }}
            canEdit={mine && !m.audioUrl}
            canDelete={mine || (mode === 'room' && isAdmin)}
            canReport={!mine}
            canToggleSolved={mode === 'room' && mine && !m.replyToId}
            canPickBest={mode === 'room' && !mine && q?.senderUid === myUid}
            isBest={mode === 'room' && acceptedIds.has(m.id)}
            showThread={mode === 'room' && !m.replyToId}
            onReact={(em) => void handleToggleReaction(m, em)}
            onReply={() => startReply(m)}
            onCopy={() => handleCopy(m)}
            onEdit={() => {
              setEditingMsgId(m.id);
              setEditValue(m.text);
              setSheetMsg(null);
            }}
            onDelete={() => void handleDeleteMessage(m.id)}
            onReport={() => {
              setSheetMsg(null);
              setReportTarget({
                uid: m.senderUid,
                name: m.senderName,
                nickname: m.senderNickname,
                roomId: mode === 'room' ? targetId : undefined,
                chatId: mode === 'direct' ? targetId : undefined,
                messageId: m.id,
                messageText: m.text || (m.audioUrl ? t.voiceMessage : m.imageUrl ? t.photoSentPreview : ''),
              });
            }}
            onThread={() => {
              setSheetMsg(null);
              setThreadQuestion(m);
            }}
            onToggleSolved={() => {
              setSheetMsg(null);
              void toggleSolved(m);
            }}
            onPickBest={() => {
              setSheetMsg(null);
              if (q) void pickBestAnswer(q, m);
            }}
            onClose={closeSheet}
          />
        );
      })()}

      {profileTarget && (
        <ProfileCard
          target={profileTarget}
          language={language}
          onClose={closeProfile}
          onMessage={mode === 'room' ? onMessageUser : undefined}
          onReport={() => {
            const p = profileTarget;
            setProfileTarget(null);
            setReportTarget({
              uid: p.uid,
              name: p.name,
              nickname: p.nickname,
              roomId: mode === 'room' ? targetId : undefined,
              chatId: mode === 'direct' ? targetId : undefined,
            });
          }}
        />
      )}

      {reportTarget && (
        <ReportDialog
          language={language}
          myUid={myUid}
          target={reportTarget}
          onClose={() => setReportTarget(null)}
        />
      )}

      {/* Full-Size Photo Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div onClick={(e) => e.stopPropagation()} className="relative max-w-3xl max-h-[88vh] flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              aria-label={t.closeBtn}
              className="p-2 rounded-full bg-white/90 text-slate-900 hover:bg-white shadow-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={lightboxImage}
              alt={t.photoSentPreview}
              referrerPolicy="no-referrer"
              className="max-h-[80vh] w-auto rounded-2xl object-contain shadow-2xl border border-white/15 bg-black/20"
            />
          </div>
        </div>
      )}
    </div>
  );
};
