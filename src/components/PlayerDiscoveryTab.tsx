import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { UserProfile, SportType, SkillLevel, KuwaitArea, resolvePlayerAvatar } from '../types';
import { 
  Search, 
  MapPin, 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Filter, 
  User, 
  ChevronRight, 
  Activity,
  RotateCcw,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Check,
  Clock,
  Loader2,
  Inbox,
  Heart,
  Mail,
  Calendar
} from 'lucide-react';

const SPORTS: (SportType | 'All')[] = [
  'All',
  'Football',
  'Padel',
  'Basketball',
  'Volleyball',
  'Tennis',
  'Badminton',
  'Other'
];

const SKILL_LEVELS: (SkillLevel | 'Any')[] = [
  'Any',
  'Beginner',
  'Casual',
  'Intermediate',
  'Advanced',
  'Competitive',
  'Any level'
];

const KUWAIT_AREAS: (KuwaitArea | 'All')[] = [
  'All',
  'Kuwait City',
  'Salmiya',
  'Shuwaikh',
  'Hawalli',
  'Mishref',
  'Yarmouk',
  'Jabriya',
  'Sabhan',
  'Mahboula',
  'Abu Hasaniya',
  'Jahra',
  'Ardhiya'
];

export const PlayerDiscoveryTab: React.FC = () => {
  const { 
    players, 
    currentUser, 
    blockedUserIds,
    setSelectedPlayerProfile,
    isPlayersLoading,
    playersError,
    refetchPlayers,
    isFollowingUser,
    isFollowActionLoading,
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
    acceptGameInvite,
    declineGameInvite,
    setSelectedGameForDetail,
    games,
    myGames,
    t 
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'discover' | 'friends' | 'requests' | 'invites'>('discover');
  const [selectedSport, setSelectedSport] = useState<SportType | 'All'>('All');
  const [selectedSkill, setSelectedSkill] = useState<SkillLevel | 'Any'>('Any');
  const [selectedArea, setSelectedArea] = useState<KuwaitArea | 'All'>('All');
  const [searchFilter, setSearchFilter] = useState('');

  // Exclude current user and blocked players from discovery list
  const otherPlayers = useMemo(() => {
    return players.filter(p => {
      if (p.id === currentUser.id || (p.uid && p.uid === currentUser.uid)) return false;
      if (blockedUserIds.has(p.id) || (p.uid && blockedUserIds.has(p.uid))) return false;
      return true;
    });
  }, [players, currentUser.id, currentUser.uid, blockedUserIds]);

  // Client-side search and composable filters
  const filteredPlayers = useMemo(() => {
    return otherPlayers.filter(player => {
      // 1. Sport filter
      if (selectedSport !== 'All' && !player.favoriteSports?.includes(selectedSport)) {
        return false;
      }

      // 2. Skill filter
      if (selectedSkill !== 'Any') {
        if (selectedSport !== 'All') {
          const playerSkillInSport = player.skills?.[selectedSport];
          if (playerSkillInSport !== selectedSkill) {
            return false;
          }
        } else {
          const hasMatchingSkill = Object.values(player.skills || {}).some(
            skill => skill === selectedSkill
          );
          if (!hasMatchingSkill) {
            return false;
          }
        }
      }

      // 3. Area filter
      if (selectedArea !== 'All' && player.area !== selectedArea) {
        return false;
      }

      // 4. Client-side Search (Name, Area, Favorite Sports, Bio)
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase().trim();
        const matchName = player.name?.toLowerCase().includes(query) ?? false;
        const matchUsername = player.username?.toLowerCase().includes(query) ?? false;
        const matchArea = player.area?.toLowerCase().includes(query) ?? false;
        const matchSports = player.favoriteSports?.some(s => s.toLowerCase().includes(query)) ?? false;
        const matchBio = player.bio?.toLowerCase().includes(query) ?? false;

        if (!matchName && !matchUsername && !matchArea && !matchSports && !matchBio) {
          return false;
        }
      }

      return true;
    });
  }, [otherPlayers, selectedSport, selectedSkill, selectedArea, searchFilter]);

  const hasActiveFilters = selectedSport !== 'All' || selectedSkill !== 'Any' || selectedArea !== 'All' || searchFilter.trim() !== '';

  const handleResetFilters = () => {
    setSelectedSport('All');
    setSelectedSkill('Any');
    setSelectedArea('All');
    setSearchFilter('');
  };

  const getSportIcon = (sport: SportType) => {
    switch (sport) {
      case 'Football': return '⚽';
      case 'Padel': return '🎾';
      case 'Basketball': return '🏀';
      case 'Volleyball': return '🏐';
      case 'Tennis': return '🎾';
      case 'Badminton': return '🏸';
      default: return '🏆';
    }
  };

  const formatRequestDate = (isoString?: string) => {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'Recent';
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 2) return t('Just now', 'الآن');
      if (diffMins < 60) return `${diffMins}m ${t('ago', 'مضت')}`;
      if (diffHours < 24) return `${diffHours}h ${t('ago', 'مضت')}`;
      if (diffDays === 1) return t('Yesterday', 'أمس');
      return `${diffDays}d ${t('ago', 'مضت')}`;
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {t('Community & Players', 'المجتمع واللاعبين')}
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400">
              {t('Kuwait Athletes', 'رياضيو الكويت')}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            {t(
              'Discover local athletes, manage friend requests, and grow your sports network across Kuwait.',
              'تعرف على الرياضيين، تواصل مع الأصدقاء، وأدر طلبات الصداقة في الكويت.'
            )}
          </p>
        </div>

        {/* Refresh button */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={refetchPlayers}
            disabled={isPlayersLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            title={t('Refresh players list', 'تحديث قائمة اللاعبين')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPlayersLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{t('Refresh', 'تحديث')}</span>
          </button>
        </div>
      </div>

      {/* 2. Sub-Tabs Bar: Discover Players | My Friends | Friend Requests */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab('discover')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'discover'
              ? 'bg-emerald-500 text-neutral-950 shadow-sm'
              : 'bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{t('Discover Players', 'استكشاف اللاعبين')}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('friends')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'friends'
              ? 'bg-emerald-500 text-neutral-950 shadow-sm'
              : 'bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>{t('My Friends', 'أصدقائي')}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            activeSubTab === 'friends' ? 'bg-neutral-950 text-emerald-400' : 'bg-neutral-800 text-neutral-300'
          }`}>
            {friendIds.size}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap relative ${
            activeSubTab === 'requests'
              ? 'bg-emerald-500 text-neutral-950 shadow-sm'
              : 'bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>{t('Friend Requests', 'طلبات الصداقة')}</span>
          {incomingFriendRequests.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeSubTab === 'requests' ? 'bg-neutral-950 text-emerald-400' : 'bg-emerald-500 text-neutral-950'
            }`}>
              {incomingFriendRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('invites')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap relative ${
            activeSubTab === 'invites'
              ? 'bg-emerald-500 text-neutral-950 shadow-sm'
              : 'bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>{t('Game Invites', 'دعوات المباريات')}</span>
          {incomingGameInvites.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeSubTab === 'invites' ? 'bg-neutral-950 text-emerald-400' : 'bg-emerald-500 text-neutral-950'
            }`}>
              {incomingGameInvites.length}
            </span>
          )}
        </button>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: FRIEND REQUESTS TAB */}
      {/* ======================================================== */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Inbox className="w-4 h-4 text-emerald-400" />
              <span>{t('Pending Friend Requests', 'طلبات الصداقة الواردة')}</span>
            </h2>
            <span className="text-xs text-neutral-400">
              {incomingFriendRequests.length} {t('pending', 'طلب معلق')}
            </span>
          </div>

          {incomingFriendRequests.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-neutral-950 border border-neutral-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                <Inbox className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {t('No incoming friend requests', 'لا توجد طلبات صداقة حالياً')}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                  {t(
                    'When another player in Kuwait sends you a friend request, you will be able to accept or decline it right here.',
                    'عندما يرسل لك لاعب آخر طلب صداقة، ستتمكن من قبوله أو رفضه من هنا.'
                  )}
                </p>
              </div>
              <button
                onClick={() => setActiveSubTab('discover')}
                className="mt-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {t('Find Players to Connect', 'ابحث عن لاعبين للتواصل')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incomingFriendRequests.map((req) => {
                const isLoading = isFriendActionLoading(req.requesterId);

                return (
                  <div
                    key={req.id || req.requesterId}
                    className="p-5 rounded-3xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={req.requesterAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                        alt={req.requesterName || 'Athlete'}
                        className="w-12 h-12 rounded-2xl object-cover ring-2 ring-neutral-800 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-white text-sm truncate">
                            {req.requesterName}
                          </h3>
                          <span className="text-[10px] text-neutral-500 whitespace-nowrap">
                            {formatRequestDate(req.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 font-mono">
                          @{req.requesterUsername}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium mt-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{req.requesterArea || 'Kuwait'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Relevant sports */}
                    {req.requesterSports && req.requesterSports.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {req.requesterSports.map(sport => (
                          <span
                            key={sport}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold bg-neutral-950 border border-neutral-800 text-neutral-300 px-2 py-0.5 rounded-lg"
                          >
                            <span>{getSportIcon(sport)}</span>
                            <span>{sport}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Accept / Decline Action Buttons */}
                    <div className="pt-2 border-t border-neutral-800/80 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => acceptFriendRequest(req.requesterId)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{t('Accept', 'قبول')}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => declineFriendRequest(req.requesterId)}
                        className="py-2 px-4 rounded-xl bg-neutral-950 hover:bg-red-950/40 border border-neutral-800 hover:border-red-800/60 text-neutral-300 hover:text-red-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>{t('Decline', 'رفض')}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW: GAME INVITES TAB (Step 4) */}
      {/* ======================================================== */}
      {activeSubTab === 'invites' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>{t('Pending Game Invitations', 'دعوات المباريات المعلقة')}</span>
            </h2>
            <span className="text-xs text-neutral-400">
              {incomingGameInvites.length} {t('invitations', 'دعوة')}
            </span>
          </div>

          {incomingGameInvites.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-neutral-950 border border-neutral-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {t('No pending game invites', 'لا توجد دعوات مباريات معلقة')}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                  {t(
                    'When game organizers in Kuwait invite you to join their pickup games or private matches, their invitations will appear here.',
                    'عندما يدعوك منظمو المباريات في الكويت للانضمام إلى مبارياتهم، ستظهر الدعوات هنا.'
                  )}
                </p>
              </div>
              <button
                onClick={() => setActiveSubTab('discover')}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-colors cursor-pointer"
              >
                {t('Explore Community & Players', 'استكشف المجتمع واللاعبين')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {incomingGameInvites.map((invite) => {
                const isLoading = isGameInviteLoading(invite.gameId, invite.inviteeId);
                const matchedGame = (myGames && myGames.find(g => g.id === invite.gameId)) ||
                                    games.find(g => g.id === invite.gameId);
                const displayTitle = invite.gameTitle || matchedGame?.title || 'Pickup Match';
                const displaySport = (invite.gameSport || matchedGame?.sport || 'Football') as SportType;
                const displayCourt = invite.gameCourtName || matchedGame?.courtName || 'Kuwait Venue';
                const displayArea = invite.gameArea || matchedGame?.area || 'Kuwait';
                const displayDate = invite.gameDate || matchedGame?.date || '';
                const displayTime = invite.gameStartTime || matchedGame?.startTime || '';
                const displayPrice = invite.gamePricePerPlayerKWD ?? matchedGame?.pricePerPlayerKWD ?? 0;

                return (
                  <div
                    key={invite.id || `${invite.gameId}_${invite.inviteeId}`}
                    className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-all"
                  >
                    <div className="space-y-3">
                      {/* Inviter Info */}
                      <div className="flex items-center gap-3">
                        <img
                          src={invite.inviterAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80'}
                          alt={invite.inviterName || 'Organizer'}
                          className="w-10 h-10 rounded-2xl object-cover ring-2 ring-emerald-500/30 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block">
                            {t('Invited by organizer', 'دعوة من المنظم')}
                          </span>
                          <h4 className="text-sm font-bold text-white truncate">
                            {invite.inviterName || t('Game Organizer', 'منظم المباراة')}
                          </h4>
                        </div>
                      </div>

                      {/* Game Card Mini Details */}
                      <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-white truncate">
                            <span>{getSportIcon(displaySport)}</span>
                            <span className="truncate">{displayTitle}</span>
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 shrink-0">
                            {displayPrice.toFixed(3)} KWD
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-400 pt-1 border-t border-neutral-900">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">{displayCourt}, {displayArea}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-neutral-400 shrink-0" />
                            <span className="truncate">{displayDate} {displayTime}</span>
                          </div>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 bg-neutral-950/60 px-2.5 py-1 rounded-lg border border-neutral-800/60">
                        <Clock className="w-3 h-3 text-neutral-500 shrink-0" />
                        <span>{t('Invited', 'أرسلت')} {formatRequestDate(invite.createdAt)}</span>
                      </div>
                    </div>

                    {/* Actions: Accept (Join) & Decline */}
                    <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => acceptGameInvite(invite.gameId)}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>{t('Accept & Join', 'قبول وانضمام')}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => declineGameInvite(invite.gameId)}
                          className="py-2 px-3.5 rounded-xl bg-neutral-950 hover:bg-red-950/40 border border-neutral-800 hover:border-red-800/60 text-neutral-300 hover:text-red-400 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>{t('Decline', 'رفض')}</span>
                        </button>
                      </div>

                      {matchedGame && (
                        <button
                          type="button"
                          onClick={() => setSelectedGameForDetail(matchedGame)}
                          className="w-full py-1 text-center text-[11px] text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
                        >
                          {t('View Match Details →', 'عرض تفاصيل المباراة ←')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: FRIENDS LIST TAB */}
      {/* ======================================================== */}
      {activeSubTab === 'friends' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>{t('My Athletic Friends', 'قائمة أصدقائي الرياضيين')}</span>
            </h2>
            <span className="text-xs text-neutral-400">
              {friendsList.length} {t('friends', 'صديق')}
            </span>
          </div>

          {friendsList.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-neutral-950 border border-neutral-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {t('No friends added yet', 'لم تقم بإضافة أصدقاء بعد')}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                  {t(
                    'Connect with other players across Kuwait to build your pickup squad and play together regularly.',
                    'تواصل مع اللاعبين في الكويت لتكوين فريق للمباريات والتدريب المشترك.'
                  )}
                </p>
              </div>
              <button
                onClick={() => setActiveSubTab('discover')}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-colors cursor-pointer"
              >
                {t('Discover Players in Kuwait', 'استكشف اللاعبين في الكويت')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {friendsList.map((friend) => (
                <div
                  key={friend.id}
                  onClick={() => setSelectedPlayerProfile(friend)}
                  className="group p-5 rounded-3xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 transition-all flex flex-col justify-between cursor-pointer space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={resolvePlayerAvatar(friend)}
                        alt={friend.name}
                        className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/40 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-white text-sm leading-tight truncate group-hover:text-emerald-400 transition-colors">
                            {friend.name}
                          </h3>
                        </div>
                        <p className="text-[11px] text-neutral-400 font-mono">
                          @{friend.username}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium mt-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{friend.area}</span>
                        </div>
                      </div>
                    </div>

                    {friend.bio && (
                      <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                        {friend.bio}
                      </p>
                    )}

                    {friend.favoriteSports && friend.favoriteSports.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {friend.favoriteSports.map(sport => {
                          const skill = friend.skills?.[sport] || 'Casual';
                          return (
                            <span
                              key={sport}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold bg-neutral-950 border border-neutral-800 text-neutral-300 px-2 py-0.5 rounded-lg"
                            >
                              <span>{getSportIcon(sport)}</span>
                              <span>{sport}:</span>
                              <strong className="text-emerald-400">{skill}</strong>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Friend Status & Profile Button */}
                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-800/40">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{t('Friends', 'صديق')}</span>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlayerProfile(friend);
                      }}
                      className="py-1.5 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-emerald-500/50 text-neutral-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t('View Profile', 'الملف')}</span>
                      <ChevronRight className="w-3 h-3 text-neutral-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: DISCOVER PLAYERS TAB */}
      {/* ======================================================== */}
      {activeSubTab === 'discover' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="bg-neutral-950 p-4 sm:p-5 rounded-2xl border border-neutral-800 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={t(
                  'Search by player name, Kuwait area, or sport...', 
                  'ابحث باسم اللاعب، المنطقة، أو الرياضة...'
                )}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {searchFilter && (
                <button 
                  onClick={() => setSearchFilter('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs transition-colors p-1"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Sport Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  {t('Sport', 'الرياضة')}
                </label>
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value as SportType | 'All')}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="All">{t('All Sports', 'جميع الرياضات')}</option>
                  {SPORTS.filter(s => s !== 'All').map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Skill Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  {t('Skill Level', 'المستوى')}
                </label>
                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value as SkillLevel | 'Any')}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Any">{t('Any Skill', 'جميع المستويات')}</option>
                  {SKILL_LEVELS.filter(s => s !== 'Any').map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Area Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  {t('Area', 'المنطقة')}
                </label>
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value as KuwaitArea | 'All')}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="All">{t('All Areas', 'كل المناطق')}</option>
                  {KUWAIT_AREAS.filter(a => a !== 'All').map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results Count & Quick Reset */}
            <div className="flex items-center justify-between pt-1 border-t border-neutral-900 text-xs text-neutral-400">
              <span>
                {t('Showing', 'عرض')} <strong className="text-white">{filteredPlayers.length}</strong> {t('players', 'لاعب')}
              </span>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t('Reset Filters', 'إعادة ضبط')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Error State */}
          {playersError && filteredPlayers.length === 0 && (
            <div className="p-6 rounded-2xl bg-red-950/40 border border-red-800/80 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center mx-auto text-red-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {t('Could not load players', 'تعذر تحميل قائمة اللاعبين')}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                  {playersError}
                </p>
              </div>
              <button
                onClick={refetchPlayers}
                className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {t('Try Again', 'إعادة المحاولة')}
              </button>
            </div>
          )}

          {/* Loading State Skeleton */}
          {isPlayersLoading && otherPlayers.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div 
                  key={i} 
                  className="p-5 rounded-3xl bg-neutral-900/60 border border-neutral-800 animate-pulse space-y-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-neutral-800 rounded w-3/4" />
                      <div className="h-3 bg-neutral-800 rounded w-1/2" />
                      <div className="h-3 bg-neutral-800 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-8 bg-neutral-800/60 rounded" />
                  <div className="h-9 bg-neutral-800 rounded-xl" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isPlayersLoading && filteredPlayers.length === 0 && !playersError && (
            <div className="p-8 sm:p-12 rounded-3xl bg-neutral-950 border border-neutral-800 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  {hasActiveFilters 
                    ? t('No players match your filters', 'لا يوجد لاعبون مطابقون للمرشحات')
                    : t('No players in directory yet', 'لا يوجد لاعبون في الدليل حالياً')
                  }
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  {hasActiveFilters 
                    ? t('Try adjusting your sport, skill level, or area filters to see more athletes in Kuwait.', 'جرب تعديل الرياضة أو المستوى أو المنطقة لرؤية المزيد من اللاعبين.')
                    : t('Be the first to create your sports profile and build the Kuwait athlete community.', 'كن أول من يكمل ملفه الرياضي وينضم لمجتمع الرياضيين في الكويت.')
                  }
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  {t('Reset Filters', 'إعادة ضبط المرشحات')}
                </button>
              )}
            </div>
          )}

          {/* Player Results Grid */}
          {filteredPlayers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredPlayers.map(player => {
                const playerId = player.id || player.uid || '';
                const showAge = player.privacy?.showAge !== false && typeof player.age === 'number' && player.age > 0;
                const isFollowing = isFollowingUser(player.id) || isFollowingUser(player.uid || '');
                const isFollowLoading = isFollowActionLoading(player.id) || isFollowActionLoading(player.uid || '');
                const friendshipStatus = getFriendshipStatus(playerId);
                const isFriendLoading = isFriendActionLoading(playerId);

                return (
                  <div 
                    key={player.id}
                    onClick={() => setSelectedPlayerProfile(player)}
                    className="group p-5 rounded-3xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 transition-all flex flex-col justify-between cursor-pointer space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top Row: Avatar, Name, Username, Area & Age */}
                      <div className="flex items-start gap-3">
                        <img 
                          src={resolvePlayerAvatar(player)} 
                          alt={player.name}
                          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-neutral-800 group-hover:ring-emerald-500/40 transition-all shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-white text-sm leading-tight truncate group-hover:text-emerald-400 transition-colors">
                              {player.name}
                            </h3>
                            {player.nameAr && (
                              <span className="text-[10px] text-neutral-400 font-['Cairo']">
                                ({player.nameAr})
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-neutral-400 font-mono">
                            @{player.username}
                          </p>

                          <div className="flex items-center gap-2 text-[11px] mt-1 flex-wrap">
                            <div className="flex items-center gap-1 text-emerald-400 font-medium">
                              <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{player.area}</span>
                            </div>

                            {showAge && (
                              <span className="bg-neutral-950 border border-neutral-800 text-neutral-300 px-1.5 py-0.2 rounded text-[10px]">
                                {player.age} {t('yrs', 'سنة')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bio (if present) */}
                      {player.bio && (
                        <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                          {player.bio}
                        </p>
                      )}

                      {/* Favorite Sports & Skills Pills */}
                      {player.favoriteSports && player.favoriteSports.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {player.favoriteSports.map(sport => {
                            const skill = player.skills?.[sport] || 'Casual';
                            return (
                              <span 
                                key={sport}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-neutral-950 border border-neutral-800 text-neutral-300 px-2 py-0.5 rounded-lg"
                              >
                                <span>{getSportIcon(sport)}</span>
                                <span>{sport}:</span>
                                <strong className="text-emerald-400">{skill}</strong>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Action Row: Follow + Friend Actions + View Profile */}
                    <div className="pt-2 border-t border-neutral-800/80 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* Follow / Following Button */}
                      <button
                        type="button"
                        disabled={isFollowLoading}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFollowPlayer(playerId);
                        }}
                        className={`flex-1 py-1.5 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 ${
                          isFollowing
                            ? 'bg-neutral-800/90 hover:bg-neutral-800 border-neutral-700 text-neutral-200'
                            : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-400/60 text-neutral-950'
                        }`}
                        title={isFollowing ? t('Unfollow', 'إلغاء المتابعة') : t('Follow player', 'متابعة اللاعب')}
                      >
                        {isFollowLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isFollowing ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>{t('Following', 'تتابعه')}</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3" />
                            <span>{t('Follow', 'متابعة')}</span>
                          </>
                        )}
                      </button>

                      {/* Friend Relationship Button / Status */}
                      {friendshipStatus === 'friends' && (
                        <div 
                          className="py-1.5 px-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-xs font-bold flex items-center gap-1 shrink-0"
                          title={t('You are friends', 'أنتما أصدقاء')}
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>{t('Friends', 'صديق')}</span>
                        </div>
                      )}

                      {friendshipStatus === 'outgoing_request' && (
                        <button
                          type="button"
                          disabled={isFriendLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelFriendRequest(playerId);
                          }}
                          className="py-1.5 px-2.5 rounded-xl bg-neutral-800 hover:bg-red-950/50 border border-neutral-700 hover:border-red-800 text-amber-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                          title={t('Click to cancel friend request', 'انقر لإلغاء طلب الصداقة')}
                        >
                          {isFriendLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>{t('Sent (Cancel)', 'معلق (إلغاء)')}</span>
                            </>
                          )}
                        </button>
                      )}

                      {friendshipStatus === 'incoming_request' && (
                        <button
                          type="button"
                          disabled={isFriendLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            acceptFriendRequest(playerId);
                          }}
                          className="py-1.5 px-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                          title={t('Accept incoming friend request', 'قبول طلب الصداقة')}
                        >
                          {isFriendLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>{t('Accept', 'قبول')}</span>
                            </>
                          )}
                        </button>
                      )}

                      {friendshipStatus === 'none' && (
                        <button
                          type="button"
                          disabled={isFriendLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            sendFriendRequest(playerId);
                          }}
                          className="py-1.5 px-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                          title={t('Send Friend Request', 'إرسال طلب صداقة')}
                        >
                          {isFriendLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="w-3 h-3 text-emerald-400" />
                              <span className="hidden sm:inline">{t('Add Friend', 'إضافة صديق')}</span>
                              <span className="sm:hidden">{t('Friend', 'صديق')}</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* View Profile Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlayerProfile(player);
                        }}
                        className="py-1.5 px-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-emerald-500/50 text-neutral-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-0.5 cursor-pointer shrink-0"
                        title={t('View Profile', 'عرض الملف')}
                      >
                        <User className="w-3 h-3 text-emerald-400" />
                        <ChevronRight className="w-3 h-3 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
