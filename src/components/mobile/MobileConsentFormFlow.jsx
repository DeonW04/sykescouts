import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, ChevronRight, CheckCircle, PenLine } from 'lucide-react';
import { toast } from 'sonner';

const LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png';

// ─── Signature Canvas ────────────────────────────────────────
function SignatureCanvas({ onCapture }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e, canvasRef.current);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const move = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111';
    const pos = getPos(e, canvasRef.current);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const end = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const capture = () => canvasRef.current.toDataURL('image/png');

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={340}
        height={150}
        onMouseDown={start} onMouseMove={move} onMouseUp={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        className="w-full border-2 border-gray-300 rounded-xl bg-white touch-none"
        style={{ cursor: 'crosshair' }}
      />
      <div className="flex gap-2">
        <button onClick={clear} className="text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">Clear</button>
        <button
          onClick={() => hasDrawn && onCapture(capture())}
          disabled={!hasDrawn}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${hasDrawn ? 'bg-[#7413dc] text-white' : 'bg-gray-200 text-gray-400'}`}
        >
          Confirm Signature
        </button>
      </div>
    </div>
  );
}

// ─── Main Flow ───────────────────────────────────────────────
export default function MobileConsentFormFlow({ action, submission, user, child, onDone, onBack }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('form'); // form | tcs | sign | done
  const [responses, setResponses] = useState(submission?.responses || {});
  const [tcAccepted, setTcAccepted] = useState(submission?.tc_accepted || false);
  const [saving, setSaving] = useState(false);

  const { data: form } = useQuery({
    queryKey: ['consent-form-detail', action.consent_form_id],
    queryFn: () => base44.entities.ConsentForm.filter({ id: action.consent_form_id }).then(r => r[0]),
    enabled: !!action.consent_form_id,
  });

  const inputBlocks = (form?.blocks || []).filter(b => !['heading', 'text'].includes(b.type));
  const hasInputs = inputBlocks.length > 0;
  const hasTCs = !!form?.terms_and_conditions;

  // If no inputs, skip straight to TCs (or sign)
  useEffect(() => {
    if (form && step === 'form' && !hasInputs) {
      setStep(hasTCs ? 'tcs' : 'sign');
    }
  }, [form, hasInputs, hasTCs]);

  const handleNext = () => {
    if (step === 'form') {
      // Validate required fields
      const missing = inputBlocks.filter(b => b.required && !responses[b.id]);
      if (missing.length > 0) { toast.error('Please fill in all required fields'); return; }
      setStep(hasTCs ? 'tcs' : 'sign');
    } else if (step === 'tcs') {
      if (!tcAccepted) { toast.error('Please accept the terms and conditions'); return; }
      setStep('sign');
    }
  };

  const handleSign = async (signatureDataUrl) => {
    setSaving(true);
    try {
      const updateData = {
        responses,
        tc_accepted: tcAccepted,
        signature_data_url: signatureDataUrl,
        status: 'signed',
        parent_name: user.full_name,
        signed_via_app: true,
        submitted_at: new Date().toISOString(),
      };

      if (submission?.id) {
        await base44.entities.ConsentFormSubmission.update(submission.id, updateData);
      } else {
        // Shouldn't happen but create if missing
        const newSub = { form_id: action.consent_form_id, member_id: child.id, ...updateData };
        if (action.event_id) newSub.event_id = action.event_id;
        if (action.programme_id) newSub.programme_id = action.programme_id;
        await base44.entities.ConsentFormSubmission.create(newSub);
      }

      // Also create an ActionResponse to mark it done
      const existingResponses = await base44.entities.ActionResponse.filter({
        action_required_id: action.id,
        member_id: child.id,
      });
      if (existingResponses.length > 0) {
        await base44.entities.ActionResponse.update(existingResponses[0].id, {
          response_value: 'signed',
          responded_at: new Date().toISOString(),
        });
      } else {
        await base44.entities.ActionResponse.create({
          action_required_id: action.id,
          member_id: child.id,
          parent_email: user.email,
          response_value: 'signed',
          responded_at: new Date().toISOString(),
        });
      }

      queryClient.invalidateQueries({ queryKey: ['mobile-actions'] });
      queryClient.invalidateQueries({ queryKey: ['consent-submissions'] });
      setStep('done');
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-gray-200 border-t-[#7413dc] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-medium">Consent Form</p>
          <p className="font-semibold text-sm text-gray-900 truncate">{form.title}</p>
        </div>
        {/* Steps indicator */}
        <div className="flex gap-1">
          {[hasInputs && 'form', hasTCs && 'tcs', 'sign'].filter(Boolean).map((s, i) => (
            <div key={s} className={`w-2 h-2 rounded-full ${step === s ? 'bg-[#7413dc]' : step === 'done' || ['form','tcs','sign'].indexOf(step) > ['form','tcs','sign'].indexOf(s) ? 'bg-[#7413dc]/40' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Logo + Title banner */}
        {step !== 'done' && (
          <div className="bg-white border-b border-gray-100 px-4 py-5 flex items-center gap-4">
            <img src={LOGO} alt="Scouts" className="h-14 w-auto object-contain flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#7413dc] uppercase tracking-wide">40th Rochdale (Syke) Scouts</p>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">{form.title}</h1>
              {form.description && <p className="text-sm text-gray-500 mt-0.5">{form.description}</p>}
            </div>
          </div>
        )}

        <div className="px-4 py-5 space-y-4">
          {/* ── STEP: form ── */}
          {step === 'form' && (
            <>
              {/* Non-input blocks rendered as info */}
              {(form.blocks || []).map(block => {
                if (block.type === 'heading') return (
                  <h3 key={block.id} className="font-bold text-gray-900 text-base border-b border-gray-200 pb-2">{block.label}</h3>
                );
                if (block.type === 'text') return (
                  <p key={block.id} className="text-sm text-gray-600 leading-relaxed">{block.content}</p>
                );

                // Input blocks
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
                            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${val === opt ? 'bg-[#7413dc] text-white border-[#7413dc]' : 'bg-white text-gray-700 border-gray-200'}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : block.type === 'multi_line' ? (
                      <textarea
                        value={val}
                        onChange={e => setResponses(r => ({ ...r, [block.id]: e.target.value }))}
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#7413dc] bg-white resize-none"
                        placeholder="Your response..."
                      />
                    ) : (
                      <input
                        type={block.type === 'number' ? 'number' : 'text'}
                        value={val}
                        onChange={e => setResponses(r => ({ ...r, [block.id]: e.target.value }))}
                        min={block.min}
                        max={block.max}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#7413dc] bg-white"
                        placeholder="Your response..."
                      />
                    )}
                  </div>
                );
              })}

              <button
                onClick={handleNext}
                className="w-full bg-[#7413dc] text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-transform mt-4"
              >
                Next <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* ── STEP: tcs ── */}
          {step === 'tcs' && (
            <>
              <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                <h3 className="font-bold text-gray-900">Terms & Conditions</h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{form.terms_and_conditions}</p>
              </div>

              <div
                onClick={() => setTcAccepted(v => !v)}
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${tcAccepted ? 'border-[#7413dc] bg-[#7413dc]/5' : 'border-gray-200 bg-white'}`}
              >
                <div className={`w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${tcAccepted ? 'bg-[#7413dc] border-[#7413dc]' : 'border-gray-300'}`}>
                  {tcAccepted && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
                <p className="text-sm text-gray-800 font-medium leading-relaxed">
                  I have read and agree to the terms and conditions above, and I give consent on behalf of {child?.full_name || 'my child'}.
                </p>
              </div>

              <button
                onClick={handleNext}
                className="w-full bg-[#7413dc] text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                Continue to Sign <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* ── STEP: sign ── */}
          {step === 'sign' && (
            <>
              <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-1">
                <p className="text-sm text-gray-500">Signing as</p>
                <p className="font-semibold text-gray-900">{user.full_name}</p>
                <p className="text-xs text-gray-400">On behalf of {child?.full_name}</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <PenLine className="w-4 h-4 text-[#7413dc]" />
                  <p className="font-semibold text-gray-900 text-sm">Draw your signature</p>
                </div>
                <SignatureCanvas onCapture={handleSign} />
                {saving && <p className="text-xs text-gray-400 text-center">Saving...</p>}
              </div>
            </>
          )}

          {/* ── STEP: done ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <img src={LOGO} alt="Scouts" className="h-12 w-auto mb-4 opacity-70" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">All done!</h2>
              <p className="text-gray-500 text-sm max-w-xs mb-2">
                <strong>{form.title}</strong> has been signed for <strong>{child?.full_name}</strong>.
              </p>
              <p className="text-xs text-gray-400 mb-8">Signed via SykeScouts App · {user.full_name}</p>
              <button
                onClick={onDone}
                className="bg-[#7413dc] text-white rounded-2xl px-8 py-3.5 font-bold text-base active:scale-95 transition-transform"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}