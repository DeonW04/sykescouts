import React from 'react';
import { Radio, ChevronRight } from 'lucide-react';

export default function OngoingSessionBanner({ session, onClick }) {
  if (!session) return null;

  const isEvent = session.type === 'event';
  const bg = isEvent
    ? 'from-[#7413dc] to-[#4c0fa8]'
    : 'from-[#004851] to-[#006b7a]';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r ${bg} text-left z-30 relative`}
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}
    >
      {/* Pulsing dot */}
      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-white/20 rounded-full">
        <Radio className="w-4 h-4 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
          <p className="text-white font-bold text-sm">
            {isEvent ? '🏕️ Event Happening Now' : '📍 Meeting in Progress'}
          </p>
        </div>
        <p className="text-white/70 text-xs truncate mt-0.5">
          {session.data.title} — tap to view live info
        </p>
      </div>

      <ChevronRight className="w-4 h-4 text-white/60 flex-shrink-0" />
    </button>
  );
}