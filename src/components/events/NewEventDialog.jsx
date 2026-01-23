import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import ReactQuill from 'react-quill';

export default function NewEventDialog({ open, onOpenChange, sections, editEvent }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    type: 'camp',
    section_ids: [],
    start_date: '',
    end_date: '',
    location: '',
    description: '',
    cost: 0,
    requires_consent: true,
    consent_deadline: '',
    payment_deadline: '',
    max_attendees: null,
    published: false,
  });

  React.useEffect(() => {
    if (editEvent) {
      setFormData({
        title: editEvent.title || '',
        type: editEvent.type || 'camp',
        section_ids: editEvent.section_ids || [],
        start_date: editEvent.start_date?.split('T')[0] || '',
        end_date: editEvent.end_date?.split('T')[0] || '',
        location: editEvent.location || '',
        description: editEvent.description || '',
        cost: editEvent.cost || 0,
        requires_consent: editEvent.requires_consent ?? true,
        consent_deadline: editEvent.consent_deadline || '',
        payment_deadline: editEvent.payment_deadline || '',
        max_attendees: editEvent.max_attendees || null,
        published: editEvent.published || false,
      });
    } else {
      setFormData({
        title: '',
        type: 'camp',
        section_ids: [],
        start_date: '',
        end_date: '',
        location: '',
        description: '',
        cost: 0,
        requires_consent: true,
        consent_deadline: '',
        payment_deadline: '',
        max_attendees: null,
        published: false,
      });
    }
  }, [editEvent, open]);

  const createEventMutation = useMutation({
    mutationFn: (data) => editEvent 
      ? base44.entities.Event.update(editEvent.id, data)
      : base44.entities.Event.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onOpenChange(false);
      toast.success(editEvent ? 'Event updated successfully' : 'Event created successfully');
    },
    onError: (error) => {
      toast.error(`Error ${editEvent ? 'updating' : 'creating'} event: ` + error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createEventMutation.mutate(formData);
  };

  const toggleSection = (sectionId) => {
    setFormData(prev => ({
      ...prev,
      section_ids: prev.section_ids.includes(sectionId)
        ? prev.section_ids.filter(id => id !== sectionId)
        : [...prev.section_ids, sectionId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Summer Camp 2024"
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Event Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Camp">Camp</SelectItem>
                  <SelectItem value="Day Event">Day Event</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sections Invited *</Label>
              <div className="border rounded-lg p-3 space-y-2">
                {sections.map(section => (
                  <div key={section.id} className="flex items-center gap-2">
                    <Checkbox
                      id={section.id}
                      checked={formData.section_ids.includes(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                    <label htmlFor={section.id} className="text-sm cursor-pointer">
                      {section.display_name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Woodhouse Park Scout Centre"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <div className="border rounded-md">
              <ReactQuill
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                placeholder="Describe the event..."
                theme="snow"
                className="min-h-[200px]"
                modules={{
                  toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'header': [1, 2, 3, false] }],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    [{ 'indent': '-1' }, { 'indent': '+1' }],
                    ['link'],
                    [{ 'color': [] }, { 'background': [] }],
                    ['clean']
                  ]
                }}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Cost (£)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consent_deadline">Consent Deadline</Label>
              <Input
                id="consent_deadline"
                type="date"
                value={formData.consent_deadline}
                onChange={(e) => setFormData({ ...formData, consent_deadline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_deadline">Payment Deadline</Label>
              <Input
                id="payment_deadline"
                type="date"
                value={formData.payment_deadline}
                onChange={(e) => setFormData({ ...formData, payment_deadline: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="requires_consent"
                checked={formData.requires_consent}
                onCheckedChange={(checked) => setFormData({ ...formData, requires_consent: checked })}
              />
              <label htmlFor="requires_consent" className="text-sm cursor-pointer">
                Requires parent consent
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
              />
              <label htmlFor="published" className="text-sm cursor-pointer">
                Publish to parent portal
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEventMutation.isPending} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
              {createEventMutation.isPending ? (editEvent ? 'Updating...' : 'Creating...') : (editEvent ? 'Update Event' : 'Create Event')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}