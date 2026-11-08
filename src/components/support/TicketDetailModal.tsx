import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Send, 
  Paperclip, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  User, 
  Loader2, 
  Image as ImageIcon,
  Clock,
  Trash2,
  Lock,
  ExternalLink
} from 'lucide-react';
import { 
  subscribeTicketMessages, 
  addTicketMessage, 
  updateTicketStatus,
  markTicketAsRead 
} from '../../lib/supportService';
import { compressImageClient } from '../../lib/firebase';
import { 
  getTicketCategoryLabel, 
  getTicketStatusLabel, 
  getTicketPriorityLabel,
  type SupportTicket, 
  type TicketMessage,
  type SupportTicketAttachment,
  type SupportTicketStatus
} from '../../types';
import { SupportModalPortal } from './SupportModalPortal';

interface TicketDetailModalProps {
  isOpen: boolean;
  ticket: SupportTicket | null;
  onClose: () => void;
  isStaffView?: boolean;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  isOpen,
  ticket,
  onClose,
  isStaffView = false
}) => {
  const { currentUser, firebaseUser, language, t } = useApp();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [attachments, setAttachments] = useState<SupportTicketAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isCompressingFile, setIsCompressingFile] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  // Mark ticket as read when opened
  useEffect(() => {
    if (ticket?.id) {
      markTicketAsRead(
        ticket.id, 
        isStaffView ? 'support' : 'user',
        ticket.lastReplyAt || ticket.updatedAt
      );
    }
  }, [ticket?.id, ticket?.lastReplyAt, ticket?.updatedAt, isStaffView]);

  // Subscribe to real-time conversation messages
  useEffect(() => {
    if (!ticket?.id || !isOpen) return;

    setIsLoadingMessages(true);
    const unsubscribe = subscribeTicketMessages(
      ticket.id,
      isStaffView,
      (msgs) => {
        setMessages(msgs);
        setIsLoadingMessages(false);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      (err) => {
        console.warn('[TicketDetailModal] Messages subscription notice:', err);
        setIsLoadingMessages(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [ticket?.id, isOpen, isStaffView]);

  if (!isOpen || !ticket) return null;

  const isResolvedOrClosed = ticket.status === 'resolved';

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
      const newAtts: SupportTicketAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          throw new Error(t('Please attach image files only.', 'يرجى إرفاق صور فقط.'));
        }
        const { dataUrl } = await compressImageClient(file, 800, 0.85);
        newAtts.push({
          id: `att_${Date.now()}_${i}`,
          name: file.name,
          url: dataUrl,
          size: file.size,
          type: file.type
        });
      }
      setAttachments(prev => [...prev, ...newAtts]);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to process attachment.');
    } finally {
      setIsCompressingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed && attachments.length === 0) return;

    setIsSending(true);
    setErrorNotice(null);

    const senderRole = isStaffView ? 'support' : 'user';
    const senderId = currentUser.uid || currentUser.id || firebaseUser?.uid || 'user';
    const senderName = isStaffView ? 'La3ib Support' : (currentUser.name || 'Athlete');

    try {
      await addTicketMessage(ticket, {
        senderId,
        senderRole,
        senderName,
        content: trimmed || (language === 'ar' ? 'مرفق صورة' : 'Attached image'),
        attachments
      });

      setReplyText('');
      setAttachments([]);
    } catch (err: any) {
      console.error('[TicketDetailModal] Send error:', err);
      setErrorNotice(err?.message || t('Failed to send reply. Please try again.', 'فشل إرسال الرد.'));
    } finally {
      setIsSending(false);
    }
  };

  const handleResolveTicket = async () => {
    setIsResolving(true);
    try {
      await updateTicketStatus(ticket, 'resolved');
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to update ticket status.');
    } finally {
      setIsResolving(false);
    }
  };

  const getStatusBadgeClass = (status: SupportTicketStatus) => {
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

  const handleReopenTicket = async () => {
    setIsResolving(true);
    try {
      await updateTicketStatus(ticket, 'open');
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to reopen ticket.');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <SupportModalPortal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="ticket-detail-title"
      zIndexClass="z-[75]"
    >
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-[#0D1629] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl transition-colors max-h-[90vh] flex flex-col overflow-hidden min-w-0"
        onClick={(e) => e.stopPropagation()}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black text-[#3A60AA] dark:text-[#B9C9E0]">
                {ticket.ticketNumber}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(ticket.status)}`}>
                {getTicketStatusLabel(ticket.status, language)}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-[#131F3B] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800">
                {getTicketCategoryLabel(ticket.category, language)}
              </span>
            </div>
            <h2 id="ticket-detail-title" className="text-base font-bold text-slate-900 dark:text-white truncate">
              {ticket.subject}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
            aria-label={t('Close', 'إغلاق')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Optional References Banner (e.g. Related Player / Game) */}
        {(ticket.relatedPlayerName || ticket.relatedGameTitle) && (
          <div className="px-5 py-2.5 bg-slate-50 dark:bg-[#131F3B] border-b border-slate-200/80 dark:border-slate-800 text-xs flex items-center gap-3 flex-wrap shrink-0">
            {ticket.relatedPlayerName && (
              <span className="text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-500 dark:text-slate-400">{t('Related Player', 'اللاعب')}: </span>
                {ticket.relatedPlayerName}
              </span>
            )}
            {ticket.relatedGameTitle && (
              <span className="text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-500 dark:text-slate-400">{t('Related Match', 'المباراة')}: </span>
                {ticket.relatedGameTitle}
              </span>
            )}
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isLoadingMessages ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#3A60AA] dark:text-[#B9C9E0]" />
              <p className="text-xs text-slate-400">{t('Loading conversation...', 'جارٍ تحميل المحادثة...')}</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isSupport = msg.senderRole === 'support';
                const isInternal = Boolean(msg.isInternalNote);

                if (isInternal) {
                  return (
                    <div 
                      key={msg.id} 
                      className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs space-y-1.5"
                    >
                      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-[11px]">
                        <Lock className="w-3.5 h-3.5" />
                        <span>{t('Internal Staff Note (Not visible to user)', 'ملاحظة داخلية خاصة بالفريق (غير مرئية للمستخدم)')}</span>
                        <span className="text-[10px] text-amber-600/70 font-normal ms-auto">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-amber-900 dark:text-amber-200 leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  );
                }

                return (
                  <div 
                    key={msg.id}
                    className={`flex flex-col ${isSupport ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1">
                      {isSupport ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0]" />
                          <span className="font-bold text-[#3A60AA] dark:text-[#B9C9E0]">
                            {t('La3ib Support', 'فريق الدعم')}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {msg.senderName}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed break-words shadow-xs ${
                      isSupport
                        ? 'bg-[#EEF3F9] dark:bg-[#142578] text-slate-900 dark:text-white border border-[#B9C9E0]/50 dark:border-[#1F3590]/60 rounded-tl-sm'
                        : 'bg-white dark:bg-[#131F3B] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-tr-sm'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Attachments preview inside message bubble */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                          {msg.attachments.map(att => (
                            <button
                              key={att.id}
                              type="button"
                              onClick={() => setPreviewImageUrl(att.url)}
                              className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video bg-slate-100 dark:bg-slate-800 cursor-pointer"
                            >
                              <img src={att.url} alt={att.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ExternalLink className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}

          {/* Resolved status notice with Reopen button */}
          {ticket.status === 'resolved' && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t('This ticket has been marked as resolved.', 'تم تحديد هذه التذكرة كـ محلولة.')}</span>
              </div>
              <button
                type="button"
                disabled={isResolving}
                onClick={handleReopenTicket}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-emerald-900/60 hover:bg-emerald-100 dark:hover:bg-emerald-800/80 text-emerald-800 dark:text-emerald-200 text-xs font-bold border border-emerald-300 dark:border-emerald-700 transition-colors cursor-pointer shadow-xs"
              >
                {isResolving ? t('Updating...', 'جارٍ التحديث...') : t('Reopen Ticket', 'إعادة فتح التذكرة')}
              </button>
            </div>
          )}
        </div>

        {/* Footer / Reply Composer */}
        <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0A1224] shrink-0 space-y-2">
          {errorNotice && (
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[11px] text-rose-700 dark:text-rose-300">
              {errorNotice}
            </div>
          )}

          {/* Attachments preview queue */}
          {attachments.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              {attachments.map(att => (
                <div key={att.id} className="relative group w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-md bg-rose-600 text-white text-[9px] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSendReply} className="flex items-end gap-2">
            <div className="flex-1 bg-white dark:bg-[#0D1629] border border-slate-200 dark:border-slate-800 rounded-2xl p-2 focus-within:border-[#3A60AA] transition-colors">
              <textarea
                rows={2}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('Type your reply here...', 'اكتب ردك هنا...')}
                className="w-full text-xs text-slate-900 dark:text-white bg-transparent focus:outline-none resize-none px-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply(e);
                  }
                }}
              />

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  disabled={attachments.length >= 3 || isCompressingFile}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-40"
                  title={t('Attach screenshot', 'إرفاق صورة')}
                >
                  {isCompressingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />

                <span className="text-[10px] text-slate-400">
                  {t('Press Enter to send', 'اضغط Enter للإرسال')}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                type="submit"
                disabled={isSending || (!replyText.trim() && attachments.length === 0)}
                className="p-3 rounded-2xl bg-[#3A60AA] hover:bg-[#2E4D8A] text-white transition-colors cursor-pointer shadow-xs disabled:opacity-40 flex items-center justify-center"
                aria-label={t('Send Reply', 'إرسال الرد')}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 rtl:rotate-180" />
                )}
              </button>

              {!isStaffView && (
                ticket.status !== 'resolved' ? (
                  <button
                    type="button"
                    disabled={isResolving}
                    onClick={handleResolveTicket}
                    className="px-2 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-900/60 transition-colors cursor-pointer"
                    title={t('Mark ticket as resolved', 'تحديد التذكرة كـ محلولة')}
                  >
                    {isResolving ? t('Updating...', 'جارٍ التحديث...') : t('Mark Resolved', 'تم الحل')}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isResolving}
                    onClick={handleReopenTicket}
                    className="px-2 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-[#3A60AA] dark:text-[#B9C9E0] text-[10px] font-bold border border-blue-200 dark:border-blue-900/60 transition-colors cursor-pointer"
                    title={t('Reopen ticket', 'إعادة فتح التذكرة')}
                  >
                    {isResolving ? t('Updating...', 'جارٍ التحديث...') : t('Reopen', 'إعادة فتح')}
                  </button>
                )
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Lightbox Preview Modal for Attachments */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-[80] bg-black/85 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img src={previewImageUrl} alt="Attachment Preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-2 right-2 p-2 rounded-xl bg-slate-900/80 text-white hover:bg-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </SupportModalPortal>
  );
};
