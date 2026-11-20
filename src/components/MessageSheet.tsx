import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Copy, Edit3, Flag, MessageSquare, Reply, Trash2 } from 'lucide-react';
import { ChatMessage } from '@/src/types/chat';

export const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🙏'] as const;

interface SheetAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}

interface MessageSheetProps {
  msg: ChatMessage;
  myUid: string;
  timeLabel: string;
  labels: {
    reply: string;
    copy: string;
    copied: string;
    edit: string;
    delete: string;
    confirmDelete: string;
    cancel: string;
    report: string;
    thread: string;
    markSolved: string;
    unmarkSolved: string;
    markBest: string;
    unmarkBest: string;
  };
  canEdit: boolean;
  canDelete: boolean;
  canReport: boolean;
  canToggleSolved: boolean;
  canPickBest: boolean;
  isBest: boolean;
  showThread: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => Promise<void> | void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  onThread: () => void;
  onToggleSolved: () => void;
  onPickBest: () => void;
  onClose: () => void;
}

/**
 * Long-press menu (phones) / "⋯" menu (desktop): reaction bar on top,
 * actions list below — like Instagram's message menu.
 */
export const MessageSheet: React.FC<MessageSheetProps> = (p) => {
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const mineReaction = p.msg.reactions?.[p.myUid];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && p.onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [p.onClose]);

  const actions: SheetAction[] = [
    { key: 'reply', label: p.labels.reply, icon: <Reply className="w-5 h-5" />, onClick: p.onReply },
    ...(p.showThread
      ? [{ key: 'thread', label: p.labels.thread, icon: <MessageSquare className="w-5 h-5" />, onClick: p.onThread }]
      : []),
    ...(p.msg.text
      ? [
          {
            key: 'copy',
            label: copied ? p.labels.copied : p.labels.copy,
            icon: <Copy className="w-5 h-5" />,
            onClick: async () => {
              await p.onCopy();
              setCopied(true);
              window.setTimeout(p.onClose, 450);
            },
          },
        ]
      : []),
    ...(p.canToggleSolved
      ? [
          {
            key: 'solved',
            label: p.msg.solved ? p.labels.unmarkSolved : p.labels.markSolved,
            icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
            onClick: p.onToggleSolved,
          },
        ]
      : []),
    ...(p.canPickBest
      ? [
          {
            key: 'best',
            label: p.isBest ? p.labels.unmarkBest : p.labels.markBest,
            icon: <Award className="w-5 h-5 text-amber-500" />,
            onClick: p.onPickBest,
          },
        ]
      : []),
    ...(p.canEdit ? [{ key: 'edit', label: p.labels.edit, icon: <Edit3 className="w-5 h-5" />, onClick: p.onEdit }] : []),
    ...(p.canReport
      ? [{ key: 'report', label: p.labels.report, icon: <Flag className="w-5 h-5" />, danger: true, onClick: p.onReport }]
      : []),
    ...(p.canDelete
      ? [
          {
            key: 'delete',
            label: p.labels.delete,
            icon: <Trash2 className="w-5 h-5" />,
            danger: true,
            onClick: () => setConfirming(true),
          },
        ]
      : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-[2px]"
      onClick={p.onClose}
    >
      <div
        role="menu"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm sheet-in rounded-t-[28px] sm:rounded-3xl bg-[var(--surface)] shadow-2xl overflow-hidden pb-safe-sm sm:pb-2"
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
        </div>

        {/* Reaction bar */}
        <div className="flex items-center justify-between gap-1 px-4 pt-3 pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
          {QUICK_REACTIONS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => {
                p.onReact(em);
                p.onClose();
              }}
              className={`w-12 h-12 rounded-full text-[28px] flex items-center justify-center cursor-pointer transition-transform active:scale-90 hover:scale-110 ${
                mineReaction === em ? 'bg-[var(--primary-soft)]' : ''
              }`}
            >
              {em}
            </button>
          ))}
        </div>

        <div className="px-4 pt-2.5 pb-1 text-[11px] text-slate-400 dark:text-slate-500 text-center tabular-nums">{p.timeLabel}</div>

        {confirming ? (
          <div className="px-4 pb-3 pt-1 space-y-2">
            <p className="text-center text-sm font-semibold text-slate-900 dark:text-slate-50">{p.labels.confirmDelete}</p>
            <button
              type="button"
              onClick={() => {
                p.onDelete();
                p.onClose();
              }}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 cursor-pointer"
            >
              {p.labels.delete}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="w-full py-3 rounded-2xl text-sm font-semibold bg-[var(--surface-2)] text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              {p.labels.cancel}
            </button>
          </div>
        ) : (
          <div className="py-1">
            {actions.map((a) => (
              <button
                key={a.key}
                type="button"
                role="menuitem"
                onClick={a.onClick}
                className={`w-full flex items-center gap-4 px-6 py-3.5 text-[15px] text-start cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.04] active:bg-slate-100 dark:active:bg-white/[0.08] ${
                  a.danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {a.icon}
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
