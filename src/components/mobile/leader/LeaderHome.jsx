import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Calendar, Tent, Award, ChevronRight, AlertTriangle } from 'lucide-react';
import { format, isThisWeek, startOfWeek, endOfWeek } from 'date-fns';

export default function LeaderHome({ user, leader, sections, onTabChange }) {
  const sectionIds = sections.map(s => s.id);

  const { data: thisWeekMeetings = [] } = useQuery({
    queryKey: ['leader-this-week', sectionIds],
    queryFn: async () => {
      const programmes = await base44.entities.Programme.filter({});
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
      return programmes.filter(p =>
        sectionIds.includes(p.section_id) &&
        new Date(p.date) >= weekStart &&
        new Date(p.date) <= weekEnd
      );
    },
    enabled: sectionIds.length > 0,
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['leader-upcoming-events', sectionIds],
    queryFn: async () => {
      const events = await base44.entities.Event.filter({});
      return events
        .filter(e => e.section_ids?.some(sid => sectionIds.includes(sid)) && new Date(e.start_date) > new Date())
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
        .slice(0, 3);
    },
    enabled: sectionIds.length > 0,
  });

  const { data: memberCount = 0 } = useQuery({
    queryKey: ['leader-member-count', sectionIds],
    queryFn: async () => {
      const members = await base44.entities.Member.filter({ active: true });
      return members.filter(m => sectionIds.includes(m.section_id)).length;
    },
    enabled: sectionIds.length > 0,
  });

  const displayName = leader?.display_name || user?.display_name || user?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-[#004851] to-[#7413dc] px-5 pb-8 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <p className="text-white/70 text-sm font-medium">Leader Portal 👋</p>
        <h1 className="text-2xl font-bold mt-0.5">{displayName}</h1>
        <div className="flex gap-2 mt-3 flex-wrap">
          {sections.map(s => (
            <div key={s.id} className="bg-white/15 rounded-xl px-3 py-1.5 text-xs font-semibold">
              {s.display_name}
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-[#004851]">{memberCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Active Members</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-[#7413dc]">{upcomingEvents.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Upcoming Events</p>
          </div>
        </div>

        {/* This week */}
        <div>
          <h2 className="font-bold text-gray-900 text-base mb-3">This Week's Meetings</h2>
          {thisWeekMeetings.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-center">
              <p className="text-sm text-gray-500">No meetings this week</p>
            </div>
          ) : (
            <div className="space-y-2">
              {thisWeekMeetings.map(m => (
                <button
                  key={m.id}
                  onClick={() => onTabChange('programme')}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 text-left active:bg-gray-50"
                >
                  <div className="bg-green-100 rounded-xl p-3 flex-shrink-0">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{m.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{format(new Date(m.date), 'EEE, d MMM')}</p>
                    {(m.optional_location || m.optional_start_time) && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                        <p className="text-xs text-red-600 font-semibold">Unusual time/location set</p>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick nav */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { id: 'members', label: 'Members', icon: '👥', color: 'from-blue-500 to-cyan-500', desc: 'View member list' },
            { id: 'programme', label: 'Programme', icon: '📅', color: 'from-green-500 to-emerald-500', desc: 'Weekly meetings' },
            { id: 'events', label: 'Events', icon: '⛺', color: 'from-purple-500 to-pink-500', desc: 'Camps & events' },
            { id: 'attendance', label: 'Attendance', icon: '✅', color: 'from-orange-500 to-red-500', desc: 'Mark register' },
            { id: 'badges', label: 'Badges', icon: '🏅', color: 'from-yellow-500 to-orange-500', desc: 'Badge progress' },
            { id: 'gallery', label: 'Gallery', icon: '📷', color: 'from-pink-500 to-rose-500', desc: 'Upload photos' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`bg-gradient-to-br ${item.color} text-white rounded-2xl p-3.5 text-left active:scale-95 transition-transform`}
            >
              <span className="text-xl block mb-1.5">{item.icon}</span>
              <p className="font-bold text-sm">{item.label}</p>
              <p className="text-white/70 text-xs mt-0.5">{item.desc}</p>
            </button>
          ))}
        </div>

        {/* Upcoming events */}
        {upcomingEvents.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 text-base">Upcoming Events</h2>
              <button onClick={() => onTabChange('events')} className="text-xs text-[#7413dc] font-medium">See all</button>
            </div>
            <div className="space-y-2">
              {upcomingEvents.map(event => (
                <div key={event.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="bg-purple-100 rounded-xl p-3 flex-shrink-0">
                    <Tent className="w-5 h-5 text-[#7413dc]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{event.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{format(new Date(event.start_date), 'EEE, d MMM yyyy')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}