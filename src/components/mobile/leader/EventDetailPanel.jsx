import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Clock, FileText, ListChecks, Bell, Users, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import PaymentVerifyDialog from '@/components/leader/PaymentVerifyDialog';

const fmt = n => `£${(n || 0).toFixed(2)}`;
const ATTENDING_VALUES = new Set(['yes', 'Yes, attending', 'attending']);

export default function EventDetailPanel({ event, onClose }) {
  const queryClient = useQueryClient();
  const hasCost = (event.cost || 0) > 0;
  const [tab, setTab] = useState(hasCost ? 'finances' : 'attendance');
  const [expandedMember, setExpandedMember] = useState(null);
  const [verifyFor, setVerifyFor] = useState(null);
  const [reminderSent, setReminderSent] = useState({});

  const TABS = [
    ...(hasCost ? [{ id: 'finances', label: 'Finances', icon: CreditCard }] : []),
    { id: 'attendance', label: 'Attendees', icon: Users },
    { id: 'consent', label: 'Consent', icon: FileText },
    { id: 'tasks', label: 'Tasks', icon: ListChecks },
    { id: 'actions', label: 'Actions', icon: Bell },
  ];

  const { data: allMembers = [] } = useQuery({ queryKey: ['edp-members'], queryFn: () => base44.entities.Member.filter({ active: true }), enabled: !!event.id });
  const { data: consentForms = [] } = useQuery({ queryKey: ['edp-forms', event.consent_form_ids], queryFn: async () => { if (!event.consent_form_ids?.length) return []; const all = await base44.entities.ConsentForm.filter({}); return all.filter(f => event.consent_form_ids.includes(f.id)); }, enabled: !!(event.consent_form_ids?.length) });
  const { data: submissions = [] } = useQuery({ queryKey: ['edp-submissions', event.id], queryFn: async () => { const all = await base44.entities.ConsentFormSubmission.filter({}); return all.filter(s => s.event_id === event.id); }, enabled: !!(event.consent_form_ids?.length) });
  const { data: todos = [] } = useQuery({ queryKey: ['edp-todos', event.id], queryFn: async () => { const all = await base44.entities.TodoTask.filter({}); return all.filter(t => t.event_id === event.id); }, enabled: !!event.id });
  const { data: actions = [] } = useQuery({ queryKey: ['edp-actions', event.id], queryFn: () => base44.entities.ActionRequired.filter({ event_id: event.id }), enabled: !!event.id });
  const { data: actionResponses = [] } = useQuery({ queryKey: ['edp-responses', actions.map(a => a.id).join(',')], queryFn: async () => { const all = await base44.entities.ActionResponse.filter({}); return all.filter(r => actions.some(a => a.id === r.action_required_id)); }, enabled: actions.length > 0 });
  const { data: actionAssignments = [] } = useQuery({ queryKey: ['edp-assignments', actions.map(a => a.id).join(',')], queryFn: async () => { const all = await base44.entities.ActionAssignment.filter({}); return all.filter(a => actions.some(ac => ac.id === a.action_required_id)); }, enabled: actions.length > 0 });
  const { data: currentUser } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  // Finances data
  const { data: paymentStatuses = [], refetch: refetchPS } = useQuery({
    queryKey: ['edp-payment-statuses', event.id],
    queryFn: () => base44.entities.EventPaymentStatus.filter({ event_id: event.id }),
    enabled: !!event.id && hasCost,
  });
  const { data: ledgerIncome = 0 } = useQuery({
    queryKey: ['edp-ledger-income', event.id],
    queryFn: async () => {
      const entries = await base44.entities.LedgerEntry.filter({ linked_event_id: event.id });
      return entries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
    },
    enabled: !!event.id && hasCost,
  });

  const attendanceAction = actions.find(a => a.action_purpose === 'attendance');
  const attendanceAssignments = attendanceAction ? actionAssignments.filter(a => a.action_required_id === attendanceAction.id) : [];
  const attendanceResponses = attendanceAction ? actionResponses.filter(r => r.action_required_id === attendanceAction.id) : [];
  const attendanceMembers = attendanceAction ? allMembers.filter(m => attendanceAssignments.some(a => a.member_id === m.id)) : [];
  const attendingMembers = attendanceAction
    ? allMembers.filter(m => attendanceResponses.some(r => r.member_id === m.id && ATTENDING_VALUES.has(r.response_value)))
    : [];

  const todayStr = new Date().toISOString().split('T')[0];
  const getPayStatus = (memberId) => {
    const ps = paymentStatuses.find(p => p.member_id === memberId);
    if (ps?.status === 'paid') return { status: 'paid', ps };
    const deadline = event?.payment_deadline;
    const endDate = (event?.end_date || event?.start_date)?.split('T')[0];
    const isOverdue = (deadline && todayStr > deadline) || (!deadline && endDate && todayStr > endDate);
    return { status: isOverdue ? 'overdue' : 'unpaid', ps: null };
  };

  const paidCount = attendingMembers.filter(m => getPayStatus(m.id).status === 'paid').length;

  const sendReminder = async (member) => {
    const emails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
    for (const email of emails) {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `Payment reminder: ${event.title}`,
        body: `Reminder: Payment of ${fmt(event.cost)} for ${event.title} is outstanding. Please log in to the parent portal to pay.`,
      });
    }
    try {
      if (member.parent_one_email) {
        await base44.functions.invoke('sendPushNotification', { email: member.parent_one_email, title: 'Payment reminder', body: `Payment of ${fmt(event.cost)} for ${event.title} is outstanding.` });
      }
    } catch {}
    setReminderSent(prev => ({ ...prev, [member.id]: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
    toast.success('Reminder sent');
  };

  const handleConfirmPayment = async (member, payment) => {
    const amount = payment?.amount || event.cost || 0;
    const cardBrand = payment?.card_brand || '';
    const cardLast4 = payment?.card_last4 || '';
    const reference = payment?.payment_intent_id;

    // Create ledger entry
    await base44.entities.LedgerEntry.create({
      date: todayStr,
      type: 'income',
      category: 'event_payments',
      amount,
      description: `Stripe payment for ${event.title} — ${member.full_name}`,
      reference,
      linked_member_id: member.id,
      linked_event_id: event.id,
      entered_by: currentUser?.email,
    });

    // Update or create EventPaymentStatus
    const existing = paymentStatuses.find(ps => ps.member_id === member.id);
    if (existing) {
      await base44.entities.EventPaymentStatus.update(existing.id, {
        status: 'paid', paid_at: todayStr, stripe_payment_intent_id: reference, card_brand: cardBrand, card_last4: cardLast4,
      });
    } else {
      await base44.entities.EventPaymentStatus.create({
        event_id: event.id, member_id: member.id, status: 'paid', paid_at: todayStr, stripe_payment_intent_id: reference, card_brand: cardBrand, card_last4: cardLast4,
      });
    }

    await refetchPS();
    queryClient.invalidateQueries({ queryKey: ['edp-ledger-income', event.id] });
    setVerifyFor(null);
    toast.success('Payment registered successfully');
  };

  const responseColor = (val) => {
    if (!val) return 'bg-gray-50 text-gray-400';
    const v = val.toLowerCase();
    if (v === 'yes' || v === 'attending') return 'bg-green-50 text-green-700';
    if (v === 'no' || v === 'not_attending') return 'bg-red-50 text-red-600';
    return 'bg-amber-50 text-amber-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="bg-gradient-to-br from-[#7413dc] to-[#5c0fb0] px-4 pt-4 pb-5 text-white flex-shrink-0">
        <button onClick={onClose} className="text-white/70 text-sm mb-2 flex items-center gap-1">← Back</button>
        <h2 className="text-xl font-bold leading-tight">{event.title}</h2>
        <p className="text-white/70 text-sm mt-0.5">
          {format(new Date(event.start_date), 'd MMM yyyy')}
          {event.end_date && ` – ${format(new Date(event.end_date), 'd MMM yyyy')}`}
        </p>
        <p className="text-white/60 text-xs mt-0.5">{event.type}{hasCost ? ` · £${(event.cost||0).toFixed(2)}/person` : ''}</p>
      </div>

      <div className="flex border-b border-gray-200 bg-white flex-shrink-0 overflow-x-auto scrollbar-hide">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors min-w-[72px] whitespace-nowrap ${tab === t.id ? 'text-[#7413dc] border-b-2 border-[#7413dc]' : 'text-gray-400'}`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-8">

        {/* FINANCES */}
        {tab === 'finances' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Payment Summary</p>
              <p className="text-lg font-bold text-gray-900">{paidCount} of {attendingMembers.length} paid</p>
              <p className="text-sm text-gray-500">{fmt(ledgerIncome)} of {fmt(attendingMembers.length * (event.cost || 0))} collected</p>
            </div>

            {attendingMembers.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No members have confirmed attendance yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attendingMembers.map(member => {
                  const { status, ps } = getPayStatus(member.id);
                  const isExpanded = expandedMember === member.id;
                  const reminder = reminderSent[member.id];

                  return (
                    <div key={member.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <button
                        onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                        className="w-full flex items-center gap-3 p-4 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900">{member.full_name}</p>
                        </div>
                        {status === 'paid' ? (
                          <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        ) : status === 'overdue' ? (
                          <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
                            <Clock className="w-3 h-3" /> Overdue
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
                            <XCircle className="w-3 h-3" /> Unpaid
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-300 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                          {status === 'paid' && ps ? (
                            <div className="pt-3 space-y-1.5 text-sm">
                              {ps.paid_at && <p className="text-gray-600">Paid: <span className="font-medium text-gray-900">{format(new Date(ps.paid_at), 'd MMM yyyy')}</span></p>}
                              {ps.card_brand && <p className="text-gray-600">Card: <span className="font-medium text-gray-900 capitalize">{ps.card_brand} ···· {ps.card_last4}</span></p>}
                              <p className="text-gray-600">Amount: <span className="font-medium text-green-700">{fmt(event.cost)}</span></p>
                            </div>
                          ) : (
                            <div className="pt-3 space-y-3">
                              <div className="flex flex-col gap-2">
                                {reminder ? (
                                  <p className="text-xs text-gray-400 text-center">Reminder sent at {reminder}</p>
                                ) : (
                                  <button
                                    onClick={() => sendReminder(member)}
                                    className="w-full py-2.5 border border-[#7413dc] text-[#7413dc] rounded-xl text-sm font-semibold"
                                  >
                                    Send reminder
                                  </button>
                                )}
                                <button
                                  onClick={() => setVerifyFor(member)}
                                  className="w-full py-2.5 bg-[#7413dc] text-white rounded-xl text-sm font-semibold"
                                >
                                  Register payment by ID
                                </button>
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
            {attendanceAction ? (
              <>
                <div className="flex gap-2 flex-wrap">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">{attendanceResponses.filter(r => r.response_value === 'yes' || r.response_value === 'attending').length} attending</span>
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">{attendanceResponses.filter(r => r.response_value === 'no' || r.response_value === 'not_attending').length} not attending</span>
                  <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold">{attendanceMembers.length - attendanceResponses.length} not responded</span>
                </div>
                {attendanceMembers.map(member => {
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
                      <div className="flex-1 min-w-0"><p className="font-medium text-sm">{member.full_name}</p></div>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${responseColor(val)}`}>{val ? val.replace('_', ' ') : 'not responded'}</span>
                    </div>
                  );
                })}
              </>
            ) : (
              (() => {
                const sectionMembers = allMembers.filter(m => event.section_ids?.includes(m.section_id));
                return sectionMembers.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No members found for this event's sections</p>
                ) : sectionMembers.map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex-1 min-w-0"><p className="font-medium text-sm">{member.full_name}</p></div>
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
              <div className="text-center py-12"><FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No consent forms linked to this event</p></div>
            ) : consentForms.map(form => {
              const formSubs = submissions.filter(s => s.form_id === form.id);
              const signed = formSubs.filter(s => s.status === 'signed' || s.status === 'complete').length;
              return (
                <div key={form.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                    <p className="font-semibold text-sm text-purple-900">{form.title}</p>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${signed === attendingMembers.length && attendingMembers.length > 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{signed}/{attendingMembers.length}</span>
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
                          <span className="text-xs text-gray-400">{status === 'signed' || status === 'complete' ? (sub?.signed_via_app ? 'Signed (App)' : 'Signed') : status === 'pending' ? 'Sent' : status === 'awaiting_signature' ? 'Awaiting' : 'Not sent'}</span>
                        </div>
                      );
                    })}
                    {attendingMembers.length === 0 && <p className="text-xs text-gray-400 p-3 text-center">No members marked as attending yet</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TASKS */}
        {tab === 'tasks' && (
          <div className="space-y-3">
            {todos.length === 0 ? <p className="text-sm text-gray-400 text-center py-12">No tasks for this event</p> :
             todos.map(todo => (
              <div key={todo.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                {todo.completed ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />}
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
              <div className="text-center py-12"><Bell className="w-10 h-10 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No actions for this event</p></div>
            ) : actions.map(action => {
              const responses = actionResponses.filter(r => r.action_required_id === action.id);
              return (
                <div key={action.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{action.column_title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{action.action_text}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ml-2 flex-shrink-0 ${action.is_open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{action.is_open ? 'Open' : 'Closed'}</span>
                  </div>
                  {action.deadline && <p className="text-xs text-gray-400 mb-2">Deadline: {format(new Date(action.deadline), 'd MMM yyyy')}</p>}
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

      {verifyFor && (
        <PaymentVerifyDialog
          member={verifyFor}
          expectedAmount={event.cost || 0}
          eventId={event.id}
          accent="#7413dc"
          onConfirm={({ payment }) => handleConfirmPayment(verifyFor, payment)}
          onClose={() => setVerifyFor(null)}
        />
      )}
    </div>
  );
}