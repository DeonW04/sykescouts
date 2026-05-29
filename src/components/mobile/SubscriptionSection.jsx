import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { CreditCard, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import InlineCardSetup from './InlineCardSetup';

const INTERVAL_LABELS = { '4_months': 'Every 4 months', '6_months': 'Every 6 months', yearly: 'Yearly' };
const INTERVAL_OPTIONS = ['4_months', '6_months', 'yearly'];

export default function SubscriptionSection({ child }) {
  const queryClient = useQueryClient();
  const [showCardSetup, setShowCardSetup] = useState(false);
  const [showChangeCard, setShowChangeCard] = useState(false);
  const [activating, setActivating] = useState(false);
  const [pendingInterval, setPendingInterval] = useState(null);
  const [savingInterval, setSavingInterval] = useState(false);

  if (!child) return null;

  const paymentMethods = child.stripe_payment_methods || [];
  const defaultCard = paymentMethods.find(pm => pm.is_default) || paymentMethods[0];
  const hasCard = paymentMethods.length > 0;
  const hasSubscription = !!child.stripe_subscription_id;
  const currentInterval = child.subs_interval || '4_months';

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['mobile-children'] });
    queryClient.invalidateQueries({ queryKey: ['settings-children'] });
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      await base44.functions.invoke('createStripeSubscription', { member_id: child.id });
      toast.success('Subscription activated!');
      refresh();
    } catch (err) {
      toast.error('Failed to activate: ' + err.message);
    } finally {
      setActivating(false);
    }
  };

  const handleIntervalConfirm = async () => {
    if (!pendingInterval) return;
    setSavingInterval(true);
    try {
      await base44.functions.invoke('updateSubscriptionInterval', { member_id: child.id, interval: pendingInterval });
      toast.success('Billing interval updated!');
      refresh();
      setPendingInterval(null);
    } catch (err) {
      toast.error('Failed to update interval: ' + err.message);
    } finally {
      setSavingInterval(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-50">
        <div className="w-9 h-9 bg-[#7413dc] rounded-xl flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-900">Subscriptions</span>
      </div>

      <div className="px-4 pb-4 pt-3 space-y-4">
        {/* No card state */}
        {!hasCard ? (
          <>
            <p className="text-sm font-medium text-red-500">No payment method connected</p>
            {!showCardSetup ? (
              <button onClick={() => setShowCardSetup(true)} className="w-full py-3 bg-[#7413dc] text-white rounded-xl text-sm font-bold active:scale-95 transition-transform">
                Set up payments
              </button>
            ) : (
              <InlineCardSetup memberId={child.id} onSuccess={() => { setShowCardSetup(false); refresh(); }} onCancel={() => setShowCardSetup(false)} />
            )}
          </>
        ) : (
          <>
            {/* Card display */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
              <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700 capitalize flex-1">{defaultCard?.brand} ending {defaultCard?.last4}</span>
            </div>

            {/* Subscription details or activate */}
            {hasSubscription ? (
              <div className="space-y-2">
                {child.last_subs_payment_date && (
                  <div className="flex justify-between text-sm py-1 border-b border-gray-50">
                    <span className="text-gray-500">Last payment</span>
                    <span className="font-medium">{new Date(child.last_subs_payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
                {child.next_subs_due && (
                  <div className="flex justify-between text-sm py-1 border-b border-gray-50">
                    <span className="text-gray-500">Next due</span>
                    <span className="font-medium">{new Date(child.next_subs_due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-500">Billing</span>
                  <span className="font-medium">{INTERVAL_LABELS[currentInterval]}</span>
                </div>
              </div>
            ) : (
              <button onClick={handleActivate} disabled={activating} className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                {activating && <Loader2 className="w-4 h-4 animate-spin" />}
                Activate subscription
              </button>
            )}

            {/* Interval selector (only when subscription active) */}
            {hasSubscription && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Billing interval</p>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                  {INTERVAL_OPTIONS.map((opt, i) => (
                    <button
                      key={opt}
                      onClick={() => { if (opt !== currentInterval) setPendingInterval(opt); }}
                      className={`flex-1 py-2 text-xs font-semibold transition-colors ${(pendingInterval || currentInterval) === opt ? 'bg-[#7413dc] text-white' : 'text-gray-600 bg-white'} ${i > 0 ? 'border-l border-gray-200' : ''}`}
                    >
                      {opt === '4_months' ? '4 mo' : opt === '6_months' ? '6 mo' : 'Yearly'}
                    </button>
                  ))}
                </div>
                {pendingInterval && pendingInterval !== currentInterval && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                    <p className="text-sm text-amber-800">Change to {INTERVAL_LABELS[pendingInterval]}? Your next payment date will be adjusted.</p>
                    <div className="flex gap-2">
                      <button onClick={() => setPendingInterval(null)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold">Cancel</button>
                      <button onClick={handleIntervalConfirm} disabled={savingInterval} className="flex-1 py-2 bg-[#7413dc] text-white rounded-lg text-sm font-bold disabled:opacity-50">
                        {savingInterval ? 'Saving...' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Change payment method */}
            {!showChangeCard ? (
              <button onClick={() => setShowChangeCard(true)} className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                Change payment method
              </button>
            ) : (
              <div>
                <p className="text-xs text-gray-500 mb-2">Enter new card details:</p>
                <InlineCardSetup memberId={child.id} onSuccess={() => { setShowChangeCard(false); refresh(); }} onCancel={() => setShowChangeCard(false)} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}