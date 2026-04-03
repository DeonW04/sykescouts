import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, X, GripVertical, Calendar, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PLACEMENTS = [
  { value: 'start', label: '🌱 Start of term' },
  { value: 'middle', label: '🔥 Middle of term' },
  { value: 'end', label: '🏁 End of term' },
  { value: 'flexible', label: '🎲 Flexible (AI places)' },
];

export default function IdeasTab({ sectionId, selectedIdeas, onChange, meetingDates }) {
  const [search, setSearch] = useState('');
  const [datePickingFor, setDatePickingFor] = useState(null);

  const { data: ideas = [] } = useQuery({
    queryKey: ['programmeIdeas', sectionId],
    queryFn: () => base44.entities.ProgrammeIdea.filter({ section_id: sectionId }),
    enabled: !!sectionId,
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges-light'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const filteredIdeas = ideas.filter(i =>
    i.status !== 'added_to_programme' &&
    (i.title?.toLowerCase().includes(search.toLowerCase()) ||
      i.description?.toLowerCase().includes(search.toLowerCase()))
  );

  const isSelected = (id) => selectedIdeas.some(s => s.id === id);

  const toggle = (idea) => {
    if (isSelected(idea.id)) {
      onChange(selectedIdeas.filter(s => s.id !== idea.id));
    } else {
      onChange([...selectedIdeas, { ...idea, placement: 'flexible', preferredDate: null }]);
    }
  };

  const updateSelected = (ideaId, updates) => {
    onChange(selectedIdeas.map(s => s.id === ideaId ? { ...s, ...updates } : s));
  };

  const removeSelected = (ideaId) => {
    onChange(selectedIdeas.filter(s => s.id !== ideaId));
  };

  const getBadgeName = (id) => badges.find(b => b.id === id)?.name || id;

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[500px]">
      {/* Left: Idea Grid */}
      <div className="flex-1 p-5 overflow-y-auto border-r border-gray-100">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search ideas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{filteredIdeas.length} ideas available · Click to select</p>
        </div>

        {filteredIdeas.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">💡</p>
            <p>No ideas found. Add some to your Ideas Board first!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredIdeas.map((idea) => {
              const selected = isSelected(idea.id);
              return (
                <motion.button
                  key={idea.id}
                  onClick={() => toggle(idea)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`text-left p-4 rounded-xl border-2 transition-all duration-200 relative ${
                    selected
                      ? 'border-[#7413dc] bg-purple-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  {selected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-[#7413dc] rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className={`w-3 h-3 rounded-full mb-2 ${idea.color?.replace('bg-', 'bg-') || 'bg-yellow-300'}`} />
                  <h4 className="font-semibold text-sm text-gray-900 line-clamp-1 pr-6">{idea.title}</h4>
                  {idea.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{idea.description}</p>
                  )}
                  {idea.badge_ids?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {idea.badge_ids.slice(0, 2).map(bid => (
                        <span key={bid} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          {getBadgeName(bid)}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Selected Panel */}
      <div className="lg:w-72 p-5 bg-gray-50 overflow-y-auto">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Selected Ideas
          {selectedIdeas.length > 0 && (
            <Badge className="bg-[#7413dc] text-white ml-auto">{selectedIdeas.length}</Badge>
          )}
        </h3>

        {selectedIdeas.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p className="text-3xl mb-2">👈</p>
            <p>Select ideas from the grid</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {selectedIdeas.map((idea) => (
                <motion.div
                  key={idea.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-xs text-gray-900 line-clamp-2 flex-1">{idea.title}</h4>
                    <button onClick={() => removeSelected(idea.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Placement */}
                  <div className="mt-2">
                    <Select value={idea.placement || 'flexible'} onValueChange={v => updateSelected(idea.id, { placement: v, preferredDate: null })}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLACEMENTS.map(p => (
                          <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
                        ))}
                        <SelectItem value="specific" className="text-xs">📌 Specific date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Specific date picker */}
                  {idea.placement === 'specific' && (
                    <div className="mt-2">
                      <select
                        value={idea.preferredDate || ''}
                        onChange={e => updateSelected(idea.id, { preferredDate: e.target.value })}
                        className="w-full text-xs border border-gray-200 rounded-lg p-1.5 bg-white"
                      >
                        <option value="">Select date...</option>
                        {meetingDates.map(d => (
                          <option key={d} value={d}>{new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}