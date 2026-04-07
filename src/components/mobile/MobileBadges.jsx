import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Award, CheckCircle, Circle, Star, Trophy, ChevronDown, ChevronUp, X } from 'lucide-react';
import BadgeCriteriaModal from './BadgeCriteriaModal';

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

function BadgeCategorySection({ title, icon, badges, isEarned, isInProgress, getBadgePercentage, onBadgeClick, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
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
          <p className="text-xs text-gray-400 mt-0.5">{earnedCount}/{badges.length} earned</p>
        </div>
        {/* Mini progress bar */}
        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
          <div
            className="h-full bg-[#7413dc] rounded-full"
            style={{ width: `${badges.length > 0 ? (earnedCount / badges.length) * 100 : 0}%` }}
          />
        </div>
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
  const childSection = sections.find(s => s.id === child?.section_id);
  const chiefScoutBadges = badges.filter(b => b.is_chief_scout_award || b.category === 'chief_scout_award');
  const chiefScoutAward = chiefScoutBadges[0];
  if (!chiefScoutAward) return null;

  const isEarned = awards.some(a => a.member_id === child?.id && a.badge_id === chiefScoutAward.id)
    || badgeProgress.some(p => p.member_id === child?.id && p.badge_id === chiefScoutAward.id && p.status === 'completed');

  return (
    <button
      onClick={onLearnMore}
      className="w-full text-left active:scale-98 transition-transform"
    >
      <div className={`rounded-2xl overflow-hidden ${isEarned ? 'bg-gradient-to-r from-yellow-400 to-orange-400' : 'bg-gradient-to-r from-gray-700 to-gray-800'}`}>
        <div className="flex items-center gap-4 p-4">
          <div className="flex-shrink-0">
            {chiefScoutAward.image_url ? (
              <img
                src={chiefScoutAward.image_url}
                alt={chiefScoutAward.name}
                className={`w-14 h-14 object-contain rounded-xl ${!isEarned ? 'grayscale opacity-60' : ''}`}
              />
            ) : (
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                🏆
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-white text-sm">{chiefScoutAward.name}</p>
              {isEarned && <span className="bg-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Achieved!</span>}
            </div>
            <p className="text-white/80 text-xs mt-0.5">
              {isEarned ? 'Congratulations on this achievement!' : 'The highest award for this section'}
            </p>
            <p className="text-white/60 text-[10px] mt-1.5 font-medium">Tap to view criteria →</p>
          </div>
          {isEarned && (
            <Trophy className="w-8 h-8 text-white/80 flex-shrink-0" />
          )}
        </div>
      </div>
    </button>
  );
}

export default function MobileBadges({ children }) {
  const child = children[0];
  const [selectedBadge, setSelectedBadge] = useState(null);

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

  // Group by category
  const challengeBadges = sectionBadges.filter(b => b.category === 'challenge' && !b.is_chief_scout_award);
  const activityBadges = sectionBadges.filter(b => b.category === 'activity' && !b.is_chief_scout_award);
  const stagedBadges = sectionBadges.filter(b => b.category === 'staged' && !b.is_chief_scout_award);
  const coreBadges = sectionBadges.filter(b => b.category === 'chief_scout_award' || b.is_chief_scout_award);

  const totalEarned = sectionBadges.filter(b => isEarned(b.id)).length;
  const totalInProgress = sectionBadges.filter(b => !isEarned(b.id) && isInProgress(b.id)).length;

  return (
    <div className="flex flex-col">
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
          onClose={() => setSelectedBadge(null)}
        />
      )}

      <div className="bg-gradient-to-br from-yellow-600 to-[#7413dc] px-5 pb-6 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <h1 className="text-2xl font-bold">Badges & Awards</h1>
        <p className="text-white/70 text-sm mt-1">{child.full_name}'s progress</p>
        <div className="flex gap-4 mt-4">
          <div className="bg-white/15 rounded-xl px-3 py-2 text-center">
            <p className="text-xl font-bold">{totalEarned}</p>
            <p className="text-xs text-white/70">Earned</p>
          </div>
          <div className="bg-white/15 rounded-xl px-3 py-2 text-center">
            <p className="text-xl font-bold">{totalInProgress}</p>
            <p className="text-xs text-white/70">In Progress</p>
          </div>
          <div className="bg-white/15 rounded-xl px-3 py-2 text-center">
            <p className="text-xl font-bold">{sectionBadges.length - totalEarned - totalInProgress}</p>
            <p className="text-xs text-white/70">To Start</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Gold Award / Chief Scout Banner */}
        <GoldAwardBanner
          child={child}
          badges={badges}
          awards={awards}
          badgeProgress={badgeProgress}
          sections={sections}
          onLearnMore={() => {
            const award = badges.find(b => b.is_chief_scout_award || b.category === 'chief_scout_award');
            if (award) setSelectedBadge(award);
          }}
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
          defaultOpen={true}
        />
        <BadgeCategorySection
          title={CATEGORY_CONFIG.activity.label}
          icon={CATEGORY_CONFIG.activity.icon}
          badges={activityBadges}
          isEarned={isEarned}
          isInProgress={isInProgress}
          getBadgePercentage={getBadgePercentage}
          onBadgeClick={setSelectedBadge}
          defaultOpen={true}
        />
        <BadgeCategorySection
          title={CATEGORY_CONFIG.staged.label}
          icon={CATEGORY_CONFIG.staged.icon}
          badges={stagedBadges}
          isEarned={isEarned}
          isInProgress={isInProgress}
          getBadgePercentage={getBadgePercentage}
          onBadgeClick={setSelectedBadge}
        />
        <BadgeCategorySection
          title={CATEGORY_CONFIG.chief_scout_award.label}
          icon={CATEGORY_CONFIG.chief_scout_award.icon}
          badges={coreBadges}
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