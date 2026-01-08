import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Calendar, Users, Award, Eye, EyeOff, Plus, Trash2, ListTodo, Shield, AlertCircle, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import TodoSection from '../components/meeting/TodoSection';
import ParentPortalSection from '../components/meeting/ParentPortalSection';
import RiskAssessmentSection from '../components/meeting/RiskAssessmentSection';
import BadgesSection from '../components/meeting/BadgesSection';
import ProgrammeBadgeCriteriaSection from '../components/meeting/ProgrammeBadgeCriteriaSection';

export default function MeetingDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const sectionId = urlParams.get('section_id');
  const date = urlParams.get('date');
  const termId = urlParams.get('term_id');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    activities: [{ time: '', activity: '', badge_links: [] }],
    equipment_needed: '',
    published: false,
    shown_in_portal: false,
  });

  const { data: section } = useQuery({
    queryKey: ['section', sectionId],
    queryFn: async () => {
      const sections = await base44.entities.Section.filter({ id: sectionId });
      return sections[0];
    },
    enabled: !!sectionId,
  });

  const { data: existingProgramme } = useQuery({
    queryKey: ['programme', sectionId, date],
    queryFn: async () => {
      const programmes = await base44.entities.Programme.filter({ section_id: sectionId, date });
      return programmes[0] || null;
    },
    enabled: !!sectionId && !!date,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['section-members', sectionId],
    queryFn: () => base44.entities.Member.filter({ section_id: sectionId, active: true }),
    enabled: !!sectionId,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', sectionId, date],
    queryFn: () => base44.entities.Attendance.filter({ section_id: sectionId, date }),
    enabled: !!sectionId && !!date,
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges', section],
    queryFn: async () => {
      if (!section) return [];
      return base44.entities.Badge.filter({ section: section.name, active: true });
    },
    enabled: !!section,
  });

  const { data: actionsRequired = [] } = useQuery({
    queryKey: ['actions-required', existingProgramme],
    queryFn: async () => {
      if (!existingProgramme) return [];
      return base44.entities.ActionRequired.filter({ programme_id: existingProgramme.id });
    },
    enabled: !!existingProgramme,
  });

  const { data: actionResponses = [] } = useQuery({
    queryKey: ['action-responses', actionsRequired],
    queryFn: async () => {
      if (actionsRequired.length === 0) return [];
      const allResponses = await base44.entities.ActionResponse.filter({});
      return allResponses.filter(r => actionsRequired.some(a => a.id === r.action_required_id));
    },
    enabled: actionsRequired.length > 0,
  });

  useEffect(() => {
    if (existingProgramme) {
      setFormData({
        title: existingProgramme.title || '',
        description: existingProgramme.description || '',
        activities: existingProgramme.activities?.length > 0 
          ? existingProgramme.activities 
          : [{ time: '', activity: '', badge_links: [] }],
        equipment_needed: existingProgramme.equipment_needed || '',
        published: existingProgramme.published || false,
        shown_in_portal: existingProgramme.shown_in_portal || false,
      });
    }
  }, [existingProgramme]);

  const saveProgrammeMutation = useMutation({
    mutationFn: async (data) => {
      const programmeData = {
        section_id: sectionId,
        date,
        ...data,
      };
      
      if (existingProgramme) {
        return base44.entities.Programme.update(existingProgramme.id, programmeData);
      } else {
        return base44.entities.Programme.create(programmeData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programme'] });
      queryClient.invalidateQueries({ queryKey: ['programmes'] });
      toast.success('Meeting saved successfully');
    },
    onError: (error) => {
      toast.error('Error saving meeting: ' + error.message);
    },
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async ({ memberId, status }) => {
      const existing = attendance.find(a => a.member_id === memberId);
      
      if (existing) {
        await base44.entities.Attendance.update(existing.id, { status });
      } else {
        await base44.entities.Attendance.create({
          member_id: memberId,
          section_id: sectionId,
          date,
          status,
        });
      }
      
      // Auto-award badges if programme exists
      if (existingProgramme?.id) {
        await base44.functions.invoke('awardBadgesFromAttendance', { programmeId: existingProgramme.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance saved and badges awarded');
    },
  });

  const handleSave = () => {
    saveProgrammeMutation.mutate(formData);
  };

  const handleAddActivity = () => {
    setFormData({
      ...formData,
      activities: [...formData.activities, { time: '', activity: '', badge_links: [] }],
    });
  };

  const handleRemoveActivity = (index) => {
    const newActivities = formData.activities.filter((_, i) => i !== index);
    setFormData({ ...formData, activities: newActivities });
  };

  const handleActivityChange = (index, field, value) => {
    const newActivities = [...formData.activities];
    newActivities[index][field] = value;
    setFormData({ ...formData, activities: newActivities });
  };

  const handleAttendanceChange = (memberId, status) => {
    saveAttendanceMutation.mutate({ memberId, status });
  };

  const getAttendanceStatus = (memberId) => {
    const record = attendance.find(a => a.member_id === memberId);
    return record?.status || 'not_marked';
  };

  const getActionResponse = (actionId, memberId) => {
    const response = actionResponses.find(r => r.action_required_id === actionId && r.member_id === memberId);
    return response?.response || null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#004851] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('LeaderProgramme'))}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Programme
          </Button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">
                {new Date(date).toLocaleDateString('en-GB', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h1>
              <p className="mt-1 text-white/80">{section?.display_name}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setFormData({ ...formData, published: !formData.published })}
                className="bg-white/10 text-white border-white hover:bg-white/20"
              >
                {formData.published ? (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Published
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Draft
                  </>
                )}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveProgrammeMutation.isPending}
                className="bg-[#7413dc] hover:bg-[#5c0fb0]"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Meeting
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="plan" className="space-y-6">
          <TabsList className="bg-white border grid grid-cols-6">
            <TabsTrigger value="plan">
              <Calendar className="w-4 h-4 mr-2" />
              Plan Meeting
            </TabsTrigger>
            <TabsTrigger value="todo">
              <ListTodo className="w-4 h-4 mr-2" />
              To Do
            </TabsTrigger>
            <TabsTrigger value="attendance">
              <Users className="w-4 h-4 mr-2" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="parent">
              <Eye className="w-4 h-4 mr-2" />
              Parent Portal
            </TabsTrigger>
            <TabsTrigger value="risk">
              <Shield className="w-4 h-4 mr-2" />
              Risk Assessments
            </TabsTrigger>
            <TabsTrigger value="badges">
              <Award className="w-4 h-4 mr-2" />
              Badges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todo" className="space-y-6">
            <TodoSection programmeId={existingProgramme?.id} />
          </TabsContent>

          <TabsContent value="plan" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Meeting Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Meeting Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Fire Safety & Cooking"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Overview of the meeting activities"
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Activities</CardTitle>
                  <Button onClick={handleAddActivity} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Activity
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.activities.map((activity, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <Label>Activity {index + 1}</Label>
                      {formData.activities.length > 1 && (
                        <Button
                          onClick={() => handleRemoveActivity(index)}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Time</Label>
                        <Input
                          value={activity.time}
                          onChange={(e) => handleActivityChange(index, 'time', e.target.value)}
                          placeholder="e.g., 6:15pm"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label>Activity</Label>
                        <Input
                          value={activity.activity}
                          onChange={(e) => handleActivityChange(index, 'activity', e.target.value)}
                          placeholder="e.g., Fire safety talk"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Equipment Needed</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.equipment_needed}
                  onChange={(e) => setFormData({ ...formData, equipment_needed: e.target.value })}
                  placeholder="List any equipment needed for this meeting"
                  className="min-h-[100px]"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parent" className="space-y-6">
            <ParentPortalSection 
              programmeId={existingProgramme?.id}
              formData={formData}
              setFormData={setFormData}
            />
          </TabsContent>

          <TabsContent value="risk" className="space-y-6">
            <RiskAssessmentSection programmeId={existingProgramme?.id} />
          </TabsContent>

          <TabsContent value="badges" className="space-y-6">
            <ProgrammeBadgeCriteriaSection programmeId={existingProgramme?.id} />
            <BadgesSection programmeId={existingProgramme?.id} />
          </TabsContent>

          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>Mark Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Member</th>
                        <th className="text-left p-3 font-semibold">Attendance</th>
                        {actionsRequired.map(action => (
                          <th key={action.id} className="text-left p-3 font-semibold whitespace-nowrap">
                            {action.column_title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {members.map(member => {
                        const status = getAttendanceStatus(member.id);
                        return (
                          <tr key={member.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#7413dc] rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                                  {member.full_name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium">{member.full_name}</p>
                                  {member.patrol && (
                                    <p className="text-sm text-gray-500">{member.patrol}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant={status === 'present' ? 'default' : 'outline'}
                                  onClick={() => handleAttendanceChange(member.id, 'present')}
                                  className={status === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                                >
                                  Present
                                </Button>
                                <Button
                                  size="sm"
                                  variant={status === 'absent' ? 'default' : 'outline'}
                                  onClick={() => handleAttendanceChange(member.id, 'absent')}
                                  className={status === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                                >
                                  Absent
                                </Button>
                                <Button
                                  size="sm"
                                  variant={status === 'apologies' ? 'default' : 'outline'}
                                  onClick={() => handleAttendanceChange(member.id, 'apologies')}
                                  className={status === 'apologies' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                                >
                                  Apologies
                                </Button>
                              </div>
                            </td>
                            {actionsRequired.map(action => {
                              const response = getActionResponse(action.id, member.id);
                              return (
                                <td key={action.id} className="p-3">
                                  {response ? (
                                    <span className="text-sm text-gray-700">{response}</span>
                                  ) : (
                                    <span className="text-sm text-red-600">Awaiting...</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}