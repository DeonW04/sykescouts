import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, CreditCard, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

export default function MemberPaymentsTab({ memberId, readOnly = false }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], payment_type: 'subs', notes: '', related_event_id: '' });

  const { data: payments = [] } = useQuery({
    queryKey: ['member-payments', memberId],
    queryFn: () => base44.entities.MemberPayment.filter({ member_id: memberId }),
    enabled: !!memberId,
  });
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => base44.entities.Event.list('-start_date', 100) });
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);

  const handleSave = async () => {
    if (!form.amount || !form.date) { toast.error('Amount and date are required'); return; }
    setSaving(true);
    try {
      await base44.entities.MemberPayment.create({
        member_id: memberId,
        amount: parseFloat(form.amount),
        date: form.date,
        payment_type: form.payment_type,
        notes: form.notes,
        related_event_id: form.related_event_id || null,
        entered_by: user?.email,
      });
      // Auto-create ledger entry
      await base44.entities.LedgerEntry.create({
        date: form.date,
        type: 'income',
        amount: parseFloat(form.amount),
        category: form.payment_type === 'subs' ? 'subs' : form.payment_type === 'event' ? 'event_payments' : 'other',
        description: `${form.payment_type} payment - member`,
        linked_member_id: memberId,
        linked_event_id: form.related_event_id || null,
        entered_by: user?.email,
      });
      queryClient.invalidateQueries({ queryKey: ['member-payments', memberId] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      toast.success('Payment recorded');
      setShowDialog(false);
      setForm({ amount: '', date: new Date().toISOString().split('T')[0], payment_type: 'subs', notes: '', related_event_id: '' });
    } catch (e) { toast.error('Failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this payment?')) return;
    await base44.entities.MemberPayment.delete(id);
    queryClient.invalidateQueries({ queryKey: ['member-payments', memberId] });
    toast.success('Payment deleted');
  };

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><CreditCard className="w-4 h-4" />Payment History</CardTitle>
          <p className="text-sm text-gray-500 mt-1">Total paid: <span className="font-semibold text-green-600">{fmt(totalPaid)}</span></p>
        </div>
        {!readOnly && (
          <Button onClick={() => setShowDialog(true)} className="bg-[#1a472a] hover:bg-[#13381f]">
            <Plus className="w-4 h-4 mr-1" />Add Payment
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No payments recorded for this member</p>
        ) : (
          <div className="space-y-2">
            {[...payments].sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{p.payment_type}</Badge>
                    <span className="font-semibold text-green-700">{fmt(p.amount)}</span>
                    <span className="text-xs text-gray-500">{p.date}</span>
                  </div>
                  {p.notes && <p className="text-xs text-gray-500 mt-0.5">{p.notes}</p>}
                  {p.entered_by && <p className="text-xs text-gray-400">Recorded by {p.entered_by}</p>}
                </div>
                {!readOnly && (
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount (£)</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => sf('amount', e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => sf('date', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Payment Type</Label>
              <Select value={form.payment_type} onValueChange={v => sf('payment_type', v)}>
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
                <Select value={form.related_event_id} onValueChange={v => sf('related_event_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select event..." /></SelectTrigger>
                  <SelectContent>
                    {events.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={e => sf('notes', e.target.value)} />
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
    </Card>
  );
}