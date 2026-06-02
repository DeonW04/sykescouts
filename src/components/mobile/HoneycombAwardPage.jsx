import React, { useState } from 'react';
import { X, CheckCircle, Circle, ChevronDown, ChevronUp, Star, ArrowLeft } from 'lucide-react';
import BadgeCluster from './award/BadgeCluster';

// ─── Criteria modal for a single badge ────────────────────────────────────────
function BadgeCriteriaSheet({ badge, modules, requirements, reqProgress, child, onClose, accentColor }) {
  const [openModules, setOpenModules] = useState({}); // collapsed by default
  if (!badge) return null;

  const badgeModules = modules.filter(m => m.badge_id === badge.id).sort((a, b) => (a.order || 0) - (b.order || 0));
  const isReqDone = (reqId) => reqProgress.some(p => p.requirement_id === reqId && p.completed && p.member_id === child?.id);
  const totalReqs = badgeModules.reduce((s, m) => s + requirements.filter(r => r.module_id === m.id).length, 0);
  const doneReqs = badgeModules.reduce((s, m) => s + requirements.filter(r => r.module_id === m.id && isReqDone(r.id)).length, 0);
  const pct = totalReqs > 0 ? Math.round((doneReqs / totalReqs) * 100) : 0;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: '88dvh', background: '#0f172a',
          borderRadius: '24px 24px 0 0', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, padding: '20px 20px 16px', background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}44)`, borderBottom: `1px solid ${accentColor}33` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {badge.image_url && (
              <img src={badge.image_url} alt={badge.name} style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }} />
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
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {badge.description && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{badge.description}</p>}
          {badgeModules.length > 0 ? badgeModules.map(mod => {
            const modReqs = requirements.filter(r => r.module_id === mod.id).sort((a, b) => (a.order || 0) - (b.order || 0));
            const modDone = modReqs.filter(r => isReqDone(r.id)).length;
            const isOpen = openModules[mod.id] === true; // collapsed by default
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
            <img src={badge.image_url} alt={badge.name} style={{ width: 88, height: 88, objectFit: 'contain', margin: '0 auto 12px', display: 'block', filter: isEarned ? 'none' : 'grayscale(70%) brightness(0.8)' }} />
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
              The {badge?.name} is the pinnacle of achievement for {sectionLabel}. Tap each badge to view its specific requirements and track progress.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Award Page ───────────────────────────────────────────────────────────
export default function HoneycombAwardPage({ badge, child, badges, modules, requirements, reqProgress, awards, badgeProgress, onClose, isSilver }) {
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showOverview, setShowOverview] = useState(false);

  const sectionName = isSilver ? 'cubs' : 'scouts';
  const accentColor = isSilver ? '#94a3b8' : '#f59e0b';
  const bgGradient = isSilver
    ? 'linear-gradient(160deg, #1e293b 0%, #0f172a 55%, #1a1f35 100%)'
    : 'linear-gradient(160deg, #14213d 0%, #0f172a 55%, #1a1024 100%)';
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
        <div style={{ textAlign: 'center', paddingTop: 18, paddingBottom: 6 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: accentColor }}>{isSilver ? 'Cubs' : 'Scouts'}</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{subtitle}</p>
        </div>

        {/* Overall progress bar */}
        <div style={{ margin: '0 24px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Challenge badges completed</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: accentColor }}>{earnedCount} of {totalCount}</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%`, background: accentColor, transition: 'width 0.5s' }} />
          </div>
        </div>

        {/* ── Badge cluster (the hero) ── */}
        <BadgeCluster
          awardBadge={badge}
          challengeBadges={challengeBadges}
          isSilver={isSilver}
          isEarned={isEarned}
          getBadgePercentage={getBadgePercentage}
          awardEarned={awardEarned}
          accentColor={accentColor}
          onBadgeClick={(b) => setSelectedBadge(b)}
          onAwardClick={() => setShowOverview(true)}
        />

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 24, padding: '0 24px' }}>
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