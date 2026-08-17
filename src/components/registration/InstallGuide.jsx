import React from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Share2, Smartphone, Monitor, Download } from 'lucide-react';

// Device-specific "install the app" guidance shown on the registration complete screen.
export default function InstallGuide({ variant = 'light' }) {
  const { isMobile, isPWA, isIOS, canInstall, triggerInstallPrompt } = usePWA();

  if (isPWA) return null; // already running as an installed app

  const textClass = variant === 'light' ? 'text-white' : 'text-gray-900';
  const subTextClass = variant === 'light' ? 'text-white/70' : 'text-gray-500';
  const cardClass = variant === 'light' ? 'bg-white/10 border-white/20' : 'bg-gray-50 border-gray-100';

  if (isMobile && isIOS) {
    return (
      <div className={`rounded-2xl border p-4 text-left ${cardClass}`}>
        <p className={`text-sm font-bold mb-2 flex items-center gap-2 ${textClass}`}>
          <Smartphone className="w-4 h-4" /> Install the app
        </p>
        <ol className={`text-xs space-y-1.5 ${subTextClass}`}>
          <li className="flex items-center gap-1.5">1. Tap the <Share2 className="w-3.5 h-3.5" /> Share icon in Safari</li>
          <li>2. Scroll down and tap "Add to Home Screen"</li>
          <li>3. Tap "Add" — you're all set!</li>
        </ol>
      </div>
    );
  }

  if (isMobile && canInstall) {
    return (
      <div className={`rounded-2xl border p-4 text-left ${cardClass}`}>
        <p className={`text-sm font-bold mb-2 flex items-center gap-2 ${textClass}`}>
          <Smartphone className="w-4 h-4" /> Install the app
        </p>
        <p className={`text-xs mb-3 ${subTextClass}`}>Add the app to your home screen for quick access.</p>
        <button
          onClick={triggerInstallPrompt}
          className="w-full bg-white text-[#7413dc] font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" /> Install App
        </button>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className={`rounded-2xl border p-4 text-left ${cardClass}`}>
        <p className={`text-sm font-bold mb-2 flex items-center gap-2 ${textClass}`}>
          <Smartphone className="w-4 h-4" /> Install the app
        </p>
        <p className={`text-xs ${subTextClass}`}>Open your browser menu and choose "Add to Home Screen" for quick access next time.</p>
      </div>
    );
  }

  // Desktop — offer a QR code to continue setup on a phone
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(window.location.origin + '/app')}`;
  return (
    <div className={`rounded-2xl border p-4 text-left flex items-center gap-4 ${cardClass}`}>
      <img src={qrUrl} alt="Scan to install the app" className="w-20 h-20 rounded-lg bg-white p-1 flex-shrink-0" />
      <div>
        <p className={`text-sm font-bold mb-1 flex items-center gap-2 ${textClass}`}>
          <Monitor className="w-4 h-4" /> Get the mobile app
        </p>
        <p className={`text-xs ${subTextClass}`}>Scan this with your phone's camera to install the app for quick access on the go.</p>
      </div>
    </div>
  );
}