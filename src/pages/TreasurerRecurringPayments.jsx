import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, CheckCircle, AlertTriangle, CalendarClock, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import ObligationDialog, { FREQUENCIES, OBLIGATION_CATEGORIES } from '@/components/treasurer/ObligationDialog';
import ConfirmPaidDialog from '@/components/treasurer/ConfirmPaidDialog';

const fmt = n => `£${(n || 0).toFixed(2)}`;
const freqLabel = f => FREQUENCIES.find(x => x.value === f)?.label || f;
const catLabel = c => OBLIGATION_CATEGORIES.find(x => x.value === c)?.label || (c?.replace(/_/g, ' ') || '—');
const YEARLY_MULTIPLIER = { weekly: 52, monthly: 12, quarterly: 4, '6_months': 2, yearly: 1 };

const todayStr = new Date().toISOString().split('T')[0];
const in14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const getStatus = (o) => {
  if (o.active === false) return 'paused';
  if (!o.next_due_date) return 'scheduled';
  if (o.next_due_date < todayStr) return 'overdue';
  if (o.next_due_date <= in14Days) return 'due_soon';
  return 'scheduled';
};

const STATUS_CONFIG = {
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700 border-red-200' },
  due_soon: { label: 'Due soon', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  scheduled: { label: 'Scheduled', className: 'bg-green-100 text-green-700 border-green-200' },
  paused: { label: 'Paused', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export default function TreasurerRecurringPayments() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editObligation, setEditObligation] = useState(null);
  const [confirmObligation, setConfirmObligation] = useState(null);

  const { data: obligations = [] } = useQuery({ queryKey: ['recurring-payments'], queryFn: () => base44.entities.RecurringPayment.list('next_due_date', 200) });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['recurring-payments'] });
    queryClient.invalidateQueries({ queryKey: ['recurring-payments-dash'] });
    queryClient.invalidateQueries({ queryKey: ['ledger'] });
    queryClient.invalidateQueries({ queryKey: ['ledger-dash'] });
  };

  const active = useMemo(() => obligations.filter(o => o.active !== false), [obligations]);
  const needsAttention = active.filter(o => ['overdue', 'due_soon'].includes(getStatus(o))).sort((a, b) => (a.next_due_date || '').localeCompare(b.next_due_date || ''));
  const overdue = needsAttention.filter(o => getStatus(o) === 'overdue');
  const yearlyCost = active.reduce((s, o) => s + (o.amount || 0) * (YEARLY_MULTIPLIER[o.frequency] || 1), 0);

  const sorted = useMemo(() => [...obligations].sort((a, b) => {
    if ((a.active === false) !== (b.active === false)) return a.active === false ? 1 : -1;
    return (a.next_due_date || '9999').localeCompare(b.next_due_date || '9999');
  }), [obligations]);

  const handleDelete = async (o) => {
    if (!confirm(`Delete "${o.name}"? This won't remove any past ledger entries.`)) return;
    await base44.entities.RecurringPayment.delete(o.id);
    refresh();
    toast.success('Obligation deleted');
  };

  return (
    <TreasurerLayout title="Recurring Obligations">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-red-50 border-0"><CardContent className="p-4 text-center"><p className="text-xs text-gray-500">Overdue</p><p className="text-2xl font-bold text-red-700">{overdue.length}</p><p className="text-xs text-red-500">{fmt(overdue.reduce((s, o) => s + (o.amount || 0), 0))}</p></CardContent></Card>
        <Card className="bg-amber-50 border-0"><CardContent className="p-4 text-center"><p className="text-xs text-gray-500">Due within 14 days</p><p className="text-2xl font-bold text-amber-700">{needsAttention.length - overdue.length}</p><p className="text-xs text-amber-500">{fmt(needsAttention.filter(o => getStatus(o) === 'due_soon').reduce((s, o) => s + (o.amount || 0), 0))}</p></CardContent></Card>
        <Card className="bg-indigo-50 border-0"><CardContent className="p-4 text-center"><p className="text-xs text-gray-500">Est. yearly cost</p><p className="text-2xl font-bold text-indigo-700">{fmt(yearlyCost)}</p><p className="text-xs text-indigo-400">{active.length} active obligation{active.length === 1 ? '' : 's'}</p></CardContent></Card>
      </div>

      {/* Needs attention */}
      {needsAttention.length > 0 && (
        <Card className="mb-6 border-amber-300">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-700"><AlertTriangle className="w-4 h-4" />Needs Attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {needsAttention.map(o => {
              const status = getStatus(o);
              return (
                <div key={o.id} className={`p-3 border rounded-lg flex items-center justify-between gap-3 flex-wrap ${status === 'overdue' ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{o.name}</p>
                      <span className="font-semibold text-gray-700">{fmt(o.amount)}</span>
                      <Badge className={`border text-xs ${STATUS_CONFIG[status].className}`}>{STATUS_CONFIG[status].label}</Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Due {o.next_due_date} · {freqLabel(o.frequency)} · {o.payment_method === 'standing_order' ? 'Paid automatically — verify on bank statement' : 'Pay via bank app'}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setConfirmObligation(o)} className={status === 'overdue' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1a472a] hover:bg-[#13381f]'}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />{o.payment_method === 'standing_order' ? 'Verify Paid' : 'Mark as Paid'}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* All obligations */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2"><Landmark className="w-4 h-4 text-gray-500" />All Obligations</CardTitle>
            <Button onClick={() => { setEditObligation(null); setShowDialog(true); }} className="bg-[#1a472a] hover:bg-[#13381f]"><Plus className="w-4 h-4 mr-2" />Add Obligation</Button>
          </div>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No recurring obligations yet.</p>
              <p className="text-xs mt-1">Add things like hall rent, insurance or any regular payments to track them here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Name</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Category</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600">Amount</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Frequency</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Method</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Last Paid</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Next Due</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Status</th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(o => {
                    const status = getStatus(o);
                    const sc = STATUS_CONFIG[status];
                    return (
                      <tr key={o.id} className={`border-b hover:bg-gray-50 ${o.active === false ? 'opacity-50' : status === 'overdue' ? 'bg-red-50/30' : status === 'due_soon' ? 'bg-amber-50/30' : ''}`}>
                        <td className="py-2 px-2 font-medium">{o.name}{o.notes && <p className="text-xs text-gray-400 font-normal">{o.notes}</p>}</td>
                        <td className="py-2 px-2 text-gray-600">{catLabel(o.category)}</td>
                        <td className="py-2 px-2 text-right font-semibold whitespace-nowrap">{fmt(o.amount)}</td>
                        <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{freqLabel(o.frequency)}</td>
                        <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{o.payment_method === 'standing_order' ? 'Automatic' : 'Manual'}</td>
                        <td className="py-2 px-2 text-gray-500 whitespace-nowrap">{o.last_paid_date || '—'}</td>
                        <td className={`py-2 px-2 font-medium whitespace-nowrap ${status === 'overdue' ? 'text-red-600' : status === 'due_soon' ? 'text-amber-600' : ''}`}>{o.next_due_date || '—'}</td>
                        <td className="py-2 px-2"><Badge className={`border text-xs ${sc.className}`}>{sc.label}</Badge></td>
                        <td className="py-2 px-2">
                          <div className="flex gap-0.5 justify-end">
                            {o.active !== false && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" title="Confirm paid" onClick={() => setConfirmObligation(o)}><CheckCircle className="w-3.5 h-3.5" /></Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditObligation(o); setShowDialog(true); }}><Edit className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(o)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
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

      <ObligationDialog open={showDialog} onClose={() => setShowDialog(false)} obligation={editObligation} onSaved={refresh} />
      <ConfirmPaidDialog obligation={confirmObligation} onClose={() => setConfirmObligation(null)} onConfirmed={refresh} />
    </TreasurerLayout>
  );
}