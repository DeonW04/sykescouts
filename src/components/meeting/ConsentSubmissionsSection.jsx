import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle, Eye, FileText, Printer } from 'lucide-react';

function FormResponseViewer({ submission, form }) {
  const handlePrint = () => {
    const win = window.open('', '_blank');
    const blocks = form.blocks || [];
    const responses = submission.responses || {};
    const rows = blocks.map(b => {
      if (b.type === 'heading') return `<h3 style="font-size:16px;font-weight:bold;margin:16px 0 4px">${b.label}</h3>`;
      if (b.type === 'text') return `<p style="color:#555;margin:4px 0">${b.content || ''}</p>`;
      const val = responses[b.id];
      return `<div style="margin:12px 0"><p style="font-size:12px;color:#666;margin-bottom:2px">${b.label}${b.required ? ' *' : ''}</p><p style="border:1px solid #ddd;padding:8px;border-radius:4px;background:#f9f9f9;min-height:32px">${val !== undefined && val !== null ? val : '<em style="color:#aaa">No response</em>'}</p></div>`;
    }).join('');
    win.document.write(`<html><head><title>${form.title}</title><style>body{font-family:sans-serif;padding:32px;max-width:700px;margin:0 auto}@media print{body{padding:16px}}</style></head><body>
      <h1 style="font-size:22px;font-weight:bold;margin-bottom:4px">${form.title}</h1>
      <p style="color:#666;margin-bottom:8px">${form.description || ''}</p>
      <p style="font-size:12px;color:#999;margin-bottom:24px;border-bottom:1px solid #eee;padding-bottom:12px">Submitted by: ${submission.parent_name || 'Unknown'} | Status: ${submission.status}</p>
      ${rows}
      ${form.terms_and_conditions ? `<div style="margin-top:24px;padding:12px;background:#f5f5f5;border-radius:4px;font-size:12px"><strong>Terms accepted:</strong> ${submission.tc_accepted ? 'Yes' : 'No'}</div>` : ''}
      ${submission.signature_data_url ? `<div style="margin-top:24px"><p style="font-size:12px;color:#666;margin-bottom:4px">Signature:</p><img src="${submission.signature_data_url}" style="border:1px solid #ddd;max-width:300px;border-radius:4px"/></div>` : ''}
      <script>window.print();window.close();</script>
    </body></html>`);
    win.document.close();
  };

  const blocks = form.blocks || [];
  const responses = submission.responses || {};

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-600">Submitted by: <strong>{submission.parent_name || 'Unknown'}</strong></p>
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

  const { data: members = [] } = useQuery({
    queryKey: ['consent-members', entityType, programmeId],
    queryFn: async () => {
      if (entityType === 'programme') {
        return base44.entities.Member.filter({ section_id: entityData?.section_id, active: true });
      } else {
        const attendances = await base44.entities.EventAttendance.filter({ event_id: programmeId });
        if (!attendances.length) return [];
        const memberIds = attendances.map(a => a.member_id);
        const allMembers = await base44.entities.Member.filter({});
        return allMembers.filter(m => memberIds.includes(m.id));
      }
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
                <Badge className={signed === total && total > 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                  {signed}/{total} signed
                </Badge>
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
                            {status === 'signed' || status === 'complete' ? `Signed${sub?.parent_name ? ` by ${sub.parent_name}` : ''}` :
                             status === 'awaiting_signature' ? 'Awaiting signature' :
                             status === 'pending' ? 'Form started' : 'Not started'}
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
    </div>
  );
}