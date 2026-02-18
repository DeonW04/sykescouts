import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function LinkToProgrammeDialog({ idea, sectionId, onClose, onLinked }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const { data: meetings = [] } = useQuery({
    queryKey: ['allMeetings', sectionId],
    queryFn: async () => {
      const all = await base44.entities.Programme.filter({ section_id: sectionId });
      // Return all that are not yet published — covers both no-date and future unpublished
      return all.filter(m => !m.published);
    },
  });

  const filtered = meetings.filter(m =>
    m.title?.toLowerCase().includes(search.toLowerCase()) ||
    m.date?.includes(search)
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link to a Meeting</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500">Search for an upcoming unpublished meeting to attach this idea to.</p>
        <Input
          placeholder="Search by title or date..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mt-2"
        />
        <div className="mt-3 max-h-60 overflow-y-auto space-y-2">
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No unpublished meetings found</p>
          )}
          {filtered.map(m => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                selected?.id === m.id
                  ? 'border-green-400 bg-green-50 text-green-800'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <p className="font-medium">{m.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {m.date ? format(new Date(m.date), 'EEE d MMM yyyy') : 'No date'}
              </p>
            </button>
          ))}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!selected}
            onClick={() => onLinked(selected.id)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Confirm Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}