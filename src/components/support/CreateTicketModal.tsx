import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  ShieldAlert, 
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  createSupportTicket, 
  type CreateTicketInput 
} from '../../lib/supportService';
import { compressImageClient } from '../../lib/firebase';
import type { 
  SupportTicketCategory, 
  SupportTicketPriority, 
  SupportTicketOrigin,
  SupportTicketAttachment,
  SupportTicket
} from '../../types';
import { SupportModalPortal } from './SupportModalPortal';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated?: (ticket: SupportTicket) => void;
  onViewMyTickets?: () => void;
  initialCategory?: SupportTicketCategory;
  initialOrigin?: SupportTicketOrigin;
  initialRelatedPlayer?: { id: string; name?: string };
  initialRelatedGame?: { id: string; title?: string };
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  onTicketCreated,
  onViewMyTickets,
  initialCategory = 'general_question',
  initialOrigin = 'help_and_support',
  initialRelatedPlayer,
  initialRelatedGame
}) => {
  const { currentUser, firebaseUser, language, t, games } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<SupportTicketCategory>(initialCategory);
  const [subject, setSubject] = useState(
    initialCategory === 'community_guidelines' 
      ? (initialRelatedPlayer ? `Community Report: ${initialRelatedPlayer.name || initialRelatedPlayer.id}` : 'Community Safety Report') 
      : ''
  );
  const [description, setDescription] = useState('');
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || firebaseUser?.email || '');
  const [relatedPlayer, setRelatedPlayer] = useState(initialRelatedPlayer?.name || initialRelatedPlayer?.id || '');
  const [relatedGameId, setRelatedGameId] = useState(initialRelatedGame?.id || '');
  
  const [attachments, setAttachments] = useState<SupportTicketAttachment[]>([]);
  const [isCompressingFile, setIsCompressingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<SupportTicket | null>(null);

  if (!isOpen) return null;

  const isCommunityViolation = category === 'community_guidelines' || initialOrigin === 'community_guidelines';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > 3) {
      setErrorNotice(t('Maximum 3 image attachments allowed.', 'الحد الأقصى للمرفقات هو ٣ صور.'));
      return;
    }

    setIsCompressingFile(true);
    setErrorNotice(null);

    try {
      const newAttachments: SupportTicketAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          throw new Error(t('Please attach only image files (JPEG, PNG, WebP).', 'يرجى إرفاق صور فقط (JPEG, PNG, WebP).'));
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(t('Each image must be under 10MB.', 'يجب ألا يتجاوز حجم كل صورة ١٠ ميغابايت.'));
        }

        const { dataUrl } = await compressImageClient(file, 800, 0.85);
        newAttachments.push({
          id: `att_${Date.now()}_${i}`,
          name: file.name,
          url: dataUrl,
          size: file.size,
          type: file.type
        });
      }
      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (err: any) {
      setErrorNotice(err?.message || t('Failed to process image attachment.', 'فشل تجهيز المرفق.'));
    } finally {
      setIsCompressingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);

    const trimmedSubject = subject.trim();
    const trimmedDesc = description.trim();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorNotice(t('Please provide a valid email address so we can reply to you.', 'يرجى إدخال بريد إلكتروني صالح لنتمكن من الرد عليك.'));
      return;
    }

    if (!trimmedSubject) {
      setErrorNotice(t('Please enter a brief ticket subject.', 'يرجى كتابة عنوان للتذكرة.'));
      return;
    }

    if (trimmedDesc.length < 10) {
      setErrorNotice(t('Please provide a detailed description (at least 10 characters).', 'يرجى كتابة شرح وافٍ للمشكلة (١٠ أحرف على الأقل).'));
      return;
    }

    const userId = currentUser.uid || currentUser.id || firebaseUser?.uid || 'guest_user';

    setIsSubmitting(true);
    try {
      const selectedGame = games.find(g => g.id === relatedGameId);
      const ticketInput: CreateTicketInput = {
        userId,
        userName: name.trim() || currentUser.name || 'Athlete',
        userEmail: trimmedEmail,
        category,
        priority: isCommunityViolation ? 'high' : 'normal',
        subject: trimmedSubject,
        description: trimmedDesc,
        origin: initialOrigin,
        attachments,
        language: language === 'ar' ? 'ar' : 'en'
      };

      if (relatedPlayer.trim()) {
        ticketInput.relatedPlayerId = relatedPlayer.trim();
        ticketInput.relatedPlayerName = relatedPlayer.trim();
      }
      if (relatedGameId.trim()) {
        ticketInput.relatedGameId = relatedGameId.trim();
      }
      if (selectedGame?.title) {
        ticketInput.relatedGameTitle = selectedGame.title;
      }

      const ticket = await createSupportTicket(ticketInput);
      setCreatedTicket(ticket);
      onTicketCreated?.(ticket);
    } catch (err: any) {
      console.error('[CreateTicketModal] Error creating ticket:', err);
      setErrorNotice(err?.message || t('Failed to create support ticket. Please try again.', 'فشل إرسال تذكرة الدعم. يرجى المحاولة مرة أخرى.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SupportModalPortal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="ticket-modal-title"
      zIndexClass="z-[70]"
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-[#0D1629] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl transition-colors max-h-[90vh] overflow-y-auto min-w-0"
        onClick={(e) => e.stopPropagation()}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
          aria-label={t('Close', 'إغلاق')}
        >
          <X className="w-5 h-5" />
        </button>

        {createdTicket ? (
          /* Success Screen */
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {t('Ticket Created Successfully', 'تم إنشاء التذكرة بنجاح')}
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {createdTicket.ticketNumber}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {t(
                  'Your support request has been submitted. You can track progress, updates, and replies directly in the app.',
                  'تم تقديم طلبك بنجاح. يمكنك متابعة التحديثات والردود والتواصل مباشرة مع الدعم عبر التطبيق.'
                )}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#131F3B] border border-slate-200/80 dark:border-slate-800 text-xs text-start space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('Subject', 'الموضوع')}:</span>
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{createdTicket.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('Contact Email', 'البريد')}:</span>
                <span className="font-mono text-slate-900 dark:text-white">{createdTicket.userEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('Expected Response', 'الرد المتوقع')}:</span>
                <span className="text-[#3A60AA] dark:text-[#B9C9E0] font-semibold">{t('As soon as possible', 'في أقرب وقت ممكن')}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              {onViewMyTickets && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewMyTickets();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#3A60AA] hover:bg-[#2E4D8A] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  {t('View My Tickets', 'عرض تذاكري')}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                {t('Done', 'تم')}
              </button>
            </div>
          </div>
        ) : (
          /* Creation Form */
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                isCommunityViolation
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400'
                  : 'bg-[#EEF3F9] dark:bg-[#142578] border-[#B9C9E0]/50 dark:border-[#1F3590]/60 text-[#3A60AA] dark:text-[#B9C9E0]'
              }`}>
                {isCommunityViolation ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <HelpCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 id="ticket-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  {isCommunityViolation 
                    ? t('Report Community Guidelines Violation', 'الإبلاغ عن مخالفة لإرشادات المجتمع')
                    : t('Create Support Ticket', 'فتح تذكرة مساعدة جديدة')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('Our support team will respond as soon as possible.', 'سيقوم فريق الدعم بالرد في أقرب وقت ممكن.')}
                </p>
              </div>
            </div>

            {/* Contextual Notice for Community Guidelines */}
            {isCommunityViolation && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-800 dark:text-rose-300 space-y-0.5">
                  <p className="font-bold">
                    {t(
                      'Violations of community guidelines are handled with high priority by the safety team.',
                      'يتم التعامل مع مخالفات إرشادات المجتمع بأولوية عالية من قبل فريق الأمان.'
                    )}
                  </p>
                  <p className="text-[11px] opacity-90">
                    {t(
                      'All reports are kept strictly confidential. We investigate pitch incidents, fraud, no-shows, and misconduct.',
                      'جميع البلاغات سرية بالكامل. نحقق في مخالفات الملاعب، المشادات، والاحتيال المالي.'
                    )}
                  </p>
                </div>
              </div>
            )}

            {errorNotice && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                {errorNotice}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Category Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('Category', 'التصنيف')} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#131F3B] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#3A60AA]"
                >
                  <option value="general_question">{t('General Question', 'استفسار عام')}</option>
                  <option value="technical_issue">{t('Technical Issue', 'مشكلة تقنية')}</option>
                  <option value="account_profile">{t('Account & Profile', 'الحساب والملف الشخصي')}</option>
                  <option value="games_players">{t('Games & Players', 'المباريات واللاعبين')}</option>
                  <option value="bookings_payments">{t('Bookings & Payments', 'الحجوزات والمدفوعات')}</option>
                  <option value="community_guidelines">{t('Community Guidelines Violation', 'مخالفات إرشادات المجتمع')}</option>
                  <option value="other">{t('Other Inquiry', 'أخرى')}</option>
                </select>
              </div>

              {/* Related Player & Game (When category is community guidelines or games) */}
              {(isCommunityViolation || category === 'games_players') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#131F3B] border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      {t('Related Player (Optional)', 'اللاعب المعني (اختياري)')}
                    </label>
                    <input
                      type="text"
                      value={relatedPlayer}
                      onChange={(e) => setRelatedPlayer(e.target.value)}
                      placeholder={t('Username or name (e.g. @faisal)', 'اسم المستخدم أو اللاعب')}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-[#0D1629] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#3A60AA]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      {t('Related Game (Optional)', 'المباراة المعنية (اختياري)')}
                    </label>
                    <select
                      value={relatedGameId}
                      onChange={(e) => setRelatedGameId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-[#0D1629] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#3A60AA]"
                    >
                      <option value="">{t('None / Not related to a specific game', 'غير مرتبطة بمباراة محددة')}</option>
                      {games.slice(0, 15).map(g => (
                        <option key={g.id} value={g.id}>
                          {g.title} ({g.sport} - {g.area})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Contact Email & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('Your Name', 'الاسم')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Faisal Al-Sabah"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#131F3B] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#3A60AA]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('Your Email (for replies)', 'بريدك الإلكتروني (لاستلام الردود)')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="athlete@example.com"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#131F3B] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#3A60AA]"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('Subject', 'الموضوع')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t('Brief summary of the inquiry or issue', 'ملخص سريع للمشكلة أو الاستفسار')}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#131F3B] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#3A60AA]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('Description / Details', 'الشرح والتفاصيل')} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t(
                    'Please describe what happened, steps to reproduce, or details of the violation...',
                    'يرجى توضيح ما حدث بالتفصيل، وقت الواقعة، وأي ملاحظات تساعدنا في خدمتك...'
                  )}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#131F3B] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#3A60AA] resize-none"
                />
              </div>

              {/* Attachments (up to 3 images) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t('Screenshots / Attachments (Up to 3)', 'لقطات شاشة أو مرفقات (حتى ٣ صور)')}</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {attachments.length}/3
                  </span>
                </div>

                {attachments.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {attachments.map(att => (
                      <div key={att.id} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-video">
                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="absolute top-1 right-1 p-1 rounded-md bg-rose-600 text-white text-[10px] opacity-90 hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                          title={t('Remove', 'حذف')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {attachments.length < 3 && (
                  <div>
                    <button
                      type="button"
                      disabled={isCompressingFile}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                    >
                      {isCompressingFile ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0]" />
                      )}
                      <span>{t('Add Screenshot / Image', 'إرفاق صورة')}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  {t('Cancel', 'إلغاء')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isCompressingFile}
                  className="px-5 py-2 rounded-xl bg-[#3A60AA] hover:bg-[#2E4D8A] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('Submitting Ticket...', 'جارٍ إرسال التذكرة...')}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 rtl:rotate-180" />
                      <span>{t('Submit Ticket', 'إرسال التذكرة')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </SupportModalPortal>
  );
};
