import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderOpen, Upload, FileText, ShieldAlert, Download, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentStorageSection({ programmeId, entityType }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [pendingFile, setPendingFile] = useState(null);

  // Fetch the entity to get documents array and consent_form_ids
  const { data: entity } = useQuery({
    queryKey: ['doc-entity', entityType, programmeId],
    queryFn: async () => {
      if (!programmeId) return null;
      const res = entityType === 'event'
        ? await base44.entities.Event.filter({ id: programmeId })
        : await base44.entities.Programme.filter({ id: programmeId });
      return res[0] || null;
    },
    enabled: !!programmeId,
  });

  const linkedFormIds = entity?.consent_form_ids || [];
  const storedDocuments = entity?.documents || [];

  const { data: linkedForms = [] } = useQuery({
    queryKey: ['doc-forms', linkedFormIds.join(',')],
    queryFn: () => base44.entities.ConsentForm.filter({}),
    enabled: linkedFormIds.length > 0,
    select: (all) => all.filter(f => linkedFormIds.includes(f.id)),
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ['doc-risks', entityType, programmeId],
    queryFn: async () => {
      const all = await base44.entities.RiskAssessment.filter({});
      return all.filter(r =>
        entityType === 'event' ? r.event_id === programmeId : r.programme_id === programmeId
      );
    },
    enabled: !!programmeId,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['doc-submissions', entityType, programmeId],
    queryFn: async () => {
      const all = await base44.entities.ConsentFormSubmission.filter({});
      return all.filter(s =>
        entityType === 'event' ? s.event_id === programmeId : s.programme_id === programmeId
      );
    },
    enabled: !!programmeId,
  });

  const saveDocsMutation = useMutation({
    mutationFn: (docs) => {
      if (entityType === 'event') {
        return base44.entities.Event.update(programmeId, { documents: docs });
      } else {
        return base44.entities.Programme.update(programmeId, { documents: docs });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doc-entity'] });
      toast.success('Document saved');
    },
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    setUploadName(file.name.replace(/\.[^.]+$/, ''));
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pendingFile });
      const newDoc = {
        id: Date.now().toString(),
        name: uploadName || pendingFile.name,
        url: file_url,
        type: 'upload',
        uploaded_at: new Date().toISOString(),
      };
      await saveDocsMutation.mutateAsync([...storedDocuments, newDoc]);
      setPendingFile(null);
      setUploadName('');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    const updated = storedDocuments.filter(d => d.id !== docId);
    await saveDocsMutation.mutateAsync(updated);
    toast.success('Document removed');
  };

  const signedSubmissions = submissions.filter(s => s.status === 'signed' || s.status === 'complete');

  const printSubmission = (sub, form) => {
    const win = window.open('', '_blank');
    const blocks = form?.blocks || [];
    const responses = sub.responses || {};
    const rows = blocks.map(b => {
      if (b.type === 'heading') return `<h3 style="font-size:15px;font-weight:bold;margin:14px 0 4px">${b.label}</h3>`;
      if (b.type === 'text') return `<p style="color:#555;margin:4px 0">${b.content || ''}</p>`;
      const val = responses[b.id];
      return `<div style="margin:10px 0"><p style="font-size:11px;color:#666;margin-bottom:2px">${b.label}</p><p style="border:1px solid #ddd;padding:8px;border-radius:4px;background:#f9f9f9;min-height:28px">${val !== undefined ? val : ''}</p></div>`;
    }).join('');
    win.document.write(`<html><head><title>${form?.title || 'Consent Form'}</title><style>body{font-family:sans-serif;padding:32px;max-width:700px;margin:0 auto}</style></head><body>
      <h1 style="font-size:20px;font-weight:bold">${form?.title || 'Consent Form'}</h1>
      <p style="color:#666;font-size:12px;margin-bottom:20px;border-bottom:1px solid #eee;padding-bottom:10px">Submitted by: ${sub.parent_name || 'Unknown'}</p>
      ${rows}
      ${sub.signature_data_url ? `<div style="margin-top:20px"><p style="font-size:11px;color:#666">Signature:</p><img src="${sub.signature_data_url}" style="border:1px solid #ddd;max-width:280px;margin-top:4px"/></div>` : ''}
      <script>window.print();window.close();</script>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Risk Assessments */}
      {riskAssessments.length > 0 && (
        <Card>
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="w-4 h-4 text-orange-500" />
              Risk Assessments
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {riskAssessments.map(ra => (
              <div key={ra.id} className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <ShieldAlert className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{ra.activity || ra.title || 'Risk Assessment'}</p>
                  <p className="text-xs text-gray-500">{ra.status || ''}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  onClick={() => window.open(createPageUrl('RiskAssessmentDetail') + `?id=${ra.id}`, '_blank')}
                >
                  <Download className="w-3 h-3 mr-1" />
                  View
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Consent Form Submissions */}
      {signedSubmissions.length > 0 && (
        <Card>
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-teal-600" />
              Signed Consent Forms
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {signedSubmissions.map(sub => {
              const form = linkedForms.find(f => f.id === sub.form_id);
              return (
                <div key={sub.id} className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <FileText className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{form?.title || 'Consent Form'}</p>
                    <p className="text-xs text-gray-500">Signed by {sub.parent_name || 'parent'}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-teal-300 text-teal-700 hover:bg-teal-50"
                    onClick={() => printSubmission(sub, form)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Print PDF
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Uploaded Documents */}
      <Card>
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="w-4 h-4 text-blue-600" />
            Uploaded Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {storedDocuments.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No documents uploaded yet.</p>
          )}
          {storedDocuments.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{doc.name}</p>
                <p className="text-xs text-gray-500">{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('en-GB') : ''}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-blue-300 text-blue-700" onClick={() => window.open(doc.url, '_blank')}>
                  <Download className="w-3 h-3 mr-1" />
                  Open
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteDoc(doc.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}

          {/* Upload area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-3 bg-gray-50">
            <p className="text-sm font-medium text-gray-700">Upload a document</p>
            <input type="file" id="doc-upload" className="hidden" onChange={handleFileSelect} />
            {!pendingFile ? (
              <Button variant="outline" size="sm" onClick={() => document.getElementById('doc-upload').click()}>
                <Plus className="w-4 h-4 mr-2" />
                Select File
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Selected: {pendingFile.name}</p>
                <Input
                  value={uploadName}
                  onChange={e => setUploadName(e.target.value)}
                  placeholder="Document name"
                  className="h-8 text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleUpload} disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
                    <Upload className="w-3 h-3 mr-1" />
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setPendingFile(null); setUploadName(''); }}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// helper — only needed for risk assessment link
function createPageUrl(page) {
  return `/${page}`;
}