import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addWeeks, addMonths, addYears, parseISO, format } from 'date-fns';
import { toast } from 'sonner';

const LEDGER_CATEGORIES = new Set(['subs', 'event_payments', 'donations', 'fundraising', 'equipment', 'food', 'transport', 'hall_hire', 'badges', 'reimbursement', 'other']);

export const advanceDueDate = (dateStr, frequency) => {
  const d = parseISO(dateStr);
  const next = frequency === 'weekly' ? addWeeks(d, 1)
    : frequency === 'monthly' ? addMonths(d, 1)
    : frequency === 'quarterly' ? addMonths(d, 3)
    : frequency === '6_months' ? addMonths(d, 6)
    : addYears(d, 1);
  return format(next, 'yyyy-MM-dd');
};

export default function ConfirmPaidDialog({ obligation, onClose, onConfirmed }) {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const [datePaid, setDatePaid] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (obligation) {
      setDatePaid(new Date().toISOString().split('T')[0]);
      setAmount(String(obligation.amount));
      setReference('');
    }
  }, [obligation]);

  const handleConfirm = async () => {
    if (!datePaid || !amount) { toast.error('Please fill in date and amount'); return; }
    setSaving(true);
    try {
      const ledgerCategory = LEDGER_CATEGORIES.has(obligation.category) ? obligation.category : 'other';
      await base44.entities.LedgerEntry.create({
        date: datePaid,
        type: 'expense',
        amount: parseFloat(amount),
        category: ledgerCategory,
        description: `${obligation.name} (recurring payment)`,
        reference: reference || '',
        entered_by: user?.email,
      });
      const baseDate = obligation.next_due_date || datePaid;
      await base44.entities.RecurringPayment.update(obligation.id, {
        last_paid_date: datePaid,
        next_due_date: advanceDueDate(baseDate, obligation.frequency),
      });
      toast.success('Payment confirmed and added to the ledger');
      onConfirmed();
      onClose();
    } catch (e) { toast.error('Failed: ' + e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={!!obligation} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Confirm Payment — {obligation?.name}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            {obligation?.payment_method === 'standing_order'
              ? 'Check your bank statement to verify this payment went out automatically, then confirm below.'
              : 'Pay this via your bank app first, then confirm below.'}
            {' '}Confirming adds it to the ledger and moves the next due date forward.
          </div>
          {(obligation?.payee_name || obligation?.sort_code || obligation?.account_number || obligation?.payment_reference) && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm space-y-1">
              <p className="text-xs font-semibold text-gray-700 mb-1">Bank Details</p>
              {obligation?.payee_name && <p><span className="text-gray-500">Payee:</span> <span className="font-medium">{obligation.payee_name}</span></p>}
              {obligation?.sort_code && <p><span className="text-gray-500">Sort code:</span> <span className="font-mono font-medium">{obligation.sort_code}</span></p>}
              {obligation?.account_number && <p><span className="text-gray-500">Account no:</span> <span className="font-mono font-medium">{obligation.account_number}</span></p>}
              {obligation?.payment_reference && <p><span className="text-gray-500">Reference:</span> <span className="font-mono font-medium">{obligation.payment_reference}</span></p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date Paid</Label><Input type="date" value={datePaid} onChange={e => setDatePaid(e.target.value)} /></div>
            <div><Label>Amount (£)</Label><Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          </div>
          <div><Label>Reference (optional)</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Bank reference..." /></div>
          {obligation?.next_due_date && (
            <p className="text-xs text-gray-500">Next due date will move to <strong>{advanceDueDate(obligation.next_due_date, obligation.frequency)}</strong>.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={saving} className="bg-[#1a472a] hover:bg-[#13381f]">{saving ? 'Confirming...' : 'Confirm & Add to Ledger'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}