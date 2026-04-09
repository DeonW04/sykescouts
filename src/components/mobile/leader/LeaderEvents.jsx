import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tent, MapPin, CalendarDays, Clock, ChevronRight, Save, X, LayoutList } from 'lucide-react';
import { format } from 'date-fns';
import EventDetailPanel from './EventDetailPanel';
import { toast } from 'sonner';

function EventDetailView({ event, onBack }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    description: event.description || '',
    location: event.location || '',
    meeting_time: event.meeting_time || '',
    pickup_time: event.pickup_time || '',
  });

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.Event.update(event.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leader-mobile-events'] });
      toast.success('Event updated');
      setEditing(false);
    },
  });

  const typeColors = { Camp: 'bg-green-400/20 text-green-200', 'Day Event': 'bg-blue-400/20 text-blue-200', Other: 'bg-gray-400/20 text-gray-200' };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-gradient-to-br from-[#7413dc] to-[#5c0fb0] px-5 pb-6 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <button onClick={onBack} className="text-white/70 text-sm mb-3 flex items-center gap-1">← Back</button>
        <div className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-3 ${typeColors[event.type] || typeColors.Other}`}>{event.type}</div>
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <p className="text-white/70 text-sm mt-1">
          {format(new Date(event.start_date), 'd MMM yyyy')}
          {event.end_date && event.end_date !== event.start_date && ` – ${format(new Date(event.end_date), 'd MMM yyyy')}`}
        </p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {editing ? (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Edit Details</p>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#7413dc] resize-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Location</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#7413dc]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Meet time</label>
                <input value={form.meeting_time} onChange={e => setForm(f => ({ ...f, meeting_time: e.target.value }))} placeholder="e.g. 09:00" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#7413dc]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Pickup time</label>
                <input value={form.pickup_time} onChange={e => setForm(f => ({ ...f, pickup_time: e.target.value }))} placeholder="e.g. 15:00" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#7413dc]" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditing(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancel</button>
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex-1 py-2.5 bg-[#7413dc] rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60">
                <Save className="w-4 h-4" /> {saveMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {event.location && (
              <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
                <MapPin className="w-5 h-5 text-[#7413dc] flex-shrink-0" />
                <div><p className="text-xs text-gray-400">Location</p><p className="font-medium text-gray-900 text-sm">{event.location}</p></div>
              </div>
            )}
            {(event.meeting_time || event.pickup_time) && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 mb-2 font-medium">Times</p>
                {event.meeting_time && <div className="flex justify-between text-sm py-1"><span className="text-gray-500">Meet time</span><span className="font-semibold">{event.meeting_time}</span></div>}
                {event.pickup_time && <div className="flex justify-between text-sm py-1"><span className="text-gray-500">Pickup time</span><span className="font-semibold">{event.pickup_time}</span></div>}
              </div>
            )}
            {event.description && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 mb-2 font-medium">About this event</p>
                <p className="text-sm text-gray-700 leading-relaxed">{event.description}</p>
              </div>
            )}
            {(event.cost > 0 || event.consent_deadline || event.payment_deadline) && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 mb-2 font-medium">Key Details</p>
                {event.cost > 0 && <div className="flex justify-between items-center py-1.5 border-b border-gray-50"><span className="text-sm text-gray-500">Cost</span><span className="font-bold text-[#7413dc]">£{event.cost.toFixed(2)}</span></div>}
                {event.consent_deadline && <div className="flex justify-between items-center py-1.5 border-b border-gray-50"><span className="text-sm text-gray-500">Consent by</span><span className="font-semibold text-sm">{format(new Date(event.consent_deadline), 'd MMM yyyy')}</span></div>}
                {event.payment_deadline && <div className="flex justify-between items-center py-1.5"><span className="text-sm text-gray-500">Payment by</span><span className="font-semibold text-sm">{format(new Date(event.payment_deadline), 'd MMM yyyy')}</span></div>}
              </div>
            )}
            <button onClick={() => setEditing(true)} className="w-full py-3 border border-[#7413dc]/30 text-[#7413dc] rounded-2xl text-sm font-semibold active:bg-[#7413dc]/5">
              Edit Basic Details
            </button>
          </>
        )}
      </div>
    </div>
  );
}

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
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <ChevronRight className="w-4 h-4 text-gray-300" />

                        </div>
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