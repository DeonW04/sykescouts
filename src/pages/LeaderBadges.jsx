import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Plus, Search, Users, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Badge } from '@/components/ui/badge';

export default function LeaderBadges() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');

  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: allProgress = [] } = useQuery({
    queryKey: ['badge-progress'],
    queryFn: () => base44.entities.MemberBadgeProgress.filter({}),
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['requirements'],
    queryFn: () => base44.entities.BadgeRequirement.filter({}),
  });

  const { data: requirementProgress = [] } = useQuery({
    queryKey: ['requirement-progress'],
    queryFn: () => base44.entities.MemberRequirementProgress.filter({}),
  });

  const filteredBadges = badges.filter(badge => {
    const matchesSearch = badge.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = sectionFilter === 'all' || badge.section === sectionFilter || badge.section === 'all';
    return matchesSearch && matchesSection;
  });

  const getBadgeStats = (badgeId) => {
    const badgeReqs = requirements.filter(r => r.badge_id === badgeId);
    const totalReqs = badgeReqs.length;
    
    const relevantMembers = members.filter(m => {
      const badge = badges.find(b => b.id === badgeId);
      return badge?.section === 'all' || m.section_id === sections.find(s => s.name === badge?.section)?.id;
    });

    const completedCount = allProgress.filter(p => p.badge_id === badgeId && p.status === 'completed').length;
    const inProgressCount = allProgress.filter(p => p.badge_id === badgeId && p.status === 'in_progress').length;
    
    let closeToCompletion = 0;
    relevantMembers.forEach(member => {
      const memberReqProgress = requirementProgress.filter(
        rp => rp.member_id === member.id && rp.badge_id === badgeId && rp.completed
      );
      if (memberReqProgress.length >= totalReqs - 1 && memberReqProgress.length < totalReqs) {
        closeToCompletion++;
      }
    });

    const percentComplete = relevantMembers.length > 0 
      ? Math.round((completedCount / relevantMembers.length) * 100) 
      : 0;

    return { completedCount, inProgressCount, closeToCompletion, percentComplete, totalMembers: relevantMembers.length };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#7413dc] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Badge Tracking</h1>
                <p className="mt-1 text-white/80">Track progress and manage badges</p>
              </div>
            </div>
            <Button
              onClick={() => navigate(createPageUrl('ManageBadges'))}
              className="bg-white text-[#7413dc] hover:bg-gray-100"
            >
              <Plus className="w-4 h-4 mr-2" />
              Manage Badges
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search badges..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.name}>
                      {section.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading badges...</p>
          </div>
        ) : filteredBadges.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No badges found</p>
              <Button
                onClick={() => navigate(createPageUrl('ManageBadges'))}
                className="mt-4 bg-[#7413dc] hover:bg-[#5c0fb0]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Badge
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBadges.map(badge => {
              const stats = getBadgeStats(badge.id);
              return (
                <Card 
                  key={badge.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(createPageUrl('BadgeDetail') + `?id=${badge.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <img
                        src={badge.image_url}
                        alt={badge.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <CardTitle className="text-lg">{badge.name}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {sections.find(s => s.name === badge.section)?.display_name || badge.section}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Section Completion</span>
                          <span className="font-medium">{stats.percentComplete}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#7413dc] transition-all"
                            style={{ width: `${stats.percentComplete}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-green-50 rounded-lg p-2">
                          <div className="text-xl font-bold text-green-700">{stats.completedCount}</div>
                          <div className="text-xs text-green-600">Completed</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2">
                          <div className="text-xl font-bold text-blue-700">{stats.inProgressCount}</div>
                          <div className="text-xs text-blue-600">In Progress</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-2">
                          <div className="text-xl font-bold text-orange-700">{stats.closeToCompletion}</div>
                          <div className="text-xs text-orange-600">Nearly Done</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}