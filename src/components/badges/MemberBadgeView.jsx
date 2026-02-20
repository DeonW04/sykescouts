import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Circle, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInMonths } from 'date-fns';

const SECTION_AGES = {
  squirrels: { start: 4, end: 6 },
  beavers: { start: 6, end: 8 },
  cubs: { start: 8, end: 10.5 },
  scouts: { start: 10.5, end: 14 },
  explorers: { start: 14, end: 18 },
};

function getAgeProgress(member, sectionName) {
  if (!member.date_of_birth || !sectionName) return 0;
  const ages = SECTION_AGES[sectionName.toLowerCase()];
  if (!ages) return 0;
  const ageMonths = differenceInMonths(new Date(), new Date(member.date_of_birth));
  const ageYears = ageMonths / 12;
  const pct = ((ageYears - ages.start) / (ages.end - ages.start)) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

function GoldAwardProgressDialog({ member, badges, modules, requirements, reqProgress, badgeProgress, open, onClose }) {
  const challengeBadges = badges.filter(b => b.category === 'challenge' && b.section === 'scouts' && !b.is_chief_scout_award);
  const activityBadges = badges.filter(b => b.category === 'activity' && b.section === 'scouts');
  const completedChallenges = challengeBadges.filter(b => badgeProgress.some(p => p.member_id === member.id && p.badge_id === b.id && p.status === 'completed'));
  const completedActivities = activityBadges.filter(b => badgeProgress.some(p => p.member_id === member.id && p.badge_id === b.id && p.status === 'completed'));
  const challengePct = challengeBadges.length > 0 ? Math.round((completedChallenges.length / challengeBadges.length) * 100) : 0;
  const activityPct = Math.min(100, Math.round((completedActivities.length / 8) * 100));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            {member.full_name} — Chief Scout's Gold Award
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Challenge Badges ({completedChallenges.length}/9)</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${challengePct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Activity Badges ({completedActivities.length}/8)</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${activityPct}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {challengeBadges.map(badge => {
              const done = completedChallenges.some(b => b.id === badge.id);
              return (
                <div key={badge.id} className={`rounded-lg p-2 text-center border ${done ? 'bg-green-50 border-green-300' : 'border-gray-200'}`}>
                  <img src={badge.image_url} alt={badge.name} className="w-12 h-12 mx-auto object-contain" />
                  <p className="text-xs mt-1 font-medium leading-tight">{badge.name}</p>
                  {done && <CheckCircle className="w-4 h-4 text-green-600 mx-auto mt-1" />}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BadgeDetailDialog({ member, badge, modules, requirements, allReqProgress, onClose, onToggle }) {
  const memberProgress = allReqProgress.filter(p => p.member_id === member.id);
  const badgeModules = modules.filter(m => m.badge_id === badge.id).sort((a, b) => a.order - b.order);
  const isNightsOrHikes = badge.name.toLowerCase().includes('nights away') || badge.name.toLowerCase().includes('hikes away');

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <img src={badge.image_url} alt={badge.name} className="w-16 h-16 rounded-lg object-contain" />
            <div>
              <DialogTitle className="text-xl">{badge.name}</DialogTitle>
              <Badge className="mt-1 capitalize">{badge.category}</Badge>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          {badgeModules.map(module => {
            const moduleReqs = requirements.filter(r => r.module_id === module.id).sort((a, b) => a.order - b.order);
            return (
              <div key={module.id} className="border-l-4 border-green-400 pl-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-bold text-base">{module.name}</h3>
                  {module.completion_rule === 'x_of_n_required' && (
                    <Badge className="text-xs bg-orange-500 text-white">Complete {module.required_count} of {moduleReqs.length}</Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {moduleReqs.map((req, idx) => {
                    const completed = memberProgress.some(p => p.requirement_id === req.id && p.completed);
                    return (
                      <div key={req.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                        <Checkbox
                          checked={completed}
                          onCheckedChange={(checked) => onToggle(member.id, req.id, checked, module.id)}
                          className={completed ? 'border-green-500 data-[state=checked]:bg-green-500' : ''}
                        />
                        <span className={`text-sm leading-relaxed ${completed ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
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
      </DialogContent>
    </Dialog>
  );
}

export default function MemberBadgeView({ sectionFilter }) {
  const queryClient = useQueryClient();
  const [goldMember, setGoldMember] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState(null); // { member, badge }

  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: () => base44.entities.Member.filter({ active: true }) });
  const { data: badges = [] } = useQuery({ queryKey: ['badges'], queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }) });
  const { data: badgeProgress = [] } = useQuery({ queryKey: ['badge-progress-all'], queryFn: () => base44.entities.MemberBadgeProgress.filter({}) });
  const { data: modules = [] } = useQuery({ queryKey: ['modules-all'], queryFn: () => base44.entities.BadgeModule.filter({}) });
  const { data: requirements = [] } = useQuery({ queryKey: ['requirements-all'], queryFn: () => base44.entities.BadgeRequirement.filter({}) });
  const { data: reqProgress = [] } = useQuery({ queryKey: ['req-progress-all'], queryFn: () => base44.entities.MemberRequirementProgress.filter({}) });
  const { data: awards = [] } = useQuery({ queryKey: ['awards-all'], queryFn: () => base44.entities.MemberBadgeAward.filter({}) });

  const toggleReqMutation = useMutation({
    mutationFn: async ({ memberId, reqId, increment, badgeId, moduleId }) => {
      const existing = reqProgress.find(p => p.member_id === memberId && p.requirement_id === reqId);
      const req = requirements.find(r => r.id === reqId);
      const requiredCount = req?.required_completions || 1;
      if (existing) {
        const currentCount = existing.completion_count || 0;
        const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1);
        const isComplete = newCount >= requiredCount;
        if (newCount === 0) {
          return base44.entities.MemberRequirementProgress.delete(existing.id);
        }
        return base44.entities.MemberRequirementProgress.update(existing.id, {
          completion_count: newCount, completed: isComplete,
          completed_date: isComplete ? new Date().toISOString().split('T')[0] : null,
          source: 'manual',
        });
      } else if (increment) {
        const isComplete = 1 >= requiredCount;
        return base44.entities.MemberRequirementProgress.create({
          member_id: memberId, badge_id: badgeId, module_id: moduleId,
          requirement_id: reqId, completion_count: 1, completed: isComplete,
          completed_date: isComplete ? new Date().toISOString().split('T')[0] : null,
          source: 'manual',
        });
      }
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['req-progress-all'] });
      // Check badge completion
      const updatedReqProgress = await base44.entities.MemberRequirementProgress.filter({ badge_id: variables.badgeId, member_id: variables.memberId });
      const badgeModules = modules.filter(m => m.badge_id === variables.badgeId);
      let allComplete = true;
      for (const mod of badgeModules) {
        const modReqs = requirements.filter(r => r.module_id === mod.id);
        const completed = updatedReqProgress.filter(p => p.module_id === mod.id && p.completed);
        if (mod.completion_rule === 'x_of_n_required') {
          if (completed.length < (mod.required_count || modReqs.length)) { allComplete = false; break; }
        } else {
          if (completed.length < modReqs.length) { allComplete = false; break; }
        }
      }
      const existingBadgeProgress = badgeProgress.find(bp => bp.member_id === variables.memberId && bp.badge_id === variables.badgeId);
      if (allComplete) {
        if (existingBadgeProgress) {
          if (existingBadgeProgress.status !== 'completed') {
            await base44.entities.MemberBadgeProgress.update(existingBadgeProgress.id, { status: 'completed', completion_date: new Date().toISOString().split('T')[0] });
          }
        } else {
          await base44.entities.MemberBadgeProgress.create({ member_id: variables.memberId, badge_id: variables.badgeId, status: 'completed', completion_date: new Date().toISOString().split('T')[0] });
        }
        const existingAward = await base44.entities.MemberBadgeAward.filter({ member_id: variables.memberId, badge_id: variables.badgeId });
        if (existingAward.length === 0) {
          await base44.entities.MemberBadgeAward.create({ member_id: variables.memberId, badge_id: variables.badgeId, completed_date: new Date().toISOString().split('T')[0], award_status: 'pending' });
          toast.success('Badge completed! Ready to award.');
        }
      } else {
        if (existingBadgeProgress && existingBadgeProgress.status === 'completed') {
          await base44.entities.MemberBadgeProgress.update(existingBadgeProgress.id, { status: 'in_progress', completion_date: null });
        } else if (!existingBadgeProgress && updatedReqProgress.length > 0) {
          await base44.entities.MemberBadgeProgress.create({ member_id: variables.memberId, badge_id: variables.badgeId, status: 'in_progress' });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['badge-progress-all'] });
    }
  });

  const filteredMembers = members.filter(m => {
    if (sectionFilter === 'all') return true;
    return m.section_id === sections.find(s => s.name === sectionFilter)?.id;
  }).sort((a, b) => new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime());

  const getBadgeProgressForMember = (memberId, badgeId) => {
    const badgeModules = modules.filter(m => m.badge_id === badgeId);
    let totalRequired = 0, totalCompleted = 0;
    badgeModules.forEach(mod => {
      const modReqs = requirements.filter(r => r.module_id === mod.id);
      if (mod.completion_rule === 'x_of_n_required') {
        const needed = mod.required_count || modReqs.length;
        totalRequired += needed;
        const completed = reqProgress.filter(p => p.member_id === memberId && p.module_id === mod.id && p.completed);
        totalCompleted += Math.min(completed.length, needed);
      } else {
        // Sum partial progress per requirement (handles multi-completion reqs)
        modReqs.forEach(req => {
          const requiredCount = req.required_completions || 1;
          const reqProg = reqProgress.find(p => p.member_id === memberId && p.requirement_id === req.id);
          totalRequired += requiredCount;
          totalCompleted += Math.min(reqProg?.completion_count || 0, requiredCount);
        });
      }
    });
    return { completed: totalCompleted, total: totalRequired, pct: totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0 };
  };

  const isBadgeActuallyComplete = (memberId, badgeId) => {
    const badgeDef = badges.find(b => b.id === badgeId);
    const badgeModules = modules.filter(m => m.badge_id === badgeId);
    if (badgeModules.length === 0) return false;
    if (badgeDef?.completion_rule === 'one_module') {
      // Complete if ANY module is fully done
      return badgeModules.some(mod => {
        const modReqs = requirements.filter(r => r.module_id === mod.id);
        const completedReqs = reqProgress.filter(p => p.member_id === memberId && p.module_id === mod.id && p.completed);
        return modReqs.length > 0 && completedReqs.length >= modReqs.length;
      });
    }
    for (const mod of badgeModules) {
      const modReqs = requirements.filter(r => r.module_id === mod.id);
      const completedReqs = reqProgress.filter(p => p.member_id === memberId && p.module_id === mod.id && p.completed);
      if (mod.completion_rule === 'x_of_n_required') {
        if (completedReqs.length < (mod.required_count || modReqs.length)) return false;
      } else {
        if (completedReqs.length < modReqs.length) return false;
      }
    }
    return true;
  };

  const getCompletedBadgesForMember = (memberId) => {
    // Use actual requirement progress as source of truth, fall back to badge progress record
    const fromReqs = badges.filter(b => isBadgeActuallyComplete(memberId, b.id));
    const fromRecord = badgeProgress.filter(p => p.member_id === memberId && p.status === 'completed')
      .map(p => badges.find(b => b.id === p.badge_id))
      .filter(Boolean);
    // Merge both sources (deduplicated)
    const allIds = new Set([...fromReqs.map(b => b.id), ...fromRecord.map(b => b.id)]);
    return badges.filter(b => allIds.has(b.id));
  };

  const getInProgressBadgesForMember = (memberId) => {
    const completedBadgeIds = new Set(getCompletedBadgesForMember(memberId).map(b => b.id));
    const badgesWithProgress = [...new Set(reqProgress.filter(p => p.member_id === memberId && p.completed).map(p => p.badge_id))];
    return badgesWithProgress
      .filter(bid => !completedBadgeIds.has(bid))
      .map(bid => badges.find(b => b.id === bid))
      .filter(Boolean);
  };

  const goldAward = badges.find(b => b.is_chief_scout_award);
  const isScoutSection = (memberId) => {
    const member = members.find(m => m.id === memberId);
    const section = sections.find(s => s.id === member?.section_id);
    return section?.name === 'scouts';
  };

  return (
    <div className="space-y-4">
      {filteredMembers.map(member => {
        const section = sections.find(s => s.id === member.section_id);
        const ageProgress = getAgeProgress(member, section?.name);
        const completedBadges = getCompletedBadgesForMember(member.id);
        const inProgressBadges = getInProgressBadgesForMember(member.id);
        const showGold = isScoutSection(member.id) && goldAward;

        return (
          <div key={member.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            {/* Member header bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {member.full_name.charAt(0)}
                  </div>
                  <span className="font-semibold text-gray-900">{member.full_name}</span>
                  {section && <Badge variant="outline" className="text-xs">{section.display_name}</Badge>}
                </div>
              </div>
              {/* Time in scouting progress bar */}
              <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7413dc] to-purple-400 rounded-full transition-all"
                  style={{ width: `${ageProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>Age {SECTION_AGES[section?.name?.toLowerCase()]?.start ?? ''}yr</span>
                <span className="text-gray-500 font-medium">{ageProgress}% through {section?.display_name}</span>
                <span>Age {SECTION_AGES[section?.name?.toLowerCase()]?.end ?? ''}yr</span>
              </div>
            </div>

            <div className="flex gap-4 flex-wrap items-start">
              {/* Gold award button */}
              {showGold && (
                <button
                  onClick={() => setGoldMember(member)}
                  className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border-2 border-amber-300 hover:border-amber-500 transition-colors shadow"
                  title="Chief Scout's Gold Award"
                >
                  {goldAward.image_url
                    ? <img src={goldAward.image_url} alt="Gold Award" className="w-full h-full object-contain" />
                    : <div className="w-full h-full bg-amber-100 flex items-center justify-center"><Trophy className="w-6 h-6 text-amber-500" /></div>
                  }
                </button>
              )}

              {/* Completed badges */}
              {completedBadges.length > 0 && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-700 mb-1.5">Completed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {completedBadges.filter(b => !b.is_chief_scout_award).map(badge => (
                      <button
                        key={badge.id}
                        onClick={() => setSelectedBadge({ member, badge })}
                        className="w-10 h-10 rounded-lg overflow-hidden border border-green-300 hover:border-green-500 transition-colors"
                        title={badge.name}
                      >
                        <img src={badge.image_url} alt={badge.name} className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* In progress badges */}
              {inProgressBadges.length > 0 && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-700 mb-1.5">In Progress</p>
                  <div className="flex flex-wrap gap-1.5">
                    {inProgressBadges.filter(b => !b.is_chief_scout_award).map(badge => {
                      const prog = getBadgeProgressForMember(member.id, badge.id);
                      return (
                        <button
                          key={badge.id}
                          onClick={() => setSelectedBadge({ member, badge })}
                          className="flex flex-col items-center gap-0.5"
                          title={`${badge.name} — ${prog.pct}%`}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-blue-300 hover:border-blue-500 transition-colors">
                            <img src={badge.image_url} alt={badge.name} className="w-full h-full object-contain" />
                          </div>
                          <div className="w-10 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${prog.pct}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {completedBadges.length === 0 && inProgressBadges.length === 0 && (
                <p className="text-sm text-gray-400 italic">No badge progress recorded yet</p>
              )}
            </div>
          </div>
        );
      })}

      {/* Gold Award Dialog */}
      {goldMember && (
        <GoldAwardProgressDialog
          member={goldMember}
          badges={badges}
          modules={modules}
          requirements={requirements}
          reqProgress={reqProgress}
          badgeProgress={badgeProgress}
          open={true}
          onClose={() => setGoldMember(null)}
        />
      )}

      {/* Badge Detail Dialog */}
      {selectedBadge && (
        <BadgeDetailDialog
          member={selectedBadge.member}
          badge={selectedBadge.badge}
          modules={modules}
          requirements={requirements}
          allReqProgress={reqProgress}
          onClose={() => setSelectedBadge(null)}
          onToggle={(memberId, reqId, increment, moduleId) => {
            toggleReqMutation.mutate({
              memberId, reqId, increment,
              badgeId: selectedBadge.badge.id,
              moduleId
            });
          }}
        />
      )}
    </div>
  );
}