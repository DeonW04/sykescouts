import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, ChevronRight, AlertTriangle, MapPin } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, isThisWeek, startOfWeek, endOfWeek } from 'date-fns';

function MeetingCard({ programme, isPastMeeting, termMeetingTime, isThisWeeksMeeting }) {
  const [open, setOpen] = useState(isThisWeeksMeeting);

  // Detect time change: compare programme's activity start time vs expected term meeting time
  const hasTimeChange = (() => {
    if (!termMeetingTime || !programme.activities?.length) return false;
    const firstActivity = programme.activities[0];
    if (!firstActivity?.time) return false;
    // Normalise both to HH:MM for comparison
    const normalise = (t) => t?.replace(/^(\d):/, '0$1:').trim().slice(0, 5);
    return normalise(firstActivity.time) !== normalise(termMeetingTime);
  })();

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        isThisWeeksMeeting
          ? 'bg-green-50 border-green-200 shadow-sm'
          : isPastMeeting
          ? 'bg-gray-50 border-gray-200 opacity-70'
          : 'bg-white border-gray-100 shadow-sm'
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-4 text-left"
      >
        <div className={`rounded-xl p-3 flex-shrink-0 ${isThisWeeksMeeting ? 'bg-green-200' : isPastMeeting ? 'bg-gray-200' : 'bg-green-100'}`}>
          <Calendar className={`w-5 h-5 ${isThisWeeksMeeting ? 'text-green-700' : isPastMeeting ? 'text-gray-500' : 'text-green-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-semibold text-sm ${isPastMeeting ? 'text-gray-500' : 'text-gray-900'}`}>
              {programme.title}
            </p>
            {isThisWeeksMeeting && (
              <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">This Week</span>
            )}
            {!isThisWeeksMeeting && isToday(new Date(programme.date)) && (
              <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Today</span>
            )}
            {!isThisWeeksMeeting && isTomorrow(new Date(programme.date)) && (
              <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Tomorrow</span>
            )}
            {(hasTimeChange || programme.optional_start_time) && (
              <span className="flex items-center gap-0.5 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-2.5 h-2.5" />
                Time change
              </span>
            )}
            {programme.optional_location && (
              <span className="flex items-center gap-0.5 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <MapPin className="w-2.5 h-2.5" />
                Different location
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {format(new Date(programme.date), 'EEEE, d MMMM yyyy')}
          </p>
          {programme.optional_start_time && (
            <p className="text-xs text-red-600 font-semibold mt-0.5">
              ⏰ {programme.optional_start_time}{programme.optional_end_time ? ` – ${programme.optional_end_time}` : ''}
            </p>
          )}
          {!programme.optional_start_time && hasTimeChange && programme.activities?.[0]?.time && (
            <p className="text-xs text-red-600 font-semibold mt-0.5">
              Starts at {programme.activities[0].time} (usual: {termMeetingTime})
            </p>
          )}
          {programme.optional_location && (
            <p className="text-xs text-red-600 font-semibold mt-0.5">
              📍 {programme.optional_location}
            </p>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100">
          {/* Unusual info shown prominently in red */}
          {(programme.optional_location || programme.optional_start_time) && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide">⚠️ Different from usual</p>
              {programme.optional_start_time && (
                <p className="text-sm text-red-700 font-semibold">
                  Time: {programme.optional_start_time}{programme.optional_end_time ? ` – ${programme.optional_end_time}` : ''}
                </p>
              )}
              {programme.optional_location && (
                <p className="text-sm text-red-700 font-semibold">Location: {programme.optional_location}</p>
              )}
            </div>
          )}
          {programme.description && (
            <p className="text-sm text-gray-600 leading-relaxed mt-3 whitespace-pre-wrap">{programme.description}</p>
          )}
          {programme.activities?.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {programme.activities.map((a, i) => {
                const isTimeChanged = (() => {
                  if (!termMeetingTime || !a.time) return false;
                  const normalise = (t) => t?.replace(/^(\d):/, '0$1:').trim().slice(0, 5);
                  return i === 0 && normalise(a.time) !== normalise(termMeetingTime);
                })();
                return (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    {a.time && (
                      <span className={`font-medium flex-shrink-0 w-12 ${isTimeChanged ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                        {a.time}
                      </span>
                    )}
                    <span>{a.activity}</span>
                  </div>
                );
              })}
            </div>
          )}
          {!programme.description && !programme.activities?.length && (
            <p className="text-sm text-gray-400 mt-3">No details available yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function MobileProgramme({ children }) {
  const childSectionIds = [...new Set(children.map(c => c.section_id).filter(Boolean))];

  const { data: terms = [] } = useQuery({
    queryKey: ['mobile-terms', childSectionIds],
    queryFn: () => base44.entities.Term.filter({ active: true }),
    enabled: childSectionIds.length > 0,
  });

  const { data: programmes = [], isLoading } = useQuery({
    queryKey: ['mobile-programmes'],
    queryFn: () => base44.entities.Programme.filter({ published: true }),
    enabled: childSectionIds.length > 0,
  });

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const relevantTerms = terms.filter(t => childSectionIds.includes(t.section_id));
  const currentTerm = relevantTerms.find(t => now >= new Date(t.start_date) && now <= new Date(t.end_date))
    || relevantTerms.filter(t => new Date(t.start_date) > now).sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];

  const termMeetingTime = currentTerm?.meeting_start_time;

  const termProgrammes = currentTerm
    ? programmes
        .filter(p => {
          const d = new Date(p.date);
          return d >= new Date(currentTerm.start_date) && d <= new Date(currentTerm.end_date) && childSectionIds.includes(p.section_id);
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    : [];

  // Find this week's meeting
  const thisWeekMeeting = termProgrammes.find(p => {
    const d = new Date(p.date);
    return d >= weekStart && d <= weekEnd;
  });

  const otherUpcoming = termProgrammes.filter(p => {
    const d = new Date(p.date);
    const isUpcoming = !isPast(d) || isToday(d);
    const isThisWeek = d >= weekStart && d <= weekEnd;
    return isUpcoming && !isThisWeek;
  });

  const past = termProgrammes.filter(p => isPast(new Date(p.date)) && !isToday(new Date(p.date)));

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-[#004851] px-5 pb-6 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <h1 className="text-2xl font-bold">Programme</h1>
        {currentTerm && (
          <p className="text-white/70 text-sm mt-1">
            {currentTerm.title} · {format(new Date(currentTerm.start_date), 'd MMM')} – {format(new Date(currentTerm.end_date), 'd MMM yyyy')}
            {new Date(currentTerm.start_date) > now && <span className="ml-2 bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Upcoming</span>}
          </p>
        )}
      </div>

      <div className="px-4 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-3 border-gray-200 border-t-[#7413dc] rounded-full animate-spin" />
          </div>
        ) : !currentTerm ? (
          <div className="text-center py-16 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-600">No upcoming term</p>
            <p className="text-sm mt-1">Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* This week's meeting at the top */}
            {thisWeekMeeting && (
              <div>
                <h2 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3">This Week</h2>
                <MeetingCard
                  programme={thisWeekMeeting}
                  isPastMeeting={false}
                  termMeetingTime={termMeetingTime}
                  isThisWeeksMeeting={true}
                />
              </div>
            )}

            {otherUpcoming.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Upcoming</h2>
                <div className="space-y-3">
                  {(() => {
                    const halfTermStart = currentTerm?.half_term_start ? new Date(currentTerm.half_term_start) : null;
                    const halfTermEnd = currentTerm?.half_term_end ? new Date(currentTerm.half_term_end) : null;
                    let halfTermDividerShown = false;
                    return otherUpcoming.map(p => {
                      const items = [];
                      if (!halfTermDividerShown && halfTermStart && halfTermEnd && new Date(p.date) > halfTermEnd) {
                        halfTermDividerShown = true;
                        items.push(
                          <div key="half-term-divider" className="flex items-center gap-3 py-1">
                            <div className="flex-1 h-px bg-amber-200" />
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide bg-amber-50 border border-amber-200 rounded-full px-3 py-1 flex-shrink-0">
                              🌟 Half Term · {format(halfTermStart, 'd MMM')} – {format(halfTermEnd, 'd MMM')}
                            </span>
                            <div className="flex-1 h-px bg-amber-200" />
                          </div>
                        );
                      }
                      items.push(
                        <MeetingCard
                          key={p.id}
                          programme={p}
                          isPastMeeting={false}
                          termMeetingTime={termMeetingTime}
                          isThisWeeksMeeting={false}
                        />
                      );
                      return items;
                    });
                  })()}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Previous Meetings</h2>
                <div className="space-y-3">
                  {[...past].reverse().map(p => (
                    <MeetingCard
                      key={p.id}
                      programme={p}
                      isPastMeeting={true}
                      termMeetingTime={termMeetingTime}
                      isThisWeeksMeeting={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {termProgrammes.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No meetings planned yet for this term.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}