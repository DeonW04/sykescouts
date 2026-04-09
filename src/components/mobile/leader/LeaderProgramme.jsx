import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, ChevronDown, ChevronUp, Save, AlertTriangle, MapPin, LayoutList } from 'lucide-react';
import { format, isPast, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'sonner';
import MeetingDetailPanel from './MeetingDetailPanel';

function MeetingCard({ programme, sections, isThisWeek }) {
  const [open, setOpen] = useState(isThisWeek);
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();
  const section = sections.find(s => s.id === programme.section_id);

  const [form, setForm] = useState({
    title: programme.title || '',
    description: programme.description || '',
    optional_location: programme.optional_location || '',
    optional_start_time: programme.optional_start_time || '',
    optional_end_time: programme.optional_end_time || '',
  });

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.Programme.update(programme.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leader-mobile-programmes'] });
      toast.success('Meeting updated');
      setEditing(false);
    },
  });

  const past = isPast(new Date(programme.date)) && !isToday(new Date(programme.date));

  return (
    <div className={`rounded-2xl border overflow-hidden ${isThisWeek ? 'bg-green-50 border-green-200 shadow-sm' : past ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-gray-100 shadow-sm'}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 p-4 text-left">
        <div className={`rounded-xl p-3 flex-shrink-0 ${isThisWeek ? 'bg-green-200' : past ? 'bg-gray-200' : 'bg-green-100'}`}>
          <Calendar className={`w-5 h-5 ${isThisWeek ? 'text-green-700' : past ? 'text-gray-500' : 'text-green-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-gray-900">{programme.title}</p>
            {isThisWeek && <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">This Week</span>}
            {section && <span className="text-[10px] bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full">{section.display_name}</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{format(new Date(programme.date), 'EEEE, d MMMM yyyy')}</p>
          {programme.optional_start_time && (
            <p className="text-xs text-red-600 font-semibold mt-0.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Different time: {programme.optional_start_time}
            </p>
          )}
          {programme.optional_location && (
            <p className="text-xs text-red-600 font-semibold mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {programme.optional_location}
            </p>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100">
          {editing ? (
            <div className="pt-3 space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#004851]" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#004851] resize-none" />
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-orange-700">Unusual changes only</p>
                <input value={form.optional_location} onChange={e => setForm(f => ({ ...f, optional_location: e.target.value }))} placeholder="Different location (leave blank if usual)" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={form.optional_start_time} onChange={e => setForm(f => ({ ...f, optional_start_time: e.target.value }))} placeholder="Start time" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white" />
                  <input value={form.optional_end_time} onChange={e => setForm(f => ({ ...f, optional_end_time: e.target.value }))} placeholder="End time" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 active:bg-gray-50">Cancel</button>
                <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex-1 py-2.5 bg-[#004851] rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 active:bg-[#003840] disabled:opacity-60">
                  <Save className="w-4 h-4" /> {saveMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-3">
              {programme.description && <p className="text-sm text-gray-600 mb-3">{programme.description}</p>}
              {programme.activities?.length > 0 && (
                <div className="space-y-1 mb-3">
                  {programme.activities.map((a, i) => (
                    <div key={i} className="flex gap-2 text-xs text-gray-600">
                      {a.time && <span className="text-gray-400 w-12 flex-shrink-0">{a.time}</span>}
                      <span>{a.activity}</span>
                    </div>
                  ))}
                </div>
              )}
              {!programme.description && !programme.activities?.length && (
                <p className="text-sm text-gray-400 mb-3">No details yet.</p>
              )}
              <div className="flex gap-2">
                <button onClick={() => setEditing(true)} className="text-xs text-[#004851] font-semibold border border-[#004851]/30 px-3 py-1.5 rounded-xl active:bg-[#004851]/5">
                  Edit Details
                </button>
                <button onClick={() => setDetailProgramme(programme)} className="text-xs text-[#7413dc] font-semibold border border-[#7413dc]/30 px-3 py-1.5 rounded-xl active:bg-[#7413dc]/5 flex items-center gap-1">
                  <LayoutList className="w-3 h-3" /> Attendance & More
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LeaderProgramme({ sections = [] }) {
  const [detailProgramme, setDetailProgramme] = useState(null);
  const sectionIds = sections.map(s => s.id);
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const { data: terms = [] } = useQuery({
    queryKey: ['leader-mobile-terms', sectionIds],
    queryFn: () => base44.entities.Term.filter({ active: true }),
    enabled: sectionIds.length > 0,
  });

  const { data: programmes = [], isLoading } = useQuery({
    queryKey: ['leader-mobile-programmes', sectionIds],
    queryFn: async () => {
      const all = await base44.entities.Programme.filter({});
      return all
        .filter(p => sectionIds.includes(p.section_id))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    },
    enabled: sectionIds.length > 0,
  });

  // Find current term
  const relevantTerms = terms.filter(t => sectionIds.includes(t.section_id));
  const currentTerm = relevantTerms.find(t => now >= new Date(t.start_date) && now <= new Date(t.end_date))
    || relevantTerms.filter(t => new Date(t.start_date) > now).sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];

  const termProgs = currentTerm
    ? programmes.filter(p => {
        const d = new Date(p.date);
        return d >= new Date(currentTerm.start_date) && d <= new Date(currentTerm.end_date);
      })
    : programmes.filter(p => new Date(p.date) >= now).slice(0, 10);

  const thisWeekProgs = termProgs.filter(p => {
    const d = new Date(p.date);
    return d >= weekStart && d <= weekEnd;
  });
  const upcomingProgs = termProgs.filter(p => {
    const d = new Date(p.date);
    return new Date(p.date) > now && !(d >= weekStart && d <= weekEnd);
  });
  const pastProgs = termProgs.filter(p => isPast(new Date(p.date)) && !isToday(new Date(p.date)));

  if (detailProgramme) return <MeetingDetailPanel programme={detailProgramme} sections={sections} onClose={() => setDetailProgramme(null)} />;

  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-green-600 to-[#004851] px-5 pb-6 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <h1 className="text-2xl font-bold">Programme</h1>
        {currentTerm && (
          <p className="text-white/70 text-sm mt-1">
            {currentTerm.title} · {format(new Date(currentTerm.start_date), 'd MMM')} – {format(new Date(currentTerm.end_date), 'd MMM yyyy')}
          </p>
        )}
      </div>

      <div className="px-4 py-5">
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-gray-200 border-t-[#004851] rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            {thisWeekProgs.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3">This Week</h2>
                <div className="space-y-3">
                  {thisWeekProgs.map(p => <MeetingCard key={p.id} programme={p} sections={sections} isThisWeek={true} />)}
                </div>
              </div>
            )}
            {upcomingProgs.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Upcoming</h2>
                <div className="space-y-3">
                  {upcomingProgs.map(p => <MeetingCard key={p.id} programme={p} sections={sections} isThisWeek={false} />)}
                </div>
              </div>
            )}
            {pastProgs.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Previous</h2>
                <div className="space-y-3">
                  {[...pastProgs].reverse().slice(0, 5).map(p => <MeetingCard key={p.id} programme={p} sections={sections} isThisWeek={false} />)}
                </div>
              </div>
            )}
            {termProgs.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No meetings in this term yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}