import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Send } from 'lucide-react';
import { toast } from 'sonner';

const fmt = n => `£${(n || 0).toFixed(2)}`;

function ProgressBar({ paid, total }) {
  const pct = total > 0 ? (paid / total) * 100 : 0;
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

function PaymentCard({ item, showReminders, onSendReminders, sending }) {
  const total = item.paid + item.unpaid + item.overdue;
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{item.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {item.date ? new Date(item.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Cost per member: {fmt(item.cost)}</p>
          </div>
          {showReminders && (
            <Button
              size="sm"
              variant="outline"
              className="flex-shrink-0 text-[#7413dc] border-[#7413dc] hover:bg-purple-50 text-xs"
              onClick={onSendReminders}
              disabled={sending}
            >
              <Send className="w-3 h-3 mr-1.5" />
              {sending ? 'Sending…' : 'Send all reminders'}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs mb-2">
          <span className="text-green-600 font-semibold">{item.paid} paid</span>
          <span className="text-red-500 font-semibold">{item.unpaid} unpaid</span>
          {item.overdue > 0 && <span className="text-red-700 font-bold">{item.overdue} overdue</span>}
          <span className="text-gray-400 ml-auto">of {total} attending</span>
        </div>
        <ProgressBar paid={item.paid} total={total} />
      </CardContent>
    </Card>
  );
}

export default function PaymentTrackerTab({ selectedSectionId }) {
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  const { data: events = [] } = useQuery({ queryKey: ['events-tracker'], queryFn: () => base44.entities.Event.list('-start_date', 200) });
  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes-tracker', selectedSectionId],
    queryFn: () => selectedSectionId ? base44.entities.Programme.filter({ section_id: selectedSectionId }) : [],
    enabled: !!selectedSectionId,
  });
  const { data: members = [] } = useQuery({
    queryKey: ['members-tracker', selectedSectionId],
    queryFn: () => selectedSectionId ? base44.entities.Member.filter({ section_id: selectedSectionId, active: true }) : [],
    enabled: !!selectedSectionId,
  });
  const { data: eventPayStatuses = [] } = useQuery({ queryKey: ['event-pay-statuses'], queryFn: () => base44.entities.EventPaymentStatus.filter({}) });
  const { data: meetingPayStatuses = [] } = useQuery({ queryKey: ['meeting-pay-statuses'], queryFn: () => base44.entities.MeetingPaymentStatus.filter({}) });

  const memberIds = useMemo(() => new Set(members.map(m => m.id)), [members]);

  const items = useMemo(() => {
    const result = [];

    // Events with cost in this section
    const sectionEvents = events.filter(e => e.section_ids?.includes(selectedSectionId) && (e.cost || 0) > 0);
    for (const event of sectionEvents) {
      const statuses = eventPayStatuses.filter(ps => ps.event_id === event.id && memberIds.has(ps.member_id));
      if (!statuses.length) continue;
      const paid = statuses.filter(s => s.status === 'paid' || s.status === 'waived').length;
      const overdue = statuses.filter(s => s.status === 'overdue').length;
      const unpaid = statuses.filter(s => s.status === 'unpaid').length;
      result.push({ id: event.id, type: 'event', name: event.title, date: event.start_date, cost: event.cost, paid, unpaid, overdue });
    }

    // Meetings with cost
    const costMeetings = programmes.filter(p => p.has_cost && (p.cost || 0) > 0);
    for (const prog of costMeetings) {
      const statuses = meetingPayStatuses.filter(ps => ps.meeting_id === prog.id && memberIds.has(ps.member_id));
      if (!statuses.length) continue;
      const paid = statuses.filter(s => s.status === 'paid' || s.status === 'waived').length;
      const overdue = statuses.filter(s => s.status === 'overdue').length;
      const unpaid = statuses.filter(s => s.status === 'unpaid').length;
      result.push({ id: prog.id, type: 'meeting', name: prog.title, date: prog.date, cost: prog.cost, paid, unpaid, overdue });
    }

    return result.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [events, programmes, eventPayStatuses, meetingPayStatuses, memberIds, selectedSectionId]);

  const activeItems = useMemo(() => items.filter(item => item.unpaid > 0 || item.overdue > 0), [items]);
  const completedItems = useMemo(() => items.filter(item => item.unpaid === 0 && item.overdue === 0 && item.paid > 0), [items]);

  const handleSendReminders = async (item) => {
    const key = `${item.type}-${item.id}`;
    setSendingId(key);
    try {
      if (item.type === 'event') {
        await base44.functions.invoke('notifyParentsEventReminder', { event_id: item.id });
      } else {
        await base44.functions.invoke('sendMeetingReminder', { programme_id: item.id });
      }
      toast.success('Reminders sent successfully');
    } catch (e) {
      toast.error('Failed to send reminders: ' + e.message);
    } finally {
      setSendingId(null);
    }
  };

  if (!selectedSectionId) return <p className="text-center text-gray-400 py-12">Please select a section.</p>;

  return (
    <div className="space-y-8">
      {/* Active outstanding */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Outstanding Payments
          <span className="ml-2 text-xs font-normal text-gray-400">({activeItems.length} item{activeItems.length !== 1 ? 's' : ''})</span>
        </h3>
        {activeItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <p className="text-green-600 font-semibold">All caught up!</p>
            <p className="text-sm text-gray-400 mt-1">No outstanding payments across any events or meetings.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeItems.map(item => (
              <PaymentCard
                key={`${item.type}-${item.id}`}
                item={item}
                showReminders
                onSendReminders={() => handleSendReminders(item)}
                sending={sendingId === `${item.type}-${item.id}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Completed */}
      {completedItems.length > 0 && (
        <div>
          <button
            onClick={() => setCompletedExpanded(e => !e)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
          >
            {completedExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Completed
            <span className="text-xs font-normal text-gray-400">({completedItems.length} item{completedItems.length !== 1 ? 's' : ''})</span>
          </button>
          {completedExpanded && (
            <div className="grid gap-4 sm:grid-cols-2 mt-3">
              {completedItems.map(item => (
                <PaymentCard key={`${item.type}-${item.id}`} item={item} showReminders={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}