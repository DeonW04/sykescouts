import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, CheckCircle, Circle, Filter, Trophy, ChevronLeft, MapPin, Shirt, Star, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import UniformDiagram from '../uniform/UniformDiagram';

// ── Staged family dialog (same as ParentBadges) ──────────────
function StagedFamilyDialog({ selectedBadge, child, badgeProgress, getBadgeModules, getModuleRequirements, isRequirementCompleted, onUniformClick }) {
  const realStages = selectedBadge.family.stages.filter(s => s.stage_number != null && s.stage_number !== '');
  const uniformPosition = selectedBadge.family.stages.find(s => s.uniform_position)?.uniform_position;
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-4">
          <img src={selectedBadge.badge.image_url} alt={selectedBadge.family.name} className="w-20 h-20 rounded-lg" />
          <div>
            <DialogTitle className="text-2xl">{selectedBadge.family.name}</DialogTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className="capitalize">Staged Badge</Badge>
              <Button size="sm" variant="outline" className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50 gap-1" onClick={() => onUniformClick(uniformPosition)}>
                <MapPin className="w-3 h-3" /> Where does this go on my uniform?
              </Button>
            </div>
          </div>
        </div>
      </DialogHeader>
      <Tabs defaultValue={`stage-${realStages[0]?.id}`} className="mt-4">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${realStages.length}, 1fr)` }}>
          {realStages.map(stage => {
            const stageCompleted = badgeProgress.some(p => p.member_id === child.id && p.badge_id === stage.id && p.status === 'completed');
            return (
              <TabsTrigger key={stage.id} value={`stage-${stage.id}`} className="gap-2">
                Stage {stage.stage_number}
                {stageCompleted && <CheckCircle className="w-4 h-4 text-green-600" />}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {realStages.map(stage => (
          <TabsContent key={stage.id} value={`stage-${stage.id}`} className="space-y-6 mt-4">
            {stage.description && <p className="text-gray-600 text-sm">{stage.description}</p>}
            {getBadgeModules(stage.id).map(module => (
              <div key={module.id} className="border-l-4 border-[#7413dc] pl-4">
                <h3 className="font-bold text-lg mb-3">{module.name}</h3>
                <div className="space-y-2">
                  {getModuleRequirements(module.id).map((req, idx) => {
                    const completed = isRequirementCompleted(req.id, child.id);
                    return (
                      <div key={req.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                        {completed ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />}
                        <span className={`text-sm ${completed ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                          <span className="font-semibold">{idx + 1}.</span> {req.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function IpadBadges({ onBack }) {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [activityDialog, setActivityDialog] = useState(null);
  const [uniformDialog, setUniformDialog] = useState(false);
  const [uniformPositionHighlight, setUniformPositionHighlight] = useState(null);

  const { data: allMembers = [] } = useQuery({
    queryKey: ['ipad-badges-members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const child = allMembers.find(m => m.id === selectedMemberId) || null;

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: badgeProgress = [] } = useQuery({
    queryKey: ['badge-progress-ipad', selectedMemberId],
    queryFn: () => base44.entities.MemberBadgeProgress.filter({ member_id: selectedMemberId }),
    enabled: !!selectedMemberId,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: () => base44.entities.BadgeModule.filter({}),
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['requirements'],
    queryFn: () => base44.entities.BadgeRequirement.filter({}),
  });

  const { data: reqProgress = [] } = useQuery({
    queryKey: ['req-progress-ipad', selectedMemberId],
    queryFn: () => base44.entities.MemberRequirementProgress.filter({ member_id: selectedMemberId }),
    enabled: !!selectedMemberId,
  });

  const { data: awards = [] } = useQuery({
    queryKey: ['awards-ipad', selectedMemberId],
    queryFn: () => base44.entities.MemberBadgeAward.filter({ member_id: selectedMemberId }),
    enabled: !!selectedMemberId,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: nightsAwayLogs = [] } = useQuery({
    queryKey: ['nights-away-ipad', selectedMemberId],
    queryFn: () => base44.entities.NightsAwayLog.filter({ member_id: selectedMemberId }),
    enabled: !!selectedMemberId,
  });

  const { data: uniformConfigs = [] } = useQuery({
    queryKey: ['uniform-configs'],
    queryFn: () => base44.entities.UniformConfig.filter({}),
  });

  // ── Badge logic ──────────────────────────────────────────────
  const isRequirementCompleted = (reqId, memberId) =>
    reqProgress.some(p => p.member_id === memberId && p.requirement_id === reqId && p.completed);

  const isBadgeComplete = (badgeId) => {
    if (!child) return false;
    if (awards.some(a => a.member_id === child.id && a.badge_id === badgeId && (a.award_status === 'awarded' || a.award_status === 'pending'))) return true;
    if (badgeProgress.some(p => p.member_id === child.id && p.badge_id === badgeId && p.status === 'completed')) return true;
    const badgeDef = badges.find(b => b.id === badgeId);
    const badgeModules = modules.filter(m => m.badge_id === badgeId);
    if (badgeModules.length === 0) return false;
    if (badgeDef?.completion_rule === 'one_module') {
      return badgeModules.some(mod => {
        const modReqs = requirements.filter(r => r.module_id === mod.id);
        const completedReqs = reqProgress.filter(p => p.member_id === child.id && p.module_id === mod.id && p.completed);
        return modReqs.length > 0 && completedReqs.length >= modReqs.length;
      });
    }
    for (const mod of badgeModules) {
      const modReqs = requirements.filter(r => r.module_id === mod.id);
      const completedReqs = reqProgress.filter(p => p.member_id === child.id && p.module_id === mod.id && p.completed);
      if (mod.completion_rule === 'x_of_n_required') {
        if (completedReqs.length < (mod.required_count || modReqs.length)) return false;
      } else {
        if (completedReqs.length < modReqs.length) return false;
      }
    }
    return true;
  };

  const isBadgeInProgress = (badgeId) => {
    if (isBadgeComplete(badgeId) || !child) return false;
    const badgeMods = modules.filter(m => m.badge_id === badgeId);
    const moduleIds = badgeMods.map(m => m.id);
    return reqProgress.some(p => p.member_id === child.id && moduleIds.includes(p.module_id) && p.completed);
  };

  const getBadgeProgress = (badgeId) => {
    if (!child) return { completed: 0, total: 0, percentage: 0 };
    const badgeDef = badges.find(b => b.id === badgeId);
    const badgeModules = modules.filter(m => m.badge_id === badgeId);
    if (badgeDef?.completion_rule === 'one_module') {
      let bestPct = 0, bestCompleted = 0, bestTotal = 0;
      badgeModules.forEach(module => {
        const moduleReqs = requirements.filter(r => r.module_id === module.id);
        const modTotal = moduleReqs.reduce((s, req) => s + (req.required_completions || 1), 0);
        let modCompleted = 0;
        moduleReqs.forEach(req => {
          const rp = reqProgress.find(p => p.member_id === child.id && p.requirement_id === req.id);
          modCompleted += Math.min(rp?.completion_count || 0, req.required_completions || 1);
        });
        const modPct = modTotal > 0 ? Math.round((modCompleted / modTotal) * 100) : 0;
        if (modPct >= bestPct) { bestPct = modPct; bestCompleted = modCompleted; bestTotal = modTotal; }
      });
      return { completed: bestCompleted, total: bestTotal, percentage: bestPct };
    }
    let totalRequired = 0, totalCompleted = 0;
    badgeModules.forEach(module => {
      const moduleReqs = requirements.filter(r => r.module_id === module.id);
      if (module.completion_rule === 'x_of_n_required') {
        const needed = module.required_count || moduleReqs.length;
        totalRequired += needed;
        const completedReqs = reqProgress.filter(p => p.member_id === child.id && p.module_id === module.id && p.completed);
        totalCompleted += Math.min(completedReqs.length, needed);
      } else {
        moduleReqs.forEach(req => {
          const requiredCount = req.required_completions || 1;
          const reqProg = reqProgress.find(p => p.member_id === child.id && p.requirement_id === req.id);
          totalRequired += requiredCount;
          totalCompleted += Math.min(reqProg?.completion_count || 0, requiredCount);
        });
      }
    });
    return { completed: totalCompleted, total: totalRequired, percentage: totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0 };
  };

  const getBadgeModules = (badgeId) => modules.filter(m => m.badge_id === badgeId).sort((a, b) => a.order - b.order);
  const getModuleRequirements = (moduleId) => requirements.filter(r => r.module_id === moduleId).sort((a, b) => a.order - b.order);

  const getHighestEarnedInFamily = (familyBadges) => {
    if (!child) return null;
    const earned = familyBadges.filter(fb =>
      badgeProgress.some(p => p.member_id === child.id && p.badge_id === fb.id && p.status === 'completed') ||
      awards.some(a => a.member_id === child.id && a.badge_id === fb.id)
    );
    if (earned.length === 0) return null;
    return earned.reduce((highest, b) => (b.stage_number || 0) > (highest.stage_number || 0) ? b : highest);
  };

  // ── Derived data ─────────────────────────────────────────────
  const childSectionRecord = sections.find(s => s.id === child?.section_id);
  const childSectionName = childSectionRecord?.name;

  const allSectionBadges = badges.filter(b =>
    (b.section === childSectionName || b.section === 'all') &&
    !b.is_chief_scout_award && b.category !== 'special'
  );

  const stagedBadgeFamilies = badges
    .filter(b => b.category === 'staged' && b.badge_family_id)
    .reduce((acc, badge) => {
      if (!acc[badge.badge_family_id]) acc[badge.badge_family_id] = { name: badge.name.replace(/Stage \d+/, '').trim(), stages: [] };
      acc[badge.badge_family_id].stages.push(badge);
      return acc;
    }, {});
  Object.values(stagedBadgeFamilies).forEach(f => f.stages.sort((a, b) => a.stage_number - b.stage_number));

  const completedBadges = child ? badges.filter(b => isBadgeComplete(b.id)).map(b => ({ badge_id: b.id, member_id: child.id, status: 'completed' })) : [];
  const earnedByCategory = ['challenge', 'activity', 'staged', 'core', 'special'];
  const earnedNonStaged = completedBadges
    .filter(p => { const badge = badges.find(b => b.id === p.badge_id); return badge && badge.category !== 'staged' && !badge.is_chief_scout_award; })
    .sort((a, b) => {
      const ba = badges.find(x => x.id === a.badge_id), bb = badges.find(x => x.id === b.badge_id);
      return (earnedByCategory.indexOf(ba?.category) ?? 99) - (earnedByCategory.indexOf(bb?.category) ?? 99);
    });

  const getHighestCompletedStage = (familyId) => {
    const family = stagedBadgeFamilies[familyId];
    if (!family || !child) return null;
    const completedStages = family.stages.filter(stage => completedBadges.some(p => p.badge_id === stage.id));
    if (completedStages.length === 0) return null;
    return completedStages.reduce((highest, stage) => stage.stage_number > highest.stage_number ? stage : highest);
  };

  const nightsAwayBadges = [], hikesAwayBadges = [], joiningInBadges = [], stagedFamilies = {}, nonStagedBadges = [];
  allSectionBadges.forEach(badge => {
    if (badge.name.toLowerCase().includes('nights away')) nightsAwayBadges.push(badge);
    else if (badge.name.toLowerCase().includes('hikes away')) hikesAwayBadges.push(badge);
    else if (badge.name.toLowerCase().includes('joining in award')) joiningInBadges.push(badge);
    else if (badge.category === 'staged' && badge.badge_family_id) {
      if (!stagedFamilies[badge.badge_family_id]) stagedFamilies[badge.badge_family_id] = { familyId: badge.badge_family_id, name: badge.name.replace(/Stage \d+/i, '').trim(), category: badge.category, section: badge.section, stages: [] };
      stagedFamilies[badge.badge_family_id].stages.push(badge);
    } else nonStagedBadges.push(badge);
  });
  nightsAwayBadges.sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
  hikesAwayBadges.sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
  joiningInBadges.sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
  Object.values(stagedFamilies).forEach(f => f.stages.sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0)));

  const allAvailableBadges = [
    ...nonStagedBadges.map(badge => {
      const progress = getBadgeProgress(badge.id);
      return { type: 'single', badge, progress: { ...progress, isCompleted: isBadgeComplete(badge.id), inProgress: isBadgeInProgress(badge.id) } };
    }),
    ...Object.values(stagedFamilies).map(family => {
      let totalReqs = 0, completedReqs = 0;
      family.stages.forEach(stage => { const sp = getBadgeProgress(stage.id); totalReqs += sp.total; completedReqs += sp.completed; });
      return { type: 'family', family, badge: family.stages[0], progress: { completed: completedReqs, total: totalReqs, percentage: totalReqs > 0 ? Math.round((completedReqs / totalReqs) * 100) : 0, isCompleted: false, inProgress: family.stages.some(s => isBadgeInProgress(s.id)) } };
    })
  ];

  const incompleteBadges = allAvailableBadges.filter(bp => !bp.progress.isCompleted && bp.progress.percentage < 100);
  const inProgressBadges = incompleteBadges
    .filter(bp => { const cat = bp.type === 'family' ? bp.family.category : bp.badge.category; return cat === 'challenge' || bp.progress.inProgress; })
    .sort((a, b) => { const catA = a.type === 'family' ? a.family.category : a.badge.category, catB = b.type === 'family' ? b.family.category : b.badge.category; const catOrder = ['challenge', 'activity', 'staged', 'core']; return (catOrder.indexOf(catA) - catOrder.indexOf(catB)) || b.progress.percentage - a.progress.percentage; });
  const notStartedBadges = incompleteBadges.filter(bp => { const cat = bp.type === 'family' ? bp.family.category : bp.badge.category; return cat !== 'challenge' && !bp.progress.inProgress; });

  const filteredInProgress = inProgressBadges.filter(bp => { const cat = bp.type === 'family' ? bp.family.category : bp.badge.category; return filterType === 'all' || cat === filterType; });
  const filteredNotStarted = notStartedBadges.filter(bp => { const cat = bp.type === 'family' ? bp.family.category : bp.badge.category; return filterType === 'all' || cat === filterType; });

  const categoryOrder = ['challenge', 'activity', 'staged', 'core'];
  const notStartedByCategory = filteredNotStarted.reduce((acc, bp) => { const cat = bp.type === 'family' ? bp.family.category : bp.badge.category; if (!acc[cat]) acc[cat] = []; acc[cat].push(bp); return acc; }, {});
  if (notStartedByCategory.activity) notStartedByCategory.activity.sort((a, b) => (a.type === 'family' ? a.family.name : a.badge.name).localeCompare(b.type === 'family' ? b.family.name : b.badge.name));
  const sortedNotStartedCategories = Object.keys(notStartedByCategory).sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));

  const totalNightsAway = child?.total_nights_away || nightsAwayLogs.reduce((sum, log) => sum + (log.nights_count || 0), 0);
  const totalHikesAway = child?.total_hikes_away || 0;
  const goldAward = badges.find(b => b.is_chief_scout_award && b.section === childSectionName);

  const sortedMembers = [...allMembers].sort((a, b) => new Date(a.date_of_birth) - new Date(b.date_of_birth));

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-yellow-50 via-white to-purple-50 overflow-hidden">
      {/* Top Header Bar */}
      <div className="relative bg-gradient-to-r from-yellow-600 to-[#7413dc] text-white py-5 px-8 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Badges & Awards</h1>
            <p className="text-yellow-100 text-sm">{child ? child.full_name : 'Select a member to get started'}</p>
          </div>
        </div>
        {child && (
          <Button onClick={() => setUniformDialog(true)} className="bg-white/20 hover:bg-white/30 text-white border border-white/30 gap-2 text-base px-5 py-2.5">
            <Shirt className="w-5 h-5" /> Uniform Guide
          </Button>
        )}
      </div>

      {/* Split-panel body */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar: member selector + stats ── */}
        <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
          {/* Member selector */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-[#7413dc]" />
              <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Select Member</p>
            </div>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {sortedMembers.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedMemberId(m.id); setFilterType('all'); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 ${m.id === selectedMemberId ? 'bg-[#7413dc] text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${m.id === selectedMemberId ? 'bg-white/20 text-white' : 'bg-[#7413dc]/10 text-[#7413dc]'}`}>
                    {(m.first_name || '?').charAt(0)}
                  </div>
                  <span className="font-medium text-sm truncate">{m.full_name || `${m.first_name} ${m.surname}`}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stats panel (only when member selected) */}
          {child && (
            <div className="p-5 space-y-4 flex-1">
              {/* Section */}
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-1">Section</p>
                <p className="font-bold text-purple-800 capitalize">{childSectionRecord?.display_name || childSectionName || '—'}</p>
              </div>

              {/* Earned count */}
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Badges Earned</p>
                <p className="text-3xl font-bold text-green-700">{completedBadges.length}</p>
              </div>

              {/* In-progress count */}
              <div className="bg-orange-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-1">In Progress</p>
                <p className="text-3xl font-bold text-orange-600">{inProgressBadges.length}</p>
              </div>

              {/* Nights away */}
              {(nightsAwayBadges.length > 0 || totalNightsAway > 0) && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Nights Away</p>
                  <p className="text-3xl font-bold text-blue-600">{totalNightsAway}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right main content ── */}
        <div className="flex-1 overflow-y-auto">
          {!child ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <Award className="w-20 h-20 mb-4 opacity-20" />
              <p className="text-xl font-semibold">Select a member</p>
              <p className="text-sm mt-1">Choose a young person from the left panel</p>
            </div>
          ) : (
            <div className="p-8 space-y-10 max-w-5xl">
              {/* Gold Award banner */}
              {goldAward && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="cursor-pointer bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 border-amber-300 hover:shadow-xl transition-all hover:scale-[1.01]"
                    onClick={() => setSelectedBadge({ type: 'single', badge: goldAward, progress: { isCompleted: isBadgeComplete(goldAward.id), inProgress: false, percentage: 0, completed: 0, total: 0 } })}>
                    <CardContent className="p-5 flex items-center gap-5">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                        <Trophy className="w-9 h-9 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white">Chief Scout's Award</h3>
                        <p className="text-yellow-100 text-sm mt-0.5">The highest award — tap to view progress</p>
                      </div>
                      {isBadgeComplete(goldAward.id) && (
                        <div className="flex items-center gap-1 bg-white/20 text-white rounded-full px-3 py-1">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm font-semibold">Earned!</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ── Earned Badges ── */}
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-1 w-12 bg-gradient-to-r from-yellow-600 to-transparent rounded-full" />
                  <h2 className="text-2xl font-bold">Earned Badges</h2>
                  <span className="text-sm text-gray-400 font-medium">({completedBadges.length})</span>
                </div>
                {completedBadges.length === 0 ? (
                  <Card><CardContent className="p-10 text-center"><Award className="w-10 h-10 text-yellow-300 mx-auto mb-3" /><p className="text-gray-500">No badges earned yet — keep going!</p></CardContent></Card>
                ) : (
                  <Card className="bg-green-50 border-green-200 shadow-md">
                    <CardContent className="p-5">
                      <div className="flex flex-wrap gap-3">
                        {earnedNonStaged.map(progress => {
                          const badge = badges.find(b => b.id === progress.badge_id);
                          if (!badge) return null;
                          const bp = { type: 'single', badge, progress: { isCompleted: true, inProgress: false, percentage: 100, completed: 0, total: 0 } };
                          return (
                            <motion.button key={progress.badge_id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                              onClick={() => setSelectedBadge(bp)}
                              className="w-16 h-16 rounded-xl overflow-hidden hover:ring-2 hover:ring-green-500 transition-all hover:scale-110 bg-white shadow-sm" title={badge.name}>
                              <img src={badge.image_url} alt={badge.name} className="w-full h-full object-contain p-1" />
                            </motion.button>
                          );
                        })}
                        {Object.entries(stagedBadgeFamilies).map(([familyId, family]) => {
                          const highestStage = getHighestCompletedStage(familyId);
                          if (!highestStage) return null;
                          const bp = { type: 'single', badge: highestStage, progress: { isCompleted: true, inProgress: false, percentage: 100, completed: 0, total: 0 } };
                          return (
                            <motion.button key={familyId} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                              onClick={() => setSelectedBadge(bp)}
                              className="w-16 h-16 rounded-xl overflow-hidden hover:ring-2 hover:ring-green-500 transition-all hover:scale-110 bg-white shadow-sm" title={`${family.name} – Stage ${highestStage.stage_number}`}>
                              <img src={highestStage.image_url} alt={highestStage.name} className="w-full h-full object-contain p-1" />
                            </motion.button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </section>

              {/* ── Activity Awards ── */}
              {(nightsAwayBadges.length > 0 || hikesAwayBadges.length > 0 || joiningInBadges.length > 0) && (
                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-1 w-12 bg-gradient-to-r from-blue-600 to-transparent rounded-full" />
                    <h2 className="text-2xl font-bold">Activity Awards</h2>
                  </div>
                  <div className="grid grid-cols-3 gap-5">
                    {[
                      { label: 'Nights Away', family: nightsAwayBadges, key: 'nights', count: totalNightsAway, unit: 'nights' },
                      { label: 'Hikes Away', family: hikesAwayBadges, key: 'hikes', count: totalHikesAway, unit: 'hikes' },
                      { label: 'Joining In', family: joiningInBadges, key: 'joining', count: null, unit: null },
                    ].map(({ label, family, key, count, unit }) => {
                      if (family.length === 0) return null;
                      const highestEarned = getHighestEarnedInFamily(family);
                      return (
                        <motion.div key={key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                          <Card className="cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02] h-full" onClick={() => setActivityDialog(key)}>
                            <CardContent className="p-6 text-center">
                              <h3 className="font-bold text-base mb-4 text-gray-800">{label}</h3>
                              {highestEarned ? (
                                <div className="space-y-3">
                                  <img src={highestEarned.image_url} alt={highestEarned.name} className="w-20 h-20 mx-auto rounded-xl object-contain" />
                                  <p className="font-semibold text-sm leading-tight">{highestEarned.name}</p>
                                  {count !== null && (
                                    <div className="bg-blue-50 rounded-lg px-3 py-2">
                                      <p className="text-2xl font-bold text-blue-600">{count}</p>
                                      <p className="text-xs text-blue-500 capitalize">{unit}</p>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-center gap-1"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-xs text-green-700 font-medium">Highest earned</span></div>
                                </div>
                              ) : (
                                <div className="space-y-3 py-2">
                                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto"><Award className="w-8 h-8 text-gray-400" /></div>
                                  {count !== null && count > 0 && (
                                    <div className="bg-blue-50 rounded-lg px-3 py-2">
                                      <p className="text-2xl font-bold text-blue-600">{count}</p>
                                      <p className="text-xs text-blue-500 capitalize">{unit}</p>
                                    </div>
                                  )}
                                  <p className="text-gray-500 text-sm">Not earned yet</p>
                                </div>
                              )}
                              <p className="text-xs text-[#7413dc] mt-3 font-medium">View all stages →</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── In Progress ── */}
              <section>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="h-1 w-12 bg-gradient-to-r from-orange-500 to-transparent rounded-full" />
                    <h2 className="text-2xl font-bold">In Progress</h2>
                    <span className="text-sm text-gray-400 font-medium">({filteredInProgress.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="challenge">Challenge</SelectItem>
                        <SelectItem value="activity">Activity</SelectItem>
                        <SelectItem value="staged">Staged</SelectItem>
                        <SelectItem value="core">Core</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {filteredInProgress.length === 0 ? (
                  <Card><CardContent className="p-8 text-center"><p className="text-gray-500">No badges in progress</p></CardContent></Card>
                ) : (
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredInProgress.map((bp, idx) => {
                      const displayName = bp.type === 'family' ? bp.family.name : bp.badge.name;
                      const category = bp.type === 'family' ? bp.family.category : bp.badge.category;
                      return (
                        <motion.div key={bp.type === 'family' ? bp.family.familyId : bp.badge.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}>
                          <Card onClick={() => setSelectedBadge(bp)} className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-white">
                            <CardContent className="p-4 flex items-center gap-4">
                              <div className="relative flex-shrink-0">
                                <img src={bp.badge.image_url} alt={displayName} className="w-16 h-16 rounded-xl object-contain" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{displayName}</p>
                                <p className="text-xs text-gray-500 capitalize mb-1">{category}</p>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-gray-200 rounded-full"><div className="h-full bg-orange-400 rounded-full" style={{ width: `${bp.progress.percentage}%` }} /></div>
                                  <span className="text-xs font-bold text-orange-600">{bp.progress.percentage}%</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ── Badges to Work Towards ── */}
              <section className="pb-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-1 w-12 bg-gradient-to-r from-purple-600 to-transparent rounded-full" />
                  <h2 className="text-2xl font-bold">Badges to Work Towards</h2>
                </div>
                {filteredNotStarted.length === 0 ? (
                  <Card><CardContent className="p-8 text-center"><Award className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No more badges to start!</p></CardContent></Card>
                ) : sortedNotStartedCategories.map(category => (
                  <div key={category} className="mb-7">
                    <h3 className="text-base font-bold capitalize mb-3 text-gray-600 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#7413dc] inline-block" />
                      {category} Badges
                    </h3>
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                      {notStartedByCategory[category].map((bp, idx) => {
                        const displayName = bp.type === 'family' ? bp.family.name : bp.badge.name;
                        return (
                          <motion.div key={bp.type === 'family' ? bp.family.familyId : bp.badge.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}>
                            <Card onClick={() => setSelectedBadge(bp)} className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] bg-white/80 hover:bg-white">
                              <CardContent className="p-3 flex items-center gap-3">
                                <img src={bp.badge.image_url} alt={displayName} className="w-12 h-12 rounded-lg object-contain flex-shrink-0 opacity-70" />
                                <p className="font-medium text-gray-700 text-sm truncate">{displayName}</p>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            </div>
          )}
        </div>
      </div>

      {/* ── Activity Awards Dialog ── */}
      <Dialog open={!!activityDialog} onOpenChange={open => !open && setActivityDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {activityDialog && child && (() => {
            const isNights = activityDialog === 'nights', isHikes = activityDialog === 'hikes', isJoining = activityDialog === 'joining';
            const family = isNights ? nightsAwayBadges : isHikes ? hikesAwayBadges : joiningInBadges;
            const title = isNights ? 'Nights Away' : isHikes ? 'Hikes Away' : 'Joining In Awards';
            const totalCount = isNights ? totalNightsAway : isHikes ? totalHikesAway : null;
            const unit = isNights ? 'nights' : isHikes ? 'hikes' : null;
            let joiningInYears = null;
            if (isJoining && child.scouting_start_date) joiningInYears = (new Date() - new Date(child.scouting_start_date)) / (1000 * 60 * 60 * 24 * 365.25);
            const highestInDialog = getHighestEarnedInFamily(family);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4 mb-2">
                    {highestInDialog
                      ? <img src={highestInDialog.image_url} alt={highestInDialog.name} className="w-16 h-16 rounded-lg object-contain flex-shrink-0" />
                      : <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0"><Award className="w-8 h-8 text-gray-400" /></div>}
                    <div>
                      <DialogTitle className="text-2xl">{title}</DialogTitle>
                      {highestInDialog && <p className="text-sm text-green-600 font-medium flex items-center gap-1 mt-1"><CheckCircle className="w-4 h-4" /> Highest: {highestInDialog.name}</p>}
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-6 mt-2">
                  {totalCount !== null && (
                    <Card className="bg-blue-50 border-blue-200"><CardContent className="p-6 text-center">
                      <p className="text-sm text-gray-600 mb-1">Total {unit === 'nights' ? 'Nights Away' : 'Hikes'}</p>
                      <p className="text-5xl font-bold text-blue-600">{totalCount}</p>
                      <p className="text-gray-600 mt-1 capitalize">{unit}</p>
                    </CardContent></Card>
                  )}
                  {isJoining && (
                    <Card className="bg-purple-50 border-purple-200"><CardContent className="p-6 text-center">
                      <p className="text-sm text-gray-600 mb-1">Time in Scouting</p>
                      {child.scouting_start_date
                        ? (<><p className="text-5xl font-bold text-purple-600">{joiningInYears.toFixed(1)}</p><p className="text-gray-600 mt-1">years</p><p className="text-xs text-gray-500 mt-2">Since {new Date(child.scouting_start_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p></>)
                        : <p className="text-gray-500">Start date not recorded</p>}
                    </CardContent></Card>
                  )}
                  <div>
                    <h3 className="font-bold text-lg mb-3">Badge Stages</h3>
                    <div className="space-y-3">
                      {family.map(badge => {
                        const isEarned = badgeProgress.some(p => p.member_id === child.id && p.badge_id === badge.id && p.status === 'completed') || awards.some(a => a.member_id === child.id && a.badge_id === badge.id);
                        return (
                          <div key={badge.id} className={`flex items-center gap-4 p-3 rounded-lg border ${isEarned ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                            <img src={badge.image_url} alt={badge.name} className={`w-14 h-14 rounded-lg object-contain ${!isEarned ? 'opacity-40 grayscale' : ''}`} />
                            <div className="flex-1"><p className="font-semibold text-sm">{badge.name}</p></div>
                            {isEarned ? <div className="flex items-center gap-1 text-green-600"><CheckCircle className="w-5 h-5" /><span className="text-xs font-medium">Earned</span></div> : <Circle className="w-5 h-5 text-gray-400" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {isNights && nightsAwayLogs.filter(l => l.member_id === child.id).length > 0 && (
                    <div>
                      <h3 className="font-bold text-lg mb-3">Camp History</h3>
                      <div className="space-y-2">
                        {nightsAwayLogs.filter(l => l.member_id === child.id).sort((a, b) => new Date(b.start_date) - new Date(a.start_date)).map(log => (
                          <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                            <div><p className="font-medium text-sm">{log.location || 'Camp'}</p><p className="text-xs text-gray-500">{new Date(log.start_date).toLocaleDateString('en-GB')}</p></div>
                            <Badge variant="secondary">{log.nights_count} night{log.nights_count !== 1 ? 's' : ''}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Uniform Guide Dialog ── */}
      <Dialog open={uniformDialog} onOpenChange={open => { setUniformDialog(open); if (!open) setUniformPositionHighlight(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shirt className="w-5 h-5" />Uniform Guide – {child?.full_name}</DialogTitle>
          </DialogHeader>
          {uniformPositionHighlight && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Showing where this badge goes on the uniform
            </div>
          )}
          <UniformDiagram
            uniformConfig={uniformConfigs.find(u => u.section === childSectionName) || null}
            earnedBadges={completedBadges}
            allBadges={badges}
            highlightPosition={uniformPositionHighlight}
            onBadgeClick={(badge) => { setUniformDialog(false); setSelectedBadge({ type: 'single', badge, progress: { isCompleted: true, inProgress: false, percentage: 100, completed: 0, total: 0 } }); }}
          />
          <p className="text-xs text-gray-500 text-center mt-2">Tap a circle to see which badges go in that area. Gold circles = earned badges.</p>
        </DialogContent>
      </Dialog>

      {/* ── Badge Detail Dialog ── */}
      <Dialog open={!!selectedBadge} onOpenChange={open => !open && setSelectedBadge(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedBadge && child && (
            <>
              {selectedBadge.type === 'single' && (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-4">
                      <img src={selectedBadge.badge.image_url} alt={selectedBadge.badge.name} className="w-20 h-20 rounded-lg" />
                      <div>
                        <DialogTitle className="text-2xl">{selectedBadge.badge.name}</DialogTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className="capitalize">{selectedBadge.badge.category}</Badge>
                          {selectedBadge.progress?.isCompleted && <Badge className="bg-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Earned</Badge>}
                          <Button size="sm" variant="outline" className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50 gap-1"
                            onClick={() => { setUniformPositionHighlight(selectedBadge.badge.uniform_position || null); setSelectedBadge(null); setUniformDialog(true); }}>
                            <MapPin className="w-3 h-3" /> Where does this go on my uniform?
                          </Button>
                        </div>
                        {selectedBadge.badge.description && <p className="text-gray-600 mt-2">{selectedBadge.badge.description}</p>}
                      </div>
                    </div>
                  </DialogHeader>
                  <div className="space-y-6 mt-4">
                    {selectedBadge.badge.completion_rule === 'one_module' && (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <p className="text-sm text-amber-800 font-medium">Complete one module only — finishing any single module below earns this badge.</p>
                      </div>
                    )}
                    {getBadgeModules(selectedBadge.badge.id).map(module => (
                      <div key={module.id} className="border-l-4 border-[#7413dc] pl-4">
                        <h3 className="font-bold text-lg mb-3">{module.name}</h3>
                        <div className="space-y-2">
                          {getModuleRequirements(module.id).map((req, idx) => {
                            const completed = isRequirementCompleted(req.id, child.id);
                            return (
                              <div key={req.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                                {completed ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />}
                                <span className={`text-sm ${completed ? 'text-gray-900 font-medium' : 'text-gray-600'}`}><span className="font-semibold">{idx + 1}.</span> {req.text}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {selectedBadge.type === 'family' && (
                <StagedFamilyDialog
                  selectedBadge={selectedBadge}
                  child={child}
                  badgeProgress={badgeProgress}
                  getBadgeModules={getBadgeModules}
                  getModuleRequirements={getModuleRequirements}
                  isRequirementCompleted={isRequirementCompleted}
                  onUniformClick={(pos) => { setUniformPositionHighlight(pos || null); setSelectedBadge(null); setUniformDialog(true); }}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}