import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const emptyForm = {
  title: '',
  start_date: '',
  end_date: '',
  half_term_start: '',
  half_term_end: '',
};

export default function AdminTermsTab() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editTerm, setEditTerm] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: terms = [] } = useQuery({
    queryKey: ['terms'],
    queryFn: () => base44.entities.Term.list('-start_date'),
  });

  const today = new Date().toISOString().split('T')[0];

  const openNew = () => {
    setForm(emptyForm);
    setEditTerm(null);
    setShowDialog(true);
  };

  const openEdit = (term) => {
    setForm({
      title: term.title || '',
      start_date: term.start_date || '',
      end_date: term.end_date || '',
      half_term_start: term.half_term_start || '',
      half_term_end: term.half_term_end || '',
    });
    setEditTerm(term);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.start_date || !form.end_date) {
      toast.error('Title, start date and end date are required');
      return;
    }
    setSaving(true);
    try {
      if (editTerm) {
        await base44.entities.Term.update(editTerm.id, form);
        toast.success('Term updated');
      } else {
        await base44.entities.Term.create(form);
        toast.success('Term created');
      }
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      setShowDialog(false);
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this term? This will NOT remove any associated programmes or meetings.')) return;
    await base44.entities.Term.delete(id);
    queryClient.invalidateQueries({ queryKey: ['terms'] });
    toast.success('Term deleted');
  };

  const getTermStatus = (term) => {
    if (term.finance_closed) return { label: 'Closed', color: 'bg-gray-100 text-gray-600' };
    if (today >= term.start_date && today <= term.end_date) return { label: 'Current', color: 'bg-green-100 text-green-700' };
    if (today < term.start_date) return { label: 'Upcoming', color: 'bg-blue-100 text-blue-700' };
    return { label: 'Past', color: 'bg-gray-100 text-gray-500' };
  };

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Group Terms
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Terms are shared across all sections. Each section sets its own meeting day and times in Section Settings.</p>
            </div>
            <Button onClick={openNew} className="bg-[#004851] hover:bg-[#003840]">
              <Plus className="w-4 h-4 mr-2" />New Term
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {terms.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No terms yet. Create your first term above.</p>
          )}
          {terms.map(term => {
            const status = getTermStatus(term);
            return (
              <div key={term.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">{term.title}</p>
                    <Badge className={`text-xs ${status.color}`}>{status.label}</Badge>
                    {term.finance_closed && <Badge className="text-xs bg-red-100 text-red-700">Finance Locked</Badge>}
                  </div>
                  <p className="text-xs text-gray-500">
                    {term.start_date && format(new Date(term.start_date), 'dd MMM yyyy')} — {term.end_date && format(new Date(term.end_date), 'dd MMM yyyy')}
                    {term.half_term_start && ` · Half term: ${format(new Date(term.half_term_start), 'dd MMM')}–${term.half_term_end ? format(new Date(term.half_term_end), 'dd MMM') : '?'}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(term)}>
                    <Edit className="w-3 h-3 mr-1" />Edit
                  </Button>
                  {!term.finance_closed && (
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(term.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTerm ? 'Edit Term' : 'New Term'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Term Title *</Label>
              <Input value={form.title} onChange={e => sf('title', e.target.value)} placeholder="e.g., Autumn Term 2024" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={form.start_date} onChange={e => sf('start_date', e.target.value)} />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input type="date" value={form.end_date} onChange={e => sf('end_date', e.target.value)} />
              </div>
              <div>
                <Label>Half Term Start</Label>
                <Input type="date" value={form.half_term_start} onChange={e => sf('half_term_start', e.target.value)} />
              </div>
              <div>
                <Label>Half Term End</Label>
                <Input type="date" value={form.half_term_end} onChange={e => sf('half_term_end', e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#004851] hover:bg-[#003840]">
              {saving ? 'Saving...' : editTerm ? 'Update Term' : 'Create Term'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}