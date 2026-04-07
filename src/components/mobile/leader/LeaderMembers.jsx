import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, User, ChevronDown, ChevronUp, Heart, Phone, Mail, Grid3x3, List } from 'lucide-react';

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
        <div className="px-4 pb-4 pt-0 border-t border-gray-50 space-y-4">
          {/* Parent 1 */}
          {member.parent_one_name && (
            <div className="pt-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Parent / Guardian 1
              </p>
              <p className="text-sm font-semibold text-gray-800">{member.parent_one_name}</p>
              <div className="mt-1.5 space-y-1">
                {member.parent_one_phone && (
                  <a href={`tel:${member.parent_one_phone}`} className="flex items-center gap-2 text-xs text-[#004851] font-medium">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" /> {member.parent_one_phone}
                  </a>
                )}
                {member.parent_one_email && (
                  <a href={`mailto:${member.parent_one_email}`} className="flex items-center gap-2 text-xs text-[#004851] font-medium truncate">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" /> {member.parent_one_email}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Parent 2 */}
          {member.parent_two_name && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Parent / Guardian 2
              </p>
              <p className="text-sm font-semibold text-gray-800">{member.parent_two_name}</p>
              <div className="mt-1.5 space-y-1">
                {member.parent_two_phone && (
                  <a href={`tel:${member.parent_two_phone}`} className="flex items-center gap-2 text-xs text-[#004851] font-medium">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" /> {member.parent_two_phone}
                  </a>
                )}
                {member.parent_two_email && (
                  <a href={`mailto:${member.parent_two_email}`} className="flex items-center gap-2 text-xs text-[#004851] font-medium truncate">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" /> {member.parent_two_email}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Medical */}
          {(member.medical_info || member.allergies || member.dietary_requirements || member.medications) && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Heart className="w-3.5 h-3.5 text-red-500" />
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Medical Information</p>
              </div>
              {member.medical_info && (
                <div className="mb-1.5">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Conditions</p>
                  <p className="text-xs text-red-800 mt-0.5">{member.medical_info}</p>
                </div>
              )}
              {member.allergies && (
                <div className="mb-1.5">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Allergies</p>
                  <p className="text-xs text-red-800 mt-0.5">{member.allergies}</p>
                </div>
              )}
              {member.dietary_requirements && (
                <div className="mb-1.5">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Dietary</p>
                  <p className="text-xs text-red-800 mt-0.5">{member.dietary_requirements}</p>
                </div>
              )}
              {member.medications && (
                <div>
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Medications</p>
                  <p className="text-xs text-red-800 mt-0.5">{member.medications}</p>
                </div>
              )}
            </div>
          )}

          {/* Emergency contact */}
          {member.emergency_contact_name && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Emergency Contact</p>
              <p className="text-sm text-gray-700">
                {member.emergency_contact_name}
                {member.emergency_contact_relationship ? ` (${member.emergency_contact_relationship})` : ''}
              </p>
              {member.emergency_contact_phone && (
                <a href={`tel:${member.emergency_contact_phone}`} className="flex items-center gap-2 text-xs text-[#004851] font-medium mt-1">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" /> {member.emergency_contact_phone}
                </a>
              )}
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
  const [viewMode, setViewMode] = useState('tile'); // 'tile' or 'patrol'
  const sectionIds = sections.map(s => s.id);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['leader-mobile-members', sectionIds],
    queryFn: async () => {
      const all = await base44.entities.Member.filter({ active: true });
      // Sort oldest first (ascending date_of_birth = oldest first)
      return all
        .filter(m => sectionIds.includes(m.section_id))
        .sort((a, b) => new Date(a.date_of_birth) - new Date(b.date_of_birth));
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

        <div className="flex items-center justify-between gap-2">
          {sections.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
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

          {/* View mode toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-full p-1 flex-shrink-0">
            <button
              onClick={() => setViewMode('tile')}
              className={`p-2 rounded-full transition-colors ${viewMode === 'tile' ? 'bg-[#004851] text-white' : 'text-gray-500'}`}
              title="Tile view"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('patrol')}
              className={`p-2 rounded-full transition-colors ${viewMode === 'patrol' ? 'bg-[#004851] text-white' : 'text-gray-500'}`}
              title="Patrol view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-5">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-[#004851] rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No members found</p>
          </div>
        ) : viewMode === 'tile' ? (
          <div className="space-y-2">
            {filtered.map(m => <MemberCard key={m.id} member={m} />)}
          </div>
        ) : (
          <PatrolView members={filtered} />
        )}
      </div>
    </div>
  );
}

// ─── Patrol View Component ─────────────────────────────────────────────────────
function PatrolView({ members }) {
  // Group members by patrol
  const patrols = {};
  members.forEach(m => {
    const patrol = m.patrol || 'No Patrol';
    if (!patrols[patrol]) patrols[patrol] = [];
    patrols[patrol].push(m);
  });

  const patrolNames = Object.keys(patrols).sort();

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {patrolNames.map(patrolName => (
        <div key={patrolName} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-blue-500 to-[#004851] px-4 py-3 text-white">
            <p className="font-bold text-sm">{patrolName}</p>
            <p className="text-xs text-white/70 mt-0.5">{patrols[patrolName].length} members</p>
          </div>
          <div className="divide-y divide-gray-50">
            {patrols[patrolName].map(member => {
              const dob = new Date(member.date_of_birth);
              const today = new Date();
              const age = today.getFullYear() - dob.getFullYear() - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
              return (
                <div key={member.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-700 flex-shrink-0">
                      {member.full_name?.charAt(0)}
                    </div>
                    <p className="text-xs font-semibold text-gray-900 truncate">{member.full_name}</p>
                  </div>
                  <p className="text-[10px] text-gray-400">Age {age}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}