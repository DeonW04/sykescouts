import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Clock, FileText, ListChecks, Bell, Users, CreditCard, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import PaymentVerifyDialog from '@/components/leader/PaymentVerifyDialog';

const fmt = n => `£${(n || 0).toFixed(2)}`;
const ATTENDING_VALUES = new Set(['yes', 'Yes, attending', 'attending']);

export default function MeetingDetailPanel({ programme, sections, onClose }) {
  const queryClient = useQueryClient();
  const section = sections?.find(s => s.id === programme.section_id);
  const hasCost = programme.has_cost && (programme.cost || 0) > 0;
  const [tab, setTab] = useState(hasCost ? 'finances' : 'attendance');
  const [newTask, setNewTask] = useState('');
  const [expandedMember, setExpandedMember] = useState(null);
  const [verifyFor, setVerifyFor] = useState(null);
  const [reminderSent, setReminderSent] = useState({});

  const TABS = [
    ...(hasCost ? [{ id: 'finances', label: 'Finances', icon: CreditCard }] : []),
    { id: 'attendance', label: 'Attendance', icon: Users },
    { id: 'consent', label: 'Consent', icon: FileText },
    { id: 'tasks', label: 'Tasks', icon: ListChecks },
    { id: 'actions', label: 'Actions', icon: Bell },
  ];

  const { data: members = [] } = useQuery({ queryKey: ['mdp-members', section?.id], queryFn: () => base44.entities.Member.filter({ section_id: section.id, active: true }), enabled: !!section?.id });
  const { data: allAttendances = [] } = useQuery({ queryKey: ['mdp-attendance', programme.id], queryFn: async () => { const all = await base44.entities.Attendance.filter({ section_id: section?.id }); return all.filter(a => a.date === programme.date); }, enabled: !!section?.id });
  const { data: consentForms = [] } = useQuery({ queryKey: ['mdp-forms', programme.consent_form_ids], queryFn: async () => { if (!programme.consent_form_ids?.length) return []; const all = await base44.entities.ConsentForm.filter({}); return all.filter(f => programme.consent_form_ids.includes(f.id)); }, enabled: !!(programme.consent_form_ids?.length) });
  const { data: submissions = [] } = useQuery({ queryKey: ['mdp-submissions', programme.id], queryFn: async () => { const all = await base44.entities.ConsentFormSubmission.filter({}); return all.filter(s => s.programme_id === programme.id); }, enabled: !!(programme.consent_form_ids?.length) });
  const { data: todos = [] } = useQuery({ queryKey: ['mdp-todos', programme.id], queryFn: async () => { const all = await base44.entities.TodoTask.filter({}); return all.filter(t => t.programme_id === programme.id); }, enabled: !!programme.id });
  const { data: actions = [] } = useQuery({ queryKey: ['mdp-actions', programme.id], queryFn: () => base44.entities.ActionRequired.filter({ programme_id: programme.id }), enabled: !!programme.id });
  const { data: actionResponses = [] } = useQuery({ queryKey: ['mdp-responses', actions.map(a => a.id).join(',')], queryFn: async () => { const all = await base44.entities.ActionResponse.filter({}); return all.filter(r => actions.some(a => a.id === r.action_required_id)); }, enabled: actions.length > 0 });
  const { data: currentUser } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  // Finances data
  const { data: paymentStatuses = [], refetch: refetchPS } = useQuery({
    queryKey: ['mdp-payment-statuses', programme.id],
    queryFn: () => base44.entities.MeetingPaymentStatus.filter({ meeting_id: programme.id }),
    enabled: !!programme.id && hasCost,
  });
  const { data: ledgerIncome = 0 } = useQuery({
    queryKey: ['mdp-ledger-income', programme.id],
    queryFn: async () => {
      const entries = await base44.entities.LedgerEntry.filter({ linked_meeting_id: programme.id });
      return entries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
    },
    enabled: !!programme.id && hasCost,
  });

  const addTaskMutation = useMutation({ mutationFn: (title) => base44.entities.TodoTask.create({ title, programme_id: programme.id, completed: false }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mdp-todos', programme.id] }); setNewTask(''); toast.success('Task added'); } });
  const toggleTaskMutation = useMutation({ mutationFn: ({ id, completed }) => base44.entities.TodoTask.update(id, { completed }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mdp-todos', programme.id] }) });
  const deleteTaskMutation = useMutation({ mutationFn: (id) => base44.entities.TodoTask.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mdp-todos', programme.id] }) });

  // Attendance action for finances tab
  const attendanceAction = actions.find(a => a.action_purpose === 'attendance');
  const attendingMembers = attendanceAction
    ? members.filter(m => actionResponses.some(r => r.action_required_id === attendanceAction.id && r.member_id === m.id && ATTENDING_VALUES.has(r.response_value)))
    : members;

  const todayStr = new Date().toISOString().split('T')[0];
  const getPayStatus = (memberId) => {
    const ps = paymentStatuses.find(p => p.member_id === memberId);
    if (ps?.status === 'paid') return { status: 'paid', ps };
    const deadline = programme?.payment_deadline;
    const isOverdue = (deadline && todayStr > deadline) || (!deadline && programme?.date && todayStr > programme.date);
    return { status: isOverdue ? 'overdue' : 'unpaid', ps: null };
  };

  const paidCount = attendingMembers.filter(m => getPayStatus(m.id).status === 'paid').length;

  const getAttendance = (memberId) => allAttendances.find(a => a.member_id === memberId);
  const present = allAttendances.filter(a => a.status === 'present').length;
  const absent = allAttendances.filter(a => a.status === 'absent').length;
  const apologies = allAttendances.filter(a => a.status === 'apologies').length;
  const doneTasks = todos.filter(t => t.completed).length;

  const sendReminder = async (member) => {
    const emails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
    for (const email of emails) {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `Payment reminder: ${programme.title}`,
        body: `Reminder: Payment of ${fmt(programme.cost)} for ${programme.title} is outstanding. Please log in to the parent portal to pay.`,
      });
    }
    try {
      if (member.parent_one_email) {
        await base44.functions.invoke('sendPushNotification', { email: member.parent_one_email, title: 'Payment reminder', body: `Payment of ${fmt(programme.cost)} for ${programme.title} is outstanding.` });
      }
    } catch {}
    setReminderSent(prev => ({ ...prev, [member.id]: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
    toast.success('Reminder sent');
  };

  const handleConfirmPayment = async (member, payment) => {
    const amount = payment?.amount || programme.cost || 0;
    const cardBrand = payment?.card_brand || '';
    const cardLast4 = payment?.card_last4 || '';
    const reference = payment?.payment_intent_id;
    await base44.entities.LedgerEntry.create({
      date: todayStr, type: 'income', category: 'event_payments', amount,
      description: `Stripe payment for ${programme.title} — ${member.full_name}`,
      reference,
      linked_member_id: member.id, linked_meeting_id: programme.id, entered_by: currentUser?.email,
    });
    const existing = paymentStatuses.find(ps => ps.member_id === member.id);
    if (existing) {
      await base44.entities.MeetingPaymentStatus.update(existing.id, { status: 'paid', paid_at: todayStr, stripe_payment_intent_id: reference, card_brand: cardBrand, card_last4: cardLast4 });
    } else {
      await base44.entities.MeetingPaymentStatus.create({ meeting_id: programme.id, member_id: member.id, status: 'paid', paid_at: todayStr, stripe_payment_intent_id: reference, card_brand: cardBrand, card_last4: cardLast4 });
    }
    await refetchPS();
    queryClient.invalidateQueries({ queryKey: ['mdp-ledger-income', programme.id] });
    setVerifyFor(null);
    toast.success('Payment registered successfully');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="bg-gradient-to-br from-[#004851] to-green-700 px-4 pt-4 pb-5 text-white flex-shrink-0">
        <button onClick={onClose} className="text-white/70 text-sm mb-2 flex items-center gap-1">← Back</button>
        <h2 className="text-xl font-bold leading-tight">{programme.title}</h2>
        <p className="text-white/70 text-sm mt-0.5">{format(new Date(programme.date), 'EEEE, d MMMM yyyy')}</p>
        {section && <p className="text-white/60 text-xs mt-0.5">{section.display_name}{hasCost ? ` · £${(programme.cost||0).toFixed(2)}/person` : ''}</p>}
      </div>

      <div className="flex border-b border-gray-200 bg-white flex-shrink-0 overflow-x-auto scrollbar-hide">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors min-w-[72px] whitespace-nowrap ${tab === t.id ? 'text-[#004851] border-b-2 border-[#004851]' : 'text-gray-400'}`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-8">

        {/* FINANCES */}
        {tab === 'finances' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Payment Summary</p>
              <p className="text-lg font-bold text-gray-900">{paidCount} of {attendingMembers.length} paid</p>
              <p className="text-sm text-gray-500">{fmt(ledgerIncome)} of {fmt(attendingMembers.length * (programme.cost || 0))} collected</p>
            </div>

            {attendingMembers.length === 0 ? (
              <div className="text-center py-12"><CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No members confirmed attending yet</p></div>
            ) : (
              <div className="space-y-2">
                {attendingMembers.map(member => {
                  const { status, ps } = getPayStatus(member.id);
                  const isExpanded = expandedMember === member.id;
                  const reminder = reminderSent[member.id];
                  return (
                    <div key={member.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <button onClick={() => setExpandedMember(isExpanded ? null : member.id)} className="w-full flex items-center gap-3 p-4 text-left">
                        <div className="flex-1 min-w-0"><p className="font-semibold text-sm text-gray-900">{member.full_name}</p></div>
                        {status === 'paid' ? (
                          <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0"><CheckCircle2 className="w-3 h-3" /> Paid</span>
                        ) : status === 'overdue' ? (
                          <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0"><Clock className="w-3 h-3" /> Overdue</span>
                        ) : (
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0"><XCircle className="w-3 h-3" /> Unpaid</span>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-300 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                          {status === 'paid' && ps ? (
                            <div className="pt-3 space-y-1.5 text-sm">
                              {ps.paid_at && <p className="text-gray-600">Paid: <span className="font-medium text-gray-900">{format(new Date(ps.paid_at), 'd MMM yyyy')}</span></p>}
                              {ps.card_brand && <p className="text-gray-600">Card: <span className="font-medium text-gray-900 capitalize">{ps.card_brand} ···· {ps.card_last4}</span></p>}
                              <p className="text-gray-600">Amount: <span className="font-medium text-green-700">{fmt(programme.cost)}</span></p>
                            </div>
                          ) : (
                            <div className="pt-3 space-y-3">
                              <div className="flex flex-col gap-2">
                                {reminder ? (
                                  <p className="text-xs text-gray-400 text-center">Reminder sent at {reminder}</p>
                                ) : (
                                  <button onClick={() => sendReminder(member)} className="w-full py-2.5 border border-[#004851] text-[#004851] rounded-xl text-sm font-semibold">Send reminder</button>
                                )}
                                <button onClick={() => setVerifyFor(member)} className="w-full py-2.5 bg-[#004851] text-white rounded-xl text-sm font-semibold">Register payment by ID</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ATTENDANCE */}
        {tab === 'attendance' && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">{present} present</span>
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">{absent} absent</span>
              <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">{apologies} apologies</span>
              <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold">{members.length - allAttendances.length} not recorded</span>
            </div>
            {members.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No members in this section</p> :
             members.map(member => {
               const att = getAttendance(member.id);
               return (
                 <div key={member.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                   <div className="flex-shrink-0">
                     {att?.status === 'present' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> :
                      att?.status === 'absent' ? <XCircle className="w-5 h-5 text-red-400" /> :
                      att?.status === 'apologies' ? <Clock className="w-5 h-5 text-amber-400" /> :
                      att?.status === 'excused' ? <Clock className="w-5 h-5 text-blue-400" /> :
                      <div className="w-5 h-5 rounded-full border-2 border-gray-200" />}
                   </div>
                   <span className="font-medium text-sm flex-1">{member.full_name}</span>
                   <span className={`text-xs px-2 py-1 rounded-full font-semibold ${att?.status === 'present' ? 'bg-green-50 text-green-700' : att?.status === 'absent' ? 'bg-red-50 text-red-600' : att?.status === 'apologies' ? 'bg-amber-50 text-amber-600' : att?.status === 'excused' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>{att?.status || 'Not recorded'}</span>
                 </div>
               );
             })}
          </div>
        )}

        {/* CONSENT */}
        {tab === 'consent' && (
          <div className="space-y-4">
            {consentForms.length === 0 ? <div className="text-center py-12"><FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No consent forms linked to this meeting</p></div>
             : consentForms.map(form => {
               const formSubs = submissions.filter(s => s.form_id === form.id);
               const signed = formSubs.filter(s => s.status === 'signed' || s.status === 'complete').length;
               return (
                 <div key={form.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                   <div className="p-3 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
                     <p className="font-semibold text-sm text-teal-900">{form.title}</p>
                     <span className={`text-xs px-2 py-1 rounded-full font-bold ${signed === members.length && members.length > 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{signed}/{members.length}</span>
                   </div>
                   <div className="divide-y divide-gray-50">
                     {members.map(member => {
                       const sub = formSubs.find(s => s.member_id === member.id);
                       const status = sub?.status;
                       return (
                         <div key={member.id} className="flex items-center gap-3 px-3 py-2.5">
                           {status === 'signed' || status === 'complete' ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : status === 'pending' || status === 'awaiting_signature' ? <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                           <span className="text-sm flex-1">{member.full_name}</span>
                           <span className="text-xs text-gray-400">{status === 'signed' || status === 'complete' ? (sub?.signed_via_app ? 'Signed (App)' : 'Signed') : status === 'pending' ? 'Sent' : status === 'awaiting_signature' ? 'Awaiting' : 'Not sent'}</span>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               );
             })}
          </div>
        )}

        {/* TASKS */}
        {tab === 'tasks' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && newTask.trim() && addTaskMutation.mutate(newTask.trim())} placeholder="Add a task..." className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#004851] bg-white" />
              <button onClick={() => newTask.trim() && addTaskMutation.mutate(newTask.trim())} disabled={!newTask.trim() || addTaskMutation.isPending} className="w-10 h-10 bg-[#004851] text-white rounded-xl flex items-center justify-center disabled:opacity-40 flex-shrink-0"><Plus className="w-4 h-4" /></button>
            </div>
            {todos.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No tasks yet</p> : (
              <>
                <p className="text-xs text-gray-400 font-semibold">{doneTasks}/{todos.length} complete</p>
                {todos.map(todo => (
                  <div key={todo.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <button onClick={() => toggleTaskMutation.mutate({ id: todo.id, completed: !todo.completed })} className="flex-shrink-0">
                      {todo.completed ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{todo.title}</p>
                      {todo.due_date && <p className="text-xs text-gray-400 mt-0.5">{format(new Date(todo.due_date), 'd MMM')}</p>}
                    </div>
                    <button onClick={() => deleteTaskMutation.mutate(todo.id)} className="text-gray-300 hover:text-red-400 flex-shrink-0 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ACTIONS */}
        {tab === 'actions' && (
          <div className="space-y-3">
            {actions.length === 0 ? <div className="text-center py-12"><Bell className="w-10 h-10 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No actions for this meeting</p></div>
             : actions.map(action => {
               const responses = actionResponses.filter(r => r.action_required_id === action.id);
               return (
                 <div key={action.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                   <div className="flex items-start justify-between mb-2">
                     <div className="flex-1 min-w-0"><p className="font-semibold text-sm text-gray-900">{action.column_title}</p><p className="text-xs text-gray-500 mt-0.5">{action.action_text}</p></div>
                     <span className={`text-xs px-2 py-1 rounded-full font-semibold ml-2 flex-shrink-0 ${action.is_open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{action.is_open ? 'Open' : 'Closed'}</span>
                   </div>
                   {action.deadline && <p className="text-xs text-gray-400 mb-2">Deadline: {format(new Date(action.deadline), 'd MMM yyyy')}</p>}
                   <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                     <div className="text-xs font-bold text-[#004851]">{responses.length}</div>
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

      {verifyFor && (
        <PaymentVerifyDialog
          member={verifyFor}
          expectedAmount={programme.cost || 0}
          meetingId={programme.id}
          accent="#004851"
          onConfirm={({ payment }) => handleConfirmPayment(verifyFor, payment)}
          onClose={() => setVerifyFor(null)}
        />
      )}
    </div>
  );
}