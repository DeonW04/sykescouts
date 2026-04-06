import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Award, CheckCircle, Circle } from 'lucide-react';

function BadgePill({ badge, isEarned, inProgress, percentage }) {
  return (
    <div className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
      isEarned
        ? 'bg-green-50 border-green-200'
        : inProgress
        ? 'bg-orange-50 border-orange-200'
        : 'bg-white border-gray-100 opacity-60'
    }`}>
      <div className="relative">
        <img
          src={badge.image_url}
          alt={badge.name}
          className={`w-12 h-12 object-contain rounded-xl ${!isEarned && !inProgress ? 'grayscale opacity-50' : ''}`}
        />
        {isEarned && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      <p className="text-[10px] text-center font-medium text-gray-700 leading-tight line-clamp-2">{badge.name}</p>
      {inProgress && !isEarned && (
        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-orange-400 rounded-full" style={{ width: `${percentage}%` }} />
        </div>
      )}
    </div>
  );
}

export default function MobileBadges({ children }) {
  const child = children[0];

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
    (b.section === childSectionName || b.section === 'all') && !b.is_chief_scout_award && b.category !== 'special'
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

  const earned = sectionBadges.filter(b => isEarned(b.id));
  const inProgress = sectionBadges.filter(b => !isEarned(b.id) && isInProgress(b.id));
  const notStarted = sectionBadges.filter(b => !isEarned(b.id) && !isInProgress(b.id));

  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-yellow-600 to-[#7413dc] px-5 pt-12 pb-6 text-white">
        <h1 className="text-2xl font-bold">Badges & Awards</h1>
        <p className="text-white/70 text-sm mt-1">{child.full_name}'s progress</p>
        <div className="flex gap-4 mt-4">
          <div className="bg-white/15 rounded-xl px-3 py-2 text-center">
            <p className="text-xl font-bold">{earned.length}</p>
            <p className="text-xs text-white/70">Earned</p>
          </div>
          <div className="bg-white/15 rounded-xl px-3 py-2 text-center">
            <p className="text-xl font-bold">{inProgress.length}</p>
            <p className="text-xs text-white/70">In Progress</p>
          </div>
          <div className="bg-white/15 rounded-xl px-3 py-2 text-center">
            <p className="text-xl font-bold">{notStarted.length}</p>
            <p className="text-xs text-white/70">To Start</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">
        {earned.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Earned</h2>
              <span className="bg-green-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{earned.length}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {earned.map(b => (
                <BadgePill key={b.id} badge={b} isEarned={true} inProgress={false} percentage={100} />
              ))}
            </div>
          </div>
        )}

        {inProgress.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">In Progress</h2>
              <span className="bg-orange-400 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{inProgress.length}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {inProgress.map(b => (
                <BadgePill key={b.id} badge={b} isEarned={false} inProgress={true} percentage={getBadgePercentage(b.id)} />
              ))}
            </div>
          </div>
        )}

        {notStarted.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Available to Work Towards</h2>
            <div className="grid grid-cols-4 gap-2">
              {notStarted.map(b => (
                <BadgePill key={b.id} badge={b} isEarned={false} inProgress={false} percentage={0} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}