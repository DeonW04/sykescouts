import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { format, isPast, parseISO } from 'date-fns';

export default function RiskAssessmentSelector({ programmeId, eventId, onAdded }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);

  const { data: allAssessments = [] } = useQuery({
    queryKey: ['risk-assessments-all'],
    queryFn: () => base44.entities.RiskAssessment.list('-updated_date'),
  });

  const { data: currentEntity } = useQuery({
    queryKey: ['entity-for-risk', programmeId, eventId],
    queryFn: async () => {
      if (programmeId) {
        return base44.entities.Programme.filter({ id: programmeId }).then(r => r[0]);
      } else if (eventId) {
        return base44.entities.Event.filter({ id: eventId }).then(r => r[0]);
      }
      return null;
    },
    enabled: !!(programmeId || eventId),
  });

  const addMutation = useMutation({
    mutationFn: async (assessmentId) => {
      const currentIds = currentEntity?.risk_assessment_ids || [];
      if (currentIds.includes(assessmentId)) {
        throw new Error('Already linked');
      }
      
      const updateData = {
        risk_assessment_ids: [...currentIds, assessmentId]
      };
      
      if (programmeId) {
        return base44.entities.Programme.update(programmeId, updateData);
      } else {
        return base44.entities.Event.update(eventId, updateData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['entity-for-risk'] });
      setSearchTerm('');
      setShowResults(false);
      toast.success('Risk assessment linked');
      if (onAdded) onAdded();
    },
  });

  const isOverdue = (assessment) => {
    if (!assessment.next_review_date) return false;
    return isPast(parseISO(assessment.next_review_date));
  };

  const linkedIds = currentEntity?.risk_assessment_ids || [];
  
  const filteredAssessments = allAssessments
    .filter(a => !linkedIds.includes(a.id))
    .filter(a => 
      searchTerm.length === 0 || 
      a.activity_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice(0, 5);

  const handleSelect = (assessment) => {
    if (isOverdue(assessment)) {
      const confirmAdd = window.confirm(
        `⚠️ Risk Assessment Renewal Overdue\n\nThis assessment was due for review on ${format(parseISO(assessment.next_review_date), 'dd/MM/yyyy')}.\n\nDo you want to add it anyway?`
      );
      if (!confirmAdd) return;
    }
    addMutation.mutate(assessment.id);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Search risk assessments..."
          className="pl-10"
        />
      </div>

      {showResults && searchTerm.length > 0 && (
        <Card className="absolute z-10 w-full mt-1 max-h-80 overflow-y-auto">
          <CardContent className="p-2">
            {filteredAssessments.length === 0 ? (
              <p className="text-sm text-gray-500 p-3 text-center">No assessments found</p>
            ) : (
              <div className="space-y-1">
                {filteredAssessments.map(assessment => {
                  const overdue = isOverdue(assessment);
                  return (
                    <button
                      key={assessment.id}
                      onClick={() => handleSelect(assessment)}
                      className={`w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                        overdue ? 'border-2 border-yellow-400 bg-yellow-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{assessment.activity_name}</p>
                          {assessment.assessor_name && (
                            <p className="text-xs text-gray-500">By {assessment.assessor_name}</p>
                          )}
                          {overdue && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3 h-3 text-yellow-600" />
                              <p className="text-xs text-yellow-700 font-medium">
                                Review overdue: {format(parseISO(assessment.next_review_date), 'dd/MM/yyyy')}
                              </p>
                            </div>
                          )}
                        </div>
                        <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}