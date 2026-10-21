export type SportType = 
  | 'Football' 
  | 'Padel' 
  | 'Basketball' 
  | 'Volleyball' 
  | 'Tennis' 
  | 'Badminton' 
  | 'Other';

export type SkillLevel = 
  | 'Beginner' 
  | 'Casual' 
  | 'Intermediate' 
  | 'Advanced' 
  | 'Competitive' 
  | 'Any level';

export type GenderPreference = 'Everyone' | 'Men' | 'Women';

export type GameVisibility = 'Public' | 'Private' | 'Invite only';

export type GameStatus = 'Open' | 'Almost Full' | 'Full' | 'Completed' | 'Cancelled';

export type PaymentStatus = 
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'refunded'
  | 'failed'
  | 'cancelled'
  | 'Paid'
  | 'Pending'
  | 'Refunded'
  | 'Failed';

export type KuwaitArea = 
  | 'Kuwait City' 
  | 'Salmiya' 
  | 'Shuwaikh' 
  | 'Hawalli' 
  | 'Mishref' 
  | 'Yarmouk' 
  | 'Jabriya' 
  | 'Sabhan' 
  | 'Mahboula' 
  | 'Abu Hasaniya' 
  | 'Jahra' 
  | 'Ardhiya';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'demo';

export interface PrivateAccountData {
  email: string;
  phone?: string;
  uid: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  uid?: string;
  name: string;
  nameAr?: string;
  username: string;
  email?: string;
  avatar: string;
  photoURL?: string;
  area: KuwaitArea;
  bio: string;
  favoriteSports: SportType[];
  skills: { [key in SportType]?: SkillLevel };
  gamesPlayed: number;
  gamesHosted: number;
  attendanceRate: number; // e.g. 98 for 98%
  isOrganizer?: boolean;
  canOrganize?: boolean;
  isAdmin?: boolean;
  isFollowing?: boolean;
  isDemoUser?: boolean;
  followerCount?: number;
  followingCount?: number;
  friendCount?: number;
  age?: number;
  privacy: {
    showAge: boolean;
    showPhone: boolean;
    allowDirectInvites: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Neutral default avatar silhouette SVG for guest accounts with no human face.
 */
export const DEFAULT_GUEST_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Crect width='128' height='128' fill='%23262626'/%3E%3Ccircle cx='64' cy='46' r='22' fill='%23737373'/%3E%3Cpath d='M28 108c0-19.882 16.118-36 36-36s36 16.118 36 36' fill='%23737373'/%3E%3C/svg%3E";

/**
 * Resolves an avatar URL for any player or profile.
 * Ensures guest accounts (unauthenticated, guest ID, or guest username) always display a neutral
 * default profile picture with no human face.
 * Real registered/authenticated users preserve their Google photo, custom uploaded avatar, or profile photo.
 */
export const resolvePlayerAvatar = (user?: Partial<UserProfile> | null): string => {
  if (!user) return DEFAULT_GUEST_AVATAR;
  const isGuest = user.id === 'guest' || user.username === 'guest';
  if (isGuest) {
    if (!user.avatar || user.avatar.includes('photo-1535713875002') || user.avatar.includes('photo-1534528741775')) {
      return DEFAULT_GUEST_AVATAR;
    }
    return user.avatar;
  }
  return user.avatar || user.photoURL || DEFAULT_GUEST_AVATAR;
};

/**
 * Returns today's local calendar date in 'YYYY-MM-DD' format.
 * Uses local getFullYear(), getMonth(), and getDate() to avoid timezone/UTC conversion
 * issues (e.g. toISOString()) that could shift the date by +/- 1 day.
 */
export const getTodayLocalDate = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface CourtBooking {
  id: string;
  courtId: string;
  courtName: string;
  sport: SportType;
  area: KuwaitArea;
  address: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "20:00"
  endTime: string; // e.g. "21:30"
  totalCostKWD: number;
  bookingRef: string;
  bookedAt: string;
  isIndoor: boolean;
  courtImage: string;
  hasBeenPostedAsGame?: boolean;
}

export interface GameParticipant {
  userId: string;
  name: string;
  username: string;
  avatar: string;
  skill: SkillLevel;
  paymentStatus: PaymentStatus;
  paidAmountKWD: number;
  joinedAt: string;
  paymentMethod?: 'KNET' | 'Apple Pay' | 'Credit Card';
  attendanceConfirmed?: boolean;
}

export interface ChatMessage {
  id: string;
  gameId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderPhotoURL?: string;
  text: string;
  timestamp: string;
  createdAtISO?: string;
  isAnnouncement?: boolean;
}

export type CostSharingMethod = 'cash' | 'wamd' | 'request_link';

export interface GameCostSharing {
  enabled: boolean;
  methods?: CostSharingMethod[];
  method?: CostSharingMethod; // Preserved for backwards compatibility with legacy games
  estimatedShare?: number;
  currency?: string;
}

/**
 * Normalizes cost-sharing methods from a game, supporting both multi-method games
 * and legacy single-method games without destructive migrations.
 */
export function getCostSharingMethods(costSharing?: GameCostSharing | null): CostSharingMethod[] {
  if (!costSharing || !costSharing.enabled) return [];
  if (Array.isArray(costSharing.methods) && costSharing.methods.length > 0) {
    return costSharing.methods;
  }
  if (costSharing.method) {
    return [costSharing.method];
  }
  return [];
}

/**
 * Checks whether a specific cost-sharing method is enabled on a game.
 */
export function isCostSharingMethodSelected(
  costSharing: GameCostSharing | null | undefined, 
  method: CostSharingMethod
): boolean {
  return getCostSharingMethods(costSharing).includes(method);
}

export type PaymentLinkRequestStatus = 'pending' | 'handled';

export interface PaymentLinkRequest {
  id: string; // requesterId
  gameId: string;
  gameTitle?: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar?: string;
  hostId: string;
  status: PaymentLinkRequestStatus;
  createdAt: string;
  handledAt?: string;
  paymentLinkUrl?: string;
}

export interface Game {
  id: string;
  title: string;
  sport: SportType;
  date: string; // e.g. "2026-09-25"
  startTime: string; // "20:00"
  endTime: string; // "21:30"
  courtName: string;
  area: KuwaitArea;
  address: string;
  coordinates: { x: number; y: number }; // Relative position on Kuwait map (0 to 100)
  isIndoor: boolean;
  maxPlayers: number;
  organizer: UserProfile;
  participants: GameParticipant[];
  participantIds?: string[];
  totalCourtCostKWD: number;
  pricePerPlayerKWD: number;
  costSharing?: GameCostSharing;
  skillLevel: SkillLevel;
  gender: GenderPreference;
  visibility: GameVisibility;
  status: GameStatus;
  moderated?: boolean;
  moderatedAt?: string;
  moderatedBy?: string;
  moderationReason?: string;
  description?: string;
  linkedBookingId?: string;
  createdAt: string;
  cancellationPolicy: string;
}

export interface Court {
  id: string;
  name: string;
  nameAr: string;
  sport: SportType;
  area: KuwaitArea;
  address: string;
  rating: number;
  reviewsCount: number;
  pricePerHourKWD: number;
  isIndoor: boolean;
  image: string;
  amenities: string[];
  coordinates: { x: number; y: number };
  availableSlots: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    priceKWD: number;
  }[];
}

export type NotificationType = 
  | 'game_join'
  | 'game_leave'
  | 'game_full'
  | 'game_almost_full'
  | 'chat_message'
  | 'friend_request'
  | 'friend_request_accepted'
  | 'game_invite'
  | 'payment_link_request'
  | 'payment_link_provided';

export type DemoNotificationType = 
  | NotificationType
  | 'invite'
  | 'joined'
  | 'payment'
  | 'reminder'
  | 'booking'
  | 'chat'
  | 'announcement';

export interface AppNotification {
  id: string;
  userId?: string;
  type: DemoNotificationType;
  title: string;
  titleAr?: string;
  body?: string;
  message?: string;
  messageAr?: string;
  timestamp?: string;
  read: boolean;
  gameId?: string;
  actorId?: string;
  actorName?: string;
  actorPhotoURL?: string;
  createdAt?: any;
  createdAtISO?: string;
  actionUrl?: string;
}

export type GameInviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface GameInvite {
  id: string; // inviteeId
  gameId: string;
  inviterId: string;
  inviteeId: string;
  status: GameInviteStatus;
  createdAt: string;
  respondedAt?: string;
  // Denormalized preview fields for display without requiring multiple lookups
  gameTitle?: string;
  gameSport?: SportType;
  gameDate?: string;
  gameStartTime?: string;
  gameCourtName?: string;
  gameArea?: KuwaitArea;
  gamePricePerPlayerKWD?: number;
  inviterName?: string;
  inviterAvatar?: string;
  inviteeName?: string;
  inviteeAvatar?: string;
}

export interface FriendRelationship {
  userId: string;
  createdAt: string;
}

export type ReportReason = 
  | 'spam'
  | 'harassment'
  | 'inappropriate_behavior'
  | 'fake_profile'
  | 'scam_or_fraud'
  | 'unsafe_behavior'
  | 'other';

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export interface ReportDocument {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  reportedGameId?: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt?: string;
  moderatorId?: string;
  resolution?: string;
  dismissalReason?: string;
  resolvedAt?: string;
  dismissedAt?: string;
  reviewedAt?: string;
}

export type ModerationTargetType = 'user' | 'game' | 'report';

export type ModerationAction = 
  | 'review_report'
  | 'resolve_report'
  | 'dismiss_report'
  | 'cancel_game'
  | 'disable_game';

export interface ModerationLogEntry {
  id: string;
  moderatorId: string;
  action: ModerationAction;
  targetType: ModerationTargetType;
  targetId: string;
  reportId?: string;
  reason?: string;
  resolution?: string;
  createdAt: string;
  createdAtISO: string;
}

export interface BlockedPlayerRecord {
  id?: string;
  userId: string;
  blockedUserId: string;
  createdAt: string;
}

export interface FriendRequest {
  id?: string;
  requesterId: string;
  recipientId: string;
  createdAt: string;
  status: 'pending';
  requesterName?: string;
  requesterUsername?: string;
  requesterAvatar?: string;
  requesterArea?: KuwaitArea;
  requesterSports?: SportType[];
  requesterSkills?: { [key in SportType]?: SkillLevel };
}

export type FriendshipStatus = 'none' | 'outgoing_request' | 'incoming_request' | 'friends';

export interface ReportItem {
  id: string;
  targetId: string;
  targetType: 'game' | 'user';
  reason: string;
  timestamp: string;
  resolved: boolean;
}

export interface PlayerActivityItem {
  gameId: string;
  sport: SportType;
  role: 'hosted' | 'played';
  date: string;
  startTime?: string;
  courtName?: string;
  area?: KuwaitArea;
  title: string;
}

export interface PlayerActivityStats {
  gamesPlayed: number;
  gamesHosted: number;
  upcomingGames: number;
  sportsPlayed: SportType[];
  recentActivities: PlayerActivityItem[];
}

export interface GamePayment {
  id: string; // userId is the document ID under games/{gameId}/payments/{userId}
  gameId: string;
  userId: string;
  organizerId: string;

  amountKWD: number;
  currency: 'KWD';

  status: PaymentStatus;

  createdAt: string;
  updatedAt?: string;
  paidAt?: string;
  refundedAt?: string;

  // Reserved for future payment provider integration.
  provider?: string;
  providerPaymentId?: string;
  providerTransactionId?: string;
}

