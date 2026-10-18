import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Court, SportType, KuwaitArea, CourtBooking } from '../types';
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: Li3ib Co-branding */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-xl">
              <span className="text-xs font-bold text-emerald-400">Li3ib API</span>
              <span className="text-[10px] text-neutral-400">لعيب الكويت</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                {t('Book Court via Li3ib Provider', 'حجز الملاعب عبر منصة Li3ib')}
              </h2>
              <p className="text-xs text-neutral-400">
                {t('Instant reservation across Kuwait premier sports facilities', 'حجز فوري ومباشر في أفضل ملاعب الكويت')}
              </p>
            </div>
          </div>

          <button 
            onClick={handleClose}
            className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prominent Restriction Warning Banner */}
        {isRestricted && (
          <div 
            data-testid="booking-restricted-banner"
            role="alert"
            className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/80 via-neutral-900 to-amber-950/80 border-b-2 border-amber-500/50 shadow-md shadow-amber-950/30 text-amber-100 flex items-start gap-3.5"
          >
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1 space-y-1 text-left rtl:text-right">
              <h3 className="font-black text-sm sm:text-base text-amber-300">
                {t('Booking Restricted', 'الحجز مقيد')}
              </h3>
              <p className="text-xs sm:text-sm text-amber-200/90 leading-relaxed font-medium">
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
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-800">
                {t('Court Confirmed with Li3ib', 'تم تأكيد حجز الملعب مع Li3ib')}
              </span>
              <h3 className="text-2xl font-black text-white mt-3">
                {completedBooking.courtName}
              </h3>
              <p className="text-sm text-neutral-300 mt-1">
                {completedBooking.date} • {completedBooking.startTime} - {completedBooking.endTime}
              </p>
              <p className="text-xs text-neutral-400 font-mono mt-1">
                {t('Booking Reference:', 'رقم الحجز:')} <span className="text-emerald-400 font-bold">{completedBooking.bookingRef}</span>
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between text-neutral-300">
                <span>{t('Sport & Facility:', 'الرياضة والملعب:')}</span>
                <span className="font-bold text-white">{completedBooking.sport} ({completedBooking.area})</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>{t('Total Court Cost:', 'التكلفة الإجمالية للملعب:')}</span>
                <span className="font-bold text-emerald-400 text-sm">{completedBooking.totalCostKWD.toFixed(3)} KWD</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>{t('Provider:', 'مزود الخدمة:')}</span>
                <span>Li3ib Kuwait Reservation Network</span>
              </div>
            </div>

            {/* The Critical Core UX Step: "Want to fill the remaining spots? -> Post this booking for players to join" */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/70 via-neutral-900 to-neutral-950 border-2 border-emerald-500/40 text-left space-y-3 shadow-xl shadow-emerald-950/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                <h4 className="font-bold text-white text-sm">
                  {t('Want to fill the remaining spots & split the cost?', 'تريد إكمال العدد وتقاسم تكلفة الملعب؟')}
                </h4>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
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
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                    isRestricted || isPrivilegeLoading
                      ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed opacity-60 shadow-none'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-neutral-950 shadow-lg shadow-emerald-500/25 cursor-pointer transform active:scale-98'
                  }`}
                >
                  <Share2 className="w-4 h-4" />
                  <span>{t('Post Booking for Players to Join', 'انشر الحجز لفتح انضمام اللاعبين')}</span>
                </button>
                {isRestricted && (
                  <p className="text-[11px] text-amber-400 font-semibold text-center">
                    {t('Action disabled: your account is restricted from organizing games', 'الإجراء معطل: حسابك مقيد من تنظيم المباريات')}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleClose}
              className="text-xs text-neutral-400 hover:text-white underline"
            >
              {t('Keep as private booking and close', 'الاحتفاظ به كحجز خاص والإغلاق')}
            </button>
          </div>
        ) : (
          /* Normal Browsing & Booking Interface */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Column: Court List */}
            <div className="w-full md:w-1/2 border-r border-neutral-800 flex flex-col overflow-y-auto p-4 space-y-3">
              {/* Sport Category filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                {sports.map(sport => (
                  <button
                    key={sport}
                    onClick={() => setSelectedSport(sport)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${
                      selectedSport === sport
                        ? 'bg-emerald-500 text-neutral-950'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {sport === 'All' ? t('All Sports', 'الكل') : sport}
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
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex gap-3 ${
                        isSelected 
                          ? 'bg-neutral-800/90 border-emerald-500 ring-1 ring-emerald-500' 
                          : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <img 
                        src={court.image} 
                        alt={court.name}
                        className="w-20 h-20 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                            {court.sport}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{court.rating}</span>
                          </div>
                        </div>
                        <h4 className="font-bold text-sm text-white truncate">{court.name}</h4>
                        <div className="flex items-center gap-1 text-xs text-neutral-400 mt-0.5">
                          <MapPin className="w-3 h-3 text-neutral-500 shrink-0" />
                          <span className="truncate">{court.area}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs font-bold text-white">
                            {court.pricePerHourKWD.toFixed(3)} <span className="text-[10px] text-emerald-400">KWD/hr</span>
                          </span>
                          {court.isIndoor && (
                            <span className="text-[10px] font-medium text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-900/60">
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
              <div className="w-full md:w-1/2 flex flex-col justify-between p-5 overflow-y-auto bg-neutral-950/50">
                <div className="space-y-4">
                  {/* Banner Image */}
                  <div className="relative h-40 rounded-2xl overflow-hidden">
                    <img 
                      src={selectedCourt.image} 
                      alt={selectedCourt.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                      <div>
                        <span className="text-xs font-bold text-emerald-400 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                          {selectedCourt.sport} • {selectedCourt.area}
                        </span>
                        <h3 className="text-lg font-black text-white mt-1">
                          {selectedCourt.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div>
                    <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                      {t('Court Amenities & Features', 'ميزات ومرافق الملعب')}
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCourt.amenities.map((item, idx) => (
                        <span 
                          key={idx}
                          className="text-xs bg-neutral-900 border border-neutral-800 text-neutral-300 px-2.5 py-1 rounded-lg"
                        >
                          ✓ {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Select Date */}
                  <div>
                    <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                      {t('Select Date', 'اختر التاريخ')}
                    </h5>
                    <div className="flex items-center gap-2">
                      {['2026-09-25', '2026-09-26', '2026-09-27'].map(d => (
                        <button
                          key={d}
                          onClick={() => setSelectedDate(d)}
                          className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                            selectedDate === d
                              ? 'bg-emerald-500 text-neutral-950 border-emerald-500 font-bold'
                              : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                          }`}
                        >
                          {d === '2026-09-25' ? t('Friday, Sep 25', 'الجمعة ٢٥ سبتمبر') : d === '2026-09-26' ? t('Saturday, Sep 26', 'السبت ٢٦ سبتمبر') : t('Sunday, Sep 27', 'الأحد ٢٧ سبتمبر')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Select Time Slot */}
                  <div>
                    <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                      {t('Available Slots (Li3ib Live Feed)', 'الأوقات المتاحة (تحديث مباشر عبر Li3ib)')}
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedCourt.availableSlots.map(slot => {
                        const isSlotSelected = selectedSlotId === slot.id;
                        return (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlotId(slot.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isSlotSelected
                                ? 'bg-emerald-950/80 border-emerald-500 text-white ring-1 ring-emerald-500'
                                : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">
                                {slot.startTime} – {slot.endTime}
                              </span>
                              {isSlotSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </div>
                            <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                              {slot.priceKWD.toFixed(3)} KWD
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Booking Footer */}
                <div className="pt-4 mt-4 border-t border-neutral-800 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                      {t('Total Court Fee', 'التكلفة الإجمالية')}
                    </span>
                    <span className="text-xl font-black text-white">
                      {(selectedCourt.availableSlots.find(s => s.id === selectedSlotId)?.priceKWD || selectedCourt.availableSlots[0]?.priceKWD || selectedCourt.pricePerHourKWD).toFixed(3)}{' '}
                      <span className="text-xs font-bold text-emerald-400">KWD</span>
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
                      className={`w-full py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                        isRestricted || isPrivilegeLoading
                          ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed opacity-60 shadow-none'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 shadow-lg shadow-emerald-500/20 cursor-pointer transform active:scale-98 disabled:opacity-50'
                      }`}
                    >
                      {isBookingSubmitting ? (
                        <span className="animate-pulse">{t('Confirming via Li3ib...', 'جاري التأكيد عبر Li3ib...')}</span>
                      ) : (
                        <>
                          <span>{t('Book a Pitch via Li3ib', 'احجز الملعب عبر Li3ib')}</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    {isRestricted && (
                      <span className="text-[11px] text-amber-400 font-semibold text-right rtl:text-left">
                        {t('Action disabled: your account is restricted from booking pitches', 'الإجراء معطل: حسابك مقيد من حجز الملاعب')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
