import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Award, CheckCircle, Circle, ChevronDown, ChevronUp, X, Search, Shirt } from 'lucide-react';

// ─── Badge criteria modal (reuses parent-app style) ──────────────────────────
function BadgeCriteriaModal({ badge, memberId, modules, requirements, reqProgress, awards, badgeProgress, onClose }) {
  const badgeModules = modules.filter(m => m.badge_id === badge.id).sort((a, b) => (a.order || 0) - (b.order || 0));

  const isEarned = memberId
    ? (awards.some(a => a.member_id === memberId && a.badge_id === badge.id) ||
       badgeProgress.some(p => p.member_id === memberId && p.badge_id === badge.id && p.status === 'completed'))
    : false;

  const isReqCompleted = (reqId) =>
    memberId
      ? reqProgress.some(p => p.member_id === memberId && p.requirement_id === reqId && p.completed)
      : false;

  const getModuleProgress = (modId) => {
    if (!memberId) return { total: requirements.filter(r => r.module_id === modId).length, completed: 0 };
    const modReqs = requirements.filter(r => r.module_id === modId);
    const completed = reqProgress.filter(p => p.member_id === memberId && modReqs.some(r => r.id === p.requirement_id) && p.completed).length;
    return { total: modReqs.length, completed };
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 flex-shrink-0">
          <X className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {badge.image_url && <img src={badge.image_url} alt={badge.name} className="w-10 h-10 object-contain rounded-lg flex-shrink-0" />}
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 text-sm leading-tight truncate">{badge.name}</h2>
            <p className="text-xs text-gray-400 capitalize">{badge.category?.replace('_', ' ')} Badge</p>
          </div>
        </div>
        {isEarned && (
          <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-lg flex-shrink-0">
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">Earned</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {badge.description && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-sm text-gray-600 leading-relaxed">{badge.description}</p>
          </div>
        )}

        {badgeModules.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Requirements</h3>
            {badgeModules.map(mod => {
              const modReqs = requirements.filter(r => r.module_id === mod.id).sort((a, b) => (a.order || 0) - (b.order || 0));
              const { total, completed } = getModuleProgress(mod.id);
              return (
                <div key={mod.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-gray-900">{mod.name}</p>
                      {memberId && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${completed === total && total > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {completed}/{total}
                        </span>
                      )}
                    </div>
                    {memberId && total > 0 && (
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#7413dc] rounded-full" style={{ width: `${(completed / total) * 100}%` }} />
                      </div>
                    )}
                    {mod.description && <p className="text-xs text-gray-400 mt-1.5">{mod.description}</p>}
                  </div>
                  {modReqs.length > 0 && (
                    <div className="divide-y divide-gray-50">
                      {modReqs.map(req => {
                        const done = isReqCompleted(req.id);
                        return (
                          <div key={req.id} className="flex items-start gap-3 px-4 py-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {done ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-gray-300" />}
                            </div>
                            <p className={`text-sm leading-snug flex-1 ${done ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
                              {req.text || req.description}
                            </p>
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
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {badge.requirements.map((req, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <Circle className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700 leading-snug">{req.description || req}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-sm text-gray-400 text-center">No detailed criteria available.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Category section (collapsible grid) ─────────────────────────────────────
function BadgeCategorySection({ title, icon, badges, isEarned, isInProgress, getPercentage, onBadgeClick }) {
  const [open, setOpen] = useState(false);
  const earnedCount = badges.filter(b => isEarned(b.id)).length;
  if (badges.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 text-left">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{earnedCount}/{badges.length} earned</p>
        </div>
        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
          <div className="h-full bg-[#7413dc] rounded-full" style={{ width: `${badges.length > 0 ? (earnedCount / badges.length) * 100 : 0}%` }} />
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-50">
          <div className="grid grid-cols-4 gap-2 mt-3">
            {badges.map(b => {
              const earned = isEarned(b.id);
              const inProg = isInProgress(b.id);
              const pct = getPercentage(b.id);
              return (
                <button
                  key={b.id}
                  onClick={() => onBadgeClick(b)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all active:scale-95 ${earned ? 'bg-green-50 border-green-200' : inProg ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100 opacity-60'}`}
                >
                  <div className="relative">
                    {b.image_url
                      ? <img src={b.image_url} alt={b.name} className={`w-12 h-12 object-contain rounded-xl ${!earned && !inProg ? 'grayscale opacity-50' : ''}`} />
                      : <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl">🏅</div>
                    }
                    {earned && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-center font-medium text-gray-700 leading-tight line-clamp-2 w-full">{b.name}</p>
                  {inProg && !earned && (
                    <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LeaderBadges({ sections }) {
  const [selectedMemberId, setSelectedMemberId] = useState('none');
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [sectionFilter, setSectionFilter] = useState('all');
  const sectionIds = sections.map(s => s.id);

  const { data: members = [] } = useQuery({
    queryKey: ['leader-mobile-members', sectionIds],
    queryFn: async () => {
      const all = await base44.entities.Member.filter({ active: true });
      return all.filter(m => sectionIds.includes(m.section_id)).sort((a, b) => new Date(a.date_of_birth) - new Date(b.date_of_birth));
    },
    enabled: sectionIds.length > 0,
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['mobile-badges-all'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['mobile-modules'],
    queryFn: () => base44.entities.BadgeModule.filter({}),
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['mobile-requirements'],
    queryFn: () => base44.entities.BadgeRequirement.filter({}),
  });

  const { data: badgeProgress = [] } = useQuery({
    queryKey: ['leader-badge-progress'],
    queryFn: () => base44.entities.MemberBadgeProgress.filter({}),
  });

  const { data: reqProgress = [] } = useQuery({
    queryKey: ['leader-req-progress'],
    queryFn: () => base44.entities.MemberRequirementProgress.filter({}),
  });

  const { data: awards = [] } = useQuery({
    queryKey: ['leader-badge-awards'],
    queryFn: () => base44.entities.MemberBadgeAward.filter({}),
  });

  const selectedMember = members.find(m => m.id === selectedMemberId) || null;
  const memberSectionName = selectedMember
    ? sections.find(s => s.id === selectedMember.section_id)?.name
    : null;

  // If a member is selected, filter to their section; otherwise use the section filter
  const activeSectionName = selectedMember
    ? memberSectionName
    : (sectionFilter === 'all' ? null : sections.find(s => s.id === sectionFilter)?.name);

  const sectionBadges = badges.filter(b =>
    (activeSectionName ? (b.section === activeSectionName || b.section === 'all') : sectionIds.some(sid => {
      const sectionName = sections.find(s => s.id === sid)?.name;
      return b.section === sectionName || b.section === 'all';
    })) && b.category !== 'special'
  );

  const memberId = selectedMember?.id || null;

  const isEarned = (badgeId) => {
    if (!memberId) return false;
    return awards.some(a => a.member_id === memberId && a.badge_id === badgeId) ||
      badgeProgress.some(p => p.member_id === memberId && p.badge_id === badgeId && p.status === 'completed');
  };

  const isInProgress = (badgeId) => {
    if (!memberId || isEarned(badgeId)) return false;
    const badgeMods = modules.filter(m => m.badge_id === badgeId);
    const modIds = badgeMods.map(m => m.id);
    return reqProgress.some(p => p.member_id === memberId && modIds.includes(p.module_id) && p.completed);
  };

  const getPercentage = (badgeId) => {
    if (!memberId) return 0;
    const badgeMods = modules.filter(m => m.badge_id === badgeId);
    let total = 0, completed = 0;
    badgeMods.forEach(mod => {
      const modReqs = requirements.filter(r => r.module_id === mod.id);
      total += modReqs.length;
      completed += reqProgress.filter(p => p.member_id === memberId && p.module_id === mod.id && p.completed).length;
    });
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const challengeBadges = sectionBadges.filter(b => b.category === 'challenge' && !b.is_chief_scout_award);
  const activityBadges = sectionBadges.filter(b => b.category === 'activity' && !b.is_chief_scout_award);
  const stagedBadges = sectionBadges.filter(b => b.category === 'staged' && !b.is_chief_scout_award);

  // For "no member" mode, show earned count as 0 (criteria-only)
  const isEarnedNoMember = () => false;
  const isInProgressNoMember = () => false;
  const getPctNoMember = () => 0;

  const earnedFn = memberId ? isEarned : isEarnedNoMember;
  const inProgFn = memberId ? isInProgress : isInProgressNoMember;
  const pctFn = memberId ? getPercentage : getPctNoMember;

  return (
    <div className="flex flex-col">
      {selectedBadge && (
        <BadgeCriteriaModal
          badge={selectedBadge}
          memberId={memberId}
          modules={modules}
          requirements={requirements}
          reqProgress={reqProgress}
          awards={awards}
          badgeProgress={badgeProgress}
          onClose={() => setSelectedBadge(null)}
        />
      )}

      <div className="bg-gradient-to-br from-yellow-600 to-[#7413dc] px-5 pb-6 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <h1 className="text-2xl font-bold">Badges</h1>
        <p className="text-white/70 text-sm mt-1">
          {selectedMember ? `Viewing: ${selectedMember.full_name}` : 'Select a member or browse all badges'}
        </p>
      </div>

      <div className="px-4 pt-4 pb-2 space-y-3">
        {/* Member selector */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Select Member</p>
          </div>
          <select
            value={selectedMemberId}
            onChange={e => setSelectedMemberId(e.target.value)}
            className="w-full px-4 py-3 text-sm font-semibold text-gray-900 focus:outline-none bg-white appearance-none cursor-pointer"
          >
            <option value="none">— No member (browse all criteria) —</option>
            {sections.map(section => {
              const sectionMembers = members.filter(m => m.section_id === section.id);
              if (sectionMembers.length === 0) return null;
              return (
                <optgroup key={section.id} label={section.display_name}>
                  {sectionMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>

        {/* Section filter (only when no member selected and multiple sections) */}
        {!selectedMember && sections.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setSectionFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${sectionFilter === 'all' ? 'bg-[#7413dc] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>All</button>
            {sections.map(s => (
              <button key={s.id} onClick={() => setSectionFilter(s.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${sectionFilter === s.id ? 'bg-[#7413dc] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>{s.display_name}</button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pb-5 space-y-3">
        <BadgeCategorySection title="Challenge Badges" icon="🎯" badges={challengeBadges} isEarned={earnedFn} isInProgress={inProgFn} getPercentage={pctFn} onBadgeClick={setSelectedBadge} />
        <BadgeCategorySection title="Activity Badges" icon="⚡" badges={activityBadges} isEarned={earnedFn} isInProgress={inProgFn} getPercentage={pctFn} onBadgeClick={setSelectedBadge} />
        <BadgeCategorySection title="Staged Badges" icon="📈" badges={stagedBadges} isEarned={earnedFn} isInProgress={inProgFn} getPercentage={pctFn} onBadgeClick={setSelectedBadge} />

        {sectionBadges.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No badges found.</p>
          </div>
        )}
      </div>
    </div>
  );
}