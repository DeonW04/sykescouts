import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Award, CheckCircle, Circle, ChevronLeft, ChevronDown, ChevronUp, Shirt, Users, X, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ── Badge colour/status helpers ──────────────────────────────
function getBadgeStyle(isEarned, inProgress) {
  if (isEarned) return 'bg-green-50 border-green-300';
  if (inProgress) return 'bg-yellow-50 border-yellow-300';
  return 'bg-gray-50 border-gray-200 opacity-60';
}

// ── Individual badge card ────────────────────────────────────
function BadgeCard({ badge, isEarned, inProgress, percentage, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all hover:scale-105 active:scale-95 ${getBadgeStyle(isEarned, inProgress)}`}
    >
      <div className="relative">
        {badge.image_url ? (
          <img
            src={badge.image_url}
            alt={badge.name}
            className={`w-14 h-14 object-contain rounded-xl ${!isEarned && !inProgress ? 'grayscale opacity-50' : ''}`}
          />
        ) : (
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl bg-gray-100">🏅</div>
        )}
        {isEarned && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-5 h-5 flex items-center justify-center shadow">
            <CheckCircle className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>
      <p className="text-[11px] text-center font-medium text-gray-700 leading-tight line-clamp-2 w-full">{badge.name}</p>
      {inProgress && !isEarned && (
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${percentage}%` }} />
        </div>
      )}
    </button>
  );
}

// ── Collapsible category section ─────────────────────────────
function BadgeCategorySection({ title, icon, badges, isEarned, isInProgress, getBadgePercentage, onBadgeClick, showCounter = true, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const earnedCount = badges.filter(b => isEarned(b.id)).length;
  if (badges.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors">
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base text-gray-900">{title}</p>
          {showCounter && <p className="text-xs text-gray-400 mt-0.5">{earnedCount}/{badges.length} earned</p>}
        </div>
        {showCounter && (
          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
            <div className="h-full bg-[#7413dc] rounded-full" style={{ width: `${badges.length > 0 ? (earnedCount / badges.length) * 100 : 0}%` }} />
          </div>
        )}
        {open ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-50">
          <div className="grid grid-cols-4 xl:grid-cols-6 gap-3 mt-4">
            {badges.map(b => (
              <BadgeCard
                key={b.id}
                badge={b}
                isEarned={isEarned(b.id)}
                inProgress={isInProgress(b.id)}
                percentage={getBadgePercentage(b.id)}
                onClick={() => onBadgeClick(b)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Badge criteria dialog ────────────────────────────────────
function BadgeCriteriaDialog({ badge, child, modules, requirements, reqProgress, awards, badgeProgress, stagedContext, uniformConfigs, sections, onClose }) {
  const [showUniform, setShowUniform] = useState(false);
  if (!badge) return null;

  const childSection = sections.find(s => s.id === child?.section_id);
  const uniformConfig = uniformConfigs.find(u => u.section === childSection?.name) || uniformConfigs[0];
  const badgeModules = modules.filter(m => m.badge_id === badge.id).sort((a, b) => (a.order || 0) - (b.order || 0));
  const isEarned = awards.some(a => a.member_id === child?.id && a.badge_id === badge.id)
    || badgeProgress.some(p => p.member_id === child?.id && p.badge_id === badge.id && p.status === 'completed');

  const isReqCompleted = (reqId) => reqProgress.some(p => p.member_id === child?.id && p.requirement_id === reqId && p.completed);
  const getModuleProgress = (modId) => {
    const modReqs = requirements.filter(r => r.module_id === modId);
    const completed = reqProgress.filter(p => p.member_id === child?.id && modReqs.map(r => r.id).includes(p.requirement_id) && p.completed).length;
    return { total: modReqs.length, completed };
  };

  const uniformPosition = badge.uniform_position;
  const uniformImageUrl = uniformConfig?.image_url;
  const dotCoords = uniformPosition ? (uniformConfig?.dot_positions || {})[uniformPosition] : null;
  const exampleImg = uniformPosition ? (uniformConfig?.section_example_images || []).find(i => i.position === uniformPosition) : null;
  const hasUniformInfo = !!badge.uniform_position && (uniformImageUrl || exampleImg);

  return (
    <Dialog open={!!badge} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            {badge.image_url && <img src={badge.image_url} alt={badge.name} className="w-16 h-16 object-contain rounded-xl flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl">{badge.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 capitalize">{badge.category?.replace('_', ' ')} Badge</span>
                {isEarned && (
                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Earned
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {badge.description && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 leading-relaxed">{badge.description}</p>
            </div>
          )}

          {/* Staged context */}
          {stagedContext && (
            <div className="space-y-2">
              {stagedContext.highestEarned && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-green-800">Stage {stagedContext.highestEarned.stage_number} achieved!</p>
                    <p className="text-xs text-green-600 mt-0.5">{stagedContext.highestEarned.name} completed.</p>
                  </div>
                </div>
              )}
              {stagedContext.nextStageBadge && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">{stagedContext.highestEarned ? 'Next up' : 'Working towards'}</p>
                  <p className="text-sm font-semibold text-purple-900 mt-0.5">{stagedContext.nextStageBadge.name}</p>
                </div>
              )}
            </div>
          )}

          {/* Requirements */}
          {badgeModules.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Requirements</h3>
                {badge.completion_rule && (
                  <span className="text-[10px] bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full capitalize">
                    {badge.completion_rule === 'all_modules' ? 'Complete all modules' : badge.completion_rule === 'one_module' ? 'Complete one module' : badge.completion_rule?.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              {badgeModules.map(mod => {
                const modReqs = requirements.filter(r => r.module_id === mod.id).sort((a, b) => (a.order || 0) - (b.order || 0));
                const { total, completed } = getModuleProgress(mod.id);
                const completionLabel = mod.completion_rule === 'x_of_n_required' && mod.required_count ? `${mod.required_count} of ${total} required` : 'Complete all';
                return (
                  <div key={mod.id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm text-gray-900">{mod.name}</p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[10px] bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">{completionLabel}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${completed === total && total > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{completed}/{total}</span>
                        </div>
                      </div>
                      {total > 0 && (
                        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-[#7413dc] rounded-full transition-all" style={{ width: `${(completed / total) * 100}%` }} />
                        </div>
                      )}
                    </div>
                    {modReqs.length > 0 && (
                      <div className="divide-y divide-gray-100 bg-white">
                        {modReqs.map(req => {
                          const done = isReqCompleted(req.id);
                          return (
                            <div key={req.id} className="flex items-start gap-3 px-4 py-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {done ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-gray-300" />}
                              </div>
                              <p className={`text-sm leading-snug flex-1 ${done ? 'text-green-700 font-medium' : 'text-gray-700'}`}>{req.text || req.description}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : badge.requirements?.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Requirements</h3>
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                {badge.requirements.map((req, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <Circle className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700 leading-snug">{req.description || req}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-400 text-center">No detailed criteria available for this badge.</p>
            </div>
          )}

          {/* Uniform guide accordion */}
          {hasUniformInfo && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <button onClick={() => setShowUniform(!showUniform)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shirt className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-semibold text-gray-900 flex-1 text-sm">Where to sew this badge</span>
                {showUniform ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {showUniform && (
                <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
                  {uniformImageUrl && (
                    <div className="relative inline-block w-full">
                      <img src={uniformImageUrl} alt="Uniform" className="w-full rounded-xl" style={{ maxHeight: 320, objectFit: 'contain' }} />
                      {dotCoords && (
                        <div style={{ left: `${dotCoords.x}%`, top: `${dotCoords.y}%`, transform: 'translate(-50%, -50%)' }}
                          className="absolute w-5 h-5 rounded-full bg-[#7413dc] border-2 border-white shadow-lg ring-4 ring-[#7413dc]/30" />
                      )}
                    </div>
                  )}
                  {exampleImg && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2 font-medium">Example:</p>
                      <img src={exampleImg.image_url} alt="Example placement" className="w-full rounded-xl object-cover" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function IpadBadges({ onBack }) {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [stagedContext, setStagedContext] = useState(null);

  const { data: allMembers = [] } = useQuery({
    queryKey: ['ipad-badges-members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const child = allMembers.find(m => m.id === selectedMemberId) || null;

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: badgeProgress = [] } = useQuery({
    queryKey: ['badge-progress-ipad', selectedMemberId],
    queryFn: () => base44.entities.MemberBadgeProgress.filter({ member_id: selectedMemberId }),
    enabled: !!selectedMemberId,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: () => base44.entities.BadgeModule.filter({}),
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['requirements'],
    queryFn: () => base44.entities.BadgeRequirement.filter({}),
  });

  const { data: reqProgress = [] } = useQuery({
    queryKey: ['req-progress-ipad', selectedMemberId],
    queryFn: () => base44.entities.MemberRequirementProgress.filter({ member_id: selectedMemberId }),
    enabled: !!selectedMemberId,
  });

  const { data: awards = [] } = useQuery({
    queryKey: ['awards-ipad', selectedMemberId],
    queryFn: () => base44.entities.MemberBadgeAward.filter({ member_id: selectedMemberId }),
    enabled: !!selectedMemberId,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: uniformConfigs = [] } = useQuery({
    queryKey: ['uniform-configs'],
    queryFn: () => base44.entities.UniformConfig.filter({}),
  });

  // ── Badge logic ──────────────────────────────────────────────
  const isEarned = (badgeId) => {
    if (!child) return false;
    if (awards.some(a => a.member_id === child.id && a.badge_id === badgeId)) return true;
    return badgeProgress.some(p => p.member_id === child.id && p.badge_id === badgeId && p.status === 'completed');
  };

  const getBadgePercentage = (badgeId) => {
    const badgeModules = modules.filter(m => m.badge_id === badgeId);
    let total = 0, completed = 0;
    badgeModules.forEach(mod => {
      const modReqs = requirements.filter(r => r.module_id === mod.id);
      total += modReqs.length;
      completed += reqProgress.filter(p => p.member_id === child?.id && modReqs.map(r => r.id).includes(p.requirement_id) && p.completed).length;
    });
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const isInProgress = (badgeId) => {
    if (isEarned(badgeId) || !child) return false;
    const modIds = modules.filter(m => m.badge_id === badgeId).map(m => m.id);
    return reqProgress.some(p => p.member_id === child.id && modIds.includes(p.module_id) && p.completed);
  };

  // ── Derived data ─────────────────────────────────────────────
  const childSection = sections.find(s => s.id === child?.section_id);
  const childSectionName = childSection?.name;

  const sectionBadges = badges.filter(b =>
    (b.section === childSectionName || b.section === 'all') && b.category !== 'special'
  );

  // Staged families
  const stagedFamilies = {};
  sectionBadges.filter(b => b.category === 'staged' && !b.is_chief_scout_award && b.badge_family_id).forEach(b => {
    if (!stagedFamilies[b.badge_family_id]) stagedFamilies[b.badge_family_id] = [];
    stagedFamilies[b.badge_family_id].push(b);
  });

  const stagedRepresentatives = Object.values(stagedFamilies).map(stages => {
    const sorted = stages.sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
    const earnedStages = sorted.filter(b => isEarned(b.id));
    const highestEarned = earnedStages.length > 0 ? earnedStages[earnedStages.length - 1] : null;
    const nextStage = highestEarned ? sorted.find(b => (b.stage_number || 0) > (highestEarned.stage_number || 0)) : sorted[0];
    return nextStage || highestEarned;
  }).filter(Boolean);
  const stagedNoFamily = sectionBadges.filter(b => b.category === 'staged' && !b.is_chief_scout_award && !b.badge_family_id);
  const stagedBadges = [...stagedRepresentatives, ...stagedNoFamily];

  const handleStagedBadgeClick = (badge) => {
    if (!badge.badge_family_id) { setSelectedBadge(badge); setStagedContext(null); return; }
    const family = stagedFamilies[badge.badge_family_id] || [];
    const sorted = [...family].sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
    const earnedStages = sorted.filter(b => isEarned(b.id));
    const highestEarned = earnedStages.length > 0 ? earnedStages[earnedStages.length - 1] : null;
    const nextStage = highestEarned ? sorted.find(b => (b.stage_number || 0) > (highestEarned.stage_number || 0)) : sorted[0];
    setStagedContext({ highestEarned, nextStageBadge: nextStage || null, allStages: sorted });
    setSelectedBadge(nextStage || highestEarned);
  };

  const challengeBadges = sectionBadges.filter(b => b.category === 'challenge' && !b.is_chief_scout_award);
  const activityBadges = sectionBadges.filter(b => b.category === 'activity' && !b.is_chief_scout_award);
  const coreBadges = sectionBadges.filter(b => b.category === 'core' && !b.is_chief_scout_award && isEarned(b.id));

  const earnedCount = sectionBadges.filter(b => isEarned(b.id)).length;
  const inProgressCount = sectionBadges.filter(b => isInProgress(b.id)).length;

  const sortedMembers = [...allMembers].sort((a, b) => new Date(a.date_of_birth) - new Date(b.date_of_birth));

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-yellow-50 via-white to-purple-50 overflow-hidden">
      {/* Top Header */}
      <div className="relative bg-gradient-to-r from-yellow-600 to-[#7413dc] text-white py-5 px-8 flex items-center gap-4 flex-shrink-0">
        <button onClick={onBack} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
          <Award className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Badges & Awards</h1>
          <p className="text-yellow-100 text-sm">{child ? child.full_name : 'Select a member to get started'}</p>
        </div>
      </div>

      {/* Split-panel body */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar ── */}
        <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-[#7413dc]" />
              <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Select Member</p>
            </div>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {sortedMembers.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedMemberId(m.id); setSelectedBadge(null); setStagedContext(null); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 ${m.id === selectedMemberId ? 'bg-[#7413dc] text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${m.id === selectedMemberId ? 'bg-white/20 text-white' : 'bg-[#7413dc]/10 text-[#7413dc]'}`}>
                    {(m.first_name || '?').charAt(0)}
                  </div>
                  <span className="font-medium text-sm truncate">{m.full_name || `${m.first_name} ${m.surname}`}</span>
                </button>
              ))}
            </div>
          </div>

          {child && (
            <div className="p-5 space-y-4 flex-1">
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-1">Section</p>
                <p className="font-bold text-purple-800 capitalize">{childSection?.display_name || childSectionName || '—'}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Badges Earned</p>
                <p className="text-3xl font-bold text-green-700">{earnedCount}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-1">In Progress</p>
                <p className="text-3xl font-bold text-yellow-600">{inProgressCount}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right main content ── */}
        <div className="flex-1 overflow-y-auto">
          {!child ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <Award className="w-20 h-20 mb-4 opacity-20" />
              <p className="text-xl font-semibold">Select a member</p>
              <p className="text-sm mt-1">Choose a young person from the left panel</p>
            </div>
          ) : (
            <div className="p-8 space-y-5 max-w-5xl pb-12">
              {/* Legend */}
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-400" /><span>Earned</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-yellow-400" /><span>In progress</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-gray-300" /><span>Not started</span></div>
              </div>

              {/* Category sections */}
              <BadgeCategorySection
                title="Challenge Badges"
                icon="🎯"
                badges={challengeBadges}
                isEarned={isEarned}
                isInProgress={isInProgress}
                getBadgePercentage={getBadgePercentage}
                onBadgeClick={(b) => { setSelectedBadge(b); setStagedContext(null); }}
                defaultOpen={true}
              />
              <BadgeCategorySection
                title="Activity Badges"
                icon="⚡"
                badges={activityBadges}
                isEarned={isEarned}
                isInProgress={isInProgress}
                getBadgePercentage={getBadgePercentage}
                onBadgeClick={(b) => { setSelectedBadge(b); setStagedContext(null); }}
                defaultOpen={true}
              />
              <BadgeCategorySection
                title="Staged Badges"
                icon="📈"
                badges={stagedBadges}
                showCounter={false}
                isEarned={(badgeId) => {
                  const badge = sectionBadges.find(b => b.id === badgeId);
                  if (badge?.badge_family_id) {
                    const familyIds = (stagedFamilies[badge.badge_family_id] || []).map(b => b.id);
                    return familyIds.some(id => isEarned(id));
                  }
                  return isEarned(badgeId);
                }}
                isInProgress={isInProgress}
                getBadgePercentage={getBadgePercentage}
                onBadgeClick={handleStagedBadgeClick}
                defaultOpen={true}
              />
              {coreBadges.length > 0 && (
                <BadgeCategorySection
                  title="Core & Awards"
                  icon="🏆"
                  badges={coreBadges}
                  showCounter={false}
                  isEarned={isEarned}
                  isInProgress={isInProgress}
                  getBadgePercentage={getBadgePercentage}
                  onBadgeClick={(b) => { setSelectedBadge(b); setStagedContext(null); }}
                />
              )}

              {sectionBadges.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <Award className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>No badges found for this section.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Badge criteria dialog */}
      {selectedBadge && (
        <BadgeCriteriaDialog
          badge={selectedBadge}
          child={child}
          modules={modules}
          requirements={requirements}
          reqProgress={reqProgress}
          awards={awards}
          badgeProgress={badgeProgress}
          stagedContext={stagedContext}
          uniformConfigs={uniformConfigs}
          sections={sections}
          onClose={() => { setSelectedBadge(null); setStagedContext(null); }}
        />
      )}
    </div>
  );
}