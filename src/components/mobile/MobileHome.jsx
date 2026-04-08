import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, Tent, ChevronRight, CheckCircle, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { format, isThisWeek, startOfWeek, endOfWeek } from 'date-fns';
import ActionRequiredCard from './ActionRequiredCard';
import VolunteerRequestCard from './VolunteerRequestCard';

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

  const { data: eventActions = [] } = useQuery({
    queryKey: ['mobile-event-actions', upcomingEvents.map(e => e.id).join(',')],
    queryFn: async () => {
      if (upcomingEvents.length === 0) return [];
      const allActions = await base44.entities.ActionRequired.filter({});
      // Filter for attendance actions on upcoming events
      return allActions.filter(a => 
        a.event_id && 
        upcomingEvents.some(e => e.id === a.event_id) && 
        a.action_purpose === 'attendance'
      );
    },
    enabled: upcomingEvents.length > 0,
  });

  const { data: actionsData = { actions: [], responses: [] } } = useQuery({
    queryKey: ['mobile-actions', children],
    queryFn: async () => {
      if (children.length === 0) return { actions: [], responses: [] };

      // 1. Fetch all ActionAssignments for my children
      const allAssignments = await base44.entities.ActionAssignment.filter({});
      const myAssignments = allAssignments.filter(a => childIds.includes(a.member_id));
      if (myAssignments.length === 0) return { actions: [], responses: [] };

      const assignedActionIds = [...new Set(myAssignments.map(a => a.action_required_id))];

      // 2. Fetch open ActionRequired records that my children are assigned to
      const allActions = await base44.entities.ActionRequired.filter({});
      const relevantActions = allActions.filter(a =>
        assignedActionIds.includes(a.id) && a.is_open !== false
      );

      // 3. Fetch ActionResponses for my children
      const allResponses = await base44.entities.ActionResponse.filter({});
      const relevantResponses = allResponses.filter(r => childIds.includes(r.member_id));

      return { actions: relevantActions, responses: relevantResponses };
    },
    enabled: children.length > 0,
  });

  const { actions: allNonVolunteerActions, responses: existingResponses } = actionsData;
  const allActions = allNonVolunteerActions.filter(a => a.action_purpose !== 'volunteer');
  // Show action on dashboard if any child has an assignment but no completed response
  const actionsRequired = allActions.filter(action =>
    !children.every(child =>
      existingResponses.some(r =>
        r.action_required_id === action.id &&
        r.member_id === child.id &&
        r.response_value
      )
    )
  );

  const getEventAttendanceStatus = (eventId) => {
    const attendanceAction = eventActions.find(a => a.event_id === eventId);
    if (!attendanceAction) return null;

    const childResponses = existingResponses.filter(r =>
      r.action_required_id === attendanceAction.id &&
      childIds.includes(r.member_id) &&
      r.response_value
    );

    if (childResponses.length === 0) return 'no_response';
    const val = childResponses[0].response_value;
    if (val === 'attending' || val === 'Yes, attending') return 'attending';
    if (val === 'not_attending' || val === 'No, not attending') return 'not_attending';
    return 'no_response';
  };

  const child = children[0];
  // Use display_name if available, otherwise fall back to full_name first name
  const displayName = user?.display_name || user?.full_name?.split(' ')[0] || 'there';

  // Volunteer actions query
  const { data: volunteerActionsData = [] } = useQuery({
    queryKey: ['mobile-volunteer-actions', childIds.join(','), childSectionIds.join(',')],
    queryFn: async () => {
      if (children.length === 0) return [];
      const allActionsAll = await base44.entities.ActionRequired.filter({});
      const volunteerActions = allActionsAll.filter(a => a.action_purpose === 'volunteer' && a.is_open !== false);
      if (volunteerActions.length === 0) return [];

      // Get sections for meetings, and event attendances for events
      const [allAttendances, allEvents, allProgrammes, allResponses] = await Promise.all([
        base44.entities.EventAttendance.filter({}),
        base44.entities.Event.filter({ published: true }),
        base44.entities.Programme.filter({ shown_in_portal: true }),
        base44.entities.ActionResponse.filter({}),
      ]);

      const myEventIds = [...new Set(allAttendances.filter(a => childIds.includes(a.member_id)).map(a => a.event_id))];

      return volunteerActions.map(action => {
        // Determine entity info
        let entityInfo = null;
        let relevantMemberId = children[0]?.id;

        if (action.event_id) {
          // Only show if one of my children is invited to this event
          if (!myEventIds.includes(action.event_id)) return null;
          const event = allEvents.find(e => e.id === action.event_id);
          if (event) entityInfo = { type: 'event', name: event.title, date: event.start_date, location: event.location || '', onTabChange: () => {} };
        } else if (action.programme_id) {
          const prog = allProgrammes.find(p => p.id === action.programme_id);
          if (!prog) return null;
          // Show if any child is in the section
          if (!childSectionIds.includes(prog.section_id)) return null;
          entityInfo = { type: 'meeting', name: prog.title, date: prog.date, location: prog.optional_location || '', onTabChange: () => {} };
        }

        // Get total yes responses
        const totalYes = allResponses.filter(r => r.action_required_id === action.id && r.response_value === 'Yes, I will volunteer').length;

        // Get this parent's response (by email match)
        const parentResponse = allResponses.find(r =>
          r.action_required_id === action.id &&
          childIds.includes(r.member_id) &&
          r.parent_email === user?.email
        );

        return {
          ...action,
          _entityInfo: entityInfo,
          _memberId: relevantMemberId,
          _parentResponse: parentResponse?.response_value || null,
          _existingResponseId: parentResponse?.id || null,
          _totalYes: totalYes,
        };
      }).filter(Boolean);
    },
    enabled: children.length > 0,
  });

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

        {/* Volunteer Requests */}
        <VolunteerRequestCard
          volunteerActions={volunteerActionsData}
          user={user}
          onTabChange={onTabChange}
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
                  <button key={event.id} onClick={() => onTabChange('events')} className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 text-left active:bg-gray-50 transition-colors">
                    <div className="bg-purple-100 rounded-xl p-3 flex-shrink-0">
                      <Tent className="w-5 h-5 text-[#7413dc]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{event.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{format(new Date(event.start_date), 'EEE, d MMM yyyy')}</p>
                    </div>
                    {status && status === 'attending' && (
                       <div className="flex items-center gap-1 text-green-600 flex-shrink-0">
                         <CheckCircle className="w-4 h-4" />
                         <span className="text-xs font-medium">Going</span>
                       </div>
                     )}
                     {status && status === 'not_attending' && (
                       <div className="flex items-center gap-1 text-red-400 flex-shrink-0">
                         <Clock className="w-4 h-4" />
                         <span className="text-xs font-medium">Not going</span>
                       </div>
                     )}
                     {status && status === 'no_response' && (
                       <span className="text-xs text-orange-500 font-medium flex-shrink-0">No response</span>
                     )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}