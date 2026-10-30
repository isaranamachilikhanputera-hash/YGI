# Security Specification — Wana Lestari Nusantara CMS & Portal

## 1. Data Invariants
1. **Default-Deny Catch-All**: Every path not explicitly matched is denied (`allow read, write: if false;`).
2. **Verified Identity**: Every write operation requires an authenticated, email-verified user (`request.auth != null && request.auth.token.email_verified == true`).
3. **RBAC Privilege Hierarchy**:
   - Bootstrapped Superadmin (`isaranamachilikhanputera@gmail.com`) or users present in `/admins/{uid}` have administrative privileges (`isAdmin()`).
   - Regular users registering their own `/users/{userId}` profile can ONLY self-assign `level == 2` and `roleName == 'contributor'`. Only `isAdmin()` can assign `level == 0` or `level == 1`.
4. **PII Isolation**: User email and phone number are stored strictly in `/users/{userId}/private/{docId}`, readable and writable ONLY by `isOwner(userId) || isAdmin()`.
5. **Content Approval Gate**: Level 2 contributors creating `/contents/{contentId}` can ONLY create documents with `status == 'pending_approval'` and `authorId == request.auth.uid`. Publishing (`status == 'published'`) requires `isAdmin()`.
6. **Comment Relational Integrity**: A comment in `/contents/{contentId}/comments/{commentId}` cannot exist unless `/contents/{contentId}` exists (`exists()`), and `authorId == request.auth.uid`.
7. **Sequential Letter Counter Guard**: `/letter_counters/{counterId}` only allows sequential positive integer increments (`incoming().lastSequence == existing().lastSequence + 1` on update) with `updatedAt == request.time`.
8. **Task Report Relational Gate**: A report in `/task_reports/{reportId}` must reference an existing `/letters/{letterId}` (`exists()`) and `submittedBy == request.auth.uid`.
9. **Immutable Audit Logs**: `/activity_logs/{logId}` allows `create` with `actorId == request.auth.uid` and `createdAt == request.time`, and strictly forbids `update` and `delete` (`allow update, delete: if false;`).
10. **Strict Timestamp & Size Enforcement**: Every string is bounded by `.size()`, every document ID is validated by `isValidId()`, and every `createdAt`/`updatedAt` matches `request.time`.

## 2. The "Dirty Dozen" Payloads (Adversarial Test Vectors)
1. **Shadow Field Injection**: Creating `/contents/art_1` with an extra undeclared field `{"isFeaturedHack": true}` -> Rejected by `hasOnly()`.
2. **Self-Assigned Admin Escalation**: A newly signed-in user creates `/users/uid_attacker` with `{"level": 0, "roleName": "superadmin"}` -> Rejected because non-admins can only create `level == 2` and `roleName == 'contributor'`.
3. **Unverified Email Spoofing**: Calling any write with `request.auth.token.email == 'isaranamachilikhanputera@gmail.com'` but `email_verified == false` -> Rejected by `isVerifiedUser()`.
4. **Cross-User PII Read**: User `uid_b` attempts `get` on `/users/uid_a/private/info` -> Rejected by `isOwner(userId) || isAdmin()`.
5. **Contributor Direct Publish Bypass**: Level 2 user creates `/contents/art_2` with `status: "published"` -> Rejected because non-admin creation mandates `status == "pending_approval"`.
6. **Identity Spoofing on Content**: User `uid_a` creates `/contents/art_3` with `authorId: "uid_b"` -> Rejected by `data.authorId == request.auth.uid`.
7. **Orphaned Comment Creation**: User creates `/contents/non_existent_id/comments/c_1` -> Rejected by `exists(/databases/$(database)/documents/contents/$(contentId))`.
8. **ID Poisoning Attack**: Creating a document with a 300-character or special-character ID -> Rejected by `isValidId()`.
9. **Value Poisoning on Update**: Updating `status` on `/letters/let_1` to an arbitrary string `"hacked_state"` -> Rejected by `isValidOrganizationLetter(incoming())`.
10. **Terminal State Mutation**: Non-admin attempting to modify a letter after `status == 'approved'` or `status == 'rejected'` -> Rejected by terminal state lock.
11. **Audit Log Tampering**: Any user or admin attempting `update` or `delete` on `/activity_logs/log_1` -> Rejected by `allow update, delete: if false;`.
12. **Client Timestamp Forgery**: Creating any document with a past or future `createdAt` timestamp not equal to `request.time` -> Rejected by `incoming().createdAt == request.time`.
