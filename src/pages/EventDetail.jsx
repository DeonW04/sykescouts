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

export default function EventDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docName, setDocName] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    schedule: [{ time: '', activity: '', notes: '' }],
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
        schedule: event.schedule?.length > 0 ? event.schedule : [{ time: '', activity: '', notes: '' }],
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

  const handleAddScheduleItem = () => {
    setFormData({
      ...formData,
      schedule: [...formData.schedule, { time: '', activity: '', notes: '' }],
    });
  };

  const handleRemoveScheduleItem = (index) => {
    const newSchedule = formData.schedule.filter((_, i) => i !== index);
    setFormData({ ...formData, schedule: newSchedule });
  };

  const handleScheduleChange = (index, field, value) => {
    const newSchedule = [...formData.schedule];
    newSchedule[index][field] = value;
    setFormData({ ...formData, schedule: newSchedule });
  };

  const handleUploadDocument = async () => {
    if (!docFile || !docName) {
      toast.error('Please provide a name and select a file');
      return;
    }

    setUploadingDoc(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: docFile });
      
      const updatedDocs = [...documents, { name: docName, url: file_url }];
      await updateEventMutation.mutateAsync({ documents: updatedDocs });
      
      setShowUploadDialog(false);
      setDocName('');
      setDocFile(null);
      toast.success('Document uploaded');
    } catch (error) {
      toast.error('Error uploading document: ' + error.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docUrl) => {
    const updatedDocs = documents.filter(d => d.url !== docUrl);
    await updateEventMutation.mutateAsync({ documents: updatedDocs });
    toast.success('Document removed');
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
          <TabsList className="bg-white border">
            <TabsTrigger value="details">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="equipment">Equipment & Instructions</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
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
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Event Schedule</CardTitle>
                  <Button onClick={handleAddScheduleItem} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.schedule.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <Label>Schedule Item {index + 1}</Label>
                      {formData.schedule.length > 1 && (
                        <Button
                          onClick={() => handleRemoveScheduleItem(index)}
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
                          onChange={(e) => handleScheduleChange(index, 'time', e.target.value)}
                          placeholder="e.g., 9:00am"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label>Activity</Label>
                        <Input
                          value={item.activity}
                          onChange={(e) => handleScheduleChange(index, 'activity', e.target.value)}
                          placeholder="e.g., Breakfast"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={item.notes}
                        onChange={(e) => handleScheduleChange(index, 'notes', e.target.value)}
                        placeholder="Additional details..."
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
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

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Documents & Kit Lists</CardTitle>
                  <Button onClick={() => setShowUploadDialog(true)} size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No documents uploaded yet</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <span className="font-medium">{doc.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.url)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="docName">Document Name</Label>
              <Input
                id="docName"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g., Kit List, Information Sheet"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docFile">File</Label>
              <Input
                id="docFile"
                type="file"
                onChange={(e) => setDocFile(e.target.files[0])}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadDocument} disabled={uploadingDoc}>
              {uploadingDoc ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <NewEventDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        sections={sections}
        editEvent={event}
      />
    </div>
  );
}