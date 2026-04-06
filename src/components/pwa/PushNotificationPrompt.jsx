import React from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PushNotificationPrompt({ onAllow, onDismiss }) {
  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-start gap-3">
        <div className="w-10 h-10 bg-[#7413dc] rounded-xl flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">Stay in the loop</p>
          <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
            Get notified about upcoming meetings, events, and messages from leaders.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={onAllow}
              className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white text-xs px-4"
            >
              Allow
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="text-gray-500 text-xs"
            >
              Not now
            </Button>
          </div>
        </div>
        <button onClick={onDismiss} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}