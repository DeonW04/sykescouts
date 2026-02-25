import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Footprints, Trophy, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import LeaderNav from '../components/leader/LeaderNav';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const STAGE_THRESHOLDS = [1, 2, 5, 10, 15, 20, 35, 50];

export default function HikesAwayBadgeDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const inputRef = useRef(null);

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: hikesAwayBadges = [] } = useQuery({
    queryKey: ['hikesaway-badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ badge_family_id: 'hikes_away' }),
  });

  const { data: awards = [] } = useQuery({
    queryKey: ['awards'],
    queryFn: () => base44.entities.MemberBadgeAward.filter({}),
  });

  const autoAwardMutation = useMutation({
    mutationFn: async ({ memberId, badgeId, hikesCount }) => {
      const user = await base44.auth.me();
      await base44.entities.MemberBadgeAward.create({
        member_id: memberId,
        badge_id: badgeId,
        awarded_date: new Date().toISOString().split('T')[0],
        awarded_by: user.email,
        award_status: 'pending',
        notes: `Auto-awarded for reaching ${hikesCount} hikes away`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awards'] });
    },
  });

  const updateHikesMutation = useMutation({
    mutationFn: async ({ memberId, newCount }) => {
      await base44.entities.Member.update(memberId, {
        total_hikes_away: newCount,
      });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Hikes count updated');
      setEditingMemberId(null);
      setEditingValue('');
    },
    onError: () => {
      toast.error('Failed to update hikes count');
    },
  });

  const startEditing = (member) => {
    setEditingMemberId(member.id);
    setEditingValue(String(member.total_hikes_away || 0));
    // Focus input on next tick after render
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancelEditing = () => {
    setEditingMemberId(null);
    setEditingValue('');
  };

  const saveEditing = (memberId) => {
    const parsed = parseInt(editingValue, 10);
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Please enter a valid number');
      return;
    }
    updateHikesMutation.mutate({ memberId, newCount: parsed });
  };

  const handleKeyDown = (e, memberId) => {
    if (e.key === 'Enter') saveEditing(memberId);
    if (e.key === 'Escape') cancelEditing();
  };

  // Auto-award badges based on total hikes
  useEffect(() => {
    if (members.length > 0 && hikesAwayBadges.length > 0) {
      members.forEach(member => {
        const totalHikes = member.total_hikes_away || 0;
        
        STAGE_THRESHOLDS.forEach(threshold => {
          if (totalHikes >= threshold) {
            const badge = hikesAwayBadges.find(b => b.stage_number === threshold);
            if (badge) {
              const alreadyAwarded = awards.some(a => 
                a.member_id === member.id && a.badge_id === badge.id
              );
              
              if (!alreadyAwarded) {
                autoAwardMutation.mutate({
                  memberId: member.id,
                  badgeId: badge.id,
                  hikesCount: threshold
                });
              }
            }
          }
        });
      });
    }
  }, [members, hikesAwayBadges, awards]);

  const getMemberBadges = (memberId) => {
    const memberAwards = awards.filter(a => a.member_id === memberId);
    return hikesAwayBadges
      .filter(badge => memberAwards.some(a => a.badge_id === badge.id))
      .sort((a, b) => a.stage_number - b.stage_number);
  };

  const getNextStage = (totalHikes) => {
    return STAGE_THRESHOLDS.find(threshold => threshold > totalHikes);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Footprints className="w-12 h-12" />
              <div>
                <h1 className="text-3xl font-bold">Hikes Away Staged Activity Badge</h1>
                <p className="mt-1 text-white/80">Tracking hikes and awarding badges automatically</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Footprints className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">How to track hikes</h3>
                <p className="text-sm text-blue-800">
                  When creating activities or camps, add badge criteria and mark the checkbox "Counts as hike away". 
                  When members attend and the badge criteria is awarded, it will automatically increment their hike count 
                  and award the appropriate badges. You can also click on any member's hike count to edit it directly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {STAGE_THRESHOLDS.map(threshold => {
            const badge = hikesAwayBadges.find(b => b.stage_number === threshold);
            const awardsForStage = badge ? awards.filter(a => a.badge_id === badge.id) : [];
            
            return (
              <Card key={threshold} className="text-center">
                <CardContent className="p-4">
                  {badge && (
                    <img 
                      src={badge.image_url} 
                      alt={`Stage ${threshold}`}
                      className="w-20 h-20 mx-auto mb-2 object-contain"
                    />
                  )}
                  <div className="text-2xl font-bold text-[#7413dc]">{threshold}</div>
                  <div className="text-xs text-gray-500">hikes</div>
                  <div className="text-sm font-medium text-blue-600 mt-1">
                    {awardsForStage.length} awarded
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Member Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Total Hikes</TableHead>
                  <TableHead>Next Stage</TableHead>
                  <TableHead>Badges Earned</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members
                  .sort((a, b) => new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime())
                  .map(member => {
                    const totalHikes = member.total_hikes_away || 0;
                    const earnedBadges = getMemberBadges(member.id);
                    const nextStage = getNextStage(totalHikes);
                    const progress = nextStage 
                      ? Math.round((totalHikes / nextStage) * 100)
                      : 100;
                    const isEditing = editingMemberId === member.id;
                    const isSaving = updateHikesMutation.isPending && updateHikesMutation.variables?.memberId === member.id;

                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.full_name}</TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Footprints className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <input
                                ref={inputRef}
                                type="number"
                                min={0}
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, member.id)}
                                className="w-20 text-lg font-bold text-[#7413dc] border-2 border-[#7413dc] rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-[#7413dc]/30"
                                disabled={isSaving}
                              />
                              <button
                                onClick={() => saveEditing(member.id)}
                                disabled={isSaving}
                                className="w-7 h-7 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-colors"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                disabled={isSaving}
                                className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditing(member)}
                              className="flex items-center gap-2 group rounded px-1 -mx-1 hover:bg-gray-100 transition-colors"
                              title="Click to edit"
                            >
                              <Footprints className="w-4 h-4 text-gray-400" />
                              <span className="text-lg font-bold text-[#7413dc] group-hover:underline decoration-dotted underline-offset-2">
                                {totalHikes}
                              </span>
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          {nextStage ? (
                            <Badge variant="outline">{nextStage} hikes</Badge>
                          ) : (
                            <Badge className="bg-blue-600">All stages complete!</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {earnedBadges.map(badge => (
                              <div key={badge.id} className="relative group">
                                <img 
                                  src={badge.image_url} 
                                  alt={`Stage ${badge.stage_number}`}
                                  className="w-8 h-8 object-contain"
                                />
                                <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  {badge.stage_number} hikes
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {nextStage && (
                            <div className="w-32">
                              <div className="flex justify-between text-xs mb-1">
                                <span>{totalHikes}</span>
                                <span>{nextStage}</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}