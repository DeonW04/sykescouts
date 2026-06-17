import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tent, MapPin, CalendarDays, ChevronRight, Clock, CheckCircle, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import InlinePayment from './InlinePayment';

const typeColors = {
  Camp: 'bg-green-100 text-green-700',
  'Day Event': 'bg-blue-100 text-blue-700',
  Other: 'bg-gray-100 text-gray-600',
};

// ── Event card with inline payment ───────────────────────────────────────────
function EventCard({ event, onClick, child, paymentStatus, override, attending, onPaymentSuccess }) {
  const [payOpen, setPayOpen] = useState(false);
  const isPaid = paymentStatus?.status === 'paid';
  const isWaived = override?.override_type === 'waived';
  const showPaymentArea = (event.cost || 0) > 0 && (attending || isPaid);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Main tappable area → opens detail */}
      <div className="p-4 cursor-pointer active:bg-gray-50 transition-colors" onClick={onClick}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-14 bg-[#7413dc]/10 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
            <span className="text-[#7413dc] font-bold text-lg leading-none">{format(new Date(event.start_date), 'd')}</span>
            <span className="text-[#7413dc]/70 text-[10px] font-medium uppercase">{format(new Date(event.start_date), 'MMM')}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${typeColors[event.type] || typeColors.Other}`}>{event.type}</span>
              {showPaymentArea && isPaid && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-2.5 h-2.5" />Paid
                </span>
              )}
              {showPaymentArea && isWaived && (
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Waived</span>
              )}
            </div>
            <p className="font-semibold text-gray-900 text-sm leading-snug">{event.title}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {event.end_date && event.end_date !== event.start_date && (
                <div className="flex items-center gap-1 text-xs text-gray-400"><CalendarDays className="w-3 h-3" /><span>Until {format(new Date(event.end_date), 'd MMM')}</span></div>
              )}
              {event.location && (
                <div className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" /><span className="truncate max-w-[120px]">{event.location}</span></div>
              )}
              {event.meeting_time && (
                <div className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" /><span>Meet {event.meeting_time}</span></div>
              )}
            </div>
            {showPaymentArea && !isPaid && !isWaived && (
              <p className="text-xs font-bold text-amber-600 mt-2">£{event.cost.toFixed(2)} outstanding</p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
        </div>
      </div>

      {/* Pay button — expands inline, stops propagation to card click */}
      {showPaymentArea && !isPaid && !isWaived && (
        <div className="px-4 pb-3 pt-2 border-t border-amber-50 bg-amber-50/40">
          {!payOpen ? (
            <button
              onClick={(e) => { e.stopPropagation(); setPayOpen(true); }}
              className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform"
            >
              Pay £{event.cost.toFixed(2)}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800 truncate flex-1 mr-2">{event.title}</p>
                <p className="text-sm font-bold text-[#7413dc] flex-shrink-0">£{event.cost.toFixed(2)}</p>
              </div>
              <InlinePayment
                type="event"
                id={event.id}
                cost={Math.round(event.cost * 100)}
                memberId={child?.id}
                paymentMethods={child?.stripe_payment_methods || []}
                onSuccess={() => { setPayOpen(false); onPaymentSuccess(); }}
                onCancel={() => setPayOpen(false)}
              />
            </div>
          )}
        </div>
      )}

      {/* Paid detail row */}
      {showPaymentArea && isPaid && paymentStatus && (
        <div className="px-4 pb-3 pt-2 border-t border-green-50 bg-green-50/30">
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
            {paymentStatus.paid_at && <span>Paid {format(new Date(paymentStatus.paid_at), 'd MMM yyyy')}</span>}
            {paymentStatus.card_brand && paymentStatus.card_last4 && <span className="capitalize">{paymentStatus.card_brand} ···· {paymentStatus.card_last4}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Action card (unchanged from original) ─────────────────────────────────────
function ActionCard({ action, child, user, getResponse, saveResponseMutation }) {
  const children = child ? [child] : [];
  const [editing, setEditing] = useState(false);
  const [textVal, setTextVal] = useState('');

  const getOptions = () => {
    if (action.action_purpose === 'attendance') return ['Yes, attending', 'No, not attending'];
    if (action.action_purpose === 'consent') return ['I give consent', 'I do not give consent'];
    if (action.action_purpose === 'volunteer') return ['Yes, I will volunteer', 'No, not this time'];
    if (action.action_purpose === 'custom_dropdown') return action.dropdown_options || [];
    return null;
  };

  const formatResponse = (val) => {
    if (!val) return val;
    if (['Yes, attending', 'Yes, I will volunteer', 'I give consent'].includes(val)) return '✓ ' + val;
    return '✗ ' + val;
  };

  const allAnswered = children.every(c => getResponse(action.id, c.id)?.response_value);
  const options = getOptions();

  if (allAnswered && !editing) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-200">
        <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">{action.column_title}</p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            {children.map(child => {
              const r = getResponse(action.id, child.id);
              return (
                <div key={child.id}>
                  {children.length > 1 && <p className="text-xs text-gray-500 font-semibold">{child.full_name}</p>}
                  <p className="text-sm font-medium text-green-700">{formatResponse(r?.response_value)}</p>
                </div>
              );
            })}
          </div>
          <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-lg px-2 py-1.5 flex-shrink-0">
            <Pencil className="w-3 h-3" />Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{action.column_title}</p>
        {editing && <button onClick={() => setEditing(false)} className="text-xs text-gray-400">Cancel</button>}
      </div>
      <p className="text-sm text-gray-700 mb-3">{action.action_text}</p>
      {children.map(child => {
        const response = getResponse(action.id, child.id);
        const currentVal = response?.response_value || '';
        return (
          <div key={child.id} className="mb-3 last:mb-0">
            {children.length > 1 && <p className="text-xs font-semibold text-gray-500 mb-1">{child.full_name}</p>}
            {options ? (
              <div className="flex flex-wrap gap-2">
                {options.map(opt => (
                  <button key={opt} disabled={saveResponseMutation.isPending}
                    onClick={() => { saveResponseMutation.mutate({ actionId: action.id, memberId: child.id, value: opt, parentEmail: user?.email || '' }); setEditing(false); }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${currentVal === opt ? 'bg-[#7413dc] text-white border-[#7413dc]' : 'bg-white text-gray-700 border-gray-200 active:bg-gray-50'}`}
                  >
                    {currentVal === opt && '✓ '}{opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex gap-2">
                <input className="flex-1 border rounded-lg px-3 py-1.5 text-sm" value={textVal || currentVal} onChange={e => setTextVal(e.target.value)} placeholder="Enter response..." />
                <button disabled={saveResponseMutation.isPending || !textVal.trim()}
                  onClick={() => { if (textVal.trim()) { saveResponseMutation.mutate({ actionId: action.id, memberId: child.id, value: textVal.trim(), parentEmail: user?.email || '' }); setTextVal(''); setEditing(false); } }}
                  className="px-3 py-1.5 bg-[#7413dc] text-white rounded-lg text-sm font-medium disabled:opacity-40">Save</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MobileEvents({ selectedChild, user }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailPayOpen, setDetailPayOpen] = useState(false);
  const queryClient = useQueryClient();
  const child = selectedChild;
  const childSectionIds = selectedChild?.section_id ? [selectedChild.section_id] : [];
  const childIds = selectedChild ? [selectedChild.id] : [];

  useEffect(() => { setDetailPayOpen(false); }, [selectedEvent?.id]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['mobile-events-full', selectedChild?.section_id],
    queryFn: async () => {
      const all = await base44.entities.Event.filter({ published: true });
      return all.filter(e => e.section_ids?.some(sid => childSectionIds.includes(sid))).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    },
    enabled: childSectionIds.length > 0,
  });

  const { data: portal } = useQuery({
    queryKey: ['parent-portal'],
    queryFn: async () => (await base44.functions.invoke('getParentPortalData', {})).data,
    enabled: childIds.length > 0,
  });

  const paymentStatuses = (portal?.eventPaymentStatuses || []).filter(ps => childIds.includes(ps.member_id));
  const paymentOverrides = (portal?.paymentOverrides || []).filter(o => childIds.includes(o.member_id) && o.event_id);
  const invalidatePortal = () => queryClient.invalidateQueries({ queryKey: ['parent-portal'] });

  // Attendance actions for cost events come from the event_id-scoped ActionRequired query;
  // responses are the parent-scoped responses returned by the portal function.
  const { data: costEventActions = [] } = useQuery({
    queryKey: ['mobile-cost-event-actions', events.map(e => e.id).join(',')],
    queryFn: async () => {
      const costEventIds = new Set(events.filter(e => (e.cost || 0) > 0).map(e => e.id));
      if (costEventIds.size === 0) return [];
      const all = await base44.entities.ActionRequired.filter({ action_purpose: 'attendance' });
      return all.filter(a => a.event_id && costEventIds.has(a.event_id));
    },
    enabled: events.length > 0 && childIds.length > 0,
  });

  const attendanceData = {
    actions: costEventActions,
    responses: (portal?.actionResponses || []).filter(r => childIds.includes(r.member_id)),
  };

  const { data: eventActions = [] } = useQuery({
    queryKey: ['mobile-event-actions-detail', selectedEvent?.id],
    queryFn: () => base44.entities.ActionRequired.filter({ event_id: selectedEvent.id }),
    enabled: !!selectedEvent,
  });

  const actionResponses = (() => {
    const actionIds = new Set(eventActions.map(a => a.id));
    return (portal?.actionResponses || []).filter(r => actionIds.has(r.action_required_id) && childIds.includes(r.member_id));
  })();

  const saveResponseMutation = useMutation({
    mutationFn: async ({ actionId, memberId, value, parentEmail }) => {
      const existing = actionResponses.find(r => r.action_required_id === actionId && r.member_id === memberId);
      if (existing) {
        await base44.entities.ActionResponse.update(existing.id, { response_value: value, responded_at: new Date().toISOString() });
      } else {
        await base44.entities.ActionResponse.create({ action_required_id: actionId, member_id: memberId, parent_email: parentEmail || '', response_value: value, responded_at: new Date().toISOString() });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mobile-event-responses-detail', selectedEvent?.id] }); toast.success('Response saved!'); },
    onError: () => toast.error('Failed to save response'),
  });

  const getResponse = (actionId, memberId) => actionResponses.find(r => r.action_required_id === actionId && r.member_id === memberId);

  const getPaymentStatus = (eventId) => paymentStatuses.find(ps => ps.event_id === eventId && childIds.includes(ps.member_id));
  const getOverride = (eventId) => paymentOverrides.find(o => o.event_id === eventId && childIds.includes(o.member_id));
  const isAttending = (eventId) => {
    const action = attendanceData.actions.find(a => a.event_id === eventId);
    if (!action) return false;
    const resp = attendanceData.responses.find(r => r.action_required_id === action.id && childIds.includes(r.member_id));
    return !!(resp && ['Yes, attending', 'yes', 'attending'].includes(resp.response_value));
  };
  const invalidatePayments = () => queryClient.invalidateQueries({ queryKey: ['event-payment-statuses', childIds.join(',')] });

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.start_date) >= now);
  const past = events.filter(e => new Date(e.start_date) < now);

  // ── Detail view ──────────────────────────────────────────────────────────
  if (selectedEvent) {
    const ps = getPaymentStatus(selectedEvent.id);
    const ov = getOverride(selectedEvent.id);
    const att = isAttending(selectedEvent.id);
    const showPayment = (selectedEvent.cost || 0) > 0 && (att || ps?.status === 'paid');
    const isPaid = ps?.status === 'paid';
    const isWaived = ov?.override_type === 'waived';

    return (
      <div className="flex flex-col min-h-screen">
        <div className="bg-gradient-to-br from-[#7413dc] to-[#5c0fb0] px-5 pb-6 text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
          <button onClick={() => setSelectedEvent(null)} className="text-white/70 text-sm mb-3 flex items-center gap-1">← Back</button>
          <div className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-3 ${selectedEvent.type === 'Camp' ? 'bg-green-400/20 text-green-200' : 'bg-blue-400/20 text-blue-200'}`}>{selectedEvent.type}</div>
          <h1 className="text-2xl font-bold">{selectedEvent.title}</h1>
          <p className="text-white/70 text-sm mt-1">
            {format(new Date(selectedEvent.start_date), 'd MMM yyyy')}
            {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.start_date && ` – ${format(new Date(selectedEvent.end_date), 'd MMM yyyy')}`}
          </p>
        </div>

        <div className="px-4 py-5 space-y-4">
          {selectedEvent.location && (
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
              <MapPin className="w-5 h-5 text-[#7413dc] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">Location</p>
                <p className="font-medium text-gray-900 text-sm">{selectedEvent.location}</p>
              </div>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedEvent.location)}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 bg-[#7413dc] text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Directions</a>
            </div>
          )}
          {(selectedEvent.meeting_time || selectedEvent.pickup_time) && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 mb-2 font-medium">Times</p>
              {selectedEvent.meeting_time && <div className="flex justify-between text-sm py-1"><span className="text-gray-500">Meet time</span><span className="font-semibold">{selectedEvent.meeting_time}</span></div>}
              {selectedEvent.pickup_time && <div className="flex justify-between text-sm py-1"><span className="text-gray-500">Pickup time</span><span className="font-semibold">{selectedEvent.pickup_time}</span></div>}
            </div>
          )}
          {selectedEvent.description && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 mb-2 font-medium">About this event</p>
              <p className="text-sm text-gray-700 leading-relaxed">{selectedEvent.description}</p>
            </div>
          )}

          {/* Payment section */}
          {showPayment && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4">
                <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">Payment</p>
                {isWaived ? (
                  <span className="inline-flex items-center text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">Waived</span>
                ) : isPaid ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-bold text-green-700">Paid</span>
                      <span className="text-sm font-bold text-gray-800">£{selectedEvent.cost?.toFixed(2)}</span>
                    </div>
                    {ps.paid_at && <p className="text-xs text-gray-400">Date: {format(new Date(ps.paid_at), 'd MMM yyyy')}</p>}
                    {ps.card_brand && ps.card_last4 && <p className="text-xs text-gray-400 capitalize">Card: {ps.card_brand} ···· {ps.card_last4}</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-amber-700">£{selectedEvent.cost?.toFixed(2)} outstanding</p>
                    {!detailPayOpen ? (
                      <button onClick={() => setDetailPayOpen(true)} className="w-full py-3 bg-amber-500 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform">
                        Pay £{selectedEvent.cost?.toFixed(2)}
                      </button>
                    ) : (
                      <InlinePayment
                        type="event"
                        id={selectedEvent.id}
                        cost={Math.round((selectedEvent.cost || 0) * 100)}
                        memberId={child?.id}
                        paymentMethods={child?.stripe_payment_methods || []}
                        onSuccess={() => { setDetailPayOpen(false); invalidatePayments(); }}
                        onCancel={() => setDetailPayOpen(false)}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {eventActions.filter(a => a.is_open !== false).map(action => (
            <ActionCard key={action.id} action={action} child={child} user={user} getResponse={getResponse} saveResponseMutation={saveResponseMutation} />
          ))}

          {(selectedEvent.cost > 0 || selectedEvent.consent_deadline || selectedEvent.payment_deadline) && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 mb-2 font-medium">Key Details</p>
              {selectedEvent.cost > 0 && <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0"><span className="text-sm text-gray-500">Cost</span><span className="font-bold text-[#7413dc]">£{selectedEvent.cost.toFixed(2)}</span></div>}
              {selectedEvent.consent_deadline && <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0"><span className="text-sm text-gray-500">Consent by</span><span className="font-semibold text-sm">{format(new Date(selectedEvent.consent_deadline), 'd MMM yyyy')}</span></div>}
              {selectedEvent.payment_deadline && <div className="flex justify-between items-center py-1.5"><span className="text-sm text-gray-500">Payment by</span><span className="font-semibold text-sm">{format(new Date(selectedEvent.payment_deadline), 'd MMM yyyy')}</span></div>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-[#7413dc] to-[#5c0fb0] px-5 pb-6 text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <h1 className="text-2xl font-bold">Events &amp; Camps</h1>
        <p className="text-white/70 text-sm mt-1">Adventures await ⛺</p>
      </div>

      <div className="px-4 py-5">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 border-3 border-gray-200 border-t-[#7413dc] rounded-full animate-spin" /></div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Tent className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-600">No events yet</p>
            <p className="text-sm mt-1">Events will appear here when published.</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Upcoming</h2>
                  <span className="bg-[#7413dc] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{upcoming.length}</span>
                </div>
                <div className="space-y-3">
                  {upcoming.map(e => (
                    <EventCard key={e.id} event={e} onClick={() => setSelectedEvent(e)} child={child}
                      paymentStatus={getPaymentStatus(e.id)} override={getOverride(e.id)} attending={isAttending(e.id)}
                      onPaymentSuccess={invalidatePayments}
                    />
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Past Events</h2>
                <div className="space-y-3 opacity-60">
                  {[...past].reverse().map(e => (
                    <EventCard key={e.id} event={e} onClick={() => setSelectedEvent(e)} child={child}
                      paymentStatus={getPaymentStatus(e.id)} override={getOverride(e.id)} attending={isAttending(e.id)}
                      onPaymentSuccess={invalidatePayments}
                    />
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