import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ParentNav from '../components/parent/ParentNav';
import { motion } from 'framer-motion';

export default function ParentBadges() {
  const [user, setUser] = useState(null);
  const [expandedBadges, setExpandedBadges] = useState([]);

  useEffect(() => {
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

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: badgeProgress = [] } = useQuery({
    queryKey: ['badge-progress', children],
    queryFn: async () => {
      if (children.length === 0) return [];
      const allProgress = await base44.entities.MemberBadgeProgress.filter({});
      return allProgress.filter(p => children.some(c => c.id === p.member_id));
    },
    enabled: children.length > 0,
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
    queryKey: ['req-progress', children],
    queryFn: async () => {
      if (children.length === 0) return [];
      const allReqProgress = await base44.entities.MemberRequirementProgress.filter({});
      return allReqProgress.filter(p => children.some(c => c.id === p.member_id));
    },
    enabled: children.length > 0,
  });

  const { data: awards = [] } = useQuery({
    queryKey: ['awards', children],
    queryFn: async () => {
      if (children.length === 0) return [];
      const allAwards = await base44.entities.MemberBadgeAward.filter({});
      return allAwards.filter(a => children.some(c => c.id === a.member_id));
    },
    enabled: children.length > 0,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
      </div>
    );
  }

  const child = children[0];

  if (!child) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ParentNav />
        <div className="bg-[#7413dc] text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold">Badges & Awards</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">No child registered yet.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Awarded badges (completed AND awarded)
  const awardedBadges = badgeProgress.filter(p => {
    if (p.member_id !== child.id || p.status !== 'completed') return false;
    const award = awards.find(a => a.member_id === child.id && a.badge_id === p.badge_id);
    return award?.award_status === 'awarded';
  });

  // Completed but not yet awarded
  const completedNotAwarded = badgeProgress.filter(p => {
    if (p.member_id !== child.id || p.status !== 'completed') return false;
    const award = awards.find(a => a.member_id === child.id && a.badge_id === p.badge_id);
    return !award || award.award_status === 'pending';
  });

  const inProgressBadges = badgeProgress.filter(p => p.member_id === child.id && p.status === 'in_progress');

  // Group staged badges by family
  const stagedBadgeFamilies = badges
    .filter(b => b.category === 'staged' && b.badge_family_id)
    .reduce((acc, badge) => {
      if (!acc[badge.badge_family_id]) {
        acc[badge.badge_family_id] = {
          name: badge.name,
          stages: []
        };
      }
      acc[badge.badge_family_id].stages.push(badge);
      return acc;
    }, {});

  // Sort stages within families
  Object.values(stagedBadgeFamilies).forEach(family => {
    family.stages.sort((a, b) => a.stage_number - b.stage_number);
  });

  const awardedNonStaged = awardedBadges.filter(p => {
    const badge = badges.find(b => b.id === p.badge_id);
    return badge?.category !== 'staged';
  });

  const completedNotAwardedNonStaged = completedNotAwarded.filter(p => {
    const badge = badges.find(b => b.id === p.badge_id);
    return badge?.category !== 'staged';
  });

  const inProgressNonStaged = inProgressBadges.filter(p => {
    const badge = badges.find(b => b.id === p.badge_id);
    return badge?.category !== 'staged';
  });

  const getBadgeProgress = (badgeId) => {
    const badgeReqs = requirements.filter(r => r.badge_id === badgeId);
    const completedReqs = reqProgress.filter(p => 
      p.member_id === child.id && 
      p.badge_id === badgeId && 
      p.completed
    );
    return {
      completed: completedReqs.length,
      total: badgeReqs.length,
      percentage: Math.round((completedReqs.length / badgeReqs.length) * 100) || 0,
    };
  };

  const toggleExpanded = (badgeId) => {
    if (expandedBadges.includes(badgeId)) {
      setExpandedBadges(expandedBadges.filter(id => id !== badgeId));
    } else {
      setExpandedBadges([...expandedBadges, badgeId]);
    }
  };

  const getBadgeModules = (badgeId) => {
    return modules.filter(m => m.badge_id === badgeId).sort((a, b) => a.order - b.order);
  };

  const getModuleRequirements = (moduleId) => {
    return requirements.filter(r => r.module_id === moduleId).sort((a, b) => a.order - b.order);
  };

  const isRequirementCompleted = (reqId) => {
    return reqProgress.some(p => p.member_id === child.id && p.requirement_id === reqId && p.completed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-purple-50">
      <ParentNav />
      <div className="relative bg-gradient-to-br from-yellow-600 to-[#7413dc] text-white py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Badges & Awards</h1>
              <p className="text-yellow-100 text-lg">{child.full_name}'s progress</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Awarded Badges */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-1 w-12 bg-gradient-to-r from-yellow-600 to-transparent rounded-full"></div>
            <h2 className="text-3xl font-bold">Earned Badges</h2>
          </div>
          {awardedBadges.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Award className="w-10 h-10 text-yellow-600" />
                </div>
                <p className="text-gray-600 text-lg">Keep working towards your first badge!</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {awardedNonStaged.map(progress => {
                  const badge = badges.find(b => b.id === progress.badge_id);
                  if (!badge) return null;
                  
                  return (
                    <Card key={progress.id} className="bg-green-50 border-green-200">
                      <CardContent className="p-6 text-center">
                        <img
                          src={badge.image_url}
                          alt={badge.name}
                          className="w-24 h-24 mx-auto rounded-lg mb-3"
                        />
                        <h3 className="font-semibold">{badge.name}</h3>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-700">
                            Awarded {awards.find(a => a.badge_id === badge.id && a.member_id === child.id)?.awarded_date ? 
                              new Date(awards.find(a => a.badge_id === badge.id && a.member_id === child.id).awarded_date).toLocaleDateString() : 
                              ''}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Staged Badge Families */}
              {Object.entries(stagedBadgeFamilies).map(([familyId, family]) => {
                const awardedStages = family.stages.filter(stage => 
                  awardedBadges.some(p => p.badge_id === stage.id)
                );
                
                if (awardedStages.length === 0) return null;

                return (
                  <Card key={familyId} className="bg-green-50 border-green-200 mb-4">
                    <CardHeader>
                      <CardTitle>{family.name} - Staged Badge</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {family.stages.map(stage => {
                          const stageProgress = awardedBadges.find(p => p.badge_id === stage.id);
                          const isAwarded = !!stageProgress;
                          
                          return (
                            <div
                              key={stage.id}
                              className={`flex-shrink-0 text-center p-4 rounded-lg ${
                                isAwarded ? 'bg-white' : 'opacity-40'
                              }`}
                            >
                              <img
                                src={stage.image_url}
                                alt={`Stage ${stage.stage_number}`}
                                className="w-20 h-20 mx-auto rounded-lg mb-2"
                              />
                              <p className="font-semibold text-sm">Stage {stage.stage_number}</p>
                              {isAwarded && (
                                <div className="flex items-center justify-center gap-1 mt-1">
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                  <span className="text-xs text-green-700">Awarded</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>

        {/* Completed but Not Yet Awarded */}
        {completedNotAwarded.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Completed - Awaiting Award</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {completedNotAwardedNonStaged.map(progress => {
                const badge = badges.find(b => b.id === progress.badge_id);
                if (!badge) return null;
                
                return (
                  <Card key={progress.id} className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-6 text-center">
                      <img
                        src={badge.image_url}
                        alt={badge.name}
                        className="w-24 h-24 mx-auto rounded-lg mb-3"
                      />
                      <h3 className="font-semibold">{badge.name}</h3>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <CheckCircle className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm text-yellow-700">
                          Completed - badge ceremony soon!
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* In Progress Badges */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Badges in Progress</h2>
          {inProgressBadges.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-600">No badges in progress yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {inProgressNonStaged.map(progress => {
                const badge = badges.find(b => b.id === progress.badge_id);
                if (!badge) return null;
                
                const badgeProgress = getBadgeProgress(badge.id);
                const isExpanded = expandedBadges.includes(badge.id);
                
                return (
                  <Card key={progress.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <img
                            src={badge.image_url}
                            alt={badge.name}
                            className="w-16 h-16 rounded-lg"
                          />
                          <div>
                            <CardTitle>{badge.name}</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">{badge.description}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(badge.id)}
                        >
                          {isExpanded ? <ChevronUp /> : <ChevronDown />}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">
                            {badgeProgress.completed} / {badgeProgress.total} ({badgeProgress.percentage}%)
                          </span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#7413dc] transition-all"
                            style={{ width: `${badgeProgress.percentage}%` }}
                          />
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="space-y-4 pt-4 border-t">
                          {getBadgeModules(badge.id).map(module => {
                            const moduleReqs = getModuleRequirements(module.id);
                            return (
                              <div key={module.id}>
                                <h4 className="font-semibold mb-2">{module.name}</h4>
                                <div className="space-y-2 ml-4">
                                  {moduleReqs.map((req, idx) => {
                                    const completed = isRequirementCompleted(req.id);
                                    return (
                                      <div key={req.id} className="flex items-start gap-2">
                                        {completed ? (
                                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        ) : (
                                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0 mt-0.5" />
                                        )}
                                        <span className={`text-sm ${completed ? 'text-gray-900' : 'text-gray-500'}`}>
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
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Staged Badge Families In Progress */}
              {Object.entries(stagedBadgeFamilies).map(([familyId, family]) => {
                const inProgressStages = family.stages.filter(stage => 
                  inProgressBadges.some(p => p.badge_id === stage.id)
                );
                
                if (inProgressStages.length === 0) return null;

                const currentStage = inProgressStages[0];
                const stageProgress = inProgressBadges.find(p => p.badge_id === currentStage.id);
                const badgeProgress = getBadgeProgress(currentStage.id);
                const isExpanded = expandedBadges.includes(currentStage.id);
                
                // Find next stage
                const completedStageNums = family.stages
                  .filter(s => completedBadges.some(p => p.badge_id === s.id))
                  .map(s => s.stage_number);
                const nextStage = family.stages.find(s => 
                  s.stage_number === Math.max(...completedStageNums, 0) + 1
                );

                return (
                  <Card key={familyId}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <img
                            src={currentStage.image_url}
                            alt={currentStage.name}
                            className="w-16 h-16 rounded-lg"
                          />
                          <div>
                            <CardTitle>{family.name} - Stage {currentStage.stage_number}</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">{currentStage.description}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(currentStage.id)}
                        >
                          {isExpanded ? <ChevronUp /> : <ChevronDown />}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">
                            {badgeProgress.completed} / {badgeProgress.total} ({badgeProgress.percentage}%)
                          </span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#7413dc] transition-all"
                            style={{ width: `${badgeProgress.percentage}%` }}
                          />
                        </div>
                      </div>

                      {nextStage && (
                        <div className="text-sm text-gray-600 mb-4">
                          <strong>Next:</strong> Stage {nextStage.stage_number} available after completing this stage
                        </div>
                      )}

                      {isExpanded && (
                        <div className="space-y-4 pt-4 border-t">
                          {getBadgeModules(currentStage.id).map(module => {
                            const moduleReqs = getModuleRequirements(module.id);
                            return (
                              <div key={module.id}>
                                <h4 className="font-semibold mb-2">{module.name}</h4>
                                <div className="space-y-2 ml-4">
                                  {moduleReqs.map((req, idx) => {
                                    const completed = isRequirementCompleted(req.id);
                                    return (
                                      <div key={req.id} className="flex items-start gap-2">
                                        {completed ? (
                                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        ) : (
                                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0 mt-0.5" />
                                        )}
                                        <span className={`text-sm ${completed ? 'text-gray-900' : 'text-gray-500'}`}>
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
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}