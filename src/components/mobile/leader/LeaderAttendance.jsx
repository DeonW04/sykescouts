import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Calendar, ChevronRight, Radio, Tent, ChevronDown, ChevronUp } from 'lucide-react';
import { format, subWeeks, addWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'sonner';

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
function AttendanceRegister({ selected, section, members, onBack }) {
  const { title, subtitle, date, sectionId, programmeId, eventId, isEvent } = selected;
  const queryClient = useQueryClient();
  const [showNotAttending, setShowNotAttending] = useState(false);

  const { data: attendance = [] } = useQuery({
    queryKey: ['leader-mobile-attendance', sectionId, date],
    queryFn: () => base44.entities.Attendance.filter({ section_id: sectionId, date }),
    enabled: !!sectionId && !!date,
  });

  const { data: allActions = [] } = useQuery({
    queryKey: ['mobile-attendance-actions', programmeId, eventId],
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
    queryKey: ['mobile-action-assignments', attendanceAction?.id],
    queryFn: () => base44.entities.ActionAssignment.filter({ action_required_id: attendanceAction.id }),
    enabled: !!attendanceAction?.id,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ['mobile-action-responses', attendanceAction?.id],
    queryFn: () => base44.entities.ActionResponse.filter({ action_required_id: attendanceAction.id }),
    enabled: !!attendanceAction?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ memberId, status }) => {
      const existing = attendance.find(a => a.member_id === memberId);
      if (existing) return base44.entities.Attendance.update(existing.id, { status });
      return base44.entities.Attendance.create({ member_id: memberId, section_id: sectionId, date, status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leader-mobile-attendance'] }),
  });

  const getStatus = (memberId) => attendance.find(a => a.member_id === memberId)?.status || null;

  const hasAction = !!attendanceAction && assignments.length > 0;

  const getMemberActionStatus = (memberId) => {
    if (!hasAction) return null;
    const assignment = assignments.find(a => a.member_id === memberId);
    if (!assignment) return null;
    const response = responses.find(r => r.member_id === memberId);
    if (!response?.response_value) return 'not_responded';
    return response.response_value.toLowerCase().startsWith('yes') ? 'attending' : 'not_attending';
  };

  const mainMembers = members.filter(m => getMemberActionStatus(m.id) !== 'not_attending');
  const notAttendingMembers = members.filter(m => getMemberActionStatus(m.id) === 'not_attending');
  const presentCount = members.filter(m => getStatus(m.id) === 'present').length;

  const headerGradient = isEvent
    ? 'from-sky-600 to-indigo-600'
    : 'from-purple-700 to-[#004851]';

  const statusConfig = {
    present: { label: 'Present', color: 'bg-green-600', text: 'text-white' },
    absent: { label: 'Absent', color: 'bg-red-500', text: 'text-white' },
    apologies: { label: 'Apologies', color: 'bg-yellow-500', text: 'text-white' },
  };

  const MemberCard = ({ member, dimmed = false }) => {
    const status = getStatus(member.id);
    const actionStatus = getMemberActionStatus(member.id);

    const preLabel = !status ? (
      actionStatus === 'not_responded'
        ? <span className="text-xs text-amber-500 font-semibold">Not Responded</span>
        : actionStatus === 'attending'
        ? <span className="text-xs text-blue-500 font-semibold">Expected</span>
        : null
    ) : null;

    return (
      <div className={`bg-white rounded-2xl border border-gray-100 p-4 ${dimmed ? 'opacity-70' : ''}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${status === 'present' ? 'bg-green-500' : status === 'absent' ? 'bg-red-400' : status === 'apologies' ? 'bg-yellow-500' : 'bg-gray-300'}`}>
            {member.full_name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900">{member.full_name}</p>
            {member.patrol && <p className="text-xs text-gray-400">{member.patrol}</p>}
            {preLabel}
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
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className={`bg-gradient-to-br ${headerGradient} px-5 pb-6 text-white`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <button onClick={onBack} className="text-white/70 text-sm mb-3 flex items-center gap-1">← Back</button>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">{isEvent ? 'Event' : 'Meeting'}</span>
          {hasAction && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">Attendance Action</span>}
        </div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-white/70 text-sm mt-0.5">{subtitle}</p>
        <p className="text-white/60 text-sm">{format(new Date(date + 'T12:00:00'), 'EEEE, d MMMM yyyy')}</p>
        <p className="text-white font-semibold mt-2">{presentCount} / {members.length} present</p>
      </div>

      <div className="px-4 py-4 space-y-2">
        {hasAction && (
          <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
            <Users className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            Showing members who are attending or haven't responded. Tap below to see members who said no.
          </div>
        )}

        {mainMembers.length === 0 && !hasAction && (
          <p className="text-center text-gray-400 py-8 text-sm">No members in this section</p>
        )}

        {mainMembers.map(member => <MemberCard key={member.id} member={member} />)}

        {notAttendingMembers.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setShowNotAttending(v => !v)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 bg-white"
            >
              {showNotAttending ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showNotAttending ? 'Hide' : 'Show'} {notAttendingMembers.length} not attending
            </button>
            {showNotAttending && (
              <div className="space-y-2 mt-2">
                {notAttendingMembers.map(member => <MemberCard key={member.id} member={member} dimmed />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LeaderAttendance({ sections }) {
  const [selected, setSelected] = useState(null);
  const sectionIds = sections.map(s => s.id);
  const now = nowUK();
  const today = todayUKString();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const from = subWeeks(weekStart, 4);
  const to = addWeeks(weekEnd, 2);

  const { data: programmes = [], isLoading: loadingMeetings } = useQuery({
    queryKey: ['leader-attendance-programmes', sectionIds.join(',')],
    queryFn: async () => {
      const all = await base44.entities.Programme.filter({});
      return all.filter(p => sectionIds.includes(p.section_id) && new Date(p.date) >= from && new Date(p.date) <= to)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    enabled: sectionIds.length > 0,
    refetchInterval: 60000,
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['leader-attendance-events', sectionIds.join(',')],
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
    queryKey: ['leader-mobile-members', sectionIds.join(',')],
    queryFn: async () => {
      const all = await base44.entities.Member.filter({ active: true });
      return all.filter(m => sectionIds.includes(m.section_id)).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    },
    enabled: sectionIds.length > 0,
  });

  const isLoading = loadingMeetings || loadingEvents;

  if (selected) {
    const sectionMembers = members.filter(m => m.section_id === selected.sectionId);
    return (
      <AttendanceRegister
        selected={selected}
        section={sections.find(s => s.id === selected.sectionId)}
        members={sectionMembers}
        onBack={() => setSelected(null)}
      />
    );
  }

  // Categorise
  const ongoingMeetings = programmes.filter(p => isMeetingOngoing(p, sections.find(s => s.id === p.section_id), now));
  const ongoingEventEntries = events.flatMap(e =>
    sections.filter(s => e.section_ids?.includes(s.id) && isEventOngoing(e, now)).map(s => ({ event: e, section: s }))
  );
  const hasOngoing = ongoingMeetings.length > 0 || ongoingEventEntries.length > 0;

  const thisWeekMeetings = programmes.filter(p => {
    const d = new Date(p.date);
    return d >= weekStart && d <= weekEnd && !ongoingMeetings.includes(p);
  });
  const thisWeekEventEntries = events.flatMap(e => {
    const start = new Date(e.start_date), end = new Date(e.end_date || e.start_date);
    if (!(start <= weekEnd && end >= weekStart)) return [];
    return sections.filter(s => e.section_ids?.includes(s.id) && !ongoingEventEntries.some(o => o.event.id === e.id && o.section.id === s.id)).map(s => ({ event: e, section: s }));
  });
  const otherMeetings = programmes.filter(p => { const d = new Date(p.date); return !(d >= weekStart && d <= weekEnd); });
  const otherEventEntries = events.flatMap(e => {
    const start = new Date(e.start_date), end = new Date(e.end_date || e.start_date);
    if (start <= weekEnd && end >= weekStart) return [];
    return sections.filter(s => e.section_ids?.includes(s.id)).map(s => ({ event: e, section: s }));
  });

  const SessionRow = ({ title, subtitle, date, sectionId, programmeId = null, eventId = null, icon: Icon = Calendar, highlighted = false, isOngoing = false, isEvent = false }) => (
    <button
      onClick={() => setSelected({ title, subtitle, date, sectionId, programmeId, eventId, isEvent })}
      className={`w-full rounded-2xl p-4 flex items-center gap-3 text-left active:scale-95 transition-all ${isOngoing ? 'bg-green-50 border border-green-300' : isEvent ? (highlighted ? 'bg-sky-50 border border-sky-200' : 'bg-white border border-gray-100') : (highlighted ? 'bg-orange-50 border border-orange-200' : 'bg-white border border-gray-100')}`}
    >
      <div className={`rounded-xl p-3 flex-shrink-0 ${isOngoing ? 'bg-green-200' : isEvent ? (highlighted ? 'bg-sky-200' : 'bg-sky-100') : (highlighted ? 'bg-orange-200' : 'bg-gray-100')}`}>
        <Icon className={`w-5 h-5 ${isOngoing ? 'text-green-700' : isEvent ? (highlighted ? 'text-sky-700' : 'text-sky-500') : (highlighted ? 'text-orange-700' : 'text-gray-500')}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-gray-900">{title}</p>
          {isOngoing && <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><Radio className="w-2.5 h-2.5" /> Live</span>}
          {isEvent && <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-semibold">Event</span>}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle} · {format(new Date(date + 'T12:00:00'), 'd MMM yyyy')}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </button>
  );

  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-orange-600 to-red-600 px-5 pb-6 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-white/70 text-sm mt-1">{hasOngoing ? 'Session in progress' : 'Select a meeting or event'}</p>
      </div>
      <div className="px-4 py-5">
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            {hasOngoing && (
              <div>
                <h2 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Radio className="w-3 h-3" /> Live Now</h2>
                <div className="space-y-2">
                  {ongoingMeetings.map(p => { const s = sections.find(sec => sec.id === p.section_id); return <SessionRow key={p.id} title={p.title} subtitle={s?.display_name || ''} date={p.date} sectionId={p.section_id} programmeId={p.id} isOngoing />; })}
                  {ongoingEventEntries.map(({ event: e, section: s }) => <SessionRow key={`${e.id}-${s.id}`} title={e.title} subtitle={`${s.display_name} · ${e.type}`} date={today} sectionId={s.id} eventId={e.id} icon={Tent} isOngoing isEvent />)}
                </div>
              </div>
            )}
            {(thisWeekMeetings.length > 0 || thisWeekEventEntries.length > 0) && (
              <div>
                <h2 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-3">This Week</h2>
                <div className="space-y-2">
                  {thisWeekMeetings.map(p => { const s = sections.find(sec => sec.id === p.section_id); return <SessionRow key={p.id} title={p.title} subtitle={s?.display_name || ''} date={p.date} sectionId={p.section_id} programmeId={p.id} highlighted />; })}
                  {thisWeekEventEntries.map(({ event: e, section: s }) => <SessionRow key={`${e.id}-${s.id}`} title={e.title} subtitle={`${s.display_name} · ${e.type}`} date={e.start_date.split('T')[0]} sectionId={s.id} eventId={e.id} icon={Tent} highlighted isEvent />)}
                </div>
              </div>
            )}
            {(otherMeetings.length > 0 || otherEventEntries.length > 0) && (
              <div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Other Sessions</h2>
                <div className="space-y-2">
                  {otherMeetings.map(p => { const s = sections.find(sec => sec.id === p.section_id); const isPast = new Date(p.date) < now; return <div key={p.id} className={isPast ? 'opacity-70' : ''}><SessionRow title={p.title} subtitle={s?.display_name || ''} date={p.date} sectionId={p.section_id} programmeId={p.id} /></div>; })}
                  {otherEventEntries.map(({ event: e, section: s }) => { const isPast = new Date(e.end_date || e.start_date) < now; return <div key={`${e.id}-${s.id}`} className={isPast ? 'opacity-70' : ''}><SessionRow title={e.title} subtitle={`${s.display_name} · ${e.type}`} date={e.start_date.split('T')[0]} sectionId={s.id} eventId={e.id} icon={Tent} isEvent /></div>; })}
                </div>
              </div>
            )}
            {programmes.length === 0 && events.length === 0 && (
              <div className="text-center py-12 text-gray-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No recent meetings or events found</p></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}