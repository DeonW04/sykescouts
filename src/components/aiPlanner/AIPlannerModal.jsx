import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import IdeasTab from './tabs/IdeasTab';
import BadgeCriteriaTab from './tabs/BadgeCriteriaTab';
import NotableDatesTab from './tabs/NotableDatesTab';
import StyleTab from './tabs/StyleTab';

const TABS = [
  { id: 'ideas', label: '💡 Ideas Board', emoji: '💡' },
  { id: 'badges', label: '🏅 Badge Criteria', emoji: '🏅' },
  { id: 'dates', label: '📅 Notable Dates', emoji: '📅' },
  { id: 'style', label: '🎨 Notes & Style', emoji: '🎨' },
];

export default function AIPlannerModal({
  term, section, meetings, preFilled, sectionId,
  onClose, onGenerated
}) {
  const [activeTab, setActiveTab] = useState('ideas');
  const [selectedIdeas, setSelectedIdeas] = useState([]);
  const [selectedCriteria, setSelectedCriteria] = useState([]);
  const [notableDates, setNotableDates] = useState([]);
  const [sliders, setSliders] = useState({ adventure: 50, competition: 50, outdoor: 50, badgeFocus: 50 });
  const [notes, setNotes] = useState('');
  const [youthVoice, setYouthVoice] = useState('');
  const [theme, setTheme] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Dates that need planning
  const meetingDates = useMemo(() =>
    (meetings || [])
      .filter(m => !m.isHalfTerm)
      .map(m => (m.date instanceof Date ? m.date : new Date(m.date)).toISOString().split('T')[0]),
    [meetings]
  );

  const preFilledDates = useMemo(() =>
    (preFilled || []).map(p => ({ date: p.date, title: p.title })),
    [preFilled]
  );

  const totalSelected = selectedIdeas.length + selectedCriteria.length + notableDates.length;

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('generateAIProgramme', {
        term,
        section,
        meetingDates,
        preFilled: preFilledDates,
        selectedIdeas,
        selectedCriteria,
        notableDates,
        sliders,
        notes,
        youthVoice,
        theme,
        rejectedIdeas: [],
      });
      if (res.data?.error) throw new Error(res.data.error);
      onGenerated({
        meetings: res.data.meetings || [],
        engagement_score: res.data.engagement_score,
        engagement_summary: res.data.engagement_summary,
        sliders, notes, youthVoice, theme,
        preFilled: preFilledDates,
        meetingDates,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#004851] to-[#7413dc] px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">AI Programme Generator</h2>
                <p className="text-white/70 text-sm">{term?.title} · {meetingDates.length} meetings to plan</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.emoji}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === 'ideas' && (
                <IdeasTab
                  sectionId={sectionId}
                  selectedIdeas={selectedIdeas}
                  onChange={setSelectedIdeas}
                  meetingDates={meetingDates}
                />
              )}
              {activeTab === 'badges' && (
                <BadgeCriteriaTab
                  sectionId={sectionId}
                  section={section}
                  selectedCriteria={selectedCriteria}
                  onChange={setSelectedCriteria}
                />
              )}
              {activeTab === 'dates' && (
                <NotableDatesTab
                  term={term}
                  notableDates={notableDates}
                  onChange={setNotableDates}
                />
              )}
              {activeTab === 'style' && (
                <StyleTab
                  sliders={sliders}
                  onSlidersChange={setSliders}
                  notes={notes}
                  onNotesChange={setNotes}
                  youthVoice={youthVoice}
                  onYouthVoiceChange={setYouthVoice}
                  theme={theme}
                  onThemeChange={setTheme}
                  term={term}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sticky Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex-shrink-0">
          {error && (
            <div className="flex items-center gap-2 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Live summary */}
          <div className="flex items-center gap-4 mb-4 text-sm flex-wrap">
            <SummaryPill count={meetingDates.length} label="meetings to fill" color="blue" />
            <SummaryPill count={selectedIdeas.length} label="ideas selected" color="purple" />
            <SummaryPill count={selectedCriteria.length} label="criteria" color="green" />
            <SummaryPill count={notableDates.length} label="notable dates" color="amber" />
            {theme && <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded-full font-medium">🎭 {theme}</span>}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={generating} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || meetingDates.length === 0}
              className="flex-1 bg-gradient-to-r from-[#7413dc] to-[#004851] hover:opacity-90 text-white font-semibold text-base py-3 gap-2 shadow-lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating your programme...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Programme
                </>
              )}
            </Button>
          </div>
          {generating && (
            <p className="text-center text-sm text-gray-500 mt-2 animate-pulse">
              🤖 The AI is crafting an epic term programme — this takes about 20 seconds...
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function SummaryPill({ count, label, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`${colors[color]} px-2 py-1 rounded-full font-medium`}>
      {count} {label}
    </span>
  );
}