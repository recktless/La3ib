import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SupportModalPortalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabelledBy?: string;
  zIndexClass?: string;
  overlayClassName?: string;
}

/**
 * Universal Support Modal Portal:
 * Renders support modals directly into `document.body` so that backdrops
 * cover 100% of the viewport (including Sidebar, Header, and Bottom Navigation)
 * without being trapped by ancestor positioning, overflow, or animation stacking contexts.
 *
 * Provides:
 * - Full-viewport dark backdrop with subtle blur
 * - Background scroll locking with layout shift compensation
 * - Escape key to close
 * - Backdrop click to close (guarded against clicks originating inside modal content)
 */
export const SupportModalPortal: React.FC<SupportModalPortalProps> = ({
  isOpen,
  onClose,
  children,
  ariaLabelledBy,
  zIndexClass = 'z-[70]',
  overlayClassName = ''
}) => {
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    // Save previous styles
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent layout jitter on desktop
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-[2px] overflow-y-auto animate-fade-in ${overlayClassName}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      onClick={(e) => {
        // Only trigger close when clicking the backdrop itself
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {children}
    </div>,
    document.body
  );
};
