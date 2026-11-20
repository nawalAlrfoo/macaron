/**
 * Firestore Security Rules TDD Specification (Dirty Dozen Adversarial Vectors)
 * Documents the 12 mandatory security invariants verified by firestore.rules.
 */

export interface AdversarialVector {
  id: number;
  name: string;
  targetPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedResult: 'PERMISSION_DENIED';
  guardRule: string;
}

export const DIRTY_DOZEN_VECTORS: AdversarialVector[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Public Profile',
    targetPath: 'users_public/userA',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'isValidUserPublicProfile hasOnly check rejects extra keys like isAdmin',
  },
  {
    id: 2,
    name: 'Unverified Email Spoofing Admin',
    targetPath: 'settings/theme',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'isVerified() requires request.auth.token.email_verified == true',
  },
  {
    id: 3,
    name: 'Cross-User Profile Overwrite',
    targetPath: 'users_public/userB',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'isOwner(userId) enforces request.auth.uid == userId',
  },
  {
    id: 4,
    name: 'PII Email Scraping',
    targetPath: 'users_private/userB',
    operation: 'get',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'isOwner(userId) || isAdmin() isolates private PII',
  },
  {
    id: 5,
    name: 'Self-Privilege Escalation into Admins',
    targetPath: 'admins/userA',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'allow create requires existing isAdmin()',
  },
  {
    id: 6,
    name: 'Orphan Message Write',
    targetPath: 'rooms/nonexistent_room/messages/m1',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'Master Gate exists(/databases/$(database)/documents/rooms/$(roomId))',
  },
  {
    id: 7,
    name: 'Sender Impersonation',
    targetPath: 'rooms/general/messages/m2',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'incoming().senderUid == request.auth.uid',
  },
  {
    id: 8,
    name: 'Room ID Mismatch Injection',
    targetPath: 'rooms/general/messages/m3',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'incoming().roomId == roomId',
  },
  {
    id: 9,
    name: 'Denial-of-Wallet Path Poisoning',
    targetPath: 'rooms/general/messages/' + 'a'.repeat(500),
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'isValidId(messageId) enforces size <= 128 and regex',
  },
  {
    id: 10,
    name: 'Value Poisoning on Theme Hex Color',
    targetPath: 'settings/theme',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'isValidHexColor enforces ^#[0-9a-fA-F]{6}$',
  },
  {
    id: 11,
    name: 'Backdated Timestamp Tampering',
    targetPath: 'rooms/general/messages/m4',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'incoming().createdAt == request.time',
  },
  {
    id: 12,
    name: 'Immutable Field Mutation on Message Update',
    targetPath: 'rooms/general/messages/m5',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'affectedKeys().hasOnly(["text", "updatedAt"]) and immutable checks',
  },
  {
    id: 13,
    name: 'Reaction Forgery (changing another user\'s reaction)',
    targetPath: 'rooms/general/messages/m6',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'isValidReactionChange: reactions diff affectedKeys().hasOnly([request.auth.uid])',
  },
  {
    id: 14,
    name: 'Reaction Payload Poisoning (arbitrary text instead of emoji)',
    targetPath: 'rooms/general/messages/m7',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'isValidReactionChange: value must be in the allowed emoji list',
  },
  {
    id: 15,
    name: 'Typing Indicator Impersonation',
    targetPath: 'rooms/general/typing/userB',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'isOwner(userId) && isValidTyping (uid == request.auth.uid)',
  },
  {
    id: 16,
    name: 'Eavesdropping on a Private Chat Typing Channel',
    targetPath: 'direct_chats/userA_dm_userB/typing/userA',
    operation: 'list',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'request.auth.uid in parent direct_chat participantUids',
  },
  {
    id: 17,
    name: 'Reading Another User\'s Read State',
    targetPath: 'read_states/userB',
    operation: 'get',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'isOwner(userId)',
  },
  {
    id: 18,
    name: 'Room Metadata Hijack via lastMessageAt branch',
    targetPath: 'rooms/general',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    guardRule: 'non-admin update affectedKeys().hasOnly(["lastMessageAt"]) && lastMessageAt == request.time',
  },
];
