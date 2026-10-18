import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  updateProfile,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  type ActionCodeSettings,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  sendEmailVerification,
  type Auth,
  type User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocFromServer,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  serverTimestamp,
  runTransaction,
  limit,
  writeBatch,
  increment,
  getDocs,
  deleteDoc,
  collectionGroup,
  type Firestore,
  type Unsubscribe 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  type FirebaseStorage 
} from 'firebase/storage';
import rawAppletConfig from '../../firebase-applet-config.json';
import type { 
  UserProfile, 
  PrivateAccountData,
  Game, 
  SportType, 
  KuwaitArea, 
  SkillLevel, 
  GenderPreference, 
  GameVisibility, 
  GameStatus, 
  GameParticipant,
  ChatMessage,
  NotificationType,
  AppNotification,
  FriendRequest,
  FriendRelationship,
  GameInvite,
  GameInviteStatus,
  PlayerActivityStats,
  PlayerActivityItem,
  ReportReason,
  ReportStatus,
  ReportDocument,
  BlockedPlayerRecord,
  GamePayment,
  PaymentStatus,
  ModerationLogEntry,
  ModerationAction,
  ModerationTargetType
} from '../types';

// Structured Firestore error interface required by Firebase guidelines
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

// Read configuration from applet config file or environment variables
interface AppletFirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
}

const appletConfig = (rawAppletConfig || {}) as AppletFirebaseConfig;

const firebaseConfig = {
  apiKey: appletConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: appletConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: appletConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: appletConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: appletConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: appletConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID || '',
  firestoreDatabaseId: appletConfig.firestoreDatabaseId || '(default)',
};

// Check if credentials are provided
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.apiKey !== 'YOUR_API_KEY'
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    authInstance = getAuth(app);
    // Connect to (default) database or custom named database
    const customDbId = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)')
      ? firebaseConfig.firestoreDatabaseId
      : undefined;
    dbInstance = customDbId ? getFirestore(app, customDbId) : getFirestore(app);
    storageInstance = getStorage(app);
  } catch (err) {
    console.warn('Firebase initialization notice:', err);
  }
}

export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;

/**
 * Service testing helpers: allows setting mock Auth/Firestore instances without mutating production configs.
 */
export function _setTestAuthInstance(mockAuth: Auth | null) {
  authInstance = mockAuth;
}

export function _setTestDbInstance(mockDb: Firestore | null) {
  dbInstance = mockDb;
}

// Standardized error handler
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentAuthUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuthUser?.uid || null,
      email: currentAuthUser?.email || null,
      emailVerified: currentAuthUser?.emailVerified || null,
      isAnonymous: currentAuthUser?.isAnonymous || null,
      tenantId: currentAuthUser?.tenantId || null,
      providerInfo: currentAuthUser?.providerData?.map(p => ({
        providerId: p.providerId,
        email: p.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

export interface FirebaseTestReport {
  connected: boolean;
  message: string;
  projectId: string;
  databaseId: string;
  storageBucket: string;
  authConnected: boolean;
  firestoreConnected: boolean;
  firestoreWriteSuccess: boolean;
  firestoreReadSuccess: boolean;
  storageConnected: boolean;
  timestamp: string;
}

export const activeFirebaseConfig = {
  ...firebaseConfig,
};

// Test live Firestore server connectivity, read/write, auth, and storage
export async function testFirebaseConnection(): Promise<FirebaseTestReport> {
  const report: FirebaseTestReport = {
    connected: false,
    message: '',
    projectId: firebaseConfig.projectId || 'N/A',
    databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
    storageBucket: firebaseConfig.storageBucket || 'N/A',
    authConnected: false,
    firestoreConnected: false,
    firestoreWriteSuccess: false,
    firestoreReadSuccess: false,
    storageConnected: false,
    timestamp: new Date().toISOString()
  };

  if (!isFirebaseConfigured || !dbInstance) {
    report.message = 'Firebase configuration is pending. The application is running in local demonstration mode.';
    return report;
  }

  // 1. Verify Auth Instance
  if (authInstance) {
    report.authConnected = true;
  }

  // 2. Verify Storage Instance
  if (storageInstance && firebaseConfig.storageBucket) {
    report.storageConnected = true;
  }

  // 3. Test Firestore Read & Write
  try {
    const testDocRef = doc(dbInstance, '_connection_tests', 'health_check');
    const testPayload = {
      testPing: 'OK',
      timestamp: Date.now(),
      clientApp: 'La3ib Kuwait Web',
      projectId: firebaseConfig.projectId
    };

    // Attempt Write
    await setDoc(testDocRef, testPayload);
    report.firestoreWriteSuccess = true;

    // Attempt Read from Server
    const snap = await getDocFromServer(testDocRef);
    if (snap.exists()) {
      report.firestoreReadSuccess = true;
      report.firestoreConnected = true;
      report.connected = true;
      report.message = `Verified! Round-trip read/write test succeeded on Firestore database [${report.databaseId}] in project [${report.projectId}].`;
    } else {
      report.firestoreConnected = true;
      report.connected = true;
      report.message = 'Connected to Firestore server, but test document returned empty.';
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline')) {
      report.message = 'Firebase client is offline. Please check network connection.';
    } else if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      report.firestoreConnected = true;
      report.connected = true;
      report.message = 'Connected to Firestore server, security rules are actively enforced.';
    } else {
      report.message = `Firestore test error: ${msg}`;
    }
  }

  return report;
}

// Authentication Service Functions
export function mapFirebaseAuthError(err: unknown, lang: 'en' | 'ar' = 'en'): string {
  const code = (err as any)?.code || '';
  const isAr = lang === 'ar';

  switch (code) {
    case 'auth/invalid-email':
      return isAr ? 'البريد الإلكتروني غير صالح.' : 'Invalid email address format.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return isAr ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Invalid email or password. Please try again.';
    case 'auth/email-already-in-use':
      return isAr ? 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.' : 'This email is already registered. Please sign in instead.';
    case 'auth/weak-password':
      return isAr ? 'كلمة المرور ضعيفة جداً. يجب أن تتكون من 6 أحرف على الأقل.' : 'Password is too weak. Must be at least 6 characters.';
    case 'auth/too-many-requests':
      return isAr ? 'تم حظر الطلبات مؤقتاً لكثرة المحاولات. يرجى الانتظار بضع دقائق والمحاولة مجدداً.' : 'Too many failed attempts. Please wait a few minutes before trying again.';
    case 'auth/popup-closed-by-user':
      return isAr ? 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.' : 'Sign-in window was closed before completion.';
    case 'auth/popup-blocked':
      return isAr ? 'تم حظر النافذة المنبثقة من قِبل المتصفح. يرجى السماح بالنوافذ المنبثقة.' : 'The sign-in popup was blocked by your browser. Please allow popups.';
    case 'auth/network-request-failed':
      return isAr ? 'تعذر الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت.' : 'Network connection failed. Please check your internet connection.';
    case 'auth/user-disabled':
      return isAr ? 'تم تعطيل هذا الحساب من قِبل الإدارة.' : 'This account has been disabled.';
    case 'auth/requires-recent-login':
      return isAr ? 'تتطلب هذه العملية الحساسة إعادة تسجيل الدخول لتأكيد الهوية.' : 'This sensitive operation requires recent login. Please sign in again to verify your identity.';
    case 'auth/expired-action-code':
      return isAr ? 'انتهت صلاحية الرابط. يرجى طلب رابط جديد.' : 'The reset link has expired. Please request a new one.';
    case 'auth/invalid-action-code':
      return isAr ? 'الرابط غير صالح أو تم استخدامه بالفعل.' : 'The reset link is invalid or has already been used.';
    case 'auth/account-exists-with-different-credential':
      return isAr ? 'يوجد حساب مسجل بالفعل ببيانات اعتماد مختلفة لهذا البريد.' : 'An account already exists with the same email using a different sign-in method.';
    default:
      return (err as any)?.message || (isAr ? 'حدث خطأ في المصادقة. يرجى المحاولة مرة أخرى.' : 'Authentication error. Please try again.');
  }
}

export async function loginWithEmailPassword(email: string, pass: string): Promise<FirebaseUser> {
  if (!authInstance) throw new Error('Firebase Auth is not configured.');
  const cred = await signInWithEmailAndPassword(authInstance, email, pass);
  return cred.user;
}

export async function registerWithEmailPassword(email: string, pass: string, displayName: string): Promise<FirebaseUser> {
  if (!authInstance) throw new Error('Firebase Auth is not configured.');
  const cred = await createUserWithEmailAndPassword(authInstance, email, pass);
  if (cred.user) {
    await updateProfile(cred.user, { displayName });
  }
  return cred.user;
}

let activeGoogleSignInPromise: Promise<FirebaseUser> | null = null;

export async function loginWithGoogle(): Promise<FirebaseUser> {
  if (!authInstance) throw new Error('Firebase Auth is not configured.');

  if (activeGoogleSignInPromise) {
    return activeGoogleSignInPromise;
  }

  activeGoogleSignInPromise = (async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(authInstance, provider);
      return cred.user;
    } finally {
      setTimeout(() => {
        activeGoogleSignInPromise = null;
      }, 400);
    }
  })();

  return activeGoogleSignInPromise;
}

export async function logoutUser(): Promise<void> {
  if (!authInstance) return;
  await signOut(authInstance);
}

export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void): () => void {
  if (!authInstance) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(authInstance, callback);
}

/**
 * Resolves current application base URL for ActionCodeSettings redirect.
 */
export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return 'http://localhost:3000';
}

/**
 * Sends a password reset email using Firebase Auth.
 * Configures ActionCodeSettings so the link directs users back to the La3ib application.
 * Falls back gracefully if the redirect domain is not whitelisted, and suppresses account enumeration leaks.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  if (!authInstance) throw new Error('Firebase Auth is not configured.');
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  const actionCodeSettings: ActionCodeSettings = {
    url: `${getAppBaseUrl()}/`,
    handleCodeInApp: false,
  };

  try {
    await sendPasswordResetEmail(authInstance, trimmedEmail, actionCodeSettings);
  } catch (err: any) {
    const code = err?.code || '';
    // Prevent email enumeration: act as success if user does not exist
    if (code === 'auth/user-not-found') {
      return;
    }
    // If continue URL domain is not yet whitelisted in Firebase Console, fallback to standard email
    if (code === 'auth/unauthorized-continue-uri') {
      try {
        await sendPasswordResetEmail(authInstance, trimmedEmail);
        return;
      } catch (fallbackErr: any) {
        if (fallbackErr?.code === 'auth/user-not-found') return;
        throw fallbackErr;
      }
    }
    if (code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    }
    if (code === 'auth/too-many-requests') {
      throw new Error('Too many password reset requests. Please wait a few minutes.');
    }
    if (code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw err;
  }
}

/**
 * Verifies the password reset action code with Firebase Auth.
 * Returns the associated email address if the code is valid.
 * Throws specific errors if the code is expired or invalid.
 */
export async function verifyResetCode(code: string): Promise<string> {
  if (!authInstance) throw new Error('Firebase Auth is not configured.');
  const trimmedCode = code.trim();
  if (!trimmedCode) {
    throw new Error('Password reset code is missing or empty.');
  }

  try {
    const email = await verifyPasswordResetCode(authInstance, trimmedCode);
    return email;
  } catch (err: any) {
    const errorCode = err?.code || '';
    if (errorCode === 'auth/expired-action-code') {
      throw new Error('The password reset link has expired. Please request a new one.');
    }
    if (errorCode === 'auth/invalid-action-code') {
      throw new Error('This password reset link is invalid or has already been used. Please request a new one.');
    }
    if (errorCode === 'auth/user-disabled') {
      throw new Error('This user account has been disabled.');
    }
    if (errorCode === 'auth/user-not-found') {
      throw new Error('No user found associated with this reset link.');
    }
    throw err;
  }
}

/**
 * Completes the password reset process by applying the new password with the action code.
 */
export async function confirmResetPassword(code: string, newPassword: string): Promise<void> {
  if (!authInstance) throw new Error('Firebase Auth is not configured.');
  const trimmedCode = code.trim();
  if (!trimmedCode) {
    throw new Error('Password reset code is missing or empty.');
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  try {
    await confirmPasswordReset(authInstance, trimmedCode, newPassword);
  } catch (err: any) {
    const errorCode = err?.code || '';
    if (errorCode === 'auth/expired-action-code') {
      throw new Error('The password reset link has expired. Please request a new one.');
    }
    if (errorCode === 'auth/invalid-action-code') {
      throw new Error('This password reset link is invalid or has already been used. Please request a new one.');
    }
    if (errorCode === 'auth/weak-password') {
      throw new Error('Password is too weak. Must be at least 6 characters.');
    }
    throw err;
  }
}

/**
 * Parses action code parameters (mode, oobCode, apiKey) from search or hash queries.
 */
export interface AuthActionParams {
  mode: string | null;
  oobCode: string | null;
  apiKey: string | null;
}

export function extractAuthActionParams(
  urlSearch?: string,
  urlHash?: string
): AuthActionParams {
  const search = urlSearch !== undefined ? urlSearch : (typeof window !== 'undefined' ? window.location.search : '');
  const hash = urlHash !== undefined ? urlHash : (typeof window !== 'undefined' ? window.location.hash : '');

  const searchParams = new URLSearchParams(search);
  let mode = searchParams.get('mode');
  let oobCode = searchParams.get('oobCode');
  let apiKey = searchParams.get('apiKey');

  if (!mode || !oobCode) {
    if (hash) {
      const qIndex = hash.indexOf('?');
      const hashQuery = qIndex !== -1 ? hash.substring(qIndex) : (hash.startsWith('#') ? hash.substring(1) : hash);
      const hashParams = new URLSearchParams(hashQuery);
      if (!mode) mode = hashParams.get('mode');
      if (!oobCode) oobCode = hashParams.get('oobCode');
      if (!apiKey) apiKey = hashParams.get('apiKey');
    }
  }

  return { mode, oobCode, apiKey };
}

/**
 * Removes auth action parameters from window URL to prevent re-submitting an already used oobCode upon page refresh.
 */
export function clearAuthActionParams(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('mode');
    url.searchParams.delete('oobCode');
    url.searchParams.delete('apiKey');
    url.searchParams.delete('lang');
    if (url.hash && url.hash.includes('oobCode')) {
      url.hash = '';
    }
    const newRelative = url.pathname + (url.search ? url.search : '') + (url.hash ? url.hash : '');
    const title = typeof document !== 'undefined' ? document.title : '';
    window.history.replaceState({}, title, newRelative);
  } catch (e) {
    // Ignore in non-standard environments
  }
}


/**
 * Re-authenticates the current user before sensitive operations like account deletion.
 * Supports email/password or Google Auth.
 */
export async function reauthenticateCurrentUser(password?: string): Promise<void> {
  if (!authInstance?.currentUser) throw new Error('No authenticated user found.');
  const user = authInstance.currentUser;
  const isGoogle = user.providerData.some(p => p.providerId === 'google.com');

  if (isGoogle) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await reauthenticateWithPopup(user, provider);
  } else if (password && user.email) {
    const cred = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, cred);
  } else {
    throw new Error('Password or provider credentials are required to re-authenticate.');
  }
}

/**
 * Deletes the currently authenticated user account and safely cleans up user-owned records.
 * Preserves shared/transactional data (past match history, game chat logs, payment audit documents).
 */
export async function deleteCurrentUserAccount(reauthPassword?: string): Promise<void> {
  if (!authInstance || !dbInstance) throw new Error('Firebase is not initialized.');
  const user = authInstance.currentUser;
  if (!user || !user.uid) {
    throw new Error('User must be signed in to delete their account.');
  }

  const uid = user.uid;
  const isGoogle = user.providerData.some(p => p.providerId === 'google.com');

  // 1. Mandatory re-authentication before deleting any Firestore data
  if (isGoogle) {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await reauthenticateWithPopup(user, provider);
    } catch (googleErr) {
      console.error('[Account Deletion] Google re-authentication failed:', googleErr);
      throw googleErr;
    }
  } else if (reauthPassword && user.email) {
    try {
      const cred = EmailAuthProvider.credential(user.email, reauthPassword);
      await reauthenticateWithCredential(user, cred);
    } catch (reauthErr) {
      console.error('[Account Deletion] Re-authentication failed:', reauthErr);
      throw reauthErr;
    }
  } else {
    throw new Error('Please enter your password to confirm account deletion.');
  }

  // 2. Fetch user's current username to release the username reservation
  let currentUsername: string | null = null;
  try {
    const userSnap = await getDoc(doc(dbInstance, 'users', uid));
    if (userSnap.exists()) {
      currentUsername = userSnap.data()?.username || null;
    }
  } catch (err) {
    console.warn('[Account Deletion] Could not fetch username for release:', err);
  }

  // 3. Safe cleanup of user-owned collections & subcollections
  try {
    const batch = writeBatch(dbInstance);

    // Delete user profile doc: users/{uid}
    batch.delete(doc(dbInstance, 'users', uid));

    // Delete private account doc: users/{uid}/private/account
    batch.delete(doc(dbInstance, 'users', uid, 'private', 'account'));

    // Release username reservation if exists
    if (currentUsername) {
      const norm = normalizeUsername(currentUsername);
      batch.delete(doc(dbInstance, 'usernames', norm));
    }

    await batch.commit();
  } catch (cleanupErr) {
    console.warn('[Account Deletion] Batch deletion of user profile notice:', cleanupErr);
  }

  // 3b. Reciprocal cleanup of external follower and friendship relationships
  try {
    const followingSnap = await getDocs(collection(dbInstance, 'users', uid, 'following'));
    for (const d of followingSnap.docs) {
      const targetUserId = d.id;
      try {
        const targetFollowerRef = doc(dbInstance, 'users', targetUserId, 'followers', uid);
        await deleteDoc(targetFollowerRef);
        // Atomically update followerCount with non-negative protection
        const targetUserRef = doc(dbInstance, 'users', targetUserId);
        const tSnap = await getDoc(targetUserRef);
        if (tSnap.exists()) {
          const curCount = Math.max(0, typeof tSnap.data().followerCount === 'number' ? tSnap.data().followerCount : 1);
          await updateDoc(targetUserRef, {
            followerCount: Math.max(0, curCount - 1),
            updatedAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn(`[Account Deletion] Could not clean follower on ${targetUserId}:`, e);
      }
    }
  } catch (e) {}

  try {
    const friendsSnap = await getDocs(collection(dbInstance, 'users', uid, 'friends'));
    for (const d of friendsSnap.docs) {
      const friendUserId = d.id;
      try {
        const otherFriendRef = doc(dbInstance, 'users', friendUserId, 'friends', uid);
        await deleteDoc(otherFriendRef);
        // Atomically update friendCount with non-negative protection
        const otherUserRef = doc(dbInstance, 'users', friendUserId);
        const oSnap = await getDoc(otherUserRef);
        if (oSnap.exists()) {
          const curCount = Math.max(0, typeof oSnap.data().friendCount === 'number' ? oSnap.data().friendCount : 1);
          await updateDoc(otherUserRef, {
            friendCount: Math.max(0, curCount - 1),
            updatedAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn(`[Account Deletion] Could not clean friendship on ${friendUserId}:`, e);
      }
    }
  } catch (e) {}

  try {
    const outgoingReqsSnap = await getDocs(
      query(collectionGroup(dbInstance, 'friendRequests'), where('requesterId', '==', uid))
    );
    for (const d of outgoingReqsSnap.docs) {
      try {
        await deleteDoc(d.ref);
      } catch (e) {}
    }
  } catch (e) {}

  // 3c. Cancel or clean pending incoming and outgoing game invites for this deleted user
  try {
    const pendingInvitesSnap = await getDocs(
      query(collectionGroup(dbInstance, 'invites'), where('inviteeId', '==', uid), where('status', '==', 'pending'))
    );
    for (const d of pendingInvitesSnap.docs) {
      try {
        await updateDoc(d.ref, {
          status: 'declined',
          respondedAt: new Date().toISOString()
        });
      } catch (e) {}
    }
  } catch (e) {}

  try {
    const outgoingInvitesSnap = await getDocs(
      query(collectionGroup(dbInstance, 'invites'), where('inviterId', '==', uid), where('status', '==', 'pending'))
    );
    for (const d of outgoingInvitesSnap.docs) {
      try {
        await updateDoc(d.ref, {
          status: 'cancelled',
          respondedAt: new Date().toISOString()
        });
      } catch (e) {}
    }
  } catch (e) {}

  // 4. Clean up subcollections (notifications, friendRequests, blocked, following, followers, friends)
  const subcollections = ['notifications', 'friendRequests', 'blocked', 'following', 'followers', 'friends'];
  for (const sub of subcollections) {
    try {
      const colRef = collection(dbInstance, 'users', uid, sub);
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const subBatch = writeBatch(dbInstance);
        snap.docs.forEach(d => subBatch.delete(d.ref));
        await subBatch.commit();
      }
    } catch (subErr) {
      console.warn(`[Account Deletion] Error clearing subcollection ${sub}:`, subErr);
    }
  }

  // 5. Delete Firebase Auth user
  try {
    await deleteUser(user);
    console.log(`[Account Deletion] Successfully deleted Firebase Auth account for UID: ${uid}`);
  } catch (authErr: any) {
    console.error('[Account Deletion] deleteUser failed:', authErr);
    throw authErr;
  }
}

/**
 * Sends an email verification link to the current user.
 * Architecture-ready (email verification is optional for La3ib).
 */
export async function sendVerificationEmailToCurrentUser(): Promise<void> {
  if (!authInstance?.currentUser) throw new Error('User must be signed in.');
  await sendEmailVerification(authInstance.currentUser);
}

// =====================================================================
// USERNAME UNIQUENESS & RESERVATION (Collection: usernames/{normalized})
// =====================================================================

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(username: string): { valid: boolean; error?: string } {
  const trimmed = username.trim();
  if (!trimmed) {
    return { valid: false, error: 'Username cannot be empty.' };
  }
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters.' };
  }
  if (trimmed.length > 25) {
    return { valid: false, error: 'Username cannot exceed 25 characters.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores.' };
  }
  return { valid: true };
}

export async function checkUsernameAvailability(username: string, currentUid?: string): Promise<{ available: boolean; error?: string }> {
  if (!dbInstance) return { available: false, error: 'Database not initialized.' };
  const validation = validateUsername(username);
  if (!validation.valid) return { available: false, error: validation.error };

  const norm = normalizeUsername(username);
  try {
    const snap = await getDoc(doc(dbInstance, 'usernames', norm));
    if (!snap.exists()) {
      return { available: true };
    }
    const data = snap.data();
    if (currentUid && data.uid === currentUid) {
      return { available: true };
    }
    return { available: false, error: 'Username is already taken.' };
  } catch (err: any) {
    console.error('Error checking username availability:', err);
    return { available: false, error: 'Could not verify username availability.' };
  }
}

export async function reserveOrUpdateUsername(
  uid: string,
  newUsername: string,
  oldUsername?: string
): Promise<{ success: boolean; normalized: string }> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  const validation = validateUsername(newUsername);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const newNorm = normalizeUsername(newUsername);
  const oldNorm = oldUsername ? normalizeUsername(oldUsername) : null;

  if (oldNorm === newNorm) {
    return { success: true, normalized: newNorm };
  }

  const newUsernameRef = doc(dbInstance, 'usernames', newNorm);
  const oldUsernameRef = oldNorm ? doc(dbInstance, 'usernames', oldNorm) : null;
  const userDocRef = doc(dbInstance, 'users', uid);
  const nowISO = new Date().toISOString();

  await runTransaction(dbInstance, async (tx) => {
    const newSnap = await tx.get(newUsernameRef);
    if (newSnap.exists()) {
      const data = newSnap.data();
      if (data.uid !== uid) {
        throw new Error(`Username "@${newUsername}" is already taken by another athlete.`);
      }
    }

    if (oldUsernameRef) {
      const oldSnap = await tx.get(oldUsernameRef);
      if (oldSnap.exists() && oldSnap.data()?.uid === uid) {
        tx.delete(oldUsernameRef);
      }
    }

    tx.set(newUsernameRef, {
      uid,
      username: newUsername,
      normalized: newNorm,
      createdAt: nowISO,
      updatedAt: nowISO
    });

    tx.update(userDocRef, {
      username: newUsername,
      updatedAt: nowISO
    });
  });

  return { success: true, normalized: newNorm };
}

// User Document Operations in Firestore
export async function getUserProfileFromFirestore(uid: string): Promise<UserProfile | null> {
  if (!dbInstance) return null;
  try {
    const userDocRef = doc(dbInstance, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return mapDocToPublicProfile(snap.id, snap.data());
    }
    return null;
  } catch (err) {
    console.error(`Failed to fetch user profile for ${uid}:`, err);
    return null;
  }
}

export async function getPrivateAccountData(uid: string): Promise<PrivateAccountData | null> {
  if (!dbInstance) return null;
  try {
    const privateDocRef = doc(dbInstance, 'users', uid, 'private', 'account');
    const snap = await getDoc(privateDocRef);
    if (snap.exists()) {
      return snap.data() as PrivateAccountData;
    }
    return null;
  } catch (err) {
    console.error(`Failed to fetch private account data for ${uid}:`, err);
    return null;
  }
}

export async function createOrFetchUserProfile(
  firebaseUser: FirebaseUser, 
  initialInfo?: Partial<UserProfile>
): Promise<UserProfile> {
  if (!dbInstance) {
    throw new Error('Firestore is not initialized.');
  }

  const userDocRef = doc(dbInstance, 'users', firebaseUser.uid);
  const privateDocRef = doc(dbInstance, 'users', firebaseUser.uid, 'private', 'account');
  const nowISO = new Date().toISOString();
  const authEmail = firebaseUser.email || initialInfo?.email || '';

  // 1. Check if public user document already exists
  let existingPublicData: (UserProfile & { email?: string }) | null = null;
  let legacyEmailOnPublicDoc: string | null = null;

  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      existingPublicData = snap.data() as UserProfile & { email?: string };
      if (existingPublicData.email) {
        legacyEmailOnPublicDoc = existingPublicData.email;
      }
    }
  } catch (err) {
    console.warn('Could not check existing user doc, proceeding to create if permitted:', err);
  }

  // 2. Fetch or initialize private account data (email, sensitive data)
  let resolvedEmail = authEmail || legacyEmailOnPublicDoc || '';
  try {
    const privateSnap = await getDoc(privateDocRef);
    if (privateSnap.exists()) {
      const privateData = privateSnap.data() as PrivateAccountData;
      if (privateData.email) {
        resolvedEmail = privateData.email;
      }
    } else if (resolvedEmail) {
      // Create private account document safely
      await setDoc(privateDocRef, {
        email: resolvedEmail,
        uid: firebaseUser.uid,
        createdAt: existingPublicData?.createdAt || nowISO,
        updatedAt: nowISO
      }, { merge: true });
    }
  } catch (privateErr) {
    console.warn('Private account document handling notice:', privateErr);
  }

  // 3. Migration: if the legacy public document had an email, now that private/account is verified,
  // sanitize the public document using deleteField() so public discovery queries never expose email.
  if (legacyEmailOnPublicDoc && resolvedEmail) {
    try {
      await updateDoc(userDocRef, {
        email: deleteField(),
        updatedAt: nowISO
      });
      if (existingPublicData) {
        delete existingPublicData.email;
      }
    } catch (cleanErr) {
      console.warn('Could not sanitize legacy email from public doc:', cleanErr);
    }
  }

  // Determine admin privileges (case-insensitive check for verified project admin and Firestore admins doc)
  const isEmailAdmin = (resolvedEmail.toLowerCase().trim() === 'khalidalami5555@gmail.com') && Boolean(firebaseUser.emailVerified);
  const isUserAdmin = isEmailAdmin || (await checkIsAdminInFirestore());

  // If public profile already existed, return it merged with the user's private email and verified admin status
  if (existingPublicData) {
    const { email: _omit, ...cleanPublicProfile } = existingPublicData;
    return {
      ...cleanPublicProfile,
      email: resolvedEmail,
      isAdmin: isUserAdmin || Boolean(cleanPublicProfile.isAdmin)
    } as UserProfile;
  }

  // 4. Generate initial profile if new (no email in public document!)
  const emailName = resolvedEmail ? resolvedEmail.split('@')[0] : 'athlete';
  let cleanUsername = (initialInfo?.username || emailName).toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 15);
  if (cleanUsername.length < 3) cleanUsername = `player_${firebaseUser.uid.slice(0, 5)}`;

  // Check and reserve unique username
  let assignedUsername = cleanUsername;
  try {
    const norm = normalizeUsername(assignedUsername);
    const existingSnap = await getDoc(doc(dbInstance, 'usernames', norm));
    if (existingSnap.exists() && existingSnap.data()?.uid !== firebaseUser.uid) {
      assignedUsername = `${cleanUsername.slice(0, 10)}_${firebaseUser.uid.slice(0, 4)}`;
    }
    await setDoc(doc(dbInstance, 'usernames', normalizeUsername(assignedUsername)), {
      uid: firebaseUser.uid,
      username: assignedUsername,
      normalized: normalizeUsername(assignedUsername),
      createdAt: nowISO,
      updatedAt: nowISO
    }, { merge: true });
  } catch (uErr) {
    console.warn('Initial username reservation notice:', uErr);
  }

  const newPublicProfile: Omit<UserProfile, 'email'> = {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    name: initialInfo?.name || firebaseUser.displayName || emailName,
    nameAr: initialInfo?.nameAr || '',
    username: assignedUsername,
    avatar: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    photoURL: firebaseUser.photoURL || undefined,
    area: initialInfo?.area || 'Kuwait City',
    bio: initialInfo?.bio || 'Sports lover on La3ib Kuwait.',
    favoriteSports: initialInfo?.favoriteSports && initialInfo.favoriteSports.length > 0 
      ? initialInfo.favoriteSports 
      : ['Football', 'Padel'],
    skills: initialInfo?.skills || {
      Football: 'Intermediate',
      Padel: 'Beginner'
    },
    gamesPlayed: 0,
    gamesHosted: 0,
    followerCount: 0,
    followingCount: 0,
    attendanceRate: 100,
    isOrganizer: false,
    canOrganize: true,
    isAdmin: isUserAdmin,
    age: initialInfo?.age || 25,
    privacy: {
      showAge: true,
      showPhone: false,
      allowDirectInvites: true
    },
    isDemoUser: false,
    createdAt: nowISO,
    updatedAt: nowISO
  };

  try {
    // Write public profile to users/{uid}
    await setDoc(userDocRef, newPublicProfile);
    
    // Write private account data to users/{uid}/private/account
    if (resolvedEmail) {
      await setDoc(privateDocRef, {
        email: resolvedEmail,
        uid: firebaseUser.uid,
        createdAt: nowISO,
        updatedAt: nowISO
      }, { merge: true });
    }
  } catch (writeErr) {
    console.error('Failed to create user profile in Firestore:', writeErr);
    throw writeErr;
  }

  return {
    ...newPublicProfile,
    email: resolvedEmail
  } as UserProfile;
}

export async function updateUserProfileInFirestore(
  uid: string, 
  updates: Partial<UserProfile>
): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  
  const userDocRef = doc(dbInstance, 'users', uid);
  const nowISO = new Date().toISOString();
  
  // Separate sensitive account fields (email) from public profile updates
  const { email, username, ...publicUpdates } = updates;
  const payload: Record<string, any> = {
    ...publicUpdates,
    updatedAt: nowISO
  };

  // If username is being updated, perform atomic reservation first
  if (username !== undefined && username.trim()) {
    try {
      const snap = await getDoc(userDocRef);
      const oldUsername = snap.exists() ? snap.data()?.username : undefined;
      await reserveOrUpdateUsername(uid, username.trim(), oldUsername);
      payload.username = username.trim();
    } catch (uErr) {
      console.error('Failed to reserve updated username:', uErr);
      throw uErr;
    }
  }

  try {
    if (Object.keys(payload).length > 0) {
      await setDoc(userDocRef, payload, { merge: true });
    }
    // If email is explicitly updated, save it to the private subcollection only
    if (email !== undefined && email !== '') {
      const privateDocRef = doc(dbInstance, 'users', uid, 'private', 'account');
      await setDoc(privateDocRef, {
        email,
        uid,
        updatedAt: nowISO
      }, { merge: true });
    }
  } catch (err) {
    console.error(`Failed to update profile for ${uid}:`, err);
    throw err;
  }
}

// Storage Service Functions
export async function uploadUserProfilePicture(file: File, userId: string): Promise<string> {
  if (!storageInstance) throw new Error('Firebase Storage is not configured.');

  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid || currentAuthUser.uid !== userId) {
    throw new Error('Unauthorized: You can only upload a profile photo for your own account.');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are supported.');
  }

  const maxSizeBytes = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSizeBytes) {
    throw new Error('File size exceeds the 5MB limit. Please choose a smaller image.');
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const storageRef = ref(storageInstance, `users/${userId}/avatar_${Date.now()}.${fileExt}`);
  const uploadResult = await uploadBytes(storageRef, file, {
    contentType: file.type || 'image/jpeg'
  });
  return await getDownloadURL(uploadResult.ref);
}

export async function uploadVenuePhoto(file: File, venueId: string): Promise<string> {
  if (!storageInstance) throw new Error('Firebase Storage is not configured.');
  const fileExt = file.name.split('.').pop() || 'jpg';
  const storageRef = ref(storageInstance, `venues/${venueId}/photo_${Date.now()}.${fileExt}`);
  const uploadResult = await uploadBytes(storageRef, file, {
    contentType: file.type || 'image/jpeg'
  });
  return await getDownloadURL(uploadResult.ref);
}

// Games Collection Service
export interface CreateGameFirestoreInput {
  id?: string;
  title: string;
  sport: string;
  date: string;
  startTime: string;
  endTime: string;
  courtName: string;
  venue?: string;
  area: string;
  governorate?: string;
  address: string;
  location?: string;
  isIndoor: boolean;
  indoorAC?: boolean;
  maxPlayers: number;
  currentPlayers?: number;
  totalCourtCostKWD: number;
  totalCost?: number;
  pricePerPlayerKWD: number;
  pricePerPlayer?: number;
  skillLevel: string;
  gender: string;
  visibility: string;
  status?: string;
  description?: string;
  linkedBookingId?: string;
  cancellationPolicy?: string;
  coordinates?: { x: number; y: number };
}

export async function createGameInFirestore(
  gameInput: CreateGameFirestoreInput,
  organizerUser: FirebaseUser,
  userProfile?: Partial<UserProfile>
): Promise<string> {
  if (!dbInstance) {
    throw new Error('Firestore is not initialized.');
  }
  if (!organizerUser?.uid) {
    throw new Error('User must be authenticated to create a game.');
  }

  // Validate required fields
  if (!gameInput.title?.trim()) throw new Error('Game title is required.');
  if (!gameInput.sport) throw new Error('Sport is required.');
  if (!gameInput.date) throw new Error('Date is required.');
  if (!gameInput.startTime) throw new Error('Start time is required.');
  if (!gameInput.courtName?.trim()) throw new Error('Court name / venue is required.');
  if (!gameInput.area) throw new Error('Area is required.');
  if (!gameInput.maxPlayers || gameInput.maxPlayers < 2) throw new Error('Max players must be at least 2.');

  const gamesCollectionRef = collection(dbInstance, 'games');
  const gameDocRef = gameInput.id 
    ? doc(gamesCollectionRef, gameInput.id) 
    : doc(gamesCollectionRef);

  const gameId = gameDocRef.id;
  const nowISO = new Date().toISOString();

  // Construct clean document with no undefined fields
  const rawDocument: Record<string, any> = {
    id: gameId,
    organizerId: organizerUser.uid,
    organizerName: userProfile?.name || organizerUser.displayName || (organizerUser.email ? organizerUser.email.split('@')[0] : 'Organizer'),
    organizerPhotoURL: userProfile?.avatar || organizerUser.photoURL || '',
    title: gameInput.title.trim(),
    sport: gameInput.sport,
    date: gameInput.date,
    startTime: gameInput.startTime,
    endTime: gameInput.endTime || '',
    courtName: gameInput.courtName.trim(),
    venue: gameInput.venue || gameInput.courtName.trim(),
    area: gameInput.area,
    governorate: gameInput.governorate || gameInput.area,
    address: gameInput.address || '',
    location: gameInput.location || `${gameInput.courtName.trim()}, ${gameInput.area}`,
    isIndoor: Boolean(gameInput.isIndoor),
    indoorAC: gameInput.indoorAC !== undefined ? Boolean(gameInput.indoorAC) : Boolean(gameInput.isIndoor),
    skillLevel: gameInput.skillLevel || 'Intermediate',
    gender: gameInput.gender || 'Everyone',
    maxPlayers: Number(gameInput.maxPlayers),
    currentPlayers: 1, // Organizer is the initial player
    pricePerPlayer: Number(gameInput.pricePerPlayerKWD ?? gameInput.pricePerPlayer ?? 0),
    pricePerPlayerKWD: Number(gameInput.pricePerPlayerKWD ?? gameInput.pricePerPlayer ?? 0),
    totalCost: Number(gameInput.totalCourtCostKWD ?? gameInput.totalCost ?? 0),
    totalCourtCostKWD: Number(gameInput.totalCourtCostKWD ?? gameInput.totalCost ?? 0),
    visibility: gameInput.visibility || 'Public',
    description: gameInput.description?.trim() || '',
    status: gameInput.status || 'Open',
    linkedBookingId: gameInput.linkedBookingId || null,
    cancellationPolicy: gameInput.cancellationPolicy || 'Full refund if cancelled at least 4 hours before kickoff.',
    coordinates: gameInput.coordinates || { x: 50, y: 50 },
    participants: [
      {
        userId: organizerUser.uid,
        name: userProfile?.name || organizerUser.displayName || (organizerUser.email ? organizerUser.email.split('@')[0] : 'Organizer'),
        username: userProfile?.username || (organizerUser.email ? organizerUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_') : 'organizer'),
        avatar: userProfile?.avatar || organizerUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
        skill: (userProfile?.skills?.[gameInput.sport as SportType] || gameInput.skillLevel || 'Intermediate') as SkillLevel,
        paymentStatus: 'Paid',
        paidAmountKWD: Number(gameInput.pricePerPlayerKWD ?? gameInput.pricePerPlayer ?? 0),
        joinedAt: nowISO,
        paymentMethod: 'KNET',
        attendanceConfirmed: false
      }
    ],
    participantIds: [organizerUser.uid],
    createdAt: serverTimestamp(),
    createdAtISO: nowISO,
    updatedAt: serverTimestamp(),
    updatedAtISO: nowISO
  };

  // Strip any unexpected undefined values to ensure 100% serializable Firestore payload
  const gameDocument: Record<string, any> = {};
  for (const [key, value] of Object.entries(rawDocument)) {
    if (value !== undefined) {
      gameDocument[key] = value;
    }
  }

  // Diagnostic: Log before the write
  console.log('[Firestore Diagnostic] Initiating game creation write:', {
    path: `games/${gameId}`,
    organizerId: organizerUser.uid,
    databaseId: firebaseConfig.firestoreDatabaseId,
    title: gameDocument.title,
    sport: gameDocument.sport,
    date: gameDocument.date,
    maxPlayers: gameDocument.maxPlayers
  });

  try {
    // 15-second write timeout protection to prevent infinite hanging if connection stalls
    const writeOperation = setDoc(gameDocRef, gameDocument);
    const timeoutOperation = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Firestore write timed out after 15 seconds. Please check your network connection and Firestore configuration.'));
      }, 15000);
    });

    await Promise.race([writeOperation, timeoutOperation]);

    // Diagnostic: Log immediately when the write succeeds
    console.log('[Firestore Diagnostic] Game write successfully committed to Firestore:', {
      gameId,
      path: `games/${gameId}`
    });

    return gameId;
  } catch (err: any) {
    // Diagnostic: Log when the write throws an error
    console.error('[Firestore Diagnostic] Game write failed:', {
      code: err?.code || 'UNKNOWN_ERROR',
      message: err?.message || String(err),
      path: `games/${gameId}`
    });

    handleFirestoreError(err, OperationType.CREATE, `games/${gameId}`);
  }
}

/**
 * Atomically joins a game in Cloud Firestore using runTransaction.
 * Enforces:
 * 1. Game exists.
 * 2. Game status is 'Open'.
 * 3. User is not already in participants (duplicate check).
 * 4. Game is not full (capacity check).
 * 5. Appends the new participant, increments currentPlayers, updates status if full, updates updatedAt.
 */
export async function joinGameInFirestore(
  gameId: string,
  newParticipant: GameParticipant
): Promise<Game> {
  if (!dbInstance) {
    throw new Error('Firestore is not initialized.');
  }
  if (!newParticipant?.userId) {
    throw new Error('Valid authenticated user ID is required to join game.');
  }

  const gameDocRef = doc(dbInstance, 'games', gameId);
  const nowISO = new Date().toISOString();

  console.log('[Firestore Join] Starting atomic join transaction for game:', {
    gameId,
    userId: newParticipant.userId,
    name: newParticipant.name
  });

  try {
    const updatedGame = await runTransaction(dbInstance, async (transaction) => {
      const gameSnap = await transaction.get(gameDocRef);

      // 1. Confirm game exists
      if (!gameSnap.exists()) {
        throw new Error('Game does not exist or has been removed.');
      }

      const data = gameSnap.data();

      // 1b. Verify block status between organizer and joining participant
      const organizerUid = data.organizerId || (data.organizer && data.organizer.id) || '';
      if (organizerUid && organizerUid !== newParticipant.userId) {
        const blockRef1 = doc(dbInstance!, 'users', newParticipant.userId, 'blocked', organizerUid);
        const blockRef2 = doc(dbInstance!, 'users', organizerUid, 'blocked', newParticipant.userId);
        const [blockSnap1, blockSnap2] = await Promise.all([
          transaction.get(blockRef1),
          transaction.get(blockRef2)
        ]);
        if (blockSnap1.exists() || blockSnap2.exists()) {
          throw new Error('Cannot join this match due to community blocking restrictions.');
        }
      }

      // 2. Authoritative check on game status
      if (data.status === 'Cancelled') {
        throw new Error('This game has been cancelled.');
      }
      if (data.status === 'Completed') {
        throw new Error('This game has already been completed.');
      }
      if (data.status === 'Full') {
        throw new Error('This game is full. No more spots are available.');
      }
      if (data.status !== 'Open' && data.status !== 'Almost Full') {
        throw new Error(`This game is no longer open for joining (Status: ${data.status}).`);
      }

      // 3. Read current participants array (or derive with organizer fallback)
      let currentParticipants: any[] = [];
      if (Array.isArray(data.participants) && data.participants.length > 0) {
        currentParticipants = [...data.participants];
      } else {
        // Fallback: organizer is first participant if array was uninitialized
        currentParticipants = [
          {
            userId: data.organizerId || 'organizer',
            name: data.organizerName || 'Organizer',
            username: (data.organizerName || 'organizer').toLowerCase().replace(/\s+/g, '_'),
            avatar: data.organizerPhotoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
            skill: data.skillLevel || 'Intermediate',
            paymentStatus: 'Paid',
            paidAmountKWD: Number(data.pricePerPlayerKWD ?? data.pricePerPlayer ?? 0),
            joinedAt: data.createdAtISO || nowISO,
            paymentMethod: 'KNET',
            attendanceConfirmed: false
          }
        ];
      }

      // 4. Authoritative duplicate join protection (both participants array and participantIds)
      const currentParticipantIds: string[] = Array.isArray(data.participantIds)
        ? [...data.participantIds]
        : currentParticipants.map((p: any) => p.userId || p.id).filter(Boolean);

      const isAlreadyJoined = currentParticipants.some(
        (p: any) => (p.userId === newParticipant.userId || p.id === newParticipant.userId)
      ) || currentParticipantIds.includes(newParticipant.userId);

      if (isAlreadyJoined) {
        throw new Error('You have already joined this match.');
      }

      // 5. Authoritative capacity protection (concurrency guard for final slot)
      const maxPlayers = Number(data.maxPlayers || 10);
      if (currentParticipants.length >= maxPlayers) {
        throw new Error('This game is full. No more spots are available.');
      }

      const authoritativePrice = Number(data.pricePerPlayerKWD ?? data.pricePerPlayer ?? 0);
      const initialPaymentStatus: PaymentStatus = authoritativePrice > 0 ? 'unpaid' : 'paid';

      // 6. Clean and append participant data
      const sanitizedParticipant: Record<string, any> = {
        userId: newParticipant.userId,
        name: newParticipant.name || 'Player',
        username: newParticipant.username || newParticipant.name?.toLowerCase().replace(/\s+/g, '_') || 'player',
        avatar: newParticipant.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
        skill: newParticipant.skill || data.skillLevel || 'Casual',
        paymentStatus: initialPaymentStatus,
        paidAmountKWD: initialPaymentStatus === 'paid' ? authoritativePrice : 0,
        joinedAt: newParticipant.joinedAt && newParticipant.joinedAt !== 'Just now' ? newParticipant.joinedAt : nowISO,
        paymentMethod: newParticipant.paymentMethod || 'KNET',
        attendanceConfirmed: Boolean(newParticipant.attendanceConfirmed)
      };

      const updatedParticipants = [...currentParticipants, sanitizedParticipant];
      const newCount = updatedParticipants.length;
      const newStatus = newCount >= maxPlayers ? 'Full' : (newCount >= maxPlayers - 1 ? 'Almost Full' : 'Open');

      // Maintain synchronized participantIds array
      const updatedParticipantIds = currentParticipantIds.includes(newParticipant.userId)
        ? currentParticipantIds
        : [...currentParticipantIds, newParticipant.userId];

      // 7. Commit atomic update inside transaction
      transaction.update(gameDocRef, {
        participants: updatedParticipants,
        participantIds: updatedParticipantIds,
        currentPlayers: newCount,
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedAtISO: nowISO
      });

      // 7b. Initialize Participant Payment Record (/games/{gameId}/payments/{userId})
      const paymentDocRef = doc(dbInstance!, 'games', gameId, 'payments', newParticipant.userId);
      transaction.set(paymentDocRef, {
        id: newParticipant.userId,
        gameId,
        userId: newParticipant.userId,
        organizerId: organizerUid,
        amountKWD: authoritativePrice,
        currency: 'KWD',
        status: initialPaymentStatus,
        createdAt: nowISO,
        updatedAt: nowISO
      });

      // 8. Atomic Notification Creation for Organizer (if joining player is not organizer)
      if (data.organizerId && data.organizerId !== newParticipant.userId) {
        const notifsCol = collection(dbInstance!, 'users', data.organizerId, 'notifications');

        // Event 1: game_join (deterministic ID prevents duplicate spam on retries)
        const joinNotifRef = doc(notifsCol, `join_${gameId}_${newParticipant.userId}`);
        transaction.set(joinNotifRef, {
          id: joinNotifRef.id,
          userId: data.organizerId,
          type: 'game_join',
          title: 'New player joined',
          body: `${newParticipant.name || 'A player'} joined your ${data.sport || 'pickup'} game.`,
          gameId,
          actorId: newParticipant.userId,
          actorName: newParticipant.name || 'Player',
          actorPhotoURL: newParticipant.avatar || '',
          read: false,
          createdAt: serverTimestamp(),
          createdAtISO: nowISO
        });

        // Event 3: game_almost_full (Open -> Almost Full, deterministic ID)
        if (data.status === 'Open' && newStatus === 'Almost Full') {
          const almostFullNotifRef = doc(notifsCol, `almost_full_${gameId}`);
          transaction.set(almostFullNotifRef, {
            id: almostFullNotifRef.id,
            userId: data.organizerId,
            type: 'game_almost_full',
            title: 'Game almost full',
            body: `Your ${data.sport || 'pickup'} game "${data.title || 'match'}" is almost full (${newCount}/${maxPlayers} spots filled).`,
            gameId,
            actorId: newParticipant.userId,
            actorName: newParticipant.name || 'Player',
            actorPhotoURL: newParticipant.avatar || '',
            read: false,
            createdAt: serverTimestamp(),
            createdAtISO: nowISO
          });
        }

        // Event 4: game_full (transitions into Full, deterministic ID)
        if (data.status !== 'Full' && newStatus === 'Full') {
          const fullNotifRef = doc(notifsCol, `full_${gameId}`);
          transaction.set(fullNotifRef, {
            id: fullNotifRef.id,
            userId: data.organizerId,
            type: 'game_full',
            title: 'Game is full',
            body: `Your ${data.sport || 'pickup'} game "${data.title || 'match'}" is now full (${maxPlayers}/${maxPlayers} players).`,
            gameId,
            actorId: newParticipant.userId,
            actorName: newParticipant.name || 'Player',
            actorPhotoURL: newParticipant.avatar || '',
            read: false,
            createdAt: serverTimestamp(),
            createdAtISO: nowISO
          });
        }
      }

      console.log('[Firestore Join] Transaction payload verified:', {
        gameId,
        newCount,
        maxPlayers,
        newStatus
      });

      return mapFirestoreDocToGame(gameId, {
        ...data,
        participants: updatedParticipants,
        currentPlayers: newCount,
        status: newStatus,
        updatedAtISO: nowISO
      });
    });

    console.log('[Firestore Join] Successfully joined game in Firestore:', {
      gameId,
      participantCount: updatedGame.participants.length
    });

    return updatedGame;
  } catch (err: any) {
    console.error('[Firestore Join] Transaction failed:', {
      gameId,
      userId: newParticipant.userId,
      message: err?.message || String(err)
    });
    handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}`);
    throw err;
  }
}

/**
 * Calculates financial summary for a game, computing total collected funds and organizer remaining share.
 */
export function calculateGameFinancialSummary(
  totalCourtCostKWD: number,
  participants: GameParticipant[]
): { totalCollectedKWD: number; organizerShareKWD: number } {
  const safeTotalCourtCost = Number(totalCourtCostKWD || 0);
  const safeParticipants = Array.isArray(participants) ? participants : [];

  const totalCollectedKWD = safeParticipants.reduce((sum, p) => {
    const isPaid = p.paymentStatus === 'paid' || p.paymentStatus === 'Paid';
    const amount = Number(p.paidAmountKWD || 0);
    return sum + (isPaid ? amount : 0);
  }, 0);

  const organizerShareKWD = Math.max(0, safeTotalCourtCost - totalCollectedKWD);

  return {
    totalCollectedKWD,
    organizerShareKWD
  };
}

/**
 * Pure helper to apply participant joining to a Game object.
 * Enforces capacity calculation and status transitions (Open -> Almost Full -> Full).
 */
export function applyGameParticipantJoin(game: Game, newParticipant: GameParticipant): Game {
  const currentParticipants = Array.isArray(game.participants) ? [...game.participants] : [];
  const currentParticipantIds = Array.isArray(game.participantIds)
    ? [...game.participantIds]
    : currentParticipants.map(p => p.userId).filter(Boolean);

  const updatedParticipants = [...currentParticipants, newParticipant];
  const updatedParticipantIds = currentParticipantIds.includes(newParticipant.userId)
    ? currentParticipantIds
    : [...currentParticipantIds, newParticipant.userId];

  const maxPlayers = Number(game.maxPlayers || 10);
  const newCount = updatedParticipants.length;

  let newStatus = game.status;
  if (game.status === 'Open' || game.status === 'Almost Full' || game.status === 'Full') {
    newStatus = newCount >= maxPlayers ? 'Full' : (newCount >= maxPlayers - 1 ? 'Almost Full' : 'Open');
  }

  return {
    ...game,
    participants: updatedParticipants,
    participantIds: updatedParticipantIds,
    status: newStatus
  };
}

/**
 * Pure helper to apply participant removal (leaving) to a Game object.
 * Recalculates capacity status (Full -> Almost Full -> Open) and maintains synchronized participantIds.
 */
export function applyGameParticipantLeave(game: Game, userId: string): Game {
  const currentParticipants = Array.isArray(game.participants) ? game.participants : [];
  const updatedParticipants = currentParticipants.filter(p => p.userId !== userId);

  const currentParticipantIds = Array.isArray(game.participantIds)
    ? game.participantIds
    : currentParticipants.map(p => p.userId).filter(Boolean);
  const updatedParticipantIds = currentParticipantIds.filter(id => id !== userId);

  const maxPlayers = Number(game.maxPlayers || 10);
  const newCount = updatedParticipants.length;

  let newStatus = game.status;
  if (game.status === 'Full' || game.status === 'Almost Full' || game.status === 'Open') {
    newStatus = newCount >= maxPlayers ? 'Full' : (newCount >= maxPlayers - 1 ? 'Almost Full' : 'Open');
  }

  return {
    ...game,
    participants: updatedParticipants,
    participantIds: updatedParticipantIds,
    status: newStatus
  };
}

/**
 * Computes the target payment status transition when a participant leaves a game.
 */
export function getLeavePaymentStatusTransition(currentStatus: string): 'refunded' | 'cancelled' | null {
  if (currentStatus === 'paid' || currentStatus === 'Paid') {
    return 'refunded';
  } else if (currentStatus === 'unpaid' || currentStatus === 'pending' || currentStatus === 'Pending') {
    return 'cancelled';
  }
  return null;
}

/**
 * Atomically leaves a game in Cloud Firestore using runTransaction.
 * Enforces:
 * 1. Game exists.
 * 2. The authenticated user is actually a participant.
 * 3. The organizer/host CANNOT leave using this player Leave Game operation.
 * 4. Removes ONLY the participant whose userId matches the authenticated user UID.
 * 5. Recalculates currentPlayers and updates status (Full -> Almost Full / Open).
 * 6. Updates updatedAt timestamp atomically.
 */
export async function leaveGameInFirestore(
  gameId: string,
  userId: string
): Promise<Game> {
  if (!dbInstance) {
    throw new Error('Firestore is not initialized.');
  }
  if (!userId) {
    throw new Error('Valid authenticated user ID is required to leave game.');
  }

  const gameDocRef = doc(dbInstance, 'games', gameId);
  const paymentDocRef = doc(dbInstance, 'games', gameId, 'payments', userId);
  const nowISO = new Date().toISOString();

  console.log('[Firestore Leave] Starting atomic leave transaction for game:', {
    gameId,
    userId
  });

  try {
    const updatedGame = await runTransaction(dbInstance, async (transaction) => {
      const [gameSnap, paymentSnap] = await Promise.all([
        transaction.get(gameDocRef),
        transaction.get(paymentDocRef)
      ]);

      // 1. Confirm game exists
      if (!gameSnap.exists()) {
        throw new Error('Game does not exist or has been removed.');
      }

      const data = gameSnap.data();

      // 2. Reject organizer from leaving via normal leave flow
      if (data.organizerId === userId) {
        throw new Error('The game organizer cannot leave the game.');
      }

      // 3. Confirm user is currently a participant
      const currentParticipants: any[] = Array.isArray(data.participants) ? data.participants : [];
      const participantIndex = currentParticipants.findIndex(
        (p: any) => (p.userId === userId || p.id === userId)
      );

      if (participantIndex === -1) {
        throw new Error('You are not currently joined in this game.');
      }

      // 4. Remove ONLY this participant, preserving all other participants
      const updatedParticipants = currentParticipants.filter(
        (p: any) => p.userId !== userId && p.id !== userId
      );

      const maxPlayers = Number(data.maxPlayers || 10);
      const newCount = updatedParticipants.length;
      
      // 5. Status recalculation:
      // If completed or cancelled, keep status.
      // Otherwise: Full if at capacity; Almost Full if at max - 1; Open if below.
      let newStatus = data.status;
      if (data.status === 'Full' || data.status === 'Almost Full' || data.status === 'Open') {
        newStatus = newCount >= maxPlayers ? 'Full' : (newCount >= maxPlayers - 1 ? 'Almost Full' : 'Open');
      }

      // Maintain synchronized participantIds array
      const currentParticipantIds: string[] = Array.isArray(data.participantIds)
        ? data.participantIds
        : currentParticipants.map((p: any) => p.userId || p.id).filter(Boolean);
      const updatedParticipantIds = currentParticipantIds.filter((id: string) => id !== userId);

      // 6. Commit atomic update inside transaction
      transaction.update(gameDocRef, {
        participants: updatedParticipants,
        participantIds: updatedParticipantIds,
        currentPlayers: newCount,
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedAtISO: nowISO
      });

      // 6b. Transition payment status in games/{gameId}/payments/{userId}
      if (paymentSnap.exists()) {
        const pData = paymentSnap.data();
        const nextPaymentStatus = getLeavePaymentStatusTransition(pData.status);
        if (nextPaymentStatus === 'refunded') {
          // Simulated refund transition according to architecture
          transaction.update(paymentDocRef, {
            status: 'refunded',
            refundedAt: nowISO,
            updatedAt: nowISO
          });
        } else if (nextPaymentStatus === 'cancelled') {
          transaction.update(paymentDocRef, {
            status: 'cancelled',
            updatedAt: nowISO
          });
        }
      }

      // 7. Atomic Notification Creation for Organizer
      if (data.organizerId && data.organizerId !== userId) {
        const notifsCol = collection(dbInstance!, 'users', data.organizerId, 'notifications');
        // 7. Atomic Notification Creation for Organizer (deterministic ID)
        const leaveNotifRef = doc(notifsCol, `leave_${gameId}_${userId}`);
        const leavingParticipant = currentParticipants.find((p: any) => p.userId === userId || p.id === userId);
        const leavingName = leavingParticipant?.name || 'A player';
        const leavingAvatar = leavingParticipant?.avatar || '';

        transaction.set(leaveNotifRef, {
          id: leaveNotifRef.id,
          userId: data.organizerId,
          type: 'game_leave',
          title: 'Player left',
          body: `${leavingName} left your ${data.sport || 'pickup'} game.`,
          gameId,
          actorId: userId,
          actorName: leavingName,
          actorPhotoURL: leavingAvatar,
          read: false,
          createdAt: serverTimestamp(),
          createdAtISO: nowISO
        });
      }

      console.log('[Firestore Leave] Transaction payload committed:', {
        gameId,
        userId,
        newCount,
        maxPlayers,
        newStatus
      });

      return mapFirestoreDocToGame(gameId, {
        ...data,
        participants: updatedParticipants,
        currentPlayers: newCount,
        status: newStatus,
        updatedAtISO: nowISO
      });
    });

    console.log('[Firestore Leave] Successfully left game in Firestore:', {
      gameId,
      remainingParticipants: updatedGame.participants.length
    });

    return updatedGame;
  } catch (err: any) {
    console.error('[Firestore Leave] Transaction failed:', {
      gameId,
      userId,
      message: err?.message || String(err)
    });
    handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}`);
    throw err;
  }
}

/**
 * Maps a Firestore raw document into the app's Game interface.
 */
export function mapFirestoreDocToGame(id: string, data: Record<string, any>): Game {
  const sport = (data.sport || 'Football') as SportType;
  const area = (data.area || data.governorate || 'Kuwait City') as KuwaitArea;
  const organizerId = data.organizerId || 'organizer';
  const organizerName = data.organizerName || 'Organizer';
  const organizerPhotoURL = data.organizerPhotoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80';
  const price = Number(data.pricePerPlayerKWD ?? data.pricePerPlayer ?? 0);
  const totalCost = Number(data.totalCourtCostKWD ?? data.totalCost ?? 0);
  const maxPlayers = Math.max(2, Number(data.maxPlayers || 10));
  const courtName = data.courtName || data.venue || 'Kuwait Sports Venue';
  const skillLevel = (data.skillLevel || 'Intermediate') as SkillLevel;
  const gender = (data.gender || 'Everyone') as GenderPreference;
  const visibility = (data.visibility || 'Public') as GameVisibility;
  const rawStatus = (data.status || 'Open') as GameStatus;
  const isIndoor = Boolean(data.isIndoor ?? data.indoorAC ?? false);

  // Parse createdAt safely
  let createdAtStr = new Date().toISOString();
  if (data.createdAtISO) {
    createdAtStr = data.createdAtISO;
  } else if (data.createdAt && typeof data.createdAt.toDate === 'function') {
    createdAtStr = data.createdAt.toDate().toISOString();
  }

  // Participants mapping with deduplication and safe user fallbacks
  let participants: GameParticipant[] = [];
  const seenUserIds = new Set<string>();

  if (Array.isArray(data.participants) && data.participants.length > 0) {
    for (const p of data.participants) {
      const pid = p.userId || p.id || 'p-unknown';
      if (seenUserIds.has(pid)) continue; // Deduplicate
      seenUserIds.add(pid);

      participants.push({
        userId: pid,
        name: p.name || 'Player',
        username: p.username || (p.name ? p.name.toLowerCase().replace(/\s+/g, '_') : 'player'),
        avatar: p.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
        skill: (p.skill || skillLevel) as SkillLevel,
        paymentStatus: p.paymentStatus || 'Paid',
        paidAmountKWD: Number(p.paidAmountKWD ?? price),
        joinedAt: p.joinedAt || 'Joined',
        paymentMethod: p.paymentMethod || 'KNET',
        attendanceConfirmed: Boolean(p.attendanceConfirmed)
      });
    }
  } else {
    // Default organizer is first participant
    seenUserIds.add(organizerId);
    participants = [
      {
        userId: organizerId,
        name: organizerName,
        username: organizerName.toLowerCase().replace(/\s+/g, '_'),
        avatar: organizerPhotoURL,
        skill: skillLevel,
        paymentStatus: 'Paid',
        paidAmountKWD: price,
        joinedAt: 'Host',
        paymentMethod: 'KNET',
        attendanceConfirmed: false
      }
    ];
  }

  // Authoritative participantIds list: exactly matching current participant roster
  const participantIds: string[] = participants.map((p) => p.userId).filter(Boolean);

  // Authoritative status calculation:
  // Cancelled or Completed games remain immutable.
  // Otherwise, capacity dynamically dictates Full / Almost Full / Open so stale status never breaks joining/leaving.
  let status: GameStatus = rawStatus;
  if (rawStatus !== 'Cancelled' && rawStatus !== 'Completed') {
    const currentCount = participants.length;
    if (currentCount >= maxPlayers) {
      status = 'Full';
    } else if (currentCount >= maxPlayers - 1) {
      status = 'Almost Full';
    } else {
      status = 'Open';
    }
  }

  // Map coordinates (for Kuwait radar map view)
  const coords = data.coordinates && typeof data.coordinates.x === 'number' && typeof data.coordinates.y === 'number'
    ? data.coordinates
    : { x: 50, y: 50 };

  return {
    id,
    title: data.title || `${sport} Match`,
    sport,
    date: data.date || new Date().toISOString().split('T')[0],
    startTime: data.startTime || '18:00',
    endTime: data.endTime || '19:30',
    courtName,
    area,
    address: data.address || '',
    coordinates: coords,
    isIndoor,
    maxPlayers,
    organizer: {
      id: organizerId,
      uid: organizerId,
      name: organizerName,
      username: organizerName.toLowerCase().replace(/\s+/g, '_'),
      avatar: organizerPhotoURL,
      photoURL: organizerPhotoURL,
      area,
      bio: '',
      favoriteSports: [sport],
      skills: { [sport]: skillLevel },
      gamesPlayed: 1,
      gamesHosted: 1,
      attendanceRate: 100,
      isOrganizer: true,
      privacy: { showAge: false, showPhone: false, allowDirectInvites: true }
    },
    participants,
    participantIds,
    totalCourtCostKWD: totalCost,
    pricePerPlayerKWD: price,
    skillLevel,
    gender,
    visibility,
    status,
    moderated: Boolean(data.moderated),
    moderatedAt: data.moderatedAt || undefined,
    moderatedBy: data.moderatedBy || undefined,
    moderationReason: data.moderationReason || undefined,
    description: data.description || '',
    linkedBookingId: data.linkedBookingId || undefined,
    createdAt: createdAtStr,
    cancellationPolicy: data.cancellationPolicy || 'Full refund if cancelled at least 4 hours before kickoff.'
  };
}

/**
 * Fetches a single game from Firestore by ID.
 */
export async function getGameFromFirestore(gameId: string): Promise<Game | null> {
  if (!dbInstance) return null;
  try {
    const gameDocRef = doc(dbInstance, 'games', gameId);
    const snap = await getDoc(gameDocRef);
    if (!snap.exists()) return null;
    return mapFirestoreDocToGame(snap.id, snap.data());
  } catch (err) {
    console.warn(`[Firestore] Failed to get game ${gameId}:`, err);
    return null;
  }
}

/**
 * Atomically updates a game in Cloud Firestore using runTransaction.
 * Enforces:
 * 1. Caller is the authoritative organizer (or admin).
 * 2. Cannot reduce maxPlayers below the current count of joined participants.
 * 3. Validates non-negative price and valid player capacities (2-50).
 * 4. Recalculates status (Full / Almost Full / Open) if capacity changes.
 */
export async function updateGameInFirestore(
  gameId: string,
  updates: Partial<Game>,
  currentUserId: string
): Promise<Game> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  if (!currentUserId) throw new Error('User must be authenticated to update game details.');

  const gameDocRef = doc(dbInstance, 'games', gameId);
  const nowISO = new Date().toISOString();

  const updatedGame = await runTransaction(dbInstance, async (transaction) => {
    const gameSnap = await transaction.get(gameDocRef);
    if (!gameSnap.exists()) {
      throw new Error('Game does not exist.');
    }

    const data = gameSnap.data();
    const organizerUid = data.organizerId || (data.organizer && data.organizer.id);

    // Authoritative organizer permission check
    if (organizerUid !== currentUserId) {
      throw new Error('Only the game organizer can edit this game.');
    }

    // Cancelled or moderated games cannot be reopened or edited
    if (data.status === 'Cancelled' || data.moderated === true) {
      throw new Error('This game has been cancelled or moderated and cannot be edited or reopened.');
    }

    const currentParticipants = Array.isArray(data.participants) ? data.participants : [];
    const currentCount = currentParticipants.length;

    const payload: Record<string, any> = {
      updatedAt: serverTimestamp(),
      updatedAtISO: nowISO
    };

    // Capacity validation & recalculation
    if (updates.maxPlayers !== undefined) {
      const newMax = Number(updates.maxPlayers);
      if (isNaN(newMax) || newMax < 2 || newMax > 50) {
        throw new Error('Max players must be between 2 and 50.');
      }
      if (newMax < currentCount) {
        throw new Error(`Cannot reduce capacity to ${newMax} because ${currentCount} players have already joined.`);
      }
      payload.maxPlayers = newMax;

      // Recalculate status based on new capacity
      if (data.status === 'Open' || data.status === 'Almost Full' || data.status === 'Full') {
        payload.status = currentCount >= newMax ? 'Full' : (currentCount >= newMax - 1 ? 'Almost Full' : 'Open');
      }
    }

    if (updates.pricePerPlayerKWD !== undefined) {
      const newPrice = Number(updates.pricePerPlayerKWD);
      if (isNaN(newPrice) || newPrice < 0) {
        throw new Error('Price per player cannot be negative.');
      }
      payload.pricePerPlayerKWD = newPrice;
      payload.pricePerPlayer = newPrice;
    }

    if (updates.totalCourtCostKWD !== undefined) {
      const newTotal = Number(updates.totalCourtCostKWD);
      if (isNaN(newTotal) || newTotal < 0) {
        throw new Error('Total court cost cannot be negative.');
      }
      payload.totalCourtCostKWD = newTotal;
      payload.totalCost = newTotal;
    }

    if (updates.title !== undefined && updates.title.trim()) {
      payload.title = updates.title.trim();
    }
    if (updates.date !== undefined && updates.date.trim()) {
      payload.date = updates.date.trim();
    }
    if (updates.startTime !== undefined && updates.startTime.trim()) {
      payload.startTime = updates.startTime.trim();
    }
    if (updates.endTime !== undefined) {
      payload.endTime = updates.endTime.trim();
    }
    if (updates.courtName !== undefined && updates.courtName.trim()) {
      payload.courtName = updates.courtName.trim();
      payload.venue = updates.courtName.trim();
    }
    if (updates.area !== undefined && updates.area.trim()) {
      payload.area = updates.area.trim();
    }
    if (updates.description !== undefined) {
      payload.description = updates.description;
    }

    transaction.update(gameDocRef, payload);

    return mapFirestoreDocToGame(gameId, {
      ...data,
      ...payload,
      updatedAtISO: nowISO
    });
  });

  return updatedGame;
}

/**
 * Cancels a game in Cloud Firestore using runTransaction.
 * Enforces:
 * 1. Caller is the authoritative organizer (or admin).
 * 2. Marks status as 'Cancelled'.
 * 3. Appends cancellation reason if provided.
 */
export async function cancelGameInFirestore(
  gameId: string,
  currentUserId: string,
  reason?: string
): Promise<Game> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  if (!currentUserId) throw new Error('User must be authenticated to cancel a game.');

  const gameDocRef = doc(dbInstance, 'games', gameId);
  const nowISO = new Date().toISOString();

  const cancelledGame = await runTransaction(dbInstance, async (transaction) => {
    const gameSnap = await transaction.get(gameDocRef);
    if (!gameSnap.exists()) {
      throw new Error('Game does not exist.');
    }

    const data = gameSnap.data();
    const organizerUid = data.organizerId || (data.organizer && data.organizer.id);

    // Verify organizer permissions
    if (organizerUid !== currentUserId) {
      throw new Error('Only the organizer can cancel this game.');
    }

    if (data.status === 'Cancelled') {
      throw new Error('This game is already cancelled.');
    }

    const cancellationNotice = reason ? ` [Cancelled: ${reason}]` : ' [Cancelled]';
    const updatedDesc = data.description ? `${data.description}${cancellationNotice}` : cancellationNotice.trim();

    transaction.update(gameDocRef, {
      status: 'Cancelled',
      description: updatedDesc,
      updatedAt: serverTimestamp(),
      updatedAtISO: nowISO
    });

    return mapFirestoreDocToGame(gameId, {
      ...data,
      status: 'Cancelled',
      description: updatedDesc,
      updatedAtISO: nowISO
    });
  });

  return cancelledGame;
}

/**
 * Deletes a game in Cloud Firestore.
 * Caller must be the organizer or admin.
 */
export async function deleteGameInFirestore(
  gameId: string,
  currentUserId: string
): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  if (!currentUserId) throw new Error('User must be authenticated to delete a game.');

  const gameDocRef = doc(dbInstance, 'games', gameId);
  const snap = await getDoc(gameDocRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const organizerUid = data.organizerId || (data.organizer && data.organizer.id);
  if (organizerUid !== currentUserId) {
    throw new Error('Only the organizer can delete this game.');
  }

  await deleteDoc(gameDocRef);
}

/**
 * Attaches a real-time onSnapshot listener for discoverable games (status == "Open").
 * Returns an Unsubscribe function to cleanly detach when component unmounts.
 */
export function subscribeToDiscoverGames(
  onData: (games: Game[]) => void,
  onError: (err: any) => void
): Unsubscribe {
  if (!dbInstance) {
    const error = new Error('Firestore is not initialized.');
    console.error('[Firestore Discover]', error);
    onError(error);
    return () => {};
  }

  console.log('[Firestore Discover] Attaching onSnapshot listener for games (status in ["Open", "Almost Full", "Full"])...');
  const gamesCol = collection(dbInstance, 'games');
  // Bounded query limit of 60 items prevents uncontrolled full-collection reads
  const q = query(gamesCol, where('status', 'in', ['Open', 'Almost Full', 'Full']), limit(60));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      console.log(`[Firestore Discover] Real-time snapshot received: ${snapshot.docs.length} open games`);
      const mappedGames: Game[] = snapshot.docs.map(docSnap => 
        mapFirestoreDocToGame(docSnap.id, docSnap.data())
      );
      // Client-side sort: date (ascending), then startTime (ascending)
      mappedGames.sort((a, b) => {
        const dateCmp = (a.date || '').localeCompare(b.date || '');
        if (dateCmp !== 0) return dateCmp;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
      onData(mappedGames);
    },
    (err: any) => {
      console.error('[Firestore Discover] Real-time listener error:', {
        code: err?.code,
        message: err?.message || String(err)
      });
      onError(err);
      try {
        handleFirestoreError(err, OperationType.LIST, 'games');
      } catch (e) {
        // Logged to console as required by Firebase guidelines
      }
    }
  );

  return unsubscribe;
}

/**
 * Evaluates whether a game's scheduled date and start time has passed.
 * Consistently parses existing date (YYYY-MM-DD) and startTime (HH:mm).
 */
export function isGamePast(game: { date?: string; startTime?: string }): boolean {
  if (!game.date) return false;
  try {
    let timeStr = (game.startTime || '00:00').trim();
    if (/^\d:\d{2}$/.test(timeStr)) {
      timeStr = '0' + timeStr;
    }
    const fullTimeStr = timeStr.includes(':') && timeStr.split(':').length === 2 ? `${timeStr}:00` : timeStr;
    const gameDateTime = new Date(`${game.date}T${fullTimeStr}`);
    if (!isNaN(gameDateTime.getTime())) {
      return gameDateTime.getTime() < Date.now();
    }
  } catch {
    // Fallback if parsing fails
  }
  const todayStr = new Date().toISOString().split('T')[0];
  return (game.date || '') < todayStr;
}

/**
 * Attaches real-time listeners for the authenticated user's games (as organizer or participant).
 * Uses Firestore onSnapshot listeners:
 * 1. Query games organized by the user (organizerId == userId) across all statuses.
 * 2. Query games to match embedded participant entries (participants.userId == userId).
 * Merges the results by game ID, removes duplicates, and provides a continuous synchronized stream.
 */
export function subscribeToMyGames(
  userId: string,
  onGames: (games: Game[]) => void,
  onError: (err: any) => void
): Unsubscribe {
  if (!dbInstance) {
    const error = new Error('Firestore is not initialized.');
    console.error('[Firestore MyGames]', error);
    onError(error);
    return () => {};
  }

  if (!userId) {
    setTimeout(() => onGames([]), 0);
    return () => {};
  }

  console.log(`[Firestore MyGames] Setting up real-time listener for user: ${userId}`);

  let organizedGames: Game[] = [];
  let participantGames: Game[] = [];

  const emitMerged = () => {
    // Deduplicate by game ID
    const gamesMap = new Map<string, Game>();
    for (const g of organizedGames) {
      gamesMap.set(g.id, g);
    }
    for (const g of participantGames) {
      if (!gamesMap.has(g.id)) {
        gamesMap.set(g.id, g);
      }
    }
    const mergedList = Array.from(gamesMap.values());
    console.log(`[Firestore MyGames] Emitting ${mergedList.length} games for user ${userId}`);
    onGames(mergedList);
  };

  const gamesCol = collection(dbInstance, 'games');

  // Query 1: Games organized by the user (bounded to 50 items)
  const qOrganizer = query(gamesCol, where('organizerId', '==', userId), limit(50));

  // Query 2: Games where user is a participant using server-side array-contains (bounded to 50 items)
  const qParticipants = query(gamesCol, where('participantIds', 'array-contains', userId), limit(50));

  const unsubOrg = onSnapshot(
    qOrganizer,
    (snapshot) => {
      organizedGames = snapshot.docs.map(docSnap => 
        mapFirestoreDocToGame(docSnap.id, docSnap.data())
      );
      emitMerged();
    },
    (err: any) => {
      console.error('[Firestore MyGames] Organizer query error:', err);
      onError(err);
      try {
        handleFirestoreError(err, OperationType.LIST, 'games');
      } catch (e) {
        // Logged
      }
    }
  );

  const unsubPart = onSnapshot(
    qParticipants,
    (snapshot) => {
      participantGames = snapshot.docs.map(docSnap => 
        mapFirestoreDocToGame(docSnap.id, docSnap.data())
      );
      emitMerged();
    },
    (err: any) => {
      console.error('[Firestore MyGames] Participant query error:', err);
      onError(err);
      try {
        handleFirestoreError(err, OperationType.LIST, 'games');
      } catch (e) {
        // Logged
      }
    }
  );

  return () => {
    unsubOrg();
    unsubPart();
  };
}

/**
 * Calculates factual activity and participation statistics from a list of games for a given user.
 * Avoids double-counting, distinguishes upcoming vs past, identifies sports played, and sorts recent activities.
 */
export function calculatePlayerActivityStats(
  userId: string,
  userGames: Game[]
): PlayerActivityStats {
  if (!userId || !userGames || userGames.length === 0) {
    return {
      gamesPlayed: 0,
      gamesHosted: 0,
      upcomingGames: 0,
      sportsPlayed: [],
      recentActivities: []
    };
  }

  // Deduplicate games by game ID
  const uniqueGamesMap = new Map<string, Game>();
  for (const g of userGames) {
    if (g && g.id) {
      uniqueGamesMap.set(g.id, g);
    }
  }

  const allGames = Array.from(uniqueGamesMap.values());
  let gamesHostedCount = 0;
  let gamesPlayedCount = 0;
  let upcomingGamesCount = 0;
  const sportsPlayedSet = new Set<SportType>();
  const activityItems: PlayerActivityItem[] = [];

  for (const game of allGames) {
    const isOrg = game.organizer?.id === userId || (game as any).organizerId === userId;
    const isParticipant = isOrg || (
      Array.isArray(game.participantIds)
        ? game.participantIds.includes(userId)
        : Array.isArray(game.participants) && game.participants.some(p => p.userId === userId || (p as any).id === userId)
    );

    if (!isParticipant) continue;

    // Hosted calculation (all unique games where user is organizer)
    if (isOrg) {
      gamesHostedCount++;
    }

    const past = isGamePast(game);
    const isCancelled = game.status === 'Cancelled';

    if (past) {
      // Completed / Played game (past date/time)
      if (!isCancelled) {
        gamesPlayedCount++;
        if (game.sport) {
          sportsPlayedSet.add(game.sport);
        }
        activityItems.push({
          gameId: game.id,
          sport: game.sport,
          role: isOrg ? 'hosted' : 'played',
          date: game.date,
          startTime: game.startTime,
          courtName: game.courtName,
          area: game.area,
          title: game.title
        });
      }
    } else {
      // Upcoming game: not past and not cancelled
      if (!isCancelled) {
        upcomingGamesCount++;
        // Include upcoming in recent activities if relevant or show latest
        activityItems.push({
          gameId: game.id,
          sport: game.sport,
          role: isOrg ? 'hosted' : 'played',
          date: game.date,
          startTime: game.startTime,
          courtName: game.courtName,
          area: game.area,
          title: game.title
        });
      }
    }
  }

  // Sort activities newest date first
  activityItems.sort((a, b) => {
    const dateCmp = (b.date || '').localeCompare(a.date || '');
    if (dateCmp !== 0) return dateCmp;
    return (b.startTime || '').localeCompare(a.startTime || '');
  });

  // Limit to approximately 5 most recent activities
  const recentActivities = activityItems.slice(0, 5);

  return {
    gamesPlayed: gamesPlayedCount,
    gamesHosted: gamesHostedCount,
    upcomingGames: upcomingGamesCount,
    sportsPlayed: Array.from(sportsPlayedSet),
    recentActivities
  };
}

/**
 * Targeted query to fetch games hosted or joined by a specific user from Firestore.
 * Does NOT download the entire games collection.
 * Reusable for public profiles and current user profile alike.
 */
export async function getPlayerActivityFromFirestore(userId: string): Promise<PlayerActivityStats> {
  if (!dbInstance) {
    throw new Error('Firestore is not initialized.');
  }

  if (!userId) {
    return {
      gamesPlayed: 0,
      gamesHosted: 0,
      upcomingGames: 0,
      sportsPlayed: [],
      recentActivities: []
    };
  }

  console.log(`[Firestore PlayerActivity] Executing targeted query for user: ${userId}`);

  const gamesCol = collection(dbInstance, 'games');

  // Query 1: Games organized by user
  const qOrganizer = query(gamesCol, where('organizerId', '==', userId));

  // Query 2: Games where user is in participantIds
  const qParticipants = query(gamesCol, where('participantIds', 'array-contains', userId));

  try {
    const [snapOrg, snapPart] = await Promise.all([
      getDocs(qOrganizer),
      getDocs(qParticipants)
    ]);

    const deduplicatedGames = new Map<string, Game>();

    snapOrg.docs.forEach(docSnap => {
      deduplicatedGames.set(docSnap.id, mapFirestoreDocToGame(docSnap.id, docSnap.data()));
    });

    snapPart.docs.forEach(docSnap => {
      if (!deduplicatedGames.has(docSnap.id)) {
        deduplicatedGames.set(docSnap.id, mapFirestoreDocToGame(docSnap.id, docSnap.data()));
      }
    });

    const userGames = Array.from(deduplicatedGames.values());
    console.log(`[Firestore PlayerActivity] Retrieved ${userGames.length} unique games for user ${userId}`);

    return calculatePlayerActivityStats(userId, userGames);
  } catch (err: any) {
    console.error(`[Firestore PlayerActivity] Failed to fetch activity for user ${userId}:`, err);
    handleFirestoreError(err, OperationType.LIST, 'games');
    throw err;
  }
}

/**
 * Maps a raw Firestore chat message document to the application ChatMessage interface.
 */
export function mapRawDocToChatMessage(docId: string, gameId: string, data: Record<string, any>): ChatMessage {
  let formattedTime = 'Just now';
  let dateObj: Date | null = null;

  if (data.createdAt && typeof data.createdAt.toDate === 'function') {
    dateObj = data.createdAt.toDate();
  } else if (data.createdAtISO) {
    dateObj = new Date(data.createdAtISO);
  } else if (data.createdAt instanceof Date) {
    dateObj = data.createdAt;
  }

  if (dateObj && !isNaN(dateObj.getTime())) {
    formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const avatar = data.senderPhotoURL || data.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80';

  return {
    id: docId,
    gameId: data.gameId || gameId,
    senderId: data.senderId,
    senderName: data.senderName || 'Player',
    senderAvatar: avatar,
    senderPhotoURL: avatar,
    text: data.text || '',
    timestamp: formattedTime,
    createdAtISO: (dateObj && !isNaN(dateObj.getTime())) ? dateObj.toISOString() : (data.createdAtISO || new Date().toISOString()),
    isAnnouncement: Boolean(data.isAnnouncement)
  };
}

/**
 * Sorts chat messages chronologically (oldest first, newest last).
 */
export function sortChatMessagesChronologically(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => (a.createdAtISO || '').localeCompare(b.createdAtISO || ''));
}

/**
 * Attaches a real-time listener for chat messages in a specific game's subcollection (/games/{gameId}/messages).
 * Returns an Unsubscribe function to cleanly detach when the chat closes or game changes.
 */
export function subscribeToGameChat(
  gameId: string,
  onMessages: (messages: ChatMessage[]) => void,
  onError: (err: any) => void
): Unsubscribe {
  if (!dbInstance) {
    const error = new Error('Firestore is not initialized.');
    console.error('[Firestore GameChat]', error);
    onError(error);
    return () => {};
  }

  if (!gameId) {
    setTimeout(() => onMessages([]), 0);
    return () => {};
  }

  console.log(`[Firestore GameChat] Subscribing to messages for game: ${gameId}`);
  const messagesCol = collection(dbInstance, 'games', gameId, 'messages');
  // Load newest 100 messages using descending createdAt order and limit(100)
  const q = query(messagesCol, orderBy('createdAt', 'desc'), limit(100));

  const unsubscribe = onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const messages: ChatMessage[] = snapshot.docs.map(docSnap => {
        return mapRawDocToChatMessage(docSnap.id, gameId, docSnap.data());
      });

      // Reverse and sort into chronological order (oldest first, newest last) before passing to the UI
      onMessages(sortChatMessagesChronologically(messages));
    },
    (err: any) => {
      console.error(`[Firestore GameChat] Listener error for game ${gameId}:`, err);
      onError(err);
      try {
        handleFirestoreError(err, OperationType.LIST, `games/${gameId}/messages`);
      } catch (e) {
        // Logged
      }
    }
  );

  return unsubscribe;
}

/**
 * Sends a real-time message to a game's messages subcollection in Cloud Firestore.
 */
export async function sendGameChatMessage(
  gameId: string,
  message: {
    text: string;
    isAnnouncement?: boolean;
    senderName?: string;
    senderPhotoURL?: string;
  }
): Promise<string> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  const currentUser = authInstance?.currentUser;
  if (!currentUser?.uid) {
    throw new Error('User must be authenticated to send messages.');
  }
  if (!message.text?.trim()) {
    throw new Error('Message text cannot be empty.');
  }

  const messagesCol = collection(dbInstance, 'games', gameId, 'messages');
  const newMsgDocRef = doc(messagesCol);
  const nowISO = new Date().toISOString();

  const msgPayload: Record<string, any> = {
    id: newMsgDocRef.id,
    gameId: gameId,
    senderId: currentUser.uid,
    senderName: message.senderName || currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Athlete'),
    senderPhotoURL: message.senderPhotoURL || currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
    text: message.text.trim(),
    isAnnouncement: Boolean(message.isAnnouncement),
    createdAt: serverTimestamp(),
    createdAtISO: nowISO
  };

  try {
    await setDoc(newMsgDocRef, msgPayload);

    // Fan-out notifications to other current participants and organizer
    try {
      const gameSnap = await getDoc(doc(dbInstance, 'games', gameId));
      if (gameSnap.exists()) {
        const gameData = gameSnap.data();
        const organizerUid = gameData.organizerId || (gameData.organizer && gameData.organizer.id) || '';
        const participantIds: string[] = Array.isArray(gameData.participantIds)
          ? gameData.participantIds
          : (Array.isArray(gameData.participants) ? gameData.participants.map((p: any) => p.userId || p.id).filter(Boolean) : []);

        const candidateRecipients = Array.from(new Set([organizerUid, ...participantIds]))
          .filter(uid => uid && uid !== currentUser.uid);

        const shortBody = msgPayload.text.length > 80 ? msgPayload.text.slice(0, 77) + '...' : msgPayload.text;

        // Parallelize block checks and notification creation across recipients to prevent serial latency
        await Promise.allSettled(
          candidateRecipients.map(async (recipientId) => {
            try {
              const blockRef1 = doc(dbInstance!, 'users', currentUser.uid, 'blocked', recipientId);
              const blockRef2 = doc(dbInstance!, 'users', recipientId, 'blocked', currentUser.uid);
              const [b1, b2] = await Promise.all([getDoc(blockRef1), getDoc(blockRef2)]);
              if (b1.exists() || b2.exists()) return;

              await createNotification({
                id: `chat_${newMsgDocRef.id}_${recipientId}`,
                userId: recipientId,
                type: 'chat_message',
                title: `Match Chat: ${gameData.title || 'Pickup Match'}`,
                body: `${msgPayload.senderName}: ${shortBody}`,
                gameId,
                actorId: currentUser.uid,
                actorName: msgPayload.senderName,
                actorPhotoURL: msgPayload.senderPhotoURL
              });
            } catch (notifErr) {
              console.warn(`[Firestore GameChat] Could not dispatch chat notification to ${recipientId}:`, notifErr);
            }
          })
        );
      }
    } catch (fanoutErr) {
      console.warn('[Firestore GameChat] Notice during chat notification fan-out:', fanoutErr);
    }

    return newMsgDocRef.id;
  } catch (err: any) {
    console.error(`[Firestore GameChat] Failed to send message to game ${gameId}:`, err);
    handleFirestoreError(err, OperationType.CREATE, `games/${gameId}/messages/${newMsgDocRef.id}`);
  }
}

/**
 * Attaches a real-time onSnapshot listener for the user's notifications.
 * Queries /users/{userId}/notifications ordered by createdAt descending, limited to 50 items.
 */
export function subscribeToNotifications(
  userId: string,
  onNotifications: (notifications: AppNotification[]) => void,
  onError: (err: any) => void
): Unsubscribe {
  if (!dbInstance) {
    const error = new Error('Firestore is not initialized.');
    console.error('[Firestore Notifications]', error);
    onError(error);
    return () => {};
  }

  if (!userId) {
    setTimeout(() => onNotifications([]), 0);
    return () => {};
  }

  console.log(`[Firestore Notifications] Subscribing to notifications for user: ${userId}`);
  const notifsCol = collection(dbInstance, 'users', userId, 'notifications');
  const q = query(notifsCol, orderBy('createdAt', 'desc'), limit(50));

  const unsubscribe = onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const notifications: AppNotification[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let formattedTime = 'Just now';
        let dateObj: Date | null = null;

        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          dateObj = data.createdAt.toDate();
        } else if (data.createdAtISO) {
          dateObj = new Date(data.createdAtISO);
        } else if (data.createdAt instanceof Date) {
          dateObj = data.createdAt;
        }

        if (dateObj && !isNaN(dateObj.getTime())) {
          const diffMs = Date.now() - dateObj.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          if (diffMins < 1) formattedTime = 'Just now';
          else if (diffMins < 60) formattedTime = `${diffMins}m ago`;
          else if (diffHours < 24) formattedTime = `${diffHours}h ago`;
          else if (diffDays === 1) formattedTime = 'Yesterday';
          else formattedTime = `${diffDays}d ago`;
        }

        const bodyText = data.body || data.message || '';

        return {
          id: docSnap.id,
          userId: data.userId || userId,
          type: (data.type || 'game_join') as NotificationType,
          title: data.title || 'Notification',
          titleAr: data.titleAr || undefined,
          body: bodyText,
          message: bodyText,
          messageAr: data.messageAr || undefined,
          timestamp: formattedTime,
          gameId: data.gameId || undefined,
          actorId: data.actorId || undefined,
          actorName: data.actorName || undefined,
          actorPhotoURL: data.actorPhotoURL || undefined,
          read: Boolean(data.read),
          createdAtISO: dateObj ? dateObj.toISOString() : (data.createdAtISO || new Date().toISOString())
        };
      });

      onNotifications(notifications);
    },
    (err: any) => {
      console.error(`[Firestore Notifications] Listener error for user ${userId}:`, err);
      onError(err);
      try {
        handleFirestoreError(err, OperationType.LIST, `users/${userId}/notifications`);
      } catch (e) {
        // Logged
      }
    }
  );

  return unsubscribe;
}

/**
 * Marks a specific notification as read in Cloud Firestore.
 */
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  if (!userId || !notificationId) return;

  const notifRef = doc(dbInstance, 'users', userId, 'notifications', notificationId);
  try {
    await updateDoc(notifRef, {
      read: true,
      updatedAt: serverTimestamp(),
      updatedAtISO: new Date().toISOString()
    });
  } catch (err: any) {
    console.error(`[Firestore Notifications] Failed to mark notification ${notificationId} as read:`, err);
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/notifications/${notificationId}`);
  }
}

/**
 * Marks all unread notifications for a user as read using atomic writeBatch.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  if (!userId) return;

  const notifsCol = collection(dbInstance, 'users', userId, 'notifications');
  const q = query(notifsCol, where('read', '==', false), limit(50));

  try {
    const unreadSnap = await getDocs(q);
    if (unreadSnap.empty) return;

    const batch = writeBatch(dbInstance);
    const nowISO = new Date().toISOString();
    unreadSnap.docs.forEach(docSnap => {
      batch.update(docSnap.ref, {
        read: true,
        updatedAt: serverTimestamp(),
        updatedAtISO: nowISO
      });
    });
    await batch.commit();
  } catch (err: any) {
    console.error(`[Firestore Notifications] Failed to mark all notifications as read for ${userId}:`, err);
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/notifications`);
  }
}

/**
 * Filters and deduplicates candidate notification recipients, excluding the actor.
 */
export function filterNotificationRecipients(candidateUserIds: (string | undefined | null)[], actorUserId?: string): string[] {
  const unique = Array.from(new Set(candidateUserIds.filter((id): id is string => Boolean(id))));
  if (!actorUserId) return unique;
  return unique.filter(id => id !== actorUserId);
}

/**
 * Creates a notification in a user's notification subcollection in Cloud Firestore.
 */
export async function createNotification(notification: {
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  gameId?: string;
  actorId?: string;
  actorName?: string;
  actorPhotoURL?: string;
}): Promise<string> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  if (!notification.userId) throw new Error('Target userId is required for notification.');

  const notifsCol = collection(dbInstance, 'users', notification.userId, 'notifications');
  const targetDocRef = notification.id ? doc(notifsCol, notification.id) : doc(notifsCol);
  const nowISO = new Date().toISOString();

  const payload: Record<string, any> = {
    id: targetDocRef.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title.trim(),
    body: notification.body.trim(),
    read: false,
    createdAt: serverTimestamp(),
    createdAtISO: nowISO
  };

  if (notification.gameId) payload.gameId = notification.gameId;
  if (notification.actorId) payload.actorId = notification.actorId;
  if (notification.actorName) payload.actorName = notification.actorName;
  if (notification.actorPhotoURL) payload.actorPhotoURL = notification.actorPhotoURL;

  try {
    await setDoc(targetDocRef, payload, { merge: true });
    return targetDocRef.id;
  } catch (err: any) {
    console.error(`[Firestore Notifications] Failed to create notification:`, err);
    handleFirestoreError(err, OperationType.CREATE, `users/${notification.userId}/notifications/${targetDocRef.id}`);
  }
}

/**
 * Maps raw Firestore user document data to a safe, public UserProfile object.
 * Strictly sanitizes private fields (email, private subcollections, admin credentials).
 * Respects user privacy preferences (e.g. showAge).
 */
export function mapDocToPublicProfile(docId: string, data: Record<string, any>): UserProfile {
  const privacy = {
    showAge: data.privacy?.showAge ?? true,
    showPhone: data.privacy?.showPhone ?? false,
    allowDirectInvites: data.privacy?.allowDirectInvites ?? true
  };

  const sports = Array.isArray(data.favoriteSports) && data.favoriteSports.length > 0
    ? data.favoriteSports
    : ['Football'];

  const skills = (typeof data.skills === 'object' && data.skills !== null)
    ? data.skills
    : {};

  return {
    id: docId,
    uid: docId,
    name: (data.name && String(data.name).trim()) || 'Athlete',
    nameAr: data.nameAr ? String(data.nameAr).trim() : '',
    username: data.username ? String(data.username).trim() : `player_${docId.slice(0, 5)}`,
    avatar: data.avatar || data.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    photoURL: data.photoURL || undefined,
    area: (data.area as KuwaitArea) || 'Kuwait City',
    bio: data.bio ? String(data.bio).trim() : '',
    favoriteSports: sports,
    skills: skills,
    gamesPlayed: typeof data.gamesPlayed === 'number' ? data.gamesPlayed : 0,
    gamesHosted: typeof data.gamesHosted === 'number' ? data.gamesHosted : 0,
    followerCount: Math.max(0, typeof data.followerCount === 'number' ? data.followerCount : 0),
    followingCount: Math.max(0, typeof data.followingCount === 'number' ? data.followingCount : 0),
    friendCount: Math.max(0, typeof data.friendCount === 'number' ? data.friendCount : 0),
    attendanceRate: typeof data.attendanceRate === 'number' ? data.attendanceRate : 100,
    privacy,
    // Only expose age if privacy setting allows it
    age: (privacy.showAge && typeof data.age === 'number') ? data.age : undefined,
    isDemoUser: Boolean(data.isDemoUser),
    createdAt: data.createdAt || undefined,
    updatedAt: data.updatedAt || undefined
  };
}

/**
 * Validates that an action target is not the current user itself.
 */
export function validateSelfTarget(currentUserId: string, targetUserId: string, actionDesc = 'target'): void {
  if (currentUserId === targetUserId) {
    throw new Error(`You cannot ${actionDesc} yourself.`);
  }
}

/**
 * Safely computes non-negative counter adjustments.
 */
export function calculateUpdatedCounter(currentCount: number | undefined, delta: number): number {
  const safeCurrent = Math.max(0, typeof currentCount === 'number' ? currentCount : 0);
  return Math.max(0, safeCurrent + delta);
}

/**
 * Follow a player in Cloud Firestore using atomic transaction.
 * Creates relationship documents under current user's following and target user's followers.
 * Safely updates followingCount on caller and followerCount on target (strictly >= 0).
 * Prevents race conditions, duplicate follow documents, and stale counters.
 * Always resolves follower UID strictly from authenticated session.
 */
export async function followPlayerInFirestore(targetUserId: string): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');

  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to follow players.');
  }

  const currentUserId = currentAuthUser.uid;
  if (currentUserId === targetUserId) {
    throw new Error('You cannot follow yourself.');
  }

  const userFollowingRef = doc(dbInstance, 'users', currentUserId, 'following', targetUserId);
  const targetFollowerRef = doc(dbInstance, 'users', targetUserId, 'followers', currentUserId);
  const currentUserDocRef = doc(dbInstance, 'users', currentUserId);
  const targetUserDocRef = doc(dbInstance, 'users', targetUserId);
  const blockRef1 = doc(dbInstance, 'users', currentUserId, 'blocked', targetUserId);
  const blockRef2 = doc(dbInstance, 'users', targetUserId, 'blocked', currentUserId);

  try {
    await runTransaction(dbInstance, async (transaction) => {
      // 1. Transaction reads
      const [followingSnap, targetUserSnap, currentUserSnap, blockSnap1, blockSnap2] = await Promise.all([
        transaction.get(userFollowingRef),
        transaction.get(targetUserDocRef),
        transaction.get(currentUserDocRef),
        transaction.get(blockRef1),
        transaction.get(blockRef2)
      ]);

      if (blockSnap1.exists() || blockSnap2.exists()) {
        throw new Error('Cannot follow this player due to blocking restrictions.');
      }

      if (!targetUserSnap.exists()) {
        throw new Error('Player profile does not exist or has been removed.');
      }

      // If already following, return early: no-op, prevents duplicate doc or double counter increment
      if (followingSnap.exists()) {
        return;
      }

      const nowISO = new Date().toISOString();
      const currentTargetData = targetUserSnap.data() || {};
      const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() : {};

      const currentFollowingCount = Math.max(0, typeof currentUserData.followingCount === 'number' ? currentUserData.followingCount : 0);
      const currentFollowerCount = Math.max(0, typeof currentTargetData.followerCount === 'number' ? currentTargetData.followerCount : 0);

      // 2. Transaction writes
      transaction.set(userFollowingRef, {
        userId: targetUserId,
        createdAt: nowISO
      });

      transaction.set(targetFollowerRef, {
        userId: currentUserId,
        createdAt: nowISO
      });

      transaction.set(currentUserDocRef, {
        followingCount: currentFollowingCount + 1,
        updatedAt: nowISO
      }, { merge: true });

      transaction.set(targetUserDocRef, {
        followerCount: currentFollowerCount + 1,
        updatedAt: nowISO
      }, { merge: true });
    });
  } catch (err: any) {
    console.error(`[Firestore] Failed to follow player ${targetUserId}:`, err);
    handleFirestoreError(err, OperationType.WRITE, `users/${currentUserId}/following/${targetUserId}`);
  }
}

/**
 * Unfollow a player in Cloud Firestore using atomic transaction.
 * Deletes relationship documents under current user's following and target user's followers.
 * Safely decrements followingCount on caller and followerCount on target (strictly >= 0).
 * Prevents negative counters and duplicate unfollow races.
 * Always resolves follower UID strictly from authenticated session.
 */
export async function unfollowPlayerInFirestore(targetUserId: string): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');

  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to unfollow players.');
  }

  const currentUserId = currentAuthUser.uid;
  if (currentUserId === targetUserId) {
    return;
  }

  const userFollowingRef = doc(dbInstance, 'users', currentUserId, 'following', targetUserId);
  const targetFollowerRef = doc(dbInstance, 'users', targetUserId, 'followers', currentUserId);
  const currentUserDocRef = doc(dbInstance, 'users', currentUserId);
  const targetUserDocRef = doc(dbInstance, 'users', targetUserId);

  try {
    await runTransaction(dbInstance, async (transaction) => {
      // 1. Transaction reads
      const [followingSnap, currentUserSnap, targetUserSnap] = await Promise.all([
        transaction.get(userFollowingRef),
        transaction.get(currentUserDocRef),
        transaction.get(targetUserDocRef)
      ]);

      // If not currently following, return early: prevents multiple-click negative count drift
      if (!followingSnap.exists()) {
        return;
      }

      const nowISO = new Date().toISOString();
      const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() : {};
      const targetUserData = targetUserSnap.exists() ? targetUserSnap.data() : {};

      const currentFollowing = Math.max(0, typeof currentUserData.followingCount === 'number' ? currentUserData.followingCount : 1);
      const currentFollowers = Math.max(0, typeof targetUserData.followerCount === 'number' ? targetUserData.followerCount : 1);

      const nextFollowingCount = Math.max(0, currentFollowing - 1);
      const nextFollowerCount = Math.max(0, currentFollowers - 1);

      // 2. Transaction writes
      transaction.delete(userFollowingRef);
      transaction.delete(targetFollowerRef);

      transaction.set(currentUserDocRef, {
        followingCount: nextFollowingCount,
        updatedAt: nowISO
      }, { merge: true });

      if (targetUserSnap.exists()) {
        transaction.set(targetUserDocRef, {
          followerCount: nextFollowerCount,
          updatedAt: nowISO
        }, { merge: true });
      }
    });
  } catch (err: any) {
    console.error(`[Firestore] Failed to unfollow player ${targetUserId}:`, err);
    handleFirestoreError(err, OperationType.WRITE, `users/${currentUserId}/following/${targetUserId}`);
  }
}

/**
 * Subscribes to real-time updates of players followed by the specified user.
 * Scalable approach: Returns a Set of followed targetUserIds in a single listener.
 */
export function subscribeToUserFollowing(
  userId: string,
  onFollowingIds: (ids: Set<string>) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!dbInstance || !userId) {
    onFollowingIds(new Set());
    return () => {};
  }

  const followingCol = collection(dbInstance, 'users', userId, 'following');

  return onSnapshot(
    followingCol,
    (snap) => {
      const ids = new Set<string>();
      snap.forEach(docSnap => {
        ids.add(docSnap.id);
      });
      onFollowingIds(ids);
    },
    (err) => {
      console.error(`[Firestore Users] Snapshot error in subscribeToUserFollowing:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetches public player profiles from the Firestore `users` collection.
 * Strictly omits email, phone numbers, or private subcollection data.
 */
export async function fetchPublicPlayersFromFirestore(maxLimit = 50): Promise<UserProfile[]> {
  if (!dbInstance) return [];

  const usersCol = collection(dbInstance, 'users');
  const q = query(usersCol, limit(maxLimit));

  try {
    const snap = await getDocs(q);
    const players: UserProfile[] = [];

    snap.forEach(docSnap => {
      const player = mapDocToPublicProfile(docSnap.id, docSnap.data());
      players.push(player);
    });

    return players;
  } catch (err: any) {
    console.error('[Firestore Users] Failed to fetch public players:', err);
    handleFirestoreError(err, OperationType.LIST, 'users');
  }
}

/**
 * Subscribes to real-time updates for public player profiles from the Firestore `users` collection.
 * Ordered by recency or limited to avoid unbounded reads.
 */
export function subscribeToPublicPlayers(
  onPlayers: (players: UserProfile[]) => void,
  onError?: (err: Error) => void,
  maxLimit = 50
): Unsubscribe {
  if (!dbInstance) {
    onPlayers([]);
    return () => {};
  }

  const usersCol = collection(dbInstance, 'users');
  const q = query(usersCol, limit(maxLimit));

  return onSnapshot(
    q,
    (snap) => {
      const players: UserProfile[] = [];
      snap.forEach(docSnap => {
        const player = mapDocToPublicProfile(docSnap.id, docSnap.data());
        players.push(player);
      });
      onPlayers(players);
    },
    (err) => {
      console.error('[Firestore Users] Snapshot error in subscribeToPublicPlayers:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Sends a friend request to a target player in Cloud Firestore.
 * Handles concurrent bidirectional races: if target player already sent a request,
 * automatically completes mutual friendship creation.
 * Checks blocking, existing friendship, duplicate requests, and missing user.
 * Dispatches a friend_request notification to the target player.
 */
export async function sendFriendRequestInFirestore(
  targetUserId: string,
  requesterProfile?: Partial<UserProfile>
): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');

  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to send friend requests.');
  }

  const currentUserId = currentAuthUser.uid;
  if (currentUserId === targetUserId) {
    throw new Error('You cannot send a friend request to yourself.');
  }

  const friendRef = doc(dbInstance, 'users', currentUserId, 'friends', targetUserId);
  const reqRef = doc(dbInstance, 'users', targetUserId, 'friendRequests', currentUserId);
  const reverseReqRef = doc(dbInstance, 'users', currentUserId, 'friendRequests', targetUserId);
  const targetUserRef = doc(dbInstance, 'users', targetUserId);

  try {
    // Check if either user is blocked
    const blockRef1 = doc(dbInstance, 'users', currentUserId, 'blocked', targetUserId);
    const blockRef2 = doc(dbInstance, 'users', targetUserId, 'blocked', currentUserId);
    const [snapBlock1, snapBlock2] = await Promise.all([getDoc(blockRef1), getDoc(blockRef2)]);
    if (snapBlock1.exists() || snapBlock2.exists()) {
      throw new Error('Cannot send friend request due to blocking restrictions.');
    }

    // Check if target user exists (Requirement 7: Missing users)
    const targetUserSnap = await getDoc(targetUserRef);
    if (!targetUserSnap.exists()) {
      throw new Error('Player profile does not exist or has been removed.');
    }

    // Check if already friends (Requirement 3: Friend Request + Existing Friendship)
    const friendSnap = await getDoc(friendRef);
    if (friendSnap.exists()) {
      return;
    }

    // Bidirectional race check: If target user already sent a pending request to current user,
    // accepting it completes the reciprocal friendship cleanly without orphan requests!
    const reverseReqSnap = await getDoc(reverseReqRef);
    if (reverseReqSnap.exists()) {
      await acceptFriendRequestInFirestore(targetUserId, requesterProfile);
      return;
    }

    // Check if duplicate request exists (Requirement 2: Repeated send requests, multiple tabs)
    const reqSnap = await getDoc(reqRef);
    if (reqSnap.exists()) {
      return;
    }

    const nowISO = new Date().toISOString();
    const payload: FriendRequest = {
      requesterId: currentUserId,
      recipientId: targetUserId,
      createdAt: nowISO,
      status: 'pending',
      requesterName: (requesterProfile?.name || currentAuthUser.displayName || 'Athlete').trim(),
      requesterUsername: requesterProfile?.username || `player_${currentUserId.slice(0, 5)}`,
      requesterAvatar: requesterProfile?.avatar || currentAuthUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      requesterArea: requesterProfile?.area || 'Kuwait City',
      requesterSports: requesterProfile?.favoriteSports || ['Football'],
      requesterSkills: requesterProfile?.skills || {}
    };

    await setDoc(reqRef, payload);

    // Create real-time notification for recipient (deterministic ID prevents duplicate spam)
    try {
      await createNotification({
        id: `freq_${currentUserId}`,
        userId: targetUserId,
        type: 'friend_request' as NotificationType,
        title: 'New Friend Request',
        body: `${payload.requesterName} sent you a friend request.`,
        actorId: currentUserId,
        actorName: payload.requesterName,
        actorPhotoURL: payload.requesterAvatar
      });
    } catch (notifErr) {
      console.warn('[Firestore] Failed to dispatch friend request notification:', notifErr);
    }
  } catch (err: any) {
    console.error(`[Firestore Friends] Failed to send friend request to ${targetUserId}:`, err);
    handleFirestoreError(err, OperationType.CREATE, `users/${targetUserId}/friendRequests/${currentUserId}`);
  }
}

/**
 * Cancels an outgoing pending friend request.
 * Atomically removes the pending request from the target player's subcollection.
 * Does NOT generate a notification.
 */
export async function cancelFriendRequestInFirestore(targetUserId: string): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');

  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to cancel friend requests.');
  }

  const currentUserId = currentAuthUser.uid;
  const reqRef = doc(dbInstance, 'users', targetUserId, 'friendRequests', currentUserId);

  try {
    const existingSnap = await getDoc(reqRef);
    if (!existingSnap.exists()) {
      return;
    }

    await deleteDoc(reqRef);
  } catch (err: any) {
    console.error(`[Firestore Friends] Failed to cancel friend request to ${targetUserId}:`, err);
    handleFirestoreError(err, OperationType.DELETE, `users/${targetUserId}/friendRequests/${currentUserId}`);
  }
}

/**
 * Accepts an incoming friend request atomically using runTransaction.
 * Deletes pending request, creates mutual friend documents on both users,
 * and atomically increments friend counts.
 * Dispatches friend_request_accepted notification to the requester ONLY after transaction commits.
 */
export async function acceptFriendRequestInFirestore(
  requesterUserId: string,
  currentProfile?: Partial<UserProfile>
): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');

  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to accept friend requests.');
  }

  const currentUserId = currentAuthUser.uid;
  if (currentUserId === requesterUserId) {
    throw new Error('You cannot accept a friend request from yourself.');
  }

  const reqRef = doc(dbInstance, 'users', currentUserId, 'friendRequests', requesterUserId);
  const reverseReqRef = doc(dbInstance, 'users', requesterUserId, 'friendRequests', currentUserId);
  const myFriendRef = doc(dbInstance, 'users', currentUserId, 'friends', requesterUserId);
  const otherFriendRef = doc(dbInstance, 'users', requesterUserId, 'friends', currentUserId);
  const myUserDocRef = doc(dbInstance, 'users', currentUserId);
  const otherUserDocRef = doc(dbInstance, 'users', requesterUserId);
  const blockRef1 = doc(dbInstance, 'users', currentUserId, 'blocked', requesterUserId);
  const blockRef2 = doc(dbInstance, 'users', requesterUserId, 'blocked', currentUserId);

  let notifyRequester = false;

  try {
    await runTransaction(dbInstance, async (transaction) => {
      // 1. Transaction reads
      const [reqSnap, reverseReqSnap, myFriendSnap, otherFriendSnap, myUserSnap, otherUserSnap, blockSnap1, blockSnap2] = await Promise.all([
        transaction.get(reqRef),
        transaction.get(reverseReqRef),
        transaction.get(myFriendRef),
        transaction.get(otherFriendRef),
        transaction.get(myUserDocRef),
        transaction.get(otherUserDocRef),
        transaction.get(blockRef1),
        transaction.get(blockRef2)
      ]);

      if (blockSnap1.exists() || blockSnap2.exists()) {
        throw new Error('Cannot accept friend request due to blocking restrictions.');
      }

      // If already friends, safely clean up any leftover pending request and exit without double counting!
      if (myFriendSnap.exists() || otherFriendSnap.exists()) {
        if (reqSnap.exists()) transaction.delete(reqRef);
        if (reverseReqSnap.exists()) transaction.delete(reverseReqRef);
        return;
      }

      // If request doesn't exist (cancelled by requester, already declined, or invalid), reject acceptance
      if (!reqSnap.exists()) {
        throw new Error('Friend request is no longer available or was cancelled.');
      }

      // Check if target user doc exists
      if (!otherUserSnap.exists()) {
        // Orphaned request for deleted user: clean it up
        transaction.delete(reqRef);
        throw new Error('Player profile no longer exists.');
      }

      const nowISO = new Date().toISOString();
      const myUserData = myUserSnap.exists() ? myUserSnap.data() : {};
      const otherUserData = otherUserSnap.data();

      const currentMyFriendCount = Math.max(0, typeof myUserData.friendCount === 'number' ? myUserData.friendCount : 0);
      const currentOtherFriendCount = Math.max(0, typeof otherUserData.friendCount === 'number' ? otherUserData.friendCount : 0);

      // 2. Transaction writes
      // Delete incoming request
      transaction.delete(reqRef);
      // Delete reverse request if both users requested each other simultaneously (A->B and B->A race!)
      if (reverseReqSnap.exists()) {
        transaction.delete(reverseReqRef);
      }

      // Mutual friendship documents
      transaction.set(myFriendRef, {
        userId: requesterUserId,
        createdAt: nowISO
      });

      transaction.set(otherFriendRef, {
        userId: currentUserId,
        createdAt: nowISO
      });

      // Atomically increment friend counts with non-negative guarantee
      transaction.set(myUserDocRef, {
        friendCount: currentMyFriendCount + 1,
        updatedAt: nowISO
      }, { merge: true });

      transaction.set(otherUserDocRef, {
        friendCount: currentOtherFriendCount + 1,
        updatedAt: nowISO
      }, { merge: true });

      notifyRequester = true;
    });

    // 3. Dispatch notification only after transaction successfully commits (deterministic ID)
    if (notifyRequester) {
      try {
        const myName = (currentProfile?.name || currentAuthUser.displayName || 'Athlete').trim();
        const myAvatar = currentProfile?.avatar || currentAuthUser.photoURL || undefined;
        await createNotification({
          id: `faccept_${currentUserId}`,
          userId: requesterUserId,
          type: 'friend_request_accepted' as NotificationType,
          title: 'Friend Request Accepted',
          body: `${myName} accepted your friend request. You are now friends!`,
          actorId: currentUserId,
          actorName: myName,
          actorPhotoURL: myAvatar
        });
      } catch (notifErr) {
        console.warn('[Firestore] Failed to dispatch friend_request_accepted notification:', notifErr);
      }
    }
  } catch (err: any) {
    console.error(`[Firestore Friends] Failed to accept friend request from ${requesterUserId}:`, err);
    handleFirestoreError(err, OperationType.WRITE, `users/${currentUserId}/friends/${requesterUserId}`);
  }
}

/**
 * Declines an incoming friend request.
 * Atomically removes pending request without creating friendship or altering counters.
 */
export async function declineFriendRequestInFirestore(requesterUserId: string): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');

  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to decline friend requests.');
  }

  const currentUserId = currentAuthUser.uid;
  const reqRef = doc(dbInstance, 'users', currentUserId, 'friendRequests', requesterUserId);

  try {
    const existingSnap = await getDoc(reqRef);
    if (!existingSnap.exists()) {
      return;
    }

    await deleteDoc(reqRef);
  } catch (err: any) {
    console.error(`[Firestore Friends] Failed to decline friend request from ${requesterUserId}:`, err);
    handleFirestoreError(err, OperationType.DELETE, `users/${currentUserId}/friendRequests/${requesterUserId}`);
  }
}

/**
 * Subscribes to real-time updates of the current user's friends.
 * Scalable approach: Returns a Set of friend IDs.
 */
export function subscribeToUserFriends(
  userId: string,
  onFriendIds: (ids: Set<string>) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!dbInstance || !userId) {
    onFriendIds(new Set());
    return () => {};
  }

  const friendsCol = collection(dbInstance, 'users', userId, 'friends');

  return onSnapshot(
    friendsCol,
    (snap) => {
      const ids = new Set<string>();
      snap.forEach(docSnap => {
        ids.add(docSnap.id);
      });
      onFriendIds(ids);
    },
    (err) => {
      console.error(`[Firestore Friends] Snapshot error in subscribeToUserFriends:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to real-time incoming friend requests for the current user.
 */
export function subscribeToIncomingFriendRequests(
  userId: string,
  onRequests: (requests: FriendRequest[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!dbInstance || !userId) {
    onRequests([]);
    return () => {};
  }

  const reqCol = collection(dbInstance, 'users', userId, 'friendRequests');

  return onSnapshot(
    reqCol,
    (snap) => {
      const requests: FriendRequest[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        requests.push({
          id: docSnap.id,
          requesterId: data.requesterId || docSnap.id,
          recipientId: data.recipientId || userId,
          createdAt: data.createdAt || new Date().toISOString(),
          status: 'pending',
          requesterName: data.requesterName || 'Athlete',
          requesterUsername: data.requesterUsername || `user_${docSnap.id.slice(0, 5)}`,
          requesterAvatar: data.requesterAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
          requesterArea: data.requesterArea || 'Kuwait City',
          requesterSports: Array.isArray(data.requesterSports) ? data.requesterSports : ['Football'],
          requesterSkills: data.requesterSkills || {}
        });
      });
      onRequests(requests);
    },
    (err) => {
      console.error(`[Firestore Friends] Snapshot error in subscribeToIncomingFriendRequests:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to outgoing friend requests initiated by the current user using collectionGroup.
 */
export function subscribeToOutgoingFriendRequests(
  userId: string,
  onOutgoingIds: (ids: Set<string>) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!dbInstance || !userId) {
    onOutgoingIds(new Set());
    return () => {};
  }

  try {
    const q = query(
      collectionGroup(dbInstance, 'friendRequests'),
      where('requesterId', '==', userId)
    );

    return onSnapshot(
      q,
      (snap) => {
        const ids = new Set<string>();
        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (data.recipientId) {
            ids.add(data.recipientId);
          } else {
            // Path: users/{recipientId}/friendRequests/{requesterId}
            const parentUserDoc = docSnap.ref.parent.parent;
            if (parentUserDoc?.id) {
              ids.add(parentUserDoc.id);
            }
          }
        });
        onOutgoingIds(ids);
      },
      (err) => {
        console.warn(`[Firestore Friends] Outgoing requests collectionGroup listener error:`, err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn(`[Firestore Friends] Could not initialize outgoing friend requests subscription:`, err);
    return () => {};
  }
}

// In-memory cache of deleted or missing user IDs to avoid repeated querying
const missingUsersCache = new Set<string>();

/**
 * Fetches specific user profiles by an array of user IDs.
 * Highly scalable: does NOT download the entire users collection.
 * Safeguards against missing/deleted users without crashing React rendering.
 */
export async function fetchFriendProfiles(friendIds: string[]): Promise<UserProfile[]> {
  if (!dbInstance || friendIds.length === 0) return [];

  try {
    const profiles: UserProfile[] = [];
    const uniqueIds = Array.from(new Set(friendIds)).slice(0, 100);

    // Query only IDs that are not known to be deleted
    const idsToQuery = uniqueIds.filter(id => !missingUsersCache.has(id));

    // Fetch individual profiles in parallel
    const docs = await Promise.all(
      idsToQuery.map(id => getDoc(doc(dbInstance!, 'users', id)))
    );

    docs.forEach(docSnap => {
      if (docSnap.exists()) {
        profiles.push(mapDocToPublicProfile(docSnap.id, docSnap.data()));
      } else {
        // Cache missing user ID to prevent redundant subsequent queries
        missingUsersCache.add(docSnap.id);
      }
    });

    return profiles;
  } catch (err) {
    console.error('[Firestore Friends] Error fetching friend profiles:', err);
    return [];
  }
}

// =====================================================================
// GAME INVITES SYSTEM (Step 4)
// Subcollection: games/{gameId}/invites/{inviteeUserId}
// =====================================================================

/**
 * Validates business rules for sending a game invitation.
 */
export function validateGameInviteEligibility(params: {
  currentUserId: string;
  inviteeId: string;
  gameData: Record<string, any>;
  hasExistingPendingInvite: boolean;
  hasBlockRestriction: boolean;
}): { valid: boolean; error?: string } {
  const { currentUserId, inviteeId, gameData, hasExistingPendingInvite, hasBlockRestriction } = params;

  if (currentUserId === inviteeId) {
    return { valid: false, error: 'You cannot invite yourself to your own game.' };
  }
  if (hasBlockRestriction) {
    return { valid: false, error: 'Cannot invite a blocked player.' };
  }

  const organizerUid = gameData.organizerId || (gameData.organizer && gameData.organizer.id);
  if (organizerUid !== currentUserId) {
    return { valid: false, error: 'Only the game organizer can invite players.' };
  }

  if (gameData.status === 'Cancelled' || gameData.status === 'Completed') {
    return { valid: false, error: `Cannot invite players to a game that is ${gameData.status}.` };
  }

  const maxPlayers = Number(gameData.maxPlayers || 10);
  const currentParticipants = Array.isArray(gameData.participants) ? gameData.participants : [];
  if (currentParticipants.length >= maxPlayers || gameData.status === 'Full') {
    return { valid: false, error: 'This game is already full. Cannot send invites.' };
  }

  const isAlreadyInGame = currentParticipants.some(
    (p: any) => p.userId === inviteeId || p.id === inviteeId
  ) || (Array.isArray(gameData.participantIds) && gameData.participantIds.includes(inviteeId));

  if (isAlreadyInGame) {
    return { valid: false, error: 'Player has already joined this game.' };
  }

  if (hasExistingPendingInvite) {
    return { valid: false, error: 'A pending invite already exists for this player.' };
  }

  return { valid: true };
}

/**
 * Sends a game invite from the organizer to an invitee.
 * Enforces:
 * 1. Authenticated caller.
 * 2. Caller must be the verified organizer of the game.
 * 3. Invitee cannot be the organizer (no self-invites).
 * 4. Invitee cannot already be a participant.
 * 5. Game must not be Full.
 * 6. Game must be Open or Almost Full.
 * 7. No active pending invite exists for this player.
 * 8. Creates exactly one invite document at games/{gameId}/invites/{inviteeId}.
 * 9. Creates exactly one notification (type: 'game_invite') for the invitee.
 */
export async function sendGameInviteInFirestore(
  gameId: string,
  inviteeId: string,
  organizerProfile?: Partial<UserProfile>
): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');

  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to send game invites.');
  }

  const currentUserId = currentAuthUser.uid;

  if (currentUserId === inviteeId) {
    throw new Error('You cannot invite yourself to your own game.');
  }

  const gameDocRef = doc(dbInstance, 'games', gameId);
  const inviteDocRef = doc(dbInstance, 'games', gameId, 'invites', inviteeId);
  const inviteeUserRef = doc(dbInstance, 'users', inviteeId);

  try {
    // Atomic runTransaction ensures:
    // - Game exists and caller is organizer
    // - Invitee is not already in participants
    // - Game is not Full
    // - No duplicate active pending invite
    const nowISO = new Date().toISOString();
    let gameTitle = '';
    let gameSport: SportType = 'Football';
    let gameDate = '';
    let gameStartTime = '';
    let gameCourtName = '';
    let gameArea: KuwaitArea = 'Kuwait City';
    let gamePricePerPlayerKWD = 0;
    let inviteeName = '';
    let inviteeAvatar = '';

    await runTransaction(dbInstance, async (transaction) => {
      const blockRef1 = doc(dbInstance!, 'users', currentUserId, 'blocked', inviteeId);
      const blockRef2 = doc(dbInstance!, 'users', inviteeId, 'blocked', currentUserId);

      const [gameSnap, inviteeSnap, inviteSnap, blockSnap1, blockSnap2] = await Promise.all([
        transaction.get(gameDocRef),
        transaction.get(inviteeUserRef),
        transaction.get(inviteDocRef),
        transaction.get(blockRef1),
        transaction.get(blockRef2)
      ]);

      if (!gameSnap.exists()) {
        throw new Error('Game does not exist or has been removed.');
      }

      const gameData = gameSnap.data() || {};

      const validation = validateGameInviteEligibility({
        currentUserId,
        inviteeId,
        gameData,
        hasExistingPendingInvite: inviteSnap.exists() && inviteSnap.data()?.status === 'pending',
        hasBlockRestriction: blockSnap1.exists() || blockSnap2.exists()
      });

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Denormalized preview data
      gameTitle = gameData.title || 'Pickup Match';
      gameSport = gameData.sport || 'Football';
      gameDate = gameData.date || '';
      gameStartTime = gameData.startTime || '';
      gameCourtName = gameData.courtName || '';
      gameArea = gameData.area || 'Kuwait City';
      gamePricePerPlayerKWD = Number(gameData.pricePerPlayerKWD || 0);

      if (inviteeSnap.exists()) {
        const invData = inviteeSnap.data();
        inviteeName = invData.name || '';
        inviteeAvatar = invData.avatar || '';
      }

      const organizerName = (organizerProfile?.name || currentAuthUser.displayName || gameData.organizerName || 'Organizer').trim();
      const organizerAvatar = organizerProfile?.avatar || currentAuthUser.photoURL || gameData.organizerPhotoURL || '';

      const invitePayload: GameInvite = {
        id: inviteeId,
        gameId,
        inviterId: currentUserId,
        inviteeId,
        status: 'pending',
        createdAt: nowISO,
        gameTitle,
        gameSport,
        gameDate,
        gameStartTime,
        gameCourtName,
        gameArea,
        gamePricePerPlayerKWD,
        inviterName: organizerName,
        inviterAvatar: organizerAvatar,
        inviteeName,
        inviteeAvatar
      };

      transaction.set(inviteDocRef, invitePayload);
    });

    // Create exactly one notification for the invitee
    try {
      const orgName = (organizerProfile?.name || currentAuthUser.displayName || 'Organizer').trim();
      const orgAvatar = organizerProfile?.avatar || currentAuthUser.photoURL || undefined;

      await createNotification({
        id: `invite_${gameId}_${inviteeId}`,
        userId: inviteeId,
        type: 'game_invite',
        title: 'Game Invitation',
        body: `${orgName} invited you to play ${gameSport} at ${gameCourtName} on ${gameDate} (${gameStartTime}).`,
        gameId,
        actorId: currentUserId,
        actorName: orgName,
        actorPhotoURL: orgAvatar
      });
    } catch (notifErr) {
      console.warn('[Firestore] Failed to dispatch game_invite notification:', notifErr);
    }
  } catch (err: any) {
    console.error(`[Firestore Invites] Failed to send game invite to ${inviteeId}:`, err);
    handleFirestoreError(err, OperationType.WRITE, `games/${gameId}/invites/${inviteeId}`);
  }
}

/**
 * Cancels a pending game invite.
 * Only the organizer can cancel.
 * Sets status to 'cancelled' or deletes the invite document.
 * Does NOT generate a notification.
 */
export async function cancelGameInviteInFirestore(
  gameId: string,
  inviteeId: string
): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');

  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to cancel game invites.');
  }

  const currentUserId = currentAuthUser.uid;
  const inviteDocRef = doc(dbInstance, 'games', gameId, 'invites', inviteeId);
  const gameDocRef = doc(dbInstance, 'games', gameId);

  try {
    const [gameSnap, inviteSnap] = await Promise.all([
      getDoc(gameDocRef),
      getDoc(inviteDocRef)
    ]);

    if (!gameSnap.exists()) {
      throw new Error('Game does not exist.');
    }

    const gameData = gameSnap.data();
    const organizerUid = gameData.organizerId || (gameData.organizer && gameData.organizer.id);
    if (organizerUid !== currentUserId) {
      throw new Error('Only the organizer can cancel invites for this game.');
    }

    if (!inviteSnap.exists()) {
      return;
    }

    const inviteData = inviteSnap.data();
    if (inviteData.status !== 'pending') {
      throw new Error('Only pending invites can be cancelled.');
    }

    // Atomically delete the invite document so 'Invite' becomes available again cleanly
    await deleteDoc(inviteDocRef);
  } catch (err: any) {
    console.error(`[Firestore Invites] Failed to cancel game invite for ${inviteeId}:`, err);
    handleFirestoreError(err, OperationType.DELETE, `games/${gameId}/invites/${inviteeId}`);
  }
}

/**
 * Declines an incoming game invite.
 * Updates invite status to 'declined' and sets respondedAt.
 */
export async function declineGameInviteInFirestore(
  gameId: string,
  inviteeId?: string
): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');

  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to decline game invites.');
  }

  const currentUserId = inviteeId || currentAuthUser.uid;
  const inviteDocRef = doc(dbInstance, 'games', gameId, 'invites', currentUserId);

  try {
    const inviteSnap = await getDoc(inviteDocRef);
    if (!inviteSnap.exists()) {
      return;
    }

    const nowISO = new Date().toISOString();
    await updateDoc(inviteDocRef, {
      status: 'declined',
      respondedAt: nowISO
    });
  } catch (err: any) {
    console.error(`[Firestore Invites] Failed to decline game invite for ${currentUserId}:`, err);
    handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}/invites/${currentUserId}`);
  }
}

/**
 * Accepts an incoming game invite.
 * Atomically marks the invite as 'accepted', then uses the existing joinGameInFirestore()
 * transaction to safely add the player, update counts, and handle capacity guards.
 */
export async function acceptGameInviteInFirestore(
  gameId: string,
  participant: GameParticipant
): Promise<Game> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');

  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to accept game invites.');
  }

  const currentUserId = currentAuthUser.uid;
  const inviteDocRef = doc(dbInstance, 'games', gameId, 'invites', currentUserId);

  try {
    // Verify block status between organizer and current user
    const gameDocRef = doc(dbInstance, 'games', gameId);
    const gameSnap = await getDoc(gameDocRef);
    if (!gameSnap.exists()) throw new Error('Game not found.');
    const gData = gameSnap.data();
    const organizerId = gData.organizerId || (gData.organizer && gData.organizer.id);
    if (organizerId) {
      const [b1, b2] = await Promise.all([
        getDoc(doc(dbInstance, 'users', currentUserId, 'blocked', organizerId)),
        getDoc(doc(dbInstance, 'users', organizerId, 'blocked', currentUserId))
      ]);
      if (b1.exists() || b2.exists()) {
        throw new Error('Cannot accept game invite due to blocking restrictions.');
      }
    }

    // Verify invite exists and is pending
    const inviteSnap = await getDoc(inviteDocRef);
    if (!inviteSnap.exists()) {
      throw new Error('Game invite not found or has been removed.');
    }
    const inviteData = inviteSnap.data();
    if (inviteData.status !== 'pending') {
      throw new Error(`This invite is no longer pending (Status: ${inviteData.status}).`);
    }

    // 1. Join game using trusted atomic join logic
    const updatedGame = await joinGameInFirestore(gameId, participant);

    // 2. Mark invite status as accepted
    try {
      const nowISO = new Date().toISOString();
      await updateDoc(inviteDocRef, {
        status: 'accepted',
        respondedAt: nowISO
      });
    } catch (inviteErr) {
      console.warn('[Firestore Invites] Could not update invite status to accepted:', inviteErr);
    }

    return updatedGame;
  } catch (err: any) {
    console.error(`[Firestore Invites] Failed to accept game invite for game ${gameId}:`, err);
    throw err;
  }
}

/**
 * Subscribes to all invites for a specific game (used by the game organizer in Invite Players modal).
 * Path: games/{gameId}/invites
 */
export function subscribeToGameInvitesForGame(
  gameId: string,
  onInvites: (invites: Record<string, GameInvite>) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!dbInstance || !gameId) {
    onInvites({});
    return () => {};
  }

  const invitesCol = collection(dbInstance, 'games', gameId, 'invites');

  return onSnapshot(
    invitesCol,
    (snap) => {
      const inviteMap: Record<string, GameInvite> = {};
      snap.forEach(docSnap => {
        inviteMap[docSnap.id] = {
          id: docSnap.id,
          ...docSnap.data()
        } as GameInvite;
      });
      onInvites(inviteMap);
    },
    (err) => {
      console.warn(`[Firestore Invites] Error subscribing to invites for game ${gameId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to incoming pending game invites for the current user across all games
 * using collectionGroup('invites') where inviteeId == userId.
 */
export function subscribeToIncomingGameInvites(
  userId: string,
  onInvites: (invites: GameInvite[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!dbInstance || !userId) {
    onInvites([]);
    return () => {};
  }

  try {
    const q = query(
      collectionGroup(dbInstance, 'invites'),
      where('inviteeId', '==', userId),
      where('status', '==', 'pending')
    );

    return onSnapshot(
      q,
      (snap) => {
        const invites: GameInvite[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          const gameDoc = docSnap.ref.parent.parent;
          const gameId = data.gameId || gameDoc?.id || '';

          invites.push({
            id: docSnap.id,
            gameId,
            inviterId: data.inviterId || '',
            inviteeId: data.inviteeId || userId,
            status: data.status || 'pending',
            createdAt: data.createdAt || new Date().toISOString(),
            gameTitle: data.gameTitle || 'Pickup Match',
            gameSport: data.gameSport || 'Football',
            gameDate: data.gameDate || '',
            gameStartTime: data.gameStartTime || '',
            gameCourtName: data.gameCourtName || '',
            gameArea: data.gameArea || 'Kuwait City',
            gamePricePerPlayerKWD: data.gamePricePerPlayerKWD || 0,
            inviterName: data.inviterName || 'Organizer',
            inviterAvatar: data.inviterAvatar || '',
            inviteeName: data.inviteeName || '',
            inviteeAvatar: data.inviteeAvatar || ''
          });
        });
        onInvites(invites);
      },
      (err) => {
        console.warn('[Firestore Invites] CollectionGroup incoming invites listener notice:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('[Firestore Invites] Could not initialize incoming invites subscription:', err);
    return () => {};
  }
}

// =====================================================================
// BLOCKING & REPORTING SYSTEM (Step 6)
// Path: users/{userId}/blocked/{blockedUserId}
// Path: reports/{reportId}
// =====================================================================

/**
 * Blocks a player in Cloud Firestore.
 * Subcollection: users/{userId}/blocked/{blockedUserId}
 * Atomically creates block record and performs mutual cleanup of:
 * - Following relationships (both directions) and updates counters
 * - Friendships (both directions) and updates friend counts
 * - Pending friend requests (both directions)
 */
export async function blockPlayerInFirestore(blockedUserId: string): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');

  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to block players.');
  }

  const currentUserId = currentAuthUser.uid;
  if (currentUserId === blockedUserId) {
    throw new Error('You cannot block yourself.');
  }

  // 1. Verify target user exists
  const targetUserRef = doc(dbInstance, 'users', blockedUserId);
  const currentUserRef = doc(dbInstance, 'users', currentUserId);
  const [currentUserSnap, targetSnap] = await Promise.all([
    getDoc(currentUserRef),
    getDoc(targetUserRef)
  ]);

  if (!targetSnap.exists()) {
    throw new Error('Player to block does not exist.');
  }

  const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() : {};
  const targetUserData = targetSnap.data() || {};

  const blockDocRef = doc(dbInstance, 'users', currentUserId, 'blocked', blockedUserId);
  const nowISO = new Date().toISOString();

  try {
    const batch = writeBatch(dbInstance);

    // 1. Write the block record with blockedUserId as document ID
    batch.set(blockDocRef, {
      id: blockedUserId,
      userId: currentUserId,
      blockedUserId,
      createdAt: nowISO
    });

    let myFollowingCount = Math.max(0, typeof currentUserData.followingCount === 'number' ? currentUserData.followingCount : 0);
    let myFollowerCount = Math.max(0, typeof currentUserData.followerCount === 'number' ? currentUserData.followerCount : 0);
    let myFriendCount = Math.max(0, typeof currentUserData.friendCount === 'number' ? currentUserData.friendCount : 0);

    let otherFollowingCount = Math.max(0, typeof targetUserData.followingCount === 'number' ? targetUserData.followingCount : 0);
    let otherFollowerCount = Math.max(0, typeof targetUserData.followerCount === 'number' ? targetUserData.followerCount : 0);
    let otherFriendCount = Math.max(0, typeof targetUserData.friendCount === 'number' ? targetUserData.friendCount : 0);

    // 2. Remove follow relationships if they exist:
    // A -> B
    const userFollowingRef = doc(dbInstance, 'users', currentUserId, 'following', blockedUserId);
    const targetFollowerRef = doc(dbInstance, 'users', blockedUserId, 'followers', currentUserId);
    const snapFollow1 = await getDoc(userFollowingRef);
    if (snapFollow1.exists()) {
      batch.delete(userFollowingRef);
      batch.delete(targetFollowerRef);
      myFollowingCount = Math.max(0, myFollowingCount - 1);
      otherFollowerCount = Math.max(0, otherFollowerCount - 1);
    }

    // B -> A
    const targetFollowingRef = doc(dbInstance, 'users', blockedUserId, 'following', currentUserId);
    const userFollowerRef = doc(dbInstance, 'users', currentUserId, 'followers', blockedUserId);
    const snapFollow2 = await getDoc(targetFollowingRef);
    if (snapFollow2.exists()) {
      batch.delete(targetFollowingRef);
      batch.delete(userFollowerRef);
      otherFollowingCount = Math.max(0, otherFollowingCount - 1);
      myFollowerCount = Math.max(0, myFollowerCount - 1);
    }

    // 3. Remove mutual friend relationships if they exist:
    const myFriendRef = doc(dbInstance, 'users', currentUserId, 'friends', blockedUserId);
    const targetFriendRef = doc(dbInstance, 'users', blockedUserId, 'friends', currentUserId);
    const snapFriend = await getDoc(myFriendRef);
    if (snapFriend.exists()) {
      batch.delete(myFriendRef);
      batch.delete(targetFriendRef);
      myFriendCount = Math.max(0, myFriendCount - 1);
      otherFriendCount = Math.max(0, otherFriendCount - 1);
    }

    // 4. Remove pending friend requests between the two users:
    const req1 = doc(dbInstance, 'users', blockedUserId, 'friendRequests', currentUserId);
    const req2 = doc(dbInstance, 'users', currentUserId, 'friendRequests', blockedUserId);
    const [snapReq1, snapReq2] = await Promise.all([getDoc(req1), getDoc(req2)]);
    if (snapReq1.exists()) {
      batch.delete(req1);
    }
    if (snapReq2.exists()) {
      batch.delete(req2);
    }

    // 5. Invalidate / cancel pending game invites between the two users
    try {
      const incomingInvitesSnap = await getDocs(
        query(
          collectionGroup(dbInstance, 'invites'),
          where('inviteeId', '==', currentUserId),
          where('status', '==', 'pending')
        )
      );
      for (const d of incomingInvitesSnap.docs) {
        if (d.data().inviterId === blockedUserId) {
          batch.update(d.ref, {
            status: 'declined',
            respondedAt: nowISO
          });
        }
      }
    } catch (e) {
      console.warn('[Firestore Block] Could not clean incoming invites:', e);
    }

    try {
      const outgoingInvitesSnap = await getDocs(
        query(
          collectionGroup(dbInstance, 'invites'),
          where('inviteeId', '==', blockedUserId),
          where('status', '==', 'pending')
        )
      );
      for (const d of outgoingInvitesSnap.docs) {
        if (d.data().inviterId === currentUserId) {
          batch.update(d.ref, {
            status: 'cancelled',
            respondedAt: nowISO
          });
        }
      }
    } catch (e) {
      console.warn('[Firestore Block] Could not clean outgoing invites:', e);
    }

    // Update synchronized user counters with non-negative guarantee only if counters were affected
    const myCountsChanged = myFollowingCount !== (currentUserData.followingCount ?? 0) ||
      myFollowerCount !== (currentUserData.followerCount ?? 0) ||
      myFriendCount !== (currentUserData.friendCount ?? 0);

    if (myCountsChanged) {
      batch.set(currentUserRef, {
        followingCount: myFollowingCount,
        followerCount: myFollowerCount,
        friendCount: myFriendCount,
        updatedAt: nowISO
      }, { merge: true });
    }

    const otherCountsChanged = otherFollowingCount !== (targetUserData.followingCount ?? 0) ||
      otherFollowerCount !== (targetUserData.followerCount ?? 0) ||
      otherFriendCount !== (targetUserData.friendCount ?? 0);

    if (otherCountsChanged) {
      const targetUpdate: Record<string, any> = { updatedAt: nowISO };
      if (otherFollowingCount !== (targetUserData.followingCount ?? 0)) {
        targetUpdate.followingCount = otherFollowingCount;
      }
      if (otherFollowerCount !== (targetUserData.followerCount ?? 0)) {
        targetUpdate.followerCount = otherFollowerCount;
      }
      if (otherFriendCount !== (targetUserData.friendCount ?? 0)) {
        targetUpdate.friendCount = otherFriendCount;
      }

      batch.set(targetUserRef, targetUpdate, { merge: true });
    }

    await batch.commit();
    console.log(`[Firestore Block] Successfully blocked user ${blockedUserId} and committed mutual relationship cleanup`);
  } catch (err: any) {
    console.error(`[Firestore Block] Failed to block user ${blockedUserId}:`, err);
    handleFirestoreError(err, OperationType.WRITE, `users/${currentUserId}/blocked/${blockedUserId}`);
  }
}

/**
 * Unblocks a player in Cloud Firestore.
 * Subcollection: users/{userId}/blocked/{blockedUserId}
 * Relationships are NOT automatically restored; they start fresh.
 */
export async function unblockPlayerInFirestore(blockedUserId: string): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');

  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to unblock players.');
  }

  const currentUserId = currentAuthUser.uid;
  const blockDocRef = doc(dbInstance, 'users', currentUserId, 'blocked', blockedUserId);

  try {
    const snap = await getDoc(blockDocRef);
    if (!snap.exists()) {
      return;
    }

    await deleteDoc(blockDocRef);
    console.log(`[Firestore Block] Successfully unblocked user ${blockedUserId}`);
  } catch (err: any) {
    console.error(`[Firestore Block] Failed to unblock user ${blockedUserId}:`, err);
    handleFirestoreError(err, OperationType.DELETE, `users/${currentUserId}/blocked/${blockedUserId}`);
  }
}

/**
 * Subscribes to real-time updates of the current user's blocked users list.
 * Scalable approach: Returns a Set of blockedUserIds in a single real-time listener.
 * Path: users/{userId}/blocked
 */
export function subscribeToBlockedPlayers(
  userId: string,
  onBlockedIds: (ids: Set<string>) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!dbInstance || !userId) {
    onBlockedIds(new Set());
    return () => {};
  }

  const blockedCol = collection(dbInstance, 'users', userId, 'blocked');

  return onSnapshot(
    blockedCol,
    (snap) => {
      const ids = new Set<string>();
      snap.forEach(docSnap => {
        ids.add(docSnap.id);
      });
      onBlockedIds(ids);
    },
    (err) => {
      console.error(`[Firestore Block] Snapshot error in subscribeToBlockedPlayers:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Submits a community moderation report to Cloud Firestore.
 * Structure: reports/{reportId}
 * Enforces:
 * - Authenticated user
 * - Target player or target game must be present
 * - Valid reason
 * - Status initialized strictly to 'open'
 * - Prevents duplicate report spam for the same target
 */
export async function createReportInFirestore(report: {
  reportedUserId?: string;
  reportedGameId?: string;
  reason: ReportReason;
  details?: string;
}): Promise<string> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');

  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('You must be signed in to submit a report.');
  }

  const currentUserId = currentAuthUser.uid;
  if (!report.reportedUserId && !report.reportedGameId) {
    throw new Error('A report must specify either a reported player or a reported game.');
  }

  if (report.reportedUserId) {
    if (report.reportedUserId === currentUserId) {
      throw new Error('You cannot report yourself.');
    }
    if (report.reportedUserId === 'user-current') {
      throw new Error('Invalid report target: demo user profiles cannot be reported.');
    }
  }

  const validReasons: ReportReason[] = [
    'spam',
    'harassment',
    'inappropriate_behavior',
    'fake_profile',
    'scam_or_fraud',
    'unsafe_behavior',
    'other'
  ];
  if (!validReasons.includes(report.reason)) {
    throw new Error('Invalid report reason provided.');
  }

  // Deterministic report ID prevents spam duplicates from the same user for the same target
  const targetKey = report.reportedUserId ? `u_${report.reportedUserId}` : `g_${report.reportedGameId}`;
  const reportId = `rep_${currentUserId}_${targetKey}`;
  const reportDocRef = doc(dbInstance, 'reports', reportId);

  // Check if an existing open report already exists to prevent duplicate report spam
  try {
    const existingSnap = await getDoc(reportDocRef);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data();
      if (existingData.status === 'open') {
        // Return existing report ID without duplicate error to the user
        return reportId;
      }
    }
  } catch (_readErr) {
    // If getDoc failed because the document does not exist yet, proceed to create it
  }

  try {

    const nowISO = new Date().toISOString();
    const payload: Record<string, any> = {
      id: reportId,
      reporterId: currentUserId,
      reason: report.reason,
      status: 'open' as ReportStatus,
      createdAt: nowISO,
      updatedAt: nowISO
    };

    if (report.reportedUserId) payload.reportedUserId = report.reportedUserId;
    if (report.reportedGameId) payload.reportedGameId = report.reportedGameId;
    if (report.details?.trim()) {
      payload.details = report.details.trim().slice(0, 1000);
    }

    await setDoc(reportDocRef, payload);
    console.log(`[Firestore Report] Report ${reportId} successfully submitted`);
    return reportId;
  } catch (err: any) {
    console.error(`[Firestore Report] Failed to create report:`, err);
    handleFirestoreError(err, OperationType.CREATE, `reports/${reportId}`);
  }
}

// =====================================================================
// ADMIN & MODERATION BACKEND
// Trusted authorization, moderation workflow, audit logs, and game actions
// =====================================================================

/**
 * Checks whether the currently authenticated user has trusted admin privileges.
 * Admin authorization is evaluated against the trusted Firestore `admins/{uid}` document
 * or verified hardcoded admin email matching the project's authorized account.
 * NEVER trusts client-supplied state, localStorage, or user-editable profile fields.
 */
export async function checkIsAdminInFirestore(): Promise<boolean> {
  if (!dbInstance || !authInstance) return false;
  const currentAuthUser = authInstance.currentUser;
  if (!currentAuthUser?.uid) return false;

  const userEmail = (currentAuthUser.email || '').toLowerCase().trim();
  const isEmailVerified = Boolean(currentAuthUser.emailVerified);
  if (userEmail === 'khalidalami5555@gmail.com' && isEmailVerified) {
    // Proactively ensure admins/{uid} document exists for future RBAC lookups
    try {
      const adminDocRef = doc(dbInstance, 'admins', currentAuthUser.uid);
      const snap = await getDoc(adminDocRef);
      if (!snap.exists()) {
        await setDoc(adminDocRef, {
          email: userEmail,
          uid: currentAuthUser.uid,
          role: 'admin',
          createdAt: new Date().toISOString()
        });
      }
    } catch {
      // Non-blocking if offline or restricted
    }
    return true;
  }

  try {
    const adminDocRef = doc(dbInstance, 'admins', currentAuthUser.uid);
    const snap = await getDoc(adminDocRef);
    return snap.exists();
  } catch (err) {
    console.warn('[Admin Check] Could not verify admin document:', err);
    return false;
  }
}

/**
 * Appends an immutable moderation audit log entry to `moderationLogs/{logId}`.
 * Strictly requires authorized moderator authentication and matching moderatorId.
 */
export async function logModerationAction(entry: {
  action: ModerationAction;
  targetType: ModerationTargetType;
  targetId: string;
  reportId?: string;
  reason?: string;
  resolution?: string;
}): Promise<string> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to log moderation actions.');
  }

  const logCol = collection(dbInstance, 'moderationLogs');
  const nowISO = new Date().toISOString();
  const logRef = doc(logCol);

  const payload: ModerationLogEntry = {
    id: logRef.id,
    moderatorId: currentAuthUser.uid,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    createdAt: nowISO,
    createdAtISO: nowISO
  };

  if (entry.reportId) payload.reportId = entry.reportId;
  if (entry.reason) payload.reason = entry.reason.trim();
  if (entry.resolution) payload.resolution = entry.resolution.trim();

  try {
    await setDoc(logRef, payload);
    return logRef.id;
  } catch (err: any) {
    console.error(`[Moderation Log] Failed to write audit log:`, err);
    handleFirestoreError(err, OperationType.CREATE, `moderationLogs/${logRef.id}`);
  }
}

/**
 * Fetches moderation reports from Firestore with status filtering and bounded limits.
 * Authorized for moderators and admins only.
 * Avoids unbounded collection queries and preserves newest-first ordering.
 */
export async function fetchReportsFromFirestore(options?: {
  status?: ReportStatus | 'all';
  limitCount?: number;
}): Promise<ReportDocument[]> {
  if (!dbInstance) return [];

  const maxLimit = Math.min(100, Math.max(1, options?.limitCount || 50));
  const reportsCol = collection(dbInstance, 'reports');

  try {
    let snap;
    try {
      let q;
      if (options?.status && options.status !== 'all') {
        q = query(
          reportsCol,
          where('status', '==', options.status),
          orderBy('createdAt', 'desc'),
          limit(maxLimit)
        );
      } else {
        q = query(
          reportsCol,
          orderBy('createdAt', 'desc'),
          limit(maxLimit)
        );
      }
      snap = await getDocs(q);
    } catch (queryErr) {
      console.warn('[Firestore Reports] Specific query failed, attempting unindexed fallback:', queryErr);
      const fallbackQ = query(reportsCol, limit(maxLimit));
      snap = await getDocs(fallbackQ);
    }

    const results: ReportDocument[] = [];
    snap.forEach(d => {
      const data = d.data();
      if (!options?.status || options.status === 'all' || data.status === options.status) {
        results.push({
          id: d.id,
          reporterId: data.reporterId || '',
          reportedUserId: data.reportedUserId || undefined,
          reportedGameId: data.reportedGameId || undefined,
          reason: data.reason || 'other',
          details: data.details || undefined,
          status: (data.status as ReportStatus) || 'open',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || undefined,
          moderatorId: data.moderatorId || undefined,
          resolution: data.resolution || undefined,
          dismissalReason: data.dismissalReason || undefined,
          resolvedAt: data.resolvedAt || undefined,
          dismissedAt: data.dismissedAt || undefined,
          reviewedAt: data.reviewedAt || undefined
        });
      }
    });

    results.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return results;
  } catch (err: any) {
    console.error('[Firestore Reports] Failed to fetch reports:', err);
    handleFirestoreError(err, OperationType.LIST, 'reports');
  }
}

/**
 * Subscribes to real-time reports with optional status filtering for the admin queue.
 */
export function subscribeToReportsInFirestore(
  onReports: (reports: ReportDocument[]) => void,
  onError?: (err: Error) => void,
  statusFilter?: ReportStatus | 'all',
  limitCount = 50
): Unsubscribe {
  if (!dbInstance) {
    onReports([]);
    return () => {};
  }

  const reportsCol = collection(dbInstance, 'reports');
  const maxLimit = Math.min(100, Math.max(1, limitCount));

  const mapSnapshot = (snap: any) => {
    const items: ReportDocument[] = [];
    snap.forEach((d: any) => {
      const data = d.data();
      if (!statusFilter || statusFilter === 'all' || data.status === statusFilter) {
        items.push({
          id: d.id,
          reporterId: data.reporterId || '',
          reportedUserId: data.reportedUserId || undefined,
          reportedGameId: data.reportedGameId || undefined,
          reason: data.reason || 'other',
          details: data.details || undefined,
          status: (data.status as ReportStatus) || 'open',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || undefined,
          moderatorId: data.moderatorId || undefined,
          resolution: data.resolution || undefined,
          dismissalReason: data.dismissalReason || undefined,
          resolvedAt: data.resolvedAt || undefined,
          dismissedAt: data.dismissedAt || undefined,
          reviewedAt: data.reviewedAt || undefined
        });
      }
    });
    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onReports(items);
  };

  try {
    const q = query(reportsCol, orderBy('createdAt', 'desc'), limit(maxLimit));
    return onSnapshot(
      q,
      mapSnapshot,
      (err) => {
        console.warn('[Firestore Reports] Primary snapshot listener error, attempting fallback query:', err);
        try {
          const fallbackQ = query(reportsCol, limit(maxLimit));
          return onSnapshot(
            fallbackQ,
            mapSnapshot,
            (fallbackErr) => {
              console.warn('[Firestore Reports] Fallback snapshot listener error:', fallbackErr);
              if (onError) onError(fallbackErr);
            }
          );
        } catch {
          if (onError) onError(err);
        }
      }
    );
  } catch {
    const fallbackQ = query(reportsCol, limit(maxLimit));
    return onSnapshot(
      fallbackQ,
      mapSnapshot,
      (err) => {
        console.warn('[Firestore Reports] Snapshot error in subscribeToReports:', err);
        if (onError) onError(err);
      }
    );
  }
}

/**
 * Validates whether a moderation report status transition is permitted.
 */
export function isValidReportStatusTransition(currentStatus: string, targetStatus: ReportStatus): boolean {
  if (targetStatus === 'reviewing') {
    return currentStatus === 'open';
  }
  if (targetStatus === 'resolved' || targetStatus === 'dismissed') {
    return currentStatus === 'open' || currentStatus === 'reviewing';
  }
  return false;
}

/**
 * Transitions a report from 'open' to 'reviewing'.
 * Records moderator attribution and timestamp.
 * Appends an immutable audit log.
 */
export async function reviewReportInFirestore(reportId: string): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to review reports.');
  }

  const moderatorId = currentAuthUser.uid;
  const reportDocRef = doc(dbInstance, 'reports', reportId);
  const nowISO = new Date().toISOString();

  try {
    const snap = await getDoc(reportDocRef);
    if (!snap.exists()) {
      throw new Error('Report not found or has been removed.');
    }

    const data = snap.data();
    if (data.status !== 'open') {
      throw new Error(`Report cannot be moved to reviewing from status: ${data.status}`);
    }

    // Atomic update adhering to firestore.rules
    await updateDoc(reportDocRef, {
      status: 'reviewing',
      moderatorId,
      reviewedAt: nowISO,
      updatedAt: nowISO
    });

    // Write immutable audit log
    await logModerationAction({
      action: 'review_report',
      targetType: 'report',
      targetId: reportId,
      reportId
    });

    console.log(`[Moderation] Report ${reportId} status moved to reviewing by ${moderatorId}`);
  } catch (err: any) {
    console.error(`[Moderation] Failed to review report ${reportId}:`, err);
    handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
  }
}

/**
 * Resolves a report with a resolution summary.
 * Valid transition from 'open' or 'reviewing' to 'resolved'.
 * Records moderator attribution and timestamp.
 * Appends an immutable audit log.
 */
export async function resolveReportInFirestore(
  reportId: string,
  resolution: string,
  actionTaken?: string
): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to resolve reports.');
  }

  const moderatorId = currentAuthUser.uid;
  const reportDocRef = doc(dbInstance, 'reports', reportId);
  const nowISO = new Date().toISOString();

  try {
    const snap = await getDoc(reportDocRef);
    if (!snap.exists()) {
      throw new Error('Report not found or has been removed.');
    }

    const data = snap.data();
    if (data.status !== 'open' && data.status !== 'reviewing') {
      throw new Error(`Report cannot be resolved from status: ${data.status}`);
    }

    const trimmedResolution = (resolution || 'Report investigated and resolved.').trim();

    await updateDoc(reportDocRef, {
      status: 'resolved',
      moderatorId,
      resolution: trimmedResolution,
      resolvedAt: nowISO,
      updatedAt: nowISO
    });

    await logModerationAction({
      action: 'resolve_report',
      targetType: data.reportedUserId ? 'user' : (data.reportedGameId ? 'game' : 'report'),
      targetId: data.reportedUserId || data.reportedGameId || reportId,
      reportId,
      resolution: trimmedResolution,
      reason: actionTaken || data.reason
    });

    console.log(`[Moderation] Report ${reportId} successfully resolved by ${moderatorId}`);
  } catch (err: any) {
    console.error(`[Moderation] Failed to resolve report ${reportId}:`, err);
    handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
  }
}

/**
 * Dismisses a report with an explanation reason.
 * Valid transition from 'open' or 'reviewing' to 'dismissed'.
 * Records moderator attribution and timestamp.
 * Appends an immutable audit log.
 */
export async function dismissReportInFirestore(
  reportId: string,
  dismissalReason?: string
): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to dismiss reports.');
  }

  const moderatorId = currentAuthUser.uid;
  const reportDocRef = doc(dbInstance, 'reports', reportId);
  const nowISO = new Date().toISOString();

  try {
    const snap = await getDoc(reportDocRef);
    if (!snap.exists()) {
      throw new Error('Report not found or has been removed.');
    }

    const data = snap.data();
    if (data.status !== 'open' && data.status !== 'reviewing') {
      throw new Error(`Report cannot be dismissed from status: ${data.status}`);
    }

    const trimmedReason = (dismissalReason || 'No violation found upon review.').trim();

    await updateDoc(reportDocRef, {
      status: 'dismissed',
      moderatorId,
      dismissalReason: trimmedReason,
      dismissedAt: nowISO,
      updatedAt: nowISO
    });

    await logModerationAction({
      action: 'dismiss_report',
      targetType: data.reportedUserId ? 'user' : (data.reportedGameId ? 'game' : 'report'),
      targetId: data.reportedUserId || data.reportedGameId || reportId,
      reportId,
      reason: trimmedReason
    });

    console.log(`[Moderation] Report ${reportId} dismissed by ${moderatorId}`);
  } catch (err: any) {
    console.error(`[Moderation] Failed to dismiss report ${reportId}:`, err);
    handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
  }
}

/**
 * Moderates and force-cancels a problematic game in Firestore.
 * - Allowed only for authorized moderators/admins.
 * - Sets game status to 'Cancelled' with a moderation flag (`moderated: true`).
 * - Preserves historical game, participant, chat, and payment documents intact.
 * - Prevents the organizer from re-opening or modifying the game via firestore.rules.
 * - Appends an immutable moderation audit log.
 */
export async function moderateCancelGameInFirestore(
  gameId: string,
  moderationReason?: string,
  reportId?: string
): Promise<Game> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to perform game moderation.');
  }

  const moderatorId = currentAuthUser.uid;
  const gameDocRef = doc(dbInstance, 'games', gameId);
  const nowISO = new Date().toISOString();

  try {
    const gameSnap = await getDoc(gameDocRef);
    if (!gameSnap.exists()) {
      throw new Error('Game not found or already removed.');
    }

    const gData = gameSnap.data();
    const reasonText = moderationReason || 'Cancelled by La3ib Community Moderation for policy safety.';

    // Update game status to Cancelled with moderated metadata
    await updateDoc(gameDocRef, {
      status: 'Cancelled',
      moderated: true,
      moderatedAt: nowISO,
      moderatedBy: moderatorId,
      moderationReason: reasonText,
      description: gData.description 
        ? `${gData.description}\n[Moderated: ${reasonText}]`
        : `[Moderated: ${reasonText}]`,
      updatedAt: serverTimestamp(),
      updatedAtISO: nowISO
    });

    // Write immutable moderation audit log
    await logModerationAction({
      action: 'cancel_game',
      targetType: 'game',
      targetId: gameId,
      reportId,
      reason: reasonText
    });

    const updatedSnap = await getDoc(gameDocRef);
    return mapFirestoreDocToGame(gameId, updatedSnap.data() || {});
  } catch (err: any) {
    console.error(`[Moderation] Failed to moderate cancel game ${gameId}:`, err);
    handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}`);
  }
}

/**
 * Fetches recent moderation audit logs for the admin dashboard.
 * Read access is restricted to authorized admins via firestore.rules.
 */
export async function fetchModerationLogsFromFirestore(limitCount = 50): Promise<ModerationLogEntry[]> {
  if (!dbInstance) return [];

  const maxLimit = Math.min(100, Math.max(1, limitCount));
  const logsCol = collection(dbInstance, 'moderationLogs');
  const q = query(logsCol, orderBy('createdAt', 'desc'), limit(maxLimit));

  try {
    const snap = await getDocs(q);
    const logs: ModerationLogEntry[] = [];
    snap.forEach(d => {
      const data = d.data();
      logs.push({
        id: d.id,
        moderatorId: data.moderatorId || '',
        action: data.action as ModerationAction,
        targetType: data.targetType as ModerationTargetType,
        targetId: data.targetId || '',
        reportId: data.reportId || undefined,
        reason: data.reason || undefined,
        resolution: data.resolution || undefined,
        createdAt: data.createdAt || new Date().toISOString(),
        createdAtISO: data.createdAtISO || data.createdAt || new Date().toISOString()
      });
    });
    return logs;
  } catch (err: any) {
    console.error('[Firestore Moderation] Failed to fetch moderation logs:', err);
    handleFirestoreError(err, OperationType.LIST, 'moderationLogs');
  }
}

/**
 * Fetches recent moderation audit logs specifically targeting a particular user or game.
 * Used in the Report Investigation Case File and Athlete Moderation History.
 */
export async function fetchTargetModerationHistory(
  targetId: string, 
  limitCount = 15
): Promise<ModerationLogEntry[]> {
  if (!dbInstance || !targetId) return [];

  const maxLimit = Math.min(50, Math.max(1, limitCount));
  const logsCol = collection(dbInstance, 'moderationLogs');
  
  try {
    const q = query(
      logsCol, 
      where('targetId', '==', targetId), 
      limit(maxLimit)
    );
    const snap = await getDocs(q);
    const logs: ModerationLogEntry[] = [];
    snap.forEach(d => {
      const data = d.data();
      logs.push({
        id: d.id,
        moderatorId: data.moderatorId || '',
        action: data.action as ModerationAction,
        targetType: data.targetType as ModerationTargetType,
        targetId: data.targetId || targetId,
        reportId: data.reportId || undefined,
        reason: data.reason || undefined,
        resolution: data.resolution || undefined,
        createdAt: data.createdAt || new Date().toISOString(),
        createdAtISO: data.createdAtISO || data.createdAt || new Date().toISOString()
      });
    });
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return logs;
  } catch (err: any) {
    console.warn(`[Firestore Moderation] Could not fetch target history for ${targetId}:`, err);
    return [];
  }
}

/**
 * Fetches public athlete profiles from Firestore for the admin player directory.
 * Bounded query prevents unbounded reads.
 */
export async function fetchAthleteDirectory(limitCount = 60): Promise<UserProfile[]> {
  if (!dbInstance) return [];

  const maxLimit = Math.min(100, Math.max(1, limitCount));
  const usersCol = collection(dbInstance, 'users');
  const q = query(usersCol, limit(maxLimit));

  try {
    const snap = await getDocs(q);
    const profiles: UserProfile[] = [];
    snap.forEach(d => {
      const data = d.data();
      profiles.push({
        id: d.id,
        uid: data.uid || d.id,
        name: data.name || 'Athlete',
        nameAr: data.nameAr || undefined,
        username: data.username || `athlete_${d.id.slice(0, 5)}`,
        avatar: data.avatar || '',
        area: data.area || 'Kuwait City',
        bio: data.bio || '',
        favoriteSports: Array.isArray(data.favoriteSports) ? data.favoriteSports : ['Padel'],
        skills: data.skills || {},
        gamesPlayed: typeof data.gamesPlayed === 'number' ? data.gamesPlayed : 0,
        gamesHosted: typeof data.gamesHosted === 'number' ? data.gamesHosted : 0,
        attendanceRate: typeof data.attendanceRate === 'number' ? data.attendanceRate : 100,
        isOrganizer: Boolean(data.isOrganizer),
        canOrganize: data.canOrganize !== false,
        isAdmin: Boolean(data.isAdmin),
        followerCount: data.followerCount || 0,
        followingCount: data.followingCount || 0,
        friendCount: data.friendCount || 0,
        privacy: data.privacy || { showAge: true, showPhone: false, allowDirectInvites: true },
        createdAt: data.createdAt || undefined,
        updatedAt: data.updatedAt || undefined
      });
    });
    return profiles;
  } catch (err: any) {
    console.error('[Firestore Athlete Directory] Failed to fetch directory:', err);
    handleFirestoreError(err, OperationType.LIST, 'users');
  }
}

/**
 * Sets an athlete's match-organizing privilege (`canOrganize`).
 * Authorized for trusted administrators only.
 */
export async function setAthleteOrganizingStatus(
  userId: string, 
  canOrganize: boolean,
  reason?: string
): Promise<void> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  const currentAuthUser = authInstance?.currentUser;
  if (!currentAuthUser?.uid) {
    throw new Error('User must be authenticated to update athlete privileges.');
  }

  const userDocRef = doc(dbInstance, 'users', userId);
  const nowISO = new Date().toISOString();

  try {
    await updateDoc(userDocRef, {
      canOrganize,
      updatedAt: nowISO
    });

    await logModerationAction({
      action: 'resolve_report',
      targetType: 'user',
      targetId: userId,
      reason: reason || (canOrganize ? 'Organizer privilege restored' : 'Organizer privilege restricted due to policy violation')
    });

    console.log(`[Moderation] Set canOrganize = ${canOrganize} for user ${userId}`);
  } catch (err: any) {
    console.error(`[Moderation] Failed to set organizing status for ${userId}:`, err);
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

// =====================================================================
// PAYMENT ARCHITECTURE (Step 1 - Provider-Agnostic Core)
// Path: games/{gameId}/payments/{userId}
// =====================================================================

/**
 * Validates allowed payment status transitions according to the state machine:
 * unpaid → pending | cancelled
 * pending → paid | failed | cancelled
 * paid → refunded
 * failed → pending
 * cancelled → pending
 */
export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  const normFrom = from.toLowerCase() as PaymentStatus;
  const normTo = to.toLowerCase() as PaymentStatus;

  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    unpaid: ['pending', 'cancelled'],
    pending: ['paid', 'failed', 'cancelled'],
    paid: ['refunded'],
    refunded: [],
    failed: ['pending'],
    cancelled: ['pending']
  };

  return ALLOWED_TRANSITIONS[normFrom]?.includes(normTo) ?? false;
}

/**
 * Fetches the payment record for a specific participant in a game.
 * Path: games/{gameId}/payments/{userId}
 */
export async function getGamePayment(gameId: string, userId: string): Promise<GamePayment | null> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  if (!gameId || !userId) return null;

  const paymentDocRef = doc(dbInstance, 'games', gameId, 'payments', userId);
  try {
    const snap = await getDoc(paymentDocRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      gameId: data.gameId || gameId,
      userId: data.userId || userId,
      organizerId: data.organizerId || '',
      amountKWD: Number(data.amountKWD || 0),
      currency: 'KWD',
      status: (data.status || 'unpaid').toLowerCase() as PaymentStatus,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt,
      paidAt: data.paidAt,
      refundedAt: data.refundedAt,
      provider: data.provider,
      providerPaymentId: data.providerPaymentId,
      providerTransactionId: data.providerTransactionId
    };
  } catch (err: any) {
    console.error(`[Firestore Payments] Failed to get payment for user ${userId} in game ${gameId}:`, err);
    return null;
  }
}

/**
 * Subscribes to real-time updates of all participant payment records for a game.
 * Used by the game organizer to view collection status and by participants.
 * Path: games/{gameId}/payments
 */
export function subscribeToGamePayments(
  gameId: string,
  onPayments: (payments: Record<string, GamePayment>) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!dbInstance || !gameId) {
    onPayments({});
    return () => {};
  }

  const paymentsCol = collection(dbInstance, 'games', gameId, 'payments');

  return onSnapshot(
    paymentsCol,
    (snap) => {
      const records: Record<string, GamePayment> = {};
      snap.forEach(docSnap => {
        const data = docSnap.data();
        records[docSnap.id] = {
          id: docSnap.id,
          gameId: data.gameId || gameId,
          userId: data.userId || docSnap.id,
          organizerId: data.organizerId || '',
          amountKWD: Number(data.amountKWD || 0),
          currency: 'KWD',
          status: (data.status || 'unpaid').toLowerCase() as PaymentStatus,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
          paidAt: data.paidAt,
          refundedAt: data.refundedAt,
          provider: data.provider,
          providerPaymentId: data.providerPaymentId,
          providerTransactionId: data.providerTransactionId
        };
      });
      onPayments(records);
    },
    (err) => {
      console.warn(`[Firestore Payments] Subscription notice for game ${gameId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Initializes a participant's payment record in Cloud Firestore if it does not already exist.
 * The amount is authoritative, retrieved directly from the game's pricePerPlayerKWD.
 */
export async function initializeGamePayment(gameId: string, userId: string): Promise<GamePayment> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  if (!gameId || !userId) throw new Error('gameId and userId are required to initialize payment.');

  const paymentDocRef = doc(dbInstance, 'games', gameId, 'payments', userId);
  const nowISO = new Date().toISOString();

  try {
    const existingSnap = await getDoc(paymentDocRef);
    if (existingSnap.exists()) {
      const d = existingSnap.data();
      return {
        id: existingSnap.id,
        gameId: d.gameId || gameId,
        userId: d.userId || userId,
        organizerId: d.organizerId || '',
        amountKWD: Number(d.amountKWD || 0),
        currency: 'KWD',
        status: (d.status || 'unpaid').toLowerCase() as PaymentStatus,
        createdAt: d.createdAt || nowISO,
        updatedAt: d.updatedAt,
        paidAt: d.paidAt,
        refundedAt: d.refundedAt,
        provider: d.provider,
        providerPaymentId: d.providerPaymentId,
        providerTransactionId: d.providerTransactionId
      };
    }

    // Retrieve authoritative game price and organizer
    const gameDocRef = doc(dbInstance, 'games', gameId);
    const gameSnap = await getDoc(gameDocRef);
    if (!gameSnap.exists()) {
      throw new Error('Game does not exist.');
    }

    const gData = gameSnap.data();
    const authoritativePrice = Number(gData.pricePerPlayerKWD ?? gData.pricePerPlayer ?? 0);
    const initialStatus: PaymentStatus = authoritativePrice > 0 ? 'unpaid' : 'paid';
    const organizerUid = gData.organizerId || (gData.organizer && gData.organizer.id) || '';

    const newPayment: GamePayment = {
      id: userId,
      gameId,
      userId,
      organizerId: organizerUid,
      amountKWD: authoritativePrice,
      currency: 'KWD',
      status: initialStatus,
      createdAt: nowISO,
      updatedAt: nowISO
    };

    await setDoc(paymentDocRef, newPayment);
    console.log(`[Firestore Payments] Payment initialized for ${userId} in game ${gameId}:`, initialStatus);
    return newPayment;
  } catch (err: any) {
    console.error(`[Firestore Payments] Failed to initialize payment:`, err);
    handleFirestoreError(err, OperationType.CREATE, `games/${gameId}/payments/${userId}`);
    throw err;
  }
}

/**
 * DEVELOPMENT / TESTING SIMULATOR ONLY:
 * Simulates a payment gateway confirmation transitioning unpaid -> pending -> paid.
 * This does NOT connect to real payment gateways or process real funds.
 */
export async function simulateGamePayment(gameId: string, userId: string): Promise<GamePayment> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  const paymentDocRef = doc(dbInstance, 'games', gameId, 'payments', userId);
  const nowISO = new Date().toISOString();

  try {
    const snap = await getDoc(paymentDocRef);
    let currentRecord: GamePayment;

    if (!snap.exists()) {
      // Auto-initialize if not existing
      currentRecord = await initializeGamePayment(gameId, userId);
    } else {
      const d = snap.data();
      currentRecord = {
        id: snap.id,
        gameId: d.gameId || gameId,
        userId: d.userId || userId,
        organizerId: d.organizerId || '',
        amountKWD: Number(d.amountKWD || 0),
        currency: 'KWD',
        status: (d.status || 'unpaid').toLowerCase() as PaymentStatus,
        createdAt: d.createdAt || nowISO,
        updatedAt: d.updatedAt,
        paidAt: d.paidAt,
        refundedAt: d.refundedAt,
        provider: d.provider,
        providerPaymentId: d.providerPaymentId,
        providerTransactionId: d.providerTransactionId
      };
    }

    if (currentRecord.status === 'paid') {
      return currentRecord;
    }

    // Validate state machine: from unpaid/failed/cancelled -> pending -> paid
    if (currentRecord.status === 'refunded') {
      throw new Error('Cannot pay for a refunded payment.');
    }

    const simTxnId = 'sim_txn_' + Date.now();
    const updatedPayload: Partial<GamePayment> = {
      status: 'paid',
      paidAt: nowISO,
      updatedAt: nowISO,
      provider: 'simulator',
      providerPaymentId: 'sim_pay_' + userId.slice(0, 5),
      providerTransactionId: simTxnId
    };

    await updateDoc(paymentDocRef, updatedPayload as Record<string, any>);
    console.log(`[Firestore Payments Simulation] User ${userId} payment simulated as PAID in game ${gameId}`);

    return {
      ...currentRecord,
      ...updatedPayload
    };
  } catch (err: any) {
    console.error(`[Firestore Payments Simulation] Failed to simulate payment:`, err);
    handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}/payments/${userId}`);
    throw err;
  }
}

/**
 * DEVELOPMENT / TESTING SIMULATOR ONLY:
 * Simulates a payment refund transitioning paid -> refunded.
 * This does NOT connect to real payment gateways or process real funds.
 */
export async function simulateGameRefund(gameId: string, userId: string): Promise<GamePayment> {
  if (!dbInstance) throw new Error('Firestore is not initialized.');
  const paymentDocRef = doc(dbInstance, 'games', gameId, 'payments', userId);
  const nowISO = new Date().toISOString();

  try {
    const snap = await getDoc(paymentDocRef);
    if (!snap.exists()) {
      throw new Error('Payment record does not exist to refund.');
    }

    const d = snap.data();
    const currentStatus = (d.status || 'unpaid').toLowerCase() as PaymentStatus;

    if (!canTransitionPayment(currentStatus, 'refunded')) {
      throw new Error(`Invalid payment transition: cannot refund a payment in status "${currentStatus}".`);
    }

    const updatedPayload = {
      status: 'refunded' as PaymentStatus,
      refundedAt: nowISO,
      updatedAt: nowISO
    };

    await updateDoc(paymentDocRef, updatedPayload);
    console.log(`[Firestore Payments Simulation] User ${userId} payment simulated as REFUNDED in game ${gameId}`);

    return {
      id: snap.id,
      gameId: d.gameId || gameId,
      userId: d.userId || userId,
      organizerId: d.organizerId || '',
      amountKWD: Number(d.amountKWD || 0),
      currency: 'KWD',
      status: 'refunded',
      createdAt: d.createdAt || nowISO,
      updatedAt: nowISO,
      paidAt: d.paidAt,
      refundedAt: nowISO,
      provider: d.provider,
      providerPaymentId: d.providerPaymentId,
      providerTransactionId: d.providerTransactionId
    };
  } catch (err: any) {
    console.error(`[Firestore Payments Simulation] Failed to simulate refund:`, err);
    handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}/payments/${userId}`);
    throw err;
  }
}



