import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import WhatsAppScheduleManager from '@/components/whatsapp/WhatsAppScheduleManager';
import FloatingNav from '@/components/public/FloatingNav';
import NavBarSpacer from '@/components/public/NavBarSpacer';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Calendar, ChevronDown, ChevronRight, Tent } from 'lucide-react';
import moment from 'moment';

export default function WhatsAppSchedules() {
  const [meetings, setMeetings] = useState([]);
  const [events, setEvents] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [allMeetings, allEvents, schedules] = await Promise.all([
      base44.entities.Programme.filter({}),
      base44.entities.Event.filter({}),
      base44.entities.WhatsAppSchedule.filter({})
    ]);

    const now = moment();
    setMeetings(
      allMeetings
        .filter(m => !m.no_meeting && moment(m.date).isBetween(now.clone().subtract(1, 'week'), now.clone().add(6, 'weeks')))
        .sort((a, b) => moment(a.date).diff(moment(b.date)))
    );
    setEvents(
      allEvents
        .filter(e => moment(e.start_date).isAfter(now.clone().subtract(3, 'days')))
        .filter(e => moment(e.start_date).isBefore(now.clone().add(3, 'months')))
        .sort((a, b) => moment(a.start_date).diff(moment(b.start_date)))
    );
    setAllSchedules(schedules);
    setLoading(false);
  };

  const getScheduleCount = (id, field) => {
    const linked = allSchedules.filter(s => s[field] === id);
    return {
      scheduled: linked.filter(s => s.status === 'scheduled').length,
      sent: linked.filter(s => s.status === 'sent').length,
    };
  };

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const renderRow = (item, type) => {
    const idField = type === 'meeting' ? 'linked_meeting_id' : 'linked_event_id';
    const counts = getScheduleCount(item.id, idField);
    const isOpen = expanded[item.id];
    const dateStr = type === 'meeting' ? item.date : item.start_date;

    return (
      <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <button
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
          onClick={() => toggle(item.id)}
        >
          <div className="text-gray-400 flex-shrink-0">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 text-sm truncate">{item.title}</p>
            <p className="text-xs text-gray-400">{moment(dateStr).format('ddd D MMM YYYY')}</p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            {counts.scheduled > 0 && <Badge className="bg-blue-100 text-blue-700 text-xs">{counts.scheduled} pending</Badge>}
            {counts.sent > 0 && <Badge className="bg-green-100 text-green-700 text-xs">{counts.sent} sent</Badge>}
          </div>
        </button>
        {isOpen && (
          <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50">
            <WhatsAppScheduleManager
              {...(type === 'meeting' ? { meetingId: item.id } : { eventId: item.id })}
              title={item.title}
              startDateTime={dateStr}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav currentPage="WhatsAppSchedules" />
      <NavBarSpacer />

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#25D366] rounded-xl flex items-center justify-center shadow-sm">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Schedules</h1>
            <p className="text-sm text-gray-500">Schedule automated messages to group chats</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-6">
          💡 <strong>Tip:</strong> You can schedule a <strong>Risk Assessment link</strong> to send to the leaders group a few hours before any session, and a <strong>Parent Reminder</strong> message with customisable sections to the parent group.
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-8">
            {meetings.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Upcoming Meetings</h2>
                  <span className="text-xs text-gray-400">(next 6 weeks)</span>
                </div>
                <div className="space-y-2">{meetings.map(m => renderRow(m, 'meeting'))}</div>
              </section>
            )}

            {events.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Tent className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Upcoming Events</h2>
                </div>
                <div className="space-y-2">{events.map(e => renderRow(e, 'event'))}</div>
              </section>
            )}

            {meetings.length === 0 && events.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No upcoming meetings or events found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}