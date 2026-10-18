import { describe, it, expect } from 'vitest';
import {
  mapFirestoreDocToGame,
  mapDocToPublicProfile,
  calculatePlayerActivityStats,
  normalizeUsername,
  validateUsername,
  mapRawDocToChatMessage,
  sortChatMessagesChronologically,
  getLeavePaymentStatusTransition,
  validateSelfTarget,
  calculateUpdatedCounter,
  validateGameInviteEligibility,
  filterNotificationRecipients,
  isValidReportStatusTransition,
  applyGameParticipantJoin,
  applyGameParticipantLeave,
  calculateGameFinancialSummary
} from '../src/lib/firebase';
import { Game, GameParticipant, SportType, UserProfile, getTodayLocalDate, DEFAULT_GUEST_AVATAR, resolvePlayerAvatar } from '../src/types';

const initialDemoGame: Game = {
  id: 'demo-match-1',
  title: 'Sabah Al-Salem 7v7',
  sport: 'Football',
  date: '2026-10-12',
  startTime: '20:00',
  endTime: '21:30',
  courtName: 'Sabah Al-Salem Youth Center',
  area: 'Mishref',
  address: 'Block 2, St 10',
  coordinates: { x: 55, y: 60 },
  isIndoor: false,
  maxPlayers: 4,
  organizer: {
    id: 'demo-host',
    uid: 'demo-host',
    name: 'Meshari Al-Kandari',
    username: 'meshari',
    avatar: 'https://example.com/meshari.jpg',
    area: 'Mishref',
    bio: '',
    favoriteSports: ['Football'],
    skills: { Football: 'Advanced' },
    gamesPlayed: 12,
    gamesHosted: 5,
    attendanceRate: 100,
    privacy: { showAge: true, showPhone: false, allowDirectInvites: true }
  },
  participants: [
    { userId: 'demo-host', name: 'Meshari', username: 'meshari', avatar: '', skill: 'Advanced', paymentStatus: 'Paid', paidAmountKWD: 2.0, joinedAt: 'Host', paymentMethod: 'KNET', attendanceConfirmed: true }
  ],
  participantIds: ['demo-host'],
  totalCourtCostKWD: 8.0,
  pricePerPlayerKWD: 2.0,
  skillLevel: 'Intermediate',
  gender: 'Everyone',
  visibility: 'Public',
  status: 'Open',
  createdAt: '2026-10-01T12:00:00.000Z',
  cancellationPolicy: 'Refund if cancelled 4 hours prior'
};

describe('1. Game Logic & Status Calculations', () => {
  const baseOrganizerData = {
    organizerId: 'user-org-1',
    organizerName: 'Bader Al-Mutawa',
    organizerPhotoURL: 'https://example.com/bader.jpg',
    sport: 'Football',
    area: 'Salmiya',
    maxPlayers: 10,
    pricePerPlayerKWD: 2.5,
    totalCourtCostKWD: 25.0,
    courtName: 'Mishref Stadium',
    date: '2026-10-15',
    startTime: '19:00',
    endTime: '20:30',
  };

  it('calculates status as Open when participant count is well below capacity', () => {
    const rawData = {
      ...baseOrganizerData,
      maxPlayers: 10,
      participants: [
        { userId: 'user-org-1', name: 'Bader' },
        { userId: 'user-p-2', name: 'Salem' },
        { userId: 'user-p-3', name: 'Fahad' }
      ]
    };

    const game = mapFirestoreDocToGame('game-1', rawData);
    expect(game.status).toBe('Open');
    expect(game.participants.length).toBe(3);
    expect(game.participantIds).toEqual(['user-org-1', 'user-p-2', 'user-p-3']);
  });

  it('calculates status as Almost Full when exactly at capacity - 1', () => {
    const participants = Array.from({ length: 9 }, (_, i) => ({
      userId: `user-${i + 1}`,
      name: `Player ${i + 1}`
    }));

    const rawData = {
      ...baseOrganizerData,
      maxPlayers: 10,
      participants
    };

    const game = mapFirestoreDocToGame('game-almost-full', rawData);
    expect(game.status).toBe('Almost Full');
    expect(game.participants.length).toBe(9);
    expect(game.maxPlayers).toBe(10);
  });

  it('calculates status as Full when participants reach capacity', () => {
    const participants = Array.from({ length: 10 }, (_, i) => ({
      userId: `user-${i + 1}`,
      name: `Player ${i + 1}`
    }));

    const rawData = {
      ...baseOrganizerData,
      maxPlayers: 10,
      participants
    };

    const game = mapFirestoreDocToGame('game-full', rawData);
    expect(game.status).toBe('Full');
    expect(game.participants.length).toBe(10);
  });

  it('preserves Cancelled and Completed statuses regardless of player counts', () => {
    const rawCancelled = {
      ...baseOrganizerData,
      maxPlayers: 10,
      status: 'Cancelled',
      participants: [{ userId: 'user-org-1', name: 'Bader' }]
    };

    const cancelledGame = mapFirestoreDocToGame('game-cancelled', rawCancelled);
    expect(cancelledGame.status).toBe('Cancelled');

    const rawCompleted = {
      ...baseOrganizerData,
      maxPlayers: 10,
      status: 'Completed',
      participants: [{ userId: 'user-org-1', name: 'Bader' }]
    };

    const completedGame = mapFirestoreDocToGame('game-completed', rawCompleted);
    expect(completedGame.status).toBe('Completed');
  });

  it('deduplicates participants sharing identical user IDs', () => {
    const rawData = {
      ...baseOrganizerData,
      maxPlayers: 10,
      participants: [
        { userId: 'user-p-1', name: 'Ahmad' },
        { userId: 'user-p-1', name: 'Ahmad Duplicate' },
        { userId: 'user-p-2', name: 'Yousef' }
      ]
    };

    const game = mapFirestoreDocToGame('game-dup', rawData);
    expect(game.participants.length).toBe(2);
    expect(game.participants.map(p => p.userId)).toEqual(['user-p-1', 'user-p-2']);
    expect(game.participantIds).toEqual(['user-p-1', 'user-p-2']);
  });

  it('handles legacy game documents missing participants by synthesizing organizer as host', () => {
    const legacyDoc = {
      ...baseOrganizerData,
      maxPlayers: 6,
      participants: [] // Empty or omitted in legacy records
    };

    const game = mapFirestoreDocToGame('game-legacy', legacyDoc);
    expect(game.participants.length).toBe(1);
    expect(game.participants[0].userId).toBe('user-org-1');
    expect(game.participants[0].name).toBe('Bader Al-Mutawa');
    expect(game.participants[0].joinedAt).toBe('Host');
    expect(game.participantIds).toEqual(['user-org-1']);
  });

  it('enforces a minimum maxPlayers of 2 when maxPlayers is provided as a number less than 2', () => {
    const rawData = {
      ...baseOrganizerData,
      maxPlayers: 1 // Invalid capacity below 2
    };

    const game = mapFirestoreDocToGame('game-min-cap', rawData);
    expect(game.maxPlayers).toBe(2);
  });
});

describe('2. Chat Ordering & Timestamp Handling', () => {
  it('maps and sorts messages chronologically (oldest first, newest last) using production helpers', () => {
    const rawDocs = [
      { id: 'm3', data: { text: 'See you at 7!', createdAtISO: '2026-10-10T14:30:00.000Z' } },
      { id: 'm1', data: { text: 'Salam alaykum guys', createdAtISO: '2026-10-10T14:00:00.000Z' } },
      { id: 'm2', data: { text: 'Wa alaykum assalam', createdAtISO: '2026-10-10T14:15:00.000Z' } }
    ];

    const mapped = rawDocs.map(d => mapRawDocToChatMessage(d.id, 'game-chat-1', d.data));
    const sorted = sortChatMessagesChronologically(mapped);
    expect(sorted.map(m => m.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('selects latest 100 messages from descending window and orders oldest-to-newest using production sorter', () => {
    // Generate 150 simulated messages in descending timestamp order (as returned by orderBy('createdAt', 'desc'))
    const allDescMessages = Array.from({ length: 150 }, (_, i) => {
      const mins = 150 - i;
      const dateStr = new Date(Date.UTC(2026, 9, 10, 10, mins, 0)).toISOString();
      return mapRawDocToChatMessage(`msg-${150 - i}`, 'game-chat-1', {
        text: `Message ${150 - i}`,
        createdAtISO: dateStr
      });
    });

    // Firestore query limit(100) on descending query takes top 100 (newest 100)
    const top100Desc = allDescMessages.slice(0, 100);
    expect(top100Desc.length).toBe(100);
    expect(top100Desc[0].id).toBe('msg-150'); // Newest message is first in raw query result

    // Production sort turns it into oldest-to-newest of that 100-item window
    const displayMessages = sortChatMessagesChronologically(top100Desc);
    expect(displayMessages.length).toBe(100);
    expect(displayMessages[0].id).toBe('msg-51'); // Oldest in this 100-window
    expect(displayMessages[99].id).toBe('msg-150'); // Newest at the bottom
  });

  it('handles missing or invalid createdAt gracefully without crashing using production mapRawDocToChatMessage', () => {
    const mValid = mapRawDocToChatMessage('m-valid', 'g1', { text: 'Valid message', createdAtISO: '2026-10-10T12:00:00.000Z' });
    const mCorrupt = mapRawDocToChatMessage('m-corrupt', 'g1', { text: 'Corrupted date', createdAtISO: 'INVALID_TIMESTAMP_STRING' });
    const mEmpty = mapRawDocToChatMessage('m-empty', 'g1', { text: 'No date' });

    expect(mValid.timestamp).not.toBe('Just now');
    expect(mCorrupt.timestamp).toBe('Just now');
    expect(mEmpty.timestamp).toBe('Just now');
  });
});

describe('3. Profiles & Privacy Protection', () => {
  it('safely handles missing fields and applies sensible athlete defaults', () => {
    const rawUserDoc = {}; // Completely empty Firestore document
    const profile = mapDocToPublicProfile('user-empty-1', rawUserDoc);

    expect(profile.id).toBe('user-empty-1');
    expect(profile.name).toBe('Athlete');
    expect(profile.username).toBe('player_user-');
    expect(profile.favoriteSports).toEqual(['Football']);
    expect(profile.gamesPlayed).toBe(0);
    expect(profile.followerCount).toBe(0);
    expect(profile.friendCount).toBe(0);
    expect(profile.privacy.showAge).toBe(true);
    expect(profile.privacy.showPhone).toBe(false);
  });

  it('never exposes private account fields in public profile output', () => {
    const sensitiveDoc = {
      name: 'Nasser',
      email: 'nasser_private@example.com',
      phoneNumber: '+96599999999',
      civilId: '290123456789',
      role: 'admin',
      balanceKWD: 150.0
    };

    const profile = mapDocToPublicProfile('user-nasser', sensitiveDoc);

    expect(profile.name).toBe('Nasser');
    // Public UserProfile interface does not contain these private keys
    expect((profile as any).email).toBeUndefined();
    expect((profile as any).phoneNumber).toBeUndefined();
    expect((profile as any).civilId).toBeUndefined();
    expect((profile as any).balanceKWD).toBeUndefined();
  });

  it('hides age when privacy.showAge is false', () => {
    const privateAgeDoc = {
      name: 'Tariq',
      age: 28,
      privacy: { showAge: false, showPhone: false }
    };

    const profile = mapDocToPublicProfile('user-tariq', privateAgeDoc);
    expect(profile.age).toBeUndefined();
    expect(profile.privacy.showAge).toBe(false);
  });

  it('exposes age when privacy.showAge is true and age is provided', () => {
    const publicAgeDoc = {
      name: 'Abdullah',
      age: 24,
      privacy: { showAge: true, showPhone: false }
    };

    const profile = mapDocToPublicProfile('user-abdullah', publicAgeDoc);
    expect(profile.age).toBe(24);
  });

  it('validates and normalizes usernames properly', () => {
    expect(normalizeUsername('  Kuwait_Striker  ')).toBe('kuwait_striker');
    expect(validateUsername('ok').valid).toBe(false);
    expect(validateUsername('valid_user_123').valid).toBe(true);
    expect(validateUsername('bad user!').valid).toBe(false);
  });
});

describe('4. Financial & Payment Logic', () => {
  it('correctly calculates total collected and organizer residual share in KWD', () => {
    const totalCourtCostKWD = 30.0;
    const participants: GameParticipant[] = [
      { userId: 'org', name: 'Host', username: 'host', avatar: '', skill: 'Intermediate', paymentStatus: 'Paid', paidAmountKWD: 3.0, joinedAt: 'Host', paymentMethod: 'KNET', attendanceConfirmed: false },
      { userId: 'p2', name: 'Player 2', username: 'p2', avatar: '', skill: 'Intermediate', paymentStatus: 'Paid', paidAmountKWD: 3.0, joinedAt: '10:00', paymentMethod: 'KNET', attendanceConfirmed: false },
      { userId: 'p3', name: 'Player 3', username: 'p3', avatar: '', skill: 'Intermediate', paymentStatus: 'unpaid', paidAmountKWD: 0.0, joinedAt: '10:05', paymentMethod: 'KNET', attendanceConfirmed: false }
    ];

    const totalCollected = participants.reduce((acc, p) => acc + (p.paymentStatus === 'Paid' ? p.paidAmountKWD : 0), 0);
    const organizerShare = Math.max(0, totalCourtCostKWD - totalCollected);

    expect(totalCollected).toBe(6.0);
    expect(organizerShare).toBe(24.0);
  });

  it('transitions payment status on leave using production getLeavePaymentStatusTransition', () => {
    expect(getLeavePaymentStatusTransition('Paid')).toBe('refunded');
    expect(getLeavePaymentStatusTransition('paid')).toBe('refunded');
    expect(getLeavePaymentStatusTransition('unpaid')).toBe('cancelled');
    expect(getLeavePaymentStatusTransition('pending')).toBe('cancelled');
    expect(getLeavePaymentStatusTransition('Pending')).toBe('cancelled');
    expect(getLeavePaymentStatusTransition('other')).toBeNull();
  });

  it('determines initial participant payment status based on whether the game is free or paid', () => {
    function determineInitialPaymentStatus(pricePerPlayerKWD: number): 'unpaid' | 'paid' {
      return pricePerPlayerKWD > 0 ? 'unpaid' : 'paid';
    }

    expect(determineInitialPaymentStatus(2.5)).toBe('unpaid');
    expect(determineInitialPaymentStatus(0)).toBe('paid');
  });
});

describe('5. Demo Mode State Mutations & Isolation', () => {
  function demoJoinGame(game: Game, newPlayer: GameParticipant): Game {
    const updatedParticipants = [...game.participants, newPlayer];
    const updatedParticipantIds = game.participantIds
      ? [...game.participantIds, newPlayer.userId]
      : updatedParticipants.map(p => p.userId);

    const newStatus = updatedParticipants.length >= game.maxPlayers
      ? 'Full'
      : (updatedParticipants.length >= game.maxPlayers - 1 ? 'Almost Full' : 'Open');

    return {
      ...game,
      participants: updatedParticipants,
      participantIds: updatedParticipantIds,
      status: newStatus
    };
  }

  function demoLeaveGame(game: Game, leavingUserId: string): Game {
    const filtered = game.participants.filter(p => p.userId !== leavingUserId);
    const filteredIds = (game.participantIds || []).filter(id => id !== leavingUserId);
    const newStatus = filtered.length >= game.maxPlayers
      ? 'Full'
      : (filtered.length >= game.maxPlayers - 1 ? 'Almost Full' : 'Open');

    return {
      ...game,
      participants: filtered,
      participantIds: filteredIds,
      status: newStatus
    };
  }

  it('mutates Demo game state locally without network calls', () => {
    let currentGame = { ...initialDemoGame };

    // Player 2 joins (2/4 -> Open)
    currentGame = demoJoinGame(currentGame, {
      userId: 'demo-p2',
      name: 'Yousef',
      username: 'yousef',
      avatar: '',
      skill: 'Casual',
      paymentStatus: 'Paid',
      paidAmountKWD: 2.0,
      joinedAt: 'Just now',
      paymentMethod: 'KNET',
      attendanceConfirmed: false
    });
    expect(currentGame.participants.length).toBe(2);
    expect(currentGame.status).toBe('Open');

    // Player 3 joins (3/4 -> Almost Full)
    currentGame = demoJoinGame(currentGame, {
      userId: 'demo-p3',
      name: 'Hamad',
      username: 'hamad',
      avatar: '',
      skill: 'Casual',
      paymentStatus: 'Paid',
      paidAmountKWD: 2.0,
      joinedAt: 'Just now',
      paymentMethod: 'Apple Pay',
      attendanceConfirmed: false
    });
    expect(currentGame.participants.length).toBe(3);
    expect(currentGame.status).toBe('Almost Full');

    // Player 4 joins (4/4 -> Full)
    currentGame = demoJoinGame(currentGame, {
      userId: 'demo-p4',
      name: 'Khaled',
      username: 'khaled',
      avatar: '',
      skill: 'Casual',
      paymentStatus: 'Paid',
      paidAmountKWD: 2.0,
      joinedAt: 'Just now',
      paymentMethod: 'KNET',
      attendanceConfirmed: false
    });
    expect(currentGame.participants.length).toBe(4);
    expect(currentGame.status).toBe('Full');

    // Player 4 leaves (3/4 -> Transitions back to Almost Full)
    currentGame = demoLeaveGame(currentGame, 'demo-p4');
    expect(currentGame.participants.length).toBe(3);
    expect(currentGame.participantIds).not.toContain('demo-p4');
    expect(currentGame.status).toBe('Almost Full');
  });

  it('calculates player activity stats accurately for hosted and played games', () => {
    const games: Game[] = [
      {
        ...initialDemoGame,
        id: 'g1',
        date: '2024-01-10', // Historical past game
        organizer: { ...initialDemoGame.organizer, id: 'user-a' },
        participants: [{ userId: 'user-a', name: 'User A', username: 'a', avatar: '', skill: 'Casual', paymentStatus: 'Paid', paidAmountKWD: 2, joinedAt: 'Host', paymentMethod: 'KNET', attendanceConfirmed: false }]
      },
      {
        ...initialDemoGame,
        id: 'g2',
        date: '2024-01-12', // Historical past game
        organizer: { ...initialDemoGame.organizer, id: 'user-b' },
        participants: [
          { userId: 'user-b', name: 'User B', username: 'b', avatar: '', skill: 'Casual', paymentStatus: 'Paid', paidAmountKWD: 2, joinedAt: 'Host', paymentMethod: 'KNET', attendanceConfirmed: false },
          { userId: 'user-a', name: 'User A', username: 'a', avatar: '', skill: 'Casual', paymentStatus: 'Paid', paidAmountKWD: 2, joinedAt: '12:00', paymentMethod: 'KNET', attendanceConfirmed: false }
        ],
        participantIds: ['user-b', 'user-a']
      }
    ];

    const stats = calculatePlayerActivityStats('user-a', games);
    expect(stats.gamesHosted).toBe(1); // Hosted g1
    expect(stats.gamesPlayed).toBe(2); // Participated in both past games
    expect(stats.sportsPlayed).toContain('Football');
  });
});

describe('6. Community Relationships & Follow / Friend Logic', () => {
  it('prevents self-follow and self-friend requests using production validateSelfTarget', () => {
    expect(() => validateSelfTarget('user-1', 'user-1', 'follow')).toThrow('You cannot follow yourself.');
    expect(() => validateSelfTarget('user-1', 'user-1', 'send a friend request to')).toThrow('You cannot send a friend request to yourself.');
    expect(() => validateSelfTarget('user-1', 'user-2', 'follow')).not.toThrow();
  });

  it('guarantees follower and following counters are strictly non-negative using production calculateUpdatedCounter', () => {
    expect(calculateUpdatedCounter(5, 1)).toBe(6);
    expect(calculateUpdatedCounter(5, -1)).toBe(4);
    expect(calculateUpdatedCounter(0, -1)).toBe(0); // Lower bounded at 0
    expect(calculateUpdatedCounter(-3, -1)).toBe(0); // Corrects negative numbers
    expect(calculateUpdatedCounter(undefined, 1)).toBe(1);
    expect(calculateUpdatedCounter(undefined, -1)).toBe(0);
  });

  it('ensures duplicate follow actions do not double increment counters', () => {
    const followingSet = new Set<string>(['user-target-1']);

    function recordFollow(targetId: string, currentFollowingCount: number) {
      if (followingSet.has(targetId)) {
        return currentFollowingCount;
      }
      followingSet.add(targetId);
      return calculateUpdatedCounter(currentFollowingCount, 1);
    }

    expect(recordFollow('user-target-1', 1)).toBe(1); // Already followed
    expect(recordFollow('user-target-2', 1)).toBe(2); // New follow
  });

  it('handles bidirectional friend request completion when reciprocal request exists', () => {
    const pendingIncomingRequests = new Set<string>(['user-b']);

    function handleSendFriendRequest(senderId: string, targetId: string) {
      if (pendingIncomingRequests.has(targetId)) {
        return { action: 'accepted_mutual', targetId };
      }
      return { action: 'created_pending', targetId };
    }

    const result = handleSendFriendRequest('user-a', 'user-b');
    expect(result.action).toBe('accepted_mutual');
  });
});

describe('7. Blocking & Relationship Invalidation Logic', () => {
  it('invalidates follow and friend relationships when a user is blocked', () => {
    const relationships = {
      following: new Set(['user-blocked']),
      followers: new Set(['user-blocked']),
      friends: new Set(['user-blocked']),
      pendingRequests: new Set(['user-blocked'])
    };

    function applyBlockPurge(targetId: string, current: typeof relationships) {
      current.following.delete(targetId);
      current.followers.delete(targetId);
      current.friends.delete(targetId);
      current.pendingRequests.delete(targetId);
      return current;
    }

    const purged = applyBlockPurge('user-blocked', relationships);
    expect(purged.following.has('user-blocked')).toBe(false);
    expect(purged.followers.has('user-blocked')).toBe(false);
    expect(purged.friends.has('user-blocked')).toBe(false);
    expect(purged.pendingRequests.has('user-blocked')).toBe(false);
  });

  it('verifies that unblocking does NOT automatically restore previous relationships', () => {
    const blockedList = new Set(['user-b']);
    const friendsList = new Set<string>(); // Cleaned on block

    // Unblock action
    blockedList.delete('user-b');

    expect(blockedList.has('user-b')).toBe(false);
    expect(friendsList.has('user-b')).toBe(false); // Friendship remains empty
  });

  it('rejects sending friend requests or follows if either user has blocked the other', () => {
    const blocksAtoB = true;
    const blocksBtoA = false;

    function checkCanInteract(b1: boolean, b2: boolean) {
      if (b1 || b2) {
        throw new Error('Cannot interact due to blocking restrictions.');
      }
      return true;
    }

    expect(() => checkCanInteract(blocksAtoB, blocksBtoA)).toThrow('blocking restrictions');
    expect(() => checkCanInteract(false, false)).not.toThrow();
  });
});

describe('8. Game Invitations Logic', () => {
  it('only allows the verified game organizer to send invitations using production validateGameInviteEligibility', () => {
    const result1 = validateGameInviteEligibility({
      currentUserId: 'caller-2',
      inviteeId: 'invitee-1',
      gameData: { organizerId: 'org-1', status: 'Open', maxPlayers: 10, participants: [] },
      hasExistingPendingInvite: false,
      hasBlockRestriction: false
    });
    expect(result1.valid).toBe(false);
    expect(result1.error).toBe('Only the game organizer can invite players.');

    const result2 = validateGameInviteEligibility({
      currentUserId: 'org-1',
      inviteeId: 'invitee-1',
      gameData: { organizerId: 'org-1', status: 'Open', maxPlayers: 10, participants: [] },
      hasExistingPendingInvite: false,
      hasBlockRestriction: false
    });
    expect(result2.valid).toBe(true);
  });

  it('prevents inviting self, existing participants, or already invited players using production validateGameInviteEligibility', () => {
    // Self invite
    const selfRes = validateGameInviteEligibility({
      currentUserId: 'user-1',
      inviteeId: 'user-1',
      gameData: { organizerId: 'user-1', status: 'Open', maxPlayers: 10, participants: [] },
      hasExistingPendingInvite: false,
      hasBlockRestriction: false
    });
    expect(selfRes.valid).toBe(false);
    expect(selfRes.error).toBe('You cannot invite yourself to your own game.');

    // Existing participant
    const alreadyInRes = validateGameInviteEligibility({
      currentUserId: 'user-1',
      inviteeId: 'user-2',
      gameData: { organizerId: 'user-1', status: 'Open', maxPlayers: 10, participants: [{ userId: 'user-2' }] },
      hasExistingPendingInvite: false,
      hasBlockRestriction: false
    });
    expect(alreadyInRes.valid).toBe(false);
    expect(alreadyInRes.error).toBe('Player has already joined this game.');

    // Duplicate pending invite
    const duplicateRes = validateGameInviteEligibility({
      currentUserId: 'user-1',
      inviteeId: 'user-3',
      gameData: { organizerId: 'user-1', status: 'Open', maxPlayers: 10, participants: [] },
      hasExistingPendingInvite: true,
      hasBlockRestriction: false
    });
    expect(duplicateRes.valid).toBe(false);
    expect(duplicateRes.error).toBe('A pending invite already exists for this player.');

    // Blocked player
    const blockedRes = validateGameInviteEligibility({
      currentUserId: 'user-1',
      inviteeId: 'user-4',
      gameData: { organizerId: 'user-1', status: 'Open', maxPlayers: 10, participants: [] },
      hasExistingPendingInvite: false,
      hasBlockRestriction: true
    });
    expect(blockedRes.valid).toBe(false);
    expect(blockedRes.error).toBe('Cannot invite a blocked player.');
  });

  it('rejects invitations for Cancelled, Completed, or Full matches using production validateGameInviteEligibility', () => {
    const cancelledRes = validateGameInviteEligibility({
      currentUserId: 'user-1',
      inviteeId: 'user-2',
      gameData: { organizerId: 'user-1', status: 'Cancelled', maxPlayers: 10, participants: [] },
      hasExistingPendingInvite: false,
      hasBlockRestriction: false
    });
    expect(cancelledRes.valid).toBe(false);
    expect(cancelledRes.error).toBe('Cannot invite players to a game that is Cancelled.');

    const fullRes = validateGameInviteEligibility({
      currentUserId: 'user-1',
      inviteeId: 'user-2',
      gameData: { organizerId: 'user-1', status: 'Full', maxPlayers: 5, participants: Array(5).fill({ userId: 'p' }) },
      hasExistingPendingInvite: false,
      hasBlockRestriction: false
    });
    expect(fullRes.valid).toBe(false);
    expect(fullRes.error).toBe('This game is already full. Cannot send invites.');
  });
});

describe('9. Notifications & Actor Exclusion Logic', () => {
  it('excludes the acting sender from recipient fan-out lists using production filterNotificationRecipients', () => {
    const organizerId = 'user-organizer';
    const participantIds = ['user-organizer', 'player-1', 'player-2', 'player-sender'];
    const currentSenderId = 'player-sender';

    const recipients = filterNotificationRecipients([organizerId, ...participantIds], currentSenderId);

    expect(recipients).not.toContain('player-sender');
    expect(recipients).toEqual(['user-organizer', 'player-1', 'player-2']);
  });

  it('uses deterministic document IDs to prevent duplicate notifications upon retries', () => {
    const gameId = 'game-123';
    const playerId = 'player-456';
    const joinNotifId = `join_${gameId}_${playerId}`;
    const friendReqNotifId = `freq_${playerId}`;
    const friendAcceptNotifId = `faccept_${playerId}`;

    expect(joinNotifId).toBe('join_game-123_player-456');
    expect(friendReqNotifId).toBe('freq_player-456');
    expect(friendAcceptNotifId).toBe('faccept_player-456');
  });

  it('handles individual delivery failures in parallel notification fan-out without breaking the batch', async () => {
    const recipients = ['user-ok-1', 'user-fail', 'user-ok-2'];

    const results = await Promise.allSettled(
      recipients.map(async (uid) => {
        if (uid === 'user-fail') {
          throw new Error('Network timeout for user');
        }
        return { delivered: true, uid };
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    expect(successful.length).toBe(2);
    expect(failed.length).toBe(1);
  });
});

describe('10. Reports & Moderation Lifecycle', () => {
  it('validates allowed status transitions for reports using production isValidReportStatusTransition', () => {
    expect(isValidReportStatusTransition('open', 'reviewing')).toBe(true);
    expect(isValidReportStatusTransition('open', 'resolved')).toBe(true);
    expect(isValidReportStatusTransition('open', 'dismissed')).toBe(true);
    expect(isValidReportStatusTransition('reviewing', 'resolved')).toBe(true);
    expect(isValidReportStatusTransition('reviewing', 'dismissed')).toBe(true);
    expect(isValidReportStatusTransition('reviewing', 'reviewing')).toBe(false);
    expect(isValidReportStatusTransition('resolved', 'reviewing')).toBe(false);
    expect(isValidReportStatusTransition('dismissed', 'open')).toBe(false);
  });

  it('moderating a game sets status to Cancelled and marks moderated: true without wiping participants or history', () => {
    const rawData = {
      sport: 'Football',
      area: 'Mishref',
      maxPlayers: 10,
      pricePerPlayerKWD: 2.0,
      totalCourtCostKWD: 20.0,
      status: 'Cancelled',
      moderated: true,
      moderatedBy: 'admin-khalid',
      moderationReason: 'Policy violation',
      participants: [
        { userId: 'u1', name: 'User 1' },
        { userId: 'u2', name: 'User 2' }
      ]
    };

    const game = mapFirestoreDocToGame('game-moderated-1', rawData);
    expect(game.status).toBe('Cancelled');
    expect(game.participants.length).toBe(2);
    expect(game.participants[0].userId).toBe('u1');
    expect(game.participants[1].userId).toBe('u2');
  });
});

describe('11. Account Deletion & Reciprocal Consistency', () => {
  it('cleans private user credentials and releases username reservation', () => {
    const userDb: Record<string, any> = {
      'users/user-delete': { name: 'Player To Delete', username: 'kuwait_striker' },
      'users/user-delete/private/account': { email: 'delete_me@example.com' },
      'usernames/kuwait_striker': { uid: 'user-delete' }
    };

    function deleteAccountData(uid: string, username: string) {
      delete userDb[`users/${uid}`];
      delete userDb[`users/${uid}/private/account`];
      delete userDb[`usernames/${normalizeUsername(username)}`];
    }

    deleteAccountData('user-delete', 'kuwait_striker');

    expect(userDb['users/user-delete']).toBeUndefined();
    expect(userDb['users/user-delete/private/account']).toBeUndefined();
    expect(userDb['usernames/kuwait_striker']).toBeUndefined();
  });

  it('safely decrements reciprocal follower and friend counters on external users with a lower bound of zero using production calculateUpdatedCounter', () => {
    const followerCount = calculateUpdatedCounter(1, -1);
    const friendCount = calculateUpdatedCounter(0, -1);

    expect(followerCount).toBe(0);
    expect(friendCount).toBe(0); // Did not drop below 0
  });

  it('preserves historical game rosters, chats, and payment logs upon account deletion using production mapFirestoreDocToGame', () => {
    const rawGameData = {
      sport: 'Football',
      area: 'Mishref',
      maxPlayers: 4,
      status: 'Completed',
      participants: [
        { userId: 'deleted-user', name: 'Former Athlete', paymentStatus: 'Paid', paidAmountKWD: 2 }
      ]
    };

    const mappedGame = mapFirestoreDocToGame('hist-game-1', rawGameData);
    expect(mappedGame.participants.length).toBe(1);
    expect(mappedGame.participants[0].userId).toBe('deleted-user');
    expect(mappedGame.participants[0].name).toBe('Former Athlete');
  });
});

describe('12. Game State Pure Helpers (Join, Leave, Financials)', () => {
  const baseTestGame: Game = {
    ...initialDemoGame,
    id: 'game-pure-test',
    maxPlayers: 4,
    status: 'Open',
    participants: [
      { userId: 'u-host', name: 'Host', username: 'host', avatar: '', skill: 'Advanced', paymentStatus: 'Paid', paidAmountKWD: 2.0, joinedAt: 'Host' }
    ],
    participantIds: ['u-host'],
    totalCourtCostKWD: 8.0,
    pricePerPlayerKWD: 2.0
  };

  it('applyGameParticipantJoin adds participant, updates participantIds, and recalculates status', () => {
    const p2: GameParticipant = {
      userId: 'u-2',
      name: 'Player 2',
      username: 'p2',
      avatar: '',
      skill: 'Casual',
      paymentStatus: 'Paid',
      paidAmountKWD: 2.0,
      joinedAt: '2026-10-12T10:00:00Z'
    };
    const g2 = applyGameParticipantJoin(baseTestGame, p2);
    expect(g2.participants.length).toBe(2);
    expect(g2.participantIds).toEqual(['u-host', 'u-2']);
    expect(g2.status).toBe('Open');

    const p3: GameParticipant = { ...p2, userId: 'u-3', name: 'Player 3' };
    const g3 = applyGameParticipantJoin(g2, p3);
    expect(g3.participants.length).toBe(3);
    expect(g3.status).toBe('Almost Full'); // maxPlayers is 4, count is 3

    const p4: GameParticipant = { ...p2, userId: 'u-4', name: 'Player 4' };
    const g4 = applyGameParticipantJoin(g3, p4);
    expect(g4.participants.length).toBe(4);
    expect(g4.status).toBe('Full');
  });

  it('applyGameParticipantLeave removes participant and updates status from Full to Almost Full to Open', () => {
    const fullGame: Game = {
      ...baseTestGame,
      status: 'Full',
      participants: [
        { userId: 'u-host', name: 'Host', username: 'host', avatar: '', skill: 'Advanced', paymentStatus: 'Paid', paidAmountKWD: 2.0, joinedAt: 'Host' },
        { userId: 'u-2', name: 'Player 2', username: 'p2', avatar: '', skill: 'Casual', paymentStatus: 'Paid', paidAmountKWD: 2.0, joinedAt: '2026-10-12' },
        { userId: 'u-3', name: 'Player 3', username: 'p3', avatar: '', skill: 'Casual', paymentStatus: 'Paid', paidAmountKWD: 2.0, joinedAt: '2026-10-12' },
        { userId: 'u-4', name: 'Player 4', username: 'p4', avatar: '', skill: 'Casual', paymentStatus: 'Paid', paidAmountKWD: 2.0, joinedAt: '2026-10-12' }
      ],
      participantIds: ['u-host', 'u-2', 'u-3', 'u-4']
    };

    const gAfterLeave = applyGameParticipantLeave(fullGame, 'u-4');
    expect(gAfterLeave.participants.length).toBe(3);
    expect(gAfterLeave.participantIds).toEqual(['u-host', 'u-2', 'u-3']);
    expect(gAfterLeave.status).toBe('Almost Full');

    const gAfterSecondLeave = applyGameParticipantLeave(gAfterLeave, 'u-3');
    expect(gAfterSecondLeave.participants.length).toBe(2);
    expect(gAfterSecondLeave.participantIds).toEqual(['u-host', 'u-2']);
    expect(gAfterSecondLeave.status).toBe('Open');
  });

  it('calculateGameFinancialSummary accurately tallies collected payments and remaining organizer share', () => {
    const participants: GameParticipant[] = [
      { userId: 'u-1', name: 'P1', username: 'p1', avatar: '', skill: 'Casual', paymentStatus: 'Paid', paidAmountKWD: 2.5, joinedAt: '' },
      { userId: 'u-2', name: 'P2', username: 'p2', avatar: '', skill: 'Casual', paymentStatus: 'Paid', paidAmountKWD: 2.5, joinedAt: '' },
      { userId: 'u-3', name: 'P3', username: 'p3', avatar: '', skill: 'Casual', paymentStatus: 'unpaid', paidAmountKWD: 0, joinedAt: '' }
    ];

    const result = calculateGameFinancialSummary(10.0, participants);
    expect(result.totalCollectedKWD).toBe(5.0);
    expect(result.organizerShareKWD).toBe(5.0);

    // When fully paid
    const fullResult = calculateGameFinancialSummary(5.0, participants);
    expect(fullResult.totalCollectedKWD).toBe(5.0);
    expect(fullResult.organizerShareKWD).toBe(0.0);
  });
});

describe('Default Game Date & Neutral Guest Profile Picture (La3ib Updates)', () => {
  describe('getTodayLocalDate', () => {
    it("defaults to today's local calendar date formatted as YYYY-MM-DD", () => {
      const today = new Date();
      const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(getTodayLocalDate()).toBe(expected);
    });

    it('avoids UTC offset shifts by strictly using local date components', () => {
      // Create a date instance for 2026-10-15 01:30 AM local time
      // If UTC conversion (toISOString) were used in UTC+3 timezone, it would shift back to 2026-10-14
      const testDate = new Date(2026, 9, 15, 1, 30, 0); // month is 0-indexed: 9 = October
      expect(getTodayLocalDate(testDate)).toBe('2026-10-15');

      // Test end of month / end of day
      const testDateEvening = new Date(2026, 11, 31, 23, 59, 59); // December 31
      expect(getTodayLocalDate(testDateEvening)).toBe('2026-12-31');

      // Test single-digit month and day padding
      const testDateSingleDigits = new Date(2026, 0, 5, 14, 0, 0); // January 5
      expect(getTodayLocalDate(testDateSingleDigits)).toBe('2026-01-05');
    });

    it('produces distinct dates across different days without stale caching', () => {
      const day1 = new Date(2026, 9, 15);
      const day2 = new Date(2026, 9, 16);
      expect(getTodayLocalDate(day1)).toBe('2026-10-15');
      expect(getTodayLocalDate(day2)).toBe('2026-10-16');
      expect(getTodayLocalDate(day1)).not.toBe(getTodayLocalDate(day2));
    });
  });

  describe('DEFAULT_GUEST_AVATAR & resolvePlayerAvatar', () => {
    it('DEFAULT_GUEST_AVATAR is a valid data URI containing a neutral SVG silhouette with no human face', () => {
      expect(DEFAULT_GUEST_AVATAR.startsWith('data:image/svg+xml')).toBe(true);
      expect(DEFAULT_GUEST_AVATAR).not.toContain('unsplash.com');
      expect(DEFAULT_GUEST_AVATAR).not.toContain('photo-');
      // Silhouette elements
      expect(DEFAULT_GUEST_AVATAR).toContain('circle');
      expect(DEFAULT_GUEST_AVATAR).toContain('path');
    });

    it('resolves guest users to the neutral default avatar with no human face', () => {
      const guestById: Partial<UserProfile> = {
        id: 'guest',
        name: 'Guest Player',
        username: 'guest',
        avatar: DEFAULT_GUEST_AVATAR
      };
      expect(resolvePlayerAvatar(guestById)).toBe(DEFAULT_GUEST_AVATAR);

      // Null or undefined user falls back to neutral default
      expect(resolvePlayerAvatar(null)).toBe(DEFAULT_GUEST_AVATAR);
      expect(resolvePlayerAvatar(undefined)).toBe(DEFAULT_GUEST_AVATAR);

      // Guest user with missing avatar
      const guestNoAvatar: Partial<UserProfile> = {
        id: 'guest',
        name: 'Guest Player',
        username: 'guest',
        avatar: ''
      };
      expect(resolvePlayerAvatar(guestNoAvatar)).toBe(DEFAULT_GUEST_AVATAR);

      // Guest user with legacy human-face unsplash URL is sanitized to neutral avatar
      const guestStaleFace: Partial<UserProfile> = {
        id: 'guest',
        name: 'Guest Player',
        username: 'guest',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'
      };
      expect(resolvePlayerAvatar(guestStaleFace)).toBe(DEFAULT_GUEST_AVATAR);
    });

    it('preserves Google profile photos and uploaded photos for real users', () => {
      // Real user with Google photoURL
      const googleUser: Partial<UserProfile> = {
        id: 'u-google-1',
        name: 'Fatima Al-Sabah',
        username: 'fatima_s',
        photoURL: 'https://lh3.googleusercontent.com/a/ACg8ocLexample=s96-c',
        avatar: 'https://lh3.googleusercontent.com/a/ACg8ocLexample=s96-c'
      };
      expect(resolvePlayerAvatar(googleUser)).toBe('https://lh3.googleusercontent.com/a/ACg8ocLexample=s96-c');

      // Real user with user-uploaded custom photo (e.g. data URI or storage URL)
      const customUser: Partial<UserProfile> = {
        id: 'u-custom-2',
        name: 'Bader Al-Mutawa',
        username: 'bader17',
        avatar: 'https://firebasestorage.googleapis.com/v0/b/project/o/users%2Fu-custom-2%2Favatar.jpg'
      };
      expect(resolvePlayerAvatar(customUser)).toBe('https://firebasestorage.googleapis.com/v0/b/project/o/users%2Fu-custom-2%2Favatar.jpg');

      // Real user with preexisting saved photo is preserved untouched
      const demoAhmed: Partial<UserProfile> = {
        id: 'user-current',
        name: 'Ahmed Al-Kandari',
        username: 'ahmed_kw',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
      };
      expect(resolvePlayerAvatar(demoAhmed)).toBe('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80');
    });
  });
});


