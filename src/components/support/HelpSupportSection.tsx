import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  HelpCircle, 
  MessageSquare, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Mail, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  CreditCard, 
  Star,
  ExternalLink,
  Shield
} from 'lucide-react';
import { subscribeUserTickets } from '../../lib/supportService';
import { CreateTicketModal } from './CreateTicketModal';
import { MyTicketsModal } from './MyTicketsModal';
import type { SupportTicket } from '../../types';

interface HelpSupportSectionProps {
  onOpenCommunityGuidelines?: () => void;
}

export const HelpSupportSection: React.FC<HelpSupportSectionProps> = ({
  onOpenCommunityGuidelines
}) => {
  const { currentUser, firebaseUser, language, t, setSupportDashboardOpen, unreadSupportTicketsCount } = useApp();

  const userEmail = (firebaseUser?.email || currentUser.email || '').toLowerCase().trim();
  const isAuthorizedStaff = userEmail === 'khalidalami5555@gmail.com' || Boolean(currentUser.isAdmin);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMyTicketsOpen, setIsMyTicketsOpen] = useState(false);

  // User tickets subscription for live unread badge
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const userId = currentUser.uid || currentUser.id || firebaseUser?.uid || '';

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeUserTickets(userId, (tickets) => {
      setUserTickets(tickets);
    });
    return () => unsubscribe();
  }, [userId]);

  const unreadCount = userTickets.filter(t => t.unreadByUser).length;
  const activeCount = userTickets.filter(t => t.status !== 'resolved').length;

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(prev => (prev === index ? null : index));
  };

  const faqItems = [
    {
      icon: FileText,
      qEn: 'How do court bookings and pickup games work?',
      qAr: 'كيف يتم حجز الملاعب وتنظيم المباريات؟',
      aEn: 'Organizers can post pickup games, optionally attaching verified venue bookings from Li3ib or local sports clubs. Players join open spots and get instant match reminders in Kuwait.',
      aAr: 'يمكن للمنظمين إنشاء المباريات وربط حجوزات الملاعب المعتمدة من تطبيق لعّيب أو المنشآت المحلية في الكويت. ينضم اللاعبون للأماكن المتاحة ويتلقون تنبيهات فورية.'
    },
    {
      icon: Clock,
      qEn: 'What is the match cancellation policy?',
      qAr: 'ما هي سياسة إلغاء المباريات واسترداد الرسوم؟',
      aEn: 'Matches cancelled by organizers at least 6 hours before kickoff allow participants to coordinate fee settlement. For venue bookings, facility-specific refund terms apply.',
      aAr: 'إلغاء المباراة من قبل المنظم قبل 6 ساعات على الأقل يتيح تسوية تكلفة المشاركة. بالنسبة لحجوزات الملاعب، تطبق سياسة الاسترجاع الخاصة بالمنشأة الرياضية.'
    },
    {
      icon: CreditCard,
      qEn: 'How does match cost sharing work (WAMD / Cash)?',
      qAr: 'كيف يعمل تقاسم تكاليف الملاعب (ومض / نقداً)؟',
      aEn: 'La3ib is designed strictly to split actual venue rent fairly among participating athletes. Surcharges or commercial resale are strictly forbidden. Use verified Central Bank of Kuwait WAMD mobile transfers or cash.',
      aAr: 'منصة لاعب مخصصة حصراً للتوزيع العادل لسعر إيجار الملعب الفعلي بين المشاركين. يُمنع منعاً باتاً تحقيق أي هوامش ربحية. اعتمد على تحويلات ومض الموثقة أو الدفع النقدي.'
    },
    {
      icon: Star,
      qEn: 'How is the player 5-star rating determined?',
      qAr: 'كيف يتم احتساب تقييم اللاعبين ومستوى الالتزام؟',
      aEn: 'After confirmed matches, participants rate each other on punctuality, fair play, and sportsmanship on a 1-to-5 star scale. Ratings update transparently on player profiles.',
      aAr: 'بعد انتهاء المباراة، يقيّم اللاعبون بعضهم على مقياس من ١ إلى ٥ نجوم وفقاً للروح الرياضية والالتزام بالمواعيد، ويظهر متوسط التقييم بشفافية في الملف الرياضي.'
    },
    {
      icon: AlertTriangle,
      qEn: 'How do I report community guideline violations?',
      qAr: 'كيف أبلغ عن مخالفات إرشادات المجتمع والسلامة؟',
      aEn: 'You can report misconduct, abusive behavior, fraud, or no-shows directly via Community Guidelines or by creating a support ticket. The safety team reviews all inquiries as soon as possible.',
      aAr: 'يمكنك الإبلاغ عن أي سلوك مسيء أو احتيال مالي أو غياب للمنظمين مباشرة عبر صفحة إرشادات المجتمع أو فتح تذكرة دعم، ويراجع فريق الأمان السجلات في أقرب وقت ممكن.'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {t('Help & Support', 'المساعدة والدعم')}
          </h3>
        </div>

        {isAuthorizedStaff && (
          <button
            type="button"
            onClick={() => setSupportDashboardOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-[#142578] dark:hover:bg-[#1B3088] text-[#06135B] dark:text-white text-[11px] font-bold transition-colors cursor-pointer border border-blue-200 dark:border-[#1F3590]"
          >
            <Shield className="w-3 h-3 text-[#3A60AA] dark:text-[#B9C9E0]" />
            <span>{t('Support Dashboard', 'لوحة تحكم الدعم')}</span>
            {unreadSupportTicketsCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full text-[10px] font-bold bg-[#3A60AA] text-white">
                {unreadSupportTicketsCount > 99 ? '99+' : unreadSupportTicketsCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Main Support Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        {/* Quick Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Create Ticket */}
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="p-3.5 rounded-2xl bg-[#EEF3F9] hover:bg-[#DCE5F2] dark:bg-[#142578] dark:hover:bg-[#1B3088] border border-[#B9C9E0]/50 dark:border-[#1F3590]/60 text-start flex items-center justify-between transition-colors cursor-pointer group min-w-0"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#0D1629] text-[#3A60AA] dark:text-[#B9C9E0] flex items-center justify-center shrink-0 shadow-xs">
                <Plus className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#06135B] dark:text-white leading-tight">
                  {t('Create Support Ticket', 'فتح تذكرة مساعدة')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-[#B9C9E0]/80 mt-0.5 break-words">
                  {t('Ask questions, report issues, or get help', 'استفسر أو أبلغ عن مشكلة')}
                </p>
              </div>
            </div>
            <span className="text-xs text-[#3A60AA] dark:text-[#B9C9E0] font-bold group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform ms-2 shrink-0">
              →
            </span>
          </button>

          {/* My Tickets */}
          <button
            type="button"
            onClick={() => setIsMyTicketsOpen(true)}
            className="p-3.5 rounded-2xl bg-white dark:bg-[#0B1536] hover:bg-slate-50 dark:hover:bg-[#111F54]/50 border border-slate-200/80 dark:border-slate-800 text-start flex items-center justify-between transition-colors cursor-pointer group min-w-0"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#162766] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 shadow-xs">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {t('My Tickets', 'تذاكري')}
                  </p>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse shrink-0">
                      {unreadCount} {t('New', 'جديد')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                  {activeCount > 0 
                    ? `${activeCount} ${t('active ticket(s)', 'تذكرة نشطة')}` 
                    : t('View your ticket history', 'سجل المحادثات والتذاكر')}
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors ms-2 shrink-0">
              →
            </span>
          </button>
        </div>

        {/* FAQs Accordion */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-[#06135B] dark:text-white">
              {t('Frequently Asked Questions', 'الأسئلة الشائعة')}
            </h4>
            <span className="text-[10px] text-slate-400">
              {faqItems.length} {t('topics', 'موضوع')}
            </span>
          </div>

          <div className="space-y-2">
            {faqItems.map((item, idx) => {
              const isOpen = expandedFaq === idx;
              const Icon = item.icon;

              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/70 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-[#0A1224] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-3 text-start flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-[#111A33] transition-colors min-w-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Icon className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
                      <span className="text-xs font-semibold text-slate-900 dark:text-white leading-snug break-words">
                        {language === 'ar' ? item.qAr : item.qEn}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ms-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ms-2" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/50 dark:border-slate-800/80 break-words">
                      {language === 'ar' ? item.aAr : item.aEn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Direct Contact Info Card */}
        <div className="p-3.5 rounded-2xl bg-[#EEF3F9] dark:bg-[#0D1C68] border border-[#B9C9E0]/60 dark:border-[#1F3590]/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#142578] text-[#3A60AA] dark:text-[#B9C9E0] flex items-center justify-center shrink-0 shadow-xs">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#06135B] dark:text-white">
                {t('Direct Support Email', 'البريد المباشر للدعم')}
              </p>
              <p className="text-[11px] font-mono text-[#3A60AA] dark:text-[#B9C9E0] mt-0.5 break-all">
                info@la3ibkw.com
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#B9C9E0]/80 shrink-0">
            <Clock className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
            <span className="break-words">{t('Our support team will respond as soon as possible.', 'سيقوم فريق الدعم بالرد في أقرب وقت ممكن.')}</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateTicketModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onViewMyTickets={() => setIsMyTicketsOpen(true)}
      />

      <MyTicketsModal
        isOpen={isMyTicketsOpen}
        onClose={() => setIsMyTicketsOpen(false)}
        onOpenCreateTicket={() => setIsCreateOpen(true)}
      />
    </div>
  );
};
