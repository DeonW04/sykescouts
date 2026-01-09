import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Eye, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function RiskAssessmentSection({ programmeId, entityType = 'programme' }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewingPdf, setViewingPdf] = useState(null);

  const { data: assessments = [] } = useQuery({
    queryKey: ['risk-assessments', programmeId, entityType],
    queryFn: () => {
      const filter = entityType === 'event'
        ? { event_id: programmeId }
        : { programme_id: programmeId };
      return base44.entities.RiskAssessment.filter(filter);
    },
    enabled: !!programmeId,
  });

  const createAssessmentMutation = useMutation({
    mutationFn: (data) => {
      const assessmentData = entityType === 'event'
        ? { event_id: programmeId, ...data }
        : { programme_id: programmeId, ...data };
      return base44.entities.RiskAssessment.create(assessmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-assessments'] });
      setShowDialog(false);
      setTitle('');
      toast.success('Risk assessment added');
    },
  });

  const uploadPdfMutation = useMutation({
    mutationFn: async ({ id, file }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return base44.entities.RiskAssessment.update(id, {
        file_url,
        completed: true,
        uploaded_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-assessments'] });
      toast.success('Risk assessment uploaded');
    },
  });

  const handleUpload = async (assessment, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setUploading(true);
    try {
      await uploadPdfMutation.mutateAsync({ id: assessment.id, file });
    } catch (error) {
      toast.error('Error uploading file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Risk Assessments</CardTitle>
            <Button onClick={() => setShowDialog(true)} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Risk Assessment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No risk assessments yet</p>
          ) : (
            <div className="space-y-2">
              {assessments.map(assessment => (
                <div key={assessment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{assessment.title}</p>
                      {assessment.uploaded_date && (
                        <p className="text-sm text-gray-500">
                          Uploaded {new Date(assessment.uploaded_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={assessment.completed ? 'default' : 'secondary'}>
                      {assessment.completed ? 'Completed' : 'Not Completed'}
                    </Badge>
                    {assessment.completed ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingPdf(assessment.file_url)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" asChild disabled={uploading}>
                        <label className="cursor-pointer">
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                          <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => handleUpload(assessment, e)}
                          />
                        </label>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Risk Assessment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Risk Assessment Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Fire Safety Risk Assessment"
              />
            </div>
            <Button
              onClick={() => createAssessmentMutation.mutate({ title })}
              disabled={!title || createAssessmentMutation.isPending}
              className="w-full"
            >
              Add Risk Assessment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingPdf} onOpenChange={() => setViewingPdf(null)}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Risk Assessment</DialogTitle>
          </DialogHeader>
          <iframe
            src={viewingPdf}
            className="w-full h-full border-0"
            title="Risk Assessment PDF"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}