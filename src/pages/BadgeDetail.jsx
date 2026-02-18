import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Award, CheckCircle, Circle, Info, Target, Users, TrendingUp, Edit, Trash2, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import LeaderNav from '../components/leader/LeaderNav';
import StockManagementDialog from '../components/badges/StockManagementDialog';

export default function BadgeDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [stockDialog, setStockDialog] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const badgeId = urlParams.get('id');

  const { data: badge } = useQuery({
    queryKey: ['badge', badgeId],
    queryFn: () => base44.entities.BadgeDefinition.filter({ id: badgeId }).then(res => res[0]),
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules', badgeId],
    queryFn: () => base44.entities.BadgeModule.filter({ badge_id: badgeId }),
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['requirements', badgeId],
    queryFn: () => base44.entities.BadgeRequirement.filter({ badge_id: badgeId }),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['req-progress', badgeId],
    queryFn: () => base44.entities.MemberRequirementProgress.filter({ badge_id: badgeId }),
  });

  const { data: badgeProgress = [] } = useQuery({
    queryKey: ['badge-progress', badgeId],
    queryFn: () => base44.entities.MemberBadgeProgress.filter({ badge_id: badgeId }),
  });

  const toggleReqMutation = useMutation({
    mutationFn: async ({ memberId, reqId, increment }) => {
      const existing = progress.find(p => p.member_id === memberId && p.requirement_id === reqId);
      const req = requirements.find(r => r.id === reqId);
      const requiredCount = req?.required_completions || 1;
      
      // Check if member has enough nights away
      if (increment && req?.nights_away_required) {
        const memberData = await base44.entities.Member.filter({ id: memberId });
        const member = memberData[0];
        if (member && (member.total_nights_away || 0) < req.nights_away_required) {
          toast.error(`Member needs ${req.nights_away_required} nights away (currently has ${member.total_nights_away || 0})`);
          throw new Error('Not enough nights away');
        }
      }
      
      if (existing) {
        const currentCount = existing.completion_count || 0;
        const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1);
        const isComplete = newCount >= requiredCount;
        
        if (newCount === 0) {
          // Delete if count goes to 0
          return base44.entities.MemberRequirementProgress.delete(existing.id);
        } else {
          return base44.entities.MemberRequirementProgress.update(existing.id, {
            completion_count: newCount,
            completed: isComplete,
            completed_date: isComplete ? new Date().toISOString().split('T')[0] : null,
            source: 'manual',
          });
        }
      } else if (increment) {
        // Create new progress record
        const isComplete = 1 >= requiredCount;
        return base44.entities.MemberRequirementProgress.create({
          member_id: memberId,
          badge_id: badgeId,
          module_id: req.module_id,
          requirement_id: reqId,
          completion_count: 1,
          completed: isComplete,
          completed_date: isComplete ? new Date().toISOString().split('T')[0] : null,
          source: 'manual',
        });
      }
    },
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['req-progress'] });
      
      // Check if member has completed the badge
      const updatedProgress = await base44.entities.MemberRequirementProgress.filter({ 
        badge_id: badgeId, 
        member_id: variables.memberId 
      });
      
      // Check if all modules are complete
      let allModulesComplete = true;
      for (const module of modules) {
        const moduleReqs = requirements.filter(r => r.module_id === module.id);
        const completedReqs = updatedProgress.filter(
          p => p.module_id === module.id && p.completed
        );
        
        if (module.completion_rule === 'x_of_n_required') {
          if (completedReqs.length < (module.required_count || moduleReqs.length)) {
            allModulesComplete = false;
            break;
          }
        } else {
          if (completedReqs.length < moduleReqs.length) {
            allModulesComplete = false;
            break;
          }
        }
      }
      
      const existingBadgeProgress = badgeProgress.find(bp => bp.member_id === variables.memberId);
      
      if (allModulesComplete) {
        // Create or update badge progress
        if (existingBadgeProgress) {
          if (existingBadgeProgress.status !== 'completed') {
            await base44.entities.MemberBadgeProgress.update(existingBadgeProgress.id, {
              status: 'completed',
              completion_date: new Date().toISOString().split('T')[0],
            });
          }
        } else {
          await base44.entities.MemberBadgeProgress.create({
            member_id: variables.memberId,
            badge_id: badgeId,
            status: 'completed',
            completion_date: new Date().toISOString().split('T')[0],
          });
        }
        
        // Check if award already exists
        const existingAward = await base44.entities.MemberBadgeAward.filter({
          member_id: variables.memberId,
          badge_id: badgeId,
        });
        
        if (existingAward.length === 0) {
          await base44.entities.MemberBadgeAward.create({
            member_id: variables.memberId,
            badge_id: badgeId,
            completed_date: new Date().toISOString().split('T')[0],
            award_status: 'pending',
          });
          toast.success('Badge completed! Ready to award.');
        }
      } else {
        // Update to in_progress if not complete
        if (existingBadgeProgress && existingBadgeProgress.status === 'completed') {
          await base44.entities.MemberBadgeProgress.update(existingBadgeProgress.id, {
            status: 'in_progress',
            completion_date: null,
          });
        } else if (!existingBadgeProgress && updatedProgress.length > 0) {
          await base44.entities.MemberBadgeProgress.create({
            member_id: variables.memberId,
            badge_id: badgeId,
            status: 'in_progress',
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['badge-progress'] });
    },
  });

  if (!badge) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
    </div>;
  }

  const relevantMembers = members
    .filter(m => {
      return badge.section === 'all' || m.section_id === sections.find(s => s.name === badge.section)?.id;
    })
    .sort((a, b) => new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime());

  const getRequirementProgress = (memberId, reqId) => {
    const req = requirements.find(r => r.id === reqId);
    const reqProgress = progress.find(p => p.member_id === memberId && p.requirement_id === reqId);
    const requiredCount = req?.required_completions || 1;
    const currentCount = reqProgress?.completion_count || 0;
    return {
      currentCount,
      requiredCount,
      isComplete: reqProgress?.completed || false,
    };
  };

  const isRequirementCompleted = (memberId, reqId) => {
    return progress.some(p => p.member_id === memberId && p.requirement_id === reqId && p.completed);
  };

  const isModuleComplete = (memberId, module) => {
    const moduleReqs = requirements.filter(r => r.module_id === module.id);
    const completedReqs = progress.filter(
      p => p.member_id === memberId && 
           p.module_id === module.id && 
           p.completed
    );

    if (module.completion_rule === 'x_of_n_required') {
      return completedReqs.length >= (module.required_count || moduleReqs.length);
    }
    // Default: all_required
    return completedReqs.length === moduleReqs.length;
  };

  // Progress based on individual requirements, respecting x_of_n modules
  const getMemberProgress = (memberId) => {
    let totalRequired = 0;
    let totalCompleted = 0;

    modules.forEach(module => {
      const moduleReqs = requirements.filter(r => r.module_id === module.id);
      const completedReqs = progress.filter(
        p => p.member_id === memberId && p.module_id === module.id && p.completed
      );

      if (module.completion_rule === 'x_of_n_required') {
        const needed = module.required_count || moduleReqs.length;
        totalRequired += needed;
        totalCompleted += Math.min(completedReqs.length, needed);
      } else {
        totalRequired += moduleReqs.length;
        totalCompleted += completedReqs.length;
      }
    });

    const allModulesComplete = modules.length > 0 && modules.every(m => isModuleComplete(memberId, m));
    const hasAnyProgress = totalCompleted > 0;

    return {
      completed: totalCompleted,
      total: totalRequired,
      percentage: totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0,
      isComplete: allModulesComplete,
      hasAnyProgress,
    };
  };

  const completedCount = relevantMembers.filter(m => getMemberProgress(m.id).isComplete).length;
  const inProgressCount = relevantMembers.filter(m => {
    const prog = getMemberProgress(m.id);
    // At least 1 individual requirement done, not fully complete
    return prog.hasAnyProgress && !prog.isComplete;
  }).length;
  const notStartedCount = relevantMembers.filter(m => !getMemberProgress(m.id).hasAnyProgress).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <LeaderNav />
      
      {/* Header */}
      <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 text-white py-12 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('LeaderBadges'))}
            className="text-white hover:bg-white/20 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Badges
          </Button>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-6"
          >
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl p-3 flex items-center justify-center">
              <img src={badge.image_url} alt={badge.name} className="w-full h-full object-contain" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-4xl font-bold">{badge.name}</h1>
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm capitalize">
                  {badge.category}
                </Badge>
                {badge.section !== 'all' && (
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    {sections.find(s => s.name === badge.section)?.display_name}
                  </Badge>
                )}
              </div>
              {badge.description && (
                <p className="text-lg text-white/90 max-w-3xl">{badge.description}</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Button
            variant="outline"
            onClick={() => {
              if (badge.category === 'staged') {
                navigate(createPageUrl('ManageStagedBadge') + `?familyId=${badge.badge_family_id}`);
              } else {
                navigate(createPageUrl('EditBadgeStructure') + `?id=${badge.id}`);
              }
            }}
            className="h-auto py-4 flex-col gap-2"
          >
            <Edit className="w-5 h-5" />
            <span>{badge.category === 'staged' ? 'Stages' : 'Structure'}</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setStockDialog(badge)}
            className="h-auto py-4 flex-col gap-2"
          >
            <Package className="w-5 h-5" />
            <span>Stock</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl('ManageBadges'))}
            className="h-auto py-4 flex-col gap-2"
          >
            <Edit className="w-5 h-5" />
            <span>Edit</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (confirm('Delete this badge?')) {
                base44.entities.BadgeDefinition.update(badge.id, { active: false }).then(() => {
                  toast.success('Badge deleted');
                  navigate(createPageUrl('LeaderBadges'));
                });
              }
            }}
            className="h-auto py-4 flex-col gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-5 h-5" />
            <span>Delete</span>
          </Button>
        </motion.div>

        {/* Stats Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Members</p>
                  <p className="text-2xl font-bold text-gray-900">{relevantMembers.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">In Progress</p>
                  <p className="text-2xl font-bold text-orange-600">{inProgressCount}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-gray-400">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Not Started</p>
                  <p className="text-2xl font-bold text-gray-600">{notStartedCount}</p>
                </div>
                <Circle className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Badge Structure */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-8 border-2 border-green-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Badge Structure & Requirements</CardTitle>
                  <CardDescription>All requirements needed to complete this badge</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {modules.sort((a, b) => a.order - b.order).map((module, moduleIdx) => {
                  const moduleReqs = requirements.filter(r => r.module_id === module.id).sort((a, b) => a.order - b.order);
                  return (
                    <motion.div 
                      key={module.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + moduleIdx * 0.1 }}
                      className="border-l-4 border-green-400 pl-6 py-2"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-green-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                          {moduleIdx + 1}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{module.name}</h3>
                        {module.completion_rule === 'x_of_n_required' ? (
                          <Badge className="text-xs bg-orange-500 text-white">
                            Complete {module.required_count} of {moduleReqs.length}
                          </Badge>
                        ) : (
                          <Badge className="text-xs bg-blue-500 text-white">
                            Complete all {moduleReqs.length}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-3 ml-10">
                        {moduleReqs.map((req, reqIdx) => (
                          <div key={req.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="w-6 h-6 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-semibold text-gray-600">{reqIdx + 1}</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-700 leading-relaxed">{req.text}</p>
                              <div className="flex gap-2 mt-2">
                                {(req.required_completions || 1) > 1 && (
                                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                                    Complete {req.required_completions} times
                                  </Badge>
                                )}
                                {req.nights_away_required && (
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                                    Requires {req.nights_away_required} nights away
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Member Progress Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-lg">
            <CardHeader className="bg-gray-50">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Individual Member Progress
              </CardTitle>
              <CardDescription>Track each member's progress through the badge requirements</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                  <th className="text-left p-4 font-semibold text-gray-900 sticky left-0 bg-gradient-to-r from-green-50 to-emerald-50 z-10">Member</th>
                  <th className="text-center p-4 font-semibold text-gray-900 w-28">Progress</th>
                  {modules.sort((a, b) => a.order - b.order).map((module, moduleIdx) => {
                    const moduleReqs = requirements.filter(r => r.module_id === module.id).sort((a, b) => a.order - b.order);
                    return (
                      <th key={module.id} colSpan={moduleReqs.length} className="text-center p-4 font-semibold border-l-4 border-green-300">
                        <div className="flex flex-col items-center gap-1">
                          <div className="text-xs font-bold text-gray-700 flex items-center justify-center gap-2">
                            <span className="w-6 h-6 bg-green-500 text-white rounded-lg flex items-center justify-center text-[10px]">
                              {moduleIdx + 1}
                            </span>
                            {module.name}
                          </div>
                          {module.completion_rule === 'x_of_n_required' ? (
                            <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                              {module.required_count} of {moduleReqs.length} needed
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              All {moduleReqs.length} required
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="sticky left-0 bg-gray-50 z-10"></th>
                  <th></th>
                  {modules.sort((a, b) => a.order - b.order).map(module => {
                    const moduleReqs = requirements.filter(r => r.module_id === module.id).sort((a, b) => a.order - b.order);
                    return moduleReqs.map((req, idx) => (
                      <th key={req.id} className="text-center p-3 w-14 border-l border-gray-200">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-7 h-7 mx-auto bg-white border-2 border-gray-300 rounded-full flex items-center justify-center text-xs font-semibold text-gray-700 cursor-help hover:border-green-400 hover:bg-green-50 transition-colors">
                                {idx + 1}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p className="text-sm font-medium">{req.text}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </th>
                    ));
                  })}
                </tr>
              </thead>
                <tbody>
                  {relevantMembers.map((member, memberIdx) => {
                    const memberProgress = getMemberProgress(member.id);
                    const isComplete = memberProgress.isComplete;
                    const isNearlyDone = memberProgress.percentage > 80 && !isComplete;

                    return (
                      <tr 
                        key={member.id} 
                        className={`border-b transition-colors ${
                          isComplete 
                            ? 'bg-green-50 hover:bg-green-100' 
                            : isNearlyDone 
                            ? 'bg-orange-50 hover:bg-orange-100' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="p-4 sticky left-0 bg-inherit z-10">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {member.full_name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{member.full_name}</span>
                                {isComplete && <CheckCircle className="w-5 h-5 text-green-600" />}
                              </div>
                              {isNearlyDone && (
                                <Badge variant="outline" className="text-xs mt-1 border-orange-400 text-orange-700 bg-orange-50">
                                  Nearly Complete!
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center">
                            <div className="text-lg font-bold text-gray-900 mb-1">{memberProgress.percentage}%</div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  isComplete ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${memberProgress.percentage}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 font-medium">
                              {memberProgress.completed} / {memberProgress.total} criteria
                            </div>
                          </div>
                        </td>
                        {modules.sort((a, b) => a.order - b.order).map((module, moduleIdx) => {
                          const moduleReqs = requirements.filter(r => r.module_id === module.id).sort((a, b) => a.order - b.order);
                          const moduleComplete = isModuleComplete(member.id, module);
                          const moduleCompletedCount = progress.filter(
                            p => p.member_id === member.id && p.module_id === module.id && p.completed
                          ).length;
                          
                          return moduleReqs.map((req, reqIdx) => {
                            const reqProgress = getRequirementProgress(member.id, req.id);
                            const requiresMultiple = (req.required_completions || 1) > 1;
                            return (
                              <td 
                                key={req.id} 
                                className={`p-3 text-center ${
                                  reqIdx === 0 ? 'border-l-4 border-green-300' : 'border-l border-gray-200'
                                } ${moduleComplete ? 'bg-green-50' : ''}`}
                              >
                                {requiresMultiple ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => toggleReqMutation.mutate({
                                          memberId: member.id,
                                          reqId: req.id,
                                          increment: false,
                                        })}
                                        className="w-5 h-5 rounded bg-gray-200 hover:bg-gray-300 text-xs font-bold"
                                        disabled={reqProgress.currentCount === 0}
                                      >
                                        -
                                      </button>
                                      <span className={`text-xs font-bold min-w-[2rem] ${
                                        reqProgress.isComplete ? 'text-green-600' : 'text-gray-700'
                                      }`}>
                                        {reqProgress.currentCount}/{reqProgress.requiredCount}
                                      </span>
                                      <button
                                        onClick={() => toggleReqMutation.mutate({
                                          memberId: member.id,
                                          reqId: req.id,
                                          increment: true,
                                        })}
                                        className="w-5 h-5 rounded bg-green-500 hover:bg-green-600 text-white text-xs font-bold"
                                      >
                                        +
                                      </button>
                                    </div>
                                    {reqProgress.isComplete && (
                                      <CheckCircle className="w-3 h-3 text-green-600" />
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex justify-center relative">
                                    <Checkbox
                                      checked={reqProgress.isComplete}
                                      onCheckedChange={(checked) => toggleReqMutation.mutate({
                                        memberId: member.id,
                                        reqId: req.id,
                                        increment: checked,
                                      })}
                                      className={reqProgress.isComplete ? 'border-green-500 data-[state=checked]:bg-green-500' : ''}
                                    />
                                    {reqIdx === 0 && moduleComplete && (
                                      <CheckCircle className="w-4 h-4 text-green-600 absolute -top-1 -right-1" />
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          });
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </div>

      <StockManagementDialog
        badge={stockDialog}
        open={!!stockDialog}
        onClose={() => setStockDialog(null)}
      />
    </div>
  );
}