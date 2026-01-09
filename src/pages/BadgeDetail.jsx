import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Award, CheckCircle, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function BadgeDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
    mutationFn: async ({ memberId, reqId, completed }) => {
      const existing = progress.find(p => p.member_id === memberId && p.requirement_id === reqId);
      
      if (existing) {
        if (completed) {
          return base44.entities.MemberRequirementProgress.update(existing.id, {
            completed: true,
            completed_date: new Date().toISOString().split('T')[0],
            source: 'manual',
          });
        } else {
          return base44.entities.MemberRequirementProgress.delete(existing.id);
        }
      } else {
        const req = requirements.find(r => r.id === reqId);
        return base44.entities.MemberRequirementProgress.create({
          member_id: memberId,
          badge_id: badgeId,
          module_id: req.module_id,
          requirement_id: reqId,
          completed: true,
          completed_date: new Date().toISOString().split('T')[0],
          source: 'manual',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['req-progress'] });
      queryClient.invalidateQueries({ queryKey: ['badge-progress'] });
    },
  });

  if (!badge) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
    </div>;
  }

  const relevantMembers = members.filter(m => {
    return badge.section === 'all' || m.section_id === sections.find(s => s.name === badge.section)?.id;
  });

  const isRequirementCompleted = (memberId, reqId) => {
    return progress.some(p => p.member_id === memberId && p.requirement_id === reqId && p.completed);
  };

  const getMemberProgress = (memberId) => {
    const memberReqs = progress.filter(p => p.member_id === memberId && p.badge_id === badgeId && p.completed);
    return {
      completed: memberReqs.length,
      total: requirements.length,
      percentage: Math.round((memberReqs.length / requirements.length) * 100) || 0,
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#7413dc] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('LeaderBadges'))}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Badges
          </Button>
          <div className="flex items-start gap-4">
            <img src={badge.image_url} alt={badge.name} className="w-20 h-20 rounded-lg" />
            <div>
              <h1 className="text-3xl font-bold">{badge.name}</h1>
              <p className="mt-1 text-white/80">{badge.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Member Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium sticky left-0 bg-white">Member</th>
                  <th className="text-center p-3 font-medium w-24">Progress</th>
                  {modules.sort((a, b) => a.order - b.order).map((module, moduleIdx) => {
                    const moduleReqs = requirements.filter(r => r.module_id === module.id).sort((a, b) => a.order - b.order);
                    return (
                      <th key={module.id} colSpan={moduleReqs.length} className="text-center p-3 font-medium border-l-2">
                        <div className="text-xs font-semibold">{module.name}</div>
                      </th>
                    );
                  })}
                </tr>
                <tr className="border-b bg-gray-50">
                  <th className="sticky left-0 bg-gray-50"></th>
                  <th></th>
                  {modules.sort((a, b) => a.order - b.order).map(module => {
                    const moduleReqs = requirements.filter(r => r.module_id === module.id).sort((a, b) => a.order - b.order);
                    return moduleReqs.map((req, idx) => (
                      <th key={req.id} className="text-center p-2 w-12">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-xs text-gray-600 cursor-help">{idx + 1}</div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">{req.text}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </th>
                    ));
                  })}
                </tr>
              </thead>
                <tbody>
                  {relevantMembers.map(member => {
                    const memberProgress = getMemberProgress(member.id);
                    const isComplete = memberProgress.completed === memberProgress.total;
                    const isNearlyDone = memberProgress.completed >= memberProgress.total - 1 && !isComplete;

                    return (
                      <tr key={member.id} className={`border-b hover:bg-gray-50 ${isComplete ? 'bg-green-50' : isNearlyDone ? 'bg-orange-50' : ''}`}>
                        <td className="p-3 sticky left-0 bg-inherit">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.full_name}</span>
                            {isComplete && <CheckCircle className="w-4 h-4 text-green-600" />}
                            {isNearlyDone && <Badge variant="outline" className="text-xs">Nearly Done</Badge>}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="text-sm font-medium">{memberProgress.percentage}%</div>
                          <div className="text-xs text-gray-500">{memberProgress.completed}/{memberProgress.total}</div>
                        </td>
                        {modules.sort((a, b) => a.order - b.order).map((module, moduleIdx) => {
                          const moduleReqs = requirements.filter(r => r.module_id === module.id).sort((a, b) => a.order - b.order);
                          return moduleReqs.map((req, reqIdx) => (
                            <td key={req.id} className={`p-3 text-center ${reqIdx === 0 ? 'border-l-2' : ''}`}>
                              <Checkbox
                                checked={isRequirementCompleted(member.id, req.id)}
                                onCheckedChange={(checked) => toggleReqMutation.mutate({
                                  memberId: member.id,
                                  reqId: req.id,
                                  completed: checked,
                                })}
                              />
                            </td>
                          ));
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Requirements Key</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {modules.sort((a, b) => a.order - b.order).map(module => {
                const moduleReqs = requirements.filter(r => r.module_id === module.id).sort((a, b) => a.order - b.order);
                return (
                  <div key={module.id}>
                    <h3 className="font-semibold mb-2">{module.name}</h3>
                    <div className="space-y-1 ml-4">
                      {moduleReqs.map((req, idx) => (
                        <div key={req.id} className="text-sm">
                          <span className="font-medium">{idx + 1}.</span> {req.text}
                        </div>
                      ))}
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