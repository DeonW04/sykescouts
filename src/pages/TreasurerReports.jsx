import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;
const COLORS = ['#1a472a', '#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#b7e4c7', '#d8f3dc'];

export default function TreasurerReports() {
  const [dateRange, setDateRange] = useState('all');

  const { data: ledger = [] } = useQuery({ queryKey: ['ledger'], queryFn: () => base44.entities.LedgerEntry.list('-date', 500) });
  const { data: funds = [] } = useQuery({ queryKey: ['funds'], queryFn: () => base44.entities.Fund.filter({ active: true }) });
  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });
  const { data: budgets = [] } = useQuery({ queryKey: ['section-budgets'], queryFn: () => base44.entities.SectionBudget.filter({}) });
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: () => base44.entities.Member.filter({ active: true }) });
  const { data: payments = [] } = useQuery({ queryKey: ['member-payments'], queryFn: () => base44.entities.MemberPayment.list('-date', 500) });
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => base44.entities.Event.list('-start_date', 200) });

  const filterByDate = (entries) => {
    if (dateRange === 'all') return entries;
    const now = new Date();
    const cutoff = new Date();
    if (dateRange === '1m') cutoff.setMonth(now.getMonth() - 1);
    if (dateRange === '3m') cutoff.setMonth(now.getMonth() - 3);
    if (dateRange === '6m') cutoff.setMonth(now.getMonth() - 6);
    if (dateRange === '1y') cutoff.setFullYear(now.getFullYear() - 1);
    return entries.filter(e => e.date && new Date(e.date) >= cutoff);
  };

  const filteredLedger = filterByDate(ledger);
  const totalIncome = filteredLedger.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpenses = filteredLedger.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);

  // Income vs expenses by category
  const categoryData = {};
  filteredLedger.forEach(e => {
    const cat = e.category?.replace(/_/g, ' ') || 'other';
    if (!categoryData[cat]) categoryData[cat] = { name: cat, income: 0, expense: 0 };
    if (e.type === 'income') categoryData[cat].income += e.amount || 0;
    else categoryData[cat].expense += e.amount || 0;
  });
  const categoryChartData = Object.values(categoryData).sort((a, b) => (b.income + b.expense) - (a.income + a.expense));

  // Income by month
  const monthlyData = {};
  filteredLedger.forEach(e => {
    if (!e.date) return;
    const month = e.date.substring(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { month, income: 0, expense: 0 };
    if (e.type === 'income') monthlyData[month].income += e.amount || 0;
    else monthlyData[month].expense += e.amount || 0;
  });
  const monthlyChartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  // Fund balances
  const fundData = funds.map(f => {
    const entries = ledger.filter(e => e.linked_fund_id === f.id);
    const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
    const expenses = entries.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
    return { name: f.fund_name, value: Math.max(0, (f.starting_balance || 0) + income - expenses) };
  }).filter(f => f.value > 0);

  // Budget usage
  const budgetData = sections.map(s => {
    const budget = budgets.find(b => b.section_id === s.id);
    const spend = filteredLedger.filter(e => e.type === 'expense' && e.section_id === s.id).reduce((s, e) => s + (e.amount || 0), 0);
    return { name: s.display_name, budget: budget?.budget_amount || 0, spend };
  }).filter(b => b.budget > 0 || b.spend > 0);

  // Payment summary stats
  const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const payingMembers = [...new Set(payments.map(p => p.member_id))].length;

  return (
    <TreasurerLayout title="Financial Reports">
      <div className="flex items-center gap-4 mb-6">
        <Label>Date Range:</Label>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="1m">Last Month</SelectItem>
            <SelectItem value="3m">Last 3 Months</SelectItem>
            <SelectItem value="6m">Last 6 Months</SelectItem>
            <SelectItem value="1y">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-green-50 border-0">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-gray-500">Total Income</p>
            <p className="text-3xl font-bold text-green-700">{fmt(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-0">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-gray-500">Total Expenses</p>
            <p className="text-3xl font-bold text-red-700">{fmt(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card className={`border-0 ${totalIncome - totalExpenses >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-gray-500">Net</p>
            <p className={`text-3xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{fmt(totalIncome - totalExpenses)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly income vs expense */}
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly Income vs Expenses</CardTitle></CardHeader>
          <CardContent>
            {monthlyChartData.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `£${v}`} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#40916c" />
                  <Bar dataKey="expense" name="Expense" fill="#e63946" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Fund balances pie */}
        <Card>
          <CardHeader><CardTitle className="text-base">Fund Balances</CardTitle></CardHeader>
          <CardContent>
            {fundData.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No fund data</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={fundData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${fmt(value)}`}>
                    {fundData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">Income & Expenses by Category</CardTitle></CardHeader>
          <CardContent>
            {categoryChartData.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `£${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#40916c" />
                  <Bar dataKey="expense" name="Expense" fill="#e63946" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Budget usage */}
        <Card>
          <CardHeader><CardTitle className="text-base">Budget vs Actual Spend by Section</CardTitle></CardHeader>
          <CardContent>
            {budgetData.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No budget data. Set section budgets first.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={budgetData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `£${v}`} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Legend />
                  <Bar dataKey="budget" name="Budget" fill="#95d5b2" />
                  <Bar dataKey="spend" name="Actual Spend" fill="#1a472a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Member payment summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">Member Payment Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Total Collected</p>
              <p className="text-xl font-bold text-green-700">{fmt(totalPayments)}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Paying Members</p>
              <p className="text-xl font-bold">{payingMembers}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Total Members</p>
              <p className="text-xl font-bold">{members.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </TreasurerLayout>
  );
}