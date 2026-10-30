import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import rawFirebaseConfig from '../firebase-applet-config.json';
import { resolveFirebaseClientConfig } from './utils/cmsLogic';

const envMeta =
  typeof import.meta !== 'undefined' && (import.meta as any).env
    ? ((import.meta as any).env as Record<string, string | undefined>)
    : {};

export const firebaseConfig = resolveFirebaseClientConfig(
  rawFirebaseConfig,
  envMeta
);

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const GOOGLE_DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive'];

export const googleProvider = new GoogleAuthProvider();
GOOGLE_DRIVE_SCOPES.forEach((scope) => googleProvider.addScope(scope));
googleProvider.setCustomParameters({
  prompt: 'select_account',
  include_granted_scopes: 'true',
});

// In-memory OAuth access token cache (never stored in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;

export function getGoogleDriveAccessToken(): string | null {
  return cachedAccessToken;
}

export function setGoogleDriveAccessToken(token: string | null): void {
  cachedAccessToken = token;
}

export async function connectGoogleDriveOAuth(
  forceConsent = false
): Promise<{
  accessToken: string;
  email: string | null;
}> {
  const driveProvider = new GoogleAuthProvider();
  GOOGLE_DRIVE_SCOPES.forEach((scope) => driveProvider.addScope(scope));
  driveProvider.setCustomParameters({
    prompt: forceConsent ? 'consent select_account' : 'select_account',
    include_granted_scopes: 'true',
  });
  const result = await signInWithPopup(auth, driveProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken ?? null;
  if (!token) {
    throw new Error(
      'Tidak dapat memperoleh token akses Google Drive. Pastikan izin Google Drive disetujui pada jendela login Google.'
    );
  }
  cachedAccessToken = token;
  return {
    accessToken: token,
    email: result.user?.email ?? null,
  };
}

export const ALLOWED_DEPLOYMENT_DOMAINS = [
  'ygi-omega.vercel.app',
  'https://ygi-omega.vercel.app',
  'https://ygi-omega.vercel.app/',
  'level-router-mcf5x.firebaseapp.com',
  'localhost',
];

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();
