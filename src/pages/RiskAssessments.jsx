import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import LeaderNav from '../components/leader/LeaderNav';
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#7413dc] to-[#ff66b2] text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('LeaderDashboard'))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-4 mb-2">
            <ShieldAlert className="w-12 h-12" />
            <div>
              <h1 className="text-4xl font-bold">Scouts Risk Assessment</h1>
              <p className="text-purple-100 mt-1">Preparing young people with skills for life</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Current Risk Assessments</h3>
                  <p className="text-sm text-gray-600">Access and manage your risk assessments</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl('RiskAssessmentHistory'))}
                  className="border-[#7413dc] text-[#7413dc] hover:bg-[#7413dc] hover:text-white"
                >
                  View Current
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 border-[#7413dc] shadow-xl">
            <CardContent className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-[#7413dc] to-[#ff66b2] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">AI-Powered Risk Assessment</h2>
                  <p className="text-gray-600">Describe your activity and our AI will generate a comprehensive risk assessment following Scouts UK safety standards.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Activity Description
                  </label>
                  <Textarea
                    value={activityDescription}
                    onChange={(e) => setActivityDescription(e.target.value)}
                    placeholder="Describe your activity in detail. For example:&#10;&#10;'Weekend camping trip to Lake District for Cubs (8-10 year olds). Activities include hiking, campfire cooking, orienteering, and wild camping. 25 young people, 6 leaders. September weather expected.'&#10;&#10;Include: activity type, location, age group, number of participants, duration, weather conditions, and any special requirements."
                    className="min-h-[250px] text-base"
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={loading || !activityDescription.trim()}
                  className="w-full bg-gradient-to-r from-[#7413dc] to-[#ff66b2] hover:opacity-90 text-lg py-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Risk Assessment...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Risk Assessment
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

            <Card className="border-2 border-[#004851] shadow-xl">
              <CardContent className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#004851] to-[#00a794] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Manually</h2>
                    <p className="text-gray-600">Create a blank risk assessment form to fill in yourself</p>
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
                  className="w-full bg-[#004851] hover:bg-[#003840] text-lg py-6"
                >
                  Create Blank Assessment
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}