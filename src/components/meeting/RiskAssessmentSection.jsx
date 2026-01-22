import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import RiskAssessmentSelector from '../risk/RiskAssessmentSelector';
import RiskAssessmentList from '../risk/RiskAssessmentList';

export default function RiskAssessmentSection({ programmeId, entityType = 'programme' }) {
  const eventId = entityType === 'event' ? programmeId : null;
  const actualProgrammeId = entityType === 'programme' ? programmeId : null;

  return (
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
            <RiskAssessmentSelector 
              programmeId={actualProgrammeId}
              eventId={eventId}
            />
            <RiskAssessmentList 
              programmeId={actualProgrammeId}
              eventId={eventId}
            />
          </>
        ) : (
          <p className="text-sm text-gray-500">Save the {entityType} first to add risk assessments.</p>
        )}
      </CardContent>
    </Card>
  );
}