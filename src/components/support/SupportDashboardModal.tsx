import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Clock, 
  CheckCircle2, 
  User, 
  Send, 
  Loader2, 
  ArrowLeft, 
  ArrowRight,
  Inbox,
  Lock
} from 'lucide-react';
import { 
  subscribeAllTickets, 
  subscribeTicketMessages, 
  addTicketMessage, 
  updateTicketStatus, 
  markTicketAsRead 
} from '../../lib/supportService';
import { 
  getTicketCategoryLabel, 
  getTicketStatusLabel, 
  isTicketUnreadByAdmin,
  type SupportTicket, 
  type TicketMessage,
  type SupportTicketStatus,
  type SupportTicketCategory
} from '../../types';
import { SupportModalPortal } from './SupportModalPortal';

interface SupportDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportDashboardModal: React.FC<SupportDashboardModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentUser, firebaseUser, language, t } = useApp();

  // Strict Staff Authorization Check:
  // Must be authenticated with email khalidalami5555@gmail.com or isAdmin == true
  const userEmail = (firebaseUser?.email || currentUser.email || '').toLowerCase().trim();
  const isAuthorizedStaff = userEmail === 'khalidalami5555@gmail.com' || Boolean(currentUser.isAdmin);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Filters (Exactly status & category, no priority)
  const [statusFilter, setStatusFilter] = useState<'all' | SupportTicketStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | SupportTicketCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Ticket Detail & Messages State
  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyTargetStatus, setReplyTargetStatus] = useState<SupportTicketStatus>('waiting_for_user');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Subscribe to all tickets for staff
  useEffect(() => {
    if (!isOpen || !isAuthorizedStaff) return;

    setIsLoading(true);
    const unsubscribe = subscribeAllTickets(
      (all) => {
        setTickets(all);
        setIsLoading(false);
      },
      (err) => {
        console.warn('[SupportDashboard] Subscription error:', err);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen, isAuthorizedStaff]);

  // Subscribe to selected ticket messages
  useEffect(() => {
    if (!selectedTicketId || !isOpen || !isAuthorizedStaff) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    markTicketAsRead(selectedTicketId, 'support');

    const unsubscribe = subscribeTicketMessages(
      selectedTicketId,
      true, // isStaff = true to receive legacy internal notes
      (msgs) => {
        setMessages(msgs);
        setIsLoadingMessages(false);
      },
      (err) => {
        console.warn('[SupportDashboard] Messages error:', err);
        setIsLoadingMessages(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedTicketId, isOpen, isAuthorizedStaff]);

  // Dashboard Metrics & Prioritized List (Hooks must always run unconditionally)
  const totalCount = tickets.length;
  const unreadAttentionCount = tickets.filter(isTicketUnreadByAdmin).length;
  const openCount = tickets.filter(t => t.status === 'open').length;
  const waitingCount = tickets.filter(t => t.status === 'waiting_for_user').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

  const prioritizedTickets = useMemo(() => {
    if (!isOpen || !isAuthorizedStaff) return [];
    const list = tickets.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = t.ticketNumber.toLowerCase().includes(q);
        const matchSub = t.subject.toLowerCase().includes(q);
        const matchEmail = t.userEmail.toLowerCase().includes(q);
        const matchName = t.userName.toLowerCase().includes(q);
        return matchNum || matchSub || matchEmail || matchName;
      }
      return true;
    });

    return list.sort((a, b) => {
      const aUnread = isTicketUnreadByAdmin(a);
      const bUnread = isTicketUnreadByAdmin(b);
      // Prioritize unread tickets that require administrator attention to the top
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;
      // Secondary sort: newest reply or update first
      const timeA = new Date(a.lastReplyAt || a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.lastReplyAt || b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [isOpen, isAuthorizedStaff, tickets, statusFilter, categoryFilter, searchQuery]);

  if (!isOpen) return null;

  // Render Access Denied if unauthorized
  if (!isAuthorizedStaff) {
    return (
      <SupportModalPortal
        isOpen={isOpen}
        onClose={onClose}
        ariaLabelledBy="staff-denied-title"
        zIndexClass="z-[70]"
      >
        <div 
          className="w-full max-w-md bg-white dark:bg-[#0D1629] border border-rose-200 dark:border-rose-900 rounded-3xl p-6 text-center space-y-4 shadow-2xl min-w-0"
          onClick={(e) => e.stopPropagation()}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h3 id="staff-denied-title" className="text-base font-black text-slate-900 dark:text-white">
              {t('Staff Access Restricted', 'صلاحية الدخول مقيدة')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t(
                'The Support Dashboard is restricted to verified La3ib Support staff. Website early access password does not grant support privileges.',
                'لوحة تحكم فريق الدعم مقتصرة فقط على المشرفين المصرح لهم. كلمة مرور الدخول المبكر للموقع لا تمنح صلاحيات الدعم.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            {t('Close', 'إغلاق')}
          </button>
        </div>
      </SupportModalPortal>
    );
  }

  const handleSendStaffReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyContent.trim()) return;

    setIsSendingReply(true);
    setActionNotice(null);

    try {
      await addTicketMessage(selectedTicket, {
        senderId: firebaseUser?.uid || currentUser.uid || 'admin_staff',
        senderRole: 'support',
        senderName: 'La3ib Support',
        content: replyContent.trim(),
        targetStatus: replyTargetStatus
      });

      setReplyContent('');
      setActionNotice(t('Reply sent and notification dispatched.', 'تم إرسال الرد وإشعار المستخدم.'));
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      console.error('[SupportDashboard] Reply error:', err);
      setActionNotice(err?.message || 'Failed to post reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleUpdateStatus = async (newStatus: SupportTicketStatus) => {
    if (!selectedTicket) return;
    try {
      await updateTicketStatus(selectedTicket, newStatus);
    } catch (err: any) {
      setActionNotice(err?.message || 'Failed to update status.');
    }
  };

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
    <SupportModalPortal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="support-dashboard-title"
      zIndexClass="z-[70]"
    >
      <div 
        className="relative w-full max-w-5xl bg-white dark:bg-[#0D1629] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl transition-colors h-[92dvh] max-h-[92dvh] flex flex-col overflow-hidden min-w-0"
        onClick={(e) => e.stopPropagation()}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-[#09101F]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#06135B] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5 text-[#05BCD1]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="support-dashboard-title" className="text-base font-black text-slate-900 dark:text-white">
                  {t('Support Staff Dashboard', 'لوحة تحكم فريق الدعم')}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-[#3A60AA] dark:text-[#B9C9E0] border border-blue-200 dark:border-blue-900/60">
                  {userEmail}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('Real-time support ticket management for La3ib.', 'إدارة التذاكر الحية وبلاغات المجتمع.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={t('Close', 'إغلاق')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Exactly 4 Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:px-5 bg-white dark:bg-[#0D1629] border-b border-slate-200/80 dark:border-slate-800 shrink-0 text-xs">
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-[#131F3B] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">{t('Total', 'الإجمالي')}</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">{totalCount}</p>
            </div>
            {unreadAttentionCount > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3A60AA] text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {unreadAttentionCount > 99 ? '99+' : unreadAttentionCount} {t('New', 'جديد')}
              </span>
            ) : (
              <Inbox className="w-4 h-4 text-slate-400" />
            )}
          </div>

          <div className="p-2.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#3A60AA] dark:text-[#B9C9E0] uppercase font-bold">{t('Open', 'مفتوحة')}</p>
              <p className="text-lg font-black text-[#3A60AA] dark:text-[#B9C9E0]">{openCount}</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#3A60AA] animate-ping" />
          </div>

          <div className="p-2.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-bold">{t('Waiting for User', 'بانتظار المستخدم')}</p>
              <p className="text-lg font-black text-amber-700 dark:text-amber-300">{waitingCount}</p>
            </div>
            <User className="w-4 h-4 text-amber-500" />
          </div>

          <div className="p-2.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold">{t('Resolved', 'تم الحل')}</p>
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{resolvedCount}</p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        {/* Main Content: Split Master-Detail */}
        <div className="flex-1 flex overflow-hidden">
          {/* Master List (Tickets) */}
          <div className={`w-full md:w-5/12 border-e border-slate-200/80 dark:border-slate-800 flex flex-col ${selectedTicketId ? 'hidden md:flex' : 'flex'}`}>
            {/* Filter controls */}
            <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 space-y-2 shrink-0 bg-slate-50/40 dark:bg-[#0A1224]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('Search ticket, subject, email...', 'ابحث برقم التذكرة أو الموضوع أو البريد...')}
                  className="w-full pl-8 rtl:pl-3 rtl:pr-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#131F3B] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#3A60AA]"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="text-[11px] py-1 px-2 rounded-lg bg-white dark:bg-[#131F3B] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                >
                  <option value="all">{t('Status: All', 'الحالة: الكل')}</option>
                  <option value="open">{t('Open', 'مفتوحة')}</option>
                  <option value="waiting_for_user">{t('Waiting for User', 'بانتظار المستخدم')}</option>
                  <option value="resolved">{t('Resolved', 'تم الحل')}</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="text-[11px] py-1 px-2 rounded-lg bg-white dark:bg-[#131F3B] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                >
                  <option value="all">{t('Category: All', 'التصنيف: الكل')}</option>
                  <option value="community_guidelines">{t('Guidelines Violation', 'مخالفات المجتمع')}</option>
                  <option value="bookings_payments">{t('Bookings & Payments', 'حجوزات ومدفوعات')}</option>
                  <option value="technical_issue">{t('Technical', 'مشاكل تقنية')}</option>
                  <option value="account_profile">{t('Account', 'حساب')}</option>
                  <option value="general_question">{t('General', 'عام')}</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <div className="py-16 text-center space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#3A60AA] mx-auto" />
                  <p className="text-xs text-slate-400">{t('Loading tickets...', 'جارٍ التحميل...')}</p>
                </div>
              ) : prioritizedTickets.length === 0 ? (
                <div className="py-16 text-center space-y-1 px-4">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('No tickets match filters', 'لا توجد تذاكر تطابق الفلاتر')}</p>
                  <p className="text-[11px] text-slate-400">{t('Try clearing filters or search', 'جرّب تعديل الفلاتر أو البحث')}</p>
                </div>
              ) : (
                prioritizedTickets.map(ticket => {
                  const isSelected = ticket.id === selectedTicketId;
                  const isUnread = isTicketUnreadByAdmin(ticket);

                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={`p-3 transition-all cursor-pointer text-xs space-y-1.5 relative border-b border-slate-100 dark:border-slate-800/80 ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-[#142358] border-s-4 border-s-[#3A60AA]'
                          : isUnread
                            ? 'bg-blue-50/40 dark:bg-[#0E1A3D]/40 border-s-4 border-s-[#3A60AA] hover:bg-blue-50/60 dark:hover:bg-[#111F4A]'
                            : 'hover:bg-slate-50 dark:hover:bg-[#111A33]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#3A60AA] dark:text-[#B9C9E0]">
                            {ticket.ticketNumber}
                          </span>
                          {isUnread && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#3A60AA]/15 text-[#3A60AA] dark:bg-[#3A60AA]/30 dark:text-[#B9C9E0] border border-[#3A60AA]/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#3A60AA] animate-pulse" />
                              <span>{t('Unread', 'غير مقروء')}</span>
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(ticket.status)}`}>
                          {getTicketStatusLabel(ticket.status, language)}
                        </span>
                      </div>

                      <h4 className={`truncate ${isUnread ? 'font-extrabold text-slate-950 dark:text-white' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>
                        {ticket.subject}
                      </h4>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="truncate max-w-[140px]">{ticket.userName} ({ticket.userEmail})</span>
                        <span className="shrink-0">{new Date(ticket.lastReplyAt || ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Detail View (Selected Ticket) */}
          <div className={`w-full md:w-7/12 flex-col ${selectedTicketId ? 'flex' : 'hidden md:flex'}`}>
            {selectedTicket ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Detail Header & Action Bar */}
                <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0A1224] shrink-0 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTicketId(null)}
                        className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        {language === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                      </button>
                      <span className="font-mono text-xs font-black text-[#3A60AA] dark:text-[#B9C9E0]">
                        {selectedTicket.ticketNumber}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(selectedTicket.status)}`}>
                      {getTicketStatusLabel(selectedTicket.status, language)}
                    </span>
                  </div>

                  {/* Status Selector: 3 simplified statuses */}
                  <div className="flex items-center gap-2 text-xs">
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold shrink-0">
                      {t('Change Status', 'تعديل الحالة')}:
                    </label>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateStatus(e.target.value as SupportTicketStatus)}
                      className="flex-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#131F3B] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="open">{t('Open', 'مفتوحة')}</option>
                      <option value="waiting_for_user">{t('Waiting for User', 'بانتظار المستخدم')}</option>
                      <option value="resolved">{t('Resolved', 'تم الحل')}</option>
                    </select>
                  </div>

                  {actionNotice && (
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[11px] text-[#3A60AA] dark:text-[#B9C9E0] font-bold">
                      {actionNotice}
                    </div>
                  )}
                </div>

                {/* Messages conversation */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {/* Origin Banner */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#131F3B] border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">{selectedTicket.subject}</span>
                      <span className="text-[10px] text-slate-400">{getTicketCategoryLabel(selectedTicket.category, language)}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      {t('Requester', 'المستخدم')}: {selectedTicket.userName} • <span className="font-mono">{selectedTicket.userEmail}</span>
                    </p>
                    {selectedTicket.relatedPlayerName && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                        {t('Reported Player', 'اللاعب المبلغ عنه')}: {selectedTicket.relatedPlayerName}
                      </p>
                    )}
                  </div>

                  {isLoadingMessages ? (
                    <div className="py-12 text-center">
                      <Loader2 className="w-5 h-5 animate-spin text-[#3A60AA] mx-auto" />
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isSupport = msg.senderRole === 'support';
                      const isInternal = Boolean(msg.isInternalNote);

                      return (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-2xl text-xs space-y-1 ${
                            isInternal
                              ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60'
                              : isSupport
                              ? 'bg-[#EEF3F9] dark:bg-[#142578] border border-[#B9C9E0]/50 dark:border-[#1F3590]/60'
                              : 'bg-white dark:bg-[#131F3B] border border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                            <span className={isInternal ? 'text-amber-700 dark:text-amber-400 flex items-center gap-1' : isSupport ? 'text-[#3A60AA] dark:text-[#B9C9E0]' : 'text-slate-700 dark:text-slate-300'}>
                              {isInternal && <Lock className="w-3 h-3" />}
                              {isInternal ? t('Internal Staff Note', 'ملاحظة داخلية سابقة') : isSupport ? t('Support Reply', 'رد الدعم') : msg.senderName}
                            </span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="flex items-center gap-2 pt-1.5">
                              {msg.attachments.map(att => (
                                <a 
                                  key={att.id} 
                                  href={att.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="w-16 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 block"
                                >
                                  <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Staff Reply Composer (In-app ticket reply) */}
                <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0A1224] shrink-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {t('Reply to Athlete', 'الرد على اللاعب')}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">{t('Status after reply', 'الحالة بعد الرد')}:</span>
                      <select
                        value={replyTargetStatus}
                        onChange={(e) => setReplyTargetStatus(e.target.value as any)}
                        className="text-[11px] py-1 px-2 rounded-lg bg-white dark:bg-[#131F3B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                      >
                        <option value="waiting_for_user">{t('Waiting for User', 'بانتظار المستخدم')}</option>
                        <option value="resolved">{t('Resolved', 'تم الحل')}</option>
                        <option value="open">{t('Open', 'مفتوحة')}</option>
                      </select>
                    </div>
                  </div>

                  <form onSubmit={handleSendStaffReply} className="flex gap-2">
                    <textarea
                      rows={2}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={t('Write reply to athlete (appears in their ticket)...', 'اكتب رداً للاعب (يظهر في تذكرته)...')}
                      className="flex-1 p-2 text-xs rounded-xl bg-white dark:bg-[#0D1629] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#3A60AA] resize-none"
                    />

                    <button
                      type="submit"
                      disabled={isSendingReply || !replyContent.trim()}
                      className="px-4 rounded-xl bg-[#3A60AA] hover:bg-[#2E4D8A] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0"
                    >
                      {isSendingReply ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 rtl:rotate-180" />
                      )}
                      <span>{t('Send Reply', 'إرسال الرد')}</span>
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
                <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {t('Select a ticket to review', 'اختر تذكرة لمراجعتها')}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  {t('Pick any support inquiry or safety violation from the list to view full conversation and manage resolution.', 'حدد أي تذكرة من القائمة لعرض المحادثة واتخاذ الإجراء اللازم.')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SupportModalPortal>
  );
};
