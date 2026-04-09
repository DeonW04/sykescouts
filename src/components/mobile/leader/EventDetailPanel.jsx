import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Clock, FileText, ListChecks, Bell, Users } from 'lucide-react';
import { format } from 'date-fns';

const TABS = [
  { id: 'attendance', label: 'Attendees', icon: Users },
  { id: 'consent', label: 'Consent', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'actions', label: 'Actions', icon: Bell },
];

export default function EventDetailPanel({ event, onClose }) {
  const [tab, setTab] = useState('attendance');

  const { data: allMembers = [] } = useQuery({
    queryKey: ['edp-members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
    enabled: !!event.id,
  });

  const { data: consentForms = [] } = useQuery({
    queryKey: ['edp-forms', event.consent_form_ids],
    queryFn: async () => {
      if (!event.consent_form_ids?.length) return [];
      const all = await base44.entities.ConsentForm.filter({});
      return all.filter(f => event.consent_form_ids.includes(f.id));
    },
    enabled: !!(event.consent_form_ids?.length),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['edp-submissions', event.id],
    queryFn: async () => {
      const all = await base44.entities.ConsentFormSubmission.filter({});
      return all.filter(s => s.event_id === event.id);
    },
    enabled: !!(event.consent_form_ids?.length),
  });

  const { data: todos = [] } = useQuery({
    queryKey: ['edp-todos', event.id],
    queryFn: async () => {
      const all = await base44.entities.TodoTask.filter({});
      return all.filter(t => t.event_id === event.id);
    },
    enabled: !!event.id,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['edp-actions', event.id],
    queryFn: () => base44.entities.ActionRequired.filter({ event_id: event.id }),
    enabled: !!event.id,
  });

  const { data: actionResponses = [] } = useQuery({
    queryKey: ['edp-responses', actions.map(a => a.id).join(',')],
    queryFn: async () => {
      const all = await base44.entities.ActionResponse.filter({});
      return all.filter(r => actions.some(a => a.id === r.action_required_id));
    },
    enabled: actions.length > 0,
  });

  const { data: actionAssignments = [] } = useQuery({
    queryKey: ['edp-assignments', actions.map(a => a.id).join(',')],
    queryFn: async () => {
      const all = await base44.entities.ActionAssignment.filter({});
      return all.filter(a => actions.some(ac => ac.id === a.action_required_id));
    },
    enabled: actions.length > 0,
  });

  // Find the attendance action if one exists
  const attendanceAction = actions.find(a => a.action_purpose === 'attendance');
  const attendanceAssignments = attendanceAction
    ? actionAssignments.filter(a => a.action_required_id === attendanceAction.id)
    : [];
  const attendanceResponses = attendanceAction
    ? actionResponses.filter(r => r.action_required_id === attendanceAction.id)
    : [];

  // Members shown in attendance tab
  const attendanceMembers = attendanceAction
    ? allMembers.filter(m => attendanceAssignments.some(a => a.member_id === m.id))
    : [];

  // For consent tab — members who said yes to attendance action, or all assigned
  const attendingMembers = attendanceAction
    ? allMembers.filter(m => attendanceResponses.some(r => r.member_id === m.id && (r.response_value === 'yes' || r.response_value === 'attending')))
    : [];

  const responseColor = (val) => {
    if (!val) return 'bg-gray-50 text-gray-400';
    const v = val.toLowerCase();
    if (v === 'yes' || v === 'attending') return 'bg-green-50 text-green-700';
    if (v === 'no' || v === 'not_attending') return 'bg-red-50 text-red-600';
    return 'bg-amber-50 text-amber-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7413dc] to-[#5c0fb0] px-4 pt-4 pb-5 text-white flex-shrink-0">
        <button onClick={onClose} className="text-white/70 text-sm mb-2 flex items-center gap-1">← Back</button>
        <h2 className="text-xl font-bold leading-tight">{event.title}</h2>
        <p className="text-white/70 text-sm mt-0.5">
          {format(new Date(event.start_date), 'd MMM yyyy')}
          {event.end_date && ` – ${format(new Date(event.end_date), 'd MMM yyyy')}`}
        </p>
        <p className="text-white/60 text-xs mt-0.5">{event.type}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white flex-shrink-0 overflow-x-auto scrollbar-hide">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors min-w-[72px] whitespace-nowrap ${tab === t.id ? 'text-[#7413dc] border-b-2 border-[#7413dc]' : 'text-gray-400'}`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-8">

        {/* ATTENDANCE */}
        {tab === 'attendance' && (
          <div className="space-y-3">
            {attendanceAction ? (
              <>
                <div className="flex gap-2 flex-wrap">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                    {attendanceResponses.filter(r => r.response_value === 'yes' || r.response_value === 'attending').length} attending
                  </span>
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                    {attendanceResponses.filter(r => r.response_value === 'no' || r.response_value === 'not_attending').length} not attending
                  </span>
                  <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold">
                    {attendanceMembers.length - attendanceResponses.length} not responded
                  </span>
                </div>
                {attendanceMembers.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No members assigned to this event</p>
                ) : attendanceMembers.map(member => {
                  const resp = attendanceResponses.find(r => r.member_id === member.id);
                  const val = resp?.response_value;
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex-shrink-0">
                        {val === 'yes' || val === 'attending' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> :
                         val === 'no' || val === 'not_attending' ? <XCircle className="w-5 h-5 text-red-400" /> :
                         val ? <Clock className="w-5 h-5 text-amber-400" /> :
                         <div className="w-5 h-5 rounded-full border-2 border-gray-200" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{member.full_name}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${responseColor(val)}`}>
                        {val ? val.replace('_', ' ') : 'not responded'}
                      </span>
                    </div>
                  );
                })}
              </>
            ) : (
              // No attendance action pushed — just show a plain member list from sections
              (() => {
                const sectionMembers = allMembers.filter(m => event.section_ids?.includes(m.section_id));
                return sectionMembers.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No members found for this event's sections</p>
                ) : sectionMembers.map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{member.full_name}</p>
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        )}

        {/* CONSENT */}
        {tab === 'consent' && (
          <div className="space-y-4">
            {consentForms.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No consent forms linked to this event</p>
              </div>
            ) : consentForms.map(form => {
              const formSubs = submissions.filter(s => s.form_id === form.id);
              const signed = formSubs.filter(s => s.status === 'signed' || s.status === 'complete').length;
              return (
                <div key={form.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                    <p className="font-semibold text-sm text-purple-900">{form.title}</p>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${signed === attendingMembers.length && attendingMembers.length > 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {signed}/{attendingMembers.length}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {attendingMembers.map(member => {
                      const sub = formSubs.find(s => s.member_id === member.id);
                      const status = sub?.status;
                      return (
                        <div key={member.id} className="flex items-center gap-3 px-3 py-2.5">
                          {status === 'signed' || status === 'complete' ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> :
                           status === 'pending' || status === 'awaiting_signature' ? <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" /> :
                           <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                          <span className="text-sm flex-1">{member.full_name}</span>
                          <span className="text-xs text-gray-400">
                            {status === 'signed' || status === 'complete' ? (sub?.signed_via_app ? 'Signed (App)' : 'Signed') :
                             status === 'pending' ? 'Sent' :
                             status === 'awaiting_signature' ? 'Awaiting' : 'Not sent'}
                          </span>
                        </div>
                      );
                    })}
                    {attendingMembers.length === 0 && (
                      <p className="text-xs text-gray-400 p-3 text-center">No members marked as attending yet</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TASKS */}
        {tab === 'tasks' && (
          <div className="space-y-3">
            {todos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">No tasks for this event</p>
            ) : todos.map(todo => (
              <div key={todo.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                {todo.completed
                  ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  : <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{todo.title}</p>
                  {todo.due_date && <p className="text-xs text-gray-400 mt-0.5">{format(new Date(todo.due_date), 'd MMM')}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ACTIONS */}
        {tab === 'actions' && (
          <div className="space-y-3">
            {actions.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No actions for this event</p>
              </div>
            ) : actions.map(action => {
              const responses = actionResponses.filter(r => r.action_required_id === action.id);
              return (
                <div key={action.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{action.column_title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{action.action_text}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ml-2 flex-shrink-0 ${action.is_open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {action.is_open ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  {action.deadline && (
                    <p className="text-xs text-gray-400 mb-2">Deadline: {format(new Date(action.deadline), 'd MMM yyyy')}</p>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                    <div className="text-xs font-bold text-[#7413dc]">{responses.length}</div>
                    <p className="text-xs text-gray-500">response{responses.length !== 1 ? 's' : ''}</p>
                    <div className="flex-1" />
                    <p className="text-xs text-gray-400 capitalize">{action.action_purpose?.replace('_', ' ')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}