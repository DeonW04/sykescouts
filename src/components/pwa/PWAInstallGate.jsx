import React from 'react';
import { Smartphone, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PWAInstallGate({ isIOS, canInstall, onInstall }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#004851] via-[#7413dc] to-[#5c0fb0] flex flex-col items-center justify-center px-6 text-white">
      {/* Scout logo area */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/30">
          <Smartphone className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-center">iScout Basecamp</h1>
        <p className="text-white/70 text-sm mt-1 text-center">40th Rochdale (Syke) Scouts</p>
      </div>

      <div className="bg-white/15 backdrop-blur-md rounded-3xl p-6 border border-white/20 w-full max-w-sm">
        <h2 className="text-xl font-bold text-center mb-2">Add to Home Screen</h2>
        <p className="text-white/80 text-sm text-center mb-6 leading-relaxed">
          For the best experience, please install this app on your home screen before continuing.
        </p>

        {isIOS ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-white/10 rounded-2xl p-4">
              <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
              <div>
                <p className="font-semibold text-sm">Tap the Share button</p>
                <div className="flex items-center gap-1 mt-1 text-white/70 text-xs">
                  <span>Look for the</span>
                  <Share className="w-3.5 h-3.5" />
                  <span>icon in Safari's toolbar</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white/10 rounded-2xl p-4">
              <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
              <div>
                <p className="font-semibold text-sm">Tap "Add to Home Screen"</p>
                <div className="flex items-center gap-1 mt-1 text-white/70 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Scroll down to find this option</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white/10 rounded-2xl p-4">
              <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
              <div>
                <p className="font-semibold text-sm">Tap "Add"</p>
                <p className="text-white/70 text-xs mt-1">Then open the app from your home screen</p>
              </div>
            </div>
          </div>
        ) : canInstall ? (
          <div className="space-y-4">
            <p className="text-white/80 text-sm text-center">
              Tap the button below to install iScout Basecamp on your device.
            </p>
            <Button
              onClick={onInstall}
              className="w-full bg-white text-[#7413dc] hover:bg-white/90 font-bold py-4 rounded-2xl text-base"
            >
              Install App
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-white/80 text-center">
            <p>To install this app:</p>
            <p>Open this page in <strong>Chrome</strong> on Android, then tap the menu (⋮) and select <strong>"Add to Home screen"</strong>.</p>
          </div>
        )}
      </div>

      <p className="mt-6 text-white/50 text-xs text-center max-w-xs">
        This app must be accessed from your home screen. Once installed, tap the icon to get started.
      </p>
    </div>
  );
}