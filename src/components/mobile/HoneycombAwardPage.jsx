import React, { useState } from 'react';
import { X, CheckCircle, Circle, Trophy, ChevronDown, ChevronUp, Star, ArrowLeft } from 'lucide-react';

// ─── SVG circular progress ring ───────────────────────────────────────────────
function ProgressRing({ percentage, size = 56, strokeWidth = 4, color = '#ffffff' }) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <svg width={size} height={size} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={strokeWidth}
      />
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
function HexBadge({ badge, isEarned, percentage, onClick, borderColor, isAward = false }) {
  const size = isAward ? 80 : 68;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 active:scale-95 transition-transform focus:outline-none"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Hexagon shape via clip-path */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: size,
          height: size * 0.866 * 1.15,
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          background: isEarned
            ? `linear-gradient(145deg, #1e3a8a, #3730a3)`
            : 'linear-gradient(145deg, #374151, #4b5563)',
          boxShadow: isEarned
            ? `0 0 0 3px ${borderColor}`
            : '0 0 0 3px rgba(100,116,139,0.6)',
        }}
      >
        {/* Badge image */}
        {badge?.image_url ? (
          <img
            src={badge.image_url}
            alt={badge.name}
            className="rounded-sm object-contain"
            style={{
              width: size * 0.62,
              height: size * 0.62 * 0.866 * 1.15,
              filter: isEarned ? 'none' : 'grayscale(100%) brightness(0.55)',
              opacity: isEarned ? 1 : 0.7,
            }}
          />
        ) : (
          <Trophy
            style={{ width: size * 0.4, height: size * 0.4, color: isEarned ? '#fbbf24' : '#9ca3af' }}
          />
        )}

        {/* Progress ring overlay when not earned and has progress */}
        {!isEarned && percentage > 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ clipPath: 'inherit' }}
          >
            <ProgressRing
              percentage={percentage}
              size={size - 4}
              strokeWidth={3}
              color={borderColor}
            />
            <span
              className="absolute font-bold text-white z-10"
              style={{ fontSize: size * 0.16 }}
            >
              {percentage}%
            </span>
          </div>
        )}

        {/* Tick if earned */}
        {isEarned && (
          <div className="absolute bottom-1 right-1 bg-green-500 rounded-full p-0.5 shadow-lg z-10">
            <CheckCircle style={{ width: size * 0.2, height: size * 0.2, color: 'white' }} />
          </div>
        )}
      </div>

      {/* Badge name below hex */}
      <p
        className="text-center font-semibold leading-tight"
        style={{
          fontSize: isAward ? 10 : 8.5,
          color: isEarned ? '#f9fafb' : '#9ca3af',
          maxWidth: size + 8,
          lineHeight: 1.2,
        }}
      >
        {isAward ? badge?.name?.replace("Chief Scout's ", '') : badge?.name?.replace(' Challenge', '')}
      </p>
    </button>
  );
}

// ─── Criteria modal for a single badge ────────────────────────────────────────
function BadgeCriteriaSheet({ badge, modules, requirements, reqProgress, child, onClose, accentColor }) {
  const [openModules, setOpenModules] = useState({});

  if (!badge) return null;

  const badgeModules = modules.filter(m => m.badge_id === badge.id).sort((a, b) => (a.order || 0) - (b.order || 0));
  const isReqDone = (reqId) => reqProgress.some(p => p.requirement_id === reqId && p.completed && p.member_id === child?.id);
  const totalReqs = badgeModules.reduce((s, m) => s + requirements.filter(r => r.module_id === m.id).length, 0);
  const doneReqs = badgeModules.reduce((s, m) => {
    const reqs = requirements.filter(r => r.module_id === m.id);
    return s + reqs.filter(r => isReqDone(r.id)).length;
  }, 0);
  const pct = totalReqs > 0 ? Math.round((doneReqs / totalReqs) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col rounded-t-3xl overflow-hidden"
        style={{ maxHeight: '90vh', background: '#0f172a' }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-5 pt-5 pb-4"
          style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}44)`, borderBottom: `1px solid ${accentColor}33` }}
        >
          <div className="flex items-center gap-3 mb-3">
            {badge.image_url && (
              <img src={badge.image_url} alt={badge.name} className="w-14 h-14 rounded-xl object-contain flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: accentColor }}>Challenge Badge</p>
              <h3 className="text-lg font-extrabold text-white leading-tight">{badge.name}</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 flex-shrink-0">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Progress bar */}
          {totalReqs > 0 && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-white/60">Progress</span>
                <span className="text-xs font-bold text-white">{doneReqs}/{totalReqs} complete</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: accentColor }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Scrollable requirements */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {badge.description && (
            <p className="text-sm text-white/60 leading-relaxed px-1">{badge.description}</p>
          )}
          {badgeModules.length > 0 ? badgeModules.map(mod => {
            const modReqs = requirements.filter(r => r.module_id === mod.id).sort((a, b) => (a.order || 0) - (b.order || 0));
            const modDone = modReqs.filter(r => isReqDone(r.id)).length;
            const isOpen = openModules[mod.id] !== false; // default open
            const allDone = modReqs.length > 0 && modDone === modReqs.length;

            return (
              <div key={mod.id} className="rounded-2xl overflow-hidden" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.07)' }}>
                <button
                  onClick={() => setOpenModules(p => ({ ...p, [mod.id]: !isOpen }))}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${allDone ? 'bg-green-500' : 'bg-white/10 text-white/60'}`}>
                    {allDone ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : `${modDone}/${modReqs.length}`}
                  </div>
                  <p className="flex-1 text-sm font-semibold text-white">{mod.name}</p>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                </button>
                {isOpen && (
                  <div className="border-t border-white/5 divide-y divide-white/5">
                    {modReqs.map((req, idx) => {
                      const done = isReqDone(req.id);
                      return (
                        <div key={req.id} className="flex items-start gap-3 px-4 py-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {done
                              ? <CheckCircle className="w-4 h-4 text-green-400" />
                              : <Circle className="w-4 h-4 text-white/20" />
                            }
                          </div>
                          <p className={`text-sm leading-snug flex-1 ${done ? 'text-green-300 font-medium' : 'text-white/70'}`}>
                            <span className="font-bold text-white/40 mr-1">{idx + 1}.</span>
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
            <p className="text-center text-white/40 text-sm py-6">No detailed criteria available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Award overview sheet (click on the top hexagon) ──────────────────────────
function AwardOverviewSheet({ badge, isSilver, modules, requirements, reqProgress, awards, badgeProgress, child, onClose }) {
  const accentColor = isSilver ? '#94a3b8' : '#f59e0b';
  const sectionLabel = isSilver ? 'Cubs' : 'Scouts';
  const challengeCount = isSilver ? 7 : 9;

  const isEarned = awards.some(a => a.member_id === child?.id && a.badge_id === badge?.id)
    || badgeProgress.some(p => p.member_id === child?.id && p.badge_id === badge?.id && p.status === 'completed');

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col rounded-t-3xl overflow-hidden"
        style={{ maxHeight: '85vh', background: '#0f172a' }}
      >
        {/* Gradient header */}
        <div
          className="flex-shrink-0 px-5 pt-6 pb-5 text-center"
          style={{
            background: isEarned
              ? `linear-gradient(135deg, ${accentColor}55, ${accentColor}99)`
              : `linear-gradient(135deg, #1e293b, #334155)`,
            borderBottom: `2px solid ${accentColor}55`,
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {badge?.image_url && (
            <img src={badge.image_url} alt={badge.name}
              className="w-20 h-20 object-contain mx-auto rounded-2xl mb-3 shadow-2xl"
              style={{ filter: isEarned ? 'none' : 'grayscale(60%) brightness(0.7)' }}
            />
          )}
          <div className="flex items-center justify-center gap-2 mb-1">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
              {sectionLabel} · Highest Award
            </p>
          </div>
          <h2 className="text-xl font-extrabold text-white mb-1">{badge?.name}</h2>
          {isEarned && (
            <span className="inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1 rounded-full shadow" style={{ background: accentColor, color: '#0f172a' }}>
              <Star className="w-3 h-3" /> ACHIEVED!
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="rounded-2xl p-4 space-y-3" style={{ background: '#1e293b' }}>
            <p className="text-sm font-bold text-white">To earn this award, you must complete:</p>

            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: '#0f172a' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-extrabold" style={{ background: accentColor, color: '#0f172a' }}>1</div>
              <div>
                <p className="text-sm font-bold text-white">All {challengeCount} Challenge Badges</p>
                <p className="text-xs text-white/50 mt-0.5">Every challenge badge for {sectionLabel} must be completed</p>
              </div>
            </div>

            {!isSilver && (
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: '#0f172a' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-extrabold" style={{ background: accentColor, color: '#0f172a' }}>2</div>
                <div>
                  <p className="text-sm font-bold text-white">At least 8 Activity Badges</p>
                  <p className="text-xs text-white/50 mt-0.5">Choose any activity badges that interest you</p>
                </div>
              </div>
            )}

            {isSilver && (
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: '#0f172a' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-extrabold" style={{ background: accentColor, color: '#0f172a' }}>2</div>
                <div>
                  <p className="text-sm font-bold text-white">Nights Away &amp; Activity badges</p>
                  <p className="text-xs text-white/50 mt-0.5">Complete the nights away requirement and activity badges</p>
                </div>
              </div>
            )}
          </div>

          {badge?.description && (
            <p className="text-sm text-white/60 leading-relaxed">{badge.description}</p>
          )}

          <div className="rounded-2xl p-4" style={{ background: '#1e293b', borderLeft: `3px solid ${accentColor}` }}>
            <p className="text-xs text-white/50 leading-relaxed">
              The {badge?.name} is the pinnacle of achievement for {sectionLabel}. It demonstrates exceptional commitment, skill, and dedication to Scouting values. Tap each badge in the grid to view its specific requirements and track your progress.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Honeycomb Award Page ─────────────────────────────────────────────────
export default function HoneycombAwardPage({
  badge,           // chief scout award BadgeDefinition
  child,
  badges,          // all badge definitions
  modules,
  requirements,
  reqProgress,
  awards,
  badgeProgress,
  onClose,
  isSilver,
}) {
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showOverview, setShowOverview] = useState(false);

  const sectionName = isSilver ? 'cubs' : 'scouts';
  const accentColor = isSilver ? '#94a3b8' : '#f59e0b';
  const borderColor = isSilver ? '#94a3b8' : '#ef4444';
  const bgGradient = isSilver
    ? 'linear-gradient(160deg, #1e293b 0%, #0f172a 50%, #1a1f35 100%)'
    : 'linear-gradient(160deg, #1a0a00 0%, #0f172a 50%, #1a0a00 100%)';
  const title = isSilver ? 'Silver Award' : 'Gold Award';
  const subtitle = isSilver ? 'Seven Challenge Awards' : 'Nine Challenge Awards';

  // Challenge badges for this section (no chief scout award itself)
  const challengeBadges = badges
    .filter(b => b.category === 'challenge' && b.section === sectionName && !b.is_chief_scout_award)
    .sort((a, b) => (a.display_priority || 0) - (b.display_priority || 0) || a.name.localeCompare(b.name));

  const isEarned = (badgeId) => {
    if (awards.some(a => a.member_id === child?.id && a.badge_id === badgeId)) return true;
    return badgeProgress.some(p => p.member_id === child?.id && p.badge_id === badgeId && p.status === 'completed');
  };

  const getBadgePercentage = (badgeId) => {
    const badgeMods = modules.filter(m => m.badge_id === badgeId);
    let total = 0, completed = 0;
    badgeMods.forEach(mod => {
      const modReqs = requirements.filter(r => r.module_id === mod.id);
      if (mod.completion_rule === 'x_of_n_required') {
        const needed = mod.required_count || modReqs.length;
        total += needed;
        const done = reqProgress.filter(p => p.member_id === child?.id && p.module_id === mod.id && p.completed).length;
        completed += Math.min(done, needed);
      } else {
        total += modReqs.length;
        completed += reqProgress.filter(p => p.member_id === child?.id && p.module_id === mod.id && p.completed).length;
      }
    });
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const awardEarned = isEarned(badge?.id);

  // Build honeycomb rows based on section
  // Cubs: 1 (award) + 2 + 3 + 2 = 8 cells (7 challenge + 1 award)
  // Scouts: 1 (award) + 2 + 3 + 4 = 10 cells (9 challenge + 1 award)
  const rows = isSilver
    ? [
        [null], // award hex — rendered separately as top
        [challengeBadges[0], challengeBadges[1]],
        [challengeBadges[2], challengeBadges[3], challengeBadges[4]],
        [challengeBadges[5], challengeBadges[6]],
      ]
    : [
        [null], // award hex
        [challengeBadges[0], challengeBadges[1]],
        [challengeBadges[2], challengeBadges[3], challengeBadges[4]],
        [challengeBadges[5], challengeBadges[6], challengeBadges[7], challengeBadges[8]],
      ];

  // Count earned challenges
  const earnedCount = challengeBadges.filter(b => b && isEarned(b.id)).length;
  const totalCount = challengeBadges.length;

  // Hex dimensions and offset math
  const HEX_W = 72;
  const HEX_H = HEX_W * 0.866;
  const GAP = 4;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: bgGradient }}>
      {/* Top bar */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 flex-shrink-0">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-extrabold text-white leading-tight">{title}</h1>
          <p className="text-xs text-white/50 mt-0.5">{child?.full_name}</p>
        </div>
        {/* Progress pill */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }}
        >
          <span>{earnedCount}/{totalCount}</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-8">
        {/* Section title */}
        <div className="text-center pt-6 pb-2">
          <h2 className="text-2xl font-extrabold" style={{ color: accentColor }}>
            {isSilver ? 'Cubs' : 'Scouts'}
          </h2>
          <p className="text-sm text-white/50 mt-0.5">{subtitle}</p>
        </div>

        {/* Overall progress arc */}
        <div className="mx-6 mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-white/50">Challenge badges completed</span>
            <span className="font-bold" style={{ color: accentColor }}>{earnedCount} of {totalCount}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%`, background: accentColor }}
            />
          </div>
        </div>

        {/* ── Honeycomb Grid ── */}
        <div className="flex flex-col items-center gap-0" style={{ padding: '0 16px' }}>

          {/* Row 0: Award hexagon (top, centred, larger) */}
          <div className="flex justify-center mb-0" style={{ marginBottom: -HEX_H * 0.25 }}>
            <HexBadge
              badge={badge}
              isEarned={awardEarned}
              percentage={0}
              onClick={() => setShowOverview(true)}
              borderColor={accentColor}
              isAward={true}
            />
          </div>

          {/* Remaining rows */}
          {rows.slice(1).map((row, rowIdx) => {
            // Odd offset for honeycomb stagger on alternating rows
            // Row 1 (2 cells): no offset — sits under award
            // Row 2 (3 cells): shift right by half-cell
            // Row 3 (2 or 4 cells): no offset
            const stagger = rowIdx === 1; // row with 3 items gets a slight offset
            const cellW = HEX_W + GAP;

            return (
              <div
                key={rowIdx}
                className="flex justify-center"
                style={{
                  gap: GAP,
                  marginTop: -HEX_H * 0.22,
                  // Stagger: 3-cell row shifts by half a hex for honeycomb effect
                  marginLeft: stagger ? cellW * 0.5 : 0,
                }}
              >
                {row.map((b, idx) => (
                  <HexBadge
                    key={b?.id || idx}
                    badge={b}
                    isEarned={b ? isEarned(b.id) : false}
                    percentage={b ? getBadgePercentage(b.id) : 0}
                    onClick={() => b && setSelectedBadge(b)}
                    borderColor={borderColor}
                    isAward={false}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-6 px-6">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-white/50">Earned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: borderColor }} />
            <span className="text-xs text-white/50">In progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-600" />
            <span className="text-xs text-white/50">Not started</span>
          </div>
        </div>

        {/* Hint */}
        <p className="text-center text-white/30 text-[11px] mt-3 px-6">
          Tap any badge to see its requirements
        </p>
      </div>

      {/* Badge criteria sheet */}
      {selectedBadge && (
        <BadgeCriteriaSheet
          badge={selectedBadge}
          modules={modules}
          requirements={requirements}
          reqProgress={reqProgress}
          child={child}
          onClose={() => setSelectedBadge(null)}
          accentColor={borderColor}
        />
      )}

      {/* Award overview sheet */}
      {showOverview && (
        <AwardOverviewSheet
          badge={badge}
          isSilver={isSilver}
          modules={modules}
          requirements={requirements}
          reqProgress={reqProgress}
          awards={awards}
          badgeProgress={badgeProgress}
          child={child}
          onClose={() => setShowOverview(false)}
        />
      )}
    </div>
  );
}