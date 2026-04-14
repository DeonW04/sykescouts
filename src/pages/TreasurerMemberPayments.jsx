import React, { useState } from 'react';
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
import { Plus, Search, Trash2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

export default function TreasurerMemberPayments() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], payment_type: 'subs', notes: '', related_event_id: '', receipt_reference: '' });
  const [saving, setSaving] = useState(false);

  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: () => base44.entities.Member.filter({ active: true }) });
  const { data: payments = [] } = useQuery({ queryKey: ['member-payments'], queryFn: () => base44.entities.MemberPayment.list('-date', 500) });
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => base44.entities.Event.list('-start_date', 100) });
  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const filteredMembers = members.filter(m =>
    !search || m.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const memberPayments = selectedMember ? payments.filter(p => p.member_id === selectedMember.id) : [];
  const totalPaid = memberPayments.reduce((s, p) => s + (p.amount || 0), 0);

  const getSectionName = (sectionId) => sections.find(s => s.id === sectionId)?.display_name || '';

  const openDialog = () => {
    setForm({ amount: '', date: new Date().toISOString().split('T')[0], payment_type: 'subs', notes: '', related_event_id: '', receipt_reference: '' });
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
      const payment = await base44.entities.MemberPayment.create(payload);

      // Auto-create ledger entry
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
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMember(m)}
                    className={`px-4 py-3 cursor-pointer border-b hover:bg-gray-50 ${selectedMember?.id === m.id ? 'bg-green-50 border-l-4 border-l-[#1a472a]' : ''}`}
                  >
                    <p className="font-medium text-sm">{m.full_name}</p>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className="text-xs text-gray-500">{getSectionName(m.section_id)}</p>
                      {mPayments.length > 0 && <span className="text-xs text-green-600 font-medium">{fmt(total)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Payment history */}
        <div className="lg:col-span-2">
          {!selectedMember ? (
            <Card className="flex items-center justify-center h-64">
              <div className="text-center text-gray-400">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Select a member to view payment history</p>
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{selectedMember.full_name}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{getSectionName(selectedMember.section_id)} · Total paid: <span className="font-semibold text-green-600">{fmt(totalPaid)}</span></p>
                </div>
                <Button onClick={openDialog} className="bg-[#1a472a] hover:bg-[#13381f]">
                  <Plus className="w-4 h-4 mr-1" />Add Payment
                </Button>
              </CardHeader>
              <CardContent>
                {memberPayments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No payments recorded</p>
                ) : (
                  <div className="space-y-2">
                    {memberPayments.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs capitalize">{p.payment_type}</Badge>
                            <span className="text-sm font-medium">{fmt(p.amount)}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{p.date}{p.notes ? ` · ${p.notes}` : ''}</p>
                          {p.entered_by && <p className="text-xs text-gray-400">by {p.entered_by}</p>}
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