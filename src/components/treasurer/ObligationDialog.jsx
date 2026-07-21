import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: '6_months', label: 'Every 6 months' },
  { value: 'yearly', label: 'Yearly' },
];

export const OBLIGATION_CATEGORIES = [
  { value: 'hall_hire', label: 'Building / Hall Rent' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'subscriptions', label: 'Subscriptions / Memberships' },
  { value: 'transport', label: 'Transport' },
  { value: 'other', label: 'Other (utilities, etc.)' },
];

const emptyForm = { name: '', amount: '', category: 'hall_hire', frequency: 'monthly', payment_method: 'standing_order', next_due_date: '', notes: '', active: true };

export default function ObligationDialog({ open, onClose, obligation, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open) setForm(obligation ? { ...emptyForm, ...obligation, amount: String(obligation.amount) } : emptyForm);
  }, [open, obligation]);

  const handleSave = async () => {
    if (!form.name || !form.amount || !form.next_due_date) { toast.error('Please fill in name, amount and next due date'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name, amount: parseFloat(form.amount), category: form.category,
        frequency: form.frequency, payment_method: form.payment_method,
        next_due_date: form.next_due_date, notes: form.notes, active: form.active !== false,
      };
      if (obligation?.id) {
        await base44.entities.RecurringPayment.update(obligation.id, payload);
        toast.success('Obligation updated');
      } else {
        await base44.entities.RecurringPayment.create(payload);
        toast.success('Obligation added');
      }
      onSaved();
      onClose();
    } catch (e) { toast.error('Failed to save: ' + e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{obligation ? 'Edit Obligation' : 'New Recurring Obligation'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div><Label>Name</Label><Input value={form.name} onChange={e => sf('name', e.target.value)} placeholder="e.g. Hall Rent, Insurance" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Amount (£)</Label><Input type="number" step="0.01" min="0" value={form.amount} onChange={e => sf('amount', e.target.value)} placeholder="0.00" /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => sf('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OBLIGATION_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={v => sf('frequency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Next Due Date</Label><Input type="date" value={form.next_due_date} onChange={e => sf('next_due_date', e.target.value)} /></div>
          </div>
          <div><Label>How is it paid?</Label>
            <Select value={form.payment_method} onValueChange={v => sf('payment_method', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standing_order">Standing order / Direct debit — paid automatically, treasurer verifies</SelectItem>
                <SelectItem value="manual_payment">Manual — treasurer pays via bank app</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notes (optional)</Label><Input value={form.notes} onChange={e => sf('notes', e.target.value)} placeholder="Payee, account reference, etc." /></div>
          {obligation && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="obl_active" checked={form.active !== false} onChange={e => sf('active', e.target.checked)} className="w-4 h-4 rounded" />
              <label htmlFor="obl_active" className="text-sm cursor-pointer">Active (untick to pause without deleting)</label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#1a472a] hover:bg-[#13381f]">{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}