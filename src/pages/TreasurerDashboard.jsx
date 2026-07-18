import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import {
  ChevronDown, ArrowRight, Receipt, RefreshCw, TrendingUp, Wallet, Banknote,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import { TREASURER_NAV_GROUPS } from '@/lib/treasurerNavConfig';

const glassCard = {
  background: 'rgba(255,255,255,0.9)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(116,19,220,0.1)',
  borderRadius: '20px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
};

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

// ── Stat card (matches Leader dashboard tile feel) ────────────────────────────
function StatCard({ label, value, sublabel, color, bg, icon: Icon, to }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => to && navigate(to)}
      style={{
        ...glassCard, padding: '18px 20px', textAlign: 'left', cursor: to ? 'pointer' : 'default',
        border: `1px solid ${color}22`, transition: 'transform 0.15s, box-shadow 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontFamily: 'inherit',
      }}
      onMouseEnter={e => { if (to) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 22px ${color}22`; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)'; }}
    >
      <div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(26,26,46,0.5)', margin: '0 0 6px' }}>{label}</p>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '30px', color, margin: 0, lineHeight: 1 }}>{value}</p>
        {sublabel && <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(26,26,46,0.4)', margin: '6px 0 0' }}>{sublabel}</p>}
      </div>
      <div style={{ width: '44px', height: '44px', background: bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
    </button>
  );
}

export default function TreasurerDashboard() {
  const navigate = useNavigate();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: ledger = [] } = useQuery({ queryKey: ['ledger-dash'], queryFn: () => base44.entities.LedgerEntry.list('-date', 1000) });
  const { data: terms = [] } = useQuery({ queryKey: ['terms'], queryFn: () => base44.entities.Term.list() });
  const { data: allocations = [] } = useQuery({ queryKey: ['receipt-allocations-dash'], queryFn: () => base44.entities.ReceiptAllocation.filter({}) });
  const { data: reimbursements = [] } = useQuery({ queryKey: ['reimbursements-dash'], queryFn: () => base44.entities.Reimbursement.filter({}) });
  const { data: cashPayments = [] } = useQuery({ queryKey: ['cash-payments-dash'], queryFn: () => base44.entities.CashPayment.filter({}) });

  const todayStr = new Date().toISOString().split('T')[0];

  const termRange = useMemo(() => {
    const found = terms.find(t => t.start_date <= todayStr && t.end_date >= todayStr);
    return found ? { start: found.start_date, end: found.end_date } : getApproxTermRange();
  }, [terms, todayStr]);

  const termIncome = ledger.filter(e => e.type === 'income' && e.date >= termRange.start && e.date <= termRange.end);
  const totalTermIncome = termIncome.reduce((s, e) => s + (e.amount || 0), 0);

  const cashInBank = ledger.reduce((s, e) => s + (e.type === 'income' ? (e.amount || 0) : -(e.amount || 0)), 0);

  const unallocated = allocations.filter(r => r.status === 'unallocated');
  const unallocatedTotal = unallocated.reduce((s, r) => s + (r.amount || 0), 0);

  const reimbursementsDue = reimbursements.filter(r => r.payment_status === 'unpaid' && r.approval_status !== 'rejected');
  const reimbursementsDueTotal = reimbursementsDue.reduce((s, r) => s + (r.amount || 0), 0);

  const cashOutstanding = cashPayments.filter(c => !c.paid_in);
  const cashOutstandingTotal = cashOutstanding.reduce((s, c) => s + (c.amount || 0), 0);

  // Income chart: last 12 months by month + category
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = format(startOfMonth(d), 'yyyy-MM-dd');
      const end = format(endOfMonth(d), 'yyyy-MM-dd');
      const monthEntries = ledger.filter(e => e.type === 'income' && e.date >= start && e.date <= end);
      months.push({
        month: format(d, 'MMM yy'),
        Subscriptions: monthEntries.filter(e => e.category === 'subs').reduce((s, e) => s + (e.amount || 0), 0),
        'Event payments': monthEntries.filter(e => e.category === 'event_payments').reduce((s, e) => s + (e.amount || 0), 0),
        Other: monthEntries.filter(e => e.category !== 'subs' && e.category !== 'event_payments').reduce((s, e) => s + (e.amount || 0), 0),
      });
    }
    return months;
  }, [ledger]);

  const recentTransactions = [...ledger].slice(0, 8);

  const getRowLink = entry => {
    if (entry.linked_event_id) return createPageUrl('TreasurerEventFinances');
    if (entry.linked_meeting_id) return createPageUrl('TreasurerProgrammeFinances');
    if (entry.linked_member_id) return createPageUrl('TreasurerMemberPayments');
    return createPageUrl('TreasurerLedger');
  };

  const statCards = [
    { label: 'Cash in Bank', value: fmt(cashInBank), sublabel: 'Ledger net total', color: cashInBank >= 0 ? '#22c55e' : '#ef4444', bg: cashInBank >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', icon: Wallet, to: createPageUrl('TreasurerLedger') },
    { label: 'Unallocated Receipts', value: String(unallocated.length), sublabel: fmt(unallocatedTotal) + ' awaiting', color: unallocated.length > 0 ? '#f97316' : '#22c55e', bg: unallocated.length > 0 ? 'rgba(249,115,22,0.1)' : 'rgba(34,197,94,0.1)', icon: Receipt, to: createPageUrl('TreasurerReceiptAllocation') },
    { label: 'Reimbursements Due', value: String(reimbursementsDue.length), sublabel: fmt(reimbursementsDueTotal) + ' to pay', color: reimbursementsDue.length > 0 ? '#7413dc' : '#22c55e', bg: reimbursementsDue.length > 0 ? 'rgba(116,19,220,0.1)' : 'rgba(34,197,94,0.1)', icon: RefreshCw, to: createPageUrl('TreasurerReimbursements') },
    { label: 'Cash Outstanding', value: fmt(cashOutstandingTotal), sublabel: cashOutstanding.length === 1 ? '1 payment not paid in' : `${cashOutstanding.length} payments not paid in`, color: cashOutstandingTotal > 0 ? '#eab308' : '#22c55e', bg: cashOutstandingTotal > 0 ? 'rgba(234,179,8,0.12)' : 'rgba(34,197,94,0.1)', icon: Banknote, to: createPageUrl('TreasurerCashTaken') },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f8f7ff 0%, #f0eeff 50%, #f0fdf4 100%)', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <FloatingNav />
      <NavBarSpacer />

      {/* ── Hero header ── */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 16px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '18px' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Treasurer Portal</p>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(20px, 4vw, 36px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.15 }}>
              Welcome back{user ? `, ${user.display_name || user.full_name?.split(' ')[0]}` : ''}
            </h1>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>40th Rochdale (Syke) Scouts</p>
          </div>

          {/* stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4" style={{ gap: '12px' }}>
            {statCards.map(c => <StatCard key={c.label} {...c} />)}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 16px 0' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,26,46,0.35)', marginBottom: '10px' }}>Quick access</p>
        <div className="grid grid-cols-3 md:grid-cols-6" style={{ gap: '8px' }}>
          {TREASURER_NAV_GROUPS.map(action => (
            action.links ? (
              <DropdownMenu key={action.label}>
                <DropdownMenuTrigger asChild>
                  <button style={{
                    background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
                    border: `1px solid ${action.accent}20`, borderRadius: '18px',
                    padding: '18px 10px', cursor: 'pointer', textAlign: 'center',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s', fontFamily: 'inherit',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${action.accent}22`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)'; }}
                  >
                    <div style={{ width: '38px', height: '38px', background: `${action.accent}18`, borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <action.icon size={18} color={action.accent} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '11px', color: '#1a1a2e', lineHeight: 1.2, textAlign: 'center' }}>{action.label}</span>
                      <ChevronDown size={10} color="rgba(26,26,46,0.4)" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {action.links.map(sub => (
                    <DropdownMenuItem key={sub.page} asChild>
                      <Link to={createPageUrl(sub.page)} className="flex items-center gap-2 cursor-pointer">
                        <sub.icon className="w-4 h-4" /> {sub.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link key={action.label} to={createPageUrl(action.page)} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
                  border: `1px solid ${action.accent}20`, borderRadius: '16px',
                  padding: '18px 8px', cursor: 'pointer', textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${action.accent}22`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)'; }}
                >
                  <div style={{ width: '38px', height: '38px', background: `${action.accent}18`, borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <action.icon size={18} color={action.accent} />
                  </div>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '11px', color: '#1a1a2e', lineHeight: 1.2, textAlign: 'center' }}>{action.label}</span>
                </div>
              </Link>
            )
          ))}
        </div>
      </div>

      {/* ── Dashboard content ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 16px 48px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Income this term banner */}
        <div style={{ ...glassCard, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', background: 'linear-gradient(135deg, rgba(34,197,94,0.07) 0%, rgba(16,185,129,0.07) 100%)', border: '1px solid rgba(34,197,94,0.18)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', background: '#22c55e', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={18} color="#fff" />
            </div>
            <div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px', color: '#1a1a2e', margin: 0 }}>Total Income This Term</p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(26,26,46,0.5)', margin: '2px 0 0' }}>{termRange.start} → {termRange.end}</p>
            </div>
          </div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '26px', color: '#22c55e' }}>{fmt(totalTermIncome)}</span>
        </div>

        {/* Income chart */}
        <div style={glassCard}>
          <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', background: 'rgba(116,19,220,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={16} color="#7413dc" />
            </div>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '16px', color: '#1a1a2e', margin: 0 }}>Income Over Time — Last 12 Months</h3>
          </div>
          <div style={{ padding: '16px 20px 20px' }}>
            <div style={{ height: '256px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `£${v}`} />
                  <Tooltip formatter={v => [`£${Number(v).toFixed(2)}`]} />
                  <Legend />
                  <Bar dataKey="Subscriptions" stackId="a" fill="#7413dc" />
                  <Bar dataKey="Event payments" stackId="a" fill="#a78bfa" />
                  <Bar dataKey="Other" stackId="a" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent transactions */}
        <div style={glassCard}>
          <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '16px', color: '#1a1a2e', margin: 0 }}>Recent Transactions</h3>
            <button onClick={() => navigate(createPageUrl('TreasurerLedger'))}
              style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#7413dc', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
              View all <ArrowRight size={13} />
            </button>
          </div>
          <div style={{ padding: '14px 24px 20px' }}>
            {recentTransactions.length === 0 ? (
              <p style={{ color: 'rgba(26,26,46,0.4)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>No transactions yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <th className="text-left py-2 px-2 font-semibold" style={{ color: 'rgba(26,26,46,0.5)' }}>Date</th>
                      <th className="text-left py-2 px-2 font-semibold" style={{ color: 'rgba(26,26,46,0.5)' }}>Description</th>
                      <th className="text-left py-2 px-2 font-semibold" style={{ color: 'rgba(26,26,46,0.5)' }}>Category</th>
                      <th className="text-right py-2 px-2 font-semibold" style={{ color: 'rgba(26,26,46,0.5)' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map(entry => (
                      <tr key={entry.id} className="cursor-pointer hover:bg-gray-50" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }} onClick={() => navigate(getRowLink(entry))}>
                        <td className="py-2 px-2 whitespace-nowrap" style={{ color: 'rgba(26,26,46,0.6)' }}>{entry.date}</td>
                        <td className="py-2 px-2 max-w-xs truncate">{entry.description}</td>
                        <td className="py-2 px-2 capitalize" style={{ color: 'rgba(26,26,46,0.6)' }}>{catLabel(entry.category)}</td>
                        <td className={`py-2 px-2 text-right font-semibold whitespace-nowrap ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.type === 'income' ? '+' : '-'}{fmt(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}