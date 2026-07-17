import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Banknote, X } from 'lucide-react';
import { toast } from 'sonner';

const fmt = n => `£${(n || 0).toFixed(2)}`;

/**
 * Take a cash payment against a member for an event/meeting.
 * Creates a LedgerEntry (income, treated like a card payment), a CashPayment
 * record for tracking, and updates the payment status via onConfirm.
 */
export default function CashPaymentDialog({ member, expectedAmount = 0, eventId, meetingId, contextLabel, accent = '#16a34a', onConfirm, onClose }) {
  const [amount, setAmount] = useState(expectedAmount ? String(expectedAmount) : '');
  const [saving, setSaving] = useState(false);

  const handleTake = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) { toast.error('Enter a valid amount'); return; }
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const todayStr = new Date().toISOString().split('T')[0];

      // Find the leader record for the current user (holder of the cash)
      let leader = null;
      try {
        const leaders = await base44.entities.Leader.filter({ user_id: user.id });
        leader = leaders?.[0] || null;
      } catch { /* non-fatal */ }
      const holderName = leader?.display_name || user?.display_name || user?.full_name || user?.email;

      // 1. Ledger income entry — same treatment as a card payment
      const ledgerEntry = await base44.entities.LedgerEntry.create({
        date: todayStr,
        type: 'income',
        category: 'event_payments',
        amount: value,
        description: `Cash payment for ${contextLabel || 'event'} — ${member.full_name}`,
        linked_member_id: member.id,
        linked_event_id: eventId || null,
        linked_meeting_id: meetingId || null,
        entered_by: user?.email,
      });

      // 2. Cash tracking record
      await base44.entities.CashPayment.create({
        member_id: member.id,
        member_name: member.full_name,
        amount: value,
        linked_event_id: eventId || '',
        linked_meeting_id: meetingId || '',
        context_label: contextLabel || '',
        taken_by_leader_id: leader?.id || '',
        taken_by_name: holderName,
        taken_by_email: user?.email,
        holder_type: 'leader',
        current_holder_leader_id: leader?.id || '',
        current_holder_name: holderName,
        paid_in: false,
        ledger_entry_id: ledgerEntry.id,
        taken_date: todayStr,
      });

      toast.success('Cash payment recorded');
      onConfirm?.({ payment: { amount: value, method: 'cash' } });
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}18` }}>
              <Banknote className="w-5 h-5" style={{ color: accent }} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Take Cash Payment</p>
              <p className="text-xs text-gray-400">{member?.full_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Amount (£)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none mb-2"
        />
        {expectedAmount > 0 && (
          <p className="text-xs text-gray-400 mb-4">Expected: {fmt(expectedAmount)}</p>
        )}

        <p className="text-xs text-gray-500 mb-4">
          You'll be recorded as holding this cash until it's handed over or paid into the bank.
        </p>

        <button
          onClick={handleTake}
          disabled={saving}
          className="w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: accent }}
        >
          {saving ? 'Recording…' : `Take ${amount ? fmt(parseFloat(amount)) : 'Cash'}`}
        </button>
      </div>
    </div>
  );
}