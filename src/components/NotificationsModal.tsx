import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Bell, 
  CheckCheck, 
  MessageSquare, 
  Users, 
  UserMinus, 
  Flame, 
  Trophy, 
  Calendar,
  CheckCircle2,
  Sparkles,
  UserPlus,
  UserCheck,
  Mail,
  AlertCircle
} from 'lucide-react';
import { AppNotification } from '../types';
import { getGameFromFirestore } from '../lib/firebase';

// Cache missing games so we do not repeatedly query Firestore for deleted matches
const missingGamesCache = new Set<string>();

export const NotificationsModal: React.FC = () => {
  const { 
    notifications, 
    notificationsModalOpen, 
    setNotificationsModalOpen, 
    markNotificationRead, 
    markAllNotificationsRead,
    setSelectedGameForDetail,
    setActiveTab,
    games,
    myGames,
    t 
  } = useApp();

  const [navNotice, setNavNotice] = useState<string | null>(null);

  if (!notificationsModalOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read) {
      markNotificationRead(notif.id);
    }
    setNavNotice(null);

    if (notif.gameId) {
      const foundGame = (myGames && myGames.find(g => g.id === notif.gameId)) ||
                        games.find(g => g.id === notif.gameId);
      if (foundGame) {
        setNotificationsModalOpen(false);
        setSelectedGameForDetail(foundGame);
        return;
      }

      // Check if known deleted game
      if (missingGamesCache.has(notif.gameId)) {
        setNavNotice(t('Match is no longer available.', 'هذه المباراة لم تعد متاحة.'));
        return;
      }

      // Query game by ID if not in currently loaded local state
      try {
        const remoteGame = await getGameFromFirestore(notif.gameId);
        if (remoteGame) {
          setNotificationsModalOpen(false);
          setSelectedGameForDetail(remoteGame);
        } else {
          missingGamesCache.add(notif.gameId);
          setNavNotice(t('Match is no longer available or was removed.', 'هذه المباراة لم تعد متاحة أو تم حذفها.'));
        }
      } catch (err) {
        missingGamesCache.add(notif.gameId);
        setNavNotice(t('Match is no longer available.', 'هذه المباراة لم تعد متاحة.'));
      }
    } else if (notif.type === 'game_invite') {
      setNotificationsModalOpen(false);
      setActiveTab('players');
    } else if (notif.type === 'friend_request' || notif.type === 'friend_request_accepted') {
      setNotificationsModalOpen(false);
      setActiveTab('players');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'game_invite':
        return <Mail className="w-4 h-4 text-emerald-400" />;
      case 'friend_request':
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'friend_request_accepted':
        return <UserCheck className="w-4 h-4 text-emerald-400" />;
      case 'game_join':
      case 'joined':
        return <Users className="w-4 h-4 text-emerald-400" />;
      case 'game_leave':
        return <UserMinus className="w-4 h-4 text-amber-400" />;
      case 'game_almost_full':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'game_full':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'chat_message':
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-sky-400" />;
      default:
        return <Bell className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={() => setNotificationsModalOpen(false)}
    >
      <div 
        className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  {t('Notifications', 'الإشعارات')}
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-neutral-950 text-[10px] font-black">
                    {unreadCount} {t('new', 'جديد')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">
                {t('Updates on your games, roster changes, and chat.', 'تحديثات مبارياتك وتغييرات اللاعبين.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title={t('Mark all as read', 'تحديد الكل كمقروء')}
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">{t('Mark all read', 'تحديد كمقروء')}</span>
              </button>
            )}
            <button 
              onClick={() => setNotificationsModalOpen(false)}
              className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notice feedback banner for stale/unavailable games */}
        {navNotice && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">{navNotice}</span>
            </div>
            <button 
              onClick={() => setNavNotice(null)} 
              className="text-amber-400 hover:text-amber-200 text-sm font-bold px-1.5 py-0.5 rounded cursor-pointer shrink-0"
            >
              ×
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-neutral-800/40">
          {notifications.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-800 text-neutral-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-neutral-600" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">
                  {t("You're all caught up!", 'أنت على اطلاع بكل جديد!')}
                </h4>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  {t(
                    'No new notifications right now. Activity on your pickup matches will appear here.',
                    'لا توجد إشعارات جديدة حالياً. نشاطات مبارياتك ستظهر هنا فور حدوثها.'
                  )}
                </p>
              </div>
            </div>
          ) : (
            notifications.map((notif) => {
              const bodyText = notif.body || notif.message || '';
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`pt-2.5 first:pt-0 p-3 rounded-2xl transition-all cursor-pointer flex items-start gap-3 relative group ${
                    notif.read
                      ? 'bg-transparent hover:bg-neutral-800/40 opacity-75 hover:opacity-100'
                      : 'bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/60'
                  }`}
                >
                  {/* Left Avatar / Icon */}
                  <div className="relative shrink-0 mt-0.5">
                    {notif.actorPhotoURL ? (
                      <img 
                        src={notif.actorPhotoURL} 
                        alt={notif.actorName || t('Former Athlete', 'لاعب سابق')}
                        onError={(e) => {
                          // Hide broken image safely so fallback icon is visible
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-neutral-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                        {getNotificationIcon(notif.type)}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-[9px]">
                      {getNotificationIcon(notif.type)}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-neutral-500 whitespace-nowrap">
                        {notif.timestamp || 'Just now'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2">
                      {bodyText}
                    </p>
                    {notif.gameId && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 mt-1.5 hover:underline">
                        <span>{t('View Match Details →', 'عرض تفاصيل المباراة ←')}</span>
                      </span>
                    )}
                  </div>

                  {/* Unread Indicator Dot */}
                  {!notif.read && (
                    <div className="absolute top-4 right-3 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
