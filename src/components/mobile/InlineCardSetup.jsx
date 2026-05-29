import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Shared singleton — same key as InlinePayment
let _stripePromise = null;

function getOrLoadStripe() {
  if (_stripePromise) return _stripePromise;
  _stripePromise = base44.functions.invoke('getStripePublicKey', {})
    .then(res => {
      const pk = res?.data?.publishable_key;
      if (!pk) throw new Error('Stripe not configured');
      return loadStripe(pk);
    })
    .catch(() => null);
  return _stripePromise;
}

function SetupForm({ memberId, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('createSetupIntent', { member_id: memberId });
      const { client_secret } = res.data;
      if (!client_secret) {
        toast.error('Could not initialise card setup. Please try again.');
        setLoading(false);
        return;
      }

      const { setupIntent, error } = await stripe.confirmCardSetup(client_secret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (error) {
        toast.error(error.message || 'Card setup failed. Please check your card details.');
        setLoading(false);
        return;
      }

      if (setupIntent?.status !== 'succeeded') {
        toast.error(`Card setup did not complete (status: ${setupIntent?.status || 'unknown'}). Please try again.`);
        setLoading(false);
        return;
      }

      // Card confirmed and attached to customer — set as default and refresh list
      const newPmId = setupIntent.payment_method;
      if (newPmId) {
        await base44.functions.invoke('setDefaultPaymentMethod', { member_id: memberId, payment_method_id: newPmId }).catch(() => {});
      }
      await base44.functions.invoke('listPaymentMethods', { member_id: memberId }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['mobile-children'] });
      queryClient.invalidateQueries({ queryKey: ['settings-children'] });
      queryClient.invalidateQueries({ queryKey: ['parent-payment-methods'] });
      queryClient.invalidateQueries({ queryKey: ['account-settings-children'] });
      toast.success('Card saved!');
      onSuccess();
    } catch (err) {
      toast.error('Failed to save card: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <CardElement options={{ style: { base: { fontSize: '16px', color: '#1a1a2e', '::placeholder': { color: '#9ca3af' } } } }} />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold">Cancel</button>
        <button onClick={handleSave} disabled={loading || !stripe} className="flex-1 py-3 bg-[#7413dc] text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-transform">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Saving...' : 'Save Card'}
        </button>
      </div>
    </div>
  );
}

export default function InlineCardSetup({ memberId, onSuccess, onCancel }) {
  const [stripeEl, setStripeEl] = useState(null);

  useEffect(() => {
    getOrLoadStripe().then(s => { if (s) setStripeEl(Promise.resolve(s)); }).catch(() => {});
  }, []);

  if (!stripeEl) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <Elements stripe={stripeEl}>
      <SetupForm memberId={memberId} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}