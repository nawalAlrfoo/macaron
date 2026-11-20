import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
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
  Edit2,
  Search,
  Globe,
  Hash,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Send,
  Settings,
  Shield,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { TRANSLATIONS } from '@/src/i18n/translations';
import { db } from '@/src/lib/firebase';
import { getPrefs, playChime } from '@/src/lib/prefs';
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
import { hexToRgba } from '@/src/utils/colors';
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

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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

  const isUnread = (key: string, latest?: Timestamp | null, isActive = false) => {
    if (!readStateLoaded || isActive || !latest?.toMillis) return false;
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

  const getToneColor = (tone: AccentTone) => {
    if (tone === 'yellow') return settings.yellowAccent;
    if (tone === 'pink') return settings.pinkAccent;
    return settings.blueAccent;
  };

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
      setSelectedDirectChatId(chatId);
      setActiveView('direct');
      setMobileSidebarOpen(false);
    } finally {
      setStartingDmUid(null);
    }
  };

  // Privacy: no open member list — people are found only by their unique @nickname
  const memberQuery = normalizeNickname(memberFilter);
  const [otherMembers, setOtherMembers] = useState<UserPublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    if (memberQuery.length < 2) {
      setOtherMembers([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'users_public'),
            where('nickname', '>=', memberQuery),
            where('nickname', '<=', memberQuery + '\uf8ff'),
            orderBy('nickname'),
            limit(8)
          )
        );
        if (cancelled) return;
        setOtherMembers(
          snap.docs.map((d) => d.data() as UserPublicProfile).filter((m) => m.uid !== myUid)
        );
      } catch (err) {
        console.warn('Nickname search failed:', err);
        if (!cancelled) setOtherMembers([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [memberQuery, myUid]);

  const incomingRequests = directChats.filter((c) => !isChatAccepted(c) && c.requestedBy !== myUid);
  const visibleChats = directChats.filter((c) => isChatAccepted(c) || c.requestedBy === myUid);

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

  const sidebarContent = (
    <div className="glass-strong h-full flex flex-col border-e border-slate-200 dark:border-slate-800/80 shadow-sm">
      {/* Brand Row */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="logo-shine inline-flex rounded-[0.75rem] shadow-md rotate-[-6deg] shrink-0">
            <MacaronLogo size={42} />
          </span>
          <div className="min-w-0">
            <span className="block text-base font-bold text-gradient truncate leading-tight">
              {siteTitle}
            </span>
            <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate">
              {t.appTagline}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Top Mode Tabs: Group/Direct Chat vs Admin */}
      <div className="px-4 pt-4 pb-2 space-y-1">
        <button
          type="button"
          onClick={() => {
            setActiveView(selectedDirectChatId && activeView === 'direct' ? 'direct' : 'room');
            setMobileSidebarOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeView !== 'admin'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md shadow-slate-900/15'
              : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/70'
          }`}
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">{t.chatTab}</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setActiveView('admin');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeView === 'admin'
                ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.adminTab}</span>
          </button>
        )}
      </div>

      {/* Scrollable Navigation: Group Rooms + Direct Chats + People Picker */}
      <div className="flex-1 overflow-y-auto pastel-scroll px-4 py-3 space-y-6">
        {/* 1. Group Chat Rooms */}
        <div className="space-y-1.5">
          <div className="px-2 pb-0.5 flex items-center justify-between text-[11px] font-bold tracking-wide text-slate-400 dark:text-slate-500">
            <span>{t.groupRoomsTitle}</span>
            <span className="tabular-nums px-1.5 py-px rounded-full bg-slate-100 dark:bg-slate-800 text-[10px]">{rooms.length}</span>
          </div>
          {rooms.map((room) => {
            const isSelected = activeView === 'room' && activeRoom?.id === room.id;
            const toneHex = getToneColor(room.accentTone);
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => {
                  setSelectedRoomId(room.id);
                  setActiveView('room');
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-start transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--primary-soft)] text-[var(--primary)] font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E2230]'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-white dark:bg-[#11131A]' : 'bg-slate-100 dark:bg-[#1E2230]'
                  }`}
                >
                  {ROOM_ICONS[room.id] ? (
                    <span className="text-base leading-none" aria-hidden="true">{ROOM_ICONS[room.id]}</span>
                  ) : (
                    <Hash className="w-4 h-4 text-slate-800 dark:text-slate-100" />
                  )}
                </span>
                <span
                  className={`text-xs truncate flex-1 ${
                    isUnread(readKey('room', room.id), room.lastMessageAt, isSelected)
                      ? 'font-bold text-slate-900 dark:text-slate-50'
                      : ''
                  }`}
                >
                  {isRtl ? room.nameAr : room.nameEn}
                </span>
                {isUnread(readKey('room', room.id), room.lastMessageAt, isSelected) && unreadDot}
              </button>
            );
          })}
        </div>

        {/* 2a. Incoming message requests */}
        {incomingRequests.length > 0 && (
          <div className="space-y-1.5">
            <div className="px-2 pb-0.5 flex items-center justify-between text-[11px] font-bold tracking-wide text-violet-600 dark:text-violet-300">
              <span>{t.requestsTitle}</span>
              <span className="tabular-nums px-1.5 py-px rounded-full bg-violet-100 dark:bg-violet-500/20 text-[10px]">{incomingRequests.length}</span>
            </div>
            {incomingRequests.map((chat) => {
              const peer = getOtherParticipant(chat);
              const isSelected = activeView === 'direct' && activeDirectChat?.id === chat.id;
              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => {
                    setSelectedDirectChatId(chat.id);
                    setActiveView('direct');
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-start transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30'
                      : 'border-dashed border-violet-200 dark:border-violet-500/30 hover:bg-violet-50/60 dark:hover:bg-violet-500/10'
                  }`}
                >
                  <AvatarImg src={peer.photoUrl} name={peer.name} sizeClass="w-8 h-8" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate text-slate-800 dark:text-slate-100">{peer.name}</div>
                    <div className="text-[11px] truncate text-slate-500 dark:text-slate-400">
                      {chat.lastMessageText || `@${peer.nickname}`}
                    </div>
                  </div>
                  {unreadDot}
                </button>
              );
            })}
          </div>
        )}

        {/* 2. Active Direct 1-on-1 Chats */}
        <div className="space-y-1.5">
          <div className="px-2 pb-0.5 flex items-center justify-between text-[11px] font-bold tracking-wide text-slate-400 dark:text-slate-500">
            <span>{t.directChatsTitle}</span>
            <span className="tabular-nums px-1.5 py-px rounded-full bg-slate-100 dark:bg-slate-800 text-[10px]">{visibleChats.length}</span>
          </div>

          {visibleChats.length === 0 ? (
            <p className="px-2.5 py-1.5 text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
              {t.noDirectChatsYet}
            </p>
          ) : (
            visibleChats.map((chat) => {
              const peer = getOtherParticipant(chat);
              const awaiting = !isChatAccepted(chat);
              const isSelected = activeView === 'direct' && activeDirectChat?.id === chat.id;
              const dmUnread =
                Boolean(chat.lastMessageText) &&
                isUnread(readKey('direct', chat.id), chat.updatedAt, isSelected);
              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => {
                    setSelectedDirectChatId(chat.id);
                    setActiveView('direct');
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-start transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-white dark:bg-[#1E2230] text-slate-900 dark:text-slate-50 font-semibold shadow-sm border-slate-200 dark:border-slate-700'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-white/70 dark:hover:bg-[#1E2230] border-transparent'
                  }`}
                >
                  <span className="relative shrink-0">
                    <AvatarImg src={peer.photoUrl} name={peer.name} sizeClass="w-8 h-8" />
                    {presenceDot(peer.uid)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs truncate ${dmUnread ? 'font-bold' : ''}`}>{peer.name}</div>
                    <div
                      className={`text-[11px] truncate ${
                        dmUnread
                          ? 'text-slate-700 dark:text-slate-200 font-semibold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {awaiting ? t.requestPendingLabel : chat.lastMessageText || `@${peer.nickname}`}
                    </div>
                  </div>
                  {dmUnread && !awaiting && unreadDot}
                </button>
              );
            })
          )}
        </div>

        {/* 3. Choose a Person to Chat Privately */}
        <div className="space-y-2">
          <div className="px-2 pb-0.5 flex items-center justify-between text-[11px] font-bold tracking-wide text-slate-400 dark:text-slate-500">
            <span>{t.peopleToChatTitle}</span>
          </div>

          {(
            <div className="relative">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                placeholder={t.searchMembersPlaceholder}
                className="w-full ps-8 pe-3 py-2 rounded-full text-xs border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-[#11131A] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-violet-200/50 dark:focus:ring-violet-500/15"
              />
            </div>
          )}

          {searching && memberQuery.length >= 2 ? (
            <p className="px-2.5 text-[11px] text-slate-400 dark:text-slate-500">…</p>
          ) : memberQuery.length < 2 ? (
            <p className="px-2.5 text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
              {t.searchPeopleHint}
            </p>
          ) : otherMembers.length === 0 ? (
            <p className="px-2.5 text-[11px] text-slate-400 dark:text-slate-500">{t.searchPeopleNoResults}</p>
          ) : null}

          <div className="space-y-1">
            {otherMembers.map((member) => (
              <button
                key={member.uid}
                type="button"
                disabled={startingDmUid === member.uid}
                onClick={() => handleOpenMemberChat(member)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-2xl hover:bg-white/80 dark:hover:bg-[#1E2230] hover:shadow-xs transition-all text-start cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="relative shrink-0">
                    <AvatarImg src={member.photoUrl} name={member.name} sizeClass="w-8 h-8" />
                    {presenceDot(member.uid)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {member.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      @{member.nickname}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold text-slate-400 group-hover:bg-violet-50 group-hover:text-violet-600 dark:text-slate-500 dark:group-hover:bg-violet-950/40 dark:group-hover:text-violet-300 transition-colors shrink-0">
                  <Send className="w-3 h-3" />
                  <span>{t.startPrivateChat}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-slate-400 dark:text-slate-500">
        <a href="#/about" className="hover:text-violet-600 dark:hover:text-violet-300">{t.aboutLink}</a>
        <a href="#/privacy" className="hover:text-violet-600 dark:hover:text-violet-300">{t.privacyLink}</a>
        <a href="#/terms" className="hover:text-violet-600 dark:hover:text-violet-300">{t.termsLink}</a>
      </div>

      {/* Current User Footer Card */}
      <div className="m-3 p-3 rounded-3xl space-y-2.5 bg-white/80 dark:bg-[#171A23] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="relative shrink-0">
            <AvatarImg
              src={currentUserProfile.photoUrl}
              name={currentUserProfile.name}
              sizeClass="w-10 h-10"
              className="ring-2 ring-violet-200 dark:ring-violet-500/30"
            />
            <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-[#171A23]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
              {currentUserProfile.name}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              @{currentUserProfile.nickname}
              {isAdmin ? ` · ${t.roleAdmin}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowEditProfile(true)}
            title={t.editProfile}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold bg-slate-100/80 dark:bg-[#1E2230] text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-[#262A36] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{t.settingsTitle}</span>
          </button>

          <button
            type="button"
            onClick={onSignOut}
            title={t.signOut}
            className="p-2 rounded-full bg-slate-100/80 dark:bg-[#1E2230] text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-dvh w-full flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-80 shrink-0 h-full relative z-10">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="msg-in w-80 max-w-[85vw] h-full relative z-10">{sidebarContent}</div>
          <div
            className="flex-1 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Workspace Bar */}
        <header className="glass relative z-10 px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Menu"
              className="relative lg:hidden p-2.5 rounded-full bg-white/80 dark:bg-[#1E2230] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer"
            >
              <Menu className="w-4 h-4" />
              {unreadTotal > 0 && (
                <span className="absolute -top-1 -end-1 w-2.5 h-2.5 rounded-full bg-violet-500 border-2 border-white dark:border-[#171A23]" />
              )}
            </button>

            {activeView === 'admin' ? (
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-50 truncate">
                  {t.adminPanelTitle}
                </h2>
              </div>
            ) : activeView === 'direct' && activeDirectPeer ? (
              <div className="flex items-center gap-3 min-w-0">
                <span className="relative shrink-0">
                  <AvatarImg
                    src={activeDirectPeer.photoUrl}
                    name={activeDirectPeer.name}
                    sizeClass="w-9 h-9"
                  />
                  {presenceDot(activeDirectPeer.uid)}
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-50 truncate">
                    {activeDirectPeer.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {t.privateChatBadge} · @{activeDirectPeer.nickname}
                    {statusByUid[activeDirectPeer.uid] && (
                      <>
                        {' · '}
                        <span
                          className={
                            statusByUid[activeDirectPeer.uid] === 'online'
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : ''
                          }
                        >
                          {statusByUid[activeDirectPeer.uid] === 'online' ? t.onlineStatus : t.awayStatus}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            ) : activeRoom ? (
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/10 shadow-sm"
                  style={{
                    backgroundColor: hexToRgba(
                      getToneColor(activeRoom.accentTone),
                      themeMode === 'dark' ? 0.35 : 0.75
                    ),
                  }}
                >
                  {ROOM_ICONS[activeRoom.id] ? (
                    <span className="text-lg leading-none" aria-hidden="true">{ROOM_ICONS[activeRoom.id]}</span>
                  ) : (
                    <Users className="w-4 h-4 text-slate-800 dark:text-slate-100" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-50 truncate">
                    {isRtl ? activeRoom.nameAr : activeRoom.nameEn}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                    {t.groupChatBadge} ·{' '}
                    {isRtl ? activeRoom.descriptionAr : activeRoom.descriptionEn}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-full bg-white/70 dark:bg-[#11131A] border border-slate-200 dark:border-slate-700 shadow-xs shrink-0">
            <button
              type="button"
              onClick={() => onChangeLanguage(isRtl ? 'en' : 'ar')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isRtl ? 'EN' : 'عربي'}</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeThemeMode(themeMode === 'light' ? 'dark' : 'light')}
              title={themeMode === 'light' ? t.nightMode : t.dayMode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {themeMode === 'light' ? (
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="hidden sm:inline">
                {themeMode === 'light' ? t.nightMode : t.dayMode}
              </span>
            </button>
          </div>
        </header>

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
            onLeaveChat={() => {
              setSelectedDirectChatId(null);
              setActiveView('room');
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
          />
        ) : null}
      </div>

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
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
};
