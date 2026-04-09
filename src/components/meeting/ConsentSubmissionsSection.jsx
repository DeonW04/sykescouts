import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle, Eye, FileText, Printer, Send } from 'lucide-react';
import PushConsentFormDialog from './PushConsentFormDialog';

const LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png';

function buildPrintHTML(submission, form) {
  const blocks = form?.blocks || [];
  const responses = submission?.responses || {};
  const signedViaApp = submission?.signed_via_app;

  const rows = blocks.map(b => {
    if (b.type === 'heading') return `<h3 style="font-size:15px;font-weight:700;color:#004851;margin:20px 0 6px;border-bottom:1px solid #e5e7eb;padding-bottom:4px">${b.label}</h3>`;
    if (b.type === 'text') return `<p style="color:#555;font-size:13px;margin:6px 0;line-height:1.5">${b.content || ''}</p>`;
    const val = responses[b.id];
    const displayVal = val !== undefined && val !== null && val !== '' ? String(val) : '<em style="color:#aaa">No response</em>';
    return `<div style="margin:10px 0"><p style="font-size:11px;font-weight:600;color:#374151;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">${b.label}${b.required ? ' <span style="color:#ef4444">*</span>' : ''}</p><div style="border:1px solid #d1d5db;padding:10px 12px;border-radius:6px;background:#f9fafb;min-height:34px;font-size:13px;color:#111">${displayVal}</div></div>`;
  }).join('');

  const termsSection = form?.terms_and_conditions
    ? `<div style="margin-top:24px;padding:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px"><p style="font-size:12px;font-weight:600;color:#166534;margin-bottom:6px">Terms &amp; Conditions</p><p style="font-size:12px;color:#374151;white-space:pre-wrap;margin-bottom:8px">${form.terms_and_conditions}</p><p style="font-size:12px;font-weight:600;color:${submission?.tc_accepted ? '#166534' : '#991b1b'}">${submission?.tc_accepted ? '✓ Terms accepted' : '✗ Terms not accepted'}</p></div>`
    : '';

  const sigSection = submission?.signature_data_url
    ? `<div style="margin-top:24px;padding:14px;border:1px solid #d1d5db;border-radius:6px;background:#fafafa"><p style="font-size:11px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Signature</p><img src="${submission.signature_data_url}" style="max-width:280px;border:1px solid #d1d5db;border-radius:4px;display:block"/><p style="font-size:11px;color:#6b7280;margin-top:6px">Signed by: ${submission.parent_name || 'Parent/Guardian'}${signedViaApp ? ' (via SykeScouts App)' : ''}</p></div>`
    : '';

  const appBadge = signedViaApp
    ? `<div style="display:inline-flex;align-items:center;gap:6px;background:#f3e8ff;border:1px solid #c4b5fd;border-radius:20px;padding:4px 12px;margin-bottom:16px"><span style="font-size:11px;font-weight:600;color:#6d28d9">✓ Signed via SykeScouts App</span></div>`
    : '';

  const submittedDate = submission?.submitted_at
    ? new Date(submission.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'N/A';

  return `<!DOCTYPE html><html><head><title>${form?.title || 'Consent Form'}</title>
<style>* { box-sizing: border-box; } body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 750px; margin: 0 auto; color: #111; } @media print { body { padding: 20px; } }</style>
</head><body>
<div style="display:flex;align-items:center;gap:16px;border-bottom:3px solid #7413dc;padding-bottom:16px;margin-bottom:24px">
  <img src="${LOGO}" style="height:70px;width:auto;object-fit:contain" />
  <div>
    <p style="font-size:11px;color:#7413dc;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px">40th Rochdale (Syke) Scouts</p>
    <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 4px">${form?.title || 'Consent Form'}</h1>
    ${form?.description ? `<p style="font-size:13px;color:#6b7280;margin:0">${form.description}</p>` : ''}
  </div>
</div>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;margin-bottom:20px;display:flex;gap:32px;flex-wrap:wrap">
  <div><p style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;margin:0 0 2px">Submitted By</p><p style="font-size:13px;font-weight:600;margin:0">${submission?.parent_name || 'Unknown'}</p></div>
  <div><p style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;margin:0 0 2px">Date</p><p style="font-size:13px;font-weight:600;margin:0">${submittedDate}</p></div>
  <div><p style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;margin:0 0 2px">Status</p><p style="font-size:13px;font-weight:600;color:#166534;margin:0">Signed</p></div>
</div>
${appBadge}
${rows}
${termsSection}
${sigSection}
<p style="margin-top:32px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px">Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} — 40th Rochdale (Syke) Scouts</p>
<script>window.print();window.close();</script>
</body></html>`;
}

function FormResponseViewer({ submission, form }) {
  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(buildPrintHTML(submission, form));
    win.document.close();
  };

  const blocks = form.blocks || [];
  const responses = submission.responses || {};

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-600">Submitted by: <strong>{submission.parent_name || 'Unknown'}</strong></p>
            {submission.signed_via_app && (
              <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">via SykeScouts App</span>
            )}
          </div>
          <p className="text-xs text-gray-500">{submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</p>
        </div>
        <Button size="sm" variant="outline" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print / Save PDF
        </Button>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {blocks.map(block => {
          if (block.type === 'heading') return <h3 key={block.id} className="font-semibold text-base mt-4">{block.label}</h3>;
          if (block.type === 'text') return <p key={block.id} className="text-sm text-gray-600">{block.content}</p>;
          const val = responses[block.id];
          return (
            <div key={block.id} className="space-y-1">
              <p className="text-sm font-medium text-gray-700">{block.label}{block.required && <span className="text-red-500 ml-1">*</span>}</p>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm min-h-[36px]">
                {val !== undefined && val !== null && val !== '' ? String(val) : <span className="text-gray-400 italic">No response</span>}
              </div>
            </div>
          );
        })}

        {form.terms_and_conditions && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs font-medium text-blue-800">Terms & Conditions: {submission.tc_accepted ? '✓ Accepted' : '✗ Not accepted'}</p>
          </div>
        )}

        {submission.signature_data_url && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Signature:</p>
            <img src={submission.signature_data_url} alt="Signature" className="border border-gray-300 rounded-md max-w-[300px]" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConsentSubmissionsSection({ programmeId, entityType, linkedForms, entityData }) {
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [viewingForm, setViewingForm] = useState(null);
  const [pushingForm, setPushingForm] = useState(null);

  const { data: members = [] } = useQuery({
    queryKey: ['consent-members', entityType, programmeId],
    queryFn: async () => {
      let result;
      if (entityType === 'programme') {
        result = await base44.entities.Member.filter({ section_id: entityData?.section_id, active: true });
      } else {
        const attendances = await base44.entities.EventAttendance.filter({ event_id: programmeId });
        if (!attendances.length) return [];
        const memberIds = attendances.map(a => a.member_id);
        const allMembers = await base44.entities.Member.filter({});
        result = allMembers.filter(m => memberIds.includes(m.id));
      }
      return result.sort((a, b) => new Date(a.date_of_birth) - new Date(b.date_of_birth));
    },
    enabled: !!programmeId && !!entityData,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['consent-submissions', programmeId, entityType],
    queryFn: async () => {
      const all = await base44.entities.ConsentFormSubmission.filter({});
      return all.filter(s =>
        entityType === 'event' ? s.event_id === programmeId : s.programme_id === programmeId
      );
    },
    enabled: !!programmeId,
  });

  if (!linkedForms || linkedForms.length === 0) return null;

  return (
    <div className="space-y-4">
      {linkedForms.map(form => {
        const formSubmissions = submissions.filter(s => s.form_id === form.id);
        const statusOf = (memberId) => {
          const sub = formSubmissions.find(s => s.member_id === memberId);
          if (!sub) return 'not_started';
          return sub.status;
        };
        const signed = formSubmissions.filter(s => s.status === 'signed' || s.status === 'complete').length;
        const total = members.length;

        return (
          <Card key={form.id} className="border-teal-200">
            <CardHeader className="border-b border-teal-100 bg-teal-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-teal-600" />
                  {form.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={signed === total && total > 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                    {signed}/{total} signed
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setPushingForm(form)} className="gap-1 border-teal-300 text-teal-700 hover:bg-teal-50">
                    <Send className="w-3 h-3" /> Push
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {members.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No members found.</p>
              ) : (
                <div className="space-y-2">
                  {members.map(member => {
                    const status = statusOf(member.id);
                    const sub = formSubmissions.find(s => s.member_id === member.id);
                    return (
                      <div key={member.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
                        <div className="flex-shrink-0">
                          {status === 'signed' || status === 'complete' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : status === 'awaiting_signature' ? (
                            <Clock className="w-5 h-5 text-amber-500" />
                          ) : status === 'pending' ? (
                            <Clock className="w-5 h-5 text-blue-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{member.full_name}</p>
                          <p className="text-xs text-gray-500">
                            {status === 'signed' || status === 'complete'
                              ? `Signed${sub?.parent_name ? ` by ${sub.parent_name}` : ''}${sub?.signed_via_app ? ' · via App' : ''}`
                              : status === 'awaiting_signature' ? 'Awaiting signature'
                              : status === 'pending' ? 'Sent — awaiting response'
                              : 'Not sent'}
                          </p>
                        </div>
                        {sub && (status === 'signed' || status === 'complete' || status === 'pending' || status === 'awaiting_signature') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setViewingSubmission(sub); setViewingForm(form); }}
                            className="text-teal-600 border-teal-300 hover:bg-teal-50"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!viewingSubmission} onOpenChange={(open) => { if (!open) { setViewingSubmission(null); setViewingForm(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingForm?.title} — Submission</DialogTitle>
          </DialogHeader>
          {viewingSubmission && viewingForm && (
            <FormResponseViewer submission={viewingSubmission} form={viewingForm} />
          )}
        </DialogContent>
      </Dialog>

      {pushingForm && (
        <PushConsentFormDialog
          open={!!pushingForm}
          onClose={() => setPushingForm(null)}
          form={pushingForm}
          programmeId={programmeId}
          entityType={entityType}
          entityData={entityData}
        />
      )}
    </div>
  );
}