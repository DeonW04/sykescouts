import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

const fmt = n => `£${(n || 0).toFixed(2)}`;
const catLabel = c => { if (c === 'subs') return 'Subscriptions'; if (c === 'event_payments') return 'Event payment'; return c?.replace(/_/g, ' ') || '—'; };

function getApproxTermRange() {
  const today = new Date(); const month = today.getMonth() + 1; const year = today.getFullYear();
  if (month >= 9) return { start: `${year}-09-01`, end: `${year}-12-20` };
  if (month <= 4) return { start: `${year}-01-06`, end: `${year}-04-15` };
  return { start: `${year}-04-20`, end: `${year}-07-20` };
}

function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function TreasurerReports() {
  const todayStr = new Date().toISOString().split('T')[0];

  const { data: ledger = [] } = useQuery({ queryKey: ['ledger-reports'], queryFn: () => base44.entities.LedgerEntry.list('-date', 1000) });
  const { data: members = [] } = useQuery({ queryKey: ['members-active'], queryFn: () => base44.entities.Member.filter({ active: true }) });
  const { data: events = [] } = useQuery({ queryKey: ['events-reports'], queryFn: () => base44.entities.Event.list('-start_date', 100) });
  const { data: programmes = [] } = useQuery({ queryKey: ['programmes-reports'], queryFn: () => base44.entities.Programme.list('-date', 300) });
  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });
  const { data: terms = [] } = useQuery({ queryKey: ['terms'], queryFn: () => base44.entities.Term.list() });
  const { data: eventPaymentStatuses = [] } = useQuery({ queryKey: ['eps-reports'], queryFn: () => base44.entities.EventPaymentStatus.filter({}) });
  const { data: actions = [] } = useQuery({ queryKey: ['actions-reports'], queryFn: () => base44.entities.ActionRequired.filter({}) });
  const { data: responses = [] } = useQuery({ queryKey: ['responses-reports'], queryFn: () => base44.entities.ActionResponse.filter({}) });

  const defaultTerm = useMemo(() => {
    const found = terms.find(t => t.start_date <= todayStr && t.end_date >= todayStr);
    return found ? { start: found.start_date, end: found.end_date } : getApproxTermRange();
  }, [terms, todayStr]);

  const [dateFrom, setDateFrom] = useState(defaultTerm.start);
  const [dateTo, setDateTo] = useState(defaultTerm.end);

  const filteredIncome = useMemo(() =>
    ledger.filter(e => e.type === 'income' && (!dateFrom || e.date >= dateFrom) && (!dateTo || e.date <= dateTo)),
    [ledger, dateFrom, dateTo]
  );

  // Report 1: By Category
  const byCategoryData = useMemo(() => {
    const map = {};
    filteredIncome.forEach(e => { if (!map[e.category]) map[e.category] = 0; map[e.category] += e.amount || 0; });
    return Object.entries(map).map(([cat, total]) => ({ category: catLabel(cat), total })).sort((a, b) => b.total - a.total);
  }, [filteredIncome]);

  // Report 2: By Event
  const byEventData = useMemo(() => {
    return events.filter(e => (e.cost || 0) > 0).map(event => {
      const evEntries = filteredIncome.filter(e => e.linked_event_id === event.id);
      const collected = evEntries.reduce((s, e) => s + (e.amount || 0), 0);
      const attAction = actions.find(a => a.event_id === event.id && a.action_purpose === 'attendance');
      const attendingCount = attAction ? new Set(responses.filter(r => r.action_required_id === attAction.id && ['yes', 'Yes, attending', 'attending'].includes(r.response_value)).map(r => r.member_id)).size : 0;
      const paidCount = eventPaymentStatuses.filter(ps => ps.event_id === event.id && ps.status === 'paid').length;
      const estExpenses = (event.estimated_expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
      return { event, collected, attendingCount, paidCount, estExpenses, surplus: collected - estExpenses };
    }).filter(r => r.collected > 0 || r.attendingCount > 0);
  }, [events, filteredIncome, actions, responses, eventPaymentStatuses]);

  // Report 3: By Section
  const bySectionData = useMemo(() => {
    const memberSectionMap = {};
    members.forEach(m => { memberSectionMap[m.id] = m.section_id; });
    const map = {};
    filteredIncome.forEach(e => {
      if (!e.linked_member_id) return;
      const sectionId = memberSectionMap[e.linked_member_id];
      if (!sectionId) return;
      if (!map[sectionId]) map[sectionId] = 0;
      map[sectionId] += e.amount || 0;
    });
    return sections.map(s => ({ section: s, total: map[s.id] || 0 })).filter(r => r.total > 0).sort((a, b) => b.total - a.total);
  }, [filteredIncome, members, sections]);

  // Report 4: By Member
  const byMemberData = useMemo(() => {
    const map = {};
    filteredIncome.forEach(e => {
      if (!e.linked_member_id) return;
      if (!map[e.linked_member_id]) map[e.linked_member_id] = { total: 0, subs: 0, events: 0, other: 0 };
      map[e.linked_member_id].total += e.amount || 0;
      if (e.category === 'subs') map[e.linked_member_id].subs += e.amount || 0;
      else if (e.category === 'event_payments') map[e.linked_member_id].events += e.amount || 0;
      else map[e.linked_member_id].other += e.amount || 0;
    });
    return Object.entries(map).map(([memberId, data]) => {
      const member = members.find(m => m.id === memberId);
      const section = sections.find(s => s.id === member?.section_id);
      return { member, section, ...data };
    }).filter(r => r.member).sort((a, b) => b.total - a.total);
  }, [filteredIncome, members, sections]);

  const DateRangeBar = () => (
    <div className="flex flex-wrap items-end gap-3 mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
      <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" /></div>
      <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" /></div>
      <Button variant="outline" size="sm" onClick={() => { setDateFrom(defaultTerm.start); setDateTo(defaultTerm.end); }}>Reset to current term</Button>
    </div>
  );

  return (
    <TreasurerLayout title="Financial Reports">
      <Tabs defaultValue="by_category">
        <TabsList className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-1 h-auto">
          <TabsTrigger value="by_category">By Category</TabsTrigger>
          <TabsTrigger value="by_event">By Event</TabsTrigger>
          <TabsTrigger value="by_section">By Section</TabsTrigger>
          <TabsTrigger value="by_member">By Member</TabsTrigger>
        </TabsList>

        {/* By Category */}
        <TabsContent value="by_category">
          <DateRangeBar />
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Income by Category</CardTitle>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => downloadCSV([['Category', 'Total Income'], ...byCategoryData.map(r => [r.category, r.total.toFixed(2)])], 'income-by-category.csv')}>
                    <Download className="w-3 h-3" /> Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-56 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byCategoryData} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `£${v}`} />
                      <Tooltip formatter={v => [`£${Number(v).toFixed(2)}`]} />
                      <Bar dataKey="total" fill="#004851" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50"><th className="text-left py-2 px-2 font-semibold text-gray-600">Category</th><th className="text-right py-2 px-2 font-semibold text-gray-600">Total Income</th></tr></thead>
                    <tbody>
                      {byCategoryData.map(r => (
                        <tr key={r.category} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2 capitalize">{r.category}</td>
                          <td className="py-2 px-2 text-right font-semibold text-green-700">{fmt(r.total)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 bg-gray-50 font-semibold">
                        <td className="py-2 px-2">Total</td>
                        <td className="py-2 px-2 text-right text-green-700">{fmt(byCategoryData.reduce((s, r) => s + r.total, 0))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* By Event */}
        <TabsContent value="by_event">
          <DateRangeBar />
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Income by Event</CardTitle>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => downloadCSV([['Event', 'Date', 'Attending', 'Paid', 'Collected', 'Est. Expenses', 'Surplus'], ...byEventData.map(r => [r.event.title, r.event.start_date, r.attendingCount, r.paidCount, r.collected.toFixed(2), r.estExpenses.toFixed(2), r.surplus.toFixed(2)])], 'income-by-event.csv')}>
                  <Download className="w-3 h-3" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {byEventData.length === 0 ? <p className="text-sm text-gray-500 text-center py-6">No event income in this period.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-2 font-semibold text-gray-600">Event</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-600">Date</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-600">Attending</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-600">Paid</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-600">Collected</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-600">Est. Expenses</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-600">Surplus</th>
                    </tr></thead>
                    <tbody>
                      {byEventData.map(r => (
                        <tr key={r.event.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2">{r.event.title}</td>
                          <td className="py-2 px-2 text-gray-500">{r.event.start_date}</td>
                          <td className="py-2 px-2 text-right">{r.attendingCount}</td>
                          <td className="py-2 px-2 text-right text-green-600">{r.paidCount}</td>
                          <td className="py-2 px-2 text-right font-semibold text-green-700">{fmt(r.collected)}</td>
                          <td className="py-2 px-2 text-right text-red-600">{fmt(r.estExpenses)}</td>
                          <td className={`py-2 px-2 text-right font-semibold ${r.surplus >= 0 ? 'text-green-700' : 'text-red-700'}`}>{r.surplus >= 0 ? '+' : ''}{fmt(r.surplus)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Section */}
        <TabsContent value="by_section">
          <DateRangeBar />
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Income by Section</CardTitle>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => downloadCSV([['Section', 'Total Income'], ...bySectionData.map(r => [r.section.display_name, r.total.toFixed(2)])], 'income-by-section.csv')}>
                  <Download className="w-3 h-3" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {bySectionData.length === 0 ? <p className="text-sm text-gray-500 text-center py-6">No section income in this period.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50"><th className="text-left py-2 px-2 font-semibold text-gray-600">Section</th><th className="text-right py-2 px-2 font-semibold text-gray-600">Total Income</th></tr></thead>
                    <tbody>
                      {bySectionData.map(r => (
                        <tr key={r.section.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2">{r.section.display_name}</td>
                          <td className="py-2 px-2 text-right font-semibold text-green-700">{fmt(r.total)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 bg-gray-50 font-semibold">
                        <td className="py-2 px-2">Total</td>
                        <td className="py-2 px-2 text-right text-green-700">{fmt(bySectionData.reduce((s, r) => s + r.total, 0))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Member */}
        <TabsContent value="by_member">
          <DateRangeBar />
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Income by Member</CardTitle>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => downloadCSV([['Member', 'Section', 'Total Paid', 'Subscriptions', 'Events', 'Other'], ...byMemberData.map(r => [r.member.full_name, r.section?.display_name || '', r.total.toFixed(2), r.subs.toFixed(2), r.events.toFixed(2), r.other.toFixed(2)])], 'income-by-member.csv')}>
                  <Download className="w-3 h-3" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {byMemberData.length === 0 ? <p className="text-sm text-gray-500 text-center py-6">No member income in this period.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-2 font-semibold text-gray-600">Member</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-600">Section</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-600">Total Paid</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-600">Subs</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-600">Events</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-600">Other</th>
                    </tr></thead>
                    <tbody>
                      {byMemberData.map(r => (
                        <tr key={r.member.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2 font-medium">{r.member.full_name}</td>
                          <td className="py-2 px-2 text-gray-600">{r.section?.display_name || '—'}</td>
                          <td className="py-2 px-2 text-right font-semibold text-green-700">{fmt(r.total)}</td>
                          <td className="py-2 px-2 text-right text-blue-600">{fmt(r.subs)}</td>
                          <td className="py-2 px-2 text-right text-purple-600">{fmt(r.events)}</td>
                          <td className="py-2 px-2 text-right text-gray-600">{fmt(r.other)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </TreasurerLayout>
  );
}