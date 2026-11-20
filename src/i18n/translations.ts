import type { Language } from '@/src/types/chat';

export interface Translations {
  appTagline: string;
  welcomeHeroTitle: string;
  welcomeHeroSubtitle: string;
  step1Title: string;
  step1Desc: string;
  signInGoogle: string;
  signedInAs: string;
  signOut: string;
  step2Title: string;
  step2Desc: string;
  photoLabel: string;
  uploadPhoto: string;
  orPickAvatar: string;
  nameLabel: string;
  namePlaceholder: string;
  nicknameLabel: string;
  nicknamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  startChatting: string;
  savingProfile: string;
  profileRequiredError: string;
  invalidEmailError: string;
  imageTooLargeError: string;
  chatTab: string;
  adminTab: string;
  roomsTitle: string;
  membersTitle: string;
  onlineStatus: string;
  awayStatus: string;
  editProfile: string;
  settingsTitle: string;
  dayMode: string;
  nightMode: string;
  languageLabel: string;
  arabicLang: string;
  englishLang: string;
  typeMessagePlaceholder: string;
  sendMessage: string;
  replyingTo: string;
  cancelReply: string;
  replyAction: string;
  editAction: string;
  deleteAction: string;
  saveAction: string;
  cancelAction: string;
  emptyRoomTitle: string;
  emptyRoomDesc: string;
  loadingMessages: string;
  adminPanelTitle: string;
  adminPanelSubtitle: string;
  adminAppearanceSection: string;
  siteNameArLabel: string;
  siteNameEnLabel: string;
  globalThemeModeLabel: string;
  defaultLanguageLabel: string;
  adminColorsSection: string;
  presetsLabel: string;
  primaryColorLabel: string;
  yellowAccentLabel: string;
  pinkAccentLabel: string;
  blueAccentLabel: string;
  myBubbleColorLabel: string;
  otherBubbleColorLabel: string;
  chatBgStyleLabel: string;
  bgStyles: {
    'pastel-blend': string;
    'soft-cream': string;
    'soft-sky': string;
    'soft-blush': string;
    'soft-butter': string;
  };
  bubbleStyleLabel: string;
  bubbleStyles: {
    cute: string;
    classic: string;
    pill: string;
  };
  livePreviewLabel: string;
  previewIncoming: string;
  previewOutgoing: string;
  saveThemeGlobal: string;
  savingTheme: string;
  themeSavedToast: string;
  adminRoomsSection: string;
  newRoomNameAr: string;
  newRoomNameEn: string;
  newRoomDescAr: string;
  newRoomDescEn: string;
  roomToneLabel: string;
  toneYellow: string;
  tonePink: string;
  toneBlue: string;
  createRoomBtn: string;
  deleteRoomBtn: string;
  adminMembersSection: string;
  memberColUser: string;
  memberColNickname: string;
  memberColEmail: string;
  memberColRole: string;
  memberColActions: string;
  roleAdmin: string;
  roleMember: string;
  makeAdmin: string;
  removeAdmin: string;
  personalSettingsTitle: string;
  personalSettingsDesc: string;
  closeBtn: string;
  youLabel: string;
  editedTag: string;
  quickEmojisLabel: string;
  adminBadge: string;
  searchMembersPlaceholder: string;
  directChatsTitle: string;
  groupRoomsTitle: string;
  peopleToChatTitle: string;
  directChatSubtitle: string;
  startPrivateChat: string;
  attachPhoto: string;
  removePhoto: string;
  photoLabelShort: string;
  photoSentPreview: string;
  noDirectChatsYet: string;
  groupChatBadge: string;
  privateChatBadge: string;
  searchPeopleHint: string;
  searchPeopleNoResults: string;
  aboutLink: string;
  privacyLink: string;
  termsLink: string;
  backHome: string;
  featureRooms: string;
  featurePrivate: string;
  featureReactions: string;
  featureNight: string;
  madeBy: string;
  authorName: string;
  privacyNote: string;
  authPopupClosed: string;
  authPopupBlocked: string;
  authNetwork: string;
  authUnauthorized: string;
  authGeneric: string;
  loadingLabel: string;
  errorTitle: string;
  errorReload: string;
  todayLabel: string;
  yesterdayLabel: string;
  typingOne: string;
  typingMany: string;
  reactAction: string;
  copyAction: string;
  copiedToast: string;
  confirmDeleteQuestion: string;
  confirmDeleteYes: string;
  searchMessagesPlaceholder: string;
  searchNoResults: string;
  searchResultsCount: string;
  jumpToLatest: string;
  newMessagesBadge: string;
  composerHint: string;
  offlineStatus: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  ar: {
    appTagline: 'دردشة بألوان الباستيل',
    welcomeHeroTitle: 'دردشة لطيفة، بألوان أحلى',
    welcomeHeroSubtitle:
      'انضم لغرف جماعية دافئة أو ابدأ محادثة خاصة مع أصدقائك، بالعربي أو الإنجليزي، بالنهار أو بالليل.',
    step1Title: 'أهلاً فيك 👋',
    step1Desc: 'ادخل بحساب Google خلال ثوانٍ، بدون كلمة سر جديدة.',
    signInGoogle: 'المتابعة باستخدام Google',
    signedInAs: 'مسجل الدخول باسم',
    signOut: 'تسجيل الخروج',
    step2Title: 'جهّز بطاقتك',
    step2Desc: 'اختر صورتك واكتب اسمك ولقبك، وبعدها أنت جاهز للدردشة.',
    photoLabel: 'الصورة الشخصية',
    uploadPhoto: 'رفع صورة من جهازك',
    orPickAvatar: 'أو اختر شخصية جاهزة',
    nameLabel: 'الاسم الكامل',
    namePlaceholder: 'مثال: نوال الرفوع',
    nicknameLabel: 'اللقب',
    nicknamePlaceholder: 'مثال: غيمة الصباح',
    emailLabel: 'البريد الإلكتروني',
    emailPlaceholder: 'name@example.com',
    startChatting: 'ابدأ الدردشة الآن',
    savingProfile: 'جاري الحفظ...',
    profileRequiredError: 'يرجى إدخال الصورة والاسم واللقب وبريد إلكتروني صحيح قبل البدء.',
    invalidEmailError: 'صيغة البريد الإلكتروني غير صحيحة.',
    imageTooLargeError: 'تعذر معالجة الصورة، يرجى اختيار صورة أخرى.',
    chatTab: 'الدردشة المباشرة',
    adminTab: 'لوحة تحكم المدير',
    roomsTitle: 'غرف الدردشة',
    membersTitle: 'الأعضاء المتواجدون',
    onlineStatus: 'متصل',
    awayStatus: 'بعيد',
    editProfile: 'تعديل ملفي',
    settingsTitle: 'المظهر واللغة',
    dayMode: 'الوضع النهاري',
    nightMode: 'الوضع الليلي',
    languageLabel: 'اللغة',
    arabicLang: 'العربية',
    englishLang: 'English',
    typeMessagePlaceholder: 'اكتب رسالة لطيفة أو أرفق صورة...',
    sendMessage: 'إرسال',
    replyingTo: 'الرد على',
    cancelReply: 'إلغاء الرد',
    replyAction: 'رد',
    editAction: 'تعديل',
    deleteAction: 'حذف',
    saveAction: 'حفظ',
    cancelAction: 'إلغاء',
    emptyRoomTitle: 'لا توجد رسائل هنا بعد',
    emptyRoomDesc: 'كن أول من يبدأ الحديث برسالة دافئة أو صورة لطيفة!',
    loadingMessages: 'جاري تحميل الرسائل...',
    adminPanelTitle: 'لوحة تحكم المدير',
    adminPanelSubtitle: 'تحكم كامل في ألوان الدردشة والموقع، الوضع الليلي والنهاري، الغرف والأعضاء.',
    adminAppearanceSection: 'الهوية والوضع العام',
    siteNameArLabel: 'اسم الموقع (عربي)',
    siteNameEnLabel: 'اسم الموقع (إنجليزي)',
    globalThemeModeLabel: 'الوضع الافتراضي للموقع',
    defaultLanguageLabel: 'اللغة الافتراضية',
    adminColorsSection: 'استوديو ألوان الباستيل والدردشة',
    presetsLabel: 'قوالب باستيل جاهزة (أصفر · وردي · أزرق)',
    primaryColorLabel: 'اللون الرئيسي للموقع',
    yellowAccentLabel: 'درجة الأصفر الباستيل',
    pinkAccentLabel: 'درجة الوردي الباستيل',
    blueAccentLabel: 'درجة الأزرق الباستيل',
    myBubbleColorLabel: 'لون فقاعات رسائلي',
    otherBubbleColorLabel: 'لون فقاعات رسائل الآخرين',
    chatBgStyleLabel: 'خلفية نافذة الدردشة',
    bgStyles: {
      'pastel-blend': 'مزيج الباستيل الثلاثي (أصفر + وردي + أزرق)',
      'soft-cream': 'كريمي دافئ ناعم',
      'soft-sky': 'أزرق سماوي هادئ',
      'soft-blush': 'وردي ساكورا ناعم',
      'soft-butter': 'أصفر زبدي لطيف',
    },
    bubbleStyleLabel: 'شكل فقاعات الرسائل',
    bubbleStyles: {
      cute: 'زوايا لطيفة متدرجة',
      classic: 'مربع ناعم كلاسيكي',
      pill: 'دائري ناعم',
    },
    livePreviewLabel: 'معاينة فورية لشكل الدردشة',
    previewIncoming: 'أهلاً! ألوان الباستيل مريحة جداً للعين اليوم ✨',
    previewOutgoing: 'مرحباً بك! يسعدنا انضمامك إلينا في هذه الغرفة.',
    saveThemeGlobal: 'حفظ ونشر الإعدادات للجميع',
    savingTheme: 'جاري الحفظ...',
    themeSavedToast: 'تم تحديث ألوان ومظهر الموقع في قاعدة البيانات!',
    adminRoomsSection: 'إدارة غرف الدردشة',
    newRoomNameAr: 'اسم الغرفة (عربي)',
    newRoomNameEn: 'اسم الغرفة (إنجليزي)',
    newRoomDescAr: 'وصف قصير (عربي)',
    newRoomDescEn: 'وصف قصير (إنجليزي)',
    roomToneLabel: 'لون تمييز الغرفة',
    toneYellow: 'أصفر باستيل',
    tonePink: 'وردي باستيل',
    toneBlue: 'أزرق باستيل',
    createRoomBtn: 'إنشاء غرفة جديدة',
    deleteRoomBtn: 'حذف الغرفة',
    adminMembersSection: 'الأعضاء المسجلون وصلاحيات الإدارة',
    memberColUser: 'العضو',
    memberColNickname: 'اللقب',
    memberColEmail: 'البريد الإلكتروني',
    memberColRole: 'الصلاحية',
    memberColActions: 'الإجراء',
    roleAdmin: 'مدير',
    roleMember: 'عضو',
    makeAdmin: 'ترقية لمدير',
    removeAdmin: 'إزالة الإدارة',
    personalSettingsTitle: 'إعدادات العرض واللغة',
    personalSettingsDesc: 'يمكنك تبديل لغة الواجهة والوضع الليلي أو النهاري في أي وقت.',
    closeBtn: 'إغلاق',
    youLabel: 'أنت',
    editedTag: 'معدّلة',
    quickEmojisLabel: 'رموز لطيفة',
    adminBadge: 'مدير النظام',
    searchMembersPlaceholder: 'ابحث بالاسم أو اللقب...',
    directChatsTitle: 'المحادثات الخاصة',
    groupRoomsTitle: 'الدردشة الجماعية',
    peopleToChatTitle: 'ابحث عن شخص',
    directChatSubtitle: 'محادثة خاصة مباشرة',
    startPrivateChat: 'محادثة',
    attachPhoto: 'إرسال صورة',
    removePhoto: 'إزالة الصورة',
    photoLabelShort: 'صورة',
    photoSentPreview: 'صورة مرفقة',
    noDirectChatsYet: 'اضغط على أي عضو بالأسفل لبدء دردشة خاصة معه.',
    groupChatBadge: 'دردشة جماعية',
    privateChatBadge: 'دردشة خاصة',
    searchPeopleHint: 'اكتب اسم أو لقب الشخص (حرفين على الأقل) حتى تلاقيه وتبدأ معه محادثة خاصة.',
    searchPeopleNoResults: 'ما في حدا بهالاسم.',
    aboutLink: 'عن ماكرون',
    privacyLink: 'الخصوصية',
    termsLink: 'شروط الاستخدام',
    backHome: 'رجوع',
    featureRooms: 'غرف جماعية',
    featurePrivate: 'محادثات خاصة',
    featureReactions: 'تفاعلات وصور',
    featureNight: 'وضع ليلي',
    madeBy: 'صُنع بحب بواسطة',
    authorName: 'نوال الرفوع',
    privacyNote: 'نستخدم اسمك وصورتك فقط لعرضها للأعضاء، وبريدك يبقى خاصاً.',
    authPopupClosed: 'تم إغلاق نافذة تسجيل الدخول قبل الإكمال. جرّب مرة ثانية.',
    authPopupBlocked: 'المتصفح منع نافذة تسجيل الدخول. اسمح بالنوافذ المنبثقة لهذا الموقع وجرّب مرة ثانية.',
    authNetwork: 'لا يوجد اتصال بالإنترنت. تأكد من الاتصال وجرّب مرة ثانية.',
    authUnauthorized: 'هذا الرابط غير مسموح لتسجيل الدخول بعد. تواصل مع إدارة الموقع.',
    authGeneric: 'صار خطأ أثناء تسجيل الدخول. جرّب مرة ثانية.',
    loadingLabel: 'جاري التحميل...',
    errorTitle: 'صار خطأ غير متوقع',
    errorReload: 'إعادة تحميل',
    todayLabel: 'اليوم',
    yesterdayLabel: 'أمس',
    typingOne: '{name} يكتب الآن…',
    typingMany: '{count} أشخاص يكتبون الآن…',
    reactAction: 'تفاعل',
    copyAction: 'نسخ',
    copiedToast: 'تم النسخ',
    confirmDeleteQuestion: 'حذف الرسالة؟',
    confirmDeleteYes: 'حذف',
    searchMessagesPlaceholder: 'ابحث في هذه المحادثة...',
    searchNoResults: 'لا توجد رسائل مطابقة',
    searchResultsCount: '{count} نتيجة',
    jumpToLatest: 'آخر الرسائل',
    newMessagesBadge: 'جديد',
    composerHint: 'Enter للإرسال · Shift+Enter لسطر جديد',
    offlineStatus: 'غير نشط',
  },
  en: {
    appTagline: 'Pastel-colored chat',
    welcomeHeroTitle: 'Cozy chats, sweeter colors',
    welcomeHeroSubtitle:
      'Join warm group rooms or start a private chat with friends, in Arabic or English, by day or by night.',
    step1Title: 'Welcome 👋',
    step1Desc: 'Sign in with your Google account in seconds, no new password needed.',
    signInGoogle: 'Continue with Google',
    signedInAs: 'Signed in as',
    signOut: 'Sign Out',
    step2Title: 'Set up your card',
    step2Desc: 'Pick a photo, add your name and nickname, and you are ready to chat.',
    photoLabel: 'Profile Photo',
    uploadPhoto: 'Upload Photo',
    orPickAvatar: 'Or pick a ready-made avatar',
    nameLabel: 'Full Name',
    namePlaceholder: 'e.g. Nawal Alrfoo',
    nicknameLabel: 'Nickname',
    nicknamePlaceholder: 'e.g. Morning Cloud',
    emailLabel: 'Email Address',
    emailPlaceholder: 'name@example.com',
    startChatting: 'Start Chatting',
    savingProfile: 'Saving...',
    profileRequiredError: 'Please add a photo, name, nickname, and valid email before chatting.',
    invalidEmailError: 'Please enter a valid email address.',
    imageTooLargeError: 'Could not process that image. Please try another file.',
    chatTab: 'Live Chat',
    adminTab: 'Admin Panel',
    roomsTitle: 'Chat Rooms',
    membersTitle: 'Community Members',
    onlineStatus: 'Online',
    awayStatus: 'Away',
    editProfile: 'Edit Profile',
    settingsTitle: 'Theme & Language',
    dayMode: 'Day Mode',
    nightMode: 'Night Mode',
    languageLabel: 'Language',
    arabicLang: 'العربية',
    englishLang: 'English',
    typeMessagePlaceholder: 'Write a message or attach a photo...',
    sendMessage: 'Send',
    replyingTo: 'Replying to',
    cancelReply: 'Cancel',
    replyAction: 'Reply',
    editAction: 'Edit',
    deleteAction: 'Delete',
    saveAction: 'Save',
    cancelAction: 'Cancel',
    emptyRoomTitle: 'No messages yet',
    emptyRoomDesc: 'Start the conversation with a warm message or photo!',
    loadingMessages: 'Loading messages...',
    adminPanelTitle: 'Admin Control Panel',
    adminPanelSubtitle: 'Customize site and chat colors, day/night mode, bilingual defaults, rooms, and members.',
    adminAppearanceSection: 'Site Identity & Mode',
    siteNameArLabel: 'Site Name (Arabic)',
    siteNameEnLabel: 'Site Name (English)',
    globalThemeModeLabel: 'Default Site Mode',
    defaultLanguageLabel: 'Default Language',
    adminColorsSection: 'Pastel Chat & Site Color Studio',
    presetsLabel: 'Curated Pastel Tri-Blend Presets (Yellow · Pink · Blue)',
    primaryColorLabel: 'Primary Site Accent',
    yellowAccentLabel: 'Pastel Yellow Accent',
    pinkAccentLabel: 'Pastel Pink Accent',
    blueAccentLabel: 'Pastel Blue Accent',
    myBubbleColorLabel: 'Outgoing Message Bubble',
    otherBubbleColorLabel: 'Incoming Message Bubble',
    chatBgStyleLabel: 'Chat Canvas Backdrop',
    bgStyles: {
      'pastel-blend': 'Pastel Trio Blend (Yellow + Pink + Blue)',
      'soft-cream': 'Warm Soft Cream',
      'soft-sky': 'Calm Sky Blue',
      'soft-blush': 'Sakura Blush Pink',
      'soft-butter': 'Buttercup Yellow',
    },
    bubbleStyleLabel: 'Bubble Corner Style',
    bubbleStyles: {
      cute: 'Playful Asymmetric',
      classic: 'Soft Classic',
      pill: 'Pill Rounded',
    },
    livePreviewLabel: 'Live Chat Preview',
    previewIncoming: 'Hello! These pastel colors feel so calm and welcoming today.',
    previewOutgoing: 'Hi there! Glad to have you chatting in this room.',
    saveThemeGlobal: 'Save & Publish Globally',
    savingTheme: 'Saving...',
    themeSavedToast: 'Site & chat theme saved to the live database!',
    adminRoomsSection: 'Chat Rooms Manager',
    newRoomNameAr: 'Room Name (Arabic)',
    newRoomNameEn: 'Room Name (English)',
    newRoomDescAr: 'Short Description (Arabic)',
    newRoomDescEn: 'Short Description (English)',
    roomToneLabel: 'Room Pastel Tone',
    toneYellow: 'Pastel Yellow',
    tonePink: 'Pastel Pink',
    toneBlue: 'Pastel Blue',
    createRoomBtn: 'Create Room',
    deleteRoomBtn: 'Delete Room',
    adminMembersSection: 'Members & Admin Permissions',
    memberColUser: 'Member',
    memberColNickname: 'Nickname',
    memberColEmail: 'Email',
    memberColRole: 'Role',
    memberColActions: 'Actions',
    roleAdmin: 'Admin',
    roleMember: 'Member',
    makeAdmin: 'Make Admin',
    removeAdmin: 'Remove Admin',
    personalSettingsTitle: 'Display & Language Settings',
    personalSettingsDesc: 'Switch between Arabic / English and Day / Night mode anytime.',
    closeBtn: 'Close',
    youLabel: 'You',
    editedTag: 'Edited',
    quickEmojisLabel: 'Quick Emojis',
    adminBadge: 'Administrator',
    searchMembersPlaceholder: 'Search by name or nickname...',
    directChatsTitle: 'Direct Messages',
    groupRoomsTitle: 'Group Chats',
    peopleToChatTitle: 'Find someone',
    directChatSubtitle: 'Private 1-on-1 Conversation',
    startPrivateChat: 'Chat',
    attachPhoto: 'Send Photo',
    removePhoto: 'Remove Photo',
    photoLabelShort: 'Photo',
    photoSentPreview: 'Photo attached',
    noDirectChatsYet: 'Click any member below to start a private 1-on-1 chat.',
    groupChatBadge: 'Group Chat',
    privateChatBadge: 'Private Chat',
    searchPeopleHint: 'Type a name or nickname (at least 2 letters) to find someone and start a private chat.',
    searchPeopleNoResults: 'No one found with that name.',
    aboutLink: 'About',
    privacyLink: 'Privacy',
    termsLink: 'Terms',
    backHome: 'Back',
    featureRooms: 'Group rooms',
    featurePrivate: 'Private chats',
    featureReactions: 'Reactions & photos',
    featureNight: 'Night mode',
    madeBy: 'Made with love by',
    authorName: 'Nawal Alrfoo',
    privacyNote: 'We only show your name and photo to members; your email stays private.',
    authPopupClosed: 'The sign-in window was closed before finishing. Please try again.',
    authPopupBlocked: 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.',
    authNetwork: 'No internet connection. Check your connection and try again.',
    authUnauthorized: 'Sign-in is not enabled for this address yet. Please contact the site admin.',
    authGeneric: 'Something went wrong while signing in. Please try again.',
    loadingLabel: 'Loading...',
    errorTitle: 'Something went wrong',
    errorReload: 'Reload',
    todayLabel: 'Today',
    yesterdayLabel: 'Yesterday',
    typingOne: '{name} is typing…',
    typingMany: '{count} people are typing…',
    reactAction: 'React',
    copyAction: 'Copy',
    copiedToast: 'Copied',
    confirmDeleteQuestion: 'Delete message?',
    confirmDeleteYes: 'Delete',
    searchMessagesPlaceholder: 'Search this conversation...',
    searchNoResults: 'No matching messages',
    searchResultsCount: '{count} results',
    jumpToLatest: 'Latest messages',
    newMessagesBadge: 'New',
    composerHint: 'Enter to send · Shift+Enter for a new line',
    offlineStatus: 'Away',
  },
};
