import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, X, Check } from 'lucide-react';
import { formatTime12Hour } from '../types';

export interface WheelTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string; // 24-hour "HH:mm" e.g. "20:00"
  onChange: (time24: string) => void;
  title?: string;
  language?: string;
  t?: (en: string, ar: string) => string;
}

const ITEM_HEIGHT = 44; // 44px per item (standard Apple touch target)
const VISIBLE_COUNT = 5; // 5 visible rows: 2 above, 1 selected, 2 below

interface WheelColumnProps<T> {
  items: T[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  renderLabel: (item: T, isSelected: boolean) => React.ReactNode;
  ariaLabel: string;
}

function WheelColumn<T>({
  items,
  selectedIndex,
  onSelect,
  renderLabel,
  ariaLabel
}: WheelColumnProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to selected item on mount or external index change
  useEffect(() => {
    if (!containerRef.current) return;
    const targetTop = selectedIndex * ITEM_HEIGHT;
    if (Math.abs(containerRef.current.scrollTop - targetTop) > 2) {
      containerRef.current.scrollTo({
        top: targetTop,
        behavior: isUserScrollingRef.current ? 'auto' : 'smooth'
      });
    }
  }, [selectedIndex]);

  // Handle scroll snap settling
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    isUserScrollingRef.current = true;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const nearestIndex = Math.min(
        items.length - 1,
        Math.max(0, Math.round(scrollTop / ITEM_HEIGHT))
      );

      // Snap precisely to item height
      const targetTop = nearestIndex * ITEM_HEIGHT;
      if (Math.abs(containerRef.current.scrollTop - targetTop) > 1) {
        containerRef.current.scrollTo({
          top: targetTop,
          behavior: 'smooth'
        });
      }

      onSelect(nearestIndex);
      isUserScrollingRef.current = false;
    }, 70);
  }, [items.length, onSelect]);

  const handleItemClick = (index: number) => {
    if (!containerRef.current) return;
    onSelect(index);
    containerRef.current.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: 'smooth'
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (selectedIndex > 0) handleItemClick(selectedIndex - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (selectedIndex < items.length - 1) handleItemClick(selectedIndex + 1);
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label={ariaLabel}
      className="relative flex-1 h-[220px] overflow-y-auto scroll-smooth focus:outline-none select-none scrollbar-none"
      style={{
        scrollSnapType: 'y mandatory',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
    >
      {/* Top spacer (2 empty rows to center the first item) */}
      <div style={{ height: ITEM_HEIGHT * 2 }} aria-hidden="true" />

      {/* Actual interactive items */}
      {items.map((item, index) => {
        const distance = Math.abs(index - selectedIndex);
        const isSelected = distance === 0;

        // Visual depth: fade and scale adjacent items
        let opacityClass = 'opacity-20 scale-90';
        if (distance === 0) {
          opacityClass = 'opacity-100 scale-100 font-extrabold';
        } else if (distance === 1) {
          opacityClass = 'opacity-60 scale-95 font-medium';
        }

        return (
          <div
            key={index}
            role="option"
            aria-selected={isSelected}
            onClick={() => handleItemClick(index)}
            style={{
              height: ITEM_HEIGHT,
              scrollSnapAlign: 'center',
              scrollSnapStop: 'always'
            }}
            className={`flex items-center justify-center cursor-pointer transition-all duration-100 text-slate-900 dark:text-white ${opacityClass}`}
          >
            {renderLabel(item, isSelected)}
          </div>
        );
      })}

      {/* Bottom spacer (2 empty rows to center the last item) */}
      <div style={{ height: ITEM_HEIGHT * 2 }} aria-hidden="true" />
    </div>
  );
}

export const WheelTimePickerModal: React.FC<WheelTimePickerModalProps> = ({
  isOpen,
  onClose,
  value,
  onChange,
  title,
  language = 'en',
  t = (en: string) => en
}) => {
  // Available values
  const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods: ('AM' | 'PM')[] = ['AM', 'PM'];

  // Helper to parse 24-hour time string into 12-hour components
  const parseTime = (val?: string) => {
    const parts = (val || '20:00').split(':');
    let h = parseInt(parts[0], 10);
    if (isNaN(h)) h = 20;
    let m = parseInt(parts[1], 10);
    if (isNaN(m)) m = 0;

    const p: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;

    return {
      hour: h12,
      minute: Math.min(59, Math.max(0, m)),
      period: p
    };
  };

  // Temporary picker state initialized directly from value prop
  const [selectedHour, setSelectedHour] = useState<number>(() => parseTime(value).hour);
  const [selectedMinute, setSelectedMinute] = useState<number>(() => parseTime(value).minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(() => parseTime(value).period);

  // Sync state if value prop changes while opening
  useEffect(() => {
    if (isOpen) {
      const parsed = parseTime(value);
      setSelectedHour(parsed.hour);
      setSelectedMinute(parsed.minute);
      setSelectedPeriod(parsed.period);
    }
  }, [isOpen, value]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Compute live 24-hour and 12-hour formatted preview strings
  const getCalculatedTime24 = () => {
    let h24 = selectedHour;
    if (selectedPeriod === 'AM') {
      if (h24 === 12) h24 = 0;
    } else {
      if (h24 !== 12) h24 += 12;
    }
    const safeM = Math.min(59, Math.max(0, selectedMinute));
    return `${String(h24).padStart(2, '0')}:${String(safeM).padStart(2, '0')}`;
  };

  const previewTime24 = getCalculatedTime24();
  const previewFormatted = formatTime12Hour(previewTime24, language as 'en' | 'ar');

  const handleDone = () => {
    onChange(previewTime24);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const isRtl = language === 'ar';

  return (
    <div
      className="fixed inset-0 z-70 flex flex-col justify-end sm:justify-center sm:items-center bg-slate-950/60 backdrop-blur-xs select-none p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wheel-time-picker-title"
    >
      {/* Modal / Bottom Sheet Card */}
      <div
        className="w-full sm:max-w-xs bg-white dark:bg-[#06135B] border-t sm:border border-[#B9C9E0] dark:border-[#1F3590] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden pb-safe flex flex-col transition-all duration-200 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Indicator */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden" />

        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2.5 border-b border-[#B9C9E0]/40 dark:border-[#1F3590]/60">
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-[#B9C9E0] dark:hover:text-white transition-colors cursor-pointer py-1 px-2 -ml-2 rtl:-ml-0 rtl:-mr-2 rounded-lg"
          >
            {t('Cancel', 'إلغاء')}
          </button>

          <div className="flex items-center gap-1.5 text-center min-w-0 px-2">
            <Clock className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
            <h3
              id="wheel-time-picker-title"
              className="text-xs font-bold text-[#06135B] dark:text-white truncate"
            >
              {title || t('Select Time', 'تحديد الوقت')}
            </h3>
          </div>

          <button
            type="button"
            onClick={handleDone}
            className="text-xs font-bold text-[#3A60AA] hover:text-[#2E4D8A] dark:text-[#B9C9E0] dark:hover:text-white transition-colors cursor-pointer py-1 px-2.5 -mr-2 rtl:-mr-0 rtl:-ml-2 rounded-lg bg-[#EEF3F9] dark:bg-[#142578] border border-[#B9C9E0]/60 dark:border-[#1F3590]"
          >
            {t('Done', 'تأكيد')}
          </button>
        </div>

        {/* Live Formatted Digital Preview Bar */}
        <div className="bg-[#EEF3F9] dark:bg-[#0D1C68] py-2 px-4 text-center border-b border-[#B9C9E0]/40 dark:border-[#1F3590]/50">
          <span className="text-xl sm:text-2xl font-black text-[#06135B] dark:text-white tracking-tight">
            {previewFormatted}
          </span>
        </div>

        {/* Wheels Container:
            Always set dir="ltr" on the 3 columns so the sequence is strictly:
            [ Hour ] : [ Minute ] [ AM/PM ]
            regardless of UI language (Arabic or English), avoiding backwards time wheels.
        */}
        <div className="relative p-3 bg-white dark:bg-[#06135B]" dir="ltr">
          {/* Centered Selection Bar Highlight (covers the active row across all wheels) */}
          <div
            className="absolute inset-x-3 pointer-events-none rounded-xl bg-[#3A60AA]/10 dark:bg-[#142578]/60 border border-[#3A60AA]/30 dark:border-[#B9C9E0]/40 shadow-xs z-0"
            style={{
              top: 12 + ITEM_HEIGHT * 2, // 12px container top padding + 2 items offset (88px)
              height: ITEM_HEIGHT
            }}
          />

          {/* Top Fade Gradient Mask */}
          <div className="absolute top-3 inset-x-3 h-14 bg-gradient-to-b from-white dark:from-[#06135B] via-white/80 dark:via-[#06135B]/80 to-transparent pointer-events-none z-10" />

          {/* Bottom Fade Gradient Mask */}
          <div className="absolute bottom-3 inset-x-3 h-14 bg-gradient-to-t from-white dark:from-[#06135B] via-white/80 dark:via-[#06135B]/80 to-transparent pointer-events-none z-10" />

          {/* The 3 Wheels Grid */}
          <div className="flex items-center justify-center gap-1 relative z-2">
            {/* 1. Hour Column (1 - 12) */}
            <WheelColumn
              items={hours}
              selectedIndex={hours.indexOf(selectedHour)}
              onSelect={(index) => setSelectedHour(hours[index])}
              renderLabel={(hour, isSelected) => (
                <span className={isSelected ? 'text-xl font-black' : 'text-base font-medium'}>
                  {hour}
                </span>
              )}
              ariaLabel={t('Hour', 'الساعة')}
            />

            {/* Colon Separator */}
            <div className="h-[220px] flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold text-lg px-0.5 pointer-events-none select-none z-2">
              :
            </div>

            {/* 2. Minute Column (00 - 59) */}
            <WheelColumn
              items={minutes}
              selectedIndex={selectedMinute}
              onSelect={(index) => setSelectedMinute(minutes[index])}
              renderLabel={(minute, isSelected) => (
                <span className={isSelected ? 'text-xl font-black' : 'text-base font-medium'}>
                  {String(minute).padStart(2, '0')}
                </span>
              )}
              ariaLabel={t('Minute', 'الدقيقة')}
            />

            {/* 3. Period Column (AM / PM) */}
            <WheelColumn
              items={periods}
              selectedIndex={periods.indexOf(selectedPeriod)}
              onSelect={(index) => setSelectedPeriod(periods[index])}
              renderLabel={(period, isSelected) => (
                <span className={isSelected ? 'text-base font-black' : 'text-xs font-semibold'}>
                  {period === 'AM'
                    ? language === 'ar' ? 'ص' : 'AM'
                    : language === 'ar' ? 'م' : 'PM'}
                </span>
              )}
              ariaLabel={t('Period', 'الفترة')}
            />
          </div>
        </div>

        {/* Bottom Confirmation Button Bar */}
        <div className="p-3 bg-slate-50 dark:bg-[#0D1C68] border-t border-[#B9C9E0]/40 dark:border-[#1F3590]/50 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#142578] transition-colors cursor-pointer"
          >
            {t('Cancel', 'إلغاء')}
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="flex-1 py-2 rounded-xl bg-[#3A60AA] hover:bg-[#2E4D8A] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t('Set Time', 'تأكيد الوقت')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
