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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Save, Calendar, Users, Award, Eye, EyeOff, Plus, Trash2,
  ListTodo, Shield, AlertCircle, Image, ArrowLeftRight, Zap, FileText,
  Menu, X, FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';
import TodoSection from '../components/meeting/TodoSection';
import ParentPortalSection from '../components/meeting/ParentPortalSection';
import SafetySection from '../components/meeting/SafetySection';
import DocumentStorageSection from '../components/meeting/DocumentStorageSection';
import BadgesSection from '../components/meeting/BadgesSection';
import ProgrammeBadgeCriteriaSection from '../components/meeting/ProgrammeBadgeCriteriaSection';
import LeaderRotaSection from '../components/meeting/LeaderRotaSection';
import LeaderNav from '../components/leader/LeaderNav';
import IScoutSection from '../components/meeting/IScoutSection';

export default function MeetingDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const sectionId = urlParams.get('section_id');
  const date = urlParams.get('date');
  const termId = urlParams.get('term_id');

  const [activeSection, setActiveSection] = useState(() => {
    return new URLSearchParams(window.location.search).get('tab') || 'plan';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [swapTargetDate, setSwapTargetDate] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    activities: [{ time: '', activity: '', badge_links: [] }],
    equipment_needed: '',
    published: false,
    shown_in_portal: false,
    optional_location: '',
    optional_start_time: '',
    optional_end_time: '',
  });

  const handleSectionChange = (section) => {
    setActiveSection(section);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', section);
    window.history.replaceState(null, '', '?' + params.toString());
    setSidebarOpen(false);
  };

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

  const { data: allMembers = [] } = useQuery({
    queryKey: ['section-members', sectionId],
    queryFn: () => base44.entities.Member.filter({ section_id: sectionId, active: true }),
    enabled: !!sectionId,
  });

  const members = allMembers.sort((a, b) => new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime());

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', sectionId, date],
    queryFn: () => base44.entities.Attendance.filter({ section_id: sectionId, date }),
    enabled: !!sectionId && !!date,
  });

  const { data: termMeetingDates = [] } = useQuery({
    queryKey: ['term-meeting-dates', termId],
    queryFn: async () => {
      if (!termId) return [];
      const terms = await base44.entities.Term.filter({ id: termId });
      const term = terms[0];
      if (!term) return [];
      const dayOfWeekMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
      const targetDay = dayOfWeekMap[term.meeting_day];
      const start = new Date(term.start_date);
      const end = new Date(term.end_date);
      const halfTermStart = new Date(term.half_term_start);
      const halfTermEnd = new Date(term.half_term_end);
      const dates = [];
      let current = new Date(start);
      while (current.getDay() !== targetDay) current.setDate(current.getDate() + 1);
      while (current <= end) {
        const isHalfTerm = current >= halfTermStart && current <= halfTermEnd;
        if (!isHalfTerm) dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 7);
      }
      return dates;
    },
    enabled: !!termId,
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
        optional_location: existingProgramme.optional_location || '',
        optional_start_time: existingProgramme.optional_start_time || '',
        optional_end_time: existingProgramme.optional_end_time || '',
      });
    }
  }, [existingProgramme]);

  const saveProgrammeMutation = useMutation({
    mutationFn: async (data) => {
      const programmeData = { section_id: sectionId, date, ...data };
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
    onError: (error) => toast.error('Error saving meeting: ' + error.message),
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async ({ memberId, status }) => {
      const existing = attendance.find(a => a.member_id === memberId);
      if (existing) {
        await base44.entities.Attendance.update(existing.id, { status });
      } else {
        await base44.entities.Attendance.create({ member_id: memberId, section_id: sectionId, date, status });
      }
      if (existingProgramme?.id) {
        await base44.functions.invoke('awardBadgesFromAttendance', { programmeId: existingProgramme.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance saved and badges awarded');
    },
  });

  const swapMutation = useMutation({
    mutationFn: async (targetDate) => {
      const [thisProgs, targetProgs] = await Promise.all([
        base44.entities.Programme.filter({ section_id: sectionId, date }),
        base44.entities.Programme.filter({ section_id: sectionId, date: targetDate }),
      ]);
      const thisProg = thisProgs[0];
      const targetProg = targetProgs[0];
      if (thisProg && targetProg) {
        await Promise.all([
          base44.entities.Programme.update(thisProg.id, { date: targetDate }),
          base44.entities.Programme.update(targetProg.id, { date }),
        ]);
      } else if (thisProg && !targetProg) {
        await base44.entities.Programme.update(thisProg.id, { date: targetDate });
      } else if (!thisProg && targetProg) {
        await base44.entities.Programme.update(targetProg.id, { date });
      }
      const [thisAtt, targetAtt] = await Promise.all([
        base44.entities.Attendance.filter({ section_id: sectionId, date }),
        base44.entities.Attendance.filter({ section_id: sectionId, date: targetDate }),
      ]);
      await Promise.all([
        ...thisAtt.map(a => base44.entities.Attendance.update(a.id, { date: targetDate })),
        ...targetAtt.map(a => base44.entities.Attendance.update(a.id, { date })),
      ]);
    },
    onSuccess: (_, targetDate) => {
      queryClient.invalidateQueries({ queryKey: ['programme'] });
      queryClient.invalidateQueries({ queryKey: ['programmes'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Meetings swapped successfully');
      setSwapDialogOpen(false);
      navigate(createPageUrl('MeetingDetail') + `?section_id=${sectionId}&date=${targetDate}&term_id=${termId}`);
    },
    onError: () => toast.error('Failed to swap meetings'),
  });

  const handleSave = () => saveProgrammeMutation.mutate(formData);

  const handleAddActivity = () => {
    setFormData({ ...formData, activities: [...formData.activities, { time: '', activity: '', badge_links: [] }] });
  };

  const handleRemoveActivity = (index) => {
    setFormData({ ...formData, activities: formData.activities.filter((_, i) => i !== index) });
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

  const isPastMeeting = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const meetingDate = new Date(date);
    meetingDate.setHours(23, 59, 59, 999);
    return meetingDate < today;
  };

  const navigationItems = [
    { id: 'plan', label: 'Meeting Plan', icon: Calendar },
    { id: 'todo', label: 'To-Do List', icon: ListTodo },
    { id: 'attendance', label: 'Attendance', icon: Users },
    { id: 'parent', label: 'Parent Portal', icon: Eye },
    { id: 'safety', label: 'Safety', icon: Shield },
    { id: 'badges', label: 'Badges', icon: Award },
    { id: 'documents', label: 'Documents', icon: FolderOpen },
    { id: 'iscout', label: 'iScout', icon: Zap },
  ];

  const getSectionTitle = () => navigationItems.find(i => i.id === activeSection)?.label || 'Meeting Plan';

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />

      {/* Header */}
      <div className="bg-gradient-to-br from-[#004851] to-[#006b7a] text-white py-6 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-3 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center font-semibold">{getSectionTitle()}</div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold">
                {new Date(date).toLocaleDateString('en-GB', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </h1>
              <p className="text-white/80 mt-1">{section?.display_name}</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {isPastMeeting() && (
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl('Gallery') + `?view=meeting&id=${existingProgramme?.id}`)}
                  className="bg-white/10 text-white border-white/30 hover:bg-white/20 min-h-[44px]"
                >
                  <Image className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Gallery</span>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setFormData({ ...formData, published: !formData.published })}
                className="bg-white/10 text-white border-white/30 hover:bg-white/20 min-h-[44px]"
              >
                {formData.published ? (
                  <><Eye className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Published</span></>
                ) : (
                  <><EyeOff className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Draft</span></>
                )}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveProgrammeMutation.isPending}
                className={`${isPastMeeting() ? 'bg-gray-400 hover:bg-gray-500' : 'bg-green-600 hover:bg-green-700'} text-white min-h-[44px]`}
              >
                <Save className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Save{isPastMeeting() ? ' (Not Recommended)' : ''}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="bg-white w-64 h-full shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold text-lg">Navigation</h2>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="p-4 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSectionChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all min-h-[44px] ${
                      activeSection === item.id
                        ? 'bg-[#004851] text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky top-28">
              <nav className="space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSectionChange(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        activeSection === item.id
                          ? 'bg-[#004851] text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">

            {/* ── Meeting Plan ── */}
            {activeSection === 'plan' && (
              <div className="space-y-6">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSwapTargetDate(''); setSwapDialogOpen(true); }}
                    className="flex items-center gap-2 min-h-[44px]"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    Rearrange
                  </Button>
                </div>

                <Card className="shadow-sm border-gray-200">
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle className="text-xl">Meeting Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Meeting Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., Fire Safety & Cooking"
                        className="min-h-[44px]"
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

                <Card className="shadow-sm border-gray-200">
                  <CardHeader className="border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <CardTitle className="text-xl">Activities</CardTitle>
                      <Button onClick={handleAddActivity} size="sm" variant="outline" className="w-full sm:w-auto min-h-[44px]">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Activity
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    {formData.activities.map((activity, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3 bg-white hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-medium">Activity {index + 1}</Label>
                          {formData.activities.length > 1 && (
                            <Button
                              onClick={() => handleRemoveActivity(index)}
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[44px]"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label className="text-sm">Time</Label>
                            <Input
                              value={activity.time}
                              onChange={(e) => handleActivityChange(index, 'time', e.target.value)}
                              placeholder="e.g., 6:15pm"
                              className="min-h-[44px]"
                            />
                          </div>
                          <div className="sm:col-span-2 space-y-2">
                            <Label className="text-sm">Activity</Label>
                            <Input
                              value={activity.activity}
                              onChange={(e) => handleActivityChange(index, 'activity', e.target.value)}
                              placeholder="e.g., Fire safety talk"
                              className="min-h-[44px]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-gray-200">
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle className="text-xl">Equipment Needed</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <Textarea
                      value={formData.equipment_needed}
                      onChange={(e) => setFormData({ ...formData, equipment_needed: e.target.value })}
                      placeholder="List any equipment needed for this meeting"
                      className="min-h-[100px]"
                    />
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-orange-200 bg-orange-50">
                  <CardHeader className="border-b border-orange-100">
                    <CardTitle className="text-orange-800 flex items-center gap-2 text-xl">
                      <AlertCircle className="w-5 h-5" />
                      Optional: Unusual Changes Only
                    </CardTitle>
                    <p className="text-sm text-orange-600 mt-1">Only fill these in if something is <strong>different from normal</strong> this week. If set, they will appear in red on the parent app.</p>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <div className="space-y-2">
                      <Label htmlFor="optional_location">Different Location</Label>
                      <Input
                        id="optional_location"
                        value={formData.optional_location}
                        onChange={(e) => setFormData({ ...formData, optional_location: e.target.value })}
                        placeholder="e.g. St John's Church Hall (leave blank if usual venue)"
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="optional_start_time">Different Start Time</Label>
                        <Input
                          id="optional_start_time"
                          value={formData.optional_start_time}
                          onChange={(e) => setFormData({ ...formData, optional_start_time: e.target.value })}
                          placeholder="e.g. 18:00"
                          className="min-h-[44px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="optional_end_time">Different End Time</Label>
                        <Input
                          id="optional_end_time"
                          value={formData.optional_end_time}
                          onChange={(e) => setFormData({ ...formData, optional_end_time: e.target.value })}
                          placeholder="e.g. 20:00"
                          className="min-h-[44px]"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── To-Do ── */}
            {activeSection === 'todo' && (
              <TodoSection programmeId={existingProgramme?.id} />
            )}

            {/* ── Attendance ── */}
            {activeSection === 'attendance' && (
              <div className="space-y-6">
                <LeaderRotaSection programmeId={existingProgramme?.id} sectionId={sectionId} />

                <Card className="shadow-sm border-gray-200">
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle className="text-xl">Mark Attendance</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                      {members.map(member => {
                        const status = getAttendanceStatus(member.id);
                        return (
                          <div key={member.id} className="p-4 border rounded-lg space-y-3 bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#004851] rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                                {member.full_name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{member.full_name}</p>
                                {member.patrol && <p className="text-sm text-gray-500">{member.patrol}</p>}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant={status === 'present' ? 'default' : 'outline'} onClick={() => handleAttendanceChange(member.id, 'present')} className={`flex-1 min-h-[44px] ${status === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}`}>Present</Button>
                              <Button size="sm" variant={status === 'absent' ? 'default' : 'outline'} onClick={() => handleAttendanceChange(member.id, 'absent')} className={`flex-1 min-h-[44px] ${status === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}`}>Absent</Button>
                              <Button size="sm" variant={status === 'apologies' ? 'default' : 'outline'} onClick={() => handleAttendanceChange(member.id, 'apologies')} className={`flex-1 min-h-[44px] ${status === 'apologies' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}>Apologies</Button>
                            </div>
                            {actionsRequired.length > 0 && (
                              <div className="space-y-1.5 pt-2 border-t">
                                {actionsRequired.map(action => {
                                  const response = getActionResponse(action.id, member.id);
                                  return (
                                    <div key={action.id} className="flex justify-between items-center text-sm">
                                      <span className="text-gray-600">{action.column_title}:</span>
                                      {response ? <span className="font-medium text-gray-700">{response}</span> : <span className="text-red-500">Awaiting...</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-semibold">Member</th>
                            <th className="text-left p-3 font-semibold">Attendance</th>
                            {actionsRequired.map(action => (
                              <th key={action.id} className="text-left p-3 font-semibold whitespace-nowrap">{action.column_title}</th>
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
                                    <div className="w-10 h-10 bg-[#004851] rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                                      {member.full_name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-medium">{member.full_name}</p>
                                      {member.patrol && <p className="text-sm text-gray-500">{member.patrol}</p>}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <div className="flex gap-2">
                                    <Button size="sm" variant={status === 'present' ? 'default' : 'outline'} onClick={() => handleAttendanceChange(member.id, 'present')} className={status === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}>Present</Button>
                                    <Button size="sm" variant={status === 'absent' ? 'default' : 'outline'} onClick={() => handleAttendanceChange(member.id, 'absent')} className={status === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}>Absent</Button>
                                    <Button size="sm" variant={status === 'apologies' ? 'default' : 'outline'} onClick={() => handleAttendanceChange(member.id, 'apologies')} className={status === 'apologies' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}>Apologies</Button>
                                  </div>
                                </td>
                                {actionsRequired.map(action => {
                                  const response = getActionResponse(action.id, member.id);
                                  return (
                                    <td key={action.id} className="p-3">
                                      {response ? <span className="text-sm text-gray-700">{response}</span> : <span className="text-sm text-red-500">Awaiting...</span>}
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
              </div>
            )}

            {/* ── Parent Portal ── */}
            {activeSection === 'parent' && (
              <ParentPortalSection
                programmeId={existingProgramme?.id}
                formData={formData}
                setFormData={setFormData}
              />
            )}

            {/* ── Safety ── */}
            {activeSection === 'safety' && (
              <SafetySection programmeId={existingProgramme?.id} entityType="programme" />
            )}

            {/* ── Badges ── */}
            {activeSection === 'badges' && (
              <ProgrammeBadgeCriteriaSection programmeId={existingProgramme?.id} />
            )}

            {/* ── Documents ── */}
            {activeSection === 'documents' && (
              <DocumentStorageSection programmeId={existingProgramme?.id} entityType="programme" />
            )}

            {/* ── iScout ── */}
            {activeSection === 'iscout' && (
              <IScoutSection programmeId={existingProgramme?.id} />
            )}
          </main>
        </div>
      </div>

      {/* Swap Dialog */}
      <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5" />
              Rearrange Meeting
            </DialogTitle>
            <DialogDescription>
              Select another meeting in this term to swap dates with. The plan and attendance records will be swapped.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={swapTargetDate} onValueChange={setSwapTargetDate}>
              <SelectTrigger>
                <SelectValue placeholder="Select a meeting to swap with..." />
              </SelectTrigger>
              <SelectContent>
                {termMeetingDates.filter(d => d !== date).map(d => (
                  <SelectItem key={d} value={d}>
                    {new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSwapDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-[#004851] hover:bg-[#003840] text-white"
              disabled={!swapTargetDate || swapMutation.isPending}
              onClick={() => swapMutation.mutate(swapTargetDate)}
            >
              {swapMutation.isPending ? 'Swapping...' : 'Swap Meetings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}