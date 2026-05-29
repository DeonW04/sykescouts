import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const INTERVAL_LABELS = { '4_months': 'Every 4 months', '6_months': 'Every 6 months', yearly: 'Yearly' };
const todayStr = new Date().toISOString().split('T')[0];
const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const getStatus = (nextDue) => {
  if (!nextDue) return 'unknown';
  if (nextDue < todayStr) return 'overdue';
  if (nextDue <= in7Days) return 'due_soon';
  return 'active';
};

const STATUS_CONFIG = {
  active: { label: 'Active', className: 'bg-green-100 text-green-700 border-green-200' },
  due_soon: { label: 'Due soon', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700 border-red-200' },
  unknown: { label: 'Unknown', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export default function TreasurerRecurringPayments() {
  const [filterSection, setFilterSection] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState('next_subs_due');
  const [sortDir, setSortDir] = useState('asc');
  const [reminderSent, setReminderSent] = useState({});

  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });
  const { data: members = [] } = useQuery({ queryKey: ['members-active'], queryFn: () => base44.entities.Member.filter({ active: true }) });

  const subscribers = useMemo(() => members.filter(m => m.stripe_subscription_id), [members]);

  const filtered = useMemo(() => {
    let result = subscribers.filter(m => {
      const matchSection = filterSection === 'all' || m.section_id === filterSection;
      const status = getStatus(m.next_subs_due);
      const matchStatus = filterStatus === 'all' || status === filterStatus;
      return matchSection && matchStatus;
    });
    result.sort((a, b) => {
      const av = sortField === 'full_name' ? (a.full_name || '') : sortField === 'section' ? (a.section_id || '') : (a.next_subs_due || '9999');
      const bv = sortField === 'full_name' ? (b.full_name || '') : sortField === 'section' ? (b.section_id || '') : (b.next_subs_due || '9999');
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [subscribers, filterSection, filterStatus, sortField, sortDir]);

  const toggleSort = field => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  const totalActive = subscribers.filter(m => getStatus(m.next_subs_due) === 'active').length;
  const totalDueSoon = subscribers.filter(m => getStatus(m.next_subs_due) === 'due_soon').length;
  const totalOverdue = subscribers.filter(m => getStatus(m.next_subs_due) === 'overdue').length;

  const sendReminder = async (member) => {
    const emails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
    for (const email of emails) {
      await base44.integrations.Core.SendEmail({ to: email, subject: 'Scout subscription payment reminder', body: `Your Scout subscription payment is due. Please log in to your account to ensure your payment method is up to date.` });
    }
    try {
      if (member.parent_one_email) await base44.functions.invoke('sendPushNotification', { email: member.parent_one_email, title: 'Subscription reminder', body: 'Your Scout subscription payment is due.' });
    } catch {}
    setReminderSent(prev => ({ ...prev, [member.id]: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
    toast.success('Reminder sent');
  };

  return (
    <TreasurerLayout title="Recurring Payments">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-green-50 border-0"><CardContent className="p-4 text-center"><p className="text-xs text-gray-500">Active</p><p className="text-2xl font-bold text-green-700">{totalActive}</p></CardContent></Card>
        <Card className="bg-amber-50 border-0"><CardContent className="p-4 text-center"><p className="text-xs text-gray-500">Due within 7 days</p><p className="text-2xl font-bold text-amber-700">{totalDueSoon}</p></CardContent></Card>
        <Card className="bg-red-50 border-0"><CardContent className="p-4 text-center"><p className="text-xs text-gray-500">Overdue</p><p className="text-2xl font-bold text-red-700">{totalOverdue}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Subscriptions ({filtered.length} of {subscribers.length})</CardTitle>
            <div className="flex gap-2">
              <Select value={filterSection} onValueChange={setFilterSection}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sections</SelectItem>
                  {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="due_soon">Due soon</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No subscriptions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-2 font-semibold text-gray-600 cursor-pointer whitespace-nowrap" onClick={() => toggleSort('full_name')}>Member<SortIcon field="full_name" /></th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600 cursor-pointer whitespace-nowrap" onClick={() => toggleSort('section')}>Section<SortIcon field="section" /></th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Interval</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Last Payment</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600 cursor-pointer whitespace-nowrap" onClick={() => toggleSort('next_subs_due')}>Next Due<SortIcon field="next_subs_due" /></th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Status</th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(member => {
                    const status = getStatus(member.next_subs_due);
                    const sc = STATUS_CONFIG[status];
                    const section = sections.find(s => s.id === member.section_id);
                    const reminder = reminderSent[member.id];
                    return (
                      <tr key={member.id} className={`border-b hover:bg-gray-50 ${status === 'overdue' ? 'bg-red-50/30' : status === 'due_soon' ? 'bg-amber-50/30' : ''}`}>
                        <td className="py-2 px-2 font-medium">{member.full_name}</td>
                        <td className="py-2 px-2 text-gray-600">{section?.display_name || '—'}</td>
                        <td className="py-2 px-2 text-gray-600">{INTERVAL_LABELS[member.subs_interval] || '—'}</td>
                        <td className="py-2 px-2 text-gray-500">{member.last_subs_payment_date || '—'}</td>
                        <td className={`py-2 px-2 font-medium ${status === 'overdue' ? 'text-red-600' : status === 'due_soon' ? 'text-amber-600' : ''}`}>{member.next_subs_due || '—'}</td>
                        <td className="py-2 px-2">
                          <Badge className={`border ${sc.className} text-xs`}>{sc.label}</Badge>
                        </td>
                        <td className="py-2 px-2">
                          {status === 'overdue' && (
                            reminder ? (
                              <span className="text-xs text-gray-400">Sent {reminder}</span>
                            ) : (
                              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => sendReminder(member)}>
                                <Bell className="w-3 h-3" /> Remind
                              </Button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </TreasurerLayout>
  );
}