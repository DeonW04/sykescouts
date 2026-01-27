import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Star, Award, CheckCircle, Circle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import ParentNav from '../components/parent/ParentNav';
import { motion } from 'framer-motion';

export default function ParentGoldAward() {
  const [user, setUser] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState(null);

  React.useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

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
    queryKey: ['awards', child],
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
    queryKey: ['req-progress', child],
    queryFn: async () => {
      if (!child) return [];
      const allReqProgress = await base44.entities.MemberRequirementProgress.filter({});
      return allReqProgress.filter(p => p.member_id === child.id);
    },
    enabled: !!child,
  });

  const { data: badgeProgress = [] } = useQuery({
    queryKey: ['badge-progress', child],
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

  const challengeBadges = badges.filter(b => 
    b.category === 'challenge' && b.section === 'scouts' && !b.is_chief_scout_award
  );

  const activityBadges = badges.filter(b => 
    b.category === 'activity' && b.section === 'scouts'
  );

  const completedChallenges = challengeBadges.filter(badge =>
    badgeProgress.some(p => p.badge_id === badge.id && p.status === 'completed')
  );

  const completedActivities = activityBadges.filter(badge =>
    badgeProgress.some(p => p.badge_id === badge.id && p.status === 'completed')
  );

  const goldAward = badges.find(b => b.is_chief_scout_award && b.section === 'scouts');
  const hasGoldAward = goldAward && awards.some(a => 
    a.badge_id === goldAward.id && a.award_status === 'awarded'
  );

  const challengeProgress = (completedChallenges.length / challengeBadges.length) * 100;
  const activityProgress = (completedActivities.length / 8) * 100;

  const getBadgeModules = (badgeId) => {
    return modules.filter(m => m.badge_id === badgeId).sort((a, b) => a.order - b.order);
  };

  const getModuleRequirements = (moduleId) => {
    return requirements.filter(r => r.module_id === moduleId).sort((a, b) => a.order - b.order);
  };

  const isRequirementCompleted = (reqId) => {
    return reqProgress.some(p => p.requirement_id === reqId && p.completed);
  };

  const getBadgeProgress = (badgeId) => {
    const badgeModules = modules.filter(m => m.badge_id === badgeId);
    let totalRequired = 0;
    let totalCompleted = 0;

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

    return {
      completed: totalCompleted,
      total: totalRequired,
      percentage: totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0,
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      <ParentNav />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-white py-20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="w-40 h-40 mx-auto mb-6 relative"
            >
              <div className="absolute inset-0 bg-white rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center shadow-2xl">
                {goldAward?.image_url ? (
                  <img src={goldAward.image_url} alt="Gold Award" className="w-32 h-32 rounded-full" />
                ) : (
                  <Trophy className="w-24 h-24 text-amber-500" />
                )}
              </div>
            </motion.div>
            
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-5xl font-bold mb-3"
            >
              Chief Scout's Gold Award
            </motion.h1>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-2xl text-yellow-100 mb-6"
            >
              The Highest Award in Scouts
            </motion.p>

            {hasGoldAward && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full text-xl"
              >
                <Trophy className="w-6 h-6" />
                <span className="font-bold">Gold Award Achieved!</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Requirements Overview */}
        <Card className="mb-10 border-4 border-amber-200 bg-gradient-to-br from-white to-amber-50">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-3 text-amber-900">
              <Star className="w-7 h-7" />
              Requirements for Gold Award
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">1. Complete ALL 9 Challenge Badges</h3>
                <Badge className={completedChallenges.length === 9 ? "bg-green-600" : "bg-blue-600"}>
                  {completedChallenges.length} / 9
                </Badge>
              </div>
              <Progress value={challengeProgress} className="h-3" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">2. Complete at least 8 Activity Badges</h3>
                <Badge className={completedActivities.length >= 8 ? "bg-green-600" : "bg-blue-600"}>
                  {completedActivities.length} / 8
                </Badge>
              </div>
              <Progress value={activityProgress} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Challenge Badges Grid */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-6 h-6 text-amber-600" />
            <h2 className="text-3xl font-bold text-amber-900">Challenge Badges</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-6">
            {challengeBadges.map((badge, index) => {
              const isComplete = badgeProgress.some(p => p.badge_id === badge.id && p.status === 'completed');
              const progress = getBadgeProgress(badge.id);
              
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    onClick={() => setSelectedBadge(badge)}
                    className={`cursor-pointer transition-all hover:shadow-xl hover:scale-105 ${
                      isComplete ? 'bg-green-50 border-green-300 border-2' : 'border-amber-200'
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
                      <img
                        src={badge.image_url}
                        alt={badge.name}
                        className="w-28 h-28 mx-auto rounded-lg mb-3"
                      />
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
                  {completedActivities.length} of 8 Activity Badges Completed
                </span>
                <Badge className={completedActivities.length >= 8 ? "bg-green-600" : "bg-purple-600"}>
                  {completedActivities.length >= 8 ? 'Requirement Met!' : 'In Progress'}
                </Badge>
              </div>
              <Progress value={activityProgress} className="h-4" />
              <p className="text-sm text-gray-600">
                Activity badges can be from any category. Keep working on the badges that interest you!
              </p>
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
                  <img
                    src={selectedBadge.image_url}
                    alt={selectedBadge.name}
                    className="w-20 h-20 rounded-lg"
                  />
                  <div>
                    <DialogTitle className="text-2xl">{selectedBadge.name}</DialogTitle>
                    {selectedBadge.description && (
                      <p className="text-gray-600 mt-1">{selectedBadge.description}</p>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {getBadgeModules(selectedBadge.id).map(module => {
                  const moduleReqs = getModuleRequirements(module.id);
                  return (
                    <div key={module.id} className="border-l-4 border-amber-400 pl-4">
                      <h3 className="font-bold text-lg mb-3">{module.name}</h3>
                      <div className="space-y-2">
                        {moduleReqs.map((req, idx) => {
                          const completed = isRequirementCompleted(req.id);
                          return (
                            <div key={req.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                              {completed ? (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              ) : (
                                <Circle className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                              )}
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