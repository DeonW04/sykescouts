import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Users, Check, X, Minus, Radio, Tent, ChevronDown, ChevronUp } from 'lucide-react';
import { format, subWeeks, addWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'sonner';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';

// ── UK time helpers ──────────────────────────────────────────────────────────
function nowUK() {
  const ukStr = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });
  const [datePart, timePart] = ukStr.split(', ');
  const [d, m, y] = datePart.split('/');
  const [h, min, s] = timePart.split(':');
  return new Date(+y, +m - 1, +d, +h, +min, +s);
}
function todayUKString() {
  const n = nowUK();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}
function parseTimeOnDate(dateStr, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m, 0);
}
function isMeetingOngoing(programme, section, now) {
  if (programme.date !== todayUKString()) return false;
  const startT = programme.optional_start_time || section?.meeting_start_time;
  const endT = programme.optional_end_time || section?.meeting_end_time;
  if (!startT || !endT) return false;
  return now >= parseTimeOnDate(programme.date, startT) && now <= parseTimeOnDate(programme.date, endT);
}
function isEventOngoing(event, now) {
  if (!event.start_date || !event.end_date) return false;
  return now >= new Date(event.start_date) && now <= new Date(event.end_date);
}

// ── Attendance Register ───────────────────────────────────────────────────────
function AttendanceRegister({ session, sections, members, onBack }) {
  const queryClient = useQueryClient();
  const { title, subtitle, date, sectionId, isEvent, isOngoing, programmeId, eventId } = session;
  const [showNotAttending, setShowNotAttending] = useState(false);

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance-records-detail', sectionId, date],
    queryFn: () => base44.entities.Attendance.filter({ section_id: sectionId, date }),
    enabled: !!sectionId && !!date,
  });

  // Find attendance action for this session
  const { data: allActions = [] } = useQuery({
    queryKey: ['attendance-actions', programmeId, eventId],
    queryFn: async () => {
      const all = await base44.entities.ActionRequired.filter({ action_purpose: 'attendance' });
      return all.filter(a =>
        (programmeId && a.programme_id === programmeId) ||
        (eventId && a.event_id === eventId)
      );
    },
    enabled: !!(programmeId || eventId),
  });

  const attendanceAction = allActions[0] || null;

  const { data: assignments = [] } = useQuery({
    queryKey: ['action-assignments', attendanceAction?.id],
    queryFn: () => base44.entities.ActionAssignment.filter({ action_required_id: attendanceAction.id }),
    enabled: !!attendanceAction?.id,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ['action-responses', attendanceAction?.id],
    queryFn: () => base44.entities.ActionResponse.filter({ action_required_id: attendanceAction.id }),
    enabled: !!attendanceAction?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ memberId, status }) => {
      const existing = attendance.find(a => a.member_id === memberId && a.section_id === sectionId && a.date === date);
      if (existing) return base44.entities.Attendance.update(existing.id, { status });
      return base44.entities.Attendance.create({ member_id: memberId, section_id: sectionId, date, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records-detail'] });
      toast.success('Attendance updated');
    },
  });

  const sectionMembers = members
    .filter(m => m.section_id === sectionId)
    .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

  const getAtt = (memberId) => attendance.find(a => a.member_id === memberId);

  // Determine member groups based on action responses
  const hasAction = !!attendanceAction && assignments.length > 0;

  const getMemberActionStatus = (memberId) => {
    if (!hasAction) return null; // no action system
    const assignment = assignments.find(a => a.member_id === memberId);
    if (!assignment) return null; // not assigned — show normally
    const response = responses.find(r => r.member_id === memberId);
    if (!response?.response_value) return 'not_responded';
    return response.response_value.toLowerCase() === 'yes' ? 'attending' : 'not_attending';
  };

  // Split members into: main list (attending/not_responded/not in action) and hidden (not_attending)
  const mainMembers = sectionMembers.filter(m => {
    const as = getMemberActionStatus(m.id);
    return as !== 'not_attending';
  });
  const notAttendingMembers = sectionMembers.filter(m => getMemberActionStatus(m.id) === 'not_attending');

  const presentCount = sectionMembers.filter(m => getAtt(m.id)?.status === 'present').length;

  const headerBg = isEvent
    ? 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)'
    : 'linear-gradient(135deg, #7413dc 0%, #004851 100%)';

  const MemberRow = ({ member, isNotAttending = false }) => {
    const att = getAtt(member.id);
    const status = att?.status;
    const actionStatus = getMemberActionStatus(member.id);

    // Label shown under the name when no attendance recorded yet
    const preLabel = !status ? (
      actionStatus === 'not_responded'
        ? <span className="text-xs text-amber-500 font-medium">Not Responded</span>
        : actionStatus === 'attending'
        ? <span className="text-xs text-blue-500 font-medium">Expected</span>
        : null
    ) : (
      <span className={`text-xs font-medium ${status === 'present' ? 'text-green-600' : status === 'absent' ? 'text-red-500' : 'text-yellow-600'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );

    return (
      <div className={`flex items-center justify-between p-3 rounded-xl border shadow-sm ${isNotAttending ? 'bg-gray-50 border-gray-200 opacity-80' : 'bg-white border-gray-100'}`}>
        <div>
          <p className="font-medium text-sm text-gray-900">{member.full_name}</p>
          <div className="mt-0.5">{preLabel}</div>
        </div>
        <div className="flex gap-2">
          {[
            { s: 'present', Icon: Check, active: 'bg-green-500 text-white scale-110', idle: 'hover:bg-green-100 hover:text-green-600' },
            { s: 'apologies', Icon: Minus, active: 'bg-yellow-400 text-white scale-110', idle: 'hover:bg-yellow-100 hover:text-yellow-600' },
            { s: 'absent', Icon: X, active: 'bg-red-500 text-white scale-110', idle: 'hover:bg-red-100 hover:text-red-600' },
          ].map(({ s, Icon, active, idle }) => (
            <button
              key={s}
              onClick={() => updateMutation.mutate({ memberId: member.id, status: s })}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${status === s ? active : `bg-gray-100 text-gray-400 ${idle}`}`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />

      <div style={{ background: headerBg, padding: '24px', color: '#fff' }}>
        <div className="max-w-7xl mx-auto">
          <button onClick={onBack} className="text-white/70 text-sm mb-4 flex items-center gap-1 hover:text-white transition-colors">
            ← Back to list
          </button>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isEvent ? <Tent className="w-5 h-5 text-white/80" /> : <Calendar className="w-5 h-5 text-white/80" />}
                <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">{isEvent ? 'Event' : 'Meeting'}</span>
                {isOngoing && (
                  <span className="flex items-center gap-1 text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                    <Radio className="w-2.5 h-2.5" /> Live
                  </span>
                )}
                {hasAction && (
                  <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">Attendance Action Linked</span>
                )}
              </div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-white/75 text-sm mt-1">{subtitle}</p>
              <p className="text-white/60 text-sm mt-0.5">{format(new Date(date + 'T12:00:00'), 'EEEE, d MMMM yyyy')}</p>
            </div>
            <div className="text-right bg-white/15 rounded-2xl px-6 py-3">
              <div className="text-3xl font-bold">{presentCount}/{sectionMembers.length}</div>
              <div className="text-white/70 text-xs mt-0.5">Present</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 space-y-3">
        {sectionMembers.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-gray-400">No members in this section</CardContent></Card>
        ) : (
          <>
            {hasAction && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 font-medium">
                <Users className="w-3.5 h-3.5 flex-shrink-0" />
                Showing members who are attending or have not responded. Members who said they're not attending are hidden below.
              </div>
            )}

            <div className="space-y-2">
              {mainMembers.map(member => <MemberRow key={member.id} member={member} />)}
            </div>

            {notAttendingMembers.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowNotAttending(v => !v)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  {showNotAttending ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showNotAttending ? 'Hide' : 'Show'} {notAttendingMembers.length} member{notAttendingMembers.length !== 1 ? 's' : ''} not attending
                </button>
                {showNotAttending && (
                  <div className="space-y-2 mt-2">
                    {notAttendingMembers.map(member => <MemberRow key={member.id} member={member} isNotAttending />)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Session list row ──────────────────────────────────────────────────────────
function SessionRow({ session, onClick }) {
  const { title, subtitle, date, isEvent, isOngoing, isPast } = session;
  const Icon = isEvent ? Tent : Calendar;
  const meetingColors = isOngoing ? 'border-green-300 bg-green-50' : isPast ? 'border-gray-100 bg-white opacity-70' : 'border-purple-100 bg-purple-50';
  const eventColors = isOngoing ? 'border-green-300 bg-green-50' : isPast ? 'border-gray-100 bg-white opacity-70' : 'border-sky-100 bg-sky-50';
  const cardColors = isEvent ? eventColors : meetingColors;
  const iconBg = isEvent ? (isOngoing ? 'bg-green-200' : isPast ? 'bg-gray-100' : 'bg-sky-200') : (isOngoing ? 'bg-green-200' : isPast ? 'bg-gray-100' : 'bg-purple-200');
  const iconColor = isEvent ? (isOngoing ? 'text-green-700' : isPast ? 'text-gray-400' : 'text-sky-700') : (isOngoing ? 'text-green-700' : isPast ? 'text-gray-400' : 'text-purple-700');
  const typePill = isEvent ? 'bg-sky-100 text-sky-700' : 'bg-purple-100 text-purple-700';
  return (
    <button onClick={onClick} className={`w-full border rounded-2xl p-4 flex items-center gap-4 text-left transition-all hover:shadow-md active:scale-[0.99] ${cardColors}`}>
      <div className={`rounded-xl p-3 flex-shrink-0 ${iconBg}`}><Icon className={`w-5 h-5 ${iconColor}`} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm text-gray-900">{title}</p>
          {isOngoing && <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-200 px-2 py-0.5 rounded-full"><Radio className="w-2.5 h-2.5" /> Live</span>}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typePill}`}>{isEvent ? 'Event' : 'Meeting'}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle} · {format(new Date(date + 'T12:00:00'), 'd MMM yyyy')}</p>
      </div>
      <span className="text-gray-400 text-sm flex-shrink-0">→</span>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LeaderAttendance() {
  const [user, setUser] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: sections = [] } = useQuery({
    queryKey: ['sections', user?.id],
    queryFn: async () => {
      if (user.role === 'admin') return base44.entities.Section.filter({ active: true });
      const leaders = await base44.entities.Leader.filter({ user_id: user.id });
      if (!leaders.length) return [];
      const all = await base44.entities.Section.filter({ active: true });
      return all.filter(s => leaders[0].section_ids?.includes(s.id));
    },
    enabled: !!user,
  });

  const sectionIds = sections.map(s => s.id);
  const from = subWeeks(new Date(), 4);
  const to = addWeeks(new Date(), 2);

  const { data: allProgrammes = [], isLoading: loadingP } = useQuery({
    queryKey: ['attendance-programmes', sectionIds.join(',')],
    queryFn: async () => {
      const all = await base44.entities.Programme.filter({});
      return all.filter(p => sectionIds.includes(p.section_id) && new Date(p.date) >= from && new Date(p.date) <= to)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    enabled: sectionIds.length > 0,
    refetchInterval: 60000,
  });

  const { data: allEvents = [], isLoading: loadingE } = useQuery({
    queryKey: ['attendance-events', sectionIds.join(',')],
    queryFn: async () => {
      const all = await base44.entities.Event.filter({});
      return all.filter(e =>
        e.section_ids?.some(sid => sectionIds.includes(sid)) &&
        new Date(e.start_date) <= to &&
        new Date(e.end_date || e.start_date) >= from
      ).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    },
    enabled: sectionIds.length > 0,
    refetchInterval: 60000,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members-attendance'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
    </div>
  );

  if (selectedSession) {
    return <AttendanceRegister session={selectedSession} sections={sections} members={members} onBack={() => setSelectedSession(null)} />;
  }

  const now = nowUK();
  const today = todayUKString();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const meetingSessions = allProgrammes.map(p => {
    const section = sections.find(s => s.id === p.section_id);
    const ongoing = isMeetingOngoing(p, section, now);
    const past = new Date(p.date) < new Date(today);
    const thisWeek = new Date(p.date) >= weekStart && new Date(p.date) <= weekEnd;
    return { key: p.id, title: p.title, subtitle: section?.display_name || '', date: p.date, sectionId: p.section_id, isEvent: false, isOngoing: ongoing, isPast: past, isThisWeek: thisWeek, sortDate: new Date(p.date), programmeId: p.id, eventId: null };
  });

  const eventSessions = allEvents.flatMap(e => {
    const evSections = sections.filter(s => e.section_ids?.includes(s.id));
    return evSections.map(section => {
      const ongoing = isEventOngoing(e, now);
      const past = new Date(e.end_date || e.start_date) < now;
      const startD = new Date(e.start_date);
      const endD = new Date(e.end_date || e.start_date);
      const thisWeek = startD <= weekEnd && endD >= weekStart;
      return { key: `${e.id}-${section.id}`, title: e.title, subtitle: `${section.display_name} · ${e.type}`, date: e.start_date.split('T')[0], sectionId: section.id, isEvent: true, isOngoing: ongoing, isPast: past, isThisWeek: thisWeek, sortDate: new Date(e.start_date), programmeId: null, eventId: e.id };
    });
  });

  const allSessions = [...meetingSessions, ...eventSessions];
  const ongoing = allSessions.filter(s => s.isOngoing);
  const thisWeek = allSessions.filter(s => s.isThisWeek && !s.isOngoing).sort((a, b) => b.sortDate - a.sortDate);
  const upcoming = allSessions.filter(s => !s.isThisWeek && !s.isOngoing && !s.isPast).sort((a, b) => a.sortDate - b.sortDate);
  const past = allSessions.filter(s => s.isPast && !s.isOngoing).sort((a, b) => b.sortDate - a.sortDate);
  const isLoading = loadingP || loadingE;

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 24px' }}>
        <div className="max-w-7xl mx-auto">
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Leader Portal</p>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 32px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.2 }}>Attendance Register</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-purple-100 text-purple-700 px-3 py-1 rounded-full"><Calendar className="w-3 h-3" /> Meetings</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-sky-100 text-sky-700 px-3 py-1 rounded-full"><Tent className="w-3 h-3" /> Events</span>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" /></div>
        ) : allSessions.length === 0 ? (
          <Card><CardContent className="p-12 text-center"><Users className="w-16 h-16 text-gray-200 mx-auto mb-4" /><p className="text-gray-500">No meetings or events in the last 4 weeks or next 2 weeks</p></CardContent></Card>
        ) : (
          <>
            {ongoing.length > 0 && <section><h2 className="text-xs font-bold text-green-700 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Radio className="w-3 h-3" /> Live Now</h2><div className="space-y-2">{ongoing.map(s => <SessionRow key={s.key} session={s} onClick={() => setSelectedSession(s)} />)}</div></section>}
            {thisWeek.length > 0 && <section><h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">This Week</h2><div className="space-y-2">{thisWeek.map(s => <SessionRow key={s.key} session={s} onClick={() => setSelectedSession(s)} />)}</div></section>}
            {upcoming.length > 0 && <section><h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Upcoming</h2><div className="space-y-2">{upcoming.map(s => <SessionRow key={s.key} session={s} onClick={() => setSelectedSession(s)} />)}</div></section>}
            {past.length > 0 && <section><h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Past Sessions</h2><div className="space-y-2">{past.map(s => <SessionRow key={s.key} session={s} onClick={() => setSelectedSession(s)} />)}</div></section>}
          </>
        )}
      </div>
    </div>
  );
}