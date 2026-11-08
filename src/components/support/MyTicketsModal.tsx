import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Plus, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight, 
  Search,
  Filter,
  ShieldCheck
} from 'lucide-react';
import { subscribeUserTickets } from '../../lib/supportService';
import { TicketDetailModal } from './TicketDetailModal';
import { SupportModalPortal } from './SupportModalPortal';
import { 
  getTicketCategoryLabel, 
  getTicketStatusLabel,
  type SupportTicket,
  type SupportTicketStatus
} from '../../types';

interface MyTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateTicket: () => void;
}

export const MyTicketsModal: React.FC<MyTicketsModalProps> = ({
  isOpen,
  onClose,
  onOpenCreateTicket
}) => {
  const { currentUser, firebaseUser, language, t } = useApp();
  const userId = currentUser.uid || currentUser.id || firebaseUser?.uid || '';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!userId || !isOpen) return;

    setIsLoading(true);
    const unsubscribe = subscribeUserTickets(
      userId,
      (userTickets) => {
        setTickets(userTickets);
        setIsLoading(false);
      },
      (err) => {
        console.warn('[MyTicketsModal] Subscription notice:', err);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId, isOpen]);

  // Sync selectedTicket if ticket updates in the background
  useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find(t => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
    }
  }, [tickets]);

  if (!isOpen) return null;

  const filteredTickets = tickets.filter(ticket => {
    if (filterTab === 'active') {
      if (ticket.status === 'resolved') return false;
    } else if (filterTab === 'resolved') {
      if (ticket.status !== 'resolved') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = ticket.ticketNumber.toLowerCase().includes(q);
      const matchSub = ticket.subject.toLowerCase().includes(q);
      return matchNum || matchSub;
    }

    return true;
  });

  const getStatusBadge = (status: SupportTicketStatus) => {
    switch (status) {
      case 'open':
        return 'bg-blue-50 text-[#3A60AA] dark:bg-blue-950/40 dark:text-[#B9C9E0] border-blue-200 dark:border-blue-900/60';
      case 'waiting_for_user':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/60';
      case 'resolved':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <>
      <SupportModalPortal
        isOpen={isOpen}
        onClose={onClose}
        ariaLabelledBy="my-tickets-title"
        zIndexClass="z-[70]"
      >
        <div 
          className="relative w-full max-w-xl bg-white dark:bg-[#0D1629] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl transition-colors max-h-[90vh] flex flex-col overflow-hidden min-w-0"
          onClick={(e) => e.stopPropagation()}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#EEF3F9] dark:bg-[#142578] border border-[#B9C9E0]/50 dark:border-[#1F3590]/60 text-[#3A60AA] dark:text-[#B9C9E0] flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 id="my-tickets-title" className="text-base font-bold text-slate-900 dark:text-white">
                  {t('My Support Tickets', 'تذاكري وطلبات الدعم')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('Track status, view staff replies, and manage active inquiries.', 'متابعة حالة التذاكر، مراجعة الردود، والرد على فريق الدعم.')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateTicket();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3A60AA] hover:bg-[#2E4D8A] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('New Ticket', 'تذكرة جديدة')}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                aria-label={t('Close', 'إغلاق')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="pt-3 pb-2 space-y-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('Search by ticket number or subject...', 'ابحث برقم التذكرة أو الموضوع...')}
                  className="w-full pl-8 rtl:pl-3 rtl:pr-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-[#131F3B] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#3A60AA]"
                />
              </div>

              {/* Segmented Filter */}
              <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-[#131F3B] border border-slate-200/80 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    filterTab === 'all'
                      ? 'bg-white dark:bg-[#1E3278] text-[#3A60AA] dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {t('All', 'الكل')}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('active')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    filterTab === 'active'
                      ? 'bg-white dark:bg-[#1E3278] text-[#3A60AA] dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {t('Active', 'النشطة')}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('resolved')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    filterTab === 'resolved'
                      ? 'bg-white dark:bg-[#1E3278] text-[#3A60AA] dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {t('Resolved', 'المحلولة')}
                </button>
              </div>
            </div>
          </div>

          {/* Ticket List */}
          <div className="flex-1 overflow-y-auto py-2 space-y-2.5">
            {isLoading ? (
              <div className="py-16 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#3A60AA] dark:text-[#B9C9E0] mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('Loading your tickets...', 'جارٍ تحميل تذاكرك...')}
                </p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {searchQuery ? t('No matching tickets found', 'لم يتم العثور على تذاكر مطابقة') : t('No support tickets yet', 'لا توجد تذاكر دعم سابقة')}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    {searchQuery 
                      ? t('Try searching for another keyword or ticket number.', 'جرّب البحث بكلمة أو رقم تذكرة آخر.')
                      : t('Need help with bookings, payments, or community safety? Open a ticket anytime.', 'تحتاج لمساعدة في الحجوزات، المدفوعات، أو أمان المجتمع؟ يمكنك فتح تذكرة في أي وقت.')}
                  </p>
                </div>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCreateTicket();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3A60AA] hover:bg-[#2E4D8A] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('Create First Ticket', 'إنشاء أول تذكرة')}</span>
                  </button>
                )}
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const hasUnreadReply = Boolean(ticket.unreadByUser);

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="p-3.5 rounded-2xl bg-slate-50/70 hover:bg-slate-100 dark:bg-[#131F3B] dark:hover:bg-[#17274B] border border-slate-200/80 dark:border-slate-800 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#3A60AA] dark:text-[#B9C9E0]">
                          {ticket.ticketNumber}
                        </span>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(ticket.status)}`}>
                          {getTicketStatusLabel(ticket.status, language)}
                        </span>

                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {getTicketCategoryLabel(ticket.category, language)}
                        </span>

                        {hasUnreadReply && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider animate-pulse">
                            {t('New Reply', 'رد جديد')}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {ticket.subject}
                      </h4>

                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </span>
                        {ticket.lastReplyBy && (
                          <span>
                            {t('Last reply by', 'آخر رد بواسطة')}: {ticket.lastReplyBy === 'support' ? t('Support Staff', 'فريق الدعم') : t('You', 'أنت')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors shrink-0">
                      <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </SupportModalPortal>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          isOpen={Boolean(selectedTicket)}
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          isStaffView={false}
        />
      )}
    </>
  );
};
