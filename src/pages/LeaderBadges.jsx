import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Plus, Search, Users, TrendingUp, Package, AlertTriangle, LayoutList, Grid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Badge } from '@/components/ui/badge';
import LeaderNav from '../components/leader/LeaderNav';
import MemberBadgeView from '../components/badges/MemberBadgeView';

export default function LeaderBadges() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('badge'); // 'badge' | 'member'

  const { data: allBadges = [], isLoading } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  // For display: show individual stage badges and all non-staged badges
  // But also include family badges for the staged category view
  const badges = allBadges;

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

  const isMemberBadgeComplete = (memberId, badgeId) => {
    const badgeModules = requirements.length > 0 
      ? [...new Set(requirements.filter(r => r.badge_id === badgeId).map(r => r.module_id))]
      : [];
    // Fall back to DB record if no requirement data
    if (badgeModules.length === 0) {
      return allProgress.some(p => p.member_id === memberId && p.badge_id === badgeId && p.status === 'completed');
    }
    // Use requirementProgress as source of truth
    const badgeReqs = requirements.filter(r => r.badge_id === badgeId);
    // Group by module — need module data for completion rules
    return allProgress.some(p => p.member_id === memberId && p.badge_id === badgeId && p.status === 'completed')
      || requirementProgress.filter(p => p.member_id === memberId && p.badge_id === badgeId && p.completed).length === badgeReqs.length && badgeReqs.length > 0;
  };

  const getBadgeStats = (badgeId) => {
    const badge = badges.find(b => b.id === badgeId);
    
    const relevantMembers = members.filter(m => {
      return badge?.section === 'all' || m.section_id === sections.find(s => s.name === badge?.section)?.id;
    });

    // Count completed: use DB badge progress record (kept in sync by BadgeDetail mutations)
    const memberBadgeProgress = allProgress.filter(p => 
      p.badge_id === badgeId && 
      relevantMembers.some(m => m.id === p.member_id)
    );

    const completedCount = relevantMembers.filter(m =>
      memberBadgeProgress.some(p => p.member_id === m.id && p.status === 'completed')
    ).length;

    // In Progress: at least 1 individual requirement done, but badge not completed
    const inProgressCount = relevantMembers.filter(m => {
      const isCompleted = memberBadgeProgress.some(p => p.member_id === m.id && p.status === 'completed');
      if (isCompleted) return false;
      return requirementProgress.some(p => p.member_id === m.id && p.badge_id === badgeId && p.completed);
    }).length;

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Badge Tracking</h1>
                <p className="mt-1 text-white/80">Track progress and manage badges</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="flex rounded-lg overflow-hidden border border-white/30">
                <button
                  onClick={() => setViewMode('badge')}
                  className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 ${viewMode === 'badge' ? 'bg-white text-green-700' : 'text-white hover:bg-white/20'}`}
                >
                  <Grid className="w-4 h-4" />
                  <span className="hidden sm:inline">By Badge</span>
                </button>
                <button
                  onClick={() => setViewMode('member')}
                  className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 ${viewMode === 'member' ? 'bg-white text-green-700' : 'text-white hover:bg-white/20'}`}
                >
                  <LayoutList className="w-4 h-4" />
                  <span className="hidden sm:inline">By Member</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Member view */}
        {viewMode === 'member' && (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.name}>{section.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <MemberBadgeView sectionFilter={sectionFilter} />
          </div>
        )}

        {viewMode === 'badge' && <>
        {/* Mobile Filters */}
        <Card className="mb-6 md:hidden">
          <CardContent className="p-4">
            <details className="group">
              <summary className="cursor-pointer list-none flex items-center justify-between">
                <span className="font-medium">Filters & Search</span>
                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search badges..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={sectionFilter} onValueChange={setSectionFilter}>
                  <SelectTrigger className="w-full">
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
                  <SelectTrigger className="w-full">
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
            </details>
          </CardContent>
        </Card>

        {/* Desktop Filters */}
        <Card className="mb-6 hidden md:block">
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
                    </CardContent>
                  </Card>
                ) : (
                  <div>
                    {['challenge', 'activity', 'staged', 'core'].map(category => {
                      const categoryBadges = filteredBadges.filter(b => b.category === category);
                      if (categoryBadges.length === 0) return null;

                      // For staged badges, group by family and show one badge per family
                      // Also group Nights Away, Hikes Away, and Joining In as families in activity
                      let displayBadges;
                      if (category === 'staged') {
                        // Also pull in Joining In Awards from activity category (treated as staged)
                        const joiningInBadges = filteredBadges.filter(b => b.name.toLowerCase().includes('joining in award'));
                        const joiningInPlaceholder = joiningInBadges.length > 0 ? [{
                          id: 'joining-in-awards', name: 'Joining In Awards', section: 'all',
                          category: 'staged', image_url: joiningInBadges[0].image_url,
                          isJoiningInPlaceholder: true
                        }] : [];

                        const familyMap = new Map();
                        categoryBadges
                          .filter(b => !b.name.toLowerCase().includes('joining in award'))
                          .forEach(badge => {
                          const familyId = badge.badge_family_id;
                          if (familyId && !familyMap.has(familyId)) {
                            const firstStage = categoryBadges
                              .filter(b => b.badge_family_id === familyId)
                              .sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0))[0];
                            familyMap.set(familyId, firstStage);
                          }
                        });
                        displayBadges = [...Array.from(familyMap.values()), ...joiningInPlaceholder];
                      } else if (category === 'activity') {
                        const nightsAwayBadges = categoryBadges.filter(b => b.name.toLowerCase().includes('nights away'));
                        const hikesAwayBadges = categoryBadges.filter(b => b.name.toLowerCase().includes('hikes away'));
                        const otherBadges = categoryBadges.filter(b =>
                          !b.name.toLowerCase().includes('nights away') &&
                          !b.name.toLowerCase().includes('hikes away') &&
                          !b.name.toLowerCase().includes('joining in award')
                        );

                        const nightsAwayPlaceholder = nightsAwayBadges.length > 0 ? [{
                          id: 'nights-away-family', name: 'Nights Away',
                          section: nightsAwayBadges[0].section, category: 'activity',
                          image_url: nightsAwayBadges[0].image_url,
                          badge_family_id: nightsAwayBadges[0].badge_family_id,
                          isNightsAwayFamily: true
                        }] : [];
                        const hikesAwayPlaceholder = hikesAwayBadges.length > 0 ? [{
                          id: 'hikes-away-family', name: 'Hikes Away',
                          section: hikesAwayBadges[0].section, category: 'activity',
                          image_url: hikesAwayBadges[0].image_url,
                          badge_family_id: hikesAwayBadges[0].badge_family_id,
                          isHikesAwayFamily: true
                        }] : [];

                        displayBadges = [...otherBadges, ...nightsAwayPlaceholder, ...hikesAwayPlaceholder]
                          .sort((a, b) => a.name.localeCompare(b.name));
                      } else {
                        displayBadges = categoryBadges;
                      }

                      return (
                        <div key={category} className="mb-8">
                          <h2 className="text-2xl font-bold mb-4 capitalize">{category} Badges</h2>
                          <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
                            {displayBadges.map(badge => {
                              const isStaged = badge.category === 'staged';
                              const isJoiningIn = badge.isJoiningInPlaceholder;
                              const isFamilyPlaceholder = badge.isNightsAwayFamily || badge.isHikesAwayFamily || isJoiningIn || isJoiningIn;
                              const stats = !isFamilyPlaceholder ? getBadgeStats(badge.id) : null;

                              const isNightsAwayFamily = badge.isNightsAwayFamily;
                              const isHikesAwayFamily = badge.isHikesAwayFamily;

                              return (
                                <Card
                                  key={badge.id}
                                  className={`hover:shadow-lg transition-shadow ${!isFamilyPlaceholder && !badge.is_chief_scout_award ? 'cursor-pointer' : ''}`}
                                  onClick={() => {
                                    if (isNightsAwayFamily) navigate(createPageUrl('NightsAwayBadgeDetail'));
                                    else if (isHikesAwayFamily) navigate(createPageUrl('HikesAwayBadgeDetail'));
                                    else if (isJoiningIn) navigate(createPageUrl('JoiningInBadgeDetail'));
                                    else if (isStaged) {
                                      if (badge.badge_family_id === 'nights_away') navigate(createPageUrl('NightsAwayBadgeDetail'));
                                      else if (badge.badge_family_id === 'hikes_away') navigate(createPageUrl('HikesAwayBadgeDetail'));
                                      else navigate(createPageUrl('StagedBadgeDetail') + `?familyId=${badge.badge_family_id}`);
                                    } else if (badge.is_chief_scout_award) navigate(createPageUrl('GoldAwardDetail'));
                                    else if (!isFamilyPlaceholder) navigate(createPageUrl('BadgeDetail') + `?id=${badge.id}`);
                                  }}
                                >
                                  <CardContent className="p-3 text-center">
                                    <img
                                      src={badge.image_url}
                                      alt={badge.name}
                                      className="w-full aspect-square object-contain rounded-lg mb-2"
                                    />
                                    <h3 className="font-semibold text-xs leading-tight">{badge.name}</h3>
                                    {!isFamilyPlaceholder && !badge.is_chief_scout_award && stats && (
                                      <div className="mt-2">
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex mb-1">
                                          <div className="h-full bg-[#7413dc]" style={{ width: `${stats.totalMembers > 0 ? Math.round((stats.completedCount / stats.totalMembers) * 100) : 0}%` }} />
                                          <div className="h-full bg-blue-400" style={{ width: `${stats.totalMembers > 0 ? Math.round((stats.inProgressCount / stats.totalMembers) * 100) : 0}%` }} />
                                        </div>
                                        <span className="text-xs text-gray-500">{stats.completedCount} done · {stats.inProgressCount} in progress</span>
                                        {stats.dueCount > 0 && (
                                          <div className={`mt-1 text-xs font-medium ${stats.outOfStock ? 'text-red-600' : stats.lowStock ? 'text-orange-600' : 'text-purple-600'}`}>
                                            {stats.dueCount} to award {stats.outOfStock ? '⚠ No stock' : ''}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {(isFamilyPlaceholder || isStaged || badge.is_chief_scout_award) && (
                                      <p className="text-xs text-[#7413dc] mt-1 font-medium">View →</p>
                                    )}
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
        </>}
      </div>
    </div>
  );
}