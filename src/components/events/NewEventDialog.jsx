import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';

export default function NewEventDialog({ open, onOpenChange, sections, editEvent }) {
  const queryClient = useQueryClient();

  const { data: terms = [] } = useQuery({
    queryKey: ['terms'],
    queryFn: () => base44.entities.Term.list('-start_date', 50),
  });

  const emptyForm = {
    title: '',
    type: 'camp',
    section_ids: [],
    start_date: '',
    end_date: '',
    meeting_time: '',
    pickup_time: '',
    location: '',
    description: '',
    cost: 0,
    requires_consent: true,
    consent_deadline: '',
    payment_deadline: '',
    max_attendees: null,
    published: false,
    show_schedule_in_portal: true,
    term_id: '',
    apply_profit_to_budget: false,
  };

  const [formData, setFormData] = useState(emptyForm);
  const [autoTermId, setAutoTermId] = useState(''); // auto-detected term

  useEffect(() => {
    if (editEvent) {
      setFormData({
        title: editEvent.title || '',
        type: editEvent.type || 'Camp',
        section_ids: editEvent.section_ids || [],
        start_date: editEvent.start_date?.split('T')[0] || '',
        end_date: editEvent.end_date?.split('T')[0] || '',
        meeting_time: editEvent.meeting_time || '',
        pickup_time: editEvent.pickup_time || '',
        location: editEvent.location || '',
        description: editEvent.description || '',
        cost: editEvent.cost || 0,
        requires_consent: editEvent.requires_consent ?? true,
        consent_deadline: editEvent.consent_deadline || '',
        payment_deadline: editEvent.payment_deadline || '',
        max_attendees: editEvent.max_attendees || null,
        published: editEvent.published || false,
        show_schedule_in_portal: editEvent.show_schedule_in_portal ?? true,
        term_id: editEvent.term_id || '',
        apply_profit_to_budget: editEvent.apply_profit_to_budget || false,
      });
    } else {
      setFormData(emptyForm);
    }
  }, [editEvent, open]);

  // Auto-detect term from start_date
  useEffect(() => {
    if (!formData.start_date || terms.length === 0) {
      setAutoTermId('');
      return;
    }
    const matchingTerm = terms.find(t => formData.start_date >= t.start_date && formData.start_date <= t.end_date);
    if (matchingTerm) {
      setAutoTermId(matchingTerm.id);
      setFormData(prev => ({ ...prev, term_id: matchingTerm.id }));
    } else {
      setAutoTermId('');
      // Only clear if not manually set
      setFormData(prev => ({ ...prev, term_id: prev.term_id || '' }));
    }
  }, [formData.start_date, terms]);

  const termDetected = autoTermId && terms.find(t => t.id === autoTermId);
  const termRequired = !autoTermId && formData.start_date && !formData.term_id;

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
    if (!formData.term_id) {
      toast.error('Please select a term for this event before saving.');
      return;
    }
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
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <label htmlFor={section.id} className="text-sm cursor-pointer">{section.display_name}</label>
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

          {/* Term Assignment */}
          <div className={`p-4 rounded-lg border ${termDetected ? 'bg-green-50 border-green-200' : termRequired ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-start gap-2 mb-2">
              {termRequired && <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />}
              <Label className={`font-semibold ${termRequired ? 'text-amber-800' : 'text-gray-700'}`}>
                Term Assignment *
              </Label>
            </div>
            {termDetected ? (
              <p className="text-sm text-green-700 mb-2">
                ✓ Auto-detected: <strong>{terms.find(t => t.id === autoTermId)?.title}</strong>
              </p>
            ) : termRequired ? (
              <p className="text-sm text-amber-700 mb-2">
                This event date does not fall within any defined term. Please select a term manually.
              </p>
            ) : null}
            <Select value={formData.term_id} onValueChange={v => setFormData({ ...formData, term_id: v })}>
              <SelectTrigger className={termRequired ? 'border-amber-400' : ''}>
                <SelectValue placeholder="Select a term..." />
              </SelectTrigger>
              <SelectContent>
                {terms.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title} ({t.start_date} – {t.end_date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meeting_time">Meeting Time</Label>
              <Input id="meeting_time" type="time" value={formData.meeting_time} onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickup_time">Pickup Time</Label>
              <Input id="pickup_time" type="time" value={formData.pickup_time} onChange={(e) => setFormData({ ...formData, pickup_time: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="e.g., Woodhouse Park Scout Centre" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the event..." rows={4} />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Cost (£)</Label>
              <Input id="cost" type="number" step="0.01" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consent_deadline">Consent Deadline</Label>
              <Input id="consent_deadline" type="date" value={formData.consent_deadline} onChange={(e) => setFormData({ ...formData, consent_deadline: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_deadline">Payment Deadline</Label>
              <Input id="payment_deadline" type="date" value={formData.payment_deadline} onChange={(e) => setFormData({ ...formData, payment_deadline: e.target.value })} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox id="requires_consent" checked={formData.requires_consent} onCheckedChange={(checked) => setFormData({ ...formData, requires_consent: checked })} />
              <label htmlFor="requires_consent" className="text-sm cursor-pointer">Requires parent consent</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="published" checked={formData.published} onCheckedChange={(checked) => setFormData({ ...formData, published: checked })} />
              <label htmlFor="published" className="text-sm cursor-pointer">Publish to parent portal</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="show_schedule" checked={formData.show_schedule_in_portal} onCheckedChange={(checked) => setFormData({ ...formData, show_schedule_in_portal: checked })} />
              <label htmlFor="show_schedule" className="text-sm cursor-pointer">Show schedule to parents</label>
            </div>
            {formData.cost > 0 && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Checkbox
                  id="apply_profit"
                  checked={formData.apply_profit_to_budget}
                  onCheckedChange={(checked) => setFormData({ ...formData, apply_profit_to_budget: checked })}
                  className="mt-0.5"
                />
                <div>
                  <label htmlFor="apply_profit" className="text-sm font-medium cursor-pointer text-blue-800">
                    Apply event profit/loss to the selected term's budget
                  </label>
                  <p className="text-xs text-blue-600 mt-0.5">When finances are closed, the event's final profit or loss will be applied to the section's budget for the linked term.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createEventMutation.isPending} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
              {createEventMutation.isPending ? (editEvent ? 'Updating...' : 'Creating...') : (editEvent ? 'Update Event' : 'Create Event')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}