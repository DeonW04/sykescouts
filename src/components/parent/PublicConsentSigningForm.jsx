import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import SignatureCanvas from '@/components/parent/SignatureCanvas';
import PublicConsentFields from '@/components/parent/PublicConsentFields';

export default function PublicConsentSigningForm({ data, token, onComplete }) {
  const [responses, setResponses] = useState({});
  const [parentName, setParentName] = useState('');
  const [tcAccepted, setTcAccepted] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef(null);
  const submit = async signature => {
    if (!formRef.current.reportValidity() || saving) return;
    setSaving(true); setError('');
    try {
      const result = await base44.functions.invoke('eventConsentQr', { operation: 'submit', token, responses, parent_name: parentName, tc_accepted: tcAccepted, confirm_guardian: guardian, signature_data_url: signature });
      if (result.data.error) throw new Error(result.data.error);
      if (result.data.completed) onComplete();
    } catch (e) { setError(e.response?.data?.error || e.message || 'Unable to submit. Please try again.'); }
    finally { setSaving(false); }
  };
  return <form ref={formRef} onSubmit={e => e.preventDefault()} className="space-y-6">
    <fieldset disabled={saving} className="space-y-6">
      <PublicConsentFields blocks={data.form.blocks} responses={responses} disabled={saving} onChange={(id, value) => setResponses(r => ({ ...r, [id]: value }))} />
      <div className="space-y-2"><label htmlFor="guardian-name" className="text-sm font-semibold">Parent / guardian’s full name *</label><Input id="guardian-name" autoComplete="name" value={parentName} onChange={e => setParentName(e.target.value)} required maxLength={200} /></div>
      {data.form.terms_and_conditions && <section className="space-y-3"><h2 className="font-semibold">Terms and conditions</h2><p className="whitespace-pre-wrap text-sm rounded-xl bg-muted p-4">{data.form.terms_and_conditions}</p><label className="flex gap-3 items-start text-sm"><input className="mt-1" type="checkbox" required checked={tcAccepted} onChange={e => setTcAccepted(e.target.checked)} />I have read and accept these terms and conditions.</label></section>}
      <label className="flex gap-3 items-start text-sm"><input className="mt-1" type="checkbox" required checked={guardian} onChange={e => setGuardian(e.target.checked)} />I am the parent or guardian authorised to give consent for {data.member_name}, and confirm these details are correct.</label>
    </fieldset>
    <section className="space-y-3"><h2 className="font-semibold">Sign your consent</h2><p className="text-sm text-muted-foreground">Draw your signature with your finger, then select Submit Signature.</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<SignatureCanvas onSubmit={submit} submitting={saving} /></section>
  </form>;
}