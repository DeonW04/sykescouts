import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Award, Trophy, Star, CheckCircle, Circle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import LeaderNav from '../components/leader/LeaderNav';
import { differenceInMonths, differenceInYears, addYears } from 'date-fns';

// Scouts age out at 18
const SCOUTS_MAX_AGE = 18;
const ACTIVITY_BADGES_REQUIRED = 6;

function getSectionTimeInfo(member) {
  if (!member?.date_of_birth) return null;
  const dob = new Date(member.date_of_birth);
  const now = new Date();
  const ageOutDate = addYears(dob, SCOUTS_MAX_AGE);
  const totalMonthsRemaining = differenceInMonths(ageOutDate, now);
  if (totalMonthsRemaining < 0) return { years: 0, months: 0, totalMonths: 0, pct: 0 };
  const years = Math.floor(totalMonthsRemaining / 12);
  const months = totalMonthsRemaining % 12;
  // Scouts join at ~10.5, age out at 18 → ~90 months total
  const totalSectionMonths = (SCOUTS_MAX_AGE - 10.5) * 12;
  const pct = Math.min(100, Math.round((totalMonthsRemaining / totalSectionMonths) * 100));
  return { years, months, totalMonths: totalMonthsRemaining, pct };
}

export default function GoldAwardDetail() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: goldAwardBadge } = useQuery({
    queryKey: ['gold-award-badge'],
    queryFn: async () => {
      const badges = await base44.entities.BadgeDefinition.filter({ is_chief_scout_award: true, section: 'scouts', active: true });
      return badges[0];
    },
  });

  const { data: challengeBadges = [] } = useQuery({
    queryKey: ['challenge-badges'],
    queryFn: async () => {
      const badges = await base44.entities.BadgeDefinition.filter({ category: 'challenge', section: 'scouts', active: true });
      return badges.filter(b => !b.is_chief_scout_award);
    },
  });

  // Activity badge IDs for scouts (only activity category, not staged families)
  const { data: activityBadgeIds = [] } = useQuery({
    queryKey: ['activity-badge-ids-scouts'],
    queryFn: async () => {
      const all = await base44.entities.BadgeDefinition.filter({ active: true });
      return all
        .filter(b =>
          b.category === 'activity' &&
          (b.section === 'scouts' || b.section === 'all') &&
          !b.is_chief_scout_award &&
          !b.name.toLowerCase().includes('joining in award')
        )
        .map(b => b.id);
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ['scout-members'],
    queryFn: async () => {
      const sections = await base44.entities.Section.filter({ name: 'scouts', active: true });
      if (sections.length === 0) return [];
      return base44.entities.Member.filter({ section_id: sections[0].id, active: true });
    },
  });

  const { data: allAwards = [] } = useQuery({
    queryKey: ['all-badge-awards'],
    queryFn: () => base44.entities.MemberBadgeAward.filter({}),
  });

  const { data: allRequirementProgress = [] } = useQuery({
    queryKey: ['all-req-progress-gold'],
    queryFn: () => base44.entities.MemberRequirementProgress.filter({}),
  });

  const { data: allBadgeProgress = [] } = useQuery({
    queryKey: ['all-badge-progress-gold'],
    queryFn: () => base44.entities.MemberBadgeProgress.filter({}),
  });

  const { data: allModules = [] } = useQuery({
    queryKey: ['modules-all'],
    queryFn: () => base44.entities.BadgeModule.filter({}),
  });

  const { data: allRequirements = [] } = useQuery({
    queryKey: ['requirements'],
    queryFn: () => base44.entities.BadgeRequirement.filter({}),
  });

  // Trigger Gold Award check when awards change
  React.useEffect(() => {
    if (allAwards.length > 0) {
      base44.functions.invoke('checkGoldAward', {});
    }
  }, [allAwards.length]);

  // Check if a member has completed a specific badge (using requirement progress or DB record)
  const isBadgeCompleted = (memberId, badge) => {
    // First check award record
    const awarded = allAwards.some(a => a.member_id === memberId && a.badge_id === badge.id && (a.award_status === 'awarded' || a.award_status === 'pending'));
    if (awarded) return true;

    // Then check badge progress DB record
    const dbComplete = allBadgeProgress.some(p => p.member_id === memberId && p.badge_id === badge.id && p.status === 'completed');
    if (dbComplete) return true;

    // Finally check requirement-level completion
    const badgeMods = allModules.filter(m => m.badge_id === badge.id);
    const badgeReqs = allRequirements.filter(r => r.badge_id === badge.id);
    if (badgeMods.length === 0) return false;

    const memberReqProg = allRequirementProgress.filter(p => p.member_id === memberId && p.badge_id === badge.id);
    const isOneMod = badge.completion_rule === 'one_module';
    if (isOneMod) {
      return badgeMods.some(mod => {
        const modReqs = badgeReqs.filter(r => r.module_id === mod.id);
        if (!modReqs.length) return false;
        const done = memberReqProg.filter(p => p.module_id === mod.id && p.completed);
        return mod.completion_rule === 'x_of_n_required'
          ? done.length >= (mod.required_count || modReqs.length)
          : done.length >= modReqs.length;
      });
    }
    return badgeMods.every(mod => {
      const modReqs = badgeReqs.filter(r => r.module_id === mod.id);
      const done = memberReqProg.filter(p => p.module_id === mod.id && p.completed);
      return mod.completion_rule === 'x_of_n_required'
        ? done.length >= (mod.required_count || modReqs.length)
        : done.length >= modReqs.length;
    });
  };

  const getMemberProgress = (memberId) => {
    const challengesCompleted = challengeBadges.filter(badge => isBadgeCompleted(memberId, badge));
    // Count distinct activity badges: check MemberBadgeAward OR MemberBadgeProgress
    const activityAwardedIds = new Set(
      allAwards
        .filter(a => a.member_id === memberId && activityBadgeIds.includes(a.badge_id) && (a.award_status === 'awarded' || a.award_status === 'pending'))
        .map(a => a.badge_id)
    );
    allBadgeProgress
      .filter(p => p.member_id === memberId && activityBadgeIds.includes(p.badge_id) && p.status === 'completed')
      .forEach(p => activityAwardedIds.add(p.badge_id));
    const activitiesCompleted = activityAwardedIds.size;
    const hasGoldAward = goldAwardBadge && allAwards.some(a =>
      a.member_id === memberId && a.badge_id === goldAwardBadge.id && a.award_status === 'awarded'
    );
    return {
      completed: challengesCompleted.length,
      total: challengeBadges.length,
      percentage: challengeBadges.length > 0 ? Math.round((challengesCompleted.length / challengeBadges.length) * 100) : 0,
      badges: challengesCompleted,
      activitiesCompleted,
      hasGoldAward,
    };
  };

  const filteredMembers = members.filter(m =>
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sortedMembers = [...filteredMembers].sort((a, b) => new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime());
  const eligibleMembers = sortedMembers.filter(m => getMemberProgress(m.id).completed === challengeBadges.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50">
      <LeaderNav />

      <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('LeaderBadges'))} className="text-white hover:bg-white/10 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Badges
          </Button>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl">
              {goldAwardBadge?.image_url ? (
                <img src={goldAwardBadge.image_url} alt="Gold Award" className="w-28 h-28 rounded-full" />
              ) : (
                <Trophy className="w-20 h-20 text-amber-500" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-8 h-8" />
                <h1 className="text-4xl font-bold">Chief Scout's Gold Award</h1>
              </div>
              <p className="text-xl text-white/90 mb-4">
                The highest award in Scouts — complete all {challengeBadges.length} challenge badges
              </p>
              <div className="flex items-center gap-6 text-white/90">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  <span>{eligibleMembers.length} Scouts eligible</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  <span>{challengeBadges.length} Challenge Badges required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  <span>{ACTIVITY_BADGES_REQUIRED} Activity Badges required</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Challenge Badges Overview */}
        <Card className="mb-8 border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <Star className="w-5 h-5" />
              Required Challenge Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {challengeBadges.map(badge => (
                <div
                  key={badge.id}
                  onClick={() => navigate(createPageUrl('BadgeDetail') + `?id=${badge.id}`)}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-200 hover:shadow-md cursor-pointer transition-all"
                >
                  <img src={badge.image_url} alt={badge.name} className="w-12 h-12 rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{badge.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <Input placeholder="Search scouts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </CardContent>
        </Card>

        {/* Eligible Members */}
        {eligibleMembers.length > 0 && (
          <Card className="mb-6 border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <Trophy className="w-5 h-5" />
                Eligible for Gold Award ({eligibleMembers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {eligibleMembers.map(member => {
                  const progress = getMemberProgress(member.id);
                  return (
                    <div
                      key={member.id}
                      onClick={() => navigate(createPageUrl('MemberDetail') + `?id=${member.id}`)}
                      className="flex items-center gap-4 p-4 bg-white rounded-lg border-2 border-green-300 hover:shadow-lg cursor-pointer transition-all"
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                        {member.full_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{member.full_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-700 font-medium">All challenges complete!</span>
                          {progress.hasGoldAward && (
                            <Badge className="bg-amber-500 text-white">Gold Award Awarded</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Members Progress */}
        <Card>
          <CardHeader>
            <CardTitle>All Scouts Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedMembers.map(member => {
                const progress = getMemberProgress(member.id);
                const timeInfo = getSectionTimeInfo(member);
                const isEligible = progress.completed === challengeBadges.length;
                const activityMet = progress.activitiesCompleted >= ACTIVITY_BADGES_REQUIRED;

                return (
                  <div
                    key={member.id}
                    onClick={() => navigate(createPageUrl('MemberDetail') + `?id=${member.id}`)}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-all border border-gray-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                        isEligible ? 'bg-gradient-to-br from-amber-400 to-yellow-500' : 'bg-gray-400'
                      }`}>
                        {member.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold">{member.full_name}</p>
                          <div className="flex items-center gap-2">
                            {progress.hasGoldAward && <Trophy className="w-4 h-4 text-amber-500" />}
                          </div>
                        </div>

                        {/* Challenge badges progress */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Challenge badges: {progress.completed}/{progress.total}</span>
                            <span>{progress.percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${isEligible ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-blue-500'}`}
                              style={{ width: `${progress.percentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Activity badges count */}
                        <div className="mb-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`font-medium ${activityMet ? 'text-green-700' : 'text-gray-600'}`}>
                              Activity badges: {progress.activitiesCompleted}/{ACTIVITY_BADGES_REQUIRED} required
                            </span>
                            {activityMet && <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className={`h-1.5 rounded-full transition-all ${activityMet ? 'bg-green-500' : 'bg-orange-400'}`}
                              style={{ width: `${Math.min(100, Math.round((progress.activitiesCompleted / ACTIVITY_BADGES_REQUIRED) * 100))}%` }}
                            />
                          </div>
                        </div>

                        {/* Time remaining in section */}
                        {timeInfo && (
                          <div className="mb-2">
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>
                                {timeInfo.totalMonths > 0
                                  ? `${timeInfo.years > 0 ? `${timeInfo.years}yr ` : ''}${timeInfo.months}mo remaining in Scouts`
                                  : 'Aged out of Scouts'}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${timeInfo.pct > 50 ? 'bg-green-400' : timeInfo.pct > 25 ? 'bg-orange-400' : 'bg-red-400'}`}
                                style={{ width: `${timeInfo.pct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Challenge badge icons */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {challengeBadges.map(badge => {
                            const isCompleted = progress.badges.some(b => b.id === badge.id);
                            return (
                              <div
                                key={badge.id}
                                className={`w-6 h-6 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-100' : 'bg-gray-200'}`}
                                title={badge.name}
                              >
                                {isCompleted
                                  ? <CheckCircle className="w-4 h-4 text-green-600" />
                                  : <Circle className="w-4 h-4 text-gray-400" />
                                }
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}