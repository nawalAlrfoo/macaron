import React, { useState } from 'react';

/* Message text formatting: links, @mentions, `code`, **bold** and ```code blocks``` */

// http(s) links; trailing punctuation is left outside the link
const URL_SPLIT_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

// @handles (same shape as NICKNAME_REGEX), not inside e-mail addresses.
// No regex lookbehind: it is a syntax error on iOS < 16.4 and would break the whole app.
const MENTION_RE = /@[a-z0-9_.]{3,20}/gi;
/** Set at the start of each ChatRoomView render so mentions of me stand out */
let mentionSelf = '';
export function setMentionSelf(handle: string) {
  mentionSelf = handle.toLowerCase();
}

function renderMentions(text: string, keyBase: string): React.ReactNode {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(text))) {
    const prev = m.index > 0 ? text[m.index - 1] : '';
    if (prev && /[\w@.]/.test(prev)) continue;
    const handle = m[0].replace(/\.+$/, '');
    if (handle.length < 4) continue;
    if (m.index > last) out.push(text.slice(last, m.index));
    const isMe = mentionSelf && handle.slice(1).toLowerCase() === mentionSelf;
    out.push(
      <span
        key={`${keyBase}m${m.index}`}
        dir="ltr"
        className={`font-semibold rounded px-0.5 ${isMe ? 'bg-amber-200/80 text-amber-900 dark:bg-amber-400/30 dark:text-amber-100' : 'bg-black/5 dark:bg-white/10'}`}
      >
        {handle}
      </span>
    );
    last = m.index + handle.length;
  }
  if (!out.length) return text;
  if (last < text.length) out.push(text.slice(last));
  return out;
}

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
      <React.Fragment key={i}>{renderMentions(part, `l${i}`)}</React.Fragment>
    )
  );
}

/** Inline formatting: `code`, **bold**, and links */
function renderInline(text: string, keyBase: string, isMine: boolean) {
  const out: React.ReactNode[] = [];
  const re = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<React.Fragment key={`${keyBase}-t${i++}`}>{renderLinkifiedText(text.slice(last, m.index))}</React.Fragment>);
    const tok = m[0];
    if (tok.startsWith('`')) {
      out.push(
        <code
          key={`${keyBase}-c${i++}`}
          dir="ltr"
          className={`px-1.5 py-0.5 rounded-md font-mono text-[0.85em] ${
            isMine ? 'bg-white/20' : 'bg-slate-100 dark:bg-[#0F1014] text-rose-600 dark:text-rose-300'
          }`}
        >
          {tok.slice(1, -1)}
        </code>
      );
    } else {
      out.push(<strong key={`${keyBase}-b${i++}`}>{tok.slice(2, -2)}</strong>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(<React.Fragment key={`${keyBase}-t${i++}`}>{renderLinkifiedText(text.slice(last))}</React.Fragment>);
  return out;
}

const CodeBlock: React.FC<{ code: string; lang: string; copyLabel: string; copiedLabel: string }> = ({
  code,
  lang,
  copyLabel,
  copiedLabel,
}) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-1.5 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-[#0B0B0E] text-slate-100" dir="ltr" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-3 py-1 text-[10px] uppercase tracking-wide text-slate-400 bg-white/5">
        <span>{lang || 'code'}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1200);
            } catch {
              // ignore
            }
          }}
          className="normal-case text-[11px] text-slate-300 hover:text-white cursor-pointer"
        >
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre className="px-3 py-2.5 overflow-x-auto text-[12.5px] leading-relaxed font-mono whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
};

/** ```fenced code``` blocks + inline formatting */
export function renderRichText(text: string, isMine: boolean, copyLabel: string, copiedLabel: string) {
  const parts = text.split(/```/);
  // an unmatched fence is shown as plain text
  if (parts.length % 2 === 0) return renderInline(text, 'p', isMine);
  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      const nl = part.indexOf('\n');
      const first = nl === -1 ? '' : part.slice(0, nl).trim();
      const isLang = /^[a-zA-Z0-9+#.-]{1,15}$/.test(first);
      const code = (isLang ? part.slice(nl + 1) : part).replace(/^\n+|\n+$/g, '');
      return <CodeBlock key={`cb${idx}`} code={code} lang={isLang ? first : ''} copyLabel={copyLabel} copiedLabel={copiedLabel} />;
    }
    const trimmed = part.replace(/^\n+|\n+$/g, '');
    return trimmed ? <span key={`s${idx}`}>{renderInline(trimmed, `s${idx}`, isMine)}</span> : null;
  });
}

