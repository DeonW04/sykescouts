import React, { useState } from 'react';
import { X, Smartphone, Share } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export default function PWAInstallBanner() {
  const { isMobile, isPWA, isIOS, canInstall, triggerInstallPrompt } = usePWA();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('pwa_banner_dismissed') === '1'; } catch { return false; }
  });

  // Only show on mobile, not in PWA mode, and not dismissed
  if (!isMobile || isPWA || dismissed) return null;
  // Only show if there's something actionable
  if (!isIOS && !canInstall) return null;

  const dismiss = () => {
    try { localStorage.setItem('pwa_banner_dismissed', '1'); } catch {}
    setDismissed(true);
  };

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
      background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b69 100%)',
      borderTop: '1px solid rgba(116,19,220,0.3)',
      padding: '12px 16px 16px',
      display: 'flex', alignItems: 'center', gap: '12px',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
    }}>
      <div style={{ width: '40px', height: '40px', background: 'rgba(116,19,220,0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Smartphone size={20} color="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', color: '#fff', margin: '0 0 2px' }}>Install iScout Basecamp</p>
        {isIOS ? (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.6)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            Tap <Share size={11} style={{ display: 'inline' }} /> then "Add to Home Screen"
          </p>
        ) : (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            Add to your home screen for the best experience
          </p>
        )}
      </div>
      {canInstall && !isIOS && (
        <button
          onClick={triggerInstallPrompt}
          style={{
            background: '#7413dc', color: '#fff', border: 'none', borderRadius: '20px',
            padding: '7px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          Install
        </button>
      )}
      <button
        onClick={dismiss}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
      >
        <X size={18} />
      </button>
    </div>
  );
}