import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { FileText, Smartphone, QrCode, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import SignatureCanvas from '@/components/parent/SignatureCanvas';

// Shows the actual consent form (info blocks + fillable fields + T&Cs), then
// offers a QR code to sign on a phone, or an inline signature box to sign on
// this device without leaving the dialog. While waiting, it polls the
// submission so signing on a phone via the QR code is reflected here too.
export default function ConsentFormDialog({ open, onOpenChange, action, child, user, onSigned }) {
  const [step, setStep] = useState('form'); // form | tcs | finish | sign
  const [responses, setResponses] = useState({});
  const [tcAccepted, setTcAccepted] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);

  const { data: form } = useQuery({
    queryKey: ['consent-form-detail', action?.consent_form_id],
    queryFn: () => base44.entities.ConsentForm.filter({ id: action.consent_form_id }).then(r => r[0]),
    enabled: !!action?.consent_form_id && open,
  });

  useEffect(() => {
    if (!open) {
      setStep('form');
      setResponses({});
      setTcAccepted(false);
      setSubmission(null);
    }
  }, [open]);

  const inputBlocks = (form?.blocks || []).filter(b => !['heading', 'text'].includes(b.type));
  const hasInputs = inputBlocks.length > 0;
  const hasTCs = !!form?.terms_and_conditions;

  useEffect(() => {
    if (open && form && step === 'form' && !hasInputs) {
      setStep(hasTCs ? 'tcs' : 'finish');
    }
  }, [open, form, hasInputs, hasTCs]);

  useEffect(() => {
    if (step !== 'finish' || !open || !action || !child) return;
    let cancelled = false;
    setSaving(true);
    (async () => {
      const subs = await base44.entities.ConsentFormSubmission.filter({ form_id: action.consent_form_id, member_id: child.id });
      let sub = subs.find(s => (action.event_id ? s.event_id === action.event_id : s.programme_id === action.programme_id)) || subs[0];
      const token = sub?.sign_token || (Math.random().toString(36).substr(2, 9) + Date.now().toString(36));
      const payload = {
        responses,
        tc_accepted: tcAccepted,
        parent_name: user?.display_name || user?.full_name,
        sign_token: token,
        status: 'awaiting_signature',
      };
      if (sub) {
        sub = await base44.entities.ConsentFormSubmission.update(sub.id, payload);
        sub = { ...sub, sign_token: token };
      } else {
        sub = await base44.entities.ConsentFormSubmission.create({
          form_id: action.consent_form_id,
          member_id: child.id,
          event_id: action.event_id || null,
          programme_id: action.programme_id || null,
          ...payload,
        });
      }
      if (!cancelled) { setSubmission(sub); setSaving(false); }
    })();
    return () => { cancelled = true; };
  }, [step, open]);

  const handleNext = () => {
    if (step === 'form') {
      const missing = inputBlocks.filter(b => b.required && !responses[b.id]);
      if (missing.length > 0) { toast.error('Please fill in all required fields'); return; }
      setStep(hasTCs ? 'tcs' : 'finish');
    } else if (step === 'tcs') {
      if (!tcAccepted) { toast.error('Please accept the terms and conditions'); return; }
      setStep('finish');
    }
  };

  const signUrl = submission ? `${window.location.origin}/sign?token=${submission.sign_token}` : null;
  const qrUrl = signUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(signUrl)}` : null;

  // While waiting on the "finish" screen, poll for the submission being signed
  // elsewhere (e.g. someone scanned the QR code and signed on their phone).
  const { data: liveStatus } = useQuery({
    queryKey: ['consent-submission-live-status', submission?.id],
    queryFn: () => base44.entities.ConsentFormSubmission.filter({ id: submission.id }).then(r => r[0]?.status),
    enabled: !!submission?.id && step === 'finish',
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (liveStatus === 'signed') {
      toast.success('Signed successfully!');
      onSigned?.();
      onOpenChange(false);
    }
  }, [liveStatus]);

  const handleSignOnDevice = async (signature_data_url) => {
    setSigning(true);
    try {
      await base44.functions.invoke('submitSignature', {
        token: submission.sign_token,
        signature_data_url,
        parent_name: user?.display_name || user?.full_name,
      });
      toast.success('Signature submitted!');
      onSigned?.();
      onOpenChange(false);
    } catch (e) {
      toast.error('Failed to submit signature. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#7413dc]" /> {form?.title || 'Consent Form'}
          </DialogTitle>
        </DialogHeader>

        {!form ? (
          <div className="py-10 flex justify-center">
            <div className="w-6 h-6 border-4 border-gray-200 border-t-[#7413dc] rounded-full animate-spin" />
          </div>
        ) : step === 'form' ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {form.description && <p className="text-sm text-gray-600">{form.description}</p>}
            {(form.blocks || []).map(block => {
              if (block.type === 'heading') return <h3 key={block.id} className="font-bold text-gray-900 border-b pb-1">{block.label}</h3>;
              if (block.type === 'text') return <p key={block.id} className="text-sm text-gray-600 whitespace-pre-wrap">{block.content}</p>;
              const val = responses[block.id] ?? '';
              return (
                <div key={block.id} className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-800">
                    {block.label}{block.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {block.type === 'multiple_choice' ? (
                    <div className="flex flex-wrap gap-2">
                      {(block.options || []).map(opt => (
                        <button
                          key={opt}
                          onClick={() => setResponses(r => ({ ...r, [block.id]: opt }))}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${val === opt ? 'bg-[#7413dc] text-white border-[#7413dc]' : 'bg-white text-gray-700 border-gray-200'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : block.type === 'multi_line' ? (
                    <Textarea value={val} onChange={e => setResponses(r => ({ ...r, [block.id]: e.target.value }))} rows={3} />
                  ) : (
                    <Input type={block.type === 'number' ? 'number' : 'text'} value={val} onChange={e => setResponses(r => ({ ...r, [block.id]: e.target.value }))} min={block.min} max={block.max} />
                  )}
                </div>
              );
            })}
            <Button onClick={handleNext} className="w-full bg-[#7413dc] hover:bg-[#5c0fb0]">Next</Button>
          </div>
        ) : step === 'tcs' ? (
          <div className="space-y-4">
            <div className="bg-gray-50 border rounded-xl p-4 max-h-60 overflow-y-auto">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{form.terms_and_conditions}</p>
            </div>
            <div
              onClick={() => setTcAccepted(v => !v)}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${tcAccepted ? 'border-[#7413dc] bg-[#7413dc]/5' : 'border-gray-200'}`}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${tcAccepted ? 'bg-[#7413dc] border-[#7413dc]' : 'border-gray-300'}`}>
                {tcAccepted && <CheckCircle className="w-3.5 h-3.5 text-white" />}
              </div>
              <p className="text-sm text-gray-800">
                I have read and agree to the terms and conditions above, and I give consent on behalf of {child?.full_name || 'my child'}.
              </p>
            </div>
            <Button onClick={handleNext} className="w-full bg-[#7413dc] hover:bg-[#5c0fb0]">Continue to Sign</Button>
          </div>
        ) : step === 'sign' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">Draw your signature below</p>
            <SignatureCanvas onSubmit={handleSignOnDevice} submitting={signing} />
            <Button variant="ghost" className="w-full" onClick={() => setStep('finish')}>Back</Button>
          </div>
        ) : (
          <div className="space-y-5 text-center">
            {saving || !submission ? (
              <div className="py-10 flex justify-center">
                <div className="w-6 h-6 border-4 border-gray-200 border-t-[#7413dc] rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600">Choose how you'd like to sign</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="border rounded-xl p-4 flex flex-col items-center gap-2">
                    <QrCode className="w-5 h-5 text-[#7413dc]" />
                    <p className="text-sm font-semibold">Scan with your phone</p>
                    {qrUrl && <img src={qrUrl} alt="QR code to sign" className="w-40 h-40" />}
                  </div>
                  <div className="border rounded-xl p-4 flex flex-col items-center justify-center gap-3">
                    <Smartphone className="w-5 h-5 text-[#7413dc]" />
                    <p className="text-sm font-semibold">Sign on this device</p>
                    <Button
                      onClick={() => setStep('sign')}
                      className="bg-[#7413dc] hover:bg-[#5c0fb0]"
                    >
                      Sign Now
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Once signed, this will update automatically.</p>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}