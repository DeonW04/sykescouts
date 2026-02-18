import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Trash2, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import LinkToProgrammeDialog from './LinkToProgrammeDialog';

export default function IdeaDetailPanel({ idea, sectionId, onClose, onUpdate, onDelete }) {
  const [notes, setNotes] = useState(idea.notes || '');
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  useEffect(() => { setNotes(idea.notes || ''); }, [idea.id]);

  const { data: badgeDefs = [] } = useQuery({
    queryKey: ['badgeDefsForIdea', idea.badge_ids],
    queryFn: async () => {
      if (!idea.badge_ids?.length) return [];
      const defs = await base44.entities.BadgeDefinition.filter({});
      return defs.filter(b => idea.badge_ids.includes(b.id));
    },
    enabled: !!idea.badge_ids?.length,
  });

  const handleSaveNotes = () => {
    onUpdate(idea.id, { notes });
    toast.success('Notes saved');
  };

  const handleDelete = () => {
    if (confirm('Delete this idea?')) onDelete(idea.id);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className={`${idea.color || 'bg-yellow-200'} px-5 pt-10 pb-5 relative`}>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
          {idea.source === 'ai_generated' && (
            <span className="inline-flex items-center gap-1 text-xs bg-white/60 text-purple-700 px-2 py-0.5 rounded-full mb-2 font-medium">
              <Sparkles className="w-3 h-3" /> AI Generated
            </span>
          )}
          {idea.status === 'added_to_programme' && (
            <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mb-2 font-medium ml-1">
              <CheckCircle className="w-3 h-3" /> Added to Programme
            </span>
          )}
          <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Georgia, serif' }}>
            {idea.title}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {idea.type === 'meeting' ? '📋 Meeting Idea' : '🏕️ Event Idea'}
            {idea.suggested_week && ` · 📅 ${idea.suggested_week}`}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {idea.description && (
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wide mb-1">Description</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{idea.description}</p>
            </div>
          )}

          {idea.ai_rationale && (
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
              <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Why this idea?</h3>
              <p className="text-xs text-purple-700 leading-relaxed">{idea.ai_rationale}</p>
            </div>
          )}

          {badgeDefs.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wide mb-2">Badge Focus</h3>
              <div className="flex flex-wrap gap-2">
                {badgeDefs.map(b => (
                  <span key={b.id} className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                    🏅 {b.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {idea.incidental_badge_names?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wide mb-2">Might Also Cover</h3>
              <div className="flex flex-wrap gap-2">
                {idea.incidental_badge_names.map((name, i) => (
                  <span key={i} className="bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-full font-medium border border-amber-200">
                    ✨ {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {idea.resources && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Resources & Equipment</h3>
              <p className="text-sm text-blue-800 leading-relaxed">🎒 {idea.resources}</p>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wide mb-1">Your Notes</h3>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any thoughts, materials needed, adaptations..."
              className="text-sm resize-none"
              rows={4}
            />
            <Button size="sm" variant="outline" onClick={handleSaveNotes} className="mt-2">
              Save Notes
            </Button>
          </div>

          <div className="text-xs text-gray-400 border-t pt-3">
            Added by <strong>{idea.added_by_name || 'Unknown'}</strong>
            {idea.created_date && ` on ${new Date(idea.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t bg-gray-50 flex gap-2">
          {idea.status !== 'added_to_programme' && (
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setShowLinkDialog(true)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Add to Programme
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={handleDelete} className="border-red-200 text-red-500 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {showLinkDialog && (
        <LinkToProgrammeDialog
          idea={idea}
          sectionId={sectionId}
          onClose={() => setShowLinkDialog(false)}
          onLinked={(programmeId) => {
            onUpdate(idea.id, { status: 'added_to_programme', linked_programme_id: programmeId });
            setShowLinkDialog(false);
            toast.success('Idea linked to programme meeting!');
          }}
        />
      )}
    </>
  );
}