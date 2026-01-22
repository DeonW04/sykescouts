import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Plus, Search, Users, TrendingUp, Package, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Badge } from '@/components/ui/badge';
import LeaderNav from '../components/leader/LeaderNav';

export default function LeaderBadges() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

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

  const { data: awards = [] } = useQuery({
    queryKey: ['awards'],
    queryFn: () => base44.entities.MemberBadgeAward.filter({}),
  });

  const { data: stock = [] } = useQuery({
    queryKey: ['badge-stock'],
    queryFn: () => base44.entities.BadgeStock.filter({}),
  });

  const filteredBadges = badges.filter(badge => {
    const matchesSearch = badge.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = sectionFilter === 'all' || badge.section === sectionFilter || badge.section === 'all';
    const matchesCategory = categoryFilter === 'all' || badge.category === categoryFilter;
    return matchesSearch && matchesSection && matchesCategory;
  });

  const getBadgeStats = (badgeId) => {
    const badge = badges.find(b => b.id === badgeId);
    
    const relevantMembers = members.filter(m => {
      return badge?.section === 'all' || m.section_id === sections.find(s => s.name === badge?.section)?.id;
    });

    // Count members with progress records
    const memberProgress = allProgress.filter(p => 
      p.badge_id === badgeId && 
      relevantMembers.some(m => m.id === p.member_id)
    );

    const completedCount = memberProgress.filter(p => p.completed_date != null).length;
    const inProgressCount = memberProgress.filter(p => p.started_date != null && p.completed_date == null).length;

    const percentComplete = relevantMembers.length > 0 
      ? Math.round((completedCount / relevantMembers.length) * 100) 
      : 0;

    // Due badges (completed but not awarded)
    const dueCount = awards.filter(a => 
      a.badge_id === badgeId && 
      a.award_status === 'pending' &&
      relevantMembers.some(m => m.id === a.member_id)
    ).length;

    // Stock info
    const stockInfo = stock.find(s => s.badge_id === badgeId);
    const currentStock = stockInfo?.current_stock || 0;
    const lowStock = stockInfo && currentStock < stockInfo.minimum_threshold;
    const outOfStock = currentStock === 0;

    return { 
      completedCount, 
      inProgressCount, 
      percentComplete, 
      totalMembers: relevantMembers.length,
      dueCount,
      currentStock,
      lowStock,
      outOfStock
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Badge Tracking</h1>
                <p className="mt-1 text-white/80">Track progress and manage badges</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate(createPageUrl('AwardBadges'))}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Award className="w-4 h-4 mr-2" />
                Award Badges
              </Button>
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
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="challenge">Challenge</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="staged">Staged</SelectItem>
                  <SelectItem value="core">Core</SelectItem>
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
                    <div className="flex flex-col">
                      <img
                        src={badge.image_url}
                        alt={badge.name}
                        className="w-full h-28 rounded-lg object-contain mb-3"
                      />
                      <div>
                        <CardTitle className="text-lg">
                          {badge.name}
                          {badge.category === 'staged' && badge.stage_number && (
                            <span className="text-sm font-normal text-gray-500"> - Stage {badge.stage_number}</span>
                          )}
                        </CardTitle>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">
                            {sections.find(s => s.name === badge.section)?.display_name || badge.section}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {badge.category}
                          </Badge>
                        </div>
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

                      <div className="grid grid-cols-2 gap-2 text-center mb-3">
                        <div className="bg-green-50 rounded-lg p-2">
                          <div className="text-xl font-bold text-green-700">{stats.completedCount}</div>
                          <div className="text-xs text-green-600">Completed</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2">
                          <div className="text-xl font-bold text-blue-700">{stats.inProgressCount}</div>
                          <div className="text-xs text-blue-600">In Progress</div>
                        </div>
                      </div>

                      {stats.dueCount > 0 && (
                        <div className={`p-2 rounded-lg flex items-center justify-between ${
                          stats.outOfStock ? 'bg-red-50' : stats.lowStock ? 'bg-orange-50' : 'bg-purple-50'
                        }`}>
                          <div className="flex items-center gap-2">
                            <Award className={`w-4 h-4 ${
                              stats.outOfStock ? 'text-red-600' : stats.lowStock ? 'text-orange-600' : 'text-purple-600'
                            }`} />
                            <span className={`text-sm font-medium ${
                              stats.outOfStock ? 'text-red-700' : stats.lowStock ? 'text-orange-700' : 'text-purple-700'
                            }`}>
                              {stats.dueCount} due to award
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className={`w-4 h-4 ${
                              stats.outOfStock ? 'text-red-600' : stats.lowStock ? 'text-orange-600' : 'text-gray-600'
                            }`} />
                            <span className={`text-xs ${
                              stats.outOfStock ? 'text-red-600 font-bold' : stats.lowStock ? 'text-orange-600' : 'text-gray-600'
                            }`}>
                              {stats.currentStock}
                            </span>
                          </div>
                        </div>
                      )}

                      {stats.outOfStock && stats.dueCount > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          Out of stock!
                        </div>
                      )}
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