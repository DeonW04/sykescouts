import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, User, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import SectionTabPicker from '@/components/treasurer/SectionTabPicker';

const fmt = n => `£${(n || 0).toFixed(2)}`;
const displayEB = eb => { if (!eb) return '—'; if (eb.toLowerCase().includes('stripe')) return 'Stripe'; return eb; };
const catLabel = c => { if (c === 'subs') return 'Subscriptions'; if (c === 'event_payments') return 'Event payment'; return c?.replace(/_/g, ' ') || '—'; };
const INTERVAL_LABELS = { '4_months': 'Every 4 months', '6_months': 'Every 6 months', yearly: 'Yearly' };

function getApproxTermRange() {
  const today = new Date(); const month = today.getMonth() + 1; const year = today.getFullYear();
  if (month >= 9) return { start: `${year}-09-01`, end: `${year}-12-20` };
  if (month <= 4) return { start: `${year}-01-06`, end: `${year}-04-15` };
  return { start: `${year}-04-20`, end: `${year}-07-20` };
}

export default function TreasurerMemberPayments() {
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState('');

  const { data: members = [] } = useQuery({ queryKey: ['members-active'], queryFn: () => base44.entities.Member.filter({ active: true }) });
  const { data: terms = [] } = useQuery({ queryKey: ['terms'], queryFn: () => base44.entities.Term.list() });
  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });

  const sortedMembers = [...members].sort((a, b) => a.full_name.localeCompare(b.full_name));

  const memberItems = useMemo(() => sortedMembers.map(m => ({
    id: m.id,
    label: m.full_name,
    sectionIds: m.section_id ? [m.section_id] : [],
    searchText: m.full_name,
  })), [members]);

  const member = selectedMemberId ? members.find(m => m.id === selectedMemberId) : sortedMembers[0];

  const { data: ledgerEntries = [] } = useQuery({
    queryKey: ['ledger-member-fin', member?.id],
    queryFn: () => base44.entities.LedgerEntry.filter({ linked_member_id: member.id }),
    enabled: !!member?.id,
    select: data => [...data].sort((a, b) => b.date.localeCompare(a.date)),
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const termRange = useMemo(() => {
    const found = terms.find(t => t.start_date <= todayStr && t.end_date >= todayStr);
    return found ? { start: found.start_date, end: found.end_date } : getApproxTermRange();
  }, [terms, todayStr]);

  const totalPaid = ledgerEntries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
  const termPaid = ledgerEntries.filter(e => e.type === 'income' && e.date >= termRange.start && e.date <= termRange.end).reduce((s, e) => s + (e.amount || 0), 0);

  const defaultCard = member?.stripe_payment_methods?.find(p => p.is_default) || member?.stripe_payment_methods?.[0];
  const isDD = member?.subs_payment_type === 'direct_debit' && !member?.stripe_subscription_id;

  const toggleDD = async () => {
    await base44.entities.Member.update(member.id, { subs_payment_type: isDD ? 'card' : 'direct_debit' });
    queryClient.invalidateQueries({ queryKey: ['members-active'] });
    toast.success(isDD ? `${member.full_name} set to card payments` : `${member.full_name} set to direct debit / bank transfer`);
  };

  const cancelSubscription = async () => {
    if (!confirm(`Cancel ${member.full_name}'s card subscription? Membership stays paid until the end of the current billing period.`)) return;
    const res = await base44.functions.invoke('cancelStripeSubscription', { member_id: member.id });
    if (res?.data?.error) { toast.error(res.data.error); return; }
    toast.success('Subscription cancelled');
    queryClient.invalidateQueries({ queryKey: ['members-active'] });
  };

  return (
    <TreasurerLayout title="Member Payments">
      <div className="mb-6">
        <SectionTabPicker
          sections={sections}
          items={memberItems}
          value={member?.id}
          onChange={setSelectedMemberId}
          placeholder="Select member…"
          triggerLabel={member?.full_name}
          title="Select Member"
          icon={User}
        />
      </div>

      {!member ? (
        <Card><CardContent className="py-12 text-center text-gray-500">No members found.</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {/* Subscription status card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#004851]" />
                  {member.full_name} — Subscription Status
                </CardTitle>
                {!member.stripe_subscription_id ? (
                  <Button size="sm" variant="outline" onClick={toggleDD} className={isDD ? '' : 'border-blue-300 text-blue-700 hover:bg-blue-50'}>
                    <Landmark className="w-4 h-4 mr-1.5" />
                    {isDD ? 'Switch to card payments' : 'Set as Direct Debit / Bank Transfer'}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={cancelSubscription} className="border-red-300 text-red-600 hover:bg-red-50">
                    Cancel card subscription
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="font-semibold">{member.stripe_subscription_id ? <span className="text-green-600">Active</span> : isDD ? <span className="text-blue-600">Direct Debit</span> : <span className="text-gray-500">No subscription</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Payment</p>
                  <p className="font-semibold">{member.last_subs_payment_date ? new Date(member.last_subs_payment_date).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Next Due</p>
                  <p className={`font-semibold ${member.next_subs_due && member.next_subs_due < todayStr ? 'text-red-600' : ''}`}>
                    {member.next_subs_due ? new Date(member.next_subs_due).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Billing Interval</p>
                  <p className="font-semibold">{INTERVAL_LABELS[member.subs_interval] || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Payment Method</p>
                  {isDD ? (
                    <p className="font-semibold text-blue-600 flex items-center gap-1.5"><Landmark className="w-4 h-4" />Direct Debit / Bank Transfer</p>
                  ) : defaultCard ? (
                    <p className="font-semibold capitalize">{defaultCard.brand} ···· {defaultCard.last4} (exp {defaultCard.exp_month}/{defaultCard.exp_year})</p>
                  ) : (
                    <p className="font-semibold text-red-500">No payment method</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Full payment history */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">Payment History</CardTitle>
                <div className="text-right text-sm">
                  <p className="text-gray-500">All time: <span className="font-bold text-green-700">{fmt(totalPaid)}</span></p>
                  <p className="text-gray-500">This term: <span className="font-bold text-blue-700">{fmt(termPaid)}</span></p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {ledgerEntries.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No payment records for this member.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-2 font-semibold text-gray-600">Date</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-600">Description</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-600">Category</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-600">Amount</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-600">Reference</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-600">Entered by</th>
                    </tr></thead>
                    <tbody>
                      {ledgerEntries.map(e => (
                        <tr key={e.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{e.date}</td>
                          <td className="py-2 px-2">{e.description}</td>
                          <td className="py-2 px-2"><Badge variant="outline" className="text-xs">{catLabel(e.category)}</Badge></td>
                          <td className={`py-2 px-2 text-right font-semibold whitespace-nowrap ${e.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {e.type === 'income' ? '+' : '-'}{fmt(e.amount)}
                          </td>
                          <td className="py-2 px-2 text-gray-400 text-xs font-mono">{e.reference || '—'}</td>
                          <td className="py-2 px-2 text-gray-500 text-xs">{displayEB(e.entered_by)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </TreasurerLayout>
  );
}