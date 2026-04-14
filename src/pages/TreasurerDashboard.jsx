import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, Clock, AlertCircle, CheckCircle,
  Receipt, RefreshCw, Wallet, ArrowRight, Landmark
} from 'lucide-react';
import { format, isWithinInterval, addDays } from 'date-fns';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

export default function TreasurerDashboard() {
  const { data: ledger = [] } = useQuery({
    queryKey: ['ledger'],
    queryFn: () => base44.entities.LedgerEntry.list('-date', 200),
  });

  const { data: reimbursements = [] } = useQuery({
    queryKey: ['reimbursements'],
    queryFn: () => base44.entities.Reimbursement.filter({}),
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['receipt-allocations'],
    queryFn: () => base44.entities.ReceiptAllocation.filter({}),
  });

  const { data: recurringPayments = [] } = useQuery({
    queryKey: ['recurring-payments'],
    queryFn: () => base44.entities.RecurringPayment.filter({ active: true }),
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['section-budgets'],
    queryFn: () => base44.entities.SectionBudget.filter({}),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: leaders = [] } = useQuery({
    queryKey: ['leaders'],
    queryFn: () => base44.entities.Leader.filter({}),
  });

  // Computed stats
  const totalIncome = ledger.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpenses = ledger.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
  const balance = totalIncome - totalExpenses;

  const pendingReimbursements = reimbursements.filter(r => r.approval_status === 'approved' && r.payment_status === 'unpaid');
  const pendingApproval = reimbursements.filter(r => r.approval_status === 'pending_approval');
  const unallocatedReceipts = allocations.filter(r => r.status === 'unallocated');

  const amountOwed = pendingReimbursements.reduce((s, r) => s + (r.amount || 0), 0);

  // Upcoming recurring payments (next 14 days)
  const today = new Date();
  const upcomingPayments = recurringPayments.filter(p => {
    if (!p.next_due_date) return false;
    const due = new Date(p.next_due_date);
    return isWithinInterval(due, { start: today, end: addDays(today, 14) });
  });

  const recentLedger = [...ledger].slice(0, 8);

  const statCards = [
    {
      title: 'Net Balance',
      value: fmt(balance),
      icon: Landmark,
      color: balance >= 0 ? 'text-green-600' : 'text-red-600',
      bg: balance >= 0 ? 'bg-green-50' : 'bg-red-50',
      sub: `Income: ${fmt(totalIncome)} | Expenses: ${fmt(totalExpenses)}`,
    },
    {
      title: 'Leaders Owed',
      value: fmt(amountOwed),
      icon: RefreshCw,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      sub: `${pendingReimbursements.length} approved, awaiting payment`,
    },
    {
      title: 'Receipts to Allocate',
      value: String(unallocatedReceipts.length),
      icon: Receipt,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      sub: 'Awaiting categorisation',
    },
    {
      title: 'Pending Approval',
      value: String(pendingApproval.length),
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      sub: 'Reimbursements awaiting GLV approval',
    },
  ];

  return (
    <TreasurerLayout title="Treasurer Dashboard">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className={`${card.bg} border-0`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                    <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-white/60`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Ledger */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Ledger Activity</CardTitle>
              <Link to="/TreasurerLedger">
                <Button variant="ghost" size="sm" className="text-xs">View all <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentLedger.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No ledger entries yet</p>
              ) : (
                <div className="space-y-2">
                  {recentLedger.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${entry.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                          {entry.type === 'income'
                            ? <TrendingUp className="w-4 h-4 text-green-600" />
                            : <TrendingDown className="w-4 h-4 text-red-600" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium">{entry.description}</p>
                          <p className="text-xs text-gray-500">{entry.date} · {entry.category?.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <span className={`font-semibold text-sm ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.type === 'income' ? '+' : '-'}{fmt(entry.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Upcoming recurring payments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Upcoming Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingPayments.length === 0 ? (
                <p className="text-sm text-gray-500">None in next 14 days</p>
              ) : (
                <div className="space-y-2">
                  {upcomingPayments.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-sm">
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.next_due_date}</p>
                      </div>
                      <span className="font-semibold text-red-600">{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <Link to="/TreasurerRecurringPayments">
                <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">Manage recurring <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </Link>
            </CardContent>
          </Card>

          {/* Section budgets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#1a472a]" />
                Section Budget Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sections.length === 0 ? (
                <p className="text-sm text-gray-500">No sections found</p>
              ) : (
                <div className="space-y-2">
                  {sections.map(s => {
                    const budget = budgets.find(b => b.section_id === s.id);
                    return (
                      <div key={s.id} className="flex justify-between items-center text-sm">
                        <p className="font-medium capitalize">{s.display_name}</p>
                        {budget
                          ? <Badge variant="outline" className="text-xs">{fmt(budget.budget_amount)}</Badge>
                          : <Badge variant="secondary" className="text-xs">No budget</Badge>
                        }
                      </div>
                    );
                  })}
                </div>
              )}
              <Link to="/TreasurerBudgets">
                <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">Manage budgets <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </TreasurerLayout>
  );
}