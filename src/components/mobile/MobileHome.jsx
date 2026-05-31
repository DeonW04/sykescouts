import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, Tent, ChevronRight, CheckCircle, Clock, MapPin, AlertTriangle, X } from 'lucide-react';
import { useOngoingSession } from '../../hooks/useOngoingSession';
import OngoingSessionBanner from './OngoingSessionBanner';
import ParentLiveView from './ParentLiveView';
import { format, isThisWeek, startOfWeek, endOfWeek, addDays } from 'date-fns';
import ActionRequiredCard from './ActionRequiredCard';
import VolunteerRequestCard from './VolunteerRequestCard';

const ATTENDING_VALUES = new Set(['yes', 'yes, attending', 'attending']);

export default function MobileHome({ user, selectedChild, allChildren, onTabChange, onOpenConsentForm, onChangeChild }) {
  const childSectionIds = selectedChild?.section_id ? [selectedChild.section_id] : [];
  const childIds = selectedChild ? [selectedChild.id] : [];
  const primaryChild = selectedChild;
  const { ongoingSession } = useOngoingSession({ sectionIds: childSectionIds });
  const [showLiveView, setShowLiveView] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const { data: thisWeekMeeting } = useQuery({
    queryKey: ['mobile-this-week-meeting', childSectionIds],
    queryFn: async () => {
      const programmes = await base44.entities.Programme.filter({ shown_in_portal: true });
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const thisWeek = programmes.filter(p => childSectionIds.includes(p.section_id) && new Date(p.date) >= weekStart && new Date(p.date) <= weekEnd);
      if (thisWeek.length > 0) return thisWeek[0];
      const upcoming = programmes.filter(p => childSectionIds.includes(p.section_id) && new Date(p.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date));
      return upcoming[0] || null;
    },
    enabled: childSectionIds.length > 0,
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['mobile-events', childIds.join(',')],
    queryFn: async () => {
      if (childIds.length === 0) return [];
      const allAttendances = await base44.entities.EventAttendance.filter({});
      const invitedEventIds = [...new Set(allAttendances.filter(a => childIds.includes(a.member_id)).map(a => a.event_id))];
      if (invitedEventIds.length === 0) return [];
      const events = await base44.entities.Event.filter({ published: true });
      return events.filter(e => invitedEventIds.includes(e.id) && new Date(e.start_date) > new Date()).sort((a, b) => new Date(a.start_date) - new Date(b.start_date)).slice(0, 3);
    },
    enabled: childIds.length > 0,
  });

  const { data: eventActions = [] } = useQuery({
    queryKey: ['mobile-event-actions', upcomingEvents.map(e => e.id).join(',')],
    queryFn: async () => {
      if (upcomingEvents.length === 0) return [];
      const allActions = await base44.entities.ActionRequired.filter({});
      return allActions.filter(a => a.event_id && upcomingEvents.some(e => e.id === a.event_id) && a.action_purpose === 'attendance');
    },
    enabled: upcomingEvents.length > 0,
  });

  const { data: actionsData = { actions: [], responses: [] } } = useQuery({
    queryKey: ['mobile-actions', selectedChild?.id],
    queryFn: async () => {
      if (!selectedChild) return { actions: [], responses: [] };
      const allAssignments = await base44.entities.ActionAssignment.filter({});
      const myAssignments = allAssignments.filter(a => a.member_id === selectedChild.id);
      if (myAssignments.length === 0) return { actions: [], responses: [] };
      const assignedActionIds = [...new Set(myAssignments.map(a => a.action_required_id))];
      const allActions = await base44.entities.ActionRequired.filter({});
      const relevantActions = allActions.filter(a => assignedActionIds.includes(a.id) && a.is_open !== false);
      const allResponses = await base44.entities.ActionResponse.filter({});
      const relevantResponses = allResponses.filter(r => r.member_id === selectedChild.id);
      return { actions: relevantActions, responses: relevantResponses };
    },
    enabled: !!selectedChild,
  });

  // Payment data for labels + banner
  const { data: eventPaymentStatuses = [] } = useQuery({
    queryKey: ['home-event-payment-statuses', primaryChild?.id],
    queryFn: () => base44.entities.EventPaymentStatus.filter({ member_id: primaryChild.id }),
    enabled: !!primaryChild?.id,
  });

  const { data: meetingPaymentStatus } = useQuery({
    queryKey: ['home-meeting-payment-status', primaryChild?.id, thisWeekMeeting?.id],
    queryFn: () => base44.entities.MeetingPaymentStatus.filter({ member_id: primaryChild.id, meeting_id: thisWeekMeeting.id }),
    enabled: !!primaryChild?.id && !!thisWeekMeeting?.id && thisWeekMeeting?.has_cost && thisWeekMeeting?.cost > 0,
    select: data => data[0] || null,
  });

  // Fetch programmes linked to the current actions (for title/date context)
  const actionProgrammeIds = actionsData.actions.map(a => a.programme_id).filter(Boolean);
  const { data: actionProgrammes = [] } = useQuery({
    queryKey: ['mobile-action-programmes', actionProgrammeIds.join(',')],
    queryFn: async () => {
      const all = await base44.entities.Programme.filter({ shown_in_portal: true });
      return all.filter(p => actionProgrammeIds.includes(p.id));
    },
    enabled: actionProgrammeIds.length > 0,
  });

  // Fetch meeting payment statuses for child to compute virtual payment actions
  const { data: allMeetingPayStatuses = [] } = useQuery({
    queryKey: ['mobile-all-meeting-pay-statuses', primaryChild?.id],
    queryFn: () => base44.entities.MeetingPaymentStatus.filter({ member_id: primaryChild.id }),
    enabled: !!primaryChild?.id,
  });

  const { data: volunteerActionsData = [] } = useQuery({
    queryKey: ['mobile-volunteer-actions', selectedChild?.id, childSectionIds.join(',')],
    queryFn: async () => {
      if (!selectedChild) return [];
      const allActionsAll = await base44.entities.ActionRequired.filter({});
      const volunteerActions = allActionsAll.filter(a => a.action_purpose === 'volunteer' && a.is_open !== false);
      if (volunteerActions.length === 0) return [];
      const [allAttendances, allEvents, allProgrammes, allResponses] = await Promise.all([
        base44.entities.EventAttendance.filter({}), base44.entities.Event.filter({ published: true }),
        base44.entities.Programme.filter({ shown_in_portal: true }), base44.entities.ActionResponse.filter({}),
      ]);
      const myEventIds = [...new Set(allAttendances.filter(a => childIds.includes(a.member_id)).map(a => a.event_id))];
      return volunteerActions.map(action => {
        let entityInfo = null;
        const relevantMemberId = selectedChild?.id;
        if (action.event_id) {
          if (!myEventIds.includes(action.event_id)) return null;
          const event = allEvents.find(e => e.id === action.event_id);
          if (event) entityInfo = { type: 'event', name: event.title, date: event.start_date };
        } else if (action.programme_id) {
          const prog = allProgrammes.find(p => p.id === action.programme_id);
          if (!prog) return null;
          if (!childSectionIds.includes(prog.section_id)) return null;
          entityInfo = { type: 'meeting', name: prog.title, date: prog.date };
        }
        const totalYes = allResponses.filter(r => r.action_required_id === action.id && r.response_value === 'Yes, I will volunteer').length;
        const parentResponse = allResponses.find(r => r.action_required_id === action.id && childIds.includes(r.member_id) && r.parent_email === user?.email);
        return { ...action, _entityInfo: entityInfo, _memberId: relevantMemberId, _parentResponse: parentResponse?.response_value || null, _existingResponseId: parentResponse?.id || null, _totalYes: totalYes };
      }).filter(Boolean);
    },
    enabled: !!selectedChild,
  });

  const child = selectedChild;
  const { actions: allNonVolunteerActions, responses: existingResponses } = actionsData;
  const allActions = allNonVolunteerActions.filter(a => a.action_purpose !== 'volunteer');
  const actionsRequired = allActions.filter(action => {
    if (action.programme_id) {
      const prog = actionProgrammes.find(p => p.id === action.programme_id);
      if (prog && new Date(prog.date) < today) return false;
    }
    if (action.event_id) {
      if (!upcomingEvents.some(e => e.id === action.event_id)) return false;
    }
    // Only show if selected child hasn't responded
    return !existingResponses.some(r => r.action_required_id === action.id && r.member_id === selectedChild?.id && r.response_value);
  });

  // Compute virtual payment-required actions for meetings where child confirmed attending + has cost + not yet paid
  const virtualPaymentActions = allActions
    .filter(a => a.action_purpose === 'attendance' && a.programme_id)
    .map(action => {
      const prog = actionProgrammes.find(p => p.id === action.programme_id);
      if (!prog || !prog.has_cost || !(prog.cost > 0)) return null;
      // Child must have confirmed attending
      const attendingResponse = existingResponses.find(r =>
        r.action_required_id === action.id &&
        childIds.includes(r.member_id) &&
        r.response_value &&
        ['yes', 'yes, attending', 'attending'].includes(r.response_value.toLowerCase())
      );
      if (!attendingResponse) return null;
      // Must not already be paid
      const payStatus = allMeetingPayStatuses.find(ps => ps.meeting_id === action.programme_id);
      if (payStatus?.status === 'paid') return null;
      return {
        id: `pay_${action.programme_id}`,
        action_purpose: 'meeting_payment',
        action_text: `Pay £${prog.cost.toFixed(2)} — ${prog.title}`,
        programme_id: action.programme_id,
        is_open: true,
      };
    })
    .filter(Boolean);

  const allPendingActions = [...actionsRequired, ...virtualPaymentActions];

  const getEventAttendanceStatus = (eventId) => {
    const attendanceAction = eventActions.find(a => a.event_id === eventId);
    if (!attendanceAction) return null;
    const childResponses = existingResponses.filter(r => r.action_required_id === attendanceAction.id && childIds.includes(r.member_id) && r.response_value);
    if (childResponses.length === 0) return 'no_response';
    const val = childResponses[0].response_value;
    if (ATTENDING_VALUES.has(val.toLowerCase())) return 'attending';
    if (val === 'not_attending' || val === 'No, not attending') return 'not_attending';
    return 'no_response';
  };

  const isThisWeekMeeting = thisWeekMeeting && isThisWeek(new Date(thisWeekMeeting.date), { weekStartsOn: 1 });
  const displayName = user?.display_name || user?.full_name?.split(' ')[0] || 'there';

  // Compute payment labels for events
  const getEventPaymentLabel = (event) => {
    if (!(event.cost > 0)) return null;
    const status = getEventAttendanceStatus(event.id);
    if (status !== 'attending') return null;
    const ps = eventPaymentStatuses.find(s => s.event_id === event.id);
    if (ps?.status === 'paid') return 'paid';
    return 'unpaid';
  };

  // Compute outstanding payments for red banner
  const sevenDaysFromNow = addDays(new Date(), 7);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const outstandingItems = [];
  for (const event of upcomingEvents) {
    if (!(event.cost > 0)) continue;
    const start = new Date(event.start_date);
    if (start > sevenDaysFromNow) continue;
    const attStatus = getEventAttendanceStatus(event.id);
    if (attStatus !== 'attending') continue;
    const ps = eventPaymentStatuses.find(s => s.event_id === event.id);
    if (ps?.status === 'paid') continue;
    const daysLeft = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
    outstandingItems.push(`Payment due: ${event.title} — £${event.cost.toFixed(2)}${daysLeft <= 0 ? ' (today)' : daysLeft === 1 ? ' (tomorrow)' : ` (${daysLeft} days)`}`);
  }
  if (primaryChild?.next_subs_due) {
    const subsDue = new Date(primaryChild.next_subs_due);
    subsDue.setHours(0, 0, 0, 0);
    const daysUntilSubs = Math.ceil((subsDue - today) / (1000 * 60 * 60 * 24));
    if (daysUntilSubs >= 0 && daysUntilSubs <= 7) {
      outstandingItems.push(`Subscription due ${daysUntilSubs === 0 ? 'today' : daysUntilSubs === 1 ? 'tomorrow' : `in ${daysUntilSubs} days`}`);
    }
  }
  if (primaryChild?.legacy_subs_expiry && !primaryChild?.stripe_subscription_id) {
    const legacyExpiry = new Date(primaryChild.legacy_subs_expiry);
    legacyExpiry.setHours(0, 0, 0, 0);
    const daysUntilLegacy = Math.ceil((legacyExpiry - today) / (1000 * 60 * 60 * 24));
    if (daysUntilLegacy >= 0 && daysUntilLegacy <= 30) {
      outstandingItems.push(`Subscription due by ${legacyExpiry.toLocaleDateString('en-GB')} — set up now`);
    }
  }

  const showBanner = outstandingItems.length > 0 && !bannerDismissed;

  if (showLiveView && ongoingSession) {
    return <ParentLiveView session={ongoingSession} onBack={() => setShowLiveView(false)} />;
  }

  return (
    <div className="flex flex-col">
      {ongoingSession && <OngoingSessionBanner session={ongoingSession} onClick={() => setShowLiveView(true)} />}

      {/* Outstanding payments banner */}
      {showBanner && (
        <div className="bg-red-600 px-4 py-3" style={{ paddingTop: ongoingSession ? undefined : 'env(safe-area-inset-top)' }}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {outstandingItems.map((item, i) => (
                <p key={i} className="text-xs text-white font-medium">{item}</p>
              ))}
            </div>
            <button onClick={() => setBannerDismissed(true)} className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-[#7413dc] to-[#004851] px-5 pb-8 text-white" style={{ paddingTop: (!ongoingSession && !showBanner) ? 'calc(env(safe-area-inset-top) + 48px)' : '20px' }}>
        <p className="text-white/70 text-sm font-medium">Welcome back 👋</p>
        <h1 className="text-2xl font-bold mt-0.5">{displayName}</h1>
        {child && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
              <div className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center text-xs font-bold">{child.full_name?.charAt(0)}</div>
              <span className="text-sm font-medium">{child.full_name}</span>
            </div>
            {allChildren.length > 1 && (
              <button
                onClick={onChangeChild}
                className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
              >
                Switch
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-5 space-y-5">
        <ActionRequiredCard
          actionsRequired={allPendingActions}
          child={selectedChild}
          user={user}
          existingResponses={existingResponses}
          onOpenConsentForm={onOpenConsentForm}
          programmes={actionProgrammes}
          events={upcomingEvents}
          onTabChange={onTabChange}
        />
        <VolunteerRequestCard volunteerActions={volunteerActionsData} user={user} onTabChange={onTabChange} />

        {/* This Week's Meeting */}
        <div>
          <h2 className="font-bold text-gray-900 text-base mb-3">
            {isThisWeekMeeting ? "This Week's Meeting" : thisWeekMeeting ? "Next Meeting" : "This Week's Meeting"}
          </h2>
          {!thisWeekMeeting ? (
            <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-200 flex items-center gap-4">
              <div className="bg-gray-200 rounded-xl p-3 flex-shrink-0"><Calendar className="w-6 h-6 text-gray-400" /></div>
              <p className="text-sm text-gray-500 font-medium">No meeting this week!</p>
            </div>
          ) : (
            <button onClick={() => onTabChange('programme')} className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-4 text-left active:bg-gray-50 transition-colors">
              <div className="bg-green-100 rounded-xl p-3 flex-shrink-0"><Calendar className="w-6 h-6 text-green-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 truncate">{thisWeekMeeting.title}</p>
                  {/* Meeting payment label */}
                  {thisWeekMeeting.has_cost && thisWeekMeeting.cost > 0 && meetingPaymentStatus && (
                    meetingPaymentStatus.status === 'paid'
                      ? <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">✓ Paid</span>
                      : <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">Not paid</span>
                  )}
                  {thisWeekMeeting.has_cost && thisWeekMeeting.cost > 0 && !meetingPaymentStatus && (
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">Not paid</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{format(new Date(thisWeekMeeting.date), 'EEE, d MMM')}</p>
                {thisWeekMeeting.optional_start_time && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-600 font-semibold">Different time: {thisWeekMeeting.optional_start_time}{thisWeekMeeting.optional_end_time ? ` – ${thisWeekMeeting.optional_end_time}` : ''}</p>
                  </div>
                )}
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
            <button key={item.id} onClick={() => onTabChange(item.id)} className={`bg-gradient-to-br ${item.color} text-white rounded-2xl p-3.5 text-left active:scale-95 transition-transform`}>
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
                const payLabel = getEventPaymentLabel(event);
                return (
                  <button key={event.id} onClick={() => onTabChange('events')} className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 text-left active:bg-gray-50 transition-colors">
                    <div className="bg-purple-100 rounded-xl p-3 flex-shrink-0"><Tent className="w-5 h-5 text-[#7413dc]" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm truncate">{event.title}</p>
                        {payLabel === 'paid' && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">✓ Paid</span>}
                        {payLabel === 'unpaid' && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">Not paid</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{format(new Date(event.start_date), 'EEE, d MMM yyyy')}</p>
                    </div>
                    {status === 'attending' && <div className="flex items-center gap-1 text-green-600 flex-shrink-0"><CheckCircle className="w-4 h-4" /><span className="text-xs font-medium">Going</span></div>}
                    {status === 'not_attending' && <div className="flex items-center gap-1 text-red-400 flex-shrink-0"><Clock className="w-4 h-4" /><span className="text-xs font-medium">Not going</span></div>}
                    {status === 'no_response' && <span className="text-xs text-orange-500 font-medium flex-shrink-0">No response</span>}
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