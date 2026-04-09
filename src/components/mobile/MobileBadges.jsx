import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Award, CheckCircle, Circle, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import BadgeCriteriaModal from './BadgeCriteriaModal';
import GoldAwardPage from './GoldAwardPage';

const CATEGORY_CONFIG = {
  challenge: {
    label: 'Challenge Badges',
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    icon: '🎯',
  },
  activity: {
    label: 'Activity Badges',
    color: 'from-green-500 to-emerald-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    dot: 'bg-green-500',
    icon: '⚡',
  },
  staged: {
    label: 'Staged Badges',
    color: 'from-purple-500 to-violet-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    icon: '📈',
  },
  chief_scout_award: {
    label: 'Core & Awards',
    color: 'from-yellow-500 to-orange-500',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
    icon: '🏆',
  },
};

function BadgeCard({ badge, isEarned, inProgress, percentage, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all active:scale-95 ${
        isEarned
          ? 'bg-green-50 border-green-200'
          : inProgress
          ? 'bg-orange-50 border-orange-200'
          : 'bg-white border-gray-100 opacity-60'
      }`}
    >
      <div className="relative">
        {badge.image_url ? (
          <img
            src={badge.image_url}
            alt={badge.name}
            className={`w-12 h-12 object-contain rounded-xl ${!isEarned && !inProgress ? 'grayscale opacity-50' : ''}`}
          />
        ) : (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${!isEarned && !inProgress ? 'grayscale opacity-50 bg-gray-100' : 'bg-gray-100'}`}>
            🏅
          </div>
        )}
        {isEarned && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      <p className="text-[10px] text-center font-medium text-gray-700 leading-tight line-clamp-2 w-full">{badge.name}</p>
      {inProgress && !isEarned && (
        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-orange-400 rounded-full" style={{ width: `${percentage}%` }} />
        </div>
      )}
    </button>
  );
}

function BadgeCategorySection({ title, icon, badges, isEarned, isInProgress, getBadgePercentage, onBadgeClick, showCounter = true }) {
  const [open, setOpen] = useState(false);
  const earnedCount = badges.filter(b => isEarned(b.id)).length;

  if (badges.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900">{title}</p>
          {showCounter && <p className="text-xs text-gray-400 mt-0.5">{earnedCount}/{badges.length} earned</p>}
        </div>
        {/* Mini progress bar — only for challenge/activity */}
        {showCounter && (
          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
            <div
              className="h-full bg-[#7413dc] rounded-full"
              style={{ width: `${badges.length > 0 ? (earnedCount / badges.length) * 100 : 0}%` }}
            />
          </div>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-50">
          <div className="grid grid-cols-4 gap-2 mt-3">
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

function GoldAwardBanner({ child, badges, awards, badgeProgress, sections, onLearnMore }) {
  const chiefScoutBadges = badges.filter(b => b.is_chief_scout_award);
  const chiefScoutAward = chiefScoutBadges[0];
  if (!chiefScoutAward) return null;

  const isEarned = awards.some(a => a.member_id === child?.id && a.badge_id === chiefScoutAward.id)
    || badgeProgress.some(p => p.member_id === child?.id && p.badge_id === chiefScoutAward.id && p.status === 'completed');

  return (
    <button onClick={onLearnMore} className="w-full text-left active:scale-[0.98] transition-transform">
      <div className="rounded-2xl overflow-hidden relative" style={{
        background: isEarned
          ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 35%, #8b5cf6 70%, #06b6d4 100%)'
          : 'linear-gradient(135deg, #78350f 0%, #92400e 40%, #b45309 70%, #d97706 100%)'
      }}>
        {/* Decorative sparkle overlay */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 80%, white 1px, transparent 1px)', backgroundSize: '40px 40px, 60px 60px, 30px 30px' }} />
        <div className="relative flex items-center gap-4 p-4">
          <div className="flex-shrink-0">
            {chiefScoutAward.image_url ? (
              <img
                src={chiefScoutAward.image_url}
                alt={chiefScoutAward.name}
                className={`w-16 h-16 object-contain rounded-xl shadow-lg ${!isEarned ? 'grayscale opacity-70' : ''}`}
              />
            ) : (
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">🏆</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-white text-base drop-shadow">{chiefScoutAward.name}</p>
              {isEarned && (
                <span className="bg-white text-yellow-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow">
                  ⭐ Achieved!
                </span>
              )}
            </div>
            <p className="text-white/85 text-xs mt-1">
              {isEarned ? 'Congratulations on this amazing achievement!' : 'The highest award for your section'}
            </p>
            <p className="text-white/60 text-[10px] mt-2 font-semibold tracking-wide">TAP TO VIEW CRITERIA →</p>
          </div>
          <Trophy className="w-8 h-8 text-white/60 flex-shrink-0 drop-shadow" />
        </div>
      </div>
    </button>
  );
}

export default function MobileBadges({ children }) {
  const child = children[0];
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [stagedContext, setStagedContext] = useState(null);
  const [showGoldAward, setShowGoldAward] = useState(false);

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: badgeProgress = [] } = useQuery({
    queryKey: ['mobile-badge-progress', child?.id],
    queryFn: async () => {
      if (!child) return [];
      const all = await base44.entities.MemberBadgeProgress.filter({});
      return all.filter(p => p.member_id === child.id);
    },
    enabled: !!child,
  });

  const { data: awards = [] } = useQuery({
    queryKey: ['mobile-awards', child?.id],
    queryFn: async () => {
      if (!child) return [];
      const all = await base44.entities.MemberBadgeAward.filter({});
      return all.filter(a => a.member_id === child.id);
    },
    enabled: !!child,
  });

  const { data: reqProgress = [] } = useQuery({
    queryKey: ['mobile-req-progress', child?.id],
    queryFn: async () => {
      if (!child) return [];
      const all = await base44.entities.MemberRequirementProgress.filter({});
      return all.filter(p => p.member_id === child.id);
    },
    enabled: !!child,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: () => base44.entities.BadgeModule.filter({}),
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['requirements'],
    queryFn: () => base44.entities.BadgeRequirement.filter({}),
  });

  if (!child) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <Award className="w-12 h-12 text-gray-200 mb-4" />
        <p className="text-gray-500">No child linked to your account.</p>
      </div>
    );
  }

  const childSection = sections.find(s => s.id === child.section_id);
  const childSectionName = childSection?.name;

  const sectionBadges = badges.filter(b =>
    (b.section === childSectionName || b.section === 'all') && b.category !== 'special'
  );

  const isEarned = (badgeId) => {
    if (awards.some(a => a.member_id === child.id && a.badge_id === badgeId)) return true;
    return badgeProgress.some(p => p.member_id === child.id && p.badge_id === badgeId && p.status === 'completed');
  };

  const getBadgePercentage = (badgeId) => {
    const badgeModules = modules.filter(m => m.badge_id === badgeId);
    let total = 0, completed = 0;
    badgeModules.forEach(mod => {
      const modReqs = requirements.filter(r => r.module_id === mod.id);
      total += modReqs.length;
      completed += reqProgress.filter(p => p.member_id === child.id && p.module_id === mod.id && p.completed).length;
    });
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const isInProgress = (badgeId) => {
    if (isEarned(badgeId)) return false;
    const badgeMods = modules.filter(m => m.badge_id === badgeId);
    const modIds = badgeMods.map(m => m.id);
    return reqProgress.some(p => p.member_id === child.id && modIds.includes(p.module_id) && p.completed);
  };

  // Group staged badges by family — show only the highest relevant stage per family
  const stagedFamilies = {};
  sectionBadges.filter(b => b.category === 'staged' && !b.is_chief_scout_award && b.badge_family_id).forEach(b => {
    if (!stagedFamilies[b.badge_family_id]) stagedFamilies[b.badge_family_id] = [];
    stagedFamilies[b.badge_family_id].push(b);
  });

  // For each family, pick the highest earned stage (or stage 1 if none earned)
  const stagedRepresentatives = Object.values(stagedFamilies).map(stages => {
    const sorted = stages.sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
    const earnedStages = sorted.filter(b => isEarned(b.id));
    const highestEarned = earnedStages.length > 0 ? earnedStages[earnedStages.length - 1] : null;
    const nextStage = highestEarned
      ? sorted.find(b => (b.stage_number || 0) > (highestEarned.stage_number || 0))
      : sorted[0];
    // Show: next stage to work towards (or highest earned if all done)
    return nextStage || highestEarned;
  }).filter(Boolean);

  // Also include staged badges without a family_id
  const stagedNoFamily = sectionBadges.filter(b => b.category === 'staged' && !b.is_chief_scout_award && !b.badge_family_id);
  const stagedBadges = [...stagedRepresentatives, ...stagedNoFamily];

  const handleStagedBadgeClick = (badge) => {
    if (!badge.badge_family_id) { setSelectedBadge(badge); setStagedContext(null); return; }
    const family = stagedFamilies[badge.badge_family_id] || [];
    const sorted = family.sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
    const earnedStages = sorted.filter(b => isEarned(b.id));
    const highestEarned = earnedStages.length > 0 ? earnedStages[earnedStages.length - 1] : null;
    const nextStage = highestEarned
      ? sorted.find(b => (b.stage_number || 0) > (highestEarned.stage_number || 0))
      : sorted[0];
    setStagedContext({ highestEarned, nextStageBadge: nextStage || null, allStages: sorted });
    setSelectedBadge(nextStage || highestEarned);
  };

  const goldAwardBadge = badges.find(b => b.is_chief_scout_award);

  // Group by category
  const challengeBadges = sectionBadges.filter(b => b.category === 'challenge' && !b.is_chief_scout_award);
  const activityBadges = sectionBadges.filter(b => b.category === 'activity' && !b.is_chief_scout_award);
  // Core: exclude chief scout award, only show earned badges
  const coreBadges = sectionBadges.filter(b => b.category === 'core' && !b.is_chief_scout_award && isEarned(b.id));

  return (
    <div className="flex flex-col">
      {/* Gold Award full-page view */}
      {showGoldAward && goldAwardBadge && (
        <GoldAwardPage
          badge={goldAwardBadge}
          child={child}
          modules={modules}
          requirements={requirements}
          reqProgress={reqProgress}
          awards={awards}
          badgeProgress={badgeProgress}
          onClose={() => setShowGoldAward(false)}
        />
      )}
      {/* Badge criteria modal */}
      {selectedBadge && (
        <BadgeCriteriaModal
          badge={selectedBadge}
          child={child}
          modules={modules}
          requirements={requirements}
          reqProgress={reqProgress}
          awards={awards}
          badgeProgress={badgeProgress}
          stagedContext={stagedContext}
          onClose={() => { setSelectedBadge(null); setStagedContext(null); }}
        />
      )}

      <div className="bg-gradient-to-br from-yellow-600 to-[#7413dc] px-5 pb-6 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <h1 className="text-2xl font-bold">Badges & Awards</h1>
        <p className="text-white/70 text-sm mt-1">{child.full_name}'s progress</p>

      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Gold Award / Chief Scout Banner */}
        <GoldAwardBanner
          child={child}
          badges={badges}
          awards={awards}
          badgeProgress={badgeProgress}
          sections={sections}
          onLearnMore={() => setShowGoldAward(true)}
        />

        {/* Sections by category */}
        <BadgeCategorySection
          title={CATEGORY_CONFIG.challenge.label}
          icon={CATEGORY_CONFIG.challenge.icon}
          badges={challengeBadges}
          isEarned={isEarned}
          isInProgress={isInProgress}
          getBadgePercentage={getBadgePercentage}
          onBadgeClick={setSelectedBadge}
        />
        <BadgeCategorySection
          title={CATEGORY_CONFIG.activity.label}
          icon={CATEGORY_CONFIG.activity.icon}
          badges={activityBadges}
          isEarned={isEarned}
          isInProgress={isInProgress}
          getBadgePercentage={getBadgePercentage}
          onBadgeClick={setSelectedBadge}
        />
        <BadgeCategorySection
          title={CATEGORY_CONFIG.staged.label}
          icon={CATEGORY_CONFIG.staged.icon}
          badges={stagedBadges}
          showCounter={false}
          isEarned={(badgeId) => {
            // For staged badges: green if ANY stage in the same family is earned
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
        />
        <BadgeCategorySection
          title={CATEGORY_CONFIG.chief_scout_award.label}
          icon={CATEGORY_CONFIG.chief_scout_award.icon}
          badges={coreBadges}
          showCounter={false}
          isEarned={isEarned}
          isInProgress={isInProgress}
          getBadgePercentage={getBadgePercentage}
          onBadgeClick={setSelectedBadge}
        />

        {sectionBadges.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No badges found for this section.</p>
          </div>
        )}
      </div>
    </div>
  );
}