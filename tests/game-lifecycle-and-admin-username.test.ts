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
    onSnapshot: vi.fn(),
    addDoc: vi.fn()
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
    addDoc: (...args: any[]) => mocks.addDoc(...args),
    query: (...args: any[]) => ({ _query: true, args }),
    where: (...args: any[]) => ({ _where: true, args }),
    limit: (...args: any[]) => ({ _limit: true, args }),
    orderBy: (...args: any[]) => ({ _orderBy: true, args }),
    serverTimestamp: () => ({ _serverTimestamp: true }),
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
  getKuwaitGameEndTimestamp,
  isGameExpiredKuwait,
  validateUsername,
  checkUsernameAvailability,
  joinGameInFirestore,
  leaveGameInFirestore,
  updateGameInFirestore,
  sendGameChatMessage,
  adminModeratePlayerProfileInFirestore,
  _setTestAuthInstance,
  _setTestDbInstance
} from '../src/lib/firebase';
import { GameParticipant } from '../src/types';

describe('Game Lifecycle Restrictions, Discovery Cleanup & Admin Username Editing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _setTestDbInstance({} as any);
    _setTestAuthInstance({
      currentUser: { uid: 'admin-123', email: 'khalidalami5555@gmail.com' }
    } as any);
  });

  describe('Requirement 2: Kuwait Timezone & Game Expiration Handling', () => {
    it('accurately parses Kuwait timezone game end timestamp (UTC+3, no DST)', () => {
      const game = {
        date: '2026-11-05',
        startTime: '18:00',
        endTime: '20:00'
      };
      const endTs = getKuwaitGameEndTimestamp(game);
      expect(endTs).toBe(Date.parse('2026-11-05T20:00:00+03:00'));
      expect(new Date(endTs!).toISOString()).toBe('2026-11-05T17:00:00.000Z');
    });

    it('correctly handles midnight-crossing games spanning into the next calendar day', () => {
      const game = {
        date: '2026-11-05',
        startTime: '23:00',
        endTime: '01:00'
      };
      const endTs = getKuwaitGameEndTimestamp(game);
      expect(endTs).toBe(Date.parse('2026-11-06T01:00:00+03:00'));
      expect(new Date(endTs!).toISOString()).toBe('2026-11-05T22:00:00.000Z');
    });

    it('identifies past games as expired when today is November 9 and game was November 5', () => {
      const pastGame = {
        date: '2026-11-05',
        startTime: '18:00',
        endTime: '20:00',
        status: 'Open'
      };
      expect(isGameExpiredKuwait(pastGame)).toBe(true);
    });

    it('identifies future games as not expired', () => {
      const futureGame = {
        date: '2026-12-01',
        startTime: '18:00',
        endTime: '20:00',
        status: 'Open'
      };
      expect(isGameExpiredKuwait(futureGame)).toBe(false);
    });

    it('considers Completed or Cancelled games as expired for discovery purposes', () => {
      const completedGame = {
        date: '2026-12-01',
        startTime: '18:00',
        endTime: '20:00',
        status: 'Completed'
      };
      expect(isGameExpiredKuwait(completedGame)).toBe(true);

      const cancelledGame = {
        date: '2026-12-01',
        startTime: '18:00',
        endTime: '20:00',
        status: 'Cancelled'
      };
      expect(isGameExpiredKuwait(cancelledGame)).toBe(true);
    });
  });

  describe('Requirement 1: Lock All Features for Cancelled or Completed Games', () => {
    it('rejects joining a Cancelled game in Firestore transaction', async () => {
      const mockGameDoc = {
        exists: () => true,
        data: () => ({
          status: 'Cancelled',
          participants: [],
          participantIds: [],
          maxPlayers: 10
        })
      };

      mocks.runTransaction.mockImplementation(async (db, updateFunction) => {
        const tx = {
          get: vi.fn().mockResolvedValue(mockGameDoc),
          update: vi.fn(),
          set: vi.fn()
        };
        return updateFunction(tx);
      });

      const participant: GameParticipant = {
        userId: 'player-1',
        name: 'Ahmed',
        username: 'ahmed_k',
        avatar: '',
        skill: 'Intermediate',
        paymentStatus: 'Paid',
        paidAmountKWD: 0,
        joinedAt: new Date().toISOString()
      };

      await expect(joinGameInFirestore('game-cancelled', participant)).rejects.toThrow(
        /This game has been cancelled/i
      );
    });

    it('rejects joining a Completed game in Firestore transaction', async () => {
      const mockGameDoc = {
        exists: () => true,
        data: () => ({
          status: 'Completed',
          participants: [],
          participantIds: [],
          maxPlayers: 10
        })
      };

      mocks.runTransaction.mockImplementation(async (db, updateFunction) => {
        const tx = {
          get: vi.fn().mockResolvedValue(mockGameDoc),
          update: vi.fn(),
          set: vi.fn()
        };
        return updateFunction(tx);
      });

      const participant: GameParticipant = {
        userId: 'player-1',
        name: 'Ahmed',
        username: 'ahmed_k',
        avatar: '',
        skill: 'Intermediate',
        paymentStatus: 'Paid',
        paidAmountKWD: 0,
        joinedAt: new Date().toISOString()
      };

      await expect(joinGameInFirestore('game-completed', participant)).rejects.toThrow(
        /This game has ended and can no longer be joined/i
      );
    });

    it('rejects joining an expired game even if stored status was Open', async () => {
      const mockGameDoc = {
        exists: () => true,
        data: () => ({
          status: 'Open',
          date: '2026-11-05',
          startTime: '18:00',
          endTime: '20:00',
          participants: [],
          participantIds: [],
          maxPlayers: 10
        })
      };

      mocks.runTransaction.mockImplementation(async (db, updateFunction) => {
        const tx = {
          get: vi.fn().mockResolvedValue(mockGameDoc),
          update: vi.fn(),
          set: vi.fn()
        };
        return updateFunction(tx);
      });

      const participant: GameParticipant = {
        userId: 'player-1',
        name: 'Ahmed',
        username: 'ahmed_k',
        avatar: '',
        skill: 'Intermediate',
        paymentStatus: 'Paid',
        paidAmountKWD: 0,
        joinedAt: new Date().toISOString()
      };

      await expect(joinGameInFirestore('game-expired', participant)).rejects.toThrow(
        /This game has ended and can no longer be joined/i
      );
    });

    it('rejects leaving a Cancelled or Completed game', async () => {
      const mockGameDoc = {
        exists: () => true,
        data: () => ({
          status: 'Completed',
          participants: [{ userId: 'player-1' }],
          participantIds: ['player-1'],
          organizerId: 'organizer-1'
        })
      };

      mocks.runTransaction.mockImplementation(async (db, updateFunction) => {
        const tx = {
          get: vi.fn().mockResolvedValue(mockGameDoc),
          update: vi.fn()
        };
        return updateFunction(tx);
      });

      await expect(leaveGameInFirestore('game-completed', 'player-1')).rejects.toThrow(
        /already ended and is read-only/i
      );
    });

    it('rejects updating game details when game is Cancelled or Completed', async () => {
      const mockGameDoc = {
        exists: () => true,
        data: () => ({
          status: 'Cancelled',
          organizerId: 'organizer-1'
        })
      };

      mocks.runTransaction.mockImplementation(async (db, updateFunction) => {
        const tx = {
          get: vi.fn().mockResolvedValue(mockGameDoc),
          update: vi.fn()
        };
        return updateFunction(tx);
      });

      await expect(
        updateGameInFirestore('game-cancelled', { title: 'New Title' }, 'organizer-1')
      ).rejects.toThrow(/cannot be edited or reopened/i);
    });

    it('blocks regular users from sending chat messages in Cancelled or Completed games', async () => {
      mocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          status: 'Cancelled',
          participantIds: ['user-1']
        })
      });

      _setTestAuthInstance({
        currentUser: { uid: 'user-1', email: 'regular@la3ibkw.com' }
      } as any);

      await expect(
        sendGameChatMessage('game-cancelled', {
          text: 'Hello team'
        })
      ).rejects.toThrow(/ended or was cancelled/i);
    });

    it('allows admin moderation chat messages even on closed games if necessary', async () => {
      mocks.getDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            status: 'Cancelled',
            participantIds: ['admin-123']
          })
        })
        .mockResolvedValueOnce({
          // admin doc check
          exists: () => true,
          data: () => ({ isAdmin: true })
        })
        .mockResolvedValueOnce({
          // game doc check for notifications
          exists: () => true,
          data: () => ({
            organizerId: 'organizer-1',
            participantIds: ['admin-123']
          })
        });

      _setTestAuthInstance({
        currentUser: { uid: 'admin-123', email: 'khalidalami5555@gmail.com' }
      } as any);

      const msgId = await sendGameChatMessage('game-cancelled', {
        text: 'Administrative notice: Match concluded.'
      });

      expect(msgId).toBeDefined();
    });
  });

  describe('Requirement 3: Allow Admins to Edit Usernames', () => {
    it('validates username format with application rules (3-25 chars, alphanumeric + underscore)', () => {
      expect(validateUsername('').valid).toBe(false);
      expect(validateUsername('ab').valid).toBe(false);
      expect(validateUsername('toolongusername_that_exceeds_twenty_five_characters').valid).toBe(false);
      expect(validateUsername('user-invalid!').valid).toBe(false);
      expect(validateUsername('user name').valid).toBe(false);

      expect(validateUsername('khalid').valid).toBe(true);
      expect(validateUsername('player_99').valid).toBe(true);
      expect(validateUsername('kuwait_striker_10').valid).toBe(true);
    });

    it('verifies username availability and rejects taken usernames', async () => {
      mocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ uid: 'other-user-999' })
      });

      const check = await checkUsernameAvailability('taken_name', 'current-user-123');
      expect(check.available).toBe(false);
      expect(check.error).toBe('Username is already taken.');
    });

    it('allows keeping current username for the same user', async () => {
      mocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ uid: 'user-123' })
      });

      const check = await checkUsernameAvailability('my_existing_name', 'user-123');
      expect(check.available).toBe(true);
    });

    it('allows admin to atomically update a user username in Firestore batch', async () => {
      // 1. Target user exists
      mocks.getDoc
        // target user profile doc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            uid: 'target-player-456',
            username: 'old_handle',
            name: 'Old Name'
          })
        })
        // new username reservation check
        .mockResolvedValueOnce({
          exists: () => false
        });

      const batchSet = vi.fn();
      const batchDelete = vi.fn();
      const batchCommit = vi.fn().mockResolvedValue(undefined);

      mocks.writeBatch.mockReturnValue({
        set: batchSet,
        delete: batchDelete,
        commit: batchCommit
      });

      await adminModeratePlayerProfileInFirestore(
        'target-player-456',
        {
          username: 'new_pro_handle',
          name: 'Updated Display Name'
        },
        'admin-123',
        'Moderating username and display name'
      );

      // Verify old username reservation deleted
      expect(batchDelete).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'usernames/old_handle' })
      );

      // Verify new username reservation claimed
      expect(batchSet).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'usernames/new_pro_handle' }),
        expect.objectContaining({
          username: 'new_pro_handle',
          uid: 'target-player-456'
        })
      );

      // Verify user document updated with new username and display name
      expect(mocks.updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/target-player-456' }),
        expect.objectContaining({
          username: 'new_pro_handle',
          name: 'Updated Display Name'
        })
      );

      expect(batchCommit).toHaveBeenCalled();
    });

    it('rejects username update if new username is already taken by someone else', async () => {
      mocks.getDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            uid: 'target-player-456',
            username: 'old_handle'
          })
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            uid: 'other-user-777',
            username: 'already_taken'
          })
        });

      await expect(
        adminModeratePlayerProfileInFirestore(
          'target-player-456',
          { username: 'already_taken' },
          'admin-123',
          'Testing duplicate handle'
        )
      ).rejects.toThrow(/already taken/i);
    });

    it('strictly blocks non-public private fields from admin moderation payload', async () => {
      mocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          uid: 'target-player-456',
          username: 'old_handle'
        })
      });

      await expect(
        adminModeratePlayerProfileInFirestore(
          'target-player-456',
          { email: 'hacked@email.com' } as any,
          'admin-123',
          'Testing malicious private edit'
        )
      ).rejects.toThrow(/prohibited from modifying non-public fields/i);
    });
  });

  describe('Existing Active Games Function Normally', () => {
    it('allows joining an active Open game with available spots', async () => {
      const mockGameDoc = {
        exists: () => true,
        data: () => ({
          status: 'Open',
          date: '2026-12-15',
          startTime: '19:00',
          endTime: '21:00',
          participants: [],
          participantIds: [],
          maxPlayers: 10
        })
      };

      mocks.runTransaction.mockImplementation(async (db, updateFunction) => {
        const tx = {
          get: vi.fn().mockResolvedValue(mockGameDoc),
          update: vi.fn(),
          set: vi.fn()
        };
        return updateFunction(tx);
      });

      const participant: GameParticipant = {
        userId: 'player-valid',
        name: 'Saad',
        username: 'saad_kw',
        avatar: '',
        skill: 'Intermediate',
        paymentStatus: 'Paid',
        paidAmountKWD: 0,
        joinedAt: new Date().toISOString()
      };

      const result = await joinGameInFirestore('active-game-1', participant);
      expect(result).toBeDefined();
    });
  });
});
