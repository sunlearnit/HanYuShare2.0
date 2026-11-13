# Security Specification — HanYu Share Firestore

## 1. Data Invariants
1. Every document under `/users/{userId}` and its subcollections (`chatMessages`, `savedVocab`) belongs exclusively to the verified user whose `request.auth.uid == userId`.
2. Every user-owned document must pass strict key allowlisting (`hasAll` + `hasOnly`), type checks, and `.size()` bounds matching `firebase-blueprint.json`.
3. `ownerUid` / `uid` and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.
4. No blanket `allow read` or `allow list` without explicit ownership predicates on `resource.data`.
5. No PII (`email`, `phone`) is stored in Firestore documents (account identity remains in Firebase Auth and PostgreSQL).

## 2. "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. Unauthenticated read/write to `/users/uid-1`.
2. Signed-in user with `email_verified == false` attempting write to `/users/{uid}`.
3. User A reading `/users/userB/savedVocab/v1`.
4. User A listing `/users/userB/chatMessages`.
5. Creating `/users/userA` with `uid: "userB"` (identity spoofing).
6. Creating `/users/userA` with an unexpected shadow field `isAdmin: true`.
7. Creating `/users/userA` with `preferredHskLevel: 99` (out-of-bounds integer).
8. Creating `/users/userA/chatMessages/bad..id` (ID poisoning failing regex `^[a-zA-Z0-9_\-]+$`).
9. Creating a `chatMessages` doc with `textVi` exceeding 4000 characters (DoW resource poisoning).
10. Creating a `chatMessages` doc with `chineseSegments` containing >10 elements.
11. Creating a `savedVocab` doc with client-forged `createdAt` != `request.time`.
12. Updating `/users/userA` attempting to mutate `uid` or add unknown fields.
