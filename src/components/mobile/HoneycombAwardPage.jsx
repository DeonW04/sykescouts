import React, { useState } from 'react';
import { X, CheckCircle, Circle, Trophy, ChevronDown, ChevronUp, Star, ArrowLeft } from 'lucide-react';

// ─── SVG circular progress ring ───────────────────────────────────────────────
function ProgressRing({ percentage, size, strokeWidth = 3, color = '#f59e0b' }) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <svg
      width={size}
      height={size}
      style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
    >
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

// ─── A single hexagonal badge cell ────────────────────────────────────────────
// All hexes are the same size. The hex shape is drawn with a flat-top polygon.
const HEX_SIZE = 68; // width of hex
const HEX_HEIGHT = HEX_SIZE * 0.866; // height

function HexBadge({ badge, isEarned, percentage, onClick, accentColor, isAward = false }) {
  const borderCol = isEarned ? '#22c55e' : (percentage > 0 ? accentColor : 'rgba(100,116,139,0.5)');
  const bgColor = isEarned
    ? 'linear-gradient(145deg, #14532d, #166534)'
    : 'linear-gradient(145deg, #1e293b, #334155)';

  // Image fills most of the hex interior
  const imgSize = HEX_SIZE * 0.58;
  // Progress ring sits just inside the hex border
  const ringSize = HEX_SIZE * 0.82;
  const ringOffset = (HEX_SIZE - ringSize) / 2;

  return (
    <button
      onClick={onClick}
      style={{
        width: HEX_SIZE,
        height: HEX_HEIGHT,
        position: 'relative',
        WebkitTapHighlightColor: 'transparent',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {/* Hex shape */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          background: bgColor,
          filter: isEarned ? 'none' : (percentage === 0 ? 'brightness(0.7)' : 'none'),
        }}
      />

      {/* Hex border (slightly larger, behind) */}
      <div
        style={{
          position: 'absolute',
          inset: -2,
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          background: borderCol,
          zIndex: -1,
        }}
      />

      {/* Badge image — centred, circular crop to avoid square look */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: imgSize,
          height: imgSize,
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {badge?.image_url ? (
          <img
            src={badge.image_url}
            alt={badge?.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: isEarned ? 'none' : 'grayscale(100%) brightness(0.5)',
              opacity: isEarned ? 1 : (percentage > 0 ? 0.65 : 0.45),
            }}
          />
        ) : (
          <Trophy style={{ width: imgSize * 0.6, height: imgSize * 0.6, color: isEarned ? '#fbbf24' : '#6b7280' }} />
        )}
      </div>

      {/* Progress ring — contained within hex, sits on top of image */}
      {!isEarned && percentage > 0 && (
        <div style={{ position: 'absolute', top: ringOffset, left: ringOffset, width: ringSize, height: ringSize }}>
          <ProgressRing percentage={percentage} size={ringSize} strokeWidth={3} color={accentColor} />
          {/* Percentage text */}
          <span
            style={{
              position: 'absolute',
              bottom: 4,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 9,
              fontWeight: 800,
              color: 'white',
              background: 'rgba(0,0,0,0.6)',
              borderRadius: 4,
              padding: '1px 3px',
              lineHeight: 1,
            }}
          >
            {percentage}%
          </span>
        </div>
      )}

      {/* Green tick if earned */}
      {isEarned && (
        <div
          style={{
            position: 'absolute',
            bottom: 2,
            right: 4,
            background: '#22c55e',
            borderRadius: '50%',
            padding: 1,
            display: 'flex',
          }}
        >
          <CheckCircle style={{ width: 12, height: 12, color: 'white' }} />
        </div>
      )}
    </button>
  );
}

// ─── Badge name label below hex ────────────────────────────────────────────────
function HexLabel({ badge, isEarned, isAward }) {
  const name = isAward
    ? badge?.name?.replace("Chief Scout's ", '').replace(' Award', ' Award')
    : badge?.name?.replace(' Challenge', '');
  return (
    <p
      style={{
        textAlign: 'center',
        fontSize: 9,
        fontWeight: 700,
        color: isEarned ? '#f9fafb' : '#6b7280',
        width: HEX_SIZE + 8,
        lineHeight: 1.2,
        marginTop: 3,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}
    >
      {name}
    </p>
  );
}

// ─── Criteria modal for a single badge ────────────────────────────────────────
function BadgeCriteriaSheet({ badge, modules, requirements, reqProgress, child, onClose, accentColor }) {
  const [openModules, setOpenModules] = useState({});
  if (!badge) return null;

  const badgeModules = modules.filter(m => m.badge_id === badge.id).sort((a, b) => (a.order || 0) - (b.order || 0));
  const isReqDone = (reqId) => reqProgress.some(p => p.requirement_id === reqId && p.completed && p.member_id === child?.id);
  const totalReqs = badgeModules.reduce((s, m) => s + requirements.filter(r => r.module_id === m.id).length, 0);
  const doneReqs = badgeModules.reduce((s, m) => s + requirements.filter(r => r.module_id === m.id && isReqDone(r.id)).length, 0);
  const pct = totalReqs > 0 ? Math.round((doneReqs / totalReqs) * 100) : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          maxHeight: '90vh', background: '#0f172a',
          borderRadius: '24px 24px 0 0', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, padding: '20px 20px 16px', background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}44)`, borderBottom: `1px solid ${accentColor}33` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {badge.image_url && (
              <img src={badge.image_url} alt={badge.name} style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'contain', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: accentColor, marginBottom: 2 }}>Challenge Badge</p>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{badge.name}</h3>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X style={{ width: 16, height: 16, color: 'white' }} />
            </button>
          </div>
          {totalReqs > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Progress</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{doneReqs}/{totalReqs} complete</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: accentColor, transition: 'width 0.4s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Scrollable requirements */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {badge.description && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{badge.description}</p>}
          {badgeModules.length > 0 ? badgeModules.map(mod => {
            const modReqs = requirements.filter(r => r.module_id === mod.id).sort((a, b) => (a.order || 0) - (b.order || 0));
            const modDone = modReqs.filter(r => isReqDone(r.id)).length;
            const isOpen = openModules[mod.id] !== false;
            const allDone = modReqs.length > 0 && modDone === modReqs.length;

            return (
              <div key={mod.id} style={{ borderRadius: 16, overflow: 'hidden', background: '#1e293b', border: '1px solid rgba(255,255,255,0.07)' }}>
                <button
                  onClick={() => setOpenModules(p => ({ ...p, [mod.id]: !isOpen }))}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 700, background: allDone ? '#22c55e' : 'rgba(255,255,255,0.1)', color: allDone ? 'white' : 'rgba(255,255,255,0.5)' }}>
                    {allDone ? <CheckCircle style={{ width: 14, height: 14, color: 'white' }} /> : `${modDone}/${modReqs.length}`}
                  </div>
                  <p style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'white' }}>{mod.name}</p>
                  {isOpen ? <ChevronUp style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.3)' }} />}
                </button>
                {isOpen && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {modReqs.map((req, idx) => {
                      const done = isReqDone(req.id);
                      return (
                        <div key={req.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ flexShrink: 0, marginTop: 1 }}>
                            {done ? <CheckCircle style={{ width: 15, height: 15, color: '#4ade80' }} /> : <Circle style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.2)' }} />}
                          </div>
                          <p style={{ fontSize: 13, lineHeight: 1.45, flex: 1, color: done ? '#86efac' : 'rgba(255,255,255,0.65)', fontWeight: done ? 600 : 400 }}>
                            <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginRight: 4 }}>{idx + 1}.</span>
                            {req.text || req.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }) : (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13, padding: '24px 0' }}>No detailed criteria available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Award overview sheet ──────────────────────────────────────────────────────
function AwardOverviewSheet({ badge, isSilver, awards, badgeProgress, child, onClose, accentColor }) {
  const sectionLabel = isSilver ? 'Cubs' : 'Scouts';
  const challengeCount = isSilver ? 7 : 9;
  const isEarned = awards.some(a => a.member_id === child?.id && a.badge_id === badge?.id)
    || badgeProgress.some(p => p.member_id === child?.id && p.badge_id === badge?.id && p.status === 'completed');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          maxHeight: '85vh', background: '#0f172a',
          borderRadius: '24px 24px 0 0', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ flexShrink: 0, padding: '24px 20px 20px', textAlign: 'center', background: isEarned ? `linear-gradient(135deg, ${accentColor}55, ${accentColor}99)` : 'linear-gradient(135deg, #1e293b, #334155)', borderBottom: `2px solid ${accentColor}55`, position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 16, height: 16, color: 'white' }} />
          </button>
          {badge?.image_url && (
            <img src={badge.image_url} alt={badge.name} style={{ width: 80, height: 80, objectFit: 'contain', margin: '0 auto 12px', borderRadius: 16, display: 'block', filter: isEarned ? 'none' : 'grayscale(60%) brightness(0.7)' }} />
          )}
          <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: accentColor, marginBottom: 4 }}>{sectionLabel} · Highest Award</p>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 6 }}>{badge?.name}</h2>
          {isEarned && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 999, background: accentColor, color: '#0f172a' }}>
              <Star style={{ width: 12, height: 12 }} /> ACHIEVED!
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ borderRadius: 16, padding: 16, background: '#1e293b', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>To earn this award, you must complete:</p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, background: '#0f172a' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 800, background: accentColor, color: '#0f172a' }}>1</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>All {challengeCount} Challenge Badges</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Every challenge badge for {sectionLabel} must be completed</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, background: '#0f172a' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 800, background: accentColor, color: '#0f172a' }}>2</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{isSilver ? 'Nights Away & Activity badges' : 'At least 8 Activity Badges'}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{isSilver ? 'Complete the nights away requirement and activity badges' : 'Choose any activity badges that interest you'}</p>
              </div>
            </div>
          </div>
          <div style={{ borderRadius: 16, padding: 16, background: '#1e293b', borderLeft: `3px solid ${accentColor}` }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              The {badge?.name} is the pinnacle of achievement for {sectionLabel}. Tap each badge in the grid to view its specific requirements and track progress.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Honeycomb Award Page ─────────────────────────────────────────────────
export default function HoneycombAwardPage({ badge, child, badges, modules, requirements, reqProgress, awards, badgeProgress, onClose, isSilver }) {
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showOverview, setShowOverview] = useState(false);

  const sectionName = isSilver ? 'cubs' : 'scouts';
  const accentColor = isSilver ? '#94a3b8' : '#f59e0b';
  const bgGradient = isSilver
    ? 'linear-gradient(160deg, #1e293b 0%, #0f172a 50%, #1a1f35 100%)'
    : 'linear-gradient(160deg, #1a0800 0%, #0f172a 50%, #1a0800 100%)';
  const title = isSilver ? 'Silver Award' : 'Gold Award';
  const subtitle = isSilver ? 'Seven Challenge Awards' : 'Nine Challenge Awards';

  const challengeBadges = badges
    .filter(b => b.category === 'challenge' && b.section === sectionName && !b.is_chief_scout_award)
    .sort((a, b) => (a.display_priority || 0) - (b.display_priority || 0) || a.name.localeCompare(b.name));

  const isEarned = (badgeId) =>
    awards.some(a => a.member_id === child?.id && a.badge_id === badgeId) ||
    badgeProgress.some(p => p.member_id === child?.id && p.badge_id === badgeId && p.status === 'completed');

  const getBadgePercentage = (badgeId) => {
    const badgeMods = modules.filter(m => m.badge_id === badgeId);
    let total = 0, completed = 0;
    badgeMods.forEach(mod => {
      const modReqs = requirements.filter(r => r.module_id === mod.id);
      if (mod.completion_rule === 'x_of_n_required') {
        const needed = mod.required_count || modReqs.length;
        total += needed;
        completed += Math.min(reqProgress.filter(p => p.member_id === child?.id && p.module_id === mod.id && p.completed).length, needed);
      } else {
        total += modReqs.length;
        completed += reqProgress.filter(p => p.member_id === child?.id && p.module_id === mod.id && p.completed).length;
      }
    });
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const awardEarned = isEarned(badge?.id);
  const earnedCount = challengeBadges.filter(b => b && isEarned(b.id)).length;
  const totalCount = challengeBadges.length;

  // ── Honeycomb layout ──────────────────────────────────────────────────────────
  // We use a CSS grid approach with proper hex offset.
  // Each row is offset by half a hex width for true honeycomb interlocking.
  // All hexes including the award badge are the same size.
  //
  // Layout:
  //   Cubs  (7): row1=[award], row2=[0,1], row3=[2,3,4], row4=[5,6]
  //   Scouts(9): row1=[award], row2=[0,1], row3=[2,3,4], row4=[5,6,7,8]

  const rows = isSilver
    ? [
        [{ _isAward: true }],
        [challengeBadges[0], challengeBadges[1]],
        [challengeBadges[2], challengeBadges[3], challengeBadges[4]],
        [challengeBadges[5], challengeBadges[6]],
      ]
    : [
        [{ _isAward: true }],
        [challengeBadges[0], challengeBadges[1]],
        [challengeBadges[2], challengeBadges[3], challengeBadges[4]],
        [challengeBadges[5], challengeBadges[6], challengeBadges[7], challengeBadges[8]],
      ];

  const GAP_H = 4;   // horizontal gap between hex centres beyond normal
  const GAP_V = 3;   // vertical overlap reduction (negative margin)

  // Horizontal spacing between hex centres
  const colSpacing = HEX_SIZE + GAP_H;
  // Vertical spacing: hex rows overlap so they mesh together
  const rowSpacing = HEX_HEIGHT * 0.75 + GAP_V;

  // Max row width (for container width calculation)
  const maxCols = Math.max(...rows.map(r => r.length));
  const containerWidth = maxCols * colSpacing + HEX_SIZE * 0.5 + 32;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: bgGradient }}>
      {/* Top bar */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top) + 12px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ArrowLeft style={{ width: 20, height: 20, color: 'white' }} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{title}</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{child?.full_name}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: `${accentColor}22`, border: `1px solid ${accentColor}44` }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: accentColor }}>{earnedCount}/{totalCount}</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 32 }}>

        {/* Section heading */}
        <div style={{ textAlign: 'center', paddingTop: 20, paddingBottom: 8 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: accentColor }}>{isSilver ? 'Cubs' : 'Scouts'}</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{subtitle}</p>
        </div>

        {/* Overall progress bar */}
        <div style={{ margin: '0 24px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Challenge badges completed</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: accentColor }}>{earnedCount} of {totalCount}</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%`, background: accentColor, transition: 'width 0.5s' }} />
          </div>
        </div>

        {/* ── Honeycomb Grid ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
          {rows.map((row, rowIdx) => {
            // Row 1 (2 items): offset right by half-hex so it sits between award and row below
            // Row 2 (3 items): base position
            // Row 3 (2 or 4 items): offset right by half-hex
            // Offset logic: even-length rows shift right by half hex
            const isOffsetRow = row.length % 2 === 0;
            const offsetX = isOffsetRow ? colSpacing / 2 : 0;

            return (
              <div
                key={rowIdx}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: GAP_H,
                  marginTop: rowIdx === 0 ? 0 : -(HEX_HEIGHT * 0.26),
                  marginLeft: offsetX,
                  alignItems: 'flex-start',
                }}
              >
                {row.map((b, colIdx) => {
                  const isAward = b?._isAward;
                  const actualBadge = isAward ? badge : b;
                  const earned = actualBadge ? isEarned(actualBadge.id) : false;
                  const pct = (!isAward && actualBadge) ? getBadgePercentage(actualBadge.id) : 0;

                  return (
                    <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <HexBadge
                        badge={actualBadge}
                        isEarned={earned}
                        percentage={pct}
                        onClick={() => isAward ? setShowOverview(true) : (actualBadge && setSelectedBadge(actualBadge))}
                        accentColor={accentColor}
                        isAward={isAward}
                      />
                      <HexLabel badge={actualBadge} isEarned={earned} isAward={isAward} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 24, padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Earned</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: accentColor }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>In progress</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4b5563' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Not started</span>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 8 }}>
          Tap any badge to see its requirements
        </p>
      </div>

      {/* Modals */}
      {selectedBadge && (
        <BadgeCriteriaSheet
          badge={selectedBadge}
          modules={modules}
          requirements={requirements}
          reqProgress={reqProgress}
          child={child}
          onClose={() => setSelectedBadge(null)}
          accentColor={accentColor}
        />
      )}
      {showOverview && (
        <AwardOverviewSheet
          badge={badge}
          isSilver={isSilver}
          awards={awards}
          badgeProgress={badgeProgress}
          child={child}
          onClose={() => setShowOverview(false)}
          accentColor={accentColor}
        />
      )}
    </div>
  );
}