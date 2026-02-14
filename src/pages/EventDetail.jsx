import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, Trash2, Save, Eye, Plus, Calendar, Users, Award, ListTodo, Shield, Menu, X, DollarSign, TrendingUp, TrendingDown, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import NewEventDialog from '../components/events/NewEventDialog';
import TodoSection from '../components/meeting/TodoSection';
import EventParentPortalSection from '../components/events/EventParentPortalSection';
import EventAttendeesSection from '../components/events/EventAttendeesSection';
import RiskAssessmentSection from '../components/meeting/RiskAssessmentSection';
import ProgrammeBadgeCriteriaSection from '../components/meeting/ProgrammeBadgeCriteriaSection';
import LeaderNav from '../components/leader/LeaderNav';

export default function EventDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [activePlanningTab, setActivePlanningTab] = useState('schedule');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFinancialDialog, setShowFinancialDialog] = useState(false);
  const [financialType, setFinancialType] = useState('expense');
  const [financialForm, setFinancialForm] = useState({ description: '', amount: '', date: '' });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    schedule_by_day: [
      { 
        day_name: 'Day 1', 
        items: [{ time: '', activity: '', notes: '' }] 
      }
    ],
    equipment_list: '',
    instructions: '',
    nights_away_count: 0,
    expenses: [],
    income: [],
  });

  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => base44.entities.Event.filter({ id: eventId }).then(res => res[0]),
    enabled: !!eventId,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  useEffect(() => {
    if (event) {
      // Auto-calculate nights away based on date range
      const calculateNights = () => {
        if (event.start_date && event.end_date && event.end_date !== event.start_date) {
          const start = new Date(event.start_date);
          const end = new Date(event.end_date);
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays;
        }
        return 0;
      };

      setFormData({
        schedule_by_day: event.schedule_by_day?.length > 0 
          ? event.schedule_by_day 
          : [{ day_name: 'Day 1', items: [{ time: '', activity: '', notes: '' }] }],
        equipment_list: event.equipment_list || '',
        instructions: event.instructions || '',
        nights_away_count: event.nights_away_count !== undefined ? event.nights_away_count : calculateNights(),
        expenses: event.expenses || [],
        income: event.income || [],
      });
    }
  }, [event]);

  const documents = event?.documents || [];

  const updateEventMutation = useMutation({
    mutationFn: (data) => base44.entities.Event.update(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event'] });
      toast.success('Event updated');
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: () => base44.entities.Event.delete(eventId),
    onSuccess: () => {
      toast.success('Event deleted');
      navigate(createPageUrl('LeaderEvents'));
    },
    onError: () => {
      toast.error('Failed to delete event');
    },
  });

  const handleSave = () => {
    updateEventMutation.mutate(formData);
  };

  const handleAddDay = () => {
    setFormData({
      ...formData,
      schedule_by_day: [
        ...formData.schedule_by_day,
        { day_name: `Day ${formData.schedule_by_day.length + 1}`, items: [{ time: '', activity: '', notes: '' }] }
      ],
    });
  };

  const handleRemoveDay = (dayIndex) => {
    const newSchedule = formData.schedule_by_day.filter((_, i) => i !== dayIndex);
    setFormData({ ...formData, schedule_by_day: newSchedule });
  };

  const handleDayNameChange = (dayIndex, value) => {
    const newSchedule = [...formData.schedule_by_day];
    newSchedule[dayIndex].day_name = value;
    setFormData({ ...formData, schedule_by_day: newSchedule });
  };

  const handleAddScheduleItem = (dayIndex) => {
    const newSchedule = [...formData.schedule_by_day];
    newSchedule[dayIndex].items.push({ time: '', activity: '', notes: '' });
    setFormData({ ...formData, schedule_by_day: newSchedule });
  };

  const handleRemoveScheduleItem = (dayIndex, itemIndex) => {
    const newSchedule = [...formData.schedule_by_day];
    newSchedule[dayIndex].items = newSchedule[dayIndex].items.filter((_, i) => i !== itemIndex);
    setFormData({ ...formData, schedule_by_day: newSchedule });
  };

  const handleScheduleChange = (dayIndex, itemIndex, field, value) => {
    const newSchedule = [...formData.schedule_by_day];
    newSchedule[dayIndex].items[itemIndex][field] = value;
    setFormData({ ...formData, schedule_by_day: newSchedule });
  };

  const togglePublished = async () => {
    await updateEventMutation.mutateAsync({ published: !event.published });
  };

  const handleAddFinancial = () => {
    if (!financialForm.description || !financialForm.amount) {
      toast.error('Please fill in all fields');
      return;
    }

    const newEntry = {
      id: Date.now().toString(),
      description: financialForm.description,
      amount: parseFloat(financialForm.amount),
      date: financialForm.date || new Date().toISOString().split('T')[0],
    };

    if (financialType === 'expense') {
      setFormData({ ...formData, expenses: [...formData.expenses, newEntry] });
    } else {
      setFormData({ ...formData, income: [...formData.income, newEntry] });
    }

    setFinancialForm({ description: '', amount: '', date: '' });
    setShowFinancialDialog(false);
    toast.success(`${financialType === 'expense' ? 'Expense' : 'Income'} added`);
  };

  const handleDeleteFinancial = (type, id) => {
    if (type === 'expense') {
      setFormData({ ...formData, expenses: formData.expenses.filter(e => e.id !== id) });
    } else {
      setFormData({ ...formData, income: formData.income.filter(i => i.id !== id) });
    }
    toast.success('Entry deleted');
  };

  const calculateTotals = () => {
    const totalExpenses = formData.expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = formData.income.reduce((sum, i) => sum + i.amount, 0);
    const profitLoss = totalIncome - totalExpenses;
    return { totalExpenses, totalIncome, profitLoss };
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
      </div>
    );
  }

  const eventSections = sections.filter(s => event.section_ids?.includes(s.id));
  
  // Check if event is in the past
  const isPastEvent = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = event.end_date ? new Date(event.end_date) : new Date(event.start_date);
    endDate.setHours(23, 59, 59, 999);
    return endDate < today;
  };

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'planning', label: 'Planning', icon: Calendar },
    { id: 'attendance', label: 'Attendance', icon: Users },
    { id: 'parent', label: 'Parent Portal', icon: Eye },
    { id: 'badges', label: 'Badges', icon: Award },
  ];

  const planningSubItems = [
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'todo', label: 'To-Do', icon: ListTodo },
    { id: 'risk', label: 'Risk', icon: Shield },
    { id: 'equipment', label: 'Equipment', icon: FileText },
    { id: 'financial', label: 'Financial', icon: DollarSign },
  ];

  const getSectionTitle = () => {
    if (activeSection === 'planning') {
      const subItem = planningSubItems.find(item => item.id === activePlanningTab);
      return `Planning - ${subItem?.label || 'Schedule'}`;
    }
    return navigationItems.find(item => item.id === activeSection)?.label || 'Overview';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-6 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-white hover:bg-white/10"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="lg:hidden flex-1 text-center font-semibold">
              {getSectionTitle()}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-white/90 text-sm">
                <span>{format(new Date(event.start_date), 'EEE, MMM d, yyyy')}</span>
                {event.end_date && event.end_date !== event.start_date && (
                  <span>to {format(new Date(event.end_date), 'MMM d, yyyy')}</span>
                )}
                {event.location && <span>• {event.location}</span>}
                {event.type === 'Camp' && <span>• {formData.nights_away_count} night{formData.nights_away_count !== 1 ? 's' : ''}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {!isPastEvent() ? (
                <Button
                  variant="outline"
                  onClick={togglePublished}
                  className="bg-white/10 text-white border-white/30 hover:bg-white/20 min-h-[44px]"
                >
                  <Eye className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{event.published ? 'Published' : 'Draft'}</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl('Gallery') + `?view=${event.type === 'Camp' ? 'camp' : 'event'}&id=${event.id}`)}
                  className="bg-white/10 text-white border-white/30 hover:bg-white/20 min-h-[44px]"
                >
                  <Image className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Gallery</span>
                </Button>
              )}
              <Button
                onClick={() => setShowEditDialog(true)}
                className={`${isPastEvent() ? 'bg-gray-400 text-gray-700 hover:bg-gray-500' : 'bg-white text-blue-700 hover:bg-gray-100'} min-h-[44px]`}
              >
                <span className="sm:hidden">Edit</span>
                <span className="hidden sm:inline">Edit Details {isPastEvent() && '(Not Recommended)'}</span>
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateEventMutation.isPending}
                className={`${isPastEvent() ? 'bg-gray-400 hover:bg-gray-500' : 'bg-green-600 hover:bg-green-700'} text-white min-h-[44px]`}
              >
                <Save className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Save {isPastEvent() && '(Not Recommended)'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div 
            className="bg-white w-64 h-full shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold text-lg">Navigation</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="p-4 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.id}>
                    <button
                      onClick={() => {
                        setActiveSection(item.id);
                        if (item.id !== 'planning') setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all min-h-[44px] ${
                        activeSection === item.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                    {item.id === 'planning' && activeSection === 'planning' && (
                      <div className="ml-4 mt-2 space-y-1">
                        {planningSubItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          return (
                            <button
                              key={subItem.id}
                              onClick={() => {
                                setActivePlanningTab(subItem.id);
                                setSidebarOpen(false);
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all min-h-[44px] ${
                                activePlanningTab === subItem.id
                                  ? 'bg-blue-100 text-blue-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              <SubIcon className="w-4 h-4" />
                              <span>{subItem.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky top-24">
              <nav className="space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                          activeSection === item.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                      {item.id === 'planning' && activeSection === 'planning' && (
                        <div className="ml-4 mt-2 space-y-1">
                          {planningSubItems.map((subItem) => {
                            const SubIcon = subItem.icon;
                            return (
                              <button
                                key={subItem.id}
                                onClick={() => setActivePlanningTab(subItem.id)}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all ${
                                  activePlanningTab === subItem.id
                                    ? 'bg-blue-100 text-blue-700 font-medium'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                <SubIcon className="w-4 h-4" />
                                <span>{subItem.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
              
              {/* Delete Event Section */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Event
                </Button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {activeSection === 'overview' && (
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="text-xl">Event Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Sections</p>
                    <p className="text-base text-gray-900">{eventSections.map(s => s.display_name).join(', ')}</p>
                  </div>
                  {event.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Description</p>
                      <p className="text-base text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {event.description}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
                    {event.cost > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Cost per Person</p>
                        <p className="text-2xl font-bold text-blue-600">£{event.cost.toFixed(2)}</p>
                      </div>
                    )}
                    {event.consent_deadline && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Consent Deadline</p>
                        <p className="text-base font-semibold text-gray-900">{format(new Date(event.consent_deadline), 'MMM d, yyyy')}</p>
                      </div>
                    )}
                    {event.payment_deadline && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Payment Deadline</p>
                        <p className="text-base font-semibold text-gray-900">{format(new Date(event.payment_deadline), 'MMM d, yyyy')}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'planning' && (
              <>
                {/* Planning Sub-nav Pills (Mobile) */}
                <div className="lg:hidden mb-4">
                  <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                    {planningSubItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActivePlanningTab(item.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all snap-start min-h-[44px] ${
                            activePlanningTab === item.id
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {activePlanningTab === 'schedule' && (
                  <div className="space-y-6">
                    <div className="flex justify-end">
                      <Button onClick={handleAddDay} size="sm" className="bg-blue-600 hover:bg-blue-700 min-h-[44px]">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Day
                      </Button>
                    </div>

                    {formData.schedule_by_day.map((day, dayIndex) => (
                      <Card key={dayIndex} className="shadow-sm border-gray-200">
                        <CardHeader className="border-b border-gray-100">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                              <Input
                                value={day.day_name}
                                onChange={(e) => handleDayNameChange(dayIndex, e.target.value)}
                                className="max-w-full sm:max-w-xs font-semibold text-lg"
                                placeholder="Day name"
                              />
                              {formData.schedule_by_day.length > 1 && (
                                <Button
                                  onClick={() => handleRemoveDay(dayIndex)}
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[44px]"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove Day
                                </Button>
                              )}
                            </div>
                            <Button onClick={() => handleAddScheduleItem(dayIndex)} size="sm" className="bg-blue-600 hover:bg-blue-700 min-h-[44px]">
                              <Plus className="w-4 h-4 mr-2" />
                              Add Item
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                          {day.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="p-4 border border-gray-200 rounded-lg space-y-3 bg-white hover:shadow-sm transition-shadow">
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-base font-medium">Item {itemIndex + 1}</Label>
                                {day.items.length > 1 && (
                                  <Button
                                    onClick={() => handleRemoveScheduleItem(dayIndex, itemIndex)}
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
                                  <Label className="text-sm font-medium">Time</Label>
                                  <Input
                                    value={item.time}
                                    onChange={(e) => handleScheduleChange(dayIndex, itemIndex, 'time', e.target.value)}
                                    placeholder="e.g., 9:00am"
                                    className="min-h-[44px]"
                                  />
                                </div>
                                <div className="sm:col-span-2 space-y-2">
                                  <Label className="text-sm font-medium">Activity</Label>
                                  <Input
                                    value={item.activity}
                                    onChange={(e) => handleScheduleChange(dayIndex, itemIndex, 'activity', e.target.value)}
                                    placeholder="e.g., Breakfast"
                                    className="min-h-[44px]"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Notes</Label>
                                <Textarea
                                  value={item.notes}
                                  onChange={(e) => handleScheduleChange(dayIndex, itemIndex, 'notes', e.target.value)}
                                  placeholder="Additional details..."
                                  rows={2}
                                  className="resize-none"
                                />
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {activePlanningTab === 'todo' && (
                  <TodoSection programmeId={eventId} entityType="event" />
                )}

                {activePlanningTab === 'risk' && (
                  <RiskAssessmentSection programmeId={eventId} entityType="event" />
                )}

                {activePlanningTab === 'equipment' && (
                  <div className="space-y-6">
                    <Card className="shadow-sm border-gray-200">
                      <CardHeader className="border-b border-gray-100">
                        <CardTitle className="text-xl">Equipment List</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <Textarea
                          value={formData.equipment_list}
                          onChange={(e) => setFormData({ ...formData, equipment_list: e.target.value })}
                          placeholder="List all equipment needed for this event..."
                          className="min-h-[200px] resize-none"
                        />
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-gray-200">
                      <CardHeader className="border-b border-gray-100">
                        <CardTitle className="text-xl">Instructions & Notes</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <Textarea
                          value={formData.instructions}
                          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                          placeholder="Add any important instructions or notes..."
                          className="min-h-[200px] resize-none"
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activePlanningTab === 'financial' && (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Card className="shadow-sm border-gray-200">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                              <p className="text-2xl font-bold text-red-600 mt-1">
                                £{calculateTotals().totalExpenses.toFixed(2)}
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                              <TrendingDown className="w-6 h-6 text-red-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="shadow-sm border-gray-200">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Total Income</p>
                              <p className="text-2xl font-bold text-green-600 mt-1">
                                £{calculateTotals().totalIncome.toFixed(2)}
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                              <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className={`shadow-sm border-2 ${calculateTotals().profitLoss >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-700">Profit / Loss</p>
                              <p className={`text-2xl font-bold mt-1 ${calculateTotals().profitLoss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                £{calculateTotals().profitLoss.toFixed(2)}
                              </p>
                            </div>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${calculateTotals().profitLoss >= 0 ? 'bg-green-200' : 'bg-red-200'}`}>
                              <DollarSign className={`w-6 h-6 ${calculateTotals().profitLoss >= 0 ? 'text-green-700' : 'text-red-700'}`} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Expenses and Income */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Expenses */}
                      <Card className="shadow-sm border-gray-200">
                        <CardHeader className="border-b border-gray-100">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-xl">Expenses</CardTitle>
                            <Button
                              onClick={() => {
                                setFinancialType('expense');
                                setFinancialForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
                                setShowFinancialDialog(true);
                              }}
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 min-h-[44px]"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Expense
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                          {formData.expenses.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No expenses recorded</p>
                          ) : (
                            <div className="space-y-3">
                              {formData.expenses.map((expense) => (
                                <div key={expense.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-lg hover:shadow-sm transition-shadow">
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900">{expense.description}</p>
                                    <p className="text-sm text-gray-600 mt-1">{format(new Date(expense.date), 'MMM d, yyyy')}</p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <p className="text-lg font-bold text-red-600">£{expense.amount.toFixed(2)}</p>
                                    <Button
                                      onClick={() => handleDeleteFinancial('expense', expense.id)}
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-100 min-h-[44px] min-w-[44px]"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Income */}
                      <Card className="shadow-sm border-gray-200">
                        <CardHeader className="border-b border-gray-100">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-xl">Income</CardTitle>
                            <Button
                              onClick={() => {
                                setFinancialType('income');
                                setFinancialForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
                                setShowFinancialDialog(true);
                              }}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 min-h-[44px]"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Income
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                          {formData.income.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No income recorded</p>
                          ) : (
                            <div className="space-y-3">
                              {formData.income.map((incomeItem) => (
                                <div key={incomeItem.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-lg hover:shadow-sm transition-shadow">
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900">{incomeItem.description}</p>
                                    <p className="text-sm text-gray-600 mt-1">{format(new Date(incomeItem.date), 'MMM d, yyyy')}</p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <p className="text-lg font-bold text-green-600">£{incomeItem.amount.toFixed(2)}</p>
                                    <Button
                                      onClick={() => handleDeleteFinancial('income', incomeItem.id)}
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-100 min-h-[44px] min-w-[44px]"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeSection === 'attendance' && (
              <EventAttendeesSection eventId={eventId} event={event} />
            )}

            {activeSection === 'parent' && (
              <EventParentPortalSection eventId={eventId} event={event} />
            )}

            {activeSection === 'badges' && (
              <div className="space-y-6">
                {event.type === 'Camp' && (
                  <Card className="shadow-sm border-gray-200">
                    <CardHeader className="border-b border-gray-100">
                      <CardTitle className="text-xl">Nights Away</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-base font-medium">Number of nights away</Label>
                          <Input
                            type="number"
                            min="0"
                            value={formData.nights_away_count}
                            onChange={(e) => setFormData({ ...formData, nights_away_count: parseInt(e.target.value) || 0 })}
                            className="mt-2 max-w-xs min-h-[44px]"
                          />
                          <p className="text-sm text-gray-600 mt-2">
                            This will be added to each attendee's total nights away count when badges are awarded.
                          </p>
                        </div>
                        {event.start_date && event.end_date && event.end_date !== event.start_date && (
                          <p className="text-xs text-gray-500">
                            Auto-calculated: {(() => {
                              const start = new Date(event.start_date);
                              const end = new Date(event.end_date);
                              const diffTime = Math.abs(end - start);
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              return diffDays;
                            })()} nights (edit above to override)
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                <ProgrammeBadgeCriteriaSection programmeId={eventId} entityType="event" />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Financial Dialog */}
      <Dialog open={showFinancialDialog} onOpenChange={setShowFinancialDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add {financialType === 'expense' ? 'Expense' : 'Income'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <Input
                value={financialForm.description}
                onChange={(e) => setFinancialForm({ ...financialForm, description: e.target.value })}
                placeholder={financialType === 'expense' ? 'e.g., Transport costs' : 'e.g., Grant from council'}
                className="mt-2 min-h-[44px]"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Amount (£)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={financialForm.amount}
                onChange={(e) => setFinancialForm({ ...financialForm, amount: e.target.value })}
                placeholder="0.00"
                className="mt-2 min-h-[44px]"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Date</Label>
              <Input
                type="date"
                value={financialForm.date}
                onChange={(e) => setFinancialForm({ ...financialForm, date: e.target.value })}
                className="mt-2 min-h-[44px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowFinancialDialog(false)}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddFinancial}
              className={`${financialType === 'expense' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} min-h-[44px]`}
            >
              Add {financialType === 'expense' ? 'Expense' : 'Income'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewEventDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        sections={sections}
        editEvent={event}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Event?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete <strong>{event.title}</strong>?
            </p>
            <p className="text-sm text-gray-600">
              This action cannot be undone. All associated data including attendance records, documents, and photos will be permanently removed.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                deleteEventMutation.mutate();
                setShowDeleteDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white min-h-[44px]"
              disabled={deleteEventMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}