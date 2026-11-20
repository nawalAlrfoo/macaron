import type { Timestamp } from 'firebase/firestore';

export type Language = 'ar' | 'en';
export type ThemeMode = 'light' | 'dark';
export type AccentTone = 'yellow' | 'pink' | 'blue';
export type PresetId = 'cotton-candy' | 'lemon-berry' | 'cloudy-macaron' | 'twilight-sorbet' | 'custom';
export type ChatBgStyle = 'pastel-blend' | 'soft-cream' | 'soft-sky' | 'soft-blush' | 'soft-butter';
export type BubbleStyle = 'cute' | 'classic' | 'pill';

export const VALIDATION_LIMITS = {
  MAX_ID_LEN: 128,
  MAX_ROOM_ID_LEN: 64,
  MAX_NAME_LEN: 60,
  MAX_NICKNAME_LEN: 40,
  MAX_EMAIL_LEN: 120,
  MAX_PHOTO_LEN: 60000,
  MAX_CHAT_IMAGE_LEN: 250000,
  MAX_MESSAGE_LEN: 1000,
  MAX_ROOM_DESC_LEN: 160,
  MAX_REPLY_TEXT_LEN: 200,
  EMAIL_REGEX: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
  HEX_COLOR_REGEX: /^#[0-9a-fA-F]{6}$/,
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
} as const;

export interface UserPublicProfile {
  uid: string;
  name: string;
  nickname: string;
  photoUrl: string;
  status: 'online' | 'away';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UserPrivateInfo {
  uid: string;
  email: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AdminRecord {
  uid: string;
  email: string;
  grantedBy: string;
  createdAt?: Timestamp;
}

export interface SiteSettings {
  siteNameAr: string;
  siteNameEn: string;
  themeMode: ThemeMode;
  defaultLanguage: Language;
  presetId: PresetId;
  primaryColor: string;
  yellowAccent: string;
  pinkAccent: string;
  blueAccent: string;
  myBubbleColor: string;
  otherBubbleColor: string;
  chatBgStyle: ChatBgStyle;
  bubbleStyle: BubbleStyle;
  updatedBy: string;
  updatedAt?: Timestamp;
}

export interface ChatRoom {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  accentTone: AccentTone;
  createdBy: string;
  /** Set on every new message so the sidebar can show unread dots */
  lastMessageAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ChatMessage {
  id: string;
  roomId?: string;
  chatId?: string;
  participantUids?: string[];
  senderUid: string;
  senderName: string;
  senderNickname: string;
  senderPhoto: string;
  text: string;
  imageUrl?: string;
  replyToId?: string;
  replyToSender?: string;
  replyToText?: string;
  /** One reaction per user: uid -> emoji (must be one of REACTION_EMOJIS) */
  reactions?: Record<string, string>;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface DirectChat {
  id: string;
  participantUids: [string, string];
  participant1Uid: string;
  participant1Name: string;
  participant1Nickname: string;
  participant1Photo: string;
  participant2Uid: string;
  participant2Name: string;
  participant2Nickname: string;
  participant2Photo: string;
  lastMessageText: string;
  createdBy: string;
  /** Message requests: a new private chat starts as 'pending' until the other person accepts.
   *  Chats created before this feature have no status and count as accepted. */
  status?: 'pending' | 'accepted';
  requestedBy?: string;
  /** The requester may send exactly one message while the chat is pending */
  requestMessageSent?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export const isChatAccepted = (chat?: DirectChat | null) => (chat?.status ?? 'accepted') === 'accepted';

/** Unique @nickname: 3–20 lowercase English letters, digits, _ or . (keep in sync with firestore.rules) */
export const NICKNAME_REGEX = /^[a-z0-9_.]{3,20}$/;

export const normalizeNickname = (raw: string) =>
  raw.trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20);

/** read_states/{uid}: last time the user opened each conversation */
export interface ReadState {
  uid: string;
  lastRead: Record<string, Timestamp>;
}

/** rooms/{roomId}/typing/{uid} and direct_chats/{chatId}/typing/{uid} */
export interface TypingState {
  uid: string;
  name: string;
  updatedAt?: Timestamp;
}

/** Keep in sync with isValidReactionChange() in firestore.rules */
export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;

export const TYPING_TTL_MS = 6000;

export const readKey = (mode: 'room' | 'direct', id: string) =>
  mode === 'room' ? `room__${id}` : `dm__${id}`;

export interface ThemePreset {
  id: Exclude<PresetId, 'custom'>;
  nameAr: string;
  nameEn: string;
  primaryColor: string;
  yellowAccent: string;
  pinkAccent: string;
  blueAccent: string;
  myBubbleColor: string;
  otherBubbleColor: string;
  chatBgStyle: ChatBgStyle;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'cotton-candy',
    nameAr: 'غزل البنات الباستيل',
    nameEn: 'Sunrise Cotton Candy',
    primaryColor: '#EC4899',
    yellowAccent: '#FEF08A',
    pinkAccent: '#FBCFE8',
    blueAccent: '#BAE6FD',
    myBubbleColor: '#FCE7F3',
    otherBubbleColor: '#E0F2FE',
    chatBgStyle: 'pastel-blend',
  },
  {
    id: 'lemon-berry',
    nameAr: 'ليمون وتوت لطيف',
    nameEn: 'Lemonade & Berry',
    primaryColor: '#3B82F6',
    yellowAccent: '#FEF9C3',
    pinkAccent: '#FECDD3',
    blueAccent: '#BFDBFE',
    myBubbleColor: '#FEF3C7',
    otherBubbleColor: '#FCE7F3',
    chatBgStyle: 'pastel-blend',
  },
  {
    id: 'cloudy-macaron',
    nameAr: 'ماكارون السحاب',
    nameEn: 'Cloudy Macaron',
    primaryColor: '#0284C7',
    yellowAccent: '#FDE68A',
    pinkAccent: '#F5D0FE',
    blueAccent: '#A5F3FC',
    myBubbleColor: '#E0F2FE',
    otherBubbleColor: '#FAE8FF',
    chatBgStyle: 'soft-sky',
  },
  {
    id: 'twilight-sorbet',
    nameAr: 'سوربيه الشفق',
    nameEn: 'Twilight Sorbet',
    primaryColor: '#D97706',
    yellowAccent: '#FDE047',
    pinkAccent: '#F9A8D4',
    blueAccent: '#93C5FD',
    myBubbleColor: '#FEF9C3',
    otherBubbleColor: '#DBEAFE',
    chatBgStyle: 'soft-butter',
  },
];

export const DEFAULT_SITE_SETTINGS: Omit<SiteSettings, 'updatedAt'> = {
  siteNameAr: 'ماكرون',
  siteNameEn: 'Macaron',
  themeMode: 'light',
  defaultLanguage: 'ar',
  presetId: 'custom',
  primaryColor: '#6E56CF',
  yellowAccent: '#FDE68A',
  pinkAccent: '#F9C6D9',
  blueAccent: '#C7D7FE',
  myBubbleColor: '#6E56CF',
  otherBubbleColor: '#FFFFFF',
  chatBgStyle: 'soft-cream',
  bubbleStyle: 'classic',
  updatedBy: 'system',
};

export const DEFAULT_ROOMS: Array<{
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  accentTone: AccentTone;
}> = [
  {
    id: 'general',
    nameAr: 'الأسئلة العامة',
    nameEn: 'General Q&A',
    descriptionAr: 'اسأل أي سؤال، وساعد غيرك بالإجابة',
    descriptionEn: 'Ask anything and help others with answers',
    accentTone: 'blue',
  },
  {
    id: 'stories',
    nameAr: 'البرمجة والتطوير',
    nameEn: 'Programming & Dev',
    descriptionAr: 'أسئلة الكود والأخطاء والمشاريع البرمجية',
    descriptionEn: 'Code questions, bugs, and programming projects',
    accentTone: 'pink',
  },
  {
    id: 'pastel-art',
    nameAr: 'الدراسة والجامعة',
    nameEn: 'Study & University',
    descriptionAr: 'تلخيصات ومصادر ونصائح للمذاكرة والامتحانات',
    descriptionEn: 'Notes, resources, and tips for studying and exams',
    accentTone: 'yellow',
  },
  {
    id: 'projects',
    nameAr: 'المشاريع والتعاون',
    nameEn: 'Projects & Teams',
    descriptionAr: 'اعرض مشروعك أو دوّر على فريق تشتغل معه',
    descriptionEn: 'Share your project or find teammates',
    accentTone: 'blue',
  },
  {
    id: 'career',
    nameAr: 'التدريب والوظائف',
    nameEn: 'Internships & Careers',
    descriptionAr: 'فرص تدريب، سير ذاتية، ونصائح للمقابلات',
    descriptionEn: 'Internships, CVs, and interview tips',
    accentTone: 'yellow',
  },
];

/** Original AI Studio room names — rooms still using them get renamed automatically by an admin session */
export const LEGACY_ROOM_NAMES_AR: Record<string, string> = {
  general: 'الصالة العامة',
  stories: 'ركن الستوري والقهوة',
  'pastel-art': 'نادي الألوان والباستيل',
};

export const ROOM_ICONS: Record<string, string> = {
  general: '❓',
  stories: '💻',
  'pastel-art': '📚',
  projects: '🤝',
  career: '💼',
};

