import React from 'react';
import BadgeHex from './BadgeHex';

// ─── Badge cluster — fixed-coordinate uniform layout ──────────────────────────
// The badge PNGs are complete hexagons. We position them absolutely so they
// interlock like sewn badges on a Scout uniform.
//
// A pointy-top hexagon of width W has height H = W * 1.1547 (since H = W / cos30).
// But these PNGs are flat-top hexes inside a square-ish transparent canvas.
// For flat-top hexagons that tessellate:
//   horizontal centre spacing = W * 0.75   (columns overlap by 1/4)
//   vertical   centre spacing = W * 0.866  (rows stacked by full hex-height)
// The reference image uses pointy-top hexes stacked in a pyramid:
//   horizontal spacing between adjacent in a row = W (touching sides)
//   each lower row is offset by W/2 and moved up so points interlock.
//
// Reference (Scouts, pointy-top pyramid):
//   Row1: 1 badge   (Gold award, larger)
//   Row2: 2 badges
//   Row3: 3 badges
//   Row4: 4 badges
// Cubs (Silver):
//   Row1: 1, Row2: 2, Row3: 3, Row4: 2

export default function BadgeCluster({
  awardBadge,
  challengeBadges,   // ordered array
  isSilver,
  isEarned,          // (id) => bool
  getBadgePercentage,// (id) => number
  awardEarned,
  accentColor,
  onBadgeClick,      // (badge) => void
  onAwardClick,      // () => void
}) {
  // Sizes
  const W = 92;              // challenge badge width (px)
  const AWARD_W = 116;       // gold/silver award width — larger focal point

  // Pointy-top hex geometry for tessellation
  const H = W * 1.1547;      // full height of a pointy-top hex
  const colStep = W + 1;     // horizontal centre-to-centre (touching, ~1px gap)
  const rowStep = H * 0.75 - 1; // vertical centre-to-centre (interlock, slight overlap)

  // Build the rows
  const rows = isSilver
    ? [
        [{ award: true }],
        [challengeBadges[0], challengeBadges[1]],
        [challengeBadges[2], challengeBadges[3], challengeBadges[4]],
        [challengeBadges[5], challengeBadges[6]],
      ]
    : [
        [{ award: true }],
        [challengeBadges[0], challengeBadges[1]],
        [challengeBadges[2], challengeBadges[3], challengeBadges[4]],
        [challengeBadges[5], challengeBadges[6], challengeBadges[7], challengeBadges[8]],
      ];

  const maxCols = Math.max(...rows.map(r => r.length));
  const clusterWidth = maxCols * colStep;
  const clusterHeight = rows.length * rowStep + (H - rowStep) + (AWARD_W - W);

  // Compute absolute positions (centre x of each badge), centring each row
  const items = [];
  rows.forEach((row, rowIdx) => {
    const count = row.length;
    const rowWidth = (count - 1) * colStep;
    const startX = (clusterWidth - rowWidth) / 2; // centre the row in the cluster

    row.forEach((cell, colIdx) => {
      const isAward = cell?.award;
      const badge = isAward ? awardBadge : cell;
      const bw = isAward ? AWARD_W : W;
      const cx = startX + colIdx * colStep;     // centre x
      // y baseline: award row pushed up a touch since it's bigger
      const cy = rowIdx * rowStep + (AWARD_W - W) / 2;

      items.push({
        key: isAward ? 'award' : (badge?.id || `${rowIdx}-${colIdx}`),
        badge,
        isAward,
        width: bw,
        left: cx - bw / 2,
        top: cy - (bw - W) / 2,
      });
    });
  });

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '0 8px' }}>
      <div style={{ position: 'relative', width: clusterWidth, height: clusterHeight }}>
        {items.map(item => (
          <BadgeHex
            key={item.key}
            badge={item.badge}
            width={item.width}
            left={item.left}
            top={item.top}
            isEarned={item.isAward ? awardEarned : (item.badge ? isEarned(item.badge.id) : false)}
            percentage={item.isAward ? 0 : (item.badge ? getBadgePercentage(item.badge.id) : 0)}
            onClick={() => (item.isAward ? onAwardClick() : (item.badge && onBadgeClick(item.badge)))}
            accentColor={accentColor}
          />
        ))}
      </div>
    </div>
  );
}