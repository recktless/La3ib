import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Court, 
  SportType, 
  KuwaitArea, 
  CourtBooking,
  getSportLabel,
  getKuwaitAreaLabel,
  formatTimeRange12Hour
} from '../types';
import { 
  X, 
  Search, 
  MapPin, 
  Star, 
  Clock, 
  Check, 
  Sparkles, 
  Calendar, 
  Share2, 
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Info
} from 'lucide-react';

export const Li3ibBookingModal: React.FC = () => {
  const { 
    courts, 
    bookingModalOpen, 
    setBookingModalOpen, 
    bookCourtViaLi3ib, 
    postBookingAsGame,
    currentUser,
    authStatus,
    language,
    t 
  } = useApp();

  const isRestricted = currentUser?.canOrganize === false;
  const isPrivilegeLoading = authStatus === 'loading';

  const [selectedSport, setSelectedSport] = useState<SportType | 'All'>('All');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(courts[0] || null);
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-25');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<CourtBooking | null>(null);
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);

  if (!bookingModalOpen) return null;

  const sports: (SportType | 'All')[] = ['All', 'Football', 'Padel', 'Basketball', 'Volleyball'];

  const filteredCourts = courts.filter(c => {
    if (selectedSport !== 'All' && c.sport !== selectedSport) return false;
    return true;
  });

  const handleSelectCourt = (court: Court) => {
    setSelectedCourt(court);
    setSelectedSlotId('');
  };

  const handleConfirmLi3ibBooking = () => {
    if (isRestricted || isPrivilegeLoading) return;
    if (!selectedCourt) return;
    const slot = selectedCourt.availableSlots.find(s => s.id === selectedSlotId) || selectedCourt.availableSlots[0];
    if (!slot) return;

    setIsBookingSubmitting(true);
    setTimeout(() => {
      const booking = bookCourtViaLi3ib(selectedCourt, slot);
      setIsBookingSubmitting(false);
      setCompletedBooking(booking);
    }, 600);
  };

  const handlePostBookingToGame = () => {
    if (isRestricted || isPrivilegeLoading || !completedBooking) return;
    postBookingAsGame(completedBooking);
    setCompletedBooking(null);
  };

  const handleClose = () => {
    setBookingModalOpen(false);
    setCompletedBooking(null);
    setSelectedSlotId('');
    setMobileStep(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: Li3ib Co-branding */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#22304E] bg-slate-50 dark:bg-[#0B1120]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#1246DF]/10 dark:bg-[#05BCD1]/15 border border-[#1246DF]/20 dark:border-[#05BCD1]/30 px-2.5 py-1 rounded-xl">
              <span className="text-xs font-bold text-[#1246DF] dark:text-[#05BCD1]">Li3ib API</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{t('La3ib Kuwait', 'لعيب الكويت')}</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {t('Book Court via Li3ib Provider', 'حجز الملاعب عبر منصة Li3ib')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('Instant reservation across Kuwait premier sports facilities', 'حجز فوري ومباشر في أفضل ملاعب الكويت')}
              </p>
            </div>
          </div>

          <button 
            onClick={handleClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Prominent Restriction Warning Banner */}
        {isRestricted && (
          <div 
            data-testid="booking-restricted-banner"
            role="alert"
            className="p-4 sm:p-5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 flex items-start gap-3.5"
          >
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1 space-y-1 text-left rtl:text-right">
              <h3 className="font-bold text-sm sm:text-base text-amber-900 dark:text-amber-200">
                {t('Booking Restricted', 'الحجز مقيد')}
              </h3>
              <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300/90 leading-relaxed font-medium">
                {t(
                  'Your account is currently not allowed to organize games or book pitches. Please contact an administrator for assistance.',
                  'حسابك غير مصرح له حالياً بإنشاء مباريات أو حجز الملاعب. يرجى التواصل مع الإدارة للمساعدة.'
                )}
              </p>
            </div>
          </div>
        )}

        {/* Content Body */}
        {completedBooking ? (
          /* Booking Success & "Post as Game" Screen */
          <div className="p-6 sm:p-8 text-center max-w-xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800">
                {t('Court Confirmed with Li3ib', 'تم تأكيد حجز الملعب مع Li3ib')}
              </span>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-3">
                {completedBooking.courtName}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                {completedBooking.date} • {formatTimeRange12Hour(completedBooking.startTime, completedBooking.endTime, language)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                {t('Booking Reference:', 'رقم الحجز:')} <span className="text-[#1246DF] dark:text-[#05BCD1] font-bold">{completedBooking.bookingRef}</span>
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#22304E] rounded-xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>{t('Sport & Facility:', 'الرياضة والملعب:')}</span>
                <span className="font-bold text-slate-900 dark:text-white">{completedBooking.sport} ({completedBooking.area})</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>{t('Total Court Cost:', 'التكلفة الإجمالية للملعب:')}</span>
                <span className="font-bold text-[#1246DF] dark:text-[#05BCD1] text-sm">{completedBooking.totalCostKWD.toFixed(3)} KWD</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>{t('Provider:', 'مزود الخدمة:')}</span>
                <span>Li3ib Kuwait Reservation Network</span>
              </div>
            </div>

            {/* The Critical Core UX Step: "Want to fill the remaining spots? -> Post this booking for players to join" */}
            <div className="p-5 rounded-xl bg-slate-100 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] text-left space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#1246DF] dark:text-[#05BCD1]" />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  {t('Want to fill the remaining spots & split the cost?', 'تريد إكمال العدد وتقاسم تكلفة الملعب؟')}
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t(
                  'Post this booking to La3ib! We will automatically import the court, time, and calculate each player\'s share so they pay you directly.',
                  'انشر هذا الحجز في لعيب! سنقوم باستيراد بيانات الملعب والوقت تلقائياً وحساب حصة كل لاعب ليدفعوا لك مباشرة.'
                )}
              </p>
              <div className="space-y-1.5">
                <button
                  onClick={handlePostBookingToGame}
                  disabled={isRestricted || isPrivilegeLoading}
                  aria-label="Post Booking"
                  onKeyDown={(e) => {
                    if (isRestricted || isPrivilegeLoading) {
                      e.preventDefault();
                    }
                  }}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                    isRestricted || isPrivilegeLoading
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-60'
                      : 'bg-[#1246DF] hover:bg-[#0e37b3] text-white cursor-pointer'
                  }`}
                >
                  <Share2 className="w-4 h-4" />
                  <span>{t('Post Booking for Players to Join', 'انشر الحجز لفتح انضمام اللاعبين')}</span>
                </button>
                {isRestricted && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold text-center">
                    {t('Action disabled: your account is restricted from organizing games', 'الإجراء معطل: حسابك مقيد من تنظيم المباريات')}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleClose}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
            >
              {t('Keep as private booking and close', 'الاحتفاظ به كحجز خاص والإغلاق')}
            </button>
          </div>
        ) : (
          /* Normal Browsing & Booking Interface */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Step Navigation Header for Mobile (1. Select Court -> 2. Select Date & Time -> 3. Review) */}
            <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-[#EEF3F9] dark:bg-[#0D1C68] border-b border-[#B9C9E0] dark:border-[#1F3590] text-xs">
              <button
                type="button"
                onClick={() => setMobileStep(1)}
                className={`flex items-center gap-1.5 font-bold transition-colors cursor-pointer ${mobileStep === 1 ? 'text-[#3A60AA] dark:text-white' : 'text-slate-500 dark:text-[#B9C9E0]/70'}`}
              >
                <span className={`w-5 h-5 rounded-[4px] flex items-center justify-center text-[10px] ${mobileStep === 1 ? 'bg-[#3A60AA] text-white' : 'bg-white dark:bg-[#142578] text-slate-700 dark:text-[#B9C9E0] border border-[#B9C9E0] dark:border-[#1F3590]'}`}>1</span>
                <span>{t('1. Court', '١. الملعب')}</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
              <button
                type="button"
                onClick={() => selectedCourt && setMobileStep(2)}
                disabled={!selectedCourt}
                className={`flex items-center gap-1.5 font-bold transition-colors ${!selectedCourt ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${mobileStep === 2 ? 'text-[#3A60AA] dark:text-white' : 'text-slate-500 dark:text-[#B9C9E0]/70'}`}
              >
                <span className={`w-5 h-5 rounded-[4px] flex items-center justify-center text-[10px] ${mobileStep === 2 ? 'bg-[#3A60AA] text-white' : 'bg-white dark:bg-[#142578] text-slate-700 dark:text-[#B9C9E0] border border-[#B9C9E0] dark:border-[#1F3590]'}`}>2</span>
                <span>{t('2. Date & Time', '٢. الموعد')}</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
              <button
                type="button"
                onClick={() => selectedCourt && setMobileStep(3)}
                disabled={!selectedCourt}
                className={`flex items-center gap-1.5 font-bold transition-colors ${!selectedCourt ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${mobileStep === 3 ? 'text-[#3A60AA] dark:text-white' : 'text-slate-500 dark:text-[#B9C9E0]/70'}`}
              >
                <span className={`w-5 h-5 rounded-[4px] flex items-center justify-center text-[10px] ${mobileStep === 3 ? 'bg-[#3A60AA] text-white' : 'bg-white dark:bg-[#142578] text-slate-700 dark:text-[#B9C9E0] border border-[#B9C9E0] dark:border-[#1F3590]'}`}>3</span>
                <span>{t('3. Review', '٣. التأكيد')}</span>
              </button>
            </div>

            {/* MOBILE ONLY VIEW (One step visible at a time) */}
            <div className="md:hidden flex-1 flex flex-col overflow-y-auto">
              {/* MOBILE STEP 1: Select Court */}
              {mobileStep === 1 && (
                <div className="flex-1 flex flex-col justify-between p-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#06135B] dark:text-white uppercase tracking-wider">
                        {t('Select Court', 'اختر الملعب')}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-[#B9C9E0]/80">
                        {filteredCourts.length} {t('courts available', 'ملاعب متاحة')}
                      </span>
                    </div>

                    {/* Sport Filters */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {sports.map(sport => (
                        <button
                          key={sport}
                          onClick={() => setSelectedSport(sport)}
                          className={`px-3 py-1.5 rounded-[5px] text-xs font-bold shrink-0 transition-colors cursor-pointer border ${
                            selectedSport === sport
                              ? 'bg-[#3A60AA] text-white border-[#3A60AA]'
                              : 'bg-white dark:bg-[#0D1C68] border-[#B9C9E0] dark:border-[#1F3590] text-slate-700 dark:text-[#B9C9E0]'
                          }`}
                        >
                          {sport === 'All' ? t('All Sports', 'الكل') : getSportLabel(sport, language)}
                        </button>
                      ))}
                    </div>

                    {/* Court Cards - Full Width Readable Cards */}
                    <div className="space-y-3">
                      {filteredCourts.map(court => {
                        const isSelected = selectedCourt?.id === court.id;
                        return (
                          <div
                            key={court.id}
                            onClick={() => handleSelectCourt(court)}
                            className={`p-3.5 rounded-[6px] border transition-colors cursor-pointer flex gap-3.5 ${
                              isSelected
                                ? 'bg-[#EEF3F9] dark:bg-[#0D1C68] border-[#3A60AA] ring-2 ring-[#3A60AA]/30'
                                : 'bg-white dark:bg-[#0D1C68] border-slate-200 dark:border-[#1F3590] hover:border-slate-300'
                            }`}
                          >
                            <img 
                              src={court.image} 
                              alt={court.name}
                              className="w-20 h-20 rounded-[4px] object-cover shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-bold text-[#3A60AA] dark:text-[#B9C9E0] uppercase tracking-wider">
                                  {getSportLabel(court.sport, language)}
                                </span>
                                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                                  <Star className="w-3 h-3 fill-amber-400" />
                                  <span>{court.rating}</span>
                                </div>
                              </div>
                              <h4 className="font-bold text-sm text-[#06135B] dark:text-white truncate">{court.name}</h4>
                              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-[#B9C9E0]/80 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{getKuwaitAreaLabel(court.area, language)}</span>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs font-bold text-[#06135B] dark:text-white">
                                  {court.pricePerHourKWD.toFixed(3)} <span className="text-[10px] text-[#3A60AA] dark:text-[#B9C9E0]">KWD/hr</span>
                                </span>
                                {court.isIndoor && (
                                  <span className="text-[10px] font-medium text-[#3A60AA] dark:text-[#B9C9E0] bg-[#EEF3F9] dark:bg-[#142578] px-1.5 py-0.5 rounded-[4px] border border-[#B9C9E0] dark:border-[#1F3590]">
                                    {t('Indoor', 'داخلي')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 1 Bottom Button */}
                  <div className="pt-3 border-t border-slate-200 dark:border-[#1F3590] sticky bottom-0 bg-white dark:bg-[#131C31]">
                    <button
                      type="button"
                      disabled={!selectedCourt}
                      onClick={() => setMobileStep(2)}
                      className="w-full py-3 px-4 rounded-[6px] bg-[#3A60AA] hover:bg-[#2E4D8A] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>{t('Continue to Date & Time', 'المتابعة لتحديد الموعد')}</span>
                      <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </div>
                </div>
              )}

              {/* MOBILE STEP 2: Select Date & Time */}
              {mobileStep === 2 && selectedCourt && (
                <div className="flex-1 flex flex-col justify-between p-4 space-y-4">
                  <div className="space-y-4">
                    {/* Compact Selected Court Summary */}
                    <div className="p-3 rounded-[6px] bg-[#EEF3F9] dark:bg-[#0D1C68] border border-[#B9C9E0] dark:border-[#1F3590] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img 
                          src={selectedCourt.image} 
                          alt={selectedCourt.name}
                          className="w-12 h-12 rounded-[4px] object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-[#06135B] dark:text-white truncate">{selectedCourt.name}</h4>
                          <p className="text-[11px] text-slate-500 dark:text-[#B9C9E0]/80 truncate">
                            {getSportLabel(selectedCourt.sport, language)} • {getKuwaitAreaLabel(selectedCourt.area, language)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMobileStep(1)}
                        className="px-2.5 py-1 text-xs font-bold text-[#3A60AA] dark:text-[#B9C9E0] hover:underline shrink-0 cursor-pointer"
                      >
                        {t('Change', 'تغيير')}
                      </button>
                    </div>

                    {/* Select Date */}
                    <div>
                      <h4 className="text-xs font-bold text-[#06135B] dark:text-white uppercase tracking-wider mb-2">
                        {t('Select Date', 'اختر التاريخ')}
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {['2026-09-25', '2026-09-26', '2026-09-27'].map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setSelectedDate(d)}
                            className={`py-2 px-1 rounded-[5px] border text-center transition-colors cursor-pointer ${
                              selectedDate === d
                                ? 'bg-[#3A60AA] text-white border-[#3A60AA] font-bold'
                                : 'bg-white dark:bg-[#0D1C68] text-slate-700 dark:text-[#B9C9E0] border-[#B9C9E0] dark:border-[#1F3590]'
                            }`}
                          >
                            <span className="text-[11px] block font-bold leading-tight">
                              {d === '2026-09-25' ? t('Fri, Sep 25', 'الجمعة ٢٥') : d === '2026-09-26' ? t('Sat, Sep 26', 'السبت ٢٦') : t('Sun, Sep 27', 'الأحد ٢٧')}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Select Time Slot */}
                    <div>
                      <h4 className="text-xs font-bold text-[#06135B] dark:text-white uppercase tracking-wider mb-2">
                        {t('Available Slots (Li3ib Live Feed)', 'الأوقات المتاحة (تحديث مباشر عبر Li3ib)')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedCourt.availableSlots.map(slot => {
                          const isSlotSelected = selectedSlotId === slot.id || (!selectedSlotId && slot === selectedCourt.availableSlots[0]);
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => setSelectedSlotId(slot.id)}
                              className={`p-2.5 rounded-[5px] border text-left rtl:text-right transition-colors cursor-pointer ${
                                isSlotSelected
                                  ? 'bg-[#EEF3F9] dark:bg-[#142578] border-[#3A60AA] ring-2 ring-[#3A60AA]/30'
                                  : 'bg-white dark:bg-[#0D1C68] border-[#B9C9E0] dark:border-[#1F3590] text-slate-700 dark:text-[#B9C9E0]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#06135B] dark:text-white">
                                  {formatTimeRange12Hour(slot.startTime, slot.endTime, language)}
                                </span>
                                {isSlotSelected && <Check className="w-3.5 h-3.5 text-[#3A60AA]" />}
                              </div>
                              <div className="text-[11px] text-[#3A60AA] dark:text-[#B9C9E0] font-bold mt-1">
                                {slot.priceKWD.toFixed(3)} KWD
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Step 2 Bottom Navigation */}
                  <div className="pt-3 border-t border-slate-200 dark:border-[#1F3590] sticky bottom-0 bg-white dark:bg-[#131C31] flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileStep(1)}
                      className="py-2.5 px-4 rounded-[5px] bg-[#EEF3F9] hover:bg-[#DCE5F2] dark:bg-[#0D1C68] dark:hover:bg-[#142578] text-[#06135B] dark:text-[#B9C9E0] border border-[#B9C9E0] dark:border-[#1F3590] font-bold text-xs transition-colors cursor-pointer"
                    >
                      {t('Back to Courts', 'الرجوع')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileStep(3)}
                      className="flex-1 py-2.5 px-4 rounded-[5px] bg-[#3A60AA] hover:bg-[#2E4D8A] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>{t('Continue to Review', 'مراجعة وتأكيد')}</span>
                      <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </div>
                </div>
              )}

              {/* MOBILE STEP 3: Review / Continue */}
              {mobileStep === 3 && selectedCourt && (
                <div className="flex-1 flex flex-col justify-between p-4 space-y-4">
                  <div className="space-y-4">
                    <div className="p-4 rounded-[6px] bg-[#EEF3F9] dark:bg-[#0D1C68] border border-[#B9C9E0] dark:border-[#1F3590] space-y-3 text-xs">
                      <div className="flex items-center gap-2 text-[#3A60AA] dark:text-[#B9C9E0] font-bold">
                        <ShieldCheck className="w-4 h-4" />
                        <span>{t('Review Booking Summary', 'ملخص تفاصيل الحجز')}</span>
                      </div>

                      <div className="space-y-2 border-t border-[#B9C9E0]/50 dark:border-[#1F3590] pt-2">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-[#B9C9E0]/80">{t('Court & Facility:', 'الملعب:')}</span>
                          <span className="font-bold text-[#06135B] dark:text-white">{selectedCourt.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-[#B9C9E0]/80">{t('Sport & Area:', 'الرياضة والمنطقة:')}</span>
                          <span className="font-bold text-[#06135B] dark:text-white">
                            {getSportLabel(selectedCourt.sport, language)} ({getKuwaitAreaLabel(selectedCourt.area, language)})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-[#B9C9E0]/80">{t('Date & Time:', 'الموعد:')}</span>
                          <span className="font-bold text-[#06135B] dark:text-white">
                            {selectedDate} • {(() => {
                              const s = selectedCourt.availableSlots.find(slot => slot.id === selectedSlotId) || selectedCourt.availableSlots[0];
                              return formatTimeRange12Hour(s?.startTime, s?.endTime, language);
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-[#B9C9E0]/50 dark:border-[#1F3590] pt-2">
                          <span className="text-slate-700 dark:text-white font-bold">{t('Total Court Fee:', 'التكلفة الإجمالية:')}</span>
                          <span className="font-black text-sm text-[#06135B] dark:text-white">
                            {(selectedCourt.availableSlots.find(s => s.id === selectedSlotId)?.priceKWD || selectedCourt.availableSlots[0]?.priceKWD || selectedCourt.pricePerHourKWD).toFixed(3)} KWD
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-[6px] bg-slate-50 dark:bg-[#142578]/50 border border-slate-200 dark:border-[#1F3590] text-xs text-slate-500 dark:text-[#B9C9E0]/80">
                      <p>{t('Reservation verified through Li3ib Kuwait provider. Instant confirmation.', 'يتم تأكيد الحجز فوراً عبر شبكة Li3ib للملاعب في الكويت.')}</p>
                    </div>
                  </div>

                  {/* Step 3 Bottom Action & Book Button */}
                  <div className="pt-3 border-t border-slate-200 dark:border-[#1F3590] sticky bottom-0 bg-white dark:bg-[#131C31] space-y-2">
                    <button
                      type="button"
                      onClick={() => setMobileStep(2)}
                      className="w-full py-2 px-3 rounded-[5px] bg-[#EEF3F9] hover:bg-[#DCE5F2] dark:bg-[#0D1C68] text-[#06135B] dark:text-[#B9C9E0] border border-[#B9C9E0] dark:border-[#1F3590] font-bold text-xs transition-colors cursor-pointer text-center"
                    >
                      {t('Back to Date & Time', 'الرجوع لتعديل الموعد')}
                    </button>
                    <button
                      onClick={handleConfirmLi3ibBooking}
                      disabled={isRestricted || isPrivilegeLoading || isBookingSubmitting}
                      aria-label="Book a Pitch"
                      onKeyDown={(e) => {
                        if (isRestricted || isPrivilegeLoading) {
                          e.preventDefault();
                        }
                      }}
                      className={`w-full py-3 px-4 rounded-[6px] font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                        isRestricted || isPrivilegeLoading
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-60'
                          : 'bg-[#1246DF] hover:bg-[#0e37b3] text-white cursor-pointer disabled:opacity-50'
                      }`}
                    >
                      {isBookingSubmitting ? (
                        <span>{t('Confirming via Li3ib...', 'جارٍ التأكيد عبر Li3ib...')}</span>
                      ) : (
                        <>
                          <span>{t('Book a Pitch via Li3ib', 'احجز الملعب عبر Li3ib')}</span>
                          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                        </>
                      )}
                    </button>
                    {isRestricted && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold block text-center">
                        {t('Action disabled: your account is restricted from booking pitches', 'الإجراء معطل: حسابك مقيد من حجز الملاعب')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* DESKTOP & TABLET VIEW (Spacious responsive two-panel layout) */}
            <div className="hidden md:flex flex-1 flex-row overflow-hidden">
              {/* Left Column: Court List */}
              <div className="w-1/2 border-r border-[#B9C9E0] dark:border-[#1F3590] flex flex-col overflow-y-auto p-4 space-y-3">
                {/* Sport Category filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {sports.map(sport => (
                    <button
                      key={sport}
                      onClick={() => setSelectedSport(sport)}
                      className={`px-3 py-1.5 rounded-[5px] text-xs font-bold shrink-0 transition-colors cursor-pointer border ${
                        selectedSport === sport
                          ? 'bg-[#3A60AA] text-white border-[#3A60AA]'
                          : 'bg-white dark:bg-[#0D1C68] border-[#B9C9E0] dark:border-[#1F3590] text-slate-700 dark:text-[#B9C9E0]'
                      }`}
                    >
                      {sport === 'All' ? t('All Sports', 'الكل') : getSportLabel(sport, language)}
                    </button>
                  ))}
                </div>

                {/* Court Cards */}
                <div className="space-y-3">
                  {filteredCourts.map(court => {
                    const isSelected = selectedCourt?.id === court.id;
                    return (
                      <div
                        key={court.id}
                        onClick={() => handleSelectCourt(court)}
                        className={`p-3.5 rounded-[6px] border transition-colors cursor-pointer flex gap-3 ${
                          isSelected 
                            ? 'bg-[#EEF3F9] dark:bg-[#0D1C68] border-[#3A60AA] ring-2 ring-[#3A60AA]/30' 
                            : 'bg-white dark:bg-[#0D1C68] border-slate-200 dark:border-[#1F3590] hover:border-slate-300'
                        }`}
                      >
                        <img 
                          src={court.image} 
                          alt={court.name}
                          className="w-20 h-20 rounded-[4px] object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-[#3A60AA] dark:text-[#B9C9E0] uppercase tracking-wider">
                              {getSportLabel(court.sport, language)}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                              <Star className="w-3 h-3 fill-amber-400" />
                              <span>{court.rating}</span>
                            </div>
                          </div>
                          <h4 className="font-bold text-sm text-[#06135B] dark:text-white truncate">{court.name}</h4>
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-[#B9C9E0]/80 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{getKuwaitAreaLabel(court.area, language)}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs font-bold text-[#06135B] dark:text-white">
                              {court.pricePerHourKWD.toFixed(3)} <span className="text-[10px] text-[#3A60AA] dark:text-[#B9C9E0]">KWD/hr</span>
                            </span>
                            {court.isIndoor && (
                              <span className="text-[10px] font-medium text-[#3A60AA] dark:text-[#B9C9E0] bg-[#EEF3F9] dark:bg-[#142578] px-1.5 py-0.5 rounded-[4px] border border-[#B9C9E0] dark:border-[#1F3590]">
                                {t('Indoor', 'داخلي')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Court Details & Slot Selection */}
              {selectedCourt && (
                <div className="w-1/2 flex flex-col justify-between p-5 overflow-y-auto bg-slate-50 dark:bg-[#0D1C68]">
                  <div className="space-y-4">
                    {/* Banner Image */}
                    <div className="relative h-40 rounded-[6px] overflow-hidden">
                      <img 
                        src={selectedCourt.image} 
                        alt={selectedCourt.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-950/60 flex items-end p-4">
                        <div>
                          <span className="text-xs font-bold text-white bg-[#3A60AA] px-2 py-0.5 rounded-[4px]">
                            {getSportLabel(selectedCourt.sport, language)} • {getKuwaitAreaLabel(selectedCourt.area, language)}
                          </span>
                          <h3 className="text-lg font-bold text-white mt-1">
                            {selectedCourt.name}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Amenities */}
                    <div>
                      <h5 className="text-xs font-bold text-[#06135B] dark:text-white uppercase tracking-wider mb-2">
                        {t('Court Amenities & Features', 'ميزات ومرافق الملعب')}
                      </h5>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCourt.amenities.map((item, idx) => (
                          <span 
                            key={idx}
                            className="text-xs bg-white dark:bg-[#142578] border border-slate-200 dark:border-[#1F3590] text-slate-700 dark:text-[#B9C9E0] px-2.5 py-1 rounded-[4px]"
                          >
                            ✓ {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Select Date */}
                    <div>
                      <h5 className="text-xs font-bold text-[#06135B] dark:text-white uppercase tracking-wider mb-2">
                        {t('Select Date', 'اختر التاريخ')}
                      </h5>
                      <div className="flex items-center gap-2">
                        {['2026-09-25', '2026-09-26', '2026-09-27'].map(d => (
                          <button
                            key={d}
                            onClick={() => setSelectedDate(d)}
                            className={`flex-1 py-2 px-3 rounded-[5px] border text-xs font-semibold transition-colors cursor-pointer ${
                              selectedDate === d
                                ? 'bg-[#3A60AA] text-white border-[#3A60AA] font-bold'
                                : 'bg-white dark:bg-[#142578] text-slate-700 dark:text-[#B9C9E0] border-slate-200 dark:border-[#1F3590] hover:border-slate-300'
                            }`}
                          >
                            {d === '2026-09-25' ? t('Friday, Sep 25', 'الجمعة ٢٥ سبتمبر') : d === '2026-09-26' ? t('Saturday, Sep 26', 'السبت ٢٦ سبتمبر') : t('Sunday, Sep 27', 'الأحد ٢٧ سبتمبر')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Select Time Slot */}
                    <div>
                      <h5 className="text-xs font-bold text-[#06135B] dark:text-white uppercase tracking-wider mb-2">
                        {t('Available Slots (Li3ib Live Feed)', 'الأوقات المتاحة (تحديث مباشر عبر Li3ib)')}
                      </h5>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedCourt.availableSlots.map(slot => {
                          const isSlotSelected = selectedSlotId === slot.id || (!selectedSlotId && slot === selectedCourt.availableSlots[0]);
                          return (
                            <button
                              key={slot.id}
                              onClick={() => setSelectedSlotId(slot.id)}
                              className={`p-2.5 rounded-[5px] border text-left rtl:text-right transition-colors cursor-pointer ${
                                isSlotSelected
                                  ? 'bg-[#EEF3F9] dark:bg-[#142578] border-[#3A60AA] ring-2 ring-[#3A60AA]/30 text-slate-900 dark:text-white'
                                  : 'bg-white dark:bg-[#142578] border-slate-200 dark:border-[#1F3590] text-slate-700 dark:text-[#B9C9E0] hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#06135B] dark:text-white">
                                  {formatTimeRange12Hour(slot.startTime, slot.endTime, language)}
                                </span>
                                {isSlotSelected && <Check className="w-3.5 h-3.5 text-[#3A60AA]" />}
                              </div>
                              <div className="text-[11px] text-[#3A60AA] dark:text-[#B9C9E0] font-semibold mt-1">
                                {slot.priceKWD.toFixed(3)} KWD
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Booking Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-200 dark:border-[#1F3590] flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-[#B9C9E0]/80 uppercase tracking-wider block">
                        {t('Total Court Fee', 'التكلفة الإجمالية')}
                      </span>
                      <span className="text-xl font-bold text-[#06135B] dark:text-white">
                        {(selectedCourt.availableSlots.find(s => s.id === selectedSlotId)?.priceKWD || selectedCourt.availableSlots[0]?.priceKWD || selectedCourt.pricePerHourKWD).toFixed(3)}{' '}
                        <span className="text-xs font-bold text-[#3A60AA] dark:text-[#B9C9E0]">KWD</span>
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-1">
                      <button
                        onClick={handleConfirmLi3ibBooking}
                        disabled={isRestricted || isPrivilegeLoading || isBookingSubmitting}
                        aria-label="Book a Pitch"
                        onKeyDown={(e) => {
                          if (isRestricted || isPrivilegeLoading) {
                            e.preventDefault();
                          }
                        }}
                        className={`w-full py-3 px-4 rounded-[6px] font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                          isRestricted || isPrivilegeLoading
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-60'
                            : 'bg-[#1246DF] hover:bg-[#0e37b3] text-white cursor-pointer disabled:opacity-50'
                        }`}
                      >
                        {isBookingSubmitting ? (
                          <span>{t('Confirming via Li3ib...', 'جارٍ التأكيد عبر Li3ib...')}</span>
                        ) : (
                          <>
                            <span>{t('Book a Pitch via Li3ib', 'احجز الملعب عبر Li3ib')}</span>
                            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                          </>
                        )}
                      </button>
                      {isRestricted && (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold text-right rtl:text-left">
                          {t('Action disabled: your account is restricted from booking pitches', 'الإجراء معطل: حسابك مقيد من حجز الملاعب')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
