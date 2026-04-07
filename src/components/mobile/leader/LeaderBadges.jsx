import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Award, ChevronDown, ChevronUp, Search, CheckCircle, Circle } from 'lucide-react';

function MemberBadgeView({ member, badges, badgeProgress, awards, onBack }) {
  const sectionBadges = badges.filter(b => b.section === member._sectionName || b.section === 'all');
  const isEarned = (badgeId) =>
    awards.some(a => a.member_id === member.id && a.badge_id === badgeId) ||
    badgeProgress.some(p => p.member_id === member.id && p.badge_id === badgeId && p.status === 'completed');

  const earnedBadges = sectionBadges.filter(b => isEarned(b.id));
  const inProgress = sectionBadges.filter(b => {
    if (isEarned(b.id)) return false;
    return badgeProgress.some(p => p.member_id === member.id && p.badge_id === b.id && p.status === 'in_progress');
  });

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-gradient-to-br from-yellow-600 to-[#7413dc] px-5 pb-6 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <button onClick={onBack} className="text-white/70 text-sm mb-3 flex items-center gap-1">← Back</button>
        <h1 className="text-xl font-bold">{member.full_name}</h1>
        <p className="text-white/70 text-sm mt-0.5">{earnedBadges.length} badges earned · {inProgress.length} in progress</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {inProgress.length > 0 && (
          <div>
            <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-3">In Progress</p>
            <div className="grid grid-cols-4 gap-2">
              {inProgress.map(b => (
                <div key={b.id} className="flex flex-col items-center gap-1 p-2 bg-orange-50 border border-orange-100 rounded-2xl">
                  {b.image_url ? <img src={b.image_url} alt={b.name} className="w-10 h-10 object-contain rounded-lg" /> : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">🏅</div>}
                  <p className="text-[10px] text-center font-medium text-gray-700 leading-tight line-clamp-2">{b.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {earnedBadges.length > 0 && (
          <div>
            <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-3">Earned ({earnedBadges.length})</p>
            <div className="grid grid-cols-4 gap-2">
              {earnedBadges.map(b => (
                <div key={b.id} className="flex flex-col items-center gap-1 p-2 bg-green-50 border border-green-100 rounded-2xl">
                  {b.image_url ? <img src={b.image_url} alt={b.name} className="w-10 h-10 object-contain rounded-lg" /> : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">🏅</div>}
                  <p className="text-[10px] text-center font-medium text-gray-700 leading-tight line-clamp-2">{b.name}</p>
                  <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {earnedBadges.length === 0 && inProgress.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Award className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No badge progress yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeaderBadges({ sections }) {
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState('all');
  const sectionIds = sections.map(s => s.id);

  const { data: members = [] } = useQuery({
    queryKey: ['leader-mobile-members', sectionIds],
    queryFn: async () => {
      const all = await base44.entities.Member.filter({ active: true });
      return all.filter(m => sectionIds.includes(m.section_id)).sort((a, b) => a.full_name?.localeCompare(b.full_name));
    },
    enabled: sectionIds.length > 0,
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['mobile-badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: badgeProgress = [] } = useQuery({
    queryKey: ['leader-badge-progress'],
    queryFn: () => base44.entities.MemberBadgeProgress.filter({}),
  });

  const { data: awards = [] } = useQuery({
    queryKey: ['leader-badge-awards'],
    queryFn: () => base44.entities.MemberBadgeAward.filter({}),
  });

  // Enrich members with section name for badge filtering
  const enrichedMembers = members.map(m => ({
    ...m,
    _sectionName: sections.find(s => s.id === m.section_id)?.name,
  }));

  if (selectedMember) {
    return <MemberBadgeView member={selectedMember} badges={badges} badgeProgress={badgeProgress} awards={awards} onBack={() => setSelectedMember(null)} />;
  }

  const filtered = enrichedMembers.filter(m => {
    const matchSearch = !search || m.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchSection = selectedSectionId === 'all' || m.section_id === selectedSectionId;
    return matchSearch && matchSection;
  });

  const getEarnedCount = (memberId) => awards.filter(a => a.member_id === memberId).length + badgeProgress.filter(p => p.member_id === memberId && p.status === 'completed').length;

  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-yellow-600 to-[#7413dc] px-5 pb-6 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <h1 className="text-2xl font-bold">Badges</h1>
        <p className="text-white/70 text-sm mt-1">View member badge progress</p>
      </div>

      <div className="px-4 pt-4 pb-2 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#7413dc]" />
        </div>
        {sections.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setSelectedSectionId('all')} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${selectedSectionId === 'all' ? 'bg-[#7413dc] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>All</button>
            {sections.map(s => (
              <button key={s.id} onClick={() => setSelectedSectionId(s.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${selectedSectionId === s.id ? 'bg-[#7413dc] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>{s.display_name}</button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pb-5 space-y-2">
        {filtered.map(m => {
          const earned = getEarnedCount(m.id);
          return (
            <button key={m.id} onClick={() => setSelectedMember(m)} className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 text-left active:bg-gray-50">
              <div className="w-10 h-10 bg-[#7413dc]/10 rounded-full flex items-center justify-center text-[#7413dc] font-bold text-sm flex-shrink-0">
                {m.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">{m.full_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{earned} badge{earned !== 1 ? 's' : ''} earned</p>
              </div>
              <Award className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}