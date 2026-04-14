import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { isWithinInterval, addDays } from 'date-fns';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

const empty = { name: '', amount: '', frequency: 'monthly', category: 'hall_hire', payment_method: 'standing_order', next_due_date: '', active: true, notes: '' };

export default function TreasurerRecurringPayments() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const { data: payments = [] } = useQuery({
    queryKey: ['recurring-payments'],
    queryFn: () => base44.entities.RecurringPayment.list('-created_date', 200),
  });

  const today = new Date();
  const upcoming = payments.filter(p => {
    if (!p.active || !p.next_due_date) return false;
    return isWithinInterval(new Date(p.next_due_date), { start: today, end: addDays(today, 14) });
  });

  const openNew = () => { setEditItem(null); setForm(empty); setShowDialog(true); };
  const openEdit = (p) => { setEditItem(p); setForm({ ...p, amount: String(p.amount) }); setShowDialog(true); };

  const handleSave = async () => {
    if (!form.name || !form.amount) { toast.error('Name and amount are required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (editItem) {
        await base44.entities.RecurringPayment.update(editItem.id, payload);
      } else {
        await base44.entities.RecurringPayment.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ['recurring-payments'] });
      toast.success('Saved');
      setShowDialog(false);
    } catch (e) { toast.error('Failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this recurring payment?')) return;
    await base44.entities.RecurringPayment.delete(id);
    queryClient.invalidateQueries({ queryKey: ['recurring-payments'] });
    toast.success('Deleted');
  };

  const toggleActive = async (p) => {
    await base44.entities.RecurringPayment.update(p.id, { active: !p.active });
    queryClient.invalidateQueries({ queryKey: ['recurring-payments'] });
  };

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const monthlyTotal = payments.filter(p => p.active).reduce((s, p) => {
    if (p.frequency === 'monthly') return s + p.amount;
    if (p.frequency === 'weekly') return s + p.amount * 4.33;
    if (p.frequency === 'yearly') return s + p.amount / 12;
    return s;
  }, 0);

  return (
    <TreasurerLayout title="Recurring Payments">
      {upcoming.length > 0 && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">{upcoming.length} payment{upcoming.length > 1 ? 's' : ''} due in the next 14 days: {upcoming.map(p => `${p.name} (${fmt(p.amount)})`).join(', ')}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">Monthly commitment: <span className="font-bold text-red-600">{fmt(monthlyTotal)}</span></div>
        <Button onClick={openNew} className="bg-[#1a472a] hover:bg-[#13381f]">
          <Plus className="w-4 h-4 mr-2" />Add Recurring Payment
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No recurring payments set up</p>
          ) : (
            <div className="divide-y">
              {payments.map(p => (
                <div key={p.id} className={`flex items-center justify-between p-4 ${!p.active ? 'opacity-50' : ''}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{p.name}</p>
                      <Badge variant="outline" className="text-xs capitalize">{p.frequency}</Badge>
                      <Badge variant="outline" className="text-xs">{p.payment_method?.replace(/_/g, ' ')}</Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {p.category?.replace(/_/g, ' ')}
                      {p.next_due_date && ` · Next due: ${p.next_due_date}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-red-600">{fmt(p.amount)}</span>
                    <Switch checked={!!p.active} onCheckedChange={() => toggleActive(p)} />
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Edit className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(p.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Edit' : 'Add'} Recurring Payment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={e => sf('name', e.target.value)} placeholder="e.g. Hall Hire" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (£)</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => sf('amount', e.target.value)} />
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={v => sf('frequency', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => sf('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['hall_hire', 'insurance', 'equipment', 'subscriptions', 'other'].map(c => (
                      <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select value={form.payment_method} onValueChange={v => sf('payment_method', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standing_order">Standing Order</SelectItem>
                    <SelectItem value="manual_payment">Manual Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Next Due Date</Label>
              <Input type="date" value={form.next_due_date} onChange={e => sf('next_due_date', e.target.value)} />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={e => sf('notes', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#1a472a] hover:bg-[#13381f]">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TreasurerLayout>
  );
}