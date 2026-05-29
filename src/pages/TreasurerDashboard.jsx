import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertCircle, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { createPageUrl } from '../utils';

const fmt = n => `£${(n || 0).toFixed(2)}`;

const CAT_LABEL = { subs: 'Subscriptions', event_payments: 'Event payment' };
const catLabel = c => CAT_LABEL[c] || (c?.replace(/_/g, ' ') || '—');

function getApproxTermRange() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  if (month >= 9) return { start: `${year}-09-01`, end: `${year}-12-20` };
  if (month <= 4) return { start: `${year}-01-06`, end: `${year}-04-15` };
  return { start: `${year}-04-20`, end: `${year}-07-20` };
}

export default function TreasurerDashboard() {
  const navigate = useNavigate();

  const { data: ledger = [] } = useQuery({
    queryKey: ['ledger-dash'],
    queryFn: () => base44.entities.LedgerEntry.list('-date', 1000),
  });

  const { data: terms = [] } = useQuery({
    queryKey: ['terms'],
    queryFn: () => base44.entities.Term.list(),
  });

  const { data: eventPaymentStatuses = [] } = useQuery({
    queryKey: ['all-eps-dash'],
    queryFn: () => base44.entities.EventPaymentStatus.filter({}),
  });

  const { data: meetingPaymentStatuses = [] } = useQuery({
    queryKey: ['all-mps-dash'],
    queryFn: () => base44.entities.MeetingPaymentStatus.filter({}),
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const termRange = useMemo(() => {
    const found = terms.find(t => t.start_date <= todayStr && t.end_date >= todayStr);
    return found ? { start: found.start_date, end: found.end_date } : getApproxTermRange();
  }, [terms, todayStr]);

  const termIncome = ledger.filter(e => e.type === 'income' && e.date >= termRange.start && e.date <= termRange.end);
  const totalTermIncome = termIncome.reduce((s, e) => s + (e.amount || 0), 0);
  const subsTermIncome = termIncome.filter(e => e.category === 'subs').reduce((s, e) => s + (e.amount || 0), 0);
  const eventsTermIncome = termIncome.filter(e => e.category === 'event_payments').reduce((s, e) => s + (e.amount || 0), 0);

  const outstandingCount = [
    ...eventPaymentStatuses.filter(p => p.status === 'unpaid' || p.status === 'overdue'),
    ...meetingPaymentStatuses.filter(p => p.status === 'unpaid' || p.status === 'overdue'),
  ].length;

  // Income chart: last 12 months grouped by month + category (subs vs event_payments)
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const label = format(d, 'MMM yy');
      const start = format(startOfMonth(d), 'yyyy-MM-dd');
      const end = format(endOfMonth(d), 'yyyy-MM-dd');
      const monthEntries = ledger.filter(e => e.type === 'income' && e.date >= start && e.date <= end);
      months.push({
        month: label,
        Subscriptions: monthEntries.filter(e => e.category === 'subs').reduce((s, e) => s + (e.amount || 0), 0),
        'Event payments': monthEntries.filter(e => e.category === 'event_payments').reduce((s, e) => s + (e.amount || 0), 0),
        Other: monthEntries.filter(e => e.category !== 'subs' && e.category !== 'event_payments').reduce((s, e) => s + (e.amount || 0), 0),
      });
    }
    return months;
  }, [ledger]);

  const recentTransactions = [...ledger].slice(0, 10);

  const statCards = [
    { title: 'Total Income This Term', value: fmt(totalTermIncome), color: 'text-green-700', bg: 'bg-green-50', icon: TrendingUp },
    { title: 'Subscriptions This Term', value: fmt(subsTermIncome), color: 'text-blue-700', bg: 'bg-blue-50', icon: TrendingUp },
    { title: 'Events & Meetings This Term', value: fmt(eventsTermIncome), color: 'text-purple-700', bg: 'bg-purple-50', icon: TrendingUp },
    {
      title: 'Outstanding Payments',
      value: String(outstandingCount),
      color: outstandingCount > 0 ? 'text-red-700' : 'text-green-700',
      bg: outstandingCount > 0 ? 'bg-red-50' : 'bg-green-50',
      icon: AlertCircle,
    },
  ];

  const getRowLink = entry => {
    if (entry.linked_event_id) return '/TreasurerEventFinances';
    if (entry.linked_meeting_id) return '/TreasurerProgrammeFinances';
    if (entry.linked_member_id) return '/TreasurerMemberPayments';
    return '/TreasurerLedger';
  };

  return (
    <TreasurerLayout title="Treasurer Dashboard">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map(c => {
          const Icon = c.icon;
          return (
            <Card key={c.title} className={`${c.bg} border-0`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">{c.title}</p>
                    <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/60">
                    <Icon className={`w-5 h-5 ${c.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Income Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Income Over Time — Last 12 Months</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `£${v}`} />
                <Tooltip formatter={v => [`£${Number(v).toFixed(2)}`]} />
                <Legend />
                <Bar dataKey="Subscriptions" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Event payments" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="Other" stackId="a" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <Link to="/TreasurerLedger" className="text-xs text-[#004851] hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No transactions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Date</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Description</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Category</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600">Amount</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Entered by</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map(entry => (
                    <tr
                      key={entry.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(getRowLink(entry))}
                    >
                      <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{entry.date}</td>
                      <td className="py-2 px-2 max-w-xs truncate">{entry.description}</td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-xs">{catLabel(entry.category)}</Badge>
                      </td>
                      <td className={`py-2 px-2 text-right font-semibold whitespace-nowrap ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.type === 'income' ? '+' : '-'}{fmt(entry.amount)}
                      </td>
                      <td className="py-2 px-2 text-gray-500 text-xs">
                        {entry.entered_by?.toLowerCase().includes('stripe') ? 'Stripe' : entry.entered_by || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </TreasurerLayout>
  );
}