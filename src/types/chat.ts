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
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

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
  presetId: 'cotton-candy',
  primaryColor: '#EC4899',
  yellowAccent: '#FEF08A',
  pinkAccent: '#FBCFE8',
  blueAccent: '#BAE6FD',
  myBubbleColor: '#FCE7F3',
  otherBubbleColor: '#E0F2FE',
  chatBgStyle: 'pastel-blend',
  bubbleStyle: 'cute',
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
    nameAr: 'الصالة العامة',
    nameEn: 'General Lounge',
    descriptionAr: 'مساحة دافئة للتعارف والأحاديث اليومية اللطيفة',
    descriptionEn: 'Warm lounge for friendly introductions and daily conversations',
    accentTone: 'pink',
  },
  {
    id: 'stories',
    nameAr: 'ركن الستوري والقهوة',
    nameEn: 'Stories & Coffee',
    descriptionAr: 'شاركوا قصصكم وأفكاركم الصباحية مع كوب قهوة',
    descriptionEn: 'Share your favorite stories, highlights, and morning thoughts',
    accentTone: 'yellow',
  },
  {
    id: 'pastel-art',
    nameAr: 'نادي الألوان والباستيل',
    nameEn: 'Pastel Creative Club',
    descriptionAr: 'للمحادثات الإبداعية والتصاميم والذوق الهادئ',
    descriptionEn: 'Creative ideas, cozy aesthetics, and bright inspiration',
    accentTone: 'blue',
  },
];
