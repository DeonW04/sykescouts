import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Star, Award, CheckCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import HoneycombAwardPage from '../components/mobile/HoneycombAwardPage';

const CUBS_CHALLENGE_REQUIRED = 7;
const ACTIVITY_REQUIRED = 6;

export default function ParentSilverAward() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const isMobile = window.innerWidth < 768;

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: children = [] } = useQuery({
    queryKey: ['children', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allMembers = await base44.entities.Member.filter({});
      return allMembers.filter(m =>
        m.parent_one_email === user.email || m.parent_two_email === user.email
      );
    },
    enabled: !!user?.email,
  });

  const child = children[0];

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: awards = [] } = useQuery({
    queryKey: ['awards', child?.id],
    queryFn: async () => {
      if (!child) return [];
      const allAwards = await base44.entities.MemberBadgeAward.filter({});
      return allAwards.filter(a => a.member_id === child.id);
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

  const { data: reqProgress = [] } = useQuery({
    queryKey: ['req-progress', child?.id],
    queryFn: async () => {
      if (!child) return [];
      const allReqProgress = await base44.entities.MemberRequirementProgress.filter({});
      return allReqProgress.filter(p => p.member_id === child.id);
    },
    enabled: !!child,
  });

  const { data: badgeProgress = [] } = useQuery({
    queryKey: ['badge-progress', child?.id],
    queryFn: async () => {
      if (!child) return [];
      const allProgress = await base44.entities.MemberBadgeProgress.filter({});
      return allProgress.filter(p => p.member_id === child.id);
    },
    enabled: !!child,
  });

  if (!user || !child) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
      </div>
    );
  }

  // On mobile: render the immersive honeycomb view
  const silverAwardBadgeMobile = badges.find(b => b.is_chief_scout_award && b.section === 'cubs')
    || badges.find(b => b.is_chief_scout_award);
  if (isMobile && silverAwardBadgeMobile) {
    return (
      <HoneycombAwardPage
        badge={silverAwardBadgeMobile}
        child={child}
        badges={badges}
        modules={modules}
        requirements={requirements}
        reqProgress={reqProgress}
        awards={awards}
        badgeProgress={badgeProgress}
        onClose={() => navigate(-1)}
        isSilver={true}
      />
    );
  }

  const challengeBadges = badges.filter(b =>
    b.category === 'challenge' && b.section === 'cubs' && !b.is_chief_scout_award
  );

  const activityBadges = badges.filter(b =>
    b.category === 'activity' && (b.section === 'cubs' || b.section === 'all') &&
    !b.name.toLowerCase().includes('joining in award') &&
    !b.name.toLowerCase().includes('nights away') &&
    !b.name.toLowerCase().includes('hikes away')
  );

  const completedChallenges = challengeBadges.filter(badge =>
    badgeProgress.some(p => p.badge_id === badge.id && p.status === 'completed') ||
    awards.some(a => a.badge_id === badge.id && (a.award_status === 'awarded' || a.award_status === 'pending'))
  );

  const completedActivities = activityBadges.filter(badge =>
    badgeProgress.some(p => p.badge_id === badge.id && p.status === 'completed') ||
    awards.some(a => a.badge_id === badge.id && (a.award_status === 'awarded' || a.award_status === 'pending'))
  );

  const silverAward = badges.find(b => b.is_chief_scout_award && b.section === 'cubs');
  const hasSilverAward = silverAward && awards.some(a =>
    a.badge_id === silverAward.id && a.award_status === 'awarded'
  );

  const challengeProgress = challengeBadges.length > 0 ? (completedChallenges.length / CUBS_CHALLENGE_REQUIRED) * 100 : 0;
  const activityProgress = (completedActivities.length / ACTIVITY_REQUIRED) * 100;

  const getBadgeModules = (badgeId) => modules.filter(m => m.badge_id === badgeId).sort((a, b) => a.order - b.order);
  const getModuleRequirements = (moduleId) => requirements.filter(r => r.module_id === moduleId).sort((a, b) => a.order - b.order);
  const isRequirementCompleted = (reqId) => reqProgress.some(p => p.requirement_id === reqId && p.completed);

  const getBadgeProgress = (badgeId) => {
    const badgeModules = modules.filter(m => m.badge_id === badgeId);
    let totalRequired = 0, totalCompleted = 0;
    badgeModules.forEach(module => {
      const moduleReqs = requirements.filter(r => r.module_id === module.id);
      const completedReqs = reqProgress.filter(p =>
        moduleReqs.some(r => r.id === p.requirement_id) && p.completed
      );
      if (module.completion_rule === 'x_of_n_required') {
        totalRequired += module.required_count || moduleReqs.length;
        totalCompleted += Math.min(completedReqs.length, module.required_count || moduleReqs.length);
      } else {
        totalRequired += moduleReqs.length;
        totalCompleted += completedReqs.length;
      }
    });
    return { completed: totalCompleted, total: totalRequired, percentage: totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0 };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 24px' }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-50 border-2 border-gray-300 rounded-xl flex items-center justify-center flex-shrink-0">
              {silverAward?.image_url ? (
                <img src={silverAward.image_url} alt="Silver Award" className="w-10 h-10 rounded-lg" />
              ) : (
                <Trophy className="w-8 h-8 text-gray-500" />
              )}
            </div>
            <div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Parent Portal</p>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 32px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.2 }}>Chief Scout's Silver Award</h1>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>The highest award in Cubs{hasSilverAward ? ' · 🏆 Achieved!' : ''}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Requirements Overview */}
        <Card className="mb-10 border-4 border-gray-200 bg-gradient-to-br from-white to-gray-50">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-3 text-gray-900">
              <Star className="w-7 h-7" />
              Requirements for Silver Award
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">1. Complete any {CUBS_CHALLENGE_REQUIRED} Challenge Badges</h3>
                <Badge className={completedChallenges.length >= CUBS_CHALLENGE_REQUIRED ? "bg-green-600" : "bg-blue-600"}>
                  {completedChallenges.length} / {CUBS_CHALLENGE_REQUIRED}
                </Badge>
              </div>
              <Progress value={Math.min(100, challengeProgress)} className="h-3" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">2. Complete at least {ACTIVITY_REQUIRED} Activity Badges</h3>
                <Badge className={completedActivities.length >= ACTIVITY_REQUIRED ? "bg-green-600" : "bg-blue-600"}>
                  {completedActivities.length} / {ACTIVITY_REQUIRED}
                </Badge>
              </div>
              <Progress value={Math.min(100, activityProgress)} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Challenge Badges Grid */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-6 h-6 text-gray-600" />
            <h2 className="text-3xl font-bold text-gray-900">Challenge Badges</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {challengeBadges.map((badge, index) => {
              const isComplete = badgeProgress.some(p => p.badge_id === badge.id && p.status === 'completed') ||
                awards.some(a => a.badge_id === badge.id && (a.award_status === 'awarded' || a.award_status === 'pending'));
              const progress = getBadgeProgress(badge.id);
              return (
                <motion.div key={badge.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card
                    onClick={() => setSelectedBadge(badge)}
                    className={`cursor-pointer transition-all hover:shadow-xl hover:scale-105 ${
                      isComplete ? 'bg-green-50 border-green-300 border-2' : 'border-gray-200'
                    }`}
                  >
                    <CardContent className="p-6 text-center relative">
                      {isComplete && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-green-600 rounded-full p-1">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      )}
                      <img src={badge.image_url} alt={badge.name} className="w-28 h-28 mx-auto rounded-lg mb-3" />
                      <h3 className="font-bold text-sm mb-2">{badge.name}</h3>
                      {!isComplete && progress.total > 0 && (
                        <div className="space-y-1">
                          <Progress value={progress.percentage} className="h-2" />
                          <p className="text-xs text-gray-600">{progress.percentage}% complete</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Activity Badges Progress */}
        <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Award className="w-6 h-6 text-purple-600" />
              Activity Badges Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">
                  {completedActivities.length} of {ACTIVITY_REQUIRED} Activity Badges Completed
                </span>
                <Badge className={completedActivities.length >= ACTIVITY_REQUIRED ? "bg-green-600" : "bg-purple-600"}>
                  {completedActivities.length >= ACTIVITY_REQUIRED ? 'Requirement Met!' : 'In Progress'}
                </Badge>
              </div>
              <Progress value={Math.min(100, activityProgress)} className="h-4" />
              <p className="text-sm text-gray-600">Keep working on the activity badges that interest you!</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badge Detail Dialog */}
      <Dialog open={!!selectedBadge} onOpenChange={(open) => !open && setSelectedBadge(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedBadge && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <img src={selectedBadge.image_url} alt={selectedBadge.name} className="w-20 h-20 rounded-lg" />
                  <div>
                    <DialogTitle className="text-2xl">{selectedBadge.name}</DialogTitle>
                    {selectedBadge.description && <p className="text-gray-600 mt-1">{selectedBadge.description}</p>}
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                {getBadgeModules(selectedBadge.id).map(module => {
                  const moduleReqs = getModuleRequirements(module.id);
                  return (
                    <div key={module.id} className="border-l-4 border-gray-400 pl-4">
                      <h3 className="font-bold text-lg mb-3">{module.name}</h3>
                      <div className="space-y-2">
                        {moduleReqs.map((req, idx) => {
                          const completed = isRequirementCompleted(req.id);
                          return (
                            <div key={req.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                              {completed
                                ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                              }
                              <span className={`text-sm ${completed ? 'text-gray-900' : 'text-gray-600'}`}>
                                <span className="font-medium">{idx + 1}.</span> {req.text}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}