import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to create mock hooks that can be controlled per test
const mocks = vi.hoisted(() => {
  return {
    runTransaction: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    writeBatch: vi.fn(),
    onSnapshot: vi.fn()
  };
});

// Mock firebase/firestore module
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    runTransaction: (...args: any[]) => mocks.runTransaction(...args),
    getDoc: (...args: any[]) => mocks.getDoc(...args),
    getDocs: (...args: any[]) => mocks.getDocs(...args),
    setDoc: (...args: any[]) => mocks.setDoc(...args),
    updateDoc: (...args: any[]) => mocks.updateDoc(...args),
    deleteDoc: (...args: any[]) => mocks.deleteDoc(...args),
    writeBatch: (...args: any[]) => mocks.writeBatch(...args),
    onSnapshot: (...args: any[]) => mocks.onSnapshot(...args),
    query: (...args: any[]) => ({ _query: true, args }),
    where: (...args: any[]) => ({ _where: true, args }),
    limit: (...args: any[]) => ({ _limit: true, args }),
    orderBy: (...args: any[]) => ({ _orderBy: true, args }),
    doc: (...args: any[]) => {
      const parts = args.slice(1);
      const path = parts.join('/');
      const id = parts[parts.length - 1] || 'mock-doc-id';
      return { _path: path, path, id, type: 'document' };
    },
    collection: (...args: any[]) => {
      const parts = args.slice(1);
      const path = parts.join('/');
      const id = parts[parts.length - 1] || 'mock-col-id';
      return { _path: path, path, id, type: 'collection' };
    }
  };
});

import {
  checkIsAdminInFirestore,
  createOrFetchUserProfile,
  updateUserProfileInFirestore,
  createReportInFirestore,
  logModerationAction,
  moderateCancelGameInFirestore,
  setAthleteOrganizingStatus,
  fetchModerationLogsFromFirestore,
  _setTestAuthInstance,
  _setTestDbInstance
} from '../src/lib/firebase';

function createDocSnap(id: string, exists: boolean, data: Record<string, any> = {}) {
  return {
    id,
    exists: () => exists,
    data: () => (exists ? { ...data } : undefined)
  };
}

describe('Verification Suite: Least Privilege & Administrator Security', () => {
  const mockDb = { type: 'firestore-mock' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    _setTestDbInstance(mockDb);
  });

  describe('1. Normal account has no admin privileges', () => {
    it('defaults normal accounts to isAdmin: false', async () => {
      _setTestAuthInstance({
        currentUser: {
          uid: 'user-regular-123',
          email: 'normal_athlete@example.com',
          emailVerified: true
        }
      } as any);

      // No doc in admins/user-regular-123
      mocks.getDoc.mockImplementation(async (ref: any) => {
        if (ref.path === 'admins/user-regular-123') {
          return createDocSnap('user-regular-123', false);
        }
        return createDocSnap('other', false);
      });

      const isAdmin = await checkIsAdminInFirestore();
      expect(isAdmin).toBe(false);
    });

    it('createOrFetchUserProfile returns isAdmin: false for normal account', async () => {
      _setTestAuthInstance({
        currentUser: {
          uid: 'user-regular-123',
          email: 'normal_athlete@example.com',
          emailVerified: true
        }
      } as any);

      mocks.getDoc.mockImplementation(async (ref: any) => {
        if (ref.path === 'admins/user-regular-123') {
          return createDocSnap('user-regular-123', false);
        }
        if (ref.path === 'users/user-regular-123') {
          return createDocSnap('user-regular-123', true, {
            id: 'user-regular-123',
            name: 'Normal Athlete',
            username: 'normal_athlete'
          });
        }
        if (ref.path === 'users/user-regular-123/private/account') {
          return createDocSnap('account', true, {
            email: 'normal_athlete@example.com'
          });
        }
        return createDocSnap('other', false);
      });

      const profile = await createOrFetchUserProfile({
        uid: 'user-regular-123',
        email: 'normal_athlete@example.com',
        emailVerified: true
      } as any);

      expect(profile.isAdmin).toBe(false);
    });
  });

  describe('2. Intended administrator retains admin access', () => {
    it('grants admin privileges to intended admin with verified email (case-insensitive)', async () => {
      _setTestAuthInstance({
        currentUser: {
          uid: 'admin-intended-uid',
          email: 'Khalidalami5555@gmail.com',
          emailVerified: true
        }
      } as any);

      mocks.getDoc.mockResolvedValue(createDocSnap('admin-intended-uid', false));
      mocks.setDoc.mockResolvedValue(undefined);

      const isAdmin = await checkIsAdminInFirestore();
      expect(isAdmin).toBe(true);

      const profile = await createOrFetchUserProfile({
        uid: 'admin-intended-uid',
        email: 'Khalidalami5555@gmail.com',
        emailVerified: true
      } as any);

      expect(profile.isAdmin).toBe(true);
    });

    it('grants admin privileges to a UID present in admins/{uid}', async () => {
      _setTestAuthInstance({
        currentUser: {
          uid: 'admin-roled-uid',
          email: 'moderator@la3ib.kw',
          emailVerified: true
        }
      } as any);

      mocks.getDoc.mockImplementation(async (ref: any) => {
        if (ref.path === 'admins/admin-roled-uid') {
          return createDocSnap('admin-roled-uid', true, {
            role: 'admin',
            email: 'moderator@la3ib.kw'
          });
        }
        return createDocSnap('other', false);
      });

      const isAdmin = await checkIsAdminInFirestore();
      expect(isAdmin).toBe(true);

      const profile = await createOrFetchUserProfile({
        uid: 'admin-roled-uid',
        email: 'moderator@la3ib.kw',
        emailVerified: true
      } as any);

      expect(profile.isAdmin).toBe(true);
    });
  });

  describe('3. Normal account cannot grant itself admin access', () => {
    it('ignores client-side isAdmin flag stored in users document if not server-verified', async () => {
      _setTestAuthInstance({
        currentUser: {
          uid: 'malicious-user-1',
          email: 'attacker@evil.com',
          emailVerified: true
        }
      } as any);

      // Simulating a document that somehow had isAdmin: true stored on it
      mocks.getDoc.mockImplementation(async (ref: any) => {
        if (ref.path === 'admins/malicious-user-1') {
          return createDocSnap('malicious-user-1', false); // Not in admins collection
        }
        if (ref.path === 'users/malicious-user-1') {
          return createDocSnap('malicious-user-1', true, {
            id: 'malicious-user-1',
            name: 'Attacker',
            username: 'attacker',
            isAdmin: true // Client profile field spoof attempt!
          });
        }
        return createDocSnap('other', false);
      });

      const profile = await createOrFetchUserProfile({
        uid: 'malicious-user-1',
        email: 'attacker@evil.com',
        emailVerified: true
      } as any);

      // Must be false: never trust cleanPublicProfile.isAdmin as authorization!
      expect(profile.isAdmin).toBe(false);
    });

    it('rejects email spoofing when emailVerified is false', async () => {
      _setTestAuthInstance({
        currentUser: {
          uid: 'spoof-attacker-uid',
          email: 'Khalidalami5555@gmail.com',
          emailVerified: false // Unverified!
        }
      } as any);

      mocks.getDoc.mockResolvedValue(createDocSnap('spoof-attacker-uid', false));

      const isAdmin = await checkIsAdminInFirestore();
      expect(isAdmin).toBe(false);

      const profile = await createOrFetchUserProfile({
        uid: 'spoof-attacker-uid',
        email: 'Khalidalami5555@gmail.com',
        emailVerified: false
      } as any);

      expect(profile.isAdmin).toBe(false);
    });

    it('strips isAdmin and role when normal users call updateUserProfileInFirestore', async () => {
      _setTestAuthInstance({
        currentUser: {
          uid: 'user-regular-123',
          email: 'regular@example.com',
          emailVerified: true
        }
      } as any);

      mocks.setDoc.mockResolvedValue(undefined);

      // Attempt to self-grant admin via profile update
      await updateUserProfileInFirestore('user-regular-123', {
        name: 'Regular Athlete',
        isAdmin: true,
        role: 'admin',
        canOrganize: true
      } as any);

      expect(mocks.setDoc).toHaveBeenCalledTimes(1);
      const [docRef, payload] = mocks.setDoc.mock.calls[0];
      expect(docRef.path).toBe('users/user-regular-123');

      // Privileged fields must be completely stripped from outgoing payload
      expect(payload.isAdmin).toBeUndefined();
      expect(payload.role).toBeUndefined();
      expect(payload.canOrganize).toBeUndefined();
      expect(payload.name).toBe('Regular Athlete');
    });
  });

  describe('4. Normal account cannot read or modify protected moderation logs or perform admin-only actions', () => {
    it('rejects logging moderation actions if not authenticated', async () => {
      _setTestAuthInstance(null);
      await expect(
        logModerationAction({
          action: 'cancel_game',
          targetType: 'game',
          targetId: 'game-123'
        })
      ).rejects.toThrow('User must be authenticated to log moderation actions.');
    });

    it('propagates permission error if a non-admin attempts to moderate cancel game', async () => {
      _setTestAuthInstance({
        currentUser: {
          uid: 'user-regular-123',
          email: 'regular@example.com',
          emailVerified: true
        }
      } as any);

      mocks.getDoc.mockResolvedValue(
        createDocSnap('game-violating', true, {
          title: 'Violating Game',
          organizerId: 'other-user',
          status: 'Open'
        })
      );

      // updateDoc throws permission-denied (enforced by firestore.rules server-side)
      mocks.updateDoc.mockRejectedValue(new Error('Missing or insufficient permissions'));

      await expect(
        moderateCancelGameInFirestore('game-violating', 'Spam game')
      ).rejects.toThrow('Missing or insufficient permissions');
    });

    it('propagates permission error if a non-admin attempts to restrict athlete organizing', async () => {
      _setTestAuthInstance({
        currentUser: {
          uid: 'user-regular-123',
          email: 'regular@example.com',
          emailVerified: true
        }
      } as any);

      mocks.updateDoc.mockRejectedValue(new Error('Missing or insufficient permissions'));

      await expect(
        setAthleteOrganizingStatus('target-user-456', false, 'Disciplinary')
      ).rejects.toThrow('Missing or insufficient permissions');
    });

    it('propagates permission error if a non-admin queries moderation logs', async () => {
      _setTestAuthInstance({
        currentUser: {
          uid: 'user-regular-123',
          email: 'regular@example.com',
          emailVerified: true
        }
      } as any);

      mocks.getDocs.mockRejectedValue(new Error('Missing or insufficient permissions'));

      await expect(
        fetchModerationLogsFromFirestore()
      ).rejects.toThrow('Missing or insufficient permissions');
    });
  });

  describe('5. Normal account can still use ordinary app features', () => {
    it('allows normal account to submit reports', async () => {
      _setTestAuthInstance({
        currentUser: {
          uid: 'user-regular-123',
          email: 'regular@example.com',
          emailVerified: true
        }
      } as any);

      mocks.getDoc.mockResolvedValue(createDocSnap('rep_user-regular-123_u_bad-player', false));
      mocks.setDoc.mockResolvedValue(undefined);

      const reportId = await createReportInFirestore({
        reportedUserId: 'bad-player',
        reason: 'harassment',
        details: 'Unsportsmanlike conduct during match'
      });

      expect(reportId).toBe('rep_user-regular-123_u_bad-player');
      expect(mocks.setDoc).toHaveBeenCalledTimes(1);
    });

    it('allows normal account to update their allowed public profile fields', async () => {
      _setTestAuthInstance({
        currentUser: {
          uid: 'user-regular-123',
          email: 'regular@example.com',
          emailVerified: true
        }
      } as any);

      mocks.setDoc.mockResolvedValue(undefined);

      await updateUserProfileInFirestore('user-regular-123', {
        name: 'Updated Name',
        bio: 'Avid Padel and Football enthusiast in Salmiya.',
        area: 'Salmiya'
      });

      expect(mocks.setDoc).toHaveBeenCalledTimes(1);
      const [, payload] = mocks.setDoc.mock.calls[0];
      expect(payload.name).toBe('Updated Name');
      expect(payload.bio).toContain('Salmiya');
      expect(payload.area).toBe('Salmiya');
    });
  });

  describe('6. Admin privileges remain correct after refresh, sign-out/sign-in, and profile loading', () => {
    it('maintains non-admin state across re-fetches and sign-in cycles', async () => {
      // 1. First sign in
      _setTestAuthInstance({
        currentUser: {
          uid: 'user-regular-123',
          email: 'regular@example.com',
          emailVerified: true
        }
      } as any);

      mocks.getDoc.mockImplementation(async (ref: any) => {
        if (ref.path === 'admins/user-regular-123') {
          return createDocSnap('user-regular-123', false);
        }
        if (ref.path === 'users/user-regular-123') {
          return createDocSnap('user-regular-123', true, {
            id: 'user-regular-123',
            name: 'Regular Athlete'
          });
        }
        return createDocSnap('other', false);
      });

      const profile1 = await createOrFetchUserProfile({
        uid: 'user-regular-123',
        email: 'regular@example.com',
        emailVerified: true
      } as any);
      expect(profile1.isAdmin).toBe(false);

      // 2. Sign out
      _setTestAuthInstance(null);
      const isLoggedOutAdmin = await checkIsAdminInFirestore();
      expect(isLoggedOutAdmin).toBe(false);

      // 3. Sign in again (simulate page reload / re-auth)
      _setTestAuthInstance({
        currentUser: {
          uid: 'user-regular-123',
          email: 'regular@example.com',
          emailVerified: true
        }
      } as any);

      const isReauthAdmin = await checkIsAdminInFirestore();
      expect(isReauthAdmin).toBe(false);

      const profile2 = await createOrFetchUserProfile({
        uid: 'user-regular-123',
        email: 'regular@example.com',
        emailVerified: true
      } as any);
      expect(profile2.isAdmin).toBe(false);
    });

    it('maintains intended administrator state across re-fetches and sign-in cycles', async () => {
      // 1. Initial sign in
      _setTestAuthInstance({
        currentUser: {
          uid: 'admin-khalid-uid',
          email: 'khalidalami5555@gmail.com',
          emailVerified: true
        }
      } as any);

      mocks.getDoc.mockResolvedValue(createDocSnap('admin-khalid-uid', true));
      mocks.setDoc.mockResolvedValue(undefined);

      const isFirstAdmin = await checkIsAdminInFirestore();
      expect(isFirstAdmin).toBe(true);

      const profile = await createOrFetchUserProfile({
        uid: 'admin-khalid-uid',
        email: 'khalidalami5555@gmail.com',
        emailVerified: true
      } as any);
      expect(profile.isAdmin).toBe(true);

      // 2. Simulate refresh / re-checking
      const isSecondAdmin = await checkIsAdminInFirestore();
      expect(isSecondAdmin).toBe(true);
    });
  });
});
