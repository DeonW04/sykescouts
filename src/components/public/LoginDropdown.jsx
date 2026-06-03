import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import LoginPanel from './LoginPanel';

/**
 * Desktop: a panel that drops down from below the nav bar, anchored to the right.
 * Mobile: a bottom sheet that slides up from the bottom of the screen.
 * Variant is controlled by the `variant` prop ('desktop' | 'mobile').
 */
export default function LoginDropdown({ open, onClose, variant = 'desktop' }) {
  // Lock body scroll while open on mobile
  useEffect(() => {
    if (open && variant === 'mobile') {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open, variant]);

  if (variant === 'mobile') {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, backdropFilter: 'blur(2px)' }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              style={{
                position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1210,
                background: '#fff', borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
                padding: '12px 22px 32px', boxShadow: '0 -10px 40px rgba(0,0,0,0.18)',
              }}
            >
              {/* Grab handle */}
              <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '14px' }}>
                <div style={{ width: '40px', height: '4px', borderRadius: '4px', background: 'rgba(26,26,46,0.15)' }} />
              </div>
              <button
                onClick={onClose}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(26,26,46,0.05)', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: '#1a1a2e' }}
              >
                <X size={18} />
              </button>
              <LoginPanel onClose={onClose} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop dropdown
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Click-away layer */}
          <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1190 }} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'fixed', top: '92px', right: '24px',
              width: '340px', maxWidth: 'calc(100vw - 48px)', zIndex: 1200,
              background: '#fff', borderRadius: '18px',
              border: '1px solid rgba(116,19,220,0.12)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              padding: '22px',
            }}
          >
            <LoginPanel onClose={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}