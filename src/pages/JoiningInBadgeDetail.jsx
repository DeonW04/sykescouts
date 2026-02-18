import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, ArrowLeft, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import LeaderNav from '../components/leader/LeaderNav';
import { differenceInMonths, differenceInYears } from 'date-fns';

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

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  // Get all Joining In Award badges sorted by year number
  const joiningInBadges = allBadges
    .filter(b => b.name.toLowerCase().includes('joining in award'))
    .sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });

  // For each member, calculate their years in scouting and which badge they currently have / are working towards
  const getMemberProgress = (member) => {
    const startDate = member.scouting_start_date || member.join_date;
    if (!startDate) return null;

    const now = new Date();
    const start = new Date(startDate);
    const totalMonths = differenceInMonths(now, start);
    const completedYears = Math.floor(totalMonths / 12);
    const monthsIntoCurrentYear = totalMonths % 12;
    const progressPercent = Math.round((monthsIntoCurrentYear / 12) * 100);

    // Current badge = the one for completedYears (e.g. completed 2 years → "2 year Joining In Award")
    const currentBadge = joiningInBadges.find(b => {
      const num = parseInt(b.name.match(/\d+/)?.[0] || '0');
      return num === completedYears;
    }) || null;

    // Next badge
    const nextBadge = joiningInBadges.find(b => {
      const num = parseInt(b.name.match(/\d+/)?.[0] || '0');
      return num === completedYears + 1;
    }) || null;

    return {
      completedYears,
      monthsIntoCurrentYear,
      progressPercent,
      currentBadge,
      nextBadge,
      startDate,
    };
  };

  // Sort members oldest first
  const sortedMembers = [...members].sort((a, b) =>
    new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime()
  );

  const membersWithProgress = sortedMembers
    .map(m => ({ member: m, progress: getMemberProgress(m) }))
    .filter(({ progress }) => progress !== null);

  const membersWithoutDate = sortedMembers.filter(m => !m.scouting_start_date && !m.join_date);

  const getSectionName = (sectionId) =>
    sections.find(s => s.id === sectionId)?.display_name || '';

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
              <p className="text-green-100 mt-1">1 award per year of scouting — based on movement join date</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Badge levels overview */}
        <Card>
          <CardHeader>
            <CardTitle>Award Levels</CardTitle>
          </CardHeader>
          <CardContent>
            {joiningInBadges.length === 0 ? (
              <p className="text-gray-500">No Joining In Award badges found in the system.</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {joiningInBadges.map(b => (
                  <div key={b.id} className="flex flex-col items-center gap-1 text-center">
                    <img src={b.image_url} alt={b.name} className="w-16 h-16 object-contain rounded-lg" />
                    <span className="text-xs text-gray-600 max-w-[72px]">{b.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member progress table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Member Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {membersWithProgress.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No members with a scouting start date recorded.</p>
            ) : (
              <div className="space-y-4">
                {membersWithProgress.map(({ member, progress }) => (
                  <div key={member.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Member info */}
                      <div className="min-w-[180px]">
                        <p className="font-semibold">{member.full_name}</p>
                        <p className="text-xs text-gray-500">{getSectionName(member.section_id)}</p>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {progress.completedYears} yr{progress.completedYears !== 1 ? 's' : ''} {progress.monthsIntoCurrentYear} mo
                        </p>
                      </div>

                      {/* Current badge */}
                      <div className="min-w-[120px] flex items-center gap-2">
                        {progress.currentBadge ? (
                          <>
                            <img src={progress.currentBadge.image_url} alt={progress.currentBadge.name} className="w-10 h-10 object-contain rounded" />
                            <div>
                              <p className="text-xs font-medium text-gray-700">Current</p>
                              <p className="text-xs text-gray-500">{progress.currentBadge.name}</p>
                            </div>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-gray-400">No award yet</Badge>
                        )}
                      </div>

                      {/* Progress to next */}
                      <div className="flex-1">
                        {progress.nextBadge ? (
                          <>
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Progress to: <span className="font-medium">{progress.nextBadge.name}</span></span>
                              <span>{progress.monthsIntoCurrentYear}/12 months</span>
                            </div>
                            <Progress value={progress.progressPercent} className="h-2" />
                          </>
                        ) : (
                          <span className="text-xs text-green-600 font-medium">✓ All available awards earned</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members without dates */}
        {membersWithoutDate.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-800 text-base">Members Missing Scouting Start Date</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-700 mb-3">
                These members don't have a scouting start date recorded. Add it in their member profile to track Joining In Awards.
              </p>
              <div className="flex flex-wrap gap-2">
                {membersWithoutDate.map(m => (
                  <Badge key={m.id} variant="outline" className="text-amber-800 border-amber-300">{m.full_name}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}