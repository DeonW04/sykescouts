import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';

const fmt = n => `£${(n || 0).toFixed(2)}`;

const CATEGORY_COLORS = {
  subs: '#7413dc',
  event_payments: '#004851',
  donations: '#22c55e',
  fundraising: '#f59e0b',
  reimbursement: '#ec4899',
  other: '#6b7280',
};
const FALLBACK_COLORS = ['#7413dc', '#004851', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#f97316', '#8b5cf6'];

function getTimespanDates(timespan, activeTerm) {
  const now = new Date();
  if (timespan === 'termly' && activeTerm) {
    return { start: activeTerm.start_date, end: activeTerm.end_date };
  }
  const septMonth = 8;
  const yearStart = now.getMonth() >= septMonth
    ? new Date(now.getFullYear(), septMonth, 1)
    : new Date(now.getFullYear() - 1, septMonth, 1);
  const yearEnd = new Date(yearStart.getFullYear() + 1, 7, 31);
  return {
    start: yearStart.toISOString().split('T')[0],
    end: yearEnd.toISOString().split('T')[0],
  };
}

const formatMonth = (value) => {
  try { return format(parseISO(value + '-01'), 'MMM yy'); } catch { return value; }
};

export default function DashboardTab({ selectedSectionId }) {
  const [timespan, setTimespan] = useState('termly');

  const { data: terms = [] } = useQuery({ queryKey: ['terms'], queryFn: () => base44.entities.Term.filter({}) });
  const { data: allLedger = [] } = useQuery({ queryKey: ['ledger-all'], queryFn: () => base44.entities.LedgerEntry.list('-date', 500) });
  const { data: events = [] } = useQuery({ queryKey: ['events-all'], queryFn: () => base44.entities.Event.list('-start_date', 200) });
  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes', selectedSectionId],
    queryFn: () => selectedSectionId ? base44.entities.Programme.filter({ section_id: selectedSectionId }) : [],
    enabled: !!selectedSectionId,
  });

  const activeTerm = terms.find(t => t.active) || null;
  const { start, end } = useMemo(() => getTimespanDates(timespan, activeTerm), [timespan, activeTerm]);

  const sectionLedger = useMemo(() => {
    if (!selectedSectionId) return [];
    return allLedger.filter(e =>
      e.section_id === selectedSectionId && e.date && e.date >= start && e.date <= end
    );
  }, [allLedger, selectedSectionId, start, end]);

  const totalIncome = useMemo(() => sectionLedger.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0), [sectionLedger]);
  const totalExpenses = useMemo(() => sectionLedger.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0), [sectionLedger]);
  const netProfit = totalIncome - totalExpenses;

  const plBreakdown = useMemo(() => {
    const items = [];
    const sectionEvents = events.filter(e => e.section_ids?.includes(selectedSectionId));
    for (const event of sectionEvents) {
      const linked = sectionLedger.filter(e => e.linked_event_id === event.id);
      if (!linked.length) continue;
      const income = linked.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
      const expenses = linked.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
      items.push({ name: event.title, date: event.start_date, income, expenses, net: income - expenses });
    }
    for (const prog of programmes) {
      const linked = sectionLedger.filter(e => e.linked_meeting_id === prog.id);
      if (!linked.length) continue;
      const income = linked.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
      const expenses = linked.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
      items.push({ name: prog.title, date: prog.date, income, expenses, net: income - expenses });
    }
    return items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [sectionLedger, events, programmes, selectedSectionId]);

  const totalPLIncome = plBreakdown.reduce((s, r) => s + r.income, 0);
  const totalPLExpenses = plBreakdown.reduce((s, r) => s + r.expenses, 0);
  const totalPLNet = totalPLIncome - totalPLExpenses;

  const incomeByCategory = useMemo(() => {
    const map = {};
    sectionLedger.filter(e => e.type === 'income').forEach(e => {
      const cat = e.category || 'other';
      map[cat] = (map[cat] || 0) + (e.amount || 0);
    });
    return Object.entries(map).map(([key, value]) => ({ key, name: key.replace(/_/g, ' '), value: parseFloat(value.toFixed(2)) }));
  }, [sectionLedger]);

  const incomeOverTime = useMemo(() => {
    const monthMap = {};
    sectionLedger.filter(e => e.type === 'income' && e.date).forEach(e => {
      const month = e.date.substring(0, 7);
      if (!monthMap[month]) monthMap[month] = { month };
      const cat = e.category || 'other';
      monthMap[month][cat] = (monthMap[month][cat] || 0) + (e.amount || 0);
    });
    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [sectionLedger]);

  const incomeCategories = useMemo(() => {
    const cats = new Set(sectionLedger.filter(e => e.type === 'income').map(e => e.category || 'other'));
    return [...cats];
  }, [sectionLedger]);

  if (!selectedSectionId) {
    return <p className="text-center text-gray-400 py-12">Please select a section.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Timespan selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-500 font-medium">Timespan:</span>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {[['termly', 'Termly'], ['yearly', 'Yearly']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTimespan(val)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${timespan === val ? 'bg-[#7413dc] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">
          {timespan === 'termly' && activeTerm ? `${activeTerm.title} · ${activeTerm.start_date} → ${activeTerm.end_date}` : `${start} → ${end}`}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Income', value: fmt(totalIncome), color: 'text-green-600', bg: 'bg-green-50', Icon: TrendingUp, iconColor: 'text-green-600' },
          { label: 'Total Expenses', value: fmt(totalExpenses), color: 'text-red-600', bg: 'bg-red-50', Icon: TrendingDown, iconColor: 'text-red-600' },
          { label: `Net ${netProfit >= 0 ? 'Profit' : 'Loss'}`, value: fmt(Math.abs(netProfit)), color: netProfit >= 0 ? 'text-green-600' : 'text-red-600', bg: netProfit >= 0 ? 'bg-purple-50' : 'bg-red-50', Icon: DollarSign, iconColor: netProfit >= 0 ? 'text-purple-600' : 'text-red-600' },
        ].map(({ label, value, color, bg, Icon, iconColor }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* P&L Breakdown */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base">Profit &amp; Loss Breakdown</CardTitle></CardHeader>
        <CardContent>
          {plBreakdown.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">No financial activity in this timespan</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Name</th>
                    <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Date</th>
                    <th className="text-right py-2.5 px-3 text-gray-500 font-medium">Income</th>
                    <th className="text-right py-2.5 px-3 text-gray-500 font-medium">Expenses</th>
                    <th className="text-right py-2.5 px-3 text-gray-500 font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {plBreakdown.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-medium">{row.name}</td>
                      <td className="py-2.5 px-3 text-gray-500">
                        {row.date ? new Date(row.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-green-600 font-medium">{fmt(row.income)}</td>
                      <td className="py-2.5 px-3 text-right text-red-600 font-medium">{fmt(row.expenses)}</td>
                      <td className={`py-2.5 px-3 text-right font-bold ${row.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(row.net)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="py-2.5 px-3 font-bold" colSpan={2}>Totals</td>
                    <td className="py-2.5 px-3 text-right font-bold text-green-600">{fmt(totalPLIncome)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-red-600">{fmt(totalPLExpenses)}</td>
                    <td className={`py-2.5 px-3 text-right font-bold ${totalPLNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totalPLNet)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Income Sources</CardTitle></CardHeader>
          <CardContent>
            {incomeByCategory.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No income data</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={incomeByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {incomeByCategory.map((entry, index) => (
                      <Cell key={entry.key} fill={CATEGORY_COLORS[entry.key] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Income Over Time</CardTitle></CardHeader>
          <CardContent>
            {incomeOverTime.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No income data</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={incomeOverTime} margin={{ left: -10, right: 10 }}>
                  <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `£${v}`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => fmt(v)} labelFormatter={formatMonth} />
                  <Legend />
                  {incomeCategories.map((cat, i) => (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      name={cat.replace(/_/g, ' ')}
                      stackId="a"
                      fill={CATEGORY_COLORS[cat] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}