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
    doc: vi.fn(),
    collection: vi.fn(),
    writeBatch: vi.fn(),
    onSnapshot: vi.fn()
  };
});

// Mock firebase/firestore module using Vitest's module mocking
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
      return {
        _path: path,
        path,
        id,
        type: 'document'
      };
    },
    collection: (...args: any[]) => {
      const parts = args.slice(1);
      const path = parts.join('/');
      const id = parts[parts.length - 1] || 'mock-col-id';
      return {
        _path: path,
        path,
        id,
        type: 'collection'
      };
    }
  };
});

import {
  joinGameInFirestore,
  leaveGameInFirestore,
  cancelGameInFirestore,
  followPlayerInFirestore,
  unfollowPlayerInFirestore,
  sendFriendRequestInFirestore,
  cancelFriendRequestInFirestore,
  sendGameInviteInFirestore,
  acceptGameInviteInFirestore,
  createReportInFirestore,
  reviewReportInFirestore,
  resolveReportInFirestore,
  dismissReportInFirestore,
  fetchReportsFromFirestore,
  subscribeToReportsInFirestore,
  checkIsAdminInFirestore,
  createOrFetchUserProfile,
  moderateCancelGameInFirestore,
  setAthleteOrganizingStatus,
  fetchTargetModerationHistory,
  sendGameChatMessage,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  checkUsernameAvailability,
  updateUserProfileInFirestore,
  blockPlayerInFirestore,
  unblockPlayerInFirestore,
  _setTestAuthInstance,
  _setTestDbInstance
} from '../src/lib/firebase';
import type { GameParticipant } from '../src/types';

describe('Phase 4: Service-Level Firestore Integration Tests', () => {
  const mockDb = { type: 'firestore-mock' } as any;
  let mockAuth: any = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = {
      currentUser: {
        uid: 'user-auth-1',
        displayName: 'Ahmad Al-Sabah',
        email: 'ahmad@example.com',
        photoURL: 'https://example.com/ahmad.jpg'
      }
    };
    _setTestDbInstance(mockDb);
    _setTestAuthInstance(mockAuth);
  });

  // Helper to construct a simulated DocumentSnapshot
  function createDocSnap(id: string, exists: boolean, data: Record<string, any> = {}) {
    return {
      id,
      ref: { path: `docs/${id}`, id },
      exists: () => exists,
      data: () => (exists ? data : undefined)
    };
  }

  // -------------------------------------------------------------
  // 1. GAME JOIN & LEAVE
  // -------------------------------------------------------------
  describe('Game Join & Leave Service Layer', () => {
    const validParticipant: GameParticipant = {
      userId: 'user-player-2',
      name: 'Khaled',
      username: 'khaled_striker',
      avatar: 'https://example.com/khaled.jpg',
      skill: 'Intermediate',
      paymentStatus: 'unpaid',
      paidAmountKWD: 0,
      joinedAt: 'Just now',
      paymentMethod: 'KNET',
      attendanceConfirmed: false
    };

    it('rejects joinGameInFirestore when the match document does not exist', async () => {
      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockResolvedValue(createDocSnap('game-nonexistent', false))
        };
        return callback(mockTx);
      });

      await expect(joinGameInFirestore('game-nonexistent', validParticipant)).rejects.toThrow();
    });

    it('rejects joinGameInFirestore when a community block restriction exists between host and player', async () => {
      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            const path = ref?.path || ref?._path || '';
            if (path.includes('blocked')) {
              return createDocSnap('block-doc', true, { blockedAt: '2026-10-10' });
            }
            return createDocSnap('game-1', true, {
              organizerId: 'user-host',
              status: 'Open',
              maxPlayers: 10,
              participants: [{ userId: 'user-host', name: 'Host' }]
            });
          })
        };
        return callback(mockTx);
      });

      await expect(joinGameInFirestore('game-1', validParticipant)).rejects.toThrow();
    });

    it('rejects joinGameInFirestore when game is already Full or at maximum capacity', async () => {
      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            const path = ref?.path || ref?._path || '';
            if (path.includes('blocked')) return createDocSnap('block', false);
            return createDocSnap('game-full', true, {
              organizerId: 'user-host',
              status: 'Full',
              maxPlayers: 2,
              participants: [
                { userId: 'user-host', name: 'Host' },
                { userId: 'user-other', name: 'Other' }
              ]
            });
          })
        };
        return callback(mockTx);
      });

      await expect(joinGameInFirestore('game-full', validParticipant)).rejects.toThrow();
    });

    it('rejects joinGameInFirestore when game is Cancelled or Completed', async () => {
      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            const path = ref?.path || ref?._path || '';
            if (path.includes('blocked')) return createDocSnap('block', false);
            return createDocSnap('game-cancelled', true, {
              organizerId: 'user-host',
              status: 'Cancelled',
              maxPlayers: 10,
              participants: [{ userId: 'user-host', name: 'Host' }]
            });
          })
        };
        return callback(mockTx);
      });

      await expect(joinGameInFirestore('game-cancelled', validParticipant)).rejects.toThrow();
    });

    it('rejects duplicate joins when player is already in participant list', async () => {
      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            const path = ref?.path || ref?._path || '';
            if (path.includes('blocked')) return createDocSnap('block', false);
            return createDocSnap('game-1', true, {
              organizerId: 'user-host',
              status: 'Open',
              maxPlayers: 10,
              participants: [
                { userId: 'user-host', name: 'Host' },
                { userId: 'user-player-2', name: 'Khaled' }
              ],
              participantIds: ['user-host', 'user-player-2']
            });
          })
        };
        return callback(mockTx);
      });

      await expect(joinGameInFirestore('game-1', validParticipant)).rejects.toThrow();
    });

    it('coordinates atomic game update, payment record, and organizer notification upon valid join', async () => {
      let updatedPayload: any = null;
      let paymentPayload: any = null;
      let notificationPayload: any = null;

      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            const path = ref?.path || ref?._path || '';
            if (path.includes('blocked')) return createDocSnap('block', false);
            return createDocSnap('game-1', true, {
              organizerId: 'user-host',
              organizerName: 'Bader Al-Mutawa',
              status: 'Open',
              maxPlayers: 4,
              pricePerPlayerKWD: 2.5,
              sport: 'Football',
              title: 'Mishref 5v5',
              participants: [
                { userId: 'user-host', name: 'Bader', paymentStatus: 'Paid', paidAmountKWD: 2.5 }
              ],
              participantIds: ['user-host']
            });
          }),
          update: vi.fn().mockImplementation((_ref, payload) => {
            updatedPayload = payload;
          }),
          set: vi.fn().mockImplementation((ref: any, payload: any) => {
            const path = ref?.path || ref?._path || ref?.id || '';
            if (String(path).includes('payments') || payload.amountKWD !== undefined) {
              paymentPayload = payload;
            } else {
              notificationPayload = payload;
            }
          })
        };
        return callback(mockTx);
      });

      const result = await joinGameInFirestore('game-1', validParticipant);

      expect(result.id).toBe('game-1');
      expect(result.participants.length).toBe(2);
      expect(updatedPayload).not.toBeNull();
      expect(updatedPayload.currentPlayers).toBe(2);
      expect(updatedPayload.status).toBe('Open');
      expect(updatedPayload.participantIds).toContain('user-player-2');

      // Payment subcollection initialization
      expect(paymentPayload).not.toBeNull();
      expect(paymentPayload.userId).toBe('user-player-2');
      expect(paymentPayload.amountKWD).toBe(2.5);
      expect(paymentPayload.currency).toBe('KWD');
      expect(paymentPayload.status).toBe('unpaid');

      // Notification generated for organizer
      expect(notificationPayload).not.toBeNull();
      expect(notificationPayload.userId).toBe('user-host');
      expect(notificationPayload.type).toBe('game_join');
    });

    it('transitions game status to Almost Full and triggers almost-full notification', async () => {
      const notifs: any[] = [];

      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            const path = ref?.path || ref?._path || '';
            if (path.includes('blocked')) return createDocSnap('block', false);
            return createDocSnap('game-1', true, {
              organizerId: 'user-host',
              status: 'Open',
              maxPlayers: 3,
              participants: [
                { userId: 'user-host', name: 'Bader' }
              ],
              participantIds: ['user-host']
            });
          }),
          update: vi.fn(),
          set: vi.fn().mockImplementation((_ref, payload) => {
            if (payload.type) notifs.push(payload);
          })
        };
        return callback(mockTx);
      });

      const res = await joinGameInFirestore('game-1', validParticipant);
      expect(res.status).toBe('Almost Full');
      const types = notifs.map(n => n.type);
      expect(types).toContain('game_join');
      expect(types).toContain('game_almost_full');
    });

    it('prevents game organizer from leaving their own game', async () => {
      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockResolvedValue(
            createDocSnap('game-1', true, {
              organizerId: 'user-auth-1',
              participants: [{ userId: 'user-auth-1', name: 'Host' }]
            })
          )
        };
        return callback(mockTx);
      });

      await expect(leaveGameInFirestore('game-1', 'user-auth-1')).rejects.toThrow();
    });

    it('rejects leaveGameInFirestore when user is not a participant', async () => {
      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockResolvedValue(
            createDocSnap('game-1', true, {
              organizerId: 'host-1',
              participants: [{ userId: 'host-1', name: 'Host' }],
              participantIds: ['host-1']
            })
          )
        };
        return callback(mockTx);
      });

      await expect(leaveGameInFirestore('game-1', 'user-auth-1')).rejects.toThrow();
    });

    it('updates roster, adjusts capacity status, and transitions payment record to refunded on leave', async () => {
      let gameUpdates: any = null;
      let paymentUpdates: any = null;

      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            const path = String(ref?.path || ref?._path || '');
            if (path.includes('payments')) {
              return createDocSnap('payment-1', true, { status: 'Paid', amountKWD: 3.0 });
            }
            return createDocSnap('game-1', true, {
              organizerId: 'user-host',
              status: 'Full',
              maxPlayers: 2,
              participants: [
                { userId: 'user-host', name: 'Host' },
                { userId: 'user-player-leaving', name: 'Leaver' }
              ],
              participantIds: ['user-host', 'user-player-leaving']
            });
          }),
          update: vi.fn().mockImplementation((ref: any, payload: any) => {
            const path = String(ref?.path || ref?._path || '');
            if (path.includes('payments')) {
              paymentUpdates = payload;
            } else {
              gameUpdates = payload;
            }
          }),
          set: vi.fn()
        };
        return callback(mockTx);
      });

      const updatedGame = await leaveGameInFirestore('game-1', 'user-player-leaving');

      expect(updatedGame.participants.length).toBe(1);
      expect(updatedGame.status).toBe('Almost Full');
      expect(gameUpdates).not.toBeNull();
      expect(gameUpdates.currentPlayers).toBe(1);
      expect(gameUpdates.participantIds).toEqual(['user-host']);

      // Payment transition from Paid -> refunded
      expect(paymentUpdates).not.toBeNull();
      expect(paymentUpdates.status).toBe('refunded');
    });

    it('allows game organizer to cancel their own game and preserves roster and historical records', async () => {
      let updatePayload: any = null;
      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockResolvedValue(
            createDocSnap('game-organizer-cancel', true, {
              organizerId: 'user-auth-1',
              title: 'Friday Pickup Match',
              status: 'Open',
              maxPlayers: 10,
              currentPlayers: 2,
              pricePerPlayerKWD: 3,
              totalCourtCostKWD: 30,
              participants: [
                { userId: 'user-auth-1', name: 'Host' },
                { userId: 'user-player-2', name: 'Khaled' }
              ],
              participantIds: ['user-auth-1', 'user-player-2']
            })
          ),
          update: vi.fn().mockImplementation((_ref, payload) => {
            updatePayload = payload;
          })
        };
        return callback(mockTx);
      });

      const cancelledGame = await cancelGameInFirestore('game-organizer-cancel', 'user-auth-1', 'Rain forecast');

      expect(cancelledGame.status).toBe('Cancelled');
      expect(cancelledGame.participants.length).toBe(2);
      expect(updatePayload).not.toBeNull();
      expect(updatePayload.status).toBe('Cancelled');
      expect(updatePayload.description).toContain('[Cancelled: Rain forecast]');
    });

    it('rejects game cancellation when caller is not the organizer', async () => {
      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockResolvedValue(
            createDocSnap('game-other', true, {
              organizerId: 'different-host',
              status: 'Open',
              participants: [{ userId: 'different-host', name: 'Host' }]
            })
          ),
          update: vi.fn()
        };
        return callback(mockTx);
      });

      await expect(
        cancelGameInFirestore('game-other', 'user-auth-1', 'Unauthorized cancel')
      ).rejects.toThrow('Only the organizer can cancel this game.');
    });
  });

  // -------------------------------------------------------------
  // 2. COMMUNITY RELATIONSHIPS (FOLLOW / FRIEND REQUESTS)
  // -------------------------------------------------------------
  describe('Community Relationships Service Layer', () => {
    it('rejects self-follow before querying or writing to database', async () => {
      await expect(followPlayerInFirestore('user-auth-1')).rejects.toThrow();
      expect(mocks.runTransaction).not.toHaveBeenCalled();
    });

    it('rejects follow when blocking restrictions exist', async () => {
      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            const path = String(ref?.path || ref?._path || '');
            if (path.includes('blocked')) {
              return createDocSnap('block', true);
            }
            return createDocSnap('user', true, { followerCount: 0 });
          })
        };
        return callback(mockTx);
      });

      await expect(followPlayerInFirestore('user-target-blocked')).rejects.toThrow();
    });

    it('safely handles duplicate follow actions as a no-op without double incrementing counters', async () => {
      const setCalls: any[] = [];
      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            const path = String(ref?.path || ref?._path || '');
            if (path.includes('blocked')) return createDocSnap('block', false);
            if (path.includes('following')) {
              return createDocSnap('following-doc', true);
            }
            return createDocSnap('target-user', true, { followerCount: 5 });
          }),
          set: vi.fn().mockImplementation((_ref, payload) => setCalls.push(payload)),
          delete: vi.fn()
        };
        return callback(mockTx);
      });

      await followPlayerInFirestore('user-already-followed');
      expect(setCalls.length).toBe(0);
    });

    it('creates follow relationship documents and increments respective counters atomically', async () => {
      const writes: any[] = [];
      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            const path = String(ref?.path || ref?._path || '');
            if (path.includes('blocked')) return createDocSnap('block', false);
            if (path.includes('following')) return createDocSnap('following-doc', false);
            if (path.includes('user-target-1')) {
              return createDocSnap('user-target-1', true, { followerCount: 2 });
            }
            return createDocSnap('user-auth-1', true, { followingCount: 0 });
          }),
          set: vi.fn().mockImplementation((_ref, payload) => writes.push(payload))
        };
        return callback(mockTx);
      });

      await followPlayerInFirestore('user-target-1');
      expect(writes.length).toBe(4);
      const targetUserUpdate = writes.find(w => w.followerCount !== undefined);
      const currentUserUpdate = writes.find(w => w.followingCount !== undefined);
      expect(targetUserUpdate.followerCount).toBe(3);
      expect(currentUserUpdate.followingCount).toBe(1);
    });

    it('unfollowPlayerInFirestore safely decrements counters and prevents negative counter drift', async () => {
      const sets: any[] = [];
      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            const path = String(ref?.path || ref?._path || '');
            if (path.includes('following')) return createDocSnap('following-doc', true);
            if (path.includes('user-target-1')) {
              return createDocSnap('user-target-1', true, { followerCount: 0 });
            }
            return createDocSnap('user-auth-1', true, { followingCount: 1 });
          }),
          delete: vi.fn(),
          set: vi.fn().mockImplementation((_ref, payload) => sets.push(payload))
        };
        return callback(mockTx);
      });

      await unfollowPlayerInFirestore('user-target-1');
      const targetUpdate = sets.find(s => s.followerCount !== undefined);
      expect(targetUpdate.followerCount).toBe(0);
    });

    it('sendFriendRequestInFirestore rejects self requests', async () => {
      await expect(sendFriendRequestInFirestore('user-auth-1')).rejects.toThrow();
    });

    it('sendFriendRequestInFirestore automatically resolves bidirectional pending requests into mutual friendship', async () => {
      mocks.getDoc.mockImplementation(async (ref: any) => {
        const path = String(ref?.path || ref?._path || '');
        if (path.includes('blocked')) return createDocSnap('b', false);
        if (path.includes('friends')) return createDocSnap('f', false);
        if (path.includes('users/user-auth-1/friendRequests/target-user')) {
          return createDocSnap('reverse-req', true, { status: 'pending' });
        }
        return createDocSnap('target-user', true, { name: 'Target Athlete', friendCount: 1 });
      });

      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            const path = String(ref?.path || ref?._path || '');
            if (path.includes('blocked')) return createDocSnap('b', false);
            if (path.includes('friends')) return createDocSnap('f', false);
            if (path.includes('friendRequests')) return createDocSnap('req', true, { status: 'pending' });
            return createDocSnap('user', true, { friendCount: 1 });
          }),
          delete: vi.fn(),
          set: vi.fn()
        };
        return callback(mockTx);
      });

      await sendFriendRequestInFirestore('target-user');
      expect(mocks.runTransaction).toHaveBeenCalled();
    });

    it('cancelFriendRequestInFirestore deletes pending doc without generating notifications', async () => {
      mocks.deleteDoc.mockResolvedValue(undefined);
      mocks.getDoc.mockResolvedValue(createDocSnap('req-1', true));

      await cancelFriendRequestInFirestore('target-user');
      expect(mocks.deleteDoc).toHaveBeenCalled();
    });

    it('blockPlayerInFirestore creates block record under user path and executes reciprocal cleanup', async () => {
      const setCalls: { path: string; data: any }[] = [];
      const deleteCalls: string[] = [];
      const batchCommit = vi.fn().mockResolvedValue(undefined);

      mocks.writeBatch.mockReturnValue({
        set: (ref: any, data: any) => setCalls.push({ path: String(ref?.path || ref?._path || ''), data }),
        delete: (ref: any) => deleteCalls.push(String(ref?.path || ref?._path || '')),
        update: vi.fn(),
        commit: batchCommit
      });

      mocks.getDoc.mockImplementation(async (ref: any) => {
        const path = String(ref?.path || ref?._path || '');
        if (path === 'users/user-auth-1') {
          return createDocSnap('user-auth-1', true, { followingCount: 1, followerCount: 1, friendCount: 1 });
        }
        if (path === 'users/target-player') {
          return createDocSnap('target-player', true, { followingCount: 1, followerCount: 1, friendCount: 1 });
        }
        // simulate existing B -> A following
        if (path === 'users/target-player/following/user-auth-1') {
          return createDocSnap('follow', true, {});
        }
        return createDocSnap('snap', false);
      });

      mocks.getDocs.mockResolvedValue({ docs: [] });

      await blockPlayerInFirestore('target-player');

      // Verify block record write path and fields
      const blockRecord = setCalls.find(c => c.path === 'users/user-auth-1/blocked/target-player');
      expect(blockRecord).toBeDefined();
      expect(blockRecord?.data.blockedUserId).toBe('target-player');
      expect(blockRecord?.data.userId).toBe('user-auth-1');

      // Verify B -> A following was deleted and caller follower was deleted
      expect(deleteCalls).toContain('users/target-player/following/user-auth-1');
      expect(deleteCalls).toContain('users/user-auth-1/followers/target-player');

      // Verify batch commit was called
      expect(batchCommit).toHaveBeenCalled();
    });

    it('blockPlayerInFirestore succeeds and records block even if target user doc does not exist in Firestore', async () => {
      const setCalls: { path: string; data: any }[] = [];
      const batchCommit = vi.fn().mockResolvedValue(undefined);

      mocks.writeBatch.mockReturnValue({
        set: (ref: any, data: any) => setCalls.push({ path: String(ref?.path || ref?._path || ''), data }),
        delete: vi.fn(),
        update: vi.fn(),
        commit: batchCommit
      });

      mocks.getDoc.mockImplementation(async (ref: any) => {
        const path = String(ref?.path || ref?._path || '');
        if (path === 'users/user-auth-1') {
          return createDocSnap('user-auth-1', true, { followingCount: 0, followerCount: 0, friendCount: 0 });
        }
        // target user does not exist in Firestore (e.g. demo player or external profile)
        return createDocSnap('target-demo-user', false);
      });

      mocks.getDocs.mockResolvedValue({ docs: [] });

      await blockPlayerInFirestore('target-demo-user');

      const blockRecord = setCalls.find(c => c.path === 'users/user-auth-1/blocked/target-demo-user');
      expect(blockRecord).toBeDefined();
      expect(blockRecord?.data.blockedUserId).toBe('target-demo-user');
      expect(blockRecord?.data.userId).toBe('user-auth-1');
      expect(batchCommit).toHaveBeenCalled();
    });

    it('blockPlayerInFirestore rejects blocking oneself', async () => {
      await expect(blockPlayerInFirestore('user-auth-1')).rejects.toThrow('You cannot block yourself.');
    });

    it('unblockPlayerInFirestore deletes block record under caller path', async () => {
      mocks.getDoc.mockResolvedValue(createDocSnap('blocked-doc', true));
      mocks.deleteDoc.mockResolvedValue(undefined);

      await unblockPlayerInFirestore('target-player');

      expect(mocks.deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/user-auth-1/blocked/target-player' })
      );
    });
  });

  // -------------------------------------------------------------
  // 3. INVITATIONS & MODERATION
  // -------------------------------------------------------------
  describe('Invitations & Moderation Service Layer', () => {
    it('sendGameInviteInFirestore enforces organizer authorization and rejects non-hosts', async () => {
      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            const path = String(ref?.path || ref?._path || '');
            if (path.includes('blocked')) return createDocSnap('b', false);
            return createDocSnap('game-1', true, {
              organizerId: 'different-organizer',
              status: 'Open',
              maxPlayers: 10,
              participants: []
            });
          })
        };
        return callback(mockTx);
      });

      await expect(sendGameInviteInFirestore('game-1', 'invitee-player')).rejects.toThrow();
    });

    it('sendGameInviteInFirestore prevents self-invites', async () => {
      await expect(sendGameInviteInFirestore('game-1', 'user-auth-1')).rejects.toThrow();
    });

    it('acceptGameInviteInFirestore joins game atomically and marks invite accepted', async () => {
      let inviteUpdatedPayload: any = null;
      let gameUpdatedPayload: any = null;
      let paymentPayload: any = null;

      mocks.getDoc.mockImplementation(async (ref: any) => {
        const path = String(ref?.path || ref?._path || '');
        if (path.includes('blocked')) return createDocSnap('block', false);
        if (path.includes('invites')) {
          return createDocSnap('invite-1', true, {
            status: 'pending',
            gameId: 'game-1',
            inviterId: 'user-host',
            inviteeId: 'user-auth-1'
          });
        }
        return createDocSnap('game-1', true, {
          organizerId: 'user-host',
          organizerName: 'Bader Al-Mutawa',
          status: 'Open',
          maxPlayers: 4,
          pricePerPlayerKWD: 2.5,
          sport: 'Football',
          participants: [{ userId: 'user-host', name: 'Bader' }],
          participantIds: ['user-host']
        });
      });

      mocks.updateDoc.mockImplementation(async (ref: any, payload: any) => {
        const path = String(ref?.path || ref?._path || '');
        if (path.includes('invites')) {
          inviteUpdatedPayload = payload;
        }
      });

      mocks.runTransaction.mockImplementation(async (_db: any, callback: any) => {
        const mockTx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            const path = String(ref?.path || ref?._path || '');
            if (path.includes('blocked')) return createDocSnap('block', false);
            return createDocSnap('game-1', true, {
              organizerId: 'user-host',
              status: 'Open',
              maxPlayers: 4,
              pricePerPlayerKWD: 2.5,
              sport: 'Football',
              participants: [{ userId: 'user-host', name: 'Bader' }],
              participantIds: ['user-host']
            });
          }),
          update: vi.fn().mockImplementation((_ref, payload) => {
            gameUpdatedPayload = payload;
          }),
          set: vi.fn().mockImplementation((ref: any, payload: any) => {
            const path = String(ref?.path || ref?._path || '');
            if (path.includes('payments') || payload.amountKWD !== undefined) {
              paymentPayload = payload;
            }
          })
        };
        return callback(mockTx);
      });

      const result = await acceptGameInviteInFirestore('game-1', {
        userId: 'user-auth-1',
        name: 'Invited Player',
        paymentStatus: 'Paid',
        paidAmountKWD: 2.5
      } as any);

      expect(result.id).toBe('game-1');
      expect(result.participants.length).toBe(2);
      expect(gameUpdatedPayload).not.toBeNull();
      expect(gameUpdatedPayload.participantIds).toContain('user-auth-1');
      expect(inviteUpdatedPayload).not.toBeNull();
      expect(inviteUpdatedPayload.status).toBe('accepted');
      expect(paymentPayload).not.toBeNull();
      expect(paymentPayload.userId).toBe('user-auth-1');
    });

    it('acceptGameInviteInFirestore rejects non-pending or missing invite', async () => {
      mocks.getDoc.mockImplementation(async (ref: any) => {
        const path = String(ref?.path || ref?._path || '');
        if (path.includes('blocked')) return createDocSnap('block', false);
        if (path.includes('invites')) {
          return createDocSnap('invite-1', true, {
            status: 'accepted',
            gameId: 'game-1'
          });
        }
        return createDocSnap('game-1', true, {
          organizerId: 'user-host',
          status: 'Open'
        });
      });

      await expect(acceptGameInviteInFirestore('game-1', {
        userId: 'user-auth-1',
        name: 'Player'
      } as any)).rejects.toThrow('This invite is no longer pending');
    });

    it('acceptGameInviteInFirestore rejects when blocked by organizer', async () => {
      mocks.getDoc.mockImplementation(async (ref: any) => {
        const path = String(ref?.path || ref?._path || '');
        if (path.includes('blocked')) return createDocSnap('block', true, { id: 'block' });
        return createDocSnap('game-1', true, {
          organizerId: 'user-host',
          status: 'Open'
        });
      });

      await expect(acceptGameInviteInFirestore('game-1', {
        userId: 'user-auth-1',
        name: 'Player'
      } as any)).rejects.toThrow('Cannot accept game invite due to blocking restrictions');
    });

    it('createReportInFirestore creates valid open report with matching reporterId and target', async () => {
      let createdPayload: any = null;
      let targetPath: string = '';
      mocks.getDoc.mockResolvedValue(createDocSnap('rep_user-auth-1_u_target-user-2', false));
      mocks.setDoc.mockImplementation(async (ref: any, payload: any) => {
        targetPath = ref.path;
        createdPayload = payload;
      });

      const reportId = await createReportInFirestore({
        reportedUserId: 'target-user-2',
        reason: 'inappropriate_behavior',
        details: 'Offensive language during game'
      });

      expect(reportId).toBe('rep_user-auth-1_u_target-user-2');
      expect(targetPath).toBe('reports/rep_user-auth-1_u_target-user-2');
      expect(createdPayload).not.toBeNull();
      expect(createdPayload.reporterId).toBe('user-auth-1');
      expect(createdPayload.reportedUserId).toBe('target-user-2');
      expect(createdPayload.status).toBe('open');
      expect(createdPayload.reason).toBe('inappropriate_behavior');
      expect(createdPayload.details).toBe('Offensive language during game');
      expect(typeof createdPayload.createdAt).toBe('string');
    });

    it('createReportInFirestore preserves duplicate open report without extra write', async () => {
      mocks.getDoc.mockResolvedValue(createDocSnap('rep_user-auth-1_u_target-user-2', true, {
        id: 'rep_user-auth-1_u_target-user-2',
        reporterId: 'user-auth-1',
        reportedUserId: 'target-user-2',
        status: 'open',
        reason: 'harassment'
      }));

      const reportId = await createReportInFirestore({
        reportedUserId: 'target-user-2',
        reason: 'harassment'
      });

      expect(reportId).toBe('rep_user-auth-1_u_target-user-2');
      expect(mocks.setDoc).not.toHaveBeenCalled();
    });

    it('createReportInFirestore rejects self-reporting', async () => {
      await expect(createReportInFirestore({
        reportedUserId: 'user-auth-1',
        reason: 'spam'
      })).rejects.toThrow('You cannot report yourself.');
    });

    it('createReportInFirestore rejects user-current target', async () => {
      await expect(createReportInFirestore({
        reportedUserId: 'user-current',
        reason: 'spam'
      })).rejects.toThrow('Invalid report target: demo user profiles cannot be reported.');
    });

    it('createReportInFirestore succeeds when initial getDoc check throws because document does not exist', async () => {
      mocks.getDoc.mockRejectedValueOnce(new Error('Missing or insufficient permissions.'));
      let createdPayload: any = null;
      mocks.setDoc.mockImplementation(async (_ref: any, payload: any) => {
        createdPayload = payload;
      });

      const reportId = await createReportInFirestore({
        reportedUserId: 'target-user-99',
        reason: 'spam'
      });

      expect(reportId).toBe('rep_user-auth-1_u_target-user-99');
      expect(createdPayload).not.toBeNull();
      expect(createdPayload.reportedUserId).toBe('target-user-99');
    });

    it('reviewReportInFirestore transitions open report to reviewing and records audit log', async () => {
      let updatePayload: any = null;
      mocks.getDoc.mockResolvedValue(createDocSnap('report-1', true, { status: 'open' }));
      mocks.updateDoc.mockImplementation(async (_ref: any, payload: any) => {
        updatePayload = payload;
      });
      mocks.setDoc.mockResolvedValue(undefined);

      await reviewReportInFirestore('report-1');

      expect(updatePayload).not.toBeNull();
      expect(updatePayload.status).toBe('reviewing');
      expect(updatePayload.moderatorId).toBe('user-auth-1');
    });

    it('resolveReportInFirestore transitions report to resolved, records resolution, and appends audit log', async () => {
      let updatePayload: any = null;
      let auditLogPayload: any = null;

      mocks.getDoc.mockResolvedValue(createDocSnap('report-1', true, {
        id: 'report-1',
        status: 'open',
        reportedUserId: 'target-user-1',
        reason: 'harassment'
      }));

      mocks.updateDoc.mockImplementation(async (_ref: any, payload: any) => {
        updatePayload = payload;
      });

      mocks.setDoc.mockImplementation(async (_ref: any, payload: any) => {
        auditLogPayload = payload;
      });

      await resolveReportInFirestore('report-1', 'Warning issued to athlete for unsportsmanlike behavior');

      // Verify report document update
      expect(updatePayload).not.toBeNull();
      expect(updatePayload.status).toBe('resolved');
      expect(updatePayload.resolution).toBe('Warning issued to athlete for unsportsmanlike behavior');
      expect(updatePayload.moderatorId).toBe('user-auth-1');
      expect(typeof updatePayload.resolvedAt).toBe('string');
      expect(typeof updatePayload.updatedAt).toBe('string');

      // Verify immutable audit log write in moderationLogs
      expect(auditLogPayload).not.toBeNull();
      expect(auditLogPayload.action).toBe('resolve_report');
      expect(auditLogPayload.targetType).toBe('user');
      expect(auditLogPayload.targetId).toBe('target-user-1');
      expect(auditLogPayload.reportId).toBe('report-1');
      expect(auditLogPayload.resolution).toBe('Warning issued to athlete for unsportsmanlike behavior');
      expect(auditLogPayload.moderatorId).toBe('user-auth-1');
    });

    it('resolveReportInFirestore rejects resolving already dismissed or resolved reports', async () => {
      mocks.getDoc.mockResolvedValue(createDocSnap('report-resolved', true, { status: 'resolved' }));
      await expect(resolveReportInFirestore('report-resolved', 'Fixed')).rejects.toThrow('Report cannot be resolved from status: resolved');

      mocks.getDoc.mockResolvedValue(createDocSnap('report-dismissed', true, { status: 'dismissed' }));
      await expect(resolveReportInFirestore('report-dismissed', 'Fixed')).rejects.toThrow('Report cannot be resolved from status: dismissed');
    });

    it('dismissReportInFirestore transitions report to dismissed, records reason, appends audit log, and preserves player status', async () => {
      let updatePayload: any = null;
      let auditLogPayload: any = null;

      mocks.getDoc.mockResolvedValue(createDocSnap('report-1', true, {
        id: 'report-1',
        status: 'reviewing',
        reportedUserId: 'target-user-1',
        reason: 'spam'
      }));

      mocks.updateDoc.mockImplementation(async (_ref: any, payload: any) => {
        updatePayload = payload;
      });

      mocks.setDoc.mockImplementation(async (_ref: any, payload: any) => {
        auditLogPayload = payload;
      });

      await dismissReportInFirestore('report-1', 'False report, compliant with rules');

      // Verify report document update
      expect(updatePayload).not.toBeNull();
      expect(updatePayload.status).toBe('dismissed');
      expect(updatePayload.dismissalReason).toBe('False report, compliant with rules');
      expect(updatePayload.moderatorId).toBe('user-auth-1');
      expect(typeof updatePayload.dismissedAt).toBe('string');
      expect(typeof updatePayload.updatedAt).toBe('string');

      // Verify immutable audit log write in moderationLogs
      expect(auditLogPayload).not.toBeNull();
      expect(auditLogPayload.action).toBe('dismiss_report');
      expect(auditLogPayload.targetType).toBe('user');
      expect(auditLogPayload.targetId).toBe('target-user-1');
      expect(auditLogPayload.reportId).toBe('report-1');
      expect(auditLogPayload.reason).toBe('False report, compliant with rules');
      expect(auditLogPayload.moderatorId).toBe('user-auth-1');

      // Confirm no destructive actions against target player (e.g. no deleteDoc or ban called)
      expect(mocks.deleteDoc).not.toHaveBeenCalled();
    });

    it('dismissReportInFirestore rejects dismissing already resolved or dismissed reports', async () => {
      mocks.getDoc.mockResolvedValue(createDocSnap('report-resolved', true, { status: 'resolved' }));
      await expect(dismissReportInFirestore('report-resolved', 'Dismiss')).rejects.toThrow('Report cannot be dismissed from status: resolved');

      mocks.getDoc.mockResolvedValue(createDocSnap('report-dismissed', true, { status: 'dismissed' }));
      await expect(dismissReportInFirestore('report-dismissed', 'Dismiss')).rejects.toThrow('Report cannot be dismissed from status: dismissed');
    });

    it('moderateCancelGameInFirestore sets game status to Cancelled with moderated metadata and writes audit log', async () => {
      let updatePayload: any = null;
      let auditLogPayload: any = null;

      mocks.getDoc
        .mockResolvedValueOnce(createDocSnap('game-target-1', true, {
          title: 'Friday Padel',
          status: 'Open',
          organizerId: 'user-organizer',
          description: 'Fun pickup'
        }))
        .mockResolvedValueOnce(createDocSnap('game-target-1', true, {
          title: 'Friday Padel',
          status: 'Cancelled',
          moderated: true,
          moderationReason: 'Policy violation',
          organizerId: 'user-organizer',
          currentPlayers: 2,
          maxPlayers: 4,
          pricePerPlayerKWD: 5,
          totalCourtCostKWD: 20,
          sport: 'Padel',
          date: '2026-10-20',
          courtName: 'Yarmouk Court'
        }));

      mocks.updateDoc.mockImplementation(async (_ref: any, payload: any) => {
        updatePayload = payload;
      });

      mocks.setDoc.mockImplementation(async (_ref: any, payload: any) => {
        auditLogPayload = payload;
      });

      const updated = await moderateCancelGameInFirestore('game-target-1', 'Policy violation', 'rep-123');

      expect(updatePayload).not.toBeNull();
      expect(updatePayload.status).toBe('Cancelled');
      expect(updatePayload.moderated).toBe(true);
      expect(updatePayload.moderatedBy).toBe('user-auth-1');
      expect(updatePayload.moderationReason).toBe('Policy violation');

      expect(auditLogPayload).not.toBeNull();
      expect(auditLogPayload.action).toBe('cancel_game');
      expect(auditLogPayload.targetType).toBe('game');
      expect(auditLogPayload.targetId).toBe('game-target-1');
      expect(auditLogPayload.reportId).toBe('rep-123');
      expect(updated.status).toBe('Cancelled');
    });

    it('setAthleteOrganizingStatus updates canOrganize and writes audit log', async () => {
      let updatePayload: any = null;
      let auditLogPayload: any = null;

      mocks.updateDoc.mockImplementation(async (_ref: any, payload: any) => {
        updatePayload = payload;
      });

      mocks.setDoc.mockImplementation(async (_ref: any, payload: any) => {
        auditLogPayload = payload;
      });

      await setAthleteOrganizingStatus('target-athlete-1', false, 'Excessive match no-shows');

      expect(updatePayload).not.toBeNull();
      expect(updatePayload.canOrganize).toBe(false);
      expect(typeof updatePayload.updatedAt).toBe('string');

      expect(auditLogPayload).not.toBeNull();
      expect(auditLogPayload.action).toBe('resolve_report');
      expect(auditLogPayload.targetType).toBe('user');
      expect(auditLogPayload.targetId).toBe('target-athlete-1');
      expect(auditLogPayload.reason).toBe('Excessive match no-shows');
      expect(auditLogPayload.moderatorId).toBe('user-auth-1');
    });

    it('fetchTargetModerationHistory queries logs for specified target', async () => {
      mocks.getDocs.mockResolvedValue({
        forEach: (cb: (doc: any) => void) => {
          cb({
            id: 'log-1',
            data: () => ({
              moderatorId: 'admin-1',
              action: 'resolve_report',
              targetType: 'user',
              targetId: 'target-athlete-1',
              reason: 'Warning issued',
              createdAt: '2026-10-17T10:00:00Z',
              createdAtISO: '2026-10-17T10:00:00Z'
            })
          });
        }
      });

      const logs = await fetchTargetModerationHistory('target-athlete-1', 5);
      expect(logs).toHaveLength(1);
      expect(logs[0].targetId).toBe('target-athlete-1');
      expect(logs[0].action).toBe('resolve_report');
    });

    it('checkIsAdminInFirestore recognizes admin email case-insensitively', async () => {
      // Mock auth instance with lowercase email
      _setTestAuthInstance({
        currentUser: {
          uid: 'admin-uid-1',
          email: 'khalidalami5555@gmail.com',
          emailVerified: true
        }
      } as any);

      mocks.getDoc.mockResolvedValue(createDocSnap('admin-uid-1', false));
      mocks.setDoc.mockResolvedValue(undefined);

      const isAdmin = await checkIsAdminInFirestore();
      expect(isAdmin).toBe(true);

      // Also verify capital letter casing
      _setTestAuthInstance({
        currentUser: {
          uid: 'admin-uid-2',
          email: 'Khalidalami5555@gmail.com',
          emailVerified: true
        }
      } as any);
      const isAdminUpper = await checkIsAdminInFirestore();
      expect(isAdminUpper).toBe(true);

      // Verify non-admin user
      _setTestAuthInstance({
        currentUser: {
          uid: 'user-regular',
          email: 'regular_player@gmail.com',
          emailVerified: true
        }
      } as any);
      mocks.getDoc.mockResolvedValue(createDocSnap('user-regular', false));
      const isRegularAdmin = await checkIsAdminInFirestore();
      expect(isRegularAdmin).toBe(false);

      // Verify spoof attack: matching email but emailVerified is false
      _setTestAuthInstance({
        currentUser: {
          uid: 'attacker-uid',
          email: 'khalidalami5555@gmail.com',
          emailVerified: false
        }
      } as any);
      mocks.getDoc.mockResolvedValue(createDocSnap('attacker-uid', false));
      const isSpoofedAdmin = await checkIsAdminInFirestore();
      expect(isSpoofedAdmin).toBe(false);

      // Restore default test auth instance
      _setTestAuthInstance({
        currentUser: {
          uid: 'user-auth-1',
          email: 'test@example.com'
        }
      } as any);
    });

    it('fetchReportsFromFirestore returns reports sorted newest first and filters by status', async () => {
      mocks.getDocs.mockResolvedValue({
        forEach: (cb: any) => {
          cb({
            id: 'rep_1',
            data: () => ({
              id: 'rep_1',
              reporterId: 'user-1',
              reportedUserId: 'target-1',
              reason: 'spam',
              status: 'open',
              createdAt: '2026-10-16T10:00:00.000Z'
            })
          });
          cb({
            id: 'rep_2',
            data: () => ({
              id: 'rep_2',
              reporterId: 'user-2',
              reportedUserId: 'target-2',
              reason: 'harassment',
              status: 'resolved',
              createdAt: '2026-10-16T12:00:00.000Z'
            })
          });
        }
      });

      // Fetch all reports
      const allReports = await fetchReportsFromFirestore();
      expect(allReports.length).toBe(2);
      // Newest (rep_2 at 12:00) should come first
      expect(allReports[0].id).toBe('rep_2');
      expect(allReports[1].id).toBe('rep_1');

      // Fetch with status filter: 'open'
      const openReports = await fetchReportsFromFirestore({ status: 'open' });
      expect(openReports.length).toBe(1);
      expect(openReports[0].id).toBe('rep_1');
      expect(openReports[0].status).toBe('open');
    });

    it('subscribeToReportsInFirestore delivers items to callback sorted newest first', () => {
      let registeredCallback: any = null;
      mocks.onSnapshot.mockImplementation((_query: any, onNext: any) => {
        registeredCallback = onNext;
        return () => {};
      });

      let receivedReports: any[] = [];
      const unsub = subscribeToReportsInFirestore((items) => {
        receivedReports = items;
      });

      expect(typeof unsub).toBe('function');
      expect(registeredCallback).not.toBeNull();

      // Trigger snapshot callback with mock docs
      registeredCallback({
        forEach: (cb: any) => {
          cb({
            id: 'doc-old',
            data: () => ({
              status: 'open',
              reason: 'spam',
              createdAt: '2026-10-15T08:00:00.000Z'
            })
          });
          cb({
            id: 'doc-new',
            data: () => ({
              status: 'open',
              reason: 'harassment',
              createdAt: '2026-10-16T08:00:00.000Z'
            })
          });
        }
      });

      expect(receivedReports.length).toBe(2);
      expect(receivedReports[0].id).toBe('doc-new');
      expect(receivedReports[1].id).toBe('doc-old');
    });

    it('createOrFetchUserProfile sets isAdmin: true for project admin on existing profile', async () => {
      _setTestAuthInstance({
        currentUser: {
          uid: 'admin-user-id',
          email: 'Khalidalami5555@gmail.com',
          emailVerified: true
        }
      } as any);

      // Mock existing public profile without isAdmin set
      mocks.getDoc.mockImplementation(async (ref: any) => {
        if (ref.path === 'users/admin-user-id') {
          return createDocSnap('admin-user-id', true, {
            id: 'admin-user-id',
            name: 'Khalid Alami',
            username: 'khalid_admin'
          });
        }
        if (ref.path === 'users/admin-user-id/private/account') {
          return createDocSnap('account', true, {
            email: 'Khalidalami5555@gmail.com'
          });
        }
        return createDocSnap('not-found', false);
      });

      const profile = await createOrFetchUserProfile({
        uid: 'admin-user-id',
        email: 'Khalidalami5555@gmail.com',
        emailVerified: true
      } as any);

      expect(profile.isAdmin).toBe(true);

      // Verify unverified email with matching address gets isAdmin: false
      _setTestAuthInstance({
        currentUser: {
          uid: 'unverified-uid',
          email: 'Khalidalami5555@gmail.com',
          emailVerified: false
        }
      } as any);
      mocks.getDoc.mockResolvedValue(createDocSnap('unverified-uid', false));
      const unverifiedProfile = await createOrFetchUserProfile({
        uid: 'unverified-uid',
        email: 'Khalidalami5555@gmail.com',
        emailVerified: false
      } as any);
      expect(unverifiedProfile.isAdmin).toBe(false);

      _setTestAuthInstance({
        currentUser: {
          uid: 'user-auth-1',
          email: 'test@example.com'
        }
      } as any);
    });

    it('moderateCancelGameInFirestore cancels game, marks moderated flag, and preserves participants', async () => {
      let updatePayload: any = null;
      let hasBeenUpdated = false;
      const participants = [
        { userId: 'u1', name: 'User 1' },
        { userId: 'u2', name: 'User 2' }
      ];

      mocks.getDoc.mockImplementation(async () => {
        if (!hasBeenUpdated) {
          return createDocSnap('game-mod', true, {
            title: 'Violating Game',
            status: 'Open',
            participants,
            maxPlayers: 10
          });
        }
        return createDocSnap('game-mod', true, {
          title: 'Violating Game',
          status: 'Cancelled',
          moderated: true,
          moderatedBy: 'user-auth-1',
          moderationReason: 'Offensive content',
          participants,
          maxPlayers: 10
        });
      });

      mocks.updateDoc.mockImplementation(async (_ref: any, payload: any) => {
        updatePayload = payload;
        hasBeenUpdated = true;
      });
      mocks.setDoc.mockResolvedValue(undefined);

      const moderatedGame = await moderateCancelGameInFirestore('game-mod', 'Offensive content');

      expect(updatePayload.status).toBe('Cancelled');
      expect(updatePayload.moderated).toBe(true);
      expect(updatePayload.moderatedBy).toBe('user-auth-1');
      expect(updatePayload.moderationReason).toBe('Offensive content');
      expect(moderatedGame.status).toBe('Cancelled');
      expect(moderatedGame.participants.length).toBe(2);
    });
  });

  // -------------------------------------------------------------
  // 4. CHAT, NOTIFICATIONS & PROFILE UPDATES
  // -------------------------------------------------------------
  describe('Chat, Notifications & User Operations Service Layer', () => {
    it('sendGameChatMessage rejects empty message text', async () => {
      await expect(
        sendGameChatMessage('game-1', { text: '   ' })
      ).rejects.toThrow('Message text cannot be empty.');
    });

    it('sendGameChatMessage saves message payload with sender identity and triggers participant fan-out', async () => {
      let savedMessage: any = null;
      mocks.setDoc.mockImplementation(async (_ref: any, payload: any) => {
        if (payload.text) savedMessage = payload;
      });

      mocks.getDoc.mockImplementation(async (ref: any) => {
        const path = String(ref?.path || ref?._path || '');
        if (path.includes('blocked')) return createDocSnap('b', false);
        return createDocSnap('game-1', true, {
          title: 'Friday 7v7',
          organizerId: 'org-user',
          participantIds: ['org-user', 'user-auth-1', 'player-3']
        });
      });

      const msgId = await sendGameChatMessage('game-1', { text: 'See everyone on court!' });

      expect(msgId).toBeDefined();
      expect(savedMessage).not.toBeNull();
      expect(savedMessage.senderId).toBe('user-auth-1');
      expect(savedMessage.text).toBe('See everyone on court!');
      expect(savedMessage.gameId).toBe('game-1');
    });

    it('createNotification writes payload with deterministic document ID when provided', async () => {
      let createdPayload: any = null;
      mocks.setDoc.mockImplementation(async (_ref: any, payload: any) => {
        createdPayload = payload;
      });

      const notifId = await createNotification({
        id: 'join_game123_user456',
        userId: 'organizer-uid',
        type: 'game_join',
        title: 'Player Joined',
        body: 'Fahad joined your match'
      });

      expect(notifId).toBe('join_game123_user456');
      expect(createdPayload.userId).toBe('organizer-uid');
      expect(createdPayload.read).toBe(false);
    });

    it('markNotificationAsRead updates notification read status to true', async () => {
      let updatedData: any = null;
      mocks.updateDoc.mockImplementation(async (_ref: any, payload: any) => {
        updatedData = payload;
      });

      await markNotificationAsRead('user-auth-1', 'notif-123');

      expect(updatedData).not.toBeNull();
      expect(updatedData.read).toBe(true);
    });

    it('markAllNotificationsAsRead marks all unread items read using atomic writeBatch', async () => {
      const updateCalls: any[] = [];
      const batchCommit = vi.fn().mockResolvedValue(undefined);

      mocks.getDocs.mockResolvedValue({
        empty: false,
        docs: [
          { ref: { path: 'notif-1' } },
          { ref: { path: 'notif-2' } }
        ]
      });

      mocks.writeBatch.mockReturnValue({
        update: (_ref: any, data: any) => updateCalls.push(data),
        commit: batchCommit
      });

      await markAllNotificationsAsRead('user-auth-1');

      expect(updateCalls.length).toBe(2);
      expect(updateCalls[0].read).toBe(true);
      expect(batchCommit).toHaveBeenCalled();
    });

    it('checkUsernameAvailability rejects invalid usernames and detects reservations', async () => {
      const invalid = await checkUsernameAvailability('bad space!');
      expect(invalid.available).toBe(false);

      mocks.getDoc.mockResolvedValue(createDocSnap('existing_user', true, { uid: 'different-user' }));
      const taken = await checkUsernameAvailability('existing_user', 'user-auth-1');
      expect(taken.available).toBe(false);
      expect(taken.error).toContain('already taken');

      mocks.getDoc.mockResolvedValue(createDocSnap('my_own_name', true, { uid: 'user-auth-1' }));
      const own = await checkUsernameAvailability('my_own_name', 'user-auth-1');
      expect(own.available).toBe(true); // Own username is available to self
    });

    it('updateUserProfileInFirestore updates public fields and isolates email to private subcollection', async () => {
      const setDocCalls: { path: string; data: any }[] = [];

      mocks.setDoc.mockImplementation(async (ref: any, data: any) => {
        setDocCalls.push({ path: String(ref?.path || ref?._path || ''), data });
      });

      await updateUserProfileInFirestore('user-auth-1', {
        name: 'Ahmad New Name',
        email: 'ahmad_private@example.com'
      });

      const publicWrite = setDocCalls.find(c => !c.path.includes('private'));
      const privateWrite = setDocCalls.find(c => c.path.includes('private/account'));

      expect(publicWrite).toBeDefined();
      expect(publicWrite?.data.name).toBe('Ahmad New Name');
      expect(publicWrite?.data.email).toBeUndefined(); // Email NEVER saved to public document

      expect(privateWrite).toBeDefined();
      expect(privateWrite?.data.email).toBe('ahmad_private@example.com'); // Saved strictly to private/account
    });
  });

  // -------------------------------------------------------------
  // 5. SERVICE ERROR PROPAGATION & RESILIENCE
  // -------------------------------------------------------------
  describe('Service-Level Error Propagation', () => {
    it('propagates transaction failures cleanly to caller when Firestore operation aborts', async () => {
      mocks.runTransaction.mockRejectedValue(new Error('Transaction contention error'));

      await expect(
        joinGameInFirestore('game-1', {
          userId: 'p-1',
          name: 'Player',
          username: 'player',
          avatar: '',
          skill: 'Casual',
          paymentStatus: 'unpaid',
          paidAmountKWD: 0,
          joinedAt: 'now',
          attendanceConfirmed: false
        })
      ).rejects.toThrow();
    });

    it('rejects unauthenticated calls when auth session is missing', async () => {
      _setTestAuthInstance(null); // Simulate signed-out state

      await expect(followPlayerInFirestore('target-1')).rejects.toThrow('User must be authenticated');
      await expect(sendFriendRequestInFirestore('target-1')).rejects.toThrow('User must be authenticated');
      await expect(sendGameInviteInFirestore('game-1', 'target-1')).rejects.toThrow('User must be authenticated');
      await expect(reviewReportInFirestore('report-1')).rejects.toThrow('User must be authenticated');
      await expect(resolveReportInFirestore('report-1', 'Done')).rejects.toThrow('User must be authenticated');
      await expect(dismissReportInFirestore('report-1', 'Dismissed')).rejects.toThrow('User must be authenticated');
    });
  });
});
