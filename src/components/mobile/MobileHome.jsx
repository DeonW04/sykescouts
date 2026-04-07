import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, Tent, Award, ChevronRight, Clock } from 'lucide-react';
import { format, isThisWeek, startOfWeek, endOfWeek } from 'date-fns';
import ActionRequiredCard from './ActionRequiredCard';

export default function MobileHome({ user, children, onTabChange }) {
  const childSectionIds = [...new Set(children.map(c => c.section_id).filter(Boolean))];

  const { data: programmes = [] } = useQuery({
    queryKey: ['mobile-home-programmes', childSectionIds],
    queryFn: () => base44.entities.Programme.filter({ shown_in_portal: true }),
    enabled: childSectionIds.length > 0,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['mobile-home-events', childSectionIds],
    queryFn: async () => {
      const all = await base44.entities.Event.filter({ published: true });
      return all.filter(e => e.section_ids?.some(sid => childSectionIds.includes(sid)));
    },
    enabled: childSectionIds.length > 0,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const thisWeekMeetings = programmes.filter(p => {
    const d = new Date(p.date);
    return d >= weekStart && d <= weekEnd && childSectionIds.includes(p.section_id);
  });

  const upcomingEvents = events
    .filter(e => new Date(e.start_date) >= now)
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 3);

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  const getChildSection = (child) => sections.find(s => s.id === child.section_id);

  const sectionColors = {
    squirrels: 'bg-red-500',
    beavers: 'bg-blue-500',
    cubs: 'bg-yellow-500',
    scouts: 'bg-green-600',
    explorers: 'bg-purple-600',
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7413dc] to-[#5c0fb0] px-5 pt-16 pb-8 text-white">
        <p className="text-white/70 text-sm">Welcome back,</p>
        <h1 className="text-2xl font-bold">{firstName} 👋</h1>
        <div className="flex gap-2 mt-3 flex-wrap">
          {children.map(child => {
            const sec = getChildSection(child);
            const colorClass = sectionColors[sec?.name] || 'bg-gray-500';
            return (
              <div key={child.id} className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
                <div className={`w-2 h-2 rounded-full ${colorClass}`} />
                <span className="text-xs font-medium">{child.preferred_name || child.first_name}</span>
                {sec && <span className="text-white/60 text-xs capitalize">· {sec.display_name || sec.name}</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Action Required */}
        <ActionRequiredCard children={children} />

        {/* This Week's Meeting */}
        {thisWeekMeetings.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">This Week's Meeting</h2>
            </div>
            {thisWeekMeetings.map(prog => {
              const sec = sections.find(s => s.id === prog.section_id);
              return (
                <div key={prog.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-12 bg-[#7413dc]/10 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[#7413dc] font-bold text-base leading-none">{format(new Date(prog.date), 'd')}</span>
                      <span className="text-[#7413dc]/70 text-[10px] font-medium uppercase">{format(new Date(prog.date), 'MMM')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm">{prog.title}</p>
                      {sec && <p className="text-xs text-gray-400 capitalize mt-0.5">{sec.display_name || sec.name}</p>}
                      {prog.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{prog.description}</p>}
                      {prog.equipment_needed && (
                        <p className="text-xs text-amber-600 mt-1.5 font-medium">📦 {prog.equipment_needed}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Links */}
        <div>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quick Access</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Calendar, label: 'Programme', tab: 'programme', color: 'bg-blue-50 text-blue-600' },
              { icon: Tent, label: 'Events', tab: 'events', color: 'bg-green-50 text-green-600' },
              { icon: Award, label: 'Badges', tab: 'badges', color: 'bg-amber-50 text-amber-600' },
            ].map(item => (
              <button
                key={item.tab}
                onClick={() => onTabChange(item.tab)}
                className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-sm border border-gray-100 active:bg-gray-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-gray-700">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Upcoming Events</h2>
              <button onClick={() => onTabChange('events')} className="text-xs text-[#7413dc] font-semibold">See all</button>
            </div>
            <div className="space-y-2">
              {upcomingEvents.map(event => (
                <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex items-center gap-3">
                  <div className="w-10 h-12 bg-green-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-green-700 font-bold text-base leading-none">{format(new Date(event.start_date), 'd')}</span>
                    <span className="text-green-600/70 text-[10px] font-medium uppercase">{format(new Date(event.start_date), 'MMM')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{event.title}</p>
                    <p className="text-xs text-gray-400 capitalize">{event.type}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}