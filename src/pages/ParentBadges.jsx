import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import { Card, CardContent } from '@/components/ui/card';
import { useSelectedChildId } from '@/hooks/useSelectedChild';
import AwardPanel from '../components/parent/badges/AwardPanel';
import EarnedPanel from '../components/parent/badges/EarnedPanel';
import ActivityAwardsRow from '../components/parent/badges/ActivityAwardsRow';
import AllBadgesGrid from '../components/parent/badges/AllBadgesGrid';

export default function ParentBadges() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: portal } = useQuery({
    queryKey: ['parent-portal', user?.email],
    queryFn: async () => (await base44.functions.invoke('getParentPortalData', {})).data,
    enabled: !!user?.email,
  });

  const { data: reference } = useQuery({
    queryKey: ['parent-reference', user?.email],
    queryFn: async () => (await base44.functions.invoke('getParentReferenceData', {})).data,
    enabled: !!user?.email,
  });

  const children = portal?.children || [];
  const [selectedChildId] = useSelectedChildId(children);
  const child = children.find(c => c.id === selectedChildId) || children[0];
  const sections = portal?.sections || [];
  const badgeProgress = portal?.badgeProgress || [];
  const reqProgress = portal?.requirementProgress || [];
  const awards = portal?.awards || [];
  const badges = reference?.badges || [];
  const modules = reference?.badgeModules || [];
  const requirements = reference?.badgeRequirements || [];

  if (!user || !child || !reference) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
      </div>
    );
  }

  const childSectionName = sections.find(s => s.id === child.section_id)?.name;

  // ── Progress helpers ────────────────────────────────────────────────────────
  const isBadgeComplete = (badgeId) => {
    if (awards.some(a => a.member_id === child.id && a.badge_id === badgeId && (a.award_status === 'awarded' || a.award_status === 'pending'))) return true;
    if (badgeProgress.some(p => p.member_id === child.id && p.badge_id === badgeId && p.status === 'completed')) return true;
    const badgeDef = badges.find(b => b.id === badgeId);
    const badgeModules = modules.filter(m => m.badge_id === badgeId);
    if (badgeModules.length === 0) return false;
    if (badgeDef?.completion_rule === 'one_module') {
      return badgeModules.some(mod => {
        const modReqs = requirements.filter(r => r.module_id === mod.id);
        const done = reqProgress.filter(p => p.member_id === child.id && p.module_id === mod.id && p.completed);
        return modReqs.length > 0 && done.length >= modReqs.length;
      });
    }
    for (const mod of badgeModules) {
      const modReqs = requirements.filter(r => r.module_id === mod.id);
      const done = reqProgress.filter(p => p.member_id === child.id && p.module_id === mod.id && p.completed);
      if (mod.completion_rule === 'x_of_n_required') {
        if (done.length < (mod.required_count || modReqs.length)) return false;
      } else if (done.length < modReqs.length) return false;
    }
    return true;
  };

  const getBadgePercentage = (badgeId) => {
    const badgeModules = modules.filter(m => m.badge_id === badgeId);
    let total = 0, completed = 0;
    badgeModules.forEach(mod => {
      const modReqs = requirements.filter(r => r.module_id === mod.id);
      if (mod.completion_rule === 'x_of_n_required') {
        const needed = mod.required_count || modReqs.length;
        total += needed;
        completed += Math.min(reqProgress.filter(p => p.member_id === child.id && p.module_id === mod.id && p.completed).length, needed);
      } else {
        total += modReqs.length;
        completed += reqProgress.filter(p => p.member_id === child.id && p.module_id === mod.id && p.completed).length;
      }
    });
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const isBadgeInProgress = (badgeId) => {
    if (isBadgeComplete(badgeId)) return false;
    const moduleIds = modules.filter(m => m.badge_id === badgeId).map(m => m.id);
    return reqProgress.some(p => p.member_id === child.id && moduleIds.includes(p.module_id) && p.completed);
  };

  // ── Section badge pools ─────────────────────────────────────────────────────
  const sectionBadges = badges.filter(b =>
    (b.section === childSectionName || b.section === 'all') &&
    !b.is_chief_scout_award &&
    ['challenge', 'staged', 'core', 'activity'].includes(b.category)
  );

  const specialName = (b, n) => b.name.toLowerCase().includes(n);
  const nightsAwayBadges = sectionBadges.filter(b => specialName(b, 'nights away')).sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
  const hikesAwayBadges = sectionBadges.filter(b => specialName(b, 'hikes away')).sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
  const joiningInBadges = sectionBadges.filter(b => specialName(b, 'joining in award')).sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
  const isSpecial = (b) => specialName(b, 'nights away') || specialName(b, 'hikes away') || specialName(b, 'joining in award');

  // Staged families (excluding the special families)
  const stagedFamilies = {};
  const singleBadges = [];
  sectionBadges.filter(b => !isSpecial(b)).forEach(b => {
    if (b.category === 'staged' && b.badge_family_id) {
      if (!stagedFamilies[b.badge_family_id]) {
        stagedFamilies[b.badge_family_id] = { familyId: b.badge_family_id, name: b.name.replace(/Stage \d+/i, '').trim(), stages: [] };
      }
      stagedFamilies[b.badge_family_id].stages.push(b);
    } else {
      singleBadges.push(b);
    }
  });
  Object.values(stagedFamilies).forEach(f => f.stages.sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0)));

  // ── Top-right: earned challenge + staged ───────────────────────────────────
  const earnedChallenge = sectionBadges.filter(b => b.category === 'challenge' && !isSpecial(b) && isBadgeComplete(b.id));
  const earnedStaged = Object.values(stagedFamilies)
    .map(family => {
      const earned = family.stages.filter(s => isBadgeComplete(s.id));
      if (earned.length === 0) return null;
      return { family, highest: earned.reduce((h, s) => ((s.stage_number || 0) > (h.stage_number || 0) ? s : h)) };
    })
    .filter(Boolean);

  // ── Activity awards row ─────────────────────────────────────────────────────
  const highestEarnedIn = (list) => {
    const earned = list.filter(b => isBadgeComplete(b.id));
    return earned.length ? earned.reduce((h, b) => ((b.stage_number || 0) > (h.stage_number || 0) ? b : h)) : null;
  };
  const activityGroups = [
    { key: 'nights', label: 'Nights Away', highest: highestEarnedIn(nightsAwayBadges), statText: `${child.total_nights_away || 0} nights away so far` },
    { key: 'hikes', label: 'Hikes Away', highest: highestEarnedIn(hikesAwayBadges), statText: `${child.total_hikes_away || 0} hikes so far` },
    { key: 'joining', label: 'Joining In Awards', highest: highestEarnedIn(joiningInBadges), statText: child.scouting_start_date ? `In scouting since ${new Date(child.scouting_start_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : null },
  ];

  // ── Bottom: all badges list ────────────────────────────────────────────────
  const allItems = [
    ...singleBadges.map(b => {
      const completed = isBadgeComplete(b.id);
      const pct = completed ? 100 : getBadgePercentage(b.id);
      return {
        key: b.id, name: b.name, image: b.image_url, category: b.category,
        percentage: pct,
        status: completed ? 'completed' : isBadgeInProgress(b.id) ? 'in_progress' : 'not_started',
      };
    }),
    ...Object.values(stagedFamilies).map(family => {
      const pcts = family.stages.map(s => (isBadgeComplete(s.id) ? 100 : getBadgePercentage(s.id)));
      const pct = Math.round(pcts.reduce((s, p) => s + p, 0) / (pcts.length || 1));
      const anyComplete = family.stages.some(s => isBadgeComplete(s.id));
      const allComplete = family.stages.every(s => isBadgeComplete(s.id));
      const anyStarted = family.stages.some(s => isBadgeInProgress(s.id));
      const highest = [...family.stages].reverse().find(s => isBadgeComplete(s.id));
      return {
        key: family.familyId, name: family.name, image: (highest || family.stages[0]).image_url,
        category: 'staged', stageCount: family.stages.length, percentage: pct,
        status: allComplete ? 'completed' : (anyComplete || anyStarted) ? 'in_progress' : 'not_started',
      };
    }),
  ];

  const awardBadge = badges.find(b => b.is_chief_scout_award && b.section === childSectionName) || badges.find(b => b.is_chief_scout_award);
  const clusterChallenge = badges
    .filter(b => b.category === 'challenge' && b.section === (childSectionName || 'scouts') && !b.is_chief_scout_award)
    .sort((a, b) => (a.display_priority || 0) - (b.display_priority || 0) || a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f8f7ff 0%, #f0eeff 50%, #f0fdf4 100%)', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <FloatingNav />
      <NavBarSpacer />
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 24px' }}>
        <div className="max-w-7xl mx-auto">
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>
            Parent Portal
          </p>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 32px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.2 }}>
            Badges &amp; Awards
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>{child.full_name}'s progress</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* 30/70 split: award diagram | earned badges */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <div className="lg:col-span-3">
            <AwardPanel
              sectionName={childSectionName}
              awardBadge={awardBadge}
              challengeBadges={clusterChallenge}
              isEarned={isBadgeComplete}
              getBadgePercentage={getBadgePercentage}
            />
          </div>
          <div className="lg:col-span-7">
            <EarnedPanel earnedChallenge={earnedChallenge} earnedStaged={earnedStaged} />
          </div>
        </div>

        {/* Nights away / Hikes away / Joining In */}
        <ActivityAwardsRow groups={activityGroups} />

        {/* All badges with filter */}
        <AllBadgesGrid items={allItems} />
      </div>
    </div>
  );
}