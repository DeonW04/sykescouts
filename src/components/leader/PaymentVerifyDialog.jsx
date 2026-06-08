import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, X, CreditCard } from 'lucide-react';

const fmt = n => `£${(n || 0).toFixed(2)}`;

/**
 * A confirmation dialog for registering a Stripe payment by its ID.
 *
 * Flow:
 *  1. Leader enters a Stripe Payment ID and presses "Check payment".
 *  2. We call verifyStripePaymentById which returns a list of checks + the payment details.
 *  3. We show every check (passed / failed / warning) and the full payment summary.
 *  4. "Confirm & register" is only enabled when all hard checks pass.
 *
 * Nothing fails silently — every error is shown with a clear reason.
 *
 * Props:
 *  - member: the member object
 *  - expectedAmount: number (pounds) the payment should be
 *  - eventId / meetingId: optional ids for extra matching
 *  - accent: tailwind colour hex used for buttons (e.g. '#7413dc')
 *  - onConfirm({ payment }): called when the leader confirms a verified payment
 *  - onClose(): close the dialog
 */
export default function PaymentVerifyDialog({ member, expectedAmount, eventId, meetingId, accent = '#7413dc', onConfirm, onClose }) {
  const [paymentId, setPaymentId] = useState('');
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { ok, checks, payment }

  const runCheck = async () => {
    if (!paymentId.trim()) return;
    setChecking(true);
    setError('');
    setResult(null);
    try {
      const res = await base44.functions.invoke('verifyStripePaymentById', {
        payment_intent_id: paymentId.trim(),
        member_id: member.id,
        expected_amount: expectedAmount,
        event_id: eventId || undefined,
        meeting_id: meetingId || undefined,
      });
      const data = res.data || {};
      if (data.error) { setError(data.error); return; }
      setResult(data);
    } catch (err) {
      // Surface the backend's error message rather than a generic failure
      const msg = err?.response?.data?.error || err?.message || 'Could not check the payment. Please try again.';
      setError(msg);
    } finally {
      setChecking(false);
    }
  };

  const handleConfirm = async () => {
    if (!result?.ok) return;
    setSubmitting(true);
    setError('');
    try {
      await onConfirm({ payment: result.payment });
      // parent closes the dialog on success
    } catch (err) {
      setError(err?.message || 'Could not save the payment. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" style={{ color: accent }} />
            <h3 className="font-bold text-gray-900">Register payment</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Who & how much */}
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <p className="text-gray-600">Member: <span className="font-semibold text-gray-900">{member.full_name}</span></p>
            {expectedAmount != null && (
              <p className="text-gray-600">Expected amount: <span className="font-semibold text-gray-900">{fmt(expectedAmount)}</span></p>
            )}
          </div>

          {/* Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600">Stripe Payment ID</label>
            <input
              value={paymentId}
              onChange={e => { setPaymentId(e.target.value); setError(''); setResult(null); }}
              onKeyDown={e => e.key === 'Enter' && runCheck()}
              placeholder="pi_..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none"
              style={{ borderColor: paymentId ? accent : undefined }}
              disabled={submitting}
            />
            {!result && (
              <button
                onClick={runCheck}
                disabled={!paymentId.trim() || checking}
                className="w-full py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: accent }}
              >
                {checking && <Loader2 className="w-4 h-4 animate-spin" />}
                {checking ? 'Checking…' : 'Check payment'}
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              {/* Overall banner */}
              <div className={`rounded-xl p-3 flex items-start gap-2 ${result.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {result.ok
                  ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                <p className={`text-sm font-semibold ${result.ok ? 'text-green-800' : 'text-red-700'}`}>
                  {result.ok ? 'All checks passed — safe to register.' : 'This payment does not match. See below.'}
                </p>
              </div>

              {/* Checks list */}
              <div className="space-y-2">
                {result.checks?.map((c, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-gray-100">
                    {c.passed && !c.warning
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      : c.warning
                        ? <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-700">{c.label}</p>
                      <p className={`text-xs ${c.passed && !c.warning ? 'text-gray-500' : c.warning ? 'text-amber-600' : 'text-red-600'}`}>{c.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment summary */}
              <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Payment details</p>
                <p className="text-gray-600">Amount: <span className="font-medium text-gray-900">{fmt(result.payment?.amount)}</span></p>
                <p className="text-gray-600">Date: <span className="font-medium text-gray-900">{result.payment?.paid_at}</span></p>
                {result.payment?.card_brand && (
                  <p className="text-gray-600">Card: <span className="font-medium text-gray-900 capitalize">{result.payment.card_brand} ···· {result.payment.card_last4}</span></p>
                )}
                <p className="text-gray-600">Status: <span className="font-medium text-gray-900 capitalize">{result.payment?.status}</span></p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setResult(null); setPaymentId(''); }}
                  disabled={submitting}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  Check another
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!result.ok || submitting}
                  className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: accent }}
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Saving…' : 'Confirm & register'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}