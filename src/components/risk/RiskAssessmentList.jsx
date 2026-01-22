import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ExternalLink, Trash2, FileDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { format, isPast, parseISO } from 'date-fns';
import { toast } from 'sonner';
import MultiPDFGenerator from './MultiPDFGenerator';

export default function RiskAssessmentList({ programmeId, eventId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: assessments = [] } = useQuery({
    queryKey: ['risk-assessments', programmeId, eventId],
    queryFn: async () => {
      const all = await base44.entities.RiskAssessment.list();
      return all.filter(a => 
        (programmeId && a.programme_id === programmeId) ||
        (eventId && a.event_id === eventId)
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (assessmentId) => {
      const updateData = programmeId 
        ? { programme_id: null }
        : { event_id: null };
      
      return base44.entities.RiskAssessment.update(assessmentId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-assessments'] });
      toast.success('Risk assessment removed');
    },
  });

  const isOverdue = (assessment) => {
    if (!assessment.next_review_date) return false;
    return isPast(parseISO(assessment.next_review_date));
  };

  if (assessments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Linked Risk Assessments</h3>
        {assessments.length > 1 && (
          <MultiPDFGenerator assessments={assessments} />
        )}
      </div>

      {assessments.map(assessment => {
        const overdue = isOverdue(assessment);
        return (
          <Card 
            key={assessment.id}
            className={overdue ? 'border-2 border-yellow-400 bg-yellow-50' : ''}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    <h4 className="font-medium text-gray-900">{assessment.activity_name}</h4>
                    {overdue && (
                      <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  {assessment.assessor_name && (
                    <p className="text-sm text-gray-600 mt-1">Assessor: {assessment.assessor_name}</p>
                  )}
                  {assessment.assessment_date && (
                    <p className="text-sm text-gray-600">
                      Date: {format(parseISO(assessment.assessment_date), 'dd/MM/yyyy')}
                    </p>
                  )}
                  {overdue && (
                    <div className="mt-2 p-2 bg-yellow-100 rounded border border-yellow-300">
                      <p className="text-xs font-medium text-yellow-800">
                        ⚠️ Review overdue: {format(parseISO(assessment.next_review_date), 'dd/MM/yyyy')}
                      </p>
                      <Button
                        size="sm"
                        variant="link"
                        className="h-auto p-0 text-yellow-700 hover:text-yellow-900"
                        onClick={() => navigate(createPageUrl('RiskAssessmentDetail') + `?id=${assessment.id}`)}
                      >
                        Review Risk Assessment →
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(createPageUrl('RiskAssessmentDetail') + `?id=${assessment.id}`)}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeMutation.mutate(assessment.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}