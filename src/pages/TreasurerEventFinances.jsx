import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar, Lock, TrendingUp, TrendingDown, Receipt, Users, ChevronDown, ChevronRight, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;
const today = new Date().toISOString().split('T')[0];

export default function TreasurerEventFinances() {
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [closeDialog, setCloseDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPayments, setShowPayments] = useState(true);
  const [showReceipts, setShowReceipts] = useState(true);

  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => base44.entities.Event.list('-start_date', 200) });
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: () => base44.entities.Member.filter({ active: true }) });
  const { data: payments = [] } = useQuery({ queryKey: ['member-payments'], queryFn: () => base44.entities.MemberPayment.list('-date', 500) });
  const { data: allocations = [] } = useQuery({ queryKey: ['receipt-allocations'], queryFn: () => base44.entities.ReceiptAllocation.filter({}) });
  const { data: ledgerEntries = [] } = useQuery({ queryKey: ['ledger-entries'], queryFn: () => base44.entities.LedgerEntry.list('-date', 500) });
  const { data: actionsRequired = [] } = useQuery({ queryKey: ['actions-required-all'], queryFn: () => base44.entities.ActionRequired.filter({}) });
  const { data: actionResponses = [] } = useQuery({ queryKey: ['action-responses-all'], queryFn: () => base44.entities.ActionResponse.filter({}) });
  const { data: eventAttendances = [] } = useQuery({ queryKey: ['event-attendances-all'], queryFn: () => base44.entities.EventAttendance.filter({}) });

  const getAttendingMemberIds = (event) => {
    const evActions = actionsRequired.filter(a => a.event_id === event.id && a.action_purpose === 'attendance');
    if (evActions.length > 0) {
      return actionResponses
        .filter(r => evActions.some(a => a.id === r.action_required_id) &&
          (r.response_value === 'Yes, attending' || r.response_value === 'yes'))
        .map(r => r.member_id);
    }
    return eventAttendances.filter(a => a.event_id === event.id).map(a => a.member_id);
  };

  const getEventData = (event) => {
    const cost = event.cost || 0;
    const attendingMemberIds = getAttendingMemberIds(event);
    const eventPayments = payments.filter(p => p.related_event_id === event.id);
    const eventAllocations = allocations.filter(a => a.linked_event_id === event.id && a.status === 'allocated');
    const eventLedger = ledgerEntries.filter(e => e.linked_event_id === event.id);

    // Expected income from attending members
    const expectedIncome = attendingMemberIds.length * cost;
    // Estimated expenses (receipt allocations)
    const estimatedExpenses = eventAllocations.reduce((s, a) => s + (a.amount || 0), 0);

    // Ledger income/expenses
    const ledgerIncome = eventLedger.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
    const ledgerExpenses = eventLedger.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);

    const attendeeMemberData = attendingMemberIds.map(memberId => {
      const member = members.find(m => m.id === memberId);
      const paid = eventPayments.filter(p => p.member_id === memberId).reduce((s, p) => s + (p.amount || 0), 0);
      return { memberId, member, paid, cost };
    });

    return {
      attendingMemberIds, attendeeMemberData,
      expectedIncome, estimatedExpenses,
      netEstimate: expectedIncome - estimatedExpenses,
      ledgerIncome, ledgerExpenses,
      ledgerNet: ledgerIncome - ledgerExpenses,
      eventAllocations, eventLedger,
    };
  };

  const handleCloseFinances = async () => {
    if (!closeDialog) return;
    setSaving(true);
    try {
      await base44.entities.Event.update(closeDialog.id, { finance_status: 'closed' });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event finances closed');
      setCloseDialog(null);
      setSelectedEvent(prev => ({ ...prev, finance_status: 'closed' }));
    } catch (e) { toast.error('Failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const StatusPill = ({ cost, paid }) => {
    if (paid === 0) return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <XCircle className="w-3 h-3" /> Unpaid
      </span>
    );
    if (paid === cost) return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
        <CheckCircle className="w-3 h-3" /> Paid
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" /> Incorrect Amount
      </span>
    );
  };

  const eventsWithCost = events.filter(e => e.cost > 0 || allocations.some(a => a.linked_event_id === e.id));
  const isPast = (event) => (event.end_date || event.start_date)?.split('T')[0] < today;

  return (
    <TreasurerLayout title="Event Finances">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Event list */}
        <Card>
          <CardHeader><CardTitle className="text-base">Events</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {eventsWithCost.map(event => {
                const past = isPast(event);
                const unclosed = past && event.finance_status !== 'closed';
                return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`px-4 py-3 cursor-pointer border-b hover:bg-gray-50 ${selectedEvent?.id === event.id ? 'bg-green-50 border-l-4 border-l-[#1a472a]' : ''}`}
                  >
                    <p className="font-medium text-sm">{event.title}</p>
                    <p className="text-xs text-gray-500">{event.start_date?.split('T')[0]}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {event.finance_status === 'closed'
                        ? <Badge className="bg-gray-100 text-gray-600 text-xs"><Lock className="w-2 h-2 mr-1" />Closed</Badge>
                        : unclosed
                        ? <Badge className="bg-red-100 text-red-700 text-xs">UNCLOSED</Badge>
                        : <Badge className="bg-green-100 text-green-700 text-xs">Open</Badge>
                      }
                      {event.cost > 0 && <span className="text-xs text-gray-500">{fmt(event.cost)}/person</span>}
                    </div>
                  </div>
                );
              })}
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
            const { attendeeMemberData, expectedIncome, estimatedExpenses, netEstimate, ledgerIncome, ledgerExpenses, ledgerNet, eventAllocations, eventLedger } = getEventData(selectedEvent);
            const past = isPast(selectedEvent);
            const unclosed = past && selectedEvent.finance_status !== 'closed';

            return (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                      <CardTitle>{selectedEvent.title}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{selectedEvent.start_date?.split('T')[0]}</p>
                      {unclosed && (
                        <Badge className="bg-red-100 text-red-700 mt-1">UNCLOSED — Finance closure required</Badge>
                      )}
                    </div>
                    {selectedEvent.finance_status !== 'closed' && (
                      <Button size="sm" variant="outline" onClick={() => setCloseDialog(selectedEvent)}>
                        <Lock className="w-3 h-3 mr-1" />Close Finances
                      </Button>
                    )}
                    {selectedEvent.finance_status === 'closed' && (
                      <Badge className="bg-gray-100 text-gray-600"><Lock className="w-3 h-3 mr-1" />Closed</Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Top 3 — Estimates */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Estimates</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-green-50 border border-green-100 rounded-lg">
                          <p className="text-xs text-gray-500">Expected Income</p>
                          <p className="font-bold text-green-700 text-lg">{fmt(expectedIncome)}</p>
                          <p className="text-xs text-gray-400">{attendeeMemberData.length} attending</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 border border-red-100 rounded-lg">
                          <p className="text-xs text-gray-500">Estimated Expenses</p>
                          <p className="font-bold text-red-700 text-lg">{fmt(estimatedExpenses)}</p>
                          <p className="text-xs text-gray-400">{eventAllocations.length} receipts</p>
                        </div>
                        <div className={`text-center p-3 rounded-lg border ${netEstimate >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                          <p className="text-xs text-gray-500">Net Estimate</p>
                          <p className={`font-bold text-lg ${netEstimate >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{fmt(netEstimate)}</p>
                        </div>
                      </div>
                    </div>
                    {/* Bottom 3 — Ledger actuals */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Ledger Actuals</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-gray-50 border rounded-lg">
                          <p className="text-xs text-gray-500">Ledger Income</p>
                          <p className="font-bold text-gray-800">{fmt(ledgerIncome)}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 border rounded-lg">
                          <p className="text-xs text-gray-500">Ledger Expenses</p>
                          <p className="font-bold text-gray-800">{fmt(ledgerExpenses)}</p>
                        </div>
                        <div className={`text-center p-3 border rounded-lg ${ledgerNet >= 0 ? 'bg-gray-50' : 'bg-red-50 border-red-100'}`}>
                          <p className="text-xs text-gray-500">Ledger Net</p>
                          <p className={`font-bold ${ledgerNet >= 0 ? 'text-gray-800' : 'text-red-700'}`}>{fmt(ledgerNet)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Attendee payments */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowPayments(!showPayments)}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <CardTitle className="text-base">Attending Members — Payments ({attendeeMemberData.length})</CardTitle>
                      </div>
                      {showPayments ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </CardHeader>
                  {showPayments && (
                    <CardContent>
                      {attendeeMemberData.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No attending members found</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-gray-50">
                                <th className="text-left py-2 px-2 text-gray-500 font-medium">Member</th>
                                <th className="text-right py-2 px-2 text-gray-500 font-medium">Expected</th>
                                <th className="text-right py-2 px-2 text-gray-500 font-medium">Paid</th>
                                <th className="text-center py-2 px-2 text-gray-500 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attendeeMemberData.map(({ memberId, member, paid, cost }) => (
                                <tr key={memberId} className="border-b hover:bg-gray-50">
                                  <td className="py-2 px-2 font-medium">{member?.full_name || 'Unknown'}</td>
                                  <td className="py-2 px-2 text-right">{fmt(cost)}</td>
                                  <td className="py-2 px-2 text-right text-green-600">{fmt(paid)}</td>
                                  <td className="py-2 px-2 text-center"><StatusPill cost={cost} paid={paid} /></td>
                                </tr>
                              ))}
                              <tr className="border-t-2 font-semibold bg-gray-50">
                                <td className="py-2 px-2">Total</td>
                                <td className="py-2 px-2 text-right">{fmt(expectedIncome)}</td>
                                <td className="py-2 px-2 text-right text-green-600">{fmt(attendeeMemberData.reduce((s, a) => s + a.paid, 0))}</td>
                                <td />
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>

                {/* Receipts & Ledger */}
                {(eventAllocations.length > 0 || eventLedger.length > 0) && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowReceipts(!showReceipts)}>
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4" />
                          <CardTitle className="text-base">Receipts & Ledger Entries</CardTitle>
                        </div>
                        {showReceipts ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </CardHeader>
                    {showReceipts && (
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-gray-50">
                                <th className="text-left py-2 px-2 text-gray-500 font-medium">Source</th>
                                <th className="text-left py-2 px-2 text-gray-500 font-medium">Category</th>
                                <th className="text-left py-2 px-2 text-gray-500 font-medium">Notes/Description</th>
                                <th className="text-left py-2 px-2 text-gray-500 font-medium">Type</th>
                                <th className="text-right py-2 px-2 text-gray-500 font-medium">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {eventAllocations.map(alloc => (
                                <tr key={alloc.id} className="border-b hover:bg-gray-50">
                                  <td className="py-2 px-2">
                                    <Badge variant="outline" className={`text-xs ${alloc.payment_method === 'scout_bank_card' ? 'border-blue-300 text-blue-700' : 'border-purple-300 text-purple-700'}`}>
                                      {alloc.payment_method === 'scout_bank_card' ? 'Bank Card' : 'Personal'}
                                    </Badge>
                                  </td>
                                  <td className="py-2 px-2 capitalize">{alloc.category?.replace(/_/g, ' ')}</td>
                                  <td className="py-2 px-2 text-gray-500 text-xs">{alloc.notes || '—'}</td>
                                  <td className="py-2 px-2"><Badge className="bg-red-100 text-red-800 text-xs">expense</Badge></td>
                                  <td className="py-2 px-2 text-right font-medium text-red-700">{fmt(alloc.amount)}</td>
                                </tr>
                              ))}
                              {eventLedger.map(entry => (
                                <tr key={entry.id} className="border-b hover:bg-gray-50">
                                  <td className="py-2 px-2"><Badge variant="outline" className="text-xs border-gray-300 text-gray-600">Ledger</Badge></td>
                                  <td className="py-2 px-2 capitalize">{entry.category?.replace(/_/g, ' ')}</td>
                                  <td className="py-2 px-2 text-gray-500 text-xs">{entry.description}</td>
                                  <td className="py-2 px-2">
                                    <Badge className={entry.type === 'income' ? 'bg-green-100 text-green-800 text-xs' : 'bg-red-100 text-red-800 text-xs'}>{entry.type}</Badge>
                                  </td>
                                  <td className={`py-2 px-2 text-right font-medium ${entry.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>{fmt(entry.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Close Finances Dialog — read-only confirmation */}
      <Dialog open={!!closeDialog} onOpenChange={open => !open && setCloseDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Close Event Finances — {closeDialog?.title}</DialogTitle>
          </DialogHeader>
          {closeDialog && (() => {
            const { attendeeMemberData, expectedIncome, estimatedExpenses, netEstimate, ledgerIncome, ledgerExpenses, ledgerNet, eventAllocations } = getEventData(closeDialog);
            const unpaidCount = attendeeMemberData.filter(a => a.paid < a.cost).length;
            return (
              <div className="space-y-4 py-2">
                <p className="text-sm text-gray-600">Review the final figures below before locking this event's finances. This cannot be undone.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Expected Income</p>
                    <p className="font-bold text-green-700">{fmt(expectedIncome)}</p>
                    <p className="text-xs text-gray-400">{attendeeMemberData.length} attending</p>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Estimated Expenses</p>
                    <p className="font-bold text-red-700">{fmt(estimatedExpenses)}</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Ledger Income</p>
                    <p className="font-bold text-blue-700">{fmt(ledgerIncome)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 border rounded-lg text-center">
                    <p className="text-xs text-gray-500">Ledger Expenses</p>
                    <p className="font-bold text-gray-700">{fmt(ledgerExpenses)}</p>
                  </div>
                </div>
                <div className={`p-3 rounded-lg border text-center ${ledgerNet >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}>
                  <p className="text-xs text-gray-500">Final Profit / Loss</p>
                  <p className={`text-2xl font-bold ${ledgerNet >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>{fmt(ledgerNet)}</p>
                </div>
                {unpaidCount > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{unpaidCount} member{unpaidCount !== 1 ? 's' : ''} have not paid in full</p>
                    <div className="mt-2 space-y-1">
                      {attendeeMemberData.filter(a => a.paid < a.cost).map(({ memberId, member, paid, cost }) => (
                        <div key={memberId} className="flex justify-between text-xs text-amber-700">
                          <span>{member?.full_name || 'Unknown'}</span>
                          <span>{fmt(paid)} / {fmt(cost)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(null)}>Cancel</Button>
            <Button onClick={handleCloseFinances} disabled={saving} className="bg-[#1a472a] hover:bg-[#13381f]">
              <Lock className="w-4 h-4 mr-2" />{saving ? 'Closing...' : 'Confirm & Close Finances'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TreasurerLayout>
  );
}