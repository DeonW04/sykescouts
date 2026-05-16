import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Users, Check, X, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';

export default function LeaderAttendance() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: sections = [] } = useQuery({
    queryKey: ['sections', user],
    queryFn: async () => {
      if (!user) return [];
      if (user.role === 'admin') {
        return base44.entities.Section.filter({ active: true });
      } else {
        const leaders = await base44.entities.Leader.filter({ user_id: user.id });
        if (leaders.length === 0) return [];
        const leader = leaders[0];
        const allSections = await base44.entities.Section.filter({ active: true });
        return allSections.filter(s => leader.section_ids?.includes(s.id));
      }
    },
    enabled: !!user,
  });

  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes', selectedDate, sections],
    queryFn: async () => {
      if (sections.length === 0) return [];
      const sectionIds = sections.map(s => s.id);
      const allProgrammes = await base44.entities.Programme.filter({});
      return allProgrammes.filter(p => 
        sectionIds.includes(p.section_id) && p.date === selectedDate
      );
    },
    enabled: sections.length > 0,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', selectedDate, sections],
    queryFn: async () => {
      if (sections.length === 0) return [];
      const sectionIds = sections.map(s => s.id);
      const allEvents = await base44.entities.Event.filter({});
      const selectedDateTime = new Date(selectedDate);
      return allEvents.filter(e => {
        const startDate = new Date(e.start_date);
        const endDate = e.end_date ? new Date(e.end_date) : startDate;
        return e.section_ids?.some(sid => sectionIds.includes(sid)) &&
               selectedDateTime >= new Date(startDate.toDateString()) &&
               selectedDateTime <= new Date(endDate.toDateString());
      });
    },
    enabled: sections.length > 0,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', selectedDate],
    queryFn: () => base44.entities.Attendance.filter({ date: selectedDate }),
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ memberId, sectionId, status }) => {
      const existing = attendance.find(a => a.member_id === memberId && a.section_id === sectionId && a.date === selectedDate);
      
      if (existing) {
        return base44.entities.Attendance.update(existing.id, { status });
      } else {
        return base44.entities.Attendance.create({
          member_id: memberId,
          section_id: sectionId,
          date: selectedDate,
          status,
          recorded_by: user.email,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance updated');
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasMeetingsOrEvents = programmes.length > 0 || events.length > 0;

  const getMemberAttendance = (memberId, sectionId) => {
    return attendance.find(a => a.member_id === memberId && a.section_id === sectionId);
  };

  const AttendanceButtons = ({ memberId, sectionId, currentStatus }) => (
    <div className="flex gap-2">
      <button
        onClick={() => updateAttendanceMutation.mutate({ memberId, sectionId, status: 'present' })}
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${currentStatus === 'present' ? 'bg-green-500 text-white shadow-md scale-110' : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'}`}
      >
        <Check className="w-4 h-4" />
      </button>
      <button
        onClick={() => updateAttendanceMutation.mutate({ memberId, sectionId, status: 'apologies' })}
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${currentStatus === 'apologies' ? 'bg-yellow-400 text-white shadow-md scale-110' : 'bg-gray-100 text-gray-400 hover:bg-yellow-100 hover:text-yellow-600'}`}
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        onClick={() => updateAttendanceMutation.mutate({ memberId, sectionId, status: 'absent' })}
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${currentStatus === 'absent' ? 'bg-red-500 text-white shadow-md scale-110' : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 24px' }}>
        <div className="max-w-7xl mx-auto">
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Leader Portal</p>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 32px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.2 }}>Attendance Register</h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>Quick attendance tracking</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
        <Card className="mb-4 rounded-2xl border-gray-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full sm:max-w-xs text-base"
                />
              </div>
              <div className="text-sm text-gray-500 sm:mt-5">
                {format(new Date(selectedDate), 'EEEE, d MMMM yyyy')}
              </div>
            </div>
          </CardContent>
        </Card>

        {!hasMeetingsOrEvents ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No meetings or events scheduled for this date</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {programmes.map(programme => {
              const section = sections.find(s => s.id === programme.section_id);
              if (!section) return null;
              
              const sectionMembers = members
                .filter(m => m.section_id === section.id)
                .sort((a, b) => new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime());
              const presentCount = sectionMembers.filter(m => getMemberAttendance(m.id, section.id)?.status === 'present').length;
              
              return (
               <Card key={programme.id} className="rounded-2xl border-gray-100 shadow-sm">
                 <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{programme.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{section.display_name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#7413dc]">{presentCount}/{sectionMembers.length}</div>
                        <div className="text-xs text-gray-500">Present</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {sectionMembers.map(member => {
                        const att = getMemberAttendance(member.id, section.id);
                        return (
                          <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div>
                              <p className="font-medium text-sm text-gray-900">{member.full_name}</p>
                              {att?.status && (
                                <p className={`text-xs mt-0.5 ${att.status === 'present' ? 'text-green-600' : att.status === 'absent' ? 'text-red-500' : 'text-yellow-600'}`}>
                                  {att.status}
                                </p>
                              )}
                            </div>
                            <AttendanceButtons 
                              memberId={member.id} 
                              sectionId={section.id}
                              currentStatus={att?.status}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {events.map(event => {
              const eventSections = sections.filter(s => event.section_ids?.includes(s.id));
              
              return eventSections.map(section => {
                const sectionMembers = members
                  .filter(m => m.section_id === section.id)
                  .sort((a, b) => new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime());
                const presentCount = sectionMembers.filter(m => getMemberAttendance(m.id, section.id)?.status === 'present').length;
                
                return (
                 <Card key={`${event.id}-${section.id}`} className="rounded-2xl border-gray-100 shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl">{event.title}</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">{section.display_name} • {event.type}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-[#7413dc]">{presentCount}/{sectionMembers.length}</div>
                          <div className="text-xs text-gray-500">Present</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {sectionMembers.map(member => {
                          const att = getMemberAttendance(member.id, section.id);
                          return (
                            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                               <div>
                                 <p className="font-medium text-sm text-gray-900">{member.full_name}</p>
                                 {att?.status && (
                                   <p className={`text-xs mt-0.5 ${att.status === 'present' ? 'text-green-600' : att.status === 'absent' ? 'text-red-500' : 'text-yellow-600'}`}>
                                     {att.status}
                                   </p>
                                 )}
                               </div>
                               <AttendanceButtons 
                                 memberId={member.id} 
                                 sectionId={section.id}
                                 currentStatus={att?.status}
                               />
                              </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })}
          </div>
        )}
      </div>
    </div>
  );
}