import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Ban,
  Flag,
  Search,
  Hash,
  MessageCircle,
  Moon,
  Send,
  Settings,
  Shield,
  Sun,
  Users,
} from 'lucide-react';
import { TRANSLATIONS } from '@/src/i18n/translations';
import { db } from '@/src/lib/firebase';
import { getPrefs, playChime } from '@/src/lib/prefs';
import { blockUser, useBlockedUids } from '@/src/lib/moderation';
import { ReportDialog, type ReportTarget } from './ReportDialog';
import {
  AccentTone,
  AdminRecord,
  ChatRoom,
  DirectChat,
  isChatAccepted,
  Language,
  normalizeNickname,
  readKey,
  ROOM_ICONS,
  SiteSettings,
  ThemeMode,
  UserPrivateInfo,
  UserPublicProfile,
} from '@/src/types/chat';
import { AdminPanel } from './AdminPanel';
import { AvatarImg } from './AvatarImg';
import { MacaronLogo } from './MacaronLogo';
import { ChatRoomView } from './ChatRoomView';
import { ProfileEditModal } from './ProfileEditModal';
import { UserSettingsModal } from './UserSettingsModal';

interface ChatWorkspaceProps {
  currentUserProfile: UserPublicProfile;
  currentEmail: string;
  isAdmin: boolean;
  language: Language;
  themeMode: ThemeMode;
  settings: SiteSettings;
  rooms: ChatRoom[];
  directChats: DirectChat[];
  members: UserPublicProfile[];
  privateInfos: Record<string, UserPrivateInfo>;
  adminsMap: Record<string, AdminRecord>;
  onChangeLanguage: (lang: Language) => void;
  onChangeThemeMode: (mode: ThemeMode) => void;
  onUpdateProfile: (data: {
    name: string;
    nickname: string;
    email: string;
    photoUrl: string;
  }) => Promise<void>;
  onSaveGlobalSettings: (next: Omit<SiteSettings, 'updatedAt' | 'updatedBy'>) => Promise<void>;
  onCreateRoom: (room: {
    nameAr: string;
    nameEn: string;
    descriptionAr: string;
    descriptionEn: string;
    accentTone: AccentTone;
  }) => Promise<void>;
  onDeleteRoom: (roomId: string) => Promise<void>;
  onStartDirectChat: (member: UserPublicProfile) => Promise<string>;
  onToggleAdminRole: (targetUser: UserPublicProfile, email: string, makeAdmin: boolean) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  currentUserProfile,
  currentEmail,
  isAdmin,
  language,
  themeMode,
  settings,
  rooms,
  directChats,
  members,
  privateInfos,
  adminsMap,
  onChangeLanguage,
  onChangeThemeMode,
  onUpdateProfile,
  onSaveGlobalSettings,
  onCreateRoom,
  onDeleteRoom,
  onStartDirectChat,
  onToggleAdminRole,
  onSignOut,
}) => {
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';
  const siteTitle = isRtl ? settings.siteNameAr : settings.siteNameEn;

  const [activeView, setActiveView] = useState<'room' | 'direct' | 'admin'>('room');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || 'general');
  const [selectedDirectChatId, setSelectedDirectChatId] = useState<string | null>(null);
  const [memberFilter, setMemberFilter] = useState('');
  const [startingDmUid, setStartingDmUid] = useState<string | null>(null);

  // Phones: list screen ↔ full-screen chat (Instagram Direct style)
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  // Phone back button / back gesture: chat → list (instead of leaving the site)
  const chatHistoryPushedRef = useRef(false);
  useEffect(() => {
    const onPop = () => {
      if (!chatHistoryPushedRef.current) return;
      chatHistoryPushedRef.current = false;
      setMobileChatOpen(false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => {
    const isPhoneLayout = window.matchMedia?.('(max-width: 1023px)').matches;
    if (mobileChatOpen && isPhoneLayout && !chatHistoryPushedRef.current) {
      window.history.pushState({ macaronChat: true }, '');
      chatHistoryPushedRef.current = true;
    } else if (!mobileChatOpen && chatHistoryPushedRef.current) {
      chatHistoryPushedRef.current = false;
      window.history.back();
    }
  }, [mobileChatOpen]);
  const [listTab, setListTab] = useState<'chats' | 'search'>('chats');
  const [showRequests, setShowRequests] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // ---------- Read state (unread dots) ----------
  const myUid = currentUserProfile.uid;
  const [lastRead, setLastRead] = useState<Record<string, Timestamp | null>>({});
  const [readStateLoaded, setReadStateLoaded] = useState(false);
  const readTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'read_states', myUid),
      (snap) => {
        const data = snap.data() as { lastRead?: Record<string, Timestamp | null> } | undefined;
        setLastRead(data?.lastRead ?? {});
        setReadStateLoaded(true);
      },
      (err) => {
        // Rules for read_states not deployed yet — unread dots simply stay off
        console.warn('read_states listener skipped:', err.message);
        setReadStateLoaded(false);
      }
    );
    return () => {
      unsub();
      Object.values(readTimersRef.current).forEach((id) => window.clearTimeout(id));
      readTimersRef.current = {};
    };
  }, [myUid]);

  // Debounced so a burst of incoming messages becomes one small write
  const handleMarkRead = useCallback(
    (key: string) => {
      const timers = readTimersRef.current;
      if (timers[key]) window.clearTimeout(timers[key]);
      timers[key] = window.setTimeout(() => {
        delete timers[key];
        setDoc(
          doc(db, 'read_states', myUid),
          { uid: myUid, lastRead: { [key]: serverTimestamp() } },
          { merge: true }
        ).catch((err) => console.warn('markRead skipped:', err?.message ?? err));
      }, 800);
    },
    [myUid]
  );

  // The open chat only counts as "seen" while the tab is actually visible,
  // so new messages there still ring / notify when you are in another tab.
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible'
  );
  useEffect(() => {
    const onVis = () => setPageVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const isUnread = (key: string, latest?: Timestamp | null, isActive = false) => {
    if (!readStateLoaded || (isActive && pageVisible) || !latest?.toMillis) return false;
    const seen = lastRead[key];
    if (seen === null) return false; // pending local write = just read
    if (!seen) return true;
    return latest.toMillis() > seen.toMillis();
  };

  // ---------- Presence lookup ----------
  // Presence for people you already chat with (no full member directory for non-admins)
  const [peerStatus, setPeerStatus] = useState<Record<string, 'online' | 'away'>>({});
  const peerUidsKey = directChats
    .map((c) => (c.participant1Uid === myUid ? c.participant2Uid : c.participant1Uid))
    .sort()
    .join(',');
  useEffect(() => {
    const uids = peerUidsKey ? peerUidsKey.split(',') : [];
    const unsubs = uids.map((uid) =>
      onSnapshot(
        doc(db, 'users_public', uid),
        (snap) => {
          const status = (snap.data() as UserPublicProfile | undefined)?.status;
          if (status) setPeerStatus((prev) => (prev[uid] === status ? prev : { ...prev, [uid]: status }));
        },
        () => {}
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [peerUidsKey]);

  const statusByUid: Record<string, 'online' | 'away'> = { ...peerStatus };
  members.forEach((m) => {
    statusByUid[m.uid] = m.status;
  });

  const presenceDot = (uid: string) => {
    const status = statusByUid[uid];
    if (!status) return null;
    return (
      <span
        title={status === 'online' ? t.onlineStatus : t.awayStatus}
        className={`absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#171A23] ${
          status === 'online' ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      />
    );
  };

  const unreadDot = (
    <span className="unread-pulse w-2.5 h-2.5 rounded-full bg-[var(--primary)] shrink-0" aria-label={t.newMessagesBadge} />
  );

  const activeRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];
  const activeDirectChat = directChats.find((c) => c.id === selectedDirectChatId) || null;


  const getOtherParticipant = (chat: DirectChat) => {
    if (chat.participant1Uid === currentUserProfile.uid) {
      return {
        uid: chat.participant2Uid,
        name: chat.participant2Name,
        nickname: chat.participant2Nickname,
        photoUrl: chat.participant2Photo,
      };
    }
    return {
      uid: chat.participant1Uid,
      name: chat.participant1Name,
      nickname: chat.participant1Nickname,
      photoUrl: chat.participant1Photo,
    };
  };

  const handleOpenMemberChat = async (member: UserPublicProfile) => {
    if (member.uid === currentUserProfile.uid || startingDmUid) return;
    setStartingDmUid(member.uid);
    try {
      const chatId = await onStartDirectChat(member);
      if (!chatId) return;
      setSelectedDirectChatId(chatId);
      setActiveView('direct');
      setMobileChatOpen(true);
      setListTab('chats');
    } finally {
      setStartingDmUid(null);
    }
  };

  // Privacy: no open member list — people are found only by their unique @nickname
  const memberQuery = normalizeNickname(memberFilter);
  const blockedRef = useRef<string[]>([]);
  const [otherMembers, setOtherMembers] = useState<UserPublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    if (memberQuery.length < 3) {
      setOtherMembers([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        let found: UserPublicProfile[] = [];
        if (isAdmin) {
          // Admins can browse by prefix
          const snap = await getDocs(
            query(
              collection(db, 'users_public'),
              where('nickname', '>=', memberQuery),
              where('nickname', '<=', memberQuery + '\uf8ff'),
              orderBy('nickname'),
              limit(8)
            )
          );
          found = snap.docs.map((d) => d.data() as UserPublicProfile);
        } else {
          // Members: exact @nickname only, so nobody can walk the member list letter by letter
          const handle = await getDoc(doc(db, 'nicknames', memberQuery));
          const uid = handle.exists() ? (handle.data().uid as string) : '';
          if (uid) {
            const prof = await getDoc(doc(db, 'users_public', uid));
            if (prof.exists()) found = [prof.data() as UserPublicProfile];
          }
        }
        if (cancelled) return;
        setOtherMembers(found.filter((m) => m.uid !== myUid && !blockedRef.current.includes(m.uid)));
      } catch (err) {
        console.warn('Nickname search failed:', err);
        if (!cancelled) setOtherMembers([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [memberQuery, myUid, isAdmin]);

  const blockedUids = useBlockedUids(myUid);
  blockedRef.current = blockedUids;
  const peerOf = (c: DirectChat) => (c.participant1Uid === myUid ? c.participant2Uid : c.participant1Uid);
  const notBlocked = (c: DirectChat) => !blockedUids.includes(peerOf(c));
  const incomingRequests = directChats.filter(
    (c) => !isChatAccepted(c) && c.requestedBy !== myUid && notBlocked(c)
  );
  const visibleChats = directChats.filter(
    (c) => (isChatAccepted(c) || c.requestedBy === myUid) && notBlocked(c)
  );
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [confirmBlockUid, setConfirmBlockUid] = useState<string | null>(null);

  const handleConfirmBlock = async () => {
    const uid = confirmBlockUid;
    setConfirmBlockUid(null);
    if (!uid) return;
    // a pending request from/to this person is removed too
    const chat = directChats.find((c) => peerOf(c) === uid);
    await blockUser(myUid, uid);
    if (chat && !isChatAccepted(chat)) {
      try {
        await deleteDoc(doc(db, 'direct_chats', chat.id));
      } catch {
        // the request may have its message still; it stays hidden anyway
      }
    }
    if (activeDirectChat && peerOf(activeDirectChat) === uid) {
      setSelectedDirectChatId(null);
      setActiveView('room');
      setMobileChatOpen(false);
    }
  };

  const activeDirectPeer = activeDirectChat ? getOtherParticipant(activeDirectChat) : null;

  const unreadTotal =
    rooms.filter((r) =>
      isUnread(readKey('room', r.id), r.lastMessageAt, activeView === 'room' && activeRoom?.id === r.id)
    ).length +
    directChats.filter(
      (c) =>
        Boolean(c.lastMessageText) &&
        isUnread(readKey('direct', c.id), c.updatedAt, activeView === 'direct' && activeDirectChat?.id === c.id)
    ).length;

  useEffect(() => {
    document.title = unreadTotal > 0 ? `(${unreadTotal}) ${siteTitle}` : siteTitle;
  }, [unreadTotal, siteTitle]);

  // Sound + browser notification when a new conversation becomes unread
  const prevUnreadRef = useRef<number | null>(null);
  useEffect(() => {
    if (!readStateLoaded) return; // wait until we know what was already read
    const prev = prevUnreadRef.current;
    prevUnreadRef.current = unreadTotal;
    if (prev === null || unreadTotal <= prev) return; // first load or messages read
    const p = getPrefs();
    if (p.sound) playChime();
    if (
      p.desktopNotifications &&
      document.visibilityState !== 'visible' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        const n = new Notification(siteTitle, { body: t.newMessageNotif, icon: '/icon-192.png', tag: 'macaron-unread' });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch {
        // some mobile browsers only allow notifications from a service worker
      }
    }
  }, [unreadTotal, readStateLoaded, siteTitle, t.newMessageNotif]);

  // ---------- Instagram-style layout helpers ----------
  const relTime = (ts?: Timestamp | null) => {
    const ms = ts?.toMillis?.();
    if (!ms) return '';
    const diff = Math.max(0, Date.now() - ms) / 60000;
    if (diff < 1) return isRtl ? 'الآن' : 'now';
    if (diff < 60) return isRtl ? `${Math.floor(diff)} د` : `${Math.floor(diff)}m`;
    if (diff < 1440) return isRtl ? `${Math.floor(diff / 60)} س` : `${Math.floor(diff / 60)}h`;
    if (diff < 10080) return isRtl ? `${Math.floor(diff / 1440)} ي` : `${Math.floor(diff / 1440)}d`;
    return isRtl ? `${Math.floor(diff / 10080)} أ` : `${Math.floor(diff / 10080)}w`;
  };

  const sortedChats = [...visibleChats].sort(
    (a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0)
  );

  const openRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setActiveView('room');
    setMobileChatOpen(true);
  };
  const openDirect = (chatId: string) => {
    setSelectedDirectChatId(chatId);
    setActiveView('direct');
    setMobileChatOpen(true);
  };
  const openAdmin = () => {
    setActiveView('admin');
    setMobileChatOpen(true);
  };

  const requestsUnread = incomingRequests.length;
  const dmUnreadCount = visibleChats.filter(
    (c) =>
      Boolean(c.lastMessageText) &&
      isChatAccepted(c) &&
      isUnread(readKey('direct', c.id), c.updatedAt, activeView === 'direct' && activeDirectChat?.id === c.id)
  ).length;

  /** Story-style ring: violet gradient when there is something new */
  const storyRing = (active: boolean) =>
    active
      ? 'bg-[conic-gradient(from_200deg,#6E56CF,#A78BFA,#E9A6FF,#8B5CF6,#6E56CF)]'
      : 'bg-slate-200 dark:bg-[#2A2D37]';

  // ---------- Conversation list (chats tab) ----------
  const chatsList = (
    <>
      {/* Rooms as stories */}
      <div className="pt-1 pb-3">
        <div className="px-4 pb-2 text-[13px] font-semibold text-slate-900 dark:text-slate-100">{t.groupRoomsTitle}</div>
        <div className="flex gap-3.5 overflow-x-auto no-scrollbar px-4 snap-x">
          {rooms.map((room) => {
            const isSelected = activeView === 'room' && activeRoom?.id === room.id;
            const unread = isUnread(readKey('room', room.id), room.lastMessageAt, isSelected);
            const name = isRtl ? room.nameAr : room.nameEn;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => openRoom(room.id)}
                className="snap-start shrink-0 w-[72px] flex flex-col items-center gap-1.5 cursor-pointer group"
                title={name}
              >
                <span className={`p-[2.5px] rounded-full transition-transform group-active:scale-95 ${storyRing(unread)}`}>
                  <span className="block p-[3px] rounded-full bg-[var(--surface)]">
                    <span
                      className={`w-[58px] h-[58px] rounded-full flex items-center justify-center text-2xl ${
                        isSelected ? 'bg-[var(--primary-soft)] ring-2 ring-[var(--primary)]' : 'bg-slate-100 dark:bg-[#1B1D25]'
                      }`}
                    >
                      {ROOM_ICONS[room.id] ?? <Hash className="w-5 h-5 text-slate-600 dark:text-slate-300" />}
                    </span>
                  </span>
                </span>
                <span
                  className={`w-full text-center text-[11px] leading-tight line-clamp-2 ${
                    unread ? 'font-semibold text-slate-900 dark:text-slate-50' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages header + requests link */}
      <div className="px-4 pt-2 pb-1 flex items-center justify-between">
        <span className="text-[15px] font-bold text-slate-900 dark:text-slate-50">{t.directChatsTitle}</span>
        {requestsUnread > 0 && (
          <button
            type="button"
            onClick={() => setShowRequests((v) => !v)}
            className="text-[13px] font-semibold text-[var(--primary)] cursor-pointer"
          >
            {t.requestsTitle} ({requestsUnread})
          </button>
        )}
      </div>

      {showRequests && requestsUnread > 0 && (
        <div className="mx-3 mb-2 rounded-2xl border border-dashed border-violet-200 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-500/5 py-1">
          {incomingRequests.map((chat) => {
            const peer = getOtherParticipant(chat);
            const isSelected = activeView === 'direct' && activeDirectChat?.id === chat.id;
            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => openDirect(chat.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-start cursor-pointer rounded-2xl ${
                  isSelected ? 'bg-white/80 dark:bg-white/5' : 'hover:bg-white/60 dark:hover:bg-white/5'
                }`}
              >
                <AvatarImg src={peer.photoUrl} name={peer.name} sizeClass="w-11 h-11" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate text-slate-900 dark:text-slate-50">{peer.name}</div>
                  <div className="text-[13px] truncate text-slate-500 dark:text-slate-400">
                    {chat.lastMessageText || `@${peer.nickname}`}
                  </div>
                </div>
                {unreadDot}
              </button>
            );
          })}
        </div>
      )}

      {sortedChats.length === 0 ? (
        <div className="px-6 py-10 text-center space-y-3">
          <span className="mx-auto w-16 h-16 rounded-full border-2 border-slate-900/80 dark:border-slate-100/80 flex items-center justify-center">
            <Send className="w-7 h-7 text-slate-900 dark:text-slate-100 rtl:-scale-x-100" />
          </span>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{t.noDirectChatsYet}</p>
          <button
            type="button"
            onClick={() => setListTab('search')}
            className="text-sm font-semibold text-[var(--primary)] cursor-pointer"
          >
            {t.findPeopleCta}
          </button>
        </div>
      ) : (
        <div className="pb-2">
          {sortedChats.map((chat) => {
            const peer = getOtherParticipant(chat);
            const awaiting = !isChatAccepted(chat);
            const isSelected = activeView === 'direct' && activeDirectChat?.id === chat.id;
            const dmUnread =
              Boolean(chat.lastMessageText) && isUnread(readKey('direct', chat.id), chat.updatedAt, isSelected);
            const when = relTime(chat.updatedAt);
            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => openDirect(chat.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-start transition-colors cursor-pointer ${
                  isSelected ? 'bg-slate-100 dark:bg-white/[0.06]' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03] active:bg-slate-100'
                }`}
              >
                <span className="relative shrink-0">
                  <AvatarImg src={peer.photoUrl} name={peer.name} sizeClass="w-14 h-14" />
                  {statusByUid[peer.uid] === 'online' && (
                    <span className="absolute bottom-0.5 end-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-[2.5px] border-[var(--surface)]" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm truncate text-slate-900 dark:text-slate-50 ${dmUnread ? 'font-bold' : 'font-normal'}`}>
                    {peer.name}
                  </div>
                  <div className={`flex items-center gap-1 text-[13px] min-w-0 ${dmUnread ? 'text-slate-900 dark:text-slate-50 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                    <span className="truncate">{awaiting ? t.requestPendingLabel : chat.lastMessageText || `@${peer.nickname}`}</span>
                    {when && <span className="shrink-0 text-slate-400 dark:text-slate-500 font-normal">· {when}</span>}
                  </div>
                </div>
                {dmUnread && !awaiting && <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] shrink-0" aria-label={t.newMessagesBadge} />}
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  // ---------- Search tab (find people by exact @nickname) ----------
  const searchList = (
    <div className="px-4 pt-1 pb-4 space-y-3">
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 start-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          dir="ltr"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={memberFilter}
          onChange={(e) => setMemberFilter(e.target.value)}
          placeholder={t.searchMembersPlaceholder}
          className="w-full ps-10 pe-3 py-2.5 rounded-xl text-sm bg-slate-100 dark:bg-[#1B1D25] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        />
      </div>

      {searching && memberQuery.length >= 3 ? (
        <p className="px-1 text-xs text-slate-400">…</p>
      ) : memberQuery.length < 3 ? (
        <p className="px-1 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">{t.searchPeopleHint}</p>
      ) : otherMembers.length === 0 ? (
        <p className="px-1 text-[13px] text-slate-500 dark:text-slate-400">{t.searchPeopleNoResults}</p>
      ) : null}

      <div className="-mx-4">
        {otherMembers.map((member) => (
          <div key={member.uid} className="flex items-center gap-3 px-4 py-2.5">
            <span className="relative shrink-0">
              <AvatarImg src={member.photoUrl} name={member.name} sizeClass="w-12 h-12" />
              {presenceDot(member.uid)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate" dir="ltr">
                {member.nickname}
              </div>
              <div className="text-[13px] text-slate-500 dark:text-slate-400 truncate">{member.name}</div>
            </div>
            <button
              type="button"
              disabled={startingDmUid === member.uid}
              onClick={() => handleOpenMemberChat(member)}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 cursor-pointer active:scale-95 transition-transform"
            >
              {startingDmUid === member.uid ? '…' : t.messageThisPerson}
            </button>
          </div>
        ))}
      </div>

      <div className="pt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500">
        <a href="#/about" className="hover:text-[var(--primary)]">{t.aboutLink}</a>
        <a href="#/privacy" className="hover:text-[var(--primary)]">{t.privacyLink}</a>
        <a href="#/terms" className="hover:text-[var(--primary)]">{t.termsLink}</a>
      </div>
    </div>
  );

  // ---------- Navigation items (desktop rail + phone tab bar) ----------
  const goChats = () => {
    setListTab('chats');
    if (activeView === 'admin') setActiveView('room');
  };
  const goSearch = () => {
    setListTab('search');
    window.setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const railBtn = (opts: {
    label: string;
    icon: React.ReactNode;
    active?: boolean;
    badge?: number;
    onClick: () => void;
  }) => (
    <button
      key={opts.label}
      type="button"
      onClick={opts.onClick}
      title={opts.label}
      aria-label={opts.label}
      aria-current={opts.active ? 'page' : undefined}
      className={`relative w-full flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.06] ${
        opts.active ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'
      }`}
    >
      <span className="relative shrink-0 transition-transform active:scale-90">
        {opts.icon}
        {!!opts.badge && (
          <span className="absolute -top-1.5 -end-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[var(--surface)]">
            {opts.badge > 9 ? '9+' : opts.badge}
          </span>
        )}
      </span>
      <span className="hidden xl:inline text-[15px]">{opts.label}</span>
    </button>
  );

  const iconCls = (active: boolean) => `w-6 h-6 ${active ? 'stroke-[2.4]' : 'stroke-[1.8]'}`;
  const chatsActive = listTab === 'chats' && activeView !== 'admin';

  const myAvatar = (size: string, ring = false) => (
    <AvatarImg
      src={currentUserProfile.photoUrl}
      name={currentUserProfile.name}
      sizeClass={size}
      className={ring ? 'ring-2 ring-slate-900 dark:ring-white ring-offset-2 ring-offset-[var(--surface)]' : ''}
    />
  );

  // ---------- Chat header (Direct style) ----------
  const chatHeader = (
    <header className="relative z-10 shrink-0 flex items-center gap-3 px-2 sm:px-4 pt-safe pb-2.5 lg:pt-3 border-b border-slate-200/80 dark:border-white/[0.08] bg-[var(--surface)]/90 backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setMobileChatOpen(false)}
        aria-label={t.backAction}
        className="lg:hidden p-2 rounded-full text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
      >
        <ArrowLeft className="w-6 h-6 rtl:-scale-x-100" />
      </button>

      {activeView === 'admin' ? (
        <div className="flex items-center gap-3 min-w-0 flex-1 ps-1 lg:ps-0">
          <span className="w-10 h-10 rounded-full bg-[var(--primary-soft)] flex items-center justify-center">
            <Shield className="w-5 h-5 text-[var(--primary)]" />
          </span>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 truncate">{t.adminPanelTitle}</h2>
        </div>
      ) : activeView === 'direct' && activeDirectPeer ? (
        <>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="relative shrink-0">
              <AvatarImg src={activeDirectPeer.photoUrl} name={activeDirectPeer.name} sizeClass="w-10 h-10" />
              {statusByUid[activeDirectPeer.uid] === 'online' && (
                <span className="absolute bottom-0 end-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--surface)]" />
              )}
            </span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-50 truncate leading-tight">
                {activeDirectPeer.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {statusByUid[activeDirectPeer.uid] === 'online' ? (
                  <span className="text-emerald-600 dark:text-emerald-400">{t.onlineStatus}</span>
                ) : (
                  <span dir="ltr">@{activeDirectPeer.nickname}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() =>
                setReportTarget({
                  uid: activeDirectPeer.uid,
                  name: activeDirectPeer.name,
                  nickname: activeDirectPeer.nickname,
                  chatId: activeDirectChat?.id,
                })
              }
              title={t.reportAction}
              aria-label={t.reportAction}
              className="p-2.5 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            >
              <Flag className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmBlockUid(activeDirectPeer.uid)}
              title={t.blockAction}
              aria-label={t.blockAction}
              className="p-2.5 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            >
              <Ban className="w-5 h-5" />
            </button>
          </div>
        </>
      ) : activeRoom ? (
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className={`p-[2px] rounded-full shrink-0 ${storyRing(true)}`}>
            <span className="w-10 h-10 rounded-full bg-[var(--surface)] flex items-center justify-center text-xl border-2 border-[var(--surface)]">
              {ROOM_ICONS[activeRoom.id] ?? <Users className="w-4 h-4 text-slate-700 dark:text-slate-200" />}
            </span>
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-50 truncate leading-tight">
              {isRtl ? activeRoom.nameAr : activeRoom.nameEn}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {isRtl ? activeRoom.descriptionAr : activeRoom.descriptionEn}
            </p>
          </div>
        </div>
      ) : null}
    </header>
  );

  return (
    <div className="h-app w-full flex overflow-hidden bg-[var(--surface)]">
      {/* ===== Desktop icon rail ===== */}
      <nav className="hidden lg:flex w-[76px] xl:w-[230px] shrink-0 flex-col gap-1 px-3 pt-6 pb-4 border-e border-slate-200/80 dark:border-white/[0.08]">
        <div className="flex items-center gap-3 px-2.5 pb-6">
          <MacaronLogo size={34} />
          <span className="hidden xl:inline text-xl font-bold tracking-tight text-slate-900 dark:text-white">{siteTitle}</span>
        </div>
        {railBtn({
          label: t.chatTab,
          icon: <MessageCircle className={iconCls(chatsActive)} />,
          active: chatsActive,
          badge: dmUnreadCount + requestsUnread,
          onClick: goChats,
        })}
        {railBtn({
          label: t.searchTab,
          icon: <Search className={iconCls(listTab === 'search')} />,
          active: listTab === 'search' && activeView !== 'admin',
          onClick: goSearch,
        })}
        {isAdmin &&
          railBtn({
            label: t.adminTab,
            icon: <Shield className={iconCls(activeView === 'admin')} />,
            active: activeView === 'admin',
            onClick: openAdmin,
          })}
        {railBtn({
          label: themeMode === 'light' ? t.nightMode : t.dayMode,
          icon: themeMode === 'light' ? <Moon className={iconCls(false)} /> : <Sun className={iconCls(false)} />,
          onClick: () => onChangeThemeMode(themeMode === 'light' ? 'dark' : 'light'),
        })}
        <div className="flex-1" />
        {railBtn({
          label: t.settingsTitle,
          icon: <Settings className={iconCls(false)} />,
          onClick: () => setShowSettingsModal(true),
        })}
        <button
          type="button"
          onClick={() => setShowEditProfile(true)}
          title={t.editProfile}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer text-start"
        >
          {myAvatar('w-7 h-7')}
          <span className="hidden xl:block min-w-0">
            <span className="block text-sm font-semibold text-slate-900 dark:text-white truncate">{currentUserProfile.name}</span>
            <span className="block text-xs text-slate-500 truncate" dir="ltr">@{currentUserProfile.nickname}</span>
          </span>
        </button>
      </nav>

      {/* ===== Conversation list ===== */}
      <section
        className={`${mobileChatOpen ? 'hidden' : 'flex'} lg:flex w-full lg:w-[350px] xl:w-[380px] shrink-0 flex-col min-h-0 border-e border-slate-200/80 dark:border-white/[0.08]`}
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 pt-safe pb-3 lg:pt-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="lg:hidden">
              <MacaronLogo size={30} />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate" dir="auto">
              {listTab === 'search' ? t.searchTab : <span dir="ltr">{currentUserProfile.nickname}</span>}
            </h1>
          </div>
          <div className="flex items-center gap-1 lg:hidden">
            <button
              type="button"
              onClick={() => onChangeThemeMode(themeMode === 'light' ? 'dark' : 'light')}
              aria-label={themeMode === 'light' ? t.nightMode : t.dayMode}
              className="p-2 rounded-full text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            >
              {themeMode === 'light' ? <Moon className="w-6 h-6 stroke-[1.8]" /> : <Sun className="w-6 h-6 stroke-[1.8]" />}
            </button>
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              aria-label={t.settingsTitle}
              className="p-2 rounded-full text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            >
              <Settings className="w-6 h-6 stroke-[1.8]" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pastel-scroll">
          {listTab === 'search' ? searchList : chatsList}
        </div>

        {/* Phone tab bar */}
        <nav className="lg:hidden shrink-0 flex items-center justify-around border-t border-slate-200/80 dark:border-white/[0.08] bg-[var(--surface)] pb-safe-sm pt-1.5">
          {[
            {
              key: 'chats',
              label: t.chatTab,
              icon: <MessageCircle className={iconCls(chatsActive)} />,
              onClick: goChats,
              badge: dmUnreadCount + requestsUnread,
            },
            { key: 'search', label: t.searchTab, icon: <Search className={iconCls(listTab === 'search')} />, onClick: goSearch },
            ...(isAdmin
              ? [{ key: 'admin', label: t.adminTab, icon: <Shield className={iconCls(false)} />, onClick: openAdmin }]
              : []),
            {
              key: 'me',
              label: t.editProfile,
              icon: myAvatar('w-7 h-7'),
              onClick: () => setShowEditProfile(true),
            },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              aria-label={item.label}
              className="relative flex-1 flex items-center justify-center py-2 cursor-pointer text-slate-900 dark:text-slate-100 active:scale-90 transition-transform"
            >
              {item.icon}
              {!!item.badge && (
                <span className="absolute top-1 start-1/2 ms-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[var(--surface)]">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </section>

      {/* ===== Chat ===== */}
      <main className={`${mobileChatOpen ? 'flex' : 'hidden'} lg:flex flex-1 flex-col min-w-0 h-full`}>
        {chatHeader}

        {/* Active Viewport */}
        {activeView === 'admin' && isAdmin ? (
          <AdminPanel
            currentUid={currentUserProfile.uid}
            language={language}
            themeMode={themeMode}
            settings={settings}
            rooms={rooms}
            members={members}
            privateInfos={privateInfos}
            adminsMap={adminsMap}
            onSaveSettings={onSaveGlobalSettings}
            onCreateRoom={onCreateRoom}
            onDeleteRoom={onDeleteRoom}
            onToggleAdminRole={onToggleAdminRole}
            onPreviewThemeMode={onChangeThemeMode}
            onPreviewLanguage={onChangeLanguage}
          />
        ) : activeView === 'direct' && activeDirectChat ? (
          <ChatRoomView
            mode="direct"
            directChat={activeDirectChat}
            currentUserProfile={currentUserProfile}
            isAdmin={isAdmin}
            language={language}
            themeMode={themeMode}
            settings={settings}
            onMarkRead={handleMarkRead}
            blockedUids={blockedUids}
            onLeaveChat={() => {
              setSelectedDirectChatId(null);
              setActiveView('room');
              setMobileChatOpen(false);
            }}
          />
        ) : activeRoom ? (
          <ChatRoomView
            mode="room"
            room={activeRoom}
            currentUserProfile={currentUserProfile}
            isAdmin={isAdmin}
            language={language}
            themeMode={themeMode}
            settings={settings}
            onMarkRead={handleMarkRead}
            blockedUids={blockedUids}
            onMessageUser={handleOpenMemberChat}
          />
        ) : null}
      </main>

      {showEditProfile && (
        <ProfileEditModal
          language={language}
          settings={settings}
          currentName={currentUserProfile.name}
          currentNickname={currentUserProfile.nickname}
          currentEmail={currentEmail}
          currentPhotoUrl={currentUserProfile.photoUrl}
          onClose={() => setShowEditProfile(false)}
          onSave={onUpdateProfile}
        />
      )}

      {showSettingsModal && (
        <UserSettingsModal
          language={language}
          themeMode={themeMode}
          profile={currentUserProfile}
          onChangeLanguage={onChangeLanguage}
          onChangeThemeMode={onChangeThemeMode}
          onEditProfile={() => {
            setShowSettingsModal(false);
            setShowEditProfile(true);
          }}
          onSignOut={onSignOut}
          blockedUids={blockedUids}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {reportTarget && (
        <ReportDialog
          language={language}
          myUid={myUid}
          target={reportTarget}
          onClose={() => setReportTarget(null)}
          onBlocked={() => {
            setSelectedDirectChatId(null);
            setActiveView('room');
            setMobileChatOpen(false);
          }}
        />
      )}

      {confirmBlockUid && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmBlockUid(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-sm sheet-in rounded-t-3xl sm:rounded-2xl pb-safe sm:pb-6 border border-slate-200 dark:border-[#262A36] bg-white dark:bg-[#171A23] shadow-xl p-6 space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-50">
              <Ban className="w-4 h-4 text-rose-500" />
              {t.blockConfirmTitle}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{t.blockConfirmText}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmBlockUid(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                {t.cancelAction}
              </button>
              <button type="button" onClick={handleConfirmBlock} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 cursor-pointer">
                {t.blockAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
