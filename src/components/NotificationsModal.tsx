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
  CheckCircle2, 
  UserPlus, 
  UserCheck, 
  Mail, 
  AlertCircle 
} from 'lucide-react';
import { AppNotification } from '../types';
import { getGameFromFirestore } from '../lib/firebase';

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

      if (missingGamesCache.has(notif.gameId)) {
        setNavNotice(t('Match is no longer available.', 'هذه المباراة لم تعد متاحة.'));
        return;
      }

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
        return <Mail className="w-4 h-4 text-[#1246DF] dark:text-[#05BCD1]" />;
      case 'friend_request':
        return <UserPlus className="w-4 h-4 text-[#1246DF] dark:text-[#05BCD1]" />;
      case 'friend_request_accepted':
        return <UserCheck className="w-4 h-4 text-[#1246DF] dark:text-[#05BCD1]" />;
      case 'game_join':
      case 'joined':
        return <Users className="w-4 h-4 text-[#1246DF] dark:text-[#05BCD1]" />;
      case 'game_leave':
        return <UserMinus className="w-4 h-4 text-amber-500" />;
      case 'game_almost_full':
        return <Flame className="w-4 h-4 text-amber-500" />;
      case 'game_full':
        return <Trophy className="w-4 h-4 text-[#1246DF] dark:text-[#05BCD1]" />;
      case 'chat_message':
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-[#05BCD1]" />;
      default:
        return <Bell className="w-4 h-4 text-[#1246DF] dark:text-[#05BCD1]" />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70"
      onClick={() => setNotificationsModalOpen(false)}
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-3xl overflow-hidden flex flex-col my-auto max-h-[85dvh] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-[#1B253D] bg-slate-50 dark:bg-[#1B253D]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[#1246DF] dark:text-[#05BCD1] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('Notifications', 'الإشعارات')}
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#1246DF] dark:bg-[#05BCD1] text-white dark:text-slate-950 text-[10px] font-black">
                    {unreadCount} {t('new', 'جديد')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('Updates on your games, roster changes, and chat.', 'تحديثات مبارياتك وتغييرات اللاعبين.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#253452] border border-slate-200 dark:border-[#2A3B5C] text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title={t('Mark all as read', 'تحديد الكل كمقروء')}
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1]" />
                <span className="hidden sm:inline">{t('Mark all read', 'تحديد كمقروء')}</span>
              </button>
            )}
            <button 
              onClick={() => setNotificationsModalOpen(false)}
              className="p-2 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-[#253452] dark:hover:bg-[#2F4166] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notice feedback banner */}
        {navNotice && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">{navNotice}</span>
            </div>
            <button 
              onClick={() => setNavNotice(null)} 
              className="text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 text-sm font-bold px-1.5 py-0.5 rounded cursor-pointer shrink-0"
            >
              ×
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100 dark:divide-[#1B253D]">
          {notifications.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1B253D] text-slate-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("You're all caught up!", 'أنت على اطلاع بكل جديد!')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
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
                  className={`pt-2.5 first:pt-0 p-3 rounded-2xl transition-colors cursor-pointer flex items-start gap-3 relative group ${
                    notif.read
                      ? 'bg-transparent hover:bg-slate-50 dark:hover:bg-[#18233D] opacity-80 hover:opacity-100'
                      : 'bg-blue-50/50 dark:bg-[#1B253D] border border-blue-200 dark:border-[#2A3B5C]'
                  }`}
                >
                  {/* Left Avatar / Icon */}
                  <div className="relative shrink-0 mt-0.5">
                    {notif.actorPhotoURL ? (
                      <img 
                        src={notif.actorPhotoURL} 
                        alt={notif.actorName || t('Former Athlete', 'لاعب سابق')}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] flex items-center justify-center">
                        {getNotificationIcon(notif.type)}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[9px]">
                      {getNotificationIcon(notif.type)}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#1246DF] dark:group-hover:text-[#05BCD1] transition-colors truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {notif.timestamp || t('Just now', 'الآن')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                      {bodyText}
                    </p>
                    {notif.gameId && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1246DF] dark:text-[#05BCD1] mt-1.5 hover:underline">
                        <span>{t('View Match Details →', 'عرض تفاصيل المباراة ←')}</span>
                      </span>
                    )}
                  </div>

                  {/* Unread Indicator Dot */}
                  {!notif.read && (
                    <div className="absolute top-4 right-3 w-2 h-2 rounded-full bg-[#1246DF] dark:bg-[#05BCD1]" />
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
