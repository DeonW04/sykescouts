import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function NewIdeaDialog({ defaultType, onClose, onSave }) {
  const [form, setForm] = useState({
    type: defaultType || 'meeting',
    title: '',
    description: '',
    notes: '',
    suggested_week: '',
  });

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave(form);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Idea</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs font-semibold uppercase text-gray-500">Type</Label>
            <div className="flex gap-2 mt-1.5">
              {['meeting', 'event'].map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                    form.type === t
                      ? 'border-purple-400 bg-purple-50 text-purple-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {t === 'meeting' ? '📋 Meeting' : '🏕️ Event'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase text-gray-500">Title *</Label>
            <Input
              className="mt-1"
              placeholder="e.g. Navigation skills night"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase text-gray-500">Description</Label>
            <Textarea
              className="mt-1 resize-none"
              rows={3}
              placeholder="What would this involve?"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase text-gray-500">Suggested week / date</Label>
            <Input
              className="mt-1"
              placeholder="e.g. Week of 10 Mar"
              value={form.suggested_week}
              onChange={e => setForm(f => ({ ...f, suggested_week: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!form.title.trim()}
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Pin to Board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}