import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Calendar, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { toast } from 'sonner';

function AttendanceRegister({ programme, members, section, onBack }) {
  const queryClient = useQueryClient();
  const date = programme.date;

  const { data: attendance = [] } = useQuery({
    queryKey: ['leader-mobile-attendance', section?.id, date],
    queryFn: () => base44.entities.Attendance.filter({ section_id: section?.id, date }),
    enabled: !!section?.id && !!date,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ memberId, status }) => {
      const existing = attendance.find(a => a.member_id === memberId);
      if (existing) {
        return base44.entities.Attendance.update(existing.id, { status });
      } else {
        return base44.entities.Attendance.create({ member_id: memberId, section_id: section?.id, date, status });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leader-mobile-attendance'] });
    },
  });

  const getStatus = (memberId) => attendance.find(a => a.member_id === memberId)?.status || null;

  const statusConfig = {
    present: { label: 'Present', color: 'bg-green-600', text: 'text-white' },
    absent: { label: 'Absent', color: 'bg-red-500', text: 'text-white' },
    apologies: { label: 'Apologies', color: 'bg-yellow-500', text: 'text-white' },
  };

  const presentCount = members.filter(m => getStatus(m.id) === 'present').length;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-gradient-to-br from-orange-600 to-red-600 px-5 pb-6 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <button onClick={onBack} className="text-white/70 text-sm mb-3 flex items-center gap-1">← Back</button>
        <h1 className="text-xl font-bold">{programme.title}</h1>
        <p className="text-white/70 text-sm mt-0.5">{format(new Date(programme.date), 'EEEE, d MMMM yyyy')}</p>
        <p className="text-white/80 text-sm mt-2 font-semibold">{presentCount} / {members.length} present</p>
      </div>

      <div className="px-4 py-4 space-y-2">
        {members.map(member => {
          const status = getStatus(member.id);
          return (
            <div key={member.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${status === 'present' ? 'bg-green-500' : status === 'absent' ? 'bg-red-400' : status === 'apologies' ? 'bg-yellow-500' : 'bg-gray-300'}`}>
                  {member.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{member.full_name}</p>
                  {member.patrol && <p className="text-xs text-gray-400">{member.patrol}</p>}
                </div>
                {status && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusConfig[status]?.color} ${statusConfig[status]?.text}`}>
                    {statusConfig[status]?.label}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => saveMutation.mutate({ memberId: member.id, status: key })}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${status === key ? `${cfg.color} ${cfg.text} border-transparent` : 'bg-white border-gray-200 text-gray-600'}`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LeaderAttendance({ sections }) {
  const [selectedProgramme, setSelectedProgramme] = useState(null);
  const sectionIds = sections.map(s => s.id);
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const { data: programmes = [], isLoading } = useQuery({
    queryKey: ['leader-attendance-programmes', sectionIds],
    queryFn: async () => {
      const all = await base44.entities.Programme.filter({});
      // Show last 4 weeks + next 2 weeks
      const from = subWeeks(weekStart, 4);
      const to = addWeeks(weekEnd, 2);
      return all
        .filter(p => sectionIds.includes(p.section_id) && new Date(p.date) >= from && new Date(p.date) <= to)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    enabled: sectionIds.length > 0,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['leader-mobile-members', sectionIds],
    queryFn: async () => {
      const all = await base44.entities.Member.filter({ active: true });
      return all.filter(m => sectionIds.includes(m.section_id)).sort((a, b) => a.full_name?.localeCompare(b.full_name));
    },
    enabled: sectionIds.length > 0,
  });

  if (selectedProgramme) {
    const section = sections.find(s => s.id === selectedProgramme.section_id);
    const sectionMembers = members.filter(m => m.section_id === selectedProgramme.section_id);
    return <AttendanceRegister programme={selectedProgramme} members={sectionMembers} section={section} onBack={() => setSelectedProgramme(null)} />;
  }

  const thisWeek = programmes.filter(p => {
    const d = new Date(p.date);
    return d >= weekStart && d <= weekEnd;
  });
  const others = programmes.filter(p => {
    const d = new Date(p.date);
    return !(d >= weekStart && d <= weekEnd);
  });

  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-orange-600 to-red-600 px-5 pb-6 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-white/70 text-sm mt-1">Select a meeting to mark register</p>
      </div>

      <div className="px-4 py-5">
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" /></div>
        ) : programmes.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No recent meetings found</p></div>
        ) : (
          <div className="space-y-5">
            {thisWeek.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-3">This Week</h2>
                <div className="space-y-2">
                  {thisWeek.map(p => {
                    const section = sections.find(s => s.id === p.section_id);
                    return (
                      <button key={p.id} onClick={() => setSelectedProgramme(p)} className="w-full bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3 text-left active:bg-orange-100">
                        <div className="bg-orange-200 rounded-xl p-3 flex-shrink-0">
                          <Calendar className="w-5 h-5 text-orange-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900">{p.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{section?.display_name} · {format(new Date(p.date), 'd MMM')}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {others.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Other Meetings</h2>
                <div className="space-y-2">
                  {others.map(p => {
                    const section = sections.find(s => s.id === p.section_id);
                    const isPastMtg = new Date(p.date) < now;
                    return (
                      <button key={p.id} onClick={() => setSelectedProgramme(p)} className={`w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 text-left active:bg-gray-50 ${isPastMtg ? 'opacity-70' : ''}`}>
                        <div className="bg-gray-100 rounded-xl p-3 flex-shrink-0">
                          <Calendar className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900">{p.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{section?.display_name} · {format(new Date(p.date), 'd MMM yyyy')}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}