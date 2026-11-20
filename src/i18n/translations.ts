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
  settingsSavedOnDevice: string;
  settingsAppearance: string;
  themeSystem: string;
  settingsFontSize: string;
  fontSmall: string;
  fontMedium: string;
  fontLarge: string;
  settingsNotifications: string;
  settingsSound: string;
  settingsSoundHint: string;
  settingsTestSound: string;
  settingsDesktop: string;
  settingsDesktopHint: string;
  settingsDesktopDenied: string;
  settingsDesktopUnsupported: string;
  settingsTyping: string;
  settingsEnterToSend: string;
  settingsEnterOn: string;
  settingsEnterOff: string;
  voiceRecord: string;
  voiceRecording: string;
  voiceCancel: string;
  voiceSend: string;
  voiceMessage: string;
  voiceMicDenied: string;
  voiceUnsupported: string;
  voiceTooLong: string;
  newMessageNotif: string;
  nicknameHint: string;
  nicknameInvalid: string;
  nicknameTaken: string;
  requestsTitle: string;
  requestPendingLabel: string;
  requestSentWaiting: string;
  cancelRequest: string;
  requestReceivedText: string;
  declineRequest: string;
  acceptRequest: string;
  requestOneMessageHint: string;
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
    appTagline: 'مجتمع للتعلم والأسئلة',
    welcomeHeroTitle: 'اسأل، تعلّم، وساعد غيرك',
    welcomeHeroSubtitle:
      'غرف للأسئلة والبرمجة والدراسة والمشاريع، ومحادثات خاصة بطلب، بالعربي والإنجليزي.',
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
    nicknameLabel: 'اسم المستخدم',
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
    roomsTitle: 'غرف التعلم',
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
    typeMessagePlaceholder: 'اكتب سؤالك أو ردّك...',
    sendMessage: 'إرسال',
    replyingTo: 'الرد على',
    cancelReply: 'إلغاء الرد',
    replyAction: 'رد',
    editAction: 'تعديل',
    deleteAction: 'حذف',
    saveAction: 'حفظ',
    cancelAction: 'إلغاء',
    emptyRoomTitle: 'ما في أسئلة هون لسا',
    emptyRoomDesc: 'كن أول واحد يسأل أو يشارك معلومة مفيدة.',
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
    searchMembersPlaceholder: '@اسم_المستخدم',
    directChatsTitle: 'المحادثات الخاصة',
    groupRoomsTitle: 'الدردشة الجماعية',
    peopleToChatTitle: 'ابحث عن شخص',
    directChatSubtitle: 'محادثة خاصة مباشرة',
    startPrivateChat: 'طلب',
    attachPhoto: 'إرسال صورة',
    removePhoto: 'إزالة الصورة',
    photoLabelShort: 'صورة',
    photoSentPreview: 'صورة مرفقة',
    noDirectChatsYet: 'ابحث عن شخص باسم المستخدم وابعتله طلب محادثة.',
    groupChatBadge: 'دردشة جماعية',
    privateChatBadge: 'دردشة خاصة',
    settingsSavedOnDevice: 'بتنحفظ على هالجهاز وبتقدر تغيّرها بأي وقت.',
    settingsAppearance: 'المظهر',
    themeSystem: 'حسب الجهاز',
    settingsFontSize: 'حجم الخط',
    fontSmall: 'صغير',
    fontMedium: 'عادي',
    fontLarge: 'كبير',
    settingsNotifications: 'الإشعارات',
    settingsSound: 'صوت للرسائل الجديدة',
    settingsSoundHint: 'نغمة خفيفة لما توصلك رسالة بمحادثة ثانية.',
    settingsTestSound: 'جرّب الصوت',
    settingsDesktop: 'إشعارات المتصفح',
    settingsDesktopHint: 'إشعار على الشاشة لما يوصلك إشي والموقع مش مفتوح قدامك.',
    settingsDesktopDenied: 'المتصفح مانع الإشعارات لهالموقع. فعّلها من إعدادات المتصفح.',
    settingsDesktopUnsupported: 'المتصفح هاد ما بيدعم الإشعارات.',
    settingsTyping: 'الكتابة',
    settingsEnterToSend: 'Enter للإرسال',
    settingsEnterOn: 'Enter بيبعت، و Shift+Enter لسطر جديد.',
    settingsEnterOff: 'Enter لسطر جديد، و Ctrl+Enter بيبعت.',
    voiceRecord: 'تسجيل رسالة صوتية',
    voiceRecording: 'عم يسجّل…',
    voiceCancel: 'إلغاء التسجيل',
    voiceSend: 'إرسال الصوت',
    voiceMessage: '🎤 رسالة صوتية',
    voiceMicDenied: 'ما في إذن للمايكروفون. اسمح للموقع يستخدمه من إعدادات المتصفح.',
    voiceUnsupported: 'المتصفح هاد ما بيدعم تسجيل الصوت.',
    voiceTooLong: 'التسجيل طويل كثير، الحد الأقصى دقيقتين.',
    newMessageNotif: 'رسالة جديدة',
    nicknameHint: 'حروف إنجليزية صغيرة وأرقام و _ أو . (من 3 لـ 20). لازم يكون فريد، والناس بيلاقوك فيه.',
    nicknameInvalid: 'اسم المستخدم لازم يكون من 3 لـ 20 حرف: حروف إنجليزية صغيرة أو أرقام أو _ أو .',
    nicknameTaken: 'اسم المستخدم هاد محجوز، جرّب اسم ثاني.',
    requestsTitle: 'طلبات المحادثة',
    requestPendingLabel: 'بانتظار القبول…',
    requestSentWaiting: 'بعتت طلبك. بتقدر تكمّل الحديث لما يقبل الطلب.',
    cancelRequest: 'إلغاء الطلب',
    requestReceivedText: 'هاد الشخص بدو يحكي معك. إذا قبلت، بتقدروا تكمّلوا المحادثة.',
    declineRequest: 'رفض',
    acceptRequest: 'قبول',
    requestOneMessageHint: 'هاد طلب محادثة: بتقدر تبعت رسالة وحدة بس لحد ما يقبل. عرّف عن حالك وعن سبب تواصلك.',
    searchPeopleHint: 'اكتب اسم المستخدم (@) حتى تلاقي الشخص وتبعتله طلب محادثة.',
    searchPeopleNoResults: 'ما في حدا بهاد الاسم.',
    aboutLink: 'عن ماكرون',
    privacyLink: 'الخصوصية',
    termsLink: 'شروط الاستخدام',
    backHome: 'رجوع',
    featureRooms: 'غرف أسئلة وتعلم',
    featurePrivate: 'طلبات محادثة خاصة',
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
    appTagline: 'A community for learning & questions',
    welcomeHeroTitle: 'Ask, learn, and help others',
    welcomeHeroSubtitle:
      'Rooms for questions, programming, study and projects, plus request-based private chats, in Arabic and English.',
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
    nicknameLabel: 'Username',
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
    roomsTitle: 'Learning rooms',
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
    typeMessagePlaceholder: 'Write your question or reply...',
    sendMessage: 'Send',
    replyingTo: 'Replying to',
    cancelReply: 'Cancel',
    replyAction: 'Reply',
    editAction: 'Edit',
    deleteAction: 'Delete',
    saveAction: 'Save',
    cancelAction: 'Cancel',
    emptyRoomTitle: 'No questions here yet',
    emptyRoomDesc: 'Be the first to ask or share something useful.',
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
    searchMembersPlaceholder: '@username',
    directChatsTitle: 'Direct Messages',
    groupRoomsTitle: 'Group Chats',
    peopleToChatTitle: 'Find someone',
    directChatSubtitle: 'Private 1-on-1 Conversation',
    startPrivateChat: 'Request',
    attachPhoto: 'Send Photo',
    removePhoto: 'Remove Photo',
    photoLabelShort: 'Photo',
    photoSentPreview: 'Photo attached',
    noDirectChatsYet: 'Find someone by username and send them a chat request.',
    groupChatBadge: 'Group Chat',
    privateChatBadge: 'Private Chat',
    settingsSavedOnDevice: 'Saved on this device, change them anytime.',
    settingsAppearance: 'Appearance',
    themeSystem: 'System',
    settingsFontSize: 'Text size',
    fontSmall: 'Small',
    fontMedium: 'Normal',
    fontLarge: 'Large',
    settingsNotifications: 'Notifications',
    settingsSound: 'Sound for new messages',
    settingsSoundHint: 'A soft chime when a message arrives in another conversation.',
    settingsTestSound: 'Test sound',
    settingsDesktop: 'Browser notifications',
    settingsDesktopHint: 'Get a notification when something arrives while the tab is in the background.',
    settingsDesktopDenied: 'Notifications are blocked for this site. Enable them in your browser settings.',
    settingsDesktopUnsupported: 'This browser does not support notifications.',
    settingsTyping: 'Typing',
    settingsEnterToSend: 'Enter to send',
    settingsEnterOn: 'Enter sends, Shift+Enter adds a new line.',
    settingsEnterOff: 'Enter adds a new line, Ctrl+Enter sends.',
    voiceRecord: 'Record a voice message',
    voiceRecording: 'Recording…',
    voiceCancel: 'Cancel recording',
    voiceSend: 'Send voice',
    voiceMessage: '🎤 Voice message',
    voiceMicDenied: 'Microphone access was denied. Allow it in your browser settings.',
    voiceUnsupported: 'This browser does not support voice recording.',
    voiceTooLong: 'Recording is too long, the limit is 2 minutes.',
    newMessageNotif: 'New message',
    nicknameHint: 'Lowercase English letters, numbers, _ or . (3–20). Must be unique; people find you by it.',
    nicknameInvalid: 'Username must be 3–20 characters: lowercase English letters, numbers, _ or .',
    nicknameTaken: 'That username is taken, try another one.',
    requestsTitle: 'Chat requests',
    requestPendingLabel: 'Waiting for acceptance…',
    requestSentWaiting: 'Request sent. You can keep chatting once it is accepted.',
    cancelRequest: 'Cancel request',
    requestReceivedText: 'This person wants to chat with you. Accept to continue the conversation.',
    declineRequest: 'Decline',
    acceptRequest: 'Accept',
    requestOneMessageHint: 'This is a chat request: you can send one message until it is accepted. Introduce yourself and why you are reaching out.',
    searchPeopleHint: 'Type a @username to find someone and send a chat request.',
    searchPeopleNoResults: 'No one with that username.',
    aboutLink: 'About',
    privacyLink: 'Privacy',
    termsLink: 'Terms',
    backHome: 'Back',
    featureRooms: 'Q&A and learning rooms',
    featurePrivate: 'Private chat requests',
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
