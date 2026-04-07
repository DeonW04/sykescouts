import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, ChevronRight } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

function MeetingCard({ programme, isPastMeeting }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        isPastMeeting ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-gray-100 shadow-sm'
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-4 text-left"
      >
        <div className={`rounded-xl p-3 flex-shrink-0 ${isPastMeeting ? 'bg-gray-200' : 'bg-green-100'}`}>
          <Calendar className={`w-5 h-5 ${isPastMeeting ? 'text-gray-500' : 'text-green-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-semibold text-sm ${isPastMeeting ? 'text-gray-500' : 'text-gray-900'}`}>
              {programme.title}
            </p>
            {isToday(new Date(programme.date)) && (
              <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Today</span>
            )}
            {isTomorrow(new Date(programme.date)) && (
              <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Tomorrow</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {format(new Date(programme.date), 'EEEE, d MMMM yyyy')}
          </p>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && programme.description && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100">
          <p className="text-sm text-gray-600 leading-relaxed">{programme.description}</p>
          {programme.activities?.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {programme.activities.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  {a.time && <span className="text-gray-400 font-medium flex-shrink-0 w-12">{a.time}</span>}
                  <span>{a.activity}</span>
                </div>
              ))}
            </div>
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
  const relevantTerms = terms.filter(t => childSectionIds.includes(t.section_id));
  const currentTerm = relevantTerms.find(t => now >= new Date(t.start_date) && now <= new Date(t.end_date))
    || relevantTerms.filter(t => new Date(t.start_date) > now).sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];

  const termProgrammes = currentTerm
    ? programmes
        .filter(p => {
          const d = new Date(p.date);
          return d >= new Date(currentTerm.start_date) && d <= new Date(currentTerm.end_date) && childSectionIds.includes(p.section_id);
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    : [];

  const upcoming = termProgrammes.filter(p => !isPast(new Date(p.date)) || isToday(new Date(p.date)));
  const past = termProgrammes.filter(p => isPast(new Date(p.date)) && !isToday(new Date(p.date)));

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-[#004851] px-5 pt-12 pb-6 text-white">
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
          <>
            {upcoming.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Upcoming</h2>
                <div className="space-y-3">
                  {upcoming.map(p => <MeetingCard key={p.id} programme={p} isPastMeeting={false} />)}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Previous Meetings</h2>
                <div className="space-y-3">
                  {[...past].reverse().map(p => <MeetingCard key={p.id} programme={p} isPastMeeting={true} />)}
                </div>
              </div>
            )}
            {termProgrammes.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No meetings planned yet for this term.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}