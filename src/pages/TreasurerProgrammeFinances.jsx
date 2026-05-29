import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { XCircle, Clock, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const fmt = n => `£${(n || 0).toFixed(2)}`;
const displayEB = eb => { if (!eb) return '—'; if (eb.toLowerCase().includes('stripe')) return 'Stripe'; return eb; };
const todayStr = new Date().toISOString().split('T')[0];

export default function TreasurerProgrammeFinances() {
  const [selectedProgId, setSelectedProgId] = useState('');
  const [reminderSent, setReminderSent] = useState({});

  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes-with-cost'],
    queryFn: async () => {
      const all = await base44.entities.Programme.list('-date', 300);
      return all.filter(p => p.has_cost && (p.cost || 0) > 0);
    },
  });

  const { data: members = [] } = useQuery({ queryKey: ['members-active'], queryFn: () => base44.entities.Member.filter({ active: true }) });

  const programme = selectedProgId ? programmes.find(p => p.id === selectedProgId) : programmes[0];
  const progId = programme?.id;

  const { data: ledgerEntries = [] } = useQuery({
    queryKey: ['ledger-prog-fin', progId],
    queryFn: () => base44.entities.LedgerEntry.filter({ linked_meeting_id: progId }),
    enabled: !!progId,
  });

  const { data: paymentStatuses = [] } = useQuery({
    queryKey: ['mps-prog-fin', progId],
    queryFn: () => base44.entities.MeetingPaymentStatus.filter({ meeting_id: progId }),
    enabled: !!progId,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['actions-prog-fin', progId],
    queryFn: () => base44.entities.ActionRequired.filter({ programme_id: progId }),
    enabled: !!progId,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ['responses-prog-fin', progId, actions.map(a => a.id).join(',')],
    queryFn: async () => {
      if (!actions.length) return [];
      const all = await base44.entities.ActionResponse.filter({});
      return all.filter(r => actions.some(a => a.id === r.action_required_id));
    },
    enabled: actions.length > 0,
  });

  const { data: sectionMembers = [] } = useQuery({
    queryKey: ['section-members-prog-fin', programme?.section_id],
    queryFn: () => base44.entities.Member.filter({ section_id: programme.section_id, active: true }),
    enabled: !!programme?.section_id,
  });

  const attendanceAction = actions.find(a => a.action_purpose === 'attendance');
  const attendingMemberIds = attendanceAction
    ? [...new Set(responses.filter(r => r.action_required_id === attendanceAction.id && ['yes', 'Yes, attending', 'attending'].includes(r.response_value)).map(r => r.member_id))]
    : sectionMembers.map(m => m.id);

  const paidCount = paymentStatuses.filter(ps => ps.meeting_id === progId && ps.status === 'paid').length;
  const totalCollected = ledgerEntries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpenses = (programme?.estimated_expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
  const surplus = totalCollected - totalExpenses;

  const unpaidMembers = attendingMemberIds
    .map(id => {
      const ps = paymentStatuses.find(p => p.member_id === id);
      if (ps?.status === 'paid') return null;
      const isOverdue = programme?.payment_deadline && todayStr > programme.payment_deadline;
      return { memberId: id, status: isOverdue ? 'overdue' : 'unpaid' };
    })
    .filter(Boolean);

  const sendReminder = async (memberId) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    const emails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
    for (const email of emails) {
      await base44.integrations.Core.SendEmail({ to: email, subject: `Payment reminder: ${programme?.title}`, body: `Reminder: Payment of ${fmt(programme?.cost)} for ${programme?.title} is outstanding. Please log in to the parent portal to pay.` });
    }
    try {
      if (member.parent_one_email) await base44.functions.invoke('sendPushNotification', { email: member.parent_one_email, title: 'Payment reminder', body: `Payment of ${fmt(programme?.cost)} for ${programme?.title} is outstanding.` });
    } catch {}
    setReminderSent(prev => ({ ...prev, [memberId]: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
    toast.success('Reminder sent');
  };

  return (
    <TreasurerLayout title="Programme Finances">
      <div className="mb-6">
        <Select value={selectedProgId || (programmes[0]?.id || '')} onValueChange={setSelectedProgId}>
          <SelectTrigger className="max-w-md"><SelectValue placeholder="Select meeting..." /></SelectTrigger>
          <SelectContent>
            {programmes.map(p => <SelectItem key={p.id} value={p.id}>{p.title} — {p.date} ({fmt(p.cost)})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!programme ? (
        <Card><CardContent className="py-12 text-center text-gray-500">No meetings with a cost found.</CardContent></Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">{programme.title} — Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div><p className="text-xs text-gray-500">Date</p><p className="font-semibold">{programme.date}</p></div>
                <div><p className="text-xs text-gray-500">Cost / member</p><p className="font-semibold">{fmt(programme.cost)}</p></div>
                <div><p className="text-xs text-gray-500">Attending</p><p className="font-semibold">{attendingMemberIds.length}</p></div>
                <div><p className="text-xs text-gray-500">Paid</p><p className="font-semibold text-green-600">{paidCount}</p></div>
                <div><p className="text-xs text-gray-500">Total Collected</p><p className="font-semibold text-green-600">{fmt(totalCollected)}</p></div>
                <div><p className="text-xs text-gray-500">Est. Expenses</p><p className="font-semibold text-red-600">{fmt(totalExpenses)}</p></div>
                <div className="col-span-2"><p className="text-xs text-gray-500">Surplus / Shortfall</p><p className={`font-bold text-lg ${surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>{surplus >= 0 ? '+' : ''}{fmt(surplus)}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Payments — {programme.title}</CardTitle></CardHeader>
            <CardContent>
              {ledgerEntries.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No ledger entries for this meeting yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-2 font-semibold text-gray-600">Date</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-600">Member</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-600">Amount</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-600">Reference</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-600">Entered by</th>
                    </tr></thead>
                    <tbody>
                      {ledgerEntries.filter(e => e.type === 'income').map(e => {
                        const member = members.find(m => m.id === e.linked_member_id);
                        return (
                          <tr key={e.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-2 text-gray-600">{e.date}</td>
                            <td className="py-2 px-2">{member?.full_name || '—'}</td>
                            <td className="py-2 px-2 text-right font-semibold text-green-600">{fmt(e.amount)}</td>
                            <td className="py-2 px-2 text-gray-400 text-xs font-mono">{e.reference || '—'}</td>
                            <td className="py-2 px-2 text-gray-500 text-xs">{displayEB(e.entered_by)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {unpaidMembers.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Outstanding Payments ({unpaidMembers.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y">
                  {unpaidMembers.map(({ memberId, status }) => {
                    const member = members.find(m => m.id === memberId);
                    const reminder = reminderSent[memberId];
                    return (
                      <div key={memberId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="flex-1"><p className="font-medium text-sm">{member?.full_name || 'Unknown'}</p></div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {status === 'overdue' ? (
                            <Badge className="bg-red-100 text-red-700 border border-red-200 flex items-center gap-1"><Clock className="w-3 h-3" /> Overdue</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1"><XCircle className="w-3 h-3" /> Unpaid</Badge>
                          )}
                          {reminder ? <span className="text-xs text-gray-400">Sent {reminder}</span> : (
                            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => sendReminder(memberId)}>
                              <Bell className="w-3 h-3" /> Send reminder
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </TreasurerLayout>
  );
}