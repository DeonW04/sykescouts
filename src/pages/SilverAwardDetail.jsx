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
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import { differenceInMonths, addYears } from 'date-fns';

const CUBS_MAX_AGE = 10.5;
const CUBS_CHALLENGE_BADGES_REQUIRED = 7;
const ACTIVITY_BADGES_REQUIRED = 6;

function getSectionTimeInfo(member) {
  if (!member?.date_of_birth) return null;
  const dob = new Date(member.date_of_birth);
  const now = new Date();
  const ageOutDate = addYears(dob, CUBS_MAX_AGE);
  const totalMonthsRemaining = differenceInMonths(ageOutDate, now);
  if (totalMonthsRemaining < 0) return { years: 0, months: 0, totalMonths: 0, pct: 0 };
  const years = Math.floor(totalMonthsRemaining / 12);
  const months = totalMonthsRemaining % 12;
  const totalSectionMonths = (CUBS_MAX_AGE - 8) * 12; // Cubs join ~8, age out ~10.5
  const pct = Math.min(100, Math.round((totalMonthsRemaining / totalSectionMonths) * 100));
  return { years, months, totalMonths: totalMonthsRemaining, pct };
}

export default function SilverAwardDetail() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: silverAwardBadge } = useQuery({
    queryKey: ['silver-award-badge'],
    queryFn: async () => {
      const badges = await base44.entities.BadgeDefinition.filter({ is_chief_scout_award: true, section: 'cubs', active: true });
      return badges[0];
    },
  });

  const { data: challengeBadges = [] } = useQuery({
    queryKey: ['challenge-badges-cubs'],
    queryFn: async () => {
      const badges = await base44.entities.BadgeDefinition.filter({ category: 'challenge', section: 'cubs', active: true });
      return badges.filter(b => !b.is_chief_scout_award);
    },
  });

  const { data: activityBadgeIds = [] } = useQuery({
    queryKey: ['activity-badge-ids-cubs'],
    queryFn: async () => {
      const all = await base44.entities.BadgeDefinition.filter({ active: true });
      return all
        .filter(b =>
          (b.category === 'activity' || b.category === 'staged') &&
          (b.section === 'cubs' || b.section === 'all') &&
          !b.is_chief_scout_award &&
          !b.name.toLowerCase().includes('joining in award') &&
          !b.name.toLowerCase().includes('nights away') &&
          !b.name.toLowerCase().includes('hikes away')
        )
        .map(b => b.id);
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ['cubs-members'],
    queryFn: async () => {
      const sections = await base44.entities.Section.filter({ name: 'cubs', active: true });
      if (sections.length === 0) return [];
      return base44.entities.Member.filter({ section_id: sections[0].id, active: true });
    },
  });

  const { data: allAwards = [] } = useQuery({
    queryKey: ['all-badge-awards'],
    queryFn: () => base44.entities.MemberBadgeAward.filter({}),
  });

  const { data: allRequirementProgress = [] } = useQuery({
    queryKey: ['all-req-progress-silver'],
    queryFn: () => base44.entities.MemberRequirementProgress.filter({}),
  });

  const { data: allBadgeProgress = [] } = useQuery({
    queryKey: ['all-badge-progress-silver'],
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

  const isBadgeCompleted = (memberId, badge) => {
    const awarded = allAwards.some(a => a.member_id === memberId && a.badge_id === badge.id && (a.award_status === 'awarded' || a.award_status === 'pending'));
    if (awarded) return true;
    const dbComplete = allBadgeProgress.some(p => p.member_id === memberId && p.badge_id === badge.id && p.status === 'completed');
    if (dbComplete) return true;
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
    const activityAwardedIds = new Set(
      allAwards
        .filter(a => a.member_id === memberId && activityBadgeIds.includes(a.badge_id) && (a.award_status === 'awarded' || a.award_status === 'pending'))
        .map(a => a.badge_id)
    );
    allBadgeProgress
      .filter(p => p.member_id === memberId && activityBadgeIds.includes(p.badge_id) && p.status === 'completed')
      .forEach(p => activityAwardedIds.add(p.badge_id));
    const activitiesCompleted = activityAwardedIds.size;
    const hasSilverAward = silverAwardBadge && allAwards.some(a =>
      a.member_id === memberId && a.badge_id === silverAwardBadge.id && a.award_status === 'awarded'
    );
    return {
      completed: challengesCompleted.length,
      total: challengeBadges.length,
      percentage: challengeBadges.length > 0 ? Math.round((challengesCompleted.length / challengeBadges.length) * 100) : 0,
      badges: challengesCompleted,
      activitiesCompleted,
      hasSilverAward,
    };
  };

  const filteredMembers = members.filter(m =>
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sortedMembers = [...filteredMembers].sort((a, b) => new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime());
  const eligibleMembers = sortedMembers.filter(m => {
    const p = getMemberProgress(m.id);
    return p.completed >= CUBS_CHALLENGE_BADGES_REQUIRED && p.activitiesCompleted >= ACTIVITY_BADGES_REQUIRED;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-100">
      <FloatingNav />
      <NavBarSpacer />
      <div className="bg-gradient-to-r from-slate-600 via-gray-500 to-slate-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl">
              {silverAwardBadge?.image_url ? (
                <img src={silverAwardBadge.image_url} alt="Silver Award" className="w-28 h-28 rounded-full" />
              ) : (
                <Trophy className="w-20 h-20 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-8 h-8" />
                <h1 className="text-4xl font-bold">Chief Scout's Silver Award</h1>
              </div>
              <p className="text-xl text-white/90 mb-4">
                The highest award in Cubs — complete {CUBS_CHALLENGE_BADGES_REQUIRED} challenge badges &amp; {ACTIVITY_BADGES_REQUIRED} activity badges
              </p>
              <div className="flex items-center gap-6 text-white/90">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  <span>{eligibleMembers.length} Cubs eligible</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  <span>{CUBS_CHALLENGE_BADGES_REQUIRED} Challenge Badges required</span>
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
        <Card className="mb-8 border-2 border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Star className="w-5 h-5" />
              Required Challenge Badges (any {CUBS_CHALLENGE_BADGES_REQUIRED} of {challengeBadges.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {challengeBadges.map(badge => (
                <div
                  key={badge.id}
                  onClick={() => navigate(createPageUrl('BadgeDetail') + `?id=${badge.id}`)}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md cursor-pointer transition-all"
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
            <Input placeholder="Search cubs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </CardContent>
        </Card>

        {/* Eligible Members */}
        {eligibleMembers.length > 0 && (
          <Card className="mb-6 border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <Trophy className="w-5 h-5" />
                Eligible for Silver Award ({eligibleMembers.length})
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
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-slate-500 rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                        {member.full_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{member.full_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-700 font-medium">Eligible for Silver Award!</span>
                          {progress.hasSilverAward && (
                            <Badge className="bg-gray-500 text-white">Silver Award Awarded</Badge>
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
            <CardTitle>All Cubs Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedMembers.map(member => {
                const progress = getMemberProgress(member.id);
                const timeInfo = getSectionTimeInfo(member);
                const challengesMet = progress.completed >= CUBS_CHALLENGE_BADGES_REQUIRED;
                const activityMet = progress.activitiesCompleted >= ACTIVITY_BADGES_REQUIRED;
                const isEligible = challengesMet && activityMet;

                return (
                  <div
                    key={member.id}
                    onClick={() => navigate(createPageUrl('MemberDetail') + `?id=${member.id}`)}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-all border border-gray-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                        isEligible ? 'bg-gradient-to-br from-gray-400 to-slate-500' : 'bg-gray-400'
                      }`}>
                        {member.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold">{member.full_name}</p>
                          <div className="flex items-center gap-2">
                            {progress.hasSilverAward && <Trophy className="w-4 h-4 text-gray-500" />}
                          </div>
                        </div>

                        {/* Challenge badges progress */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Challenge badges: {progress.completed}/{progress.total} (need {CUBS_CHALLENGE_BADGES_REQUIRED})</span>
                            <span className={challengesMet ? 'text-green-600 font-bold' : ''}>{challengesMet ? '✓' : `${progress.percentage}%`}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${challengesMet ? 'bg-green-500' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min(100, Math.round((progress.completed / CUBS_CHALLENGE_BADGES_REQUIRED) * 100))}%` }}
                            />
                          </div>
                        </div>

                        {/* Activity badges */}
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

                        {/* Time remaining */}
                        {timeInfo && (
                          <div className="mb-2">
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>
                                {timeInfo.totalMonths > 0
                                  ? `${timeInfo.years > 0 ? `${timeInfo.years}yr ` : ''}${timeInfo.months}mo remaining in Cubs`
                                  : 'Aged out of Cubs'}
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