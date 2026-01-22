import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert, ArrowLeft, Plus, Calendar, User, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, isPast, parseISO } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function RiskAssessmentHistory() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['risk-assessments'],
    queryFn: async () => {
      const all = await base44.entities.RiskAssessment.list('-updated_date');
      return all;
    }
  });

  const isOverdue = (assessment) => {
    if (!assessment.next_review_date) return false;
    return isPast(parseISO(assessment.next_review_date));
  };

  const filteredAssessments = assessments.filter(assessment => {
    if (filter === 'overdue') return isOverdue(assessment);
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading assessments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#7413dc] to-[#ff66b2] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('RiskAssessments'))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ShieldAlert className="w-12 h-12" />
              <div>
                <h1 className="text-4xl font-bold">Current Risk Assessments</h1>
                <p className="text-purple-100 mt-1">{assessments.length} assessment(s) on file</p>
              </div>
            </div>
            <Button
              onClick={() => navigate(createPageUrl('RiskAssessments'))}
              className="bg-white text-[#7413dc] hover:bg-purple-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Assessment
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {assessments.length > 0 && (
          <div className="mb-6">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">
                  All Assessments ({assessments.length})
                </TabsTrigger>
                <TabsTrigger value="overdue" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Overdue ({assessments.filter(isOverdue).length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {filteredAssessments.length === 0 && filter === 'overdue' ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ShieldAlert className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">All Up to Date!</h3>
              <p className="text-gray-600">No overdue risk assessments</p>
            </CardContent>
          </Card>
        ) : assessments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ShieldAlert className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Risk Assessments Yet</h3>
              <p className="text-gray-600 mb-6">Create your first risk assessment to get started</p>
              <Button
                onClick={() => navigate(createPageUrl('RiskAssessments'))}
                className="bg-gradient-to-r from-[#7413dc] to-[#ff66b2] hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Assessment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssessments.map((assessment, index) => {
              const overdue = isOverdue(assessment);
              return (
              <motion.div
                key={assessment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-l-4 ${
                    overdue ? 'border-l-yellow-500 bg-yellow-50' : 'border-l-[#7413dc]'
                  }`}
                  onClick={() => navigate(createPageUrl('RiskAssessmentDetail') + `?id=${assessment.id}`)}
                >
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">
                      {assessment.activity_name}
                    </h3>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {assessment.assessment_date ? format(new Date(assessment.assessment_date), 'dd MMM yyyy') : 'Not set'}
                        </span>
                      </div>
                      
                      {assessment.next_review_date && (
                        <div className={`flex items-center gap-2 ${overdue ? 'text-yellow-700 font-semibold' : 'text-gray-600'}`}>
                          <AlertCircle className={`w-4 h-4 ${overdue ? 'text-yellow-600' : ''}`} />
                          <span>{overdue ? 'Overdue: ' : 'Review: '}{format(parseISO(assessment.next_review_date), 'dd MMM yyyy')}</span>
                        </div>
                      )}
                      
                      {assessment.assessor_name && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="w-4 h-4" />
                          <span>{assessment.assessor_name}</span>
                        </div>
                      )}
                      
                      <div className="pt-2 mt-2 border-t">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#7413dc] text-white">
                          {assessment.risks?.length || 0} Risk(s) Identified
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}