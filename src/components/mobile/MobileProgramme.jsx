import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, ChevronRight, AlertTriangle, MapPin, Ban } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, startOfWeek, endOfWeek } from 'date-fns';
import PaymentExpander from './PaymentExpander';

const BADGE_EMOJI = { challenge: '🏆', activity: '⭐', staged: '📈', chief_scout_award: '🥇' };
const ATTENDING_VALUES = new Set(['yes', 'yes, attending', 'attending']);

function MeetingCard({ programme, isPastMeeting, termMeetingTime, isThisWeeksMeeting, badges = [], paymentState, paidDetails, memberId, paymentMethods, onPaymentComplete }) {
  const [open, setOpen] = useState(isThisWeeksMeeting);

  if (programme.no_meeting) {
    return (
      <div className={`rounded-2xl border overflow-hidden flex items-center gap-4 p-4 ${isPastMeeting ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-red-50 border-red-200'}`}>
        <div className="rounded-xl p-3 flex-shrink-0 bg-red-100"><Ban className="w-5 h-5 text-red-500" /></div>
        <div>
          <p className="font-semibold text-sm text-red-700">No Meeting</p>
          <p className="text-xs text-gray-400 mt-0.5">{format(new Date(programme.date), 'EEEE, d MMMM yyyy')}</p>
          {programme.no_meeting_reason && <p className="text-xs text-gray-500 mt-1">{programme.no_meeting_reason}</p>}
        </div>
      </div>
    );
  }

  const hasTimeChange = (() => {
    if (!termMeetingTime || !programme.activities?.length) return false;
    const firstActivity = programme.activities[0];
    if (!firstActivity?.time) return false;
    const normalise = (t) => t?.replace(/^(\d):/, '0$1:').trim().slice(0, 5);
    return normalise(firstActivity.time) !== normalise(termMeetingTime);
  })();

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      isThisWeeksMeeting ? 'bg-green-50 border-green-200 shadow-sm' : isPastMeeting ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-gray-100 shadow-sm'
    }`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 p-4 text-left">
        <div className={`rounded-xl p-3 flex-shrink-0 ${isThisWeeksMeeting ? 'bg-green-200' : isPastMeeting ? 'bg-gray-200' : 'bg-green-100'}`}>
          <Calendar className={`w-5 h-5 ${isThisWeeksMeeting ? 'text-green-700' : isPastMeeting ? 'text-gray-500' : 'text-green-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-semibold text-sm ${isPastMeeting ? 'text-gray-500' : 'text-gray-900'}`}>{programme.title}</p>
            {isThisWeeksMeeting && <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">This Week</span>}
            {!isThisWeeksMeeting && isToday(new Date(programme.date)) && <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Today</span>}
            {!isThisWeeksMeeting && isTomorrow(new Date(programme.date)) && <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Tomorrow</span>}
            {(hasTimeChange || programme.optional_start_time) && (
              <span className="flex items-center gap-0.5 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-2.5 h-2.5" /> Time change
              </span>
            )}
            {programme.optional_location && (
              <span className="flex items-center gap-0.5 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <MapPin className="w-2.5 h-2.5" /> Different location
              </span>
            )}
            {/* Payment badge in collapsed view */}
            {paymentState === 'paid' && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">✓ Paid</span>}
            {paymentState === 'unpaid' && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Payment due</span>}
            {paymentState === 'waived' && <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">Waived</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{format(new Date(programme.date), 'EEEE, d MMMM yyyy')}</p>
          {programme.optional_start_time && <p className="text-xs text-red-600 font-semibold mt-0.5">⏰ {programme.optional_start_time}{programme.optional_end_time ? ` – ${programme.optional_end_time}` : ''}</p>}
          {!programme.optional_start_time && hasTimeChange && programme.activities?.[0]?.time && <p className="text-xs text-red-600 font-semibold mt-0.5">Starts at {programme.activities[0].time} (usual: {termMeetingTime})</p>}
          {programme.optional_location && <p className="text-xs text-red-600 font-semibold mt-0.5">📍 {programme.optional_location}</p>}
          {programme.has_cost && programme.cost > 0 && <p className="text-xs font-bold text-[#7413dc] mt-0.5">£{programme.cost.toFixed(2)}</p>}
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100 space-y-3">
          {(programme.optional_location || programme.optional_start_time) && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide">⚠️ Different from usual</p>
              {programme.optional_start_time && <p className="text-sm text-red-700 font-semibold">Time: {programme.optional_start_time}{programme.optional_end_time ? ` – ${programme.optional_end_time}` : ''}</p>}
              {programme.optional_location && (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-red-700 font-semibold">Location: {programme.optional_location}</p>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(programme.optional_location)}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg" onClick={e => e.stopPropagation()}>Directions</a>
                </div>
              )}
            </div>
          )}
          {programme.description && <p className="text-sm text-gray-600 leading-relaxed mt-3 whitespace-pre-wrap">{programme.description}</p>}
          {programme.activities?.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {programme.activities.map((a, i) => {
                const isTimeChanged = (() => {
                  if (!termMeetingTime || !a.time) return false;
                  const normalise = (t) => t?.replace(/^(\d):/, '0$1:').trim().slice(0, 5);
                  return i === 0 && normalise(a.time) !== normalise(termMeetingTime);
                })();
                return (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    {a.time && <span className={`font-medium flex-shrink-0 w-12 ${isTimeChanged ? 'text-red-600 font-bold' : 'text-gray-400'}`}>{a.time}</span>}
                    <span>{a.activity}</span>
                  </div>
                );
              })}
            </div>
          )}
          {badges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {badges.map((b, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-purple-50 border border-purple-100 text-purple-700 text-[11px] font-medium px-2 py-0.5 rounded-full">
                  {BADGE_EMOJI[b.category] || '🏅'} {b.name}
                </span>
              ))}
            </div>
          )}
          {!programme.description && !programme.activities?.length && badges.length === 0 && <p className="text-sm text-gray-400 mt-3">No details available yet.</p>}

          {/* Inline payment expander */}
          {paymentState && memberId && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <PaymentExpander
                type="meeting"
                entityId={programme.id}
                entityTitle={programme.title}
                cost={programme.cost}
                memberId={memberId}
                paymentMethods={paymentMethods}
                state={paymentState}
                paidDetails={paidDetails}
                onPaymentComplete={onPaymentComplete}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MobileProgramme({ selectedChild }) {
  const queryClient = useQueryClient();
  const childSectionIds = selectedChild?.section_id ? [selectedChild.section_id] : [];
  const primaryChild = selectedChild;

  const { data: terms = [] } = useQuery({
    queryKey: ['mobile-terms', childSectionIds],
    queryFn: () => base44.entities.Term.filter({ active: true }),
    enabled: childSectionIds.length > 0,
  });

  const { data: programmes = [], isLoading } = useQuery({
    queryKey: ['mobile-programmes'],
    queryFn: () => base44.entities.Programme.filter({ published: true }),
    enabled: childSectionIds.length > 0,
  });

  const { data: badgeCriteria = [] } = useQuery({
    queryKey: ['mobile-badge-criteria'],
    queryFn: () => base44.entities.ProgrammeBadgeCriteria.filter({}),
    enabled: childSectionIds.length > 0,
  });

  const { data: badgeDefinitions = [] } = useQuery({
    queryKey: ['mobile-badge-definitions'],
    queryFn: () => base44.entities.BadgeDefinition.filter({}),
    enabled: childSectionIds.length > 0,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['mobile-sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
    enabled: childSectionIds.length > 0,
  });

  // Payment data
  const { data: meetingPaymentStatuses = [], refetch: refetchPaymentStatuses } = useQuery({
    queryKey: ['meeting-payment-statuses', primaryChild?.id],
    queryFn: () => base44.entities.MeetingPaymentStatus.filter({ member_id: primaryChild.id }),
    enabled: !!primaryChild?.id,
  });

  const { data: paymentOverrides = [] } = useQuery({
    queryKey: ['meeting-payment-overrides', primaryChild?.id],
    queryFn: () => base44.entities.MeetingPaymentOverride.filter({ member_id: primaryChild.id }),
    enabled: !!primaryChild?.id,
  });

  const { data: attendanceActions = [] } = useQuery({
    queryKey: ['meeting-attendance-actions'],
    queryFn: () => base44.entities.ActionRequired.filter({ action_purpose: 'attendance' }),
    enabled: !!primaryChild?.id,
    select: data => data.filter(a => a.programme_id),
  });

  const { data: attendanceResponses = [] } = useQuery({
    queryKey: ['meeting-attendance-responses', primaryChild?.id],
    queryFn: () => base44.entities.ActionResponse.filter({ member_id: primaryChild.id }),
    enabled: !!primaryChild?.id,
  });

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const currentTerm = terms.find(t => now >= new Date(t.start_date) && now <= new Date(t.end_date))
    || terms.filter(t => new Date(t.start_date) > now).sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];

  const childSection = sections.find(s => childSectionIds.includes(s.id));
  const termMeetingTime = childSection?.meeting_start_time;

  const programmeBadgesMap = {};
  badgeCriteria.forEach(c => {
    if (!c.programme_id) return;
    const badge = badgeDefinitions.find(b => b.id === c.badge_id);
    if (badge) {
      if (!programmeBadgesMap[c.programme_id]) programmeBadgesMap[c.programme_id] = [];
      programmeBadgesMap[c.programme_id].push(badge);
    }
  });

  // Filter to selected child's section only (no more duplicate meetings)
  const termProgrammes = currentTerm
    ? programmes.filter(p => {
        const d = new Date(p.date);
        return d >= new Date(currentTerm.start_date) && d <= new Date(currentTerm.end_date) && p.section_id === selectedChild?.section_id;
      }).sort((a, b) => new Date(a.date) - new Date(b.date))
    : [];

  const thisWeekMeeting = termProgrammes.find(p => { const d = new Date(p.date); return d >= weekStart && d <= weekEnd; });
  const otherUpcoming = termProgrammes.filter(p => { const d = new Date(p.date); return (!isPast(d) || isToday(d)) && !(d >= weekStart && d <= weekEnd); });
  const past = termProgrammes.filter(p => isPast(new Date(p.date)) && !isToday(new Date(p.date)));

  const getPaymentState = (programme) => {
    if (!programme.has_cost || !(programme.cost > 0) || !primaryChild) return null;
    const override = paymentOverrides.find(o => o.programme_id === programme.id && o.override_type === 'waived');
    if (override) return 'waived';
    const status = meetingPaymentStatuses.find(s => s.meeting_id === programme.id);
    if (status?.status === 'paid') return 'paid';
    const action = attendanceActions.find(a => a.programme_id === programme.id);
    if (!action) return null;
    const response = attendanceResponses.find(r => r.action_required_id === action.id);
    const isAttending = ATTENDING_VALUES.has((response?.response_value || '').toLowerCase());
    if (!isAttending) return null;
    return 'unpaid';
  };

  const getPaidDetails = (programmeId) => {
    const s = meetingPaymentStatuses.find(s => s.meeting_id === programmeId);
    return s ? { paid_at: s.paid_at, card_brand: s.card_brand, card_last4: s.card_last4 } : null;
  };

  const handlePaymentComplete = () => {
    refetchPaymentStatuses();
    queryClient.invalidateQueries({ queryKey: ['meeting-attendance-responses'] });
  };

  const makeMeetingCard = (p, isPastMeeting, isThisWeek) => {
    const payState = getPaymentState(p);
    return (
      <MeetingCard
        key={p.id}
        programme={p}
        isPastMeeting={isPastMeeting}
        termMeetingTime={termMeetingTime}
        isThisWeeksMeeting={isThisWeek}
        badges={programmeBadgesMap[p.id] || []}
        paymentState={payState}
        paidDetails={getPaidDetails(p.id)}
        memberId={primaryChild?.id}
        paymentMethods={primaryChild?.stripe_payment_methods || []}
        onPaymentComplete={handlePaymentComplete}
      />
    );
  };

  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-green-600 to-[#004851] px-5 pb-6 text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <h1 className="text-2xl font-bold">Programme</h1>
        {currentTerm && (
          <p className="text-white/70 text-sm mt-1">
            {currentTerm.title} · {format(new Date(currentTerm.start_date), 'd MMM')} – {format(new Date(currentTerm.end_date), 'd MMM yyyy')}
            {new Date(currentTerm.start_date) > now && <span className="ml-2 bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Upcoming</span>}
          </p>
        )}
      </div>

      <div className="px-4 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><div className="w-7 h-7 border-3 border-gray-200 border-t-[#7413dc] rounded-full animate-spin" /></div>
        ) : !currentTerm ? (
          <div className="text-center py-16 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-600">No upcoming term</p>
            <p className="text-sm mt-1">Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {thisWeekMeeting && (
              <div>
                <h2 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3">This Week</h2>
                {makeMeetingCard(thisWeekMeeting, false, true)}
              </div>
            )}
            {otherUpcoming.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Upcoming</h2>
                <div className="space-y-3">
                  {(() => {
                    const halfTermStart = currentTerm?.half_term_start ? new Date(currentTerm.half_term_start) : null;
                    const halfTermEnd = currentTerm?.half_term_end ? new Date(currentTerm.half_term_end) : null;
                    let halfTermDividerShown = false;
                    return otherUpcoming.map(p => {
                      const items = [];
                      if (!halfTermDividerShown && halfTermStart && halfTermEnd && new Date(p.date) > halfTermEnd) {
                        halfTermDividerShown = true;
                        items.push(
                          <div key="half-term-divider" className="flex items-center gap-3 py-1">
                            <div className="flex-1 h-px bg-amber-200" />
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide bg-amber-50 border border-amber-200 rounded-full px-3 py-1 flex-shrink-0">🌟 Half Term · {format(halfTermStart, 'd MMM')} – {format(halfTermEnd, 'd MMM')}</span>
                            <div className="flex-1 h-px bg-amber-200" />
                          </div>
                        );
                      }
                      items.push(makeMeetingCard(p, false, false));
                      return items;
                    });
                  })()}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Previous Meetings</h2>
                <div className="space-y-3">{[...past].reverse().map(p => makeMeetingCard(p, true, false))}</div>
              </div>
            )}
            {termProgrammes.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No meetings planned yet for this term.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}