import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Heart, Phone, User, Camera, ChevronDown, ChevronUp, Pencil, CreditCard, Loader2, Check, X } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { format } from 'date-fns';
import { toast } from 'sonner';
import EditChildDialog from './EditChildDialog';

let _stripePromise = null;
async function getStripePromise() {
  if (_stripePromise) return _stripePromise;
  const res = await base44.functions.invoke('getStripePublicKey', {});
  const key = res?.data?.publishable_key;
  if (key) _stripePromise = loadStripe(key);
  return _stripePromise;
}

function Section({ title, icon, color, defaultOpen = false, children: content }) {
  const Icon = icon;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 text-left">
        <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-900 flex-1">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4 pt-0 border-t border-gray-50">{content}</div>}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="py-2 border-b border-gray-50 last:border-0">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm text-gray-800 font-medium mt-0.5">{value || 'Not provided'}</p>
    </div>
  );
}

const INTERVAL_OPTIONS = [
  { value: '4_months', label: 'Every 4 months' },
  { value: '6_months', label: 'Every 6 months' },
  { value: 'yearly', label: 'Yearly' },
];

function SetupCardForm({ memberId, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSave = async () => {
    if (!stripe || processing) return;
    setProcessing(true);
    const res = await base44.functions.invoke('createSetupIntent', { member_id: memberId });
    const clientSecret = res?.data?.client_secret;
    if (!clientSecret) { toast.error('Could not create setup intent'); setProcessing(false); return; }

    const result = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });

    if (result.error) { toast.error(result.error.message || 'Could not save card'); setProcessing(false); return; }

    const pmId = result.setupIntent?.payment_method;
    if (pmId) {
      await base44.functions.invoke('setDefaultPaymentMethod', { member_id: memberId, payment_method_id: pmId });
    }
    toast.success('Card saved!');
    setProcessing(false);
    onSuccess();
  };

  return (
    <div className="space-y-3 mt-3">
      <div className="border-2 border-gray-200 rounded-xl p-4 bg-white focus-within:border-[#7413dc] transition-colors">
        <CardElement options={{ style: { base: { fontSize: '16px', color: '#1a1a2e', '::placeholder': { color: '#9ca3af' } }, invalid: { color: '#ef4444' } } }} />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-semibold">Cancel</button>
        <button onClick={handleSave} disabled={processing || !stripe} className="flex-1 py-2.5 bg-[#7413dc] text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
          {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save card'}
        </button>
      </div>
    </div>
  );
}

function SubscriptionsSection({ child, onRefresh }) {
  const queryClient = useQueryClient();
  const [stripePromise, setStripePromise] = useState(null);
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [showChangeCard, setShowChangeCard] = useState(false);
  const [pendingInterval, setPendingInterval] = useState(null);
  const [confirmingInterval, setConfirmingInterval] = useState(false);
  const [activatingSubscription, setActivatingSubscription] = useState(false);

  useEffect(() => {
    getStripePromise().then(p => { if (p) setStripePromise(p); });
  }, []);

  const paymentMethods = child.stripe_payment_methods || [];
  const defaultPm = paymentMethods.find(pm => pm.is_default) || paymentMethods[0];
  const hasSubscription = !!child.stripe_subscription_id;
  const currentInterval = child.subs_interval || '4_months';

  const intervalLabel = INTERVAL_OPTIONS.find(o => o.value === currentInterval)?.label || 'Every 4 months';

  const handleActivateSubscription = async () => {
    setActivatingSubscription(true);
    const res = await base44.functions.invoke('createStripeSubscription', { member_id: child.id });
    if (res?.data?.error) { toast.error(res.data.error); setActivatingSubscription(false); return; }
    toast.success('Subscription activated!');
    setActivatingSubscription(false);
    onRefresh();
  };

  const handleIntervalChange = async (newInterval) => {
    if (newInterval === currentInterval || !hasSubscription) return;
    setPendingInterval(newInterval);
  };

  const confirmIntervalChange = async () => {
    if (!pendingInterval) return;
    setConfirmingInterval(true);
    const res = await base44.functions.invoke('updateSubscriptionInterval', { member_id: child.id, interval: pendingInterval });
    if (res?.data?.error) { toast.error(res.data.error); } else { toast.success('Subscription interval updated!'); onRefresh(); }
    setPendingInterval(null);
    setConfirmingInterval(false);
  };

  const handleCardSaved = () => {
    setShowSetupForm(false);
    setShowChangeCard(false);
    onRefresh();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900">Subscriptions</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Payment method status */}
        {paymentMethods.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-red-500">No payment method connected</p>
            {!showSetupForm ? (
              <button onClick={() => setShowSetupForm(true)} className="w-full py-2.5 bg-[#7413dc] text-white rounded-xl text-sm font-bold">Set up payments</button>
            ) : (
              stripePromise ? (
                <Elements stripe={stripePromise}>
                  <SetupCardForm memberId={child.id} onSuccess={handleCardSaved} onCancel={() => setShowSetupForm(false)} />
                </Elements>
              ) : <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin text-[#7413dc]" /></div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Subscription info */}
            {hasSubscription ? (
              <div className="space-y-2">
                {child.last_subs_payment_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last payment</span>
                    <span className="font-semibold text-gray-800">{format(new Date(child.last_subs_payment_date), 'd MMM yyyy')}</span>
                  </div>
                )}
                {child.next_subs_due && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Next payment</span>
                    <span className="font-semibold text-gray-800">{format(new Date(child.next_subs_due), 'd MMM yyyy')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Frequency</span>
                  <span className="font-semibold text-gray-800">{intervalLabel}</span>
                </div>
                {defaultPm && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Card</span>
                    <span className="font-semibold text-gray-800 capitalize">{defaultPm.brand} ending {defaultPm.last4}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {defaultPm && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Saved card</span>
                    <span className="font-semibold text-gray-800 capitalize">{defaultPm.brand} ending {defaultPm.last4}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400">No active subscription</p>
                <button onClick={handleActivateSubscription} disabled={activatingSubscription} className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                  {activatingSubscription ? <><Loader2 className="w-4 h-4 animate-spin" /> Activating...</> : 'Activate subscription'}
                </button>
              </div>
            )}

            {/* Interval selector — shown always when there's a subscription */}
            {hasSubscription && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Billing interval</p>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                  {INTERVAL_OPTIONS.map((opt, i) => (
                    <button
                      key={opt.value}
                      onClick={() => handleIntervalChange(opt.value)}
                      className={`flex-1 py-2 text-xs font-semibold transition-all ${
                        currentInterval === opt.value ? 'bg-[#7413dc] text-white' : 'bg-white text-gray-600 active:bg-gray-50'
                      } ${i > 0 ? 'border-l border-gray-200' : ''}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {pendingInterval && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-800">
                      Change to {INTERVAL_OPTIONS.find(o => o.value === pendingInterval)?.label}? Your next payment date will be adjusted.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setPendingInterval(null)} className="flex-1 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600">Cancel</button>
                      <button onClick={confirmIntervalChange} disabled={confirmingInterval} className="flex-1 py-1.5 bg-[#7413dc] text-white rounded-lg text-xs font-bold disabled:opacity-60">
                        {confirmingInterval ? 'Updating...' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Change payment method */}
            <div className="space-y-2">
              {!showChangeCard ? (
                <button onClick={() => setShowChangeCard(true)} className="w-full py-2.5 border border-[#7413dc] text-[#7413dc] rounded-xl text-sm font-semibold">Change payment method</button>
              ) : (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">New card details</p>
                  {stripePromise ? (
                    <Elements stripe={stripePromise}>
                      <SetupCardForm memberId={child.id} onSuccess={handleCardSaved} onCancel={() => setShowChangeCard(false)} />
                    </Elements>
                  ) : <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin text-[#7413dc]" /></div>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MobileMyChild({ children }) {
  const queryClient = useQueryClient();
  const child = children[0];
  const [editing, setEditing] = useState(false);

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: liveChild, refetch: refetchChild } = useQuery({
    queryKey: ['live-child', child?.id],
    queryFn: () => base44.entities.Member.filter({ id: child.id }).then(r => r[0] || child),
    enabled: !!child?.id,
  });

  const currentChild = liveChild || child;

  if (!currentChild) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="text-5xl mb-4">👦</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No child linked</h2>
        <p className="text-gray-500 text-sm">Contact your section leader to link your child's account.</p>
      </div>
    );
  }

  const section = sections.find(s => s.id === currentChild.section_id);
  const dob = new Date(currentChild.date_of_birth);
  const today = new Date();
  const ageYears = today.getFullYear() - dob.getFullYear() - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);

  return (
    <div className="flex flex-col">
      {editing && <EditChildDialog child={currentChild} onClose={() => setEditing(false)} />}
      <div className="bg-gradient-to-br from-blue-600 to-[#7413dc] px-5 pb-8 text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0 border border-white/30">
            {currentChild.full_name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{currentChild.full_name}</h1>
            <p className="text-white/80 text-sm">{section?.display_name}</p>
            <p className="text-white/60 text-xs mt-0.5">Age {ageYears}</p>
          </div>
        </div>
        {currentChild.patrol && (
          <div className="mt-3 bg-white/15 rounded-xl px-3 py-1.5 w-fit">
            <p className="text-xs text-white/80">Patrol: <strong className="text-white">{currentChild.patrol}</strong></p>
          </div>
        )}
      </div>

      <div className="px-4 py-5 space-y-3">
        <Section title="Child's Details" icon={User} color="bg-blue-500" defaultOpen={true}>
          <div className="pt-2">
            <InfoRow label="First Name" value={currentChild.first_name} />
            <InfoRow label="Surname" value={currentChild.surname} />
            <InfoRow label="Preferred Name" value={currentChild.preferred_name} />
            <InfoRow label="Date of Birth" value={new Date(currentChild.date_of_birth).toLocaleDateString('en-GB')} />
            <InfoRow label="Gender" value={currentChild.gender} />
            <InfoRow label="Address" value={currentChild.address} />
          </div>
        </Section>

        <Section title="Parents / Guardians" icon={User} color="bg-purple-500">
          <div className="pt-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Parent One</p>
            <InfoRow label="Name" value={currentChild.parent_one_name} />
            <InfoRow label="Email" value={currentChild.parent_one_email} />
            <InfoRow label="Phone" value={currentChild.parent_one_phone} />
            {currentChild.parent_two_email && (
              <>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 mt-4">Parent Two</p>
                <InfoRow label="Name" value={currentChild.parent_two_name} />
                <InfoRow label="Email" value={currentChild.parent_two_email} />
                <InfoRow label="Phone" value={currentChild.parent_two_phone} />
              </>
            )}
          </div>
        </Section>

        <Section title="Emergency Contact" icon={Phone} color="bg-orange-500">
          <div className="pt-2">
            <InfoRow label="Contact Name" value={currentChild.emergency_contact_name} />
            <InfoRow label="Phone Number" value={currentChild.emergency_contact_phone} />
            <InfoRow label="Relationship" value={currentChild.emergency_contact_relationship} />
          </div>
        </Section>

        <Section title="Medical Info" icon={Heart} color="bg-red-500">
          <div className="pt-2">
            <InfoRow label="Medical Conditions" value={currentChild.medical_info || 'None reported'} />
            <InfoRow label="Allergies" value={currentChild.allergies || 'None reported'} />
            <InfoRow label="Dietary Requirements" value={currentChild.dietary_requirements || 'None'} />
            <InfoRow label="Regular Medications" value={currentChild.medications || 'None'} />
            <InfoRow label="Doctor's Surgery" value={currentChild.doctors_surgery} />
            <InfoRow label="Doctor's Phone" value={currentChild.doctors_phone} />
          </div>
        </Section>

        <Section title="Photo Consent" icon={Camera} color="bg-teal-500">
          <div className="pt-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentChild.photo_consent ? 'bg-green-100' : 'bg-red-100'}`}>
              <span className="text-lg">{currentChild.photo_consent ? '✅' : '❌'}</span>
            </div>
            <p className="text-sm text-gray-700">{currentChild.photo_consent ? 'Photo consent granted' : 'Photo consent not given'}</p>
          </div>
        </Section>

        {/* Subscriptions section */}
        <SubscriptionsSection child={currentChild} onRefresh={refetchChild} />

        <button
          onClick={() => setEditing(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border border-[#7413dc] text-[#7413dc] rounded-2xl font-semibold text-sm active:scale-95 transition-transform bg-white"
        >
          <Pencil className="w-4 h-4" />
          Edit Details
        </button>
        <p className="text-xs text-gray-400 text-center pb-2">For name or date of birth changes, please contact your section leader.</p>
      </div>
    </div>
  );
}