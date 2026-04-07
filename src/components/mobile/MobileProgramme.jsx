import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { format, isThisWeek, startOfWeek, endOfWeek, isBefore, isAfter } from 'date-fns';

function ActivityRow({ activity, sectionMeetingTime }) {
  const showTimeWarning = sectionMeetingTime && activity.time && activity.time !== sectionMeetingTime;
  return (
    <div className="flex items-start gap-2 py-1.5">
      {activity.time && (
        <span className={`text-xs font-mono font-semibold flex-shrink-0 mt-0.5 ${showTimeWarning ? 'text-red-500' : 'text-gray-400'}`}>
          {activity.time}
        </span>
      )}
      <span className="text-sm text-gray-700 leading-snug">{activity.activity}</span>
    </div>
  );
}

function MeetingCard({ programme, section, isThisWeek: thisWeek }) {
  const [open, setOpen] = useState(thisWeek);

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${thisWeek ? 'border-[#7413dc]/30' : 'border-gray-100'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left"
      >
        <div className={`w-10 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${thisWeek ? 'bg-[#7413dc]' : 'bg-gray-100'}`}>
          <span className={`font-bold text-base leading-none ${thisWeek ? 'text-white' : 'text-gray-700'}`}>
            {format(new Date(programme.date), 'd')}
          </span>
          <span className={`text-[10px] font-medium uppercase ${thisWeek ? 'text-white/80' : 'text-gray-400'}`}>
            {format(new Date(programme.date), 'MMM')}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {thisWeek && (
              <span className="bg-[#7413dc] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">THIS WEEK</span>
            )}
            {section && (
              <span className="text-[10px] text-gray-400 capitalize">{section.display_name || section.name}</span>
            )}
          </div>
          <p className="font-bold text-gray-900 text-sm mt-0.5 leading-tight">{programme.title}</p>
          {programme.description && !open && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{programme.description}</p>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-50">
          {programme.description && (
            <p className="text-sm text-gray-600 leading-relaxed py-3">{programme.description}</p>
          )}
          {programme.activities?.length > 0 && (
            <div className="mt-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Activities</p>
              <div className="divide-y divide-gray-50">
                {programme.activities.map((a, i) => (
                  <ActivityRow
                    key={i}
                    activity={a}
                    sectionMeetingTime={section?.meeting_time}
                  />
                ))}
              </div>
            </div>
          )}
          {programme.equipment_needed && (
            <div className="mt-3 bg-amber-50 rounded-xl px-3 py-2">
              <p className="text-xs font-bold text-amber-700 mb-0.5">📦 Equipment Needed</p>
              <p className="text-xs text-amber-600">{programme.equipment_needed}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MobileProgramme({ children }) {
  const childSectionIds = [...new Set(children.map(c => c.section_id).filter(Boolean))];

  const { data: programmes = [], isLoading } = useQuery({
    queryKey: ['mobile-programme', childSectionIds],
    queryFn: async () => {
      const all = await base44.entities.Programme.filter({ shown_in_portal: true });
      return all
        .filter(p => childSectionIds.includes(p.section_id))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    enabled: childSectionIds.length > 0,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const thisWeekProgs = programmes.filter(p => {
    const d = new Date(p.date);
    return d >= weekStart && d <= weekEnd;
  });

  const upcomingProgs = programmes.filter(p => {
    const d = new Date(p.date);
    return d > weekEnd;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const pastProgs = programmes.filter(p => {
    const d = new Date(p.date);
    return d < weekStart;
  });

  const getSection = (prog) => sections.find(s => s.id === prog.section_id);

  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-5 pt-16 pb-6 text-white">
        <h1 className="text-2xl font-bold">Programme</h1>
        <p className="text-white/70 text-sm mt-1">Meeting plans &amp; activities</p>
      </div>
      <div className="px-4 py-5 space-y-5">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : programmes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-600">No meetings yet</p>
            <p className="text-sm mt-1">Programme will appear here when published.</p>
          </div>
        ) : (
          <>
            {thisWeekProgs.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> This Week
                </h2>
                <div className="space-y-3">
                  {thisWeekProgs.map(p => (
                    <MeetingCard key={p.id} programme={p} section={getSection(p)} isThisWeek={true} />
                  ))}
                </div>
              </div>
            )}
            {upcomingProgs.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Upcoming</h2>
                <div className="space-y-3">
                  {upcomingProgs.map(p => (
                    <MeetingCard key={p.id} programme={p} section={getSection(p)} isThisWeek={false} />
                  ))}
                </div>
              </div>
            )}
            {pastProgs.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Previous Meetings</h2>
                <div className="space-y-3 opacity-70">
                  {pastProgs.map(p => (
                    <MeetingCard key={p.id} programme={p} section={getSection(p)} isThisWeek={false} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}