import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import LeaderNav from '../components/leader/LeaderNav';

export default function JoiningInBadgeDetail() {
  const navigate = useNavigate();

  const { data: allBadges = [], isLoading: badgesLoading } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: allProgress = [] } = useQuery({
    queryKey: ['badge-progress'],
    queryFn: () => base44.entities.MemberBadgeProgress.filter({}),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  // Get all Joining In Award badges sorted by the numeric value in their name
  const joiningInBadges = allBadges
    .filter(b => b.name.includes('Joining In Award'))
    .sort((a, b) => {
      // Extract numbers from names like "1 year Joining In Award"
      const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });

  const getBadgeStats = (badgeId) => {
    const badge = allBadges.find(b => b.id === badgeId);
    
    const relevantMembers = members.filter(m => {
      return badge?.section === 'all' || m.section_id === sections.find(s => s.name === badge?.section)?.id;
    });

    const memberProgress = allProgress.filter(p => 
      p.badge_id === badgeId && 
      relevantMembers.some(m => m.id === p.member_id)
    );

    const completedCount = memberProgress.filter(p => p.status === 'completed').length;
    const inProgressCount = memberProgress.filter(p => p.status === 'in_progress').length;

    const percentComplete = relevantMembers.length > 0 
      ? Math.round((completedCount / relevantMembers.length) * 100) 
      : 0;

    return { 
      completedCount, 
      inProgressCount, 
      percentComplete, 
      totalMembers: relevantMembers.length
    };
  };

  if (badgesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LeaderNav />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('LeaderBadges'))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Badges
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Award className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Joining In Awards</h1>
              <p className="text-green-100 mt-1">Time-based membership badges for all sections</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>About Joining In Awards</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Joining In Awards celebrate a young person's time in Scouts. They're awarded after a young person 
              completes each year of their Scouting journey. These awards recognize commitment and are available 
              for all sections.
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {joiningInBadges.map(badge => {
            const stats = getBadgeStats(badge.id);
            
            return (
              <Card 
                key={badge.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(createPageUrl('BadgeDetail') + `?id=${badge.id}`)}
              >
                <CardHeader>
                  <div className="flex flex-col">
                    <img
                      src={badge.image_url}
                      alt={badge.name}
                      className="w-full h-28 rounded-lg object-contain mb-3"
                    />
                    <div>
                      <CardTitle className="text-lg">{badge.name}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">All Sections</Badge>
                        <Badge variant="outline">Activity</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Completion</span>
                        <span className="font-medium">{stats.percentComplete}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#7413dc] transition-all"
                          style={{ width: `${stats.percentComplete}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-green-50 rounded-lg p-2">
                        <div className="text-xl font-bold text-green-700">{stats.completedCount}</div>
                        <div className="text-xs text-green-600">Completed</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2">
                        <div className="text-xl font-bold text-blue-700">{stats.inProgressCount}</div>
                        <div className="text-xs text-blue-600">In Progress</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {joiningInBadges.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No Joining In Awards found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}