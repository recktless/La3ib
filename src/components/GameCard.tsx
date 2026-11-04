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
  Loader2,
  Share2
} from 'lucide-react';
import { shareGame } from '../lib/sharing';

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
  const [copiedNotice, setCopiedNotice] = useState(false);

  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await shareGame(game, language);
    if (res.copiedToClipboard) {
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2500);
    }
  };

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

  return (
    <div 
      onClick={() => setSelectedGameForDetail(game)}
      className="group relative w-full bg-white dark:bg-[#0D1629] hover:border-[#3A60AA]/70 dark:hover:border-[#B9C9E0]/70 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md interactive-tap flex flex-col justify-between h-full min-w-0"
    >
      {/* Copied Link Toast Overlay */}
      {copiedNotice && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold shadow-lg animate-fade-in pointer-events-none whitespace-nowrap">
          {t('Invite Link Copied! 📋', 'تم نسخ رابط الدعوة! 📋')}
        </div>
      )}

      {/* Main Content Area */}
      <div>
        {/* 1. Header: Sport Pill + Share Icon + Spots / Status Badge */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EEF3F9] dark:bg-[#142578] text-[#3A60AA] dark:text-[#B9C9E0] border border-[#B9C9E0]/50 dark:border-[#1F3590]/50 shrink-0">
              {getSportLabel(game.sport, language)}
            </span>
            {game.isIndoor && (
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                {t('Indoor AC', 'مكيف')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Native Share Icon Button with minimum 44px mobile touch target */}
            <button
              type="button"
              onClick={handleShareClick}
              aria-label={t('Share game', 'مشاركة المباراة')}
              title={t('Share game', 'مشاركة المباراة')}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#3A60AA] dark:hover:text-[#B9C9E0] hover:bg-slate-100 dark:hover:bg-[#142578] transition-colors cursor-pointer shrink-0 active:scale-95"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Status Pill */}
            {isOrganizer ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                {t('Host', 'المنظم')}
              </span>
            ) : isJoined ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>{t('Joined ✓', 'مشترك ✓')}</span>
              </span>
            ) : isFull ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                {t('Game Full', 'مكتمل')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                <Users className="w-3 h-3" />
                <span>{spotsLeft} {t('spots left', 'أماكن متبقية')}</span>
              </span>
            )}
          </div>
        </div>

        {/* 2. Game Title: Up to 2 lines without clipping */}
        <h3 className="font-bold text-base sm:text-lg text-[#06135B] dark:text-white group-hover:text-[#3A60AA] dark:group-hover:text-[#B9C9E0] transition-colors line-clamp-2 break-words mb-2.5 leading-snug">
          {game.title}
        </h3>

        {/* 3. Date, Time & Venue */}
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-3.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0]" />
              <span>{game.date}</span>
            </span>
            <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 shrink-0">
              <Clock className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0]" />
              <span>{formatTimeRange12Hour(game.startTime, game.endTime, language)}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
            <span className="truncate">{game.courtName}</span>
            <span className="text-slate-400 dark:text-slate-500 shrink-0">•</span>
            <span className="text-[#3A60AA] dark:text-[#B9C9E0] font-semibold shrink-0">
              {getKuwaitAreaLabel(game.area, language)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Responsive Footer: Price / Cost + Action (stacks smoothly on narrow screens) */}
      <div className="pt-3 mt-auto border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
        {/* Cost / Price */}
        <div className="text-xs min-w-0">
          {game.costSharing?.enabled ? (
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] shrink-0">{t('Estimated Share', 'حصة تقديرية')}</span>
              <span className="font-bold text-[#06135B] dark:text-white text-sm">
                {(game.costSharing.estimatedShare ?? game.pricePerPlayerKWD).toFixed(3)}
              </span>
              <span className="text-[10px] font-bold text-[#3A60AA] dark:text-[#B9C9E0]">KWD</span>
              <span className="text-[10px] text-slate-400">({t('Estimate', 'تقديري')})</span>
              {getCostSharingMethods(game.costSharing).map(m => (
                <span key={m} className="hidden md:inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[#EEF3F9] dark:bg-[#142578] text-[#06135B] dark:text-[#B9C9E0]">
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
        <div className="shrink-0 flex items-center justify-end sm:justify-start">
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
