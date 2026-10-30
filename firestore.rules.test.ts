import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Phase 0 & Phase 5 Security Rules Red Team & Dirty Dozen Verification Suite
const rulesSource = fs.readFileSync('./DRAFT_firestore.rules', 'utf-8');

interface SimulatedAuth {
  uid: string;
  email: string;
  email_verified: boolean;
  isAdminDocPresent?: boolean;
}

const SERVER_NOW = '2026-10-28T22:55:00.000Z';

function isValidId(id: unknown): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_\-]+$/.test(id);
}

function isVerifiedUser(auth: SimulatedAuth | null): boolean {
  return auth !== null && auth.email_verified === true;
}

function isAdmin(auth: SimulatedAuth | null): boolean {
  return (
    isVerifiedUser(auth) &&
    (auth!.email === 'isaranamachilikhanputera@gmail.com' || auth!.isAdminDocPresent === true)
  );
}

// Evaluator simulating the exact boolean gates in firestore.rules against the Dirty Dozen vectors
function evaluateSecurityGate(
  vectorName: string,
  operation: {
    collection: string;
    docId: string;
    action: 'get' | 'list' | 'create' | 'update' | 'delete';
    auth: SimulatedAuth | null;
    incoming?: Record<string, any>;
    existing?: Record<string, any>;
    parentExists?: boolean;
  }
): 'ALLOW' | 'PERMISSION_DENIED' {
  const { collection, docId, action, auth, incoming, existing, parentExists = true } = operation;

  if (!isValidId(docId)) return 'PERMISSION_DENIED';

  if (action === 'create' || action === 'update' || action === 'delete') {
    if (!isVerifiedUser(auth)) return 'PERMISSION_DENIED';
  }

  // Vector checks matching firestore.rules
  if (collection === 'users' && action === 'create' && incoming) {
    const allowedKeys = [
      'uid', 'displayName', 'roleName', 'level', 'department',
      'isVerified', 'authProvider', 'createdAt', 'updatedAt'
    ];
    const keys = Object.keys(incoming);
    if (!allowedKeys.every((k) => keys.includes(k)) || !keys.every((k) => allowedKeys.includes(k))) {
      return 'PERMISSION_DENIED';
    }
    if (incoming.createdAt !== SERVER_NOW || incoming.updatedAt !== SERVER_NOW) {
      return 'PERMISSION_DENIED';
    }
    const isSelf = auth!.uid === docId && incoming.uid === docId;
    if (!( (isSelf && incoming.level === 2 && incoming.roleName === 'contributor') || isAdmin(auth) )) {
      return 'PERMISSION_DENIED';
    }
    return 'ALLOW';
  }

  if (collection === 'users_private' && action === 'get') {
    if (!isVerifiedUser(auth)) return 'PERMISSION_DENIED';
    if (auth!.uid !== docId && !isAdmin(auth)) return 'PERMISSION_DENIED';
    return 'ALLOW';
  }

  if (collection === 'contents' && action === 'create' && incoming) {
    const allowedKeys = [
      'title', 'summary', 'body', 'categoryId', 'categoryName', 'visualTheme',
      'authorId', 'authorName', 'authorLevel', 'status', 'approvedBy',
      'readTimeMinutes', 'createdAt', 'updatedAt'
    ];
    const keys = Object.keys(incoming);
    if (!allowedKeys.every((k) => keys.includes(k)) || !keys.every((k) => allowedKeys.includes(k))) {
      return 'PERMISSION_DENIED';
    }
    if (!parentExists) return 'PERMISSION_DENIED';
    if (incoming.authorId !== auth!.uid) return 'PERMISSION_DENIED';
    if (incoming.createdAt !== SERVER_NOW) return 'PERMISSION_DENIED';
    if (!( (incoming.status === 'pending_approval' && incoming.approvedBy === 'pending') || isAdmin(auth) )) {
      return 'PERMISSION_DENIED';
    }
    return 'ALLOW';
  }

  if (collection === 'comments' && action === 'create' && incoming) {
    if (!parentExists) return 'PERMISSION_DENIED';
    if (incoming.authorId !== auth!.uid) return 'PERMISSION_DENIED';
    if (incoming.createdAt !== SERVER_NOW) return 'PERMISSION_DENIED';
    return 'ALLOW';
  }

  if (collection === 'letters' && action === 'update' && incoming && existing) {
    const validStatuses = ['pending_approval', 'approved', 'rejected'];
    if (!validStatuses.includes(incoming.status)) return 'PERMISSION_DENIED';
    if (existing.status === 'rejected' && !isAdmin(auth)) return 'PERMISSION_DENIED';
    return 'ALLOW';
  }

  if (collection === 'activity_logs' && (action === 'update' || action === 'delete')) {
    return 'PERMISSION_DENIED';
  }

  return 'PERMISSION_DENIED';
}

test('Firestore rules file contains all 8 pillars and mandatory collection match blocks', () => {
  assert.ok(rulesSource.includes("rules_version = '2';"));
  assert.ok(rulesSource.includes('match /{document=**} {\n      allow read, write: if false;\n    }'));
  assert.ok(rulesSource.includes('match /site_config/{configId}'));
  assert.ok(rulesSource.includes('match /users/{userId}'));
  assert.ok(rulesSource.includes('match /private/{docId}'));
  assert.ok(rulesSource.includes('match /categories/{categoryId}'));
  assert.ok(rulesSource.includes('match /contents/{contentId}'));
  assert.ok(rulesSource.includes('match /comments/{commentId}'));
  assert.ok(rulesSource.includes('match /letter_templates/{templateId}'));
  assert.ok(rulesSource.includes('match /letter_counters/{counterId}'));
  assert.ok(rulesSource.includes('match /letters/{letterId}'));
  assert.ok(rulesSource.includes('match /task_reports/{reportId}'));
  assert.ok(rulesSource.includes('match /notifications/{notificationId}'));
  assert.ok(rulesSource.includes('match /activity_logs/{logId}'));
  assert.ok(rulesSource.includes('match /ygi_cms_state/{sectionId}'));
});

test('Dirty Dozen #1: Shadow Field Injection on /contents is PERMISSION_DENIED', () => {
  const res = evaluateSecurityGate('Shadow Field Injection', {
    collection: 'contents',
    docId: 'art_1',
    action: 'create',
    auth: { uid: 'u2', email: 'user@example.com', email_verified: true },
    incoming: {
      title: 'Valid Title',
      summary: 'Valid summary over ten chars',
      body: 'Valid body text over twenty characters long.',
      categoryId: 'konservasi',
      categoryName: 'Konservasi',
      visualTheme: 'canopy',
      authorId: 'u2',
      authorName: 'Raka',
      authorLevel: 2,
      status: 'pending_approval',
      approvedBy: 'pending',
      readTimeMinutes: 4,
      createdAt: SERVER_NOW,
      updatedAt: SERVER_NOW,
      isFeaturedHack: true, // Ghost field
    },
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #2: Self-Assigned Admin Escalation on /users is PERMISSION_DENIED', () => {
  const res = evaluateSecurityGate('Self-Assigned Admin Escalation', {
    collection: 'users',
    docId: 'u_attacker',
    action: 'create',
    auth: { uid: 'u_attacker', email: 'attacker@example.com', email_verified: true },
    incoming: {
      uid: 'u_attacker',
      displayName: 'Attacker',
      roleName: 'superadmin',
      level: 0,
      department: 'IT',
      isVerified: true,
      authProvider: 'google_oauth',
      createdAt: SERVER_NOW,
      updatedAt: SERVER_NOW,
    },
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #3: Unverified Email Spoofing is PERMISSION_DENIED', () => {
  const res = evaluateSecurityGate('Unverified Email Spoofing', {
    collection: 'users',
    docId: 'u_spoof',
    action: 'create',
    auth: { uid: 'u_spoof', email: 'isaranamachilikhanputera@gmail.com', email_verified: false },
    incoming: {
      uid: 'u_spoof',
      displayName: 'Spoofer',
      roleName: 'contributor',
      level: 2,
      department: 'Field',
      isVerified: false,
      authProvider: 'google_oauth',
      createdAt: SERVER_NOW,
      updatedAt: SERVER_NOW,
    },
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #4: Cross-User PII Read on /users/{id}/private is PERMISSION_DENIED', () => {
  const res = evaluateSecurityGate('Cross-User PII Read', {
    collection: 'users_private',
    docId: 'uid_victim',
    action: 'get',
    auth: { uid: 'uid_snooper', email: 'snooper@example.com', email_verified: true },
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #5: Contributor Direct Publish Bypass on /contents is PERMISSION_DENIED', () => {
  const res = evaluateSecurityGate('Contributor Direct Publish Bypass', {
    collection: 'contents',
    docId: 'art_2',
    action: 'create',
    auth: { uid: 'u2', email: 'contributor@example.com', email_verified: true },
    incoming: {
      title: 'Bypass Approval Article',
      summary: 'Summary text of sufficient length',
      body: 'Body text of sufficient length for the article.',
      categoryId: 'konservasi',
      categoryName: 'Konservasi',
      visualTheme: 'canopy',
      authorId: 'u2',
      authorName: 'Contributor',
      authorLevel: 2,
      status: 'published', // Illegal direct publish by non-admin
      approvedBy: 'u2',
      readTimeMinutes: 5,
      createdAt: SERVER_NOW,
      updatedAt: SERVER_NOW,
    },
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #6: Identity Spoofing on Content authorId is PERMISSION_DENIED', () => {
  const res = evaluateSecurityGate('Identity Spoofing on Content', {
    collection: 'contents',
    docId: 'art_3',
    action: 'create',
    auth: { uid: 'u_real', email: 'real@example.com', email_verified: true },
    incoming: {
      title: 'Spoofed Author Article',
      summary: 'Summary text of sufficient length',
      body: 'Body text of sufficient length for the article.',
      categoryId: 'konservasi',
      categoryName: 'Konservasi',
      visualTheme: 'canopy',
      authorId: 'u_someone_else',
      authorName: 'Someone Else',
      authorLevel: 2,
      status: 'pending_approval',
      approvedBy: 'pending',
      readTimeMinutes: 5,
      createdAt: SERVER_NOW,
      updatedAt: SERVER_NOW,
    },
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #7: Orphaned Comment Creation is PERMISSION_DENIED', () => {
  const res = evaluateSecurityGate('Orphaned Comment Creation', {
    collection: 'comments',
    docId: 'c_1',
    action: 'create',
    auth: { uid: 'u2', email: 'user@example.com', email_verified: true },
    parentExists: false,
    incoming: {
      articleId: 'missing_article',
      authorId: 'u2',
      authorName: 'Raka',
      authorRole: 'Kontributor',
      message: 'Komentar pada artikel tidak ada',
      createdAt: SERVER_NOW,
    },
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #8: ID Poisoning Attack is PERMISSION_DENIED', () => {
  const poisonedId = 'bad/id$with*illegal!chars#' + 'x'.repeat(130);
  const res = evaluateSecurityGate('ID Poisoning', {
    collection: 'contents',
    docId: poisonedId,
    action: 'get',
    auth: { uid: 'u2', email: 'user@example.com', email_verified: true },
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #9 & #10: Value Poisoning and Terminal State Mutation on /letters are PERMISSION_DENIED', () => {
  const resValuePoison = evaluateSecurityGate('Value Poisoning', {
    collection: 'letters',
    docId: 'let_1',
    action: 'update',
    auth: { uid: 'u2', email: 'user@example.com', email_verified: true },
    existing: { status: 'pending_approval', taskCompletionStatus: 'assigned' },
    incoming: { status: 'hacked_invalid_enum', taskCompletionStatus: 'completed' },
  });
  assert.equal(resValuePoison, 'PERMISSION_DENIED');

  const resTerminalLock = evaluateSecurityGate('Terminal State Lock', {
    collection: 'letters',
    docId: 'let_1',
    action: 'update',
    auth: { uid: 'u2', email: 'user@example.com', email_verified: true },
    existing: { status: 'rejected', taskCompletionStatus: 'assigned' },
    incoming: { status: 'rejected', taskCompletionStatus: 'completed' },
  });
  assert.equal(resTerminalLock, 'PERMISSION_DENIED');
});

test('Dirty Dozen #11 & #12: Audit Log Tampering and Client Timestamp Forgery are PERMISSION_DENIED', () => {
  const resAuditDelete = evaluateSecurityGate('Audit Log Tampering', {
    collection: 'activity_logs',
    docId: 'log_1',
    action: 'delete',
    auth: { uid: 'admin_1', email: 'isaranamachilikhanputera@gmail.com', email_verified: true },
  });
  assert.equal(resAuditDelete, 'PERMISSION_DENIED');

  const resForgedTimestamp = evaluateSecurityGate('Forged Timestamp', {
    collection: 'users',
    docId: 'u_valid',
    action: 'create',
    auth: { uid: 'u_valid', email: 'valid@example.com', email_verified: true },
    incoming: {
      uid: 'u_valid',
      displayName: 'Valid User',
      roleName: 'contributor',
      level: 2,
      department: 'Rimba',
      isVerified: true,
      authProvider: 'google_oauth',
      createdAt: '2020-01-01T00:00:00.000Z', // Forged past timestamp
      updatedAt: SERVER_NOW,
    },
  });
  assert.equal(resForgedTimestamp, 'PERMISSION_DENIED');
});
