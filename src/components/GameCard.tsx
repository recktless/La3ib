import React, { useState } from 'react';
import { 
  Game, 
  getCostSharingMethods,
  getSportLabel,
  getSkillLabel,
  getKuwaitAreaLabel,
  formatTimeRange12Hour
} from '../types';
import { useApp } from '../context/AppContext';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle2, 
  ArrowRight,
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
    language,
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

  // Status badge styling
  const getStatusBadge = () => {
    switch (game.status) {
      case 'Open':
        return {
          dot: 'bg-emerald-500',
          text: t('Open', 'مفتوح'),
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        };
      case 'Almost Full':
        return {
          dot: 'bg-amber-500',
          text: t('Almost Full', 'شبه ممتلئ'),
          bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        };
      case 'Full':
        return {
          dot: 'bg-rose-500',
          text: t('Full', 'مكتمل'),
          bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        };
      case 'Completed':
        return {
          dot: 'bg-slate-400',
          text: t('Completed', 'منتهية'),
          bg: 'bg-slate-100 dark:bg-[#0D1C68] text-slate-600 dark:text-slate-300 border-[#B9C9E0] dark:border-[#1F3590]'
        };
      case 'Cancelled':
        return {
          dot: 'bg-slate-500',
          text: t('Cancelled', 'ملغاة'),
          bg: 'bg-slate-100 dark:bg-[#0D1C68] text-slate-500 dark:text-slate-400 border-[#B9C9E0] dark:border-[#1F3590]'
        };
    }
  };

  const statusInfo = getStatusBadge();

  return (
    <div 
      onClick={() => setSelectedGameForDetail(game)}
      className="group relative w-full bg-white dark:bg-[#0D1629] hover:border-[#3A60AA]/70 dark:hover:border-[#B9C9E0]/70 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md interactive-tap"
    >
      {/* 1. Header: Sport Pill + Available Spots / Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EEF3F9] dark:bg-[#142578] text-[#3A60AA] dark:text-[#B9C9E0] border border-[#B9C9E0]/50 dark:border-[#1F3590]/50 shrink-0">
            {getSportLabel(game.sport, language)}
          </span>
          {game.isIndoor && (
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
              {t('Indoor AC', 'مكيف')}
            </span>
          )}
        </div>

        {/* Spots Left / Status Pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isOrganizer ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {t('Host', 'المنظم')}
            </span>
          ) : isJoined ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>{t('Joined ✓', 'مشترك ✓')}</span>
            </span>
          ) : isFull ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {t('Game Full', 'مكتمل')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Users className="w-3 h-3" />
              <span>{spotsLeft} {t('spots left', 'أماكن متبقية')}</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Game Title */}
      <h3 className="font-bold text-base sm:text-lg text-[#06135B] dark:text-white group-hover:text-[#3A60AA] dark:group-hover:text-[#B9C9E0] transition-colors line-clamp-1 mb-2">
        {game.title}
      </h3>

      {/* 3. Date, Time & Venue (Compact 2 Lines) */}
      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 mb-3.5">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
          <span className="font-medium text-slate-800 dark:text-slate-200">{game.date}</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <Clock className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
          <span>{formatTimeRange12Hour(game.startTime, game.endTime, language)}</span>
        </div>

        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
          <span className="truncate">{game.courtName}</span>
          <span className="text-slate-400 dark:text-slate-500 shrink-0">•</span>
          <span className="text-[#3A60AA] dark:text-[#B9C9E0] font-semibold shrink-0">
            {getKuwaitAreaLabel(game.area, language)}
          </span>
        </div>
      </div>

      {/* 4. Subtle Footer: Price / Cost + Action */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        {/* Cost / Price */}
        <div className="text-xs">
          {game.costSharing?.enabled ? (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">{t('Estimated Share', 'حصة تقديرية')}</span>
              <span className="font-bold text-[#06135B] dark:text-white text-sm">
                {(game.costSharing.estimatedShare ?? game.pricePerPlayerKWD).toFixed(3)}
              </span>
              <span className="text-[10px] font-bold text-[#3A60AA] dark:text-[#B9C9E0]">KWD</span>
              <span className="text-[10px] text-slate-400">({t('Estimate', 'تقديري')})</span>
              {getCostSharingMethods(game.costSharing).map(m => (
                <span key={m} className="hidden sm:inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[#EEF3F9] dark:bg-[#142578] text-[#06135B] dark:text-[#B9C9E0]">
                  {m === 'cash' ? t('Cash', 'نقداً') : m === 'wamd' ? t('WAMD', 'ومض') : t('Payment Link', 'رابط الدفع')}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px]">
              <span>{t('Cost Sharing', 'تقاسم التكلفة')}:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{t('None (Free)', 'مجاني')}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div>
          {isOrganizer ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-[#EEF3F9] hover:bg-[#DCE5F2] dark:bg-[#142578] dark:hover:bg-[#1B3088] text-[#06135B] dark:text-white font-semibold text-xs transition-colors border border-[#B9C9E0]/60 dark:border-[#1F3590]">
              {t('Manage Host', 'إدارة')}
            </span>
          ) : isJoined ? (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
              <CheckCircle2 className="w-3 h-3" />
              <span>{t('Joined ✓', 'مشترك ✓')}</span>
            </span>
          ) : isFull ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#142578]/50 text-slate-400 dark:text-slate-500 font-semibold text-xs">
              {t('Game Full', 'مكتمل')}
            </span>
          ) : (
            <button
              onClick={handleJoinClick}
              disabled={isJoining}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#3A60AA] hover:bg-[#2E4D8A] disabled:opacity-50 text-white font-semibold text-xs transition-all cursor-pointer shadow-xs hover:shadow-sm"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{t('Joining...', 'جارٍ الانضمام...')}</span>
                </>
              ) : (
                <>
                  <span>{t('Join Game', 'انضم')}</span>
                  <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
