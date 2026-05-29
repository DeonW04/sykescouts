import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import InlineCardSetup from '../mobile/InlineCardSetup';

const INTERVAL_LABELS = { '4_months': 'Every 4 months', '6_months': 'Every 6 months', yearly: 'Yearly' };
const INTERVAL_SHORT  = { '4_months': 'every 4 months', '6_months': 'every 6 months', yearly: 'per year' };
const INTERVAL_OPTIONS = ['4_months', '6_months', 'yearly'];

export default function WebSubscriptionSection({ child }) {
  const queryClient = useQueryClient();
  const [showCardSetup, setShowCardSetup] = useState(false);
  const [showChangeCard, setShowChangeCard] = useState(false);
  const [activating, setActivating] = useState(false);
  const [pendingInterval, setPendingInterval] = useState(null);
  const [savingInterval, setSavingInterval] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newAnchorDate, setNewAnchorDate] = useState('');
  const [changingDate, setChangingDate] = useState(false);
  const [dateChangeMsg, setDateChangeMsg] = useState('');

  const { data: subsConfig } = useQuery({
    queryKey: ['subs-config', child?.section_id],
    queryFn: () => base44.entities.SectionSubsConfig.filter({ section_id: child.section_id }).then(r => r[0] || null),
    enabled: !!child?.section_id,
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (!child) return null;

  const paymentMethods = child.stripe_payment_methods || [];
  const defaultCard = paymentMethods.find(pm => pm.is_default) || paymentMethods[0];
  const hasCard = paymentMethods.length > 0;
  const hasSubscription = !!child.stripe_subscription_id;
  const currentInterval = child.subs_interval || '4_months';

  // Legacy state
  const hasLegacy = !!child.legacy_subs_expiry && !hasSubscription;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const legacyExpiry = hasLegacy ? new Date(child.legacy_subs_expiry) : null;
  if (legacyExpiry) legacyExpiry.setHours(0, 0, 0, 0);
  const daysUntilLegacy = legacyExpiry ? Math.ceil((legacyExpiry - today) / (1000 * 60 * 60 * 24)) : null;
  const legacyWithin30 = daysUntilLegacy !== null && daysUntilLegacy <= 30 && daysUntilLegacy >= 0;
  const legacyExpired = daysUntilLegacy !== null && daysUntilLegacy < 0;

  // Subscription amount
  const amountLabel = subsConfig?.price_pence
    ? `£${(subsConfig.price_pence / 100).toFixed(2)} ${INTERVAL_SHORT[currentInterval] || 'per period'}`
    : null;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['children'] });
    queryClient.invalidateQueries({ queryKey: ['account-settings-children'] });
  };

  const handleDateChange = async () => {
    if (!newAnchorDate) return;
    setChangingDate(true);
    try {
      const res = await base44.functions.invoke('updateSubscriptionAnchorDate', {
        member_id: child.id, new_anchor_date: newAnchorDate,
      });
      if (res?.data?.error) { toast.error(res.data.error); }
      else {
        setDateChangeMsg(`Next payment date updated to ${format(new Date(newAnchorDate), 'd MMMM yyyy')}`);
        setShowDatePicker(false);
        refresh();
      }
    } catch (err) { toast.error(err.message || 'Failed to update date'); }
    finally { setChangingDate(false); }
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      await base44.functions.invoke('createStripeSubscription', { member_id: child.id });
      toast.success('Subscription activated!');
      refresh();
    } catch (err) { toast.error('Failed to activate: ' + err.message); }
    finally { setActivating(false); }
  };

  const handleIntervalConfirm = async () => {
    if (!pendingInterval) return;
    setSavingInterval(true);
    try {
      const res = await base44.functions.invoke('updateSubscriptionInterval', { member_id: child.id, interval: pendingInterval });
      if (res?.data?.error) { toast.error(res.data.error); }
      else { toast.success('Billing interval updated!'); refresh(); setPendingInterval(null); }
    } catch (err) { toast.error('Failed to update interval: ' + err.message); }
    finally { setSavingInterval(false); }
  };

  return (
    <Card className="shadow-xl bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-[#7413dc]" />
          Subscriptions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ── LEGACY PHASE-OUT (paid until date, no Stripe sub) ── */}
        {hasLegacy && !legacyExpired && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${legacyWithin30 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
              <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${legacyWithin30 ? 'text-amber-700' : 'text-blue-700'}`}>
                Current membership
              </p>
              <p className={`font-semibold text-lg ${legacyWithin30 ? 'text-amber-900' : 'text-blue-900'}`}>
                Paid until {format(new Date(child.legacy_subs_expiry), 'd MMMM yyyy')}
              </p>
              <p className="text-sm text-gray-600 mt-1.5">
                From that date you will need a payment method set up to continue your child's membership.
              </p>
            </div>
            <Button
              onClick={legacyWithin30 ? () => setShowCardSetup(true) : undefined}
              disabled={!legacyWithin30}
              className={legacyWithin30 ? 'bg-amber-500 hover:bg-amber-600 w-full' : 'bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100 w-full'}
            >
              {legacyWithin30
                ? `Set up subscription — due by ${format(new Date(child.legacy_subs_expiry), 'd MMM yyyy')}`
                : 'Set up subscription (available 30 days before expiry)'}
            </Button>
            {showCardSetup && (
              <div className="border rounded-xl p-5">
                <InlineCardSetup memberId={child.id} onSuccess={() => { setShowCardSetup(false); refresh(); }} onCancel={() => setShowCardSetup(false)} />
              </div>
            )}
          </div>
        )}

        {/* ── LEGACY EXPIRED, NO STRIPE SUB → overdue ── */}
        {legacyExpired && !hasSubscription && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <CreditCard className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-red-700 font-semibold">Subscription overdue</p>
                <p className="text-xs text-red-600 mt-0.5">Legacy membership expired {format(new Date(child.legacy_subs_expiry), 'd MMMM yyyy')}. Please set up a subscription.</p>
              </div>
            </div>
            {!showCardSetup ? (
              <Button onClick={() => setShowCardSetup(true)} className="bg-[#7413dc] hover:bg-[#5c0fb0] w-full">
                Set up payments
              </Button>
            ) : (
              <div className="border rounded-xl p-5">
                <InlineCardSetup memberId={child.id} onSuccess={() => { setShowCardSetup(false); refresh(); }} onCancel={() => setShowCardSetup(false)} />
              </div>
            )}
          </div>
        )}

        {/* ── NO CARD (non-legacy) ── */}
        {!hasLegacy && !legacyExpired && !hasCard && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <CreditCard className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 font-medium">No payment method connected</p>
            </div>
            {!showCardSetup ? (
              <Button onClick={() => setShowCardSetup(true)} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
                Set up payments
              </Button>
            ) : (
              <div className="border rounded-xl p-5">
                <InlineCardSetup memberId={child.id} onSuccess={() => { setShowCardSetup(false); refresh(); }} onCancel={() => setShowCardSetup(false)} />
              </div>
            )}
          </div>
        )}

        {/* ── CARD EXISTS, NO SUBSCRIPTION ── */}
        {!hasLegacy && !legacyExpired && hasCard && !hasSubscription && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <CreditCard className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <span className="font-medium text-gray-800 capitalize flex-1">{defaultCard?.brand} ending {defaultCard?.last4}</span>
              <Badge className="bg-green-600">Active card</Badge>
            </div>
            <p className="text-sm text-gray-500">No active subscription</p>
            <Button onClick={handleActivate} disabled={activating} className="bg-green-600 hover:bg-green-700">
              {activating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Activate subscription
            </Button>
          </div>
        )}

        {/* ── ACTIVE SUBSCRIPTION ── */}
        {!hasLegacy && !legacyExpired && hasCard && hasSubscription && (
          <div className="space-y-5">
            {/* Card */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <CreditCard className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <span className="font-medium text-gray-800 capitalize flex-1">{defaultCard?.brand} ending {defaultCard?.last4}</span>
              <Badge className="bg-green-600">Active card</Badge>
            </div>

            {/* Amount */}
            {amountLabel && (
              <div className="p-4 bg-purple-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Subscription Amount</p>
                <p className="font-bold text-[#7413dc] text-lg">{amountLabel}</p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {child.last_subs_payment_date && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Last Payment</p>
                  <p className="font-semibold text-gray-900">{format(new Date(child.last_subs_payment_date), 'd MMMM yyyy')}</p>
                </div>
              )}
              {child.next_subs_due && (() => {
                const isOverdue = new Date(child.next_subs_due) < new Date();
                return (
                  <div className={`p-4 rounded-xl ${isOverdue ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                    <p className={`text-xs mb-1 font-bold uppercase tracking-wide ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                      {isOverdue ? 'Payment overdue' : 'Next Payment'}
                    </p>
                    <p className={`font-bold text-lg ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                      {format(new Date(child.next_subs_due), 'd MMMM yyyy')}
                    </p>
                    <button
                      onClick={() => { setShowDatePicker(!showDatePicker); setDateChangeMsg(''); setNewAnchorDate(''); }}
                      className="text-xs text-[#7413dc] mt-1.5 font-medium underline hover:no-underline">
                      Change payment date
                    </button>
                  </div>
                );
              })()}
            </div>

            {dateChangeMsg && <p className="text-sm text-green-700 font-medium">{dateChangeMsg}</p>}
            {showDatePicker && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <p className="text-sm font-semibold text-gray-700">Select new payment date</p>
                <input type="date" value={newAnchorDate} onChange={e => setNewAnchorDate(e.target.value)} min={tomorrowStr}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7413dc]" />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowDatePicker(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleDateChange} disabled={changingDate || !newAnchorDate} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
                    {changingDate ? 'Updating...' : 'Confirm change'}
                  </Button>
                </div>
              </div>
            )}

            {/* Interval selector */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Billing Interval</p>
              <div className="flex rounded-xl border border-gray-200 overflow-hidden w-fit">
                {INTERVAL_OPTIONS.map((opt, i) => (
                  <button key={opt} onClick={() => { if (opt !== currentInterval) setPendingInterval(opt); }}
                    className={`px-5 py-2.5 text-sm font-semibold transition-colors ${
                      (pendingInterval || currentInterval) === opt ? 'bg-[#7413dc] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                    } ${i > 0 ? 'border-l border-gray-200' : ''}`}>
                    {INTERVAL_LABELS[opt]}
                  </button>
                ))}
              </div>
              {pendingInterval && pendingInterval !== currentInterval && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 max-w-md">
                  <p className="text-sm text-amber-800 font-medium">Change to {INTERVAL_LABELS[pendingInterval]}? Your next payment date will be adjusted.</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPendingInterval(null)}>Cancel</Button>
                    <Button size="sm" onClick={handleIntervalConfirm} disabled={savingInterval} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
                      {savingInterval ? 'Saving...' : 'Confirm change'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Change payment method */}
            {!showChangeCard ? (
              <Button variant="outline" onClick={() => setShowChangeCard(true)} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Change payment method
              </Button>
            ) : (
              <div className="border rounded-xl p-5 space-y-3">
                <p className="text-sm font-semibold text-gray-700">Enter new card details:</p>
                <InlineCardSetup memberId={child.id} onSuccess={() => { setShowChangeCard(false); refresh(); }} onCancel={() => setShowChangeCard(false)} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}