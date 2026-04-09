import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { FileText, LogOut, ChevronLeft, CheckCircle, Pen, User } from 'lucide-react';
import { format } from 'date-fns';

const IPAD_EMAIL = 'ipad1@sykescouts.org';

function generateToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Signature pad component ────────────────────────────────
function SignaturePad({ onSigned }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPos = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => { e.preventDefault(); setIsDrawing(true); lastPos.current = getPos(e, canvasRef.current); };
  const draw = (e) => {
    if (!isDrawing) return; e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e, canvasRef.current);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    lastPos.current = pos; setHasSignature(true);
  };
  const stopDraw = () => setIsDrawing(false);
  const clear = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSignature(false);
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-gray-50 relative" style={{ height: '160px' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-300 text-sm flex items-center gap-2"><Pen className="w-4 h-4" /> Parent signature here</p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear}>Clear</Button>
        <Button
          size="sm"
          disabled={!hasSignature}
          onClick={() => onSigned(canvasRef.current.toDataURL('image/png'))}
          className="bg-[#004851] hover:bg-[#003840] text-white"
        >
          Confirm Signature
        </Button>
      </div>
    </div>
  );
}

// ── Main iPad App ─────────────────────────────────────────
export default function IpadApp() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard'); // dashboard | consent_event | consent_form | consent_member | consent_fill | consent_confirm
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventType, setSelectedEventType] = useState(null); // 'event' | 'meeting'
  const [selectedForm, setSelectedForm] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [responses, setResponses] = useState({});
  const [tcAccepted, setTcAccepted] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState(null);
  const [signatureReceived, setSignatureReceived] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (auth) => {
      if (auth) {
        const u = await base44.auth.me();
        setUser(u);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Real-time subscription for signature
  useEffect(() => {
    if (!currentSubmission?.id) return;
    const unsub = base44.entities.ConsentFormSubmission.subscribe((event) => {
      if (event.id === currentSubmission.id && event.data?.status === 'signed') {
        setSignatureReceived(true);
        setSignatureData(event.data.signature_data_url);
      }
    });
    return unsub;
  }, [currentSubmission?.id]);

  const { data: events = [] } = useQuery({
    queryKey: ['ipad-events'],
    queryFn: () => base44.entities.Event.filter({ published: true }, '-start_date', 20),
    enabled: view === 'consent_event',
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: allProgrammes = [] } = useQuery({
    queryKey: ['ipad-programmes'],
    queryFn: () => base44.entities.Programme.filter({ published: true }),
    enabled: view === 'consent_event',
  });

  const { data: allActiveForms = [] } = useQuery({
    queryKey: ['ipad-consent-forms'],
    queryFn: () => base44.entities.ConsentForm.filter({ active: true }),
    enabled: view === 'consent_form',
  });

  // Filter forms to only those linked to the selected event/meeting
  const forms = useMemo(() => {
    if (!selectedEvent) return allActiveForms;
    const linked = selectedEvent.consent_form_ids || [];
    if (linked.length === 0) return allActiveForms; // fallback: show all if none linked
    return allActiveForms.filter(f => linked.includes(f.id));
  }, [allActiveForms, selectedEvent]);

  const { data: allMembers = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: eventAttendances = [] } = useQuery({
    queryKey: ['ipad-attendances', selectedEvent?.id, selectedEventType],
    queryFn: async () => {
      if (selectedEventType === 'event') {
        return base44.entities.EventAttendance.filter({ event_id: selectedEvent.id });
      }
      return [];
    },
    enabled: !!selectedEvent && view === 'consent_member',
  });

  // Members for selected entity
  const memberList = React.useMemo(() => {
    if (!selectedEvent) return [];
    if (selectedEventType === 'event') {
      const attendeeIds = eventAttendances.map(a => a.member_id);
      return allMembers.filter(m => attendeeIds.includes(m.id));
    }
    // Meeting: all members in that section
    return allMembers.filter(m => m.section_id === selectedEvent.section_id);
  }, [selectedEvent, selectedEventType, eventAttendances, allMembers]);

  // Upcoming meetings (next 4 weeks, one per section)
  const upcomingMeetings = React.useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
    return allProgrammes
      .filter(p => {
        const d = new Date(p.date);
        return d >= now && d <= cutoff && !p.no_meeting;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 8);
  }, [allProgrammes]);

  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    setResponses({});
    setTcAccepted(false);
    setCurrentSubmission(null);
    setSignatureReceived(false);
    setSignatureData(null);
    setView('consent_fill');
  };

  const handleGenerateQR = async () => {
    if (!tcAccepted) return;
    setSubmitting(true);
    try {
      const token = generateToken();
      const submissionData = {
        form_id: selectedForm.id,
        member_id: selectedMember.id,
        sign_token: token,
        status: 'awaiting_signature',
        responses,
        tc_accepted: true,
        ...(selectedEventType === 'event' ? { event_id: selectedEvent.id } : { programme_id: selectedEvent.id }),
      };
      const sub = await base44.entities.ConsentFormSubmission.create(submissionData);
      setCurrentSubmission(sub);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLocalSignature = async (signatureDataUrl) => {
    if (!currentSubmission) return;
    await base44.entities.ConsentFormSubmission.update(currentSubmission.id, {
      signature_data_url: signatureDataUrl,
      status: 'signed',
      submitted_at: new Date().toISOString(),
    });
    setSignatureReceived(true);
    setSignatureData(signatureDataUrl);
  };

  const handleFinalSubmit = async () => {
    if (!currentSubmission) return;
    await base44.entities.ConsentFormSubmission.update(currentSubmission.id, { status: 'complete' });
    setView('consent_confirm');
  };

  const handleNextMember = () => {
    setSelectedMember(null);
    setCurrentSubmission(null);
    setSignatureReceived(false);
    setSignatureData(null);
    setView('consent_member');
  };

  const resetFlow = () => {
    setSelectedEvent(null);
    setSelectedForm(null);
    setSelectedMember(null);
    setCurrentSubmission(null);
    setSignatureReceived(false);
    setView('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#004851] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#004851] flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png" alt="Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-2xl font-bold">40th Rochdale (Syke) Scouts</h1>
          <p className="text-white/60">Please sign in to use the iPad station</p>
          <Button onClick={() => base44.auth.redirectToLogin('/ipad')} className="bg-white text-[#004851] hover:bg-white/90 font-semibold px-8">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────
  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#004851] to-[#001a1d] flex flex-col items-center justify-center p-8 relative">
        <div className="text-center mb-12">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png" alt="Logo" className="h-20 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">40th Rochdale (Syke) Scouts</h1>
          <p className="text-white/50 text-lg mt-1">Station Tablet</p>
        </div>

        {/* App grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 max-w-xl w-full">
          <button
            onClick={() => setView('consent_event')}
            className="flex flex-col items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur rounded-3xl p-8 transition-all hover:scale-105 group"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-[#004851] rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-teal-400/30">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <span className="text-white font-semibold text-sm">Consent Forms</span>
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={() => base44.auth.logout('/ipad')}
          className="absolute bottom-6 right-6 flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    );
  }

  // ── Shared header for consent flow ──────────────────────────
  const FlowHeader = ({ title, subtitle, onBack }) => (
    <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
      <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
        <ChevronLeft className="w-6 h-6 text-gray-600" />
      </button>
      <div>
        <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );

  // ── Select Event or Meeting ────────────────────────────────
  if (view === 'consent_event') {
    return (
      <div className="min-h-screen bg-gray-50">
        <FlowHeader title="Select Event or Meeting" subtitle="Choose what this consent form is for" onBack={resetFlow} />
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {events.filter(e => {
            const d = new Date(e.start_date);
            return d >= new Date();
          }).length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Upcoming Events</h3>
              <div className="space-y-2">
                {events.filter(e => new Date(e.start_date) >= new Date()).slice(0, 5).map(evt => (
                  <button
                    key={evt.id}
                    onClick={() => { setSelectedEvent(evt); setSelectedEventType('event'); setView('consent_form'); }}
                    className="w-full text-left bg-white rounded-2xl p-4 border border-gray-100 hover:border-[#004851] hover:shadow-md transition-all flex items-center gap-4"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 font-bold text-sm">{format(new Date(evt.start_date), 'd MMM')}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{evt.title}</p>
                      <p className="text-sm text-gray-500">{evt.type} · {evt.location || 'TBC'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {upcomingMeetings.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Upcoming Meetings</h3>
              <div className="space-y-2">
                {upcomingMeetings.map(prog => {
                  const section = sections.find(s => s.id === prog.section_id);
                  return (
                    <button
                      key={prog.id}
                      onClick={() => { setSelectedEvent({ ...prog, section_id: prog.section_id }); setSelectedEventType('meeting'); setView('consent_form'); }}
                      className="w-full text-left bg-white rounded-2xl p-4 border border-gray-100 hover:border-[#004851] hover:shadow-md transition-all flex items-center gap-4"
                    >
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-green-700 font-bold text-sm">{format(new Date(prog.date), 'd MMM')}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{prog.title}</p>
                        <p className="text-sm text-gray-500">{section?.display_name || 'Meeting'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Select Form ────────────────────────────────────────────
  if (view === 'consent_form') {
    return (
      <div className="min-h-screen bg-gray-50">
        <FlowHeader title="Select Consent Form" subtitle={selectedEvent?.title} onBack={() => setView('consent_event')} />
        <div className="max-w-2xl mx-auto p-6 space-y-3">
          {forms.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No active consent forms found.</p>
            </div>
          )}
          {forms.map(form => (
            <button
              key={form.id}
              onClick={() => { setSelectedForm(form); setView('consent_member'); }}
              className="w-full text-left bg-white rounded-2xl p-5 border border-gray-100 hover:border-[#004851] hover:shadow-md transition-all"
            >
              <p className="font-semibold text-gray-900 text-lg">{form.title}</p>
              {form.description && <p className="text-sm text-gray-500 mt-1">{form.description}</p>}
              <p className="text-xs text-gray-400 mt-2">{form.blocks?.length || 0} fields</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Select Member ──────────────────────────────────────────
  if (view === 'consent_member') {
    return (
      <div className="min-h-screen bg-gray-50">
        <FlowHeader
          title="Select Member"
          subtitle={`${selectedEvent?.title} · ${selectedForm?.title}`}
          onBack={() => setView('consent_form')}
        />
        <div className="max-w-2xl mx-auto p-6">
          {memberList.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No members found for this event.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {memberList.map(member => (
                <button
                  key={member.id}
                  onClick={() => handleMemberSelect(member)}
                  className="text-left bg-white rounded-2xl p-4 border border-gray-100 hover:border-[#004851] hover:shadow-md transition-all flex items-center gap-3"
                >
                  <div className="w-11 h-11 bg-[#004851] rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {member.first_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{member.full_name || `${member.first_name} ${member.surname}`}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Fill Form ──────────────────────────────────────────────
  if (view === 'consent_fill') {
    const qrUrl = currentSubmission
      ? `${window.location.origin}/sign?token=${currentSubmission.sign_token}`
      : null;
    const qrImageUrl = qrUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl)}`
      : null;

    return (
      <div className="min-h-screen bg-gray-50">
        <FlowHeader
          title={selectedMember?.first_name || 'Fill Form'}
          subtitle={`${selectedForm?.title} · ${selectedEvent?.title}`}
          onBack={() => { setCurrentSubmission(null); setView('consent_member'); }}
        />
        <div className="max-w-2xl mx-auto p-6 space-y-5 pb-24">
          {/* Member banner */}
          <div className="bg-[#004851] text-white rounded-2xl p-4 flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
              {selectedMember?.first_name?.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-lg">{selectedMember?.full_name || `${selectedMember?.first_name} ${selectedMember?.surname}`}</p>
              <p className="text-white/60 text-sm">{selectedEvent?.title}</p>
            </div>
          </div>

          {/* Form blocks */}
          {(selectedForm?.blocks || []).map(block => {
            if (block.type === 'heading') return (
              <h2 key={block.id} className="text-xl font-bold text-gray-900 pt-2">{block.label}</h2>
            );
            if (block.type === 'text') return (
              <p key={block.id} className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{block.content}</p>
            );
            if (block.type === 'single_line') return (
              <div key={block.id} className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">{block.label}{block.required && <span className="text-red-500 ml-1">*</span>}</label>
                <input
                  type="text"
                  value={responses[block.id] || ''}
                  onChange={e => setResponses(r => ({ ...r, [block.id]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#004851]"
                />
              </div>
            );
            if (block.type === 'multi_line') return (
              <div key={block.id} className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">{block.label}{block.required && <span className="text-red-500 ml-1">*</span>}</label>
                <textarea
                  value={responses[block.id] || ''}
                  onChange={e => setResponses(r => ({ ...r, [block.id]: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#004851] resize-none"
                />
              </div>
            );
            if (block.type === 'multiple_choice') return (
              <div key={block.id} className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{block.label}{block.required && <span className="text-red-500 ml-1">*</span>}</label>
                <div className="space-y-2">
                  {(block.options || []).map((opt, idx) => (
                    <label key={idx} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name={`block-${block.id}`}
                        value={opt}
                        checked={responses[block.id] === opt}
                        onChange={() => setResponses(r => ({ ...r, [block.id]: opt }))}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
            if (block.type === 'number') return (
              <div key={block.id} className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">{block.label}{block.required && <span className="text-red-500 ml-1">*</span>}</label>
                <input
                  type="number"
                  min={block.min} max={block.max}
                  value={responses[block.id] || ''}
                  onChange={e => setResponses(r => ({ ...r, [block.id]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#004851]"
                />
              </div>
            );
            return null;
          })}

          {/* T&C */}
          {selectedForm?.terms_and_conditions && (
            <div className="bg-gray-100 rounded-xl p-4 space-y-3">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedForm.terms_and_conditions}</p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tcAccepted}
                  onChange={e => setTcAccepted(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded"
                />
                <span className="text-sm font-medium text-gray-700">I agree to the above terms and conditions</span>
              </label>
            </div>
          )}

          {/* Signature section */}
          {!currentSubmission ? (
            <Button
              onClick={handleGenerateQR}
              disabled={submitting || (!selectedForm?.terms_and_conditions ? false : !tcAccepted)}
              className="w-full py-5 bg-[#004851] hover:bg-[#003840] text-white text-base font-semibold rounded-xl"
            >
              {submitting ? 'Generating...' : 'Generate Signature QR Code →'}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4 text-center">Step 1: Parent scans QR code to sign on their phone</h3>
                <div className="flex flex-col items-center gap-4">
                  <img src={qrImageUrl} alt="QR Code" className="w-48 h-48 rounded-xl border border-gray-100" />
                  <p className="text-xs text-gray-400 break-all text-center">{qrUrl}</p>
                </div>
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <h4 className="font-semibold text-gray-700 mb-2 text-center text-sm">Or: Sign here on the tablet</h4>
                  {!signatureReceived ? (
                    <SignaturePad onSigned={handleLocalSignature} />
                  ) : (
                    <div className="text-center space-y-2">
                      <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
                      <p className="text-green-600 font-semibold">Signature received!</p>
                      {signatureData && <img src={signatureData} alt="Signature" className="h-16 mx-auto border rounded-lg" />}
                    </div>
                  )}
                </div>
              </div>

              {signatureReceived && (
                <Button
                  onClick={handleFinalSubmit}
                  className="w-full py-5 bg-green-600 hover:bg-green-700 text-white text-base font-semibold rounded-xl"
                >
                  Submit Form ✓
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Confirmation ───────────────────────────────────────────
  if (view === 'consent_confirm') {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle className="w-24 h-24 text-green-500 mb-6" />
        <h1 className="text-3xl font-bold text-green-800 mb-2">Form Submitted!</h1>
        <p className="text-green-600 text-lg mb-2">{selectedMember?.first_name}'s consent form has been saved.</p>
        <p className="text-gray-500 mb-10">{selectedForm?.title} · {selectedEvent?.title}</p>
        <div className="flex gap-4">
          <Button onClick={handleNextMember} className="bg-[#004851] hover:bg-[#003840] text-white px-8 py-4 text-base rounded-xl">
            <User className="w-5 h-5 mr-2" />
            Next Member
          </Button>
          <Button onClick={resetFlow} variant="outline" className="px-8 py-4 text-base rounded-xl">
            Back to Menu
          </Button>
        </div>
      </div>
    );
  }

  return null;
}