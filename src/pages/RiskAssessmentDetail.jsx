import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import RiskTable from '../components/risk/RiskTable';
import AIEnhancer from '../components/risk/AIEnhancer';
import LeaderNav from '../components/leader/LeaderNav';
import PDFGenerator from '../components/risk/PDFGenerator';

export default function RiskAssessmentDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const assessmentId = urlParams.get('id');

  const [formData, setFormData] = useState({
    activity_name: '',
    assessment_date: '',
    next_review_date: '',
    assessor_name: '',
    activity_description: '',
    risks: []
  });

  const { data: assessment, isLoading } = useQuery({
    queryKey: ['risk-assessment', assessmentId],
    queryFn: async () => {
      const all = await base44.entities.RiskAssessment.list();
      return all.find(a => a.id === assessmentId);
    },
    enabled: !!assessmentId
  });

  useEffect(() => {
    if (assessment) {
      setFormData({
        activity_name: assessment.activity_name || '',
        assessment_date: assessment.assessment_date || '',
        next_review_date: assessment.next_review_date || '',
        assessor_name: assessment.assessor_name || '',
        activity_description: assessment.activity_description || '',
        risks: assessment.risks || []
      });
    }
  }, [assessment]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.RiskAssessment.update(assessmentId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-assessment', assessmentId] });
      toast.success('Assessment saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    }
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleRisksAdded = (newRisks) => {
    const updatedRisks = [...formData.risks, ...newRisks];
    setFormData({ ...formData, risks: updatedRisks });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 mb-4">Assessment not found</p>
            <Button onClick={() => navigate(createPageUrl('RiskAssessmentHistory'))}>
              Back to History
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#7413dc] to-[#ff66b2] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('RiskAssessmentHistory'))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Current
          </Button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Edit Risk Assessment</h1>
            <div className="flex gap-3">
              <PDFGenerator assessment={formData} />
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this risk assessment? This action cannot be undone.')) {
                    base44.entities.RiskAssessment.delete(assessmentId).then(() => {
                      toast.success('Risk assessment deleted');
                      navigate(createPageUrl('RiskAssessmentHistory'));
                    });
                  }
                }}
                className="bg-white text-red-600 border-red-300 hover:bg-red-50"
              >
                Delete
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-white text-[#7413dc] hover:bg-purple-50"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Assessment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Activity Name, Event, and Location</Label>
                  <Input
                    value={formData.activity_name}
                    onChange={(e) => setFormData({ ...formData, activity_name: e.target.value })}
                    placeholder="e.g., Weekend Camping - Lake District"
                    className="mt-1"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Assessment Date</Label>
                    <Input
                      type="date"
                      value={formData.assessment_date}
                      onChange={(e) => setFormData({ ...formData, assessment_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Next Review Date</Label>
                    <Input
                      type="date"
                      value={formData.next_review_date}
                      onChange={(e) => setFormData({ ...formData, next_review_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Assessor Name</Label>
                  <Input
                    value={formData.assessor_name}
                    onChange={(e) => setFormData({ ...formData, assessor_name: e.target.value })}
                    placeholder="Your name"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Risk Table */}
            <RiskTable
              risks={formData.risks}
              onChange={(newRisks) => setFormData({ ...formData, risks: newRisks })}
            />
          </div>

          {/* Sidebar */}
          <div>
            <AIEnhancer assessment={formData} onRisksAdded={handleRisksAdded} />
          </div>
        </div>
      </div>
    </div>
  );
}