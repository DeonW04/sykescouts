import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CreditCard, Building2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import StripePaymentEntry from './StripePaymentEntry';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

const CATEGORY_LABELS = {
  subs: 'Subscriptions',
  event_payments: 'Event Payment',
  donations: 'Donation',
  fundraising: 'Fundraising',
  equipment: 'Equipment',
  food: 'Food',
  transport: 'Transport',
  hall_hire: 'Hall Hire',
  badges: 'Badges',
  reimbursement: 'Reimbursement',
  other: 'Other',
};

export default function MemberPaymentsTab({ memberId, memberName = '', readOnly = false }) {
  const queryClient = useQueryClient();
  // null = list view | 'select' = path chooser | 'bank' = manual form | 'stripe' = stripe lookup
  const [addMode, setAddMode] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bankForm, setBankForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'subs',
    description: '',
    reference: '',
    linked_event_id: '',
  });

  // Payment history: LedgerEntry records linked to this member
  const { data: entries = [] } = useQuery({
    queryKey: ['member-ledger-entries', memberId],
    queryFn: () => base44.entities.LedgerEntry.filter({ linked_member_id: memberId }),
    enabled: !!memberId,
  });

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: events = [] } = useQuery({
    queryKey: ['events-list-bank'],
    queryFn: () => base44.entities.Event.list('-start_date', 100),
    enabled: addMode === 'bank',
  });

  // Show income entries sorted by date descending
  const incomeEntries = [...entries]
    .filter(e => e.type === 'income')
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalPaid = incomeEntries.reduce((s, e) => s + (e.amount || 0), 0);

  const sf = (k, v) => setBankForm(f => ({ ...f, [k]: v }));

  const handleBankSave = async () => {
    if (!bankForm.amount || !bankForm.date) { toast.error('Amount and date are required'); return; }
    setSaving(true);
    try {
      await base44.entities.LedgerEntry.create({
        date: bankForm.date,
        type: 'income',
        amount: parseFloat(bankForm.amount),
        category: bankForm.category,
        description: bankForm.description || `${CATEGORY_LABELS[bankForm.category] || bankForm.category} \u2014 ${memberName}`,
        reference: bankForm.reference,
        linked_member_id: memberId,
        linked_event_id: bankForm.linked_event_id || null,
        entered_by: user?.email,
      });
      // Also create legacy MemberPayment record for other parts of the app
      await base44.entities.MemberPayment.create({
        member_id: memberId,
        amount: parseFloat(bankForm.amount),
        date: bankForm.date,
        payment_type: bankForm.category === 'subs' ? 'subs' : bankForm.category === 'event_payments' ? 'event' : 'other',
        notes: bankForm.description,
        related_event_id: bankForm.linked_event_id || null,
        entered_by: user?.email,
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['member-ledger-entries', memberId] });
      toast.success('Payment recorded');
      setAddMode(null);
      setBankForm({ amount: '', date: new Date().toISOString().split('T')[0], category: 'subs', description: '', reference: '', linked_event_id: '' });
    } catch (e) { toast.error('Failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleStripeSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['member-ledger-entries', memberId] });
    setAddMode(null);
  };

  // ── Path selection ──────────────────────────────────────────────────────────
  if (addMode === 'select') {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <button onClick={() => setAddMode(null)} className="p-1 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <CardTitle>Add Payment — Choose Method</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">How was this payment made?</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => setAddMode('bank')}
              className="flex flex-col items-start gap-3 p-5 border-2 border-gray-200 rounded-xl hover:border-[#7413dc] hover:bg-[#7413dc]/5 transition-all text-left"
            >
              <Building2 className="w-8 h-8 text-gray-400" />
              <div>
                <p className="font-semibold text-gray-900">Bank Transfer / Cash</p>
                <p className="text-xs text-gray-400 mt-0.5">Manual entry — cash, bank transfer, or cheque</p>
              </div>
            </button>
            <button
              onClick={() => setAddMode('stripe')}
              className="flex flex-col items-start gap-3 p-5 border-2 border-gray-200 rounded-xl hover:border-[#7413dc] hover:bg-[#7413dc]/5 transition-all text-left"
            >
              <CreditCard className="w-8 h-8 text-gray-400" />
              <div>
                <p className="font-semibold text-gray-900">Stripe Card Payment</p>
                <p className="text-xs text-gray-400 mt-0.5">Look up a card payment by Payment Intent ID</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Bank transfer form ──────────────────────────────────────────────────────
  if (addMode === 'bank') {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <button onClick={() => setAddMode('select')} className="p-1 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <CardTitle>Bank Transfer / Cash Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Amount (£)</Label>
              <Input type="number" step="0.01" min="0" value={bankForm.amount} onChange={e => sf('amount', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={bankForm.date} onChange={e => sf('date', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={bankForm.category} onValueChange={v => sf('category', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="subs">Subscriptions</SelectItem>
                <SelectItem value="event_payments">Event Payment</SelectItem>
                <SelectItem value="donations">Donation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {bankForm.category === 'event_payments' && (
            <div>
              <Label>Linked Event</Label>
              <Select value={bankForm.linked_event_id} onValueChange={v => sf('linked_event_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select event..." /></SelectTrigger>
                <SelectContent>
                  {events.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Description (optional)</Label>
            <Input value={bankForm.description} onChange={e => sf('description', e.target.value)} placeholder="e.g. Camp payment received in cash" />
          </div>
          <div>
            <Label>Reference (optional)</Label>
            <Input value={bankForm.reference} onChange={e => sf('reference', e.target.value)} placeholder="e.g. Bank reference or receipt number" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddMode('select')} className="flex-1">Cancel</Button>
            <Button onClick={handleBankSave} disabled={saving} className="flex-1 bg-[#1a472a] hover:bg-[#13381f]">
              {saving ? 'Saving...' : 'Record Payment'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Stripe payment lookup ───────────────────────────────────────────────────
  if (addMode === 'stripe') {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <button onClick={() => setAddMode('select')} className="p-1 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <CardTitle>Stripe Card Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <StripePaymentEntry
            memberId={memberId}
            memberName={memberName}
            onSaved={handleStripeSaved}
            onCancel={() => setAddMode('select')}
          />
        </CardContent>
      </Card>
    );
  }

  // ── Payment history list ────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><CreditCard className="w-4 h-4" />Payment History</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Total income recorded: <span className="font-semibold text-green-600">{fmt(totalPaid)}</span>
          </p>
        </div>
        {!readOnly && (
          <Button onClick={() => setAddMode('select')} className="bg-[#1a472a] hover:bg-[#13381f]">
            <Plus className="w-4 h-4 mr-1" />Add Payment
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {incomeEntries.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No payment records for this member</p>
        ) : (
          <div className="space-y-2">
            {incomeEntries.map(entry => (
              <div key={entry.id} className="flex items-start justify-between p-3 border rounded-lg gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs capitalize shrink-0">
                      {CATEGORY_LABELS[entry.category] || entry.category}
                    </Badge>
                    <span className="font-semibold text-green-700">{fmt(entry.amount)}</span>
                    <span className="text-xs text-gray-500">
                      {entry.date ? format(new Date(entry.date), 'd MMM yyyy') : ''}
                    </span>
                  </div>
                  {entry.description && (
                    <p className="text-xs text-gray-600 mt-0.5 truncate">{entry.description}</p>
                  )}
                  {entry.reference && (
                    <p className="text-xs text-gray-400 font-mono mt-0.5">Ref: {entry.reference}</p>
                  )}
                  {entry.entered_by && (
                    <p className="text-xs text-gray-400">Recorded by {entry.entered_by}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}