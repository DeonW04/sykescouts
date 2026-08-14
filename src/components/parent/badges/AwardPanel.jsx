import React from 'react';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BadgeCluster from '@/components/mobile/award/BadgeCluster';

const CONFIG = {
  scouts: { title: "Chief Scout's Gold Award", accent: '#f59e0b', page: 'ParentGoldAward' },
  cubs: { title: "Chief Scout's Silver Award", accent: '#94a3b8', page: 'ParentSilverAward' },
  beavers: { title: "Chief Scout's Bronze Award", accent: '#b45309', page: 'ParentBronzeAward' },
};

export default function AwardPanel({ sectionName, awardBadge, challengeBadges, isEarned, getBadgePercentage }) {
  const navigate = useNavigate();
  const config = CONFIG[sectionName] || CONFIG.scouts;
  const earnedCount = challengeBadges.filter(b => isEarned(b.id)).length;
  const awardEarned = awardBadge ? isEarned(awardBadge.id) : false;
  const goToAward = () => navigate(createPageUrl(config.page));

  return (
    <div className="rounded-2xl overflow-hidden bg-white/90 backdrop-blur-xl border border-[#7413dc]/10 shadow-[0_4px_20px_rgba(0,0,0,0.05)] h-full flex flex-col">
      <div className="px-5 pt-6 pb-2 text-center">
        <p className="text-[10px] font-extrabold uppercase tracking-widest mb-1" style={{ color: config.accent }}>Highest Award</p>
        <h2 className="text-xl font-extrabold leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#1a1a2e' }}>{config.title}</h2>
        <p className="text-xs text-gray-500 mt-1">
          {earnedCount} of {challengeBadges.length} challenge badges{awardEarned ? ' · 🏆 Achieved!' : ''}
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center px-3 pb-6">
        {awardBadge ? (
          <div className="w-full">
            <BadgeCluster
              awardBadge={awardBadge}
              challengeBadges={challengeBadges}
              section={sectionName}
              isEarned={isEarned}
              getBadgePercentage={getBadgePercentage}
              awardEarned={awardEarned}
              accentColor={config.accent}
              onBadgeClick={goToAward}
              onAwardClick={goToAward}
            />
            <p className="text-center text-gray-400 text-[11px] mt-3">Tap any badge to explore</p>
          </div>
        ) : (
          <div className="text-center px-5 py-10 rounded-2xl border border-dashed bg-gray-50/70 mx-2" style={{ borderColor: `${config.accent}55` }}>
            <Sparkles className="w-9 h-9 mx-auto mb-3" style={{ color: config.accent }} />
            <p className="font-bold text-sm mb-1" style={{ color: '#1a1a2e' }}>{config.title} diagram coming soon</p>
            <p className="text-gray-500 text-xs">Badge progress is still tracked on this page.</p>
          </div>
        )}
      </div>
    </div>
  );
}