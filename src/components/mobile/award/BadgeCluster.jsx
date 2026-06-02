import React, { useState, useEffect, useRef } from 'react';
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
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Sizes
  const W = 84;              // challenge badge width (px)
  const AWARD_W = 79;       // gold/silver award width — larger focal point

  // Pointy-top hex geometry for tessellation.
  // The PNGs have transparent padding around the hex artwork, so to make the
  // visible hexes nearly touch we overlap the canvases significantly.
  const H = W * 1.1547;      // full height of a pointy-top hex
  const colStep = W * 0.74;  // horizontal centre-to-centre (overlap canvases)
  const rowStep = H * 0.55;  // vertical centre-to-centre (tight interlock)

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
  // Full pixel width of the widest row including the badge width itself
  const clusterWidth = (maxCols - 1) * colStep + W;
  const clusterHeight = (rows.length - 1) * rowStep + H + (AWARD_W - W) + 5;

  // Scale the cluster down to fit the screen width on mobile
  useEffect(() => {
    const fit = () => {
      const avail = wrapRef.current?.offsetWidth || window.innerWidth;
      const target = Math.min(1, (avail - 24) / clusterWidth);
      setScale(target);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [clusterWidth]);

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
      const cy = rowIdx * rowStep + (AWARD_W - W) / 2 + (rowIdx > 0 ? 5 : 0);

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
    <div ref={wrapRef} style={{ width: '100%', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ width: clusterWidth * scale, height: clusterHeight * scale, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: clusterWidth, height: clusterHeight, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
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
    </div>
  );
}