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
  Flag,
  Mic,
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
import { VoiceNote } from './VoiceNote';
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
}

const QUICK_EMOJIS = ['✨', '💛', '🩷', '🩵', '🌸', '☁️', '☕', '😊', '🫶', '🌟'];
const TYPING_WRITE_INTERVAL_MS = 2500;
const NEAR_BOTTOM_PX = 140;
const PAGE_SIZE = 40;
const MAX_LOADED = 200; // keep in sync with request.query.limit in firestore.rules

// http(s) links; trailing punctuation is left outside the link
const URL_SPLIT_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

function renderLinkifiedText(text: string) {
  const parts = text.split(URL_SPLIT_RE);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 decoration-1 break-all hover:opacity-80"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

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

    try {
      const payload: Record<string, unknown> = {
        id: msgId,
        senderUid: myUid,
        senderName: currentUserProfile.name.slice(0, VALIDATION_LIMITS.MAX_NAME_LEN),
        senderNickname: currentUserProfile.nickname.slice(0, VALIDATION_LIMITS.MAX_NICKNAME_LEN),
        senderPhoto: currentUserProfile.photoUrl.slice(0, VALIDATION_LIMITS.MAX_PHOTO_LEN),
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
      if (!voice) {
        setText('');
        setAttachedPhoto(null);
      }
      setReplyTo(null);

      if (mode === 'direct' && directChat) {
        const batch = writeBatch(db);
        batch.set(doc(db, 'direct_chats', targetId, 'messages', msgId), payload);
        batch.update(doc(db, 'direct_chats', targetId), {
          lastMessageText: (clean || (voice ? t.voiceMessage : t.photoSentPreview)).slice(0, 200),
          updatedAt: serverTimestamp(),
          // the single message allowed while the chat is still a request
          ...(isPending && iRequested ? { requestMessageSent: true } : {}),
        });
        await batch.commit();
      } else {
        await setDoc(doc(db, 'rooms', targetId, 'messages', msgId), payload);
        // Separate, non-blocking write: sending must still work if the
        // lastMessageAt rule isn't deployed yet.
        await updateDoc(doc(db, 'rooms', targetId), { lastMessageAt: serverTimestamp() }).catch(
          (err) => console.warn('lastMessageAt update skipped:', err?.message ?? err)
        );
      }
      markRead();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
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
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(
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
    const enterSends = getPrefs().enterToSend;
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
  const visibleMessages = useMemo(() => {
    const base = blockedSet.size ? messages.filter((m) => !blockedSet.has(m.senderUid)) : messages;
    if (!normalizedQuery) return base;
    return base.filter(
      (m) =>
        m.text?.toLowerCase().includes(normalizedQuery) ||
        m.senderName?.toLowerCase().includes(normalizedQuery) ||
        m.senderNickname?.toLowerCase().includes(normalizedQuery)
    );
  }, [messages, normalizedQuery, blockedSet]);

  const backdropStyle = resolveChatBackdropStyle(settings, themeMode);
  const myBg = resolveBubbleSurface(settings.myBubbleColor, themeMode);
  const otherBg = resolveBubbleSurface(settings.otherBubbleColor, themeMode);
  const myText = getReadableTextColor(myBg);
  const otherText = getReadableTextColor(otherBg);
  const gradient = settings.primaryColor;

  const getBubbleRadius = (isMine: boolean, grouped = false) => {
    if (settings.bubbleStyle === 'pill') return 'rounded-2xl';
    if (settings.bubbleStyle === 'classic') {
      if (grouped) return 'rounded-2xl';
      return isMine ? 'rounded-2xl rounded-ee-md' : 'rounded-2xl rounded-es-md';
    }
    // "cute": soft tail on the first bubble of a group, rounder for the rest
    const tail = grouped ? 'rounded-2xl' : '';
    if (isRtl) {
      return isMine
        ? `rounded-2xl rounded-bl-md ${tail}`
        : `rounded-2xl rounded-br-md ${tail}`;
    }
    return isMine
      ? `rounded-2xl rounded-br-md ${tail}`
      : `rounded-2xl rounded-bl-md ${tail}`;
  };

  const actionBtn =
    'p-1.5 rounded-full glass-strong border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-violet-600 dark:hover:text-violet-300 shadow-xs hover:shadow-sm cursor-pointer transition-all';

  const renderReactions = (msg: ChatMessage, isMine: boolean) => {
    const entries = Object.entries(msg.reactions ?? {});
    if (entries.length === 0) return null;
    const grouped = new Map<string, string[]>();
    for (const [uid, emoji] of entries) {
      grouped.set(emoji, [...(grouped.get(emoji) ?? []), uid]);
    }
    return (
      <div className={`flex flex-wrap gap-1 -mt-1.5 px-2 relative z-[1] ${isMine ? 'justify-end' : 'justify-start'}`}>
        {REACTION_EMOJIS.filter((em) => grouped.has(em)).map((em) => {
          const uids = grouped.get(em)!;
          const mine = uids.includes(myUid);
          return (
            <button
              key={em}
              type="button"
              onClick={() => handleToggleReaction(msg, em)}
              className={`pop-in inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 ${
                mine
                  ? 'bg-violet-50 dark:bg-violet-950/50 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-200'
                  : 'bg-white/85 dark:bg-[#1E2230] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>{em}</span>
              <span className="tabular-nums font-semibold">{uids.length}</span>
            </button>
          );
        })}
      </div>
    );
  };

  // Build stream with date separators
  const streamItems: React.ReactNode[] = [];
  let lastDay = '';
  let prevMsg: ChatMessage | null = null;
  for (const msg of visibleMessages) {
    const date = msg.createdAt?.toDate?.() ?? new Date();
    const dk = dayKeyOf(date);
    const newDay = dk !== lastDay;
    if (newDay) {
      lastDay = dk;
      streamItems.push(
        <div
          key={`day-${dk}`}
          className="flex items-center gap-3 pt-5 pb-1 first:pt-0"
          role="separator"
        >
          <span className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300/70 to-transparent dark:via-slate-700" />
          <span className="glass px-3.5 py-1 rounded-full text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/70 shadow-xs">
            {formatDayLabel(date)}
          </span>
          <span className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300/70 to-transparent dark:via-slate-700" />
        </div>
      );
    }

    // Consecutive messages from the same person within 5 minutes are grouped
    const prevTime = prevMsg?.createdAt?.toMillis?.() ?? 0;
    const thisTime = msg.createdAt?.toMillis?.() ?? Date.now();
    const isGrouped =
      !newDay &&
      !normalizedQuery &&
      prevMsg !== null &&
      prevMsg.senderUid === msg.senderUid &&
      thisTime - prevTime < 5 * 60 * 1000;
    prevMsg = msg;

    const isMine = msg.senderUid === myUid;
    const canModify = isMine || (mode === 'room' && isAdmin);
    const isEdited =
      msg.createdAt &&
      msg.updatedAt &&
      msg.updatedAt.toMillis() - msg.createdAt.toMillis() > 1500;
    const actionsVisible =
      actionsOpenFor === msg.id || reactPickerFor === msg.id || confirmDeleteId === msg.id;

    streamItems.push(
      <div
        key={msg.id}
        data-msg-id={msg.id}
        className={`msg-in group flex items-end gap-2.5 rounded-2xl transition-colors duration-500 ${
          isMine ? 'flex-row-reverse' : 'flex-row'
        } ${isGrouped ? 'mt-1' : 'mt-4'} ${
          highlightId === msg.id ? 'bg-amber-100/70 dark:bg-amber-500/15 ring-4 ring-amber-100/70 dark:ring-amber-500/15' : ''
        }`}
      >
        {isGrouped ? (
          <span className="w-9 shrink-0" aria-hidden="true" />
        ) : (
          <AvatarImg
            src={msg.senderPhoto}
            name={msg.senderName}
            sizeClass="w-9 h-9"
            className="shadow-sm ring-2 ring-white dark:ring-[#171A23]"
          />
        )}

        <div className={`flex flex-col max-w-[78%] sm:max-w-[65%] ${isMine ? 'items-end' : 'items-start'}`}>
          {/* Metadata */}
          <div
            className={`flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1 px-1.5 ${
              isGrouped ? 'hidden' : ''
            }`}
          >
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {isMine ? t.youLabel : msg.senderName}
            </span>
            <span aria-hidden="true">·</span>
            <span dir="ltr">@{msg.senderNickname}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{formatTime(msg)}</span>
            {isEdited && (
              <>
                <span aria-hidden="true">·</span>
                <span>{t.editedTag}</span>
              </>
            )}
          </div>

          {/* Bubble */}
          <div
            onClick={() => setActionsOpenFor((cur) => (cur === msg.id ? null : msg.id))}
            className={`relative px-4 py-2.5 text-[0.9rem] leading-relaxed space-y-2 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ${
              isMine ? 'border border-transparent' : 'border border-slate-200 dark:border-[#262A36]'
            } ${getBubbleRadius(isMine, isGrouped)}`}
            style={{
              backgroundColor: isMine ? myBg : otherBg,
              color: isMine ? myText : otherText,
            }}
          >
            {msg.replyToText && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToMessage(msg.replyToId);
                }}
                className="block w-full text-start px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 text-xs opacity-85 hover:opacity-100 cursor-pointer border-s-2 border-black/15 dark:border-white/25"
              >
                <div className="font-semibold text-[11px]">{msg.replyToSender}</div>
                <div className="truncate">{msg.replyToText}</div>
              </button>
            )}

            {msg.imageUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxImage(msg.imageUrl || null);
                }}
                className="block rounded-xl overflow-hidden border border-black/10 dark:border-white/10 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <img
                  src={msg.imageUrl}
                  alt={msg.text || t.photoSentPreview}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="max-h-72 w-auto max-w-full object-cover"
                />
              </button>
            )}

            {msg.audioUrl && (
              <VoiceNote
                src={msg.audioUrl}
                duration={msg.audioDuration}
                isMine={isMine}
                accent={settings.primaryColor}
              />
            )}

            {editingMsgId === msg.id ? (
              <div className="space-y-2 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editValue}
                  autoFocus
                  maxLength={VALIDATION_LIMITS.MAX_MESSAGE_LEN}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSaveEdit(msg);
                    } else if (e.key === 'Escape') {
                      setEditingMsgId(null);
                    }
                  }}
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingMsgId(null)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-black/10 dark:bg-white/10 cursor-pointer"
                  >
                    {t.cancelAction}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(msg)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-slate-900 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>{t.saveAction}</span>
                  </button>
                </div>
              </div>
            ) : msg.text ? (
              <p className="whitespace-pre-wrap break-words" dir="auto">
                {renderLinkifiedText(msg.text)}
              </p>
            ) : null}
          </div>

          {renderReactions(msg, isMine)}
          {isGrouped && (
            <span className="h-0 overflow-visible text-[10px] tabular-nums text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity px-1.5">
              {formatTime(msg)}
            </span>
          )}
        </div>

        {/* Action controls (hover on desktop, tap bubble on mobile) */}
        <div
          className={`relative transition-opacity flex items-center gap-1 pb-1 ${
            actionsVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
          }`}
        >
          {confirmDeleteId === msg.id ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white dark:bg-[#1E2230] border border-rose-200 dark:border-rose-800 shadow-sm">
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-300 whitespace-nowrap">
                {t.confirmDeleteQuestion}
              </span>
              <button
                type="button"
                onClick={() => handleDeleteMessage(msg.id)}
                className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-500 text-white hover:bg-rose-600 cursor-pointer"
              >
                {t.confirmDeleteYes}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                aria-label={t.cancelAction}
                className="p-0.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setReactPickerFor((cur) => (cur === msg.id ? null : msg.id))}
                title={t.reactAction}
                className={actionBtn}
              >
                <SmilePlus className="w-3.5 h-3.5" />
              </button>
              {!isMine && (
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpenFor(null);
                    setReportTarget({
                      uid: msg.senderUid,
                      name: msg.senderName,
                      nickname: msg.senderNickname,
                      roomId: mode === 'room' ? targetId : undefined,
                      chatId: mode === 'direct' ? targetId : undefined,
                      messageId: msg.id,
                      messageText: msg.text || (msg.audioUrl ? t.voiceMessage : msg.imageUrl ? t.photoSentPreview : ''),
                    });
                  }}
                  title={t.reportAction}
                  className={`${actionBtn} hover:!text-rose-500`}
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setReplyTo(msg);
                  setActionsOpenFor(null);
                  composerRef.current?.focus();
                }}
                title={t.replyAction}
                className={actionBtn}
              >
                <Reply className="w-3.5 h-3.5" />
              </button>
              {msg.text && (
                <button
                  type="button"
                  onClick={() => handleCopy(msg)}
                  title={copiedId === msg.id ? t.copiedToast : t.copyAction}
                  className={actionBtn}
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
              {isMine && !msg.audioUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingMsgId(msg.id);
                    setEditValue(msg.text);
                    setActionsOpenFor(null);
                  }}
                  title={t.editAction}
                  className={actionBtn}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
              {canModify && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(msg.id)}
                  title={t.deleteAction}
                  className={`${actionBtn} !text-rose-500 hover:!text-rose-600`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}

          {reactPickerFor === msg.id && (
            <div
              className={`pop-in absolute bottom-full mb-1.5 z-20 flex items-center gap-0.5 p-1 rounded-full glass-strong border border-slate-200 dark:border-slate-700 shadow-lg ${
                isMine ? 'end-0' : 'start-0'
              }`}
            >
              {REACTION_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => handleToggleReaction(msg, em)}
                  className={`w-9 h-9 rounded-full text-lg flex items-center justify-center cursor-pointer hover:bg-amber-50 dark:hover:bg-slate-800 transition-transform hover:scale-125 ${
                    msg.reactions?.[myUid] === em ? 'bg-violet-100 dark:bg-violet-900/50' : ''
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={backdropStyle} className="flex-1 flex flex-col min-h-0 relative">
      {/* Search in conversation */}
      <div className="absolute top-3 end-4 z-20 flex items-center gap-2">
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
              className="w-44 sm:w-60 bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
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

      {/* Messages Stream */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pastel-scroll px-3 sm:px-6 lg:px-10 pt-14 pb-4"
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
            {t.searchNoResults}
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={loadOlder}
                  disabled={loadingOlder}
                  className="px-4 py-1.5 rounded-full text-[11px] font-medium border border-slate-200 dark:border-[#262A36] bg-white dark:bg-[#171A23] text-slate-500 dark:text-slate-400 hover:text-[var(--primary)] cursor-pointer disabled:opacity-60"
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
      <div className="px-3 sm:px-6 lg:px-10 pb-4 pt-1 bg-gradient-to-t from-[var(--app-bg)] via-[var(--app-bg)]/80 to-transparent">
        <div className="h-5 px-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5" aria-live="polite">
          {typingLabel && (
            <>
              <span className="inline-flex gap-0.5" aria-hidden="true">
                <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-1 rounded-full bg-current animate-bounce" />
              </span>
              <span className="truncate">{typingLabel}</span>
            </>
          )}
        </div>

        {photoError && (
          <div className="mb-2 px-4 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {photoError}
          </div>
        )}

        {attachedPhoto && (
          <div className="msg-in glass-strong mb-2 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 w-fit shadow-sm">
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
          <div className="msg-in glass-strong mb-2 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 border-s-4 !border-s-violet-300 dark:!border-s-violet-500/60 flex items-center justify-between gap-3 text-xs shadow-sm">
            <div className="min-w-0 truncate">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {t.replyingTo} {replyTo.senderName}:{' '}
              </span>
              <span className="text-slate-500 dark:text-slate-400">{replyTo.text || (replyTo.audioUrl ? t.voiceMessage : t.photoSentPreview)}</span>
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
          <div className="msg-in glass-strong mb-2 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-1 w-fit shadow-md">
            {QUICK_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => {
                  setText((prev) => `${prev}${em}`);
                  composerRef.current?.focus();
                }}
                className="w-9 h-9 rounded-xl hover:bg-amber-50 dark:hover:bg-slate-800 text-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
              >
                {em}
              </button>
            ))}
          </div>
        )}

        {isPending && !canCompose ? (
          iRequested ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#171A23] text-xs text-slate-600 dark:text-slate-300">
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
                  style={{ backgroundColor: settings.primaryColor }}
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
          <div className="flex items-center gap-3 p-1.5 ps-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-[#171A23] shadow-sm">
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
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-xs font-semibold text-white cursor-pointer hover:brightness-110"
              style={{ background: gradient }}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">{t.voiceSend}</span>
            </button>
          </div>
        ) : (
        <form
          onSubmit={handleSend}
          className="glass-strong flex items-end gap-1.5 p-1.5 ps-2 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm dark:shadow-sm focus-within:ring-4 focus-within:ring-violet-200/50 dark:focus-within:ring-violet-500/15 transition-shadow"
        >
          <input ref={photoInputRef} type="file" accept="image/*" onChange={handleFileInputChange} className="hidden" />

          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            title={t.attachPhoto}
            className="p-2.5 rounded-full text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <ImagePlus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowEmojiTray((v) => !v)}
            title={t.quickEmojisLabel}
            className={`p-2.5 rounded-full transition-colors cursor-pointer shrink-0 ${
              showEmojiTray
                ? 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-slate-800'
                : 'text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-slate-800'
            }`}
          >
            <Smile className="w-4 h-4" />
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
            title={t.composerHint}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none min-w-0 max-h-36 pastel-scroll"
          />

          {!text.trim() && !attachedPhoto ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={sending}
              title={t.voiceRecord}
              aria-label={t.voiceRecord}
              className="inline-flex items-center justify-center h-10 w-10 rounded-xl text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
              style={{ background: gradient }}
            >
              <Mic className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center justify-center gap-2 h-10 min-w-10 px-3 sm:px-4 rounded-xl text-xs font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
              style={{ background: gradient }}
            >
              <span className="hidden sm:inline">{t.sendMessage}</span>
              <Send className="w-4 h-4 rtl:-scale-x-100" />
            </button>
          )}
        </form>
        )}
        </>
        )}
      </div>

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
