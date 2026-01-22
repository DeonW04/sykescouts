import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit2, Check, Link as LinkIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export default function ActionRequiredBlock({ data, onUpdate, isEditing, setIsEditing }) {
  const [searchTerm, setSearchTerm] = useState(data.searchTerm || '');
  const [linkedId, setLinkedId] = useState(data.linkedId || '');
  const [selectedActions, setSelectedActions] = useState(data.selectedActions || []);

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.filter({}),
  });

  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes'],
    queryFn: () => base44.entities.Programme.filter({}),
  });

  const { data: linkedActions = [] } = useQuery({
    queryKey: ['action-required', linkedId],
    queryFn: () => linkedId ? base44.entities.ActionRequired.filter({ 
      required: true,
      $or: [
        { event_id: linkedId },
        { programme_id: linkedId }
      ]
    }) : [],
    enabled: !!linkedId,
  });

  const allItems = [...events.map(e => ({ id: e.id, name: e.title, type: 'event' })), 
                     ...programmes.map(p => ({ id: p.id, name: p.title, type: 'programme' }))];
  
  const filtered = allItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSave = () => {
    if (!linkedId) {
      alert('Please select an event or meeting');
      return;
    }
    onUpdate({ searchTerm, linkedId, selectedActions });
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-lg mb-2">Actions Required</p>
          <p className="text-sm text-gray-600 mb-3">{selectedActions.length} actions selected</p>
          <Button variant="outline" size="sm" asChild>
            <a href={createPageUrl('ParentDashboard')} target="_blank" rel="noopener noreferrer">
              <LinkIcon className="w-4 h-4 mr-2" />
              Parent Portal
            </a>
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      <div>
        <label className="text-sm font-medium block mb-2">Search Event or Meeting</label>
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search..."
          className="mb-2"
        />
        {searchTerm && (
          <div className="border rounded-lg max-h-40 overflow-y-auto">
            {filtered.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setLinkedId(item.id);
                  setSearchTerm('');
                  setSelectedActions([]);
                }}
                className="w-full p-2 text-left hover:bg-gray-100 border-b last:border-b-0 text-sm"
              >
                {item.name} <span className="text-gray-500">({item.type})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {linkedId && (
        <div>
          <label className="text-sm font-medium block mb-2">Actions (showing required only)</label>
          <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
            {linkedActions.length > 0 ? (
              linkedActions.map(action => (
                <div key={action.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedActions.includes(action.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedActions([...selectedActions, action.id]);
                      } else {
                        setSelectedActions(selectedActions.filter(id => id !== action.id));
                      }
                    }}
                  />
                  <span className="text-sm">{action.title}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No required actions for this item</p>
            )}
          </div>
        </div>
      )}

      <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" size="sm">
        <Check className="w-4 h-4 mr-1" />
        Save
      </Button>
    </div>
  );
}