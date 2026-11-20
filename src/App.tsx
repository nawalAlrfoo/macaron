/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { ChatWorkspace } from '@/src/components/ChatWorkspace';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { OnboardingView } from '@/src/components/OnboardingView';
import { MacaronLogo } from '@/src/components/MacaronLogo';
import { InfoPage, type InfoPageId } from '@/src/components/InfoPage';
import { TRANSLATIONS } from '@/src/i18n/translations';
import {
  ADMIN_BOOTSTRAP_EMAIL,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testConnection,
} from '@/src/lib/firebase';
import {
  AccentTone,
  AdminRecord,
  ChatRoom,
  DEFAULT_ROOMS,
  DEFAULT_SITE_SETTINGS,
  DirectChat,
  Language,
  SiteSettings,
  ThemeMode,
  UserPrivateInfo,
  UserPublicProfile,
  VALIDATION_LIMITS,
} from '@/src/types/chat';

function MacaronApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  const [publicProfile, setPublicProfile] = useState<UserPublicProfile | null>(null);
  const [privateInfo, setPrivateInfo] = useState<UserPrivateInfo | null>(null);
  const [isAdminDoc, setIsAdminDoc] = useState(false);

  const [settings, setSettings] = useState<SiteSettings>({
    ...DEFAULT_SITE_SETTINGS,
  });

  // Personal UI overrides (initialized from global settings, switchable anytime)
  const [language, setLanguage] = useState<Language>(DEFAULT_SITE_SETTINGS.defaultLanguage);
  const [themeMode, setThemeMode] = useState<ThemeMode>(DEFAULT_SITE_SETTINGS.themeMode);
  const [hasLocalLangOverride, setHasLocalLangOverride] = useState(false);
  const [hasLocalThemeOverride, setHasLocalThemeOverride] = useState(false);

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [directChats, setDirectChats] = useState<DirectChat[]>([]);
  const [members, setMembers] = useState<UserPublicProfile[]>([]);
  const [privateInfos, setPrivateInfos] = useState<Record<string, UserPrivateInfo>>({});
  const [adminsMap, setAdminsMap] = useState<Record<string, AdminRecord>>({});

  const hasProfile = Boolean(publicProfile);

  // Simple hash routes for static pages: #/about, #/privacy, #/terms
  const readInfoPage = (): InfoPageId | null => {
    const h = window.location.hash.replace(/^#\/?/, '');
    return h === 'about' || h === 'privacy' || h === 'terms' ? h : null;
  };
  const [infoPage, setInfoPage] = useState<InfoPageId | null>(readInfoPage);
  useEffect(() => {
    const onHash = () => setInfoPage(readInfoPage());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const isAdmin =
    Boolean(user?.email && user.email === ADMIN_BOOTSTRAP_EMAIL && user.emailVerified) ||
    isAdminDoc;

  // Startup connection validation
  useEffect(() => {
    testConnection();
  }, []);

  // Sync HTML dir/lang/dark class
  useEffect(() => {
    const root = document.documentElement;
    root.dir = language === 'ar' ? 'rtl' : 'ltr';
    root.lang = language;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [language, themeMode]);

  // Listen to global site theme settings (readable even before sign-in)
  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'theme');
    const unsub = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as SiteSettings;
          setSettings(data);
          if (!hasLocalLangOverride && data.defaultLanguage) {
            setLanguage(data.defaultLanguage);
          }
          if (!hasLocalThemeOverride && data.themeMode) {
            setThemeMode(data.themeMode);
          }
        }
      },
      (err) => {
        console.warn('Settings listener warning:', err.message);
      }
    );
    return () => unsub();
  }, [hasLocalLangOverride, hasLocalThemeOverride]);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setPublicProfile(null);
        setPrivateInfo(null);
        setIsAdminDoc(false);
        setProfileReady(true);
        setRooms([]);
        setDirectChats([]);
        setMembers([]);
        setPrivateInfos({});
        setAdminsMap({});
      } else {
        setProfileReady(false);
      }
    });
    return () => unsub();
  }, []);

  // Listen to current user's public & private profile + admin status
  useEffect(() => {
    if (!user) return;

    let gotPublic = false;
    let gotPrivate = false;
    const markReady = () => {
      if (gotPublic && gotPrivate) setProfileReady(true);
    };

    const unsubPub = onSnapshot(
      doc(db, 'users_public', user.uid),
      (snap) => {
        setPublicProfile(snap.exists() ? (snap.data() as UserPublicProfile) : null);
        gotPublic = true;
        markReady();
      },
      (err) => {
        gotPublic = true;
        markReady();
        handleFirestoreError(err, OperationType.GET, `users_public/${user.uid}`);
      }
    );

    const unsubPriv = onSnapshot(
      doc(db, 'users_private', user.uid),
      (snap) => {
        setPrivateInfo(snap.exists() ? (snap.data() as UserPrivateInfo) : null);
        gotPrivate = true;
        markReady();
      },
      (err) => {
        gotPrivate = true;
        markReady();
        handleFirestoreError(err, OperationType.GET, `users_private/${user.uid}`);
      }
    );

    const unsubAdmin = onSnapshot(
      doc(db, 'admins', user.uid),
      (snap) => {
        setIsAdminDoc(snap.exists());
      },
      () => {
        setIsAdminDoc(false);
      }
    );

    return () => {
      unsubPub();
      unsubPriv();
      unsubAdmin();
    };
  }, [user]);

  // Seed default rooms if empty once authenticated & profile exists
  const ensureDefaultRooms = useCallback(async (uid: string) => {
    try {
      const checkGeneral = await getDoc(doc(db, 'rooms', 'general'));
      if (!checkGeneral.exists()) {
        for (const r of DEFAULT_ROOMS) {
          await setDoc(doc(db, 'rooms', r.id), {
            id: r.id,
            nameAr: r.nameAr,
            nameEn: r.nameEn,
            descriptionAr: r.descriptionAr,
            descriptionEn: r.descriptionEn,
            accentTone: r.accentTone,
            createdBy: uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      console.warn('Room initialization skipped or already seeded:', err);
    }
  }, []);

  // Listen to rooms, direct chats & public members once profile is complete
  useEffect(() => {
    if (!user || !publicProfile) return;

    ensureDefaultRooms(user.uid);

    const roomsQuery = query(
      collection(db, 'rooms'),
      where('accentTone', 'in', ['yellow', 'pink', 'blue'])
    );
    const unsubRooms = onSnapshot(
      roomsQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ChatRoom);
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return ta - tb;
        });
        setRooms(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'rooms')
    );

    const directQuery = query(
      collection(db, 'direct_chats'),
      where('participantUids', 'array-contains', user.uid)
    );
    const unsubDirect = onSnapshot(
      directQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as DirectChat);
        list.sort((a, b) => {
          const ta = a.updatedAt?.toMillis?.() ?? 0;
          const tb = b.updatedAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setDirectChats(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'direct_chats')
    );

    const membersQuery = query(
      collection(db, 'users_public'),
      where('status', 'in', ['online', 'away'])
    );
    const unsubMembers = onSnapshot(
      membersQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as UserPublicProfile);
        list.sort((a, b) => a.name.localeCompare(b.name));
        setMembers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users_public')
    );

    return () => {
      unsubRooms();
      unsubDirect();
      unsubMembers();
    };
    // Depend on hasProfile (not the profile object) so presence/profile edits
    // don't tear down and re-open every listener.
  }, [user, hasProfile, ensureDefaultRooms]);

  // Presence: online while the tab is visible, away when hidden/closed
  useEffect(() => {
    if (!user || !hasProfile) return;
    const ref = doc(db, 'users_public', user.uid);
    let last: 'online' | 'away' | null = null;
    const setStatus = (status: 'online' | 'away') => {
      if (status === last) return;
      last = status;
      updateDoc(ref, { status, updatedAt: serverTimestamp() }).catch((err) =>
        console.warn('Presence update skipped:', err?.message ?? err)
      );
    };
    const onVisibility = () =>
      setStatus(document.visibilityState === 'visible' ? 'online' : 'away');
    const onHide = () => setStatus('away');

    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
    };
  }, [user, hasProfile]);

  // Admin-only listeners (private emails & admin registry)
  useEffect(() => {
    if (!user || !isAdmin) {
      setPrivateInfos({});
      setAdminsMap({});
      return;
    }

    const unsubPrivAll = onSnapshot(
      collection(db, 'users_private'),
      (snap) => {
        const map: Record<string, UserPrivateInfo> = {};
        snap.docs.forEach((d) => {
          const item = d.data() as UserPrivateInfo;
          map[item.uid] = item;
        });
        setPrivateInfos(map);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users_private')
    );

    const unsubAdminsAll = onSnapshot(
      collection(db, 'admins'),
      (snap) => {
        const map: Record<string, AdminRecord> = {};
        snap.docs.forEach((d) => {
          const item = d.data() as AdminRecord;
          map[item.uid] = item;
        });
        setAdminsMap(map);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'admins')
    );

    return () => {
      unsubPrivAll();
      unsubAdminsAll();
    };
  }, [user, isAdmin]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      // Popup blocked (mobile, in-app browsers, strict settings) → full-page redirect instead
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment' ||
        code === 'auth/web-storage-unsupported'
      ) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw err;
    }
  };

  // Finish a redirect sign-in (if one was started) and surface its errors in the console
  useEffect(() => {
    getRedirectResult(auth).catch((err) => console.warn('Redirect sign-in failed:', err?.code ?? err));
  }, []);

  const handleSignOut = async () => {
    if (user && publicProfile) {
      try {
        await updateDoc(doc(db, 'users_public', user.uid), {
          status: 'away',
          updatedAt: serverTimestamp(),
        });
      } catch {
        // ignore — signing out matters more than presence
      }
    }
    await signOut(auth);
  };

  const handleSaveProfile = async (data: {
    name: string;
    nickname: string;
    email: string;
    photoUrl: string;
  }) => {
    if (!user) return;

    const cleanName = data.name.trim().slice(0, VALIDATION_LIMITS.MAX_NAME_LEN);
    const cleanNickname = data.nickname.trim().slice(0, VALIDATION_LIMITS.MAX_NICKNAME_LEN);
    const cleanEmail = data.email.trim().slice(0, VALIDATION_LIMITS.MAX_EMAIL_LEN);
    const cleanPhoto = data.photoUrl.trim().slice(0, VALIDATION_LIMITS.MAX_PHOTO_LEN);

    const pubRef = doc(db, 'users_public', user.uid);
    const privRef = doc(db, 'users_private', user.uid);

    try {
      const existingPub = await getDoc(pubRef);
      const batch = writeBatch(db);

      if (!existingPub.exists()) {
        batch.set(pubRef, {
          uid: user.uid,
          name: cleanName,
          nickname: cleanNickname,
          photoUrl: cleanPhoto,
          status: 'online',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(privRef, {
          uid: user.uid,
          email: cleanEmail,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.update(pubRef, {
          name: cleanName,
          nickname: cleanNickname,
          photoUrl: cleanPhoto,
          status: 'online',
          updatedAt: serverTimestamp(),
        });
        const existingPriv = await getDoc(privRef);
        if (existingPriv.exists()) {
          batch.update(privRef, {
            email: cleanEmail,
            updatedAt: serverTimestamp(),
          });
        } else {
          batch.set(privRef, {
            uid: user.uid,
            email: cleanEmail,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users_public/${user.uid}`);
    }
  };

  const handleStartDirectChat = async (targetMember: UserPublicProfile): Promise<string> => {
    if (!user || !publicProfile) return '';

    const participants = [publicProfile, targetMember].sort((a, b) =>
      a.uid.localeCompare(b.uid)
    );
    const [p1, p2] = participants;
    const chatId = `${p1.uid}_dm_${p2.uid}`.slice(0, VALIDATION_LIMITS.MAX_ID_LEN);
    const chatRef = doc(db, 'direct_chats', chatId);

    try {
      const existing = await getDoc(chatRef);
      if (!existing.exists()) {
        await setDoc(chatRef, {
          id: chatId,
          participantUids: [p1.uid, p2.uid],
          participant1Uid: p1.uid,
          participant1Name: p1.name.slice(0, VALIDATION_LIMITS.MAX_NAME_LEN),
          participant1Nickname: p1.nickname.slice(0, VALIDATION_LIMITS.MAX_NICKNAME_LEN),
          participant1Photo: p1.photoUrl.slice(0, VALIDATION_LIMITS.MAX_PHOTO_LEN),
          participant2Uid: p2.uid,
          participant2Name: p2.name.slice(0, VALIDATION_LIMITS.MAX_NAME_LEN),
          participant2Nickname: p2.nickname.slice(0, VALIDATION_LIMITS.MAX_NICKNAME_LEN),
          participant2Photo: p2.photoUrl.slice(0, VALIDATION_LIMITS.MAX_PHOTO_LEN),
          lastMessageText: '',
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return chatId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `direct_chats/${chatId}`);
    }
  };

  const handleSaveGlobalSettings = async (
    next: Omit<SiteSettings, 'updatedAt' | 'updatedBy'>
  ) => {
    if (!user) return;
    const path = 'settings/theme';
    try {
      await setDoc(doc(db, 'settings', 'theme'), {
        ...next,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      });
      setHasLocalLangOverride(false);
      setHasLocalThemeOverride(false);
      setLanguage(next.defaultLanguage);
      setThemeMode(next.themeMode);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleCreateRoom = async (room: {
    nameAr: string;
    nameEn: string;
    descriptionAr: string;
    descriptionEn: string;
    accentTone: AccentTone;
  }) => {
    if (!user) return;
    const slug =
      room.nameEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 32) || 'room';
    const roomId = `${slug}-${Date.now().toString(36)}`.slice(0, VALIDATION_LIMITS.MAX_ROOM_ID_LEN);

    try {
      await setDoc(doc(db, 'rooms', roomId), {
        id: roomId,
        nameAr: room.nameAr.slice(0, VALIDATION_LIMITS.MAX_NAME_LEN),
        nameEn: room.nameEn.slice(0, VALIDATION_LIMITS.MAX_NAME_LEN),
        descriptionAr: room.descriptionAr.slice(0, VALIDATION_LIMITS.MAX_ROOM_DESC_LEN),
        descriptionEn: room.descriptionEn.slice(0, VALIDATION_LIMITS.MAX_ROOM_DESC_LEN),
        accentTone: room.accentTone,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `rooms/${roomId}`);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      await deleteDoc(doc(db, 'rooms', roomId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `rooms/${roomId}`);
    }
  };

  const handleToggleAdminRole = async (
    targetUser: UserPublicProfile,
    email: string,
    makeAdmin: boolean
  ) => {
    if (!user) return;
    const path = `admins/${targetUser.uid}`;
    try {
      if (makeAdmin) {
        await setDoc(doc(db, 'admins', targetUser.uid), {
          uid: targetUser.uid,
          email: email.slice(0, VALIDATION_LIMITS.MAX_EMAIL_LEN),
          grantedBy: user.uid,
          createdAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(doc(db, 'admins', targetUser.uid));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleLanguageChange = (lang: Language) => {
    setHasLocalLangOverride(true);
    setLanguage(lang);
  };

  const handleThemeModeChange = (mode: ThemeMode) => {
    setHasLocalThemeOverride(true);
    setThemeMode(mode);
  };

  if (infoPage) {
    return (
      <InfoPage
        page={infoPage}
        language={language}
        backLabel={TRANSLATIONS[language].backHome}
        onClose={() => {
          history.replaceState(null, '', window.location.pathname + window.location.search);
          setInfoPage(null);
        }}
      />
    );
  }

  if (!authReady || (user && !profileReady)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <span className="logo-shine inline-flex rounded-[1.1rem] shadow-lg animate-bounce [animation-duration:1.6s]">
            <MacaronLogo size={64} />
          </span>
          <span className="text-sm font-semibold">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </span>
        </div>
      </div>
    );
  }

  const profileCompleted = Boolean(
    user &&
      publicProfile?.name &&
      publicProfile?.nickname &&
      publicProfile?.photoUrl &&
      privateInfo?.email
  );

  if (!user || !profileCompleted || !publicProfile || !privateInfo) {
    return (
      <OnboardingView
        user={user}
        language={language}
        themeMode={themeMode}
        settings={settings}
        onToggleLanguage={handleLanguageChange}
        onToggleThemeMode={handleThemeModeChange}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
        onCompleteProfile={handleSaveProfile}
        initialProfile={{
          name: publicProfile?.name || user?.displayName || '',
          nickname: publicProfile?.nickname || '',
          email: privateInfo?.email || user?.email || '',
          photoUrl: publicProfile?.photoUrl || undefined,
        }}
      />
    );
  }

  return (
    <ChatWorkspace
      currentUserProfile={publicProfile}
      currentEmail={privateInfo.email}
      isAdmin={isAdmin}
      language={language}
      themeMode={themeMode}
      settings={settings}
      rooms={rooms}
      directChats={directChats}
      members={members}
      privateInfos={privateInfos}
      adminsMap={adminsMap}
      onChangeLanguage={handleLanguageChange}
      onChangeThemeMode={handleThemeModeChange}
      onUpdateProfile={handleSaveProfile}
      onSaveGlobalSettings={handleSaveGlobalSettings}
      onCreateRoom={handleCreateRoom}
      onDeleteRoom={handleDeleteRoom}
      onStartDirectChat={handleStartDirectChat}
      onToggleAdminRole={handleToggleAdminRole}
      onSignOut={handleSignOut}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MacaronApp />
    </ErrorBoundary>
  );
}
