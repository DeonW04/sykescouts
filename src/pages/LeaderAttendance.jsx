import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Check, X, Minus, Radio, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import { format, parseISO, subWeeks, addWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'sonner';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';

// ── UK time helpers ──────────────────────────────────────────────────────────
// Returns the current date/time in Europe/London (handles BST/GMT automatically)
function nowUK() {
  // Get ISO string in UK timezone
  const ukStr = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });
  // en-GB gives "dd/mm/yyyy, hh:mm:ss"
  const [datePart, timePart] = ukStr.split(', ');
  const [d, m, y] = datePart.split('/');
  const [h, min, s] = timePart.split(':');
  return new Date(+y, +m - 1, +d, +h, +min, +s);
}

function todayUKString() {
  const n = nowUK();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

// Parse "HH:MM" on a given UK date string "YYYY-MM-DD" into a local Date
function parseTimeOnDate(dateStr, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m, 0);
}

// Check if a meeting (programme) is currently ongoing in UK time
function isMeetingOngoing(programme, section, now) {
  if (programme.date !== todayUKString()) return false;
  const start = section?.meeting_start_time
    ? parseTimeOnDate(programme.date, programme.optional_start_time || section.meeting_start_time)
    : null;
  const end = section?.meeting_end_time
    ? parseTimeOnDate(programme.date, programme.optional_end_time || section.meeting_end_time)
    : null;
  if (!start || !end) return false;
  return now >= start && now <= end;
}

// Check if an event is currently ongoing
function isEventOngoing(event, now) {
  if (!event.start_date || !event.end_date) return false;
  return now >= new Date(event.start_date) && now <= new Date(event.end_date);
}

export default function LeaderAttendance() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  // We track the selected session as { type: 'meeting'|'event', id, sectionId (for events), date }
  const [selectedSession, setSelectedSession] = useState(null);

  // For the "browse" mode (when nothing is ongoing), which date are we viewing?
  const [browseDate, setBrowseDate] = useState(todayUKString());

  useEffect(() => { loadUser(); }, []);
  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: sections = [] } = useQuery({
    queryKey: ['sections', user?.id],
    queryFn: async () => {
      if (!user) return [];
      if (user.role === 'admin') return base44.entities.Section.filter({ active: true });
      const leaders = await base44.entities.Leader.filter({ user_id: user.id });
      if (leaders.length === 0) return [];
      const allSections = await base44.entities.Section.filter({ active: true });
      return allSections.filter(s => leaders[0].section_ids?.includes(s.id));
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const { data: allProgrammes = [] } = useQuery({
    queryKey: ['attendance-programmes', sections.map(s => s.id).join(',')],
    queryFn: async () => {
      const sectionIds = sections.map(s => s.id);
      const all = await base44.entities.Programme.filter({});
      const from = subWeeks(new Date(), 4);
      const to = addWeeks(new Date(), 2);
      return all.filter(p => sectionIds.includes(p.section_id) && new Date(p.date) >= from && new Date(p.date) <= to);
    },
    enabled: sections.length > 0,
    refetchInterval: 60000,
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['attendance-events', sections.map(s => s.id).join(',')],
    queryFn: async () => {
      const sectionIds = sections.map(s => s.id);
      const all = await base44.entities.Event.filter({});
      const from = subWeeks(new Date(), 4);
      const to = addWeeks(new Date(), 2);
      return all.filter(e =>
        e.section_ids?.some(sid => sectionIds.includes(sid)) &&
        new Date(e.start_date) <= to &&
        new Date(e.end_date || e.start_date) >= from
      );
    },
    enabled: sections.length > 0,
    refetchInterval: 60000,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members-attendance'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  // Attendance for browse date
  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance-records', browseDate],
    queryFn: () => base44.entities.Attendance.filter({ date: browseDate }),
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ memberId, sectionId, status, date }) => {
      const existing = attendance.find(a => a.member_id === memberId && a.section_id === sectionId && a.date === date);
      if (existing) {
        return base44.entities.Attendance.update(existing.id, { status });
      }
      return base44.entities.Attendance.create({ member_id: memberId, section_id: sectionId, date, status, recorded_by: user.email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
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

  const now = nowUK();
  const sectionIds = sections.map(s => s.id);

  // ── Detect ongoing sessions ──────────────────────────────────────────────
  const ongoingMeetings = allProgrammes.filter(p => {
    const section = sections.find(s => s.id === p.section_id);
    return isMeetingOngoing(p, section, now);
  });

  const ongoingEvents = allEvents.filter(e => isEventOngoing(e, now));

  const hasOngoing = ongoingMeetings.length > 0 || ongoingEvents.length > 0;

  // ── Browse mode: sessions on browseDate ─────────────────────────────────
  const meetingsOnDate = allProgrammes.filter(p => p.date === browseDate && sectionIds.includes(p.section_id));
  const eventsOnDate = allEvents.filter(e => {
    const start = new Date(e.start_date);
    const end = e.end_date ? new Date(e.end_date) : start;
    const bd = new Date(browseDate);
    return e.section_ids?.some(sid => sectionIds.includes(sid)) &&
      bd >= new Date(start.toDateString()) && bd <= new Date(end.toDateString());
  });
  const sessionsOnDate = [...meetingsOnDate, ...eventsOnDate];

  // ── Attendance register for a specific session ───────────────────────────
  const AttendanceButtons = ({ memberId, sectionId, date }) => {
    const att = attendance.find(a => a.member_id === memberId && a.section_id === sectionId && a.date === date);
    const currentStatus = att?.status;
    return (
      <div className="flex gap-2">
        {[
          { status: 'present', icon: Check, active: 'bg-green-500 text-white shadow-md scale-110', hover: 'hover:bg-green-100 hover:text-green-600' },
          { status: 'apologies', icon: Minus, active: 'bg-yellow-400 text-white shadow-md scale-110', hover: 'hover:bg-yellow-100 hover:text-yellow-600' },
          { status: 'absent', icon: X, active: 'bg-red-500 text-white shadow-md scale-110', hover: 'hover:bg-red-100 hover:text-red-600' },
        ].map(({ status, icon: Icon, active, hover }) => (
          <button
            key={status}
            onClick={() => updateAttendanceMutation.mutate({ memberId, sectionId, status, date })}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentStatus === status ? active : `bg-gray-100 text-gray-400 ${hover}`}`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    );
  };

  const SessionCard = ({ title, subtitle, date, sectionId, sectionObj, isEvent = false, eventId }) => {
    const sectionMembers = members
      .filter(m => m.section_id === sectionId)
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    const presentCount = sectionMembers.filter(m =>
      attendance.find(a => a.member_id === m.id && a.section_id === sectionId && a.date === date)?.status === 'present'
    ).length;

    return (
      <Card className="rounded-2xl border-gray-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{title}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
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
              const att = attendance.find(a => a.member_id === member.id && a.section_id === sectionId && a.date === date);
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
                  <AttendanceButtons memberId={member.id} sectionId={sectionId} date={date} />
                </div>
              );
            })}
            {sectionMembers.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No members in this section</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Prev/next day for browse navigation
  const shiftDay = (delta) => {
    const d = new Date(browseDate);
    d.setDate(d.getDate() + delta);
    setBrowseDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />

      {/* Header */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 24px' }}>
        <div className="max-w-7xl mx-auto">
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Leader Portal</p>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 32px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.2 }}>Attendance Register</h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>
            {hasOngoing ? 'Session in progress — marking attendance now' : 'No active session — browse by date'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 space-y-4">

        {hasOngoing ? (
          /* ── ONGOING SESSION MODE ── */
          <>
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-2xl">
              <Radio className="w-4 h-4 text-green-600 animate-pulse" />
              <p className="text-sm font-semibold text-green-800">
                Live session · {format(now, 'HH:mm, EEEE d MMMM')}
              </p>
            </div>

            {ongoingMeetings.map(programme => {
              const section = sections.find(s => s.id === programme.section_id);
              return (
                <SessionCard
                  key={programme.id}
                  title={programme.title}
                  subtitle={section?.display_name || ''}
                  date={programme.date}
                  sectionId={programme.section_id}
                  sectionObj={section}
                />
              );
            })}

            {ongoingEvents.map(event => {
              const eventSections = sections.filter(s => event.section_ids?.includes(s.id));
              const date = todayUKString();
              return eventSections.map(section => (
                <SessionCard
                  key={`${event.id}-${section.id}`}
                  title={event.title}
                  subtitle={`${section.display_name} · ${event.type}`}
                  date={date}
                  sectionId={section.id}
                  sectionObj={section}
                  isEvent
                />
              ));
            })}
          </>
        ) : (
          /* ── BROWSE MODE ── */
          <>
            {/* Date navigator */}
            <Card className="rounded-2xl border-gray-100 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => shiftDay(-1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 text-center">
                    <input
                      type="date"
                      value={browseDate}
                      onChange={e => setBrowseDate(e.target.value)}
                      className="sr-only"
                      id="browse-date"
                    />
                    <label htmlFor="browse-date" className="cursor-pointer">
                      <p className="font-semibold text-gray-900">{format(parseISO(browseDate), 'EEEE, d MMMM yyyy')}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Click to pick a date</p>
                    </label>
                    {/* Visible date input below for accessibility */}
                    <input
                      type="date"
                      value={browseDate}
                      onChange={e => setBrowseDate(e.target.value)}
                      className="mt-1 block mx-auto text-sm border border-gray-200 rounded-lg px-2 py-1"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={() => shiftDay(1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                {browseDate !== todayUKString() && (
                  <div className="mt-3 text-center">
                    <Button size="sm" variant="ghost" onClick={() => setBrowseDate(todayUKString())} className="text-[#7413dc]">
                      <Clock className="w-3.5 h-3.5 mr-1.5" />Jump to today
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {sessionsOnDate.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No meetings or events on this date</p>
                  <p className="text-sm text-gray-400 mt-1">Use the arrows to navigate to a different day</p>
                </CardContent>
              </Card>
            ) : (
              meetingsOnDate.map(programme => {
                const section = sections.find(s => s.id === programme.section_id);
                return (
                  <SessionCard
                    key={programme.id}
                    title={programme.title}
                    subtitle={section?.display_name || ''}
                    date={programme.date}
                    sectionId={programme.section_id}
                    sectionObj={section}
                  />
                );
              })
            )}

            {eventsOnDate.map(event => {
              const eventSections = sections.filter(s => event.section_ids?.includes(s.id));
              return eventSections.map(section => (
                <SessionCard
                  key={`${event.id}-${section.id}`}
                  title={event.title}
                  subtitle={`${section.display_name} · ${event.type}`}
                  date={browseDate}
                  sectionId={section.id}
                  sectionObj={section}
                  isEvent
                />
              ));
            })}
          </>
        )}
      </div>
    </div>
  );
}