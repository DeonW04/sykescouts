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
import RiskAssessmentSection from '../components/meeting/RiskAssessmentSection';
import BadgesSection from '../components/meeting/BadgesSection';

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
      setFormData({
        schedule_by_day: event.schedule_by_day?.length > 0 
          ? event.schedule_by_day 
          : [{ day_name: 'Day 1', items: [{ time: '', activity: '', notes: '' }] }],
        equipment_list: event.equipment_list || '',
        instructions: event.instructions || '',
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
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{event.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-white/80">
                <span>{format(new Date(event.start_date), 'EEEE, MMMM d, yyyy')}</span>
                {event.end_date && event.end_date !== event.start_date && (
                  <span>to {format(new Date(event.end_date), 'EEEE, MMMM d, yyyy')}</span>
                )}
                {event.location && <span>• {event.location}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={togglePublished}
                className="bg-white/10 text-white border-white hover:bg-white/20"
              >
                {event.published ? (
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
                onClick={() => setShowEditDialog(true)}
                className="bg-white text-[#7413dc] hover:bg-gray-100"
              >
                Edit Details
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateEventMutation.isPending}
                className="bg-[#004851] hover:bg-[#003840]"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Plan
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="bg-white border grid grid-cols-7">
            <TabsTrigger value="details">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="todo">To Do</TabsTrigger>
            <TabsTrigger value="parent">Parent Portal</TabsTrigger>
            <TabsTrigger value="risk">Risk</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
          </TabsList>

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
                    <p className="text-gray-900 whitespace-pre-wrap">{event.description}</p>
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

          <TabsContent value="schedule" className="space-y-6">
            <div className="flex justify-end mb-4">
              <Button onClick={handleAddDay} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Day
              </Button>
            </div>

            {formData.schedule_by_day.map((day, dayIndex) => (
              <Card key={dayIndex}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <Input
                        value={day.day_name}
                        onChange={(e) => handleDayNameChange(dayIndex, e.target.value)}
                        className="max-w-xs font-semibold"
                        placeholder="Day name"
                      />
                      {formData.schedule_by_day.length > 1 && (
                        <Button
                          onClick={() => handleRemoveDay(dayIndex)}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Day
                        </Button>
                      )}
                    </div>
                    <Button onClick={() => handleAddScheduleItem(dayIndex)} size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {day.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="p-4 border rounded-lg space-y-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <Label>Item {itemIndex + 1}</Label>
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
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Time</Label>
                          <Input
                            value={item.time}
                            onChange={(e) => handleScheduleChange(dayIndex, itemIndex, 'time', e.target.value)}
                            placeholder="e.g., 9:00am"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label>Activity</Label>
                          <Input
                            value={item.activity}
                            onChange={(e) => handleScheduleChange(dayIndex, itemIndex, 'activity', e.target.value)}
                            placeholder="e.g., Breakfast"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Notes</Label>
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

          <TabsContent value="parent">
            <EventParentPortalSection eventId={eventId} event={event} />
          </TabsContent>

          <TabsContent value="risk">
            <RiskAssessmentSection programmeId={eventId} entityType="event" />
          </TabsContent>

          <TabsContent value="badges">
            <BadgesSection programmeId={eventId} entityType="event" />
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