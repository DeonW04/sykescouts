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

export default function SectionTransitionOverlay({ fromSection, toSection, onComplete }) {
  const [phase, setPhase] = useState('fade-in'); // fade-in | show | fade-out

  const [slideDir] = useState(() => {
    const order = ['squirrels', 'beavers', 'cubs', 'scouts', 'explorers'];
    const fromIdx = order.indexOf((fromSection?.name || '').toLowerCase());
    const toIdx = order.indexOf((toSection?.name || '').toLowerCase());
    return toIdx >= fromIdx ? 1 : -1;
  });

  const fromStyle = getStyle(fromSection?.name);
  const toStyle = getStyle(toSection?.name);

  useEffect(() => {
    // fade-in: 400ms → slide: 600ms → hold: 1000ms → fade-out: 500ms
    const t1 = setTimeout(() => setPhase('show'), 400);
    // Call onComplete (switches the section) at the START of fade-out,
    // so the page loads behind the animation.
    // 400 (fade-in) + 600 (slide) + 1000 (hold) = 2000ms
    const t2 = setTimeout(() => {
      setPhase('fade-out');
      onComplete();
    }, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] overflow-hidden"
      animate={{ opacity: phase === 'fade-out' ? 0 : 1 }}
      transition={phase === 'fade-out' ? { duration: 0.5, ease: 'easeInOut' } : { duration: 0 }}
    >
      {/* Fade-in layer — FROM colour, fades in then is replaced by slide */}
      {phase === 'fade-in' && (
        <motion.div
          className="absolute inset-0"
          style={{ backgroundColor: fromStyle.bg }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        />
      )}

      {/* Slide phase */}
      {(phase === 'show' || phase === 'fade-out') && (
        <div className="absolute inset-0 overflow-hidden">
          {/* FROM — slides out */}
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ backgroundColor: fromStyle.bg }}
            initial={{ x: 0 }}
            animate={{ x: `${-slideDir * 100}%` }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          >
            <span className="text-8xl mb-6 select-none">{fromStyle.emoji}</span>
            <h1 className="text-5xl font-extrabold tracking-wide text-white select-none">
              {fromSection?.display_name || fromSection?.name}
            </h1>
          </motion.div>

          {/* TO — slides in */}
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ backgroundColor: toStyle.bg }}
            initial={{ x: `${slideDir * 100}%` }}
            animate={{ x: 0 }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          >
            <span className="text-8xl mb-6 select-none">{toStyle.emoji}</span>
            <h1 className="text-5xl font-extrabold tracking-wide text-white select-none">
              {toSection?.display_name || toSection?.name}
            </h1>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}