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

export type ThemePreference = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

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
  sports?: SportType[];
  skills: { [key in SportType]?: SkillLevel };
  gamesPlayed: number;
  gamesHosted: number;
  attendanceRate: number; // Retained for backend compatibility, purged from UI
  rating?: number;
  ratingAverage?: number;
  ratingCount?: number;
  bannerUrl?: string;
  reliabilityScore?: number;
  mvpCount?: number;
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
    isPrivateProfile?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
  onboardingCompleted?: boolean;
  onboardingVersion?: number;
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: string;
  banExpiresAt?: string | null;
  bannedBy?: string;
}

export interface PlayerRating {
  id: string; // `${gameId}_${raterId}_${targetUserId}`
  gameId: string;
  raterId: string;
  targetUserId: string;
  rating: number; // 1 to 5
  sport?: SportType;
  createdAt: string;
}

export type PublicPlayerProfile = Omit<UserProfile, 'gamesHosted' | 'attendanceRate'> & {
  gamesHosted?: number;
  attendanceRate?: number;
};

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
  coordinates?: { x: number; y: number };
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
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
  wamdPhoneNumber?: string; // Host-provided Kuwait mobile number for WAMD
}

/**
 * Validates Kuwait mobile numbers:
 * Accepts standard 8-digit mobile numbers starting with 4, 5, 6, or 9,
 * with or without +965 / 00965 / 965 prefix, spaces, or hyphens.
 */
export function isValidKuwaitMobile(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return /^(?:\+?965|00965)?[4569]\d{7}$/.test(cleaned);
}

/**
 * Standardizes a valid Kuwait mobile number into +965 XXXXXXXX format.
 */
export function formatKuwaitMobile(phone: string | null | undefined): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  const match = cleaned.match(/^(?:\+?965|00965)?([4569]\d{7})$/);
  if (match) {
    return `+965 ${match[1]}`;
  }
  return phone.trim();
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
  area: KuwaitArea | string;
  address: string;
  coordinates: { x: number; y: number }; // Relative position on Kuwait map (0 to 100)
  latitude?: number; // WGS84 Latitude (Kuwait ~28.5 to ~30.1)
  longitude?: number; // WGS84 Longitude (Kuwait ~46.5 to ~48.5)
  locationLabel?: string;
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
  bookingRef?: string;
  bookingConfirmationUrl?: string;
  bookingStoragePath?: string;
  createdAt: string;
  cancellationPolicy: string;
}

export interface Court {
  id: string;
  name: string;
  nameAr: string;
  sport: SportType;
  area: KuwaitArea | string;
  address: string;
  rating: number;
  reviewsCount: number;
  pricePerHourKWD: number;
  isIndoor: boolean;
  image: string;
  amenities: string[];
  coordinates: { x: number; y: number };
  latitude?: number;
  longitude?: number;
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
  | 'disable_game'
  | 'ban_user'
  | 'unban_user'
  | 'delete_user'
  | 'edit_game'
  | 'moderate_profile'
  | 'restrict_organizer'
  | 'restore_organizer';

export interface ModerationLogEntry {
  id: string;
  moderatorId: string;
  action: ModerationAction;
  targetType: ModerationTargetType;
  targetId: string;
  reportId?: string;
  reason?: string;
  resolution?: string;
  modifiedFields?: string[];
  details?: string;
  createdAt: string;
  createdAtISO: string;
}

export interface AdminGameEditInput {
  title?: string;
  description?: string;
  sport?: SportType;
  skillLevel?: SkillLevel;
  date?: string;
  startTime?: string;
  endTime?: string;
  courtName?: string;
  area?: KuwaitArea | string;
  address?: string;
  latitude?: number;
  longitude?: number;
  maxPlayers?: number;
  status?: GameStatus;
  visibility?: GameVisibility;
  costSharing?: GameCostSharing;
  totalCourtCostKWD?: number;
  pricePerPlayerKWD?: number;
}

export interface AdminProfileModerationInput {
  name?: string;
  nameAr?: string;
  bio?: string;
  avatar?: string;
  favoriteSports?: SportType[];
  skills?: { [key in SportType]?: SkillLevel };
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

/**
 * Clean localization helpers ensuring pure English in English mode and pure Arabic in Arabic mode.
 */
export function getSportLabel(sport: SportType | string, lang: 'en' | 'ar'): string {
  if (lang === 'ar') {
    switch (sport) {
      case 'Football': return 'كرة القدم';
      case 'Padel': return 'بادل';
      case 'Basketball': return 'كرة السلة';
      case 'Volleyball': return 'كرة الطائرة';
      case 'Tennis': return 'تنس';
      case 'Badminton': return 'ريشة طائرة';
      case 'Other': return 'أخرى';
      default: return sport;
    }
  }
  return sport;
}

export function getSkillLabel(skill: SkillLevel | string, lang: 'en' | 'ar'): string {
  if (lang === 'ar') {
    switch (skill) {
      case 'Beginner': return 'مبتدئ';
      case 'Casual': return 'ودي / ترويحي';
      case 'Intermediate': return 'متوسط';
      case 'Advanced': return 'متقدم';
      case 'Competitive': return 'تنافسي عالي';
      case 'Any level': return 'جميع المستويات';
      case 'Any': return 'جميع المستويات';
      default: return skill;
    }
  }
  return skill;
}

export function getKuwaitAreaLabel(area: string, lang: 'en' | 'ar'): string {
  if (lang === 'ar') {
    switch (area) {
      case 'Kuwait City': return 'مدينة الكويت';
      case 'Salmiya': return 'السالمية';
      case 'Shuwaikh': return 'الشويخ';
      case 'Hawalli': return 'حولي';
      case 'Mishref': return 'مشرف';
      case 'Yarmouk': return 'اليرموك';
      case 'Jabriya': return 'الجابرية';
      case 'Sabhan': return 'صبحان';
      case 'Mahboula': return 'المهبولة';
      case 'Abu Hasaniya': return 'أبو الحصانية';
      case 'Jahra': return 'الجهراء';
      case 'Ardhiya': return 'العارضية';
      case 'All Kuwait': return 'كل الكويت';
      case 'All Areas': return 'كل المناطق';
      default: return area;
    }
  }
  return area;
}

/**
 * Returns a standardized display label for a player's 5-star rating.
 * Displays "★ 4.8/5 (12)" or "Not rated yet" / "لم يتم التقييم بعد".
 */
export function formatPlayerRating(
  user?: { rating?: number; ratingAverage?: number; ratingCount?: number } | null,
  lang: 'en' | 'ar' = 'en'
): { scoreText: string; countText: string; isRated: boolean; fullLabel: string } {
  const avg = user?.ratingAverage ?? user?.rating;
  const count = user?.ratingCount ?? (avg ? 1 : 0);

  if (typeof avg !== 'number' || isNaN(avg) || count <= 0) {
    const unratedText = lang === 'ar' ? 'لم يتم التقييم بعد' : 'Not rated yet';
    return {
      scoreText: '—',
      countText: '',
      isRated: false,
      fullLabel: unratedText
    };
  }

  const scoreFormatted = avg.toFixed(1);
  const countFormatted = lang === 'ar' ? `(${count} تقييم)` : `(${count})`;
  return {
    scoreText: scoreFormatted,
    countText: countFormatted,
    isRated: true,
    fullLabel: `★ ${scoreFormatted}/5 ${countFormatted}`.trim()
  };
}

/**
 * Universal Booking Confirmation extraction schema
 */
export interface ExtractedBookingData {
  venueName?: string | null;
  courtName?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  area?: string | null;
  address?: string | null;
  sport?: SportType | null;
  totalPriceKWD?: number | null;
  notes?: string | null;
  storagePath?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
}

/**
 * Formats a 24-hour time string (e.g. "20:00") into friendly 12-hour AM/PM format (e.g. "8:00 PM" / "8:00 م").
 */
export function formatTime12Hour(time24?: string | null, lang: 'en' | 'ar' = 'en'): string {
  if (!time24 || typeof time24 !== 'string' || !time24.includes(':')) return time24 || '';
  const [hStr, mStr] = time24.split(':');
  let hour = parseInt(hStr, 10);
  if (isNaN(hour)) return time24;
  const rawMinute = mStr ? mStr.replace(/\D/g, '') : '00';
  const minute = rawMinute.slice(0, 2).padStart(2, '0');
  const isPM = hour >= 12;
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  const period = lang === 'ar' ? (isPM ? 'م' : 'ص') : (isPM ? 'PM' : 'AM');
  return `${hour}:${minute} ${period}`;
}

/**
 * Formats a start and end time pair into 12-hour format: "8:00 PM – 9:30 PM" (or "8:00 م – 9:30 م" in Arabic).
 */
export function formatTimeRange12Hour(
  startTime?: string | null,
  endTime?: string | null,
  lang: 'en' | 'ar' = 'en'
): string {
  if (!startTime && !endTime) return '';
  if (!endTime) return formatTime12Hour(startTime, lang);
  if (!startTime) return formatTime12Hour(endTime, lang);
  return `${formatTime12Hour(startTime, lang)} – ${formatTime12Hour(endTime, lang)}`;
}


