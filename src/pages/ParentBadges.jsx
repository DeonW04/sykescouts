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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: nightsAwayLogs = [] } = useQuery({
    queryKey: ['nights-away', children],
    queryFn: async () => {
      if (children.length === 0) return [];
      const logs = await base44.entities.NightsAwayLog.filter({});
      return logs.filter(l => children.some(c => c.id === l.member_id));
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
    const badgeModules = modules.filter(m => m.badge_id === badgeId);
    let totalRequired = 0;
    let totalCompleted = 0;

    badgeModules.forEach(module => {
      const moduleReqs = requirements.filter(r => r.module_id === module.id);
      const completedReqs = reqProgress.filter(p => 
        p.member_id === child.id && 
        moduleReqs.some(r => r.id === p.requirement_id) && 
        p.completed
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

  // Get child's section name
  const childSectionRecord = sections.find(s => s.id === child.section_id);
  const childSectionName = childSectionRecord?.name;

  // Get all badges for the child's section
  const allSectionBadges = badges.filter(b => 
    (b.section === childSectionName || b.section === 'all') && 
    !b.is_chief_scout_award &&
    b.category !== 'special'
  );

  // Special family badges to be shown in bottom strip
  const specialFamilyNames = ['nights away', 'hikes away', 'joining in award'];
  const isSpecialFamily = (badge) =>
    specialFamilyNames.some(n => badge.name.toLowerCase().includes(n));

  // Group staged badges by family; exclude nights/hikes/joining-in (handled separately)
  const stagedFamilies = {};
  const nonStagedBadges = [];
  const nightsAwayBadges = [];
  const hikesAwayBadges = [];
  const joiningInBadges = [];

  allSectionBadges.forEach(badge => {
    if (badge.name.toLowerCase().includes('nights away')) {
      nightsAwayBadges.push(badge);
    } else if (badge.name.toLowerCase().includes('hikes away')) {
      hikesAwayBadges.push(badge);
    } else if (badge.name.toLowerCase().includes('joining in award')) {
      joiningInBadges.push(badge);
    } else if (badge.category === 'staged' && badge.badge_family_id) {
      if (!stagedFamilies[badge.badge_family_id]) {
        stagedFamilies[badge.badge_family_id] = {
          familyId: badge.badge_family_id,
          name: badge.name.replace(/Stage \d+/i, '').trim(),
          category: badge.category,
          section: badge.section,
          stages: []
        };
      }
      stagedFamilies[badge.badge_family_id].stages.push(badge);
    } else {
      nonStagedBadges.push(badge);
    }
  });

  // Sort special family badges by stage number
  nightsAwayBadges.sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
  hikesAwayBadges.sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
  joiningInBadges.sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));

  // Find highest earned badge in a family list
  const getHighestEarnedInFamily = (familyBadges) => {
    const earned = familyBadges.filter(fb =>
      badgeProgress.some(p => p.member_id === child.id && p.badge_id === fb.id && p.status === 'completed')
    );
    if (earned.length === 0) return null;
    return earned.reduce((highest, b) => (b.stage_number || 0) > (highest.stage_number || 0) ? b : highest);
  };

  // Sort stages within families
  Object.values(stagedFamilies).forEach(family => {
    family.stages.sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
  });

  // Create unified badge list for display
  const allAvailableBadges = [
    ...nonStagedBadges.map(badge => {
      const progress = getBadgeProgress(badge.id);
      const isCompleted = badgeProgress.some(p => p.member_id === child.id && p.badge_id === badge.id && p.status === 'completed');
      
      return {
        type: 'single',
        badge,
        progress: {
          ...progress,
          isCompleted
        }
      };
    }),
    ...Object.values(stagedFamilies).map(family => {
      // Calculate overall family progress
      let totalReqs = 0;
      let completedReqs = 0;
      let anyStageCompleted = false;
      
      family.stages.forEach(stage => {
        const stageProgress = getBadgeProgress(stage.id);
        totalReqs += stageProgress.total;
        completedReqs += stageProgress.completed;
        
        if (badgeProgress.some(p => p.member_id === child.id && p.badge_id === stage.id && p.status === 'completed')) {
          anyStageCompleted = true;
        }
      });
      
      return {
        type: 'family',
        family,
        badge: family.stages[0], // Use first stage for image
        progress: {
          completed: completedReqs,
          total: totalReqs,
          percentage: totalReqs > 0 ? Math.round((completedReqs / totalReqs) * 100) : 0,
          isCompleted: false // Families are never "completed" in this view
        }
      };
    })
  ];

  // Filter and sort
  const filteredBadges = allAvailableBadges
    .filter(bp => {
      const category = bp.type === 'family' ? bp.family.category : bp.badge.category;
      return filterType === 'all' || category === filterType;
    })
    .sort((a, b) => b.progress.percentage - a.progress.percentage);

  // Group by category and sort activity badges A-Z
  const badgesByCategory = filteredBadges.reduce((acc, bp) => {
    const category = bp.type === 'family' ? bp.family.category : bp.badge.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(bp);
    return acc;
  }, {});

  // Sort activity badges alphabetically
  if (badgesByCategory.activity) {
    badgesByCategory.activity.sort((a, b) => {
      const nameA = a.type === 'family' ? a.family.name : a.badge.name;
      const nameB = b.type === 'family' ? b.family.name : b.badge.name;
      return nameA.localeCompare(nameB);
    });
  }

  // Consolidate Joining In Awards
  if (badgesByCategory.activity) {
    const joiningInBadges = badgesByCategory.activity.filter(bp => 
      bp.type === 'single' && bp.badge.name.includes('Joining In Award')
    );
    const nonJoiningIn = badgesByCategory.activity.filter(bp => 
      !(bp.type === 'single' && bp.badge.name.includes('Joining In Award'))
    );
    
    if (joiningInBadges.length > 0) {
      // Create placeholder
      const placeholder = {
        type: 'joining_in',
        badge: {
          ...joiningInBadges[0].badge,
          name: 'Joining In Awards',
          id: 'joining-in-awards'
        },
        progress: {
          completed: 0,
          total: 0,
          percentage: 0,
          isCompleted: false
        },
        joiningInBadges
      };
      badgesByCategory.activity = [...nonJoiningIn, placeholder].sort((a, b) => {
        const nameA = a.type === 'family' ? a.family.name : a.badge.name;
        const nameB = b.type === 'family' ? b.family.name : b.badge.name;
        return nameA.localeCompare(nameB);
      });
    }
  }

  const categoryOrder = ['challenge', 'activity', 'staged', 'core'];
  const sortedCategories = Object.keys(badgesByCategory).sort((a, b) => 
    categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  // Calculate nights away and hikes away totals
  const totalNightsAway = child.total_nights_away || nightsAwayLogs
    .filter(log => log.member_id === child.id)
    .reduce((sum, log) => sum + (log.nights_count || 0), 0);

  const totalHikesAway = child.total_hikes_away || 0;

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Gold Award Button for Scouts */}
        {goldAward && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card 
              onClick={() => navigate(createPageUrl('ParentGoldAward'))}
              className="cursor-pointer bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 border-3 border-amber-300 hover:shadow-xl transition-all hover:scale-[1.02]"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <Trophy className="w-10 h-10 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-1">Chief Scout's Gold Award</h3>
                    <p className="text-yellow-100">
                      The highest award in Scouts - View progress
                    </p>
                  </div>
                  <div className="text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

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



        {/* Badges Available */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-1 w-12 bg-gradient-to-r from-purple-600 to-transparent rounded-full"></div>
              <h2 className="text-3xl font-bold">Badges to Work Towards</h2>
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
                <p className="text-gray-600">No badges available matching the filter</p>
              </CardContent>
            </Card>
          ) : (
            sortedCategories.map(category => (
              <div key={category} className="mb-8">
                <h3 className="text-xl font-bold capitalize mb-4 text-gray-900">{category} Badges</h3>
                <div className="grid md:grid-cols-4 gap-4">
                 {badgesByCategory[category].map((bp, idx) => {
                   const displayName = bp.type === 'family' ? bp.family.name : bp.badge.name;
                   const displayImage = bp.badge.image_url;

                   return (
                     <motion.div 
                       key={bp.type === 'family' ? bp.family.familyId : bp.badge.id} 
                       initial={{ opacity: 0, y: 20 }} 
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: idx * 0.05 }}
                     >
                       <Card 
                         onClick={() => {
                           if (bp.type === 'joining_in') {
                             navigate(createPageUrl('JoiningInBadgeDetail'));
                           } else {
                             setSelectedBadge(bp);
                           }
                         }}
                         className="cursor-pointer hover:shadow-xl transition-all hover:scale-105"
                       >
                         <CardContent className="p-6">
                           <img
                             src={displayImage}
                             alt={displayName}
                             className="w-full h-32 object-contain rounded-lg mb-3"
                           />
                           <h3 className="font-semibold text-sm mb-3">{displayName}</h3>
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
                   );
                 })}
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
              {/* Single Badge or Nights/Hikes Away */}
              {selectedBadge.type === 'single' && (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-4">
                      <img
                        src={selectedBadge.badge.image_url}
                        alt={selectedBadge.badge.name}
                        className="w-20 h-20 rounded-lg"
                      />
                      <div>
                        <DialogTitle className="text-2xl">{selectedBadge.badge.name}</DialogTitle>
                        <Badge className="mt-1 capitalize">{selectedBadge.badge.category}</Badge>
                        {selectedBadge.badge.description && (
                          <p className="text-gray-600 mt-2">{selectedBadge.badge.description}</p>
                        )}
                      </div>
                    </div>
                  </DialogHeader>

                  {/* Check if this is Nights Away or Hikes Away */}
                  {(selectedBadge.badge.name.toLowerCase().includes('nights away') || 
                    selectedBadge.badge.name.toLowerCase().includes('hikes away')) ? (
                    <div className="space-y-6 mt-4">
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-6">
                          <div className="text-center space-y-4">
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Total Achieved</p>
                              <p className="text-4xl font-bold text-blue-600">
                                {selectedBadge.badge.name.toLowerCase().includes('nights away') 
                                  ? totalNightsAway 
                                  : totalHikesAway}
                              </p>
                              <p className="text-gray-600">
                                {selectedBadge.badge.name.toLowerCase().includes('nights away') 
                                  ? 'Nights Away' 
                                  : 'Hikes Away'}
                              </p>
                            </div>

                            {/* Show staged badges earned and next milestone */}
                            {selectedBadge.badge.badge_family_id && (() => {
                              const familyBadges = badges
                                .filter(b => b.badge_family_id === selectedBadge.badge.badge_family_id)
                                .sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
                              
                              const completedStages = familyBadges.filter(fb =>
                                badgeProgress.some(p => p.member_id === child.id && p.badge_id === fb.id && p.status === 'completed')
                              );
                              
                              const highestCompleted = completedStages[completedStages.length - 1];
                              const nextStage = familyBadges.find(fb => 
                                !completedStages.some(cs => cs.id === fb.id)
                              );

                              return (
                                <>
                                  {highestCompleted && (
                                    <div className="pt-4 border-t">
                                      <p className="text-sm text-gray-600 mb-2">Current Badge</p>
                                      <div className="flex items-center justify-center gap-3">
                                        <img src={highestCompleted.image_url} alt={highestCompleted.name} className="w-16 h-16 rounded-lg" />
                                        <div className="text-left">
                                          <p className="font-semibold">{highestCompleted.name}</p>
                                          <p className="text-xs text-gray-600">Stage {highestCompleted.stage_number}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {nextStage && (
                                    <div className="pt-4 border-t">
                                      <p className="text-sm text-gray-600 mb-2">Next Milestone</p>
                                      <div className="flex items-center justify-center gap-3">
                                        <img src={nextStage.image_url} alt={nextStage.name} className="w-16 h-16 rounded-lg opacity-60" />
                                        <div className="text-left">
                                          <p className="font-semibold">{nextStage.name}</p>
                                          <p className="text-xs text-gray-600">Stage {nextStage.stage_number}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    /* Regular single badge criteria */
                    <div className="space-y-6 mt-4">
                      {getBadgeModules(selectedBadge.badge.id).map(module => {
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
                  )}
                </>
              )}

              {/* Staged Badge Family */}
              {selectedBadge.type === 'family' && (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-4">
                      <img
                        src={selectedBadge.badge.image_url}
                        alt={selectedBadge.family.name}
                        className="w-20 h-20 rounded-lg"
                      />
                      <div>
                        <DialogTitle className="text-2xl">{selectedBadge.family.name}</DialogTitle>
                        <Badge className="mt-1 capitalize">Staged Badge</Badge>
                      </div>
                    </div>
                  </DialogHeader>

                  <Tabs defaultValue={`stage-${selectedBadge.family.stages[0].id}`} className="mt-4">
                    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${selectedBadge.family.stages.length}, 1fr)` }}>
                      {selectedBadge.family.stages.map((stage, idx) => {
                        const stageCompleted = badgeProgress.some(p => 
                          p.member_id === child.id && 
                          p.badge_id === stage.id && 
                          p.status === 'completed'
                        );
                        
                        return (
                          <TabsTrigger key={stage.id} value={`stage-${stage.id}`} className="gap-2">
                            Stage {stage.stage_number}
                            {stageCompleted && <CheckCircle className="w-4 h-4 text-green-600" />}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    {selectedBadge.family.stages.map(stage => (
                      <TabsContent key={stage.id} value={`stage-${stage.id}`} className="space-y-6 mt-4">
                        {stage.description && (
                          <p className="text-gray-600 text-sm">{stage.description}</p>
                        )}
                        
                        {getBadgeModules(stage.id).map(module => {
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
                      </TabsContent>
                    ))}
                  </Tabs>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}