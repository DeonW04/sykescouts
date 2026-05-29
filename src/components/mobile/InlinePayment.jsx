import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { CheckCircle, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Module-level singleton so we only fetch the key once per session
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

// ── Inner form — must live inside <Elements> ─────────────────────────────────
function PaymentForm({ type, id, cost, memberId, paymentMethods, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [slowPayment, setSlowPayment] = useState(false);
  const [useNewCard, setUseNewCard] = useState(!(paymentMethods?.length));

  const sortedCards = [
    ...(paymentMethods || []).filter(pm => pm.is_default),
    ...(paymentMethods || []).filter(pm => !pm.is_default),
  ];
  const [selectedPmId, setSelectedPmId] = useState(sortedCards[0]?.pm_id || null);

  const pollStatus = useCallback(() => {
    setPolling(true);
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const entityName = type === 'event' ? 'EventPaymentStatus' : 'MeetingPaymentStatus';
        const filter = type === 'event'
          ? { event_id: id, member_id: memberId }
          : { meeting_id: id, member_id: memberId };
        const records = await base44.entities[entityName].filter(filter);
        const paid = records.find(r => r.status === 'paid');
        if (paid) {
          clearInterval(interval);
          setPolling(false);
          onSuccess(paid);
        } else if (attempts >= 15) {
          clearInterval(interval);
          setPolling(false);
          setSlowPayment(true);
        }
      } catch {/* keep polling */}
    }, 2000);
  }, [type, id, memberId, onSuccess]);

  const handleConfirm = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const piRes = await base44.functions.invoke('createPaymentIntent', {
        member_id: memberId,
        amount: cost,
        ...(type === 'event' ? { event_id: id } : { meeting_id: id }),
      });
      const { client_secret } = piRes.data;
      let result;
      if (useNewCard || !selectedPmId) {
        result = await stripe.confirmCardPayment(client_secret, {
          payment_method: { card: elements.getElement(CardElement) },
        });
      } else {
        result = await stripe.confirmCardPayment(client_secret, { payment_method: selectedPmId });
      }
      if (result.error) {
        toast.error(result.error.message);
        setLoading(false);
        return;
      }
      pollStatus();
    } catch (err) {
      toast.error('Payment failed: ' + (err.message || 'Unknown error'));
      setLoading(false);
    }
  };

  if (polling) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <Loader2 className="w-7 h-7 text-[#7413dc] animate-spin" />
        <p className="text-sm text-gray-600">Confirming your payment...</p>
      </div>
    );
  }

  if (slowPayment) {
    return <p className="text-sm text-amber-600 text-center py-3 font-medium">Payment is being processed — this may take a moment to update.</p>;
  }

  return (
    <div className="space-y-3">
      {sortedCards.length > 0 && !useNewCard ? (
        <>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select card</p>
          <div className="space-y-2">
            {sortedCards.map(pm => (
              <label key={pm.pm_id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${selectedPmId === pm.pm_id ? 'border-[#7413dc] bg-purple-50' : 'border-gray-100 bg-gray-50'}`}>
                <input type="radio" value={pm.pm_id} checked={selectedPmId === pm.pm_id} onChange={() => setSelectedPmId(pm.pm_id)} className="accent-[#7413dc]" />
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-800 capitalize flex-1">{pm.brand} ending {pm.last4}</span>
                {pm.is_default && <span className="text-[10px] font-bold text-[#7413dc] bg-purple-100 px-2 py-0.5 rounded-full">Default</span>}
              </label>
            ))}
          </div>
          <button onClick={() => setUseNewCard(true)} className="text-xs text-[#7413dc] font-medium underline mt-1">Use a different card</button>
        </>
      ) : (
        <>
          {sortedCards.length > 0 && (
            <button onClick={() => { setUseNewCard(false); setSelectedPmId(sortedCards[0]?.pm_id); }} className="text-xs text-gray-500 underline mb-1">← Use saved card</button>
          )}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <CardElement options={{ style: { base: { fontSize: '16px', color: '#1a1a2e', '::placeholder': { color: '#9ca3af' } } } }} />
          </div>
        </>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold active:bg-gray-50">Cancel</button>
        <button
          onClick={handleConfirm}
          disabled={loading || !stripe}
          className="flex-1 py-3 bg-[#7413dc] text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Processing...' : 'Confirm Payment'}
        </button>
      </div>
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────
export default function InlinePayment({ type, id, cost, memberId, paymentMethods, onSuccess, onCancel }) {
  const [stripeEl, setStripeEl] = useState(null);

  useEffect(() => {
    getOrLoadStripe().then(s => { if (s) setStripeEl(Promise.resolve(s)); }).catch(() => {});
  }, []);

  if (!stripeEl) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading payment...</span>
      </div>
    );
  }

  return (
    <Elements stripe={stripeEl}>
      <PaymentForm type={type} id={id} cost={cost} memberId={memberId} paymentMethods={paymentMethods} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}