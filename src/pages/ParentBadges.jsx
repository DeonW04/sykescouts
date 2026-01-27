import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Trophy, CheckCircle, Circle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import ParentNav from '../components/parent/ParentNav';
import { motion } from 'framer-motion';

export default function ParentBadges() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [filterType, setFilterType] = useState('all');

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

  // Completed badges (either pending award or awarded)
  const completedBadges = badgeProgress.filter(p => p.member_id === child.id && p.status === 'completed');

  // Group staged badges by family
  const stagedBadgeFamilies = badges
    .filter(b => b.category === 'staged' && b.badge_family_id)
    .reduce((acc, badge) => {
      if (!acc[badge.badge_family_id]) {
        acc[badge.badge_family_id] = {
          name: badge.name.replace(/Stage \d+/, '').trim(),
          stages: []
        };
      }
      acc[badge.badge_family_id].stages.push(badge);
      return acc;
    }, {});

  Object.values(stagedBadgeFamilies).forEach(family => {
    family.stages.sort((a, b) => a.stage_number - b.stage_number);
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
      percentage: badgeReqs.length > 0 ? Math.round((completedReqs.length / badgeReqs.length) * 100) : 0,
    };
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

  // Get highest stage of each staged badge family
  const getHighestCompletedStage = (familyId) => {
    const family = stagedBadgeFamilies[familyId];
    if (!family) return null;
    
    const completedStages = family.stages.filter(stage =>
      completedBadges.some(p => p.badge_id === stage.id)
    );
    
    if (completedStages.length === 0) return null;
    return completedStages.reduce((highest, stage) => 
      stage.stage_number > highest.stage_number ? stage : highest
    );
  };

  // Earned badges - show non-staged + highest stage of staged
  const earnedNonStaged = completedBadges.filter(p => {
    const badge = badges.find(b => b.id === p.badge_id);
    return badge && badge.category !== 'staged';
  });

  // Available badges for the grid (not 100% complete)
  const inProgressBadges = badgeProgress.filter(p => 
    p.member_id === child.id && p.status === 'in_progress'
  );

  // Get all possible badges for child's section
  const sections = [...new Set(badges.map(b => b.section))];
  const childSection = child.section_id;
  
  // Available badges to show (not started or in progress, but not completed)
  const availableBadges = badges.filter(b => {
    // Check if badge is for child's section or all sections
    if (b.section !== 'all') {
      // Need to match section name - would need sections data
      // For now, just show all
    }
    
    // Don't show if 100% complete
    const bp = badgeProgress.find(p => p.member_id === child.id && p.badge_id === b.id);
    if (bp && bp.status === 'completed') return false;
    
    // For staged badges, only show family once (not individual stages)
    if (b.category === 'staged' && b.stage_number !== null) {
      const family = stagedBadgeFamilies[b.badge_family_id];
      if (!family) return false;
      // Only show the first stage of the family
      return b.id === family.stages[0].id;
    }
    
    return true;
  });

  const badgesWithProgress = availableBadges.map(badge => {
    const progress = getBadgeProgress(badge.id);
    return { badge, progress };
  }).filter(b => b.progress.percentage > 0 && b.progress.percentage < 100);

  // Filter and sort
  const filteredBadges = badgesWithProgress
    .filter(bp => filterType === 'all' || bp.badge.category === filterType)
    .sort((a, b) => b.progress.percentage - a.progress.percentage);

  // Group by category
  const badgesByCategory = filteredBadges.reduce((acc, bp) => {
    const category = bp.badge.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(bp);
    return acc;
  }, {});

  const categoryOrder = ['challenge', 'activity', 'staged', 'core', 'special'];
  const sortedCategories = Object.keys(badgesByCategory).sort((a, b) => 
    categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  // Check if eligible for gold award
  const isScout = child.section_id; // Would need to check if scouts section
  const goldAward = badges.find(b => b.is_chief_scout_award && b.section === 'scouts');

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
        {/* Earned Badges */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-1 w-12 bg-gradient-to-r from-yellow-600 to-transparent rounded-full"></div>
            <h2 className="text-3xl font-bold">Earned Badges</h2>
          </div>
          {completedBadges.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Award className="w-10 h-10 text-yellow-600" />
                </div>
                <p className="text-gray-600 text-lg">Keep working towards your first badge!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-4 gap-4">
              {earnedNonStaged.map(progress => {
                const badge = badges.find(b => b.id === progress.badge_id);
                if (!badge) return null;
                
                return (
                  <motion.div key={progress.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className="bg-green-50 border-green-200 hover:shadow-lg transition-shadow">
                      <CardContent className="p-6 text-center">
                        <img
                          src={badge.image_url}
                          alt={badge.name}
                          className="w-24 h-24 mx-auto rounded-lg mb-3"
                        />
                        <h3 className="font-semibold text-sm">{badge.name}</h3>
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-green-700">Earned</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}

              {/* Staged Badge Families - Highest Stage */}
              {Object.entries(stagedBadgeFamilies).map(([familyId, family]) => {
                const highestStage = getHighestCompletedStage(familyId);
                if (!highestStage) return null;

                return (
                  <motion.div key={familyId} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className="bg-green-50 border-green-200 hover:shadow-lg transition-shadow">
                      <CardContent className="p-6 text-center">
                        <img
                          src={highestStage.image_url}
                          alt={highestStage.name}
                          className="w-24 h-24 mx-auto rounded-lg mb-3"
                        />
                        <h3 className="font-semibold text-sm">{family.name}</h3>
                        <p className="text-xs text-gray-600">Stage {highestStage.stage_number}</p>
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-green-700">Earned</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Gold Award Button for Scouts */}
        {goldAward && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card 
              onClick={() => navigate(createPageUrl('ParentGoldAward'))}
              className="cursor-pointer bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 border-4 border-amber-300 hover:shadow-2xl transition-all hover:scale-105"
            >
              <CardContent className="p-8">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                    <Trophy className="w-16 h-16 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-white mb-2">Chief Scout's Gold Award</h3>
                    <p className="text-yellow-100 text-lg">
                      The highest award in Scouts - View progress and requirements
                    </p>
                  </div>
                  <div className="text-white">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Badges In Progress */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-1 w-12 bg-gradient-to-r from-purple-600 to-transparent rounded-full"></div>
              <h2 className="text-3xl font-bold">Badges In Progress</h2>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="challenge">Challenge</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="staged">Staged</SelectItem>
                  <SelectItem value="core">Core</SelectItem>
                  <SelectItem value="special">Special</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredBadges.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No badges in progress matching the filter</p>
              </CardContent>
            </Card>
          ) : (
            sortedCategories.map(category => (
              <div key={category} className="mb-8">
                <h3 className="text-xl font-bold capitalize mb-4 text-gray-900">{category} Badges</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  {badgesByCategory[category].map(bp => (
                    <motion.div key={bp.badge.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                      <Card 
                        onClick={() => setSelectedBadge(bp.badge)}
                        className="cursor-pointer hover:shadow-xl transition-all hover:scale-105"
                      >
                        <CardContent className="p-6">
                          <img
                            src={bp.badge.image_url}
                            alt={bp.badge.name}
                            className="w-full h-32 object-contain rounded-lg mb-3"
                          />
                          <h3 className="font-semibold text-sm mb-3">{bp.badge.name}</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Progress</span>
                              <span className="font-semibold">{bp.progress.percentage}%</span>
                            </div>
                            <Progress value={bp.progress.percentage} className="h-2" />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
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
                    <Badge className="mt-1 capitalize">{selectedBadge.category}</Badge>
                    {selectedBadge.description && (
                      <p className="text-gray-600 mt-2">{selectedBadge.description}</p>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {getBadgeModules(selectedBadge.id).map(module => {
                  const moduleReqs = getModuleRequirements(module.id);
                  return (
                    <div key={module.id} className="border-l-4 border-[#7413dc] pl-4">
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
                              <span className={`text-sm ${completed ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                <span className="font-semibold">{idx + 1}.</span> {req.text}
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