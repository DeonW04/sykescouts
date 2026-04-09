import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tent, MapPin, CalendarDays, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import EventDetailPanel from './EventDetailPanel';

export default function LeaderEvents({ sections }) {
  const sectionIds = sections.map(s => s.id);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['leader-mobile-events', sectionIds],
    queryFn: async () => {
      const all = await base44.entities.Event.filter({});
      return all
        .filter(e => e.section_ids?.some(sid => sectionIds.includes(sid)))
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    },
    enabled: sectionIds.length > 0,
  });

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.start_date) >= now);
  const past = events.filter(e => new Date(e.start_date) < now);

  const typeColors = { Camp: 'bg-green-100 text-green-700', 'Day Event': 'bg-blue-100 text-blue-700', Other: 'bg-gray-100 text-gray-600' };

  const [panelEvent, setPanelEvent] = useState(null);

  if (panelEvent) return <EventDetailPanel event={panelEvent} onClose={() => setPanelEvent(null)} />;

  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-[#7413dc] to-[#5c0fb0] px-5 pb-6 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <h1 className="text-2xl font-bold">Events & Camps</h1>
        <p className="text-white/70 text-sm mt-1">{upcoming.length} upcoming</p>
      </div>

      <div className="px-4 py-5">
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-gray-200 border-t-[#7413dc] rounded-full animate-spin" /></div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><Tent className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No events yet</p></div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Upcoming</h2>
                <div className="space-y-3">
                  {upcoming.map(e => (
                   <button key={e.id} onClick={() => setPanelEvent(e)} className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left active:bg-gray-50">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-14 bg-[#7413dc]/10 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-[#7413dc] font-bold text-lg leading-none">{format(new Date(e.start_date), 'd')}</span>
                          <span className="text-[#7413dc]/70 text-[10px] font-medium uppercase">{format(new Date(e.start_date), 'MMM')}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${typeColors[e.type] || typeColors.Other}`}>{e.type}</span>
                          <p className="font-semibold text-gray-900 text-sm leading-snug mt-1">{e.title}</p>
                          {e.location && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location}</p>}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Past Events</h2>
                <div className="space-y-3 opacity-60">
                  {[...past].reverse().map(e => (
                   <button key={e.id} onClick={() => setPanelEvent(e)} className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Tent className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-700 truncate">{e.title}</p>
                          <p className="text-xs text-gray-400">{format(new Date(e.start_date), 'd MMM yyyy')}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}