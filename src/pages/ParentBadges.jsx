import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Trophy, CheckCircle, Circle, Filter, Moon, Footprints, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ParentNav from '../components/parent/ParentNav';
import { motion } from 'framer-motion';

function StagedFamilyDialog({ selectedBadge, child, badgeProgress, getBadgeModules, getModuleRequirements, isRequirementCompleted }) {
  const realStages = selectedBadge.family.stages.filter(s => s.stage_number != null && s.stage_number !== '');
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-4">
          <img src={selectedBadge.badge.image_url} alt={selectedBadge.family.name} className="w-20 h-20 rounded-lg" />
          <div>
            <DialogTitle className="text-2xl">{selectedBadge.family.name}</DialogTitle>
            <Badge className="mt-1 capitalize">Staged Badge</Badge>
          </div>
        </div>
      </DialogHeader>
      <Tabs defaultValue={`stage-${realStages[0]?.id}`} className="mt-4">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${realStages.length}, 1fr)` }}>
          {realStages.map(stage => {
            const stageCompleted = badgeProgress.some(p =>
              p.member_id === child.id && p.badge_id === stage.id && p.status === 'completed'
            );
            return (
              <TabsTrigger key={stage.id} value={`stage-${stage.id}`} className="gap-2">
                Stage {stage.stage_number}
                {stageCompleted && <CheckCircle className="w-4 h-4 text-green-600" />}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {realStages.map(stage => (
          <TabsContent key={stage.id} value={`stage-${stage.id}`} className="space-y-6 mt-4">
            {stage.description && <p className="text-gray-600 text-sm">{stage.description}</p>}
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
                          {completed
                            ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                          }
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
  );
}

export default function ParentBadges() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [activityDialog, setActivityDialog] = useState(null); // 'nights' | 'hikes' | 'joining'

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

  // Derive badge completion from actual requirement progress (source of truth)
  const isBadgeComplete = (badgeId) => {
    const badgeDef = badges.find(b => b.id === badgeId);
    const badgeModules = modules.filter(m => m.badge_id === badgeId);
    if (badgeModules.length === 0) {
      return badgeProgress.some(p => p.member_id === child.id && p.badge_id === badgeId && p.status === 'completed');
    }
    if (badgeDef?.completion_rule === 'one_module') {
      return badgeModules.some(mod => {
        const modReqs = requirements.filter(r => r.module_id === mod.id);
        const completedReqs = reqProgress.filter(p => p.member_id === child.id && p.module_id === mod.id && p.completed);
        return modReqs.length > 0 && completedReqs.length >= modReqs.length;
      });
    }
    for (const mod of badgeModules) {
      const modReqs = requirements.filter(r => r.module_id === mod.id);
      const completedReqs = reqProgress.filter(p => p.member_id === child.id && p.module_id === mod.id && p.completed);
      if (mod.completion_rule === 'x_of_n_required') {
        if (completedReqs.length < (mod.required_count || modReqs.length)) return false;
      } else {
        if (completedReqs.length < modReqs.length) return false;
      }
    }
    return true;
  };

  // Completed badges (either pending award or awarded) — use requirement truth + DB record as fallback
  const completedBadges = badges
    .filter(b => isBadgeComplete(b.id))
    .map(b => ({ badge_id: b.id, member_id: child.id, status: 'completed' }));

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
    const badgeDef = badges.find(b => b.id === badgeId);
    const badgeModules = modules.filter(m => m.badge_id === badgeId);

    if (badgeDef?.completion_rule === 'one_module') {
      let bestPct = 0, bestCompleted = 0, bestTotal = 0;
      let anyComplete = false;
      badgeModules.forEach(module => {
        const moduleReqs = requirements.filter(r => r.module_id === module.id);
        const modTotal = moduleReqs.reduce((s, req) => s + (req.required_completions || 1), 0);
        let modCompleted = 0;
        moduleReqs.forEach(req => {
          const rp = reqProgress.find(p => p.member_id === child.id && p.requirement_id === req.id);
          modCompleted += Math.min(rp?.completion_count || 0, req.required_completions || 1);
        });
        const modPct = modTotal > 0 ? Math.round((modCompleted / modTotal) * 100) : 0;
        if (modPct >= bestPct) { bestPct = modPct; bestCompleted = modCompleted; bestTotal = modTotal; }
        if (modCompleted >= modTotal && modTotal > 0) anyComplete = true;
      });
      return { completed: bestCompleted, total: bestTotal, percentage: anyComplete ? 100 : bestPct };
    }

    let totalRequired = 0;
    let totalCompleted = 0;
    badgeModules.forEach(module => {
      const moduleReqs = requirements.filter(r => r.module_id === module.id);
      if (module.completion_rule === 'x_of_n_required') {
        const needed = module.required_count || moduleReqs.length;
        totalRequired += needed;
        const completedReqs = reqProgress.filter(p => p.member_id === child.id && p.module_id === module.id && p.completed);
        totalCompleted += Math.min(completedReqs.length, needed);
      } else {
        moduleReqs.forEach(req => {
          const requiredCount = req.required_completions || 1;
          const reqProg = reqProgress.find(p => p.member_id === child.id && p.requirement_id === req.id);
          totalRequired += requiredCount;
          totalCompleted += Math.min(reqProg?.completion_count || 0, requiredCount);
        });
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

  // Check if a badge has been started (any req progress) but not completed
  const isBadgeInProgress = (badgeId) => {
    if (isBadgeComplete(badgeId)) return false;
    const badgeMods = modules.filter(m => m.badge_id === badgeId);
    const moduleIds = badgeMods.map(m => m.id);
    return reqProgress.some(p => p.member_id === child.id && moduleIds.includes(p.module_id) && p.completed);
  };

  // Earned badges ordered: challenge → activity → staged (non-staged, non-chief-scout)
  const earnedByCategory = ['challenge', 'activity', 'staged', 'core', 'special'];
  const earnedNonStaged = completedBadges
    .filter(p => {
      const badge = badges.find(b => b.id === p.badge_id);
      return badge && badge.category !== 'staged' && !badge.is_chief_scout_award;
    })
    .sort((a, b) => {
      const ba = badges.find(x => x.id === a.badge_id);
      const bb = badges.find(x => x.id === b.badge_id);
      return (earnedByCategory.indexOf(ba?.category) ?? 99) - (earnedByCategory.indexOf(bb?.category) ?? 99);
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

  // Find highest earned badge in a family list — checks both MemberBadgeProgress and MemberBadgeAward
  const getHighestEarnedInFamily = (familyBadges) => {
    const earned = familyBadges.filter(fb =>
      badgeProgress.some(p => p.member_id === child.id && p.badge_id === fb.id && p.status === 'completed') ||
      awards.some(a => a.member_id === child.id && a.badge_id === fb.id)
    );
    if (earned.length === 0) return null;
    return earned.reduce((highest, b) => (b.stage_number || 0) > (highest.stage_number || 0) ? b : highest);
  };

  // Sort stages within families
  Object.values(stagedFamilies).forEach(family => {
    family.stages.sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
  });

  // Create unified badge list for display (exclude nights/hikes/joiningIn — shown separately)
  const allAvailableBadges = [
    ...nonStagedBadges.map(badge => {
      const progress = getBadgeProgress(badge.id);
      const isCompleted = isBadgeComplete(badge.id);
      const inProgress = isBadgeInProgress(badge.id);
      return { type: 'single', badge, progress: { ...progress, isCompleted, inProgress } };
    }),
    ...Object.values(stagedFamilies).map(family => {
      let totalReqs = 0;
      let completedReqs = 0;
      family.stages.forEach(stage => {
        const stageProgress = getBadgeProgress(stage.id);
        totalReqs += stageProgress.total;
        completedReqs += stageProgress.completed;
      });
      const inProgress = family.stages.some(s => isBadgeInProgress(s.id));
      return {
        type: 'family',
        family,
        badge: family.stages[0],
        progress: {
          completed: completedReqs, total: totalReqs,
          percentage: totalReqs > 0 ? Math.round((completedReqs / totalReqs) * 100) : 0,
          isCompleted: false,
          inProgress
        }
      };
    })
  ];

  // Exclude completed badges
  const incompleteBadges = allAvailableBadges.filter(bp => !bp.progress.isCompleted && bp.progress.percentage < 100);

  // In-progress: challenge badges always go here + any badge with progress > 0
  // Sort: challenge → activity → staged → core, then by % desc within each
  const inProgressBadges = incompleteBadges.filter(bp => {
    const category = bp.type === 'family' ? bp.family.category : bp.badge.category;
    return category === 'challenge' || bp.progress.inProgress;
  }).sort((a, b) => {
    const catA = a.type === 'family' ? a.family.category : a.badge.category;
    const catB = b.type === 'family' ? b.family.category : b.badge.category;
    const catOrder = ['challenge', 'activity', 'staged', 'core'];
    const catDiff = catOrder.indexOf(catA) - catOrder.indexOf(catB);
    if (catDiff !== 0) return catDiff;
    return b.progress.percentage - a.progress.percentage;
  });

  // Not started: non-challenge badges with 0 progress
  const notStartedBadges = incompleteBadges.filter(bp => {
    const category = bp.type === 'family' ? bp.family.category : bp.badge.category;
    return category !== 'challenge' && !bp.progress.inProgress;
  });

  // Filter by filterType
  const filteredInProgress = inProgressBadges.filter(bp => {
    const category = bp.type === 'family' ? bp.family.category : bp.badge.category;
    return filterType === 'all' || category === filterType;
  });

  const filteredNotStarted = notStartedBadges.filter(bp => {
    const category = bp.type === 'family' ? bp.family.category : bp.badge.category;
    return filterType === 'all' || category === filterType;
  });

  // Group not-started by category, activity sorted A-Z
  const categoryOrder = ['challenge', 'activity', 'staged', 'core'];
  const notStartedByCategory = filteredNotStarted.reduce((acc, bp) => {
    const category = bp.type === 'family' ? bp.family.category : bp.badge.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(bp);
    return acc;
  }, {});

  if (notStartedByCategory.activity) {
    notStartedByCategory.activity.sort((a, b) => {
      const nameA = a.type === 'family' ? a.family.name : a.badge.name;
      const nameB = b.type === 'family' ? b.family.name : b.badge.name;
      return nameA.localeCompare(nameB);
    });
  }

  const sortedNotStartedCategories = Object.keys(notStartedByCategory).sort((a, b) =>
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
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
              {earnedNonStaged.map(progress => {
                const badge = badges.find(b => b.id === progress.badge_id);
                if (!badge) return null;
                return (
                  <motion.div key={progress.badge_id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className="bg-green-50 border-green-200 hover:shadow-lg transition-shadow">
                      <CardContent className="p-3 text-center">
                        <img src={badge.image_url} alt={badge.name} className="w-full aspect-square object-contain rounded-lg mb-2" />
                        <h3 className="font-semibold text-xs leading-tight">{badge.name}</h3>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <CheckCircle className="w-3 h-3 text-green-600" />
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
                      <CardContent className="p-3 text-center">
                        <img src={highestStage.image_url} alt={highestStage.name} className="w-full aspect-square object-contain rounded-lg mb-2" />
                        <h3 className="font-semibold text-xs leading-tight">{family.name}</h3>
                        <p className="text-xs text-gray-500">Stage {highestStage.stage_number}</p>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <CheckCircle className="w-3 h-3 text-green-600" />
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



        {/* Activity Awards - between Earned and In Progress */}
        {(nightsAwayBadges.length > 0 || hikesAwayBadges.length > 0 || joiningInBadges.length > 0) && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1 w-12 bg-gradient-to-r from-blue-600 to-transparent rounded-full"></div>
              <h2 className="text-3xl font-bold">Activity Awards</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 md:gap-6">
              {[
                { label: 'Nights Away', family: nightsAwayBadges, emptyText: 'No Nights Away badge earned yet', key: 'nights' },
                { label: 'Hikes Away', family: hikesAwayBadges, emptyText: 'No Hikes Away badge earned yet', key: 'hikes' },
                { label: 'Joining In Awards', family: joiningInBadges, emptyText: 'No Joining In Award earned yet', key: 'joining' },
              ].map(({ label, family, emptyText, key }) => {
                if (family.length === 0) return null;
                const highestEarned = getHighestEarnedInFamily(family);
                return (
                  <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card
                      className="cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02] h-full"
                      onClick={() => setActivityDialog(key)}
                    >
                      <CardContent className="p-3 md:p-6 text-center">
                        <h3 className="font-bold text-xs md:text-lg mb-2 md:mb-4 text-gray-800">{label}</h3>
                        {highestEarned ? (
                          <div className="space-y-1 md:space-y-3">
                            <img
                              src={highestEarned.image_url}
                              alt={highestEarned.name}
                              className="w-14 h-14 md:w-24 md:h-24 mx-auto rounded-lg object-contain"
                            />
                            <div>
                              <p className="font-semibold text-xs leading-tight">{highestEarned.name}</p>
                              {highestEarned.stage_number && (
                                <p className="text-xs text-gray-500">Stage {highestEarned.stage_number}</p>
                              )}
                            </div>
                            <div className="flex items-center justify-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              <span className="text-xs text-green-700 font-medium">Highest earned</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 py-2">
                            <div className="w-12 h-12 md:w-20 md:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                              <Award className="w-6 h-6 md:w-10 md:h-10 text-gray-400" />
                            </div>
                            <p className="text-gray-500 text-xs">{emptyText}</p>
                          </div>
                        )}
                        <p className="text-xs text-[#7413dc] mt-2 font-medium">View →</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
        {/* In Progress Badges */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-1 w-12 bg-gradient-to-r from-orange-500 to-transparent rounded-full"></div>
              <h2 className="text-3xl font-bold">In Progress</h2>
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
                </SelectContent>
              </Select>
            </div>
          </div>
          {filteredInProgress.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500 text-sm">No badges in progress</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
              {filteredInProgress.map((bp, idx) => {
                const displayName = bp.type === 'family' ? bp.family.name : bp.badge.name;
                const displayImage = bp.badge.image_url;
                return (
                  <motion.div key={bp.type === 'family' ? bp.family.familyId : bp.badge.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                    <Card onClick={() => setSelectedBadge(bp)} className="cursor-pointer hover:shadow-xl transition-all hover:scale-105">
                      <CardContent className="p-3 text-center">
                        <img src={displayImage} alt={displayName} className="w-full aspect-square object-contain rounded-lg mb-2" />
                        <h3 className="font-semibold text-xs leading-tight mb-2">{displayName}</h3>
                        <Progress value={bp.progress.percentage} className="h-1.5 mb-1" />
                        <span className="text-xs text-gray-500">{bp.progress.percentage}%</span>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Badges to Work Towards (not started) */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-1 w-12 bg-gradient-to-r from-purple-600 to-transparent rounded-full"></div>
            <h2 className="text-3xl font-bold">Badges to Work Towards</h2>
          </div>
          {filteredNotStarted.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No more badges to start!</p>
              </CardContent>
            </Card>
          ) : (
            sortedNotStartedCategories.map(category => (
              <div key={category} className="mb-8">
                <h3 className="text-lg font-bold capitalize mb-3 text-gray-700">{category} Badges</h3>
                <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
                  {notStartedByCategory[category].map((bp, idx) => {
                    const displayName = bp.type === 'family' ? bp.family.name : bp.badge.name;
                    const displayImage = bp.badge.image_url;
                    return (
                      <motion.div key={bp.type === 'family' ? bp.family.familyId : bp.badge.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                        <Card onClick={() => setSelectedBadge(bp)} className="cursor-pointer hover:shadow-xl transition-all hover:scale-105">
                          <CardContent className="p-3 text-center">
                            <img src={displayImage} alt={displayName} className="w-full aspect-square object-contain rounded-lg mb-2 opacity-80" />
                            <h3 className="font-semibold text-xs leading-tight">{displayName}</h3>
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

      {/* Activity Awards Dialog (Nights Away / Hikes Away / Joining In) */}
      <Dialog open={!!activityDialog} onOpenChange={(open) => !open && setActivityDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {activityDialog && (() => {
            const isNights = activityDialog === 'nights';
            const isHikes = activityDialog === 'hikes';
            const isJoining = activityDialog === 'joining';
            const family = isNights ? nightsAwayBadges : isHikes ? hikesAwayBadges : joiningInBadges;
            const title = isNights ? 'Nights Away' : isHikes ? 'Hikes Away' : 'Joining In Awards';
            const totalCount = isNights ? totalNightsAway : isHikes ? totalHikesAway : null;
            const unit = isNights ? 'nights' : isHikes ? 'hikes' : null;

            // For joining in: calculate years in scouting
            let joiningInYears = null;
            if (isJoining && child.scouting_start_date) {
              const start = new Date(child.scouting_start_date);
              const now = new Date();
              joiningInYears = (now - start) / (1000 * 60 * 60 * 24 * 365.25);
            }

            const highestInDialog = getHighestEarnedInFamily(family);

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4 mb-2">
                    {highestInDialog ? (
                      <img src={highestInDialog.image_url} alt={highestInDialog.name} className="w-16 h-16 rounded-lg object-contain flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Award className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <DialogTitle className="text-2xl">{title}</DialogTitle>
                      {highestInDialog && (
                        <p className="text-sm text-green-600 font-medium flex items-center gap-1 mt-1">
                          <CheckCircle className="w-4 h-4" /> Highest: {highestInDialog.name}
                        </p>
                      )}
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-6 mt-2">
                  {/* Summary */}
                  {totalCount !== null && (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-6 text-center">
                        <p className="text-sm text-gray-600 mb-1">Total {unit === 'nights' ? 'Nights Away' : 'Hikes'}</p>
                        <p className="text-5xl font-bold text-blue-600">{totalCount}</p>
                        <p className="text-gray-600 mt-1 capitalize">{unit}</p>
                      </CardContent>
                    </Card>
                  )}
                  {isJoining && (
                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="p-6 text-center">
                        <p className="text-sm text-gray-600 mb-1">Time in Scouting</p>
                        {child.scouting_start_date ? (
                          <>
                            <p className="text-5xl font-bold text-purple-600">{joiningInYears.toFixed(1)}</p>
                            <p className="text-gray-600 mt-1">years</p>
                            <p className="text-xs text-gray-500 mt-2">Since {new Date(child.scouting_start_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
                          </>
                        ) : (
                          <p className="text-gray-500">Start date not recorded</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Badge stages */}
                  <div>
                    <h3 className="font-bold text-lg mb-3">Badge Stages</h3>
                    <div className="space-y-3">
                      {family.map(badge => {
                        const isEarned = badgeProgress.some(p => p.member_id === child.id && p.badge_id === badge.id && p.status === 'completed')
                          || awards.some(a => a.member_id === child.id && a.badge_id === badge.id);
                        const threshold = badge.stage_number;
                        return (
                          <div key={badge.id} className={`flex items-center gap-4 p-3 rounded-lg border ${isEarned ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                            <img src={badge.image_url} alt={badge.name} className={`w-14 h-14 rounded-lg object-contain ${!isEarned ? 'opacity-40 grayscale' : ''}`} />
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{badge.name}</p>
                              {threshold && (
                                <p className="text-xs text-gray-500">
                                  {isNights || isHikes ? `${threshold} ${unit}` : `${threshold} year${threshold !== 1 ? 's' : ''}`}
                                </p>
                              )}
                            </div>
                            {isEarned ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-5 h-5" />
                                <span className="text-xs font-medium">Earned</span>
                              </div>
                            ) : (
                              <div className="text-gray-400">
                                <Circle className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nights Away log if applicable */}
                  {isNights && nightsAwayLogs.filter(l => l.member_id === child.id).length > 0 && (
                    <div>
                      <h3 className="font-bold text-lg mb-3">Camp History</h3>
                      <div className="space-y-2">
                        {nightsAwayLogs
                          .filter(l => l.member_id === child.id)
                          .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
                          .map(log => (
                            <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                              <div>
                                <p className="font-medium text-sm">{log.location || 'Camp'}</p>
                                <p className="text-xs text-gray-500">{new Date(log.start_date).toLocaleDateString('en-GB')}</p>
                              </div>
                              <Badge variant="secondary">{log.nights_count} night{log.nights_count !== 1 ? 's' : ''}</Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

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
                      {selectedBadge.badge.completion_rule === 'one_module' && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                          <p className="text-sm text-amber-800 font-medium">Complete one module only — finishing any single module below earns this badge.</p>
                        </div>
                      )}
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
                <StagedFamilyDialog
                  selectedBadge={selectedBadge}
                  child={child}
                  badgeProgress={badgeProgress}
                  getBadgeModules={getBadgeModules}
                  getModuleRequirements={getModuleRequirements}
                  isRequirementCompleted={isRequirementCompleted}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}