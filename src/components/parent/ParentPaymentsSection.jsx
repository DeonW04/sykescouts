import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Receipt, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import WebSubscriptionSection from './WebSubscriptionSection';
import InlinePayment from '../mobile/InlinePayment';

const ATTENDING_VALUES = new Set(['yes', 'yes, attending', 'attending']);

export default function ParentPaymentsSection({ child, portal }) {
  const queryClient = useQueryClient();
  const [payOpen, setPayOpen] = useState(null); // key: `${type}-${id}`

  const { data: reference } = useQuery({
    queryKey: ['parent-reference'],
    queryFn: async () => (await base44.functions.invoke('getParentReferenceData', {})).data,
    staleTime: 5 * 60 * 1000,
  });

  const children = portal?.children || [];
  const eventStatuses = portal?.eventPaymentStatuses || [];
  const meetingStatuses = portal?.meetingPaymentStatuses || [];
  const overrides = portal?.paymentOverrides || [];
  const actionResponses = portal?.actionResponses || [];
  const attendanceActions = reference?.attendanceActions || [];

  const events = reference?.events || [];
  const programmes = reference?.programmes || [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['parent-portal'] });

  const isAttendingEvent = (eventId) => {
    const action = attendanceActions.find(a => a.event_id === eventId);
    if (!action) return false;
    const resp = actionResponses.find(r =>
      r.action_required_id === action.id &&
      (r.member_id === child.id || r.child_member_id === child.id)
    );
    return !!(resp && ATTENDING_VALUES.has((resp.response_value || resp.response || '').toLowerCase()));
  };

  // ── Upcoming items with a cost for the selected child ──────────────────────
  const now = new Date();
  const upcoming = [];

  events
    .filter(e => (e.cost || 0) > 0 && e.section_ids?.includes(child.section_id))
    .forEach(e => {
      const override = overrides.find(o => o.event_id === e.id && o.member_id === child.id);
      const ps = eventStatuses.find(s => s.event_id === e.id && s.member_id === child.id);
      const paid = ps?.status === 'paid';
      if (override?.override_type === 'waived') return;
      if (!paid && !isAttendingEvent(e.id)) return; // only due if attending
      upcoming.push({ type: 'event', id: e.id, title: e.title, date: e.start_date, cost: e.cost, paid, ps });
    });

  programmes
    .filter(p => (p.cost || 0) > 0 && !p.no_meeting && p.section_id === child.section_id)
    .forEach(p => {
      const override = overrides.find(o => o.meeting_id === p.id && o.member_id === child.id);
      if (override?.override_type === 'waived') return;
      const ps = meetingStatuses.find(s => s.meeting_id === p.id && s.member_id === child.id);
      upcoming.push({ type: 'meeting', id: p.id, title: p.title, date: p.date, cost: p.cost, paid: ps?.status === 'paid', ps });
    });

  upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

  // ── Payment history — all paid statuses across all this parent's children ──
  const history = [
    ...eventStatuses.filter(s => s.status === 'paid').map(s => {
      const ev = events.find(e => e.id === s.event_id);
      return { ...s, title: ev?.title || 'Event', amount: ev?.cost, kind: 'Event' };
    }),
    ...meetingStatuses.filter(s => s.status === 'paid').map(s => {
      const m = programmes.find(p => p.id === s.meeting_id);
      return { ...s, title: m?.title || 'Meeting', amount: m?.cost, kind: 'Meeting' };
    }),
  ].sort((a, b) => new Date(b.paid_at || 0) - new Date(a.paid_at || 0));

  const childName = (memberId) => children.find(c => c.id === memberId)?.first_name;

  return (
    <div className="space-y-6">
      {/* Subscription */}
      <WebSubscriptionSection child={child} />

      {/* Upcoming payments */}
      <Card className="shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#7413dc]" />Payments Due
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-gray-500 text-sm">No events or meetings need payment.</p>
          ) : (
            <div className="divide-y">
              {upcoming.map(item => {
                const key = `${item.type}-${item.id}`;
                return (
                  <div key={key} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{item.title}</p>
                        <p className="text-xs text-gray-500">
                          {item.type === 'event' ? 'Event' : 'Meeting'} · {format(new Date(item.date), 'd MMM yyyy')} · £{item.cost.toFixed(2)}
                        </p>
                      </div>
                      {item.paid ? (
                        <Badge className="bg-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />Paid
                        </Badge>
                      ) : payOpen === key ? (
                        <Button size="sm" variant="ghost" onClick={() => setPayOpen(null)}>Cancel</Button>
                      ) : (
                        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setPayOpen(key)}>
                          Pay £{item.cost.toFixed(2)}
                        </Button>
                      )}
                    </div>
                    {payOpen === key && !item.paid && (
                      <div className="mt-3 max-w-md">
                        <InlinePayment
                          type={item.type}
                          id={item.id}
                          cost={Math.round(item.cost * 100)}
                          memberId={child.id}
                          paymentMethods={child.stripe_payment_methods || []}
                          onSuccess={() => { setPayOpen(null); invalidate(); }}
                          onCancel={() => setPayOpen(null)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card className="shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Receipt className="w-6 h-6 text-[#7413dc]" />Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm">No payments made yet.</p>
          ) : (
            <div className="divide-y">
              {history.map(h => (
                <div key={h.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{h.title}</p>
                    <p className="text-xs text-gray-500">
                      {h.kind}{childName(h.member_id) ? ` · ${childName(h.member_id)}` : ''}
                      {h.paid_at ? ` · Paid ${format(new Date(h.paid_at), 'd MMM yyyy')}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {h.card_brand && h.card_last4 && (
                      <span className="text-xs text-gray-500 capitalize flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" />{h.card_brand} ···· {h.card_last4}
                      </span>
                    )}
                    <span className="font-semibold text-green-700">
                      {typeof h.amount === 'number' ? `£${h.amount.toFixed(2)}` : 'Paid'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}