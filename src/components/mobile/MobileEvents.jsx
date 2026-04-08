import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tent, MapPin, CalendarDays, ChevronRight, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

function EventCard({ event, onClick }) {
  const typeColors = {
    Camp: 'bg-green-100 text-green-700',
    'Day Event': 'bg-blue-100 text-blue-700',
    Other: 'bg-gray-100 text-gray-600',
  };

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left active:bg-gray-50 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-14 bg-[#7413dc]/10 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-[#7413dc] font-bold text-lg leading-none">
            {format(new Date(event.start_date), 'd')}
          </span>
          <span className="text-[#7413dc]/70 text-[10px] font-medium uppercase">
            {format(new Date(event.start_date), 'MMM')}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${typeColors[event.type] || typeColors.Other}`}>
              {event.type}
            </span>
          </div>
          <p className="font-semibold text-gray-900 text-sm leading-snug">{event.title}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {event.end_date && event.end_date !== event.start_date && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <CalendarDays className="w-3 h-3" />
                <span>Until {format(new Date(event.end_date), 'd MMM')}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{event.location}</span>
              </div>
            )}
            {event.meeting_time && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                <span>Meet {event.meeting_time}</span>
              </div>
            )}
          </div>
          {event.cost > 0 && (
            <p className="text-sm font-bold text-[#7413dc] mt-2">£{event.cost.toFixed(2)}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

export default function MobileEvents({ children, user }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const queryClient = useQueryClient();
  const childSectionIds = [...new Set(children.map(c => c.section_id).filter(Boolean))];
  const childIds = children.map(c => c.id);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['mobile-events-full', childSectionIds],
    queryFn: async () => {
      const all = await base44.entities.Event.filter({ published: true });
      return all
        .filter(e => e.section_ids?.some(sid => childSectionIds.includes(sid)))
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    },
    enabled: childSectionIds.length > 0,
  });

  const { data: eventActions = [] } = useQuery({
    queryKey: ['mobile-event-actions-detail', selectedEvent?.id],
    queryFn: () => base44.entities.ActionRequired.filter({ event_id: selectedEvent.id }),
    enabled: !!selectedEvent,
  });

  const { data: actionResponses = [] } = useQuery({
    queryKey: ['mobile-event-responses-detail', selectedEvent?.id, childIds.join(',')],
    queryFn: async () => {
      const all = await base44.entities.ActionResponse.filter({});
      const actionIds = eventActions.map(a => a.id);
      return all.filter(r => actionIds.includes(r.action_required_id) && childIds.includes(r.member_id));
    },
    enabled: !!selectedEvent && eventActions.length > 0,
  });

  const saveResponseMutation = useMutation({
    mutationFn: async ({ actionId, memberId, value, parentEmail }) => {
      const existing = actionResponses.find(r => r.action_required_id === actionId && r.member_id === memberId);
      if (existing) {
        await base44.entities.ActionResponse.update(existing.id, { response_value: value, responded_at: new Date().toISOString() });
      } else {
        await base44.entities.ActionResponse.create({
          action_required_id: actionId,
          member_id: memberId,
          parent_email: parentEmail || '',
          response_value: value,
          responded_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-event-responses-detail', selectedEvent?.id] });
      toast.success('Response saved!');
    },
    onError: () => toast.error('Failed to save response'),
  });

  const getResponse = (actionId, memberId) =>
    actionResponses.find(r => r.action_required_id === actionId && r.member_id === memberId);

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.start_date) >= now);
  const past = events.filter(e => new Date(e.start_date) < now);

  if (selectedEvent) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="bg-gradient-to-br from-[#7413dc] to-[#5c0fb0] px-5 pb-6 text-white"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
          <button onClick={() => setSelectedEvent(null)} className="text-white/70 text-sm mb-3 flex items-center gap-1">
            ← Back
          </button>
          <div className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-3 ${selectedEvent.type === 'Camp' ? 'bg-green-400/20 text-green-200' : 'bg-blue-400/20 text-blue-200'}`}>
            {selectedEvent.type}
          </div>
          <h1 className="text-2xl font-bold">{selectedEvent.title}</h1>
          <p className="text-white/70 text-sm mt-1">
            {format(new Date(selectedEvent.start_date), 'd MMM yyyy')}
            {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.start_date &&
              ` – ${format(new Date(selectedEvent.end_date), 'd MMM yyyy')}`}
          </p>
        </div>
        <div className="px-4 py-5 space-y-4">
          {selectedEvent.location && (
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
              <MapPin className="w-5 h-5 text-[#7413dc] flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Location</p>
                <p className="font-medium text-gray-900 text-sm">{selectedEvent.location}</p>
              </div>
            </div>
          )}
          {(selectedEvent.meeting_time || selectedEvent.pickup_time) && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 mb-2 font-medium">Times</p>
              {selectedEvent.meeting_time && (
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-500">Meet time</span>
                  <span className="font-semibold">{selectedEvent.meeting_time}</span>
                </div>
              )}
              {selectedEvent.pickup_time && (
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-500">Pickup time</span>
                  <span className="font-semibold">{selectedEvent.pickup_time}</span>
                </div>
              )}
            </div>
          )}
          {selectedEvent.description && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 mb-2 font-medium">About this event</p>
              <p className="text-sm text-gray-700 leading-relaxed">{selectedEvent.description}</p>
            </div>
          )}

          {/* Action Required responses */}
          {eventActions.filter(a => a.is_open !== false).map(action => (
            <div key={action.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">{action.column_title}</p>
              <p className="text-sm text-gray-700 mb-3">{action.action_text}</p>
              {children.map(child => {
                const response = getResponse(action.id, child.id);
                const currentVal = response?.response_value || '';
                const getOptions = () => {
                  if (action.action_purpose === 'attendance') return ['Yes, attending', 'No, not attending'];
                  if (action.action_purpose === 'consent') return ['I give consent', 'I do not give consent'];
                  if (action.action_purpose === 'custom_dropdown') return action.dropdown_options || [];
                  return null;
                };
                const options = getOptions();
                return (
                  <div key={child.id} className="mb-3 last:mb-0">
                    {children.length > 1 && <p className="text-xs font-semibold text-gray-500 mb-1">{child.full_name}</p>}
                    {options ? (
                      <div className="flex flex-wrap gap-2">
                        {options.map(opt => (
                          <button
                            key={opt}
                            disabled={saveResponseMutation.isPending}
                            onClick={() => saveResponseMutation.mutate({
                              actionId: action.id,
                              memberId: child.id,
                              value: opt,
                              parentEmail: user?.email || '',
                            })}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                              currentVal === opt
                                ? 'bg-[#7413dc] text-white border-[#7413dc]'
                                : 'bg-white text-gray-700 border-gray-200 active:bg-gray-50'
                            }`}
                          >
                            {currentVal === opt && <span className="mr-1">✓</span>}
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                          defaultValue={currentVal}
                          placeholder="Enter response..."
                          onBlur={(e) => {
                            if (e.target.value && e.target.value !== currentVal) {
                              saveResponseMutation.mutate({
                                actionId: action.id,
                                memberId: child.id,
                                value: e.target.value,
                                parentEmail: user?.email || '',
                              });
                            }
                          }}
                        />
                      </div>
                    )}
                    {currentVal && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Response recorded
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {(selectedEvent.cost > 0 || selectedEvent.consent_deadline || selectedEvent.payment_deadline) && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 mb-2 font-medium">Key Details</p>
              {selectedEvent.cost > 0 && (
                <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">Cost</span>
                  <span className="font-bold text-[#7413dc]">£{selectedEvent.cost.toFixed(2)}</span>
                </div>
              )}
              {selectedEvent.consent_deadline && (
                <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">Consent by</span>
                  <span className="font-semibold text-sm">{format(new Date(selectedEvent.consent_deadline), 'd MMM yyyy')}</span>
                </div>
              )}
              {selectedEvent.payment_deadline && (
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-sm text-gray-500">Payment by</span>
                  <span className="font-semibold text-sm">{format(new Date(selectedEvent.payment_deadline), 'd MMM yyyy')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-[#7413dc] to-[#5c0fb0] px-5 pb-6 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <h1 className="text-2xl font-bold">Events & Camps</h1>
        <p className="text-white/70 text-sm mt-1">Adventures await ⛺</p>
      </div>
      <div className="px-4 py-5">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-3 border-gray-200 border-t-[#7413dc] rounded-full animate-spin" />
          </div>
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
                  {upcoming.map(e => <EventCard key={e.id} event={e} onClick={() => setSelectedEvent(e)} />)}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Past Events</h2>
                <div className="space-y-3 opacity-60">
                  {[...past].reverse().map(e => <EventCard key={e.id} event={e} onClick={() => setSelectedEvent(e)} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}