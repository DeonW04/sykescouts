import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import LeaderNav from '../components/leader/LeaderNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';

// ── Generate and upload a PDF for a single submission ────────
async function generateAndUploadSubmissionPDF(submission, form) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentW = pageW - margin * 2;
  let y = margin;

  const lineH = 14;
  const addText = (text, opts = {}) => {
    const { size = 10, bold = false, color = [17, 17, 17] } = opts;
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text || ''), contentW);
    lines.forEach(line => {
      if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += size * 1.4;
    });
  };

  // Header
  doc.setFillColor(0, 72, 81);
  doc.rect(0, 0, pageW, 60, 'F');
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('40th Rochdale (Syke) Scouts', margin, 28);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(form?.title || 'Consent Form', margin, 48);
  y = 80;

  // Meta
  addText(`Submitted by: ${submission.parent_name || 'Unknown'}  |  Date: ${submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}  |  Status: Signed`, { size: 9, color: [100, 100, 100] });
  y += 8;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 12;

  // Form blocks
  const blocks = form?.blocks || [];
  const responses = submission.responses || {};
  blocks.forEach(block => {
    if (block.type === 'heading') {
      y += 4;
      addText(block.label, { size: 13, bold: true, color: [0, 72, 81] });
      doc.setDrawColor(0, 168, 148);
      doc.line(margin, y - 4, margin + 120, y - 4);
      y += 4;
    } else if (block.type === 'text') {
      addText(block.content, { size: 9, color: [80, 80, 80] });
      y += 2;
    } else {
      // Field
      addText(block.label + (block.required ? ' *' : ''), { size: 9, bold: true, color: [55, 65, 81] });
      const val = responses[block.id];
      const displayVal = val !== undefined && val !== null && val !== '' ? String(val) : '(no response)';
      // Box
      const boxH = 24;
      if (y + boxH > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(209, 213, 219);
      doc.roundedRect(margin, y, contentW, boxH, 3, 3, 'FD');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(17, 17, 17);
      const valLines = doc.splitTextToSize(displayVal, contentW - 12);
      doc.text(valLines[0], margin + 6, y + 16);
      y += boxH + 6;
    }
  });

  // Terms
  if (form?.terms_and_conditions) {
    y += 8;
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    const tcH = 40;
    doc.roundedRect(margin, y, contentW, tcH, 4, 4, 'FD');
    addText('Terms & Conditions accepted: ' + (submission.tc_accepted ? 'Yes' : 'No'), { size: 9, bold: true, color: [22, 101, 52] });
  }

  // Signature
  if (submission.signature_data_url) {
    y += 12;
    addText('Signature:', { size: 9, bold: true });
    doc.addImage(submission.signature_data_url, 'PNG', margin, y, 160, 60);
    y += 68;
    addText(`Signed by: ${submission.parent_name || 'Parent/Guardian'}${submission.signed_via_app ? ' (via SykeScouts App)' : ''}`, { size: 9, color: [107, 114, 128] });
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175);
  doc.text(`Generated ${new Date().toLocaleDateString('en-GB')} — 40th Rochdale (Syke) Scouts`, margin, doc.internal.pageSize.getHeight() - 20);

  const pdfBlob = doc.output('blob');
  const pdfFile = new File([pdfBlob], `${form?.title || 'consent'}_${submission.parent_name || 'signed'}.pdf`, { type: 'application/pdf' });
  const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
  return file_url;
}

// ── Delete dialog ────────────────────────────────────────────
function DeleteFormDialog({ form, onClose, onDeleted }) {
  const [step, setStep] = useState('loading'); // loading | confirm | saving | done
  const [signedSubs, setSignedSubs] = useState([]);
  const [progress, setProgress] = useState(0);

  React.useEffect(() => {
    async function checkSubs() {
      const all = await base44.entities.ConsentFormSubmission.filter({ form_id: form.id });
      const signed = all.filter(s => (s.status === 'signed' || s.status === 'complete') && s.signature_data_url);
      setSignedSubs(signed);
      setStep('confirm');
    }
    checkSubs();
  }, [form.id]);

  const handleDeleteAll = async () => {
    await base44.entities.ConsentForm.delete(form.id);
    toast.success('Form deleted');
    onDeleted();
    onClose();
  };

  const handleSaveAsPDFs = async () => {
    setStep('saving');
    try {
      for (let i = 0; i < signedSubs.length; i++) {
        const sub = signedSubs[i];
        setProgress(i);
        const pdfUrl = await generateAndUploadSubmissionPDF(sub, form);

        // Save to the linked programme or event documents
        const docEntry = {
          id: Date.now().toString() + i,
          name: `${sub.parent_name || 'Signed'} — ${form.title}`,
          url: pdfUrl,
          type: 'consent_pdf',
          uploaded_at: new Date().toISOString(),
        };

        if (sub.programme_id) {
          const prog = await base44.entities.Programme.filter({ id: sub.programme_id });
          if (prog[0]) {
            const existing = prog[0].documents || [];
            await base44.entities.Programme.update(sub.programme_id, { documents: [...existing, docEntry] });
          }
        } else if (sub.event_id) {
          const evt = await base44.entities.Event.filter({ id: sub.event_id });
          if (evt[0]) {
            const existing = evt[0].documents || [];
            await base44.entities.Event.update(sub.event_id, { documents: [...existing, docEntry] });
          }
        }
      }
      setProgress(signedSubs.length);
      await base44.entities.ConsentForm.delete(form.id);
      setStep('done');
    } catch (err) {
      toast.error('Failed to save PDFs: ' + err.message);
      setStep('confirm');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        {step === 'loading' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <p className="text-gray-500 text-sm">Checking for signed submissions…</p>
          </div>
        )}

        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                Delete "{form.title}"?
              </DialogTitle>
            </DialogHeader>
            {signedSubs.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-800 mb-1">
                    ⚠️ {signedSubs.length} signed submission{signedSubs.length > 1 ? 's' : ''} found
                  </p>
                  <p className="text-sm text-amber-700">
                    These will become unreadable if you delete the form now. You can save them as PDFs first (saved to their linked meetings/events).
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={handleSaveAsPDFs} className="bg-green-600 hover:bg-green-700 text-white">
                    Save {signedSubs.length} submission{signedSubs.length > 1 ? 's' : ''} as PDFs, then delete form
                  </Button>
                  <Button onClick={handleDeleteAll} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                    Delete form and all submissions
                  </Button>
                  <Button onClick={onClose} variant="ghost">Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">No signed submissions found. This will permanently delete the form.</p>
                <DialogFooter>
                  <Button variant="ghost" onClick={onClose}>Cancel</Button>
                  <Button onClick={handleDeleteAll} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
                </DialogFooter>
              </div>
            )}
          </>
        )}

        {step === 'saving' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#7413dc]" />
            <p className="font-semibold text-gray-800">Saving PDFs…</p>
            <p className="text-sm text-gray-500">{progress} of {signedSubs.length} saved</p>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-[#7413dc] rounded-full transition-all"
                style={{ width: `${signedSubs.length > 0 ? (progress / signedSubs.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center py-8 gap-4 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <p className="font-bold text-gray-800 text-lg">All done!</p>
            <p className="text-sm text-gray-500">{signedSubs.length} PDF{signedSubs.length > 1 ? 's' : ''} saved to their linked meetings/events. Form deleted.</p>
            <Button onClick={() => { onDeleted(); onClose(); }} className="bg-[#004851] text-white">Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function ConsentForms() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deletingForm, setDeletingForm] = useState(null);

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['consent-forms'],
    queryFn: () => base44.entities.ConsentForm.list('-created_date'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.ConsentForm.update(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['consent-forms'] }),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      <div className="bg-gradient-to-r from-[#004851] to-[#00a794] text-white py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileText className="w-10 h-10" />
              <div>
                <h1 className="text-3xl font-bold">Consent Forms</h1>
                <p className="text-white/70 mt-1">Build and manage consent forms for events and meetings</p>
              </div>
            </div>
            <Button onClick={() => navigate(createPageUrl('ConsentFormBuilder'))} className="bg-white text-[#004851] hover:bg-white/90 font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              New Form
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-[#004851] border-t-transparent rounded-full" />
          </div>
        ) : forms.length === 0 ? (
          <Card>
            <CardContent className="p-16 text-center">
              <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No consent forms yet</h3>
              <p className="text-gray-500 mb-6">Create your first consent form to use with events and meetings</p>
              <Button onClick={() => navigate(createPageUrl('ConsentFormBuilder'))} className="bg-[#004851] hover:bg-[#003840]">
                <Plus className="w-4 h-4 mr-2" />
                Create First Form
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {forms.map(form => (
              <Card key={form.id} className={`transition-all ${!form.active ? 'opacity-60' : ''}`}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-teal-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{form.title}</h3>
                      {!form.active && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Inactive</span>}
                    </div>
                    {form.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{form.description}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {form.blocks?.length || 0} field{form.blocks?.length !== 1 ? 's' : ''} · Created {format(new Date(form.created_date), 'd MMM yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => toggleMutation.mutate({ id: form.id, active: !form.active })} title={form.active ? 'Deactivate' : 'Activate'}>
                      {form.active ? <ToggleRight className="w-5 h-5 text-teal-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl('ConsentFormBuilder') + `?id=${form.id}`)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeletingForm(form)} className="text-red-500 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {deletingForm && (
        <DeleteFormDialog
          form={deletingForm}
          onClose={() => setDeletingForm(null)}
          onDeleted={() => queryClient.invalidateQueries({ queryKey: ['consent-forms'] })}
        />
      )}
    </div>
  );
}