import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, limit, onSnapshot, query, where } from 'firebase/firestore';
import { ArrowLeft, Award, CheckCircle2, MessageSquare, Send, X } from 'lucide-react';
import { TRANSLATIONS } from '@/src/i18n/translations';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useProfilePhotos } from '@/src/lib/profiles';
import { repliesLabel, sendRoomReply } from '@/src/lib/send';
import { showToast } from '@/src/lib/toast';
import { getPrefs } from '@/src/lib/prefs';
import { ChatMessage, Language, UserPublicProfile, VALIDATION_LIMITS } from '@/src/types/chat';
import { AvatarImg } from './AvatarImg';
import { renderRichText } from './RichText';
import { VoiceNote } from './VoiceNote';

interface ThreadPanelProps {
  roomId: string;
  /** The question as currently loaded in the room (kept live by our own listener too) */
  question: ChatMessage;
  currentUserProfile: UserPublicProfile;
  language: Language;
  locale: string;
  accent: string;
  myBg: string;
  myText: string;
  otherBg: string;
  otherText: string;
  blockedUids: Set<string>;
  onClose: () => void;
  onToggleSolved: (q: ChatMessage) => void;
  onPickBest: (q: ChatMessage, answer: ChatMessage) => void;
  onJumpTo: (messageId: string) => void;
}

const millis = (m: ChatMessage) => m.createdAt?.toMillis?.() ?? Date.now() + 1;

/**
 * A question and all its answers in one focused view (side panel on desktop,
 * full screen on phones). The best answer is pinned on top.
 */
export const ThreadPanel: React.FC<ThreadPanelProps> = ({
  roomId,
  question: initialQuestion,
  currentUserProfile,
  language,
  locale,
  accent,
  myBg,
  myText,
  otherBg,
  otherText,
  blockedUids,
  onClose,
  onToggleSolved,
  onPickBest,
  onJumpTo,
}) => {
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';
  const myUid = currentUserProfile.uid;
  const [question, setQuestion] = useState<ChatMessage>(initialQuestion);
  const [replies, setReplies] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Live question (solved / best answer can change while the panel is open)
  useEffect(() => {
    setQuestion(initialQuestion);
    return onSnapshot(
      doc(db, 'rooms', roomId, 'messages', initialQuestion.id),
      (snap) => {
        if (snap.exists()) setQuestion(snap.data() as ChatMessage);
        else onClose(); // deleted
      },
      (err) => console.warn('Thread question listener:', err.message)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, initialQuestion.id]);

  // All answers, including ones older than what the room has loaded.
  // Equality filter only, so no composite index is needed; sorted here.
  useEffect(() => {
    setLoading(true);
    return onSnapshot(
      query(collection(db, 'rooms', roomId, 'messages'), where('replyToId', '==', initialQuestion.id), limit(150)),
      (snap) => {
        setReplies(snap.docs.map((d) => d.data() as ChatMessage).sort((a, b) => millis(a) - millis(b)));
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, `rooms/${roomId}/messages?replyToId`);
      }
    );
  }, [roomId, initialQuestion.id]);

  // Close with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const visible = useMemo(() => {
    const list = replies.filter((r) => !blockedUids.has(r.senderUid));
    const best = list.find((r) => r.id === question.acceptedAnswerId);
    return best ? [best, ...list.filter((r) => r !== best)] : list;
  }, [replies, blockedUids, question.acceptedAnswerId]);

  // Stick to the newest answer when one arrives
  const countRef = useRef(0);
  useEffect(() => {
    if (visible.length > countRef.current && countRef.current > 0) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }
    countRef.current = visible.length;
  }, [visible.length]);

  const photoFor = useProfilePhotos([question, ...visible].filter((m) => m.senderPhoto === '@p').map((m) => m.senderUid));
  const isAsker = question.senderUid === myUid;

  const fmt = (m: ChatMessage) => {
    const d = m.createdAt?.toDate?.();
    if (!d) return '···';
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = text.trim();
    if (!clean || sending) return;
    setSending(true);
    setText('');
    try {
      await sendRoomReply({
        roomId,
        profile: currentUserProfile,
        text: clean,
        replyTo: question,
        voiceLabel: t.voiceMessage,
        photoLabel: t.photoSentPreview,
      });
    } catch (err) {
      setText((cur) => cur || clean);
      if ((err as { code?: string })?.code === 'permission-denied') showToast({ kind: 'error', key: 'sendTooFast' });
      else handleFirestoreError(err, OperationType.CREATE, `rooms/${roomId}/messages`);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isTouch = window.matchMedia?.('(pointer: coarse)').matches;
    const enterSends = getPrefs().enterToSend && !isTouch;
    if (enterSends ? e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing : e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void send();
    }
  };

  const bubble = (m: ChatMessage, opts: { big?: boolean } = {}) => {
    const mine = m.senderUid === myUid;
    const best = m.id === question.acceptedAnswerId;
    return (
      <div
        className={`rounded-2xl px-3.5 py-2.5 text-[0.9rem] leading-relaxed space-y-2 ${
          best ? 'border-2 border-amber-300 dark:border-amber-500/60' : mine ? 'border border-transparent' : 'border border-slate-200 dark:border-[#262A36]'
        } ${opts.big ? 'text-[0.95rem]' : ''}`}
        style={{ backgroundColor: mine ? myBg : otherBg, color: mine ? myText : otherText }}
      >
        {m.imageUrl && (
          <img src={m.imageUrl} alt={m.text || t.photoSentPreview} loading="lazy" className="max-h-60 w-auto max-w-full rounded-xl object-cover" />
        )}
        {m.audioUrl && (
          <VoiceNote
            src={m.audioUrl}
            duration={m.audioDuration}
            isMine={mine}
            accent={accent}
            unsupportedLabel={t.voiceCantPlay}
            downloadLabel={t.voiceDownload}
          />
        )}
        {m.text && (
          <div className="whitespace-pre-wrap break-words" dir="auto">
            {renderRichText(m.text, mine, t.copyAction, t.copiedToast)}
          </div>
        )}
      </div>
    );
  };

  const meta = (m: ChatMessage) => (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1 px-1">
      <span className="font-semibold text-slate-700 dark:text-slate-200">{m.senderUid === myUid ? t.youLabel : m.senderName}</span>
      <span dir="ltr">@{m.senderNickname}</span>
      <span aria-hidden="true">·</span>
      <span className="tabular-nums">{fmt(m)}</span>
    </div>
  );

  return (
    <aside
      role="dialog"
      aria-label={t.threadTitle}
      className="absolute inset-0 sm:inset-y-0 sm:start-auto sm:end-0 sm:w-[26rem] z-40 flex flex-col bg-[var(--app-bg)] sm:border-s border-slate-200 dark:border-[#262A36] shadow-2xl panel-in"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-3 border-b border-slate-200 dark:border-[#262A36] bg-white/80 dark:bg-[#171A23]/80 backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          aria-label={t.closeBtn}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer sm:hidden"
        >
          <ArrowLeft className="w-5 h-5 rtl:-scale-x-100" />
        </button>
        <MessageSquare className="w-4 h-4 text-violet-500 hidden sm:block" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">{t.threadTitle}</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {loading ? '…' : visible.length ? repliesLabel(visible.length, isRtl ? 'ar' : 'en') : t.threadNoRepliesShort}
          </p>
        </div>
        {question.solved && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
            ✅ {t.solvedBadge}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={t.closeBtn}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer hidden sm:inline-flex"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain pastel-scroll px-3 sm:px-4 py-4 space-y-4">
        {/* Question */}
        <div className="pb-4 border-b border-dashed border-slate-200 dark:border-[#262A36]">
          <div className="flex items-start gap-2.5">
            <AvatarImg src={photoFor(question.senderUid, question.senderPhoto)} name={question.senderName} sizeClass="w-9 h-9" />
            <div className="min-w-0 flex-1">
              {meta(question)}
              {bubble(question, { big: true })}
              <div className="flex flex-wrap items-center gap-2 mt-2 px-1">
                {isAsker && (
                  <button
                    type="button"
                    onClick={() => onToggleSolved(question)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer ${
                      question.solved
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-[#262A36] text-slate-600 dark:text-slate-300 hover:text-emerald-600'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {question.solved ? t.unmarkSolved : t.markSolved}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onJumpTo(question.id)}
                  className="text-[11px] text-slate-500 hover:text-violet-600 underline underline-offset-2 cursor-pointer"
                >
                  {t.threadShowInChat}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Answers */}
        {loading ? (
          <p className="text-center text-xs text-slate-400 py-6">{t.loadingMessages}</p>
        ) : visible.length === 0 ? (
          <div className="text-center py-8 space-y-1">
            <p className="text-2xl" aria-hidden="true">💡</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.threadEmpty}</p>
          </div>
        ) : (
          visible.map((r) => {
            const best = r.id === question.acceptedAnswerId;
            return (
              <div key={r.id} className="flex items-start gap-2.5 msg-in">
                <AvatarImg src={photoFor(r.senderUid, r.senderPhoto)} name={r.senderName} sizeClass="w-8 h-8" />
                <div className="min-w-0 flex-1">
                  {best && (
                    <div className="mb-1 px-1 text-[10px] font-bold text-amber-600 dark:text-amber-300">⭐ {t.bestAnswerBadge}</div>
                  )}
                  {meta(r)}
                  {bubble(r)}
                  {isAsker && r.senderUid !== myUid && (
                    <button
                      type="button"
                      onClick={() => onPickBest(question, r)}
                      className={`mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer ${
                        best
                          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'border-slate-200 dark:border-[#262A36] text-slate-500 dark:text-slate-400 hover:text-amber-600'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      {best ? t.unmarkBestAnswer : t.markBestAnswer}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply composer */}
      <form onSubmit={send} className="px-3 sm:px-4 pt-2 pb-safe-sm sm:pb-3 border-t border-slate-200 dark:border-[#262A36] bg-white/80 dark:bg-[#171A23]/80 backdrop-blur">
        <div className="flex items-end gap-2 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#11131A] focus-within:ring-4 focus-within:ring-violet-200/50 dark:focus-within:ring-violet-500/15">
          <textarea
            ref={inputRef}
            rows={1}
            dir="auto"
            value={text}
            maxLength={VALIDATION_LIMITS.MAX_MESSAGE_LEN}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t.threadReplyPlaceholder}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none min-w-0 max-h-32 pastel-scroll"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            aria-label={t.sendMessage}
            className="inline-flex items-center justify-center h-10 w-10 rounded-xl text-white disabled:opacity-40 cursor-pointer shrink-0 active:scale-95 transition-transform"
            style={{ background: accent }}
          >
            <Send className="w-4 h-4 rtl:-scale-x-100" />
          </button>
        </div>
      </form>
    </aside>
  );
};
