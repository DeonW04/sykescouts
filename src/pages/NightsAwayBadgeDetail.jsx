import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Tent, Trophy, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';
import { Badge } from '@/components/ui/badge';

const STAGE_THRESHOLDS = [1, 2, 3, 4, 5, 10, 15, 20, 35, 50];

export default function NightsAwayBadgeDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: nightsAwayBadges = [] } = useQuery({
    queryKey: ['nightsaway-badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ badge_family_id: 'nights_away' }),
  });

  const { data: awards = [] } = useQuery({
    queryKey: ['awards'],
    queryFn: () => base44.entities.MemberBadgeAward.filter({}),
  });

  const autoAwardMutation = useMutation({
    mutationFn: async ({ memberId, badgeId, nightsCount }) => {
      const user = await base44.auth.me();
      await base44.entities.MemberBadgeAward.create({
        member_id: memberId,
        badge_id: badgeId,
        awarded_date: new Date().toISOString().split('T')[0],
        awarded_by: user.email,
        award_status: 'pending',
        notes: `Auto-awarded for reaching ${nightsCount} nights away`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awards'] });
    },
  });

  // Auto-award badges based on total nights
  useEffect(() => {
    if (members.length > 0 && nightsAwayBadges.length > 0) {
      members.forEach(member => {
        const totalNights = member.total_nights_away || 0;
        
        STAGE_THRESHOLDS.forEach(threshold => {
          if (totalNights >= threshold) {
            const badge = nightsAwayBadges.find(b => b.stage_number === threshold);
            if (badge) {
              const alreadyAwarded = awards.some(a => 
                a.member_id === member.id && a.badge_id === badge.id
              );
              
              if (!alreadyAwarded) {
                autoAwardMutation.mutate({
                  memberId: member.id,
                  badgeId: badge.id,
                  nightsCount: threshold
                });
              }
            }
          }
        });
      });
    }
  }, [members, nightsAwayBadges, awards]);

  const getMemberBadges = (memberId) => {
    const memberAwards = awards.filter(a => a.member_id === memberId);
    return nightsAwayBadges
      .filter(badge => memberAwards.some(a => a.badge_id === badge.id))
      .sort((a, b) => a.stage_number - b.stage_number);
  };

  const getNextStage = (totalNights) => {
    return STAGE_THRESHOLDS.find(threshold => threshold > totalNights);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('LeaderBadges'))}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Badges
          </Button>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Tent className="w-12 h-12" />
              <div>
                <h1 className="text-3xl font-bold">Nights Away Staged Activity Badge</h1>
                <p className="mt-1 text-white/80">Tracking camping nights and awarding badges automatically</p>
              </div>
            </div>
            <Button
              onClick={() => navigate(createPageUrl('NightsAwayTracking'))}
              className="bg-white text-green-600 hover:bg-gray-100"
            >
              <Plus className="w-4 h-4 mr-2" />
              Log Nights Away
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {STAGE_THRESHOLDS.map(threshold => {
            const badge = nightsAwayBadges.find(b => b.stage_number === threshold);
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
                  <div className="text-xs text-gray-500">nights</div>
                  <div className="text-sm font-medium text-green-600 mt-1">
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
                  <TableHead>Total Nights</TableHead>
                  <TableHead>Next Stage</TableHead>
                  <TableHead>Badges Earned</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members
                  .sort((a, b) => (b.total_nights_away || 0) - (a.total_nights_away || 0))
                  .map(member => {
                    const totalNights = member.total_nights_away || 0;
                    const earnedBadges = getMemberBadges(member.id);
                    const nextStage = getNextStage(totalNights);
                    const progress = nextStage 
                      ? Math.round((totalNights / nextStage) * 100)
                      : 100;

                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.full_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Tent className="w-4 h-4 text-gray-400" />
                            <span className="text-lg font-bold text-[#7413dc]">{totalNights}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {nextStage ? (
                            <Badge variant="outline">{nextStage} nights</Badge>
                          ) : (
                            <Badge className="bg-green-600">All stages complete!</Badge>
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
                                  {badge.stage_number} nights
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {nextStage && (
                            <div className="w-32">
                              <div className="flex justify-between text-xs mb-1">
                                <span>{totalNights}</span>
                                <span>{nextStage}</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 transition-all"
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