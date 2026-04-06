import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, Tent, Award, AlertCircle, ChevronRight, CheckCircle, Bell } from 'lucide-react';
import { format } from 'date-fns';

export default function MobileHome({ user, children, onTabChange }) {
  const childSectionIds = [...new Set(children.map(c => c.section_id).filter(Boolean))];

  const { data: nextMeeting } = useQuery({
    queryKey: ['mobile-next-meeting', childSectionIds],
    queryFn: async () => {
      const programmes = await base44.entities.Programme.filter({ shown_in_portal: true });
      const upcoming = programmes
        .filter(p => childSectionIds.includes(p.section_id) && new Date(p.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      return upcoming[0] || null;
    },
    enabled: childSectionIds.length > 0,
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['mobile-events', childSectionIds],
    queryFn: async () => {
      const events = await base44.entities.Event.filter({ published: true });
      return events
        .filter(e => e.section_ids?.some(sid => childSectionIds.includes(sid)) && new Date(e.start_date) > new Date())
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
        .slice(0, 3);
    },
    enabled: childSectionIds.length > 0,
  });

  const { data: actionsRequired = [] } = useQuery({
    queryKey: ['mobile-actions', children],
    queryFn: async () => {
      if (children.length === 0) return [];
      const sectionIds = [...new Set(children.map(c => c.section_id))];
      const childIds = children.map(c => c.id);
      const programmes = await base44.entities.Programme.filter({});
      const relevantProgIds = programmes.filter(p => sectionIds.includes(p.section_id)).map(p => p.id);
      const allActions = await base44.entities.ActionRequired.filter({});
      const relevantActions = allActions.filter(a => relevantProgIds.includes(a.programme_id) && a.is_open !== false);
      const allResponses = await base44.entities.ActionResponse.filter({});
      return relevantActions.filter(action =>
        !children.every(child =>
          allResponses.some(r =>
            (r.action_required_id === action.id) &&
            (r.member_id === child.id || r.child_member_id === child.id) &&
            r.status === 'completed' && r.response
          )
        )
      );
    },
    enabled: children.length > 0,
  });

  const child = children[0];
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7413dc] to-[#004851] px-5 pt-12 pb-8 text-white">
        <p className="text-white/70 text-sm font-medium">Welcome back 👋</p>
        <h1 className="text-2xl font-bold mt-0.5">{firstName}</h1>
        {child && (
          <div className="mt-3 flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2 w-fit">
            <div className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center text-xs font-bold">
              {child.full_name?.charAt(0)}
            </div>
            <span className="text-sm font-medium">{child.full_name}</span>
          </div>
        )}
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Actions Required */}
        {actionsRequired.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-orange-600" />
              <h2 className="font-bold text-orange-900 text-sm">Action Required</h2>
              <span className="ml-auto bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {actionsRequired.length}
              </span>
            </div>
            <div className="space-y-2">
              {actionsRequired.slice(0, 2).map(action => (
                <div key={action.id} className="bg-white rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-800 leading-snug">{action.action_text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Nav Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'child', label: 'My Child', icon: '👦', color: 'from-blue-500 to-cyan-500', desc: 'View profile & info' },
            { id: 'programme', label: 'Programme', icon: '📅', color: 'from-green-500 to-emerald-500', desc: 'Weekly meetings' },
            { id: 'events', label: 'Events', icon: '⛺', color: 'from-purple-500 to-pink-500', desc: 'Camps & day events' },
            { id: 'badges', label: 'Badges', icon: '🏅', color: 'from-yellow-500 to-orange-500', desc: 'Progress & awards' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`bg-gradient-to-br ${item.color} text-white rounded-2xl p-4 text-left active:scale-95 transition-transform`}
            >
              <span className="text-2xl block mb-2">{item.icon}</span>
              <p className="font-bold text-sm">{item.label}</p>
              <p className="text-white/70 text-xs mt-0.5">{item.desc}</p>
            </button>
          ))}
        </div>

        {/* Next Meeting */}
        {nextMeeting && (
          <div>
            <h2 className="font-bold text-gray-900 text-base mb-3">Next Meeting</h2>
            <button
              onClick={() => onTabChange('programme')}
              className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 text-left active:bg-gray-50 transition-colors"
            >
              <div className="bg-green-100 rounded-xl p-3 flex-shrink-0">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{nextMeeting.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {format(new Date(nextMeeting.date), 'EEE, d MMM')}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          </div>
        )}

        {/* Upcoming Events */}
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