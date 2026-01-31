import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload, FileText, Trash2, Download, Save, Eye, EyeOff, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
      </div>
    );
  }

  const eventSections = sections.filter(s => event.section_ids?.includes(s.id));

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      <div className="bg-[#7413dc] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('LeaderEvents'))}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold">{event.title}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-white/80 text-sm sm:text-base">
                <span>{format(new Date(event.start_date), 'EEE, MMM d, yyyy')}</span>
                {event.end_date && event.end_date !== event.start_date && (
                  <span>to {format(new Date(event.end_date), 'EEE, MMM d, yyyy')}</span>
                )}
                {event.location && <span className="hidden sm:inline">• {event.location}</span>}
                {event.type === 'Camp' && <span className="hidden sm:inline">• {formData.nights_away_count} night{formData.nights_away_count !== 1 ? 's' : ''} away</span>}
              </div>
              {event.location && <div className="sm:hidden text-white/80 text-sm mt-1">{event.location}</div>}
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={togglePublished}
                className="bg-white/10 text-white border-white hover:bg-white/20 flex-1 sm:flex-none"
              >
                <Eye className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{event.published ? 'Published' : 'Draft'}</span>
              </Button>
              <Button
                onClick={() => setShowEditDialog(true)}
                className="bg-white text-[#7413dc] hover:bg-gray-100 flex-1 sm:flex-none"
              >
                <span className="sm:hidden">Edit</span>
                <span className="hidden sm:inline">Edit Details</span>
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateEventMutation.isPending}
                className="bg-[#004851] hover:bg-[#003840] flex-1 sm:flex-none"
              >
                <Save className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Save Plan</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="details" className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="bg-white border inline-flex min-w-full sm:grid sm:grid-cols-5 gap-1">
              <TabsTrigger value="details" className="whitespace-nowrap px-4 py-2 text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="planning" className="whitespace-nowrap px-4 py-2 text-xs sm:text-sm">Planning</TabsTrigger>
              <TabsTrigger value="attendees" className="whitespace-nowrap px-4 py-2 text-xs sm:text-sm">Attendees</TabsTrigger>
              <TabsTrigger value="parent" className="whitespace-nowrap px-4 py-2 text-xs sm:text-sm">Parent</TabsTrigger>
              <TabsTrigger value="badges" className="whitespace-nowrap px-4 py-2 text-xs sm:text-sm">Badges</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Sections</p>
                  <p className="font-medium">{eventSections.map(s => s.display_name).join(', ')}</p>
                </div>
                {event.description && (
                  <div>
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {event.description}
                    </p>
                  </div>
                )}
                <div className="grid md:grid-cols-3 gap-4">
                  {event.cost > 0 && (
                    <div>
                      <p className="text-sm text-gray-600">Cost</p>
                      <p className="font-medium">£{event.cost.toFixed(2)}</p>
                    </div>
                  )}
                  {event.consent_deadline && (
                    <div>
                      <p className="text-sm text-gray-600">Consent Deadline</p>
                      <p className="font-medium">{format(new Date(event.consent_deadline), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                  {event.payment_deadline && (
                    <div>
                      <p className="text-sm text-gray-600">Payment Deadline</p>
                      <p className="font-medium">{format(new Date(event.payment_deadline), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planning" className="space-y-6">
            <Tabs defaultValue="schedule" className="space-y-6">
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <TabsList className="bg-white border inline-flex min-w-full sm:grid sm:grid-cols-4 gap-1">
                  <TabsTrigger value="schedule" className="whitespace-nowrap px-4 py-2 text-xs sm:text-sm">Schedule</TabsTrigger>
                  <TabsTrigger value="todo" className="whitespace-nowrap px-4 py-2 text-xs sm:text-sm">To Do</TabsTrigger>
                  <TabsTrigger value="risk" className="whitespace-nowrap px-4 py-2 text-xs sm:text-sm">Risk</TabsTrigger>
                  <TabsTrigger value="equipment" className="whitespace-nowrap px-4 py-2 text-xs sm:text-sm">Equipment</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="schedule" className="space-y-6">
                <div className="flex justify-end mb-4">
                  <Button onClick={handleAddDay} size="sm" variant="outline" className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Day
                  </Button>
                </div>

                {formData.schedule_by_day.map((day, dayIndex) => (
                  <Card key={dayIndex}>
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                          <Input
                            value={day.day_name}
                            onChange={(e) => handleDayNameChange(dayIndex, e.target.value)}
                            className="max-w-full sm:max-w-xs font-semibold"
                            placeholder="Day name"
                          />
                          {formData.schedule_by_day.length > 1 && (
                            <Button
                              onClick={() => handleRemoveDay(dayIndex)}
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove Day
                            </Button>
                          )}
                        </div>
                        <Button onClick={() => handleAddScheduleItem(dayIndex)} size="sm" variant="outline" className="w-full sm:w-auto">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {day.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="p-3 sm:p-4 border rounded-lg space-y-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm sm:text-base">Item {itemIndex + 1}</Label>
                            {day.items.length > 1 && (
                              <Button
                                onClick={() => handleRemoveScheduleItem(dayIndex, itemIndex)}
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                              <Label className="text-sm">Time</Label>
                              <Input
                                value={item.time}
                                onChange={(e) => handleScheduleChange(dayIndex, itemIndex, 'time', e.target.value)}
                                placeholder="e.g., 9:00am"
                              />
                            </div>
                            <div className="sm:col-span-2 space-y-2">
                              <Label className="text-sm">Activity</Label>
                              <Input
                                value={item.activity}
                                onChange={(e) => handleScheduleChange(dayIndex, itemIndex, 'activity', e.target.value)}
                                placeholder="e.g., Breakfast"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Notes</Label>
                            <Textarea
                              value={item.notes}
                              onChange={(e) => handleScheduleChange(dayIndex, itemIndex, 'notes', e.target.value)}
                              placeholder="Additional details..."
                              rows={2}
                            />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="todo">
                <TodoSection programmeId={eventId} entityType="event" />
              </TabsContent>

              <TabsContent value="risk">
                <RiskAssessmentSection programmeId={eventId} entityType="event" />
              </TabsContent>

              <TabsContent value="equipment" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Equipment List</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={formData.equipment_list}
                      onChange={(e) => setFormData({ ...formData, equipment_list: e.target.value })}
                      placeholder="List all equipment needed for this event..."
                      className="min-h-[150px]"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Instructions & Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={formData.instructions}
                      onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                      placeholder="Add any important instructions or notes..."
                      className="min-h-[150px]"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="attendees">
            <EventAttendeesSection eventId={eventId} event={event} />
          </TabsContent>

          <TabsContent value="parent">
            <EventParentPortalSection eventId={eventId} event={event} />
          </TabsContent>

          <TabsContent value="badges" className="space-y-6">
            {event.type === 'Camp' && (
              <Card>
                <CardHeader>
                  <CardTitle>Nights Away</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Number of nights away</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.nights_away_count}
                        onChange={(e) => setFormData({ ...formData, nights_away_count: parseInt(e.target.value) || 0 })}
                        className="mt-2 max-w-xs"
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        This will be added to each attendee's total nights away count when badges are awarded.
                      </p>
                    </div>
                    {event.start_date && event.end_date && event.end_date !== event.start_date && (
                      <p className="text-xs text-gray-400">
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
          </TabsContent>


        </Tabs>
      </div>

      <NewEventDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        sections={sections}
        editEvent={event}
      />
    </div>
  );
}