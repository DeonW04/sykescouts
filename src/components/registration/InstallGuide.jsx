import React from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Share2, Plus, Download, Smartphone, QrCode, CheckCircle2 } from 'lucide-react';

function StepCard({ num, icon: Icon, title, text, wide }) {
  return (
    <div className={`bg-gray-50 border border-gray-100 rounded-2xl p-5 text-left ${wide ? 'sm:col-span-3' : ''}`}>
      <div className="w-8 h-8 rounded-lg bg-[#7413dc]/10 text-[#7413dc] flex items-center justify-center font-bold text-sm mb-3">
        {num}
      </div>
      <p className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#7413dc]" /> {title}
      </p>
      <p className="text-xs text-gray-500 leading-relaxed">{text}</p>
    </div>
  );
}

// Full-width, device-adaptive walkthrough for installing the PWA.
export default function InstallGuide() {
  const { isPWA, isMobile, isIOS, canInstall, triggerInstallPrompt } = usePWA();

  if (isPWA) return null; // already running as an installed app

  if (isMobile && isIOS) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StepCard num={1} icon={Share2} title="Tap Share" text="Tap the Share icon in Safari's toolbar." />
        <StepCard num={2} icon={Plus} title="Add to Home Screen" text='Scroll down and tap "Add to Home Screen".' />
        <StepCard num={3} icon={CheckCircle2} title="Tap Add" text="Confirm and you're all set — the app icon appears on your home screen." />
      </div>
    );
  }

  if (isMobile && canInstall) {
    return (
      <div className="text-center space-y-4">
        <StepCard num={1} icon={Download} title="One-tap install" text="Install the app for quick access, just like a native app." wide />
        <button
          onClick={triggerInstallPrompt}
          className="bg-[#7413dc] text-white font-bold text-base py-3.5 px-8 rounded-2xl inline-flex items-center gap-2"
        >
          <Download className="w-5 h-5" /> Install App
        </button>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <StepCard num={1} icon={Smartphone} title="Add to Home Screen" text='Open your browser menu and choose "Add to Home Screen" for quick access next time.' wide />
      </div>
    );
  }

  // Desktop — QR code alongside the steps to continue setup on a phone
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/app')}`;
  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center">
      <img src={qrUrl} alt="Scan to install the app" className="w-40 h-40 rounded-2xl border border-gray-100 p-2 bg-white mx-auto flex-shrink-0" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StepCard num={1} icon={Smartphone} title="Open your camera" text="Use your phone's camera app — no extra scanner needed." />
        <StepCard num={2} icon={QrCode} title="Scan the code" text="Point your camera at the QR code shown here." />
        <StepCard num={3} icon={Download} title="Add to home screen" text="Follow the prompt to install the app on your phone." />
      </div>
    </div>
  );
}