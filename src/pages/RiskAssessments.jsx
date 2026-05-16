import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, Sparkles, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';

export default function RiskAssessments() {
  const navigate = useNavigate();
  const [activityDescription, setActivityDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!activityDescription.trim()) {
      toast.error('Please describe your activity');
      return;
    }

    setLoading(true);
    try {
      const systemPrompt = `You are a Scouts UK risk assessment expert. Generate a comprehensive risk assessment for the following activity:

${activityDescription}

Create 4-8 specific risks relevant to this Scouts activity. For each risk provide:
- hazard: Clear description of what could go wrong and the specific hazards/risks
- who_at_risk: Specific groups (Young people aged X-Y, Leaders, Visitors, etc.)
- controls: Detailed control measures, existing controls, extra controls needed, and how they will be communicated to ensure inclusivity
- review_notes: Leave empty (will be filled during review)

Focus on practical, specific risks following Scouts UK safety standards. Consider:
- Age-appropriate risks for the section
- Weather and environmental conditions
- Activity-specific hazards
- Supervision requirements
- Emergency procedures
- Equipment safety
- Inclusivity and accessibility`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: systemPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            activity_name: { type: "string" },
            risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  hazard: { type: "string" },
                  who_at_risk: { type: "string" },
                  controls: { type: "string" },
                  review_notes: { type: "string" }
                }
              }
            }
          }
        }
      });

      const today = new Date();
      const reviewDate = addMonths(today, 6);

      const assessment = await base44.entities.RiskAssessment.create({
        activity_name: response.activity_name || 'Risk Assessment',
        activity_description: activityDescription,
        assessment_date: format(today, 'yyyy-MM-dd'),
        next_review_date: format(reviewDate, 'yyyy-MM-dd'),
        risks: response.risks || []
      });

      toast.success('Risk assessment generated successfully');
      navigate(createPageUrl('RiskAssessmentDetail') + `?id=${assessment.id}`);
    } catch (error) {
      toast.error('Failed to generate assessment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 24px' }}>
        <div className="max-w-4xl mx-auto">
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Leader Portal</p>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 32px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.2 }}>Risk Assessments</h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>Prepare and manage risk assessments for activities</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-5">
          {/* View existing */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">Current Risk Assessments</h3>
              <p className="text-sm text-gray-500 mt-0.5">Access and manage your existing risk assessments</p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('RiskAssessmentHistory'))}
              className="border-[#7413dc] text-[#7413dc] hover:bg-[#7413dc] hover:text-white w-full sm:w-auto"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* AI Generator */}
            <div className="bg-white rounded-2xl border-2 border-[#7413dc] shadow-sm p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-11 h-11 bg-gradient-to-br from-[#7413dc] to-[#ff66b2] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">AI-Powered Generator</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Describe your activity and AI will generate a comprehensive assessment following Scouts UK standards.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Activity Description</label>
                  <Textarea
                    value={activityDescription}
                    onChange={(e) => setActivityDescription(e.target.value)}
                    placeholder="Describe your activity in detail. Include: activity type, location, age group, number of participants, duration, and any special requirements."
                    className="min-h-[200px] text-sm bg-gray-50 border-gray-200"
                  />
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={loading || !activityDescription.trim()}
                  className="w-full bg-[#7413dc] hover:bg-[#5c0fb0] py-5"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />Generate Risk Assessment</>
                  )}
                </Button>
              </div>
            </div>

            {/* Manual */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Create Manually</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Create a blank risk assessment form to fill in yourself</p>
                </div>
              </div>
              <Button
                onClick={async () => {
                  const today = new Date();
                  const reviewDate = addMonths(today, 6);
                  const assessment = await base44.entities.RiskAssessment.create({
                    activity_name: 'New Risk Assessment',
                    assessment_date: format(today, 'yyyy-MM-dd'),
                    next_review_date: format(reviewDate, 'yyyy-MM-dd'),
                    risks: []
                  });
                  navigate(createPageUrl('RiskAssessmentDetail') + `?id=${assessment.id}`);
                }}
                variant="outline"
                className="w-full border-gray-300 py-5"
              >
                Create Blank Assessment
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}