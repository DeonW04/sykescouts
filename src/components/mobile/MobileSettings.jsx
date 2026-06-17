import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NotificationPreferences from './NotificationPreferences';
import { Bell, BellOff, BellRing, LogOut, ChevronRight, User, Edit2, Check, X, CheckCircle, XCircle, CreditCard, Plus, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import { format, isBefore, addDays } from 'date-fns';

const SW_URL = '/sw.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let _stripePromise = null;
async function getStripePromise() {
  if (_stripePromise) return _stripePromise;
  const res = await base44.functions.invoke('getStripePublicKey', {});
  const key = res?.data?.publishable_key;
  if (key) _stripePromise = loadStripe(key);
  return _stripePromise;
}

function EditableRow({ label, value, onSave, type = 'text', readOnly = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  useEffect(() => { setDraft(value || ''); }, [value]);

  if (readOnly) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
        <div className="flex-1 min-w-0"><p className="text-xs text-gray-400">{label}</p><p className="text-sm font-medium text-gray-900 mt-0.5">{value || '—'}</p></div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        {editing ? (
          <input type={type} value={draft} onChange={e => setDraft(e.target.value)} className="w-full text-sm font-medium text-gray-900 mt-0.5 border-b border-[#7413dc] outline-none bg-transparent pb-0.5" autoFocus />
        ) : (
          <p className="text-sm font-medium text-gray-900 mt-0.5">{value || <span className="text-gray-400 italic">Not set</span>}</p>
        )}
      </div>
      {editing ? (
        <div className="flex gap-2">
          <button onClick={() => { onSave(draft); setEditing(false); }} className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"><Check className="w-4 h-4 text-green-600" /></button>
          <button onClick={() => { setDraft(value || ''); setEditing(false); }} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"><Edit2 className="w-4 h-4 text-gray-500" /></button>
      )}
    </div>
  );
}

function StatusBadge({ ok, label }) {
  return ok
    ? <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />{label}</span>
    : <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />{label}</span>;
}

function ExpiryBadge({ date, label }) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const expired = isBefore(d, now);
  const soon = isBefore(d, addDays(now, 90));
  const color = expired ? 'bg-red-100 text-red-700' : soon ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
  return <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}: {format(d, 'd MMM yyyy')}{expired ? ' (EXPIRED)' : soon ? ' (expiring soon)' : ''}</span>;
}

// ── Add Card Form (Setup Intent) ──────────────────────────────────────────────
function AddCardForm({ memberId, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSave = async () => {
    if (!stripe || processing) return;
    setProcessing(true);
    const res = await base44.functions.invoke('createSetupIntent', { member_id: memberId });
    const clientSecret = res?.data?.client_secret;
    if (!clientSecret) { toast.error('Could not start card setup'); setProcessing(false); return; }
    const result = await stripe.confirmCardSetup(clientSecret, { payment_method: { card: elements.getElement(CardElement) } });
    if (result.error) { toast.error(result.error.message || 'Could not save card'); setProcessing(false); return; }
    const pmId = result.setupIntent?.payment_method;
    if (pmId) await base44.functions.invoke('setDefaultPaymentMethod', { member_id: memberId, payment_method_id: pmId });
    toast.success('Card added!');
    setProcessing(false);
    onSuccess();
  };

  return (
    <div className="space-y-3 pt-3 pb-1">
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

// ── Payment Methods Section ────────────────────────────────────────────────────
function PaymentMethodsSection({ user }) {
  const queryClient = useQueryClient();
  const [stripePromise, setStripePromise] = useState(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null); // pm_id
  const [removingId, setRemovingId] = useState(null);
  const [settingDefault, setSettingDefault] = useState(null);

  useEffect(() => { getStripePromise().then(p => { if (p) setStripePromise(p); }); }, []);

  // Find the child record (server-scoped to this parent's own children only)
  const { data: portal } = useQuery({
    queryKey: ['parent-portal'],
    queryFn: async () => (await base44.functions.invoke('getParentPortalData', {})).data,
    enabled: !!user?.email,
  });
  const myChildren = portal?.children || [];

  const primaryChild = myChildren[0];

  const { data: paymentMethods = [], isLoading: loadingPMs, refetch: refetchPMs } = useQuery({
    queryKey: ['settings-payment-methods', primaryChild?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('listPaymentMethods', { member_id: primaryChild.id });
      return res?.data?.payment_methods || [];
    },
    enabled: !!primaryChild?.id,
  });

  const handleSetDefault = async (pmId) => {
    setSettingDefault(pmId);
    await base44.functions.invoke('setDefaultPaymentMethod', { member_id: primaryChild.id, payment_method_id: pmId });
    toast.success('Default card updated');
    setSettingDefault(null);
    refetchPMs();
  };

  const handleRemove = async (pmId) => {
    const hasActiveSub = !!primaryChild?.stripe_subscription_id;
    if (paymentMethods.length === 1 && hasActiveSub) {
      toast.error('Cannot remove your only payment method while you have an active subscription. Please add a new card first.');
      setConfirmRemove(null);
      return;
    }
    setRemovingId(pmId);
    await base44.functions.invoke('detachPaymentMethod', { member_id: primaryChild.id, payment_method_id: pmId });
    toast.success('Card removed');
    setRemovingId(null);
    setConfirmRemove(null);
    refetchPMs();
  };

  if (!primaryChild) return null;

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Payment Methods</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loadingPMs ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-[#7413dc]" /></div>
        ) : paymentMethods.length === 0 ? (
          <div className="px-4 py-4 text-center">
            <p className="text-sm text-gray-400 mb-3">No payment methods saved</p>
          </div>
        ) : (
          paymentMethods.map(pm => (
            <div key={pm.id || pm.pm_id} className="px-4 py-3 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 capitalize">{pm.brand || pm.card?.brand} ending {pm.last4 || pm.card?.last4}</p>
                    {(pm.is_default || pm.metadata?.is_default === 'true') && (
                      <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">Default</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{pm.exp_month || pm.card?.exp_month}/{pm.exp_year || pm.card?.exp_year}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {!(pm.is_default || pm.metadata?.is_default === 'true') && (
                    <button
                      onClick={() => handleSetDefault(pm.pm_id || pm.id)}
                      disabled={settingDefault === (pm.pm_id || pm.id)}
                      className="text-xs text-[#7413dc] font-semibold px-2.5 py-1.5 border border-[#7413dc]/30 rounded-lg disabled:opacity-50"
                    >
                      {settingDefault === (pm.pm_id || pm.id) ? '...' : 'Default'}
                    </button>
                  )}
                  {confirmRemove === (pm.pm_id || pm.id) ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleRemove(pm.pm_id || pm.id)} disabled={!!removingId} className="text-xs text-red-600 font-semibold px-2 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                        {removingId ? '...' : 'Remove'}
                      </button>
                      <button onClick={() => setConfirmRemove(null)} className="text-xs text-gray-500 px-2 py-1.5 border border-gray-200 rounded-lg">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmRemove(pm.pm_id || pm.id)} className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
              {confirmRemove === (pm.pm_id || pm.id) && (
                <p className="text-xs text-red-600 mt-1 ml-8">Remove {(pm.brand || pm.card?.brand)} ending {pm.last4 || pm.card?.last4}?</p>
              )}
            </div>
          ))
        )}

        {/* Add new card */}
        {!showAddCard ? (
          <button onClick={() => setShowAddCard(true)} className="w-full flex items-center gap-3 px-4 py-3 text-[#7413dc] font-semibold text-sm active:bg-gray-50 border-t border-gray-50">
            <Plus className="w-4 h-4" /> Add new card
          </button>
        ) : (
          <div className="px-4 pb-4 border-t border-gray-50">
            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <AddCardForm memberId={primaryChild.id} onSuccess={() => { setShowAddCard(false); refetchPMs(); }} onCancel={() => setShowAddCard(false)} />
              </Elements>
            ) : <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[#7413dc]" /></div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Payment History Section ────────────────────────────────────────────────────
function PaymentHistorySection({ user }) {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data: portal } = useQuery({
    queryKey: ['parent-portal'],
    queryFn: async () => (await base44.functions.invoke('getParentPortalData', {})).data,
    enabled: !!user?.email,
  });
  const myChildren = portal?.children || [];

  const primaryChild = myChildren[0];

  const { data: ledgerEntries = [], isLoading } = useQuery({
    queryKey: ['settings-ledger', primaryChild?.id],
    queryFn: async () => {
      const entries = await base44.entities.LedgerEntry.filter({ linked_member_id: primaryChild.id });
      return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    enabled: !!primaryChild?.id,
  });

  if (!primaryChild) return null;

  const shown = ledgerEntries.slice(0, page * PAGE_SIZE);
  const hasMore = ledgerEntries.length > shown.length;

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Payment History</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-[#7413dc]" /></div>
        ) : ledgerEntries.length === 0 ? (
          <p className="px-4 py-4 text-sm text-gray-400">No payment history yet</p>
        ) : (
          <>
            {shown.map(entry => (
              <div key={entry.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{entry.description || 'Payment'}</p>
                    {entry.date && <p className="text-xs text-gray-400 mt-0.5">{format(new Date(entry.date), 'd MMM yyyy')}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">£{(entry.amount || 0).toFixed(2)}</p>
                    {entry.type === 'income' && <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-1.5 py-0.5 font-bold">Received</span>}
                  </div>
                </div>
              </div>
            ))}
            {hasMore && (
              <button onClick={() => setPage(p => p + 1)} className="w-full py-3 text-sm text-[#7413dc] font-semibold border-t border-gray-50 active:bg-gray-50">
                Load more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ParentAccountSection({ user }) {
  const queryClient = useQueryClient();
  const { data: portal } = useQuery({
    queryKey: ['parent-portal'],
    queryFn: async () => (await base44.functions.invoke('getParentPortalData', {})).data,
    enabled: !!user?.email,
  });
  const myChildren = portal?.children || [];

  const saveDisplayName = async (value) => {
    await base44.auth.updateMe({ display_name: value });
    for (const child of myChildren) {
      const updates = {};
      if (child.parent_one_email === user.email) { updates.parent_one_name = value; const parts = value.trim().split(' '); updates.parent_one_first_name = parts[0] || ''; updates.parent_one_surname = parts.slice(1).join(' ') || ''; }
      if (child.parent_two_email === user.email) { updates.parent_two_name = value; const parts = value.trim().split(' '); updates.parent_two_first_name = parts[0] || ''; updates.parent_two_surname = parts.slice(1).join(' ') || ''; }
      if (Object.keys(updates).length > 0) await base44.entities.Member.update(child.id, updates);
    }
    queryClient.invalidateQueries({ queryKey: ['parent-portal'] });
    toast.success('Display name updated');
    setTimeout(() => window.location.reload(), 500);
  };

  const saveMobile = async (value) => {
    for (const child of myChildren) {
      const updates = {};
      if (child.parent_one_email === user.email) updates.parent_one_phone = value;
      if (child.parent_two_email === user.email) updates.parent_two_phone = value;
      if (Object.keys(updates).length > 0) await base44.entities.Member.update(child.id, updates);
    }
    toast.success('Mobile number updated');
  };

  const currentMobile = myChildren.length > 0 ? (myChildren[0].parent_one_email === user?.email ? myChildren[0].parent_one_phone : myChildren[0].parent_two_phone) : '';

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">My Account</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <EditableRow label="Display Name" value={user?.display_name || user?.full_name} onSave={saveDisplayName} />
        <EditableRow label="Email Address" value={user?.email} readOnly />
        <EditableRow label="Mobile Number" value={currentMobile} onSave={saveMobile} type="tel" />
      </div>
    </div>
  );
}

function LeaderAccountSection({ user, leader }) {
  const queryClient = useQueryClient();
  const { data: receipts = [] } = useQuery({
    queryKey: ['settings-receipts', leader?.id],
    queryFn: () => base44.entities.Receipt.filter({}),
    enabled: !!leader,
    select: data => data.filter(r => r.leader_id === leader?.id || r.submitted_by_email === user?.email),
  });
  const { data: permits = [] } = useQuery({
    queryKey: ['settings-permits', leader?.id],
    queryFn: () => base44.entities.Permit.filter({ leader_id: leader?.id }),
    enabled: !!leader?.id,
  });

  const saveDisplayName = async (value) => {
    await base44.auth.updateMe({ display_name: value });
    if (leader) await base44.entities.Leader.update(leader.id, { display_name: value });
    toast.success('Display name updated');
    setTimeout(() => window.location.reload(), 500);
  };

  const saveMobile = async (value) => {
    if (leader) await base44.entities.Leader.update(leader.id, { phone: value });
    toast.success('Mobile number updated');
    queryClient.invalidateQueries({ queryKey: ['settings-leader'] });
  };

  const pendingReceipts = receipts.filter(r => r.status === 'pending' || r.status === 'submitted');
  const approvedTotal = receipts.filter(r => r.status === 'approved').reduce((s, r) => s + (r.amount || 0), 0);
  const now = new Date();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">My Account</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <EditableRow label="Display Name" value={user?.display_name || leader?.display_name || user?.full_name} onSave={saveDisplayName} />
          <EditableRow label="Email Address" value={user?.email} readOnly />
          <EditableRow label="Mobile Number" value={leader?.phone} onSave={saveMobile} type="tel" />
        </div>
      </div>
      {leader && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Disclosure {'&'} Compliance</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <StatusBadge ok={leader.first_aid_certified} label="First Aid" />
              <StatusBadge ok={leader.safeguarding_trained} label="Safeguarding" />
              <StatusBadge ok={leader.gdpr_trained} label="GDPR" />
            </div>
            <div className="flex flex-col gap-1.5">
              <ExpiryBadge date={leader.dbs_check_date} label="DBS Checked" />
              <ExpiryBadge date={leader.dbs_expiry_date} label="DBS Expires" />
              <ExpiryBadge date={leader.first_aid_expiry} label="First Aid Expires" />
              <ExpiryBadge date={leader.safeguarding_expiry} label="Safeguarding Expires" />
            </div>
            {leader.dbs_certificate_number && <p className="text-xs text-gray-500">DBS Cert: {leader.dbs_certificate_number}</p>}
          </div>
        </div>
      )}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">My Permits</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {permits.length === 0 ? <p className="px-4 py-4 text-sm text-gray-400">No permits recorded</p> : permits.map(p => {
            const expired = p.expiry_date && isBefore(new Date(p.expiry_date), now);
            const soon = p.expiry_date && isBefore(new Date(p.expiry_date), addDays(now, 90));
            return (
              <div key={p.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-sm font-semibold text-gray-900">{p.permit_name}</p><p className="text-xs text-gray-500">{p.permit_type}{p.issuing_body ? ` · ${p.issuing_body}` : ''}</p></div>
                  {p.expiry_date && <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${expired ? 'bg-red-100 text-red-700' : soon ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{expired ? 'Expired' : soon ? 'Expiring soon' : 'Valid'}</span>}
                </div>
                {p.expiry_date && <p className="text-xs text-gray-400 mt-1">Expires: {format(new Date(p.expiry_date), 'd MMM yyyy')}</p>}
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Expense Receipts</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-amber-600">{pendingReceipts.length}</p><p className="text-xs text-gray-500 mt-0.5">Pending</p></div>
            <div className="bg-green-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-green-600">£{approvedTotal.toFixed(2)}</p><p className="text-xs text-gray-500 mt-0.5">Approved total</p></div>
          </div>
          {receipts.length === 0 && <p className="text-xs text-gray-400">No receipts submitted</p>}
          {receipts.slice(0, 5).map(r => (
            <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div><p className="text-sm font-medium text-gray-800">{r.description || 'Receipt'}</p><p className="text-xs text-gray-400">{r.created_date ? format(new Date(r.created_date), 'd MMM yyyy') : ''}</p></div>
              <div className="text-right"><p className="text-sm font-semibold">£{(r.amount || 0).toFixed(2)}</p><span className={`text-xs px-1.5 py-0.5 rounded-full ${r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const ROLE_LABELS = {
  parent: { label: 'Parent / Guardian', color: 'bg-purple-100 text-purple-700', icon: '👨‍👩‍👧' },
  leader: { label: 'Section Leader', color: 'bg-[#004851]/10 text-[#004851]', icon: '⚜️' },
};

export default function MobileSettings({ user, role = 'parent', leader }) {
  const [showNotifPrefs, setShowNotifPrefs] = useState(false);
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied');
  const [registering, setRegistering] = useState(false);

  useEffect(() => { if (typeof Notification !== 'undefined') setPermission(Notification.permission); }, []);

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') { toast.error('Notifications not supported on this device'); return; }
    setRegistering(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') { toast.error('Permission denied. Please enable notifications in your browser/device settings.'); return; }
      const reg = await navigator.serviceWorker.register(SW_URL);
      await navigator.serviceWorker.ready;
      const res = await base44.functions.invoke('getVapidPublicKey', {});
      const vapidPublicKey = res?.data?.publicKey;
      if (!vapidPublicKey) throw new Error('Could not load notification config');
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) await existingSub.unsubscribe();
      let sub;
      try { sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) }); }
      catch (subErr) { throw new Error(`Subscribe failed: ${subErr.name} — ${subErr.message}`); }
      const p256dh = sub.getKey('p256dh');
      const auth = sub.getKey('auth');
      await base44.functions.invoke('savePushSubscription', { subscription: { endpoint: sub.endpoint, expirationTime: sub.expirationTime, keys: { p256dh: p256dh ? arrayBufferToBase64Url(p256dh) : null, auth: auth ? arrayBufferToBase64Url(auth) : null } } });
      toast.success('Notifications enabled! ✅');
      localStorage.setItem('push_notifications_asked', '1');
    } catch (err) { toast.error('Failed to enable notifications: ' + err.message); }
    finally { setRegistering(false); }
  };

  const permissionLabel = { granted: 'Enabled', denied: 'Blocked in browser settings', default: 'Not set up yet' }[permission] || 'Unknown';
  const permissionColor = { granted: 'text-green-600', denied: 'text-red-500', default: 'text-orange-500' }[permission] || 'text-gray-500';

  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 px-5 pb-8 text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <h1 className="text-2xl font-bold">Settings</h1>
        {user && <p className="text-white/60 text-sm mt-1">{user.email}</p>}
      </div>

      <div className="px-4 py-5 space-y-4">
        {role === 'parent' && <ParentAccountSection user={user} />}
        {role === 'leader' && <LeaderAccountSection user={user} leader={leader} />}

        {/* Payment sections — parent only */}
        {role === 'parent' && <PaymentMethodsSection user={user} />}
        {role === 'parent' && <PaymentHistorySection user={user} />}

        {/* Notifications */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Notifications</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${permission === 'granted' ? 'bg-green-100' : 'bg-orange-100'}`}>
                {permission === 'granted' ? <BellRing className="w-5 h-5 text-green-600" /> : <BellOff className="w-5 h-5 text-orange-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">Push Notifications</p>
                <p className={`text-xs mt-0.5 ${permissionColor}`}>{permissionLabel}</p>
              </div>
              {permission !== 'granted' && permission !== 'denied' && (
                <button onClick={enableNotifications} disabled={registering} className="px-4 py-2 bg-[#7413dc] text-white rounded-xl text-xs font-semibold disabled:opacity-50 active:scale-95 transition-transform">{registering ? 'Setting up…' : 'Enable'}</button>
              )}
              {permission === 'denied' && <span className="text-xs text-red-400 font-medium text-right max-w-[120px] leading-tight">Enable in device settings</span>}
              {permission === 'granted' && (
                <button onClick={enableNotifications} disabled={registering} className="px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold disabled:opacity-50 active:scale-95 transition-transform">{registering ? 'Re-registering…' : 'Re-register'}</button>
              )}
            </div>
            {permission === 'granted' && (
              <div className="border-t border-gray-50">
                <button onClick={() => setShowNotifPrefs(!showNotifPrefs)} className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 active:bg-gray-50">
                  <span className="font-medium">Notification preferences</span>
                  <span className="text-gray-400 text-xs">{showNotifPrefs ? '▲' : '▼'}</span>
                </button>
                {showNotifPrefs && user && <div className="px-4 pb-4"><NotificationPreferences role={role} userId={user.id} /></div>}
              </div>
            )}
            {permission === 'denied' && (
              <div className="px-4 pb-4 pt-0">
                <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 leading-relaxed">
                  Notifications are blocked. To enable them:<br />
                  <strong>iOS:</strong> Settings → Safari → Advanced → Website Data, or check Notifications in Settings.<br />
                  <strong>Android:</strong> Settings → Apps → your browser → Notifications.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Account */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Account</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-4 p-4 border-b border-gray-50">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">{ROLE_LABELS[role]?.icon || '👤'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">Account type</p>
                <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full mt-0.5 ${ROLE_LABELS[role]?.color || 'bg-gray-100 text-gray-600'}`}>{ROLE_LABELS[role]?.label || role}</span>
              </div>
            </div>
            <button onClick={() => base44.auth.logout()} className="w-full flex items-center gap-4 p-4 text-left active:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0"><LogOut className="w-5 h-5 text-red-500" /></div>
              <span className="font-semibold text-red-500 text-sm flex-1">Sign Out</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}