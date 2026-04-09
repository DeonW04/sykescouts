import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, FileText, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import RiskAssessmentSelector from '../risk/RiskAssessmentSelector';
import RiskAssessmentList from '../risk/RiskAssessmentList';
import ConsentSubmissionsSection from './ConsentSubmissionsSection';

export default function SafetySection({ programmeId, entityType = 'programme' }) {
  const queryClient = useQueryClient();
  const [showFormPicker, setShowFormPicker] = useState(false);

  const eventId = entityType === 'event' ? programmeId : null;
  const actualProgrammeId = entityType === 'programme' ? programmeId : null;

  // Fetch the entity to get current consent_form_ids
  const { data: entity } = useQuery({
    queryKey: ['safety-entity', entityType, programmeId],
    queryFn: async () => {
      if (!programmeId) return null;
      if (entityType === 'event') {
        const res = await base44.entities.Event.filter({ id: programmeId });
        return res[0] || null;
      } else {
        const res = await base44.entities.Programme.filter({ id: programmeId });
        return res[0] || null;
      }
    },
    enabled: !!programmeId,
  });

  const linkedFormIds = entity?.consent_form_ids || [];

  const { data: allForms = [] } = useQuery({
    queryKey: ['consent-forms-active'],
    queryFn: () => base44.entities.ConsentForm.filter({ active: true }),
    enabled: showFormPicker || linkedFormIds.length > 0,
  });

  const linkedForms = allForms.filter(f => linkedFormIds.includes(f.id));
  const availableForms = allForms.filter(f => !linkedFormIds.includes(f.id));

  const updateEntityMutation = useMutation({
    mutationFn: async (newIds) => {
      if (entityType === 'event') {
        return base44.entities.Event.update(programmeId, { consent_form_ids: newIds });
      } else {
        return base44.entities.Programme.update(programmeId, { consent_form_ids: newIds });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-entity'] });
    },
  });

  const linkForm = (formId) => {
    updateEntityMutation.mutate([...linkedFormIds, formId]);
    setShowFormPicker(false);
  };

  const unlinkForm = (formId) => {
    updateEntityMutation.mutate(linkedFormIds.filter(id => id !== formId));
  };

  return (
    <div className="space-y-6">
      {/* Risk Assessments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            Risk Assessments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {programmeId ? (
            <>
              <RiskAssessmentSelector programmeId={actualProgrammeId} eventId={eventId} />
              <RiskAssessmentList programmeId={actualProgrammeId} eventId={eventId} />
            </>
          ) : (
            <p className="text-sm text-gray-500">Save the {entityType} first to add risk assessments.</p>
          )}
        </CardContent>
      </Card>

      {/* Consent Forms */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Linked Consent Forms
            </CardTitle>
            {programmeId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowFormPicker(!showFormPicker)}
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Link Form
                {showFormPicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!programmeId ? (
            <p className="text-sm text-gray-500">Save the {entityType} first to link consent forms.</p>
          ) : (
            <>
              {showFormPicker && (
                <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50 space-y-2">
                  {availableForms.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">No more forms to link. Create consent forms in Safety → Consent Forms.</p>
                  ) : (
                    availableForms.map(form => (
                      <button
                        key={form.id}
                        onClick={() => linkForm(form.id)}
                        className="w-full text-left flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-teal-400 hover:shadow-sm transition-all"
                      >
                        <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-teal-700" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{form.title}</p>
                          {form.description && <p className="text-xs text-gray-500">{form.description}</p>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {linkedForms.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No consent forms linked. Click "Link Form" to add one.</p>
              ) : (
                <div className="space-y-2">
                  {linkedForms.map(form => (
                    <div key={form.id} className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                      <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-teal-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900">{form.title}</p>
                        {form.description && <p className="text-xs text-gray-500 truncate">{form.description}</p>}
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => unlinkForm(form.id)}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 p-0 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Consent Form Submissions */}
      {linkedForms.length > 0 && programmeId && (
        <>
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Form Submissions</h3>
          <ConsentSubmissionsSection
            programmeId={programmeId}
            entityType={entityType}
            linkedForms={linkedForms}
            entityData={entity}
          />
        </>
      )}
    </div>
  );
}