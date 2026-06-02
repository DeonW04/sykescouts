import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

// Subtle accent dot per section — kept minimal, no full-screen colour washes.
const SECTION_ACCENT = {
  squirrels: '#e11d48',
  beavers: '#006ddf',
  cubs: '#23a950',
  scouts: '#004851',
  explorers: '#1e3a8a',
};

const getAccent = (name) => SECTION_ACCENT[(name || '').toLowerCase()] || '#7413dc';

export default function SectionTransitionOverlay({ toSection, onComplete }) {
  useEffect(() => {
    // Short, clean transition — fade in, brief hold, fade out.
    const t = setTimeout(onComplete, 750);
    return () => clearTimeout(t);
  }, []);

  const accent = getAccent(toSection?.name);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ backgroundColor: '#ffffffff' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex flex-col items-center"
      >
        <span
          className="w-2.5 h-2.5 rounded-full mb-4"
          style={{ backgroundColor: accent }}
        />
        <h1 className="text-3xl font-bold text-white tracking-tight select-none">
          {toSection?.display_name || toSection?.name}
        </h1>
      </motion.div>
    </motion.div>
  );
}