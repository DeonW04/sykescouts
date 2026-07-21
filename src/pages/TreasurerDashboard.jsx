import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import {
  ChevronDown, ArrowRight, Receipt, RefreshCw, Wallet, Banknote, CalendarClock,
} from 'lucide-react';
import TreasurerTodoBox from '@/components/treasurer/TreasurerTodoBox';
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

export default function TreasurerDashboard() {
  const navigate = useNavigate();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: ledger = [] } = useQuery({ queryKey: ['ledger-dash'], queryFn: () => base44.entities.LedgerEntry.list('-date', 1000) });
  const { data: recurring = [] } = useQuery({ queryKey: ['recurring-payments-dash'], queryFn: () => base44.entities.RecurringPayment.filter({ active: true }) });
  const { data: allocations = [] } = useQuery({ queryKey: ['receipt-allocations-dash'], queryFn: () => base44.entities.ReceiptAllocation.filter({}) });
  const { data: reimbursements = [] } = useQuery({ queryKey: ['reimbursements-dash'], queryFn: () => base44.entities.Reimbursement.filter({}) });
  const { data: cashPayments = [] } = useQuery({ queryKey: ['cash-payments-dash'], queryFn: () => base44.entities.CashPayment.filter({}) });

  const todayStr = new Date().toISOString().split('T')[0];

  const cashInBank = ledger.reduce((s, e) => s + (e.type === 'income' ? (e.amount || 0) : -(e.amount || 0)), 0);

  const unallocated = allocations.filter(r => r.status === 'unallocated');
  const unallocatedTotal = unallocated.reduce((s, r) => s + (r.amount || 0), 0);

  const reimbursementsDue = reimbursements.filter(r => r.payment_status === 'unpaid' && r.approval_status !== 'rejected');
  const reimbursementsDueTotal = reimbursementsDue.reduce((s, r) => s + (r.amount || 0), 0);

  const cashOutstanding = cashPayments.filter(c => !c.paid_in);
  const cashOutstandingTotal = cashOutstanding.reduce((s, c) => s + (c.amount || 0), 0);

  const in14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const obligationsDue = recurring.filter(r => r.next_due_date && r.next_due_date <= in14Days);
  const obligationsDueTotal = obligationsDue.reduce((s, r) => s + (r.amount || 0), 0);

  const recentTransactions = [...ledger].slice(0, 12);

  const getRowLink = entry => {
    if (entry.linked_event_id) return createPageUrl('TreasurerEventFinances');
    if (entry.linked_meeting_id) return createPageUrl('TreasurerProgrammeFinances');
    if (entry.linked_member_id) return createPageUrl('TreasurerMemberPayments');
    return createPageUrl('TreasurerLedger');
  };

  const todoItems = [
    { label: 'Receipts to Allocate', value: String(unallocated.length), sublabel: fmt(unallocatedTotal) + ' awaiting', color: unallocated.length > 0 ? '#f97316' : '#22c55e', icon: Receipt, to: createPageUrl('TreasurerReceiptAllocation') },
    { label: 'Reimbursements Due', value: String(reimbursementsDue.length), sublabel: fmt(reimbursementsDueTotal) + ' to pay', color: reimbursementsDue.length > 0 ? '#7413dc' : '#22c55e', icon: RefreshCw, to: createPageUrl('TreasurerReimbursements') },
    { label: 'Upcoming Obligations', value: String(obligationsDue.length), sublabel: fmt(obligationsDueTotal) + ' due within 14 days', color: obligationsDue.length > 0 ? '#3b82f6' : '#22c55e', icon: CalendarClock, to: createPageUrl('TreasurerRecurringPayments') },
    { label: 'Cash Outstanding', value: fmt(cashOutstandingTotal), sublabel: cashOutstanding.length === 1 ? '1 payment not paid in' : `${cashOutstanding.length} payments not paid in`, color: cashOutstandingTotal > 0 ? '#eab308' : '#22c55e', icon: Banknote, to: createPageUrl('TreasurerCashTaken') },
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Treasurer Portal</p>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(20px, 4vw, 36px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.15 }}>
                Welcome back{user ? `, ${user.display_name || user.full_name?.split(' ')[0]}` : ''}
              </h1>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>40th Rochdale (Syke) Scouts</p>
            </div>

            {/* Cash in bank */}
            <button onClick={() => navigate(createPageUrl('TreasurerLedger'))} style={{ ...glassCard, display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', cursor: 'pointer', fontFamily: 'inherit' }}>
              <div style={{ width: '38px', height: '38px', background: cashInBank >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={18} color={cashInBank >= 0 ? '#22c55e' : '#ef4444'} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(26,26,46,0.5)', margin: 0 }}>Cash in Bank</p>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '22px', color: cashInBank >= 0 ? '#22c55e' : '#ef4444', margin: 0, lineHeight: 1.1 }}>{fmt(cashInBank)}</p>
              </div>
            </button>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 items-start" style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 16px 48px', gap: '12px' }}>
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

        {/* To-do */}
        <TreasurerTodoBox items={todoItems} />
      </div>
    </div>
  );
}