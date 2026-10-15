import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  CreditCard, 
  Check, 
  ShieldCheck, 
  Lock, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Sparkles,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

const KUWAIT_BANKS = [
  { id: 'nbk', name: 'NBK (الوطني)', color: 'from-blue-700 to-blue-900' },
  { id: 'kfh', name: 'KFH (بيتك)', color: 'from-emerald-700 to-emerald-900' },
  { id: 'boubyan', name: 'Boubyan (بوبيان)', color: 'from-sky-600 to-sky-800' },
  { id: 'gulf', name: 'Gulf Bank (الخليج)', color: 'from-amber-600 to-amber-800' },
  { id: 'burgan', name: 'Burgan (برقان)', color: 'from-indigo-700 to-indigo-900' },
  { id: 'cbk', name: 'Commercial (التجاري)', color: 'from-red-700 to-red-900' },
];

export const JoinPaymentModal: React.FC = () => {
  const { 
    selectedGameForJoin, 
    setSelectedGameForJoin, 
    setSelectedGameForDetail,
    joinGame, 
    currentUser,
    t 
  } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<'KNET' | 'Apple Pay' | 'Credit Card'>('KNET');
  const [selectedBank, setSelectedBank] = useState('nbk');
  const [cardNumber, setCardNumber] = useState('4152 8820 •••• 9104');
  const [pinNumber, setPinNumber] = useState('••••');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!selectedGameForJoin) return null;

  const game = selectedGameForJoin;
  const spotsLeft = game.maxPlayers - game.participants.length;

  const handlePayAndJoin = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      // Simulate fast payment authorization
      await new Promise(res => setTimeout(res, 600));
      const ok = await joinGame(game.id, paymentMethod);
      if (ok) {
        setPaymentSuccess(true);
        setTimeout(() => {
          setSelectedGameForDetail(game);
          setSelectedGameForJoin(null);
          setPaymentSuccess(false);
        }, 1200);
      }
    } catch (err: any) {
      console.error('[JoinPaymentModal] Join failed:', err);
      const msg = err?.message || 'Failed to join game. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedGameForJoin(null);
    setPaymentSuccess(false);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base font-extrabold text-white">
              {t('Confirm Spot & Pay Share', 'تأكيد المقعد ودفع الحصة')}
            </h2>
          </div>
          <button 
            onClick={handleClose}
            className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {paymentSuccess ? (
          /* Payment Success View */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className="text-xl font-black text-white">
              {t('Payment Confirmed! Spot Reserved ✓', 'تم تأكيد الدفع وحجز مقعدك بنجاح ✓')}
            </h3>
            <p className="text-xs text-neutral-300">
              {t(
                `Paid ${game.pricePerPlayerKWD.toFixed(3)} KWD via ${paymentMethod}. You've been added to the match roster and game chat.`,
                `تم سداد ${game.pricePerPlayerKWD.toFixed(3)} د.ك عبر ${paymentMethod}. تم إضافتك لقائمة اللاعبين وشات المباراة.`
              )}
            </p>
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-emerald-400 font-mono">
              Transaction Ref: #KNET-{Math.floor(100000 + Math.random() * 900000)}
            </div>
          </div>
        ) : (
          /* Payment Form */
          <div className="p-6 space-y-5">
            {/* Game Snapshot Card */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-emerald-400">
                  {game.sport} • {game.skillLevel}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  {spotsLeft} {t('spots left', 'أماكن متبقية')}
                </span>
              </div>

              <h3 className="text-lg font-black text-white">{game.title}</h3>

              <div className="text-xs text-neutral-400 space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-neutral-200">{game.date}</span>
                  <span>•</span>
                  <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{game.startTime} - {game.endTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-neutral-200">{game.courtName}</span>
                  <span className="text-emerald-400">({game.area})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{t('Host:', 'المنظم:')} {game.organizer.name}</span>
                </div>
              </div>

              {/* Exact Share Callout */}
              <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300 uppercase">
                  {t('Your Exact Share:', 'حصتك المطلوبة:')}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-emerald-400">
                    {game.pricePerPlayerKWD.toFixed(3)}
                  </span>
                  <span className="text-xs font-bold text-white">KWD</span>
                </div>
              </div>
            </div>

            {/* Error Message Callout */}
            {errorMessage && (
              <div className="p-3.5 bg-red-950/80 border border-red-800 rounded-2xl flex items-start gap-2.5 text-xs text-red-300 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-red-200">{t('Unable to Join Match', 'تعذر الانضمام للمباراة')}</p>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                {t('Select Payment Method (Kuwait)', 'اختر طريقة الدفع (الكويت)')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('KNET')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    paymentMethod === 'KNET'
                      ? 'bg-emerald-950/80 border-emerald-500 text-white ring-1 ring-emerald-500'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <span className="text-xs font-black block text-emerald-400">KNET</span>
                  <span className="text-[10px] text-neutral-400">كي نت الوطنية</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('Apple Pay')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    paymentMethod === 'Apple Pay'
                      ? 'bg-neutral-800 border-white text-white ring-1 ring-white'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <span className="text-xs font-bold block text-white"> Apple Pay</span>
                  <span className="text-[10px] text-neutral-400">دفع سريع بلمسة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('Credit Card')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    paymentMethod === 'Credit Card'
                      ? 'bg-neutral-800 border-emerald-500 text-white ring-1 ring-emerald-500'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <span className="text-xs font-bold block text-white">Credit Card</span>
                  <span className="text-[10px] text-neutral-400">فيزا / ماستركارد</span>
                </button>
              </div>
            </div>

            {/* KNET Bank Selector Simulator */}
            {paymentMethod === 'KNET' && (
              <div className="space-y-3 bg-neutral-950 p-3.5 rounded-2xl border border-neutral-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-300">{t('Select Bank:', 'اختر البنك:')}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">KNET Gateway 256-bit</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {KUWAIT_BANKS.map(bank => (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => setSelectedBank(bank.id)}
                      className={`p-2 rounded-xl text-center border text-[11px] font-bold transition-all ${
                        selectedBank === bank.id
                          ? 'bg-emerald-500 text-neutral-950 border-emerald-400'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      {bank.name}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                  <div>
                    <span className="text-[10px] text-neutral-500 block">{t('Debit Card Number', 'رقم البطاقة')}</span>
                    <input 
                      type="text" 
                      value={cardNumber} 
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">{t('PIN Code', 'الرقم السري')}</span>
                    <input 
                      type="password" 
                      value={pinNumber}
                      onChange={(e) => setPinNumber(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'Apple Pay' && (
              <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 text-center space-y-2">
                <span className="text-2xl"></span>
                <p className="text-xs text-neutral-300">
                  {t('Double-click side button or use Face ID to confirm', 'اضغط مرتين أو استخدم بصمة الوجه للتأكيد')}
                </p>
                <p className="text-[11px] text-emerald-400 font-medium">NBK Shabab Card •••• 9104</p>
              </div>
            )}

            {/* Refund and Cancellation Disclaimer */}
            <div className="flex items-start gap-2 text-[11px] text-neutral-400 bg-neutral-950/70 p-3 rounded-xl border border-neutral-800/80">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-neutral-300">
                  {t('Automatic Split & Cancellation Protection', 'حماية الدفع وتقاسم التكلفة الآلي')}
                </p>
                <p className="text-neutral-400 mt-0.5">
                  {game.cancellationPolicy}
                </p>
              </div>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePayAndJoin}
              disabled={isProcessing}
              className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-neutral-950 font-black text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-transform transform active:scale-98 disabled:opacity-50"
            >
              {isProcessing ? (
                <span className="animate-pulse">{t('Processing Payment via KNET...', 'جاري معالجة الدفع عبر كي نت...')}</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>
                    {t('Pay', 'دفع')} {game.pricePerPlayerKWD.toFixed(3)} KWD & {t('Join Game', 'تأكيد الانضمام')}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
