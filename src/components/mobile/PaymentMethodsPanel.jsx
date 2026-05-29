import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CreditCard, Plus, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import InlineCardSetup from './InlineCardSetup';

// ── Payment Methods Section ───────────────────────────────────────────────────
function PaymentMethodsSection({ child }) {
  const queryClient = useQueryClient();
  const [showAddCard, setShowAddCard] = useState(false);
  const [settingDefault, setSettingDefault] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [removing, setRemoving] = useState(null);

  const { data: cards = [], isLoading, refetch } = useQuery({
    queryKey: ['parent-payment-methods', child?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('listPaymentMethods', { member_id: child.id });
      return res?.data?.payment_methods || [];
    },
    enabled: !!child?.id,
  });

  const hasSubscription = !!child?.stripe_subscription_id;

  const handleSetDefault = async (pmId) => {
    setSettingDefault(pmId);
    try {
      await base44.functions.invoke('setDefaultPaymentMethod', { member_id: child.id, pm_id: pmId });
      toast.success('Default card updated');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['settings-children'] });
    } catch (err) {
      toast.error('Failed to update default: ' + err.message);
    } finally {
      setSettingDefault(null);
    }
  };

  const handleRemove = async (pm) => {
    if (cards.length === 1 && hasSubscription) {
      toast.error('Please add a replacement card before removing your only payment method.');
      setConfirmRemove(null);
      return;
    }
    setRemoving(pm.pm_id);
    setConfirmRemove(null);
    try {
      await base44.functions.invoke('detachPaymentMethod', { member_id: child.id, payment_method_id: pm.pm_id });
      toast.success('Card removed');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['settings-children'] });
    } catch (err) {
      toast.error('Failed to remove card: ' + err.message);
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Payment Methods</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
        ) : cards.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No cards saved</p>
          </div>
        ) : (
          cards.map((pm, i) => (
            <div key={pm.pm_id} className={`px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              {confirmRemove?.pm_id === pm.pm_id ? (
                <div className="space-y-2">
                  <p className="text-sm text-red-700 font-medium">Remove {pm.brand} ending {pm.last4}?</p>
                  {cards.length === 1 && hasSubscription && (
                    <p className="text-xs text-red-500">This is your only payment method and you have an active subscription. Please add a replacement before removing.</p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmRemove(null)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold">Cancel</button>
                    {!(cards.length === 1 && hasSubscription) && (
                      <button onClick={() => handleRemove(pm)} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-bold">Remove</button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 capitalize">{pm.brand} ending {pm.last4}</span>
                      {pm.is_default && <span className="text-[10px] font-bold text-[#7413dc] bg-purple-100 px-2 py-0.5 rounded-full">Default</span>}
                    </div>
                    <p className="text-xs text-gray-400">{pm.exp_month?.toString().padStart(2, '0')}/{pm.exp_year}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!pm.is_default && (
                      <button
                        onClick={() => handleSetDefault(pm.pm_id)}
                        disabled={settingDefault === pm.pm_id}
                        className="text-xs text-[#7413dc] font-semibold border border-[#7413dc]/30 px-2 py-1 rounded-lg disabled:opacity-40"
                      >
                        {settingDefault === pm.pm_id ? '...' : 'Set default'}
                      </button>
                    )}
                    <button onClick={() => setConfirmRemove(pm)} disabled={removing === pm.pm_id} className="w-7 h-7 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40">
                      {removing === pm.pm_id ? <Loader2 className="w-3 h-3 animate-spin text-red-400" /> : <Trash2 className="w-3 h-3 text-red-400" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Add card */}
        {!showAddCard ? (
          <div className={`px-4 py-3 ${cards.length > 0 ? 'border-t border-gray-50' : ''}`}>
            <button onClick={() => setShowAddCard(true)} className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-600 font-medium">
              <Plus className="w-4 h-4" /> Add new card
            </button>
          </div>
        ) : (
          <div className="px-4 py-3 border-t border-gray-50">
            <InlineCardSetup
              memberId={child?.id}
              onSuccess={() => { setShowAddCard(false); refetch(); }}
              onCancel={() => setShowAddCard(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Payment History Section ───────────────────────────────────────────────────
function PaymentHistorySection({ child }) {
  const [limit, setLimit] = useState(20);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['payment-history', child?.id, limit],
    queryFn: async () => {
      const all = await base44.entities.LedgerEntry.filter({ linked_member_id: child.id });
      return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    enabled: !!child?.id,
  });

  const visible = entries.slice(0, limit);
  const hasMore = entries.length > limit;

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Payment History</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
        ) : entries.length === 0 ? (
          <p className="px-4 py-5 text-sm text-gray-400 text-center">No payment history yet</p>
        ) : (
          <>
            {visible.map((entry, i) => (
              <div key={entry.id} className={`px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 leading-tight">{entry.description}</p>
                    {entry.card_brand && entry.card_last4 && (
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">{entry.card_brand} ending {entry.card_last4}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{entry.date ? format(new Date(entry.date), 'd MMM yyyy') : ''}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-800 flex-shrink-0">£{(entry.amount || 0).toFixed(2)}</span>
                </div>
              </div>
            ))}
            {hasMore && (
              <div className="px-4 py-3 border-t border-gray-50">
                <button onClick={() => setLimit(l => l + 20)} className="w-full text-sm text-[#7413dc] font-semibold">Load more</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Combined export ───────────────────────────────────────────────────────────
export default function PaymentMethodsPanel({ child }) {
  if (!child) return null;
  return (
    <div className="space-y-4">
      <PaymentMethodsSection child={child} />
      <PaymentHistorySection child={child} />
    </div>
  );
}