import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const SECTION_COLORS = {
  squirrels: { bg: '#e11d48', text: 'text-white', emoji: '🐿️' },
  beavers:   { bg: '#006ddf', text: 'text-white', emoji: '🦫' },
  cubs:      { bg: '#23a950', text: 'text-white', emoji: '🐻' },
  scouts:    { bg: '#004851', text: 'text-white', emoji: '⚜️' },
  explorers: { bg: '#1e3a8a', text: 'text-white', emoji: '🧭' },
};

const getStyle = (sectionName) => {
  const key = (sectionName || '').toLowerCase();
  return SECTION_COLORS[key] || { bg: '#7413dc', text: 'text-white', emoji: '⭐' };
};

// Phase: 'fade-in' | 'slide' | 'fade-out'
export default function SectionTransitionOverlay({ fromSection, toSection, onComplete }) {
  const [phase, setPhase] = useState('fade-in');
  const [slideDir] = useState(() => {
    const order = ['squirrels', 'beavers', 'cubs', 'scouts', 'explorers'];
    const fromIdx = order.indexOf((fromSection?.name || '').toLowerCase());
    const toIdx = order.indexOf((toSection?.name || '').toLowerCase());
    return toIdx >= fromIdx ? 1 : -1;
  });

  const fromStyle = getStyle(fromSection?.name);
  const toStyle = getStyle(toSection?.name);

  useEffect(() => {
    // Phase 1: colour fade-in over FROM section (500ms)
    const t1 = setTimeout(() => setPhase('slide'), 500);
    // Phase 2: slide (600ms)
    const t2 = setTimeout(() => setPhase('fade-out'), 1100);
    // Phase 3: colour fade-out (500ms) then done
    const t3 = setTimeout(() => onComplete(), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Colour fade-in overlay (FROM section colour) */}
      {phase === 'fade-in' && (
        <motion.div
          className="absolute inset-0"
          style={{ backgroundColor: fromStyle.bg }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
        />
      )}

      {/* Section slide area */}
      {(phase === 'slide' || phase === 'fade-out') && (
        <div className="absolute inset-0 overflow-hidden">
          {/* FROM section — slides out */}
          <motion.div
            className={`absolute inset-0 flex flex-col items-center justify-center ${fromStyle.text}`}
            style={{ backgroundColor: fromStyle.bg }}
            initial={{ x: 0 }}
            animate={{ x: `${-slideDir * 100}%` }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          >
            <span className="text-8xl mb-6 select-none">{fromStyle.emoji}</span>
            <h1 className={`text-5xl font-extrabold tracking-wide select-none`}>
              {fromSection?.display_name || fromSection?.name}
            </h1>
          </motion.div>

          {/* TO section — slides in */}
          <motion.div
            className={`absolute inset-0 flex flex-col items-center justify-center ${toStyle.text}`}
            style={{ backgroundColor: toStyle.bg }}
            initial={{ x: `${slideDir * 100}%` }}
            animate={{ x: 0 }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          >
            <span className="text-8xl mb-6 select-none">{toStyle.emoji}</span>
            <h1 className={`text-5xl font-extrabold tracking-wide select-none`}>
              {toSection?.display_name || toSection?.name}
            </h1>
          </motion.div>
        </div>
      )}

      {/* Colour fade-out overlay (TO section colour fades to transparent) */}
      {phase === 'fade-out' && (
        <motion.div
          className="absolute inset-0"
          style={{ backgroundColor: toStyle.bg }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1, ease: 'easeIn', delay: 0.5 }}
        />
      )}
      {phase === 'fade-out' && (
        <motion.div
          className="absolute inset-0"
          style={{ backgroundColor: toStyle.bg }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.55 }}
        />
      )}
    </div>
  );
}