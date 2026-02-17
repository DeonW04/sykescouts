import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Filter } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function BadgesTab({ memberId }) {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState('all');

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['requirements'],
    queryFn: () => base44.entities.BadgeRequirement.filter({}),
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: () => base44.entities.BadgeModule.filter({}),
  });

  const { data: reqProgress = [] } = useQuery({
    queryKey: ['req-progress', memberId],
    queryFn: () => base44.entities.MemberRequirementProgress.filter({ member_id: memberId }),
  });

  const getBadgeProgress = (badgeId) => {
    const badgeModules = modules.filter(m => m.badge_id === badgeId);
    let totalRequired = 0;
    let totalCompleted = 0;

    badgeModules.forEach(module => {
      const moduleReqs = requirements.filter(r => r.module_id === module.id);
      const completedReqs = reqProgress.filter(p => 
        moduleReqs.some(r => r.id === p.requirement_id) && p.completed
      );

      if (module.completion_rule === 'x_of_n_required') {
        totalRequired += module.required_count || moduleReqs.length;
        totalCompleted += Math.min(completedReqs.length, module.required_count || moduleReqs.length);
      } else {
        totalRequired += moduleReqs.length;
        totalCompleted += completedReqs.length;
      }
    });

    return {
      completed: totalCompleted,
      total: totalRequired,
      percentage: totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0,
    };
  };

  // Get unique badges that have progress
  const uniqueBadgeIds = [...new Set(reqProgress.map(rp => rp.badge_id))];
  const badgesWithProgress = uniqueBadgeIds.map(badgeId => {
    const badge = badges.find(b => b.id === badgeId);
    if (!badge) return null;
    
    // Exclude special badges and only show activity, core, staged, and challenge
    const allowedCategories = ['activity', 'core', 'staged', 'challenge'];
    if (!allowedCategories.includes(badge.category?.toLowerCase())) return null;
    
    const progress = getBadgeProgress(badgeId);
    if (progress.total === 0) return null;
    return { badge, progress };
  }).filter(Boolean);

  // Filter and sort
  const filteredBadges = badgesWithProgress
    .filter(bp => filterType === 'all' || bp.badge.category === filterType)
    .sort((a, b) => b.progress.percentage - a.progress.percentage);

  // Group by category
  const badgesByCategory = filteredBadges.reduce((acc, bp) => {
    const category = bp.badge.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(bp);
    return acc;
  }, {});

  const categoryOrder = ['challenge', 'activity', 'staged', 'core', 'special'];
  const sortedCategories = Object.keys(badgesByCategory).sort((a, b) => 
    categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  return (
    <div className="space-y-6">
      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Badge Types</SelectItem>
                <SelectItem value="challenge">Challenge Badges</SelectItem>
                <SelectItem value="activity">Activity Badges</SelectItem>
                <SelectItem value="staged">Staged Badges</SelectItem>
                <SelectItem value="core">Core Badges</SelectItem>
                <SelectItem value="special">Special Badges</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Badges by Category */}
      {filteredBadges.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No badges in progress yet</p>
          </CardContent>
        </Card>
      ) : (
        sortedCategories.map(category => (
          <div key={category}>
            <h3 className="text-xl font-bold capitalize mb-4 text-gray-900">
              {category} Badges
            </h3>
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {badgesByCategory[category].map(bp => (
                <Card 
                  key={bp.badge.id} 
                  onClick={() => navigate(createPageUrl('BadgeDetail') + `?id=${bp.badge.id}`)}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <img
                        src={bp.badge.image_url}
                        alt={bp.badge.name}
                        className="w-16 h-16 rounded-lg"
                      />
                      <div className="flex-1">
                        <CardTitle className="text-base">{bp.badge.name}</CardTitle>
                        <p className="text-xs text-gray-500 capitalize">{bp.badge.category}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-semibold">
                          {bp.progress.completed}/{bp.progress.total} ({bp.progress.percentage}%)
                        </span>
                      </div>
                      <Progress value={bp.progress.percentage} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}