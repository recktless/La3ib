import React, { useState } from 'react';
import { Game, getCostSharingMethods } from '../types';
import { useApp } from '../context/AppContext';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Zap,
  Loader2
} from 'lucide-react';

interface GameCardProps {
  game: Game;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const { 
    currentUser, 
    setSelectedGameForDetail, 
    joinGame,
    authStatus,
    isDemoActive,
    setAuthModalOpen,
    setAuthModalMode,
    t 
  } = useApp();

  const userUid = currentUser.uid || currentUser.id;
  const isOrganizer = game.organizer.id === userUid || (game as any).organizerId === userUid;
  const isJoined = game.participants.some(p => p.userId === userUid);
  const spotsLeft = game.maxPlayers - game.participants.length;
  const isFull = spotsLeft <= 0;

  const [isJoining, setIsJoining] = useState(false);

  const handleJoinClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (authStatus !== 'authenticated' && !isDemoActive) {
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }
    try {
      setIsJoining(true);
      await joinGame(game.id);
    } catch (err: any) {
      console.error('Join game error:', err);
      setSelectedGameForDetail(game);
    } finally {
      setIsJoining(false);
    }
  };

  // Status badge helper
  const getStatusBadge = () => {
    switch (game.status) {
      case 'Open':
        return {
          dot: 'bg-emerald-400',
          text: t('Open', 'مفتوح'),
          bg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
        };
      case 'Almost Full':
        return {
          dot: 'bg-amber-400',
          text: t('Almost Full', 'شبه ممتلئ'),
          bg: 'bg-amber-950/60 text-amber-300 border-amber-800/60'
        };
      case 'Full':
        return {
          dot: 'bg-red-400',
          text: t('Full', 'مكتمل'),
          bg: 'bg-red-950/60 text-red-300 border-red-800/60'
        };
      case 'Completed':
        return {
          dot: 'bg-neutral-400',
          text: t('Completed', 'منتهية'),
          bg: 'bg-neutral-900 text-neutral-400 border-neutral-800'
        };
      case 'Cancelled':
        return {
          dot: 'bg-neutral-600',
          text: t('Cancelled', 'ملغاة'),
          bg: 'bg-neutral-900 text-neutral-500 border-neutral-800'
        };
    }
  };

  const statusInfo = getStatusBadge();

  // Sport icon helper
  const getSportIcon = () => {
    switch (game.sport) {
      case 'Football': return '⚽';
      case 'Padel': return '🎾';
      case 'Basketball': return '🏀';
      case 'Volleyball': return '🏐';
      case 'Tennis': return '🎾';
      case 'Badminton': return '🏸';
      default: return '🏆';
    }
  };

  return (
    <div 
      onClick={() => setSelectedGameForDetail(game)}
      className="group relative bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800/90 hover:border-neutral-700 rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:shadow-xl hover:shadow-emerald-950/20 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Top meta bar */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg">{getSportIcon()}</span>
            <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
              {game.sport}
            </span>
            <span className="text-neutral-600">•</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
              {game.skillLevel}
            </span>
            {game.isIndoor && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/50 hidden sm:inline">
                {t('Indoor AC', 'مكيف')}
              </span>
            )}
          </div>

          {/* Status badge */}
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusInfo.bg}`}>
            <span className={`w-2 h-2 rounded-full ${statusInfo.dot} animate-pulse`} />
            <span>{statusInfo.text}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-emerald-400 transition-colors line-clamp-1 mb-2">
          {game.title}
        </h3>

        {/* Schedule & Location */}
        <div className="space-y-1.5 text-xs text-neutral-400 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-neutral-300 font-medium">{game.date}</span>
            <span className="text-neutral-600">•</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{game.startTime} – {game.endTime}</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-neutral-200 font-medium truncate">{game.courtName}</span>
            <span className="text-emerald-400/80 font-semibold shrink-0">({game.area})</span>
          </div>
        </div>

        {/* Players joined bar & avatars */}
        <div className="bg-neutral-950/60 rounded-xl p-3 border border-neutral-800/60 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-200">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {game.participants.length}/{game.maxPlayers} {t('players', 'لاعبين')}
              </span>
            </div>
            <span className="text-xs font-semibold text-emerald-400">
              {spotsLeft > 0 ? `${spotsLeft} ${t('spots left', 'أماكن متبقية')}` : t('Game Full', 'مكتمل')}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden mb-2.5">
            <div 
              className={`h-full transition-all duration-300 ${
                isFull ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
              style={{ width: `${Math.min(100, (game.participants.length / game.maxPlayers) * 100)}%` }}
            />
          </div>

          {/* Player Avatars */}
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2 overflow-hidden">
              {game.participants.slice(0, 5).map((p, idx) => (
                <img 
                  key={idx}
                  src={p.avatar}
                  alt={p.name}
                  title={p.name}
                  className="inline-block h-6 w-6 rounded-full ring-2 ring-neutral-900 object-cover"
                />
              ))}
              {game.participants.length > 5 && (
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-neutral-800 ring-2 ring-neutral-900 text-[10px] font-bold text-neutral-300">
                  +{game.participants.length - 5}
                </span>
              )}
            </div>

            {/* Organizer tag */}
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
              <span>{t('Host:', 'المنظم:')}</span>
              <span className="text-neutral-200 font-semibold truncate max-w-[100px]">
                {game.organizer.name.split(' ')[0]}
              </span>
              <span className="text-emerald-400 text-[10px]">
                ★{game.organizer.attendanceRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer: Cost Sharing & CTA */}
      <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-3">
        <div>
          {game.costSharing?.enabled ? (
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                  {t('Estimated Share', 'حصة تقديرية')}
                </span>
                <span className="text-[9px] text-neutral-500">({t('Estimate', 'تقديري')})</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-extrabold text-white">
                  {(game.costSharing.estimatedShare ?? game.pricePerPlayerKWD).toFixed(3)}
                </span>
                <span className="text-xs font-bold text-emerald-400">KWD</span>
                {getCostSharingMethods(game.costSharing).map(m => (
                  <span key={m} className="ms-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                    {m === 'cash' ? t('💵 Cash', '💵 نقداً') : m === 'wamd' ? t('⚡ WAMD', '⚡ ومض') : t('🔗 Link', '🔗 رابط')}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                {t('Cost Sharing', 'تقاسم التكلفة')}
              </span>
              <span className="text-xs sm:text-sm font-bold text-neutral-300">
                {t('None (Free)', 'غير مفعل (مجاني)')}
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div>
          {isOrganizer ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedGameForDetail(game);
              }}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition-colors"
            >
              {t('Manage Host', 'إدارة المباراة')}
            </button>
          ) : isJoined ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedGameForDetail(game);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('Joined ✓', 'مشترك ✓')}</span>
            </button>
          ) : isFull ? (
            <button
              disabled
              className="px-4 py-2 rounded-xl bg-neutral-800/60 text-neutral-500 font-bold text-xs cursor-not-allowed"
            >
              {t('Game Full', 'مكتمل')}
            </button>
          ) : (
            <button
              onClick={handleJoinClick}
              disabled={isJoining}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer transform active:scale-95"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('Joining...', 'جارِ الانضمام...')}</span>
                </>
              ) : (
                <>
                  <span>{t('Join Game', 'انضم للعبة')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
