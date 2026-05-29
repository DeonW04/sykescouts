import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, Bell, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const fmt = n => `£${(n || 0).toFixed(2)}`;

export default function EventAttendingMembersStripe({ eventId, event }) {
  const [reminderSent, setReminderSent] = useState({});
  const cost = event?.cost || 0;
  const todayStr = new Date().toISOString().split('T')[0];

  const { data: paymentStatuses = [], refetch } = useQuery({
    queryKey: ['event-ps-stripe', eventId],
    queryFn: () => base44.entities.EventPaymentStatus.filter({ event_id: eventId }),
    enabled: !!eventId && cost > 0,
    refetchInterval: 30000,
  });

  const { data: ledgerIncome = 0 } = useQuery({
    queryKey: ['ledger-event-income-stripe', eventId],
    queryFn: async () => {
      const entries = await base44.entities.LedgerEntry.filter({ linked_event_id: eventId });
      return entries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
    },
    enabled: !!eventId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['actions-for-event-stripe', eventId],
    queryFn: () => base44.entities.ActionRequired.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ['responses-for-event-stripe', eventId, actions.map(a => a.id).join(',')],
    queryFn: async () => {
      if (!actions.length) return [];
      const all = await base44.entities.ActionResponse.filter({});
      return all.filter(r => actions.some(a => a.id === r.action_required_id));
    },
    enabled: actions.length > 0,
  });

  if (cost <= 0) return null;

  const attendanceAction = actions.find(a => a.action_purpose === 'attendance');
  const attendingMemberIds = attendanceAction
    ? [...new Set(responses
        .filter(r => r.action_required_id === attendanceAction.id && ['yes', 'Yes, attending', 'attending'].includes(r.response_value))
        .map(r => r.member_id))]
    : [];

  if (attendingMemberIds.length === 0) return null;

  const getPayStatus = (memberId) => {
    const ps = paymentStatuses.find(p => p.member_id === memberId);
    if (ps?.status === 'paid') return { status: 'paid', ps };
    const deadline = event?.payment_deadline;
    const endDate = (event?.end_date || event?.start_date)?.split('T')[0];
    const isOverdue = (deadline && todayStr > deadline) || (!deadline && endDate && todayStr > endDate);
    return { status: isOverdue ? 'overdue' : 'unpaid', ps: null };
  };

  const paidCount = attendingMemberIds.filter(id => getPayStatus(id).status === 'paid').length;
  const totalExpected = attendingMemberIds.length * cost;

  const sendReminder = async (member) => {
    const emails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
    for (const email of emails) {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `Payment reminder: ${event?.title || 'Event'}`,
        body: `Reminder: Payment of ${fmt(cost)} for ${event?.title || 'an event'} is outstanding. Please log in to the parent portal to pay.`,
      });
    }
    try {
      if (member.parent_one_email) {
        await base44.functions.invoke('sendPushNotification', {
          email: member.parent_one_email,
          title: 'Payment reminder',
          body: `Payment of ${fmt(cost)} for ${event?.title || 'an event'} is outstanding.`,
        });
      }
    } catch {}
    const sentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setReminderSent(prev => ({ ...prev, [member.id]: sentTime }));
    toast.success('Reminder sent to parents');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <CardTitle className="text-base">Attending Members — Stripe Payments</CardTitle>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {paidCount} of {attendingMemberIds.length} members have paid — {fmt(ledgerIncome)} of {fmt(totalExpected)} received.
        </p>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {attendingMemberIds.map(memberId => {
            const member = members.find(m => m.id === memberId);
            const { status, ps } = getPayStatus(memberId);
            const reminder = reminderSent[memberId];
            return (
              <div key={memberId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{member?.full_name || 'Unknown'}</p>
                  {status === 'paid' && ps?.paid_at && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(ps.paid_at), 'd MMM yyyy')}
                      {ps.card_brand && ` · ${ps.card_brand.charAt(0).toUpperCase() + ps.card_brand.slice(1)} ···· ${ps.card_last4}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {status === 'paid' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Paid
                    </span>
                  ) : status === 'overdue' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 border border-red-300 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" /> Overdue
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                      <XCircle className="w-3 h-3" /> Unpaid
                    </span>
                  )}
                  {status !== 'paid' && (
                    reminder ? (
                      <span className="text-xs text-gray-400">Sent {reminder}</span>
                    ) : (
                      <Button size="sm" variant="outline" className="text-xs h-7 gap-1"
                        onClick={() => member && sendReminder(member)}>
                        <Bell className="w-3 h-3" /> Send reminder
                      </Button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}