import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar, Lock, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

export default function TreasurerEventFinances() {
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [closeDialog, setCloseDialog] = useState(null);
  const [actualCost, setActualCost] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => base44.entities.Event.list('-start_date', 200) });
  const { data: eventAttendance = [] } = useQuery({ queryKey: ['event-attendance'], queryFn: () => base44.entities.EventAttendance.filter({}) });
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: () => base44.entities.Member.filter({ active: true }) });
  const { data: payments = [] } = useQuery({ queryKey: ['member-payments'], queryFn: () => base44.entities.MemberPayment.list('-date', 500) });
  const { data: allocations = [] } = useQuery({ queryKey: ['receipt-allocations'], queryFn: () => base44.entities.ReceiptAllocation.filter({}) });

  const getEventStats = (event) => {
    const attendees = eventAttendance.filter(a => a.event_id === event.id && a.rsvp_status === 'attending');
    const cost = event.cost || 0;
    const totalIncome = attendees.filter(a => a.payment_status === 'paid').length * cost;
    const totalExpenses = allocations.filter(a => a.linked_event_id === event.id && a.status === 'allocated').reduce((s, a) => s + (a.amount || 0), 0);
    return { attendees, totalIncome, totalExpenses, profitOrLoss: totalIncome - totalExpenses };
  };

  const getPaymentStatus = (eventId, memberId) => {
    const eventPayments = payments.filter(p => p.related_event_id === eventId && p.member_id === memberId);
    const totalPaid = eventPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const event = events.find(e => e.id === eventId);
    const cost = event?.cost || 0;
    if (totalPaid >= cost) return 'paid';
    if (totalPaid > 0) return 'partial';
    return 'unpaid';
  };

  const getPaymentAmount = (eventId, memberId) => {
    return payments.filter(p => p.related_event_id === eventId && p.member_id === memberId)
      .reduce((s, p) => s + (p.amount || 0), 0);
  };

  const handleCloseFinances = async () => {
    if (!closeDialog) return;
    setSaving(true);
    try {
      await base44.entities.Event.update(closeDialog.id, {
        actual_cost: parseFloat(actualCost || closeDialog.estimated_cost || 0),
        finance_status: 'closed',
      });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event finances closed');
      setCloseDialog(null);
      setActualCost('');
    } catch (e) { toast.error('Failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const paymentStatusBadge = (status) => {
    if (status === 'paid') return <Badge className="bg-green-100 text-green-800 text-xs">Paid</Badge>;
    if (status === 'partial') return <Badge className="bg-amber-100 text-amber-800 text-xs">Partial</Badge>;
    return <Badge className="bg-red-100 text-red-800 text-xs">Unpaid</Badge>;
  };

  return (
    <TreasurerLayout title="Event Finances">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Event list */}
        <Card>
          <CardHeader><CardTitle className="text-base">Events</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {events.filter(e => e.cost > 0).map(event => {
                const { totalIncome, totalExpenses } = getEventStats(event);
                return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`px-4 py-3 cursor-pointer border-b hover:bg-gray-50 ${selectedEvent?.id === event.id ? 'bg-green-50 border-l-4 border-l-[#1a472a]' : ''}`}
                  >
                    <p className="font-medium text-sm">{event.title}</p>
                    <p className="text-xs text-gray-500">{event.start_date?.split('T')[0]}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {event.finance_status === 'closed'
                        ? <Badge className="bg-gray-100 text-gray-600 text-xs"><Lock className="w-2 h-2 mr-1" />Closed</Badge>
                        : <Badge className="bg-green-100 text-green-700 text-xs">Open</Badge>
                      }
                      <span className="text-xs text-gray-500">{fmt(event.cost)}/person</span>
                    </div>
                  </div>
                );
              })}
              {events.filter(e => e.cost > 0).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No events with costs</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Event detail */}
        <div className="lg:col-span-2">
          {!selectedEvent ? (
            <Card className="flex items-center justify-center h-64">
              <div className="text-center text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select an event to view finances</p>
              </div>
            </Card>
          ) : (() => {
            const { attendees, totalIncome, totalExpenses, profitOrLoss } = getEventStats(selectedEvent);
            const attendeeMembers = attendees.map(a => ({
              ...a,
              member: members.find(m => m.id === a.member_id),
              paid: getPaymentAmount(selectedEvent.id, a.member_id),
              status: getPaymentStatus(selectedEvent.id, a.member_id),
            }));

            return (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                      <CardTitle>{selectedEvent.title}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{selectedEvent.start_date?.split('T')[0]}</p>
                    </div>
                    {selectedEvent.finance_status !== 'closed' && (
                      <Button size="sm" variant="outline" onClick={() => { setCloseDialog(selectedEvent); setActualCost(String(selectedEvent.estimated_cost || '')); }}>
                        <Lock className="w-3 h-3 mr-1" />Close Finances
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Cost/Person</p>
                        <p className="font-bold">{fmt(selectedEvent.cost)}</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-gray-500">Income</p>
                        <p className="font-bold text-green-700">{fmt(totalIncome)}</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-xs text-gray-500">Expenses</p>
                        <p className="font-bold text-red-700">{fmt(totalExpenses)}</p>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${profitOrLoss >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                        <p className="text-xs text-gray-500">P/L</p>
                        <p className={`font-bold ${profitOrLoss >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{fmt(profitOrLoss)}</p>
                      </div>
                    </div>

                    <h3 className="font-semibold text-sm mb-3">Participant Payments ({attendeeMembers.length})</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 text-gray-500 font-medium">Member</th>
                            <th className="text-right py-2 text-gray-500 font-medium">Cost</th>
                            <th className="text-right py-2 text-gray-500 font-medium">Paid</th>
                            <th className="text-right py-2 text-gray-500 font-medium">Remaining</th>
                            <th className="text-center py-2 text-gray-500 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendeeMembers.map(({ id, member, paid, status }) => (
                            <tr key={id} className="border-b hover:bg-gray-50">
                              <td className="py-2">{member?.full_name || 'Unknown'}</td>
                              <td className="py-2 text-right">{fmt(selectedEvent.cost)}</td>
                              <td className="py-2 text-right text-green-600">{fmt(paid)}</td>
                              <td className="py-2 text-right text-red-600">{fmt(Math.max(0, (selectedEvent.cost || 0) - paid))}</td>
                              <td className="py-2 text-center">{paymentStatusBadge(status)}</td>
                            </tr>
                          ))}
                          {attendeeMembers.length === 0 && (
                            <tr><td colSpan={5} className="py-6 text-center text-gray-400">No attendees recorded</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Close Finances Dialog */}
      <Dialog open={!!closeDialog} onOpenChange={open => !open && setCloseDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close Event Finances — {closeDialog?.title}</DialogTitle></DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-gray-600">Closing the finances will lock this event's financial records. Please confirm the actual total cost.</p>
            <div>
              <Label>Actual Total Cost (£)</Label>
              <Input type="number" step="0.01" min="0" value={actualCost} onChange={e => setActualCost(e.target.value)} placeholder="0.00" />
              {closeDialog?.estimated_cost && <p className="text-xs text-gray-400 mt-1">Estimated: {fmt(closeDialog.estimated_cost)}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(null)}>Cancel</Button>
            <Button onClick={handleCloseFinances} disabled={saving} className="bg-[#1a472a] hover:bg-[#13381f]">
              <Lock className="w-4 h-4 mr-2" />{saving ? 'Closing...' : 'Close Finances'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TreasurerLayout>
  );
}