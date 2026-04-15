import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Trash2, CreditCard, CheckCircle, AlertTriangle, XCircle, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;
const today = new Date().toISOString().split('T')[0];

export default function TreasurerMemberPayments() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [form, setForm] = useState({ amount: '', date: today, payment_type: 'subs', notes: '', related_event_id: '', receipt_reference: '' });
  const [saving, setSaving] = useState(false);

  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: () => base44.entities.Member.filter({ active: true }) });
  const { data: payments = [] } = useQuery({ queryKey: ['member-payments'], queryFn: () => base44.entities.MemberPayment.list('-date', 500) });
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => base44.entities.Event.list('-start_date', 100) });
  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });
  const { data: programmes = [] } = useQuery({ queryKey: ['programmes-all'], queryFn: () => base44.entities.Programme.list('-date', 300) });
  const { data: eventAttendances = [] } = useQuery({ queryKey: ['event-attendances-all'], queryFn: () => base44.entities.EventAttendance.filter({}) });
  const { data: actionsRequired = [] } = useQuery({ queryKey: ['actions-required-all'], queryFn: () => base44.entities.ActionRequired.filter({}) });
  const { data: actionResponses = [] } = useQuery({ queryKey: ['action-responses-all'], queryFn: () => base44.entities.ActionResponse.filter({}) });
  const { data: terms = [] } = useQuery({ queryKey: ['terms'], queryFn: () => base44.entities.Term.list() });
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: allOverrides = [] } = useQuery({ queryKey: ['payment-overrides-all'], queryFn: () => base44.entities.MeetingPaymentOverride.filter({}) });

  const filteredMembers = members.filter(m =>
    !search || m.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getSectionName = (sectionId) => sections.find(s => s.id === sectionId)?.display_name || '';

  // Current or upcoming term
  const currentTerm = terms.find(t => today >= t.start_date && today <= t.end_date);
  const upcomingTerm = !currentTerm ? terms.filter(t => t.start_date > today).sort((a, b) => a.start_date.localeCompare(b.start_date))[0] : null;
  const activeTerm = currentTerm || upcomingTerm;

  // Derive event/meeting data for selected member
  const memberEventData = useMemo(() => {
    if (!selectedMember) return { attendingEvents: [], meetingsWithCost: [] };

    // Events: check attendance via action responses or EventAttendance
    const attendingEvents = events.filter(ev => {
      const evActions = actionsRequired.filter(a => a.event_id === ev.id && a.action_purpose === 'attendance');
      const isAttending = evActions.some(a => {
        const resp = actionResponses.find(r => r.action_required_id === a.id && r.member_id === selectedMember.id);
        return resp && (resp.response_value === 'Yes, attending' || resp.response_value === 'yes');
      });
      if (isAttending) return true;
      // Fallback
      return eventAttendances.some(a => a.event_id === ev.id && a.member_id === selectedMember.id);
    });

    // Meetings with a cost in active/current term for this member's section
    const meetingsWithCost = activeTerm ? programmes.filter(p =>
      p.section_id === selectedMember.section_id &&
      p.cost > 0 &&
      p.date >= activeTerm.start_date &&
      p.date <= activeTerm.end_date
    ) : [];

    return { attendingEvents, meetingsWithCost };
  }, [selectedMember, events, programmes, actionsRequired, actionResponses, eventAttendances, activeTerm]);

  const memberPayments = selectedMember ? payments.filter(p => p.member_id === selectedMember.id) : [];
  const totalPaid = memberPayments.reduce((s, p) => s + (p.amount || 0), 0);

  const getPaymentStatus = (cost, paid) => {
    if (paid === 0) return 'unpaid';
    if (paid === cost) return 'paid';
    return 'incorrect';
  };

  const openDialog = () => {
    setForm({ amount: '', date: today, payment_type: 'subs', notes: '', related_event_id: '', receipt_reference: '' });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!selectedMember || !form.amount || !form.date) {
      toast.error('Please select a member and fill in required fields');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        member_id: selectedMember.id,
        amount: parseFloat(form.amount),
        date: form.date,
        payment_type: form.payment_type,
        notes: form.notes,
        related_event_id: form.related_event_id || null,
        receipt_reference: form.receipt_reference,
        entered_by: user?.email,
      };
      await base44.entities.MemberPayment.create(payload);

      await base44.entities.LedgerEntry.create({
        date: form.date,
        type: 'income',
        amount: parseFloat(form.amount),
        category: form.payment_type === 'subs' ? 'subs' : form.payment_type === 'event' ? 'event_payments' : 'other',
        description: `${form.payment_type} payment - ${selectedMember.full_name}`,
        linked_member_id: selectedMember.id,
        linked_event_id: form.related_event_id || null,
        entered_by: user?.email,
      });

      queryClient.invalidateQueries({ queryKey: ['member-payments'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      toast.success('Payment recorded');
      setShowDialog(false);
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this payment?')) return;
    await base44.entities.MemberPayment.delete(id);
    queryClient.invalidateQueries({ queryKey: ['member-payments'] });
    toast.success('Payment deleted');
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const subsPayments = memberPayments.filter(p => p.payment_type === 'subs').sort((a, b) => b.date.localeCompare(a.date));
  const lastSubsPayment = subsPayments[0];

  const StatusBadge = ({ cost, paid, deadline, override }) => {
    if (override?.override_type === 'waived') return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
        Waived
      </span>
    );
    if (override?.override_type === 'not_attending') return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
        Not Attending
      </span>
    );
    if (paid >= cost && cost > 0) return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
        <CheckCircle className="w-3 h-3" /> Paid
      </span>
    );
    if (paid > 0) return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" /> Incorrect
      </span>
    );
    if (deadline && today > deadline) return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3" /> Overdue
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <XCircle className="w-3 h-3" /> Unpaid
      </span>
    );
  };

  return (
    <TreasurerLayout title="Member Payments">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Member list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {filteredMembers.map(m => {
                const mPayments = payments.filter(p => p.member_id === m.id);
                const total = mPayments.reduce((s, p) => s + (p.amount || 0), 0);
                const subsOverdue = m.next_subs_due && m.next_subs_due < today;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMember(m)}
                    className={`px-4 py-3 cursor-pointer border-b hover:bg-gray-50 ${selectedMember?.id === m.id ? 'bg-green-50 border-l-4 border-l-[#1a472a]' : ''}`}
                  >
                    <p className="font-medium text-sm">{m.full_name}</p>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className="text-xs text-gray-500">{getSectionName(m.section_id)}</p>
                      <div className="flex items-center gap-1">
                        {subsOverdue && <span className="text-xs text-red-500 font-medium">Subs due</span>}
                        {mPayments.length > 0 && <span className="text-xs text-green-600 font-medium">{fmt(total)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detail panel */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedMember ? (
            <Card className="flex items-center justify-center h-64">
              <div className="text-center text-gray-400">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Select a member to view payment details</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedMember.full_name}</h2>
                  <p className="text-sm text-gray-500">{getSectionName(selectedMember.section_id)} · Total paid: <span className="font-semibold text-green-600">{fmt(totalPaid)}</span></p>
                </div>
                <Button onClick={openDialog} className="bg-[#1a472a] hover:bg-[#13381f]">
                  <Plus className="w-4 h-4 mr-1" />Add Payment
                </Button>
              </div>

              {/* Two-column: Subs + Events/Meetings */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Subs Overview */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      Subs Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedMember.next_subs_due ? (
                      <div className={`p-3 rounded-lg border ${selectedMember.next_subs_due < today ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <p className="text-xs text-gray-500">Next Subs Due</p>
                        <p className={`font-bold text-lg ${selectedMember.next_subs_due < today ? 'text-red-700' : 'text-green-700'}`}>
                          {selectedMember.next_subs_due}
                        </p>
                        {selectedMember.next_subs_due < today && <p className="text-xs text-red-500 font-medium">OVERDUE</p>}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-gray-50 border">
                        <p className="text-xs text-gray-400">No subs due date set</p>
                      </div>
                    )}

                    {lastSubsPayment ? (
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Last Payment</span>
                          <span className="font-medium">{lastSubsPayment.date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Amount</span>
                          <span className="font-medium text-green-600">{fmt(lastSubsPayment.amount)}</span>
                        </div>
                        {selectedMember.last_subs_months_paid && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Months Covered</span>
                            <span className="font-medium">{selectedMember.last_subs_months_paid} months</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Subs Paid</span>
                          <span className="font-medium">{fmt(subsPayments.reduce((s, p) => s + (p.amount || 0), 0))}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No subs payments recorded</p>
                    )}

                    {/* Recent subs history */}
                    {subsPayments.length > 0 && (
                      <div className="border-t pt-2 space-y-1">
                        <p className="text-xs font-semibold text-gray-500">Payment History</p>
                        {subsPayments.slice(0, 4).map(p => (
                          <div key={p.id} className="flex justify-between items-center text-xs py-0.5">
                            <span className="text-gray-500">{p.date}</span>
                            <span className="font-medium text-green-600">{fmt(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Events & Meetings */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      Events & Meetings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* Events attending */}
                    {memberEventData.attendingEvents.filter(e => e.cost > 0).map(ev => {
                      const evPayments = memberPayments.filter(p => p.related_event_id === ev.id);
                      const paid = evPayments.reduce((s, p) => s + (p.amount || 0), 0);
                      const isPast = ev.start_date?.split('T')[0] < today;
                      const override = allOverrides.find(o => o.event_id === ev.id && o.member_id === selectedMember?.id);
                      return (
                        <div key={ev.id} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{ev.title}</p>
                              <p className="text-xs text-gray-400">{ev.start_date?.split('T')[0]} · {fmt(ev.cost)}/person{isPast ? ' · Past' : ''}{ev.payment_deadline ? ` · Due ${ev.payment_deadline}` : ''}</p>
                            </div>
                            <StatusBadge cost={ev.cost} paid={paid} deadline={ev.payment_deadline} override={override} />
                          </div>
                          {paid > 0 && paid !== ev.cost && !override && (
                            <p className="text-xs text-amber-600 mt-1">Paid: {fmt(paid)} (expected {fmt(ev.cost)})</p>
                          )}
                        </div>
                      );
                    })}

                    {/* Meetings with cost */}
                    {memberEventData.meetingsWithCost.map(mtg => {
                      const mtgPayments = memberPayments.filter(p => p.related_event_id === mtg.id);
                      const paid = mtgPayments.reduce((s, p) => s + (p.amount || 0), 0);
                      const isPast = mtg.date < today;
                      const override = allOverrides.find(o => o.programme_id === mtg.id && o.member_id === selectedMember?.id);
                      return (
                        <div key={mtg.id} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{mtg.title}</p>
                              <p className="text-xs text-gray-400">{mtg.date} · {fmt(mtg.cost)}{isPast ? ' · Past' : ''}{mtg.payment_deadline ? ` · Due ${mtg.payment_deadline}` : ''}</p>
                            </div>
                            <StatusBadge cost={mtg.cost} paid={paid} deadline={mtg.payment_deadline} override={override} />
                          </div>
                          {paid > 0 && paid !== mtg.cost && !override && (
                            <p className="text-xs text-amber-600 mt-1">Paid: {fmt(paid)} (expected {fmt(mtg.cost)})</p>
                          )}
                        </div>
                      );
                    })}

                    {memberEventData.attendingEvents.filter(e => e.cost > 0).length === 0 && memberEventData.meetingsWithCost.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">No events or meetings with costs found</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* All payments */}
              <Card>
                <CardHeader><CardTitle className="text-base">All Payments ({memberPayments.length})</CardTitle></CardHeader>
                <CardContent>
                  {memberPayments.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No payments recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {memberPayments.sort((a, b) => b.date.localeCompare(a.date)).map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs capitalize">{p.payment_type}</Badge>
                              <span className="text-sm font-medium">{fmt(p.amount)}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{p.date}{p.notes ? ` · ${p.notes}` : ''}</p>
                          </div>
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment — {selectedMember?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount (£)</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setField('amount', e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setField('date', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Payment Type</Label>
              <Select value={form.payment_type} onValueChange={v => setField('payment_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subs">Subs</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="donation">Donation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.payment_type === 'event' && (
              <div>
                <Label>Linked Event</Label>
                <Select value={form.related_event_id} onValueChange={v => setField('related_event_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select event..." /></SelectTrigger>
                  <SelectContent>
                    {events.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Any additional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#1a472a] hover:bg-[#13381f]">
              {saving ? 'Saving...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TreasurerLayout>
  );
}