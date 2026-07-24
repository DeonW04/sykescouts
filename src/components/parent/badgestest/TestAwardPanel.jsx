import React from 'react';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BadgeCluster from '@/components/mobile/award/BadgeCluster';

const CONFIG = {
  scouts: { title: "Chief Scout's Gold Award", accent: '#f59e0b', gradient: 'linear-gradient(160deg, #14213d 0%, #0f172a 55%, #1a1024 100%)', implemented: true },
  cubs: { title: "Chief Scout's Silver Award", accent: '#94a3b8', gradient: 'linear-gradient(160deg, #1e293b 0%, #0f172a 55%, #1a1f35 100%)', implemented: false },
  beavers: { title: "Chief Scout's Bronze Award", accent: '#b45309', gradient: 'linear-gradient(160deg, #2a1a0f 0%, #0f172a 55%, #1f1408 100%)', implemented: false },
};

export default function TestAwardPanel({ sectionName, awardBadge, challengeBadges, isEarned, getBadgePercentage }) {
  const navigate = useNavigate();
  const config = CONFIG[sectionName] || CONFIG.scouts;
  const earnedCount = challengeBadges.filter(b => isEarned(b.id)).length;
  const awardEarned = awardBadge ? isEarned(awardBadge.id) : false;
  const goToAward = () => navigate(createPageUrl(sectionName === 'cubs' ? 'ParentSilverAward' : 'ParentGoldAward'));

  return (
    <div className="rounded-2xl overflow-hidden shadow-xl h-full flex flex-col" style={{ background: config.gradient }}>
      <div className="px-5 pt-6 pb-2 text-center">
        <p className="text-[10px] font-extrabold uppercase tracking-widest mb-1" style={{ color: config.accent }}>Highest Award</p>
        <h2 className="text-xl font-extrabold text-white leading-tight">{config.title}</h2>
        <p className="text-xs text-white/50 mt-1">
          {earnedCount} of {challengeBadges.length} challenge badges{awardEarned ? ' · 🏆 Achieved!' : ''}
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center px-3 pb-6">
        {config.implemented && awardBadge ? (
          <div className="w-full">
            <BadgeCluster
              awardBadge={awardBadge}
              challengeBadges={challengeBadges}
              isSilver={false}
              isEarned={isEarned}
              getBadgePercentage={getBadgePercentage}
              awardEarned={awardEarned}
              accentColor={config.accent}
              onBadgeClick={goToAward}
              onAwardClick={goToAward}
            />
            <p className="text-center text-white/30 text-[11px] mt-3">Tap any badge to explore</p>
          </div>
        ) : (
          <div className="text-center px-5 py-10 rounded-2xl border border-dashed mx-2" style={{ borderColor: `${config.accent}55`, background: 'rgba(255,255,255,0.03)' }}>
            <Sparkles className="w-9 h-9 mx-auto mb-3" style={{ color: config.accent }} />
            <p className="text-white font-bold text-sm mb-1">{config.title} diagram coming soon</p>
            <p className="text-white/45 text-xs">Badge progress is still tracked on this page.</p>
          </div>
        )}
      </div>
    </div>
  );
}