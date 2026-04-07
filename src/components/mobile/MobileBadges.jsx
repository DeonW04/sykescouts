import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Award, ChevronDown, ChevronUp, Star } from 'lucide-react';
import BadgeCriteriaSheet from './BadgeCriteriaSheet';

const CATEGORY_CONFIG = {
  challenge: { label: 'Challenge Badges', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  activity: { label: 'Activity Badges', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  staged: { label: 'Staged Badges', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  chief_scout_award: { label: 'Chief Scout Award', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
};

function BadgeCard({ badge, child, modules, requirements, reqProgress, awards, badgeProgress, onOpen }) {
  const earned = awards.some(a => a.member_id === child.id && a.badge_id === badge.id) ||
    badgeProgress.some(p => p.member_id === child.id && p.badge_id === badge.id && p.status === 'completed');

  const badgeModules = modules.filter(m => m.badge_id === badge.id);
  let total = 0, completed = 0;
  badgeModules.forEach(mod => {
    const modReqs = requirements.filter(r => r.module_id === mod.id);
    total += modReqs.length;
    completed += modReqs.filter(r => reqProgress.some(p => p.requirement_id === r.id && p.member_id === child.id && p.completed)).length;
  });
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <button
      onClick={onOpen}
      className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-3 text-left flex items-center gap-3 active:bg-gray-50 transition-colors"
    >
      {badge.image_url ? (
        <img src={badge.image_url} alt={badge.name} className="w-10 h-10 object-contain rounded-lg flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Award className="w-5 h-5 text-gray-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{badge.name}</p>
        {earned ? (
          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Earned</span>
        ) : total > 0 ? (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#7413dc] rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">{pct}%</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Not started</span>
        )}
      </div>
      <ChevronDown className="w-4 h-4 text-gray-300 flex-shrink-0 rotate-[-90deg]" />
    </button>
  );
}

function CategorySection({ title, colorConfig, badges, child, modules, requirements, reqProgress, awards, badgeProgress, onBadgeOpen }) {
  const [open, setOpen] = useState(true);
  if (badges.length === 0) return null;

  const earnedCount = badges.filter(b =>
    awards.some(a => a.member_id === child.id && a.badge_id === b.id) ||
    badgeProgress.some(p => p.member_id === child.id && p.badge_id === b.id && p.status === 'completed')
  ).length;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 mb-2 text-left"
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colorConfig?.dot || 'bg-gray-400'}`} />
        <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex-1">{title}</h2>
        <span className="text-xs text-gray-400">{earnedCount}/{badges.length}</span>
        {open ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
      </button>
      {open && (
        <div className="space-y-2">
          {badges.map(badge => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              child={child}
              modules={modules}
              requirements={requirements}
              reqProgress={reqProgress}
              awards={awards}
              badgeProgress={badgeProgress}
              onOpen={() => onBadgeOpen(badge)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChildBadges({ child }) {
  const [selectedBadge, setSelectedBadge] = useState(null);

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const childSection = sections.find(s => s.id === child.section_id);

  const { data: badges = [] } = useQuery({
    queryKey: ['badges', childSection?.name],
    queryFn: () => base44.entities.BadgeDefinition.filter({}),
    enabled: !!childSection,
  });

  const sectionBadges = badges.filter(b => b.section === childSection?.name || b.section === 'all');

  const { data: modules = [] } = useQuery({
    queryKey: ['badge-modules'],
    queryFn: () => base44.entities.BadgeModule.filter({}),
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['badge-requirements'],
    queryFn: () => base44.entities.BadgeRequirement.filter({}),
  });

  const { data: reqProgress = [] } = useQuery({
    queryKey: ['req-progress', child.id],
    queryFn: () => base44.entities.MemberRequirementProgress.filter({ member_id: child.id }),
    enabled: !!child.id,
  });

  const { data: awards = [] } = useQuery({
    queryKey: ['badge-awards', child.id],
    queryFn: () => base44.entities.MemberBadgeAward.filter({ member_id: child.id }),
    enabled: !!child.id,
  });

  const { data: badgeProgress = [] } = useQuery({
    queryKey: ['badge-progress', child.id],
    queryFn: () => base44.entities.MemberBadgeProgress.filter({ member_id: child.id }),
    enabled: !!child.id,
  });

  const categorized = {
    challenge: sectionBadges.filter(b => b.category === 'challenge'),
    activity: sectionBadges.filter(b => b.category === 'activity'),
    staged: sectionBadges.filter(b => b.category === 'staged'),
    chief_scout_award: sectionBadges.filter(b => b.category === 'chief_scout_award'),
  };

  if (selectedBadge) {
    return (
      <BadgeCriteriaSheet
        badge={selectedBadge}
        child={child}
        modules={modules}
        requirements={requirements}
        reqProgress={reqProgress}
        awards={awards}
        badgeProgress={badgeProgress}
        onClose={() => setSelectedBadge(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {Object.entries(categorized).map(([cat, list]) => (
        <CategorySection
          key={cat}
          title={CATEGORY_CONFIG[cat]?.label || cat}
          colorConfig={CATEGORY_CONFIG[cat]}
          badges={list}
          child={child}
          modules={modules}
          requirements={requirements}
          reqProgress={reqProgress}
          awards={awards}
          badgeProgress={badgeProgress}
          onBadgeOpen={setSelectedBadge}
        />
      ))}
      {sectionBadges.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-600">No badges found</p>
        </div>
      )}
    </div>
  );
}

export default function MobileBadges({ children }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-amber-500 to-amber-700 px-5 pt-16 pb-4 text-white">
        <h1 className="text-2xl font-bold">Badges</h1>
        <p className="text-white/70 text-sm mt-1">Track progress &amp; achievements</p>
        {children.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {children.map((child, idx) => (
              <button
                key={child.id}
                onClick={() => setSelectedIdx(idx)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold flex-shrink-0 transition-colors ${
                  selectedIdx === idx ? 'bg-white text-gray-900' : 'bg-white/20 text-white'
                }`}
              >
                {child.preferred_name || child.first_name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 py-5">
        {children[selectedIdx] ? (
          <ChildBadges child={children[selectedIdx]} />
        ) : (
          <div className="text-center py-16 text-gray-400">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No children linked</p>
          </div>
        )}
      </div>
    </div>
  );
}