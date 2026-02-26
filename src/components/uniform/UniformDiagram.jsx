import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const POSITION_LABELS = {
  left_sleeve_upper: 'Left Sleeve (Upper)',
  left_sleeve_lower: 'Left Sleeve (Lower)',
  right_sleeve: 'Right Sleeve',
  left_chest_upper: 'Left Chest (Upper)',
  left_chest_lower: 'Left Chest (Lower)',
  right_chest_upper: 'Right Chest (Upper)',
  right_chest_lower: 'Right Chest (Lower)',
};

// Default dot positions (% of image width/height) for each section
const DEFAULT_POSITIONS = {
  scouts: {
    left_sleeve_upper:  { x: 22, y: 38 },
    left_sleeve_lower:  { x: 22, y: 55 },
    right_sleeve:       { x: 78, y: 45 },
    left_chest_upper:   { x: 35, y: 30 },
    left_chest_lower:   { x: 35, y: 42 },
    right_chest_upper:  { x: 65, y: 30 },
    right_chest_lower:  { x: 65, y: 42 },
  },
  cubs: {
    left_sleeve_upper:  { x: 22, y: 38 },
    left_sleeve_lower:  { x: 22, y: 55 },
    right_sleeve:       { x: 78, y: 45 },
    left_chest_upper:   { x: 35, y: 30 },
    left_chest_lower:   { x: 35, y: 42 },
    right_chest_upper:  { x: 65, y: 30 },
    right_chest_lower:  { x: 65, y: 42 },
  },
  beavers: {
    left_sleeve_upper:  { x: 22, y: 38 },
    left_sleeve_lower:  { x: 22, y: 55 },
    right_sleeve:       { x: 78, y: 45 },
    left_chest_upper:   { x: 35, y: 30 },
    left_chest_lower:   { x: 35, y: 42 },
    right_chest_upper:  { x: 65, y: 30 },
    right_chest_lower:  { x: 65, y: 42 },
  },
};

export default function UniformDiagram({ uniformConfig, earnedBadges, allBadges, onBadgeClick }) {
  const [activePosition, setActivePosition] = useState(null);
  const [imgSize, setImgSize] = useState(null);
  const imgRef = React.useRef(null);
  const sectionName = uniformConfig?.section || 'scouts';

  const imageUrl = uniformConfig?.image_url || null;
  const dotPositions = uniformConfig?.dot_positions || DEFAULT_POSITIONS[sectionName] || DEFAULT_POSITIONS.scouts;

  // Group earned badges by uniform_position
  const badgesByPosition = {};
  (earnedBadges || []).forEach(eb => {
    const badge = allBadges.find(b => b.id === eb.badge_id);
    if (badge?.uniform_position) {
      if (!badgesByPosition[badge.uniform_position]) badgesByPosition[badge.uniform_position] = [];
      badgesByPosition[badge.uniform_position].push(badge);
    }
  });

  const positions = Object.keys(POSITION_LABELS);

  const handleImageLoad = () => {
    if (imgRef.current) {
      setImgSize({ w: imgRef.current.offsetWidth, h: imgRef.current.offsetHeight });
    }
  };

  return (
    <div className="relative w-full">
      {imageUrl ? (
        <div className="relative w-full">
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Uniform diagram"
            className="w-full rounded-xl object-contain block"
            style={{ maxHeight: 480 }}
            onLoad={handleImageLoad}
          />
          {/* Dot overlays — positioned relative to the rendered image size */}
          {imgSize && positions.map(pos => {
            const coords = dotPositions[pos];
            if (!coords) return null;
            const badges = badgesByPosition[pos] || [];
            const hasEarned = badges.length > 0;
            // coords are % of image natural size, apply directly as % of rendered image
            return (
              <button
                key={pos}
                onClick={() => setActivePosition(activePosition === pos ? null : pos)}
                style={{ left: `${coords.x}%`, top: `${coords.y}%`, transform: 'translate(-50%, -50%)' }}
                className={`absolute z-10 rounded-full border-2 shadow-lg transition-all hover:scale-110 focus:outline-none
                  ${hasEarned
                    ? 'w-8 h-8 bg-yellow-400 border-yellow-600 text-yellow-900'
                    : 'w-7 h-7 bg-white/80 border-gray-400 text-gray-500'}
                  ${activePosition === pos ? 'ring-4 ring-purple-400 scale-110' : ''}
                `}
                title={POSITION_LABELS[pos]}
              >
                <span className="text-xs font-bold">{badges.length > 0 ? badges.length : '+'}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center">
          <p className="text-gray-500 text-sm">No uniform image uploaded yet.<br/>Upload one in Admin Settings → Uniform Guide.</p>
        </div>
      )}

      {/* Position popup */}
      <AnimatePresence>
        {activePosition && (
          <motion.div
            key={activePosition}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-4 bg-white rounded-xl border shadow-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">{POSITION_LABELS[activePosition]}</h3>
              <button onClick={() => setActivePosition(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            {(badgesByPosition[activePosition] || []).length === 0 ? (
              <p className="text-gray-500 text-sm">No earned badges for this position.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {(badgesByPosition[activePosition] || []).map(badge => (
                  <button
                    key={badge.id}
                    onClick={() => onBadgeClick && onBadgeClick(badge)}
                    className="flex flex-col items-center gap-1 hover:scale-105 transition-transform"
                  >
                    <img src={badge.image_url} alt={badge.name} className="w-14 h-14 rounded-lg object-contain border" />
                    <span className="text-xs text-center text-gray-700 max-w-16 leading-tight">{badge.name}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Section example image */}
            {(() => {
              const exampleImg = (uniformConfig?.section_example_images || []).find(i => i.position === activePosition);
              if (!exampleImg) return null;
              return (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-2">Example:</p>
                  <img src={exampleImg.image_url} alt={exampleImg.label} className="h-28 rounded-lg object-cover" />
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}