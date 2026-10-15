import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { 
  Game, 
  GameParticipant,
  Court, 
  CourtBooking, 
  UserProfile, 
  AppNotification, 
  ChatMessage, 
  SportType, 
  KuwaitArea,
  ReportItem,
  AuthStatus,
  FriendRequest,
  FriendshipStatus,
  GameInvite,
  PlayerActivityStats,
  ReportReason,
  ReportStatus,
  ReportDocument,
  BlockedPlayerRecord,
  GamePayment,
  PaymentStatus,
  ModerationLogEntry,
  ModerationAction
} from '../types';
import { 
  CURRENT_USER, 
  INITIAL_GAMES, 
  MOCK_COURTS, 
  MOCK_PLAYERS, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_CHATS 
} from '../data/mockData';
import { 
  subscribeToAuthState, 
  loginWithEmailPassword, 
  registerWithEmailPassword, 
  loginWithGoogle, 
  logoutUser, 
  createOrFetchUserProfile, 
  updateUserProfileInFirestore,
  createGameInFirestore,
  joinGameInFirestore,
  leaveGameInFirestore,
  applyGameParticipantJoin,
  applyGameParticipantLeave,
  updateGameInFirestore,
  cancelGameInFirestore,
  deleteGameInFirestore,
  getGameFromFirestore,
  subscribeToDiscoverGames,
  subscribeToMyGames,
  subscribeToGameChat,
  sendGameChatMessage,
  subscribeToNotifications,
  markNotificationAsRead as markNotificationAsReadInFirestore,
  markAllNotificationsAsRead as markAllNotificationsAsReadInFirestore,
  subscribeToPublicPlayers,
  fetchPublicPlayersFromFirestore,
  followPlayerInFirestore,
  unfollowPlayerInFirestore,
  subscribeToUserFollowing,
  sendFriendRequestInFirestore,
  cancelFriendRequestInFirestore,
  acceptFriendRequestInFirestore,
  declineFriendRequestInFirestore,
  subscribeToUserFriends,
  subscribeToIncomingFriendRequests,
  subscribeToOutgoingFriendRequests,
  fetchFriendProfiles,
  sendGameInviteInFirestore,
  cancelGameInviteInFirestore,
  declineGameInviteInFirestore,
  acceptGameInviteInFirestore,
  subscribeToGameInvitesForGame,
  subscribeToIncomingGameInvites,
  getPlayerActivityFromFirestore,
  calculatePlayerActivityStats,
  isGamePast,
  isFirebaseConfigured,
  blockPlayerInFirestore,
  unblockPlayerInFirestore,
  subscribeToBlockedPlayers,
  createReportInFirestore,
  checkIsAdminInFirestore,
  fetchReportsFromFirestore,
  subscribeToReportsInFirestore,
  reviewReportInFirestore,
  resolveReportInFirestore,
  dismissReportInFirestore,
  moderateCancelGameInFirestore,
  fetchModerationLogsFromFirestore,
  logModerationAction,
  getGamePayment,
  initializeGamePayment,
  simulateGamePayment,
  simulateGameRefund,
  canTransitionPayment,
  sendPasswordReset,
  deleteCurrentUserAccount,
  reauthenticateCurrentUser,
  checkUsernameAvailability,
  mapFirebaseAuthError
} from '../lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import confetti from 'canvas-confetti';

const GUEST_USER: UserProfile = {
  id: 'guest',
  name: 'Guest Player',
  nameAr: 'لاعب زائر',
  username: 'guest',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
  area: 'Kuwait City',
  bio: 'Sign in to create games, book courts, and track your athlete stats.',
  favoriteSports: ['Football', 'Padel'],
  skills: { Football: 'Intermediate', Padel: 'Beginner' },
  gamesPlayed: 0,
  gamesHosted: 0,
  attendanceRate: 100,
  isOrganizer: false,
  isAdmin: false,
  isDemoUser: false,
  privacy: { showAge: false, showPhone: false, allowDirectInvites: false }
};

interface AppContextType {
  currentUser: UserProfile;
  players: UserProfile[];
  isPlayersLoading: boolean;
  playersError: string | null;
  refetchPlayers: () => void;
  games: Game[];
  myGames: Game[];
  isGamesLoading: boolean;
  isMyGamesLoading: boolean;
  gamesError: string | null;
  myGamesError: string | null;
  refetchGames: () => void;
  courts: Court[];
  myBookings: CourtBooking[];
  notifications: AppNotification[];
  chats: Record<string, ChatMessage[]>;
  reports: ReportItem[];
  
  // Auth state & actions
  authStatus: AuthStatus;
  firebaseUser: FirebaseUser | null;
  isDemoActive: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'register' | 'forgot_password';
  setAuthModalMode: (mode: 'login' | 'register' | 'forgot_password') => void;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, displayName: string, area?: KuwaitArea) => Promise<void>;
  loginWithGoogleAuth: () => Promise<void>;
  logout: () => Promise<void>;
  continueAsDemo: () => void;
  sendPasswordResetEmailAction: (email: string) => Promise<void>;
  deleteAccountAction: (reauthPassword?: string) => Promise<void>;
  reauthenticateAction: (password?: string) => Promise<void>;
  checkUsername: (username: string) => Promise<{ available: boolean; error?: string }>;

  // Navigation & filters
  activeTab: 'home' | 'discover' | 'games' | 'players' | 'profile' | 'admin';
  setActiveTab: (tab: 'home' | 'discover' | 'games' | 'players' | 'profile' | 'admin') => void;
  selectedArea: KuwaitArea | 'All Kuwait';
  setSelectedArea: (area: KuwaitArea | 'All Kuwait') => void;
  selectedSport: SportType | 'All';
  setSelectedSport: (sport: SportType | 'All') => void;
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  t: (en: string, ar: string) => string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Active Modals & Pre-fills
  bookingModalOpen: boolean;
  setBookingModalOpen: (open: boolean) => void;
  selectedCourtForBooking: Court | null;
  setSelectedCourtForBooking: (court: Court | null) => void;
  
  createGameModalOpen: boolean;
  setCreateGameModalOpen: (open: boolean) => void;
  createGamePrefill: Partial<Game> | null;
  setCreateGamePrefill: (prefill: Partial<Game> | null) => void;
  
  selectedGameForDetail: Game | null;
  setSelectedGameForDetail: (game: Game | null) => void;
  
  selectedGameForJoin: Game | null;
  setSelectedGameForJoin: (game: Game | null) => void;

  selectedPlayerProfile: UserProfile | null;
  setSelectedPlayerProfile: (player: UserProfile | null) => void;

  notificationsModalOpen: boolean;
  setNotificationsModalOpen: (open: boolean) => void;

  safetyModalOpen: boolean;
  setSafetyModalOpen: (open: boolean) => void;

  adminModalOpen: boolean;
  setAdminModalOpen: (open: boolean) => void;

  // Actions
  bookCourtViaLi3ib: (court: Court, slot: { id: string; date: string; startTime: string; endTime: string; priceKWD: number }) => CourtBooking;
  postBookingAsGame: (booking: CourtBooking) => void;
  createGame: (gameData: Omit<Game, 'id' | 'createdAt' | 'organizer' | 'participants'>) => Promise<Game>;
  joinGame: (gameId: string, paymentMethod: 'KNET' | 'Apple Pay' | 'Credit Card') => Promise<boolean>;
  leaveGame: (gameId: string) => Promise<boolean>;
  sendChatMessage: (gameId: string, text: string, isAnnouncement?: boolean) => Promise<void>;
  followingUserIds: Set<string>;
  isFollowingUser: (userId: string) => boolean;
  isFollowActionLoading: (userId: string) => boolean;
  followPlayer: (targetUserId: string) => Promise<void>;
  unfollowPlayer: (targetUserId: string) => Promise<void>;
  toggleFollowPlayer: (userId: string) => Promise<void>;

  // Friends & Friend Requests (Step 3)
  friendIds: Set<string>;
  incomingFriendRequests: FriendRequest[];
  outgoingFriendRequestIds: Set<string>;
  friendsList: UserProfile[];
  isFriendActionLoading: (userId: string) => boolean;
  getFriendshipStatus: (userId: string) => FriendshipStatus;
  sendFriendRequest: (targetUserId: string) => Promise<void>;
  cancelFriendRequest: (targetUserId: string) => Promise<void>;
  acceptFriendRequest: (requesterId: string) => Promise<void>;
  declineFriendRequest: (requesterId: string) => Promise<void>;

  // Game Invites (Step 4)
  incomingGameInvites: GameInvite[];
  isGameInviteLoading: (gameId: string, inviteeId: string) => boolean;
  sendGameInvite: (gameId: string, inviteeId: string) => Promise<void>;
  cancelGameInvite: (gameId: string, inviteeId: string) => Promise<void>;
  acceptGameInvite: (gameId: string) => Promise<void>;
  declineGameInvite: (gameId: string) => Promise<void>;
  getGameInvitesForGame: (gameId: string) => Record<string, GameInvite>;

  // Blocking & Reporting (Step 6)
  blockedUserIds: Set<string>;
  blockedPlayersList: UserProfile[];
  isPlayerBlocked: (userId: string) => boolean;
  isBlockActionLoading: (userId: string) => boolean;
  blockPlayer: (blockedUserId: string) => Promise<void>;
  unblockPlayer: (blockedUserId: string) => Promise<void>;
  submitReport: (report: {
    reportedUserId?: string;
    reportedGameId?: string;
    reason: ReportReason;
    details?: string;
  }) => Promise<void>;

  // Payment Architecture (Step 1)
  getGamePayment: (gameId: string, userId: string) => Promise<GamePayment | null>;
  initializeGamePayment: (gameId: string, userId: string) => Promise<GamePayment>;
  simulateGamePayment: (gameId: string, userId: string) => Promise<GamePayment>;
  simulateGameRefund: (gameId: string, userId: string) => Promise<GamePayment>;

  confirmAttendance: (gameId: string, attended: boolean) => void;
  cancelGame: (gameId: string, reason?: string) => Promise<void> | void;
  updateGame: (gameId: string, updates: Partial<Game>) => Promise<void> | void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  reportItem: (id: string, type: 'game' | 'user', reason: string) => void;
  updateCurrentUserProfile: (updates: Partial<UserProfile>) => void;
  loadPlayerActivity: (userId: string) => Promise<PlayerActivityStats>;

  // Admin & Moderation Backend
  moderationReports: ReportDocument[];
  isModerationLoading: boolean;
  moderationLogs: ModerationLogEntry[];
  reviewModerationReport: (reportId: string) => Promise<void>;
  resolveModerationReport: (reportId: string, resolution: string, reason?: string) => Promise<void>;
  dismissModerationReport: (reportId: string, reason?: string) => Promise<void>;
  moderateGameCancellation: (gameId: string, reason: string, reportId?: string) => Promise<void>;
  refreshModerationQueue: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [isDemoActive, setIsDemoActive] = useState(true);

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => ({
    ...CURRENT_USER,
    isDemoUser: true
  }));
  const [demoPlayers, setDemoPlayers] = useState<UserProfile[]>(MOCK_PLAYERS);
  const [firestorePlayers, setFirestorePlayers] = useState<UserProfile[]>([]);
  const [isPlayersLoading, setIsPlayersLoading] = useState<boolean>(false);
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [playersRefreshKey, setPlayersRefreshKey] = useState<number>(0);

  // Scalable Blocked Players State (Step 6): Demo Mode vs Cloud Firestore
  const [demoBlockedUserIds, setDemoBlockedUserIds] = useState<Set<string>>(() => new Set());
  const [firestoreBlockedUserIds, setFirestoreBlockedUserIds] = useState<Set<string>>(() => new Set());
  const [blockActionLoadingMap, setBlockActionLoadingMap] = useState<Record<string, boolean>>({});

  const blockedUserIds = authStatus === 'authenticated' ? firestoreBlockedUserIds : demoBlockedUserIds;

  // Scalable Following State: Demo Mode vs Cloud Firestore
  const [demoFollowingIds, setDemoFollowingIds] = useState<Set<string>>(() => new Set());
  const [firestoreFollowingIds, setFirestoreFollowingIds] = useState<Set<string>>(() => new Set());
  const [followingLoadingMap, setFollowingLoadingMap] = useState<Record<string, boolean>>({});

  const rawFollowingUserIds = authStatus === 'authenticated' ? firestoreFollowingIds : demoFollowingIds;
  const followingUserIds = useMemo(() => {
    const filtered = new Set<string>();
    rawFollowingUserIds.forEach(id => {
      if (!blockedUserIds.has(id)) filtered.add(id);
    });
    return filtered;
  }, [rawFollowingUserIds, blockedUserIds]);

  // Scalable Friends & Friend Requests State: Demo Mode vs Cloud Firestore
  const [demoFriendIds, setDemoFriendIds] = useState<Set<string>>(() => new Set(['player-3']));
  const [firestoreFriendIds, setFirestoreFriendIds] = useState<Set<string>>(() => new Set());
  const [demoIncomingRequests, setDemoIncomingRequests] = useState<FriendRequest[]>(() => [
    {
      id: 'req-demo-1',
      requesterId: 'player-2',
      recipientId: CURRENT_USER.id,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      status: 'pending',
      requesterName: 'Ali Al-Mutawa',
      requesterUsername: 'alialmutawa',
      requesterAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      requesterArea: 'Salmiya',
      requesterSports: ['Padel', 'Football'],
      requesterSkills: { Padel: 'Advanced', Football: 'Intermediate' }
    }
  ]);
  const [firestoreIncomingRequests, setFirestoreIncomingRequests] = useState<FriendRequest[]>([]);
  const [demoOutgoingRequests, setDemoOutgoingRequests] = useState<Set<string>>(() => new Set());
  const [firestoreOutgoingRequests, setFirestoreOutgoingRequests] = useState<Set<string>>(() => new Set());
  const [friendLoadingMap, setFriendLoadingMap] = useState<Record<string, boolean>>({});
  const [firestoreFriendsList, setFirestoreFriendsList] = useState<UserProfile[]>([]);

  const rawFriendIds = authStatus === 'authenticated' ? firestoreFriendIds : demoFriendIds;
  const friendIds = useMemo(() => {
    const filtered = new Set<string>();
    rawFriendIds.forEach(id => {
      if (!blockedUserIds.has(id)) filtered.add(id);
    });
    return filtered;
  }, [rawFriendIds, blockedUserIds]);

  const rawIncomingRequests = authStatus === 'authenticated' ? firestoreIncomingRequests : demoIncomingRequests;
  const incomingFriendRequests = useMemo(() => {
    return rawIncomingRequests.filter(req => !blockedUserIds.has(req.requesterId));
  }, [rawIncomingRequests, blockedUserIds]);

  const rawOutgoingRequests = authStatus === 'authenticated' ? firestoreOutgoingRequests : demoOutgoingRequests;
  const outgoingFriendRequestIds = useMemo(() => {
    const filtered = new Set<string>();
    rawOutgoingRequests.forEach(id => {
      if (!blockedUserIds.has(id)) filtered.add(id);
    });
    return filtered;
  }, [rawOutgoingRequests, blockedUserIds]);

  const rawFriendsList = authStatus === 'authenticated'
    ? firestoreFriendsList
    : demoPlayers.filter(p => demoFriendIds.has(p.id));
  const friendsList = useMemo(() => {
    return rawFriendsList.filter(p => !blockedUserIds.has(p.id) && (p.uid ? !blockedUserIds.has(p.uid) : true));
  }, [rawFriendsList, blockedUserIds]);

  // Game Invites State: Demo Mode vs Cloud Firestore (Step 4)
  const [demoIncomingInvites, setDemoIncomingInvites] = useState<GameInvite[]>(() => [
    {
      id: CURRENT_USER.id,
      gameId: 'game-1',
      inviterId: 'player-1',
      inviteeId: CURRENT_USER.id,
      status: 'pending',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      gameTitle: 'Friday Night Football 7v7',
      gameSport: 'Football',
      gameDate: '2026-10-02',
      gameStartTime: '20:00',
      gameCourtName: 'Mishref Public Arena',
      gameArea: 'Mishref',
      gamePricePerPlayerKWD: 2.500,
      inviterName: 'Hamad Al-Kandari',
      inviterAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
      inviteeName: CURRENT_USER.name,
      inviteeAvatar: CURRENT_USER.avatar
    }
  ]);
  const [firestoreIncomingInvites, setFirestoreIncomingInvites] = useState<GameInvite[]>([]);
  // Map of gameId -> Record<inviteeId, GameInvite>
  const [gameInvitesMap, setGameInvitesMap] = useState<Record<string, Record<string, GameInvite>>>({});
  const [inviteActionLoadingMap, setInviteActionLoadingMap] = useState<Record<string, boolean>>({});

  const rawIncomingInvites = authStatus === 'authenticated' ? firestoreIncomingInvites : demoIncomingInvites;
  const incomingGameInvites = useMemo(() => {
    return rawIncomingInvites.filter(inv => !blockedUserIds.has(inv.inviterId));
  }, [rawIncomingInvites, blockedUserIds]);

  // Demo Mode Payments Storage (Step 1 - Provider-Agnostic Payment Architecture)
  const [demoPayments, setDemoPayments] = useState<Record<string, Record<string, GamePayment>>>(() => ({}));

  // In-flight join concurrency guard to prevent duplicate concurrent clicks on the same client
  const inFlightJoinsRef = useRef<Set<string>>(new Set());

  const refetchPlayers = () => {
    setPlayersRefreshKey(k => k + 1);
  };

  // Base list of all loaded players before blocking filter
  const allKnownPlayers = useMemo(() => {
    return authStatus === 'authenticated'
      ? (firestorePlayers.length > 0
          ? [
              ...firestorePlayers,
              ...demoPlayers.filter(m => !firestorePlayers.some(f => f.id === m.id || f.username === m.username))
            ]
          : demoPlayers)
      : demoPlayers;
  }, [authStatus, firestorePlayers, demoPlayers]);

  // Authenticated & Demo Mode: Exclude blocked users from normal player discovery and listings
  const players = useMemo(() => {
    return allKnownPlayers.filter(p => !blockedUserIds.has(p.id) && (p.uid ? !blockedUserIds.has(p.uid) : true));
  }, [allKnownPlayers, blockedUserIds]);

  // Blocked players management list (used in user profile/settings)
  const blockedPlayersList = useMemo(() => {
    const list: UserProfile[] = [];
    blockedUserIds.forEach(id => {
      const match = allKnownPlayers.find(p => p.id === id || p.uid === id);
      if (match) {
        list.push(match);
      } else {
        list.push({
          id,
          uid: id,
          name: `Player (${id.slice(0, 6)})`,
          username: `player_${id.slice(0, 5)}`,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
          area: 'Kuwait City',
          bio: '',
          favoriteSports: ['Football'],
          skills: {},
          gamesPlayed: 0,
          gamesHosted: 0,
          attendanceRate: 100,
          privacy: { showAge: false, showPhone: false, allowDirectInvites: false }
        });
      }
    });
    return list;
  }, [allKnownPlayers, blockedUserIds]);
  
  // Data source separation: demoGames for Demo Mode vs firestoreGames for Authenticated Mode
  const [demoGames, setDemoGames] = useState<Game[]>(() => {
    const saved = localStorage.getItem('la3ib_games');
    return saved ? JSON.parse(saved) : INITIAL_GAMES;
  });
  const [firestoreGames, setFirestoreGames] = useState<Game[]>([]);
  const [isGamesLoading, setIsGamesLoading] = useState<boolean>(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [gamesRefreshKey, setGamesRefreshKey] = useState<number>(0);

  const refetchGames = () => {
    setGamesRefreshKey(k => k + 1);
  };

  // Authenticated Mode reads real Firestore games; Demo Mode reads mock/localStorage games
  const games = authStatus === 'authenticated' ? firestoreGames : demoGames;

  // Real-time user-specific games for My Games section
  const [myFirestoreGames, setMyFirestoreGames] = useState<Game[]>([]);
  const [isMyGamesLoading, setIsMyGamesLoading] = useState<boolean>(false);
  const [myGamesError, setMyGamesError] = useState<string | null>(null);

  // Authenticated Mode: real Cloud Firestore games (organized or joined)
  // Demo Mode: isolated local demo games (organized or joined by current demo user)
  // Unauthenticated Mode: empty list (protects private user games from being shown or queried)
  const myGames = authStatus === 'authenticated'
    ? myFirestoreGames
    : (authStatus === 'demo'
        ? demoGames.filter(g => {
            const uid = currentUser.uid || currentUser.id;
            return g.organizer.id === uid || (g as any).organizerId === uid || 
              (Array.isArray(g.participantIds) ? g.participantIds.includes(uid) : g.participants.some(p => p.userId === uid));
          })
        : []
      );

  const setGames: React.Dispatch<React.SetStateAction<Game[]>> = (action) => {
    if (authStatus === 'authenticated') {
      setFirestoreGames(action);
    } else {
      setDemoGames(action);
    }
  };

  const [courts] = useState<Court[]>(MOCK_COURTS);

  // Subscribe to real-time Cloud Firestore discoverable games when authenticated
  useEffect(() => {
    if (authStatus !== 'authenticated') {
      setIsGamesLoading(false);
      setGamesError(null);
      return;
    }

    console.log('[AppContext] Setting up real-time onSnapshot listener for games (status == "Open")...');
    setIsGamesLoading(true);
    setGamesError(null);
    let isSubscribed = true;

    // Safety timeout: 12 seconds so page never remains stuck loading indefinitely
    const timeoutId = setTimeout(() => {
      if (isSubscribed) {
        setIsGamesLoading((loading) => {
          if (loading) {
            console.warn('[AppContext] Firestore games initial load timeout reached. Stopping loading state.');
            return false;
          }
          return false;
        });
      }
    }, 12000);

    const unsubscribe = subscribeToDiscoverGames(
      (realGames) => {
        if (!isSubscribed) return;
        clearTimeout(timeoutId);
        setFirestoreGames(realGames);
        setIsGamesLoading(false);
        setGamesError(null);
      },
      (err) => {
        if (!isSubscribed) return;
        clearTimeout(timeoutId);
        console.error('[AppContext] Error in games onSnapshot listener:', err);
        setIsGamesLoading(false);
        setGamesError(err?.message || 'Failed to load games from Cloud Firestore.');
      }
    );

    return () => {
      isSubscribed = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [authStatus, gamesRefreshKey]);

  // Subscribe to real-time Cloud Firestore My Games for the authenticated user
  useEffect(() => {
    if (authStatus !== 'authenticated' || !firebaseUser?.uid) {
      setMyFirestoreGames([]);
      setIsMyGamesLoading(false);
      setMyGamesError(null);
      return;
    }

    console.log('[AppContext] Setting up real-time onSnapshot listener for My Games (user:', firebaseUser.uid, ')...');
    setIsMyGamesLoading(true);
    setMyGamesError(null);
    let isSubscribed = true;

    // Safety timeout: 12 seconds so page never remains stuck loading indefinitely
    const timeoutId = setTimeout(() => {
      if (isSubscribed) {
        setIsMyGamesLoading((loading) => {
          if (loading) {
            console.warn('[AppContext] Firestore My Games initial load timeout reached. Stopping loading state.');
            return false;
          }
          return false;
        });
      }
    }, 12000);

    const unsubscribe = subscribeToMyGames(
      firebaseUser.uid,
      (userGames) => {
        if (!isSubscribed) return;
        clearTimeout(timeoutId);
        setMyFirestoreGames(userGames);
        setIsMyGamesLoading(false);
        setMyGamesError(null);
      },
      (err) => {
        if (!isSubscribed) return;
        clearTimeout(timeoutId);
        console.error('[AppContext] Error in My Games onSnapshot listener:', err);
        setIsMyGamesLoading(false);
        setMyGamesError(err?.message || 'Failed to load My Games from Cloud Firestore.');
      }
    );

    return () => {
      isSubscribed = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [authStatus, firebaseUser?.uid, gamesRefreshKey]);

  // Subscribe to real-time Cloud Firestore public players directory
  useEffect(() => {
    if (authStatus !== 'authenticated') {
      setIsPlayersLoading(false);
      setPlayersError(null);
      return;
    }

    console.log('[AppContext] Subscribing to public players from Cloud Firestore users collection...');
    setIsPlayersLoading(true);
    setPlayersError(null);
    let isSubscribed = true;

    // Safety timeout: 10s so loading state never remains stuck
    const timeoutId = setTimeout(() => {
      if (isSubscribed) {
        setIsPlayersLoading(false);
      }
    }, 10000);

    const unsubscribe = subscribeToPublicPlayers(
      (realPlayers) => {
        if (!isSubscribed) return;
        clearTimeout(timeoutId);
        setFirestorePlayers(realPlayers);
        setIsPlayersLoading(false);
        setPlayersError(null);
      },
      (err) => {
        if (!isSubscribed) return;
        clearTimeout(timeoutId);
        console.error('[AppContext] Error in public players onSnapshot listener:', err);
        setIsPlayersLoading(false);
        setPlayersError(err?.message || 'Failed to load players from Cloud Firestore.');
      }
    );

    return () => {
      isSubscribed = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [authStatus, playersRefreshKey]);

  // Real-time subscription to current user's followed player list
  useEffect(() => {
    if (authStatus !== 'authenticated' || !firebaseUser?.uid) {
      setFirestoreFollowingIds(new Set());
      return;
    }

    console.log('[AppContext] Subscribing to user following list in Cloud Firestore...');
    const unsubscribe = subscribeToUserFollowing(
      firebaseUser.uid,
      (ids) => {
        setFirestoreFollowingIds(ids);
      },
      (err) => {
        console.error('[AppContext] Error in following onSnapshot listener:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [authStatus, firebaseUser?.uid]);

  // Real-time subscription to current user's friends list
  useEffect(() => {
    if (authStatus !== 'authenticated' || !firebaseUser?.uid) {
      setFirestoreFriendIds(new Set());
      setFirestoreFriendsList([]);
      return;
    }

    console.log('[AppContext] Subscribing to user friends list in Cloud Firestore...');
    const unsubscribe = subscribeToUserFriends(
      firebaseUser.uid,
      (ids) => {
        setFirestoreFriendIds(ids);
      },
      (err) => {
        console.error('[AppContext] Error in friends onSnapshot listener:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [authStatus, firebaseUser?.uid]);

  // Real-time subscription to incoming friend requests
  useEffect(() => {
    if (authStatus !== 'authenticated' || !firebaseUser?.uid) {
      setFirestoreIncomingRequests([]);
      return;
    }

    console.log('[AppContext] Subscribing to incoming friend requests in Cloud Firestore...');
    const unsubscribe = subscribeToIncomingFriendRequests(
      firebaseUser.uid,
      (requests) => {
        setFirestoreIncomingRequests(requests);
      },
      (err) => {
        console.error('[AppContext] Error in incoming friend requests onSnapshot listener:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [authStatus, firebaseUser?.uid]);

  // Real-time subscription to outgoing friend requests
  useEffect(() => {
    if (authStatus !== 'authenticated' || !firebaseUser?.uid) {
      setFirestoreOutgoingRequests(new Set());
      return;
    }

    console.log('[AppContext] Subscribing to outgoing friend requests...');
    const unsubscribe = subscribeToOutgoingFriendRequests(
      firebaseUser.uid,
      (ids) => {
        setFirestoreOutgoingRequests(ids);
      },
      (err) => {
        console.warn('[AppContext] Outgoing friend requests listener notice:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [authStatus, firebaseUser?.uid]);

  // Synchronize full profiles for friends list when firestoreFriendIds changes
  useEffect(() => {
    if (authStatus !== 'authenticated' || firestoreFriendIds.size === 0) {
      setFirestoreFriendsList([]);
      return;
    }

    let isMounted = true;
    fetchFriendProfiles(Array.from(firestoreFriendIds))
      .then((profiles) => {
        if (isMounted) {
          setFirestoreFriendsList(profiles);
        }
      })
      .catch((err) => {
        console.error('[AppContext] Failed to fetch friend profiles:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [authStatus, firestoreFriendIds]);

  // Real-time subscription to incoming pending game invites (Step 4)
  useEffect(() => {
    if (authStatus !== 'authenticated' || !firebaseUser?.uid) {
      setFirestoreIncomingInvites([]);
      return;
    }

    console.log('[AppContext] Subscribing to incoming game invites in Cloud Firestore...');
    const unsubscribe = subscribeToIncomingGameInvites(
      firebaseUser.uid,
      (invites) => {
        setFirestoreIncomingInvites(invites);
      },
      (err) => {
        console.warn('[AppContext] Incoming game invites listener error:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [authStatus, firebaseUser?.uid]);

  // Real-time subscription to current user's blocked players list (Step 6)
  useEffect(() => {
    if (authStatus !== 'authenticated' || !firebaseUser?.uid) {
      setFirestoreBlockedUserIds(new Set());
      return;
    }

    console.log('[AppContext] Subscribing to blocked players in Cloud Firestore...');
    const unsubscribe = subscribeToBlockedPlayers(
      firebaseUser.uid,
      (ids) => {
        setFirestoreBlockedUserIds(ids);
      },
      (err) => {
        console.error('[AppContext] Error in blocked players onSnapshot listener:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [authStatus, firebaseUser?.uid]);

  // Subscribe to real-time Firebase Auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (user) => {
      if (user) {
        setFirebaseUser(user);
        try {
          const profile = await createOrFetchUserProfile(user);
          setCurrentUser(profile);
          setAuthStatus('authenticated');
          setIsDemoActive(false);
        } catch (err) {
          console.error('Failed to load profile from Firestore:', err);
          const fallbackProfile: UserProfile = {
            id: user.uid,
            uid: user.uid,
            name: user.displayName || (user.email ? user.email.split('@')[0] : 'Athlete'),
            username: user.email ? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_') : `user_${user.uid.slice(0, 5)}`,
            email: user.email || '',
            avatar: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
            area: 'Kuwait City',
            bio: 'Sports lover on La3ib Kuwait.',
            favoriteSports: ['Football', 'Padel'],
            skills: { Football: 'Intermediate', Padel: 'Beginner' },
            gamesPlayed: 0,
            gamesHosted: 0,
            attendanceRate: 100,
            isOrganizer: false,
            isAdmin: user.email === 'Khalidalami5555@gmail.com',
            privacy: { showAge: true, showPhone: false, allowDirectInvites: true },
            isDemoUser: false
          };
          setCurrentUser(fallbackProfile);
          setAuthStatus('authenticated');
          setIsDemoActive(false);
        }
      } else {
        setFirebaseUser(null);
        if (isDemoActive) {
          setAuthStatus('demo');
          setCurrentUser({ ...CURRENT_USER, isDemoUser: true });
        } else {
          setAuthStatus('unauthenticated');
          setCurrentUser(GUEST_USER);
        }
      }
    });

    return () => unsubscribe();
  }, [isDemoActive]);

  const loginWithEmail = async (email: string, pass: string) => {
    const user = await loginWithEmailPassword(email, pass);
    setIsDemoActive(false);
    setFirebaseUser(user);
    const profile = await createOrFetchUserProfile(user);
    setCurrentUser(profile);
    setAuthStatus('authenticated');
  };

  const registerWithEmail = async (email: string, pass: string, displayName: string, area?: KuwaitArea) => {
    const user = await registerWithEmailPassword(email, pass, displayName);
    setIsDemoActive(false);
    setFirebaseUser(user);
    const profile = await createOrFetchUserProfile(user, {
      name: displayName,
      area: area || 'Salmiya'
    });
    setCurrentUser(profile);
    setAuthStatus('authenticated');
  };

  const loginWithGoogleAuth = async () => {
    const user = await loginWithGoogle();
    setIsDemoActive(false);
    setFirebaseUser(user);
    const profile = await createOrFetchUserProfile(user);
    setCurrentUser(profile);
    setAuthStatus('authenticated');
  };

  const logout = async () => {
    setIsDemoActive(false);
    if (firebaseUser) {
      await logoutUser();
    }
    // Complete teardown of all user-specific state to prevent any stale state leak between accounts
    setFirebaseUser(null);
    setAuthStatus('unauthenticated');
    setCurrentUser(GUEST_USER);
    setFirestoreFollowingIds(new Set());
    setFirestoreFriendIds(new Set());
    setFirestoreFriendsList([]);
    setFirestoreIncomingRequests([]);
    setFirestoreOutgoingRequests(new Set());
    setFirestoreIncomingInvites([]);
    setFirestoreBlockedUserIds(new Set());
    setMyFirestoreGames([]);
    setFirestoreNotifications([]);
    setSelectedGameForDetail(null);
    setSelectedGameForJoin(null);
    setSelectedPlayerProfile(null);
    setBookingModalOpen(false);
    setCreateGameModalOpen(false);
  };

  const sendPasswordResetEmailAction = async (email: string): Promise<void> => {
    if (authStatus === 'authenticated' || !isDemoActive) {
      await sendPasswordReset(email);
    } else {
      // Demo Mode: local simulated notice without contacting external servers
      const notif: AppNotification = {
        id: 'notif-reset-' + Date.now(),
        type: 'reminder',
        title: 'Password Reset Simulated',
        titleAr: 'محاكاة استعادة كلمة المرور',
        message: `Password reset email simulated for ${email}. No live email was sent in Demo Mode.`,
        messageAr: `تمت محاكاة إرسال رابط استعادة كلمة المرور إلى ${email}.`,
        timestamp: 'Just now',
        read: false
      };
      setDemoNotifications(prev => [notif, ...prev]);
    }
  };

  const reauthenticateAction = async (password?: string): Promise<void> => {
    if (authStatus === 'authenticated' && !isDemoActive) {
      await reauthenticateCurrentUser(password);
    }
  };

  const deleteAccountAction = async (reauthPassword?: string): Promise<void> => {
    if (authStatus === 'authenticated' && !isDemoActive && firebaseUser) {
      await deleteCurrentUserAccount(reauthPassword);
      await logout();
    } else {
      // Demo Mode: safely reset demo identity back to initial clean state
      setCurrentUser({ ...CURRENT_USER, isDemoUser: true });
      setDemoNotifications(INITIAL_NOTIFICATIONS);
      setIsDemoActive(false);
      setAuthStatus('unauthenticated');
      setCurrentUser(GUEST_USER);
    }
  };

  const checkUsername = async (username: string): Promise<{ available: boolean; error?: string }> => {
    const currentUid = (authStatus === 'authenticated' && firebaseUser) ? firebaseUser.uid : undefined;
    return await checkUsernameAvailability(username, currentUid);
  };

  const continueAsDemo = () => {
    setIsDemoActive(true);
    setAuthStatus('demo');
    setCurrentUser({ ...CURRENT_USER, isDemoUser: true });
  };
  const [myBookings, setMyBookings] = useState<CourtBooking[]>(() => {
    const saved = localStorage.getItem('la3ib_bookings');
    return saved ? JSON.parse(saved) : [
      {
        id: 'book-init-1',
        courtId: 'court-padelin-shuwaikh',
        courtName: 'Padel In - Shuwaikh Industrial',
        sport: 'Padel',
        area: 'Shuwaikh',
        address: 'Street 22, Block 1, Shuwaikh',
        date: '2026-09-25',
        startTime: '20:00',
        endTime: '21:30',
        totalCostKWD: 20.000,
        bookingRef: '#LIB-98421',
        bookedAt: '2026-09-24T12:00:00Z',
        isIndoor: true,
        courtImage: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
        hasBeenPostedAsGame: true
      }
    ];
  });
  const [demoNotifications, setDemoNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('la3ib_notifs');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });
  const [firestoreNotifications, setFirestoreNotifications] = useState<AppNotification[]>([]);

  // Authenticated Mode reads real Firestore notifications; Demo Mode reads mock/localStorage notifications
  const notifications = authStatus === 'authenticated' && !isDemoActive
    ? firestoreNotifications
    : demoNotifications;

  const setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>> = (action) => {
    if (authStatus === 'authenticated' && !isDemoActive) {
      setFirestoreNotifications(action);
    } else {
      setDemoNotifications(action);
    }
  };
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>(() => {
    const saved = localStorage.getItem('la3ib_chats');
    return saved ? JSON.parse(saved) : INITIAL_CHATS;
  });
  const [reports, setReports] = useState<ReportItem[]>([
    {
      id: 'rep-1',
      targetId: 'game-1',
      targetType: 'game',
      reason: 'Late arrival by host last week without notice',
      timestamp: 'Today, 2:15 PM',
      resolved: false
    },
    {
      id: 'rep-2',
      targetId: 'u-4',
      targetType: 'user',
      reason: 'No-show without cancellation at Padel match',
      timestamp: 'Yesterday',
      resolved: false
    }
  ]);

  // Admin & Moderation Backend State
  const [firestoreReports, setFirestoreReports] = useState<ReportDocument[]>([]);
  const [isModerationLoading, setIsModerationLoading] = useState<boolean>(false);
  const [moderationLogs, setModerationLogs] = useState<ModerationLogEntry[]>([]);

  // Real-time listener for moderation queue when user is an authorized admin
  useEffect(() => {
    if (authStatus !== 'authenticated' || isDemoActive || !currentUser.isAdmin) {
      setFirestoreReports([]);
      setModerationLogs([]);
      return;
    }

    console.log('[AppContext] Setting up real-time onSnapshot listener for Admin moderation queue...');
    setIsModerationLoading(true);

    const unsubscribeReports = subscribeToReportsInFirestore(
      (items) => {
        setFirestoreReports(items);
        setIsModerationLoading(false);
      },
      (err) => {
        console.warn('[AppContext] Moderation reports subscription notice:', err);
        setIsModerationLoading(false);
      }
    );

    // Initial fetch of immutable audit logs for dashboard auditability
    fetchModerationLogsFromFirestore(50)
      .then(logs => setModerationLogs(logs))
      .catch(err => console.warn('[AppContext] Could not fetch moderation logs:', err));

    return () => {
      unsubscribeReports();
    };
  }, [authStatus, isDemoActive, currentUser.isAdmin]);

  // State
  const [activeTab, setActiveTab] = useState<'home' | 'discover' | 'games' | 'players' | 'profile' | 'admin'>('home');
  const [selectedArea, setSelectedArea] = useState<KuwaitArea | 'All Kuwait'>('All Kuwait');
  const [selectedSport, setSelectedSport] = useState<SportType | 'All'>('All');
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedCourtForBooking, setSelectedCourtForBooking] = useState<Court | null>(null);
  
  const [createGameModalOpen, setCreateGameModalOpen] = useState(false);
  const [createGamePrefill, setCreateGamePrefill] = useState<Partial<Game> | null>(null);
  
  const [selectedGameForDetail, setSelectedGameForDetail] = useState<Game | null>(null);
  const [selectedGameForJoin, setSelectedGameForJoin] = useState<Game | null>(null);
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState<UserProfile | null>(null);

  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('la3ib_games', JSON.stringify(demoGames));
  }, [demoGames]);

  useEffect(() => {
    localStorage.setItem('la3ib_bookings', JSON.stringify(myBookings));
  }, [myBookings]);

  useEffect(() => {
    localStorage.setItem('la3ib_notifs', JSON.stringify(demoNotifications));
  }, [demoNotifications]);

  // Real-time Firestore notifications for authenticated user
  useEffect(() => {
    if (authStatus !== 'authenticated' || isDemoActive || !firebaseUser?.uid) {
      setFirestoreNotifications([]);
      return;
    }

    console.log('[AppContext] Subscribing to real-time notifications for user:', firebaseUser.uid);
    let isSubscribed = true;

    const unsubscribe = subscribeToNotifications(
      firebaseUser.uid,
      (realNotifs) => {
        if (!isSubscribed) return;
        setFirestoreNotifications(realNotifs);
      },
      (err) => {
        if (!isSubscribed) return;
        console.error('[AppContext] Error in notifications listener:', err);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [authStatus, isDemoActive, firebaseUser?.uid]);

  useEffect(() => {
    localStorage.setItem('la3ib_chats', JSON.stringify(chats));
  }, [chats]);

  // Keep selectedGameForDetail in sync with updated games
  useEffect(() => {
    if (selectedGameForDetail) {
      const found = games.find(g => g.id === selectedGameForDetail.id);
      if (found) {
        setSelectedGameForDetail(found);
      }
    }
  }, [games]);

  // Translation helper
  const t = (en: string, ar: string) => {
    return language === 'ar' ? ar : en;
  };

  // Book court through Li3ib
  const bookCourtViaLi3ib = (
    court: Court,
    slot: { id: string; date: string; startTime: string; endTime: string; priceKWD: number }
  ): CourtBooking => {
    const refCode = '#LIB-' + Math.floor(10000 + Math.random() * 90000);
    const newBooking: CourtBooking = {
      id: 'book-' + Date.now(),
      courtId: court.id,
      courtName: court.name,
      sport: court.sport,
      area: court.area,
      address: court.address,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      totalCostKWD: slot.priceKWD,
      bookingRef: refCode,
      bookedAt: new Date().toISOString(),
      isIndoor: court.isIndoor,
      courtImage: court.image,
      hasBeenPostedAsGame: false
    };

    setMyBookings(prev => [newBooking, ...prev]);

    // Push notification
    const newNotif: AppNotification = {
      id: 'notif-' + Date.now(),
      type: 'booking',
      title: 'Li3ib Court Confirmed',
      titleAr: 'تم تأكيد حجز الملعب بنجاح',
      message: `Your booking at ${court.name} (${slot.date} at ${slot.startTime}) is confirmed. Total: ${slot.priceKWD.toFixed(3)} KWD.`,
      messageAr: `تم تأكيد حجزك في ${court.nameAr || court.name} (${slot.date} الساعة ${slot.startTime}). الإجمالي: ${slot.priceKWD.toFixed(3)} د.ك.`,
      timestamp: 'Just now',
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);

    confetti({
      particleCount: 75,
      spread: 60,
      origin: { y: 0.6 }
    });

    return newBooking;
  };

  // Post booking as game
  const postBookingAsGame = (booking: CourtBooking) => {
    setMyBookings(prev => 
      prev.map(b => b.id === booking.id ? { ...b, hasBeenPostedAsGame: true } : b)
    );

    // Set prefill for Create Game modal
    const defaultMaxPlayers = booking.sport === 'Football' ? 10 : booking.sport === 'Padel' ? 4 : 8;
    const pricePerPlayer = parseFloat((booking.totalCostKWD / defaultMaxPlayers).toFixed(3));

    setCreateGamePrefill({
      title: `${booking.sport} at ${booking.courtName}`,
      sport: booking.sport,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      courtName: booking.courtName,
      area: booking.area,
      address: booking.address,
      totalCourtCostKWD: booking.totalCostKWD,
      maxPlayers: defaultMaxPlayers,
      pricePerPlayerKWD: pricePerPlayer,
      isIndoor: booking.isIndoor,
      linkedBookingId: booking.id,
      skillLevel: 'Intermediate',
      gender: 'Everyone',
      visibility: 'Public',
      status: 'Open',
      description: `Court booked via Li3ib (${booking.bookingRef}). Let's fill the spots and have a great match!`
    });

    setBookingModalOpen(false);
    setCreateGameModalOpen(true);
  };

  // Create a Game
  const createGame = async (gameData: Omit<Game, 'id' | 'createdAt' | 'organizer' | 'participants'>): Promise<Game> => {
    const gameId = 'game-' + Date.now();

    // If authenticated with real Firebase account, save game directly to Cloud Firestore `games` collection
    if (firebaseUser) {
      await createGameInFirestore(
        {
          id: gameId,
          title: gameData.title,
          sport: gameData.sport,
          date: gameData.date,
          startTime: gameData.startTime,
          endTime: gameData.endTime,
          courtName: gameData.courtName,
          venue: gameData.courtName,
          area: gameData.area,
          governorate: gameData.area,
          address: gameData.address,
          location: `${gameData.courtName}, ${gameData.area} (${gameData.address})`,
          isIndoor: gameData.isIndoor,
          indoorAC: gameData.isIndoor,
          maxPlayers: gameData.maxPlayers,
          currentPlayers: 1,
          totalCourtCostKWD: gameData.totalCourtCostKWD,
          totalCost: gameData.totalCourtCostKWD,
          pricePerPlayerKWD: gameData.pricePerPlayerKWD,
          pricePerPlayer: gameData.pricePerPlayerKWD,
          skillLevel: gameData.skillLevel,
          gender: gameData.gender,
          visibility: gameData.visibility,
          status: 'Open',
          description: gameData.description,
          linkedBookingId: gameData.linkedBookingId,
          cancellationPolicy: gameData.cancellationPolicy,
          coordinates: gameData.coordinates,
        },
        firebaseUser,
        currentUser
      );
    }

    const effectiveOrganizerId = firebaseUser ? firebaseUser.uid : currentUser.id;
    const effectiveOrganizer: UserProfile = {
      ...currentUser,
      id: effectiveOrganizerId,
      uid: effectiveOrganizerId
    };

    const newGame: Game = {
      ...gameData,
      id: gameId,
      createdAt: new Date().toISOString(),
      organizer: effectiveOrganizer,
      participants: [
        {
          userId: effectiveOrganizerId,
          name: currentUser.name,
          username: currentUser.username,
          avatar: currentUser.avatar,
          skill: currentUser.skills[gameData.sport] || 'Intermediate',
          paymentStatus: 'Paid',
          paidAmountKWD: gameData.pricePerPlayerKWD,
          joinedAt: 'Just now',
          paymentMethod: 'KNET',
          attendanceConfirmed: false
        }
      ],
      participantIds: [effectiveOrganizerId]
    };

    setGames(prev => [newGame, ...prev]);

    // Initialize game chat
    setChats(prev => ({
      ...prev,
      [gameId]: [
        {
          id: 'chat-init-' + Date.now(),
          gameId: gameId,
          senderId: effectiveOrganizerId,
          senderName: `${currentUser.name} (Organizer)`,
          senderAvatar: currentUser.avatar,
          text: `Welcome players to ${newGame.title}! Use this chat for coordinating arrival, jerseys, and questions.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAnnouncement: true
        }
      ]
    }));

    // Add notification
    const newNotif: AppNotification = {
      id: 'notif-' + Date.now(),
      type: 'joined',
      title: 'Game Published! 🚀',
      titleAr: 'تم نشر المباراة بنجاح! 🚀',
      message: `Your game "${newGame.title}" is live. Other players can now discover and join.`,
      messageAr: `مباراتك "${newGame.title}" أصبحت متاحة الآن للاعبين في الكويت.`,
      timestamp: 'Just now',
      read: false,
      gameId: gameId
    };
    setNotifications(prev => [newNotif, ...prev]);

    // Update user stats
    setCurrentUser(prev => ({
      ...prev,
      gamesHosted: prev.gamesHosted + 1
    }));

    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 }
    });

    setCreateGameModalOpen(false);
    setSelectedGameForDetail(newGame);

    return newGame;
  };

  // Join a Game & Pay
  const joinGame = async (gameId: string, paymentMethod: 'KNET' | 'Apple Pay' | 'Credit Card'): Promise<boolean> => {
    // 1. Authentication check: If not in demo mode and not authenticated, user must sign in first
    if (!isDemoActive && !firebaseUser) {
      setAuthModalMode('login');
      setAuthModalOpen(true);
      throw new Error('Please sign in or create an account to join games.');
    }

    // Guard against rapid duplicate clicks on the same client
    if (inFlightJoinsRef.current.has(gameId)) {
      throw new Error('Join request already in progress. Please wait.');
    }
    inFlightJoinsRef.current.add(gameId);

    try {
      // If user has an active pending invite for this match, delegate directly to acceptGameInvite
      // so the invite document is marked accepted and the atomic join transaction executes without double-join
      const hasInvite = (authStatus === 'authenticated' && firebaseUser && !isDemoActive)
        ? firestoreIncomingInvites.some(inv => inv.gameId === gameId)
        : demoIncomingInvites.some(inv => inv.gameId === gameId);

      if (hasInvite) {
        inFlightJoinsRef.current.delete(gameId);
        await acceptGameInvite(gameId);
        return true;
      }

      const target = games.find(g => g.id === gameId) || (myGames && myGames.find(g => g.id === gameId));
      if (!target) {
        throw new Error('Game not found.');
      }

      if (target.status === 'Cancelled') {
        throw new Error('This game has been cancelled.');
      }

      // Effective participant user ID: real Firebase UID if authenticated, or demo user ID if in Demo Mode
      const effectiveUserId = (firebaseUser && !isDemoActive) ? firebaseUser.uid : currentUser.id;

      // Client-side quick validation
      if (target.participants.some(p => p.userId === effectiveUserId)) {
        throw new Error('You have already joined this match.');
      }

      if (target.participants.length >= target.maxPlayers) {
        throw new Error('This game is full. No more spots are available.');
      }

      const newParticipant: GameParticipant = {
        userId: effectiveUserId,
        name: currentUser.name,
        username: currentUser.username || (firebaseUser?.email ? firebaseUser.email.split('@')[0] : 'player'),
        avatar: currentUser.avatar,
        skill: currentUser.skills[target.sport] || 'Casual',
        paymentStatus: 'Paid' as const,
        paidAmountKWD: target.pricePerPlayerKWD,
        joinedAt: new Date().toISOString(),
        paymentMethod: paymentMethod,
        attendanceConfirmed: false
      };

      // AUTHENTICATED MODE: Persist atomically to Cloud Firestore
      if (firebaseUser && !isDemoActive) {
        console.log('[AppContext] Executing Firestore join transaction for game:', gameId);
        const updatedGame = await joinGameInFirestore(gameId, newParticipant);
        
        // Update local state, My Games, and selected detail modal with updated game
        setFirestoreGames(prev =>
          prev.map(g => (g.id === gameId ? updatedGame : g))
        );
        setMyFirestoreGames(prev => {
          const exists = prev.some(g => g.id === gameId);
          return exists ? prev.map(g => (g.id === gameId ? updatedGame : g)) : [...prev, updatedGame];
        });
        if (selectedGameForDetail && selectedGameForDetail.id === gameId) {
          setSelectedGameForDetail(updatedGame);
        }
      } else {
        // DEMO MODE: Pure local state & localStorage behavior using production helper
        const updatedGame = applyGameParticipantJoin(target, newParticipant);

        setDemoGames(prev =>
          prev.map(g => (g.id === gameId ? updatedGame : g))
        );
      }

      // Update chats with join message
      setChats(prev => {
        const existing = prev[gameId] || [];
        return {
          ...prev,
          [gameId]: [
            ...existing,
            {
              id: 'chat-join-' + Date.now(),
              gameId,
              senderId: 'system',
              senderName: 'La3ib Bot',
              senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
              text: `${currentUser.name} joined the game and paid ${target.pricePerPlayerKWD.toFixed(3)} KWD via ${paymentMethod}.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]
        };
      });

      // Add notification
      const newNotif: AppNotification = {
        id: 'notif-' + Date.now(),
        type: 'payment',
        title: 'Booking Share Paid ✓',
        titleAr: 'تم دفع حصتك وتأكيد المكان ✓',
        message: `You joined "${target.title}". Payment of ${target.pricePerPlayerKWD.toFixed(3)} KWD confirmed via ${paymentMethod}.`,
        messageAr: `تم انضمامك إلى "${target.title}". تم تأكيد الدفع بمبلغ ${target.pricePerPlayerKWD.toFixed(3)} د.ك بنجاح.`,
        timestamp: 'Just now',
        read: false,
        gameId: gameId
      };
      setNotifications(prev => [newNotif, ...prev]);

      // Update current user games count
      setCurrentUser(prev => ({
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1
      }));

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.55 }
      });

      setSelectedGameForJoin(null);
      return true;
    } catch (err: any) {
      // Proactively refresh game state from Firestore so stale screens immediately update
      if (firebaseUser && !isDemoActive && isFirebaseConfigured) {
        try {
          const freshGame = await getGameFromFirestore(gameId);
          if (freshGame) {
            setFirestoreGames(prev => prev.map(g => (g.id === gameId ? freshGame : g)));
            if (selectedGameForDetail && selectedGameForDetail.id === gameId) {
              setSelectedGameForDetail(freshGame);
            }
            if (selectedGameForJoin && selectedGameForJoin.id === gameId) {
              setSelectedGameForJoin(freshGame);
            }
          }
        } catch (fetchErr) {
          console.warn('[AppContext] Could not refresh stale game state after join failure:', fetchErr);
        }
      }
      throw err;
    } finally {
      inFlightJoinsRef.current.delete(gameId);
    }
  };

  // Leave Game
  const leaveGame = async (gameId: string): Promise<boolean> => {
    // 1. Authentication check: If not in demo mode and not authenticated, user must sign in
    if (!isDemoActive && !firebaseUser) {
      setAuthModalMode('login');
      setAuthModalOpen(true);
      throw new Error('Please sign in or create an account to leave games.');
    }

    const target = (myGames && myGames.find(g => g.id === gameId)) || games.find(g => g.id === gameId);
    if (!target) {
      throw new Error('Game not found.');
    }

    // Effective participant user ID: real Firebase UID if authenticated, or demo user ID if in Demo Mode
    const effectiveUserId = (firebaseUser && !isDemoActive) ? firebaseUser.uid : currentUser.id;

    // Check organizer rejection
    const organizerUid = target.organizer?.id || (target as any).organizerId;
    if (organizerUid === effectiveUserId) {
      throw new Error('The game organizer cannot leave the game.');
    }

    if (target.status === 'Cancelled') {
      throw new Error('This game has been cancelled.');
    }

    // Client-side quick check
    if (!target.participants.some(p => p.userId === effectiveUserId)) {
      throw new Error('You are not currently joined in this match.');
    }

    // AUTHENTICATED MODE: Persist atomically to Cloud Firestore
    if (firebaseUser && !isDemoActive) {
      console.log('[AppContext] Executing Firestore leave transaction for game:', gameId);
      const updatedGame = await leaveGameInFirestore(gameId, effectiveUserId);

      // Update local state and selected detail modal with updated game
      setFirestoreGames(prev =>
        prev.map(g => (g.id === gameId ? updatedGame : g))
      );
      // Immediately remove from My Games list so no stale joined state remains
      setMyFirestoreGames(prev =>
        prev.filter(g => g.id !== gameId || g.organizer.id === effectiveUserId)
      );
      if (selectedGameForDetail && selectedGameForDetail.id === gameId) {
        setSelectedGameForDetail(updatedGame);
      }
    } else {
      // DEMO MODE: Pure local state & localStorage behavior using production helper
      const updatedGame = applyGameParticipantLeave(target, effectiveUserId);

      setDemoGames(prev =>
        prev.map(g => (g.id === gameId ? updatedGame : g))
      );
      if (selectedGameForDetail && selectedGameForDetail.id === gameId) {
        setSelectedGameForDetail(updatedGame);
      }
    }

    const notif: AppNotification = {
      id: 'notif-leave-' + Date.now(),
      type: 'payment',
      title: 'Refund Processed',
      titleAr: 'تمت معالجة استرجاع المبلغ',
      message: `You left "${target.title}". Your share will be refunded back to your payment account.`,
      messageAr: `لقد غادرت "${target.title}". سيتم استرجاع حصتك المدفوعة إلى حسابك.`,
      timestamp: 'Just now',
      read: false
    };
    setNotifications(prev => [notif, ...prev]);

    // Update current user games count
    setCurrentUser(prev => ({
      ...prev,
      gamesPlayed: Math.max(0, prev.gamesPlayed - 1)
    }));

    return true;
  };

  // Chat message
  const sendChatMessage = async (gameId: string, text: string, isAnnouncement: boolean = false): Promise<void> => {
    if (!text.trim()) return;

    // Authenticated Mode: persist real-time message to Cloud Firestore subcollection
    if (firebaseUser && !isDemoActive) {
      await sendGameChatMessage(gameId, {
        text: text.trim(),
        isAnnouncement,
        senderName: currentUser.name + (isAnnouncement ? ' (Organizer)' : ''),
        senderPhotoURL: currentUser.avatar
      });
      return;
    }

    // Demo Mode: local simulated chat
    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      gameId,
      senderId: currentUser.id,
      senderName: currentUser.name + (isAnnouncement ? ' (Organizer)' : ''),
      senderAvatar: currentUser.avatar,
      senderPhotoURL: currentUser.avatar,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAnnouncement
    };

    setChats(prev => ({
      ...prev,
      [gameId]: [...(prev[gameId] || []), newMsg]
    }));
  };

  // Follow / Unfollow player relationships
  const isFollowingUser = (userId: string): boolean => {
    return followingUserIds.has(userId);
  };

  const isFollowActionLoading = (userId: string): boolean => {
    return Boolean(followingLoadingMap[userId]);
  };

  const followPlayer = async (targetUserId: string): Promise<void> => {
    if (followingUserIds.has(targetUserId)) return;
    await toggleFollowPlayer(targetUserId);
  };

  const unfollowPlayer = async (targetUserId: string): Promise<void> => {
    if (!followingUserIds.has(targetUserId)) return;
    await toggleFollowPlayer(targetUserId);
  };

  const toggleFollowPlayer = async (targetUserId: string): Promise<void> => {
    const myUid = currentUser.uid || currentUser.id;
    if (!targetUserId || targetUserId === myUid) {
      console.warn('Cannot follow oneself or invalid target player');
      return;
    }

    if (followingLoadingMap[targetUserId]) {
      return; // prevent duplicate clicks while operation is in progress
    }

    const currentlyFollowing = followingUserIds.has(targetUserId);

    if (authStatus === 'authenticated') {
      if (!firebaseUser?.uid) return;

      setFollowingLoadingMap(prev => ({ ...prev, [targetUserId]: true }));

      // Optimistic update of following state & follower count
      setFirestoreFollowingIds(prev => {
        const next = new Set(prev);
        if (currentlyFollowing) next.delete(targetUserId);
        else next.add(targetUserId);
        return next;
      });

      const countDelta = currentlyFollowing ? -1 : 1;

      setFirestorePlayers(prev =>
        prev.map(p => {
          if (p.id === targetUserId || p.uid === targetUserId) {
            return {
              ...p,
              isFollowing: !currentlyFollowing,
              followerCount: Math.max(0, (p.followerCount ?? 0) + countDelta)
            };
          }
          return p;
        })
      );

      // Update current user's followingCount in state
      setCurrentUser(prev => ({
        ...prev,
        followingCount: Math.max(0, (prev.followingCount ?? 0) + countDelta)
      }));

      // Update modal profile if viewing this player
      if (selectedPlayerProfile && (selectedPlayerProfile.id === targetUserId || selectedPlayerProfile.uid === targetUserId)) {
        setSelectedPlayerProfile(prev => prev ? ({
          ...prev,
          isFollowing: !currentlyFollowing,
          followerCount: Math.max(0, (prev.followerCount ?? 0) + countDelta)
        }) : null);
      }

      try {
        if (currentlyFollowing) {
          await unfollowPlayerInFirestore(targetUserId);
        } else {
          await followPlayerInFirestore(targetUserId);
        }
      } catch (err) {
        console.error('Failed to update follow relationship in Firestore:', err);
        // Rollback optimistic state on error
        setFirestoreFollowingIds(prev => {
          const next = new Set(prev);
          if (currentlyFollowing) next.add(targetUserId);
          else next.delete(targetUserId);
          return next;
        });

        setFirestorePlayers(prev =>
          prev.map(p => {
            if (p.id === targetUserId || p.uid === targetUserId) {
              return {
                ...p,
                isFollowing: currentlyFollowing,
                followerCount: Math.max(0, (p.followerCount ?? 0) - countDelta)
              };
            }
            return p;
          })
        );

        setCurrentUser(prev => ({
          ...prev,
          followingCount: Math.max(0, (prev.followingCount ?? 0) - countDelta)
        }));

        if (selectedPlayerProfile && (selectedPlayerProfile.id === targetUserId || selectedPlayerProfile.uid === targetUserId)) {
          setSelectedPlayerProfile(prev => prev ? ({
            ...prev,
            isFollowing: currentlyFollowing,
            followerCount: Math.max(0, (prev.followerCount ?? 0) - countDelta)
          }) : null);
        }
      } finally {
        setFollowingLoadingMap(prev => ({ ...prev, [targetUserId]: false }));
      }
    } else {
      // Demo Mode: completely isolated local in-memory follow/unfollow
      setDemoFollowingIds(prev => {
        const next = new Set(prev);
        if (currentlyFollowing) next.delete(targetUserId);
        else next.add(targetUserId);
        return next;
      });

      const countDelta = currentlyFollowing ? -1 : 1;

      setDemoPlayers(prev =>
        prev.map(p => {
          if (p.id === targetUserId || p.uid === targetUserId) {
            return {
              ...p,
              isFollowing: !currentlyFollowing,
              followerCount: Math.max(0, (p.followerCount ?? 0) + countDelta)
            };
          }
          return p;
        })
      );

      setCurrentUser(prev => ({
        ...prev,
        followingCount: Math.max(0, (prev.followingCount ?? 0) + countDelta)
      }));

      if (selectedPlayerProfile && (selectedPlayerProfile.id === targetUserId || selectedPlayerProfile.uid === targetUserId)) {
        setSelectedPlayerProfile(prev => prev ? ({
          ...prev,
          isFollowing: !currentlyFollowing,
          followerCount: Math.max(0, (prev.followerCount ?? 0) + countDelta)
        }) : null);
      }
    }
  };

  // Friends & Friend Requests (Step 3)
  const isFriendActionLoading = (userId: string): boolean => {
    return Boolean(friendLoadingMap[userId]);
  };

  const getFriendshipStatus = (userId: string): FriendshipStatus => {
    if (!userId) return 'none';
    const myUid = currentUser.uid || currentUser.id;
    if (userId === myUid) return 'none';

    if (friendIds.has(userId)) return 'friends';
    if (incomingFriendRequests.some(r => r.requesterId === userId)) return 'incoming_request';
    if (outgoingFriendRequestIds.has(userId)) return 'outgoing_request';
    return 'none';
  };

  const sendFriendRequest = async (targetUserId: string): Promise<void> => {
    const myUid = currentUser.uid || currentUser.id;
    if (!targetUserId || targetUserId === myUid) {
      console.warn('Cannot send friend request to oneself or invalid target');
      return;
    }

    if (friendLoadingMap[targetUserId]) return;
    if (friendIds.has(targetUserId) || outgoingFriendRequestIds.has(targetUserId)) return;

    setFriendLoadingMap(prev => ({ ...prev, [targetUserId]: true }));

    if (authStatus === 'authenticated') {
      if (!firebaseUser?.uid) return;

      // Optimistic update
      setFirestoreOutgoingRequests(prev => new Set(prev).add(targetUserId));
      try {
        await sendFriendRequestInFirestore(targetUserId, currentUser);
      } catch (err) {
        console.error('Failed to send friend request in Firestore:', err);
        setFirestoreOutgoingRequests(prev => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
      } finally {
        setFriendLoadingMap(prev => ({ ...prev, [targetUserId]: false }));
      }
    } else {
      // Demo Mode: completely isolated local in-memory state
      setDemoOutgoingRequests(prev => new Set(prev).add(targetUserId));
      setFriendLoadingMap(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const cancelFriendRequest = async (targetUserId: string): Promise<void> => {
    const myUid = currentUser.uid || currentUser.id;
    if (!targetUserId || targetUserId === myUid) return;
    if (friendLoadingMap[targetUserId]) return;

    setFriendLoadingMap(prev => ({ ...prev, [targetUserId]: true }));

    if (authStatus === 'authenticated') {
      if (!firebaseUser?.uid) return;

      setFirestoreOutgoingRequests(prev => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });

      try {
        await cancelFriendRequestInFirestore(targetUserId);
      } catch (err) {
        console.error('Failed to cancel friend request in Firestore:', err);
        setFirestoreOutgoingRequests(prev => new Set(prev).add(targetUserId));
      } finally {
        setFriendLoadingMap(prev => ({ ...prev, [targetUserId]: false }));
      }
    } else {
      // Demo Mode
      setDemoOutgoingRequests(prev => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
      setFriendLoadingMap(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const acceptFriendRequest = async (requesterId: string): Promise<void> => {
    if (!requesterId || friendLoadingMap[requesterId]) return;

    setFriendLoadingMap(prev => ({ ...prev, [requesterId]: true }));

    if (authStatus === 'authenticated') {
      if (!firebaseUser?.uid) return;

      // Optimistic updates
      setFirestoreIncomingRequests(prev => prev.filter(r => r.requesterId !== requesterId));
      setFirestoreFriendIds(prev => new Set(prev).add(requesterId));

      setFirestorePlayers(prev => prev.map(p => {
        if (p.id === requesterId || p.uid === requesterId) {
          return { ...p, friendCount: (p.friendCount ?? 0) + 1 };
        }
        return p;
      }));

      setCurrentUser(prev => ({
        ...prev,
        friendCount: (prev.friendCount ?? 0) + 1
      }));

      if (selectedPlayerProfile && (selectedPlayerProfile.id === requesterId || selectedPlayerProfile.uid === requesterId)) {
        setSelectedPlayerProfile(prev => prev ? ({
          ...prev,
          friendCount: (prev.friendCount ?? 0) + 1
        }) : null);
      }

      try {
        await acceptFriendRequestInFirestore(requesterId, currentUser);
        try {
          confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
        } catch (e) {}
      } catch (err) {
        console.error('Failed to accept friend request in Firestore:', err);
        // Rollback
        setFirestoreFriendIds(prev => {
          const next = new Set(prev);
          next.delete(requesterId);
          return next;
        });
        setCurrentUser(prev => ({
          ...prev,
          friendCount: Math.max(0, (prev.friendCount ?? 1) - 1)
        }));
      } finally {
        setFriendLoadingMap(prev => ({ ...prev, [requesterId]: false }));
      }
    } else {
      // Demo Mode
      setDemoIncomingRequests(prev => prev.filter(r => r.requesterId !== requesterId));
      setDemoFriendIds(prev => new Set(prev).add(requesterId));

      setDemoPlayers(prev => prev.map(p => {
        if (p.id === requesterId || p.uid === requesterId) {
          return { ...p, friendCount: (p.friendCount ?? 0) + 1 };
        }
        return p;
      }));

      setCurrentUser(prev => ({
        ...prev,
        friendCount: (prev.friendCount ?? 0) + 1
      }));

      if (selectedPlayerProfile && (selectedPlayerProfile.id === requesterId || selectedPlayerProfile.uid === requesterId)) {
        setSelectedPlayerProfile(prev => prev ? ({
          ...prev,
          friendCount: (prev.friendCount ?? 0) + 1
        }) : null);
      }

      try {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
      } catch (e) {}

      setFriendLoadingMap(prev => ({ ...prev, [requesterId]: false }));
    }
  };

  const declineFriendRequest = async (requesterId: string): Promise<void> => {
    if (!requesterId || friendLoadingMap[requesterId]) return;

    setFriendLoadingMap(prev => ({ ...prev, [requesterId]: true }));

    if (authStatus === 'authenticated') {
      if (!firebaseUser?.uid) return;
      const targetReq = firestoreIncomingRequests.find(r => r.requesterId === requesterId);
      setFirestoreIncomingRequests(prev => prev.filter(r => r.requesterId !== requesterId));

      try {
        await declineFriendRequestInFirestore(requesterId);
      } catch (err) {
        console.error('Failed to decline friend request in Firestore:', err);
        if (targetReq) {
          setFirestoreIncomingRequests(prev => [...prev, targetReq]);
        }
      } finally {
        setFriendLoadingMap(prev => ({ ...prev, [requesterId]: false }));
      }
    } else {
      // Demo Mode
      setDemoIncomingRequests(prev => prev.filter(r => r.requesterId !== requesterId));
      setFriendLoadingMap(prev => ({ ...prev, [requesterId]: false }));
    }
  };

  // =====================================================================
  // GAME INVITES SYSTEM (Step 4)
  // =====================================================================

  const isGameInviteLoading = (gameId: string, inviteeId: string): boolean => {
    return Boolean(inviteActionLoadingMap[`${gameId}_${inviteeId}`]);
  };

  const getGameInvitesForGame = (gameId: string): Record<string, GameInvite> => {
    return gameInvitesMap[gameId] || {};
  };

  // Organizer: Send invite to a discoverable player
  const sendGameInvite = async (gameId: string, inviteeId: string): Promise<void> => {
    const actionKey = `${gameId}_${inviteeId}`;
    if (inviteActionLoadingMap[actionKey]) return;

    setInviteActionLoadingMap(prev => ({ ...prev, [actionKey]: true }));

    const targetGame = games.find(g => g.id === gameId);
    const targetPlayer = players.find(p => p.id === inviteeId || p.uid === inviteeId);

    if (authStatus === 'authenticated') {
      try {
        await sendGameInviteInFirestore(gameId, inviteeId, currentUser);

        // Optimistically record invite in organizer view
        setGameInvitesMap(prev => {
          const gameMap = { ...(prev[gameId] || {}) };
          gameMap[inviteeId] = {
            id: inviteeId,
            gameId,
            inviterId: firebaseUser?.uid || currentUser.id,
            inviteeId,
            status: 'pending',
            createdAt: new Date().toISOString(),
            gameTitle: targetGame?.title || 'Pickup Match',
            gameSport: targetGame?.sport || 'Football',
            gameDate: targetGame?.date || '',
            gameStartTime: targetGame?.startTime || '',
            gameCourtName: targetGame?.courtName || '',
            gameArea: targetGame?.area || 'Kuwait City',
            gamePricePerPlayerKWD: targetGame?.pricePerPlayerKWD || 0,
            inviterName: currentUser.name,
            inviterAvatar: currentUser.avatar,
            inviteeName: targetPlayer?.name || '',
            inviteeAvatar: targetPlayer?.avatar || ''
          };
          return { ...prev, [gameId]: gameMap };
        });
      } catch (err: any) {
        console.error('Failed to send game invite in Firestore:', err);
        throw err;
      } finally {
        setInviteActionLoadingMap(prev => ({ ...prev, [actionKey]: false }));
      }
    } else {
      // Demo Mode
      const newInvite: GameInvite = {
        id: inviteeId,
        gameId,
        inviterId: currentUser.id,
        inviteeId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        gameTitle: targetGame?.title || 'Pickup Match',
        gameSport: targetGame?.sport || 'Football',
        gameDate: targetGame?.date || '',
        gameStartTime: targetGame?.startTime || '',
        gameCourtName: targetGame?.courtName || '',
        gameArea: targetGame?.area || 'Kuwait City',
        gamePricePerPlayerKWD: targetGame?.pricePerPlayerKWD || 0,
        inviterName: currentUser.name,
        inviterAvatar: currentUser.avatar,
        inviteeName: targetPlayer?.name || '',
        inviteeAvatar: targetPlayer?.avatar || ''
      };

      setGameInvitesMap(prev => {
        const gameMap = { ...(prev[gameId] || {}) };
        gameMap[inviteeId] = newInvite;
        return { ...prev, [gameId]: gameMap };
      });

      // If invitee is currentUser (for demo testing), add to demo incoming
      if (inviteeId === currentUser.id) {
        setDemoIncomingInvites(prev => [newInvite, ...prev]);
      }

      setInviteActionLoadingMap(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Organizer: Cancel a pending invite
  const cancelGameInvite = async (gameId: string, inviteeId: string): Promise<void> => {
    const actionKey = `${gameId}_${inviteeId}`;
    if (inviteActionLoadingMap[actionKey]) return;

    setInviteActionLoadingMap(prev => ({ ...prev, [actionKey]: true }));

    if (authStatus === 'authenticated') {
      try {
        await cancelGameInviteInFirestore(gameId, inviteeId);

        // Optimistically remove from organizer view
        setGameInvitesMap(prev => {
          const gameMap = { ...(prev[gameId] || {}) };
          delete gameMap[inviteeId];
          return { ...prev, [gameId]: gameMap };
        });
      } catch (err: any) {
        console.error('Failed to cancel game invite in Firestore:', err);
        throw err;
      } finally {
        setInviteActionLoadingMap(prev => ({ ...prev, [actionKey]: false }));
      }
    } else {
      // Demo Mode
      setGameInvitesMap(prev => {
        const gameMap = { ...(prev[gameId] || {}) };
        delete gameMap[inviteeId];
        return { ...prev, [gameId]: gameMap };
      });
      setDemoIncomingInvites(prev => prev.filter(inv => !(inv.gameId === gameId && inv.inviteeId === inviteeId)));
      setInviteActionLoadingMap(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Invitee: Accept game invite -> uses trusted Join Game logic
  const acceptGameInvite = async (gameId: string): Promise<void> => {
    const currentUid = authStatus === 'authenticated' && firebaseUser ? firebaseUser.uid : currentUser.id;
    const actionKey = `${gameId}_${currentUid}`;
    if (inviteActionLoadingMap[actionKey]) return;

    setInviteActionLoadingMap(prev => ({ ...prev, [actionKey]: true }));

    const targetGame = games.find(g => g.id === gameId);
    if (!targetGame) {
      setInviteActionLoadingMap(prev => ({ ...prev, [actionKey]: false }));
      throw new Error('Game not found.');
    }

    if (authStatus === 'authenticated' && firebaseUser) {
      try {
        const participant: GameParticipant = {
          userId: firebaseUser.uid,
          name: currentUser.name,
          username: currentUser.username || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'player'),
          avatar: currentUser.avatar,
          skill: currentUser.skills[targetGame.sport] || targetGame.skillLevel || 'Intermediate',
          paymentStatus: 'Paid',
          paidAmountKWD: targetGame.pricePerPlayerKWD,
          joinedAt: new Date().toISOString(),
          paymentMethod: 'KNET',
          attendanceConfirmed: false
        };

        const updatedGame = await acceptGameInviteInFirestore(gameId, participant);

        // Update games state
        setFirestoreGames(prev => prev.map(g => g.id === gameId ? updatedGame : g));

        // Remove from incoming invites list
        setFirestoreIncomingInvites(prev => prev.filter(inv => inv.gameId !== gameId));

        if (selectedGameForDetail && selectedGameForDetail.id === gameId) {
          setSelectedGameForDetail(updatedGame);
        }

        try {
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
        } catch (e) {}
      } catch (err: any) {
        console.error('Failed to accept game invite in Firestore:', err);
        throw err;
      } finally {
        setInviteActionLoadingMap(prev => ({ ...prev, [actionKey]: false }));
      }
    } else {
      // Demo Mode
      try {
        await joinGame(gameId, 'KNET');
        setDemoIncomingInvites(prev => prev.filter(inv => inv.gameId !== gameId));
      } finally {
        setInviteActionLoadingMap(prev => ({ ...prev, [actionKey]: false }));
      }
    }
  };

  // Invitee: Decline game invite
  const declineGameInvite = async (gameId: string): Promise<void> => {
    const currentUid = authStatus === 'authenticated' && firebaseUser ? firebaseUser.uid : currentUser.id;
    const actionKey = `${gameId}_${currentUid}`;
    if (inviteActionLoadingMap[actionKey]) return;

    setInviteActionLoadingMap(prev => ({ ...prev, [actionKey]: true }));

    if (authStatus === 'authenticated') {
      try {
        await declineGameInviteInFirestore(gameId, currentUid);
        setFirestoreIncomingInvites(prev => prev.filter(inv => inv.gameId !== gameId));
      } catch (err: any) {
        console.error('Failed to decline game invite in Firestore:', err);
        throw err;
      } finally {
        setInviteActionLoadingMap(prev => ({ ...prev, [actionKey]: false }));
      }
    } else {
      // Demo Mode
      setDemoIncomingInvites(prev => prev.filter(inv => inv.gameId !== gameId));
      setInviteActionLoadingMap(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Confirm attendance (Reliability system)
  const confirmAttendance = (gameId: string, attended: boolean) => {
    setGames(prev =>
      prev.map(g => {
        if (g.id === gameId) {
          return {
            ...g,
            participants: g.participants.map(p =>
              p.userId === currentUser.id ? { ...p, attendanceConfirmed: attended } : p
            )
          };
        }
        return g;
      })
    );

    // If attended, slightly boost attendance rate up to 100, if not, decrease slightly
    setCurrentUser(prev => {
      const newRate = attended 
        ? Math.min(100, Math.round(prev.attendanceRate * 0.98 + 2))
        : Math.max(70, Math.round(prev.attendanceRate - 5));
      return {
        ...prev,
        attendanceRate: newRate
      };
    });
  };

  // Cancel game (organizer)
  const cancelGame = async (gameId: string, reason?: string) => {
    const target = (myGames && myGames.find(g => g.id === gameId)) || games.find(g => g.id === gameId);
    if (!target) {
      throw new Error('Game not found.');
    }

    const effectiveUserId = (firebaseUser && !isDemoActive) ? firebaseUser.uid : (currentUser.uid || currentUser.id);
    const organizerUid = target.organizer?.id || (target as any).organizerId;
    if (organizerUid !== effectiveUserId) {
      throw new Error('Only the organizer can cancel this game.');
    }

    if (target.status === 'Cancelled') {
      throw new Error('This game is already cancelled.');
    }

    if (authStatus === 'authenticated' && !isDemoActive && firebaseUser) {
      try {
        const cancelled = await cancelGameInFirestore(gameId, firebaseUser.uid, reason);
        setFirestoreGames(prev => prev.map(g => g.id === gameId ? cancelled : g));
        setMyFirestoreGames(prev => prev.map(g => g.id === gameId ? cancelled : g));
        if (selectedGameForDetail && selectedGameForDetail.id === gameId) {
          setSelectedGameForDetail(cancelled);
        }
      } catch (err) {
        console.error('[AppContext] Failed to cancel game in Firestore:', err);
        throw err;
      }
    } else {
      const cancellationNotice = reason ? ` [Cancelled: ${reason}]` : ' [Cancelled]';
      const updatedDesc = target.description ? `${target.description}${cancellationNotice}` : cancellationNotice.trim();
      const cancelled: Game = {
        ...target,
        status: 'Cancelled',
        description: updatedDesc
      };
      setGames(prev =>
        prev.map(g => (g.id === gameId ? cancelled : g))
      );
      if (selectedGameForDetail && selectedGameForDetail.id === gameId) {
        setSelectedGameForDetail(cancelled);
      }
    }

    const notif: AppNotification = {
      id: 'notif-cancel-' + Date.now(),
      type: 'reminder',
      title: 'Game Cancelled',
      titleAr: 'تم إلغاء المباراة',
      message: `The match has been cancelled. Historical records and player rosters have been preserved.`,
      messageAr: `تم إلغاء المباراة بنجاح. تم حفظ سجلات اللاعبين والتاريخ.`,
      timestamp: 'Just now',
      read: false
    };
    setNotifications(prev => [notif, ...prev]);
  };

  const updateGame = async (gameId: string, updates: Partial<Game>) => {
    if (authStatus === 'authenticated' && !isDemoActive && firebaseUser) {
      try {
        const updated = await updateGameInFirestore(gameId, updates, firebaseUser.uid);
        setFirestoreGames(prev => prev.map(g => g.id === gameId ? updated : g));
        setMyFirestoreGames(prev => prev.map(g => g.id === gameId ? updated : g));
        if (selectedGameForDetail && selectedGameForDetail.id === gameId) {
          setSelectedGameForDetail(updated);
        }
      } catch (err) {
        console.error('[AppContext] Failed to update game in Firestore:', err);
        throw err;
      }
    } else {
      setGames(prev =>
        prev.map(g => (g.id === gameId ? { ...g, ...updates } : g))
      );
    }
  };

  const markNotificationRead = async (id: string) => {
    if (authStatus === 'authenticated' && !isDemoActive && firebaseUser?.uid) {
      setFirestoreNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      try {
        await markNotificationAsReadInFirestore(firebaseUser.uid, id);
      } catch (err) {
        console.error('[AppContext] Failed to mark notification read in Firestore:', err);
      }
    } else {
      setDemoNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    }
  };

  const markAllNotificationsRead = async () => {
    if (authStatus === 'authenticated' && !isDemoActive && firebaseUser?.uid) {
      setFirestoreNotifications(prev => prev.map(n => ({ ...n, read: true })));
      try {
        await markAllNotificationsAsReadInFirestore(firebaseUser.uid);
      } catch (err) {
        console.error('[AppContext] Failed to mark all notifications read in Firestore:', err);
      }
    } else {
      setDemoNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const isPlayerBlocked = (userId: string): boolean => {
    if (!userId) return false;
    return blockedUserIds.has(userId);
  };

  const isBlockActionLoading = (userId: string): boolean => {
    return Boolean(blockActionLoadingMap[userId]);
  };

  const blockPlayer = async (blockedUserId: string): Promise<void> => {
    if (!blockedUserId || blockActionLoadingMap[blockedUserId]) return;
    setBlockActionLoadingMap(prev => ({ ...prev, [blockedUserId]: true }));

    try {
      if (authStatus === 'authenticated') {
        await blockPlayerInFirestore(blockedUserId);
      } else {
        // Demo Mode: isolated local state, no Firestore writes
        setDemoBlockedUserIds(prev => new Set(prev).add(blockedUserId));
        // Remove from following
        setDemoFollowingIds(prev => {
          const next = new Set(prev);
          next.delete(blockedUserId);
          return next;
        });
        // Remove from friends
        setDemoFriendIds(prev => {
          const next = new Set(prev);
          next.delete(blockedUserId);
          return next;
        });
        // Remove from incoming requests
        setDemoIncomingRequests(prev => prev.filter(r => r.requesterId !== blockedUserId));
        // Remove from outgoing requests
        setDemoOutgoingRequests(prev => {
          const next = new Set(prev);
          next.delete(blockedUserId);
          return next;
        });
      }

      // If viewing the blocked user's profile, close it
      if (selectedPlayerProfile && (selectedPlayerProfile.id === blockedUserId || selectedPlayerProfile.uid === blockedUserId)) {
        setSelectedPlayerProfile(null);
      }
    } catch (err) {
      console.error('[AppContext] Failed to block player:', err);
      throw err;
    } finally {
      setBlockActionLoadingMap(prev => ({ ...prev, [blockedUserId]: false }));
    }
  };

  const unblockPlayer = async (blockedUserId: string): Promise<void> => {
    if (!blockedUserId || blockActionLoadingMap[blockedUserId]) return;
    setBlockActionLoadingMap(prev => ({ ...prev, [blockedUserId]: true }));

    try {
      if (authStatus === 'authenticated') {
        await unblockPlayerInFirestore(blockedUserId);
      } else {
        // Demo Mode
        setDemoBlockedUserIds(prev => {
          const next = new Set(prev);
          next.delete(blockedUserId);
          return next;
        });
      }
    } catch (err) {
      console.error('[AppContext] Failed to unblock player:', err);
      throw err;
    } finally {
      setBlockActionLoadingMap(prev => ({ ...prev, [blockedUserId]: false }));
    }
  };

  const submitReport = async (report: {
    reportedUserId?: string;
    reportedGameId?: string;
    reason: ReportReason;
    details?: string;
  }): Promise<void> => {
    if (authStatus === 'authenticated') {
      try {
        await createReportInFirestore(report);
      } catch (err) {
        console.error('[AppContext] Failed to submit report to Firestore:', err);
        throw err;
      }
    } else {
      // Demo Mode: Mock report saved locally, never written to Firestore
      const newReport: ReportItem = {
        id: 'rep-demo-' + Date.now(),
        targetId: report.reportedUserId || report.reportedGameId || 'unknown',
        targetType: report.reportedUserId ? 'user' : 'game',
        reason: report.reason + (report.details ? `: ${report.details}` : ''),
        timestamp: 'Just now',
        resolved: false
      };
      setReports(prev => [newReport, ...prev]);
    }
  };

  const reportItem = (id: string, type: 'game' | 'user', reason: string) => {
    const newReport: ReportItem = {
      id: 'rep-' + Date.now(),
      targetId: id,
      targetType: type,
      reason,
      timestamp: 'Just now',
      resolved: false
    };
    setReports(prev => [newReport, ...prev]);

    const notif: AppNotification = {
      id: 'notif-report-' + Date.now(),
      type: 'reminder',
      title: 'Report Received',
      titleAr: 'تم استلام البلاغ',
      message: `Thank you for keeping La3ib safe. Our moderation team is reviewing ${type} #${id}.`,
      messageAr: `شكراً لمساعدتنا في الحفاظ على بيئة آمنة. فريق الإشراف يقوم بمراجعة البلاغ الآن.`,
      timestamp: 'Just now',
      read: false
    };
    setNotifications(prev => [notif, ...prev]);
  };

  // Moderation Backend Operations (review, resolve, dismiss, game cancel, refresh)
  const reviewModerationReport = async (reportId: string): Promise<void> => {
    if (authStatus === 'authenticated' && !isDemoActive) {
      try {
        await reviewReportInFirestore(reportId);
        // Refresh local audit logs
        const updatedLogs = await fetchModerationLogsFromFirestore(50);
        setModerationLogs(updatedLogs);
      } catch (err) {
        console.error('[AppContext] Failed to review report:', err);
        throw err;
      }
    } else {
      // Demo Mode: Mock state update
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'reviewing' as any } : r));
    }
  };

  const resolveModerationReport = async (
    reportId: string, 
    resolution: string, 
    reason?: string
  ): Promise<void> => {
    if (authStatus === 'authenticated' && !isDemoActive) {
      try {
        await resolveReportInFirestore(reportId, resolution, reason);
        const updatedLogs = await fetchModerationLogsFromFirestore(50);
        setModerationLogs(updatedLogs);
      } catch (err) {
        console.error('[AppContext] Failed to resolve report:', err);
        throw err;
      }
    } else {
      // Demo Mode
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, resolved: true } : r));
    }
  };

  const dismissModerationReport = async (
    reportId: string, 
    dismissReason?: string
  ): Promise<void> => {
    if (authStatus === 'authenticated' && !isDemoActive) {
      try {
        await dismissReportInFirestore(reportId, dismissReason);
        const updatedLogs = await fetchModerationLogsFromFirestore(50);
        setModerationLogs(updatedLogs);
      } catch (err) {
        console.error('[AppContext] Failed to dismiss report:', err);
        throw err;
      }
    } else {
      // Demo Mode
      setReports(prev => prev.filter(r => r.id !== reportId));
    }
  };

  const moderateGameCancellation = async (
    gameId: string, 
    reason: string, 
    reportId?: string
  ): Promise<void> => {
    if (authStatus === 'authenticated' && !isDemoActive) {
      try {
        const updatedGame = await moderateCancelGameInFirestore(gameId, reason, reportId);
        setFirestoreGames(prev => prev.map(g => g.id === gameId ? updatedGame : g));
        setMyFirestoreGames(prev => prev.map(g => g.id === gameId ? updatedGame : g));
        if (selectedGameForDetail && selectedGameForDetail.id === gameId) {
          setSelectedGameForDetail(updatedGame);
        }
        const updatedLogs = await fetchModerationLogsFromFirestore(50);
        setModerationLogs(updatedLogs);
      } catch (err) {
        console.error('[AppContext] Failed to moderate cancel game:', err);
        throw err;
      }
    } else {
      // Demo Mode
      cancelGame(gameId, `Moderation: ${reason}`);
    }
  };

  const refreshModerationQueue = async (): Promise<void> => {
    if (authStatus === 'authenticated' && !isDemoActive) {
      try {
        setIsModerationLoading(true);
        const [reportsData, logsData] = await Promise.all([
          fetchReportsFromFirestore({ limitCount: 50 }),
          fetchModerationLogsFromFirestore(50)
        ]);
        setFirestoreReports(reportsData);
        setModerationLogs(logsData);
      } catch (err) {
        console.warn('[AppContext] Failed to refresh moderation queue:', err);
      } finally {
        setIsModerationLoading(false);
      }
    }
  };

  const updateCurrentUserProfile = async (updates: Partial<UserProfile>) => {
    setCurrentUser(prev => ({ ...prev, ...updates }));

    if (authStatus === 'authenticated' && firebaseUser) {
      try {
        await updateUserProfileInFirestore(firebaseUser.uid, updates);
      } catch (err) {
        console.error('Failed to sync updated profile to Firestore:', err);
        throw err;
      }
    }
  };

  /**
   * Loads factual activity and participation statistics for a player.
   * If in Authenticated Mode, queries Firestore games (targeted query for organizer or participant).
   * If in Demo Mode or if Firestore query fails, calculates against local games store gracefully.
   */
  const loadPlayerActivity = async (userId: string): Promise<PlayerActivityStats> => {
    if (!userId) {
      return {
        gamesPlayed: 0,
        gamesHosted: 0,
        upcomingGames: 0,
        sportsPlayed: [],
        recentActivities: []
      };
    }

    if (authStatus === 'authenticated' && !isDemoActive && isFirebaseConfigured) {
      try {
        const stats = await getPlayerActivityFromFirestore(userId);
        return stats;
      } catch (err) {
        console.warn(`[AppContext] Falling back to client-cached games for user ${userId} stats:`, err);
        // Fallback gracefully without breaking the profile
        const combinedGames = [...games, ...myGames];
        return calculatePlayerActivityStats(userId, combinedGames);
      }
    } else {
      // Demo Mode: calculate strictly from demo games without touching Firestore
      const combinedGames = [...games, ...myGames];
      return calculatePlayerActivityStats(userId, combinedGames);
    }
  };

  /**
   * Payment Architecture (Step 1 - Provider-Agnostic Core)
   * Handles payment inspection, initialization, and simulation.
   * Isolated locally in Demo Mode; communicates with Firestore subcollection in Authenticated Mode.
   */
  const handleGetGamePayment = async (gameId: string, userId: string): Promise<GamePayment | null> => {
    if (!gameId || !userId) return null;
    if (authStatus === 'authenticated' && !isDemoActive && isFirebaseConfigured) {
      try {
        return await getGamePayment(gameId, userId);
      } catch (err) {
        console.error('[AppContext] Failed to get game payment from Firestore:', err);
        return null;
      }
    } else {
      return demoPayments[gameId]?.[userId] || null;
    }
  };

  const handleInitializeGamePayment = async (gameId: string, userId: string): Promise<GamePayment> => {
    if (!gameId || !userId) throw new Error('gameId and userId are required to initialize payment.');
    if (authStatus === 'authenticated' && !isDemoActive && isFirebaseConfigured) {
      return await initializeGamePayment(gameId, userId);
    } else {
      const existing = demoPayments[gameId]?.[userId];
      if (existing) return existing;

      const g = games.find(item => item.id === gameId) || myGames.find(item => item.id === gameId);
      const price = g ? (g.pricePerPlayerKWD ?? 0) : 0;
      const initialStatus: PaymentStatus = price > 0 ? 'unpaid' : 'paid';
      const organizerUid = g?.organizer?.id || '';

      const nowISO = new Date().toISOString();
      const newRecord: GamePayment = {
        id: userId,
        gameId,
        userId,
        organizerId: organizerUid,
        amountKWD: price,
        currency: 'KWD',
        status: initialStatus,
        createdAt: nowISO,
        updatedAt: nowISO
      };

      setDemoPayments(prev => ({
        ...prev,
        [gameId]: {
          ...(prev[gameId] || {}),
          [userId]: newRecord
        }
      }));

      return newRecord;
    }
  };

  const handleSimulateGamePayment = async (gameId: string, userId: string): Promise<GamePayment> => {
    if (!gameId || !userId) throw new Error('gameId and userId are required to simulate payment.');
    if (authStatus === 'authenticated' && !isDemoActive && isFirebaseConfigured) {
      return await simulateGamePayment(gameId, userId);
    } else {
      let current = demoPayments[gameId]?.[userId];
      if (!current) {
        current = await handleInitializeGamePayment(gameId, userId);
      }

      if (current.status === 'paid') return current;
      if (current.status === 'refunded') {
        throw new Error('Cannot pay for a refunded payment.');
      }

      const nowISO = new Date().toISOString();
      const simTxnId = 'sim_txn_' + Date.now();
      const updated: GamePayment = {
        ...current,
        status: 'paid',
        paidAt: nowISO,
        updatedAt: nowISO,
        provider: 'simulator',
        providerPaymentId: 'sim_pay_' + userId.slice(0, 5),
        providerTransactionId: simTxnId
      };

      setDemoPayments(prev => ({
        ...prev,
        [gameId]: {
          ...(prev[gameId] || {}),
          [userId]: updated
        }
      }));

      return updated;
    }
  };

  const handleSimulateGameRefund = async (gameId: string, userId: string): Promise<GamePayment> => {
    if (!gameId || !userId) throw new Error('gameId and userId are required to simulate refund.');
    if (authStatus === 'authenticated' && !isDemoActive && isFirebaseConfigured) {
      return await simulateGameRefund(gameId, userId);
    } else {
      const current = demoPayments[gameId]?.[userId];
      if (!current) {
        throw new Error('Payment record does not exist to refund.');
      }

      if (!canTransitionPayment(current.status, 'refunded')) {
        throw new Error(`Invalid payment transition: cannot refund a payment in status "${current.status}".`);
      }

      const nowISO = new Date().toISOString();
      const updated: GamePayment = {
        ...current,
        status: 'refunded',
        refundedAt: nowISO,
        updatedAt: nowISO
      };

      setDemoPayments(prev => ({
        ...prev,
        [gameId]: {
          ...(prev[gameId] || {}),
          [userId]: updated
        }
      }));

      return updated;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        players,
        isPlayersLoading,
        playersError,
        refetchPlayers,
        games,
        myGames,
        isGamesLoading,
        isMyGamesLoading,
        gamesError,
        myGamesError,
        refetchGames,
        courts,
        myBookings,
        notifications,
        chats,
        reports,
        authStatus,
        firebaseUser,
        isDemoActive,
        authModalOpen,
        setAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogleAuth,
        logout,
        continueAsDemo,
        sendPasswordResetEmailAction,
        deleteAccountAction,
        reauthenticateAction,
        checkUsername,
        activeTab,
        setActiveTab,
        selectedArea,
        setSelectedArea,
        selectedSport,
        setSelectedSport,
        language,
        setLanguage,
        t,
        searchQuery,
        setSearchQuery,
        bookingModalOpen,
        setBookingModalOpen,
        selectedCourtForBooking,
        setSelectedCourtForBooking,
        createGameModalOpen,
        setCreateGameModalOpen,
        createGamePrefill,
        setCreateGamePrefill,
        selectedGameForDetail,
        setSelectedGameForDetail,
        selectedGameForJoin,
        setSelectedGameForJoin,
        selectedPlayerProfile,
        setSelectedPlayerProfile,
        notificationsModalOpen,
        setNotificationsModalOpen,
        safetyModalOpen,
        setSafetyModalOpen,
        adminModalOpen,
        setAdminModalOpen,
        bookCourtViaLi3ib,
        postBookingAsGame,
        createGame,
        joinGame,
        leaveGame,
        sendChatMessage,
        followingUserIds,
        isFollowingUser,
        isFollowActionLoading,
        followPlayer,
        unfollowPlayer,
        toggleFollowPlayer,
        friendIds,
        incomingFriendRequests,
        outgoingFriendRequestIds,
        friendsList,
        isFriendActionLoading,
        getFriendshipStatus,
        sendFriendRequest,
        cancelFriendRequest,
        acceptFriendRequest,
        declineFriendRequest,
        incomingGameInvites,
        isGameInviteLoading,
        sendGameInvite,
        cancelGameInvite,
        acceptGameInvite,
        declineGameInvite,
        getGameInvitesForGame,
        blockedUserIds,
        blockedPlayersList,
        isPlayerBlocked,
        isBlockActionLoading,
        blockPlayer,
        unblockPlayer,
        submitReport,
        getGamePayment: handleGetGamePayment,
        initializeGamePayment: handleInitializeGamePayment,
        simulateGamePayment: handleSimulateGamePayment,
        simulateGameRefund: handleSimulateGameRefund,
        confirmAttendance,
        cancelGame,
        updateGame,
        markNotificationRead,
        markAllNotificationsRead,
        reportItem,
        updateCurrentUserProfile,
        loadPlayerActivity,
        // Admin & Moderation Backend
        moderationReports: firestoreReports,
        isModerationLoading,
        moderationLogs,
        reviewModerationReport,
        resolveModerationReport,
        dismissModerationReport,
        moderateGameCancellation,
        refreshModerationQueue
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
