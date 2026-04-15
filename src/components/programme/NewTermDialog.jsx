import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Terms are now group-wide (no section_id or meeting times here — those are set in Admin Settings)
export default function NewTermDialog({ open, onOpenChange, editTerm }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    start_date: '',
    end_date: '',
    half_term_start: '',
    half_term_end: '',
  });

  useEffect(() => {
    if (editTerm) {
      setFormData({
        title: editTerm.title || '',
        start_date: editTerm.start_date || '',
        end_date: editTerm.end_date || '',
        half_term_start: editTerm.half_term_start || '',
        half_term_end: editTerm.half_term_end || '',
      });
    } else {
      setFormData({ title: '', start_date: '', end_date: '', half_term_start: '', half_term_end: '' });
    }
  }, [editTerm, open]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (editTerm) {
        await base44.entities.Term.update(editTerm.id, data);
      } else {
        await base44.entities.Term.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      onOpenChange(false);
      toast.success(editTerm ? 'Term updated' : 'Term created');
    },
    onError: (e) => toast.error('Error: ' + e.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.start_date || !formData.end_date) {
      toast.error('Title, start date and end date are required');
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTerm ? 'Edit Term' : 'Create New Term'}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 -mt-2">Terms are shared across all sections. Meeting days and times are set per-section in Admin Settings → Section Settings.</p>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Term Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Autumn Term 2024"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Half Term Start</Label>
              <Input type="date" value={formData.half_term_start} onChange={(e) => setFormData({ ...formData, half_term_start: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Half Term End</Label>
              <Input type="date" value={formData.half_term_end} onChange={(e) => setFormData({ ...formData, half_term_end: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
              {mutation.isPending ? 'Saving...' : editTerm ? 'Update Term' : 'Create Term'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}