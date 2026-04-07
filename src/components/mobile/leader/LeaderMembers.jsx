import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, User, ChevronDown, ChevronUp, Heart, Phone } from 'lucide-react';

function MemberCard({ member }) {
  const [open, setOpen] = useState(false);
  const dob = new Date(member.date_of_birth);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear() - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 text-left">
        <div className="w-10 h-10 bg-[#004851] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
          {member.full_name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{member.full_name}</p>
          <p className="text-xs text-gray-400 mt-0.5">Age {age}{member.patrol ? ` · ${member.patrol}` : ''}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-50 space-y-3">
          {/* Parent contact */}
          <div className="pt-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Parents</p>
            {member.parent_one_name && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-700">{member.parent_one_name}</span>
                {member.parent_one_phone && (
                  <a href={`tel:${member.parent_one_phone}`} className="text-xs text-[#004851] font-semibold flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {member.parent_one_phone}
                  </a>
                )}
              </div>
            )}
            {member.parent_two_name && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-700">{member.parent_two_name}</span>
                {member.parent_two_phone && (
                  <a href={`tel:${member.parent_two_phone}`} className="text-xs text-[#004851] font-semibold flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {member.parent_two_phone}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Medical */}
          {(member.medical_info || member.allergies) && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Heart className="w-3.5 h-3.5 text-red-500" />
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Medical</p>
              </div>
              {member.medical_info && <p className="text-xs text-red-700">{member.medical_info}</p>}
              {member.allergies && <p className="text-xs text-red-700 mt-0.5">Allergies: {member.allergies}</p>}
            </div>
          )}

          {/* Emergency contact */}
          {member.emergency_contact_name && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Emergency Contact</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{member.emergency_contact_name} ({member.emergency_contact_relationship})</span>
                {member.emergency_contact_phone && (
                  <a href={`tel:${member.emergency_contact_phone}`} className="text-xs text-[#004851] font-semibold flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {member.emergency_contact_phone}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LeaderMembers({ sections }) {
  const [search, setSearch] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('all');
  const sectionIds = sections.map(s => s.id);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['leader-mobile-members', sectionIds],
    queryFn: async () => {
      const all = await base44.entities.Member.filter({ active: true });
      return all
        .filter(m => sectionIds.includes(m.section_id))
        .sort((a, b) => a.full_name?.localeCompare(b.full_name));
    },
    enabled: sectionIds.length > 0,
  });

  const filtered = members.filter(m => {
    const matchSearch = !search || m.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchSection = selectedSectionId === 'all' || m.section_id === selectedSectionId;
    return matchSearch && matchSection;
  });

  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-blue-600 to-[#004851] px-5 pb-6 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-white/70 text-sm mt-1">{members.length} active members</p>
      </div>

      <div className="px-4 pt-4 pb-2 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#004851]"
          />
        </div>

        {/* Section filter */}
        {sections.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedSectionId('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${selectedSectionId === 'all' ? 'bg-[#004851] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
            >
              All
            </button>
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSectionId(s.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${selectedSectionId === s.id ? 'bg-[#004851] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
              >
                {s.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pb-5 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-[#004851] rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No members found</p>
          </div>
        ) : (
          filtered.map(m => <MemberCard key={m.id} member={m} />)
        )}
      </div>
    </div>
  );
}