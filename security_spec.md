# Security Specification & TDD Plan

## 1. Data Invariants
1. **PII Isolation**: User email addresses are strictly isolated inside `/users_private/{userId}` and can only be read by the document owner (`request.auth.uid == userId`) or a verified administrator (`isAdmin()`). Public profile fields (`name`, `nickname`, `photoUrl`, `status`) live separately in `/users_public/{userId}`.
2. **Verified Identity & Anti-Spoofing**: Every write requires `request.auth != null && request.auth.token.email_verified == true`. A user can only create/update their own `/users_public/{uid}` and `/users_private/{uid}` documents, and `incoming().uid == request.auth.uid` must hold.
3. **Admin Privilege Isolation**: Non-admin users can never write to `/admins/{userId}`, `/settings/theme`, or modify custom rooms. Admin status is checked exclusively via `/admins/{uid}` existence or the bootstrapped verified admin email (`nawalalrfoo@gmail.com` with `email_verified == true`).
4. **Master Gate & Message Integrity**: A `ChatMessage` in `/rooms/{roomId}/messages/{messageId}` cannot exist without an existing parent room `/rooms/{roomId}`, must match `incoming().roomId == roomId`, and `incoming().senderUid == request.auth.uid`.
5. **Temporal Integrity & Immortality**: All `createdAt` and `updatedAt` timestamps must equal `request.time`. On updates, `createdAt`, `uid`, `senderUid`, `roomId`, and `id` are immutable.
6. **Strict Schema & Boundary Enforcement**: Every write enforces `keys().hasAll(...) && keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update, and explicit `.size()` bounds on all strings.

## 2. The "Dirty Dozen" Attack Payloads
1. **Shadow Field Injection on Public Profile**: `{ uid: "u1", name: "Sara", nickname: "Sunny", photoUrl: "https://...", status: "online", isAdmin: true, createdAt: serverTime, updatedAt: serverTime }` -> Rejected by `hasOnly(...)`.
2. **Unverified Email Spoofing Admin**: `auth.token = { email: "nawalalrfoo@gmail.com", email_verified: false }` attempting to write `/settings/theme` -> Rejected by `email_verified == true`.
3. **Cross-User Profile Overwrite**: Authenticated `userA` writing to `/users_public/userB` -> Rejected by `userId == request.auth.uid`.
4. **PII Scraping**: Authenticated `userA` calling `get` or `list` on `/users_private` -> Rejected by `isOwner(userId) || isAdmin()` and `allow list: if isAdmin()`.
5. **Self-Privilege Escalation**: Authenticated non-admin `userA` creating `/admins/userA` -> Rejected by `isAdmin()`.
6. **Orphan Message Write**: Creating a message in `/rooms/nonexistent_room/messages/m1` -> Rejected by `exists(/databases/$(database)/documents/rooms/$(roomId))`.
7. **Sender Impersonation**: `userA` creating a message with `senderUid: "userB"` -> Rejected by `incoming().senderUid == request.auth.uid`.
8. **Room ID Mismatch**: Writing message to `/rooms/general/messages/m1` with `roomId: "other"` -> Rejected by `incoming().roomId == roomId`.
9. **Denial-of-Wallet Path Poisoning**: Creating doc with 1,500-char ID or invalid characters -> Rejected by `isValidId(id)`.
10. **Value Poisoning on Theme Update**: Admin or attacker setting `primaryColor: "not-a-hex-color-1234567890"` or `text` > 1000 chars -> Rejected by `isValidSiteSettings` / `isValidChatMessage`.
11. **Backdated Timestamp Tampering**: Creating a message with client-provided `createdAt` != `request.time` -> Rejected by `incoming().createdAt == request.time`.
12. **Immutable Field Mutation**: Updating a message's `senderUid` or `createdAt` -> Rejected by `affectedKeys().hasOnly(['text', 'updatedAt'])` and `incoming().createdAt == existing().createdAt`.

## 3. Additions in v1.1 (reactions, typing, unread)
7. **Own-Reaction Only**: Message `reactions` is a map `uid -> emoji`. Any member (room) or participant (DM) may update a message, but only the `reactions` key, only their own `uid` entry, and only with an emoji from the allowed list (`isValidReactionChange`).
8. **Typing Channel Isolation**: `/rooms/{roomId}/typing/{uid}` and `/direct_chats/{chatId}/typing/{uid}` are written only by `uid` itself, with `updatedAt == request.time`. Private-chat typing docs are readable by the two participants only.
9. **Private Read State**: `/read_states/{uid}` (`lastRead` map per conversation) is readable and writable by its owner only; `list` is always denied.
10. **Room Activity Bump**: Non-admin members may update a room document only to set `lastMessageAt == request.time`; every other room field stays admin-only.

13–18. See `firestore.rules.test.ts` for the matching attack vectors.
