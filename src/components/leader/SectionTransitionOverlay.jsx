import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const SECTION_COLORS = {
  squirrels: { bg: 'from-red-500 to-red-600', text: 'text-white', emoji: '🐿️' },
  beavers:   { bg: 'from-amber-500 to-amber-600', text: 'text-white', emoji: '🦫' },
  cubs:      { bg: 'from-yellow-400 to-yellow-500', text: 'text-gray-900', emoji: '🐻' },
  scouts:    { bg: 'from-green-600 to-green-700', text: 'text-white', emoji: '⚜️' },
  explorers: { bg: 'from-blue-600 to-blue-700', text: 'text-white', emoji: '🧭' },
};

const getStyle = (sectionName) => {
  const key = (sectionName || '').toLowerCase();
  return SECTION_COLORS[key] || { bg: 'from-purple-600 to-purple-700', text: 'text-white', emoji: '⭐' };
};

// Phase: 'idle' | 'fade-in' | 'slide' | 'fade-out'
export default function SectionTransitionOverlay({ fromSection, toSection, onComplete }) {
  const [phase, setPhase] = useState('fade-in');
  const [slideDir] = useState(() => {
    // Determine slide direction based on section order
    const order = ['squirrels', 'beavers', 'cubs', 'scouts', 'explorers'];
    const fromIdx = order.indexOf((fromSection?.name || '').toLowerCase());
    const toIdx = order.indexOf((toSection?.name || '').toLowerCase());
    return toIdx >= fromIdx ? 1 : -1; // 1 = slide left (new comes from right), -1 = slide right
  });

  const fromStyle = getStyle(fromSection?.name);
  const toStyle = getStyle(toSection?.name);

  useEffect(() => {
    // Phase 1: white flash in (600ms)
    const t1 = setTimeout(() => setPhase('slide'), 600);
    // Phase 2: slide (700ms)
    const t2 = setTimeout(() => setPhase('fade-out'), 1300);
    // Phase 3: white flash out (600ms) then done
    const t3 = setTimeout(() => onComplete(), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-all overflow-hidden">
      {/* White flash layers */}
      <AnimatePresence>
        {phase === 'fade-in' && (
          <motion.div
            key="flash-in"
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      {/* Section slide area */}
      {(phase === 'slide' || phase === 'fade-out') && (
        <div className="absolute inset-0 flex overflow-hidden">
          {/* FROM section — slides out */}
          <motion.div
            className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br ${fromStyle.bg}`}
            initial={{ x: 0 }}
            animate={{ x: `${-slideDir * 100}%` }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          >
            <span className="text-8xl mb-6 select-none">{fromStyle.emoji}</span>
            <h1 className={`text-5xl font-extrabold tracking-wide ${fromStyle.text} select-none`}>
              {fromSection?.display_name || fromSection?.name}
            </h1>
          </motion.div>

          {/* TO section — slides in */}
          <motion.div
            className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br ${toStyle.bg}`}
            initial={{ x: `${slideDir * 100}%` }}
            animate={{ x: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          >
            <span className="text-8xl mb-6 select-none">{toStyle.emoji}</span>
            <h1 className={`text-5xl font-extrabold tracking-wide ${toStyle.text} select-none`}>
              {toSection?.display_name || toSection?.name}
            </h1>
          </motion.div>
        </div>
      )}

      {/* White flash out */}
      <AnimatePresence>
        {phase === 'fade-out' && (
          <motion.div
            key="flash-out"
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut', delay: 0.55 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}