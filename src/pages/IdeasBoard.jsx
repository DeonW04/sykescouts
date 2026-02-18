import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSectionContext } from '../components/leader/SectionContext';
import LeaderNav from '../components/leader/LeaderNav';
import PostItNote from '../components/ideasBoard/PostItNote.jsx';
import IdeaDetailPanel from '../components/ideasBoard/IdeaDetailPanel.jsx';
import GenerateIdeasModal from '../components/ideasBoard/GenerateIdeasModal.jsx';
import NewIdeaDialog from '../components/ideasBoard/NewIdeaDialog.jsx';

const POSTIT_COLORS = [
  'bg-yellow-200', 'bg-pink-200', 'bg-blue-200', 'bg-green-200',
  'bg-orange-200', 'bg-purple-200', 'bg-rose-200', 'bg-teal-200'
];

function getSmartPosition(existing, boardW, boardH, noteW = 220, noteH = 200) {
  const maxAttempts = 80;
  const pad = 20;
  for (let i = 0; i < maxAttempts; i++) {
    const x = pad + Math.random() * (boardW - noteW - pad * 2);
    const y = pad + Math.random() * (boardH - noteH - pad * 2);
    const overlaps = existing.some(e => {
      const ex = (e.pos_x / 100) * boardW;
      const ey = (e.pos_y / 100) * boardH;
      return Math.abs(ex - x) < noteW + 10 && Math.abs(ey - y) < noteH + 10;
    });
    if (!overlaps) return { x: (x / boardW) * 100, y: (y / boardH) * 100 };
  }
  // fallback: just place it without overlap check
  const x = pad + Math.random() * (boardW - noteW - pad * 2);
  const y = pad + Math.random() * (boardH - noteH - pad * 2);
  return { x: (x / boardW) * 100, y: (y / boardH) * 100 };
}

export default function IdeasBoard() {
  const { selectedSection, availableSections, user } = useSectionContext();
  const queryClient = useQueryClient();
  const boardRef = useRef(null);

  const { data: leaderRecord } = useQuery({
    queryKey: ['leaderRecord', user?.id],
    queryFn: async () => {
      const leaders = await base44.entities.Leader.filter({ user_id: user.id });
      return leaders[0] || null;
    },
    enabled: !!user?.id,
  });

  const displayName = leaderRecord?.display_name || user?.full_name || 'Unknown';

  const [activeTab, setActiveTab] = useState('meeting');
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showNewIdeaDialog, setShowNewIdeaDialog] = useState(false);

  const section = availableSections.find(s => s.id === selectedSection);

  const { data: ideas = [] } = useQuery({
    queryKey: ['programmeIdeas', selectedSection],
    queryFn: () => selectedSection
      ? base44.entities.ProgrammeIdea.filter({ section_id: selectedSection })
      : [],
    enabled: !!selectedSection,
  });

  const updateIdeaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProgrammeIdea.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['programmeIdeas', selectedSection] }),
  });

  const deleteIdeaMutation = useMutation({
    mutationFn: (id) => base44.entities.ProgrammeIdea.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programmeIdeas', selectedSection] });
      setSelectedIdea(null);
    },
  });

  const handleDragEnd = useCallback((id, newX, newY) => {
    updateIdeaMutation.mutate({ id, data: { pos_x: newX, pos_y: newY } });
  }, [updateIdeaMutation]);

  const handleAddIdea = async (ideaData) => {
    const board = boardRef.current;
    const boardW = board?.offsetWidth || 1200;
    const boardH = Math.max(board?.offsetHeight || 800, 800);
    const pos = getSmartPosition(ideas.filter(i => i.type === ideaData.type), boardW, boardH);
    const rotation = (Math.random() - 0.5) * 6;
    const color = POSTIT_COLORS[Math.floor(Math.random() * POSTIT_COLORS.length)];
    await base44.entities.ProgrammeIdea.create({
      ...ideaData,
      section_id: selectedSection,
      pos_x: pos.x,
      pos_y: pos.y,
      rotation,
      color,
      added_by_id: user?.id,
      added_by_name: displayName,
      source: 'manual',
      status: 'active',
    });
    queryClient.invalidateQueries({ queryKey: ['programmeIdeas', selectedSection] });
    setShowNewIdeaDialog(false);
  };

  const handleAddAIIdeas = async (newIdeas) => {
    const board = boardRef.current;
    const boardW = board?.offsetWidth || 1200;
    const boardH = Math.max(board?.offsetHeight || 800, 800);
    const placed = [...ideas];
    for (const idea of newIdeas) {
      const pos = getSmartPosition(placed, boardW, boardH);
      const rotation = (Math.random() - 0.5) * 6;
      const color = POSTIT_COLORS[Math.floor(Math.random() * POSTIT_COLORS.length)];
      const created = await base44.entities.ProgrammeIdea.create({
        ...idea,
        section_id: selectedSection,
        pos_x: pos.x,
        pos_y: pos.y,
        rotation,
        color,
        added_by_id: user?.id,
        added_by_name: displayName,
        source: 'ai_generated',
        status: 'active',
      });
      placed.push({ ...idea, pos_x: pos.x, pos_y: pos.y });
    }
    queryClient.invalidateQueries({ queryKey: ['programmeIdeas', selectedSection] });
    setShowGenerateModal(false);
  };

  const tabIdeas = ideas.filter(i => i.type === activeTab && i.status === 'active');
  const addedIdeas = ideas.filter(i => i.type === activeTab && i.status === 'added_to_programme');

  // Board minimum height based on number of notes
  const minBoardH = Math.max(700, Math.ceil(tabIdeas.length / 4) * 280 + 120);

  return (
    <div className="min-h-screen" style={{ background: '#f5f0e8' }}>
      <LeaderNav />
      <div className="max-w-full px-4 sm:px-6 lg:px-8 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Georgia, serif' }}>
              💡 Ideas Board
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {section ? `${section.display_name} section` : 'Select a section above'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNewIdeaDialog(true)}
              className="flex items-center gap-2 border-gray-400"
              disabled={!selectedSection}
            >
              <Plus className="w-4 h-4" /> Add Idea
            </Button>
            <Button
              onClick={() => setShowGenerateModal(true)}
              disabled={!selectedSection}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              ✨ Generate Ideas
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 bg-amber-100/60 rounded-xl p-1 w-fit border border-amber-200">
          {[
            { key: 'meeting', label: '📋 Meetings' },
            { key: 'event', label: '🏕️ Events' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-white text-gray-800 shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="tabIndicator"
                  className="absolute inset-0 bg-white rounded-lg shadow-md -z-10"
                />
              )}
            </button>
          ))}
        </div>

        {!selectedSection ? (
          <div className="flex items-center justify-center h-96 text-gray-400 text-lg">
            Please select a section using the selector above
          </div>
        ) : (
          <>
            {/* Cork Board */}
            <div
              ref={boardRef}
              className="relative w-full rounded-2xl border-4 border-amber-800/30 shadow-2xl overflow-x-hidden"
              style={{
                minHeight: `${minBoardH}px`,
                background: `
                  radial-gradient(ellipse at 20% 30%, rgba(180,120,60,0.18) 0%, transparent 60%),
                  radial-gradient(ellipse at 80% 70%, rgba(160,100,40,0.12) 0%, transparent 60%),
                  repeating-linear-gradient(
                    45deg,
                    rgba(180,130,60,0.04) 0px,
                    rgba(180,130,60,0.04) 2px,
                    transparent 2px,
                    transparent 12px
                  ),
                  #c8a96e
                `,
                boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.18), 0 4px 24px rgba(0,0,0,0.15)',
              }}
            >
              {/* Board texture dots */}
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle, rgba(100,60,20,0.08) 1px, transparent 1px)',
                backgroundSize: '18px 18px',
              }} />

              <AnimatePresence>
                {tabIdeas.map(idea => (
                  <PostItNote
                    key={idea.id}
                    idea={idea}
                    boardRef={boardRef}
                    onClick={() => setSelectedIdea(idea)}
                    onDragEnd={handleDragEnd}
                    isSelected={selectedIdea?.id === idea.id}
                  />
                ))}
              </AnimatePresence>

              {tabIdeas.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="bg-white/50 rounded-2xl px-8 py-6 text-center backdrop-blur-sm">
                    <p className="text-2xl mb-2">📌</p>
                    <p className="text-gray-600 font-medium">No ideas yet for {activeTab}s</p>
                    <p className="text-gray-400 text-sm mt-1">Add one manually or use ✨ Generate Ideas</p>
                  </div>
                </div>
              )}
            </div>

            {/* Added to programme section */}
            {addedIdeas.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  ✅ Added to Programme ({addedIdeas.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {addedIdeas.map(idea => (
                    <div
                      key={idea.id}
                      onClick={() => setSelectedIdea(idea)}
                      className={`${idea.color || 'bg-yellow-200'} rounded-lg p-3 cursor-pointer opacity-60 hover:opacity-80 transition-opacity shadow`}
                    >
                      <p className="text-xs font-semibold text-gray-700 line-clamp-2">{idea.title}</p>
                      <p className="text-xs text-gray-500 mt-1">Added to programme</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Side Panel */}
      <AnimatePresence>
        {selectedIdea && (
          <IdeaDetailPanel
            idea={selectedIdea}
            sectionId={selectedSection}
            onClose={() => setSelectedIdea(null)}
            onUpdate={(id, data) => {
              updateIdeaMutation.mutate({ id, data });
              setSelectedIdea(prev => ({ ...prev, ...data }));
            }}
            onDelete={(id) => deleteIdeaMutation.mutate(id)}
          />
        )}
      </AnimatePresence>

      {/* Generate Modal */}
      {showGenerateModal && (
        <GenerateIdeasModal
          sectionId={selectedSection}
          section={section}
          activeTab={activeTab}
          user={user}
          onClose={() => setShowGenerateModal(false)}
          onAdd={handleAddAIIdeas}
        />
      )}

      {/* New Idea Dialog */}
      {showNewIdeaDialog && (
        <NewIdeaDialog
          defaultType={activeTab}
          onClose={() => setShowNewIdeaDialog(false)}
          onSave={handleAddIdea}
        />
      )}
    </div>
  );
}