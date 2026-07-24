import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Award, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BadgeCluster from '@/components/mobile/award/BadgeCluster';

const AWARD_CONFIG = {
  scouts: { title: "Chief Scout's Gold Award", accent: '#f59e0b', gradient: 'linear-gradient(160deg, #14213d 0%, #0f172a 55%, #1a1024 100%)', implemented: true },
  cubs: { title: "Chief Scout's Silver Award", accent: '#94a3b8', gradient: 'linear-gradient(160deg, #1e293b 0%, #0f172a 55%, #1a1f35 100%)', implemented: false },
  beavers: { title: "Chief Scout's Bronze Award", accent: '#b45309', gradient: 'linear-gradient(160deg, #2a1a0f 0%, #0f172a 55%, #1f1408 100%)', implemented: false },
};

export default function AwardJourneySection({ child, sectionName }) {
  const navigate = useNavigate();
  const config = AWARD_CONFIG[sectionName] || AWARD_CONFIG.scouts;

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
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
    queryKey: ['req-progress', child?.id],
    queryFn: async () => (await base44.entities.MemberRequirementProgress.filter({})).filter(p => p.member_id === child.id),
    enabled: !!child,
  });
  const { data: awards = [] } = useQuery({
    queryKey: ['awards', child?.id],
    queryFn: async () => (await base44.entities.MemberBadgeAward.filter({})).filter(a => a.member_id === child.id),
    enabled: !!child,
  });
  const { data: badgeProgress = [] } = useQuery({
    queryKey: ['badge-progress', child?.id],
    queryFn: async () => (await base44.entities.MemberBadgeProgress.filter({})).filter(p => p.member_id === child.id),
    enabled: !!child,
  });

  const section = sectionName || 'scouts';
  const awardBadge = badges.find(b => b.is_chief_scout_award && b.section === section);
  const challengeBadges = badges
    .filter(b => b.category === 'challenge' && b.section === section && !b.is_chief_scout_award)
    .sort((a, b) => (a.display_priority || 0) - (b.display_priority || 0) || a.name.localeCompare(b.name));
  const activityBadges = badges.filter(b => b.category === 'activity' && (b.section === section || b.section === 'all'));

  const isEarned = (badgeId) =>
    awards.some(a => a.badge_id === badgeId) ||
    badgeProgress.some(p => p.badge_id === badgeId && p.status === 'completed');

  const getBadgePercentage = (badgeId) => {
    const badgeMods = modules.filter(m => m.badge_id === badgeId);
    let total = 0, completed = 0;
    badgeMods.forEach(mod => {
      const modReqs = requirements.filter(r => r.module_id === mod.id);
      if (mod.completion_rule === 'x_of_n_required') {
        const needed = mod.required_count || modReqs.length;
        total += needed;
        completed += Math.min(reqProgress.filter(p => p.module_id === mod.id && p.completed).length, needed);
      } else {
        total += modReqs.length;
        completed += reqProgress.filter(p => p.module_id === mod.id && p.completed).length;
      }
    });
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const challengeEarned = challengeBadges.filter(b => isEarned(b.id)).length;
  const activityEarned = activityBadges.filter(b => isEarned(b.id)).length;
  const awardEarned = awardBadge ? isEarned(awardBadge.id) : false;
  const goToAward = () => navigate(createPageUrl(section === 'cubs' ? 'ParentSilverAward' : 'ParentGoldAward'));

  return (
    <Card className="border-0 shadow-xl overflow-hidden">
      <div style={{ background: config.gradient }} className="px-6 pt-8 pb-6">
        <div className="text-center mb-4">
          <p className="text-xs font-extrabold uppercase tracking-widest mb-1" style={{ color: config.accent }}>Highest Award</p>
          <h2 className="text-2xl font-extrabold text-white">{config.title}</h2>
          {challengeBadges.length > 0 && (
            <p className="text-sm text-white/50 mt-1">
              {challengeEarned} of {challengeBadges.length} challenge badges complete{awardEarned ? ' · 🏆 Achieved!' : ''}
            </p>
          )}
        </div>

        {config.implemented && awardBadge ? (
          <div className="max-w-md mx-auto">
            <BadgeCluster
              awardBadge={awardBadge}
              challengeBadges={challengeBadges}
              isSilver={false}
              isEarned={isEarned}
              getBadgePercentage={getBadgePercentage}
              awardEarned={awardEarned}
              accentColor={config.accent}
              onBadgeClick={goToAward}
              onAwardClick={goToAward}
            />
            <p className="text-center text-white/30 text-xs mt-4">Tap any badge to explore its requirements</p>
          </div>
        ) : (
          <div className="max-w-md mx-auto text-center py-10 px-6 rounded-2xl border border-dashed" style={{ borderColor: `${config.accent}55`, background: 'rgba(255,255,255,0.03)' }}>
            <Sparkles className="w-10 h-10 mx-auto mb-3" style={{ color: config.accent }} />
            <p className="text-white font-bold mb-1">{config.title} diagram coming soon</p>
            <p className="text-white/45 text-sm">We're building the interactive badge diagram for this section. Badge progress is still tracked below.</p>
          </div>
        )}
      </div>

      {/* Stats + view all */}
      <CardContent className="p-6 bg-white">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <Trophy className="w-6 h-6 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-extrabold text-gray-900">{challengeEarned}<span className="text-base font-semibold text-gray-400"> / {challengeBadges.length}</span></p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-0.5">Challenge Badges</p>
          </div>
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-center">
            <Award className="w-6 h-6 text-[#7413dc] mx-auto mb-1" />
            <p className="text-2xl font-extrabold text-gray-900">{activityEarned}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-0.5">Activity Badges</p>
          </div>
        </div>
        <Button className="w-full bg-[#7413dc] hover:bg-[#5c0fb0]" onClick={() => navigate(createPageUrl('ParentBadges'))}>
          View All Badges
        </Button>
      </CardContent>
    </Card>
  );
}