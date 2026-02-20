import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Award, ArrowLeft, Package, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import LeaderNav from '../components/leader/LeaderNav';

export default function StagedBadgeDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const familyId = urlParams.get('familyId');

  const { data: allBadges = [], isLoading } = useQuery({
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

  const { data: awards = [] } = useQuery({
    queryKey: ['awards'],
    queryFn: () => base44.entities.MemberBadgeAward.filter({}),
  });

  const { data: stock = [] } = useQuery({
    queryKey: ['badge-stock'],
    queryFn: () => base44.entities.BadgeStock.filter({}),
  });

  // Get family badge and all its stages
  const familyBadge = allBadges.find(b => b.badge_family_id === familyId && b.stage_number === null);
  const stageBadges = allBadges
    .filter(b => b.badge_family_id === familyId && b.stage_number !== null)
    .sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));

  const getBadgeStats = (badgeId) => {
    const badge = allBadges.find(b => b.id === badgeId);
    const relevantMembers = members.filter(m =>
      badge?.section === 'all' || m.section_id === sections.find(s => s.name === badge?.section)?.id
    );

    const memberProgress = allProgress.filter(p => 
      p.badge_id === badgeId && 
      relevantMembers.some(m => m.id === p.member_id)
    );

    const completedCount = memberProgress.filter(p => p.status === 'completed').length;
    const inProgressCount = memberProgress.filter(p => p.status === 'in_progress').length;

    const percentComplete = relevantMembers.length > 0 
      ? Math.round((completedCount / relevantMembers.length) * 100) 
      : 0;

    const dueCount = awards.filter(a => 
      a.badge_id === badgeId && 
      a.award_status === 'pending' &&
      relevantMembers.some(m => m.id === a.member_id)
    ).length;

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

  if (!familyId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-12 text-center">
            <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No badge family specified</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading badge details...</p>
        </div>
      </div>
    );
  }

  if (!familyBadge) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-12 text-center">
            <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Badge family not found</p>
          </CardContent>
        </Card>
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
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Badges
          </Button>
          <div className="flex items-center gap-4">
            <img
              src={familyBadge.image_url}
              alt={familyBadge.name}
              className="w-20 h-20 rounded-lg object-contain"
            />
            <div>
              <h1 className="text-3xl font-bold">{familyBadge.name}</h1>
              <p className="mt-1 text-white/80">{stageBadges.length} stages</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {stageBadges.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No stages defined yet</p>
              <Button
                onClick={() => navigate(createPageUrl('ManageStagedBadge') + `?familyId=${familyId}`)}
                className="mt-4 bg-[#7413dc] hover:bg-[#5c0fb0]"
              >
                Create Stages
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
            {stageBadges.map(badge => {
              const stats = getBadgeStats(badge.id);
              return (
                <Card
                  key={badge.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(createPageUrl('BadgeDetail') + `?id=${badge.id}`)}
                >
                  <CardContent className="p-3 text-center">
                    <img
                      src={badge.image_url}
                      alt={badge.name}
                      className="w-full aspect-square object-contain rounded-lg mb-2"
                    />
                    <h3 className="font-semibold text-xs leading-tight">Stage {badge.stage_number}</h3>
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