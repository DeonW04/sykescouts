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
import { Calendar, Lock, TrendingUp, TrendingDown, Receipt, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

export default function TreasurerEventFinances() {
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [closeDialog, setCloseDialog] = useState(null);
  const [actualCost, setActualCost] = useState('');
  const [saving, setSaving] = useState(false);
  const [showExpenses, setShowExpenses] = useState(true);
  const [showLedger, setShowLedger] = useState(true);

  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => base44.entities.Event.list('-start_date', 200) });
  const { data: eventAttendance = [] } = useQuery({ queryKey: ['event-attendance'], queryFn: () => base44.entities.EventAttendance.filter({}) });
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: () => base44.entities.Member.filter({ active: true }) });
  const { data: payments = [] } = useQuery({ queryKey: ['member-payments'], queryFn: () => base44.entities.MemberPayment.list('-date', 500) });
  const { data: allocations = [] } = useQuery({ queryKey: ['receipt-allocations'], queryFn: () => base44.entities.ReceiptAllocation.filter({}) });
  const { data: ledgerEntries = [] } = useQuery({ queryKey: ['ledger-entries'], queryFn: () => base44.entities.LedgerEntry.list('-date', 500) });

  const getEventData = (event) => {
    const attendees = eventAttendance.filter(a => a.event_id === event.id && a.rsvp_status === 'attending');
    const cost = event.cost || 0;

    // Calculated figures (based on attendee + receipt data)
    const attendingPaid = attendees.filter(a => a.payment_status === 'paid').length;
    const calcIncome = attendingPaid * cost;
    const eventAllocations = allocations.filter(a => a.linked_event_id === event.id && a.status === 'allocated');
    const calcExpenses = eventAllocations.reduce((s, a) => s + (a.amount || 0), 0);

    // Actual ledger figures
    const eventLedger = ledgerEntries.filter(e => e.linked_event_id === event.id);
    const actualIncome = eventLedger.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
    const actualExpenses = eventLedger.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);

    // Per-member payments
    const attendeeMembers = attendees.map(a => {
      const memberPayments = payments.filter(p => p.related_event_id === event.id && p.member_id === a.member_id);
      const totalPaid = memberPayments.reduce((s, p) => s + (p.amount || 0), 0);
      const status = totalPaid >= cost ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';
      return { ...a, member: members.find(m => m.id === a.member_id), paid: totalPaid, status, payments: memberPayments };
    });

    return {
      attendees, attendeeMembers,
      calcIncome, calcExpenses, calcNet: calcIncome - calcExpenses,
      actualIncome, actualExpenses, actualNet: actualIncome - actualExpenses,
      eventAllocations, eventLedger,
    };
  };

  const handleCloseFinances = async () => {
    if (!closeDialog) return;
    setSaving(true);
    try {
      await base44.entities.Event.update(closeDialog.id, {
        actual_cost: parseFloat(actualCost || 0),
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

  const eventsWithCost = events.filter(e => e.cost > 0 || allocations.some(a => a.linked_event_id === e.id));

  return (
    <TreasurerLayout title="Event Finances">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Event list */}
        <Card>
          <CardHeader><CardTitle className="text-base">Events</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {eventsWithCost.map(event => (
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
                    {event.cost > 0 && <span className="text-xs text-gray-500">{fmt(event.cost)}/person</span>}
                  </div>
                </div>
              ))}
              {eventsWithCost.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No events with finances</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Event detail */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedEvent ? (
            <Card className="flex items-center justify-center h-64">
              <div className="text-center text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select an event to view finances</p>
              </div>
            </Card>
          ) : (() => {
            const { attendeeMembers, calcIncome, calcExpenses, calcNet, actualIncome, actualExpenses, actualNet, eventAllocations, eventLedger } = getEventData(selectedEvent);

            return (
              <>
                {/* Header */}
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                      <CardTitle>{selectedEvent.title}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{selectedEvent.start_date?.split('T')[0]}</p>
                    </div>
                    {selectedEvent.finance_status !== 'closed' && (
                      <Button size="sm" variant="outline" onClick={() => { setCloseDialog(selectedEvent); setActualCost(''); }}>
                        <Lock className="w-3 h-3 mr-1" />Close Finances
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Calculated figures */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-semibold text-blue-800">Calculated Figures</h3>
                        <span className="text-xs text-gray-400">(based on attendees & receipts)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-green-50 border border-green-100 rounded-lg">
                          <p className="text-xs text-gray-500">Expected Income</p>
                          <p className="font-bold text-green-700 text-lg">{fmt(calcIncome)}</p>
                          <p className="text-xs text-gray-400">{attendeeMembers.filter(a => a.status === 'paid').length}/{attendeeMembers.length} paid</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 border border-red-100 rounded-lg">
                          <p className="text-xs text-gray-500">Allocated Expenses</p>
                          <p className="font-bold text-red-700 text-lg">{fmt(calcExpenses)}</p>
                          <p className="text-xs text-gray-400">{eventAllocations.length} receipt{eventAllocations.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className={`text-center p-3 rounded-lg border ${calcNet >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                          <p className="text-xs text-gray-500">Net</p>
                          <p className={`font-bold text-lg ${calcNet >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{fmt(calcNet)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actual ledger figures */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Receipt className="w-4 h-4 text-gray-600" />
                        <h3 className="text-sm font-semibold text-gray-700">Actual Ledger Figures</h3>
                        <span className="text-xs text-gray-400">(from master ledger entries)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-gray-50 border rounded-lg">
                          <p className="text-xs text-gray-500">Ledger Income</p>
                          <p className="font-bold text-gray-800">{fmt(actualIncome)}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 border rounded-lg">
                          <p className="text-xs text-gray-500">Ledger Expenses</p>
                          <p className="font-bold text-gray-800">{fmt(actualExpenses)}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 border rounded-lg">
                          <p className="text-xs text-gray-500">Ledger Net</p>
                          <p className={`font-bold ${actualNet >= 0 ? 'text-gray-800' : 'text-red-700'}`}>{fmt(actualNet)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Participant Payments */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowExpenses(!showExpenses)}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <CardTitle className="text-base">Participant Payments ({attendeeMembers.length})</CardTitle>
                      </div>
                      {showExpenses ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </CardHeader>
                  {showExpenses && (
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left py-2 px-2 text-gray-500 font-medium">Member</th>
                              <th className="text-right py-2 px-2 text-gray-500 font-medium">Cost</th>
                              <th className="text-right py-2 px-2 text-gray-500 font-medium">Paid</th>
                              <th className="text-right py-2 px-2 text-gray-500 font-medium">Remaining</th>
                              <th className="text-center py-2 px-2 text-gray-500 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendeeMembers.map(({ id, member, paid, status }) => (
                              <tr key={id} className="border-b hover:bg-gray-50">
                                <td className="py-2 px-2">{member?.full_name || 'Unknown'}</td>
                                <td className="py-2 px-2 text-right">{fmt(selectedEvent.cost)}</td>
                                <td className="py-2 px-2 text-right text-green-600">{fmt(paid)}</td>
                                <td className="py-2 px-2 text-right text-red-600">{fmt(Math.max(0, (selectedEvent.cost || 0) - paid))}</td>
                                <td className="py-2 px-2 text-center">{paymentStatusBadge(status)}</td>
                              </tr>
                            ))}
                            {attendeeMembers.length > 0 && (
                              <tr className="border-t-2 font-semibold bg-gray-50">
                                <td className="py-2 px-2">Total</td>
                                <td className="py-2 px-2 text-right">{fmt(attendeeMembers.length * (selectedEvent.cost || 0))}</td>
                                <td className="py-2 px-2 text-right text-green-600">{fmt(attendeeMembers.reduce((s, a) => s + a.paid, 0))}</td>
                                <td className="py-2 px-2 text-right text-red-600">{fmt(attendeeMembers.reduce((s, a) => s + Math.max(0, (selectedEvent.cost || 0) - a.paid), 0))}</td>
                                <td />
                              </tr>
                            )}
                            {attendeeMembers.length === 0 && (
                              <tr><td colSpan={5} className="py-6 text-center text-gray-400">No attendees recorded</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Itemised Expenses */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowLedger(!showLedger)}>
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4" />
                        <CardTitle className="text-base">Itemised Receipts & Allocations ({eventAllocations.length})</CardTitle>
                      </div>
                      {showLedger ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </CardHeader>
                  {showLedger && (
                    <CardContent>
                      {eventAllocations.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No receipts allocated to this event yet</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-gray-50">
                                <th className="text-left py-2 px-2 text-gray-500 font-medium">Date</th>
                                <th className="text-left py-2 px-2 text-gray-500 font-medium">Category</th>
                                <th className="text-left py-2 px-2 text-gray-500 font-medium">Paid By</th>
                                <th className="text-left py-2 px-2 text-gray-500 font-medium">Notes</th>
                                <th className="text-right py-2 px-2 text-gray-500 font-medium">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {eventAllocations.map(alloc => (
                                <tr key={alloc.id} className="border-b hover:bg-gray-50">
                                  <td className="py-2 px-2 text-gray-500">{alloc.allocation_date || '—'}</td>
                                  <td className="py-2 px-2 capitalize">{alloc.category?.replace(/_/g, ' ')}</td>
                                  <td className="py-2 px-2">
                                    <Badge variant="outline" className={`text-xs ${alloc.payment_method === 'scout_bank_card' ? 'border-blue-300 text-blue-700' : 'border-purple-300 text-purple-700'}`}>
                                      {alloc.payment_method === 'scout_bank_card' ? 'Bank Card' : 'Personal'}
                                    </Badge>
                                  </td>
                                  <td className="py-2 px-2 text-gray-500 text-xs max-w-40 truncate">{alloc.notes || '—'}</td>
                                  <td className="py-2 px-2 text-right font-medium text-red-700">{fmt(alloc.amount)}</td>
                                </tr>
                              ))}
                              <tr className="border-t-2 font-semibold bg-gray-50">
                                <td colSpan={4} className="py-2 px-2">Total Expenses</td>
                                <td className="py-2 px-2 text-right text-red-700">{fmt(eventAllocations.reduce((s, a) => s + (a.amount || 0), 0))}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>

                {/* Actual Ledger Entries */}
                {eventLedger.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">Ledger Entries for this Event ({eventLedger.length})</CardTitle></CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left py-2 px-2 text-gray-500 font-medium">Date</th>
                              <th className="text-left py-2 px-2 text-gray-500 font-medium">Description</th>
                              <th className="text-left py-2 px-2 text-gray-500 font-medium">Category</th>
                              <th className="text-left py-2 px-2 text-gray-500 font-medium">Type</th>
                              <th className="text-right py-2 px-2 text-gray-500 font-medium">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {eventLedger.map(entry => (
                              <tr key={entry.id} className="border-b hover:bg-gray-50">
                                <td className="py-2 px-2 text-gray-500">{entry.date}</td>
                                <td className="py-2 px-2">{entry.description}</td>
                                <td className="py-2 px-2 capitalize">{entry.category?.replace(/_/g, ' ')}</td>
                                <td className="py-2 px-2">
                                  <Badge className={entry.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                    {entry.type}
                                  </Badge>
                                </td>
                                <td className={`py-2 px-2 text-right font-medium ${entry.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                                  {entry.type === 'expense' ? '-' : ''}{fmt(entry.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Close Finances Dialog */}
      <Dialog open={!!closeDialog} onOpenChange={open => !open && setCloseDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close Event Finances — {closeDialog?.title}</DialogTitle></DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-gray-600">Closing finances will lock this event's records.</p>
            <div>
              <Label>Actual Total Cost (£)</Label>
              <Input type="number" step="0.01" min="0" value={actualCost} onChange={e => setActualCost(e.target.value)} placeholder="0.00" />
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