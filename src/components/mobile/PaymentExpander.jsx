import React, { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { base44 } from '@/api/base44Client';
import { CreditCard, Check, Loader2, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Module-level stripe promise cache
let _stripePromise = null;
async function getStripePromise() {
  if (_stripePromise) return _stripePromise;
  const res = await base44.functions.invoke('getStripePublicKey', {});
  const key = res?.data?.publishable_key;
  if (key) _stripePromise = loadStripe(key);
  return _stripePromise;
}

function CardSelector({ paymentMethods, selectedPmId, onSelect }) {
  return (
    <div className="space-y-2">
      {[...paymentMethods].sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0)).map(pm => (
        <button
          key={pm.pm_id}
          onClick={() => onSelect(pm.pm_id)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
            selectedPmId === pm.pm_id ? 'border-[#7413dc] bg-[#7413dc]/5' : 'border-gray-200 bg-white'
          }`}
        >
          <CreditCard className={`w-5 h-5 flex-shrink-0 ${selectedPmId === pm.pm_id ? 'text-[#7413dc]' : 'text-gray-400'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 capitalize">{pm.brand} ending {pm.last4}</p>
            <p className="text-xs text-gray-400">Expires {pm.exp_month}/{pm.exp_year}</p>
          </div>
          {pm.is_default && (
            <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full flex-shrink-0">Default</span>
          )}
          {selectedPmId === pm.pm_id && (
            <div className="w-5 h-5 bg-[#7413dc] rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function StripePaymentForm({ cost, memberId, type, entityId, entityTitle, paymentMethods, onPaymentComplete }) {
  const stripe = useStripe();
  const elements = useElements();
  const defaultPm = paymentMethods.find(pm => pm.is_default) || paymentMethods[0];
  const [selectedPmId, setSelectedPmId] = useState(defaultPm?.pm_id || null);
  const [useNewCard, setUseNewCard] = useState(paymentMethods.length === 0);
  const [processing, setProcessing] = useState(false);
  const [pollingState, setPollingState] = useState(null);
  const pollingRef = useRef(null);

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const handleConfirm = async () => {
    if (!stripe || processing) return;
    setProcessing(true);

    const amountPence = Math.round(cost * 100);
    const res = await base44.functions.invoke('createPaymentIntent', {
      member_id: memberId,
      amount: amountPence,
      ...(type === 'event' ? { event_id: entityId } : { meeting_id: entityId }),
    });

    if (res?.data?.error) {
      toast.error(res.data.error);
      setProcessing(false);
      return;
    }

    const clientSecret = res?.data?.client_secret;
    if (!clientSecret) {
      toast.error('Could not initiate payment. Please try again.');
      setProcessing(false);
      return;
    }

    let result;
    if (!useNewCard && selectedPmId) {
      result = await stripe.confirmCardPayment(clientSecret, { payment_method: selectedPmId });
    } else {
      const cardEl = elements.getElement(CardElement);
      result = await stripe.confirmCardPayment(clientSecret, { payment_method: { card: cardEl } });
    }

    if (result?.error) {
      toast.error(result.error.message || 'Payment failed');
      setProcessing(false);
      return;
    }

    setProcessing(false);
    setPollingState('polling');

    let attempts = 0;
    const entity = type === 'event' ? base44.entities.EventPaymentStatus : base44.entities.MeetingPaymentStatus;
    const filterKey = type === 'event' ? 'event_id' : 'meeting_id';

    pollingRef.current = setInterval(async () => {
      attempts++;
      const records = await entity.filter({ [filterKey]: entityId, member_id: memberId, status: 'paid' });
      if (records.length > 0) {
        clearInterval(pollingRef.current);
        setPollingState('confirmed');
        setTimeout(() => onPaymentComplete(), 1500);
        return;
      }
      if (attempts >= 15) {
        clearInterval(pollingRef.current);
        setPollingState('timeout');
      }
    }, 2000);
  };

  if (pollingState === 'confirmed') {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <Check className="w-7 h-7 text-green-600" />
        </div>
        <p className="font-bold text-green-700">Payment confirmed!</p>
      </div>
    );
  }

  if (pollingState === 'polling') {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <Loader2 className="w-8 h-8 text-[#7413dc] animate-spin" />
        <p className="text-sm text-gray-600 font-medium">Confirming payment...</p>
      </div>
    );
  }

  if (pollingState === 'timeout') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
        <p className="text-sm text-amber-800 font-semibold">Payment is being processed</p>
        <p className="text-xs text-amber-600 mt-1">This may take a moment to update. Your payment was submitted successfully.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-3">
        <p className="text-xs text-gray-500">Payment for</p>
        <p className="font-semibold text-gray-900 text-sm">{entityTitle}</p>
        <p className="text-xl font-bold text-[#7413dc] mt-0.5">£{cost.toFixed(2)}</p>
      </div>

      {paymentMethods.length > 0 && !useNewCard ? (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Saved cards</p>
          <CardSelector paymentMethods={paymentMethods} selectedPmId={selectedPmId} onSelect={setSelectedPmId} />
          <button onClick={() => setUseNewCard(true)} className="text-xs text-[#7413dc] font-semibold underline">
            Use a different card
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            {paymentMethods.length > 0 ? 'Enter new card details' : 'Card details'}
          </p>
          <div className="border-2 border-gray-200 rounded-xl p-4 bg-white focus-within:border-[#7413dc] transition-colors">
            <CardElement options={{ style: { base: { fontSize: '16px', color: '#1a1a2e', '::placeholder': { color: '#9ca3af' } }, invalid: { color: '#ef4444' } } }} />
          </div>
          {paymentMethods.length > 0 && (
            <button onClick={() => setUseNewCard(false)} className="text-xs text-gray-500 underline">← Back to saved cards</button>
          )}
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={processing || !stripe}
        className="w-full py-3.5 bg-[#7413dc] text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
      >
        {processing ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : <>Confirm Payment · £{cost.toFixed(2)}</>}
      </button>
    </div>
  );
}

// Main export: renders paid/waived badge or amber pay button + inline expansion
export default function PaymentExpander({ type, entityId, entityTitle, cost, memberId, paymentMethods = [], paidDetails = null, state = 'unpaid', onPaymentComplete = () => {} }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [stripePromise, setStripePromise] = useState(null);

  useEffect(() => {
    if (state === 'unpaid' && !stripePromise) {
      getStripePromise().then(p => { if (p) setStripePromise(p); });
    }
  }, [state]);

  if (state === 'waived') {
    return (
      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1 rounded-full">
        Waived
      </span>
    );
  }

  if (state === 'paid') {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full"
        >
          <Check className="w-3.5 h-3.5" />
          Paid
          <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        {isExpanded && (
          <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-3 text-xs space-y-1">
            {paidDetails?.paid_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Paid on</span>
                <span className="font-semibold text-gray-800">{format(new Date(paidDetails.paid_at), 'd MMM yyyy')}</span>
              </div>
            )}
            {paidDetails?.card_brand && (
              <div className="flex justify-between">
                <span className="text-gray-500">Card</span>
                <span className="font-semibold text-gray-800 capitalize">{paidDetails.card_brand} ending {paidDetails.card_last4}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Unpaid
  return (
    <div>
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-full active:scale-95 transition-transform shadow-sm"
        >
          Pay £{cost.toFixed(2)}
        </button>
      ) : (
        <div className="mt-2 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">Make payment</p>
            <button onClick={() => setIsExpanded(false)} className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          {stripePromise ? (
            <Elements stripe={stripePromise}>
              <StripePaymentForm
                cost={cost}
                memberId={memberId}
                type={type}
                entityId={entityId}
                entityTitle={entityTitle}
                paymentMethods={paymentMethods}
                onPaymentComplete={() => { setIsExpanded(false); onPaymentComplete(); }}
              />
            </Elements>
          ) : (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-[#7413dc]" /></div>
          )}
        </div>
      )}
    </div>
  );
}