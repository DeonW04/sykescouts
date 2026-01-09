import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function NewTermDialog({ open, onOpenChange, sections, editTerm }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    section_id: '',
    start_date: '',
    end_date: '',
    half_term_start: '',
    half_term_end: '',
    meeting_day: '',
    meeting_start_time: '',
    meeting_end_time: '',
  });

  React.useEffect(() => {
    if (editTerm) {
      setFormData({
        title: editTerm.title || '',
        section_id: editTerm.section_id || '',
        start_date: editTerm.start_date || '',
        end_date: editTerm.end_date || '',
        half_term_start: editTerm.half_term_start || '',
        half_term_end: editTerm.half_term_end || '',
        meeting_day: editTerm.meeting_day || '',
        meeting_start_time: editTerm.meeting_start_time || '',
        meeting_end_time: editTerm.meeting_end_time || '',
      });
    } else {
      setFormData({
        title: '',
        section_id: '',
        start_date: '',
        end_date: '',
        half_term_start: '',
        half_term_end: '',
        meeting_day: '',
        meeting_start_time: '',
        meeting_end_time: '',
      });
    }
  }, [editTerm, open]);

  const createTermMutation = useMutation({
    mutationFn: (data) => editTerm 
      ? base44.entities.Term.update(editTerm.id, data)
      : base44.entities.Term.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      onOpenChange(false);
      setFormData({
        title: '',
        section_id: '',
        start_date: '',
        end_date: '',
        half_term_start: '',
        half_term_end: '',
        meeting_day: '',
        meeting_start_time: '',
        meeting_end_time: '',
      });
      toast.success(editTerm ? 'Term updated successfully' : 'Term created successfully');
    },
    onError: (error) => {
      toast.error(`Error ${editTerm ? 'updating' : 'creating'} term: ` + error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createTermMutation.mutate(formData);
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTerm ? 'Edit Term' : 'Create New Term'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Term Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Autumn Term 2024"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="section_id">Section *</Label>
            <Select
              value={formData.section_id}
              onValueChange={(value) => setFormData({ ...formData, section_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map(section => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Term Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Term End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="half_term_start">Half Term Start *</Label>
              <Input
                id="half_term_start"
                type="date"
                value={formData.half_term_start}
                onChange={(e) => setFormData({ ...formData, half_term_start: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="half_term_end">Half Term End *</Label>
              <Input
                id="half_term_end"
                type="date"
                value={formData.half_term_end}
                onChange={(e) => setFormData({ ...formData, half_term_end: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting_day">Meeting Day *</Label>
            <Select
              value={formData.meeting_day}
              onValueChange={(value) => setFormData({ ...formData, meeting_day: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {daysOfWeek.map(day => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meeting_start_time">Meeting Start Time *</Label>
              <Input
                id="meeting_start_time"
                type="time"
                value={formData.meeting_start_time}
                onChange={(e) => setFormData({ ...formData, meeting_start_time: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting_end_time">Meeting End Time *</Label>
              <Input
                id="meeting_end_time"
                type="time"
                value={formData.meeting_end_time}
                onChange={(e) => setFormData({ ...formData, meeting_end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTermMutation.isPending} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
              {createTermMutation.isPending ? (editTerm ? 'Updating...' : 'Creating...') : (editTerm ? 'Update Term' : 'Create Term')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}