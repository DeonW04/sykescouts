import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import { useSectionContext } from '../components/leader/SectionContext';
import { motion } from 'framer-motion';

export default function StagedBadgeDetail() {
  const navigate = useNavigate();
  const { selectedSection } = useSectionContext();
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

  const familyBadge = allBadges.find(b => b.badge_family_id === familyId && b.stage_number === null);
  const stageBadges = allBadges
    .filter(b => b.badge_family_id === familyId && b.stage_number !== null)
    .sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));

  const getBadgeStats = (badgeId) => {
    const badge = allBadges.find(b => b.id === badgeId);
    const relevantMembers = selectedSection
      ? members.filter(m => m.section_id === selectedSection)
      : members.filter(m =>
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

    return { completedCount, inProgressCount, percentComplete, totalMembers: relevantMembers.length, dueCount, currentStock, lowStock, outOfStock };
  };

  if (!familyId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <FloatingNav />
        <NavBarSpacer />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No badge family specified</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!familyBadge) {
    return (
      <div className="min-h-screen bg-gray-50">
        <FloatingNav />
        <NavBarSpacer />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Badge family not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />

      {/* Header — matches BadgeDetail design language */}
      <div className="bg-[#7413dc] text-white py-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-6"
          >
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl p-3 flex items-center justify-center flex-shrink-0">
              <img src={familyBadge.image_url} alt={familyBadge.name} className="w-full h-full object-contain" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-4xl font-bold">{familyBadge.name}</h1>
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">Staged Badge</Badge>
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm capitalize">
                  {familyBadge.section !== 'all' ? sections.find(s => s.name === familyBadge.section)?.display_name : 'All Sections'}
                </Badge>
              </div>
              <p className="text-white/80 text-lg">{stageBadges.length} stages</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Edit button */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl('ManageStagedBadge') + `?familyId=${familyId}`)}
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Manage Stages
          </Button>
        </motion.div>

        {stageBadges.length === 0 ? (
          <Card className="rounded-2xl border border-gray-100 shadow-sm">
            <CardContent className="p-12 text-center">
              <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No stages defined yet</p>
              <Button
                onClick={() => navigate(createPageUrl('ManageStagedBadge') + `?familyId=${familyId}`)}
                className="bg-[#7413dc] hover:bg-[#5c0fb0]"
              >
                Create Stages
              </Button>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
          >
            {stageBadges.map((badge, i) => {
              const stats = getBadgeStats(badge.id);
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <Card
                    className="hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer rounded-2xl border border-gray-100 shadow-sm"
                    onClick={() => navigate(createPageUrl('BadgeDetail') + `?id=${badge.id}`)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="w-full aspect-square mb-3 bg-gray-50 rounded-xl p-2 flex items-center justify-center">
                        <img src={badge.image_url} alt={badge.name} className="w-full h-full object-contain" />
                      </div>
                      <p className="font-bold text-sm text-gray-900 mb-1">Stage {badge.stage_number}</p>

                      {/* Progress bar */}
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex mb-2">
                        <div className="h-full bg-[#7413dc] transition-all" style={{ width: `${stats.totalMembers > 0 ? Math.round((stats.completedCount / stats.totalMembers) * 100) : 0}%` }} />
                        <div className="h-full bg-blue-400 transition-all" style={{ width: `${stats.totalMembers > 0 ? Math.round((stats.inProgressCount / stats.totalMembers) * 100) : 0}%` }} />
                      </div>

                      <p className="text-xs text-gray-500">
                        {stats.completedCount} done · {stats.inProgressCount} in progress
                      </p>

                      {stats.dueCount > 0 && (
                        <p className={`mt-1 text-xs font-semibold ${stats.outOfStock ? 'text-red-600' : stats.lowStock ? 'text-orange-600' : 'text-[#7413dc]'}`}>
                          {stats.dueCount} to award{stats.outOfStock ? ' ⚠ No stock' : ''}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}