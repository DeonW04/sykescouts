import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, Tent, ChevronRight, CheckCircle, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { format, isThisWeek, startOfWeek, endOfWeek } from 'date-fns';
import ActionRequiredCard from './ActionRequiredCard';

export default function MobileHome({ user, children, onTabChange }) {
  const childSectionIds = [...new Set(children.map(c => c.section_id).filter(Boolean))];
  const childIds = children.map(c => c.id);

  const { data: thisWeekMeeting } = useQuery({
    queryKey: ['mobile-this-week-meeting', childSectionIds],
    queryFn: async () => {
      const programmes = await base44.entities.Programme.filter({ shown_in_portal: true });
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const thisWeek = programmes.filter(p =>
        childSectionIds.includes(p.section_id) &&
        new Date(p.date) >= weekStart &&
        new Date(p.date) <= weekEnd
      );
      if (thisWeek.length > 0) return thisWeek[0];
      // If no meeting this week, get the next upcoming
      const upcoming = programmes
        .filter(p => childSectionIds.includes(p.section_id) && new Date(p.date) >= now)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      return upcoming[0] || null;
    },
    enabled: childSectionIds.length > 0,
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['mobile-events', childIds.join(',')],
    queryFn: async () => {
      if (childIds.length === 0) return [];
      // Get events the child has an attendance record for (i.e. was invited)
      const allAttendances = await base44.entities.EventAttendance.filter({});
      const invitedEventIds = [...new Set(
        allAttendances.filter(a => childIds.includes(a.member_id)).map(a => a.event_id)
      )];
      if (invitedEventIds.length === 0) return [];
      const events = await base44.entities.Event.filter({ published: true });
      return events
        .filter(e => invitedEventIds.includes(e.id) && new Date(e.start_date) > new Date())
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
        .slice(0, 3);
    },
    enabled: childIds.length > 0,
  });

  const { data: eventAttendances = [] } = useQuery({
    queryKey: ['mobile-event-attendances', childIds.join(',')],
    queryFn: async () => {
      if (childIds.length === 0) return [];
      const all = await base44.entities.EventAttendance.filter({});
      return all.filter(a => childIds.includes(a.member_id));
    },
    enabled: childIds.length > 0,
  });

  const { data: actionsData = { actions: [], responses: [] } } = useQuery({
    queryKey: ['mobile-actions', children],
    queryFn: async () => {
      if (children.length === 0) return { actions: [], responses: [] };
      const sectionIds = [...new Set(children.map(c => c.section_id))];

      // Programme-linked actions: match by section
      const programmes = await base44.entities.Programme.filter({});
      const relevantProgIds = programmes.filter(p => sectionIds.includes(p.section_id)).map(p => p.id);

      // Event-linked actions: only for events the child is actually invited to
      // (has an EventAttendance record)
      const eventAttendancesForActions = await base44.entities.EventAttendance.filter({});
      const invitedEventIds = [...new Set(
        eventAttendancesForActions
          .filter(a => childIds.includes(a.member_id))
          .map(a => a.event_id)
      )];

      const allActions = await base44.entities.ActionRequired.filter({});
      const relevantActions = allActions.filter(a => {
        if (a.is_open === false) return false;
        if (a.programme_id) return relevantProgIds.includes(a.programme_id);
        if (a.event_id) return invitedEventIds.includes(a.event_id);
        return false;
      });

      const allResponses = await base44.entities.ActionResponse.filter({});
      const relevantResponses = allResponses.filter(r => childIds.includes(r.member_id) || childIds.includes(r.child_member_id));
      return { actions: relevantActions, responses: relevantResponses };
    },
    enabled: children.length > 0,
  });

  const { actions: allActions, responses: existingResponses } = actionsData;
  const actionsRequired = allActions.filter(action =>
    !children.every(child =>
      existingResponses.some(r =>
        (r.action_required_id === action.id || r.action_id === action.id) &&
        (r.member_id === child.id || r.child_member_id === child.id) &&
        r.status === 'completed' && r.response
      )
    )
  );

  const getEventAttendanceStatus = (eventId) => {
    const relevant = eventAttendances.filter(a => a.event_id === eventId && childIds.includes(a.member_id));
    if (relevant.length === 0) return 'not_invited';
    if (relevant.some(a => a.rsvp_status === 'attending')) return 'attending';
    if (relevant.some(a => a.rsvp_status === 'not_attending')) return 'not_attending';
    return 'no_response'; // invited but hasn't responded
  };

  const child = children[0];
  // Use display_name if available, otherwise fall back to full_name first name
  const displayName = user?.display_name || user?.full_name?.split(' ')[0] || 'there';

  const isThisWeekMeeting = thisWeekMeeting && isThisWeek(new Date(thisWeekMeeting.date), { weekStartsOn: 1 });

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7413dc] to-[#004851] px-5 pb-8 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <p className="text-white/70 text-sm font-medium">Welcome back 👋</p>
        <h1 className="text-2xl font-bold mt-0.5">{displayName}</h1>
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
        <ActionRequiredCard
          actionsRequired={actionsRequired}
          children={children}
          user={user}
          existingResponses={existingResponses}
        />

        {/* This Week's Meeting — always shown */}
        <div>
          <h2 className="font-bold text-gray-900 text-base mb-3">
            {isThisWeekMeeting ? "This Week's Meeting" : thisWeekMeeting ? "Next Meeting" : "This Week's Meeting"}
          </h2>
          {!thisWeekMeeting ? (
            <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-200 flex items-center gap-4">
              <div className="bg-gray-200 rounded-xl p-3 flex-shrink-0">
                <Calendar className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 font-medium">No meeting this week!</p>
            </div>
          ) : (
            <button
              onClick={() => onTabChange('programme')}
              className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-4 text-left active:bg-gray-50 transition-colors"
            >
              <div className="bg-green-100 rounded-xl p-3 flex-shrink-0">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{thisWeekMeeting.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {format(new Date(thisWeekMeeting.date), 'EEE, d MMM')}
                </p>
                {/* Optional unusual time — shown in red */}
                {thisWeekMeeting.optional_start_time && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-600 font-semibold">
                      Different time: {thisWeekMeeting.optional_start_time}
                      {thisWeekMeeting.optional_end_time ? ` – ${thisWeekMeeting.optional_end_time}` : ''}
                    </p>
                  </div>
                )}
                {/* Optional unusual location — shown in red */}
                {thisWeekMeeting.optional_location && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-600 font-semibold">Different location: {thisWeekMeeting.optional_location}</p>
                  </div>
                )}
                {thisWeekMeeting.description && !thisWeekMeeting.optional_start_time && !thisWeekMeeting.optional_location && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">{thisWeekMeeting.description}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
            </button>
          )}
        </div>

        {/* Quick Nav Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { id: 'child', label: 'My Child', icon: '👦', color: 'from-blue-500 to-cyan-500', desc: 'View profile & info' },
            { id: 'programme', label: 'Programme', icon: '📅', color: 'from-green-500 to-emerald-500', desc: 'Weekly meetings' },
            { id: 'events', label: 'Events', icon: '⛺', color: 'from-purple-500 to-pink-500', desc: 'Camps & day events' },
            { id: 'badges', label: 'Badges', icon: '🏅', color: 'from-yellow-500 to-orange-500', desc: 'Progress & awards' },
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

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 text-base">Upcoming Events</h2>
              <button onClick={() => onTabChange('events')} className="text-xs text-[#7413dc] font-medium">See all</button>
            </div>
            <div className="space-y-2">
              {upcomingEvents.map(event => {
                const status = getEventAttendanceStatus(event.id);
                return (
                  <div key={event.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className="bg-purple-100 rounded-xl p-3 flex-shrink-0">
                      <Tent className="w-5 h-5 text-[#7413dc]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{event.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{format(new Date(event.start_date), 'EEE, d MMM yyyy')}</p>
                    </div>
                    {status === 'attending' && (
                      <div className="flex items-center gap-1 text-green-600 flex-shrink-0">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-medium">Going</span>
                      </div>
                    )}
                    {status === 'not_attending' && (
                      <div className="flex items-center gap-1 text-red-400 flex-shrink-0">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-medium">Not going</span>
                      </div>
                    )}
                    {status === 'no_response' && (
                      <span className="text-xs text-orange-500 font-medium flex-shrink-0">No response</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}