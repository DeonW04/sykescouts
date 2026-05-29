import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, CheckCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { format, subMonths } from 'date-fns';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

export default function StripePaymentEntry({ memberId, memberName, onSaved, onCancel }) {
  const [piId, setPiId] = useState('');
  const [searching, setSearching] = useState(false);
  const [piDetails, setPiDetails] = useState(null);
  const [piError, setPiError] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const sixMonthsAgo = subMonths(new Date(), 6);

  const { data: events = [] } = useQuery({
    queryKey: ['all-events-for-payment'],
    queryFn: () => base44.entities.Event.list('-start_date', 200),
    select: (data) => data.filter(e => e.cost > 0 && new Date(e.end_date || e.start_date) >= sixMonthsAgo),
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['all-meetings-for-payment'],
    queryFn: () => base44.entities.Programme.list('-date', 200),
    select: (data) => data.filter(p => p.has_cost && (p.cost || 0) > 0 && new Date(p.date) >= sixMonthsAgo),
  });

  const allItems = [
    ...events.map(e => ({ type: 'event', id: e.id, name: e.title, date: e.start_date, cost: e.cost })),
    ...meetings.map(m => ({ type: 'meeting', id: m.id, name: m.title, date: m.date, cost: m.cost })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const filteredItems = itemSearch
    ? allItems.filter(i => i.name?.toLowerCase().includes(itemSearch.toLowerCase()))
    : allItems;

  const handleSearch = async () => {
    if (!piId.trim()) return;
    setSearching(true);
    setPiDetails(null);
    setPiError('');
    setSelectedItem(null);
    try {
      const res = await base44.functions.invoke('verifyStripePaymentById', {
        payment_intent_id: piId.trim(),
        member_id: memberId,
      });
      if (res?.data?.error) {
        setPiError(res.data.error);
      } else {
        setPiDetails(res.data);
      }
    } catch (err) {
      setPiError(err.message || 'Failed to look up payment');
    } finally {
      setSearching(false);
    }
  };

  const getPaymentDate = () => {
    if (!piDetails?.created) return new Date().toISOString().split('T')[0];
    if (typeof piDetails.created === 'number') {
      return new Date(piDetails.created * 1000).toISOString().split('T')[0];
    }
    return piDetails.created.split('T')[0];
  };

  const handleSave = async () => {
    if (!piDetails || !selectedItem) return;
    setSaving(true);
    try {
      const amountPounds = (piDetails.amount || 0) / 100;
      const paymentDate = getPaymentDate();
      const description = `Stripe payment for ${selectedItem.name} \u2014 ${memberName}`;

      await base44.entities.LedgerEntry.create({
        date: paymentDate,
        type: 'income',
        amount: amountPounds,
        category: 'event_payments',
        description,
        reference: piId.trim(),
        linked_member_id: memberId,
        linked_event_id: selectedItem.type === 'event' ? selectedItem.id : null,
        linked_meeting_id: selectedItem.type === 'meeting' ? selectedItem.id : null,
        entered_by: user?.email,
      });

      const statusData = {
        status: 'paid',
        stripe_payment_intent_id: piId.trim(),
        paid_at: paymentDate,
        card_last4: piDetails.card_last4 || '',
        card_brand: piDetails.card_brand || '',
        member_id: memberId,
      };

      if (selectedItem.type === 'event') {
        const existing = await base44.entities.EventPaymentStatus.filter({ event_id: selectedItem.id, member_id: memberId });
        if (existing.length > 0) {
          await base44.entities.EventPaymentStatus.update(existing[0].id, { ...statusData, event_id: selectedItem.id });
        } else {
          await base44.entities.EventPaymentStatus.create({ ...statusData, event_id: selectedItem.id });
        }
      } else {
        const existing = await base44.entities.MeetingPaymentStatus.filter({ meeting_id: selectedItem.id, member_id: memberId });
        if (existing.length > 0) {
          await base44.entities.MeetingPaymentStatus.update(existing[0].id, { ...statusData, meeting_id: selectedItem.id });
        } else {
          await base44.entities.MeetingPaymentStatus.create({ ...statusData, meeting_id: selectedItem.id });
        }
      }

      setSavedMsg('Payment recorded successfully.');
      onSaved();
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (savedMsg) {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <p className="text-sm font-medium text-green-800">{savedMsg}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* PI ID lookup */}
      <div>
        <Label>Stripe Payment Intent ID</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={piId}
            onChange={e => setPiId(e.target.value)}
            placeholder="pi_..."
            className="font-mono text-sm"
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={!piId.trim() || searching} className="bg-[#7413dc] hover:bg-[#5c0fb0] shrink-0">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="ml-1 hidden sm:inline">Search</span>
          </Button>
        </div>
        {piError && <p className="text-xs text-red-600 mt-1 font-medium">{piError}</p>}
      </div>

      {/* Payment details read-only summary */}
      {piDetails && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Payment Details</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Amount</p>
              <p className="font-bold text-green-700 text-base">{fmt((piDetails.amount || 0) / 100)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Date &amp; Time</p>
              <p className="font-semibold">
                {piDetails.created
                  ? (typeof piDetails.created === 'number'
                    ? format(new Date(piDetails.created * 1000), 'd MMM yyyy HH:mm')
                    : format(new Date(piDetails.created), 'd MMM yyyy'))
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Card</p>
              <p className="font-semibold capitalize">{piDetails.card_brand} ···· {piDetails.card_last4}</p>
            </div>
          </div>
        </div>
      )}

      {/* Event / Meeting selector */}
      {piDetails && (
        <div>
          <Label>What is this payment for?</Label>
          <Input
            value={itemSearch}
            onChange={e => setItemSearch(e.target.value)}
            placeholder="Search events and meetings..."
            className="mt-1 mb-2"
          />
          <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
            {filteredItems.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No events or meetings found in the last 6 months</p>
            ) : filteredItems.map(item => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => setSelectedItem(item)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                  selectedItem?.id === item.id && selectedItem?.type === item.type
                    ? 'bg-[#7413dc]/8 border-l-2 border-[#7413dc]'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">{item.type}</Badge>
                    <span className="text-xs text-gray-400">{format(new Date(item.date), 'd MMM yyyy')}</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-600 shrink-0 ml-2">{fmt(item.cost)}</span>
              </button>
            ))}
          </div>
          {selectedItem && (
            <p className="text-xs text-[#7413dc] mt-1 font-medium">✓ Selected: {selectedItem.name}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        {piDetails && (
          <Button
            onClick={handleSave}
            disabled={!selectedItem || saving}
            className="flex-1 bg-[#1a472a] hover:bg-[#13381f]"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Saving...</> : <><CreditCard className="w-4 h-4 mr-1" />Save Payment</>}
          </Button>
        )}
      </div>
    </div>
  );
}